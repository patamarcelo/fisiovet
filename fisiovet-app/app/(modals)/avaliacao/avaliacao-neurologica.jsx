// app/(modals)/avaliacao/avaliacao-neurologica.jsx
// @ts-nocheck

import React, { useEffect, useState, useCallback } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Keyboard,
    SafeAreaView,
    StyleSheet,
} from "react-native";
import { Stack, useLocalSearchParams, router } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";

import { ensureFirebase } from "@/firebase/firebase";
import {
    updateDraftField,
    clearDraft,
    replaceDraft,
} from "@/src/store/slices/avaliacaoSlice";

/* ---------- Firestore ---------- */
function toDate(value) {
    if (!value) {
        return null;
    }

    if (value instanceof Date) {
        return Number.isNaN(value.getTime())
            ? null
            : value;
    }

    if (
        typeof value?.toDate ===
        "function"
    ) {
        try {
            const date =
                value.toDate();

            return Number.isNaN(
                date.getTime()
            )
                ? null
                : date;
        } catch {
            return null;
        }
    }

    if (value?._seconds) {
        const date =
            new Date(
                value._seconds * 1000
            );

        return Number.isNaN(
            date.getTime()
        )
            ? null
            : date;
    }

    if (
        typeof value === "number"
    ) {
        const date =
            new Date(
                value < 1e12
                    ? value * 1000
                    : value
            );

        return Number.isNaN(
            date.getTime()
        )
            ? null
            : date;
    }

    const date =
        new Date(value);

    return Number.isNaN(
        date.getTime()
    )
        ? null
        : date;
}

function formatDocumentDate(value) {
    const date =
        toDate(value);

    if (!date) {
        return null;
    }

    return date.toLocaleString(
        "pt-BR",
        {
            day: "2-digit",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        }
    );
}

function serializeDate(value) {
    const date = toDate(value);

    return date
        ? date.toISOString()
        : null;
}

async function fetchAvaliacaoNeurologica({
    firestore,
    uid,
    petId,
    avaliacaoId,
}) {
    const ref = firestore
        .collection("users")
        .doc(String(uid))
        .collection("pets")
        .doc(String(petId))
        .collection("avaliacoes")
        .doc(String(avaliacaoId));

    const snap = await ref.get();

    if (!snap.exists) return null;

    return { id: snap.id, ...snap.data() };
}

export async function saveNewNeurologica({
    firestore,
    firestoreModule,
    uid,
    petId,
    payload,
}) {
    const col = firestore
        .collection("users")
        .doc(String(uid))
        .collection("pets")
        .doc(String(petId))
        .collection("avaliacoes");

    const ref = col.doc();
    const now = firestoreModule.FieldValue.serverTimestamp();

    await ref.set({
        ...payload,
        createdAt: now,
        updatedAt: now,
        type: "neurologica",
    });

    return ref.id;
}

export async function updateNeurologica({
    firestore,
    firestoreModule,
    uid,
    petId,
    avaliacaoId,
    payload,
}) {
    const ref = firestore
        .collection("users")
        .doc(String(uid))
        .collection("pets")
        .doc(String(petId))
        .collection("avaliacoes")
        .doc(String(avaliacaoId));

    await ref.update({
        ...payload,
        updatedAt: firestoreModule.FieldValue.serverTimestamp(),
    });
}

async function deleteNeurologica({
    firestore,
    uid,
    petId,
    avaliacaoId,
}) {
    const ref = firestore
        .collection("users")
        .doc(String(uid))
        .collection("pets")
        .doc(String(petId))
        .collection("avaliacoes")
        .doc(String(avaliacaoId));

    await ref.delete();
}

/* ---------- Normalização ---------- */

function normalizeNeurologicaDraft(petId, docData) {
    const base = {
        id: docData?.id,
        petId,
        createdAt:
            docData?.createdAt ||
            null,

        updatedAt:
            docData?.updatedAt ||
            null,

        title: "",
        tipo: "neurologica",
        estadoMental: {
            nivelConsciencia: "alerta",
            comportamento: "normal",
        },
        textos: {
            postura: "",
            marcha: "",
            reacoesPosturais: "",
            descricaoDor: "",
            observacoesGerais: "",
        },
        nervosCranianos: {
            olfatorio: "normal",
            optico: "normal",
            oculomotorTroclear: "normal",
            trigemeo: "normal",
            abducente: "normal",
            facial: "normal",
            vestibulococlear: "normal",
            glossoVago: "normal",
            acessorio: "normal",
            hipoglosso: "normal",
        },
        reflexos: {
            patelar: "normal",
            flexor: "normal",
            extensorCruzado: "normal",
            perineal: "normal",
            cutaneoTronco: "normal",
        },
        sensibilidade: {
            superficial: "normal",
            profunda: "normal",
        },
    };

    const fields = docData?.fields || {};

    return {
        ...base,
        createdAt:
            serializeDate(
                docData?.createdAt
            ),

        updatedAt:
            serializeDate(
                docData?.updatedAt
            ),

        title: docData?.title ?? base.title,
        tipo: docData?.tipo ?? docData?.type ?? base.tipo,
        estadoMental: {
            ...base.estadoMental,
            ...(fields.estadoMental || {}),
        },
        textos: {
            ...base.textos,
            ...(fields.textos || {}),
        },
        nervosCranianos: {
            ...base.nervosCranianos,
            ...(fields.nervosCranianos || {}),
        },
        reflexos: {
            ...base.reflexos,
            ...(fields.reflexos || {}),
        },
        sensibilidade: {
            ...base.sensibilidade,
            ...(fields.sensibilidade || {}),
        },
    };
}

