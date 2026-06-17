// app/(modals)/pets/_layout.jsx
// @ts-nocheck

import React from "react";
import {
  Pressable,
  StyleSheet,
} from "react-native";

import {
  Stack,
  router,
} from "expo-router";

import { Ionicons } from "@expo/vector-icons";
import { useThemeColor } from "@/hooks/useThemeColor";

function CloseButton() {
  const tint = useThemeColor({}, "tint");

  const handleClose = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/(phone)/pets");
  };

  return (
    <Pressable
      onPress={handleClose}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel="Fechar"
      style={({ pressed }) => [
        styles.headerButton,
        pressed && styles.headerButtonPressed,
      ]}
    >
      <Ionicons
        name="close"
        size={21}
        color={tint}
      />
    </Pressable>
  );
}

function BackButton() {
  const tint = useThemeColor({}, "tint");

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/(phone)/pets");
  };

  return (
    <Pressable
      onPress={handleBack}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel="Voltar"
      style={({ pressed }) => [
        styles.headerButton,
        pressed && styles.headerButtonPressed,
      ]}
    >
      <Ionicons
        name="chevron-back"
        size={23}
        color={tint}
      />
    </Pressable>
  );
}

export default function PetsModalLayout() {
  const bg = useThemeColor({}, "background");
  const tint = useThemeColor({}, "tint");
  const text = useThemeColor({}, "text");

  return (
    <Stack
      screenOptions={{
        headerShown: true,

        /*
         * O fluxo pets inteiro já foi aberto como
         * fullScreenModal pelo layout pai.
         */
        presentation: "card",
        animation: "slide_from_right",

        gestureEnabled: true,
        fullScreenGestureEnabled: true,

        headerBackVisible: false,
        headerBackTitleVisible: false,
        headerLargeTitle: false,
        headerShadowVisible: false,
        headerTitleAlign: "center",

        headerStyle: {
          backgroundColor: bg,
        },

        headerTintColor: tint,

        headerTitleStyle: {
          color: text,
          fontWeight: "800",
        },

        headerLeftContainerStyle: {
          minWidth: 64,
          paddingLeft: 12,
        },

        headerRightContainerStyle: {
          minWidth: 64,
          paddingRight: 12,
        },

        contentStyle: {
          flex: 1,
          backgroundColor: bg,
        },
      }}
    >
      <Stack.Screen
        name="[id]"
        options={{
          title: "Pet",
          headerLeft: () => <CloseButton />,
        }}
      />

      <Stack.Screen
        name="[id]/detail"
        options={{
          title: "Detalhes",
          headerLeft: () => <BackButton />,
        }}
      />

      <Stack.Screen
        name="[id]/timeline"
        options={{
          title: "Timeline",
          headerLeft: () => <BackButton />,
        }}
      />

      <Stack.Screen
        name="[id]/avaliacao"
        options={{
          title: "Avaliações",
          headerLeft: () => <BackButton />,
        }}
      />

      <Stack.Screen
        name="[id]/exam"
        options={{
          title: "Exames",
          headerLeft: () => <BackButton />,
        }}
      />
    </Stack>
  );
}

const styles = StyleSheet.create({
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(118,118,128,0.10)",
  },

  headerButtonPressed: {
    opacity: 0.62,
    transform: [{ scale: 0.96 }],
  },
});