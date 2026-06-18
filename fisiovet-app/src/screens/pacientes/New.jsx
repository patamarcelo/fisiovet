// app/(modals)/pet-new.jsx
// @ts-nocheck
import React, {
  useMemo,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  Platform,
  Switch,
  ActivityIndicator,
  Linking,
  Keyboard,
} from "react-native";
import { Stack, useLocalSearchParams, router } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import {
  addPet,
  updatePet,
  fetchPet,
  deletePet,
  selectPetById,
} from "@/src/store/slices/petsSlice";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useSafeAreaInsets, SafeAreaView } from "react-native-safe-area-context";

import {
  KeyboardAwareScrollView,
  KeyboardToolbar,
} from "react-native-keyboard-controller";
import { Ionicons } from "@expo/vector-icons";

import {
  fetchTutores,
  makeSelectTutoresByQuery,
} from "@/src/store/slices/tutoresSlice";

import { useSubscriptionGate } from "@/src/hooks/useSubscriptionGate";


const ESPECIES = ["cachorro", "gato"];
const SEXOS = ["M", "F"];

function trimOrNull(value) {
  const s = String(value ?? "").trim();
  return s ? s : null;
}

function normalizeDecimalInput(value) {
  let v = String(value || "").replace(/[^\d.,]/g, "");

  const parts = v.split(/[.,]/);

  if (parts.length > 2) {
    v = parts[0] + "," + parts.slice(1).join("");
  }

  return v;
}

