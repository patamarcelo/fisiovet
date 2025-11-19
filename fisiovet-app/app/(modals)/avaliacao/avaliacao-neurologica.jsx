// app/(modals)/avaliacao/avaliacao-neurologica.jsx
// @ts-nocheck
import { useEffect, useMemo, useState, useCallback } from 'react';
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
} from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';

import { ensureFirebase } from '@/firebase/firebase';
import {
    createDraft,
    updateDraftField,
    clearDraft,
    replaceDraft,
} from '@/src/store/slices/avaliacaoSlice';

// ---------- UI helpers ----------
function SectionTitle({ children }) {
    return (
        <Text
            style={{
                fontWeight: '800',
                fontSize: 16,
                marginBottom: 8,
                color: '#111827',
            }}
        >
            {children}
        </Text>
    );
}

function Card({ children, filled = false }) {
    return (
        <View
            style={{
                backgroundColor: 'white',
                borderRadius: 12,
                padding: 12,
                borderWidth: 1.5,
                borderColor: filled ? '#16A34A' : 'rgba(0,0,0,0.06)',
            }}
        >
            {children}
        </View>
    );
}

function DisabledOverlay({ disabled, children }) {
    if (!disabled) return children;
    return (
        <View style={{ opacity: 0.55 }}>
            <View pointerEvents="none">{children}</View>
        </View>
    );
}

/** TextArea com borda verde quando preenchido */
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
            {label ? (
                <Text
                    style={{
                        fontWeight: '600',
                        color: '#111827',
                        marginBottom: 6,
                    }}
                >
                    {label}
                </Text>
            ) : null}
            <View
                style={{
                    borderWidth: 1.5,
                    borderRadius: 10,
                    borderColor: filled ? '#16A34A' : 'rgba(0,0,0,0.15)',
                    backgroundColor: disabled ? 'rgba(0,0,0,0.03)' : 'white',
                    paddingHorizontal: 10,
                    paddingVertical: 8,
                }}
            >
                <TextInput
                    value={value}
                    onChangeText={onChangeText}
                    placeholder={placeholder}
                    placeholderTextColor="#9CA3AF"
                    editable={!disabled}
                    multiline
                    textAlignVertical="top"
                    style={{
                        minHeight,
                        color: '#111827',
                        opacity: disabled ? 0.6 : 1,
                    }}
                />
            </View>
        </View>
    );
}

/** Checkbox estilo linha com ícone, destaca verde quando marcado */
function CheckboxRow({ label, value, onChange, disabled }) {
    const filled = !!value;
    return (
        <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => (!disabled ? onChange(!value) : null)}
            style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 8,
            }}
        >
            <Ionicons
                name={value ? 'checkbox-outline' : 'square-outline'}
                size={20}
                color={filled ? '#16A34A' : '#9CA3AF'}
            />
            <Text
                style={{
                    marginLeft: 10,
                    color: '#111827',
                    fontWeight: filled ? '600' : '400',
                }}
            >
                {label}
            </Text>
        </TouchableOpacity>
    );
}

