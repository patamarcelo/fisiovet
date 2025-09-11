import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, Alert } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { addTutor, updateTutor } from '@/src/store/slices/tutoresSlice';
import { useThemeColor } from '@/hooks/useThemeColor';
import Screen from '../_ui/Screen';

import ThemedTextInput from '../../../components/ui/ThemedTextInput';
import ThemedButton from '../../../components/ui/ThemedButton';
import useHideTabBar from '@/hooks/useHideBar';



export default function TutorForm({ tutor, onSuccess }) {
    useHideTabBar(true); // 👈 esconde a tab bar enquanto essa tela estiver ativa
    const dispatch = useDispatch();
    const text = useThemeColor({}, 'text');
    const tint = useThemeColor({}, 'tint');
    const subtle = useThemeColor({ light: '#6B7280', dark: '#9AA0A6' }, 'text');

    const [nome, setNome] = useState(tutor?.nome || '');
    const [telefone, setTelefone] = useState(tutor?.telefone || '');
    const [email, setEmail] = useState(tutor?.email || '');

    const onSubmit = async () => {
        if (!nome.trim()) return Alert.alert('Validação', 'Informe o nome do tutor.');
        if (tutor?.id) {
            await dispatch(updateTutor({ id: tutor.id, patch: { nome, telefone, email } }));
            Alert.alert('Sucesso', 'Tutor atualizado!');
        } else {
            await dispatch(addTutor({ nome, telefone, email, endereco: {} }));
            Alert.alert('Sucesso', 'Tutor cadastrado!');
        }

        onSuccess?.();
    };

    const inputStyle = {
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.12)',
        padding: 10,
        borderRadius: 10,
        color: text,
    };

    return (
        <Screen>
            <Text style={{ fontSize: 20, fontWeight: '700', color: text }}>
                {tutor ? 'Editar Tutor' : 'Novo Tutor'}
            </Text>

            <View style={{ gap: 10 }}>
                <ThemedTextInput
                    placeholder="Nome"
                    value={nome}
                    onChangeText={setNome}
                />
                <ThemedTextInput
                    placeholder="telefone"
                    value={telefone}
                    onChangeText={setTelefone}
                    keyboardType="phone-pad"

                />
                <ThemedTextInput
                    placeholder="E-mail"
                    value={email}
                    onChangeText={setEmail}
                />
            </View>

            <ThemedButton title="Salvar" variant="primary" onPress={onSubmit} />
        </Screen>
    );
}