function parseDecimalBR(value) {
  if (value == null) return null;

  const raw = String(value).trim();
  if (!raw) return null;

  const clean = raw
    .replace(/[^\d,.-]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");

  if (!clean || clean === "-" || clean === "." || clean === "-.") return null;

  const n = Number(clean);

  return Number.isFinite(n) ? n : null;
}

function parseAge(value) {
  const raw = String(value || "").replace(/[^\d]/g, "");
  if (!raw) return null;

  const n = parseInt(raw, 10);

  if (!Number.isFinite(n)) return null;

  return Math.max(0, n);
}

function tutorAddressFallback(tutor) {
  const endereco = tutor?.endereco || {};

  const line1 = [endereco?.logradouro, endereco?.numero].filter(Boolean).join(", ");
  const line2 = [endereco?.bairro, endereco?.cidade, endereco?.uf].filter(Boolean).join(" • ");
  const cep = endereco?.cep ? `CEP ${endereco.cep}` : "";

  return [line1, line2, cep].filter(Boolean).join(" · ");
}

function FormSection({ title, helper, children }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {!!helper && <Text style={styles.sectionHelper}>{helper}</Text>}
      </View>

      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

function Field({ label, helper, error, children }) {
  return (
    <View style={styles.field}>
      {!!label && <Text style={styles.fieldLabel}>{label}</Text>}

      {children}

      {!!error ? (
        <Text style={styles.fieldError}>{error}</Text>
      ) : helper ? (
        <Text style={styles.fieldHelper}>{helper}</Text>
      ) : null}
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

function SegmentedOption({ active, label, icon, onPress, tint }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.segmentOption,
        active && {
          backgroundColor: tint,
          borderColor: tint,
        },
        pressed && { opacity: 0.88 },
      ]}
    >
      {!!icon && (
        <Ionicons
          name={icon}
          size={16}
          color={active ? "#FFFFFF" : "#6B7280"}
        />
      )}

      <Text
        style={[
          styles.segmentText,
          {
            color: active ? "#FFFFFF" : "#111827",
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function TutorSearchBox({
  tutor,
  tutorQuery,
  setTutorQuery,
  setTutor,
  tutoresBuscados,
  text,
  subtle,
  border,
  tint,
  openMaps,
  inputRef,
}) {
  const hasSelected = !!tutor?.id;

  return (
    <FormSection
      title="Tutor"
      helper="Selecione o tutor responsável por este pet. Se vier do cadastro do tutor, ele já fica vinculado automaticamente."
    >
      <View style={styles.searchInputWrap}>
        <Ionicons name="person-circle-outline" size={19} color="#8E8E93" />

        <TextInput
          ref={inputRef}
          placeholder="Buscar e selecionar tutor"
          placeholderTextColor={subtle}
          value={hasSelected ? tutor?.nome || tutor?.name || "" : tutorQuery}
          onChangeText={(value) => {
            setTutorQuery(value);
            setTutor({ id: null, nome: "" });
          }}
          style={[styles.input, styles.searchInput, { color: text }]}
          autoCapitalize="words"
          autoCorrect={false}
        />

        {hasSelected ? (
          <Pressable
            onPress={() => {
              setTutor({ id: null, nome: "" });
              setTutorQuery("");
            }}
            hitSlop={10}
          >
            <Ionicons name="close-circle" size={19} color="#8E8E93" />
          </Pressable>
        ) : null}
      </View>

      {!hasSelected ? (
        <View style={[styles.tutorResults, { borderColor: border }]}>
          {tutoresBuscados.length > 0 ? (
            tutoresBuscados.slice(0, 6).map((item, idx) => (
              <Pressable
                key={String(item.id)}
                onPress={() => {
                  Keyboard.dismiss();
                  setTutor(item);
                  setTutorQuery("");
                }}
                style={({ pressed }) => [
                  styles.tutorResultRow,
                  {
                    backgroundColor: pressed ? "#F3F4F6" : "#FFFFFF",
                    borderBottomWidth:
                      idx === Math.min(tutoresBuscados.length, 6) - 1
                        ? 0
                        : StyleSheet.hairlineWidth,
                  },
                ]}
              >
                <View style={styles.tutorAvatar}>
                  <Ionicons name="person" size={15} color="#FFFFFF" />
                </View>

                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.tutorName, { color: text }]} numberOfLines={1}>
                    {item?.nome || item?.name || "Tutor sem nome"}
                  </Text>

                  <Text style={[styles.tutorSub, { color: subtle }]} numberOfLines={1}>
                    {item?.endereco?.formatted || tutorAddressFallback(item) || "Cadastro básico"}
                  </Text>
                </View>
              </Pressable>
            ))
          ) : (
            <View style={styles.tutorEmpty}>
              <Text style={{ color: subtle, fontSize: 13 }}>
                {tutorQuery?.trim()
                  ? "Nenhum tutor encontrado."
                  : "Digite para buscar um tutor."}
              </Text>
            </View>
          )}
        </View>
      ) : (
        <Pressable
          onPress={openMaps}
          disabled={!tutor?.geo?.lat || !tutor?.geo?.lng}
          style={({ pressed }) => [
            styles.selectedTutor,
            {
              borderColor: border,
              backgroundColor: pressed ? "#F3F4F6" : "rgba(142,142,147,0.08)",
            },
          ]}
        >
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.selectedTutorName, { color: text }]} numberOfLines={1}>
              {tutor?.nome || tutor?.name || "Tutor"}
            </Text>

            <Text style={[styles.selectedTutorSub, { color: subtle }]} numberOfLines={2}>
              {tutor?.endereco?.formatted || tutorAddressFallback(tutor) || "Cadastro básico"}
            </Text>
          </View>

          {tutor?.geo?.lat && tutor?.geo?.lng ? (
            <Ionicons name="navigate-outline" size={22} color={tint} />
          ) : (
            <Ionicons name="checkmark-circle" size={22} color="#16A34A" />
          )}
        </Pressable>
      )}
    </FormSection>
  );
}

export default function PetNewModal() {
  const { tutorId, tutorNome, mode, id } = useLocalSearchParams();

  const _id = Array.isArray(id) ? id[0] : id;
  const _tutorId = Array.isArray(tutorId) ? tutorId[0] : tutorId;
  const _tutorNome = Array.isArray(tutorNome) ? tutorNome[0] : tutorNome;

  const isEdit = mode === "edit" && !!_id;

  const dispatch = useDispatch();

  const pet = useSelector(selectPetById(_id));
  const insets = useSafeAreaInsets();

  const text = useThemeColor({}, "text");
  const subtle = useThemeColor({ light: "#6B7280", dark: "#9AA0A6" }, "text");
  const border = useThemeColor(
    { light: "rgba(15,23,42,0.10)", dark: "rgba(255,255,255,0.16)" },
    "border"
  );
  const bg = useThemeColor({}, "background");
  const tint = useThemeColor({}, "tint");

  const [nome, setNome] = useState("");
  const [especie, setEspecie] = useState("cachorro");
  const [raca, setRaca] = useState("");
  const [cor, setCor] = useState("");
  const [sexo, setSexo] = useState("M");
  const [castrado, setCastrado] = useState(false);
  const [idade, setIdade] = useState("");
  const [pesoKg, setPesoKg] = useState("");
  const [observacoes, setObservacoes] = useState("");

  const scrollRef = useRef(null);
  const tutorQueryRef = useRef(null);
  const nomeRef = useRef(null);
  const racaRef = useRef(null);
  const corRef = useRef(null);
  const idadeRef = useRef(null);
  const pesoRef = useRef(null);
  const observacoesRef = useRef(null);


  const [tutorQuery, setTutorQuery] = useState("");
  const [tutor, setTutor] = useState(() => {
    if (_tutorId) {
      return {
        id: String(_tutorId),
        nome: String(_tutorNome || ""),
      };
    }

    return { id: null, nome: "" };
  });

  const [initialized, setInitialized] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const tutoresByQuerySelectorRef = useRef(makeSelectTutoresByQuery());

  const tutoresBuscados = useSelector((state) =>
    tutoresByQuerySelectorRef.current(state, tutorQuery)
  );


  useEffect(() => {
    if (isEdit && !pet && _id) dispatch(fetchPet(_id));
  }, [dispatch, isEdit, _id, pet]);

  useEffect(() => {
    if (!isEdit && !_tutorId) {
      dispatch(fetchTutores());
    }
  }, [dispatch, isEdit, _tutorId]);

  useEffect(() => {
    if (isEdit && pet && !initialized) {
      setNome(pet.nome || "");
      setEspecie(pet.especie || "cachorro");
      setRaca(pet.raca || "");
      setCor(pet.cor || "");
      setSexo(pet.sexo || "M");
      setCastrado(!!pet.castrado);

      setIdade(
        Number.isFinite(pet?.idade) && pet.idade >= 0
          ? String(pet.idade)
          : pet?.idade
            ? String(pet.idade)
            : ""
      );

      setPesoKg(
        typeof pet.pesoKg === "number" && Number.isFinite(pet.pesoKg)
          ? String(pet.pesoKg).replace(".", ",")
          : ""
      );

      setObservacoes(pet.observacoes || "");

      if (pet?.tutor?.id) {
        setTutor(pet.tutor);
      }

      setInitialized(true);
    }
  }, [isEdit, pet, initialized]);

  const validation = useMemo(() => {
    const hasNome = nome.trim().length > 0;
    const especieOk = ESPECIES.includes(especie);
    const sexoOk = SEXOS.includes(sexo);

    const needTutor = !isEdit && !_tutorId;
    const hasTutor = !needTutor || !!tutor?.id;

    const idadeOk = !idade || Number(parseAge(idade)) >= 0;
    const pesoOk = !pesoKg || parseDecimalBR(pesoKg) !== null;

    return {
      hasNome,
      especieOk,
      sexoOk,
      hasTutor,
      idadeOk,
      pesoOk,
      canSubmit: hasNome && especieOk && sexoOk && hasTutor && idadeOk && pesoOk,
    };
  }, [nome, especie, sexo, isEdit, _tutorId, tutor?.id, idade, pesoKg]);

  const firstError = useMemo(() => {
    if (!validation.hasTutor) return "Selecione um tutor para este pet.";
    if (!validation.hasNome) return "Informe o nome do pet.";
    if (!validation.especieOk) return "Selecione uma espécie válida.";
    if (!validation.sexoOk) return "Selecione o sexo.";
    if (!validation.idadeOk) return "Idade inválida.";
    if (!validation.pesoOk) return "Peso inválido.";
    return null;
  }, [validation]);

  const canSubmit = validation.canSubmit && !submitting;

  const onChangeIdade = useCallback((value) => {
    setIdade(String(value || "").replace(/[^\d]/g, "").slice(0, 3));
  }, []);

  const onChangePeso = useCallback((value) => {
    setPesoKg(normalizeDecimalInput(value));
  }, []);

  const handleDelete =
    useCallback(() => {
      if (
        !isEdit ||
        !_id ||
        submitting
      ) {
        return;
      }

      Alert.alert(
        "Excluir pet",
        `Deseja realmente excluir ${pet?.nome ||
        "este pet"
        }?`,
        [
          {
            text:
              "Cancelar",
            style:
              "cancel",
          },
          {
            text:
              "Excluir",
            style:
              "destructive",

            onPress:
              async () => {
                try {
                  Keyboard.dismiss();

                  setSubmitting(
                    true
                  );

                  await dispatch(
                    deletePet(
                      String(
                        _id
                      )
                    )
                  ).unwrap();

                  /*
                   * A listagem principal de pets
                   * no FisioVet é Pacientes.
                   *
                   * Não volta para uma possível
                   * tela de detalhes do pet apagado.
                   */
                  router.replace(
                    "/(phone)/pacientes"
                  );
                } catch (error) {
                  setSubmitting(
                    false
                  );

                  Alert.alert(
                    "Erro",
                    error?.message ||
                    "Não foi possível excluir o pet."
                  );
                }
              },
          },
        ]
      );
    }, [
      isEdit,
      _id,
      pet?.nome,
      submitting,
      dispatch,
    ]);

  const openMaps = useCallback(() => {
    if (!tutor?.geo?.lat || !tutor?.geo?.lng) return;

    const { lat, lng } = tutor.geo;

    const url = Platform.select({
      ios: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
      android: `geo:${lat},${lng}?q=${lat},${lng}(${encodeURIComponent(
        tutor?.nome || "Local"
      )})`,
      default: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
    });

    Linking.openURL(url);
  }, [tutor]);


  const petGate = useSubscriptionGate("pets");
  const blockedByPlan =
    !isEdit &&
    petGate.enabled &&
    !petGate.canCreate;

  const submit = useCallback(async () => {
    if (!isEdit && !petGate.canCreate) {
      petGate.showLimitAlert();
      return;
    }
    if (!canSubmit) {
      Alert.alert("Cadastro de Pet", firstError || "Verifique os campos obrigatórios.");
      return;
    }

    try {
      setSubmitting(true);

      const base = {
        nome: nome.trim(),
        especie,
        raca: trimOrNull(raca),
        cor: trimOrNull(cor),
        sexo,
        castrado: !!castrado,
        idade: parseAge(idade),
        pesoKg: parseDecimalBR(pesoKg),
        observacoes: trimOrNull(observacoes),
      };

      if (isEdit) {
        const payload = {
          id: String(_id),
          ...base,
        };

        await dispatch(updatePet(payload)).unwrap();
      } else {
        const selectedTutorId = String(_tutorId || tutor?.id || "");
        const selectedTutorNome = String(_tutorNome || tutor?.nome || tutor?.name || "");

        const payload = {
          tutor: {
            id: selectedTutorId,
            nome: selectedTutorNome,
          },
          ...base,
        };

        await dispatch(addPet(payload)).unwrap();
      }

      router.back();
    } catch (error) {
      Alert.alert(
        "Erro",
        error?.message ||
        (isEdit ? "Não foi possível atualizar o pet." : "Não foi possível criar o pet.")
      );
    } finally {
      setSubmitting(false);
    }
  }, [
    canSubmit,
    firstError,
    nome,
    especie,
    raca,
    cor,
    sexo,
    castrado,
    idade,
    pesoKg,
    observacoes,
    isEdit,
    _id,
    _tutorId,
    _tutorNome,
    tutor,
    dispatch,
  ]);

  if (blockedByPlan) {
    return (
      <SafeAreaView
        style={[
          styles.limitScreen,
          { backgroundColor: bg },
        ]}
        edges={["left", "right", "bottom"]}
      >
        <Stack.Screen
          options={{
            title: "Novo pet",
            headerBackVisible: false,
            headerLeft: () => (
              <Pressable
                onPress={() => {
                  if (router.canGoBack()) {
                    router.back();
                    return;
                  }

                  router.replace("/(phone)/pacientes");
                }}
                hitSlop={10}
                style={({ pressed }) => [
                  styles.limitHeaderBack,
                  pressed && { opacity: 0.6 },
                ]}
              >
                <Ionicons
                  name="chevron-back"
                  size={23}
                  color={tint}
                />
              </Pressable>
            ),
          }}
        />

        <View style={styles.limitContent}>
          <View style={styles.limitIcon}>
            <Ionicons
              name="paw-outline"
              size={34}
              color="#0A84FF"
            />
          </View>

          <Text style={[styles.limitTitle, { color: text }]}>
            Limite de pets atingido
          </Text>

          <Text style={[styles.limitDescription, { color: subtle }]}>
            Seu plano Free permite até {petGate.limit} pets.{" "}
            Você já possui {petGate.current} cadastrados.
          </Text>

          <View style={styles.limitUsageCard}>
            <View style={styles.limitUsageTop}>
              <Text style={[styles.limitUsageLabel, { color: text }]}>
                Pets cadastrados
              </Text>

              <Text style={styles.limitUsageCount}>
                {petGate.current}/{petGate.limit}
              </Text>
            </View>

            <View style={styles.limitProgressTrack}>
              <View style={styles.limitProgressFill} />
            </View>
          </View>

          <Pressable
            onPress={petGate.openPlans}
            style={({ pressed }) => [
              styles.limitPrimaryButton,
              pressed && { opacity: 0.86 },
            ]}
          >
            <Ionicons
              name="star-outline"
              size={18}
              color="#FFFFFF"
            />

            <Text style={styles.limitPrimaryButtonText}>
              Ver planos
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
                return;
              }

              router.replace("/(phone)/pacientes");
            }}
            style={({ pressed }) => [
              styles.limitSecondaryButton,
              pressed && { opacity: 0.6 },
            ]}
          >
            <Text style={[styles.limitSecondaryButtonText, { color: tint }]}>
              Voltar
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: bg }]} edges={[]}>
      <Stack.Screen
        options={{
          presentation:
            "fullScreenModal",

          title:
            isEdit
              ? "Editar pet"
              : "Novo pet",

          headerBackTitleVisible:
            false,

          headerTitleAlign:
            "center",

          headerStyle: {
            backgroundColor:
              "#FFFFFF",
          },

          headerTintColor:
            tint,

          headerTitleStyle: {
            color: tint,
            fontWeight: "800",
          },

          headerLeftContainerStyle: {
            minWidth: 64,
            paddingLeft: 12,
          },

          headerRightContainerStyle: {
            minWidth: 64,
            paddingRight: 12,
            alignItems: "flex-end",
          },

          headerLeft: () => (
            <Pressable
              onPress={() => {
                Keyboard.dismiss();

                if (
                  router.canGoBack()
                ) {
                  router.back();
                  return;
                }

                router.replace(
                  "/(phone)/pacientes"
                );
              }}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Fechar"
              style={({ pressed }) => [
                styles.headerActionButton,
                pressed &&
                styles.headerActionButtonPressed,
              ]}
            >
              <Ionicons
                name="close"
                size={21}
                color={tint}
              />
            </Pressable>
          ),

          headerRight: isEdit
            ? () => (
              <Pressable
                disabled={submitting}
                onPress={handleDelete}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Excluir pet"
                style={({ pressed }) => [
                  styles.headerDeleteButton,

                  pressed &&
                  styles.headerActionButtonPressed,

                  submitting && {
                    opacity: 0.45,
                  },
                ]}
              >
                <Ionicons
                  name="trash-outline"
                  size={20}
                  color="#EF4444"
                />
              </Pressable>
            )
            : undefined,
        }}
      />

      <View style={styles.keyboard}>
        <View style={styles.shell}>
          <KeyboardAwareScrollView
            ref={scrollRef}
            style={styles.scroll}
            contentContainerStyle={[
              styles.content,
              {
                paddingBottom: 148 + insets.bottom,
              },
            ]}
            bottomOffset={18}
            extraKeyboardSpace={48}
            disableScrollOnKeyboardHide
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            contentInsetAdjustmentBehavior="automatic"
            showsVerticalScrollIndicator={false}
          >
            {isEdit || _tutorId ? (
              <FormSection
                title="Tutor"
                helper="Este pet já está vinculado a um tutor."
              >
                <View style={styles.fixedTutorRow}>
                  <View style={styles.tutorAvatar}>
                    <Ionicons name="person" size={15} color="#FFFFFF" />
                  </View>

                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[styles.selectedTutorName, { color: text }]} numberOfLines={1}>
                      {isEdit ? pet?.tutor?.nome || "—" : _tutorNome || "—"}
                    </Text>

                    <Text style={[styles.selectedTutorSub, { color: subtle }]} numberOfLines={1}>
                      {isEdit ? "Tutor vinculado ao cadastro" : "Selecionado pelo cadastro do tutor"}
                    </Text>
                  </View>
                </View>
              </FormSection>
            ) : (
              <TutorSearchBox
                tutor={tutor}
                tutorQuery={tutorQuery}
                setTutorQuery={setTutorQuery}
                setTutor={setTutor}
                tutoresBuscados={tutoresBuscados}
                text={text}
                subtle={subtle}
                border={border}
                tint={tint}
                openMaps={openMaps}
                inputRef={tutorQueryRef}
              />
            )}

            <FormSection
              title="Dados do pet"
              helper="Apenas nome, espécie e tutor são obrigatórios. Os demais campos podem ser completados depois."
            >
              <Field
                label="Nome do pet"
                error={!validation.hasNome ? "Obrigatório." : null}
              >
                <TextInput
                  ref={nomeRef}
                  value={nome}
                  onChangeText={setNome}
                  placeholder="Ex.: Thor"
                  placeholderTextColor="#9CA3AF"
                  style={[styles.input, { color: text }]}
                  autoCapitalize="words"
                />
              </Field>

              <Divider />

              <Field label="Espécie">
                <View style={styles.segmentRow}>
                  <SegmentedOption
                    active={especie === "cachorro"}
                    label="Cachorro"
                    icon="paw-outline"
                    onPress={() => setEspecie("cachorro")}
                    tint={tint}
                  />

                  <SegmentedOption
                    active={especie === "gato"}
                    label="Gato"
                    icon="logo-octocat"
                    onPress={() => setEspecie("gato")}
                    tint={tint}
                  />
                </View>
              </Field>

              <Divider />

              <Field label="Raça" helper="Opcional.">
                <TextInput
                  ref={racaRef}
                  value={raca}
                  onChangeText={setRaca}
                  placeholder="Ex.: Golden Retriever"
                  placeholderTextColor="#9CA3AF"
                  style={[styles.input, { color: text }]}
                  autoCapitalize="words"
                />
              </Field>

              <Divider />

              <Field label="Cor" helper="Opcional.">
                <TextInput
                  ref={corRef}
                  value={cor}
                  onChangeText={setCor}
                  placeholder="Ex.: Dourado"
                  placeholderTextColor="#9CA3AF"
                  style={[styles.input, { color: text }]}
                  autoCapitalize="words"
                />
              </Field>
            </FormSection>

            <FormSection
              title="Características"
              helper="Essas informações ajudam no histórico clínico e nos atendimentos."
            >
              <Field label="Sexo">
                <View style={styles.segmentRow}>
                  <SegmentedOption
                    active={sexo === "M"}
                    label="Macho"
                    icon="male-outline"
                    onPress={() => setSexo("M")}
                    tint={tint}
                  />

                  <SegmentedOption
                    active={sexo === "F"}
                    label="Fêmea"
                    icon="female-outline"
                    onPress={() => setSexo("F")}
                    tint={tint}
                  />
                </View>
              </Field>

              <Divider />

              <View style={styles.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Castrado</Text>
                  <Text style={styles.fieldHelper}>Opcional. Pode ser ajustado depois.</Text>
                </View>

                <Switch value={castrado} onValueChange={setCastrado} />
              </View>

              <Divider />

              <View style={styles.twoColumns}>
                <View style={{ flex: 1 }}>
                  <Field label="Idade" helper="Anos. Opcional.">
                    <TextInput
                      ref={idadeRef}
                      value={idade}
                      onChangeText={onChangeIdade}
                      placeholder="Ex.: 4"
                      placeholderTextColor="#9CA3AF"
                      style={[styles.input, { color: text }]}
                      keyboardType="number-pad"
                      inputMode="numeric"
                      maxLength={3}
                    />
                  </Field>
                </View>

                <View style={{ flex: 1 }}>
                  <Field
                    label="Peso"
                    helper="Kg. Opcional."
                    error={!validation.pesoOk ? "Peso inválido." : null}
                  >
                    <TextInput
                      ref={pesoRef}
                      value={pesoKg}
                      onChangeText={onChangePeso}
                      keyboardType="decimal-pad"
                      inputMode="decimal"
                      placeholder="Ex.: 12,4"
                      placeholderTextColor="#9CA3AF"
                      style={[styles.input, { color: text }]}
                    />
                  </Field>
                </View>
              </View>
            </FormSection>

            <FormSection
              title="Observações"
              helper="Anotações livres sobre comportamento, restrições, histórico ou preferências."
            >
              <TextInput
                ref={observacoesRef}
                value={observacoes}
                onChangeText={setObservacoes}
                placeholder="Anotações gerais sobre o paciente..."
                placeholderTextColor="#9CA3AF"
                style={[styles.input, styles.textArea, { color: text }]}
                multiline
                returnKeyType="default"
                blurOnSubmit={false}
                textAlignVertical="top"
              />
            </FormSection>

            {!!firstError && (
              <Text style={styles.bottomError}>{firstError}</Text>
            )}
          </KeyboardAwareScrollView>

          <View
            style={[
              styles.fixedFooter,
              {
                paddingBottom: Math.max(insets.bottom, 10),
              },
            ]}
          >
            <Pressable
              onPress={submit}
              disabled={!canSubmit}
              style={({ pressed }) => [
                styles.saveButton,
                {
                  backgroundColor: canSubmit ? tint : "#A7B4C8",
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
            >
              {submitting ? (
                <>
                  <ActivityIndicator color="#fff" />
                  <Text style={styles.saveButtonText}>Salvando…</Text>
                </>
              ) : (
                <>
                  <Ionicons name="checkmark" size={18} color="#fff" />
                  <Text style={styles.saveButtonText}>
                    {isEdit ? "Salvar alterações" : "Salvar pet"}
                  </Text>
                </>
              )}
            </Pressable>

            <Text style={styles.footerHint}>
              {firstError || "Você pode completar o cadastro do pet depois."}
            </Text>
          </View>

          {Platform.OS === "ios" && (
            <KeyboardToolbar style={styles.keyboardToolbar}>
              <KeyboardToolbar.Content>
                <Text style={styles.keyboardToolbarLabel}>
                  Preenchimento do pet
                </Text>
              </KeyboardToolbar.Content>

              <KeyboardToolbar.Done text="Fechar" />
            </KeyboardToolbar>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },

  keyboard: {
    flex: 1,
  },

  shell: {
    flex: 1,
    position: "relative",
  },

  scroll: {
    flex: 1,
  },

  content: {
    paddingHorizontal: 16,
    paddingTop: 14,
    gap: 16,
  },

  headerCancel: {
    paddingHorizontal: 4,
    paddingVertical: 4,
  },

  headerCancelText: {
    fontSize: 16,
    fontWeight: "700",
  },

  section: {
    gap: 8,
  },

  sectionHeader: {
    paddingHorizontal: 2,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: -0.2,
  },

  sectionHelper: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 17,
    color: "#6B7280",
  },

  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(15,23,42,0.10)",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 1,
  },

  field: {
    gap: 6,
  },

  fieldLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
  },

  fieldHelper: {
    fontSize: 11,
    lineHeight: 15,
    color: "#6B7280",
  },

  fieldError: {
    fontSize: 11,
    lineHeight: 15,
    color: "#DC2626",
    fontWeight: "600",
  },

  divider: {
    height: 1,
    backgroundColor: "rgba(148,163,184,0.20)",
    marginVertical: 10,
  },

  input: {
    minHeight: 44,
    paddingHorizontal: 0,
    paddingVertical: 8,
    fontSize: 15,
  },

  textArea: {
    minHeight: 104,
    textAlignVertical: "top",
    paddingTop: 10,
  },

  segmentRow: {
    flexDirection: "row",
    gap: 10,
  },

  segmentOption: {
    flex: 1,
    minHeight: 42,
    borderRadius: 13,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(15,23,42,0.14)",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 7,
    backgroundColor: "#FFFFFF",
  },

  segmentText: {
    fontSize: 14,
    fontWeight: "800",
  },

  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  twoColumns: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },

  searchInputWrap: {
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(118,118,128,0.12)",
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  searchInput: {
    flex: 1,
    paddingVertical: 0,
  },

  tutorResults: {
    marginTop: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
  },

  tutorResultRow: {
    paddingHorizontal: 12,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderBottomColor: "#F1F5F9",
  },

  tutorAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(15,23,42,0.82)",
    alignItems: "center",
    justifyContent: "center",
  },

  tutorName: {
    fontSize: 14,
    fontWeight: "800",
  },

  tutorSub: {
    fontSize: 12,
    marginTop: 2,
  },

  tutorEmpty: {
    padding: 14,
  },

  selectedTutor: {
    marginTop: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  selectedTutorName: {
    fontSize: 15,
    fontWeight: "800",
  },

  selectedTutorSub: {
    fontSize: 12,
    marginTop: 3,
    lineHeight: 17,
  },

  fixedTutorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  bottomError: {
    fontSize: 12,
    lineHeight: 17,
    color: "#DC2626",
    fontWeight: "600",
    paddingHorizontal: 2,
  },

  fixedFooter: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 50,
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: "rgba(255,255,255,0.96)",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(15,23,42,0.10)",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
    elevation: 12,
  },

  saveButton: {
    height: 50,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },

  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },

  footerHint: {
    marginTop: 7,
    textAlign: "center",
    fontSize: 11,
    color: "#6B7280",
  },
  headerActionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor:
      "rgba(118,118,128,0.10)",
  },

  headerActionButtonPressed: {
    opacity: 0.62,
    transform: [
      {
        scale: 0.96,
      },
    ],
  },

  headerDeleteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor:
      "rgba(239,68,68,0.10)",
  },
  limitScreen: {
    flex: 1,
  },

  limitHeaderBack: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(118,118,128,0.10)",
  },

  limitContent: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
  },

  limitIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(10,132,255,0.10)",
    marginBottom: 18,
  },

  limitTitle: {
    fontSize: 22,
    fontWeight: "850",
    letterSpacing: -0.4,
    textAlign: "center",
  },

  limitDescription: {
    marginTop: 9,
    maxWidth: 310,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },

  limitUsageCard: {
    width: "100%",
    marginTop: 24,
    padding: 15,
    borderRadius: 17,
    backgroundColor: "#FFFFFF",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(15,23,42,0.10)",
  },

  limitUsageTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  limitUsageLabel: {
    fontSize: 13,
    fontWeight: "750",
  },

  limitUsageCount: {
    fontSize: 13,
    fontWeight: "850",
    color: "#EF4444",
  },

  limitProgressTrack: {
    height: 8,
    marginTop: 11,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "rgba(118,118,128,0.14)",
  },

  limitProgressFill: {
    width: "100%",
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#EF4444",
  },

  limitPrimaryButton: {
    width: "100%",
    height: 48,
    marginTop: 20,
    borderRadius: 15,
    backgroundColor: "#0A84FF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  limitPrimaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "850",
  },

  limitSecondaryButton: {
    height: 44,
    marginTop: 8,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
  },

  limitSecondaryButtonText: {
    fontSize: 14,
    fontWeight: "750",
  },
  keyboardToolbar: {
    minHeight: 46,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(60,60,67,0.20)",
    backgroundColor: "rgba(248,248,248,0.98)",
  },

  keyboardToolbarLabel: {
    color: "#6B7280",
    fontSize: 12,
    fontWeight: "650",
  },

});