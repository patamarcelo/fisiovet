// src/screens/pacientes/Detail.jsx
// @ts-nocheck

import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";

import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  router,
  useLocalSearchParams,
  useNavigation,
} from "expo-router";

import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { useDispatch, useSelector } from "react-redux";
import * as Haptics from "expo-haptics";

import {
  fetchPet,
  selectPetById,
} from "@/src/store/slices/petsSlice";

import {
  clearDraft,
  createDraft,
} from "@/src/store/slices/avaliacaoSlice";

import { useThemeColor } from "@/hooks/useThemeColor";
import { IconSymbol } from "@/components/ui/IconSymbol";

import { uploadExamForPet } from "@/src/features/exams/uploadExam";
import { ensureFirebase } from "@/firebase/firebase";

import {
  chooseExamSource,
  takePhotoAsFile,
  pickImageAsFile,
  pickDocumentAsFile,
} from "@/src/features/exams/pickers";

const AVALIACAO_TIPOS = [
  {
    key: "rota",
    label: "Anamnese",
    formPath:
      "/avaliacao/avaliacao-anamnese",
  },
  {
    key: "avaliacao",
    label: "Avaliação Neurológica",
    formPath:
      "/(modals)/avaliacao/avaliacao-neurologica",
  },
  {
    key: "form",
    label: "Avaliação Ortopédica",
    formPath:
      "/(modals)/avaliacao/avaliacao-ortopedica",
  },
];

const ACTION_META = {
  tutor: {
    color: "#0A84FF",
    background: "rgba(10,132,255,0.11)",
  },
  avaliacao: {
    color: "#8B5CF6",
    background: "rgba(139,92,246,0.11)",
  },
  exames: {
    color: "#EC4899",
    background: "rgba(236,72,153,0.11)",
  },
  agenda: {
    color: "#16A34A",
    background: "rgba(22,163,74,0.11)",
  },
  anotacoes: {
    color: "#D97706",
    background: "rgba(217,119,6,0.11)",
  },
  timeline: {
    color: "#0F766E",
    background: "rgba(15,118,110,0.11)",
  },
  midia: {
    color: "#64748B",
    background: "rgba(100,116,139,0.11)",
  },
};

function getFormPathByTipo(tipoKey) {
  const found = AVALIACAO_TIPOS.find(
    (item) => item.key === tipoKey
  );

  return (
    found?.formPath ||
    "/(modals)/avaliacao-new"
  );
}

function formatPeso(pesoKg) {
  if (
    pesoKg == null ||
    Number.isNaN(Number(pesoKg))
  ) {
    return null;
  }

  return `${String(pesoKg).replace(
    ".",
    ","
  )} kg`;
}

function formatIdade(idade) {
  if (
    idade == null ||
    Number.isNaN(Number(idade))
  ) {
    return null;
  }

  const value = Number(idade);

  return `${value} ${
    value === 1 ? "ano" : "anos"
  }`;
}

function SectionHeader({
  eyebrow,
  title,
  subtitle,
  text,
  subtle,
}) {
  return (
    <View style={styles.sectionHeader}>
      {!!eyebrow && (
        <Text style={styles.sectionEyebrow}>
          {eyebrow}
        </Text>
      )}

      <Text
        style={[
          styles.sectionTitle,
          { color: text },
        ]}
      >
        {title}
      </Text>

      {!!subtitle && (
        <Text
          style={[
            styles.sectionSubtitle,
            { color: subtle },
          ]}
        >
          {subtitle}
        </Text>
      )}
    </View>
  );
}

