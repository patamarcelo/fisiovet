// app/(phone)/_layout.jsx
import React from 'react';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';

import HapticTab from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function PhoneTabsLayout() {
    const colorScheme = useColorScheme();

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
                tabBarButton: HapticTab,
                tabBarBackground: TabBarBackground,
                tabBarStyle: Platform.select({
                    ios: { position: 'absolute' },
                    default: {},
                }),
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Home',
                    tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
                }}
            />
            <Tabs.Screen
                name="tutores"
                options={{
                    title: 'Tutores',
                    tabBarIcon: ({ color }) => <IconSymbol size={28} name="person.2.fill" color={color} />,
                }}
            />
            <Tabs.Screen
                name="animais"
                options={{
                    title: 'Animais',
                    tabBarIcon: ({ color }) => <IconSymbol size={28} name="pawprint.fill" color={color} />,
                }}
            />
            <Tabs.Screen
                name="agenda"
                options={{
                    title: 'Agenda',
                    tabBarIcon: ({ color }) => <IconSymbol size={28} name="calendar" color={color} />,
                }}
            />
            <Tabs.Screen
                name="faturas"
                options={{
                    title: 'Faturas',
                    tabBarIcon: ({ color }) => <IconSymbol size={28} name="doc.richtext" color={color} />,
                }}
            />
            <Tabs.Screen
                name="pagamentos"
                options={{
                    title: 'Pagamentos',
                    tabBarIcon: ({ color }) => <IconSymbol size={28} name="creditcard.fill" color={color} />,
                }}
            />
        </Tabs>
    );
}