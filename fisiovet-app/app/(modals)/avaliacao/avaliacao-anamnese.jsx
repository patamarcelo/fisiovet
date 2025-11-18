// app/(modals)/avaliacao/avaliacao-anamnese.jsx
// @ts-nocheck
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Switch,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Alert,
    Keyboard,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
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

/* ---------- UI helpers ---------- */
function SectionTitle({ children }) {
    return (
        <Text
            style={{
                fontWeight: '800',
                fontSize: 16,
                marginBottom: 2,
                marginTop: 8,
                color: '#111827',
            }}
        >
            {children}
        </Text>
    );
}

function Card({ children }) {
    return (
        <View
            style={{
                backgroundColor: 'white',
                borderRadius: 12,
                padding: 12,
                borderWidth: 1,
                borderColor: 'rgba(0,0,0,0.06)',
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
            {!!label && (
                <Text style={{ fontWeight: '600', color: '#111827', marginBottom: 4 }}>
                    {label}
                </Text>
            )}
            <View
                style={{
                    borderWidth: 1.5,
                    borderRadius: 10,
                    borderColor: filled ? '#16A34A' : 'rgba(0,0,0,0.15)',
                    backgroundColor: disabled ? 'rgba(0,0,0,0.03)' : 'white',
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
                        paddingHorizontal: 10,
                        paddingVertical: 8,
                        color: '#111827',
                        opacity: disabled ? 0.55 : 1,
                    }}
                />
            </View>
        </View>
    );
}


function CheckboxRow({ label, value, onChange, disabled }) {
    return (
        <View
            style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingVertical: 10,
                borderRadius: 8,
                paddingHorizontal: 4,
                backgroundColor: value ? 'rgba(22,163,74,0.06)' : 'transparent',
            }}
        >
            <Text style={{ color: '#111827' }}>{label}</Text>
            <TouchableOpacity
                onPress={() => !disabled && onChange(!value)}
                disabled={disabled}
                style={{
                    width: 24,
                    height: 24,
                    borderRadius: 6,
                    borderWidth: 2,
                    borderColor: value ? '#16A34A' : '#9CA3AF',
                    backgroundColor: value ? 'rgba(22,163,74,0.15)' : 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: disabled ? 0.5 : 1,
                }}
            >
                {value && <Ionicons name="checkmark" size={16} color="#16A34A" />}
            </TouchableOpacity>
        </View>
    );
}


