// @ts-nocheck
import React, {
    useCallback,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import {
    ActionSheetIOS,
    ActivityIndicator,
    Alert,
    Keyboard,
    KeyboardAvoidingView,
    Linking,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    View,
} from "react-native";

import { useLocalSearchParams, useNavigation, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import DateTimePicker from "@react-native-community/datetimepicker";
import { shallowEqual, useDispatch, useSelector } from "react-redux";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { useThemeColor } from "@/hooks/useThemeColor";
import EnderecoCard from "@/src/screens/tutores/EnderecoCard";

import {
    selectTutores,
    makeSelectTutoresByQuery,
    selectTutorById,
} from "@/src/store/slices/tutoresSlice";

import {
    selectPetsByTutorId,
    selectLoadingPetsByTutor,
    fetchPetsByTutor,
    selectPetsState,
} from "@/src/store/slices/petsSlice";

import {
    selectEventoById,
} from "@/src/store/slices/agendaSlice";

import {
    createEventoComFinanceiro,
    createEventosRecorrentesComFinanceiro,
    updateEventoComFinanceiro,
} from "@/src/features/financeiro/financeiro.workflows";

import {
    selectDefaultDuracao,
    selectStartOfDay,
    selectNavPreference,
} from "@/src/store/slices/systemSlice";

const COLORS = {
    bg: "#F5F5F7",
    card: "#FFFFFF",
    text: "#111827",
    subtle: "#6B7280",
    border: "rgba(15,23,42,0.09)",
    blue: "#0A84FF",
    green: "#16A34A",
    orange: "#F59E0B",
    red: "#EF4444",
    pink: "#FF6FA5",
};

const STATUS_STYLES = {
    confirmado: {
        color: COLORS.green,
        bg: "rgba(22,163,74,0.12)",
        border: "rgba(22,163,74,0.28)",
        label: "Confirmado",
        icon: "checkmark-circle-outline",
    },
    pendente: {
        color: COLORS.orange,
        bg: "rgba(245,158,11,0.13)",
        border: "rgba(245,158,11,0.28)",
        label: "Pendente",
        icon: "time-outline",
    },
    cancelado: {
        color: COLORS.red,
        bg: "rgba(239,68,68,0.11)",
        border: "rgba(239,68,68,0.28)",
        label: "Cancelado",
        icon: "close-circle-outline",
    },
    default: {
        color: COLORS.subtle,
        bg: "rgba(107,114,128,0.12)",
        border: "rgba(107,114,128,0.20)",
        label: "—",
        icon: "ellipse-outline",
    },
};

const EVENT_STATUSES = ["pendente", "confirmado", "cancelado"];

/* ---------------- Helpers ---------------- */

const pad2 = (n) => String(n).padStart(2, "0");

function tutorAddressFallback(t) {
    const endereco = t?.endereco || {};

    if (typeof endereco === "string") {
        return [endereco, t?.numero, t?.bairro, t?.cidade, t?.uf, t?.cep]
            .filter(Boolean)
            .join(", ");
    }

    return [
        endereco?.logradouro,
        endereco?.numero,
        endereco?.bairro,
        endereco?.cidade,
        endereco?.uf,
        endereco?.cep,
    ]
        .filter(Boolean)
        .join(", ");
}

const hhmmToDate = (hhmm = "01:00") => {
    const m = (hhmm || "01:00").match(/^(\d{1,2}):([0-5]\d)$/) || [
        0,
        "1",
        "00",
    ];

    const h = parseInt(m[1], 10);
    const mi = parseInt(m[2], 10);

    const d = new Date();
    d.setHours(h, mi, 0, 0);

    return d;
};

const dateToHHMM = (d) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;

function minutesBetween(a, b) {
    const ms = Math.max(0, new Date(b) - new Date(a));
    return Math.round(ms / 60000);
}

function toHHMM(totalMin) {
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;

    return `${pad2(h)}:${pad2(m)}`;
}

function parseBRLToNumber(s) {
    if (s == null) return 0;

    const clean = String(s)
        .replace(/[^\d,.-]/g, "")
        .replace(/\./g, "")
        .replace(",", ".");

    const n = Number(clean);

    return Number.isFinite(n) ? n : 0;
}

function normalizeMoneyInput(value) {
    let v = String(value || "").replace(/[^\d.,]/g, "");

    const parts = v.split(/[.,]/);

    if (parts.length > 2) {
        v = parts[0] + "," + parts.slice(1).join("");
    }

    return v;
}

function formatNumberToBRL(n) {
    const num = Number(n);

    if (!Number.isFinite(num)) return "—";

    return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
    }).format(num);
}

const addDays = (d, days) => {
    const x = new Date(d);
    x.setDate(x.getDate() + days);
    return x;
};

function formatDateBR(date) {
    if (!date) return "—";

    return `${pad2(date.getDate())}/${pad2(
        date.getMonth() + 1
    )}/${date.getFullYear()}`;
}

function formatTime(date) {
    if (!date) return "--:--";
    return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

/* ---------------- UI atoms ---------------- */

function SectionCard({ title, icon, children, right }) {
    return (
        <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleWrap}>
                    <View style={styles.sectionIconCircle}>
                        <Ionicons name={icon} size={16} color={COLORS.blue} />
                    </View>

                    <Text style={styles.sectionTitle}>{title}</Text>
                </View>

                {right}
            </View>

            <View style={styles.sectionBody}>{children}</View>
        </View>
    );
}

function FieldLabel({ children, helper }) {
    return (
        <View style={styles.fieldLabelWrap}>
            <Text style={styles.label}>{children}</Text>
            {!!helper && <Text style={styles.helper}>{helper}</Text>}
        </View>
    );
}

function InputShell({ children, disabled, multiline }) {
    return (
        <View
            style={[
                styles.inputShell,
                disabled && styles.inputShellDisabled,
                multiline && styles.inputShellMultiline,
            ]}
        >
            {children}
        </View>
    );
}

