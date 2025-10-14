import React from 'react';
import { Stack } from 'expo-router';

export default function PacientesLayout() {
  return (
    <Stack
      initialRouteName="index"           // ⬅ garante que entra na LISTA
      screenOptions={{
        headerShown: false,
        headerLargeTitle: false,
      }}
    >
      {/* Declarar explicitamente ajuda o Router a não “pular” pro [id] */}
      <Stack.Screen name="index" options={{ title: 'Pets', headerShown: true }} />
      <Stack.Screen name="[id]" options={{ title: 'Detalhe', headerShown: true }} />
      <Stack.Screen name="[id]/exam" options={{ title: 'Exames', headerShown: true }} />
      <Stack.Screen name="[id]/avaliacao" options={{ title: 'Avaliações', headerShown: true }} />
    </Stack>
  );
}