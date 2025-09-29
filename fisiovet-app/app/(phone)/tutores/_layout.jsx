// app/(phone)/tutores/_layout.jsx
// @ts-nocheck
import React from 'react';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Pressable } from 'react-native';
import { useThemeColor } from '@/hooks/useThemeColor';
import { IconSymbol } from '@/components/ui/IconSymbol';
import * as Haptics from 'expo-haptics';

// Lê o id diretamente do contexto da tela [id]
function EditButton() {
  const { id } = useLocalSearchParams();           // <- pega dos params da rota atual
  const tint = useThemeColor({}, 'tint');

  // pode chegar undefined na 1ª render; evite quebrar
  if (!id) return null;

  // normaliza caso venha como array
  const normId = Array.isArray(id) ? id[0] : String(id);

  return (
    <Pressable
      onPress={() =>
        router.push({
          pathname: '/(modals)/tutor-new',
          params: { id: normId, mode: 'edit' },
        })
      }
      hitSlop={10}
    >
      <IconSymbol name="square.and.pencil" size={20} color={tint} />
    </Pressable>
  );
}

function AddButton() {
  const tint = useThemeColor({}, 'tint');
  const handleAdd = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    router.push('/(modals)/tutor-new');
  };
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
        headerShadowVisible: false,
        headerTintColor: tint,
        headerBackTitleVisible: false,
        headerLargeTitle: false,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          headerLargeTitle: true,
          headerTitle: 'Tutores',
          headerRight: () => <AddButton />,
        }}
      />

      <Stack.Screen
        name="[id]"
        options={{
          headerLargeTitle: false,
          headerTitle: '',
        }}
      />

      <Stack.Screen
        name="[id]/edit"
        options={{
          headerLargeTitle: false,
          headerTitle: 'Editar',
        }}
      />
    </Stack>
  );
}