// src/screens/config/ConfigProfile.jsx
// @ts-nocheck
import React from 'react';
import { View, Text, TextInput, Image, Pressable, Alert } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';

import { ensureFirebase } from '@/firebase/firebase';
import { setUser } from '@/src/store/slices/userSlice';

// Mapeia objeto do Firebase Auth -> shape usado no Redux userSlice
function mapAuthUser(u) {
  if (!u) return null;
  return {
    uid: u.uid,
    email: u.email,
    emailVerified: !!u.emailVerified,
    displayName: u.displayName ?? null,
    photoURL: u.photoURL ?? null,
    isAnonymous: !!u.isAnonymous,
    providers: (u.providerData || []).map(p => p?.providerId).filter(Boolean),
    creationTime: u.metadata?.creationTime || null,
    lastSignInTime: u.metadata?.lastSignInTime || null,
  };
}

export default function ConfigProfile() {
  const dispatch = useDispatch();

  // Inicializa Firebase helpers (auth, firestore, storage)
  const fb = ensureFirebase();
  const auth = fb?.auth || null;
  const firestore = fb?.firestore || null;
  const storage = fb?.storage || null;

  const currentUser = useSelector((s) => s.user.user);

  const [displayName, setDisplayName] = React.useState(currentUser?.displayName ?? '');
  const [photoURL, setPhotoURL] = React.useState(currentUser?.photoURL ?? '');
  const [localImage, setLocalImage] = React.useState(null); // URI local escolhida
  const [saving, setSaving] = React.useState(false);

  // Escolher imagem do rolo da câmera
  async function pickPhotoFromDevice() {
    try {
      await Haptics.selectionAsync();
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão', 'Permita acesso às fotos para escolher uma imagem.');
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
      });
      if (!res.canceled && res.assets?.[0]?.uri) {
        setLocalImage(res.assets[0].uri);
      }
    } catch (e) {
      console.warn('Erro ao escolher imagem:', e);
      Alert.alert('Erro', 'Não foi possível abrir a galeria.');
    }
  }

  // Sobe a imagem local para o Firebase Storage e retorna a URL pública
  async function uploadAvatarIfNeeded() {
    if (!localImage || !storage || !auth?.currentUser) return null;
    const uid = auth.currentUser.uid;

    // Caminho do arquivo no Storage
    // Obs: com @react-native-firebase/storage, a API namespaced é storage().ref(...).putFile(...).
    // Como usamos ensureFirebase(), use a instância retornada:
    const ref = storage.ref(`users/${uid}/avatar.jpg`);

    // putFile aceita "file://" e "content://"
    await ref.putFile(localImage, { contentType: 'image/jpeg' });
    const url = await ref.getDownloadURL();
    return url;
  }

  async function handleSave() {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      if (!auth?.currentUser) {
        Alert.alert('Sessão', 'Usuário não autenticado.');
        return;
      }
      setSaving(true);

      // Se escolheu uma imagem local nova, faz upload e usa como photoURL
      let finalPhotoURL = photoURL?.trim() || null;
      const uploaded = await uploadAvatarIfNeeded();
      if (uploaded) {
        finalPhotoURL = uploaded;
      }

      // 1) Atualiza no Auth (nome/foto)
      console.log('[Gravando] em:', `profiles/${auth.currentUser.uid}`);
      console.log('[FB] projectId:', auth?.app?.options?.projectId);
      console.log('[FB] storageBucket:', auth?.app?.options?.storageBucket);
      console.log('[FB] appName:', auth?.app?.name);
      await auth.currentUser.updateProfile({
        displayName: displayName?.trim() || null,
        photoURL: finalPhotoURL,
      });

      // 2) Persiste/espelha no Firestore (profiles/{uid})
      // ATENÇÃO às regras: libere /profiles/{uid} p/ o próprio uid (read/write)
      //   match /profiles/{uid} { allow read, write: if request.auth != null && request.auth.uid == uid; }
      if (firestore && auth.currentUser?.uid) {
        const uid = auth.currentUser.uid;

        // Compatível com @react-native-firebase/firestore (API namespaced):
        // firestore().collection('profiles').doc(uid).set(..., { merge: true })
        const col = typeof firestore.collection === 'function' ? firestore.collection('profiles') : null;

        if (col) {
          await col.doc(uid).set(
            {
              displayName: displayName?.trim() || null,
              photoURL: finalPhotoURL,
              email: auth.currentUser.email || null,
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          );
        }
      }

      // 3) Atualiza Redux com os dados atuais do Auth
      const refreshed = mapAuthUser(auth.currentUser);
      dispatch(setUser(refreshed));

      // Limpa o preview local se subiu
      if (uploaded) setLocalImage(null);

      Alert.alert('Pronto', 'Perfil atualizado com sucesso!');
    } catch (e) {
      console.warn('Erro ao salvar perfil:', e);
      Alert.alert('Erro', e?.message || 'Não foi possível atualizar seu perfil.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={{ padding: 16, gap: 16 }}>
      {/* Avatar + Nome */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, alignSelf: 'center' }}>
        <View
          style={{
            width: 120,
            height: 120,
            borderRadius: 72,
            overflow: 'hidden',
            backgroundColor: '#E5E7EB',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {localImage ? (
            <Image source={{ uri: localImage }} style={{ width: '100%', height: '100%' }} />
          ) : currentUser?.photoURL ? (
            <Image source={{ uri: currentUser.photoURL }} style={{ width: '100%', height: '100%' }} />
          ) : (
            <Ionicons name="person" size={28} color="#9CA3AF" />
          )}
        </View>


      </View>
      <View>
        <Text style={{ fontWeight: '700', marginBottom: 6 }}>Nome</Text>
        <TextInput
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Seu nome"
          style={{
            borderWidth: 1,
            borderColor: '#E5E7EB',
            borderRadius: 8,
            padding: 10,
          }}
        />
      </View>

      {/* E-mail (somente leitura) */}
      <View style={{ gap: 6 }}>
        <Text style={{ fontWeight: '700' }}>E-mail</Text>
        <TextInput
          editable={false}
          value={currentUser?.email ?? ''}
          style={{
            borderWidth: 1,
            borderColor: '#E5E7EB',
            borderRadius: 8,
            padding: 10,
            color: '#6B7280',
            backgroundColor: '#F9FAFB',
          }}
        />
      </View>

      {/* URL manual da foto + botão escolher do dispositivo */}
      <View style={{ gap: 6 }}>
        <Text style={{ fontWeight: '700' }}>Foto (URL, opcional)</Text>
        <TextInput
          value={photoURL}
          onChangeText={setPhotoURL}
          placeholder="https://…"
          autoCapitalize="none"
          autoCorrect={false}
          style={{
            borderWidth: 1,
            borderColor: '#E5E7EB',
            borderRadius: 8,
            padding: 10,
          }}
        />
        <Pressable
          onPress={pickPhotoFromDevice}
          style={({ pressed }) => ({
            padding: 12,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: '#E5E7EB',
            alignItems: 'center',
            backgroundColor: pressed ? '#F3F4F6' : '#FFF',
          })}
        >
          <Text>Escolher do dispositivo…</Text>
        </Pressable>
      </View>

      {/* Salvar */}
      <Pressable
        onPress={handleSave}
        disabled={saving}
        style={({ pressed }) => ({
          padding: 14,
          borderRadius: 10,
          alignItems: 'center',
          backgroundColor: saving ? '#9CA3AF' : '#0A84FF',
          opacity: pressed ? 0.9 : 1,
        })}
      >
        <Text style={{ color: '#FFF', fontWeight: '700' }}>
          {saving ? 'Salvando…' : 'Salvar'}
        </Text>
      </Pressable>
    </View>
  );
}