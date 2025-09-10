import React from 'react';
import { Text } from 'react-native';
import Screen from '../_ui/Screen';

export default function ConfigAPIs() {
  return (
    <Screen>
      <Text style={{ fontSize: 20, fontWeight: '600' }}>Integrações & API Keys</Text>
      <Text>Stripe / Mercado Pago / Asaas · Google · ViaCEP</Text>
    </Screen>
  );
}
