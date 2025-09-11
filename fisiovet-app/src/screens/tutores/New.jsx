import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, Alert } from 'react-native';
import { useDispatch } from 'react-redux';
import { addTutor } from '@/src/store/slices/tutoresSlice';
import { useThemeColor } from '@/hooks/useThemeColor';
import Screen from '../_ui/Screen';
import { useRouter } from 'expo-router';

export default function TutoresNew() {
  const dispatch = useDispatch();
  const router = useRouter();
  const text = useThemeColor({}, 'text');
  const tint = useThemeColor({}, 'tint');
  const subtle = useThemeColor({ light: '#6B7280', dark: '#9AA0A6' }, 'text'); // 👈 cor do placeholder

  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');

  const onSubmit = async () => {
    if (!nome.trim()) return Alert.alert('Validação', 'Informe o nome do tutor.');
    await dispatch(addTutor({ nome, telefone, email, endereco: {} }));
    Alert.alert('Sucesso', 'Tutor cadastrado!');
    router.back();
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
      <Text style={{ fontSize: 20, fontWeight: '700', color: text }}>Novo Tutor</Text>

      <View style={{ gap: 10 }}>
        <TextInput
          placeholder="Nome"
          placeholderTextColor={subtle}
          value={nome}
          onChangeText={setNome}
          style={inputStyle}
        />
        <TextInput
          placeholder="Telefone"
          placeholderTextColor={subtle}
          value={telefone}
          onChangeText={setTelefone}
          style={inputStyle}
          keyboardType="phone-pad"
        />
        <TextInput
          placeholder="E-mail"
          placeholderTextColor={subtle}
          value={email}
          onChangeText={setEmail}
          style={inputStyle}
          keyboardType="email-address"
        />
      </View>

      <Pressable
        onPress={onSubmit}
        style={{
          marginTop: 12,
          backgroundColor: tint,
          padding: 12,
          borderRadius: 10,
          alignItems: 'center',
        }}
      >
        <Text style={{ color: 'white', fontWeight: '700' }}>Salvar</Text>
      </Pressable>
    </Screen>
  );
}