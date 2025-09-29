// app/(modals)/pet-new.jsx
import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert, KeyboardAvoidingView, Platform, Switch } from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { addPet, updatePet, fetchPet, selectPetById } from '@/src/store/slices/petsSlice';
import { useThemeColor } from '@/hooks/useThemeColor';
import { ScrollView } from 'react-native';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';

import { Ionicons } from '@expo/vector-icons';
import { Linking } from 'react-native';

// tutores
import {
    selectTutores,
    makeSelectTutoresByQuery,
    selectTutorById,
} from '@/src/store/slices/tutoresSlice';

const ESPECIES = ['cachorro', 'gato'];
const SEXOS = ['M', 'F'];

export default function PetNewModal() {
    const { tutorId, tutorNome, mode, id } = useLocalSearchParams();
    const _id = Array.isArray(id) ? id[0] : id;
    const isEdit = mode === 'edit' && _id;

    const dispatch = useDispatch();
    const pet = useSelector(selectPetById(_id));

    useEffect(() => {
        if (isEdit && !pet && _id) dispatch(fetchPet(_id));
    }, [dispatch, isEdit, _id, pet]);

    const FOOTER_H = 72;
    const insets = useSafeAreaInsets();

    const text = useThemeColor({}, 'text');
    const subtle = useThemeColor({ light: '#6B7280', dark: '#9AA0A6' }, 'text');
    const border = useThemeColor({ light: 'rgba(0,0,0,0.12)', dark: 'rgba(255,255,255,0.16)' }, 'border');
    const bg = useThemeColor({}, 'background');
    const tint = useThemeColor({}, 'tint');

    // form state
    const [nome, setNome] = useState('');
    const [especie, setEspecie] = useState('cachorro');
    const [raca, setRaca] = useState('');
    const [cor, setCor] = useState('');
    const [sexo, setSexo] = useState('M');
    const [castrado, setCastrado] = useState(false);

    // 🔹 substitui nascimento por idade (anos)
    const [idade, setIdade] = useState(''); // string p/ input numérico

    const [pesoKg, setPesoKg] = useState('');
    const [observacoes, setObservacoes] = useState(''); // 🔹 novo campo

    // quando vier do atalho: não há tutorId -> precisamos permitir escolher
    const [tutorQuery, setTutorQuery] = useState('');
    const [tutor, setTutor] = useState(() => {
        if (isEdit) return pet?.tutor || { id: null, nome: '' };
        if (tutorId) return { id: String(tutorId), nome: String(tutorNome || '') };
        return { id: null, nome: '' };
    });

    // seletor memoizado p/ filtrar por nome/telefone/email
    const tutoresByQuerySelectorRef = React.useRef(makeSelectTutoresByQuery());
    const tutoresBuscados = useSelector((state) =>
        tutoresByQuerySelectorRef.current(state, tutorQuery)
    );

    const [initialized, setInitialized] = useState(false);
    useEffect(() => {
        if (isEdit && pet && !initialized) {
            setNome(pet.nome || '');
            setEspecie(pet.especie || 'cachorro');
            setRaca(pet.raca || '');
            setCor(pet.cor || '');
            setSexo(pet.sexo || 'M');
            setCastrado(!!pet.castrado);

            // 🔹 tenta idade do registro; se vier como número, vira string
            setIdade(
                Number.isFinite(pet?.idade) && pet.idade >= 0
                    ? String(pet.idade)
                    : (pet?.idade ? String(pet.idade) : '')
            );

            setPesoKg(
                typeof pet.pesoKg === 'number' && Number.isFinite(pet.pesoKg)
                    ? String(pet.pesoKg).replace('.', ',')
                    : ''
            );
            setObservacoes(pet.observacoes || '');
            setInitialized(true);
        }
    }, [isEdit, pet, initialized]);

    const canSubmit = useMemo(() => {
        const hasNome = nome.trim().length > 0;
        const especieOk = ESPECIES.includes(especie);
        const needTutor = !isEdit && !tutorId; // criando “solto” -> precisa escolher tutor
        const hasTutor = !needTutor || !!tutor?.id;
        return hasNome && especieOk && hasTutor;
    }, [nome, especie, isEdit, tutorId, tutor?.id]);

    const submit = async () => {
        if (!canSubmit) {
            Alert.alert('Cadastro de Pet', 'Verifique os campos obrigatórios e a idade.');
            return;
        }
        try {
            const idadeNumber = idade === '' ? null : Math.max(0, parseInt(idade, 10));

            const base = {
                nome: nome.trim(),
                especie,
                raca: raca.trim() || null,
                cor: cor.trim() || null,
                sexo,
                castrado: !!castrado,

                // 🔹 novo campo
                idade: idadeNumber,

                // mantém peso e observações
                pesoKg: parseDecimalBR(pesoKg), // -> number ou null
                observacoes: observacoes.trim() || null,
            };

            if (isEdit) {
                const payload = { id: String(_id), ...base };
                await dispatch(updatePet(payload)).unwrap();
            } else {
                const payload = {
                    tutor: {
                        id: String(tutorId || tutor?.id),                  // usa o fixo se veio por parâmetro; senão, o escolhido
                        nome: String(tutorNome || tutor?.nome || tutor?.name || ''),
                    },
                    ...base,
                };
                await dispatch(addPet(payload)).unwrap();
            }
            router.back();
        } catch (e) {
            Alert.alert(
                'Erro',
                e?.message ?? (isEdit ? 'Não foi possível atualizar o pet.' : 'Não foi possível criar o pet.')
            );
        }
    };

    // sanitiza idade (apenas dígitos)
    function parseDecimalBR(s) {
        if (s == null) return null;
        const clean = String(s).replace(/[^\d,.-]/g, '')  // mantém dígitos, vírgula, ponto, sinais
            .replace(/\./g, '')        // remove separador de milhar
            .replace(',', '.');        // troca vírgula por ponto
        const n = Number(clean);
        return Number.isFinite(n) ? n : null;
    }

    const onChangeIdade = (t) => {
        const onlyDigits = (t || '').replace(/[^\d]/g, '');
        setIdade(onlyDigits);
    };

    const tutorAddressFallback = (t) => {
        const partes = [t?.endereco, t?.numero, t?.bairro, t?.cidade, t?.uf, t?.cep].filter(Boolean);
        return partes.join(', ');
    };

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
        <SafeAreaView style={{ flex: 1, backgroundColor: bg }} edges={[]}>
            <Stack.Screen
                options={{
                    presentation: 'modal',
                    title: isEdit ? 'Editar pet' : 'Novo Pet',
                    headerBackTitleVisible: false,
                    headerStyle: { backgroundColor: tint },
                    headerTitleStyle: { color: 'white' },
                }}
            />

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={0}
            >
                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={{
                        padding: 16,
                        paddingBottom: (insets.bottom || 12) + FOOTER_H + 16,
                        gap: 12,
                    }}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode={Platform.OS === 'ios' ? 'on-drag' : 'none'}
                    automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
                    contentInsetAdjustmentBehavior="automatic"
                >
                    {/* Tutor */}
                    <View style={[styles.field, { borderColor: border }]}>
                        <Text style={[styles.label, { color: subtle }]}>Tutor</Text>

                        {/* Caso esteja editando OU veio com tutor fixo via params -> apenas exibição */}
                        {(isEdit || tutorId) ? (
                            <Text style={{ color: text, fontWeight: '700' }}>
                                {(isEdit ? pet?.tutor?.nome : tutorNome) || '—'}
                            </Text>
                        ) : (
                            <>
                                {/* Input de busca */}
                                <View
                                    style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        gap: 8,
                                        borderWidth: 1,
                                        borderColor: border,
                                        borderRadius: 10,
                                        paddingHorizontal: 10,
                                        height: 42,
                                        marginTop: 8
                                    }}
                                >
                                    <Ionicons name="person-circle-outline" size={18} color="#8E8E93" />
                                    <TextInput
                                        placeholder="Buscar e selecionar tutor"
                                        placeholderTextColor={subtle}
                                        value={tutor?.id ? (tutor?.nome || tutor?.name || '') : tutorQuery}
                                        onChangeText={(t) => {
                                            setTutorQuery(t);
                                            setTutor({ id: null, nome: '' });
                                        }}
                                        style={{ flex: 1, paddingVertical: 0, color: text }}
                                    />
                                    {tutor?.id && (
                                        <Pressable onPress={() => { setTutor({ id: null, nome: '' }); setTutorQuery(''); }} hitSlop={10}>
                                            <Ionicons name="close-circle" size={18} color="#8E8E93" />
                                        </Pressable>
                                    )}
                                </View>

                                {/* Lista de tutores (quando não há um selecionado) */}
                                {!tutor?.id && (
                                    <View
                                        style={{
                                            maxHeight: 240,
                                            marginTop: 8,
                                            borderWidth: 1,
                                            borderColor: border,
                                            borderRadius: 10,
                                            overflow: 'hidden'
                                        }}
                                    >
                                        {tutoresBuscados.length > 0 ? (
                                            tutoresBuscados.map((item, idx) => (
                                                <Pressable
                                                    key={String(item.id)}
                                                    onPress={() => setTutor(item)}
                                                    style={({ pressed }) => ({
                                                        paddingHorizontal: 12,
                                                        paddingVertical: 10,
                                                        backgroundColor: pressed ? '#F3F4F6' : 'white',
                                                        borderBottomWidth: idx === tutoresBuscados.length - 1 ? 0 : 1,
                                                        borderBottomColor: '#F1F5F9',
                                                    })}
                                                >
                                                    <Text style={{ fontWeight: '700', color: text }}>
                                                        {item?.nome || item?.name}
                                                    </Text>
                                                    <Text style={{ color: subtle, marginTop: 2 }} numberOfLines={1}>
                                                        {item?.endereco?.formatted || tutorAddressFallback(item) || '—'}
                                                    </Text>
                                                </Pressable>
                                            ))
                                        ) : (
                                            <View style={{ padding: 12 }}>
                                                <Text style={{ color: subtle }}>Nenhum tutor encontrado</Text>
                                            </View>
                                        )}
                                    </View>
                                )}

                                {/* Tutor escolhido (cartão tocável) */}
                                {tutor?.id && (
                                    <Pressable
                                        onPress={openMaps}
                                        android_ripple={{ color: '#E5E7EB' }}
                                        style={({ pressed }) => ({
                                            marginTop: 8,
                                            borderWidth: 1,
                                            borderColor: border,
                                            borderRadius: 10,
                                            padding: 12,
                                            backgroundColor: pressed ? '#F3F4F6' : 'rgba(142,142,147,0.08)',
                                        })}
                                    >
                                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <Text style={{ fontWeight: '800', fontSize: 15, color: text }}>
                                                {tutor?.nome || tutor?.name}
                                            </Text>
                                            {tutor?.geo?.lat && tutor?.geo?.lng && (
                                                <Ionicons name="navigate-outline" size={22} color="#007AFF" />
                                            )}
                                        </View>
                                        <Text style={{ color: subtle, marginTop: 4 }} numberOfLines={2}>
                                            {tutor?.endereco?.formatted || tutorAddressFallback(tutor) || '—'}
                                        </Text>
                                    </Pressable>
                                )}
                            </>
                        )}
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

                    {/* Espécie */}
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

                    {/* 🔹 Idade (anos) */}
                    <View style={[styles.field, { borderColor: border }]}>
                        <Text style={[styles.label, { color: subtle }]}>Idade (anos)</Text>
                        <TextInput
                            value={idade}
                            onChangeText={onChangeIdade}
                            placeholder="Ex.: 4"
                            placeholderTextColor={subtle}
                            style={[styles.input, { color: text }]}
                            keyboardType="number-pad"
                            inputMode="numeric"
                            maxLength={3} // opcional
                        />
                        <Text style={{ color: subtle, fontSize: 12, marginTop: 4 }}>
                            Informe a idade do Pet...
                        </Text>
                    </View>

                    {/* Peso */}
                    <View style={[styles.field, { borderColor: border }]}>
                        <Text style={[styles.label, { color: subtle }]}>Peso (kg)</Text>
                        <TextInput
                            value={pesoKg}
                            onChangeText={(t) => {
                                // só números, vírgula e ponto
                                let v = t.replace(/[^\d.,]/g, '');
                                // evita dois separadores
                                const parts = v.split(/[.,]/);
                                if (parts.length > 2) {
                                    v = parts[0] + ',' + parts.slice(1).join('');
                                }
                                setPesoKg(v);
                            }}
                            keyboardType="decimal-pad"
                            inputMode="decimal" // ajuda no Android/Web
                            placeholder="Ex.: 12.4"
                            placeholderTextColor={subtle}
                            style={[styles.input, { color: text }]}
                        />
                    </View>

                    {/* 🔹 Observações */}
                    <View style={[styles.field, { borderColor: border }]}>
                        <Text style={[styles.label, { color: subtle }]}>Observações</Text>
                        <TextInput
                            value={observacoes}
                            onChangeText={setObservacoes}
                            placeholder="Anotações gerais sobre o paciente"
                            placeholderTextColor={subtle}
                            style={[styles.input, { color: text, minHeight: 84 }]}
                            multiline
                            textAlignVertical="top"
                        />
                    </View>

                    <View style={{ height: 8 }} />
                </ScrollView>

                {/* Footer */}
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
                                { borderColor: border, backgroundColor: 'rgba(107,114,128,1)' }
                            ]}
                            onPress={() => router.back()}
                        >
                            <Text style={{ fontWeight: '700', color: '#fff' }}>Cancelar</Text>
                        </Pressable>

                        <Pressable
                            style={[
                                styles.btn,
                                {
                                    backgroundColor: canSubmit ? 'rgba(16,185,129,1)' : 'rgba(16,185,129,0.3)',
                                    borderColor: !canSubmit && 'grey'
                                }
                            ]}
                            onPress={submit}
                            disabled={!canSubmit}
                        >
                            <Text style={{ color: canSubmit ? '#fff' : 'rgba(107,114,128,0.3)', fontWeight: '800' }}>
                                Salvar
                            </Text>
                        </Pressable>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    label: { fontSize: 12, fontWeight: '700', marginBottom: 6 },
    field: { borderWidth: 1, borderRadius: 12, padding: 12 },
    fieldRow: {
        borderWidth: 1, borderRadius: 12, padding: 12,
        flexDirection: 'row', alignItems: 'center', gap: 12,
    },
    input: { paddingVertical: 6 },
    segmentRow: { flexDirection: 'row', gap: 8 },
    segmentBtn: { flex: 1, borderWidth: 1, borderRadius: 999, paddingVertical: 8, alignItems: 'center' },
    segmentTxt: { fontWeight: '800' },
    segmentSmall: { borderWidth: 1, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12 },
    segmentSmallTxt: { fontWeight: '800' },
    actions: { flexDirection: 'row', gap: 12, marginTop: 'auto' },
    btn: { flex: 1, borderWidth: 1, borderRadius: 12, paddingVertical: 9, alignItems: 'center' },
});