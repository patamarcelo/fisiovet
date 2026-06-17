// src/screens/anotacoes/PetAnotacoes.jsx
// @ts-nocheck

import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  useLocalSearchParams,
  useNavigation,
} from "expo-router";

import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import {
  useDispatch,
  useSelector,
} from "react-redux";

import {
  addAnotacao,
  deleteAnotacao,
  fetchAnotacoesByPet,
  makeSelectAnotacoesByPet,
  selectAnotacoesLoadingByPet,
  selectAnotacoesSaving,
  updateAnotacao,
} from "@/src/store/slices/anotacoesSlice";

import {
  fetchPet,
  selectPetById,
} from "@/src/store/slices/petsSlice";

import { useThemeColor } from "@/hooks/useThemeColor";

function parseDate(value) {
  if (!value) return null;

  if (value instanceof Date) {
    return value;
  }

  if (
    typeof value?.toDate ===
    "function"
  ) {
    return value.toDate();
  }

  const parsed = new Date(value);

  return Number.isNaN(
    parsed.getTime()
  )
    ? null
    : parsed;
}

function formatDate(value) {
  const date = parseDate(value);

  if (!date) return "Agora";

  return date.toLocaleDateString(
    "pt-BR",
    {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  );
}

function AnnotationCard({
  item,
  text,
  subtle,
  border,
  onEdit,
  onDelete,
}) {
  return (
    <Pressable
      onPress={() => onEdit(item)}
      style={({ pressed }) => [
        styles.annotationCard,
        {
          borderColor: border,
        },
        pressed && {
          opacity: 0.88,
          transform: [
            {
              scale: 0.997,
            },
          ],
        },
      ]}
    >
      <View style={styles.annotationHeader}>
        <View style={styles.annotationIcon}>
          <Ionicons
            name="document-text-outline"
            size={17}
            color="#FFFFFF"
          />
        </View>

        <View style={styles.annotationHeaderText}>
          <Text
            style={[
              styles.annotationTitle,
              {
                color: text,
              },
            ]}
            numberOfLines={1}
          >
            {item.titulo || "Anotação"}
          </Text>

          <Text
            style={[
              styles.annotationDate,
              {
                color: subtle,
              },
            ]}
            numberOfLines={1}
          >
            {formatDate(
              item.updatedAt ||
                item.createdAt
            )}
          </Text>
        </View>

        <Pressable
          onPress={(event) => {
            event.stopPropagation();
            onDelete(item);
          }}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Excluir anotação"
          style={({ pressed }) => [
            styles.deleteButton,
            pressed && {
              opacity: 0.55,
            },
          ]}
        >
          <Ionicons
            name="trash-outline"
            size={18}
            color="#EF4444"
          />
        </Pressable>
      </View>

      <Text
        style={[
          styles.annotationText,
          {
            color: text,
          },
        ]}
      >
        {item.texto}
      </Text>
    </Pressable>
  );
}

function AnnotationEditor({
  visible,
  initialValue,
  saving,
  onCancel,
  onSave,
}) {
  const [titulo, setTitulo] =
    useState("");

  const [texto, setTexto] =
    useState("");

  useEffect(() => {
    if (!visible) return;

    setTitulo(
      initialValue?.titulo || ""
    );

    setTexto(
      initialValue?.texto || ""
    );
  }, [
    visible,
    initialValue,
  ]);

  const canSave =
    texto.trim().length > 0 &&
    !saving;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={
        Platform.OS === "ios"
          ? "pageSheet"
          : "fullScreen"
      }
      onRequestClose={onCancel}
    >
      <SafeAreaView
        style={styles.editorSafe}
        edges={[
          "top",
          "left",
          "right",
          "bottom",
        ]}
      >
        <KeyboardAvoidingView
          style={styles.editorKeyboard}
          behavior={
            Platform.OS === "ios"
              ? "padding"
              : undefined
          }
        >
          <View style={styles.editorHeader}>
            <Pressable
              onPress={onCancel}
              hitSlop={10}
              style={
                styles.editorHeaderButton
              }
            >
              <Text
                style={styles.editorCancel}
              >
                Cancelar
              </Text>
            </Pressable>

            <Text style={styles.editorTitle}>
              {initialValue?.id
                ? "Editar anotação"
                : "Nova anotação"}
            </Text>

            <Pressable
              disabled={!canSave}
              onPress={() =>
                onSave({
                  titulo,
                  texto,
                })
              }
              hitSlop={10}
              style={
                styles.editorHeaderButton
              }
            >
              {saving ? (
                <ActivityIndicator
                  size="small"
                />
              ) : (
                <Text
                  style={[
                    styles.editorSave,
                    !canSave && {
                      opacity: 0.35,
                    },
                  ]}
                >
                  Salvar
                </Text>
              )}
            </Pressable>
          </View>

          <ScrollView
            style={styles.editorScroll}
            contentContainerStyle={
              styles.editorContent
            }
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="none"
            showsVerticalScrollIndicator={
              false
            }
          >
            <Text
              style={styles.fieldLabel}
            >
              Título opcional
            </Text>

            <TextInput
              value={titulo}
              onChangeText={setTitulo}
              placeholder="Ex.: Evolução da semana"
              placeholderTextColor="#9CA3AF"
              style={styles.titleInput}
              returnKeyType="next"
              maxLength={120}
            />

            <Text
              style={styles.fieldLabel}
            >
              Anotação
            </Text>

            <TextInput
              value={texto}
              onChangeText={setTexto}
              placeholder="Escreva evoluções, observações clínicas, lembretes ou outras informações importantes."
              placeholderTextColor="#9CA3AF"
              style={styles.bodyInput}
              multiline
              textAlignVertical="top"
              autoFocus
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

export default function PetAnotacoes() {
  const params =
    useLocalSearchParams();

  const navigation =
    useNavigation();

  const dispatch = useDispatch();
  const insets =
    useSafeAreaInsets();

  const rawPetId =
    Array.isArray(params.petId)
      ? params.petId[0]
      : params.petId;

  const petId =
    rawPetId
      ? String(rawPetId)
      : null;

  const pet = useSelector(
    (state) =>
      petId
        ? selectPetById(petId)(
            state
          )
        : null,
  );

  const selectByPet = useMemo(
    () =>
      makeSelectAnotacoesByPet(
        petId
      ),
    [petId],
  );

  const selectLoading = useMemo(
    () =>
      selectAnotacoesLoadingByPet(
        petId
      ),
    [petId],
  );

  const annotations = useSelector(
    selectByPet
  );

  const loadingStatus =
    useSelector(selectLoading);

  const saving = useSelector(
    selectAnotacoesSaving
  );

  const bg = useThemeColor(
    {},
    "background"
  );

  const text = useThemeColor(
    {},
    "text"
  );

  const tint = useThemeColor(
    {},
    "tint"
  );

  const subtle = useThemeColor(
    {
      light: "#6B7280",
      dark: "#9AA0A6",
    },
    "text",
  );

  const border = useThemeColor(
    {
      light:
        "rgba(15,23,42,0.08)",
      dark:
        "rgba(255,255,255,0.12)",
    },
    "border",
  );

  const [refreshing, setRefreshing] =
    useState(false);

  const [
    editorVisible,
    setEditorVisible,
  ] = useState(false);

  const [editing, setEditing] =
    useState(null);

  useEffect(() => {
    if (petId && !pet) {
      dispatch(fetchPet(petId));
    }
  }, [
    dispatch,
    petId,
    pet,
  ]);

  useEffect(() => {
    if (!petId) return;

    dispatch(
      fetchAnotacoesByPet(petId)
    );
  }, [
    dispatch,
    petId,
  ]);

  const openCreate = useCallback(
    () => {
      Haptics.impactAsync(
        Haptics
          .ImpactFeedbackStyle
          .Light,
      ).catch(() => {});

      setEditing(null);
      setEditorVisible(true);
    },
    [],
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      title: pet?.nome
        ? `Anotações de ${pet.nome}`
        : "Anotações",

      headerShown: true,
      headerTitleAlign: "center",
      headerBackTitleVisible: false,
      headerShadowVisible: false,

      headerStyle: {
        backgroundColor: bg,
      },

      headerTintColor: tint,

      headerTitleStyle: {
        color: text,
        fontWeight: "800",
      },

      headerRight: () => (
        <Pressable
          onPress={openCreate}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Adicionar anotação"
          style={({ pressed }) => [
            styles.headerAddButton,
            pressed && {
              opacity: 0.65,
            },
          ]}
        >
          <Ionicons
            name="add-circle"
            size={27}
            color={tint}
          />
        </Pressable>
      ),
    });
  }, [
    navigation,
    pet?.nome,
    bg,
    tint,
    text,
    openCreate,
  ]);

  const closeEditor = useCallback(
    () => {
      Keyboard.dismiss();
      setEditorVisible(false);
      setEditing(null);
    },
    [],
  );

  const handleSave = useCallback(
    async ({
      titulo,
      texto,
    }) => {
      if (!petId) return;

      try {
        if (editing?.id) {
          await dispatch(
            updateAnotacao({
              id: editing.id,
              patch: {
                titulo,
                texto,
              },
            }),
          ).unwrap();
        } else {
          await dispatch(
            addAnotacao({
              petId,
              tutorId:
                pet?.tutor?.id
                  ? String(
                      pet.tutor.id
                    )
                  : null,
              titulo,
              texto,
            }),
          ).unwrap();
        }

        Haptics.notificationAsync(
          Haptics
            .NotificationFeedbackType
            .Success,
        ).catch(() => {});

        closeEditor();
      } catch (error) {
        Haptics.notificationAsync(
          Haptics
            .NotificationFeedbackType
            .Error,
        ).catch(() => {});

        Alert.alert(
          "Anotações",
          error?.message ||
            "Não foi possível salvar a anotação.",
        );
      }
    },
    [
      dispatch,
      editing?.id,
      petId,
      pet?.tutor?.id,
      closeEditor,
    ],
  );

  const handleDelete =
    useCallback(
      (item) => {
        Alert.alert(
          "Excluir anotação",
          "Essa ação não pode ser desfeita.",
          [
            {
              text: "Cancelar",
              style: "cancel",
            },
            {
              text: "Excluir",
              style: "destructive",
              onPress: async () => {
                try {
                  await dispatch(
                    deleteAnotacao(
                      item.id
                    ),
                  ).unwrap();

                  Haptics.notificationAsync(
                    Haptics
                      .NotificationFeedbackType
                      .Success,
                  ).catch(() => {});
                } catch (error) {
                  Alert.alert(
                    "Anotações",
                    error?.message ||
                      "Não foi possível excluir a anotação.",
                  );
                }
              },
            },
          ],
        );
      },
      [dispatch],
    );

  const onRefresh =
    useCallback(async () => {
      if (!petId) return;

      setRefreshing(true);

      try {
        await dispatch(
          fetchAnotacoesByPet(
            petId
          ),
        ).unwrap();
      } finally {
        setRefreshing(false);
      }
    }, [
      dispatch,
      petId,
    ]);

  if (!petId) {
    return (
      <SafeAreaView
        style={[
          styles.center,
          {
            backgroundColor: bg,
          },
        ]}
        edges={[
          "left",
          "right",
        ]}
      >
        <Text
          style={{
            color: subtle,
          }}
        >
          Pet inválido.
        </Text>
      </SafeAreaView>
    );
  }

  const isInitialLoading =
    loadingStatus === "loading" &&
    annotations.length === 0;

  if (isInitialLoading) {
    return (
      <SafeAreaView
        style={[
          styles.center,
          {
            backgroundColor: bg,
          },
        ]}
        edges={[
          "left",
          "right",
        ]}
      >
        <ActivityIndicator />
        <Text
          style={[
            styles.loadingText,
            {
              color: subtle,
            },
          ]}
        >
          Carregando anotações…
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[
        styles.safe,
        {
          backgroundColor: bg,
        },
      ]}
      edges={[
        "left",
        "right",
      ]}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom:
              Math.max(
                insets.bottom,
                16,
              ) + 28,
          },
          annotations.length === 0 && {
            flexGrow: 1,
          },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={tint}
            colors={[tint]}
          />
        }
        showsVerticalScrollIndicator={
          false
        }
      >
        {annotations.length > 0 ? (
          <>
            <View style={styles.summary}>
              <Text
                style={[
                  styles.summaryTitle,
                  {
                    color: text,
                  },
                ]}
              >
                Histórico de anotações
              </Text>

              <Text
                style={[
                  styles.summaryText,
                  {
                    color: subtle,
                  },
                ]}
              >
                {annotations.length}{" "}
                {annotations.length === 1
                  ? "anotação registrada"
                  : "anotações registradas"}
              </Text>
            </View>

            <View
              style={styles.annotationList}
            >
              {annotations.map(
                (item) => (
                  <AnnotationCard
                    key={String(
                      item.id
                    )}
                    item={item}
                    text={text}
                    subtle={subtle}
                    border={border}
                    onEdit={(
                      selected
                    ) => {
                      setEditing(
                        selected
                      );

                      setEditorVisible(
                        true
                      );
                    }}
                    onDelete={
                      handleDelete
                    }
                  />
                ),
              )}
            </View>
          </>
        ) : (
          <View
            style={[
              styles.emptyCard,
              {
                borderColor:
                  border,
              },
            ]}
          >
            <View
              style={styles.emptyIcon}
            >
              <Ionicons
                name="document-text-outline"
                size={30}
                color="#0A84FF"
              />
            </View>

            <Text
              style={[
                styles.emptyTitle,
                {
                  color: text,
                },
              ]}
            >
              Nenhuma anotação
            </Text>

            <Text
              style={[
                styles.emptyText,
                {
                  color: subtle,
                },
              ]}
            >
              Registre evoluções,
              observações clínicas,
              lembretes ou outras
              informações importantes
              sobre este pet.
            </Text>

            <Pressable
              onPress={openCreate}
              style={({ pressed }) => [
                styles.emptyButton,
                pressed && {
                  opacity: 0.84,
                },
              ]}
            >
              <Ionicons
                name="add"
                size={18}
                color="#FFFFFF"
              />

              <Text
                style={
                  styles.emptyButtonText
                }
              >
                Adicionar anotação
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      <AnnotationEditor
        visible={editorVisible}
        initialValue={editing}
        saving={saving}
        onCancel={closeEditor}
        onSave={handleSave}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: "600",
  },

  content: {
    padding: 16,
  },

  headerAddButton: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },

  summary: {
    marginBottom: 14,
    paddingHorizontal: 2,
  },

  summaryTitle: {
    fontSize: 20,
    fontWeight: "850",
    letterSpacing: -0.3,
  },

  summaryText: {
    marginTop: 3,
    fontSize: 13,
    fontWeight: "600",
  },

  annotationList: {
    gap: 12,
  },

  annotationCard: {
    borderWidth:
      StyleSheet.hairlineWidth,
    borderRadius: 18,
    padding: 14,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOpacity: 0.045,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 1,
  },

  annotationHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  annotationIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor:
      "rgba(15,23,42,0.82)",
    alignItems: "center",
    justifyContent: "center",
  },

  annotationHeaderText: {
    flex: 1,
    minWidth: 0,
  },

  annotationTitle: {
    fontSize: 15,
    fontWeight: "850",
  },

  annotationDate: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: "600",
    textTransform: "capitalize",
  },

  deleteButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor:
      "rgba(239,68,68,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },

  annotationText: {
    marginTop: 12,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "500",
  },

  emptyCard: {
    flex: 1,
    minHeight: 360,
    borderWidth:
      StyleSheet.hairlineWidth,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 28,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyIcon: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor:
      "rgba(10,132,255,0.10)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: "850",
  },

  emptyText: {
    marginTop: 7,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },

  emptyButton: {
    minHeight: 44,
    marginTop: 18,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: "#0A84FF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },

  emptyButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "850",
  },

  editorSafe: {
    flex: 1,
    backgroundColor: "#F5F5F7",
  },

  editorKeyboard: {
    flex: 1,
  },

  editorHeader: {
    minHeight: 58,
    paddingHorizontal: 16,
    borderBottomWidth:
      StyleSheet.hairlineWidth,
    borderBottomColor:
      "rgba(15,23,42,0.10)",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent:
      "space-between",
  },

  editorHeaderButton: {
    minWidth: 64,
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
  },

  editorCancel: {
    color: "#6B7280",
    fontSize: 15,
    fontWeight: "700",
  },

  editorTitle: {
    color: "#111827",
    fontSize: 16,
    fontWeight: "850",
  },

  editorSave: {
    color: "#0A84FF",
    fontSize: 15,
    fontWeight: "850",
  },

  editorScroll: {
    flex: 1,
  },

  editorContent: {
    padding: 16,
    paddingBottom: 36,
  },

  fieldLabel: {
    marginLeft: 2,
    marginBottom: 7,
    color: "#374151",
    fontSize: 13,
    fontWeight: "800",
  },

  titleInput: {
    minHeight: 48,
    marginBottom: 18,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth:
      StyleSheet.hairlineWidth,
    borderColor:
      "rgba(15,23,42,0.10)",
    backgroundColor: "#FFFFFF",
    color: "#111827",
    fontSize: 15,
  },

  bodyInput: {
    minHeight: 240,
    padding: 14,
    borderRadius: 16,
    borderWidth:
      StyleSheet.hairlineWidth,
    borderColor:
      "rgba(15,23,42,0.10)",
    backgroundColor: "#FFFFFF",
    color: "#111827",
    fontSize: 15,
    lineHeight: 22,
  },
});
