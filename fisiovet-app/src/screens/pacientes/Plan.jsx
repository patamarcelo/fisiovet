import React from 'react';
import { Text } from 'react-native';
import Screen from '../_ui/Screen';

export default function PacientePlan() {
  return (
    <Screen>
      <Text style={{ fontSize: 20, fontWeight: '600' }}>Plano de Tratamento</Text>
      <Text>Objetivos, exercícios e rotinas</Text>
    </Screen>
  );
}