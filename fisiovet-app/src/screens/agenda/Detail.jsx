import React from 'react';
import { Text } from 'react-native';
import Screen from '../_ui/Screen';

export default function AgendaDetail() {
  return (
    <Screen>
      <Text style={{ fontSize: 20, fontWeight: '600' }}>Detalhe do Agendamento</Text>
      <Text>Status, notas, link para gerar fatura…</Text>
    </Screen>
  );
}
