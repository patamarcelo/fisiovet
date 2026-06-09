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
                    // Nada de headerRight aqui! Deixa a própria tela controlar.
                    headerTitleAlign: 'center',
                    headerTitleContainerStyle: { flex: 1, alignItems: 'center' },
                    headerLeftContainerStyle: { minWidth: 72 },
                    headerRightContainerStyle: { minWidth: 72 },
                }}
            />
            <Stack.Screen
                name="tutor-new"
                options={{
                    title: 'Novo Tutor',
                    // Nada de headerRight aqui! Deixa a própria tela controlar.
                    headerTitleAlign: 'center',
                    headerTitleContainerStyle: { flex: 1, alignItems: 'center' },
                    headerLeftContainerStyle: { minWidth: 72 },
                    headerRightContainerStyle: { minWidth: 72 },
                }}
            />
            <Stack.Screen
                name="exam-new"
                options={{
                    title: 'Novo Exame',
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
                    title: "Avaliação Ortopédica",
                    headerTitleAlign: "center",
                    headerTitleContainerStyle: { flex: 1, alignItems: "center" },
                    headerLeftContainerStyle: { minWidth: 72 },
                    headerRightContainerStyle: { minWidth: 72 },
                }}
            />
            {/* Adicione aqui outras telas modais, cada uma com suas opções:
        */}
        </Stack>
    );
}