function ActionCard({
  title,
  subtitle,
  icon,
  tone = "tutor",
  onPress,
  onAdd,
  border,
  text,
  subtle,
  wide = false,
  disabled = false,
}) {
  const meta =
    ACTION_META[tone] ||
    ACTION_META.tutor;

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={({ pressed }) => [
        styles.actionCard,
        wide && styles.actionCardWide,
        {
          borderColor: border,
        },
        pressed &&
          !disabled && {
            opacity: 0.88,
            transform: [
              {
                scale: 0.995,
              },
            ],
          },
        disabled && {
          opacity: 0.62,
        },
      ]}
    >
      <View
        style={[
          styles.actionIconWrap,
          {
            backgroundColor:
              meta.background,
          },
        ]}
      >
        <IconSymbol
          name={icon}
          size={20}
          color={meta.color}
        />
      </View>

      <View style={styles.actionContent}>
        <Text
          style={[
            styles.actionTitle,
            { color: text },
          ]}
          numberOfLines={1}
        >
          {title}
        </Text>

        {!!subtitle && (
          <Text
            style={[
              styles.actionSubtitle,
              { color: subtle },
            ]}
            numberOfLines={2}
          >
            {subtitle}
          </Text>
        )}
      </View>

      <View style={styles.actionRight}>
        {onAdd && (
          <Pressable
            onPress={(event) => {
              event.stopPropagation();

              Haptics.impactAsync(
                Haptics
                  .ImpactFeedbackStyle
                  .Light
              ).catch(() => {});

              onAdd();
            }}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`Adicionar em ${title}`}
            style={({ pressed }) => [
              styles.addButton,
              {
                backgroundColor:
                  meta.background,
              },
              pressed && {
                opacity: 0.65,
              },
            ]}
          >
            <IconSymbol
              name="plus"
              size={15}
              color={meta.color}
            />
          </Pressable>
        )}

        <View
          style={styles.chevronButton}
        >
          <IconSymbol
            name="chevron.right"
            size={14}
            color={subtle}
          />
        </View>
      </View>
    </Pressable>
  );
}

function TimelineFeatureCard({
  petName,
  onPress,
  border,
  text,
  subtle,
}) {
  const meta = ACTION_META.timeline;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.timelineFeature,
        {
          borderColor: border,
        },
        pressed && {
          opacity: 0.9,
          transform: [
            {
              scale: 0.996,
            },
          ],
        },
      ]}
    >
      <View style={styles.timelineFeatureTop}>
        <View
          style={[
            styles.timelineFeatureIcon,
            {
              backgroundColor:
                meta.background,
            },
          ]}
        >
          <IconSymbol
            name="clock.arrow.circlepath"
            size={23}
            color={meta.color}
          />
        </View>

        <View
          style={styles.timelineFeatureBadge}
        >
          <Text
            style={[
              styles.timelineFeatureBadgeText,
              {
                color: meta.color,
              },
            ]}
          >
            HISTÓRICO CLÍNICO
          </Text>
        </View>
      </View>

      <Text
        style={[
          styles.timelineFeatureTitle,
          {
            color: text,
          },
        ]}
      >
        Timeline de {petName || "paciente"}
      </Text>

      <Text
        style={[
          styles.timelineFeatureSubtitle,
          {
            color: subtle,
          },
        ]}
      >
        Consultas, avaliações, exames,
        anotações e registros financeiros
        organizados em ordem cronológica.
      </Text>

      <View
        style={styles.timelineFeatureFooter}
      >
        <Text
          style={[
            styles.timelineFeatureLink,
            {
              color: meta.color,
            },
          ]}
        >
          Ver histórico completo
        </Text>

        <IconSymbol
          name="arrow.right"
          size={16}
          color={meta.color}
        />
      </View>
    </Pressable>
  );
}

function UploadOverlay({
  visible,
  progress = 0,
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      presentationStyle={
        Platform.OS === "ios"
          ? "overFullScreen"
          : "fullScreen"
      }
    >
      <View style={styles.overlay}>
        <View style={styles.overlayCard}>
          <ActivityIndicator
            size="large"
            color="#FFFFFF"
          />

          <Text style={styles.overlayTitle}>
            Enviando… {progress}%
          </Text>

          <View
            style={styles.progressTrack}
          >
            <View
              style={[
                styles.progressFill,
                {
                  width: `${progress}%`,
                },
              ]}
            />
          </View>

          <Text style={styles.overlaySub}>
            Não feche o app durante o upload
          </Text>
        </View>
      </View>
    </Modal>
  );
}

