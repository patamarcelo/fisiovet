// src/screens/tutores/Form.jsx
import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { View, Text, Alert, ActivityIndicator, Platform, KeyboardAvoidingView, Pressable } from 'react-native';
import { useDispatch } from 'react-redux';
import { addTutor, deleteTutor, updateTutor } from '@/src/store/slices/tutoresSlice';
import { useThemeColor } from '@/hooks/useThemeColor';
import Screen from '../_ui/Screen';
import ThemedTextInput from '@/components/ui/ThemedTextInput';
import ThemedButton from '@/components/ui/ThemedButton';
import useHideTabBar from '@/hooks/useHideBar';
import { fetchAddressByCep } from '@/src/services/cep';
import { geocodeAddress } from '@/src/services/geocoding';
import { maskCep, maskPhone } from '@/src/utils/masks';
import { router, useNavigation, useLocalSearchParams } from 'expo-router';
import { IconSymbol } from '@/components/ui/IconSymbol';


export default function TutorForm({ tutor, onSuccess }) {
    useHideTabBar(true);
    const navigation = useNavigation();
    const dispatch = useDispatch();
    const { id } = useLocalSearchParams();

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

    const validation = useMemo(() => {
        const nameOk = !!nome.trim();
        const phoneOk = phoneDigits.length >= 10 && phoneDigits.length <= 11;
        const emailOk = isEmail(email);
        const cepOk = !cepDigits || cepDigits.length === 8; // CEP só valida se informado
        const ufOk = !uf || uf.trim().length === 2;        // UF só valida se informada
        return {
            nameOk,
            phoneOk,
            emailOk,
            cepOk,
            ufOk,
            isValid: nameOk && phoneOk && emailOk && cepOk && ufOk,
        };
    }, [nome, phoneDigits, email, cepDigits, uf]);

    const firstError = useMemo(() => {
        if (!validation.nameOk) return 'Informe o nome.';
        if (!validation.phoneOk) return 'Telefone deve ter 10–11 dígitos (com DDD).';
        if (!validation.emailOk) return 'E-mail inválido.';
        if (!validation.cepOk) return 'CEP deve ter 8 dígitos.';
        if (!validation.ufOk) return 'UF deve ter 2 letras.';
        return null;
    }, [validation]);

    const confirmDelete = useCallback(() => {
        Alert.alert('Excluir', 'Deseja excluir este tutor?', [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Excluir',
                style: 'destructive',
                onPress: async () => {
                    await dispatch(deleteTutor(id));
                    router.push('/(phone)/tutores');

                },
            },
        ]);
    }, [dispatch, id]);

    useEffect(() => {
        if (tutor?.nome) {

            navigation.setOptions({
                headerLargeTitle: false,
                headerBackTitleVisible: false,
                headerTitle: tutor?.nome || 'Editar Tutor',
                headerRight: () => (
                    <Pressable onPress={confirmDelete} hitSlop={10} accessibilityLabel="Excluir tutor">
                        <IconSymbol name="trash" size={24} />
                    </Pressable>
                ),
            });
        }
    }, [navigation, tutor?.nome, confirmDelete]);

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
    function normalizeGoogleAddress(components = []) {
        const get = (type) => {
            const c = components.find((x) => x.types?.includes(type));
            return c ? { long: c.long_name, short: c.short_name } : { long: '', short: '' };
        };

        const streetNumber = get('street_number');
        const route = get('route');
        const neighborhood = get('sublocality')?.long ? get('sublocality') : get('neighborhood');
        const locality = get('locality'); // cidade
        const admin1 = get('administrative_area_level_1'); // UF
        const postal = get('postal_code');
        const country = get('country');

        return {
            street_number: streetNumber.long,
            route: route.long,
            neighborhood: neighborhood.long,
            sublocality: get('sublocality').long,
            locality: locality.long,
            admin_area_level_1: admin1.short || admin1.long,
            country: country.short || country.long,
            postal_code: postal.long,
        };
    }
    const onSubmit = async () => {
        if (!validation.isValid || submitting) {
            if (!submitting && firstError) Alert.alert('Validação', firstError);
            return;
        }
        setSubmitting(true);

        try {
            // endereço digitado no form
            const enderecoBase = {
                cep: cepDigits,
                logradouro: logradouro?.trim(),
                numero: numero?.trim(),
                bairro: bairro?.trim(),
                cidade: cidade?.trim(),
                uf: uf?.trim(),
                complemento: complemento?.trim(),
            };

            let geoEnriched = undefined;
            let enderecoFinal = { ...enderecoBase };

            try {
                const geo = await geocodeAddress(enderecoBase);
                // geo esperado (baseado no seu log):
                // { formattedAddress, lat, lng, placeId, precision, raw, ... }
                const normalized = normalizeGoogleAddress(geo?.raw?.address_components || []);

                // enriquecer endereço salvo
                enderecoFinal = {
                    ...enderecoBase,
                    formatted: geo?.formattedAddress || undefined,
                    normalized, // rota, número, bairro, cidade etc. normalizados
                };

                // viewport / navigation_points quando houver
                const vp = geo?.raw?.geometry?.viewport;
                const navigationPoints = geo?.raw?.navigation_points;

                geoEnriched = {
                    lat: geo?.lat,
                    lng: geo?.lng,
                    placeId: geo?.placeId,
                    precision: geo?.precision || geo?.raw?.geometry?.location_type,
                    types: geo?.raw?.types || [],
                    viewport: vp
                        ? {
                            northeast: { lat: vp?.northeast?.lat, lng: vp?.northeast?.lng },
                            southwest: { lat: vp?.southwest?.lat, lng: vp?.southwest?.lng },
                        }
                        : undefined,
                    navigationPoints: navigationPoints || undefined,
                    provider: 'google',
                    retrievedAt: Date.now(),
                    raw: geo?.raw, // opcional: útil p/ auditoria e futuras features
                };

                // (opcional) se quiser calcular/geohash depois, dá pra incluir aqui
                // geoEnriched.geohash = encodeGeohash(geo.lat, geo.lng)
            } catch (e) {
                console.warn('Geocoding falhou:', e?.message);
                Alert.alert('Atenção', 'Não foi possível obter as coordenadas. O cadastro seguirá sem mapa.');
            }

            if (tutor?.id) {
                await dispatch(
                    updateTutor({
                        id: tutor.id,
                        patch: {
                            nome,
                            telefone: phoneDigits,
                            email,
                            endereco: enderecoFinal,
                            geo: geoEnriched, // pode ser undefined se falhou
                        },
                    })
                );
                Alert.alert('Sucesso', 'Tutor atualizado!');
            } else {
                await dispatch(
                    addTutor({
                        nome,
                        telefone: phoneDigits,
                        email,
                        endereco: enderecoFinal,
                        geo: geoEnriched, // pode ser undefined se falhou
                    })
                );
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
                    disabled={!validation.isValid || submitting || loadingCep}
                />
                {!validation.isValid && (
                    <Text style={{ color: subtle, marginTop: 8 }}>{firstError}</Text>
                )}
            </Screen>
        </KeyboardAvoidingView>
    );
}