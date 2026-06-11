// app/(modals)/avaliacao/avaliacao-anamnese.jsx
// @ts-nocheck

import React, { useEffect, useState, useCallback } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Alert,
    Keyboard,
    StyleSheet,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams, router } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";

import { auth, db } from "@/src/services/firebaseClient";
import {
    collection,
    deleteDoc,
    doc,
    getDoc,
    serverTimestamp,
    setDoc,
    updateDoc,
} from "firebase/firestore";

import {
    updateDraftField,
    clearDraft,
    replaceDraft,
} from "@/src/store/slices/avaliacaoSlice";

/* ---------- Firestore ---------- */

async function fetchAvaliacao({ uid, petId, avaliacaoId }) {
    const ref = doc(
        db,
        "users",
        String(uid),
        "pets",
        String(petId),
        "avaliacoes",
        String(avaliacaoId)
    );

    const snap = await getDoc(ref);

    if (!snap.exists()) return null;

    return { id: snap.id, ...snap.data() };
}

export async function saveNewAvaliacao({ uid, petId, payload }) {
    const colRef = collection(
        db,
        "users",
        String(uid),
        "pets",
        String(petId),
        "avaliacoes"
    );

    const ref = doc(colRef);
    const now = serverTimestamp();

    await setDoc(ref, {
        ...payload,
        createdAt: now,
        updatedAt: now,
        type: "avaliacao",
    });

    return ref.id;
}

export async function updateAvaliacao({ uid, petId, avaliacaoId, payload }) {
    const ref = doc(
        db,
        "users",
        String(uid),
        "pets",
        String(petId),
        "avaliacoes",
        String(avaliacaoId)
    );

    await updateDoc(ref, {
        ...payload,
        updatedAt: serverTimestamp(),
    });
}

async function deleteAvaliacao({ uid, petId, avaliacaoId }) {
    const ref = doc(
        db,
        "users",
        String(uid),
        "pets",
        String(petId),
        "avaliacoes",
        String(avaliacaoId)
    );

    await deleteDoc(ref);
}

/* ---------- Normalização ---------- */

function normalizeDraftAnamnese(petId, docData) {
    const base = {
        title: "Anamnese – Fisioterapia",
        tipo: "anamnese",
        textos: {
            queixaPrincipal: "",
            historiaDoencaAtual: "",
            vacinasVermifugos: "",
            alimentacao: "",
            hidratacao: "",
            fezesUrina: "",
            medicacoesAnteriores: "",
            medicacoesUso: "",
            historicoNeoplasias: "",
            localDormir: "",
            descricaoDor: "",
            observacoesGerais: "",
        },
        habitos: {
            escadas: false,
            acessoRua: false,
            pisoLiso: false,
            pisoAntiderrapante: false,
            sobeDesceSofa: false,
            sobeDesceCama: false,
        },
        funcional: {
            levantaSozinho: false,
            caminhaSemApoio: false,
            escorrega: false,
            dificuldadeLevantar: false,
        },
        dor: {
            nivel: "leve",
        },
        expectativas: {
            reduzirDor: false,
            melhorarMobilidade: false,
            reabilitacaoPosCirurgia: false,
            qualidadeVida: false,
        },
    };

    const f = docData?.fields || {};

    return {
        ...base,
        title: docData?.title ?? base.title,
        tipo: docData?.tipo ?? base.tipo,
        textos: {
            ...base.textos,
            ...(f.textos || {}),
        },
        habitos: {
            ...base.habitos,
            ...(f.habitos || {}),
        },
        funcional: {
            ...base.funcional,
            ...(f.funcional || {}),
        },
        dor: {
            ...base.dor,
            ...(f.dor || {}),
        },
        expectativas: {
            ...base.expectativas,
            ...(f.expectativas || {}),
        },
    };
}

const isFilled = (v) => {
    if (v == null) return false;
    if (typeof v === "string") return v.trim().length > 0;
    return !!v;
};

