// app/(modals)/anotacoes/_layout.jsx
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

function BackButton() {
  const tint = useThemeColor(
    {},
    "tint"
  );

  return (
    <Pressable
      onPress={() => {
        if (router.canGoBack()) {
          router.back();
          return;
        }

        router.replace(
          "/(phone)/pets"
        );
      }}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel="Voltar"
      style={({ pressed }) => [
        styles.headerButton,
        pressed &&
          styles.headerButtonPressed,
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

export default function AnotacoesLayout() {
  const bg = useThemeColor(
    {},
    "background"
  );

  const text = useThemeColor(
    {},
    "text"
  );

  const tint = useThemeColor(
    {},
    "tint"
  );

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        presentation: "card",
        animation:
          "slide_from_right",
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

        headerLeft: () => (
          <BackButton />
        ),
      }}
    >
      <Stack.Screen
        name="[petId]"
        options={{
          title: "Anotações",
        }}
      />
    </Stack>
  );
}

const styles =
  StyleSheet.create({
    headerButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor:
        "rgba(118,118,128,0.10)",
    },

    headerButtonPressed: {
      opacity: 0.62,
      transform: [
        {
          scale: 0.96,
        },
      ],
    },
  });
