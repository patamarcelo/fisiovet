import React from 'react';
import { Stack } from 'expo-router';

export default function AgendaLayout() {
    return (
        <Stack screenOptions={{ headerShown: true }} >
            {/* Sem declarar Screens aqui: o router descobre sozinho */}
        </Stack>
    );
}