export default function PetDetail() {
  const params = useLocalSearchParams();
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();

  const rawId =
    Array.isArray(params.id)
      ? params.id[0]
      : params.id;

  const rawFrom =
    Array.isArray(params.from)
      ? params.from[0]
      : params.from;

  const rawTutorId =
    Array.isArray(params.tutorId)
      ? params.tutorId[0]
      : params.tutorId;

  const id =
    rawId != null
      ? String(rawId)
      : null;

  const from =
    rawFrom != null
      ? String(rawFrom)
      : null;

  const tutorId =
    rawTutorId != null
      ? String(rawTutorId)
      : null;

  const pet = useSelector((state) =>
    id
      ? selectPetById(id)(state)
      : null
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
    "text"
  );

  const border = useThemeColor(
    {
      light:
        "rgba(15,23,42,0.08)",
      dark:
        "rgba(255,255,255,0.12)",
    },
    "border"
  );

  const bg = useThemeColor(
    {},
    "background"
  );

  const [uploading, setUploading] =
    useState(false);

  const [progress, setProgress] =
    useState(0);

  useEffect(() => {
    if (!id) return;

    if (!pet) {
      dispatch(fetchPet(id));
    }
  }, [
    dispatch,
    id,
    pet,
  ]);

  const goBack = useCallback(() => {
    if (from === "tutor") {
      if (router.canDismiss()) {
        router.dismiss();
        return;
      }

      if (tutorId) {
        router.replace({
          pathname:
            "/(phone)/tutores/[id]",
          params: {
            id: tutorId,
          },
        });

        return;
      }
    }

    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace(
      "/(phone)/pacientes"
    );
  }, [
    from,
    tutorId,
  ]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle:
        pet?.nome ?? "Pet",

      headerTintColor: tint,

      headerStyle: {
        backgroundColor: bg,
      },

      headerShadowVisible: false,
      headerBackVisible: false,
      headerLargeTitle: false,
      gestureEnabled: true,

      headerLeft: () => (
        <Pressable
          onPress={goBack}
          hitSlop={10}
          accessibilityLabel="Voltar"
          style={({ pressed }) => [
            styles.headerBackButton,
            pressed && {
              opacity: 0.65,
            },
          ]}
        >
          <IconSymbol
            name="chevron.left"
            size={20}
            color={tint}
          />
        </Pressable>
      ),
    });
  }, [
    navigation,
    pet?.nome,
    tint,
    bg,
    goBack,
  ]);

  const icon =
    pet?.especie === "gato"
      ? "cat.fill"
      : "dog.fill";

  const detailsLine = useMemo(() => {
    if (!pet) return "";

    return [
      pet.especie,
      pet.raca,
      pet.cor,
    ]
      .filter(Boolean)
      .join(" • ");
  }, [pet]);

  const metrics = useMemo(() => {
    if (!pet) return [];

    return [
      {
        label: "Peso",
        value:
          formatPeso(pet.pesoKg) ||
          "Não informado",
      },
      {
        label: "Idade",
        value:
          formatIdade(pet.idade) ||
          "Não informada",
      },
      {
        label: "Espécie",
        value:
          pet.especie || "Não informada",
      },
    ];
  }, [pet]);

  const handleAddExam =
    useCallback(async () => {
      if (!pet) return;

      try {
        const fb = ensureFirebase();

        if (!fb) {
          Alert.alert(
            "Exames",
            "Falha ao inicializar Firebase."
          );

          return;
        }

        const {
          auth,
          storageInstance,
        } = fb;

        const uid =
          auth?.currentUser?.uid;

        if (!uid) {
          Alert.alert(
            "Exames",
            "Usuário não autenticado."
          );

          return;
        }

        const source =
          await chooseExamSource();

        if (!source) return;

        let picked = null;

        if (source === "camera") {
          picked =
            await takePhotoAsFile();
        } else if (
          source === "gallery"
        ) {
          picked =
            await pickImageAsFile();
        } else if (
          source === "document"
        ) {
          picked =
            await pickDocumentAsFile();
        }

        if (!picked) return;

        setUploading(true);
        setProgress(0);

        await uploadExamForPet({
          uid,
          petId: String(pet.id),
          tutorId:
            pet.tutor?.id
              ? String(
                  pet.tutor.id
                )
              : null,
          title: null,
          notes: null,
          file: picked,
          onProgress: (value) =>
            setProgress(value),
        });

        setProgress(100);
        setUploading(false);

        Haptics.notificationAsync(
          Haptics
            .NotificationFeedbackType
            .Success
        ).catch(() => {});

        Alert.alert(
          "Exames",
          "Arquivo salvo!"
        );
      } catch (error) {
        setUploading(false);

        Haptics.notificationAsync(
          Haptics
            .NotificationFeedbackType
            .Error
        ).catch(() => {});

        console.log(
          "Erro ao salvar exame:",
          error
        );

        Alert.alert(
          "Exames",
          "Falha ao salvar o arquivo."
        );
      }
    }, [pet]);

  const handleAddDraft =
    useCallback(() => {
      if (!pet?.id) return;

      const petId = String(pet.id);

      const startDraft = (
        tipoKey
      ) => {
        try {
          dispatch(
            clearDraft({
              petId,
            })
          );

          dispatch(
            createDraft({
              petId,
              tipo: tipoKey,
            })
          );

          router.push({
            pathname:
              getFormPathByTipo(
                tipoKey
              ),
            params: {
              id: petId,
              tipo: tipoKey,
            },
          });
        } catch (error) {
          console.log(
            "handleAdd avaliacao error",
            error
          );

          Alert.alert(
            "Avaliações",
            "Não foi possível iniciar uma nova avaliação."
          );
        }
      };

      const labels =
        AVALIACAO_TIPOS.map(
          (item) => item.label
        );

      const cancelIndex =
        labels.length;

      if (Platform.OS === "ios") {
        ActionSheetIOS.showActionSheetWithOptions(
          {
            title:
              "Nova avaliação",
            options: [
              ...labels,
              "Cancelar",
            ],
            cancelButtonIndex:
              cancelIndex,
          },
          (buttonIndex) => {
            if (
              buttonIndex ===
              cancelIndex
            ) {
              return;
            }

            const chosen =
              AVALIACAO_TIPOS[
                buttonIndex
              ];

            if (chosen) {
              startDraft(
                chosen.key
              );
            }
          }
        );

        return;
      }

      Alert.alert(
        "Novo registro",
        "Escolha o tipo de avaliação",
        [
          ...AVALIACAO_TIPOS.map(
            (item) => ({
              text: item.label,
              onPress: () =>
                startDraft(
                  item.key
                ),
            })
          ),
          {
            text: "Cancelar",
            style: "cancel",
          },
        ]
      );
    }, [
      dispatch,
      pet?.id,
    ]);

  const openNewAnnotation =
    useCallback(() => {
      if (!pet?.id) return;

      router.push({
        pathname:
          "/(modals)/anotacoes/[petId]",
        params: {
          petId: String(pet.id),
          action: "new",
        },
      });
    }, [pet?.id]);

  if (!id) {
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

  if (!pet) {
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
          style={{
            color: subtle,
            marginTop: 10,
          }}
        >
          Carregando pet…
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[
        styles.container,
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
              28 +
              Math.max(
                insets.bottom,
                0
              ),
          },
        ]}
        showsVerticalScrollIndicator={
          false
        }
      >
        <View
          style={[
            styles.heroCard,
            {
              borderColor: border,
            },
          ]}
        >
          <View style={styles.heroTop}>
            <View
              style={styles.avatarHalo}
            >
              <View
                style={styles.avatarBig}
              >
                <IconSymbol
                  name={icon}
                  size={28}
                  color="#FFFFFF"
                />
              </View>
            </View>

            <View style={styles.heroMain}>
              <Text
                style={[
                  styles.title,
                  {
                    color: text,
                  },
                ]}
                numberOfLines={1}
              >
                {pet.nome}
              </Text>

              {!!detailsLine && (
                <Text
                  style={[
                    styles.infoText,
                    {
                      color: subtle,
                    },
                  ]}
                  numberOfLines={2}
                >
                  {detailsLine}
                </Text>
              )}
            </View>

            <Pressable
              onPress={() =>
                router.push({
                  pathname:
                    "/(modals)/pet-new",
                  params: {
                    mode: "edit",
                    id: String(pet.id),
                  },
                })
              }
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Editar pet"
              style={({ pressed }) => [
                styles.editButton,
                pressed && {
                  opacity: 0.65,
                },
              ]}
            >
              <IconSymbol
                name="pencil"
                size={17}
                color={tint}
              />
            </Pressable>
          </View>

          <View style={styles.metricsRow}>
            {metrics.map(
              (item, index) => (
                <React.Fragment
                  key={item.label}
                >
                  {index > 0 && (
                    <View
                      style={[
                        styles.metricDivider,
                        {
                          backgroundColor:
                            border,
                        },
                      ]}
                    />
                  )}

                  <View
                    style={styles.metricItem}
                  >
                    <Text
                      style={[
                        styles.metricValue,
                        {
                          color: text,
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {item.value}
                    </Text>

                    <Text
                      style={[
                        styles.metricLabel,
                        {
                          color: subtle,
                        },
                      ]}
                    >
                      {item.label}
                    </Text>
                  </View>
                </React.Fragment>
              )
            )}
          </View>
        </View>

        {!!pet.observacoes && (
          <View
            style={[
              styles.observationCard,
              {
                borderColor:
                  "rgba(10,132,255,0.16)",
              },
            ]}
          >
            <View
              style={
                styles.observationIcon
              }
            >
              <IconSymbol
                name="info.circle.fill"
                size={18}
                color="#0A84FF"
              />
            </View>

            <View
              style={
                styles.observationContent
              }
            >
              <Text
                style={[
                  styles.observationTitle,
                  {
                    color: text,
                  },
                ]}
              >
                Observações
              </Text>

              <Text
                style={[
                  styles.observationText,
                  {
                    color: subtle,
                  },
                ]}
              >
                {pet.observacoes}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <SectionHeader
            eyebrow="CADASTRO"
            title="Paciente e tutor"
            subtitle="Dados principais e vínculo responsável."
            text={text}
            subtle={subtle}
          />

          <ActionCard
            title={
              pet.tutor?.nome
                ? `Tutor: ${pet.tutor.nome}`
                : "Tutor"
            }
            subtitle={
              pet.tutor?.id
                ? "Ver cadastro completo do tutor"
                : "Tutor ainda não vinculado"
            }
            icon="person.crop.circle.fill"
            tone="tutor"
            border={border}
            text={text}
            subtle={subtle}
            onPress={() => {
              if (!pet?.tutor?.id) {
                Alert.alert(
                  "Tutor não vinculado"
                );

                return;
              }

              if (from === "tutor") {
                if (
                  router.canDismiss()
                ) {
                  router.dismiss();
                  return;
                }

                router.replace({
                  pathname:
                    "/(phone)/tutores/[id]",
                  params: {
                    id: String(
                      tutorId ||
                        pet.tutor.id
                    ),
                  },
                });

                return;
              }

              router.push({
                pathname:
                  "/(modals)/tutores/[id]/detail",
                params: {
                  id: String(
                    pet.tutor.id
                  ),
                  from: "pet",
                  petId: String(
                    pet.id
                  ),
                },
              });
            }}
          />
        </View>

        <View style={styles.section}>
          <SectionHeader
            eyebrow="PRONTUÁRIO"
            title="Registros clínicos"
            subtitle="Avaliações, exames e anotações deste paciente."
            text={text}
            subtle={subtle}
          />

          <View
            style={styles.cardsStack}
          >
            <ActionCard
              title="Avaliações"
              subtitle="Anamnese, neurológica e ortopédica"
              icon="clipboard"
              tone="avaliacao"
              border={border}
              text={text}
              subtle={subtle}
              onPress={() =>
                router.push({
                  pathname:
                    "/(modals)/pets/[id]/avaliacao",
                  params: {
                    id: String(pet.id),
                    petName:
                      pet.nome || "",
                  },
                })
              }
              onAdd={handleAddDraft}
            />

            <ActionCard
              title="Exames"
              subtitle="Arquivos, fotos e documentos"
              icon="doc.text.fill"
              tone="exames"
              border={border}
              text={text}
              subtle={subtle}
              onPress={() =>
                router.push({
                  pathname:
                    "/(modals)/pets/[id]/exam",
                  params: {
                    id: String(pet.id),
                  },
                })
              }
              onAdd={handleAddExam}
            />

            <ActionCard
              title="Anotações"
              subtitle="Evoluções, observações e lembretes"
              icon="note.text"
              tone="anotacoes"
              border={border}
              text={text}
              subtle={subtle}
              onPress={() =>
                router.push({
                  pathname:
                    "/(modals)/anotacoes/[petId]",
                  params: {
                    petId:
                      String(pet.id),
                  },
                })
              }
              onAdd={
                openNewAnnotation
              }
            />
          </View>
        </View>

        <View style={styles.section}>
          <SectionHeader
            eyebrow="ROTINA"
            title="Agenda e acompanhamento"
            subtitle="Organize os atendimentos e acompanhe a evolução."
            text={text}
            subtle={subtle}
          />

          <ActionCard
            title="Agenda"
            subtitle="Atendimentos deste pet"
            icon="calendar"
            tone="agenda"
            border={border}
            text={text}
            subtle={subtle}
            onPress={() =>
              router.push({
                pathname:
                  "/(modals)/agenda/[petId]",
                params: {
                  petId:
                    String(pet.id),
                },
              })
            }
            onAdd={() =>
              router.push({
                pathname:
                  "/(modals)/agenda-new",
                params: {
                  tutorId:
                    pet.tutor?.id
                      ? String(
                          pet.tutor.id
                        )
                      : "",
                  tutorNome:
                    pet.tutor?.nome ||
                    "",
                  preselectPetId:
                    String(pet.id),
                  petNome:
                    pet.nome || "",
                },
              })
            }
          />
        </View>

        <TimelineFeatureCard
          petName={pet.nome}
          border={border}
          text={text}
          subtle={subtle}
          onPress={() =>
            router.push({
              pathname:
                "/(modals)/pets/[id]/timeline",
              params: {
                id: String(pet.id),
                petName:
                  pet.nome || "",
              },
            })
          }
        />

        <View style={styles.section}>
          <SectionHeader
            eyebrow="MÍDIA"
            title="Fotos e vídeos"
            subtitle="Galeria clínica e acompanhamento visual."
            text={text}
            subtle={subtle}
          />

          <ActionCard
            title="Fotos & Vídeos"
            subtitle="Em breve"
            icon="photo.on.rectangle"
            tone="midia"
            border={border}
            text={text}
            subtle={subtle}
            disabled
            onPress={() => {}}
          />
        </View>
      </ScrollView>

      <UploadOverlay
        visible={uploading}
        progress={progress}
      />
    </SafeAreaView>
  );
}

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
    },

    content: {
      padding: 16,
      gap: 22,
    },

    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },

    headerBackButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor:
        "rgba(118,118,128,0.10)",
    },

    heroCard: {
      borderWidth:
        StyleSheet.hairlineWidth,
      borderRadius: 24,
      backgroundColor: "#FFFFFF",
      padding: 16,
      shadowColor: "#000",
      shadowOpacity: 0.06,
      shadowRadius: 14,
      shadowOffset: {
        width: 0,
        height: 6,
      },
      elevation: 2,
    },

    heroTop: {
      flexDirection: "row",
      alignItems: "center",
      gap: 13,
    },

    avatarHalo: {
      width: 62,
      height: 62,
      borderRadius: 31,
      backgroundColor:
        "rgba(16,185,129,0.12)",
      alignItems: "center",
      justifyContent: "center",
    },

    avatarBig: {
      width: 50,
      height: 50,
      borderRadius: 25,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#10B981",
      shadowColor: "#10B981",
      shadowOpacity: 0.22,
      shadowRadius: 8,
      shadowOffset: {
        width: 0,
        height: 4,
      },
    },

    heroMain: {
      flex: 1,
      minWidth: 0,
    },

    title: {
      fontSize: 23,
      fontWeight: "850",
      letterSpacing: -0.55,
    },

    infoText: {
      marginTop: 4,
      fontSize: 13,
      lineHeight: 18,
      fontWeight: "550",
      textTransform: "capitalize",
    },

    editButton: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor:
        "rgba(10,132,255,0.10)",
      alignItems: "center",
      justifyContent: "center",
    },

    metricsRow: {
      minHeight: 68,
      marginTop: 16,
      paddingTop: 14,
      borderTopWidth:
        StyleSheet.hairlineWidth,
      borderTopColor:
        "rgba(15,23,42,0.08)",
      flexDirection: "row",
      alignItems: "center",
    },

    metricItem: {
      flex: 1,
      minWidth: 0,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 6,
    },

    metricValue: {
      fontSize: 13,
      fontWeight: "850",
      textAlign: "center",
      textTransform: "capitalize",
    },

    metricLabel: {
      marginTop: 4,
      fontSize: 10,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 0.25,
    },

    metricDivider: {
      width: 1,
      height: 30,
    },

    observationCard: {
      borderWidth:
        StyleSheet.hairlineWidth,
      borderRadius: 18,
      padding: 14,
      backgroundColor:
        "rgba(10,132,255,0.055)",
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 11,
    },

    observationIcon: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor:
        "rgba(10,132,255,0.10)",
      alignItems: "center",
      justifyContent: "center",
    },

    observationContent: {
      flex: 1,
      minWidth: 0,
    },

    observationTitle: {
      fontSize: 14,
      fontWeight: "850",
    },

    observationText: {
      marginTop: 4,
      fontSize: 13,
      lineHeight: 19,
    },

    section: {
      gap: 11,
    },

    sectionHeader: {
      paddingHorizontal: 2,
    },

    sectionEyebrow: {
      color: "#8E8E93",
      fontSize: 10,
      fontWeight: "850",
      letterSpacing: 0.55,
    },

    sectionTitle: {
      marginTop: 4,
      fontSize: 18,
      fontWeight: "850",
      letterSpacing: -0.25,
    },

    sectionSubtitle: {
      marginTop: 3,
      fontSize: 12,
      lineHeight: 17,
      fontWeight: "550",
    },

    cardsStack: {
      gap: 10,
    },

    actionCard: {
      minHeight: 76,
      borderWidth:
        StyleSheet.hairlineWidth,
      borderRadius: 19,
      backgroundColor: "#FFFFFF",
      padding: 13,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      shadowColor: "#000",
      shadowOpacity: 0.045,
      shadowRadius: 9,
      shadowOffset: {
        width: 0,
        height: 4,
      },
      elevation: 1,
    },

    actionCardWide: {
      minHeight: 92,
    },

    actionIconWrap: {
      width: 44,
      height: 44,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
    },

    actionContent: {
      flex: 1,
      minWidth: 0,
    },

    actionTitle: {
      fontSize: 15,
      fontWeight: "850",
      letterSpacing: -0.1,
    },

    actionSubtitle: {
      marginTop: 4,
      fontSize: 12,
      lineHeight: 17,
      fontWeight: "550",
    },

    actionRight: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
    },

    addButton: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: "center",
      justifyContent: "center",
    },

    chevronButton: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor:
        "rgba(118,118,128,0.08)",
    },

    timelineFeature: {
      borderWidth:
        StyleSheet.hairlineWidth,
      borderRadius: 22,
      padding: 16,
      backgroundColor: "#FFFFFF",
      shadowColor: "#000",
      shadowOpacity: 0.055,
      shadowRadius: 12,
      shadowOffset: {
        width: 0,
        height: 5,
      },
      elevation: 2,
    },

    timelineFeatureTop: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
    },

    timelineFeatureIcon: {
      width: 46,
      height: 46,
      borderRadius: 15,
      alignItems: "center",
      justifyContent: "center",
    },

    timelineFeatureBadge: {
      minHeight: 26,
      paddingHorizontal: 10,
      borderRadius: 999,
      backgroundColor:
        "rgba(15,118,110,0.09)",
      alignItems: "center",
      justifyContent: "center",
    },

    timelineFeatureBadgeText: {
      fontSize: 9,
      fontWeight: "850",
      letterSpacing: 0.45,
    },

    timelineFeatureTitle: {
      marginTop: 14,
      fontSize: 19,
      fontWeight: "850",
      letterSpacing: -0.3,
    },

    timelineFeatureSubtitle: {
      marginTop: 6,
      fontSize: 13,
      lineHeight: 19,
    },

    timelineFeatureFooter: {
      marginTop: 15,
      paddingTop: 13,
      borderTopWidth:
        StyleSheet.hairlineWidth,
      borderTopColor:
        "rgba(15,23,42,0.08)",
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
    },

    timelineFeatureLink: {
      fontSize: 12,
      fontWeight: "850",
    },

    overlay: {
      flex: 1,
      backgroundColor:
        "rgba(0,0,0,0.45)",
      alignItems: "center",
      justifyContent: "center",
    },

    overlayCard: {
      minWidth: 230,
      paddingVertical: 20,
      paddingHorizontal: 18,
      borderRadius: 18,
      backgroundColor: "#111827",
      alignItems: "center",
    },

    overlayTitle: {
      marginTop: 11,
      color: "#FFFFFF",
      fontWeight: "850",
    },

    progressTrack: {
      width: "100%",
      height: 8,
      marginTop: 13,
      borderRadius: 999,
      backgroundColor:
        "rgba(255,255,255,0.15)",
      overflow: "hidden",
    },

    progressFill: {
      height: "100%",
      backgroundColor: "#FFFFFF",
    },

    overlaySub: {
      marginTop: 9,
      color: "#9CA3AF",
      fontSize: 12,
    },
  });
