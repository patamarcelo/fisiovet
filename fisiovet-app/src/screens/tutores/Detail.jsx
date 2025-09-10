import React from 'react';
import { Text } from 'react-native';
import Screen from '../_ui/Screen';

export default function TutorDetail() {
  return (
    <Screen>
      <Text style={{ fontSize: 20, fontWeight: '600' }}>Perfil do Tutor</Text>
      <Text>Contatos, endereço, pets</Text>
    </Screen>
  );
}