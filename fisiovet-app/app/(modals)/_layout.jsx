// app/(modals)/_layout.jsx
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

    return (
        <Stack
            screenOptions={{
                // iOS: modal “page sheet”; Android: transparente para parecer overlay
                presentation: Platform.select({ ios: 'modal', android: 'transparentModal', default: 'modal' }),
                headerBackTitleVisible: false,
                headerLargeTitle: false,
                headerStyle: { backgroundColor: bg },
                headerTintColor: tint,
            }}
        >
            {/* Mapa em tela cheia: título padrão + botão fechar.
          Se a tela 'map-full' definir o título dinamicamente, ela SOBRESCREVE este default. */}
            <Stack.Screen
                name="map-full"
                options={{
                    title: 'Mapa',
                    headerRight: () => <CloseButton />,
                }}
            />

            <Stack.Screen name="pet-form" options={{ title: 'Novo pet', headerRight: () => <CloseButton /> }} />
            <Stack.Screen name="agenda-new" options={{ title: 'Agendar', headerRight: () => <CloseButton /> }} />
            {/* Adicione aqui outras telas modais, cada uma com suas opções:
        */}
        </Stack>
    );
}