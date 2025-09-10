import React from 'react';
import { Text } from 'react-native';
import Screen from '../_ui/Screen';

export default function TutoresList() {
  return (
    <Screen>
      <Text style={{ fontSize: 20, fontWeight: '600' }}>Tutores</Text>
      <Text>Lista e busca por nome/telefone</Text>
    </Screen>
  );
}