/** Grupo de chips-rádio horizontais */
function ChipRadioGroup({ label,subtitle, value, options, onChange, disabled }) {
    const filled = !!value;
    return (
        <View style={{ marginBottom: 10 }}>
            {label ? (
                <Text
                    style={{
                        fontWeight: '600',
                        color: '#111827',
                        marginBottom: 6,
                    }}
                >
                    {label}
                </Text>
            ) : null}
            {subtitle ? (
                <Text
                    style={{
                        fontWeight: '400',
                        color: '#111827',
                        marginBottom: 6,
                        fontSize: 8
                    }}
                >
                    {subtitle}
                </Text>
            ) : null}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {options.map((opt) => {
                    const selected = value === opt.value;
                    return (
                        <TouchableOpacity
                            key={opt.value}
                            disabled={disabled}
                            onPress={() => onChange(opt.value)}
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                paddingHorizontal: 12,
                                paddingVertical: 8,
                                borderRadius: 999,
                                borderWidth: 1.5,
                                borderColor: selected
                                    ? '#2563EB'
                                    : 'rgba(0,0,0,0.15)',
                                backgroundColor: selected
                                    ? 'rgba(37,99,235,0.08)'
                                    : 'white',
                                opacity: disabled ? 0.6 : 1,
                            }}
                        >
                            <Ionicons
                                name={
                                    selected
                                        ? 'radio-button-on'
                                        : 'radio-button-off'
                                }
                                size={16}
                                color={selected ? '#2563EB' : '#9CA3AF'}
                            />
                            <Text
                                style={{
                                    marginLeft: 6,
                                    color: '#111827',
                                    fontWeight: selected ? '700' : '500',
                                }}
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

// ---------- helpers Firestore ----------
async function fetchAvaliacaoNeurologica({
    firestore,
    uid,
    petId,
    avaliacaoId,
}) {
    const ref = firestore
        .collection('users')
        .doc(String(uid))
        .collection('pets')
        .doc(String(petId))
        .collection('avaliacoes')
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
        .collection('users')
        .doc(String(uid))
        .collection('pets')
        .doc(String(petId))
        .collection('avaliacoes');

    const ref = col.doc();
    const now = firestoreModule.FieldValue.serverTimestamp();

    await ref.set({
        ...payload,
        createdAt: now,
        updatedAt: now,
        type: 'neurologica',
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
        .collection('users')
        .doc(String(uid))
        .collection('pets')
        .doc(String(petId))
        .collection('avaliacoes')
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
        .collection('users')
        .doc(String(uid))
        .collection('pets')
        .doc(String(petId))
        .collection('avaliacoes')
        .doc(String(avaliacaoId));

    await ref.delete();
}

/** Normaliza dados vindos do Firestore para o draft neurológico */
function normalizeNeurologicaDraft(petId, docData) {
    const base = {
        id: docData?.id,
        petId,
        title: '',
        tipo: 'neurologica',
        estadoMental: {
            nivelConsciencia: 'alerta', // alerta, depressao, estupor, coma
            comportamento: 'normal', // normal, delirium, demencia, headPress
        },
        textos: {
            postura: '',
            marcha: '',
            reacoesPosturais: '',
            descricaoDor: '',
            observacoesGerais: '',
        },
        nervosCranianos: {
            olfatorio: 'normal',
            optico: 'normal',
            oculomotorTroclear: 'normal',
            trigemeo: 'normal',
            abducente: 'normal',
            facial: 'normal',
            vestibulococlear: 'normal',
            glossoVago: 'normal',
            acessorio: 'normal',
            hipoglosso: 'normal',
        },
        reflexos: {
            patelar: 'normal',
            flexor: 'normal',
            extensorCruzado: 'normal',
            perineal: 'normal',
            cutaneoTronco: 'normal',
        },
        sensibilidade: {
            superficial: 'normal',
            profunda: 'normal',
        },
    };

    const fields = docData?.fields || {};
    return {
        ...base,
        title: docData?.title ?? '',
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

// ---------- TELA ----------
export default function AvaliacaoNeurologicaScreen() {
    const { id: petId, avaliacaoId } = useLocalSearchParams();
    const dispatch = useDispatch();
    const { auth, firestore, firestoreModule } =
        ensureFirebase() || {};

    const isExisting = !!avaliacaoId;
    const draft = useSelector(
        (s) => s.avaliacao?.draftsByPet?.[petId]
    );

    const [editing, setEditing] = useState(!isExisting);
    const [loading, setLoading] = useState(isExisting);
    const [saving, setSaving] = useState(false);
    const [original, setOriginal] = useState(null);

    // cria draft vazio se novo
    useEffect(() => {
        if (!petId) return;
        if (!isExisting && !draft) {
            dispatch(
                createDraft({ petId: String(petId) })
            );
        }
    }, [dispatch, petId, isExisting, draft]);

    // carrega doc existente
    useEffect(() => {
        (async () => {
            if (
                !isExisting ||
                !firestore ||
                !auth?.currentUser?.uid
            )
                return;
            try {
                setLoading(true);
                const uid = auth.currentUser.uid;
                const doc = await fetchAvaliacaoNeurologica({
                    firestore,
                    uid,
                    petId: String(petId),
                    avaliacaoId: String(avaliacaoId),
                });
                const seed = normalizeNeurologicaDraft(
                    String(petId),
                    doc
                );
                setOriginal(seed);
                dispatch(
                    replaceDraft({
                        petId: String(petId),
                        draft: seed,
                    })
                );
            } catch (e) {
                console.log(
                    'fetch neurologica error',
                    e
                );
                Alert.alert(
                    'Avaliação neurológica',
                    'Não foi possível carregar.'
                );
                router.back();
            } finally {
                setLoading(false);
            }
        })();
    }, [
        isExisting,
        firestore,
        auth,
        petId,
        avaliacaoId,
        dispatch,
    ]);

    // helpers de update (sempre sobrescrevem o objeto da seção)
    const updateTitle = useCallback(
        (text) => {
            dispatch(
                updateDraftField({
                    petId: String(petId),
                    path: ['title'],
                    value: text,
                })
            );
        },
        [dispatch, petId]
    );

    const updateEstadoMental = useCallback(
        (field, val) => {
            const atual =
                draft?.estadoMental || {};
            dispatch(
                updateDraftField({
                    petId: String(petId),
                    path: ['estadoMental'],
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
                    path: ['textos'],
                    value: { ...atual, [field]: val },
                })
            );
        },
        [dispatch, petId, draft?.textos]
    );

    const updateNervo = useCallback(
        (field, val) => {
            const atual =
                draft?.nervosCranianos || {};
            dispatch(
                updateDraftField({
                    petId: String(petId),
                    path: ['nervosCranianos'],
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
                    path: ['reflexos'],
                    value: { ...atual, [field]: val },
                })
            );
        },
        [dispatch, petId, draft?.reflexos]
    );

    const updateSensibilidade = useCallback(
        (field, val) => {
            const atual =
                draft?.sensibilidade || {};
            dispatch(
                updateDraftField({
                    petId: String(petId),
                    path: ['sensibilidade'],
                    value: { ...atual, [field]: val },
                })
            );
        },
        [dispatch, petId, draft?.sensibilidade]
    );

    const handleSave = useCallback(async () => {
        try {
            if (!draft) return;
            if (!auth?.currentUser?.uid) {
                return Alert.alert(
                    'Avaliação neurológica',
                    'Usuário não autenticado.'
                );
            }
            const uid = auth.currentUser.uid;
            setSaving(true);

            const payload = {
                title: draft.title?.trim() || '',
                type: 'neurologica',
                petId: String(petId),
                fields: {
                    estadoMental: draft.estadoMental || {},
                    textos: draft.textos || {},
                    nervosCranianos:
                        draft.nervosCranianos || {},
                    reflexos: draft.reflexos || {},
                    sensibilidade:
                        draft.sensibilidade || {},
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
                setOriginal(
                    normalizeNeurologicaDraft(
                        String(petId),
                        payload
                    )
                );
                setEditing(false);
                Alert.alert(
                    'Avaliação neurológica',
                    'Alterações salvas!'
                );
            } else {
                await saveNewNeurologica({
                    firestore,
                    firestoreModule,
                    uid,
                    petId: String(petId),
                    payload,
                });
                Alert.alert(
                    'Avaliação neurológica',
                    'Registro criado!'
                );
            }

            // volta para a timeline/lista de avaliações
            router.replace({
                pathname:
                    '/(phone)/pacientes/[id]/avaliacao',
                params: { id: String(petId) },
            });
            dispatch(
                clearDraft({ petId: String(petId) })
            );
        } catch (e) {
            console.log('save neuro error', e);
            Alert.alert(
                'Avaliação neurológica',
                'Não foi possível salvar.'
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
                'Avaliação neurológica',
                'Usuário não autenticado.'
            );
            return;
        }
        Alert.alert(
            'Apagar avaliação',
            'Tem certeza que deseja apagar este registro?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Apagar',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteNeurologica({
                                firestore,
                                uid,
                                petId: String(petId),
                                avaliacaoId: String(avaliacaoId),
                            });
                            dispatch(
                                clearDraft({ petId: String(petId) })
                            );
                            router.replace({
                                pathname:
                                    '/(phone)/pacientes/[id]/avaliacao',
                                params: { id: String(petId) },
                            });
                        } catch (e) {
                            console.log(
                                'delete neuro error',
                                e
                            );
                            Alert.alert(
                                'Avaliação neurológica',
                                'Não foi possível apagar.'
                            );
                        }
                    },
                },
            ]
        );
    }, [
        isExisting,
        auth,
        firestore,
        petId,
        avaliacaoId,
        dispatch,
    ]);

    if (loading) {
        return (
            <View
                style={{
                    flex: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#F3F4F6',
                }}
            >
                <ActivityIndicator />
            </View>
        );
    }

    const disabled = !editing;

    // grupos para UI
    const algumHabEstado =
        !!draft?.estadoMental?.nivelConsciencia ||
        !!draft?.estadoMental?.comportamento;

    const algumNervoPreenchido =
        draft?.nervosCranianos &&
        Object.values(
            draft.nervosCranianos
        ).some((v) => !!v && v !== 'normal');

    const algumReflexoAlterado =
        draft?.reflexos &&
        Object.values(draft.reflexos).some(
            (v) => !!v && v !== 'normal'
        );

    const algumaSensibilidade =
        draft?.sensibilidade &&
        Object.values(
            draft.sensibilidade
        ).some((v) => !!v && v !== 'normal');

    return (
        <KeyboardAvoidingView
            behavior={Platform.select({
                ios: 'padding',
                android: undefined,
            })}
            style={{
                flex: 1,
                backgroundColor: '#F3F4F6',
            }}
        >
            <Stack.Screen
                options={{
                    title: 'Avaliação Neurológica',
                    headerLeft: () => {
                        if (isExisting) {
                            if (!editing) {
                                return (
                                    <TouchableOpacity
                                        onPress={() =>
                                            setEditing(true)
                                        }
                                        style={{
                                            paddingHorizontal: 8,
                                        }}
                                    >
                                        <Text
                                            style={{
                                                color: '#2563EB',
                                                fontWeight: '700',
                                            }}
                                        >
                                            Editar
                                        </Text>
                                    </TouchableOpacity>
                                );
                            }
                            return (
                                <TouchableOpacity
                                    onPress={() => {
                                        setEditing(false);
                                        if (original)
                                            dispatch(
                                                replaceDraft({
                                                    petId: String(petId),
                                                    draft: original,
                                                })
                                            );
                                    }}
                                    style={{
                                        paddingHorizontal: 8,
                                    }}
                                >
                                    <Text
                                        style={{
                                            color: '#FF3B30',
                                            fontWeight: '700',
                                        }}
                                    >
                                        Cancelar
                                    </Text>
                                </TouchableOpacity>
                            );
                        }
                        return (
                            <TouchableOpacity
                                onPress={() => {
                                    dispatch(
                                        clearDraft({
                                            petId: String(petId),
                                        })
                                    );
                                    router.back();
                                }}
                                style={{
                                    paddingHorizontal: 8,
                                }}
                            >
                                <Text
                                    style={{
                                        color: '#FF3B30',
                                        fontWeight: '700',
                                    }}
                                >
                                    Cancelar
                                </Text>
                            </TouchableOpacity>
                        );
                    },
                    headerRight: () =>
                        isExisting && editing ? (
                            <TouchableOpacity
                                onPress={handleDelete}
                                style={{
                                    paddingHorizontal: 8,
                                }}
                                accessibilityLabel="Apagar avaliação"
                                hitSlop={10}
                            >
                                <Ionicons
                                    name="trash-outline"
                                    size={22}
                                    color="#FF3B30"
                                />
                            </TouchableOpacity>
                        ) : null,
                }}
            />

            <ScrollView
                contentContainerStyle={{
                    padding: 16,
                    paddingBottom: 140,
                    paddingRight: 8,   // ← espaço extra p/ a barra aparecer melhor

                }}
                keyboardShouldPersistTaps="handled"
                onScrollBeginDrag={Keyboard.dismiss}
                showsVerticalScrollIndicator={true}
                indicatorStyle="black"  // OU "white"
                scrollEventThrottle={16}
                
            >
                {/* Título opcional */}
                <SectionTitle>Título</SectionTitle>
                <Card
                    filled={
                        !!draft?.title?.trim?.()
                    }
                >
                    <DisabledOverlay disabled={!editing}>
                        <TextInput
                            placeholder="Ex.: Exame neurológico inicial, retorno, pós-cirúrgico…"
                            placeholderTextColor="#9CA3AF"
                            value={draft?.title ?? ''}
                            onChangeText={updateTitle}
                            editable={editing}
                            style={{
                                height: 44,
                                color: '#111827',
                                opacity: editing ? 1 : 0.55,
                            }}
                        />
                    </DisabledOverlay>
                </Card>

                {/* 1. Estado mental / Consciência / Comportamento */}
                <View style={{ marginTop: 16 }}>
                    <SectionTitle>
                        1. Estado Mental e Consciência
                    </SectionTitle>
                    <Card filled={algumHabEstado}>
                        <DisabledOverlay disabled={disabled}>
                            <ChipRadioGroup
                                label="Nível de consciência"
                                subtitle="Córtex, Tronco"
                                value={
                                    draft?.estadoMental
                                        ?.nivelConsciencia || 'alerta'
                                }
                                onChange={(val) =>
                                    updateEstadoMental(
                                        'nivelConsciencia',
                                        val
                                    )
                                }
                                disabled={disabled}
                                options={[
                                    {
                                        label: 'Alerta',
                                        value: 'alerta',
                                    },
                                    {
                                        label: 'Delírio',
                                        value: 'delirium',
                                    },
                                    {
                                        label: 'Estupor',
                                        value: 'estupor',
                                    },
                                    {
                                        label: 'Coma',
                                        value: 'coma',
                                    },
                                ]}
                            />
                            <ChipRadioGroup
                                label="Comportamento"
                                subtitle="Talamo, Córtex"
                                value={
                                    draft?.estadoMental
                                        ?.comportamento || 'normal'
                                }
                                onChange={(val) =>
                                    updateEstadoMental(
                                        'comportamento',
                                        val
                                    )
                                }
                                disabled={disabled}
                                options={[
                                    {
                                        label: 'Normal',
                                        value: 'normal',
                                    },
                                    {
                                        label: 'Delírio',
                                        value: 'delirium',
                                    },
                                    {
                                        label: 'Demência',
                                        value: 'demencia',
                                    },
                                    {
                                        label: 'Head press',
                                        value: 'headPress',
                                    },
                                ]}
                            />
                        </DisabledOverlay>
                    </Card>
                </View>

                {/* 2. Postura / Marcha / Reações posturais */}
                <View style={{ marginTop: 16 }}>
                    <SectionTitle>
                        2. Postura, Marcha e Reações
                    </SectionTitle>
                    <LabeledTextArea
                        label="Postura"
                        value={
                            draft?.textos?.postura || ''
                        }
                        onChangeText={(t) =>
                            updateTexto('postura', t)
                        }
                        placeholder="Cabeça, tronco, membros; posturas anormais (opistótono, escoliose, etc.)"
                        disabled={disabled}
                        minHeight={80}
                    />
                    <LabeledTextArea
                        label="Marcha / Locomoção"
                        value={
                            draft?.textos?.marcha || ''
                        }
                        onChangeText={(t) =>
                            updateTexto('marcha', t)
                        }
                        placeholder="Ataxia, paresia, plegia, andar em círculos, tropeços, queda, etc."
                        disabled={disabled}
                        minHeight={90}
                    />
                    <LabeledTextArea
                        label="Reações posturais"
                        value={
                            draft?.textos
                                ?.reacoesPosturais || ''
                        }
                        onChangeText={(t) =>
                            updateTexto(
                                'reacoesPosturais',
                                t
                            )
                        }
                        placeholder="Propriocepção consciente, salto em três patas, empurrar lateral, wheelbarrowing…"
                        disabled={disabled}
                        minHeight={90}
                    />
                </View>

                {/* 3. Nervos cranianos */}
                <View style={{ marginTop: 16 }}>
                    <SectionTitle>
                        3. Nervos Cranianos
                    </SectionTitle>
                    <Card filled={algumNervoPreenchido}>
                        <DisabledOverlay disabled={disabled}>
                            {[
                                {
                                    key: 'olfatorio',
                                    label: 'I - Olfatório',
                                },
                                {
                                    key: 'optico',
                                    label: 'II - Óptico',
                                },
                                {
                                    key: 'oculomotorTroclear',
                                    label:
                                        'III/IV/VI - Oculomotor / Troclear / Abducente',
                                },
                                {
                                    key: 'trigemeo',
                                    label: 'V - Trigêmeo',
                                },
                                {
                                    key: 'facial',
                                    label: 'VII - Facial',
                                },
                                {
                                    key: 'vestibulococlear',
                                    label:
                                        'VIII - Vestibulococlear',
                                },
                                {
                                    key: 'glossoVago',
                                    label:
                                        'IX/X - Glossofaríngeo / Vago',
                                },
                                {
                                    key: 'acessorio',
                                    label:
                                        'XI - Acessório espinal',
                                },
                                {
                                    key: 'hipoglosso',
                                    label: 'XII - Hipoglosso',
                                },
                            ].map((n) => (
                                <View
                                    key={n.key}
                                    style={{
                                        marginBottom: 8,
                                    }}
                                >
                                    <ChipRadioGroup
                                        label={n.label}
                                        value={
                                            draft
                                                ?.nervosCranianos?.[
                                            n.key
                                            ] || 'normal'
                                        }
                                        onChange={(val) =>
                                            updateNervo(
                                                n.key,
                                                val
                                            )
                                        }
                                        disabled={disabled}
                                        options={[
                                            {
                                                label: 'Normal',
                                                value: 'normal',
                                            },
                                            {
                                                label: 'Alterado',
                                                value: 'alterado',
                                            },
                                            {
                                                label: 'Ausente',
                                                value: 'ausente',
                                            },
                                        ]}
                                    />
                                </View>
                            ))}
                        </DisabledOverlay>
                    </Card>
                </View>

                {/* 4. Reflexos espinhais */}
                <View style={{ marginTop: 16 }}>
                    <SectionTitle>
                        4. Reflexos Espinhais
                    </SectionTitle>
                    <Card filled={algumReflexoAlterado}>
                        <DisabledOverlay disabled={disabled}>
                            {[
                                {
                                    key: 'patelar',
                                    label: 'Patelar',
                                },
                                {
                                    key: 'flexor',
                                    label: 'Flexor (retirada)',
                                },
                                {
                                    key: 'extensorCruzado',
                                    label: 'Extensor cruzado',
                                },
                                {
                                    key: 'perineal',
                                    label: 'Perineal',
                                },
                                {
                                    key: 'cutaneoTronco',
                                    label: 'Cutâneo do tronco',
                                },
                            ].map((r) => (
                                <View
                                    key={r.key}
                                    style={{
                                        marginBottom: 8,
                                    }}
                                >
                                    <ChipRadioGroup
                                        label={r.label}
                                        value={
                                            draft
                                                ?.reflexos?.[r.key] ||
                                            'normal'
                                        }
                                        onChange={(val) =>
                                            updateReflexo(
                                                r.key,
                                                val
                                            )
                                        }
                                        disabled={disabled}
                                        options={[
                                            {
                                                label: 'Diminuído',
                                                value: 'diminuido',
                                            },
                                            {
                                                label: 'Normal',
                                                value: 'normal',
                                            },
                                            {
                                                label: 'Aumentado',
                                                value: 'aumentado',
                                            },
                                            {
                                                label: 'Ausente',
                                                value: 'ausente',
                                            },
                                        ]}
                                    />
                                </View>
                            ))}
                        </DisabledOverlay>
                    </Card>
                </View>

                {/* 5. Avaliação sensitiva */}
                <View style={{ marginTop: 16 }}>
                    <SectionTitle>
                        5. Avaliação Sensitiva
                    </SectionTitle>
                    <Card filled={algumaSensibilidade}>
                        <DisabledOverlay disabled={disabled}>
                            <ChipRadioGroup
                                label="Sensibilidade superficial"
                                value={
                                    draft?.sensibilidade
                                        ?.superficial || 'normal'
                                }
                                onChange={(val) =>
                                    updateSensibilidade(
                                        'superficial',
                                        val
                                    )
                                }
                                disabled={disabled}
                                options={[
                                    {
                                        label: 'Normal',
                                        value: 'normal',
                                    },
                                    {
                                        label:
                                            'Diminuída / alterada',
                                        value: 'diminuida',
                                    },
                                    {
                                        label: 'Ausente',
                                        value: 'ausente',
                                    },
                                ]}
                            />
                            <ChipRadioGroup
                                label="Sensibilidade profunda"
                                value={
                                    draft?.sensibilidade
                                        ?.profunda || 'normal'
                                }
                                onChange={(val) =>
                                    updateSensibilidade(
                                        'profunda',
                                        val
                                    )
                                }
                                disabled={disabled}
                                options={[
                                    {
                                        label: 'Normal',
                                        value: 'normal',
                                    },
                                    {
                                        label:
                                            'Diminuída / alterada',
                                        value: 'diminuida',
                                    },
                                    {
                                        label: 'Ausente',
                                        value: 'ausente',
                                    },
                                ]}
                            />
                        </DisabledOverlay>
                    </Card>
                </View>

                {/* 6. Observações gerais */}
                <View style={{ marginTop: 16 }}>
                    <SectionTitle>
                        6. Observações Gerais
                    </SectionTitle>
                    <LabeledTextArea
                        label=""
                        value={
                            draft?.textos
                                ?.observacoesGerais || ''
                        }
                        onChangeText={(t) =>
                            updateTexto(
                                'observacoesGerais',
                                t
                            )
                        }
                        placeholder="Integração dos achados neurológicos, suspeita de localização da lesão (ex.: C1–C5, T3–L3, etc.), diagnósticos diferenciais e observações importantes."
                        disabled={disabled}
                        minHeight={110}
                    />
                </View>
            </ScrollView>

            {/* Botão fixo de salvar */}
            {editing && (
                <SafeAreaView
                    style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'white',
                        borderTopWidth: 1,
                        borderTopColor: 'rgba(0,0,0,0.08)',
                    }}
                >
                    <View style={{ padding: 12 }}>
                        <TouchableOpacity
                            onPress={handleSave}
                            style={{
                                backgroundColor: '#2563EB',
                                height: 48,
                                borderRadius: 12,
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexDirection: 'row',
                            }}
                        >
                            {saving ? (
                                <>
                                    <ActivityIndicator color="#fff" />
                                    <Text
                                        style={{
                                            color: 'white',
                                            fontWeight: '700',
                                            marginLeft: 10,
                                        }}
                                    >
                                        Salvando…
                                    </Text>
                                </>
                            ) : (
                                <>
                                    <Ionicons
                                        name="checkmark"
                                        size={18}
                                        color="#fff"
                                    />
                                    <Text
                                        style={{
                                            color: 'white',
                                            fontWeight: '700',
                                            marginLeft: 6,
                                        }}
                                    >
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
