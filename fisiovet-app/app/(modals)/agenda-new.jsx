// @ts-nocheck
import React, { useEffect, useMemo, useRef, useState, useLayoutEffect } from "react";
import {
    View,
    Text,
    TextInput,
    Pressable,
    FlatList,
    Platform,
    ScrollView,
    Alert,
    KeyboardAvoidingView
} from "react-native";

import { Linking } from "react-native";

import { useNavigation, useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useDispatch, useSelector } from "react-redux";
import { SafeAreaView } from "react-native-safe-area-context";

import { useThemeColor } from "@/hooks/useThemeColor";
import { useColorScheme } from "react-native";
import EnderecoCard from "@/src/screens/tutores/EnderecoCard";

// tutores
import {
    selectTutores,
    makeSelectTutoresByQuery,
    selectTutorById,
} from "@/src/store/slices/tutoresSlice";

// pets
import {
    selectPetsByTutorId,
    selectLoadingPetsByTutor,
    fetchPetsByTutor,
    selectPetById,
    selectPetsState
} from "@/src/store/slices/petsSlice";

import { shallowEqual } from "react-redux";


// agenda
import {
    addEvento,
    updateEvento,
    selectEventoById,
} from "@/src/store/slices/agendaSlice";





const STATUS_STYLES = {
    confirmado: { color: "#16A34A", bg: "rgba(22,163,74,0.15)" },   // verde
    pendente: { color: "#F59E0B", bg: "rgba(245,158,11,0.15)" },  // amarelo
    cancelado: { color: "#EF4444", bg: "rgba(239,68,68,0.15)" },   // vermelho
    default: { color: "#6B7280", bg: "rgba(107,114,128,0.15)" }, // cinza
};


/* ---------------- Helpers ---------------- */
const pad2 = (n) => String(n).padStart(2, "0");
function toLocalIsoNoTZ(d) {
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}
function isValidHHMM(v) {
    return /^(\d{1,2}):([0-5]\d)$/.test(v || "");
}
function normalizeHHMM(v) {
    let s = (v || "").replace(/[^\d:]/g, "");
    if (!s.includes(":")) {
        if (s.length <= 2) return s;
        s = `${s.slice(0, s.length - 2)}:${s.slice(-2)}`;
    }
    const [h, m = ""] = s.split(":");
    return `${h.slice(0, 2)}:${m.slice(0, 2)}`;
}
function hhmmToMinutes(v) {
    const m = v.match(/^(\d{1,2}):([0-5]\d)$/);
    if (!m) return 60;
    const h = parseInt(m[1], 10);
    const mi = parseInt(m[2], 10);
    return h * 60 + mi;
}
function minutesBetween(a, b) {
    const ms = Math.max(0, new Date(b) - new Date(a));
    return Math.round(ms / 60000);
}
function toHHMM(totalMin) {
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return `${pad2(h)}:${pad2(m)}`;
}
function tutorAddressFallback(t) {
    const partes = [t?.endereco, t?.numero, t?.bairro, t?.cidade, t?.uf, t?.cep].filter(Boolean);
    return partes.join(", ");
}

const hhmmToDate = (hhmm = "01:00") => {
    const m = (hhmm || "01:00").match(/^(\d{1,2}):([0-5]\d)$/) || [0, "1", "00"];
    const h = parseInt(m[1], 10);
    const mi = parseInt(m[2], 10);
    const d = new Date();
    d.setHours(h, mi, 0, 0);
    return d;
};
const dateToHHMM = (d) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;


