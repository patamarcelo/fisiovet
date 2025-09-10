import React from 'react';
import { Stack } from 'expo-router';

export default function BibliotecaLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Sem declarar Screens aqui: o router descobre sozinho */}
    </Stack>
  );
}