function AppTextInput({
    value,
    onChangeText,
    placeholder,
    disabled,
    multiline = false,
    keyboardType,
    icon,
}) {
    return (
        <InputShell disabled={disabled} multiline={multiline}>
            {!!icon && (
                <Ionicons
                    name={icon}
                    size={18}
                    color="#8E8E93"
                    style={styles.inputIconLeft}
                />
            )}

            <TextInput
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor="#9CA3AF"
                editable={!disabled}
                multiline={multiline}
                keyboardType={keyboardType}
                textAlignVertical={multiline ? "top" : "center"}
                style={[
                    styles.input,
                    multiline && styles.inputMultiline,
                    disabled && styles.inputDisabled,
                ]}
            />
        </InputShell>
    );
}

function StatusBadge({ status }) {
    const s = STATUS_STYLES[status] || STATUS_STYLES.default;

    return (
        <View
            style={[
                styles.statusBadge,
                {
                    backgroundColor: s.bg,
                    borderColor: s.border,
                },
            ]}
        >
            <Ionicons name={s.icon} size={14} color={s.color} />
            <Text style={[styles.statusBadgeText, { color: s.color }]}>{s.label}</Text>
        </View>
    );
}

function StatusChips({ value, onChange }) {
    return (
        <View style={styles.statusChips}>
            {EVENT_STATUSES.map((key) => {
                const s = STATUS_STYLES[key];
                const active = value === key;

                return (
                    <Pressable
                        key={key}
                        onPress={() => {
                            Haptics.selectionAsync().catch(() => { });
                            onChange(key);
                        }}
                        android_ripple={{ color: "#E5E7EB" }}
                        style={({ pressed }) => [
                            styles.statusChip,
                            active && {
                                borderColor: s.border,
                                backgroundColor: s.bg,
                            },
                            pressed && Platform.OS === "ios" ? { opacity: 0.82 } : null,
                        ]}
                    >
                        <Ionicons
                            name={s.icon}
                            size={14}
                            color={active ? s.color : COLORS.subtle}
                        />
                        <Text
                            style={[
                                styles.statusChipText,
                                active && {
                                    color: s.color,
                                    fontWeight: "850",
                                },
                            ]}
                        >
                            {s.label}
                        </Text>
                    </Pressable>
                );
            })}
        </View>
    );
}

function StatusField({ disabled, status, setStatus }) {
    return disabled ? (
        <StatusBadge status={status} />
    ) : (
        <StatusChips value={status} onChange={setStatus} />
    );
}

function PriceField({ disabled, precoText, setPrecoText, eventoExistente }) {
    const precoNumber = useMemo(() => {
        const nFromText = parseBRLToNumber(precoText);

        if (precoText?.trim()) return nFromText;

        const saved = eventoExistente?.financeiro?.preco;

        return Number.isFinite(saved) ? saved : 0;
    }, [precoText, eventoExistente?.financeiro?.preco]);

    if (disabled) {
        return (
            <View style={styles.readValueRow}>
                <Ionicons name="cash-outline" size={18} color={COLORS.green} />
                <Text style={styles.readValueText}>{formatNumberToBRL(precoNumber)}</Text>
            </View>
        );
    }

    return (
        <InputShell>
            <Text style={styles.moneyPrefix}>R$</Text>

            <TextInput
                placeholderTextColor="#9CA3AF"
                placeholder="0,00"
                value={precoText}
                onChangeText={(v) => setPrecoText(normalizeMoneyInput(v))}
                keyboardType="decimal-pad"
                style={styles.moneyInput}
            />
        </InputShell>
    );
}

function TutorSuggestionList({ items, onSelect }) {
    return (
        <View style={styles.suggestionBox}>
            {items.length > 0 ? (
                items.slice(0, 8).map((item, idx) => (
                    <Pressable
                        key={String(item.id)}
                        onPress={() => {
                            Haptics.selectionAsync().catch(() => { });
                            onSelect(item);
                        }}
                        style={({ pressed }) => [
                            styles.suggestionRow,
                            pressed && { backgroundColor: "#F3F4F6" },
                            idx === items.length - 1 && { borderBottomWidth: 0 },
                        ]}
                    >
                        <View style={styles.suggestionAvatar}>
                            <Text style={styles.suggestionAvatarText}>
                                {String(item?.nome || item?.name || "?").charAt(0).toUpperCase()}
                            </Text>
                        </View>

                        <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={styles.suggestionName} numberOfLines={1}>
                                {item?.nome || item?.name}
                            </Text>

                            <Text style={styles.suggestionSub} numberOfLines={1}>
                                {item?.telefone || item?.email || item?.endereco?.formatted || "—"}
                            </Text>
                        </View>
                    </Pressable>
                ))
            ) : (
                <View style={styles.suggestionEmpty}>
                    <Text style={styles.suggestionEmptyTitle}>Nenhum tutor encontrado</Text>
                    <Text style={styles.suggestionEmptySub}>
                        Confira a busca ou cadastre um novo tutor pela aba Tutores.
                    </Text>
                </View>
            )}
        </View>
    );
}

