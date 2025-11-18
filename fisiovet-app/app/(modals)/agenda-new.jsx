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
    KeyboardAvoidingView,
    Switch,
    ActionSheetIOS,
    Keyboard
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
    addEventosBatch
} from "@/src/store/slices/agendaSlice";

import { selectDefaultDuracao, selectStartOfDay, selectNavPreference } from "@/src/store/slices/systemSlice";




const STATUS_STYLES = {
    confirmado: { color: '#16A34A', bg: 'rgba(22,163,74,0.15)', label: 'Confirmado' },
    pendente: { color: '#F59E0B', bg: 'rgba(245,158,11,0.15)', label: 'Pendente' },
    cancelado: { color: '#EF4444', bg: 'rgba(239,68,68,0.15)', label: 'Cancelado' },
    default: { color: '#6B7280', bg: 'rgba(107,114,128,0.15)', label: '—' },
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

function parseBRLToNumber(s) {
    if (s == null) return 0;
    const clean = String(s).replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
    const n = Number(clean);
    return Number.isFinite(n) ? n : 0;
}

function formatNumberToBRL(n) {
    const num = Number(n);
    if (!Number.isFinite(num)) return '—';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);
}


const addDays = (d, days) => {
    const x = new Date(d);
    x.setDate(x.getDate() + days);
    return x;
};

/* ---------------- Screen ---------------- */

/** Só visualização (formata em R$) */
function PriceDisplay({ value, containerStyle, textStyle }) {
    return (
        <View style={[containerStyle, { marginLeft: 20 }]}>
            <Text style={[{ color: '#111827', fontWeight: '700' }, textStyle]}>
                {formatNumberToBRL(value)}
            </Text>
        </View>
    );
}

/** Edição (TextInput) */
function PriceInput({ valueText, onChangeText, containerStyle, inputStyle, editable = true }) {
    return (
        <View style={[styles.inputOutline, containerStyle]}>
            <TextInput
                placeholderTextColor="#9CA3AF"
                placeholder="Ex.: 120,00"
                value={valueText}
                onChangeText={onChangeText}
                keyboardType="decimal-pad"
                style={[{ color: editable ? 'black' : '#9CA3AF' }, inputStyle]}
                editable={editable}
            />
        </View>
    );
}

/** Wrapper que decide entre display x input */
function PriceField({ disabled, precoText, setPrecoText, eventoExistente }) {
    // mostra o número formatado se desabilitado
    const precoNumber = React.useMemo(() => {
        // 1) primeiro tenta o que o usuário digitou
        const nFromText = parseBRLToNumber(precoText);
        if (precoText?.trim()) return nFromText;
        // 2) fallback pro valor salvo no evento (edição)
        const saved = eventoExistente?.financeiro?.preco;
        return Number.isFinite(saved) ? saved : 0;
    }, [precoText, eventoExistente?.financeiro?.preco]);

    return disabled ? (
        <PriceDisplay value={precoNumber} />
    ) : (
        <PriceInput valueText={precoText} onChangeText={setPrecoText} />
    );
}

// valores permitidos pelo slice
const EVENT_STATUSES = ['pendente', 'confirmado', 'cancelado'];

/** badge para modo leitura */
function StatusBadge({ status }) {
    const s = STATUS_STYLES[status] || STATUS_STYLES.default;
    return (
        <View style={{
            alignSelf: 'flex-start',
            paddingHorizontal: 10, paddingVertical: 6,
            borderRadius: 999,
            backgroundColor: s.bg
        }}>
            <Text style={{ color: s.color, fontWeight: '800', fontSize: 12 }}>{s.label}</Text>
        </View>
    );
}

/** chips para edição */
function StatusChips({ value, onChange }) {
    return (
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            {EVENT_STATUSES.map((key) => {
                const s = STATUS_STYLES[key];
                const active = value === key;
                return (
                    <Pressable
                        key={key}
                        onPress={() => onChange(key)}
                        android_ripple={{ color: '#E5E7EB' }}
                        style={{
                            paddingHorizontal: 12, paddingVertical: 9,
                            borderRadius: 999,
                            borderWidth: active ? 1.5 : 1,
                            borderColor: active ? s.color : '#E5E7EB',
                            backgroundColor: active ? s.bg : '#F9FAFB',
                        }}
                    >
                        <Text style={{ fontWeight: '800', color: active ? s.color : '#374151', fontSize: 12 }}>
                            {s.label}
                        </Text>
                    </Pressable>
                );
            })}
        </View>
    );
}

