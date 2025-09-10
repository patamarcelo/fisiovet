import React from 'react';
import { Text } from 'react-native';
import Screen from '../_ui/Screen';

export default function PacienteTimeline() {
  return (
    <Screen>
      <Text style={{ fontSize: 20, fontWeight: '600' }}>Evolução (SOAP)</Text>
      <Text>Notas, fotos e vídeos</Text>
    </Screen>
  );
}
