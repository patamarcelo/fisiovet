import { Stack, useRouter } from "expo-router";
import { Pressable } from "react-native";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { useThemeColor } from "@/hooks/useThemeColor";

function BackButton() {
  const router = useRouter();
  const tint = useThemeColor({}, "tint");

  return (
    <Pressable
      onPress={() => router.back()}
      style={({ pressed }) => [
        { opacity: pressed ? 0.6 : 1, paddingHorizontal: 8 },
      ]}
      hitSlop={10}
    >
      <IconSymbol name="chevron.left" size={20} color={tint} />
    </Pressable>
  );
}

export default function ConfigLayout() {
  const bg = useThemeColor({}, "background");
  const text = useThemeColor({}, "text");
  const tint = useThemeColor({}, "tint");

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerLargeTitle: false,
        headerTransparent: false,
        headerBlurEffect: undefined,
        headerStyle: { backgroundColor: bg },
        headerTintColor: tint,
        headerTitleStyle: {
          color: text,
          fontWeight: "800",
        },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: bg },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          headerTitle: "Configurações",
          headerLeft: () => <BackButton />,
        }}
      />

      <Stack.Screen name="aparencia" options={{ headerTitle: "Aparência" }} />
      <Stack.Screen name="perfil" options={{ headerTitle: "Perfil" }} />
      <Stack.Screen name="duration" options={{ headerTitle: "Duração" }} />
      <Stack.Screen name="startevent" options={{ headerTitle: "Início do Dia" }} />
      <Stack.Screen name="assinatura" options={{ headerTitle: "Assinatura" }} />
    </Stack>
  );
}