function DorRadio({ label, value, onChange, disabled }) {
    const options = [
        { key: 'leve', text: 'Leve' },
        { key: 'moderada', text: 'Moderada' },
        { key: 'intensa', text: 'Intensa' },
    ];

    return (
        <View style={{ marginBottom: 8 }}>
            <Text
                style={{
                    fontWeight: '600',
                    color: '#111827',
                    marginBottom: 8,
                }}
            >
                {label}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {options.map((opt) => {
                    const selected = value === opt.key;
                    return (
                        <TouchableOpacity
                            key={opt.key}
                            onPress={() => !disabled && onChange(opt.key)}
                            activeOpacity={0.9}
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                paddingVertical: 8,
                                paddingHorizontal: 12,
                                borderRadius: 999,
                                borderWidth: 1,
                                borderColor: selected ? '#2563EB' : 'rgba(0,0,0,0.12)',
                                backgroundColor: selected ? 'rgba(37,99,235,0.08)' : 'white',
                                opacity: disabled ? 0.6 : 1,
                            }}
                            disabled={disabled}
                        >
                            <Ionicons
                                name={
                                    selected ? 'radio-button-on' : 'radio-button-off'
                                }
                                size={18}
                                color={selected ? '#2563EB' : '#9CA3AF'}
                            />
                            <Text
                                style={{
                                    marginLeft: 8,
                                    color: '#111827',
                                    fontWeight: selected ? '700' : '500',
                                }}
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

/* ---------- helpers Firestore ---------- */
async function fetchAvaliacao({ firestore, uid, petId, avaliacaoId }) {
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

export async function saveNewAvaliacao({
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
        type: 'avaliacao', // tipo "macro"
    });

    return ref.id;
}

export async function updateAvaliacao({
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

async function deleteAvaliacao({
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

function normalizeDraftAnamnese(petId, docData) {
    const base = {
        title: 'Anamnese – Fisioterapia',
        tipo: 'anamnese',
        textos: {
            queixaPrincipal: '',
            historiaDoencaAtual: '',
            vacinasVermifugos: '',
            alimentacao: '',
            hidratacao: '',
            fezesUrina: '',
            medicacoesAnteriores: '',
            medicacoesUso: '',
            historicoNeoplasias: '',
            localDormir: '',
            descricaoDor: '',
            observacoesGerais: '',
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
            nivel: 'leve',
            // leve / moderada / intensa
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
    if (typeof v === 'string') return v.trim().length > 0;
    return !!v;
};

const groupHasTrue = (obj) => {
    if (!obj || typeof obj !== 'object') return false;
    return Object.values(obj).some(Boolean);
};


function CardHighlight({ filled, children }) {
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

/* ---------- TELA (Anamnese) ---------- */
export default function AnamneseFormScreen() {
    const { id: petId, avaliacaoId } = useLocalSearchParams();
    const dispatch = useDispatch();
    const { auth, firestore, firestoreModule } = ensureFirebase() || {};

    const draft = useSelector(
        (s) => s.avaliacao?.draftsByPet?.[petId]
    );

    const isExisting = !!avaliacaoId;
    const [editing, setEditing] = useState(!isExisting);
    const [loading, setLoading] = useState(isExisting);
    const [saving, setSaving] = useState(false);
    const [original, setOriginal] = useState(null);

    // Seed do draft para NOVO (sempre garante o shape da anamnese)
    useEffect(() => {
        if (!petId) return;
        if (!isExisting && !draft) {
            const seed = normalizeDraftAnamnese(String(petId), null);
            dispatch(
                replaceDraft({ petId: String(petId), draft: seed })
            );
        }
    }, [dispatch, petId, isExisting, draft]);

    // Se for existente, busca e popula draft
    useEffect(() => {
        (async () => {
            if (!isExisting || !firestore || !auth?.currentUser?.uid)
                return;
            try {
                setLoading(true);
                const uid = auth.currentUser.uid;
                const doc = await fetchAvaliacao({
                    firestore,
                    uid,
                    petId: String(petId),
                    avaliacaoId: String(avaliacaoId),
                });

                const seed = normalizeDraftAnamnese(
                    String(petId),
                    doc || {}
                );
                setOriginal(seed);
                dispatch(
                    replaceDraft({
                        petId: String(petId),
                        draft: seed,
                    })
                );
            } catch (e) {
                console.log('fetch anamnese error', e);
                Alert.alert('Anamnese', 'Não foi possível carregar.');
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

    /* ------- Atualizadores de campos ------- */
    const updateTexto = useCallback(
        (field, value) => {
            dispatch(
                updateDraftField({
                    petId: String(petId),
                    path: ['textos', field],
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
                    path: ['habitos', field],
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
                    path: ['funcional', field],
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
                    path: ['dor', 'nivel'],
                    value: nivel,
                })
            );
        },
        [dispatch, petId]
    );

    const updateDescricaoDor = useCallback(
        (text) => {
            updateTexto('descricaoDor', text);
        },
        [updateTexto]
    );

    const updateExpectativa = useCallback(
        (field, value) => {
            dispatch(
                updateDraftField({
                    petId: String(petId),
                    path: ['expectativas', field],
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
                    path: ['title'],
                    value: text,
                })
            );
        },
        [dispatch, petId]
    );

    const handleSave = useCallback(async () => {
        try {
            if (!draft) return;
            if (!auth?.currentUser?.uid)
                return Alert.alert(
                    'Anamnese',
                    'Usuário não autenticado.'
                );
            const uid = auth.currentUser.uid;

            setSaving(true);

            const payload = {
                title: draft.title?.trim() || 'Anamnese – Fisioterapia',
                tipo: 'anamnese', // 👈 sub-tipo da avaliação
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
                    firestore,
                    firestoreModule,
                    uid,
                    petId: String(petId),
                    avaliacaoId: String(avaliacaoId),
                    payload,
                });
                setOriginal(
                    normalizeDraftAnamnese(String(petId), {
                        ...payload,
                    })
                );
                setEditing(false);
                Alert.alert('Anamnese', 'Alterações salvas!');
            } else {
                await saveNewAvaliacao({
                    firestore,
                    firestoreModule,
                    uid,
                    petId: String(petId),
                    payload,
                });
                Alert.alert('Anamnese', 'Registro criado!');
            }

            // Volta para a lista de avaliações do pet
            dispatch(clearDraft({ petId: String(petId) }));
            router.replace({
                pathname: '/(phone)/pacientes/[id]/avaliacao',
                params: { id: String(petId) },
            });
        } catch (e) {
            console.log('save anamnese error', e);
            Alert.alert('Anamnese', 'Não foi possível salvar.');
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
            Alert.alert('Anamnese', 'Usuário não autenticado.');
            return;
        }
        Alert.alert(
            'Apagar anamnese',
            'Tem certeza que deseja apagar este registro?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Apagar',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteAvaliacao({
                                firestore,
                                uid,
                                petId: String(petId),
                                avaliacaoId: String(avaliacaoId),
                            });
                            dispatch(clearDraft({ petId: String(petId) }));
                            router.replace({
                                pathname:
                                    '/(phone)/pacientes/[id]/avaliacao',
                                params: { id: String(petId) },
                            });
                        } catch (e) {
                            console.log('delete anamnese error', e);
                            Alert.alert(
                                'Anamnese',
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

    return (
        <KeyboardAvoidingView
            behavior={Platform.select({
                ios: 'padding',
                android: undefined,
            })}
            style={{ flex: 1, backgroundColor: '#F3F4F6' }}
        >
            <Stack.Screen
                options={{
                    title: 'Anamnese',
                    headerLeft: () => {
                        if (isExisting) {
                            if (!editing) {
                                return (
                                    <TouchableOpacity
                                        onPress={() => setEditing(true)}
                                        style={{ paddingHorizontal: 8 }}
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
                                    style={{ paddingHorizontal: 8 }}
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
                        // novo
                        return (
                            <TouchableOpacity
                                onPress={() => {
                                    dispatch(clearDraft({ petId: String(petId) }));
                                    router.back();
                                }}
                                style={{ paddingHorizontal: 8 }}
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
                                style={{ paddingHorizontal: 8 }}
                                accessibilityLabel="Apagar anamnese"
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
                            paddingBottom: 450,
                        }}
                        keyboardShouldPersistTaps="handled"
                        onScrollBeginDrag={Keyboard.dismiss}
                    >
                        {/* Título opcional */}
                        <SectionTitle>Título</SectionTitle>
                        <CardHighlight filled={isFilled(draft?.title)}>
                            <DisabledOverlay disabled={!editing}>
                                <TextInput
                                    placeholder="Ex.: Anamnese inicial, retorno, pós-cirúrgica…"
                                    placeholderTextColor="#9CA3AF"
                                    value={draft?.title ?? ''}
                                    onChangeText={updateTitle}
                                    editable={editing}
                                    style={{
                                        height: 44,
                                        color: '#111827',
                                        opacity: editing ? 1 : 0.55,
                                        // borderWidth: 1.5,
                                        // borderRadius: 10,
                                        // paddingHorizontal: 10,
                                        backgroundColor: editing ? 'white' : 'rgba(0,0,0,0.03)',
                                    }}
                                />
                            </DisabledOverlay>
                        </CardHighlight>

                        {/* 2. Queixa Principal */}
                        <View style={{ marginTop: 16 }}>
                            <SectionTitle>2. Queixa Principal</SectionTitle>
                            <LabeledTextArea
                                label=""
                                value={draft?.textos?.queixaPrincipal || ''}
                                onChangeText={(t) => updateTexto('queixaPrincipal', t)}
                                placeholder="Descreva a queixa principal do tutor em relação ao animal."
                                disabled={disabled}
                                minHeight={80}
                                filled={isFilled(draft?.textos?.queixaPrincipal)}
                            />
                        </View>

                        {/* 3. História da Doença Atual */}
                        <SectionTitle>3. História da Doença Atual</SectionTitle>
                        <LabeledTextArea
                            label=""
                            value={draft?.textos?.historiaDoencaAtual || ''}
                            onChangeText={(t) => updateTexto('historiaDoencaAtual', t)}
                            placeholder="Evolução do quadro, início dos sinais, tratamentos prévios relacionados ao problema atual…"
                            disabled={disabled}
                            minHeight={100}
                            filled={isFilled(draft?.textos?.historiaDoencaAtual)}
                        />

                        {/* 4. Antecedentes Médicos */}
                        <SectionTitle>4. Antecedentes Médicos</SectionTitle>
                        <LabeledTextArea
                            label="Vacinas e vermífugos"
                            value={draft?.textos?.vacinasVermifugos || ''}
                            onChangeText={(t) => updateTexto('vacinasVermifugos', t)}
                            placeholder="Esquema vacinal e de vermifugação."
                            disabled={disabled}
                            filled={isFilled(draft?.textos?.vacinasVermifugos)}
                        />
                        <LabeledTextArea
                            label="Alimentação"
                            value={draft?.textos?.alimentacao || ''}
                            onChangeText={(t) => updateTexto('alimentacao', t)}
                            placeholder="Tipo de ração, caseiro, frequência, petiscos…"
                            disabled={disabled}
                            filled={isFilled(draft?.textos?.alimentacao)}
                        />
                        <LabeledTextArea
                            label="Hidratação"
                            value={draft?.textos?.hidratacao || ''}
                            onChangeText={(t) => updateTexto('hidratacao', t)}
                            placeholder="Ingestão de água, se bebe pouco/muito, uso de fontes, etc."
                            disabled={disabled}
                            filled={isFilled(draft?.textos?.hidratacao)}
                        />
                        <LabeledTextArea
                            label="Fezes e urina"
                            value={draft?.textos?.fezesUrina || ''}
                            onChangeText={(t) => updateTexto('fezesUrina', t)}
                            placeholder="Frequência, consistência, alterações observadas."
                            disabled={disabled}
                            filled={isFilled(draft?.textos?.fezesUrina)}
                        />
                        <LabeledTextArea
                            label="Medicações anteriores"
                            value={draft?.textos?.medicacoesAnteriores || ''}
                            onChangeText={(t) => updateTexto('medicacoesAnteriores', t)}
                            placeholder="Medicamentos usados anteriormente (dose, tempo, resposta)."
                            disabled={disabled}
                            filled={isFilled(draft?.textos?.medicacoesAnteriores)}
                        />
                        <LabeledTextArea
                            label="Medicações em uso"
                            value={draft?.textos?.medicacoesUso || ''}
                            onChangeText={(t) => updateTexto('medicacoesUso', t)}
                            placeholder="Medicamentos em uso atualmente."
                            disabled={disabled}
                            filled={isFilled(draft?.textos?.medicacoesUso)}
                        />
                        <LabeledTextArea
                            label="Histórico de neoplasias"
                            value={draft?.textos?.historicoNeoplasias || ''}
                            onChangeText={(t) => updateTexto('historicoNeoplasias', t)}
                            placeholder="Tipo, localização, tratamentos realizados, recidivas."
                            disabled={disabled}
                            filled={isFilled(draft?.textos?.historicoNeoplasias)}
                        />

                        {/* 5. Hábitos e Rotina */}
                        <SectionTitle>5. Hábitos e Rotina</SectionTitle>
                        <CardHighlight filled={groupHasTrue(draft?.habitos)}>
                            <DisabledOverlay disabled={disabled}>
                                <CheckboxRow
                                    label="Escadas"
                                    value={!!draft?.habitos?.escadas}
                                    onChange={(v) => updateHabito('escadas', v)}
                                    disabled={disabled}
                                />
                                <CheckboxRow
                                    label="Acesso à rua"
                                    value={!!draft?.habitos?.acessoRua}
                                    onChange={(v) => updateHabito('acessoRua', v)}
                                    disabled={disabled}
                                />
                                <CheckboxRow
                                    label="Piso liso"
                                    value={!!draft?.habitos?.pisoLiso}
                                    onChange={(v) => updateHabito('pisoLiso', v)}
                                    disabled={disabled}
                                />
                                <CheckboxRow
                                    label="Piso antiderrapante"
                                    value={!!draft?.habitos?.pisoAntiderrapante}
                                    onChange={(v) => updateHabito('pisoAntiderrapante', v)}
                                    disabled={disabled}
                                />
                                <CheckboxRow
                                    label="Sobe/desce sofá"
                                    value={!!draft?.habitos?.sobeDesceSofa}
                                    onChange={(v) => updateHabito('sobeDesceSofa', v)}
                                    disabled={disabled}
                                />
                                <CheckboxRow
                                    label="Sobe/desce cama"
                                    value={!!draft?.habitos?.sobeDesceCama}
                                    onChange={(v) => updateHabito('sobeDesceCama', v)}
                                    disabled={disabled}
                                />
                            </DisabledOverlay>
                        </CardHighlight>

                        <View style={{ height: 8 }} />
                        <LabeledTextArea
                            label="Local onde dorme"
                            value={draft?.textos?.localDormir || ''}
                            onChangeText={(t) => updateTexto('localDormir', t)}
                            placeholder="Cama, sofá, chão, dormitório do tutor, outro cômodo…"
                            disabled={disabled}
                            minHeight={60}
                            filled={isFilled(draft?.textos?.localDormir)}
                        />

                        {/* 6. Avaliação Funcional */}
                        <SectionTitle>6. Avaliação Funcional</SectionTitle>
                        <CardHighlight filled={groupHasTrue(draft?.funcional)}>
                            <DisabledOverlay disabled={disabled}>
                                <CheckboxRow
                                    label="Levanta sozinho"
                                    value={!!draft?.funcional?.levantaSozinho}
                                    onChange={(v) => updateFuncional('levantaSozinho', v)}
                                    disabled={disabled}
                                />
                                <CheckboxRow
                                    label="Caminha sem apoio"
                                    value={!!draft?.funcional?.caminhaSemApoio}
                                    onChange={(v) => updateFuncional('caminhaSemApoio', v)}
                                    disabled={disabled}
                                />
                                <CheckboxRow
                                    label="Escorrega"
                                    value={!!draft?.funcional?.escorrega}
                                    onChange={(v) => updateFuncional('escorrega', v)}
                                    disabled={disabled}
                                />
                                <CheckboxRow
                                    label="Dificuldade para levantar"
                                    value={!!draft?.funcional?.dificuldadeLevantar}
                                    onChange={(v) => updateFuncional('dificuldadeLevantar', v)}
                                    disabled={disabled}
                                />
                            </DisabledOverlay>
                        </CardHighlight>

                        {/* 7. Avaliação da Dor */}
                        <SectionTitle>7. Avaliação da Dor</SectionTitle>
                        <CardHighlight
                            filled={
                                isFilled(draft?.dor?.nivel) ||
                                isFilled(draft?.textos?.descricaoDor)
                            }
                        >
                            <DisabledOverlay disabled={disabled}>
                                <DorRadio
                                    label="Intensidade da dor"
                                    value={draft?.dor?.nivel || 'leve'}
                                    onChange={updateDorNivel}
                                    disabled={disabled}
                                />
                                <View style={{ height: 8 }} />
                                <Text
                                    style={{
                                        fontWeight: '600',
                                        color: '#111827',
                                        marginBottom: 6,
                                    }}
                                >
                                    Descrição da dor
                                </Text>
                                <TextInput
                                    value={draft?.textos?.descricaoDor || ''}
                                    onChangeText={updateDescricaoDor}
                                    placeholder="Localização, tipo (aguda, crônica, intermitente), fatores que pioram/melhoram…"
                                    placeholderTextColor="#9CA3AF"
                                    editable={!disabled}
                                    multiline
                                    textAlignVertical="top"
                                    style={{
                                        minHeight: 80,
                                        color: '#111827',
                                        opacity: disabled ? 0.55 : 1,
                                        borderWidth: 1.5,
                                        borderRadius: 10,
                                        paddingHorizontal: 10,
                                        paddingVertical: 8,
                                        borderColor: isFilled(draft?.textos?.descricaoDor)
                                            ? '#16A34A'
                                            : 'rgba(0,0,0,0.15)',
                                        backgroundColor: disabled
                                            ? 'rgba(0,0,0,0.03)'
                                            : 'white',
                                    }}
                                />
                            </DisabledOverlay>
                        </CardHighlight>

                        {/* 8. Expectativas do Tutor */}
                        <SectionTitle>8. Expectativas do Tutor</SectionTitle>
                        <CardHighlight filled={groupHasTrue(draft?.expectativas)}>
                            <DisabledOverlay disabled={disabled}>
                                <CheckboxRow
                                    label="Reduzir dor"
                                    value={!!draft?.expectativas?.reduzirDor}
                                    onChange={(v) => updateExpectativa('reduzirDor', v)}
                                    disabled={disabled}
                                />
                                <CheckboxRow
                                    label="Melhorar mobilidade"
                                    value={!!draft?.expectativas?.melhorarMobilidade}
                                    onChange={(v) =>
                                        updateExpectativa('melhorarMobilidade', v)
                                    }
                                    disabled={disabled}
                                />
                                <CheckboxRow
                                    label="Reabilitação pós-cirurgia"
                                    value={!!draft?.expectativas?.reabilitacaoPosCirurgia}
                                    onChange={(v) =>
                                        updateExpectativa('reabilitacaoPosCirurgia', v)
                                    }
                                    disabled={disabled}
                                />
                                <CheckboxRow
                                    label="Qualidade de vida"
                                    value={!!draft?.expectativas?.qualidadeVida}
                                    onChange={(v) =>
                                        updateExpectativa('qualidadeVida', v)
                                    }
                                    disabled={disabled}
                                />
                            </DisabledOverlay>
                        </CardHighlight>

                        {/* 9. Observações Gerais */}
                        <View style={{ height: 16 }} />
                        <SectionTitle>9. Observações Gerais</SectionTitle>
                        <LabeledTextArea
                            label=""
                            value={draft?.textos?.observacoesGerais || ''}
                            onChangeText={(t) => updateTexto('observacoesGerais', t)}
                            placeholder="Informações adicionais relevantes para o plano fisioterapêutico."
                            disabled={disabled}
                            minHeight={100}
                            filled={isFilled(draft?.textos?.observacoesGerais)}
                        />
                    </ScrollView>


                    {/* Botão Salvar fixo no rodapé */}
                    {editing && (
                        <SafeAreaView
                            edges={["bottom"]}
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
