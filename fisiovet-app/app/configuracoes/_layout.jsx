import { Stack, useRouter } from 'expo-router';
import { Pressable, Text } from 'react-native';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useThemeColor } from '@/hooks/useThemeColor';

function BackButton() {
  const router = useRouter();
  const tint = useThemeColor({}, 'tint');
  return (
    <Pressable
      onPress={() => router.back()}
      style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1, paddingHorizontal: 8 }]}
    >
      <IconSymbol name="chevron.left" size={20} color={tint} />
    </Pressable>
  );
}

export default function ConfigLayout() {
  const router = useRouter();
  const tint = useThemeColor({}, 'tint');
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerLargeTitle: true,
        headerTitle: 'Configurações',
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          headerLargeTitle: true,
          headerTitle: 'Configurações',
          headerLeft: () => <BackButton />,
          headerRight: () => (
            <Pressable onPress={() => router.replace('/(phone)')}>
              <Text style={{ color: tint, fontWeight: '600' }}>Home</Text>
            </Pressable>
          )
        }}
      />
      <Stack.Screen name="aparencia" options={{ headerTitle: 'Aparência' }} />
    </Stack>
  );
}