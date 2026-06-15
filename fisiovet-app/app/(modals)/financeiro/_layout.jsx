import React from 'react';

import {
    Stack,
} from 'expo-router';

export default function FinanceiroModalLayout() {
    return (
        <Stack
            screenOptions={{
                headerShadowVisible:
                    false,

                gestureEnabled:
                    true,
            }}
        >
            <Stack.Screen
                name="novo"
                options={{
                    title:
                        'Novo lançamento',

                    presentation:
                        'fullScreenModal',

                    animation:
                        'slide_from_bottom',

                    gestureDirection:
                        'vertical',
                }}
            />

            <Stack.Screen
                name="[id]"
                options={{
                    title:
                        'Lançamento',

                    presentation:
                        'fullScreenModal',

                    animation:
                        'slide_from_bottom',

                    gestureDirection:
                        'vertical',
                }}
            />
        </Stack>
    );
}