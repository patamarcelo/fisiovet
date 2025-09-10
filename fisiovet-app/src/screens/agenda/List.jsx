import React from 'react';
import { Text } from 'react-native';
import Screen from '../_ui/Screen';

export default function AgendaList() {
  return (
    <Screen>
      <Text style={{ fontSize: 20, fontWeight: '600' }}>Agenda</Text>
      <Text>Filtros: Dia / Semana / Mês · Status</Text>
    </Screen>
  );
}