/* ---------- Helpers ---------- */

const isFilled = (v) => {
    if (v == null) return false;
    if (typeof v === "string") return v.trim().length > 0;
    return !!v;
};

const formatEmpty = (value) => {
    if (!isFilled(value)) return "Não informado";
    return String(value).trim();
};

const optionLabel = (options, value) => {
    return options.find((item) => item.value === value)?.label || "Não informado";
};

const nivelConscienciaOptions = [
    { label: "Alerta", value: "alerta" },
    { label: "Delírio", value: "delirium" },
    { label: "Estupor", value: "estupor" },
    { label: "Coma", value: "coma" },
];

const comportamentoOptions = [
    { label: "Normal", value: "normal" },
    { label: "Delírio", value: "delirium" },
    { label: "Demência", value: "demencia" },
    { label: "Head press", value: "headPress" },
];

const nervoOptions = [
    { label: "Normal", value: "normal" },
    { label: "Alterado", value: "alterado" },
    { label: "Ausente", value: "ausente" },
];

const reflexoOptions = [
    { label: "Diminuído", value: "diminuido" },
    { label: "Normal", value: "normal" },
    { label: "Aumentado", value: "aumentado" },
    { label: "Ausente", value: "ausente" },
];

const sensibilidadeOptions = [
    { label: "Normal", value: "normal" },
    { label: "Diminuída / alterada", value: "diminuida" },
    { label: "Ausente", value: "ausente" },
];

const nervosCranianosLabels = {
    olfatorio: "I - Olfatório",
    optico: "II - Óptico",
    oculomotorTroclear: "III/IV/VI - Oculomotor / Troclear / Abducente",
    trigemeo: "V - Trigêmeo",
    facial: "VII - Facial",
    vestibulococlear: "VIII - Vestibulococlear",
    glossoVago: "IX/X - Glossofaríngeo / Vago",
    acessorio: "XI - Acessório espinal",
    hipoglosso: "XII - Hipoglosso",
};

const reflexosLabels = {
    patelar: "Patelar",
    flexor: "Flexor (retirada)",
    extensorCruzado: "Extensor cruzado",
    perineal: "Perineal",
    cutaneoTronco: "Cutâneo do tronco",
};

const sensibilidadeLabels = {
    superficial: "Sensibilidade superficial",
    profunda: "Sensibilidade profunda",
};

/* ---------- UI Documento ---------- */

function DocumentHeader({
    title,
    createdAt,
    updatedAt,
}) {
    const createdText =
        formatDocumentDate(
            createdAt
        );

    const updatedText =
        formatDocumentDate(
            updatedAt
        );

    const wasUpdated =
        createdText &&
        updatedText &&
        toDate(updatedAt)?.getTime() >
        toDate(createdAt)?.getTime() +
        1000;

    return (
        <View style={styles.documentHero}>
            <View style={styles.documentIcon}>
                <Ionicons
                    name="fitness-outline"
                    size={20}
                    color="#FFFFFF"
                />
            </View>

            <View
                style={{
                    flex: 1,
                    minWidth: 0,
                }}
            >
                <Text
                    style={
                        styles.documentEyebrow
                    }
                >
                    AVALIAÇÃO NEUROLÓGICA
                </Text>

                <Text
                    style={
                        styles.documentTitle
                    }
                    numberOfLines={2}
                >
                    {title ||
                        "Avaliação neurológica"}
                </Text>

                {!!createdText && (
                    <View
                        style={
                            styles.documentDateRow
                        }
                    >
                        <Ionicons
                            name="calendar-outline"
                            size={12}
                            color="#6B7280"
                        />

                        <Text
                            style={
                                styles.documentDateText
                            }
                        >
                            Criado em{" "}
                            {createdText}
                        </Text>
                    </View>
                )}

                {wasUpdated && (
                    <Text
                        style={
                            styles.documentUpdatedText
                        }
                    >
                        Atualizado em{" "}
                        {updatedText}
                    </Text>
                )}
            </View>
        </View>
    );
}

function DocumentSection({ number, title, children }) {
    return (
        <View style={styles.docSection}>
            <View style={styles.docSectionHeader}>
                {!!number && (
                    <View style={styles.docSectionNumber}>
                        <Text style={styles.docSectionNumberText}>
                            {number}
                        </Text>
                    </View>
                )}

                <Text style={styles.docSectionTitle}>
                    {title}
                </Text>
            </View>

            <View style={styles.docSectionBody}>
                {children}
            </View>
        </View>
    );
}

function DocField({ label, value, multiline = false }) {
    const filled = isFilled(value);

    return (
        <View style={styles.docField}>
            <Text style={styles.docFieldLabel}>
                {label}
            </Text>

            <Text
                style={[
                    styles.docFieldValue,
                    !filled && styles.docFieldEmpty,
                    multiline && styles.docFieldMultiline,
                ]}
            >
                {formatEmpty(value)}
            </Text>
        </View>
    );
}

