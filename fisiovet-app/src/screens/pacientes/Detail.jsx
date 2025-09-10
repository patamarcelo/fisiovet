import React from 'react';
import { Text } from 'react-native';
import Screen from '../_ui/Screen';

export default function PacienteDetail() {
  return (
    <Screen>
      <Text style={{ fontSize: 20, fontWeight: '600' }}>Perfil do Paciente</Text>
      <Text>Dados, foto, ações rápidas</Text>
    </Screen>
  );
}