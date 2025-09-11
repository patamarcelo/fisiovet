import React from 'react';
import { Stack, useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useThemeColor } from '@/hooks/useThemeColor';
import { IconSymbol } from '@/components/ui/IconSymbol';

function HeaderActions() {
  const router = useRouter();
  const tint = useThemeColor({}, 'tint');

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
      {/* Botão Ajustes (engrenagem) */}
      {/* <Pressable
        onPress={() => router.push('/(phone)/configuracoes')}
        hitSlop={8}
        style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
      >
        <IconSymbol name="gearshape.fill" size={18} color={tint} />
      </Pressable> */}

      {/* Botão Novo */}
      <Pressable
        onPress={() => router.push('/(phone)/tutores/novo')}
        hitSlop={8}
        style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
      >
        <Text style={{ color: tint, fontWeight: '700' }}>Novo</Text>
      </Pressable>
    </View>
  );
}

export default function TutoresLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerLargeTitle: true,    // iOS: título grande que colapsa
        headerTitle: 'Tutores',
        headerStyle: { backgroundColor: 'transparent' },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          headerLargeTitle: true,
          headerTitle: 'Tutores',
          headerRight: () => <HeaderActions />,
        }}
      />
      <Stack.Screen name="novo" options={{ headerLargeTitle: false, headerTitle: 'Novo Tutor' }} />
      <Stack.Screen name="[id]"
        options={{
          headerLargeTitle: false,
          headerTitle: '',               // deixa sem título
        }}


      />
    </Stack>
  );
}