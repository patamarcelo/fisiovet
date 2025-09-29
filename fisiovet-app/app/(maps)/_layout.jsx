import React from 'react';
import { Stack } from 'expo-router';

export default function MapsLayout() {
    return (
        <Stack screenOptions={{ headerShown: false }}>
            {/* Sem declarar Screens aqui: o router descobre sozinho */}
            <Stack.Screen
                name="map-full-screen"
                options={{
                    title: 'Mapa',
                    // headerRight: () => <CloseButton />,
                }}
            />
        </Stack>
    );
}