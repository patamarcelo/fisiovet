import React from 'react';
import { Stack } from 'expo-router';

export default function PacientesLayout() {
  return (
    <Stack
      initialRouteName="index"           // ⬅ garante que entra na LISTA
      screenOptions={{
        headerShown: true,
        headerLargeTitle: false,
        headerTitle: 'Pets',
      }}
    >
      {/* Declarar explicitamente ajuda o Router a não “pular” pro [id] */}
      <Stack.Screen name="index" options={{ title: 'Pets' }} />
      <Stack.Screen name="[id]" options={{ title: 'Detalhe' }} />
    </Stack>
  );
}