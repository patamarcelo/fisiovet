import React from 'react';
import { Text } from 'react-native';
import Screen from '../_ui/Screen';

export default function FinanceiroIndex() {
  return (
    <Screen>
      <Text style={{ fontSize: 20, fontWeight: '700' }}>Financeiro</Text>
      <Text>Resumo: a receber, recebidos, inadimplência</Text>
    </Screen>
  );
}
