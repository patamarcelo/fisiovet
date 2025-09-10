import React from 'react';
import { Text } from 'react-native';
import Screen from '../_ui/Screen';

export default function Receipts() {
  return (
    <Screen>
      <Text style={{ fontSize: 20, fontWeight: '600' }}>Recebimentos</Text>
      <Text>Pagamentos confirmados</Text>
    </Screen>
  );
}