// app/(home-modals)/_layout.jsx
// @ts-nocheck

import React from "react";
import { Pressable } from "react-native";
import { Stack, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { useThemeColor } from "@/hooks/useThemeColor";

function CloseButton() {
    const tint = useThemeColor({}, "tint");

    return (
        <Pressable
            onPress={() => {
                Haptics.selectionAsync().catch(() => { });

                if (router.canGoBack()) {
                    router.back();
                    return;
                }

                router.replace("/(phone)");
            }}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Fechar"
        >
            <Ionicons
                name="close"
                size={23}
                color={tint}
            />
        </Pressable>
    );
}

export default function HomeModalsLayout() {
    const background = useThemeColor({}, "background");
    const tint = useThemeColor({}, "tint");
    const text = useThemeColor({}, "text");

    return (
        <Stack
            screenOptions={{
                headerShown: true,
                headerShadowVisible: false,
                headerBackTitleVisible: false,
                headerLargeTitle: false,

                headerStyle: {
                    backgroundColor: background,
                },

                headerTintColor: tint,

                headerTitleStyle: {
                    color: text,
                    fontWeight: "800",
                },

                contentStyle: {
                    backgroundColor: background,
                },

                presentation: "fullScreenModal",
                animation: "slide_from_bottom",

                gestureEnabled: true,
                gestureDirection: "vertical",
            }}
        >
            <Stack.Screen
                name="financeiro/[id]"
                options={{
                    title: "Lançamento",
                    headerTitleAlign: "center",

                    headerLeft: () => (
                        <CloseButton />
                    ),

                    headerLeftContainerStyle: {
                        minWidth: 64,
                    },

                    headerRightContainerStyle: {
                        minWidth: 64,
                    },
                }}
            />
            <Stack.Screen
                name="agenda-new"
                options={{
                    headerShown: true,
                    title: "Agendar",

                    presentation: "fullScreenModal",
                    animation: "slide_from_bottom",

                    gestureEnabled: true,
                    gestureDirection: "vertical",

                    headerTitleAlign: "center",

                    headerTitleContainerStyle: {
                        flex: 1,
                        alignItems: "center",
                    },

                    headerLeftContainerStyle: {
                        minWidth: 84,
                    },

                    headerRightContainerStyle: {
                        minWidth: 84,
                    },
                }}
            />
            <Stack.Screen
                name="tutor-new"
                options={{
                    headerShown: true,
                    title: "Novo Tutor",

                    presentation: "fullScreenModal",
                    animation: "slide_from_bottom",

                    gestureEnabled: true,
                    gestureDirection: "vertical",

                    headerTitleAlign: "center",

                    headerTitleContainerStyle: {
                        flex: 1,
                        alignItems: "center",
                    },

                    headerLeftContainerStyle: {
                        minWidth: 84,
                    },

                    headerRightContainerStyle: {
                        minWidth: 84,
                    },
                }}
            />
            <Stack.Screen
                name="pet-new"
                options={{
                    headerShown: true,
                    title: "Novo Pet",

                    presentation: "fullScreenModal",
                    animation: "slide_from_bottom",

                    gestureEnabled: true,
                    gestureDirection: "vertical",

                    headerTitleAlign: "center",

                    headerTitleContainerStyle: {
                        flex: 1,
                        alignItems: "center",
                    },

                    headerLeftContainerStyle: {
                        minWidth: 84,
                    },

                    headerRightContainerStyle: {
                        minWidth: 84,
                    },
                }}
            />
            <Stack.Screen
                name="assinatura"
                options={{
                    headerShown: true,
                    title: "Assinatura",

                    presentation: "fullScreenModal",
                    animation: "slide_from_bottom",

                    gestureEnabled: true,
                    gestureDirection: "vertical",

                    headerTitleAlign: "center",

                    headerTitleContainerStyle: {
                        flex: 1,
                        alignItems: "center",
                    },

                    headerLeftContainerStyle: {
                        minWidth: 84,
                    },

                    headerRightContainerStyle: {
                        minWidth: 84,
                    },
                }}
            />
        </Stack>
    );
}