function SelectedTutorCard({ tutor, disabled, onClear, onOpenMaps }) {
    const hasGeo = !!tutor?.geo?.lat && !!tutor?.geo?.lng;

    return (
        <Pressable
            onPress={hasGeo ? onOpenMaps : undefined}
            android_ripple={{ color: "#E5E7EB" }}
            style={({ pressed }) => [
                styles.selectedTutorCard,
                pressed && hasGeo && { backgroundColor: "#F3F4F6" },
            ]}
        >
            <View style={styles.selectedTutorTop}>
                <View style={styles.selectedTutorAvatar}>
                    <Text style={styles.selectedTutorAvatarText}>
                        {String(tutor?.nome || tutor?.name || "?").charAt(0).toUpperCase()}
                    </Text>
                </View>

                <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.selectedTutorName} numberOfLines={1}>
                        {tutor?.nome || tutor?.name}
                    </Text>

                    <Text style={styles.selectedTutorAddress} numberOfLines={2}>
                        {tutor?.endereco?.formatted || tutorAddressFallback(tutor) || "Sem endereço"}
                    </Text>
                </View>

                {hasGeo ? (
                    <Ionicons name="navigate-outline" size={22} color={COLORS.blue} />
                ) : null}

                {!disabled && (
                    <Pressable onPress={onClear} hitSlop={10} style={styles.clearTutorButton}>
                        <Ionicons name="close-circle" size={19} color="#8E8E93" />
                    </Pressable>
                )}
            </View>
        </Pressable>
    );
}

function PetChip({ pet, active, disabled, onPress }) {
    const nome = pet?.nome || pet?.name || "Pet";

    const chip = (
        <View
            style={[
                styles.petChip,
                active && styles.petChipActive,
                disabled && !active && { opacity: 0.78 },
            ]}
        >
            <Ionicons
                name={active ? "paw" : "paw-outline"}
                size={13}
                color={active ? COLORS.blue : COLORS.subtle}
            />
            <Text style={[styles.petChipText, active && styles.petChipTextActive]}>
                {nome}
            </Text>
        </View>
    );

    if (disabled) return chip;

    return (
        <Pressable onPress={onPress} android_ripple={{ color: "#D0E6FF" }}>
            {chip}
        </Pressable>
    );
}

function DateReadCard({ date }) {
    return (
        <View style={styles.dateReadCard}>
            <View style={styles.dateReadItem}>
                <Ionicons name="calendar-outline" size={17} color={COLORS.subtle} />
                <Text style={styles.dateReadText}>{formatDateBR(date)}</Text>
            </View>

            <View style={styles.dateReadItem}>
                <Ionicons name="time-outline" size={17} color={COLORS.subtle} />
                <Text style={styles.dateReadText}>{formatTime(date)}</Text>
            </View>
        </View>
    );
}

/* ---------------- Screen ---------------- */

