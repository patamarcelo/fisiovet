import React from 'react';
import { Text } from 'react-native';
import Screen from '../_ui/Screen';

export default function Invoices() {
  return (
    <Screen>
      <Text style={{ fontSize: 20, fontWeight: '600' }}>Faturas</Text>
      <Text>Lista de faturas</Text>
    </Screen>
  );
}
