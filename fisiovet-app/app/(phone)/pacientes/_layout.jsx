import React from 'react';
import { Stack } from 'expo-router';

export default function PacientesLayout() {
  return (
    <Stack screenOptions={{ headerShown: true }}>
      {/* Sem declarar Screens aqui: o router descobre sozinho */}
    </Stack>
  );
}