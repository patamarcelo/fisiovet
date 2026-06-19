// src/screens/config/ConfigProfile.jsx
// @ts-nocheck

import React from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";

import { useDispatch, useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";

import { updateProfile } from "firebase/auth";

import { ensureFirebase } from "@/firebase/firebase";

import {
  setUser,
  setUserProfile,
  selectUser,
  selectUserProfile,
} from "@/src/store/slices/userSlice";

/**
 * Mapeia Firebase Auth User para o formato serializável
 * armazenado no Redux.
 */
function mapAuthUser(user) {
  if (!user) {
    return null;
  }

  return {
    uid: user.uid,
    email: user.email,
    emailVerified: Boolean(user.emailVerified),
    displayName: user.displayName ?? null,
    photoURL: user.photoURL ?? null,
    isAnonymous: Boolean(user.isAnonymous),

    providers: (user.providerData || [])
      .map((provider) => provider?.providerId)
      .filter(Boolean),

    creationTime:
      user.metadata?.creationTime ?? null,

    lastSignInTime:
      user.metadata?.lastSignInTime ?? null,
  };
}

export default function ConfigProfile() {
  const dispatch = useDispatch();

  const currentUser = useSelector(selectUser);
  const currentProfile = useSelector(selectUserProfile);

  const firebase = React.useMemo(
    () => ensureFirebase(),
    []
  );

  const auth = firebase?.auth ?? null;
  const firestore = firebase?.firestore ?? null;
  const storage = firebase?.storageInstance ?? null;

  const initialDisplayName =
    currentProfile?.displayName ??
    currentProfile?.name ??
    currentUser?.displayName ??
    "";

  const initialPhotoURL =
    currentProfile?.photoURL ??
    currentUser?.photoURL ??
    "";

  const [displayName, setDisplayName] =
    React.useState(initialDisplayName);

  const [photoURL, setPhotoURL] =
    React.useState(initialPhotoURL);

  const [localImage, setLocalImage] =
    React.useState(null);

  const [saving, setSaving] =
    React.useState(false);

  const [loadingAvatar, setLoadingAvatar] =
    React.useState(false);

  /**
   * Atualiza os campos caso os dados do Redux sejam carregados
   * depois que a tela já foi montada.
   */
  React.useEffect(() => {
    if (!localImage) {
      const reduxPhotoURL =
        currentProfile?.photoURL ??
        currentUser?.photoURL ??
        "";

      setPhotoURL(reduxPhotoURL);
    }
  }, [
    currentProfile?.photoURL,
    currentUser?.photoURL,
    localImage,
  ]);

  React.useEffect(() => {
    const reduxDisplayName =
      currentProfile?.displayName ??
      currentProfile?.name ??
      currentUser?.displayName ??
      "";

    setDisplayName(reduxDisplayName);
  }, [
    currentProfile?.displayName,
    currentProfile?.name,
    currentUser?.displayName,
  ]);

  /**
   * Prioridade da imagem:
   * 1. Arquivo selecionado no aparelho
   * 2. URL digitada
   * 3. Foto do profile no Firestore
   * 4. Foto do Firebase Auth
   */
  const imageSource = React.useMemo(() => {
    if (localImage) {
      return {
        uri: localImage,
      };
    }

    const typedPhotoURL =
      photoURL?.trim();

    if (typedPhotoURL) {
      return {
        uri: typedPhotoURL,
      };
    }

    const savedPhotoURL =
      currentProfile?.photoURL ??
      currentUser?.photoURL;

    if (savedPhotoURL) {
      return {
        uri: savedPhotoURL,
      };
    }

    return null;
  }, [
    localImage,
    photoURL,
    currentProfile?.photoURL,
    currentUser?.photoURL,
  ]);

  /**
   * Controla o indicador de carregamento da imagem.
   */
  React.useEffect(() => {
    if (!imageSource?.uri) {
      setLoadingAvatar(false);
      return undefined;
    }

    setLoadingAvatar(true);

    const timeout = setTimeout(() => {
      setLoadingAvatar(false);
    }, 8000);

    return () => {
      clearTimeout(timeout);
    };
  }, [imageSource?.uri]);

  async function pickPhotoFromDevice() {
    try {
      await Haptics.selectionAsync();

      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          "Permissão necessária",
          "Permita o acesso às fotos para escolher uma imagem."
        );

        return;
      }

      const result =
        await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.85,
        });

      if (
        !result.canceled &&
        result.assets?.[0]?.uri
      ) {
        setLocalImage(
          result.assets[0].uri
        );
      }
    } catch (error) {
      console.warn(
        "[ConfigProfile] Erro ao escolher imagem:",
        error
      );

      Alert.alert(
        "Erro",
        error?.message ||
          "Não foi possível abrir a galeria."
      );
    }
  }

  /**
   * Envia a imagem selecionada para o Firebase Storage.
   */
  async function uploadAvatarIfNeeded() {
    if (!localImage) {
      return null;
    }

    if (!storage) {
      throw new Error(
        "Firebase Storage não foi inicializado."
      );
    }

    if (!auth?.currentUser?.uid) {
      throw new Error(
        "Usuário não autenticado."
      );
    }

    const uid =
      auth.currentUser.uid;

    const avatarRef = storage.ref(
      `users/${uid}/avatar.jpg`
    );

    await avatarRef.putFile(
      localImage,
      {
        contentType: "image/jpeg",
        customMetadata: {
          userId: uid,
          type: "profile-avatar",
        },
      }
    );

    return avatarRef.getDownloadURL();
  }

  async function handleSave() {
    if (saving) {
      return;
    }

    try {
      await Haptics.impactAsync(
        Haptics.ImpactFeedbackStyle.Medium
      );

      const firebaseUser =
        auth?.currentUser;

      if (!firebaseUser?.uid) {
        Alert.alert(
          "Sessão",
          "Usuário não autenticado."
        );

        return;
      }

      setSaving(true);

      const normalizedDisplayName =
        displayName?.trim() || null;

      let finalPhotoURL =
        photoURL?.trim() || null;

      /**
       * Se uma nova imagem foi selecionada,
       * faz upload e substitui a URL anterior.
       */
      const uploadedPhotoURL =
        await uploadAvatarIfNeeded();

      if (uploadedPhotoURL) {
        finalPhotoURL =
          uploadedPhotoURL;
      }

      /**
       * Firebase modular:
       *
       * Não usar:
       * auth.currentUser.updateProfile(...)
       *
       * Usar:
       * updateProfile(auth.currentUser, ...)
       */
      await updateProfile(
        firebaseUser,
        {
          displayName:
            normalizedDisplayName,

          photoURL:
            finalPhotoURL,
        }
      );

      const profilePatch = {
        uid: firebaseUser.uid,

        displayName:
          normalizedDisplayName,

        photoURL:
          finalPhotoURL,

        email:
          firebaseUser.email ?? null,

        updatedAt:
          new Date().toISOString(),
      };

      /**
       * O restante do app usa users/{uid}.
       * Antes esta tela estava gravando em profiles/{uid}.
       */
      if (firestore) {
        await firestore
          .collection("users")
          .doc(firebaseUser.uid)
          .set(
            profilePatch,
            {
              merge: true,
            }
          );
      }

      /**
       * Atualiza imediatamente o Firebase Auth no Redux.
       */
      dispatch(
        setUser(
          mapAuthUser(firebaseUser)
        )
      );

      /**
       * Atualiza imediatamente o profile do Firestore no Redux,
       * preservando subscription e demais campos existentes.
       */
      dispatch(
        setUserProfile({
          ...(currentProfile || {}),
          ...profilePatch,
        })
      );

      setPhotoURL(
        finalPhotoURL || ""
      );

      setLocalImage(null);

      await Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success
      );

      Alert.alert(
        "Pronto",
        "Perfil atualizado com sucesso!"
      );
    } catch (error) {
      console.warn(
        "[ConfigProfile] Erro ao salvar perfil:",
        error
      );

      await Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Error
      ).catch(() => {});

      Alert.alert(
        "Erro",
        error?.message ||
          "Não foi possível atualizar seu perfil."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={
        Platform.OS === "ios"
          ? "padding"
          : undefined
      }
    >
      <ScrollView
        contentContainerStyle={{
          padding: 16,
          paddingBottom: 40,
          gap: 18,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Avatar */}
        <View
          style={{
            alignItems: "center",
          }}
        >
          <Pressable
            onPress={pickPhotoFromDevice}
            disabled={saving}
            style={({ pressed }) => ({
              opacity:
                pressed || saving
                  ? 0.8
                  : 1,
            })}
          >
            <View
              style={{
                width: 120,
                height: 120,
                borderRadius: 60,
                overflow: "hidden",
                backgroundColor: "#E5E7EB",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
              }}
            >
              {imageSource ? (
                <>
                  <Image
                    source={imageSource}
                    cachePolicy="memory-disk"
                    contentFit="cover"
                    transition={150}
                    style={{
                      width: "100%",
                      height: "100%",
                    }}
                    onLoad={() => {
                      setLoadingAvatar(false);
                    }}
                    onLoadEnd={() => {
                      setLoadingAvatar(false);
                    }}
                    onError={(event) => {
                      console.warn(
                        "[ConfigProfile] Erro ao carregar avatar:",
                        event
                      );

                      setLoadingAvatar(false);
                    }}
                  />

                  {loadingAvatar && (
                    <View
                      pointerEvents="none"
                      style={{
                        position: "absolute",
                        top: 0,
                        right: 0,
                        bottom: 0,
                        left: 0,
                        backgroundColor:
                          "rgba(255,255,255,0.45)",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <ActivityIndicator
                        size="small"
                        color="#0A84FF"
                      />
                    </View>
                  )}
                </>
              ) : (
                <Ionicons
                  name="person"
                  size={48}
                  color="#9CA3AF"
                />
              )}

              <View
                pointerEvents="none"
                style={{
                  position: "absolute",
                  right: 4,
                  bottom: 4,
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  backgroundColor: "#0A84FF",
                  borderWidth: 3,
                  borderColor: "#FFFFFF",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons
                  name="camera"
                  size={17}
                  color="#FFFFFF"
                />
              </View>
            </View>
          </Pressable>

          <Text
            style={{
              marginTop: 10,
              color: "#6B7280",
              fontSize: 13,
            }}
          >
            Toque na foto para alterar
          </Text>
        </View>

        {/* Nome */}
        <View
          style={{
            gap: 6,
          }}
        >
          <Text
            style={{
              fontWeight: "700",
              color: "#111827",
            }}
          >
            Nome
          </Text>

          <TextInput
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Seu nome"
            editable={!saving}
            returnKeyType="done"
            style={{
              minHeight: 48,
              borderWidth: 1,
              borderColor: "#E5E7EB",
              borderRadius: 12,
              paddingHorizontal: 14,
              color: "#111827",
              backgroundColor: "#FFFFFF",
            }}
          />
        </View>

        {/* E-mail */}
        <View
          style={{
            gap: 6,
          }}
        >
          <Text
            style={{
              fontWeight: "700",
              color: "#111827",
            }}
          >
            E-mail
          </Text>

          <TextInput
            editable={false}
            value={
              currentUser?.email ??
              auth?.currentUser?.email ??
              ""
            }
            style={{
              minHeight: 48,
              borderWidth: 1,
              borderColor: "#E5E7EB",
              borderRadius: 12,
              paddingHorizontal: 14,
              color: "#6B7280",
              backgroundColor: "#F9FAFB",
            }}
          />
        </View>

        {/* URL opcional */}
        <View
          style={{
            gap: 6,
          }}
        >
          <Text
            style={{
              fontWeight: "700",
              color: "#111827",
            }}
          >
            URL da foto
          </Text>

          <TextInput
            value={photoURL}
            onChangeText={(value) => {
              setPhotoURL(value);

              if (localImage) {
                setLocalImage(null);
              }
            }}
            placeholder="https://..."
            editable={!saving}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            returnKeyType="done"
            style={{
              minHeight: 48,
              borderWidth: 1,
              borderColor: "#E5E7EB",
              borderRadius: 12,
              paddingHorizontal: 14,
              color: "#111827",
              backgroundColor: "#FFFFFF",
            }}
          />
        </View>

        {/* Escolher imagem */}
        <Pressable
          onPress={pickPhotoFromDevice}
          disabled={saving}
          style={({ pressed }) => ({
            minHeight: 48,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            paddingHorizontal: 14,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: "#0A84FF",
            backgroundColor: pressed
              ? "#DBEAFE"
              : "#EFF6FF",
            opacity: saving ? 0.6 : 1,
          })}
        >
          <Ionicons
            name="images-outline"
            size={20}
            color="#0A84FF"
          />

          <Text
            style={{
              color: "#0A84FF",
              fontWeight: "700",
            }}
          >
            Escolher do dispositivo
          </Text>
        </Pressable>

        {/* Salvar */}
        <Pressable
          onPress={handleSave}
          disabled={saving}
          style={({ pressed }) => ({
            minHeight: 52,
            paddingHorizontal: 16,
            borderRadius: 14,
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "row",
            gap: 8,
            backgroundColor: saving
              ? "#9CA3AF"
              : "#0A84FF",
            opacity:
              pressed && !saving
                ? 0.88
                : 1,
          })}
        >
          {saving && (
            <ActivityIndicator
              size="small"
              color="#FFFFFF"
            />
          )}

          <Text
            style={{
              color: "#FFFFFF",
              fontWeight: "700",
              fontSize: 16,
            }}
          >
            {saving
              ? "Salvando..."
              : "Salvar"}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}