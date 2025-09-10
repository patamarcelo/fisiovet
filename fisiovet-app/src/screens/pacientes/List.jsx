import React from 'react';
import { Text } from 'react-native';
import Screen from '../_ui/Screen';

export default function PacientesList() {
  return (
    <Screen>
      <Text style={{ fontSize: 20, fontWeight: '600' }}>Pacientes</Text>
      <Text>Lista com tutor, busca, filtros…</Text>
    </Screen>
  );
}
