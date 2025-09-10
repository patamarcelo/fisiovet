import React from 'react';
import { Text } from 'react-native';
import Screen from '../_ui/Screen';

export default function BibliotecaList() {
  return (
    <Screen>
      <Text style={{ fontSize: 20, fontWeight: '600' }}>Biblioteca</Text>
      <Text>Exercícios e modalidades</Text>
    </Screen>
  );
}
