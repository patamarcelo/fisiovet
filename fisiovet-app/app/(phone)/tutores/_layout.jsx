// app/(phone)/tutores/_layout.jsx
import React from 'react';
import { Stack } from 'expo-router';
import { useThemeColor } from '@/hooks/useThemeColor';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Pressable } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import * as Haptics from 'expo-haptics'

function EditButton() {
  const { id } = useLocalSearchParams();
  const tint = useThemeColor({}, 'tint');
  return (
    <Pressable onPress={() => router.push(`/(phone)/tutores/${id}/edit`)} hitSlop={10}>
      <IconSymbol name="square.and.pencil" size={20} color={tint} />
    </Pressable>
  );
}


function AddButton() {
  const tint = useThemeColor({}, 'tint');
  const handleAdd = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
    // router.push('/(phone)/tutores/novo')
    router.push('/(modals)/tutor-new');
  }
  return (
    <Pressable onPress={handleAdd} hitSlop={10} accessibilityLabel="Novo tutor">
      <IconSymbol name="plus" size={20} color={tint} />
    </Pressable>
  );
}


export default function TutoresLayout() {
  const card = useThemeColor({}, 'card');
  const tint = useThemeColor({}, 'tint');

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: card },
        headerShadowVisible: false,     // 🔒 sem barra/sombra cinza
        headerTintColor: tint,
        headerBackTitleVisible: false,
        headerLargeTitle: false,        // default pequeno
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          headerLargeTitle: true,       // só aqui é large
          headerTitle: 'Tutores',
          headerRight: () => <AddButton />,   // 👈 aqui
          // headerRight, se quiser um + aqui
        }}
      />
      <Stack.Screen
        name="novo"
        options={{ headerLargeTitle: false, headerTitle: 'Novo Tutor' }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          headerLargeTitle: false,
          headerTitle: '',              // sem título, só a seta
          headerRight: () => <EditButton />, // ✅ sem setOptions no componente
        }}
      />
      <Stack.Screen
        name="[id]/edit"
        options={{
          headerLargeTitle: false,
          headerTitle: 'Editar', // se quiser dinâmico, dá pra ler do Redux com um HeaderTitleComponent
        }}
      />
    </Stack>
  );
}