// app/(modals)/_layout.jsx
//@ts-nocheck
import React from 'react';
import { Platform, Pressable } from 'react-native';
import { Stack, router } from 'expo-router';
import { useThemeColor } from '@/hooks/useThemeColor';
import { IconSymbol } from '@/components/ui/IconSymbol';

function CloseButton() {
    const tint = useThemeColor({}, 'tint');
    return (
        <Pressable
            onPress={() => (router.canGoBack?.() ? router.back() : router.replace('/(phone)'))}
            hitSlop={10}
            accessibilityLabel="Fechar"
        >
            <IconSymbol name="xmark" size={20} color={tint} />
        </Pressable>
    );
}

export default function ModalLayout() {
    const bg = useThemeColor({}, 'background');
    const tint = useThemeColor({}, 'tint');
    const text = useThemeColor({}, "text");

    return (
        <Stack
            screenOptions={{
                presentation: Platform.select({
                    ios: "modal",
                    android: "transparentModal",
                    default: "modal",
                }),
                headerShown: true,
                headerBackTitleVisible: false,
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

            {/* <Stack.Screen name="pet-form" options={{ title: 'Novo pet', headerRight: () => <CloseButton /> }} /> */}
            <Stack.Screen
                name="agenda-new"
                options={{
                    title: 'Agendar',
                    presentation: 'fullScreenModal',
                    animation: "slide_from_bottom",
                    // Nada de headerRight aqui! Deixa a própria tela controlar.
                    headerTitleAlign: 'center',
                    headerTitleContainerStyle: { flex: 1, alignItems: 'center' },
                    headerLeftContainerStyle: { minWidth: 72 },
                    headerRightContainerStyle: { minWidth: 72 },
                }}
            />
            <Stack.Screen
                name="financeiro"
                options={{
                    headerShown: false,
                    presentation: "card",
                    animation: "slide_from_right",
                    gestureEnabled: true,
                }}
            />
            <Stack.Screen
                name="financeiro-home/[id]"
                options={{
                    headerShown: true,
                    title: "Lançamento",

                    presentation: "fullScreenModal",
                    animation: "slide_from_bottom",

                    gestureEnabled: true,
                    gestureDirection: "vertical",

                    headerTitleAlign: "center",
                    headerBackTitleVisible: false,
                    headerShadowVisible: false,
                }}
            />
            <Stack.Screen
                name="tutores/[id]/detail"
                options={{
                    headerShown: false,
                    presentation: "card",
                    animation: "slide_from_right",
                    gestureEnabled: true,
                }}
            />
            <Stack.Screen
                name="tutor-new"
                options={{
                    title: 'Novo Tutor',
                    presentation: "fullScreenModal",
                    // Nada de headerRight aqui! Deixa a própria tela controlar.
                    headerTitleAlign: 'center',
                    headerTitleContainerStyle: { flex: 1, alignItems: 'center' },
                    headerLeftContainerStyle: { minWidth: 72 },
                    headerRightContainerStyle: { minWidth: 72 },
                }}
            />

            <Stack.Screen
                name="pets/[id]/avaliacao"
                options={{
                    title: "Avaliações",
                    headerShown: false,
                    presentation: "modal",
                }}
            />
            <Stack.Screen
                name="pets"
                options={{
                    title: "",
                    headerShown: false,
                    presentation: "modal",
                }}
            />
            <Stack.Screen
                name="exam-new"
                options={{
                    title: 'Novo Exame',
                    presentation: "fullScreenModal",
                    // Nada de headerRight aqui! Deixa a própria tela controlar.
                    headerTitleAlign: 'center',
                    headerTitleContainerStyle: { flex: 1, alignItems: 'center' },
                    headerLeftContainerStyle: { minWidth: 72 },
                    headerRightContainerStyle: { minWidth: 72 },
                }}
            />
            <Stack.Screen
                name="avaliacao/avaliacao-anamnese"
                options={{
                    presentation: "fullScreenModal",
                    title: "Anamnese",
                    headerTitleAlign: "center",
                    headerTitleContainerStyle: { flex: 1, alignItems: "center" },
                    headerLeftContainerStyle: { minWidth: 72 },
                    headerRightContainerStyle: { minWidth: 72 },
                }}
            />

            <Stack.Screen
                name="avaliacao/avaliacao-neurologica"
                options={{
                    presentation: "fullScreenModal",
                    title: "Avaliação Neurológica",
                    headerTitleAlign: "center",
                    headerTitleContainerStyle: { flex: 1, alignItems: "center" },
                    headerLeftContainerStyle: { minWidth: 72 },
                    headerRightContainerStyle: { minWidth: 72 },
                }}
            />

            <Stack.Screen
                name="avaliacao/avaliacao-ortopedica"
                options={{
                    presentation: "fullScreenModal",
                    title: "Avaliação Ortopédica",
                    headerTitleAlign: "center",
                    headerTitleContainerStyle: { flex: 1, alignItems: "center" },
                    headerLeftContainerStyle: { minWidth: 72 },
                    headerRightContainerStyle: { minWidth: 72 },
                }}
            />

            <Stack.Screen
                name="pets/[id]/detail"
                options={{
                    headerShown: false,
                    presentation: "card",
                    animation: "slide_from_right",
                    gestureEnabled: true,
                }}
            />
            <Stack.Screen
                name="pets/[id]/timeline"
                options={{
                    headerShown: false,
                    title: "Timeline",
                    presentation: "card",
                    animation: "slide_from_right",
                    gestureEnabled: true,
                }}
            />
            <Stack.Screen
                name="agenda"
                options={{
                    headerShown: false,
                    presentation: "fullScreenModal",
                    animation: "slide_from_bottom",
                    gestureEnabled: true,
                    gestureDirection: "vertical",
                }}
            />
            <Stack.Screen
                name="anotacoes"
                options={{
                    headerShown: false,
                    presentation: "fullScreenModal",
                    animation: "slide_from_bottom",
                    gestureEnabled: true,
                    gestureDirection: "vertical",
                }}
            />

            {/* Adicione aqui outras telas modais, cada uma com suas opções:
        */}
        </Stack>
    );
}