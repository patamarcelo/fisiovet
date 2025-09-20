// app/(modals)/pet-new.jsx
import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert, KeyboardAvoidingView, Platform, Switch } from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { addPet, updatePet, fetchPet, selectPetById } from '@/src/store/slices/petsSlice';
import { useThemeColor } from '@/hooks/useThemeColor';

import { ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SafeAreaView } from 'react-native-safe-area-context';


const ESPECIES = ['cachorro', 'gato'];
const SEXOS = ['M', 'F'];




export default function PetNewModal() {
    const { tutorId, tutorNome, mode, id } = useLocalSearchParams();
    const _id = Array.isArray(id) ? id[0] : id;
    const isEdit = mode === 'edit' && _id;

    const dispatch = useDispatch();

    const pet = useSelector(selectPetById(_id));
    useEffect(() => {
        if (isEdit && !pet && _id) {
            dispatch(fetchPet(_id));
        }
    }, [dispatch, isEdit, _id, pet]);

    const FOOTER_H = 72; // altura aproximada do footer (ajuste se mudar estilos)
    const insets = useSafeAreaInsets();

    const text = useThemeColor({}, 'text');
    const subtle = useThemeColor({ light: '#6B7280', dark: '#9AA0A6' }, 'text');
    const border = useThemeColor({ light: 'rgba(0,0,0,0.12)', dark: 'rgba(255,255,255,0.16)' }, 'border');
    const bg = useThemeColor({}, 'background');
    const tint = useThemeColor({}, 'tint');
    const tintCheck = useThemeColor({}, 'tintCheck');

    // form state
    const [nome, setNome] = useState('');
    const [especie, setEspecie] = useState('cachorro');
    const [raca, setRaca] = useState('');
    const [cor, setCor] = useState('');
    const [sexo, setSexo] = useState('M');
    const [castrado, setCastrado] = useState(false);
    const [nasc, setNasc] = useState('');       // YYYY-MM-DD (simples)
    const [pesoKg, setPesoKg] = useState('');

    const [initialized, setInitialized] = useState(false);
    useEffect(() => {
        if (isEdit && pet && !initialized) {
            setNome(pet.nome || '');
            setEspecie(pet.especie || 'cachorro');
            setRaca(pet.raca || '');
            setCor(pet.cor || '');
            setSexo(pet.sexo || 'M');
            setCastrado(!!pet.castrado);
            setNasc(pet.nasc || '');
            setPesoKg(pet.pesoKg ? String(pet.pesoKg) : '');
            setInitialized(true);
        }
    }, [isEdit, pet, initialized]);

    const canSubmit = useMemo(() => nome.trim().length > 0 && ESPECIES.includes(especie), [nome, especie]);

    const submit = async () => {
        if (!canSubmit) {
            Alert.alert('Cadastro de Pet', 'Preencha ao menos nome e espécie.');
            return;
        }
        try {
            const base = {
                nome: nome.trim(),
                especie,
                raca: raca.trim() || null,
                cor: cor.trim() || null,
                sexo,
                castrado: !!castrado,
                nasc: nasc.trim() || null,
                pesoKg: pesoKg ? Number(pesoKg) : null,
            };
            if (isEdit) {
                const payload = { id: String(_id), ...base };
                await dispatch(updatePet(payload)).unwrap();
            } else {
                const payload = {
                    tutor: { id: String(tutorId), nome: String(tutorNome || '') },
                    ...base,
                };
                await dispatch(addPet(payload)).unwrap();
            }
            router.back();
        } catch (e) {
            Alert.alert('Erro', e?.message ?? (isEdit ? 'Não foi possível atualizar o pet.' : 'Não foi possível criar o pet.'));
        }
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: bg }} edges={[]}>
            <Stack.Screen
                options={{
                    presentation: 'modal',
                    title: isEdit ? 'Editar pet' : 'Novo Pet',
                    headerBackTitleVisible: false,
                    headerStyle: { backgroundColor: tint },
                    headerTitleStyle: { color: 'white' }, // 🔹 título na cor do tema

                }}
            />

            {/* O KeyboardAvoidingView aqui só para iOS empurrar conteúdo sob o teclado */}
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={0} // ajuste se usar header translucido
            >
                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={{
                        padding: 16,
                        paddingBottom: (insets.bottom || 12) + FOOTER_H + 16, // espaço p/ não cobrir campos
                        gap: 12,
                    }}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode={Platform.OS === 'ios' ? 'on-drag' : 'none'}
                    automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'} // iOS: Scroll “foge” do teclado
                    contentInsetAdjustmentBehavior="automatic"
                >
                    {/* ====== FORM (SEM flex:1) ====== */}
                    {/* Tutor vinculado */}
                    <View style={[styles.field, { borderColor: border, backgroundColor: 'transparent' }]}>
                        <Text style={[styles.label, { color: subtle }]}>Tutor</Text>
                        <Text style={{ color: text, fontWeight: '700' }}>{(isEdit ? pet?.tutor?.nome : tutorNome) || '—'}</Text>
                    </View>

                    {/* Nome */}
                    <View style={[styles.field, { borderColor: border }]}>
                        <Text style={[styles.label, { color: subtle }]}>Nome*</Text>
                        <TextInput
                            value={nome}
                            onChangeText={setNome}
                            placeholder="Ex.: Thor"
                            placeholderTextColor={subtle}
                            style={[styles.input, { color: text }]}
                        />
                    </View>

                    {/* Espécie (segmented) */}
                    <View style={styles.segmentRow}>
                        {ESPECIES.map((opt) => {
                            const active = especie === opt;
                            return (
                                <Pressable
                                    key={opt}
                                    onPress={() => setEspecie(opt)}
                                    style={[
                                        styles.segmentBtn,
                                        { borderColor: border },
                                        active && { backgroundColor: tint, borderColor: tint },
                                    ]}
                                >
                                    <Text style={[styles.segmentTxt, active && { color: '#fff' }]}>
                                        {opt === 'cachorro' ? 'Cachorro' : 'Gato'}
                                    </Text>
                                </Pressable>
                            );
                        })}
                    </View>

                    {/* Raça */}
                    <View style={[styles.field, { borderColor: border }]}>
                        <Text style={[styles.label, { color: subtle }]}>Raça</Text>
                        <TextInput
                            value={raca}
                            onChangeText={setRaca}
                            placeholder="Ex.: Golden Retriever"
                            placeholderTextColor={subtle}
                            style={[styles.input, { color: text }]}
                        />
                    </View>

                    {/* Cor */}
                    <View style={[styles.field, { borderColor: border }]}>
                        <Text style={[styles.label, { color: subtle }]}>Cor</Text>
                        <TextInput
                            value={cor}
                            onChangeText={setCor}
                            placeholder="Ex.: Dourado"
                            placeholderTextColor={subtle}
                            style={[styles.input, { color: text }]}
                        />
                    </View>

                    {/* Sexo */}
                    <View style={[styles.fieldRow, { borderColor: border }]}>
                        <Text style={[styles.label, { color: subtle, flex: 1 }]}>Sexo</Text>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                            {SEXOS.map((s) => {
                                const active = sexo === s;
                                return (
                                    <Pressable
                                        key={s}
                                        onPress={() => setSexo(s)}
                                        style={[
                                            styles.segmentSmall,
                                            { borderColor: border },
                                            active && { backgroundColor: tint, borderColor: tint },
                                        ]}
                                    >
                                        <Text style={[styles.segmentSmallTxt, active && { color: '#fff' }]}>{s}</Text>
                                    </Pressable>
                                );
                            })}
                        </View>
                    </View>

                    {/* Castrado */}
                    <View style={[styles.fieldRow, { borderColor: border }]}>
                        <Text style={[styles.label, { color: subtle, flex: 1 }]}>Castrado</Text>
                        <Switch value={castrado} onValueChange={setCastrado} />
                    </View>

                    {/* Nascimento */}
                    <View style={[styles.field, { borderColor: border }]}>
                        <Text style={[styles.label, { color: subtle }]}>Nascimento (YYYY-MM-DD)</Text>
                        <TextInput
                            value={nasc}
                            onChangeText={setNasc}
                            placeholder="Ex.: 2020-04-10"
                            placeholderTextColor={subtle}
                            style={[styles.input, { color: text }]}
                            autoCapitalize="none"
                        />
                    </View>

                    {/* Peso */}
                    <View style={[styles.field, { borderColor: border }]}>
                        <Text style={[styles.label, { color: subtle }]}>Peso (kg)</Text>
                        <TextInput
                            value={pesoKg}
                            onChangeText={setPesoKg}
                            placeholder="Ex.: 12.4"
                            placeholderTextColor={subtle}
                            style={[styles.input, { color: text }]}
                            keyboardType="decimal-pad"
                        />
                    </View>

                    {/* Espaçador extra para garantir respiro quando teclado abre */}
                    <View style={{ height: 8 }} />
                </ScrollView>

                {/* ====== FOOTER FIXO ====== */}
                <View
                    style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        bottom: 0,
                        paddingHorizontal: 16,
                        paddingTop: 10,
                        paddingBottom: (insets.bottom || 6),
                        backgroundColor: tint,
                        borderTopWidth: StyleSheet.hairlineWidth,
                        borderTopColor: border,
                    }}
                >
                    <View style={[styles.actions, { height: FOOTER_H - (insets.bottom || 0) }]}>
                        <Pressable
                            style={[
                                styles.btn,
                                { borderColor: border, backgroundColor: 'rgba(107,114,128,1)' } // cinza #6B7280
                            ]}
                            onPress={() => router.back()}
                        >
                            <Text style={{ fontWeight: '700', color: '#fff' }}>Cancelar</Text>
                        </Pressable>

                        <Pressable
                            style={[
                                styles.btn,
                                styles.btnPrimary,
                                {
                                    backgroundColor: canSubmit
                                        ? 'rgba(16,185,129,1)'   // verde #10B981
                                        : 'rgba(16,185,129,0.3)', // verde com opacidade reduzida
                                    borderColor: !canSubmit && 'grey'
                                }
                            ]}
                            onPress={submit}
                            disabled={!canSubmit}
                        >
                            <Text style={{ color: canSubmit ? '#fff' : 'rgba(107,114,128,0.3)', fontWeight: '800' }}>Salvar</Text>
                        </Pressable>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { padding: 16, gap: 12, flex: 1 },
    label: { fontSize: 12, fontWeight: '700', marginBottom: 6 },
    field: { borderWidth: 1, borderRadius: 12, padding: 12 },
    fieldRow: {
        borderWidth: 1, borderRadius: 12, padding: 12,
        flexDirection: 'row', alignItems: 'center', gap: 12,
    },
    input: { paddingVertical: 6 },
    segmentRow: { flexDirection: 'row', gap: 8 },
    segmentBtn: {
        flex: 1,
        borderWidth: 1, borderRadius: 999, paddingVertical: 8, alignItems: 'center',
    },
    segmentTxt: { fontWeight: '800' },
    segmentSmall: { borderWidth: 1, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12 },
    segmentSmallTxt: { fontWeight: '800' },
    actions: { flexDirection: 'row', gap: 12, marginTop: 'auto' },
    btn: { flex: 1, borderWidth: 1, borderRadius: 12, paddingVertical: 9, alignItems: 'center' },
    btnPrimary: {},
});