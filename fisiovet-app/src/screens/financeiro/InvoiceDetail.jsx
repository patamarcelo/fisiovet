import React from 'react';
import { Text } from 'react-native';
import Screen from '../_ui/Screen';

export default function InvoiceDetail() {
  return (
    <Screen>
      <Text style={{ fontSize: 20, fontWeight: '600' }}>Detalhe da Fatura</Text>
      <Text>Status, itens, ações (link de pagamento)</Text>
    </Screen>
  );
}