/** wrapper que decide entre badge (leitura) e chips (edição) */
function StatusField({ disabled, status, setStatus }) {
    return disabled ? (
        <StatusBadge status={status} />
    ) : (
        <StatusChips value={status} onChange={setStatus} />
    );
}


export default function AgendaNewScreen() {
    const navigation = useNavigation();
    const dispatch = useDispatch();
    const params = useLocalSearchParams();
    const eventIdParam = params?.id ? String(params.id) : null; // se vier, é visualização/edição do evento
    const tutorIdParam = params?.tutorId ? String(params.tutorId) : null;
    const tutorNomeParam = params?.tutorNome || "";
    const preselectPetIdParam = params?.preselectPetId ? String(params.preselectPetId) : null;
    const petNomeParam = params?.petNome || '';

    const [precoText, setPrecoText] = useState('');
    const [status, setStatus] = useState(eventoExistente?.status || 'pendente');

    const [recorrente, setRecorrente] = useState(false);
    const [recorrencias, setRecorrencias] = useState('0'); // string pra TextInput numérico

    const tint = useThemeColor({}, "tint");

    const [showTime, setShowTime] = useState(false);
    const isNew = !eventIdParam;


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

    // const [title, setTitle] = useState("");
    const [title, setTitle] = useState(() => {
        if (eventIdParam) return "";
        // sugestão de título quando veio do PET
        return petNomeParam ? `Consulta - ${petNomeParam}` : "";
    });

    // 🔹 NOVO
    const [descricao, setDescricao] = useState("");

    const [tutorQuery, setTutorQuery] = useState("");

    const [tutor, setTutor] = useState(() => {
        if (eventoExistente?.tutorId) return tutorFromEvent || { id: eventoExistente.tutorId, nome: eventoExistente.tutorNome };
        if (tutorIdParam) {
            const pre = tutores.find((t) => String(t.id) === tutorIdParam);
            return pre || { id: tutorIdParam, nome: tutorNomeParam };
        }
        return { id: null, nome: "" };
    });

    // const [selectedPetIds, setSelectedPetIds] = useState([]);
    const [selectedPetIds, setSelectedPetIds] = useState(() =>
        preselectPetIdParam ? [preselectPetIdParam] : []
    );

    const defaultStartDay = useSelector(selectStartOfDay); // ex.: "08:00"
    const [date, setDate] = useState(() => {
        if (eventoExistente?.start) return new Date(eventoExistente.start);

        // base: amanhã
        const d = new Date();
        d.setDate(d.getDate() + 1);

        // aplica horário configurado
        const [h, m] = (defaultStartDay || "09:00").split(":").map(Number);
        d.setHours(h, m || 0, 0, 0);

        return d;
    });







    // para controlar a aplicação do pré-selecionado depois que os pets carregarem
    const preselectedPetIdRef = React.useRef(preselectPetIdParam);


    // const defaultDur = () => {
    //     if (eventoExistente?.start && eventoExistente?.end) {
    //         const mins = minutesBetween(eventoExistente.start, eventoExistente.end);
    //         return toHHMM(mins);
    //     }
    //     return "1:00";
    // };

    const defaultDur = useSelector(selectDefaultDuracao);
    const [duracao, setDuracao] = useState(defaultDur);
    

    const [local, setLocal] = useState(() => {
        if (eventoExistente?.local) return eventoExistente.local;
        if (tutor?.endereco?.formatted) return tutor.endereco.formatted;
        return tutorAddressFallback(tutor);
    });
    const [observacoes, setObservacoes] = useState(eventoExistente?.observacoes || "");

    // pets por tutor
    const petsDoTutor = useSelector(selectPetsByTutorId(tutor?.id || ""));
    const loadingPets = useSelector(selectLoadingPetsByTutor(tutor?.id || ""));
    const navPreference = useSelector(selectNavPreference);


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
        const preco = eventoExistente?.financeiro?.preco;
        setPrecoText(preco != null ? String(preco).replace('.', ',') : '');
        setDescricao(eventoExistente.descricao || "");
        // date e duracao já vieram do constructor dos states
        // local idem
    }, [eventIdParam]);


    useEffect(() => {
        if (!eventoExistente) return;
        setStatus(eventoExistente.status || 'pendente');
    }, [eventIdParam]);


    useEffect(() => {
        if (!isNew) {
            setRecorrente(false);
            setRecorrencias('');
        }
    }, [isNew]);

    // Quando tutor muda: recarrega pets e preenche Local
    useEffect(() => {
        if (tutor?.id) {
            const addrFormatted = tutor?.endereco?.formatted;
            const fallback = tutorAddressFallback(tutor);
            if (addrFormatted || fallback) setLocal((prev) => prev || addrFormatted || fallback);

            dispatch(fetchPetsByTutor({ tutorId: tutor.id }));
            // if (isEditing && !eventoExistente) setSelectedPetIds([]); // só limpa na criação
            // se estamos criando e NÃO temos pet pré-selecionado, limpa;
            // se veio preselectPetId, deixamos para o próximo efeito validar/ajustar
            if (isEditing && !eventoExistente && !preselectedPetIdRef.current) {
                setSelectedPetIds([]);
            }
        } else {
            if (isEditing) {
                setSelectedPetIds([]);
                setLocal("");
            }
        }
    }, [tutor?.id]);

    useEffect(() => {
        // só na criação (novo) e em modo edição
        if (!isEditing || eventoExistente) return;

        const pre = preselectedPetIdRef.current;
        if (!pre || !tutor?.id) return;

        const exists = (petsDoTutor || []).some((p) => String(p.id) === pre);
        if (exists) {
            setSelectedPetIds([pre]);
        } else {
            // se o PET passado não pertence a esse tutor, garante que não fica seleção inválida
            setSelectedPetIds([]);
        }

        // aplica apenas uma vez
        preselectedPetIdRef.current = null;
    }, [petsDoTutor, tutor?.id, isEditing, eventoExistente]);

    // Lista de tutores conforme busca
    const tutoresBuscados = useSelector((state) =>
        tutoresByQuerySelectorRef.current(state, tutorQuery)
    );

    // Validação para habilitar Salvar
    const canSave = useMemo(() => {
        if (!isEditing) return false;
        if (!title.trim()) return false;
        if (recorrente) {
            const n = parseInt(recorrencias || '0', 10);
            if (!Number.isFinite(n) || n <= 0) return false;
        }
        return true;
    }, [isEditing, title, recorrente, recorrencias]);

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

            // ----- EDIÇÃO -----
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
                        status,
                        descricao: (descricao || "").trim(),
                        financeiro: {
                            ...(eventoExistente?.financeiro || {}),
                            preco: parseBRLToNumber(precoText),
                        },
                    },
                })).unwrap();

                setIsEditing(false);
                Alert.alert("Pronto", "Evento atualizado.");
                router.back();
                return;
            }

            // ----- CRIAÇÃO (com ou sem recorrência) -----
            const base = {
                title: title.trim(),
                date,
                duracao,
                tutorId: tutor.id,
                tutorNome: tutor.nome || tutor.name,
                petIds: selectedPetIds,
                local: (local || "").trim(),
                observacoes: (observacoes || "").trim(),
                cliente: tutor?.nome || tutor?.name || "",
                status, // do formulário
                descricao: (descricao || "").trim(),
                financeiro: {
                    preco: parseBRLToNumber(precoText),
                    pago: false,
                    comprovanteUrl: null,
                },
            };

            // sem recorrência -> cria 1 evento
            if (!recorrente) {
                await dispatch(addEvento(base)).unwrap();
                Alert.alert("Sucesso", "Evento agendado com sucesso!");
                router.back();
                return;
            }

            // recorrência semanal: N ocorrências
            const seriesId = `SR-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
            const n = Math.max(1, parseInt(recorrencias || '1', 10));
            const baseTime = Date.now();
            const payloads = Array.from({ length: n }, (_, i) => ({
                ...base,
                // já vem único e o sanitize vai respeitar esse id:
                seriesId,
                id: `${baseTime}-${i}-${Math.random().toString(36).slice(2, 6)}`,
                date: addDays(base.date, i * 7),
            }));

            console.log('recorrente:', recorrente, 'n:', n, 'payloads:', payloads.length);
            await dispatch(addEventosBatch(payloads)).unwrap();
            Alert.alert("Sucesso", `${n} eventos agendados (semanal).`);
            router.back();
        } catch (e) {
            console.warn("Erro ao salvar evento:", e);
            Alert.alert("Erro", e?.message || "Não foi possível salvar o evento.");
        }
    }, [
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
        eventoExistente,
        descricao,
        dispatch
    ]);

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

    // const openMaps = () => {
    //     if (!tutor?.geo?.lat || !tutor?.geo?.lng) return;
    //     const { lat, lng } = tutor.geo;
    //     const url = Platform.select({
    //         ios: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
    //         android: `geo:${lat},${lng}?q=${lat},${lng}(${encodeURIComponent(tutor?.nome || 'Local')})`,
    //         default: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
    //     });
    //     Linking.openURL(url);
    // };

    const openMaps = () => {
        if (!tutor?.geo?.lat || !tutor?.geo?.lng) {
            console.log('[openMaps] Tutor sem geo, não abre navegação');
            return;
        }

        const { lat, lng } = tutor.geo;
        const label = encodeURIComponent(tutor?.nome || 'Local');

        // 🔹 Google Maps (universal, funciona em iOS, Android, web)
        const googleUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

        // 🔹 Waze (universal)
        // Se o app estiver instalado, normalmente abre o app;
        // se não, abre o site do Waze no navegador.
        const wazeUrl = `https://waze.com/ul?ll=${lat},${lng}&navigate=yes&zoom=17`;

        const openGoogle = () => {
            console.log('[openMaps] Abrindo Google Maps =>', googleUrl);
            Linking.openURL(googleUrl).catch((e) => {
                console.log('[openMaps] Erro ao abrir Google Maps:', e);
                Alert.alert('Erro', 'Não foi possível abrir o Google Maps.');
            });
        };

        const openWaze = () => {
            console.log('[openMaps] Abrindo Waze =>', wazeUrl);
            Linking.openURL(wazeUrl).catch((e) => {
                console.log('[openMaps] Erro ao abrir Waze:', e);
                Alert.alert('Erro', 'Não foi possível abrir o Waze.');
            });
        };

        // 🔸 Respeita o que veio do Redux
        if (navPreference === 'google') {
            return openGoogle();
        }
        if (navPreference === 'waze') {
            return openWaze();
        }

        // 🔸 navPreference = 'ask' => perguntar
        const options = ['Google Maps', 'Waze', 'Cancelar'];

        if (Platform.OS === 'ios') {
            ActionSheetIOS.showActionSheetWithOptions(
                {
                    options,
                    cancelButtonIndex: 2,
                },
                (buttonIndex) => {
                    console.log('[openMaps] iOS ActionSheet index =', buttonIndex);
                    if (buttonIndex === 0) return openGoogle();
                    if (buttonIndex === 1) return openWaze();
                }
            );
        } else {
            Alert.alert(
                'Escolher navegação',
                'Selecione o app:',
                [
                    { text: 'Google Maps', onPress: openGoogle },
                    { text: 'Waze', onPress: openWaze },
                    { text: 'Cancelar', style: 'cancel' },
                ]
            );
        }
    };


    return (
        <SafeAreaView style={{ flex: 1 }} edges={[]}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
            >
                <ScrollView
                    style={{ flex: 1, backgroundColor: bg }}
                    contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
                    keyboardShouldPersistTaps="never"
                    onScrollBeginDrag={Keyboard.dismiss}
                >
                    {/* Status */}
                    <View style={{ marginTop: 14, marginBottom: 12, alignSelf: isEditing ? "flex-start" : 'flex-end' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                            <Ionicons name="information-circle-outline" size={16} color="#8E8E93" style={{ marginRight: 4, paddingTop: 3.5 }} />
                            <Text style={styles.label}>Status</Text>
                        </View>
                        <StatusField disabled={!isEditing} status={status} setStatus={setStatus} />
                    </View>
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

                    <View style={{ marginTop: 10 }}>
                        <Text style={styles.label}>Descrição</Text>
                        <View style={[styles.inputOutline, { minHeight: 60, paddingVertical: 6 }]}>
                            <TextInput
                                placeholderTextColor="#9CA3AF"
                                placeholder="Ex.: Primeira sessão, retorno, pós-cirúrgico..."
                                value={descricao}
                                onChangeText={(t) => !disabled && setDescricao(t)}
                                multiline
                                textAlignVertical="top"
                                style={{ minHeight: 48, color: disabled ? inputDisabledColor : 'black' }}
                                editable={!disabled}
                            />
                        </View>
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

                        {disabled ? (
                            // 🔹 Modo leitura: card compacto
                            <View
                                style={{
                                    borderRadius: 10,
                                    borderWidth: 1,
                                    borderColor: "#E5E7EB",
                                    paddingHorizontal: 12,
                                    paddingVertical: 10,
                                    backgroundColor: "rgba(107,114,128,0.04)",
                                }}
                            >
                                <View
                                    style={{
                                        flexDirection: "row",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                    }}
                                >
                                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                                        <Ionicons
                                            name="calendar-outline"
                                            size={16}
                                            color="#6B7280"
                                            style={{ marginRight: 6 }}
                                        />
                                        <Text style={{ fontSize: 14, fontWeight: "600", color: "#111827" }}>
                                            {`${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}/${date.getFullYear()}`}
                                        </Text>
                                    </View>

                                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                                        <Ionicons
                                            name="time-outline"
                                            size={16}
                                            color="#6B7280"
                                            style={{ marginRight: 6 }}
                                        />
                                        <Text style={{ fontSize: 14, fontWeight: "600", color: "#111827" }}>
                                            {`${pad2(date.getHours())}:${pad2(date.getMinutes())}`}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        ) : (
                            // 🔹 Modo edição/criação: picker completo
                            <View
                                style={{
                                    borderRadius: 12,
                                    backgroundColor: "rgba(107,114,128,0.05)",
                                    padding: 4,
                                    alignSelf: "center",
                                }}
                            >
                                <DateTimePicker
                                    value={date}
                                    mode="datetime"
                                    display={Platform.OS === "ios" ? "inline" : "default"}
                                    onChange={(_, d) => d && setDate(d)}
                                    minuteInterval={5}
                                    locale="pt-BR"
                                    themeVariant={Platform.OS === "ios" ? "light" : undefined}
                                    textColor={Platform.OS === "ios" ? "#111827" : undefined}
                                    style={{
                                        backgroundColor: "transparent",
                                    }}
                                />
                            </View>
                        )}
                    </View>

                    {/* Duração */}
                    <View style={{ marginTop: 14 }}>
                        <View style={{ flexDirection: "row", alignItems: "baseline" }}>
                            <Ionicons
                                name="time-outline"
                                size={16}
                                color="#8E8E93"
                                style={{ marginRight: 4, paddingTop: 3.5 }}
                            />
                            <Text style={styles.label}>Duração (HH:MM)</Text>
                        </View>

                        {disabled ? (
                            // 🔹 Modo leitura: chip compacto
                            <View
                                style={{
                                    marginTop: 4,
                                    alignSelf: "flex-start",
                                    paddingHorizontal: 12,
                                    paddingVertical: 6,
                                    borderRadius: 999,
                                    backgroundColor: "rgba(15,118,110,0.08)",
                                }}
                            >
                                <Text
                                    style={{
                                        fontSize: 13,
                                        fontWeight: "700",
                                        color: "#0F766E",
                                    }}
                                >
                                    {duracao}
                                </Text>
                            </View>
                        ) : (
                            // 🔹 Modo edição: time picker
                            <View style={{ flexDirection: "row", marginTop: 4 }}>
                                <DateTimePicker
                                    value={hhmmToDate(duracao)}
                                    mode="time"
                                    display="default" // iOS inline, Android modal
                                    is24Hour
                                    minuteInterval={5}
                                    onChange={(_, selected) => {
                                        console.log('selected dura: ', selected)
                                        if (selected) {
                                            setDuracao(dateToHHMM(selected));
                                        }
                                    }}
                                    themeVariant={Platform.OS === "ios" ? "light" : undefined}
                                    textColor={Platform.OS === "ios" ? "#111827" : undefined}
                                    style={{
                                        backgroundColor: "rgba(107,114,128,0.05)",
                                        borderRadius: 12,
                                        transform: [{ scale: 0.85 }],
                                        height: 80,
                                    }}
                                />
                            </View>
                        )}
                    </View>


                    {/* Preço */}
                    <View style={{ marginTop: 8 }}>
                        <View style={{ flexDirection: "row", alignItems: "baseline" }}>
                            <Ionicons name="cash-outline" size={16} color="#8E8E93" style={{ marginRight: 4, paddingTop: 3.5 }} />
                            <Text style={styles.label}>Preço</Text>
                        </View>

                        <PriceField
                            disabled={disabled}
                            precoText={precoText}
                            setPrecoText={(t) => !disabled && setPrecoText(t)}
                            eventoExistente={eventoExistente}
                        />
                    </View>

                    {/* Recorrência */}
                    {
                        isNew &&

                        <View style={{ marginTop: 16 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                                    <Ionicons name="repeat-outline" size={16} color="#8E8E93" style={{ marginRight: 4, paddingTop: 3.5 }} />
                                    <Text style={styles.label}>Evento recorrente</Text>
                                </View>
                                <Switch value={recorrente} onValueChange={setRecorrente} />
                            </View>

                            {recorrente && (
                                <View style={{ marginTop: 10 }}>
                                    <Text style={styles.label}>Ocorrências (semanas)</Text>
                                    <View style={styles.inputOutline}>
                                        <TextInput
                                            keyboardType="number-pad"
                                            value={recorrencias}
                                            onChangeText={setRecorrencias}
                                            placeholder="Ex.: 4"
                                            placeholderTextColor="#9CA3AF"
                                            style={{ color: 'black' }}
                                        />
                                    </View>

                                    {/* se quiser mostrar o intervalo, por ora informativo */}
                                    <Text style={{ color: '#6B7280', marginTop: 6 }}>Repetir a cada 7 dias no mesmo horário</Text>
                                </View>
                            )}
                        </View>
                    }
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