/* ---------------- Screen ---------------- */
export default function AgendaNewScreen() {
    const navigation = useNavigation();
    const dispatch = useDispatch();
    const params = useLocalSearchParams();
    const eventIdParam = params?.id ? String(params.id) : null; // se vier, é visualização/edição do evento
    const tutorIdParam = params?.tutorId ? String(params.tutorId) : null;
    const tutorNomeParam = params?.tutorNome || "";

    const tint = useThemeColor({}, "tint");
    const [showTime, setShowTime] = useState(false);

    // Estado Redux
    const tutores = useSelector(selectTutores);
    const eventoExistente = useSelector((s) =>
        eventIdParam ? selectEventoById(eventIdParam)(s) : null
    );
    const tutorFromEvent = useSelector((s) =>
        eventoExistente?.tutorId ? selectTutorById(s, eventoExistente.tutorId) : null
    );

    // Busca por nome/telefone/email (reuso do seu selector memoizado)
    const tutoresByQuerySelectorRef = useRef(makeSelectTutoresByQuery());

    // ------- Form state -------
    const [isEditing, setIsEditing] = useState(() => !eventIdParam); // novo = editando; existente = só visualizar
    const [title, setTitle] = useState("");
    const [tutorQuery, setTutorQuery] = useState("");

    const [tutor, setTutor] = useState(() => {
        if (eventoExistente?.tutorId) return tutorFromEvent || { id: eventoExistente.tutorId, nome: eventoExistente.tutorNome };
        if (tutorIdParam) {
            const pre = tutores.find((t) => String(t.id) === tutorIdParam);
            return pre || { id: tutorIdParam, nome: tutorNomeParam };
        }
        return { id: null, nome: "" };
    });

    const [selectedPetIds, setSelectedPetIds] = useState([]);

    const [date, setDate] = useState(() => {
        if (eventoExistente?.start) return new Date(eventoExistente.start);
        const d = new Date();
        d.setDate(d.getDate() + 1);
        d.setHours(9, 0, 0, 0);
        return d;
    });


    const defaultDur = () => {
        if (eventoExistente?.start && eventoExistente?.end) {
            const mins = minutesBetween(eventoExistente.start, eventoExistente.end);
            return toHHMM(mins);
        }
        return "1:00";
    };
    const [duracao, setDuracao] = useState(defaultDur());
    const [local, setLocal] = useState(() => {
        if (eventoExistente?.local) return eventoExistente.local;
        if (tutor?.endereco?.formatted) return tutor.endereco.formatted;
        return tutorAddressFallback(tutor);
    });
    const [observacoes, setObservacoes] = useState(eventoExistente?.observacoes || "");

    // pets por tutor
    const petsDoTutor = useSelector(selectPetsByTutorId(tutor?.id || ""));
    const loadingPets = useSelector(selectLoadingPetsByTutor(tutor?.id || ""));

    // nomes de pets (útil para confirmar visualização)
    const petsState = useSelector(selectPetsState, shallowEqual); // pega um objeto estável (por ref)
    const petNames = useMemo(() => {
        const byId = petsState.byId || {};
        return (selectedPetIds || [])
            .map((pid) => byId[String(pid)])
            .filter(Boolean)
            .map((p) => p?.nome || p?.name);
    }, [selectedPetIds, petsState.byId]);

    // Carrega dados do evento existente nos states (1a vez / mudança de evento)
    useEffect(() => {
        if (!eventoExistente) return;
        setTitle(eventoExistente.title || "");
        setSelectedPetIds(Array.isArray(eventoExistente.petIds) ? eventoExistente.petIds.map(String) : []);
        setObservacoes(eventoExistente.observacoes || "");
        // date e duracao já vieram do constructor dos states
        // local idem
    }, [eventIdParam]);

    // Quando tutor muda: recarrega pets e preenche Local
    useEffect(() => {
        if (tutor?.id) {
            const addrFormatted = tutor?.endereco?.formatted;
            const fallback = tutorAddressFallback(tutor);
            if (addrFormatted || fallback) setLocal((prev) => prev || addrFormatted || fallback);

            dispatch(fetchPetsByTutor({ tutorId: tutor.id }));
            if (isEditing && !eventoExistente) setSelectedPetIds([]); // só limpa na criação
        } else {
            if (isEditing) {
                setSelectedPetIds([]);
                setLocal("");
            }
        }
    }, [tutor?.id]);

    // Lista de tutores conforme busca
    const tutoresBuscados = useSelector((state) =>
        tutoresByQuerySelectorRef.current(state, tutorQuery)
    );

    // Validação para habilitar Salvar
    const canSave = useMemo(() => {
        if (!isEditing) return false;
        // return title.trim() && tutor?.id && selectedPetIds.length && isValidHHMM(duracao);
        return title.trim()
    }, [isEditing, title, tutor, selectedPetIds, duracao]);

    const evento = useSelector((s) =>
        eventIdParam ? s.agenda.byId?.[String(eventIdParam)] : null
    );

    // Header
    useLayoutEffect(() => {
        const status = evento?.status || "pendente";
        const { color } = STATUS_STYLES[status] || STATUS_STYLES.default;
        const label = status.charAt(0).toUpperCase() + status.slice(1);

        navigation.setOptions({
            headerTitleAlign: "center",
            headerTitle: () => (
                <Text style={{ fontWeight: "700", fontSize: 16, color }}>
                    {eventIdParam ? label : "Novo evento"}
                </Text>
            ),
            headerLeft: () => (
                <Pressable onPress={() => router.back()} hitSlop={10} style={{ padding: 6 }}>
                    <Text style={{ color: "#007AFF", fontWeight: "700" }}>
                        {eventIdParam ? "Fechar" : "Cancelar"}
                    </Text>
                </Pressable>
            ),
            headerRight: () => {
                if (eventIdParam && !isEditing) {
                    return (
                        <Pressable onPress={() => setIsEditing(true)} hitSlop={10} style={{ padding: 6 }}>
                            <Text style={{ color: "#007AFF", fontWeight: "800" }}>Editar</Text>
                        </Pressable>
                    );
                }
                return (
                    <Pressable
                        onPress={() => { if (canSave) onSubmitRef.current(); }}
                        hitSlop={10}
                        style={{ padding: 6, opacity: canSave ? 1 : 0.5 }}
                        disabled={!canSave}
                    >
                        <Text style={{ color: "#007AFF", fontWeight: "800" }}>Salvar</Text>
                    </Pressable>
                );
            },
        });
    }, [navigation, router, eventIdParam, isEditing, canSave, evento]);

    // Submit (novo ou edição)
    const onSubmit = React.useCallback(async () => {
        try {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

            if (eventIdParam) {
                await dispatch(updateEvento({
                    id: eventIdParam,
                    patch: {
                        title: title.trim(),
                        date,
                        duracao,
                        tutorId: tutor.id,
                        tutorNome: tutor.nome || tutor.name,
                        petIds: selectedPetIds,
                        local: (local || "").trim(),
                        observacoes: (observacoes || "").trim(),
                        cliente: tutor?.nome || tutor?.name || "",
                    },
                })).unwrap();

                setIsEditing(false);
                Alert.alert("Pronto", "Evento atualizado.");
                router.back();
            } else {
                await dispatch(addEvento({
                    title: title.trim(),
                    date,
                    duracao,
                    tutorId: tutor.id,
                    tutorNome: tutor.nome || tutor.name,
                    petIds: selectedPetIds,
                    local: (local || "").trim(),
                    observacoes: (observacoes || "").trim(),
                    status: "pendente",
                    cliente: tutor?.nome || tutor?.name || "",
                })).unwrap();

                Alert.alert("Sucesso", "Evento agendado com sucesso!");
                router.back();
            }
        } catch (e) {
            console.warn("Erro ao salvar evento:", e);
            Alert.alert("Erro", e?.message || "Não foi possível salvar o evento.");
        }
    }, [eventIdParam, title, date, duracao, tutor, selectedPetIds, local, observacoes, dispatch]);

    // 2) ref para não “fechar” valores no header
    const onSubmitRef = React.useRef(onSubmit);
    useEffect(() => { onSubmitRef.current = onSubmit; }, [onSubmit]);

    /* ---------------- UI ---------------- */
    const inputDisabledColor = "#9CA3AF";
    const scheme = useColorScheme(); // 'light' | 'dark'
    const bg = useThemeColor({}, "background"); // fundo do app
    const text = useThemeColor({}, "text");     // cor de texto padrão
    const border = "#E5E7EB";

    const disabled = !isEditing;

    const PressableMaybe = ({ onPress, children, style }) =>
        disabled ? (
            <View style={style}>{children}</View>
        ) : (
            <Pressable onPress={onPress} style={style}>{children}</Pressable>
        );

    const openMaps = () => {
        if (!tutor?.geo?.lat || !tutor?.geo?.lng) return;
        const { lat, lng } = tutor.geo;
        const url = Platform.select({
            ios: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
            android: `geo:${lat},${lng}?q=${lat},${lng}(${encodeURIComponent(tutor?.nome || 'Local')})`,
            default: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
        });
        Linking.openURL(url);
    };

    return (
        <SafeAreaView style={{ flex: 1 }} edges={[]}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
            >
                <ScrollView
                    style={{ flex: 1, backgroundColor: "#FFF" }}
                    contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Título */}
                    <Text style={styles.label}>Título</Text>
                    <View style={styles.inputOutline}>
                        <TextInput
                            value={title}
                            onChangeText={setTitle}
                            placeholder="Ex.: Consulta - Thor"
                            style={{ color: 'black' }}
                            placeholderTextColor="#9CA3AF"
                            editable={!disabled}
                        />
                    </View>

                    {/* Tutor (busca + lista) */}
                    <View style={{ marginTop: 14 }}>
                        <Text style={styles.label}>Tutor</Text>

                        <View style={styles.inputIcon}>
                            <Ionicons name="person-circle-outline" size={18} color="#8E8E93" />
                            <TextInput
                                placeholderTextColor="#9CA3AF"
                                placeholder="Buscar e selecionar tutor"
                                value={tutor?.id ? (tutor.nome || tutor.name || "") : tutorQuery}
                                onChangeText={(t) => {
                                    if (disabled) return;
                                    setTutorQuery(t);
                                    setTutor({ id: null, nome: "" });
                                }}
                                style={{ flex: 1, marginLeft: 8, paddingVertical: 0, color: disabled ? inputDisabledColor : 'black' }}
                                editable={!disabled}
                            />
                            {tutor?.id && !disabled && (
                                <Pressable
                                    onPress={() => {
                                        setTutor({ id: null, nome: "" });
                                        setTutorQuery("");
                                    }}
                                    hitSlop={10}
                                >
                                    <Ionicons name="close-circle" size={18} color="#8E8E93" />
                                </Pressable>
                            )}
                        </View>

                        {/* Lista de tutores (somente em edição e sem tutor fixado) */}
                        {!disabled && !tutor?.id && (
                            <View style={{ maxHeight: 240, marginTop: 8, borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10 }}>
                                {tutoresBuscados.length > 0 ? (
                                    tutoresBuscados.map((item, idx) => (
                                        <Pressable
                                            key={String(item.id)}
                                            onPress={() => setTutor(item)}
                                            style={({ pressed }) => ({
                                                paddingHorizontal: 12,
                                                paddingVertical: 10,
                                                backgroundColor: pressed ? "#F3F4F6" : "white",
                                                borderBottomWidth: idx === tutoresBuscados.length - 1 ? 0 : 1,
                                                borderBottomColor: "#F1F5F9",
                                            })}
                                        >
                                            <Text style={{ fontWeight: "700" }}>{item?.nome || item?.name}</Text>
                                            <Text style={{ color: "#6B7280", marginTop: 2 }} numberOfLines={1}>
                                                {item?.endereco?.formatted || "—"}
                                            </Text>
                                        </Pressable>
                                    ))
                                ) : (
                                    <View style={{ padding: 12 }}>
                                        <Text style={{ color: "#6B7280" }}>Nenhum tutor encontrado</Text>
                                    </View>
                                )}
                            </View>
                        )}

                        {/* Tutor escolhido */}
                        {tutor?.id && (
                            <Pressable
                                onPress={openMaps}
                                android_ripple={{ color: "#E5E7EB" }}
                                style={({ pressed }) => ({
                                    marginTop: 8,
                                    borderWidth: 1,
                                    borderColor: "#E5E7EB",
                                    borderRadius: 10,
                                    padding: 12,
                                    backgroundColor: pressed ? "#F3F4F6" : "rgba(142,142,147,0.1)",
                                })}
                            >
                                {/* Nome do tutor */}
                                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                                    <Text style={{ fontWeight: "800", fontSize: 15 }}>
                                        {tutor?.nome || tutor?.name}
                                    </Text>

                                    {tutor?.geo?.lat && tutor?.geo?.lng && (
                                        <Ionicons name="navigate-outline" size={22} color="#007AFF" />
                                    )}
                                </View>

                                {/* Endereço */}
                                <Text
                                    style={{ color: "#6B7280", marginTop: 4 }}
                                    numberOfLines={2}
                                >
                                    {tutor?.endereco?.formatted || tutorAddressFallback(tutor) || "—"}
                                </Text>
                            </Pressable>
                        )}
                    </View>

                    {/* Pets do tutor (multi-select) */}
                    {tutor?.id && (
                        <View style={{ marginTop: 14 }}>
                            <Text style={styles.label}>Pets do tutor</Text>

                            {loadingPets && !petsDoTutor?.length ? (
                                <Text style={{ color: "#6B7280" }}>Carregando pets…</Text>
                            ) : null}

                            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                                {(petsDoTutor || []).map((p) => {
                                    const pid = String(p.id);
                                    const active = selectedPetIds.includes(pid);
                                    const nome = p?.nome || p?.name || "Pet";
                                    const chip = (
                                        <View
                                            key={pid}
                                            style={{
                                                paddingHorizontal: 12,
                                                paddingVertical: 9,
                                                borderRadius: 999,
                                                backgroundColor: active ? "#E6F0FF" : "#F2F2F7",
                                                borderWidth: active ? 1 : 0,
                                                borderColor: active ? "#0A84FF" : "transparent"
                                            }}
                                        >
                                            <Text style={{ fontSize: 12, fontWeight: "700", color: active ? "#0A84FF" : "#3C3C43" }}>
                                                {nome}
                                            </Text>
                                        </View>
                                    );
                                    if (disabled) return chip;
                                    return (
                                        <Pressable
                                            key={pid}
                                            onPress={() =>
                                                setSelectedPetIds((prev) =>
                                                    prev.includes(pid) ? prev.filter((id) => id !== pid) : [...prev, pid]
                                                )
                                            }
                                            android_ripple={{ color: "#D0E6FF" }}
                                        >
                                            {chip}
                                        </Pressable>
                                    );
                                })}
                            </View>

                            {!loadingPets && (!petsDoTutor || petsDoTutor.length === 0) && (
                                <Text style={{ color: "#6B7280", marginTop: 6 }}>Este tutor não possui pets cadastrados.</Text>
                            )}
                        </View>
                    )}

                    {/* Data e horário */}
                    <View style={{ marginTop: 16 }}>
                        <Text style={styles.label}>Data e horário</Text>

                        <DateTimePicker
                            value={date}
                            disabled={disabled}
                            mode="datetime"
                            display={Platform.OS === "ios" ? "default" : "default"}
                            onChange={(_, d) => d && setDate(d)}
                            minuteInterval={5}
                            locale="pt-BR"
                            themeVariant={Platform.OS === "ios" ? "light" : undefined} // força claro/escuro
                            textColor={Platform.OS === "ios" ? "#111827" : undefined} // iOS apenas
                            style={{
                                opacity: disabled ? 0.6 : 1,
                                backgroundColor: disabled ? "rgba(142,142,147,0.2)" : tint, // evita as faixas duplas
                                borderRadius: 12

                            }}
                        />

                    </View>

                    {/* Duração */}
                    <View style={{ marginTop: 14, justifyContent: 'center', alignContent: 'center' }}>
                        <View style={{ flexDirection: "row", alignItems: "baseline" }}>
                            <Ionicons
                                name="time-outline"
                                size={16}
                                color="#8E8E93"
                                style={{ marginRight: 4, paddingTop: 3.5 }}
                            />
                            <Text style={styles.label}>Duração (HH:MM)</Text>
                        </View>
                        <View style={{ flexDirection: 'row' }}>
                            <DateTimePicker
                                disabled={disabled}
                                value={hhmmToDate(duracao)}
                                mode="time"
                                display="inline" // iOS fica inline, Android abre modal
                                is24Hour
                                minuteInterval={5}
                                onChange={(_, selected) => {
                                    if (selected) {
                                        setDuracao(dateToHHMM(selected));
                                    }
                                }}
                                themeVariant={Platform.OS === "ios" ? "light" : undefined} // força claro/escuro
                                textColor={Platform.OS === "ios" ? "#111827" : undefined} // iOS apenas
                                style={{
                                    opacity: disabled ? 0.6 : 1,
                                    backgroundColor: disabled ? "rgba(142,142,147,0.2)" : tint, // evita as faixas duplas
                                    borderRadius: 12,
                                    transform: [{ scale: 0.8 }],
                                    height: 80, // ajusta a altura manualmente
                                }}
                            />
                        </View>
                    </View>

                    {/* Observações */}
                    <View style={{ marginTop: 14, marginBottom: 20 }}>
                        <Text style={styles.label}>Observações</Text>
                        <View style={[styles.inputOutline, { minHeight: 90, paddingVertical: 8 }]}>
                            <TextInput
                                placeholderTextColor="#9CA3AF"
                                placeholder="Alguma observação sobre a consulta"
                                value={observacoes}
                                onChangeText={(t) => !disabled && setObservacoes(t)}
                                multiline
                                textAlignVertical="top"
                                style={{ minHeight: 74, color: disabled ? inputDisabledColor : 'black' }}
                                editable={!disabled}
                            />
                        </View>
                    </View>

                    {tutor?.id && (
                        <View style={{ marginVertical: 10 }}>
                            <EnderecoCard tutor={tutor} />
                        </View>
                    )}

                    {/* Botão Salvar (somente em edição e quando pode salvar) */}
                    {isEditing && (
                        <Pressable
                            disabled={!canSave}
                            onPress={onSubmit}
                            style={{
                                marginTop: 12,
                                backgroundColor: canSave ? tint : "#9CA3AF",
                                padding: 12,
                                borderRadius: 10,
                                alignItems: 'center',
                            }}
                        >
                            <Text style={{ color: 'white', fontWeight: '700', fontSize: 16 }}>Salvar</Text>
                        </Pressable>
                    )}
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = {
    label: { fontSize: 12, color: "#6B7280", marginBottom: 6, fontWeight: "600" },
    inputOutline: {
        borderWidth: 1.5,
        borderColor: "#E5E7EB",
        borderRadius: 10,
        paddingHorizontal: 10,
        minHeight: 42,
        justifyContent: "center"
    },
    inputIcon: {
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1.5,
        borderColor: "#E5E7EB",
        borderRadius: 10,
        paddingHorizontal: 10,
        height: 42
    }
};