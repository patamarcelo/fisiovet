import React from 'react';
import { Text } from 'react-native';
import Screen from '../_ui/Screen';

export default function BibliotecaDetail() {
  return (
    <Screen>
      <Text style={{ fontSize: 20, fontWeight: '600' }}>Exercício</Text>
      <Text>Instruções, mídia, tags</Text>
    </Screen>
  );
}