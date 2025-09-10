import React from 'react';
import { Stack } from 'expo-router';

export default function TutoresLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Sem declarar Screens aqui: o router descobre sozinho */}
    </Stack>
  );
}