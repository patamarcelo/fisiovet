import React from 'react';
import { Stack } from 'expo-router';
import { useThemeColor } from "@/hooks/useThemeColor";

export default function AgendaLayout() {
    const bg = useThemeColor({}, "background");
    return (
        <Stack screenOptions={{ headerShown: true }} >
            {/* Sem declarar Screens aqui: o router descobre sozinho */}
        </Stack>
    );
}