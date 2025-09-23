import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    View,
    Text,
    TextInput,
    Pressable,
    FlatList,
    Platform,
    ScrollView
} from "react-native";
import { useNavigation, useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import DateTimePicker from "@react-native-community/datetimepicker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useDispatch, useSelector } from "react-redux";

// ---- imports dos seus slices/seletores
import {
    selectTutores,
    makeSelectTutoresByQuery
} from "@/src/store/slices/tutoresSlice";
import {
    selectPetsByTutorId,
    selectLoadingPetsByTutor,
    fetchPetsByTutor
} from "@/src/store/slices/petsSlice";
import EnderecoCard from "@/src/screens/tutores/EnderecoCard";
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

// ---------- CONFIG ----------
const STORAGE_KEY = "AGENDAV1_EVENTS";

// ---------- HELPERS ----------
function roundToNext(minutes = 30, date = new Date()) {
    const d = new Date(date);
    const m = d.getMinutes();
    const add = (minutes - (m % minutes)) % minutes;
    d.setMinutes(m + add, 0, 0);
    return d;
}
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
function toHHMM(totalMin) {
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return `${pad2(h)}:${pad2(m)}`;
}
function tutorAddress(t) {
    const partes = [
        t?.endereco, t?.numero, t?.bairro, t?.cidade, t?.uf, t?.cep
    ].filter(Boolean);
    return partes.join(", ");
}

// ---------- SCREEN ----------
export default function AgendaNewScreen() {
    const navigation = useNavigation();
    const dispatch = useDispatch();
    const { tutorId: tutorIdParam, tutorNome: tutorNomeParam } = useLocalSearchParams();

    // Tutores do Redux
    const tutores = useSelector(selectTutores);
    // Busca por nome/telefone/email
    const tutoresByQuerySelectorRef = useRef(makeSelectTutoresByQuery());
    const tutoresFiltrados = useSelector((state) =>
        tutoresByQuerySelectorRef.current(state, String("").toLowerCase())
    );

    // Form state
    const [title, setTitle] = useState("");
    const [tutorQuery, setTutorQuery] = useState("");
    const [tutor, setTutor] = useState(() => {
        const pre = tutores.find((t) => String(t.id) === String(tutorIdParam));
        return pre || (tutorIdParam ? { id: tutorIdParam, nome: tutorNomeParam } : { id: null, nome: "" });
    });

    // Pets do tutor: selector + fetch
    const petsDoTutor = useSelector(selectPetsByTutorId(tutor?.id || ""));
    const loadingPets = useSelector(selectLoadingPetsByTutor(tutor?.id || ""));
    const [selectedPetIds, setSelectedPetIds] = useState([]);

    // Data/hora, duração, local, observações
    const [date, setDate] = useState(roundToNext(30));
    const [duracao, setDuracao] = useState("1:00");
    const [local, setLocal] = useState("");
    const [observacoes, setObservacoes] = useState("");

    // Atualiza header (Cancelar / Salvar)
    const canSave = useMemo(() => {
        return title.trim() && tutor?.id && selectedPetIds.length && isValidHHMM(duracao);
    }, [title, tutor, selectedPetIds, duracao]);

    useEffect(() => {
        navigation.setOptions({
            headerTitle: "Novo evento",
            headerLeft: () => (
                <Pressable onPress={() => router.back()} hitSlop={10} style={{ padding: 6 }}>
                    <Text style={{ color: "#007AFF", fontWeight: "700" }}>Cancelar</Text>
                </Pressable>
            ),
            headerRight: () => (
                <Pressable
                    disabled={!canSave}
                    onPress={handleSave}
                    hitSlop={10}
                    style={{ padding: 6, opacity: canSave ? 1 : 0.5 }}
                >
                    <Text style={{ color: "#007AFF", fontWeight: "800" }}>Salvar</Text>
                </Pressable>
            )
        });
    }, [navigation, canSave]);

    // Busca dinâmica por tutores conforme digita
    const tutoresBuscados = useSelector((state) =>
        tutoresByQuerySelectorRef.current(state, tutorQuery)
    );
    console.log('tutoresBUscados: ', tutoresBuscados)

    // Quando escolher/alterar tutor: carrega pets e preenche Local
    useEffect(() => {
        if (tutor?.id) {
            const addr = tutorAddress(tutor);
            if (addr) setLocal(addr);
            // dispara fetch dos pets desse tutor (respeita a condition do thunk)
            dispatch(fetchPetsByTutor({ tutorId: tutor.id }));
            // limpa seleção de pets ao trocar de tutor
            setSelectedPetIds([]);
        } else {
            setSelectedPetIds([]);
            setLocal("");
        }
    }, [tutor?.id]);

    async function handleSave() {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        const minutes = hhmmToMinutes(duracao);
        const start = new Date(date);
        const end = new Date(date);
        end.setMinutes(end.getMinutes() + minutes);

        const evento = {
            id: String(Date.now()),
            title: title.trim(),
            start: toLocalIsoNoTZ(start),
            end: toLocalIsoNoTZ(end),
            duracao: toHHMM(minutes),
            tutorId: tutor.id,
            tutorNome: tutor.nome || tutor.name,
            petIds: selectedPetIds,
            local: (local || "").trim(),
            observacoes: (observacoes || "").trim(),
            status: "pendente"
        };

        try {
            const raw = await AsyncStorage.getItem(STORAGE_KEY);
            const arr = raw ? JSON.parse(raw) : [];
            const next = Array.isArray(arr) ? [...arr, evento] : [evento];
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch (e) {
            console.warn("Erro ao salvar eventos:", e);
        }

        router.back();
    }

    // UI
    return (
        <SafeAreaView style={{ flex: 1 }} edges={[]}>
            <ScrollView style={{ flex: 1, backgroundColor: "#FFF" }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
                {/* Título */}
                <Text style={styles.label}>Título</Text>
                <View style={styles.inputOutline}>
                    <TextInput value={title} onChangeText={setTitle} placeholder="Ex.: Consulta - Thor" style={{ color: 'black' }} placeholderTextColor="#9CA3AF" />
                </View>

                {/* Tutor (busca + lista) */}
                <View style={{ marginTop: 14 }}>
                    <Text style={styles.label}>Tutor</Text>

                    {/* Campo de busca/seleção */}
                    <View style={styles.inputIcon}>
                        <Ionicons name="person-circle-outline" size={18} color="#8E8E93" />
                        <TextInput
                            placeholderTextColor="#9CA3AF" // cinza médio
                            placeholder="Buscar e selecionar tutor"
                            value={tutor?.id ? (tutor.nome || tutor.name || "") : tutorQuery}
                            onChangeText={(t) => {
                                setTutorQuery(t);
                                setTutor({ id: null, nome: "" });
                            }}
                            style={{ flex: 1, marginLeft: 8, paddingVertical: 0 }}
                        />
                        {tutor?.id && (
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

                    {/* Lista de tutores (aparece quando não há tutor fixado) */}
                    {!tutor?.id && (
                        <FlatList
                            data={tutoresBuscados}
                            keyExtractor={(it) => String(it.id)}
                            style={{ maxHeight: 240, marginTop: 8, borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10 }}
                            keyboardShouldPersistTaps="handled"
                            renderItem={({ item }) => (
                                <Pressable
                                    onPress={() => setTutor(item)}
                                    style={({ pressed }) => ({
                                        paddingHorizontal: 12,
                                        paddingVertical: 10,
                                        backgroundColor: pressed ? "#F3F4F6" : "white",
                                        borderBottomWidth: 1,
                                        borderBottomColor: "#F1F5F9"
                                    })}
                                >
                                    <Text style={{ fontWeight: "700" }}>{item?.nome || item?.name}</Text>
                                    <Text style={{ color: "#6B7280", marginTop: 2 }} numberOfLines={1}>
                                        {item?.endereco?.formatted || "—"}
                                    </Text>
                                </Pressable>
                            )}
                            ListEmptyComponent={
                                <View style={{ padding: 12 }}>
                                    <Text style={{ color: "#6B7280" }}>Nenhum tutor encontrado</Text>
                                </View>
                            }
                        />
                    )}

                    {/* Tutor escolhido (nome + endereço menor) */}
                    {tutor?.id && (
                        <View style={{ marginTop: 8 }}>
                            <Text style={{ fontWeight: "800", fontSize: 15 }}>{tutor?.nome || tutor?.name}</Text>
                            <Text style={{ color: "#6B7280", marginTop: 2 }} numberOfLines={2}>
                                {tutor?.endereco?.formatted || "—"}
                            </Text>
                        </View>
                    )}
                </View>

                {/* Pets do tutor (multi-select) */}
                {tutor?.id && (
                    <View style={{ marginTop: 14 }}>
                        <Text style={styles.label}>Pets do tutor</Text>

                        {/* Quando estiver carregando pela primeira vez */}
                        {loadingPets && !petsDoTutor?.length ? (
                            <Text style={{ color: "#6B7280" }}>Carregando pets…</Text>
                        ) : null}

                        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                            {(petsDoTutor || []).map((p) => {
                                const pid = String(p.id);
                                const active = selectedPetIds.includes(pid);
                                const nome = p?.nome || p?.name || "Pet";
                                return (
                                    <Pressable
                                        key={pid}
                                        onPress={() =>
                                            setSelectedPetIds((prev) =>
                                                prev.includes(pid) ? prev.filter((id) => id !== pid) : [...prev, pid]
                                            )
                                        }
                                        android_ripple={{ color: "#D0E6FF" }}
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
                                    </Pressable>
                                );
                            })}
                        </View>

                        {!loadingPets && (!petsDoTutor || petsDoTutor.length === 0) && (
                            <Text style={{ color: "#6B7280", marginTop: 6 }}>Este tutor não possui pets cadastrados.</Text>
                        )}
                    </View>
                )}

                {/* Data e horário (DateTimePicker iOS) */}
                <View style={{ marginTop: 16 }}>
                    <Text style={styles.label}>Data e horário</Text>
                    <View style={{ borderWidth: 1.5, borderColor: "#E5E7EB", borderRadius: 10, overflow: "hidden" }}>
                        <DateTimePicker
                            value={date}
                            mode="datetime"
                            display={Platform.OS === "ios" ? "spinner" : "default"}
                            onChange={(_, d) => d && setDate(d)}
                            minuteInterval={5}
                            locale="pt-BR"
                        />
                    </View>
                </View>

                {/* Duração */}
                <View style={{ marginTop: 14 }}>
                    <Text style={styles.label}>Duração (HH:MM)</Text>
                    <View style={styles.inputIcon}>
                        <Ionicons name="time-outline" size={18} color="#8E8E93" />
                        <TextInput
                            placeholderTextColor="#9CA3AF" // cinza médio
                            placeholder="1:00"
                            value={duracao}
                            onChangeText={(t) => setDuracao(normalizeHHMM(t))}
                            keyboardType="numbers-and-punctuation"
                            maxLength={5}
                            style={{ flex: 1, marginLeft: 8, paddingVertical: 0 }}
                        />
                        {!isValidHHMM(duracao) && (
                            <Text style={{ color: "#EF4444", fontSize: 12, fontWeight: "700" }}>Inválido</Text>
                        )}
                    </View>
                </View>


                {/* Observações */}
                <View style={{ marginTop: 14, marginBottom: 20 }}>
                    <Text style={styles.label}>Observações</Text>
                    <View style={[styles.inputOutline, { minHeight: 90, paddingVertical: 8 }]}>
                        <TextInput
                            placeholderTextColor="#9CA3AF" // cinza médio
                            placeholder="Alguma observação sobre a consulta"
                            value={observacoes}
                            onChangeText={setObservacoes}
                            multiline
                            textAlignVertical="top"
                            style={{ minHeight: 74 }}
                        />
                    </View>
                </View>
                {tutor.id &&
                    <View
                        style={{
                            marginVertical: 10
                        }}
                    >
                        <EnderecoCard tutor={tutor} />
                    </View>
                }
            </ScrollView>
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