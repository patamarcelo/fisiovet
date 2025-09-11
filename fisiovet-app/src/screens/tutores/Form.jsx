// src/screens/tutores/Form.jsx
import React, { useState, useRef, useMemo } from 'react';
import { View, Text, Alert, ActivityIndicator, Platform, KeyboardAvoidingView } from 'react-native';
import { useDispatch } from 'react-redux';
import { addTutor, updateTutor } from '@/src/store/slices/tutoresSlice';
import { useThemeColor } from '@/hooks/useThemeColor';
import Screen from '../_ui/Screen';
import ThemedTextInput from '@/components/ui/ThemedTextInput';
import ThemedButton from '@/components/ui/ThemedButton';
import useHideTabBar from '@/hooks/useHideBar';
import { fetchAddressByCep } from '@/src/services/cep';
import { geocodeAddress } from '@/src/services/geocoding';
import { maskCep, maskPhone } from '@/src/utils/masks';

export default function TutorForm({ tutor, onSuccess }) {
    useHideTabBar(true);

    const dispatch = useDispatch();
    const subtle = useThemeColor({ light: '#6B7280', dark: '#9AA0A6' }, 'text');

    const emailRef = useRef(null);
    const cepRef = useRef(null);
    const numeroRef = useRef(null);
    const telefoneRef = useRef(null);

    // Dados básicos
    const [nome, setNome] = useState(tutor?.nome || '');
    const [telefone, setTelefone] = useState(tutor?.telefone || '');
    const [email, setEmail] = useState(tutor?.email || '');

    // Endereço
    const [cep, setCep] = useState(tutor?.endereco?.cep || '');
    const [logradouro, setLogradouro] = useState(tutor?.endereco?.logradouro || '');
    const [numero, setNumero] = useState(tutor?.endereco?.numero || '');
    const [bairro, setBairro] = useState(tutor?.endereco?.bairro || '');
    const [cidade, setCidade] = useState(tutor?.endereco?.cidade || '');
    const [uf, setUf] = useState(tutor?.endereco?.uf || '');
    const [complemento, setComplemento] = useState(tutor?.endereco?.complemento || '');
    const [loadingCep, setLoadingCep] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Helpers de validação
    const onlyDigits = (v) => String(v || '').replace(/\D/g, '');
    const isEmail = (v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
    const phoneDigits = onlyDigits(telefone);
    const cepDigits = onlyDigits(cep);

    // Regras:
    // - nome obrigatório
    // - telefone 10–11 dígitos (com DDD)
    // - email válido (se informado)
    // - se CEP informado: 8 dígitos
    // - UF 2 letras (se informado)
    // - (logradouro/número/bairro/cidade) não obrigatórios, mas recomendados; se quiser, torne-os obrigatórios
    const isValid = useMemo(() => {
        if (!nome.trim()) return false;
        if (phoneDigits.length < 10 || phoneDigits.length > 11) return false;
        if (!isEmail(email)) return false;
        if (cepDigits && cepDigits.length !== 8) return false;
        if (uf && uf.trim().length !== 2) return false;
        return true;
    }, [nome, phoneDigits.length, email, cepDigits, uf]);

    // CEP -> ViaCEP
    const onChangeCep = async (value) => {
        const digits = onlyDigits(value);
        setCep(digits);

        // limpa campos que dependem do CEP
        setLogradouro('');
        setNumero('');
        setBairro('');
        setCidade('');
        setUf('');
        setComplemento('');

        if (digits.length === 8) {
            try {
                setLoadingCep(true);
                const addr = await fetchAddressByCep(digits);
                setLogradouro(addr.logradouro);
                setBairro(addr.bairro);
                setCidade(addr.cidade);
                setUf(addr.uf);
                setComplemento(addr.complemento || '');
                numeroRef.current?.focus(); // foco no número após preencher
            } catch (err) {
                Alert.alert('CEP', err?.message || 'Não foi possível buscar o CEP.');
            } finally {
                setLoadingCep(false);
            }
        }
    };

    const onSubmit = async () => {
        if (!isValid || submitting) return;
        setSubmitting(true);

        try {
            const endereco = {
                cep: cepDigits,
                logradouro: logradouro?.trim(),
                numero: numero?.trim(),
                bairro: bairro?.trim(),
                cidade: cidade?.trim(),
                uf: uf?.trim(),
                complemento: complemento?.trim(),
            };

            let geo;
            try {
                geo = await geocodeAddress(endereco);
            } catch (e) {
                console.warn('Geocoding falhou:', e?.message);
                Alert.alert('Atenção', 'Não foi possível obter as coordenadas. O cadastro seguirá sem mapa.');
            }

            if (tutor?.id) {
                await dispatch(updateTutor({ id: tutor.id, patch: { nome, telefone: phoneDigits, email, endereco, geo } }));
                Alert.alert('Sucesso', 'Tutor atualizado!');
            } else {
                await dispatch(addTutor({ nome, telefone: phoneDigits, email, endereco, geo }));
                Alert.alert('Sucesso', 'Tutor cadastrado!');
            }
            onSuccess?.();
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
        >
            <Screen>
                {/* Dados básicos */}
                <View style={{ gap: 10 }}>
                    <ThemedTextInput
                        placeholder="Nome"
                        value={nome}
                        onChangeText={setNome}
                        returnKeyType="next"
                        onSubmitEditing={() => telefoneRef.current?.focus()}
                    />
                    <ThemedTextInput
                        placeholder="Telefone"
                        ref={telefoneRef}
                        value={maskPhone(telefone)}
                        onChangeText={(v) => setTelefone(onlyDigits(v))}
                        keyboardType="phone-pad"
                        returnKeyType="next"
                        onSubmitEditing={() => emailRef.current?.focus()}
                    />
                    <ThemedTextInput
                        placeholder="E-mail"
                        value={email}
                        ref={emailRef}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        returnKeyType="next"
                        onSubmitEditing={() => cepRef.current?.focus()}
                    />
                </View>

                {/* Endereço */}
                <View style={{ gap: 10, marginTop: 16 }}>
                    <Text style={{ color: subtle, fontWeight: '700' }}>Endereço</Text>

                    <View style={{ position: 'relative' }}>
                        <ThemedTextInput
                            placeholder="CEP"
                            ref={cepRef}
                            value={maskCep(cep)}
                            onChangeText={onChangeCep}
                            keyboardType="number-pad"
                            maxLength={9}
                            style={{ paddingRight: 36 }}
                            returnKeyType="next"
                            onSubmitEditing={() => numeroRef.current?.focus()}
                        />
                        {loadingCep && (
                            <View style={{ position: 'absolute', right: 12, top: 12 }}>
                                <ActivityIndicator size="small" />
                            </View>
                        )}
                    </View>

                    <ThemedTextInput
                        placeholder="Logradouro"
                        value={logradouro}
                        onChangeText={setLogradouro}
                        returnKeyType="next"
                    />
                    <ThemedTextInput
                        placeholder="Número"
                        ref={numeroRef}
                        value={numero}
                        onChangeText={setNumero}
                        keyboardType="number-pad"
                        returnKeyType="next"
                    />
                    <ThemedTextInput
                        placeholder="Bairro"
                        value={bairro}
                        onChangeText={setBairro}
                        returnKeyType="next"
                    />
                    <ThemedTextInput
                        placeholder="Cidade"
                        value={cidade}
                        onChangeText={setCidade}
                        returnKeyType="next"
                    />
                    <ThemedTextInput
                        placeholder="UF"
                        value={uf}
                        onChangeText={setUf}
                        autoCapitalize="characters"
                        maxLength={2}
                        returnKeyType="next"
                    />
                    <ThemedTextInput
                        placeholder="Complemento"
                        value={complemento}
                        onChangeText={setComplemento}
                        returnKeyType="done"
                    />
                </View>

                <ThemedButton
                    title={submitting ? 'Salvando…' : 'Salvar'}
                    variant="primary"
                    onPress={onSubmit}
                    disabled={!isValid || submitting || loadingCep}
                />
            </Screen>
        </KeyboardAvoidingView>
    );
}