export default function AgendaNewScreen() {
    const navigation = useNavigation();
    const dispatch = useDispatch();
    const params = useLocalSearchParams();
    const insets = useSafeAreaInsets();

    const eventIdParam = params?.id ? String(params.id) : null;
    const tutorIdParam = params?.tutorId ? String(params.tutorId) : null;
    const tutorNomeParam = params?.tutorNome || "";
    const preselectPetIdParam = params?.preselectPetId
        ? String(params.preselectPetId)
        : null;
    const petNomeParam = params?.petNome || "";

    const tint = useThemeColor({}, "tint");
    const bg = useThemeColor({}, "background");

    const isNew = !eventIdParam;

    // Redux
    const tutores = useSelector(selectTutores);

    const eventoExistente = useSelector((s) =>
        eventIdParam ? selectEventoById(eventIdParam)(s) : null
    );

    const evento = useSelector((s) =>
        eventIdParam ? s.agenda.byId?.[String(eventIdParam)] : null
    );

    const tutorFromEvent = useSelector((s) =>
        eventoExistente?.tutorId
            ? selectTutorById(s, eventoExistente.tutorId)
            : null
    );

    const defaultStartDay = useSelector(selectStartOfDay);
    const defaultDur = useSelector(selectDefaultDuracao);
    const navPreference = useSelector(selectNavPreference);
    const petsState = useSelector(selectPetsState, shallowEqual);

    const tutoresByQuerySelectorRef = useRef(makeSelectTutoresByQuery());
    const onSubmitRef = useRef(null);
    const preselectedPetIdRef = useRef(preselectPetIdParam);

    const [isEditing, setIsEditing] = useState(() => !eventIdParam);
    const [title, setTitle] = useState(() =>
        eventIdParam ? "" : petNomeParam ? `Consulta - ${petNomeParam}` : ""
    );
    const [descricao, setDescricao] = useState("");
    const [tutorQuery, setTutorQuery] = useState("");
    const [tutor, setTutor] = useState(() => {
        if (tutorIdParam) {
            const pre = tutores.find((t) => String(t.id) === tutorIdParam);
            return pre || { id: tutorIdParam, nome: tutorNomeParam };
        }

        return { id: null, nome: "" };
    });
    const [selectedPetIds, setSelectedPetIds] = useState(() =>
        preselectPetIdParam ? [preselectPetIdParam] : []
    );
    const [date, setDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() + 1);

        const [h, m] = (defaultStartDay || "09:00").split(":").map(Number);
        d.setHours(h || 9, m || 0, 0, 0);

        return d;
    });
    const [duracao, setDuracao] = useState(defaultDur || "01:00");
    const [local, setLocal] = useState("");
    const [observacoes, setObservacoes] = useState("");
    const [precoText, setPrecoText] = useState("");
    const [status, setStatus] = useState("pendente");
    const [recorrente, setRecorrente] = useState(false);
    const [recorrencias, setRecorrencias] = useState("4");
    const [saving, setSaving] = useState(false);

    const disabled = !isEditing;

    const petsDoTutor = useSelector(selectPetsByTutorId(tutor?.id || ""));
    const loadingPets = useSelector(selectLoadingPetsByTutor(tutor?.id || ""));

    const petNames = useMemo(() => {
        const byId = petsState?.byId || {};

        return (selectedPetIds || [])
            .map((pid) => byId[String(pid)])
            .filter(Boolean)
            .map((p) => p?.nome || p?.name);
    }, [selectedPetIds, petsState?.byId]);

    const tutoresBuscados = useSelector((state) =>
        tutoresByQuerySelectorRef.current(state, tutorQuery)
    );

    /* ---------- Effects ---------- */

    useEffect(() => {
        if (!eventoExistente) return;

        setTitle(eventoExistente.title || "");
        setSelectedPetIds(
            Array.isArray(eventoExistente.petIds)
                ? eventoExistente.petIds.map(String)
                : []
        );
        setObservacoes(eventoExistente.observacoes || "");
        setDescricao(eventoExistente.descricao || "");
        setStatus(eventoExistente.status || "pendente");
        setLocal(eventoExistente.local || "");

        if (eventoExistente.start) {
            setDate(new Date(eventoExistente.start));
        } else if (eventoExistente.date) {
            setDate(new Date(eventoExistente.date));
        }

        if (eventoExistente.start && eventoExistente.end) {
            setDuracao(toHHMM(minutesBetween(eventoExistente.start, eventoExistente.end)));
        } else if (eventoExistente.duracao) {
            setDuracao(eventoExistente.duracao);
        }

        const preco =
            eventoExistente?.financeiro?.preco ??
            0;

        setPrecoText(
            preco > 0
                ? Number(preco)
                    .toFixed(2)
                    .replace(".", ",")
                : ""
        );

        const eventTutor =
            tutorFromEvent ||
            (eventoExistente?.tutorId
                ? {
                    id: eventoExistente.tutorId,
                    nome: eventoExistente.tutorNome || eventoExistente.cliente || "",
                }
                : null);

        if (eventTutor?.id) {
            setTutor(eventTutor);
            setTutorQuery("");
        }
    }, [eventIdParam, eventoExistente, tutorFromEvent]);

    useEffect(() => {
        if (!isNew) {
            setRecorrente(false);
            setRecorrencias("");
        }
    }, [isNew]);

    useEffect(() => {
        if (tutor?.id) {
            const addrFormatted = tutor?.endereco?.formatted;
            const fallback = tutorAddressFallback(tutor);

            if (addrFormatted || fallback) {
                setLocal((prev) => prev || addrFormatted || fallback);
            }

            dispatch(fetchPetsByTutor({ tutorId: tutor.id }));

            if (isEditing && !eventoExistente && !preselectedPetIdRef.current) {
                setSelectedPetIds([]);
            }
        } else if (isEditing) {
            setSelectedPetIds([]);
            setLocal("");
        }
    }, [tutor?.id, isEditing, eventoExistente, dispatch]);

    useEffect(() => {
        if (!isEditing || eventoExistente) return;

        const pre = preselectedPetIdRef.current;

        if (!pre || !tutor?.id) return;

        const exists = (petsDoTutor || []).some((p) => String(p.id) === pre);

        if (exists) {
            setSelectedPetIds([pre]);
        } else {
            setSelectedPetIds([]);
        }

        preselectedPetIdRef.current = null;
    }, [petsDoTutor, tutor?.id, isEditing, eventoExistente]);

    const canSave = useMemo(() => {
        if (!isEditing) return false;
        if (!title.trim()) return false;

        if (recorrente) {
            const n = parseInt(recorrencias || "0", 10);
            if (!Number.isFinite(n) || n <= 0) return false;
        }

        return true;
    }, [isEditing, title, recorrente, recorrencias]);

    useLayoutEffect(() => {
        const safeStatus = evento?.status || status || "pendente";
        const s = STATUS_STYLES[safeStatus] || STATUS_STYLES.default;

        navigation.setOptions({
            headerTitleAlign: "center",
            headerTransparent: false,
            headerShadowVisible: false,

            headerTitle: () => (
                <View style={styles.headerTitleWrap}>
                    <Ionicons
                        name={eventIdParam ? s.icon : "calendar-outline"}
                        size={16}
                        color={eventIdParam ? s.color : COLORS.blue}
                    />
                    <Text
                        style={[
                            styles.headerTitle,
                            { color: eventIdParam ? s.color : COLORS.text },
                        ]}
                        numberOfLines={1}
                    >
                        {eventIdParam ? s.label : "Novo evento"}
                    </Text>
                </View>
            ),

            headerLeft: () => (
                <Pressable
                    onPress={() => router.back()}
                    hitSlop={10}
                    style={({ pressed }) => [
                        styles.headerPillButton,
                        pressed && { opacity: 0.72 },
                    ]}
                >
                    <Text style={styles.headerPillText}>
                        {eventIdParam ? "Fechar" : "Cancelar"}
                    </Text>
                </Pressable>
            ),

            headerRight: () => {
                // Só mostra Editar quando for evento existente e ainda não estiver editando.
                if (eventIdParam && !isEditing) {
                    return (
                        <Pressable
                            onPress={() => {
                                Haptics.selectionAsync().catch(() => { });
                                setIsEditing(true);
                            }}
                            hitSlop={10}
                            style={({ pressed }) => [
                                styles.headerPillButton,
                                styles.headerPillButtonPrimary,
                                pressed && { opacity: 0.72 },
                            ]}
                        >
                            <Ionicons name="create-outline" size={14} color={COLORS.blue} />
                            <Text style={styles.headerPillTextStrong}>Editar</Text>
                        </Pressable>
                    );
                }

                // Novo evento ou evento já em edição: não renderiza nada.
                return null;
            },
        });
    }, [navigation, eventIdParam, isEditing, evento, status]);


    const openMaps = useCallback(() => {
        if (!tutor?.geo?.lat || !tutor?.geo?.lng) {
            return;
        }

        const { lat, lng } = tutor.geo;

        const googleUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
        const wazeUrl = `https://waze.com/ul?ll=${lat},${lng}&navigate=yes&zoom=17`;

        const openGoogle = () => {
            Linking.openURL(googleUrl).catch(() => {
                Alert.alert("Erro", "Não foi possível abrir o Google Maps.");
            });
        };

        const openWaze = () => {
            Linking.openURL(wazeUrl).catch(() => {
                Alert.alert("Erro", "Não foi possível abrir o Waze.");
            });
        };

        if (navPreference === "google") return openGoogle();
        if (navPreference === "waze") return openWaze();

        const options = ["Google Maps", "Waze", "Cancelar"];

        if (Platform.OS === "ios") {
            ActionSheetIOS.showActionSheetWithOptions(
                {
                    options,
                    cancelButtonIndex: 2,
                },
                (buttonIndex) => {
                    if (buttonIndex === 0) return openGoogle();
                    if (buttonIndex === 1) return openWaze();
                }
            );
        } else {
            Alert.alert("Escolher navegação", "Selecione o app:", [
                { text: "Google Maps", onPress: openGoogle },
                { text: "Waze", onPress: openWaze },
                { text: "Cancelar", style: "cancel" },
            ]);
        }
    }, [tutor?.geo?.lat, tutor?.geo?.lng, navPreference]);

    const onSubmit = useCallback(async () => {
        if (!canSave || saving) return;

        try {
            setSaving(true);

            await Haptics.impactAsync(
                Haptics.ImpactFeedbackStyle.Medium
            );

            const valorOriginal =
                parseBRLToNumber(precoText);

            /*
             * Edição de evento existente
             */
            if (eventIdParam) {
                await dispatch(
                    updateEventoComFinanceiro({
                        id: eventIdParam,

                        patch: {
                            title: title.trim(),
                            date,
                            duracao,

                            tutorId:
                                tutor?.id || null,

                            tutorNome:
                                tutor?.nome ||
                                tutor?.name ||
                                "",

                            petIds:
                                selectedPetIds,

                            local:
                                (local || "").trim(),

                            observacoes:
                                (observacoes || "").trim(),

                            cliente:
                                tutor?.nome ||
                                tutor?.name ||
                                "",

                            status,

                            descricao:
                                (descricao || "").trim(),
                        },

                        financeiroPatch: {
                            valorOriginal,

                            descricao:
                                (descricao || "").trim() ||
                                title.trim(),

                            vencimento:
                                date,
                        },
                    })
                ).unwrap();

                setIsEditing(false);
                router.back();
                return;
            }

            /*
             * Payload base dos novos eventos
             *
             * Mantemos financeiro no evento para compatibilidade.
             * O workflow cria o lançamento como fonte de verdade
             * e depois atualiza o resumo do evento.
             */
            const base = {
                title: title.trim(),
                date,
                duracao,

                tutorId:
                    tutor?.id || null,

                tutorNome:
                    tutor?.nome ||
                    tutor?.name ||
                    "",

                petIds:
                    selectedPetIds,

                local:
                    (local || "").trim(),

                observacoes:
                    (observacoes || "").trim(),

                cliente:
                    tutor?.nome ||
                    tutor?.name ||
                    "",

                status,

                descricao:
                    (descricao || "").trim(),

                financeiro: {
                    preco: valorOriginal,
                    pago: false,
                    status:
                        valorOriginal > 0
                            ? "pendente"
                            : "rascunho",
                    valorRecebido: 0,
                    saldo: valorOriginal,
                    lancamentoId: null,
                    comprovanteUrl: null,
                },
            };

            /*
             * Evento simples
             */
            if (!recorrente) {
                await dispatch(
                    createEventoComFinanceiro(base)
                ).unwrap();

                router.back();
                return;
            }

            /*
             * Eventos recorrentes
             */
            const seriesId =
                `SR-${Date.now()}-${Math.random()
                    .toString(36)
                    .slice(2, 8)}`;

            const totalRecorrencias =
                Math.max(
                    1,
                    parseInt(
                        recorrencias || "1",
                        10
                    )
                );

            const payloads =
                Array.from(
                    {
                        length:
                            totalRecorrencias,
                    },
                    (_, index) => ({
                        ...base,

                        seriesId,

                        /*
                         * Não precisamos definir id aqui.
                         * O services/agenda cria o ID real no Firestore.
                         */
                        date: addDays(
                            base.date,
                            index * 7
                        ),
                    })
                );

            const result = await dispatch(
                createEventosRecorrentesComFinanceiro(
                    payloads
                )
            ).unwrap();

            /*
             * Os eventos foram criados, mas algum lançamento
             * pode ter falhado. Não bloqueamos a saída porque
             * a migração progressiva consegue reparar depois.
             */
            if (result?.totalErros > 0) {
                console.warn(
                    "Alguns lançamentos financeiros não foram criados:",
                    result.errors
                );
            }

            router.back();
        } catch (error) {
            console.warn(
                "Erro ao salvar evento:",
                error
            );

            Alert.alert(
                "Erro",
                error?.message ||
                "Não foi possível salvar o evento."
            );
        } finally {
            setSaving(false);
        }
    }, [
        canSave,
        saving,
        eventIdParam,
        title,
        date,
        duracao,
        tutor,
        selectedPetIds,
        local,
        observacoes,
        precoText,
        status,
        recorrente,
        recorrencias,
        descricao,
        dispatch,
    ]);

    useEffect(() => {
        onSubmitRef.current = onSubmit;
    }, [onSubmit]);

    return (
        <SafeAreaView style={[styles.safe, { backgroundColor: bg }]} edges={[]}>
            <KeyboardAvoidingView
                style={styles.flex}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
            >
                <ScrollView
                    style={styles.flex}
                    contentContainerStyle={[
                        styles.content,
                        {
                            paddingBottom:
                                (isEditing ? 108 : 28) + Math.max(insets.bottom, 0),
                        },
                    ]}
                    keyboardShouldPersistTaps="handled"
                    onScrollBeginDrag={Keyboard.dismiss}
                    showsVerticalScrollIndicator={false}
                >
                    <SectionCard
                        title="Status"
                        icon="information-circle-outline"
                        right={!isEditing ? <StatusBadge status={status} /> : null}
                    >
                        {isEditing ? (
                            <StatusField disabled={!isEditing} status={status} setStatus={setStatus} />
                        ) : null}
                    </SectionCard>

                    <SectionCard title="Informações do evento" icon="document-text-outline">
                        <FieldLabel helper="Só o título é obrigatório. Os demais campos podem ficar em branco.">
                            Título
                        </FieldLabel>

                        <AppTextInput
                            value={title}
                            onChangeText={setTitle}
                            placeholder="Ex.: Consulta - Thor"
                            disabled={disabled}
                        />

                        <View style={styles.fieldGap} />

                        <FieldLabel>Descrição</FieldLabel>

                        <AppTextInput
                            value={descricao}
                            onChangeText={setDescricao}
                            placeholder="Ex.: primeira sessão, retorno, pós-cirúrgico..."
                            disabled={disabled}
                            multiline
                        />
                    </SectionCard>

                    <SectionCard title="Tutor e pets" icon="person-circle-outline">
                        <FieldLabel helper="Selecionar tutor ajuda a puxar pets, endereço e rota.">
                            Tutor
                        </FieldLabel>

                        {!tutor?.id ? (
                            <>
                                <AppTextInput
                                    value={tutorQuery}
                                    onChangeText={(t) => {
                                        if (disabled) return;
                                        setTutorQuery(t);
                                        setTutor({ id: null, nome: "" });
                                    }}
                                    placeholder="Buscar por nome, telefone ou e-mail"
                                    disabled={disabled}
                                    icon="search-outline"
                                />

                                {!disabled && !!tutorQuery && (
                                    <TutorSuggestionList
                                        items={tutoresBuscados}
                                        onSelect={(item) => {
                                            setTutor(item);
                                            setTutorQuery("");
                                        }}
                                    />
                                )}
                            </>
                        ) : (
                            <SelectedTutorCard
                                tutor={tutor}
                                disabled={disabled}
                                onOpenMaps={openMaps}
                                onClear={() => {
                                    setTutor({ id: null, nome: "" });
                                    setTutorQuery("");
                                }}
                            />
                        )}

                        {!!tutor?.id && (
                            <View style={styles.petsBlock}>
                                <FieldLabel>
                                    Pets do tutor
                                </FieldLabel>

                                {loadingPets && !petsDoTutor?.length ? (
                                    <View style={styles.loadingPetsRow}>
                                        <ActivityIndicator size="small" color={COLORS.blue} />
                                        <Text style={styles.loadingPetsText}>Carregando pets…</Text>
                                    </View>
                                ) : null}

                                <View style={styles.petChipsWrap}>
                                    {(petsDoTutor || []).map((p) => {
                                        const pid = String(p.id);
                                        const active = selectedPetIds.includes(pid);

                                        return (
                                            <PetChip
                                                key={pid}
                                                pet={p}
                                                active={active}
                                                disabled={disabled}
                                                onPress={() =>
                                                    setSelectedPetIds((prev) =>
                                                        prev.includes(pid)
                                                            ? prev.filter((id) => id !== pid)
                                                            : [...prev, pid]
                                                    )
                                                }
                                            />
                                        );
                                    })}
                                </View>

                                {!loadingPets && (!petsDoTutor || petsDoTutor.length === 0) && (
                                    <Text style={styles.emptyHint}>
                                        Este tutor ainda não possui pets cadastrados.
                                    </Text>
                                )}
                            </View>
                        )}
                    </SectionCard>

                    <SectionCard title="Data e duração" icon="calendar-outline">
                        <FieldLabel>Data e horário</FieldLabel>

                        {disabled ? (
                            <DateReadCard date={date} />
                        ) : (
                            <View style={styles.datePickerBox}>
                                <DateTimePicker
                                    value={date}
                                    mode="datetime"
                                    display={Platform.OS === "ios" ? "inline" : "default"}
                                    onChange={(_, d) => d && setDate(d)}
                                    minuteInterval={5}
                                    locale="pt-BR"
                                    themeVariant={Platform.OS === "ios" ? "light" : undefined}
                                    textColor={Platform.OS === "ios" ? COLORS.text : undefined}
                                    style={styles.datePicker}
                                />
                            </View>
                        )}

                        <View style={styles.fieldGap} />

                        <FieldLabel>Duração</FieldLabel>

                        {disabled ? (
                            <View style={styles.durationReadChip}>
                                <Ionicons name="time-outline" size={15} color="#0F766E" />
                                <Text style={styles.durationReadText}>{duracao}</Text>
                            </View>
                        ) : (
                            <View style={styles.timePickerWrap}>
                                <DateTimePicker
                                    value={hhmmToDate(duracao)}
                                    mode="time"
                                    display="default"
                                    is24Hour
                                    minuteInterval={5}
                                    onChange={(_, selected) => {
                                        if (selected) setDuracao(dateToHHMM(selected));
                                    }}
                                    themeVariant={Platform.OS === "ios" ? "light" : undefined}
                                    textColor={Platform.OS === "ios" ? COLORS.text : undefined}
                                    style={styles.timePicker}
                                />
                            </View>
                        )}
                    </SectionCard>

                    <SectionCard title="Financeiro" icon="cash-outline">
                        <FieldLabel>Preço</FieldLabel>

                        <PriceField
                            disabled={disabled}
                            precoText={precoText}
                            setPrecoText={setPrecoText}
                            eventoExistente={eventoExistente}
                        />
                    </SectionCard>

                    {isNew && (
                        <SectionCard
                            title="Recorrência"
                            icon="repeat-outline"
                            right={
                                <Switch
                                    value={recorrente}
                                    onValueChange={(v) => {
                                        Haptics.selectionAsync().catch(() => { });
                                        setRecorrente(v);
                                    }}
                                    trackColor={{
                                        false: "rgba(118,118,128,0.20)",
                                        true: "rgba(10,132,255,0.35)",
                                    }}
                                    thumbColor={recorrente ? COLORS.blue : "#FFFFFF"}
                                />
                            }
                        >
                            <Text style={styles.recurrenceText}>
                                Repete semanalmente no mesmo horário.
                            </Text>

                            {recorrente && (
                                <View style={styles.recurrenceInputBlock}>
                                    <FieldLabel>Ocorrências</FieldLabel>

                                    <AppTextInput
                                        value={recorrencias}
                                        onChangeText={setRecorrencias}
                                        placeholder="Ex.: 4"
                                        keyboardType="number-pad"
                                    />

                                    <Text style={styles.helper}>
                                        Ex.: 4 cria um evento por semana durante 4 semanas.
                                    </Text>
                                </View>
                            )}
                        </SectionCard>
                    )}

                    <SectionCard title="Observações e local" icon="location-outline">
                        <FieldLabel>Local</FieldLabel>

                        <AppTextInput
                            value={local}
                            onChangeText={setLocal}
                            placeholder="Endereço ou local do atendimento"
                            disabled={disabled}
                            icon="location-outline"
                        />

                        <View style={styles.fieldGap} />

                        <FieldLabel>Observações</FieldLabel>

                        <AppTextInput
                            value={observacoes}
                            onChangeText={setObservacoes}
                            placeholder="Alguma observação sobre a consulta"
                            disabled={disabled}
                            multiline
                        />
                    </SectionCard>

                    {!!tutor?.id && (
                        <View style={styles.enderecoWrap}>
                            <EnderecoCard tutor={tutor} />
                        </View>
                    )}
                </ScrollView>

                {isEditing && (
                    <View
                        style={[
                            styles.footer,
                            {
                                paddingBottom: Math.max(insets.bottom, 10),
                            },
                        ]}
                    >
                        <Pressable
                            disabled={!canSave || saving}
                            onPress={onSubmit}
                            style={({ pressed }) => [
                                styles.saveButton,
                                { backgroundColor: canSave ? tint : "#9CA3AF" },
                                pressed && canSave && !saving ? { opacity: 0.9 } : null,
                            ]}
                        >
                            {saving ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                                <>
                                    <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
                                    <Text style={styles.saveButtonText}>
                                        {eventIdParam ? "Salvar alterações" : "Salvar evento"}
                                    </Text>
                                </>
                            )}
                        </Pressable>
                    </View>
                )}
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    flex: {
        flex: 1,
    },

    safe: {
        flex: 1,
    },

    content: {
        paddingHorizontal: 16,
        paddingTop: 14,
        gap: 14,
    },

    headerTitleWrap: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },

    headerTitle: {
        fontWeight: "850",
        fontSize: 16,
    },

    headerButton: {
        paddingHorizontal: 6,
        paddingVertical: 6,
    },

    headerButtonText: {
        color: COLORS.blue,
        fontWeight: "750",
        fontSize: 15,
    },

    headerButtonStrong: {
        color: COLORS.blue,
        fontWeight: "850",
        fontSize: 15,
    },

    sectionCard: {
        backgroundColor: COLORS.card,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: COLORS.border,
        paddingHorizontal: 14,
        paddingVertical: 14,
        shadowColor: "#000",
        shadowOpacity: 0.07,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        elevation: 3,
    },

    sectionHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        marginBottom: 12,
    },

    sectionTitleWrap: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        flex: 1,
    },

    sectionIconCircle: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(10,132,255,0.10)",
    },

    sectionTitle: {
        fontSize: 15,
        fontWeight: "850",
        color: COLORS.text,
    },

    sectionBody: {
        gap: 0,
    },

    fieldLabelWrap: {
        marginBottom: 7,
    },

    label: {
        fontSize: 12,
        color: COLORS.subtle,
        fontWeight: "750",
    },

    helper: {
        marginTop: 4,
        fontSize: 11,
        lineHeight: 16,
        color: COLORS.subtle,
    },

    inputShell: {
        minHeight: 46,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 14,
        paddingHorizontal: 12,
        backgroundColor: "#FAFAFA",
        flexDirection: "row",
        alignItems: "center",
    },

    inputShellDisabled: {
        backgroundColor: "rgba(118,118,128,0.07)",
    },

    inputShellMultiline: {
        minHeight: 84,
        alignItems: "flex-start",
        paddingTop: 10,
        paddingBottom: 10,
    },

    inputIconLeft: {
        marginRight: 8,
        marginTop: 1,
    },

    input: {
        flex: 1,
        color: COLORS.text,
        fontSize: 14,
        fontWeight: "600",
        paddingVertical: 0,
    },

    inputMultiline: {
        minHeight: 62,
        lineHeight: 19,
    },

    inputDisabled: {
        color: COLORS.subtle,
    },

    fieldGap: {
        height: 12,
    },

    statusBadge: {
        alignSelf: "flex-start",
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        borderWidth: 1,
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
    },

    statusBadgeText: {
        fontWeight: "850",
        fontSize: 12,
    },

    statusChips: {
        flexDirection: "row",
        gap: 8,
        flexWrap: "wrap",
    },

    statusChip: {
        minHeight: 36,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: "#FFFFFF",
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
    },

    statusChipText: {
        fontWeight: "750",
        color: "#374151",
        fontSize: 12,
    },

    moneyPrefix: {
        fontSize: 15,
        fontWeight: "850",
        color: COLORS.green,
        marginRight: 8,
    },

    moneyInput: {
        flex: 1,
        color: COLORS.text,
        fontSize: 16,
        fontWeight: "750",
        paddingVertical: 0,
    },

    readValueRow: {
        alignSelf: "flex-start",
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 999,
        backgroundColor: "rgba(22,163,74,0.10)",
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },

    readValueText: {
        color: COLORS.green,
        fontWeight: "850",
        fontSize: 13,
    },

    suggestionBox: {
        marginTop: 8,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 16,
        backgroundColor: "#FFFFFF",
        overflow: "hidden",
    },

    suggestionRow: {
        paddingHorizontal: 12,
        paddingVertical: 10,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        borderBottomWidth: 1,
        borderBottomColor: "#F1F5F9",
    },

    suggestionAvatar: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(10,132,255,0.10)",
    },

    suggestionAvatarText: {
        color: COLORS.blue,
        fontWeight: "850",
    },

    suggestionName: {
        fontSize: 14,
        fontWeight: "800",
        color: COLORS.text,
    },

    suggestionSub: {
        marginTop: 2,
        fontSize: 12,
        color: COLORS.subtle,
    },

    suggestionEmpty: {
        padding: 14,
    },

    suggestionEmptyTitle: {
        fontSize: 13,
        fontWeight: "800",
        color: COLORS.text,
    },

    suggestionEmptySub: {
        marginTop: 4,
        fontSize: 12,
        color: COLORS.subtle,
        lineHeight: 17,
    },

    selectedTutorCard: {
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 16,
        padding: 12,
        backgroundColor: "rgba(118,118,128,0.07)",
    },

    selectedTutorTop: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },

    selectedTutorAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(10,132,255,0.12)",
    },

    selectedTutorAvatarText: {
        color: COLORS.blue,
        fontWeight: "850",
    },

    selectedTutorName: {
        fontSize: 15,
        fontWeight: "850",
        color: COLORS.text,
    },

    selectedTutorAddress: {
        marginTop: 3,
        color: COLORS.subtle,
        fontSize: 12,
        lineHeight: 17,
    },

    clearTutorButton: {
        paddingLeft: 2,
    },

    petsBlock: {
        marginTop: 14,
    },

    petChipsWrap: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },

    petChip: {
        minHeight: 34,
        paddingHorizontal: 11,
        paddingVertical: 8,
        borderRadius: 999,
        backgroundColor: "#F2F2F7",
        borderWidth: 1,
        borderColor: "transparent",
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
    },

    petChipActive: {
        backgroundColor: "rgba(10,132,255,0.12)",
        borderColor: "rgba(10,132,255,0.32)",
    },

    petChipText: {
        fontSize: 12,
        fontWeight: "750",
        color: "#3C3C43",
    },

    petChipTextActive: {
        color: COLORS.blue,
        fontWeight: "850",
    },

    loadingPetsRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 8,
    },

    loadingPetsText: {
        color: COLORS.subtle,
        fontSize: 12,
        fontWeight: "650",
    },

    emptyHint: {
        marginTop: 8,
        color: COLORS.subtle,
        fontSize: 12,
        lineHeight: 17,
    },

    dateReadCard: {
        borderRadius: 14,
        borderWidth: 1,
        borderColor: COLORS.border,
        paddingHorizontal: 12,
        paddingVertical: 10,
        backgroundColor: "rgba(118,118,128,0.07)",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
    },

    dateReadItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },

    dateReadText: {
        fontSize: 14,
        fontWeight: "800",
        color: COLORS.text,
    },

    datePickerBox: {
        borderRadius: 16,
        backgroundColor: "rgba(118,118,128,0.06)",
        padding: 4,
        alignSelf: "stretch",
        overflow: "hidden",
    },

    datePicker: {
        backgroundColor: "transparent",
    },

    durationReadChip: {
        alignSelf: "flex-start",
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 999,
        backgroundColor: "rgba(15,118,110,0.09)",
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
    },

    durationReadText: {
        fontSize: 13,
        fontWeight: "850",
        color: "#0F766E",
    },

    timePickerWrap: {
        alignSelf: "flex-start",
        borderRadius: 14,
        backgroundColor: "rgba(118,118,128,0.06)",
        overflow: "hidden",
    },

    timePicker: {
        height: 78,
        transform: [{ scale: 0.86 }],
    },

    recurrenceText: {
        fontSize: 13,
        lineHeight: 18,
        color: COLORS.subtle,
        fontWeight: "600",
    },

    recurrenceInputBlock: {
        marginTop: 12,
    },

    enderecoWrap: {
        marginTop: 2,
        marginBottom: 4,
    },

    footer: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        paddingHorizontal: 16,
        paddingTop: 10,
        backgroundColor: "rgba(245,245,247,0.94)",
        borderTopWidth: 1,
        borderTopColor: "rgba(15,23,42,0.08)",
    },

    saveButton: {
        height: 50,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: 8,
        shadowColor: "#000",
        shadowOpacity: 0.12,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        elevation: 4,
    },

    saveButtonText: {
        color: "#FFFFFF",
        fontWeight: "850",
        fontSize: 16,

    },

    headerTitleWrap: {
        maxWidth: 150,
        height: 32,
        paddingHorizontal: 10,
        borderRadius: 999,
        backgroundColor: "rgba(255,255,255,0.72)",
        borderWidth: 1,
        borderColor: "rgba(15,23,42,0.06)",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
    },

    headerTitle: {
        fontWeight: "850",
        fontSize: 15,
        letterSpacing: -0.2,
    },

    headerPillButton: {
        minWidth: 74,
        height: 34,
        paddingHorizontal: 12,
        borderRadius: 999,
        backgroundColor: "rgba(255,255,255,0.72)",
        borderWidth: 1,
        borderColor: "rgba(15,23,42,0.06)",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 5,
    },

    headerPillButtonPrimary: {
        backgroundColor: "rgba(10,132,255,0.10)",
        borderColor: "rgba(10,132,255,0.18)",
    },

    headerPillText: {
        color: COLORS.blue,
        fontWeight: "800",
        fontSize: 14,
    },

    headerPillTextStrong: {
        color: COLORS.blue,
        fontWeight: "850",
        fontSize: 14,
    },

    headerSidePlaceholder: {
        width: 74,
        height: 34,
    },
});