function DocStatusRow({ label, value, normalValue = "normal" }) {
    const isNormal = value === normalValue;
    const text = formatEmpty(value);

    return (
        <View style={styles.statusRow}>
            <Text style={styles.statusLabel} numberOfLines={2}>
                {label}
            </Text>

            <View
                style={[
                    styles.statusPill,
                    isNormal ? styles.statusPillNormal : styles.statusPillChanged,
                ]}
            >
                <View
                    style={[
                        styles.statusDot,
                        isNormal ? styles.statusDotNormal : styles.statusDotChanged,
                    ]}
                />

                <Text
                    style={[
                        styles.statusPillText,
                        isNormal ? styles.statusTextNormal : styles.statusTextChanged,
                    ]}
                    numberOfLines={1}
                >
                    {text}
                </Text>
            </View>
        </View>
    );
}

function DocOptionSummary({ label, value, options }) {
    return (
        <View style={styles.summaryRow}>
            <Text style={styles.docFieldLabel}>
                {label}
            </Text>

            <View style={styles.bluePill}>
                <Text style={styles.bluePillText}>
                    {optionLabel(options, value)}
                </Text>
            </View>
        </View>
    );
}

function DocumentView({ draft }) {
    return (
        <ScrollView
            contentContainerStyle={styles.documentContent}
            showsVerticalScrollIndicator
        >
            <DocumentHeader
                title={draft?.title}
                createdAt={draft?.createdAt}
                updatedAt={draft?.updatedAt}
            />

            <DocumentSection number="1" title="Estado mental e consciência">
                <DocOptionSummary
                    label="Nível de consciência"
                    value={draft?.estadoMental?.nivelConsciencia}
                    options={nivelConscienciaOptions}
                />

                <View style={styles.docInlineDivider} />

                <DocOptionSummary
                    label="Comportamento"
                    value={draft?.estadoMental?.comportamento}
                    options={comportamentoOptions}
                />
            </DocumentSection>

            <DocumentSection number="2" title="Postura, marcha e reações">
                <DocField
                    label="Postura"
                    value={draft?.textos?.postura}
                    multiline
                />

                <DocField
                    label="Marcha / locomoção"
                    value={draft?.textos?.marcha}
                    multiline
                />

                <DocField
                    label="Reações posturais"
                    value={draft?.textos?.reacoesPosturais}
                    multiline
                />
            </DocumentSection>

            <DocumentSection number="3" title="Nervos cranianos">
                {Object.entries(nervosCranianosLabels).map(([key, label]) => (
                    <DocStatusRow
                        key={key}
                        label={label}
                        value={optionLabel(
                            nervoOptions,
                            draft?.nervosCranianos?.[key] || "normal"
                        )}
                        normalValue="Normal"
                    />
                ))}
            </DocumentSection>

            <DocumentSection number="4" title="Reflexos espinhais">
                {Object.entries(reflexosLabels).map(([key, label]) => (
                    <DocStatusRow
                        key={key}
                        label={label}
                        value={optionLabel(
                            reflexoOptions,
                            draft?.reflexos?.[key] || "normal"
                        )}
                        normalValue="Normal"
                    />
                ))}
            </DocumentSection>

            <DocumentSection number="5" title="Avaliação sensitiva">
                {Object.entries(sensibilidadeLabels).map(([key, label]) => (
                    <DocStatusRow
                        key={key}
                        label={label}
                        value={optionLabel(
                            sensibilidadeOptions,
                            draft?.sensibilidade?.[key] || "normal"
                        )}
                        normalValue="Normal"
                    />
                ))}
            </DocumentSection>

            <DocumentSection number="6" title="Observações gerais">
                <DocField
                    label="Informações adicionais"
                    value={draft?.textos?.observacoesGerais}
                    multiline
                />
            </DocumentSection>
        </ScrollView>
    );
}

/* ---------- UI Formulário ---------- */

function SectionTitle({ children }) {
    return (
        <Text style={styles.formSectionTitle}>
            {children}
        </Text>
    );
}

function Card({ children, filled = false }) {
    return (
        <View
            style={[
                styles.formCard,
                {
                    borderColor: filled ? "#16A34A" : "rgba(0,0,0,0.06)",
                },
            ]}
        >
            {children}
        </View>
    );
}

function DisabledOverlay({ disabled, children }) {
    if (!disabled) return children;

    return (
        <View style={{ opacity: 0.55 }}>
            <View pointerEvents="none">
                {children}
            </View>
        </View>
    );
}

function LabeledTextArea({
    label,
    value,
    onChangeText,
    placeholder,
    disabled,
    minHeight = 80,
}) {
    const filled = !!value?.trim?.();

    return (
        <View style={{ marginBottom: 12 }}>
            {!!label && (
                <Text style={styles.inputLabel}>
                    {label}
                </Text>
            )}

            <View
                style={[
                    styles.textAreaShell,
                    {
                        minHeight,
                        borderColor: filled ? "#16A34A" : "rgba(0,0,0,0.15)",
                        backgroundColor: disabled ? "rgba(0,0,0,0.03)" : "white",
                    },
                ]}
            >
                <TextInput
                    value={value}
                    onChangeText={onChangeText}
                    placeholder={placeholder}
                    placeholderTextColor="#9CA3AF"
                    editable={!disabled}
                    multiline
                    textAlignVertical="top"
                    style={[
                        styles.textArea,
                        {
                            minHeight,
                            opacity: disabled ? 0.6 : 1,
                        },
                    ]}
                />
            </View>
        </View>
    );
}

