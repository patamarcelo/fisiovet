import React from 'react';
import { Text } from 'react-native';
import Screen from '../_ui/Screen';

export default function PacientesNew() {
  return (
    <Screen>
      <Text style={{ fontSize: 20, fontWeight: '600' }}>Novo Paciente</Text>
      <Text>Form: dados do pet, vínculo ao tutor…</Text>
    </Screen>
  );
}
