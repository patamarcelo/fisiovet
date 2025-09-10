import React from 'react';
import { Text } from 'react-native';
import Screen from '../_ui/Screen';

export default function ConfigProfile() {
  return (
    <Screen>
      <Text style={{ fontSize: 20, fontWeight: '600' }}>Perfil Profissional</Text>
      <Text>Dados do profissional/clinica</Text>
    </Screen>
  );
}