function ChipRadioGroup({ label, subtitle, value, options, onChange, disabled }) {
    return (
        <View style={{ marginBottom: 12 }}>
            {!!label && (
                <Text style={styles.inputLabel}>
                    {label}
                </Text>
            )}

            {!!subtitle && (
                <Text style={styles.inputSubtitle}>
                    {subtitle}
                </Text>
            )}

            <View style={styles.radioWrap}>
                {options.map((opt) => {
                    const selected = value === opt.value;

                    return (
                        <TouchableOpacity
                            key={opt.value}
                            disabled={disabled}
                            activeOpacity={0.88}
                            onPress={() => onChange(opt.value)}
                            style={[
                                styles.radioChip,
                                {
                                    borderColor: selected ? "#2563EB" : "rgba(0,0,0,0.14)",
                                    backgroundColor: selected ? "rgba(37,99,235,0.08)" : "white",
                                    opacity: disabled ? 0.6 : 1,
                                },
                            ]}
                        >
                            <Ionicons
                                name={selected ? "radio-button-on" : "radio-button-off"}
                                size={16}
                                color={selected ? "#2563EB" : "#9CA3AF"}
                            />

                            <Text
                                style={[
                                    styles.radioChipText,
                                    {
                                        fontWeight: selected ? "750" : "550",
                                    },
                                ]}
                            >
                                {opt.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
}

/* ---------- Tela ---------- */

export default function AvaliacaoNeurologicaScreen() {
    const { id: petId, avaliacaoId } = useLocalSearchParams();
    const dispatch = useDispatch();

    const { auth, firestore, firestoreModule } = ensureFirebase() || {};

    const isExisting = !!avaliacaoId;
    const draft = useSelector((s) => s.avaliacao?.draftsByPet?.[petId]);

    const [editing, setEditing] = useState(!isExisting);
    const [loading, setLoading] = useState(isExisting);
    const [saving, setSaving] = useState(false);
    const [original, setOriginal] = useState(null);

    useEffect(() => {
        if (!petId) return;

        if (!isExisting && !draft) {
            const seed = normalizeNeurologicaDraft(String(petId), {});
            dispatch(
                replaceDraft({
                    petId: String(petId),
                    draft: seed,
                })
            );
        }
    }, [dispatch, petId, isExisting, draft]);

    useEffect(() => {
        (async () => {
            if (!isExisting || !firestore || !auth?.currentUser?.uid) return;

            try {
                setLoading(true);

                const uid = auth.currentUser.uid;

                const doc = await fetchAvaliacaoNeurologica({
                    firestore,
                    uid,
                    petId: String(petId),
                    avaliacaoId: String(avaliacaoId),
                });

                const seed = normalizeNeurologicaDraft(String(petId), doc || {});

                setOriginal(seed);

                dispatch(
                    replaceDraft({
                        petId: String(petId),
                        draft: seed,
                    })
                );
            } catch (e) {
                console.log("fetch neurologica error", e);
                Alert.alert(
                    "Avaliação neurológica",
                    "Não foi possível carregar."
                );
                router.back();
            } finally {
                setLoading(false);
            }
        })();
    }, [isExisting, firestore, auth, petId, avaliacaoId, dispatch]);

    const updateTitle = useCallback(
        (text) => {
            dispatch(
                updateDraftField({
                    petId: String(petId),
                    path: ["title"],
                    value: text,
                })
            );
        },
        [dispatch, petId]
    );

    const updateEstadoMental = useCallback(
        (field, val) => {
            const atual = draft?.estadoMental || {};

            dispatch(
                updateDraftField({
                    petId: String(petId),
                    path: ["estadoMental"],
                    value: { ...atual, [field]: val },
                })
            );
        },
        [dispatch, petId, draft?.estadoMental]
    );

    const updateTexto = useCallback(
        (field, val) => {
            const atual = draft?.textos || {};

            dispatch(
                updateDraftField({
                    petId: String(petId),
                    path: ["textos"],
                    value: { ...atual, [field]: val },
                })
            );
        },
        [dispatch, petId, draft?.textos]
    );

    const updateNervo = useCallback(
        (field, val) => {
            const atual = draft?.nervosCranianos || {};

            dispatch(
                updateDraftField({
                    petId: String(petId),
                    path: ["nervosCranianos"],
                    value: { ...atual, [field]: val },
                })
            );
        },
        [dispatch, petId, draft?.nervosCranianos]
    );

    const updateReflexo = useCallback(
        (field, val) => {
            const atual = draft?.reflexos || {};

            dispatch(
                updateDraftField({
                    petId: String(petId),
                    path: ["reflexos"],
                    value: { ...atual, [field]: val },
                })
            );
        },
        [dispatch, petId, draft?.reflexos]
    );

    const updateSensibilidade = useCallback(
        (field, val) => {
            const atual = draft?.sensibilidade || {};

            dispatch(
                updateDraftField({
                    petId: String(petId),
                    path: ["sensibilidade"],
                    value: { ...atual, [field]: val },
                })
            );
        },
        [dispatch, petId, draft?.sensibilidade]
    );

    const goBackToAvaliacaoList = useCallback(() => {
        dispatch(clearDraft({ petId: String(petId) }));

        if (router.canGoBack?.()) {
            router.back();
            return;
        }

        router.replace({
            pathname: "/(modals)/pets/[id]/avaliacao",
            params: { id: String(petId) },
        });
    }, [dispatch, petId]);

    const cancelEditing = useCallback(() => {
        setEditing(false);

        if (original) {
            dispatch(
                replaceDraft({
                    petId: String(petId),
                    draft: original,
                })
            );
        }
    }, [dispatch, petId, original]);

    const cancelNew = useCallback(() => {
        dispatch(clearDraft({ petId: String(petId) }));

        if (router.canGoBack?.()) {
            router.back();
            return;
        }

        router.replace({
            pathname: "/(modals)/pets/[id]/avaliacao",
            params: { id: String(petId) },
        });
    }, [dispatch, petId]);

    const handleSave = useCallback(async () => {
        try {
            if (!draft) return;

            if (!auth?.currentUser?.uid) {
                Alert.alert(
                    "Avaliação neurológica",
                    "Usuário não autenticado."
                );
                return;
            }

            const uid = auth.currentUser.uid;

            setSaving(true);

            const payload = {
                title: draft.title?.trim() || "",
                tipo: "neurologica",
                type: "neurologica",
                petId: String(petId),
                fields: {
                    estadoMental: draft.estadoMental || {},
                    textos: draft.textos || {},
                    nervosCranianos: draft.nervosCranianos || {},
                    reflexos: draft.reflexos || {},
                    sensibilidade: draft.sensibilidade || {},
                },
            };

            if (isExisting) {
                await updateNeurologica({
                    firestore,
                    firestoreModule,
                    uid,
                    petId: String(petId),
                    avaliacaoId: String(avaliacaoId),
                    payload,
                });

                const normalized =
                    normalizeNeurologicaDraft(
                        String(petId),
                        {
                            ...payload,

                            id:
                                String(
                                    avaliacaoId
                                ),

                            createdAt:
                                original?.createdAt ||
                                draft?.createdAt ||
                                null,

                            updatedAt:
                                new Date(),
                        }
                    );

                setOriginal(normalized);

                dispatch(
                    replaceDraft({
                        petId: String(petId),
                        draft: normalized,
                    })
                );

                setEditing(false);

                Alert.alert(
                    "Avaliação neurológica",
                    "Alterações salvas!"
                );

                return;
            }

            await saveNewNeurologica({
                firestore,
                firestoreModule,
                uid,
                petId: String(petId),
                payload,
            });

            Alert.alert(
                "Avaliação neurológica",
                "Registro criado!"
            );

            dispatch(clearDraft({ petId: String(petId) }));

            router.replace({
                pathname: "/(modals)/pets/[id]/avaliacao",
                params: { id: String(petId) },
            });
        } catch (e) {
            console.log("save neuro error", e);
            Alert.alert(
                "Avaliação neurológica",
                "Não foi possível salvar."
            );
        } finally {
            setSaving(false);
        }
    }, [
        draft,
        isExisting,
        avaliacaoId,
        firestore,
        firestoreModule,
        auth,
        petId,
        dispatch,
    ]);

    const handleDelete = useCallback(() => {
        if (!isExisting) return;

        const uid = auth?.currentUser?.uid;

        if (!uid) {
            Alert.alert(
                "Avaliação neurológica",
                "Usuário não autenticado."
            );
            return;
        }

        Alert.alert(
            "Apagar avaliação",
            "Tem certeza que deseja apagar este registro?",
            [
                {
                    text: "Cancelar",
                    style: "cancel",
                },
                {
                    text: "Apagar",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await deleteNeurologica({
                                firestore,
                                uid,
                                petId: String(petId),
                                avaliacaoId: String(avaliacaoId),
                            });

                            dispatch(clearDraft({ petId: String(petId) }));

                            router.replace({
                                pathname: "/(modals)/pets/[id]/avaliacao",
                                params: { id: String(petId) },
                            });
                        } catch (e) {
                            console.log("delete neuro error", e);
                            Alert.alert(
                                "Avaliação neurológica",
                                "Não foi possível apagar."
                            );
                        }
                    },
                },
            ]
        );
    }, [isExisting, auth, firestore, petId, avaliacaoId, dispatch]);

    if (loading) {
        return (
            <>
                <Stack.Screen
                    options={{
                        title: "Avaliação neurológica",
                        headerBackTitleVisible: false,
                        headerLargeTitle: false,
                    }}
                />

                <View style={styles.loadingScreen}>
                    <ActivityIndicator />
                    <Text style={styles.loadingText}>
                        Carregando avaliação…
                    </Text>
                </View>
            </>
        );
    }

    const disabled = !editing;

    const algumEstadoMental =
        !!draft?.estadoMental?.nivelConsciencia ||
        !!draft?.estadoMental?.comportamento;

    const algumNervoPreenchido =
        draft?.nervosCranianos &&
        Object.values(draft.nervosCranianos).some(
            (v) => !!v && v !== "normal"
        );

    const algumReflexoAlterado =
        draft?.reflexos &&
        Object.values(draft.reflexos).some(
            (v) => !!v && v !== "normal"
        );

    const algumaSensibilidade =
        draft?.sensibilidade &&
        Object.values(draft.sensibilidade).some(
            (v) => !!v && v !== "normal"
        );

    return (
        <KeyboardAvoidingView
            behavior={Platform.select({
                ios: "padding",
                android: undefined,
            })}
            style={styles.screen}
        >
            <Stack.Screen
                options={{
                    title: editing ? "Editar avaliação" : "Avaliação neurológica",
                    headerLeft: () => {
                        if (isExisting && !editing) {
                            return (
                                <TouchableOpacity
                                    onPress={goBackToAvaliacaoList}
                                    style={styles.headerBack}
                                    hitSlop={10}
                                >
                                    <Ionicons name="chevron-back" size={22} color="#2563EB" />
                                    <Text style={styles.headerBackText}>
                                        Voltar
                                    </Text>
                                </TouchableOpacity>
                            );
                        }

                        if (isExisting && editing) {
                            return (
                                <TouchableOpacity
                                    onPress={cancelEditing}
                                    style={styles.headerButton}
                                    hitSlop={10}
                                >
                                    <Text style={styles.cancelText}>
                                        Cancelar
                                    </Text>
                                </TouchableOpacity>
                            );
                        }

                        return (
                            <TouchableOpacity
                                onPress={cancelNew}
                                style={styles.headerButton}
                                hitSlop={10}
                            >
                                <Text style={styles.cancelText}>
                                    Cancelar
                                </Text>
                            </TouchableOpacity>
                        );
                    },
                    headerRight: () => {
                        if (isExisting && !editing) {
                            return (
                                <TouchableOpacity
                                    onPress={() => setEditing(true)}
                                    style={styles.headerButton}
                                    hitSlop={10}
                                >
                                    <Text style={styles.editText}>
                                        Editar
                                    </Text>
                                </TouchableOpacity>
                            );
                        }

                        if (isExisting && editing) {
                            return (
                                <TouchableOpacity
                                    onPress={handleDelete}
                                    style={styles.headerButton}
                                    accessibilityLabel="Apagar avaliação"
                                    hitSlop={10}
                                >
                                    <Ionicons name="trash-outline" size={22} color="#FF3B30" />
                                </TouchableOpacity>
                            );
                        }

                        return null;
                    },
                }}
            />

            {isExisting && !editing ? (
                <DocumentView draft={draft} />
            ) : (
                <ScrollView
                    contentContainerStyle={styles.formContent}
                    keyboardShouldPersistTaps="handled"
                    onScrollBeginDrag={Keyboard.dismiss}
                    showsVerticalScrollIndicator
                    indicatorStyle="black"
                    scrollEventThrottle={16}
                >
                    <SectionTitle>Título</SectionTitle>

                    <Card filled={!!draft?.title?.trim?.()}>
                        <DisabledOverlay disabled={!editing}>
                            <TextInput
                                placeholder="Ex.: Exame neurológico inicial, retorno, pós-cirúrgico…"
                                placeholderTextColor="#9CA3AF"
                                value={draft?.title ?? ""}
                                onChangeText={updateTitle}
                                editable={editing}
                                style={styles.titleInput}
                            />
                        </DisabledOverlay>
                    </Card>

                    <View style={{ marginTop: 16 }}>
                        <SectionTitle>1. Estado mental e consciência</SectionTitle>

                        <Card filled={algumEstadoMental}>
                            <DisabledOverlay disabled={disabled}>
                                <ChipRadioGroup
                                    label="Nível de consciência"
                                    subtitle="Córtex, tronco"
                                    value={draft?.estadoMental?.nivelConsciencia || "alerta"}
                                    onChange={(val) =>
                                        updateEstadoMental("nivelConsciencia", val)
                                    }
                                    disabled={disabled}
                                    options={nivelConscienciaOptions}
                                />

                                <ChipRadioGroup
                                    label="Comportamento"
                                    subtitle="Tálamo, córtex"
                                    value={draft?.estadoMental?.comportamento || "normal"}
                                    onChange={(val) =>
                                        updateEstadoMental("comportamento", val)
                                    }
                                    disabled={disabled}
                                    options={comportamentoOptions}
                                />
                            </DisabledOverlay>
                        </Card>
                    </View>

                    <View style={{ marginTop: 16 }}>
                        <SectionTitle>2. Postura, marcha e reações</SectionTitle>

                        <LabeledTextArea
                            label="Postura"
                            value={draft?.textos?.postura || ""}
                            onChangeText={(t) => updateTexto("postura", t)}
                            placeholder="Cabeça, tronco, membros; posturas anormais."
                            disabled={disabled}
                            minHeight={80}
                        />

                        <LabeledTextArea
                            label="Marcha / locomoção"
                            value={draft?.textos?.marcha || ""}
                            onChangeText={(t) => updateTexto("marcha", t)}
                            placeholder="Ataxia, paresia, plegia, andar em círculos, tropeços, queda."
                            disabled={disabled}
                            minHeight={90}
                        />

                        <LabeledTextArea
                            label="Reações posturais"
                            value={draft?.textos?.reacoesPosturais || ""}
                            onChangeText={(t) => updateTexto("reacoesPosturais", t)}
                            placeholder="Propriocepção consciente, salto em três patas, empurrar lateral."
                            disabled={disabled}
                            minHeight={90}
                        />
                    </View>

                    <View style={{ marginTop: 16 }}>
                        <SectionTitle>3. Nervos cranianos</SectionTitle>

                        <Card filled={algumNervoPreenchido}>
                            <DisabledOverlay disabled={disabled}>
                                {Object.entries(nervosCranianosLabels).map(([key, label]) => (
                                    <ChipRadioGroup
                                        key={key}
                                        label={label}
                                        value={draft?.nervosCranianos?.[key] || "normal"}
                                        onChange={(val) => updateNervo(key, val)}
                                        disabled={disabled}
                                        options={nervoOptions}
                                    />
                                ))}
                            </DisabledOverlay>
                        </Card>
                    </View>

                    <View style={{ marginTop: 16 }}>
                        <SectionTitle>4. Reflexos espinhais</SectionTitle>

                        <Card filled={algumReflexoAlterado}>
                            <DisabledOverlay disabled={disabled}>
                                {Object.entries(reflexosLabels).map(([key, label]) => (
                                    <ChipRadioGroup
                                        key={key}
                                        label={label}
                                        value={draft?.reflexos?.[key] || "normal"}
                                        onChange={(val) => updateReflexo(key, val)}
                                        disabled={disabled}
                                        options={reflexoOptions}
                                    />
                                ))}
                            </DisabledOverlay>
                        </Card>
                    </View>

                    <View style={{ marginTop: 16 }}>
                        <SectionTitle>5. Avaliação sensitiva</SectionTitle>

                        <Card filled={algumaSensibilidade}>
                            <DisabledOverlay disabled={disabled}>
                                {Object.entries(sensibilidadeLabels).map(([key, label]) => (
                                    <ChipRadioGroup
                                        key={key}
                                        label={label}
                                        value={draft?.sensibilidade?.[key] || "normal"}
                                        onChange={(val) => updateSensibilidade(key, val)}
                                        disabled={disabled}
                                        options={sensibilidadeOptions}
                                    />
                                ))}
                            </DisabledOverlay>
                        </Card>
                    </View>

                    <View style={{ marginTop: 16 }}>
                        <SectionTitle>6. Observações gerais</SectionTitle>

                        <LabeledTextArea
                            value={draft?.textos?.observacoesGerais || ""}
                            onChangeText={(t) => updateTexto("observacoesGerais", t)}
                            placeholder="Integração dos achados neurológicos, localização da lesão, diagnósticos diferenciais e observações importantes."
                            disabled={disabled}
                            minHeight={110}
                        />
                    </View>
                </ScrollView>
            )}

            {editing && (
                <SafeAreaView style={styles.saveFooter}>
                    <View style={{ padding: 12 }}>
                        <TouchableOpacity
                            onPress={handleSave}
                            disabled={saving}
                            style={[
                                styles.saveButton,
                                saving && { opacity: 0.82 },
                            ]}
                        >
                            {saving ? (
                                <>
                                    <ActivityIndicator color="#fff" />
                                    <Text style={styles.saveButtonText}>
                                        Salvando…
                                    </Text>
                                </>
                            ) : (
                                <>
                                    <Ionicons name="checkmark" size={18} color="#fff" />
                                    <Text style={styles.saveButtonText}>
                                        Salvar
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            )}
        </KeyboardAvoidingView>
    );
}

/* ---------- Styles ---------- */

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: "#F3F4F6",
    },

    loadingScreen: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#F3F4F6",
    },

    loadingText: {
        marginTop: 10,
        color: "#6B7280",
        fontWeight: "600",
    },

    headerBack: {
        paddingHorizontal: 8,
        flexDirection: "row",
        alignItems: "center",
    },

    headerBackText: {
        color: "#2563EB",
        fontWeight: "700",
        marginLeft: 3,
    },

    headerButton: {
        paddingHorizontal: 8,
    },

    cancelText: {
        color: "#FF3B30",
        fontWeight: "700",
    },

    editText: {
        color: "#2563EB",
        fontWeight: "700",
    },

    documentContent: {
        paddingHorizontal: 14,
        paddingTop: 12,
        paddingBottom: 34,
    },

    documentHero: {
        backgroundColor: "#FFFFFF",
        borderRadius: 14,
        paddingHorizontal: 13,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: "rgba(0,0,0,0.055)",
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 10,
        shadowColor: "#000",
        shadowOpacity: 0.035,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 3 },
        elevation: 1,
    },

    documentIcon: {
        width: 34,
        height: 34,
        borderRadius: 10,
        backgroundColor: "#2563EB",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 10,
    },

    documentEyebrow: {
        fontSize: 10,
        fontWeight: "900",
        letterSpacing: 0.5,
        color: "#2563EB",
        marginBottom: 1,
    },

    documentTitle: {
        fontSize: 16,
        fontWeight: "900",
        color: "#111827",
        letterSpacing: -0.24,
        lineHeight: 20,
    },

    docSection: {
        backgroundColor: "#FFFFFF",
        borderRadius: 14,
        marginTop: 9,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: "rgba(0,0,0,0.055)",
        shadowColor: "#000",
        shadowOpacity: 0.025,
        shadowRadius: 5,
        shadowOffset: { width: 0, height: 2 },
        elevation: 1,
    },

    docSectionHeader: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
        paddingTop: 10,
        paddingBottom: 8,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: "rgba(0,0,0,0.07)",
    },

    docSectionNumber: {
        width: 20,
        height: 20,
        borderRadius: 7,
        backgroundColor: "rgba(37,99,235,0.10)",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 8,
    },

    docSectionNumberText: {
        fontSize: 10,
        fontWeight: "900",
        color: "#2563EB",
    },

    docSectionTitle: {
        flex: 1,
        color: "#111827",
        fontSize: 13.6,
        fontWeight: "900",
        letterSpacing: -0.08,
    },

    docSectionBody: {
        paddingHorizontal: 12,
        paddingTop: 10,
        paddingBottom: 5,
    },

    docField: {
        marginBottom: 10,
    },

    docFieldLabel: {
        fontSize: 10.5,
        fontWeight: "850",
        color: "#6B7280",
        textTransform: "uppercase",
        letterSpacing: 0.25,
        marginBottom: 2,
    },

    docFieldValue: {
        fontSize: 12.7,
        lineHeight: 18,
        color: "#111827",
        fontWeight: "550",
    },

    docFieldMultiline: {
        lineHeight: 18.5,
    },

    docFieldEmpty: {
        color: "#A1A1AA",
        fontStyle: "italic",
        fontWeight: "500",
    },

    docInlineDivider: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: "rgba(0,0,0,0.07)",
        marginTop: 2,
        marginBottom: 10,
    },

    summaryRow: {
        marginBottom: 8,
    },

    bluePill: {
        alignSelf: "flex-start",
        paddingHorizontal: 9,
        paddingVertical: 5,
        borderRadius: 999,
        backgroundColor: "rgba(37,99,235,0.08)",
        borderWidth: 1,
        borderColor: "rgba(37,99,235,0.13)",
        marginTop: 3,
    },

    bluePillText: {
        color: "#1D4ED8",
        fontWeight: "850",
        fontSize: 12,
    },

    statusRow: {
        minHeight: 34,
        paddingVertical: 7,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: "rgba(15,23,42,0.07)",
        flexDirection: "row",
        alignItems: "center",
    },

    statusLabel: {
        flex: 1,
        color: "#111827",
        fontSize: 12.4,
        lineHeight: 16,
        fontWeight: "600",
        marginRight: 10,
    },

    statusPill: {
        minWidth: 76,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 999,
        borderWidth: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
    },

    statusPillNormal: {
        backgroundColor: "rgba(22,163,74,0.035)",
        borderColor: "rgba(22,163,74,0.13)",
    },

    statusPillChanged: {
        backgroundColor: "rgba(245,158,11,0.08)",
        borderColor: "rgba(245,158,11,0.18)",
    },

    statusDot: {
        width: 5,
        height: 5,
        borderRadius: 2.5,
        marginRight: 5,
    },

    statusDotNormal: {
        backgroundColor: "#16A34A",
    },

    statusDotChanged: {
        backgroundColor: "#D97706",
    },

    statusPillText: {
        fontSize: 11,
        fontWeight: "850",
    },

    statusTextNormal: {
        color: "#15803D",
    },

    statusTextChanged: {
        color: "#B45309",
    },

    formContent: {
        padding: 16,
        paddingBottom: 160,
    },

    formSectionTitle: {
        fontWeight: "800",
        fontSize: 16,
        marginBottom: 8,
        color: "#111827",
    },

    formCard: {
        backgroundColor: "white",
        borderRadius: 12,
        padding: 12,
        borderWidth: 1.5,
    },

    titleInput: {
        height: 44,
        color: "#111827",
        fontWeight: "600",
    },

    inputLabel: {
        fontWeight: "700",
        color: "#111827",
        marginBottom: 6,
    },

    inputSubtitle: {
        fontWeight: "500",
        color: "#6B7280",
        marginBottom: 6,
        fontSize: 10,
    },

    textAreaShell: {
        borderWidth: 1.5,
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 8,
    },

    textArea: {
        color: "#111827",
        fontWeight: "500",
    },

    radioWrap: {
        flexDirection: "row",
        flexWrap: "wrap",
    },

    radioChip: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 11,
        paddingVertical: 8,
        borderRadius: 999,
        borderWidth: 1.5,
        marginRight: 8,
        marginBottom: 8,
    },

    radioChipText: {
        marginLeft: 6,
        color: "#111827",
    },

    saveFooter: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "white",
        borderTopWidth: 1,
        borderTopColor: "rgba(0,0,0,0.08)",
    },

    saveButton: {
        backgroundColor: "#2563EB",
        height: 48,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
    },

    saveButtonText: {
        color: "white",
        fontWeight: "800",
        marginLeft: 7,
    },
    documentDateRow: {
        marginTop: 6,
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
    },

    documentDateText: {
        flex: 1,
        color: "#6B7280",
        fontSize: 10.5,
        lineHeight: 14,
        fontWeight: "650",
    },

    documentUpdatedText: {
        marginTop: 2,
        marginLeft: 17,
        color: "#9CA3AF",
        fontSize: 9.5,
        lineHeight: 13,
        fontWeight: "550",
    },
});