const formatEmpty = (value) => {
    if (!isFilled(value)) return "Não informado";
    return String(value).trim();
};

const groupHasTrue = (obj) => {
    if (!obj || typeof obj !== "object") return false;
    return Object.values(obj).some(Boolean);
};

const humanDor = {
    leve: "Leve",
    moderada: "Moderada",
    intensa: "Intensa",
};

const habitosLabels = {
    escadas: "Escadas",
    acessoRua: "Acesso à rua",
    pisoLiso: "Piso liso",
    pisoAntiderrapante: "Piso antiderrapante",
    sobeDesceSofa: "Sobe/desce sofá",
    sobeDesceCama: "Sobe/desce cama",
};

const funcionalLabels = {
    levantaSozinho: "Levanta sozinho",
    caminhaSemApoio: "Caminha sem apoio",
    escorrega: "Escorrega",
    dificuldadeLevantar: "Dificuldade para levantar",
};

const expectativasLabels = {
    reduzirDor: "Reduzir dor",
    melhorarMobilidade: "Melhorar mobilidade",
    reabilitacaoPosCirurgia: "Reabilitação pós-cirurgia",
    qualidadeVida: "Qualidade de vida",
};

/* ---------- UI Documento ---------- */

function DocumentHeader({ title }) {
    return (
        <View style={styles.documentHero}>
            <View style={styles.documentIcon}>
                <Ionicons name="document-text-outline" size={20} color="#FFFFFF" />
            </View>

            <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.documentEyebrow}>ANAMNESE</Text>
                <Text style={styles.documentTitle} numberOfLines={2}>
                    {title || "Anamnese – Fisioterapia"}
                </Text>
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
                        <Text style={styles.docSectionNumberText}>{number}</Text>
                    </View>
                )}

                <Text style={styles.docSectionTitle}>{title}</Text>
            </View>

            <View style={styles.docSectionBody}>{children}</View>
        </View>
    );
}

