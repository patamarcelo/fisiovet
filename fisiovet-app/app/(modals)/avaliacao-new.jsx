// app/(phone)/pacientes/[id]/avaliacao-form.jsx
import { useEffect, useMemo, useState, useCallback } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, TextInput, Switch,
    KeyboardAvoidingView, Platform, ActivityIndicator, Alert, SafeAreaView
} from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';

import { ensureFirebase } from '@/firebase/firebase';


import { createDraft, updateDraftField, clearDraft, replaceDraft } from '@/src/store/slices/avaliacaoSlice';

// ---------- UI helpers ----------
function SectionTitle({ children }) {
    return <Text style={{ fontWeight: '800', fontSize: 16, marginBottom: 8, color: '#111827' }}>{children}</Text>;
}
function Card({ children }) {
    return (
        <View style={{ backgroundColor: 'white', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)' }}>
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

/** Radios em linha, com quebra (wrap) **/
function RadioGroupInline({ label, value, onChange, disabled }) {
    const options = useMemo(
        () => [
            { key: 'op1', text: 'Opção 1' },
            { key: 'op2', text: 'Opção 2' },
            { key: 'op3', text: 'Opção 3' },
        ],
        []
    );

    return (
        <View style={{ marginBottom: 12 }}>
            <Text style={{ fontWeight: '600', color: '#111827', marginBottom: 10 }}>{label}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {options.map((opt) => {
                    const selected = value === opt.key;
                    return (
                        <TouchableOpacity
                            key={opt.key}
                            disabled={disabled}
                            onPress={() => onChange(opt.key)}
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
                        >
                            <Ionicons
                                name={selected ? 'radio-button-on' : 'radio-button-off'}
                                size={18}
                                color={selected ? '#2563EB' : '#9CA3AF'}
                            />
                            <Text style={{ marginLeft: 8, color: '#111827', fontWeight: selected ? '700' : '500' }}>
                                {opt.text}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
}

/** Switch triplo **/
function SwitchTriple({ label, value = {}, onChange, disabled }) {
    const rows = [
        { key: 'op1', text: 'Opção 1' },
        { key: 'op2', text: 'Opção 2' },
        { key: 'op3', text: 'Opção 3' },
    ];
    return (
        <View style={{ marginBottom: 8 }}>
            <Text style={{ fontWeight: '600', color: '#111827', marginBottom: 8 }}>{label}</Text>
            {rows.map((r) => (
                <View key={r.key} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 }}>
                    <Text style={{ color: '#111827' }}>{r.text}</Text>
                    <Switch value={!!value[r.key]} onValueChange={(v) => onChange({ ...value, [r.key]: v })} disabled={disabled} />
                </View>
            ))}
        </View>
    );
}

// ---------- helpers Firestore ----------
async function fetchAvaliacao({ firestore, uid, petId, avaliacaoId }) {
    const ref = firestore
        .collection('users').doc(uid)
        .collection('pets').doc(petId)
        .collection('avaliacoes').doc(avaliacaoId);
    const snap = await ref.get();
    if (!snap.exists) return null;
    return { id: snap.id, ...snap.data() };
}

export async function saveNewAvaliacao({ firestore, firestoreModule, uid, petId, payload }) {
    const col = firestore
        .collection('users').doc(String(uid))
        .collection('pets').doc(String(petId))
        .collection('avaliacoes');

    const ref = col.doc();
    const now = firestoreModule.FieldValue.serverTimestamp(); // ✅

    await ref.set({
        ...payload,
        createdAt: now,
        updatedAt: now,
        type: 'avaliacao',
    });

    return ref.id;
}

export async function updateAvaliacao({ firestore, firestoreModule, uid, petId, avaliacaoId, payload }) {
    const ref = firestore
        .collection('users').doc(String(uid))
        .collection('pets').doc(String(petId))
        .collection('avaliacoes').doc(String(avaliacaoId));

    await ref.update({
        ...payload,
        updatedAt: firestoreModule.FieldValue.serverTimestamp(), // ✅
    });
}


async function deleteAvaliacao({ firestore, uid, petId, avaliacaoId }) {
    const ref = firestore
        .collection('users').doc(String(uid))
        .collection('pets').doc(String(petId))
        .collection('avaliacoes').doc(String(avaliacaoId));
    await ref.delete();
}

function normalizeDraft(petId, docData) {
    const base = {
        title: '',                                  // ← novo
        radios: {
            grupoRadio1: 'op1',
            grupoRadio2: 'op1',
            grupoRadio3: 'op1',
            grupoRadio4: 'op1',
            grupoRadio5: 'op1',
        },
        switches: {
            grupoSwitch1: { op1: false, op2: false, op3: false },
            grupoSwitch2: { op1: false, op2: false, op3: false },
            grupoSwitch3: { op1: false, op2: false, op3: false },
            grupoSwitch4: { op1: false, op2: false, op3: false },
            grupoSwitch5: { op1: false, op2: false, op3: false },
        },
        notes: '',
    };

    return {
        ...base,
        title: docData?.title ?? '',                // ← novo
        radios: { ...base.radios, ...(docData.fields?.radios || {}) },
        switches: { ...base.switches, ...(docData.fields?.switches || {}) },
        notes: docData.fields?.notes ?? '',
    };
}

// ---------- TELA ----------
export default function AvaliacaoFormScreen() {
    const { id: petId, avaliacaoId } = useLocalSearchParams();
    const dispatch = useDispatch();
    const { auth, firestore, firestoreModule } = ensureFirebase() || {};

    // slice correto (singular):
    const draft = useSelector((s) => s.avaliacao?.draftsByPet?.[petId]);

    // estado de edição:
    const isExisting = !!avaliacaoId;
    const [editing, setEditing] = useState(!isExisting); // novo => editável; existente => bloqueado
    const [loading, setLoading] = useState(isExisting);  // carrega doc se existente
    const [saving, setSaving] = useState(false);
    const [original, setOriginal] = useState(null);      // para restaurar ao cancelar edição

    // carrega/seed draft
    useEffect(() => {
        if (!petId) return;
        // se novo, cria draft vazio uma vez
        if (!isExisting && !draft) {
            dispatch(createDraft({ petId: String(petId) }));
        }
    }, [dispatch, petId, isExisting, draft]);

    // se for existente, busca e popula draft (read-only)
    useEffect(() => {
        (async () => {
            if (!isExisting || !firestore || !auth?.currentUser?.uid) return;
            try {
                setLoading(true);
                const uid = auth.currentUser.uid;
                const doc = await fetchAvaliacao({ firestore, uid, petId: String(petId), avaliacaoId: String(avaliacaoId) });
                const seed = normalizeDraft(String(petId), doc);
                setOriginal(seed);
                dispatch(replaceDraft({ petId: String(petId), draft: seed }));
            } catch (e) {
                console.log('fetch avaliacao error', e);
                Alert.alert('Avaliação', 'Não foi possível carregar.');
                router.back();
            } finally {
                setLoading(false);
            }
        })();
    }, [isExisting, firestore, auth, petId, avaliacaoId, dispatch]);

    // header
    useEffect(() => {
        const left = () => {
            if (isExisting) {
                // mostrar Editar/Cancelar de acordo com estado
                if (!editing) {
                    return (
                        <TouchableOpacity onPress={() => setEditing(true)} style={{ paddingHorizontal: 8 }}>
                            <Text style={{ color: '#2563EB', fontWeight: '700' }}>Editar</Text>
                        </TouchableOpacity>
                    );
                }
                // se está editando, botão Cancela e restaura original
                return (
                    <TouchableOpacity
                        onPress={() => { setEditing(false); if (original) dispatch(replaceDraft({ petId: String(petId), draft: original })); }}
                        style={{ paddingHorizontal: 8 }}
                    >
                        <Text style={{ color: '#FF3B30', fontWeight: '700' }}>Cancelar</Text>
                    </TouchableOpacity>
                );
            }
            // novo registro → cancelar volta
            return (
                <TouchableOpacity onPress={() => { dispatch(clearDraft({ petId: String(petId) })); router.back(); }} style={{ paddingHorizontal: 8 }}>
                    <Text style={{ color: '#FF3B30', fontWeight: '700' }}>Cancelar</Text>
                </TouchableOpacity>
            );
        };

        // título sempre “Avaliação”
        // sem headerRight; salvar fica no rodapé
        router.setParams?.({});
        // usando Stack.Screen abaixo para opções
    }, [editing, isExisting, original, petId, dispatch]);

    const updateRadio = useCallback((groupKey, newVal) => {
        dispatch(updateDraftField({ petId: String(petId), path: ['radios', groupKey], value: newVal }));
    }, [dispatch, petId]);

    const updateSwitches = useCallback((groupKey, newObj) => {
        dispatch(updateDraftField({ petId: String(petId), path: ['switches', groupKey], value: newObj }));
    }, [dispatch, petId]);

    const updateNotes = useCallback((text) => {
        dispatch(updateDraftField({ petId: String(petId), path: ['notes'], value: text }));
    }, [dispatch, petId]);

    const updateTitle = useCallback((text) => {
        dispatch(updateDraftField({ petId: String(petId), path: ['title'], value: text }));
    }, [dispatch, petId]);

    const handleSave = useCallback(async () => {
        try {
            if (!draft) return;
            if (!auth?.currentUser?.uid) return Alert.alert('Avaliação', 'Usuário não autenticado.');
            const uid = auth.currentUser.uid;

            setSaving(true);
            const payload = {
                title: draft.title?.trim() || '',   // ← novo
                fields: {
                    radios: draft.radios || {},
                    switches: draft.switches || {},
                    notes: draft.notes || '',
                },
                type: 'avaliacao',
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
                setOriginal({ ...payload.fields, title: payload.title });     // atualiza baseline
                setEditing(false);               // volta para bloqueado
                Alert.alert('Avaliação', 'Alterações salvas!');
            } else {
                const newId = await saveNewAvaliacao({
                    firestore,
                    firestoreModule,
                    uid,
                    petId: String(petId),
                    payload,
                });
                Alert.alert('Avaliação', 'Registro criado!');
                // navega para a mesma tela já populada (read-only)
            }

            router.replace({ pathname: '/(phone)/pacientes/[id]/avaliacao', params: { id: String(petId) } });
            dispatch(clearDraft({ petId: String(petId) }));
        } catch (e) {
            console.log('save avaliacao error', e);
            Alert.alert('Avaliação', 'Não foi possível salvar.');
        } finally {
            setSaving(false);
        }
    }, [draft, isExisting, avaliacaoId, firestore, auth, petId, dispatch]);


    const handleDelete = useCallback(() => {
        if (!isExisting) return;
        const uid = auth?.currentUser?.uid;
        if (!uid) {
            Alert.alert('Avaliação', 'Usuário não autenticado.');
            return;
        }
        Alert.alert('Apagar avaliação', 'Tem certeza que deseja apagar este registro?', [
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
                        // limpa rascunho local (se houver)
                        dispatch(clearDraft({ petId: String(petId) }));
                        // volta para a lista
                        router.replace({ pathname: '/(phone)/pacientes/[id]/avaliacao', params: { id: String(petId) } });
                    } catch (e) {
                        console.log('delete avaliacao error', e);
                        Alert.alert('Avaliação', 'Não foi possível apagar.');
                    }
                }
            }
        ]);
    }, [isExisting, auth, firestore, petId, avaliacaoId, dispatch]);

    const radioGroups = useMemo(() => ([
        { key: 'grupoRadio1', label: 'Grupo de Rádio 1' },
        { key: 'grupoRadio2', label: 'Grupo de Rádio 2' },
        { key: 'grupoRadio3', label: 'Grupo de Rádio 3' },
        { key: 'grupoRadio4', label: 'Grupo de Rádio 4' },
        { key: 'grupoRadio5', label: 'Grupo de Rádio 5' },
    ]), []);

    const switchGroups = useMemo(() => ([
        { key: 'grupoSwitch1', label: 'Grupo de Switch 1' },
        { key: 'grupoSwitch2', label: 'Grupo de Switch 2' },
        { key: 'grupoSwitch3', label: 'Grupo de Switch 3' },
        { key: 'grupoSwitch4', label: 'Grupo de Switch 4' },
        { key: 'grupoSwitch5', label: 'Grupo de Switch 5' },
    ]), []);

    if (loading) {
        return (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3F4F6' }}>
                <ActivityIndicator />
            </View>
        );
    }

    const disabled = !editing;

    return (
        <KeyboardAvoidingView behavior={Platform.select({ ios: 'padding', android: undefined })} style={{ flex: 1, backgroundColor: '#F3F4F6' }}>
            <Stack.Screen
                options={{
                    title: 'Avaliação',
                    // headerLeft conforme estado:
                    headerLeft: () => {
                        if (isExisting) {
                            if (!editing) {
                                return (
                                    <TouchableOpacity onPress={() => setEditing(true)} style={{ paddingHorizontal: 8 }}>
                                        <Text style={{ color: '#2563EB', fontWeight: '700' }}>Editar</Text>
                                    </TouchableOpacity>
                                );
                            }
                            return (
                                <TouchableOpacity
                                    onPress={() => { setEditing(false); if (original) dispatch(replaceDraft({ petId: String(petId), draft: original })); }}
                                    style={{ paddingHorizontal: 8 }}
                                >
                                    <Text style={{ color: '#FF3B30', fontWeight: '700' }}>Cancelar</Text>
                                </TouchableOpacity>
                            );
                        }
                        return (
                            <TouchableOpacity onPress={() => { dispatch(clearDraft({ petId: String(petId) })); router.back(); }} style={{ paddingHorizontal: 8 }}>
                                <Text style={{ color: '#FF3B30', fontWeight: '700' }}>Cancelar</Text>
                            </TouchableOpacity>
                        );
                    },
                    headerRight: () =>
                        isExisting && editing ? (
                            <TouchableOpacity
                                onPress={handleDelete}
                                style={{ paddingHorizontal: 8 }}
                                accessibilityLabel="Apagar avaliação"
                                hitSlop={10}
                            >
                                <Ionicons name="trash-outline" size={22} color="#FF3B30" />
                            </TouchableOpacity>
                        ) : null,
                }}
            />

            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
                <SectionTitle>Título</SectionTitle>
                <Card>
                    <DisabledOverlay disabled={!editing}>
                        <TextInput
                            placeholder="Ex.: Avaliação de retorno, Avaliação ortopédica…"
                            placeholderTextColor="#9CA3AF"
                            value={draft?.title ?? ''}
                            onChangeText={(t) =>
                                dispatch(updateDraftField({ petId: String(petId), path: ['title'], value: t }))
                            }
                            editable={editing}
                            style={{
                                height: 44,
                                color: '#111827',
                                opacity: editing ? 1 : 0.55,
                            }}
                        />
                    </DisabledOverlay>
                </Card>
                <SectionTitle>Seleções (Rádio)</SectionTitle>
                <Card>
                    <DisabledOverlay disabled={disabled}>
                        {radioGroups.map((g, idx) => (
                            <View key={g.key} style={{ paddingBottom: idx < radioGroups.length - 1 ? 12 : 0 }}>
                                <RadioGroupInline
                                    label={g.label}
                                    value={draft?.radios?.[g.key] || 'op1'}
                                    onChange={(val) => updateRadio(g.key, val)}
                                    disabled={disabled}
                                />
                                {idx < radioGroups.length - 1 ? <View style={{ height: 1, backgroundColor: 'rgba(0,0,0,0.06)', marginTop: 12 }} /> : null}
                            </View>
                        ))}
                    </DisabledOverlay>
                </Card>

                <View style={{ height: 16 }} />
                <SectionTitle>Marcadores (Switch)</SectionTitle>
                <Card>
                    <DisabledOverlay disabled={disabled}>
                        {switchGroups.map((g, idx) => (
                            <View key={g.key} style={{ paddingBottom: idx < switchGroups.length - 1 ? 12 : 0 }}>
                                <SwitchTriple
                                    label={g.label}
                                    value={draft?.switches?.[g.key] || { op1: false, op2: false, op3: false }}
                                    onChange={(obj) => updateSwitches(g.key, obj)}
                                    disabled={disabled}
                                />
                                {idx < switchGroups.length - 1 ? <View style={{ height: 1, backgroundColor: 'rgba(0,0,0,0.06)', marginTop: 12 }} /> : null}
                            </View>
                        ))}
                    </DisabledOverlay>
                </Card>

                <View style={{ height: 16 }} />
                <SectionTitle>Observações</SectionTitle>
                <Card>
                    <TextInput
                        placeholder="Escreva observações (opcional)"
                        placeholderTextColor="#9CA3AF"
                        value={draft?.notes || ''}
                        onChangeText={updateNotes}
                        editable={!disabled}
                        multiline
                        style={{ minHeight: 100, textAlignVertical: 'top', color: '#111827', opacity: disabled ? 0.55 : 1 }}
                    />
                </Card>
            </ScrollView>

            {/* Botão fixo no rodapé (apenas no modo edição) */}
            {editing && (
                <SafeAreaView style={{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.08)' }}>
                    <View style={{ padding: 12 }}>
                        <TouchableOpacity
                            onPress={handleSave}
                            style={{ backgroundColor: '#2563EB', height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' }}
                        >
                            {saving ? (
                                <>
                                    <ActivityIndicator color="#fff" />
                                    <Text style={{ color: 'white', fontWeight: '700', marginLeft: 10 }}>Salvando…</Text>
                                </>
                            ) : (
                                <>
                                    <Ionicons name="checkmark" size={18} color="#fff" />
                                    <Text style={{ color: 'white', fontWeight: '700', marginLeft: 6 }}>Salvar</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            )}
        </KeyboardAvoidingView>
    );
}