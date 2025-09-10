import React from 'react';
import { Text } from 'react-native';
import Screen from '../_ui/Screen';

export default function ConfigIndex() {
  return (
    <Screen>
      <Text style={{ fontSize: 20, fontWeight: '700' }}>Configurações</Text>
      <Text>Preferências: notificações, duração, buffers…</Text>
    </Screen>
  );
}