function DocField({ label, value, multiline = false }) {
    const filled = isFilled(value);

    return (
        <View style={styles.docField}>
            <Text style={styles.docFieldLabel}>{label}</Text>
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

function DocFieldGrid({ items }) {
    return (
        <View style={styles.docGrid}>
            {items.map((item) => (
                <View key={item.label} style={styles.docGridItem}>
                    <DocField
                        label={item.label}
                        value={item.value}
                        multiline={item.multiline}
                    />
                </View>
            ))}
        </View>
    );
}

function DocSelectedList({ labels, values }) {
    const selected = Object.entries(values || {})
        .filter(([, value]) => Boolean(value))
        .map(([key]) => labels[key])
        .filter(Boolean);

    if (!selected.length) {
        return (
            <Text style={styles.emptyBlock}>
                Nenhum item selecionado.
            </Text>
        );
    }

    return (
        <View style={styles.selectedList}>
            {selected.map((label, index) => (
                <View
                    key={label}
                    style={[
                        styles.selectedRow,
                        index !== selected.length - 1 && styles.selectedRowBorder,
                    ]}
                >
                    <View style={styles.selectedIcon}>
                        <Ionicons name="checkmark" size={11} color="#15803D" />
                    </View>

                    <Text style={styles.selectedText}>
                        {label}
                    </Text>
                </View>
            ))}
        </View>
    );
}

function DorSummary({ nivel }) {
    const text = humanDor[nivel] || "Não informado";

    return (
        <View style={styles.dorSummary}>
            <Text style={styles.docFieldLabel}>Intensidade</Text>

            <View style={styles.dorPill}>
                <Ionicons name="pulse-outline" size={13} color="#2563EB" />
                <Text style={styles.dorPillText}>{text}</Text>
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
            <DocumentHeader title={draft?.title} />

            <DocumentSection number="1" title="Queixa principal">
                <DocField
                    label="Descrição"
                    value={draft?.textos?.queixaPrincipal}
                    multiline
                />
            </DocumentSection>

            <DocumentSection number="2" title="História da doença atual">
                <DocField
                    label="Evolução do quadro"
                    value={draft?.textos?.historiaDoencaAtual}
                    multiline
                />
            </DocumentSection>

            <DocumentSection number="3" title="Antecedentes médicos">
                <DocFieldGrid
                    items={[
                        {
                            label: "Vacinas e vermífugos",
                            value: draft?.textos?.vacinasVermifugos,
                            multiline: true,
                        },
                        {
                            label: "Alimentação",
                            value: draft?.textos?.alimentacao,
                            multiline: true,
                        },
                        {
                            label: "Hidratação",
                            value: draft?.textos?.hidratacao,
                            multiline: true,
                        },
                        {
                            label: "Fezes e urina",
                            value: draft?.textos?.fezesUrina,
                            multiline: true,
                        },
                        {
                            label: "Medicações anteriores",
                            value: draft?.textos?.medicacoesAnteriores,
                            multiline: true,
                        },
                        {
                            label: "Medicações em uso",
                            value: draft?.textos?.medicacoesUso,
                            multiline: true,
                        },
                        {
                            label: "Histórico de neoplasias",
                            value: draft?.textos?.historicoNeoplasias,
                            multiline: true,
                        },
                    ]}
                />
            </DocumentSection>

            <DocumentSection number="4" title="Hábitos e rotina">
                <DocSelectedList labels={habitosLabels} values={draft?.habitos} />

                <View style={styles.docInlineDivider} />

                <DocField
                    label="Local onde dorme"
                    value={draft?.textos?.localDormir}
                    multiline
                />
            </DocumentSection>

            <DocumentSection number="5" title="Avaliação funcional">
                <DocSelectedList labels={funcionalLabels} values={draft?.funcional} />
            </DocumentSection>

            <DocumentSection number="6" title="Avaliação da dor">
                <DorSummary nivel={draft?.dor?.nivel} />

                <View style={styles.docInlineDivider} />

                <DocField
                    label="Descrição da dor"
                    value={draft?.textos?.descricaoDor}
                    multiline
                />
            </DocumentSection>

            <DocumentSection number="7" title="Expectativas do tutor">
                <DocSelectedList labels={expectativasLabels} values={draft?.expectativas} />
            </DocumentSection>

            <DocumentSection number="8" title="Observações gerais">
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
    return <Text style={styles.formSectionTitle}>{children}</Text>;
}

function DisabledOverlay({ disabled, children }) {
    if (!disabled) return children;

    return (
        <View style={{ opacity: 0.55 }}>
            <View pointerEvents="none">{children}</View>
        </View>
    );
}

function CardHighlight({ filled, children }) {
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

function LabeledTextArea({
    label,
    value,
    onChangeText,
    placeholder,
    disabled,
    minHeight = 80,
    filled = false,
}) {
    return (
        <View style={{ marginTop: 8 }}>
            {!!label && <Text style={styles.inputLabel}>{label}</Text>}

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
                            opacity: disabled ? 0.55 : 1,
                        },
                    ]}
                />
            </View>
        </View>
    );
}

function CheckboxRow({ label, value, onChange, disabled }) {
    return (
        <TouchableOpacity
            activeOpacity={0.86}
            onPress={() => !disabled && onChange(!value)}
            disabled={disabled}
            style={[
                styles.checkboxRow,
                value && styles.checkboxRowSelected,
                disabled && { opacity: 0.55 },
            ]}
        >
            <Text
                style={[
                    styles.checkboxLabel,
                    value && styles.checkboxLabelSelected,
                ]}
                numberOfLines={1}
            >
                {label}
            </Text>

            <View
                style={[
                    styles.checkboxBox,
                    value && styles.checkboxBoxSelected,
                ]}
            >
                {value && (
                    <Ionicons name="checkmark" size={15} color="#16A34A" />
                )}
            </View>
        </TouchableOpacity>
    );
}

function DorRadio({ label, value, onChange, disabled }) {
    const options = [
        { key: "leve", text: "Leve" },
        { key: "moderada", text: "Moderada" },
        { key: "intensa", text: "Intensa" },
    ];

    return (
        <View style={{ marginBottom: 8 }}>
            <Text style={styles.inputLabel}>{label}</Text>

            <View style={styles.radioWrap}>
                {options.map((opt) => {
                    const selected = value === opt.key;

                    return (
                        <TouchableOpacity
                            key={opt.key}
                            onPress={() => !disabled && onChange(opt.key)}
                            activeOpacity={0.9}
                            disabled={disabled}
                            style={[
                                styles.radioChip,
                                {
                                    borderColor: selected ? "#2563EB" : "rgba(0,0,0,0.12)",
                                    backgroundColor: selected ? "rgba(37,99,235,0.08)" : "white",
                                    opacity: disabled ? 0.6 : 1,
                                },
                            ]}
                        >
                            <Ionicons
                                name={selected ? "radio-button-on" : "radio-button-off"}
                                size={18}
                                color={selected ? "#2563EB" : "#9CA3AF"}
                            />
                            <Text
                                style={[
                                    styles.radioChipText,
                                    {
                                        fontWeight: selected ? "700" : "500",
                                    },
                                ]}
                            >
                                {opt.text}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
}

/* ---------- Tela ---------- */

export default function AnamneseFormScreen() {
    const { id: petId, avaliacaoId } = useLocalSearchParams();
    const dispatch = useDispatch();

    const draft = useSelector((s) => s.avaliacao?.draftsByPet?.[petId]);

    const isExisting = !!avaliacaoId;
    const [editing, setEditing] = useState(!isExisting);
    const [loading, setLoading] = useState(isExisting);
    const [saving, setSaving] = useState(false);
    const [original, setOriginal] = useState(null);

    useEffect(() => {
        if (!petId) return;

        if (!isExisting && !draft) {
            const seed = normalizeDraftAnamnese(String(petId), null);
            dispatch(replaceDraft({ petId: String(petId), draft: seed }));
        }
    }, [dispatch, petId, isExisting, draft]);

    useEffect(() => {
        (async () => {
            if (!isExisting || !auth.currentUser?.uid) return;

            try {
                setLoading(true);

                const uid = auth.currentUser.uid;

                const docData = await fetchAvaliacao({
                    uid,
                    petId: String(petId),
                    avaliacaoId: String(avaliacaoId),
                });

                const seed = normalizeDraftAnamnese(String(petId), docData || {});

                setOriginal(seed);
                dispatch(replaceDraft({ petId: String(petId), draft: seed }));
            } catch (e) {
                console.log("fetch anamnese error", e);
                Alert.alert("Anamnese", "Não foi possível carregar.");
                router.back();
            } finally {
                setLoading(false);
            }
        })();
    }, [isExisting, petId, avaliacaoId, dispatch]);

    const updateTexto = useCallback(
        (field, value) => {
            dispatch(
                updateDraftField({
                    petId: String(petId),
                    path: ["textos", field],
                    value,
                })
            );
        },
        [dispatch, petId]
    );

    const updateHabito = useCallback(
        (field, value) => {
            dispatch(
                updateDraftField({
                    petId: String(petId),
                    path: ["habitos", field],
                    value,
                })
            );
        },
        [dispatch, petId]
    );

    const updateFuncional = useCallback(
        (field, value) => {
            dispatch(
                updateDraftField({
                    petId: String(petId),
                    path: ["funcional", field],
                    value,
                })
            );
        },
        [dispatch, petId]
    );

    const updateDorNivel = useCallback(
        (nivel) => {
            dispatch(
                updateDraftField({
                    petId: String(petId),
                    path: ["dor", "nivel"],
                    value: nivel,
                })
            );
        },
        [dispatch, petId]
    );

    const updateDescricaoDor = useCallback(
        (text) => {
            updateTexto("descricaoDor", text);
        },
        [updateTexto]
    );

    const updateExpectativa = useCallback(
        (field, value) => {
            dispatch(
                updateDraftField({
                    petId: String(petId),
                    path: ["expectativas", field],
                    value,
                })
            );
        },
        [dispatch, petId]
    );

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

            if (!auth.currentUser?.uid) {
                Alert.alert("Anamnese", "Usuário não autenticado.");
                return;
            }

            const uid = auth.currentUser.uid;

            setSaving(true);

            const payload = {
                title: draft.title?.trim() || "Anamnese – Fisioterapia",
                tipo: "anamnese",
                fields: {
                    textos: draft.textos || {},
                    habitos: draft.habitos || {},
                    funcional: draft.funcional || {},
                    dor: draft.dor || {},
                    expectativas: draft.expectativas || {},
                },
                petId: String(petId),
            };

            if (isExisting) {
                await updateAvaliacao({
                    uid,
                    petId: String(petId),
                    avaliacaoId: String(avaliacaoId),
                    payload,
                });

                const normalized = normalizeDraftAnamnese(String(petId), payload);

                setOriginal(normalized);
                dispatch(
                    replaceDraft({
                        petId: String(petId),
                        draft: normalized,
                    })
                );

                setEditing(false);

                Alert.alert("Anamnese", "Alterações salvas!");
                return;
            }

            await saveNewAvaliacao({
                uid,
                petId: String(petId),
                payload,
            });

            Alert.alert("Anamnese", "Registro criado!");

            dispatch(clearDraft({ petId: String(petId) }));

            router.replace({
                pathname: "/(modals)/pets/[id]/avaliacao",
                params: { id: String(petId) },
            });
        } catch (e) {
            console.log("save anamnese error", e);
            Alert.alert("Anamnese", "Não foi possível salvar.");
        } finally {
            setSaving(false);
        }
    }, [draft, isExisting, avaliacaoId, petId, dispatch]);

    const handleDelete = useCallback(() => {
        if (!isExisting) return;

        const uid = auth.currentUser?.uid;

        if (!uid) {
            Alert.alert("Anamnese", "Usuário não autenticado.");
            return;
        }

        Alert.alert(
            "Apagar anamnese",
            "Tem certeza que deseja apagar este registro?",
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Apagar",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await deleteAvaliacao({
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
                            console.log("delete anamnese error", e);
                            Alert.alert("Anamnese", "Não foi possível apagar.");
                        }
                    },
                },
            ]
        );
    }, [isExisting, petId, avaliacaoId, dispatch]);

    if (loading) {
        return (
            <>
                <Stack.Screen
                    options={{
                        title: "Anamnese",
                        headerBackTitleVisible: false,
                        headerLargeTitle: false,
                    }}
                />

                <View style={styles.loadingScreen}>
                    <ActivityIndicator />
                    <Text style={styles.loadingText}>Carregando anamnese…</Text>
                </View>
            </>
        );
    }

    const disabled = !editing;

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
                    title: editing ? "Editar anamnese" : "Anamnese",
                    headerLeft: () => {
                        if (isExisting && !editing) {
                            return (
                                <TouchableOpacity
                                    onPress={goBackToAvaliacaoList}
                                    style={styles.headerBack}
                                    hitSlop={10}
                                >
                                    <Ionicons name="chevron-back" size={22} color="#2563EB" />
                                    <Text style={styles.headerBackText}>Voltar</Text>
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
                                    <Text style={styles.cancelText}>Cancelar</Text>
                                </TouchableOpacity>
                            );
                        }

                        return (
                            <TouchableOpacity
                                onPress={cancelNew}
                                style={styles.headerButton}
                                hitSlop={10}
                            >
                                <Text style={styles.cancelText}>Cancelar</Text>
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
                                    <Text style={styles.editText}>Editar</Text>
                                </TouchableOpacity>
                            );
                        }

                        if (isExisting && editing) {
                            return (
                                <TouchableOpacity
                                    onPress={handleDelete}
                                    style={styles.headerButton}
                                    accessibilityLabel="Apagar anamnese"
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
                >
                    <SectionTitle>Título</SectionTitle>
                    <CardHighlight filled={isFilled(draft?.title)}>
                        <DisabledOverlay disabled={!editing}>
                            <TextInput
                                placeholder="Ex.: Anamnese inicial, retorno, pós-cirúrgica…"
                                placeholderTextColor="#9CA3AF"
                                value={draft?.title ?? ""}
                                onChangeText={updateTitle}
                                editable={editing}
                                style={[
                                    styles.titleInput,
                                    {
                                        opacity: editing ? 1 : 0.55,
                                        backgroundColor: editing ? "white" : "rgba(0,0,0,0.03)",
                                    },
                                ]}
                            />
                        </DisabledOverlay>
                    </CardHighlight>

                    <View style={{ marginTop: 16 }}>
                        <SectionTitle>1. Queixa principal</SectionTitle>
                        <LabeledTextArea
                            value={draft?.textos?.queixaPrincipal || ""}
                            onChangeText={(t) => updateTexto("queixaPrincipal", t)}
                            placeholder="Descreva a queixa principal do tutor em relação ao animal."
                            disabled={disabled}
                            minHeight={80}
                            filled={isFilled(draft?.textos?.queixaPrincipal)}
                        />
                    </View>

                    <SectionTitle>2. História da doença atual</SectionTitle>
                    <LabeledTextArea
                        value={draft?.textos?.historiaDoencaAtual || ""}
                        onChangeText={(t) => updateTexto("historiaDoencaAtual", t)}
                        placeholder="Evolução do quadro, início dos sinais, tratamentos prévios relacionados ao problema atual…"
                        disabled={disabled}
                        minHeight={100}
                        filled={isFilled(draft?.textos?.historiaDoencaAtual)}
                    />

                    <SectionTitle>3. Antecedentes médicos</SectionTitle>
                    <LabeledTextArea
                        label="Vacinas e vermífugos"
                        value={draft?.textos?.vacinasVermifugos || ""}
                        onChangeText={(t) => updateTexto("vacinasVermifugos", t)}
                        placeholder="Esquema vacinal e de vermifugação."
                        disabled={disabled}
                        filled={isFilled(draft?.textos?.vacinasVermifugos)}
                    />
                    <LabeledTextArea
                        label="Alimentação"
                        value={draft?.textos?.alimentacao || ""}
                        onChangeText={(t) => updateTexto("alimentacao", t)}
                        placeholder="Tipo de ração, caseiro, frequência, petiscos…"
                        disabled={disabled}
                        filled={isFilled(draft?.textos?.alimentacao)}
                    />
                    <LabeledTextArea
                        label="Hidratação"
                        value={draft?.textos?.hidratacao || ""}
                        onChangeText={(t) => updateTexto("hidratacao", t)}
                        placeholder="Ingestão de água, se bebe pouco/muito, uso de fontes, etc."
                        disabled={disabled}
                        filled={isFilled(draft?.textos?.hidratacao)}
                    />
                    <LabeledTextArea
                        label="Fezes e urina"
                        value={draft?.textos?.fezesUrina || ""}
                        onChangeText={(t) => updateTexto("fezesUrina", t)}
                        placeholder="Frequência, consistência, alterações observadas."
                        disabled={disabled}
                        filled={isFilled(draft?.textos?.fezesUrina)}
                    />
                    <LabeledTextArea
                        label="Medicações anteriores"
                        value={draft?.textos?.medicacoesAnteriores || ""}
                        onChangeText={(t) => updateTexto("medicacoesAnteriores", t)}
                        placeholder="Medicamentos usados anteriormente."
                        disabled={disabled}
                        filled={isFilled(draft?.textos?.medicacoesAnteriores)}
                    />
                    <LabeledTextArea
                        label="Medicações em uso"
                        value={draft?.textos?.medicacoesUso || ""}
                        onChangeText={(t) => updateTexto("medicacoesUso", t)}
                        placeholder="Medicamentos em uso atualmente."
                        disabled={disabled}
                        filled={isFilled(draft?.textos?.medicacoesUso)}
                    />
                    <LabeledTextArea
                        label="Histórico de neoplasias"
                        value={draft?.textos?.historicoNeoplasias || ""}
                        onChangeText={(t) => updateTexto("historicoNeoplasias", t)}
                        placeholder="Tipo, localização, tratamentos realizados, recidivas."
                        disabled={disabled}
                        filled={isFilled(draft?.textos?.historicoNeoplasias)}
                    />

                    <SectionTitle>4. Hábitos e rotina</SectionTitle>
                    <CardHighlight filled={groupHasTrue(draft?.habitos)}>
                        <DisabledOverlay disabled={disabled}>
                            {Object.entries(habitosLabels).map(([key, label]) => (
                                <CheckboxRow
                                    key={key}
                                    label={label}
                                    value={!!draft?.habitos?.[key]}
                                    onChange={(v) => updateHabito(key, v)}
                                    disabled={disabled}
                                />
                            ))}
                        </DisabledOverlay>
                    </CardHighlight>

                    <View style={{ height: 8 }} />

                    <LabeledTextArea
                        label="Local onde dorme"
                        value={draft?.textos?.localDormir || ""}
                        onChangeText={(t) => updateTexto("localDormir", t)}
                        placeholder="Cama, sofá, chão, dormitório do tutor, outro cômodo…"
                        disabled={disabled}
                        minHeight={60}
                        filled={isFilled(draft?.textos?.localDormir)}
                    />

                    <SectionTitle>5. Avaliação funcional</SectionTitle>
                    <CardHighlight filled={groupHasTrue(draft?.funcional)}>
                        <DisabledOverlay disabled={disabled}>
                            {Object.entries(funcionalLabels).map(([key, label]) => (
                                <CheckboxRow
                                    key={key}
                                    label={label}
                                    value={!!draft?.funcional?.[key]}
                                    onChange={(v) => updateFuncional(key, v)}
                                    disabled={disabled}
                                />
                            ))}
                        </DisabledOverlay>
                    </CardHighlight>

                    <SectionTitle>6. Avaliação da dor</SectionTitle>
                    <CardHighlight
                        filled={
                            isFilled(draft?.dor?.nivel) ||
                            isFilled(draft?.textos?.descricaoDor)
                        }
                    >
                        <DisabledOverlay disabled={disabled}>
                            <DorRadio
                                label="Intensidade da dor"
                                value={draft?.dor?.nivel || "leve"}
                                onChange={updateDorNivel}
                                disabled={disabled}
                            />

                            <View style={{ height: 8 }} />

                            <LabeledTextArea
                                label="Descrição da dor"
                                value={draft?.textos?.descricaoDor || ""}
                                onChangeText={updateDescricaoDor}
                                placeholder="Localização, tipo, fatores que pioram/melhoram…"
                                disabled={disabled}
                                minHeight={80}
                                filled={isFilled(draft?.textos?.descricaoDor)}
                            />
                        </DisabledOverlay>
                    </CardHighlight>

                    <SectionTitle>7. Expectativas do tutor</SectionTitle>
                    <CardHighlight filled={groupHasTrue(draft?.expectativas)}>
                        <DisabledOverlay disabled={disabled}>
                            {Object.entries(expectativasLabels).map(([key, label]) => (
                                <CheckboxRow
                                    key={key}
                                    label={label}
                                    value={!!draft?.expectativas?.[key]}
                                    onChange={(v) => updateExpectativa(key, v)}
                                    disabled={disabled}
                                />
                            ))}
                        </DisabledOverlay>
                    </CardHighlight>

                    <View style={{ height: 16 }} />

                    <SectionTitle>8. Observações gerais</SectionTitle>
                    <LabeledTextArea
                        value={draft?.textos?.observacoesGerais || ""}
                        onChangeText={(t) => updateTexto("observacoesGerais", t)}
                        placeholder="Informações adicionais relevantes para o plano fisioterapêutico."
                        disabled={disabled}
                        minHeight={100}
                        filled={isFilled(draft?.textos?.observacoesGerais)}
                    />
                </ScrollView>
            )}

            {editing && (
                <SafeAreaView edges={["bottom"]} style={styles.saveFooter}>
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
                                    <Text style={styles.saveButtonText}>Salvando…</Text>
                                </>
                            ) : (
                                <>
                                    <Ionicons name="checkmark" size={18} color="#fff" />
                                    <Text style={styles.saveButtonText}>Salvar</Text>
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
        paddingBottom: 4,
    },

    docGrid: {
        width: "100%",
    },

    docGridItem: {
        width: "100%",
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

    emptyBlock: {
        color: "#A1A1AA",
        fontStyle: "italic",
        fontWeight: "550",
        fontSize: 12.3,
        paddingBottom: 7,
    },

    selectedList: {
        borderRadius: 11,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: "rgba(22,163,74,0.10)",
        backgroundColor: "rgba(22,163,74,0.035)",
        marginBottom: 8,
    },

    selectedRow: {
        minHeight: 32,
        paddingHorizontal: 9,
        paddingVertical: 7,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFFFFF",
    },

    selectedRowBorder: {
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: "rgba(22,163,74,0.16)",
    },

    selectedIcon: {
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: "rgba(22,163,74,0.11)",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 8,
    },

    selectedText: {
        flex: 1,
        fontSize: 12.7,
        lineHeight: 17,
        color: "#166534",
        fontWeight: "750",
    },

    docInlineDivider: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: "rgba(0,0,0,0.07)",
        marginTop: 2,
        marginBottom: 10,
    },

    dorSummary: {
        marginBottom: 8,
    },

    dorPill: {
        alignSelf: "flex-start",
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 9,
        paddingVertical: 5,
        borderRadius: 999,
        backgroundColor: "rgba(37,99,235,0.08)",
        borderWidth: 1,
        borderColor: "rgba(37,99,235,0.13)",
        marginTop: 3,
    },

    dorPillText: {
        color: "#1D4ED8",
        fontWeight: "850",
        fontSize: 12,
        marginLeft: 5,
    },

    formContent: {
        padding: 16,
        paddingBottom: 160,
    },

    formSectionTitle: {
        fontWeight: "800",
        fontSize: 16,
        marginBottom: 2,
        marginTop: 8,
        color: "#111827",
    },

    formCard: {
        backgroundColor: "white",
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
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
        marginBottom: 7,
    },

    textAreaShell: {
        borderWidth: 1.5,
        borderRadius: 10,
    },

    textArea: {
        paddingHorizontal: 10,
        paddingVertical: 8,
        color: "#111827",
        fontWeight: "500",
    },

    checkboxRow: {
        minHeight: 42,
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: 10,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 7,

        borderWidth: 1,
        borderColor: "rgba(15,23,42,0.08)",
        backgroundColor: "#FFFFFF",
    },

    checkboxRowSelected: {
        backgroundColor: "rgba(22,163,74,0.035)",
        borderColor: "rgba(22,163,74,0.22)",
    },

    checkboxLabel: {
        flex: 1,
        color: "#111827",
        fontWeight: "550",
        fontSize: 14,
        marginRight: 10,
    },

    checkboxLabelSelected: {
        color: "#0F172A",
        fontWeight: "650",
    },

    checkboxBox: {
        width: 24,
        height: 24,
        borderRadius: 7,
        borderWidth: 2,
        borderColor: "#A3AFBF",
        backgroundColor: "#FFFFFF",
        alignItems: "center",
        justifyContent: "center",
    },

    checkboxBoxSelected: {
        borderColor: "#16A34A",
        backgroundColor: "rgba(22,163,74,0.10)",
    },

    radioWrap: {
        flexDirection: "row",
        flexWrap: "wrap",
    },

    radioChip: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 999,
        borderWidth: 1,
        marginRight: 8,
        marginBottom: 8,
    },

    radioChipText: {
        marginLeft: 8,
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
});