// app/(phone)/_layout.jsx
//@ts-nocheck
import React from 'react';
// import { Tabs } from 'expo-router';
import { Platform } from 'react-native';

import HapticTab from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import AnimatedTabBar from '@/components/AnimatedTabBar';

import { withLayoutContext } from 'expo-router';
import {
  createNativeBottomTabNavigator,
//   NativeBottomTabNavigationOptions,
//   NativeBottomTabNavigationEventMap,
} from '@bottom-tabs/react-navigation';

// import { ParamListBase, TabNavigationState } from '@react-navigation/native';

const BottomTabNavigator = createNativeBottomTabNavigator().Navigator;

const Tabs = withLayoutContext(BottomTabNavigator);


export default function PhoneTabsLayout() {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];

    return (
        <Tabs
            // tabBar={(props) => <AnimatedTabBar {...props} />}
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: colors.tint,
                tabBarInactiveTintColor: colorScheme === 'dark' ? '#A0A0A0' : '#6B7280',
                tabBarButton: HapticTab,
                tabBarBackground: TabBarBackground,
                tabBarHideOnKeyboard: true,
                tabBarLabelStyle: {
                    fontSize: 10,
                    fontWeight: '600',
                    marginBottom: Platform.OS === 'ios' ? 0 : 2,
                },
                tabBarIconStyle: { marginTop: 2 },
                tabBarItemStyle: { paddingVertical: 2 },
                tabBarStyle: Platform.select({
                    ios: {
                        position: 'absolute',       // mostra o blur
                        borderTopWidth: 0,
                        paddingBottom: 6,
                        paddingTop: 0,
                        height: 70,
                    },
                    default: {
                        position: "absolute",
                        borderTopWidth: 0,
                        height: 58,
                    },
                }),
            }}
        >
            {/* Dashboard / Home */}
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Home',
                    // tabBarIcon: ({ color, size }) => (
                    //     <IconSymbol size={size ?? 26} name="house.fill" color={color} />
                    // ),
                    tabBarIcon: () => ({sfSymbol: 'house.fill'})
                }}
            />

            {/* Tutores (pasta com index/novo/[id]) */}
            <Tabs.Screen
                name="tutores"
                options={{
                    title: 'Tutores',
                    // tabBarIcon: ({ color, size }) => (
                    //     <IconSymbol size={size ?? 26} name="person.2.fill" color={color} />
                    // ),
                    tabBarIcon: () => ({sfSymbol: 'person.2.fill'})
                }}
            />

            {/* Pacientes (se você já renomeou de 'animais' para 'pacientes', troque o name abaixo) */}
            <Tabs.Screen
                name="pacientes"
                options={{
                    title: 'Pets',
                    // tabBarIcon: ({ color, size }) => (
                    //     <IconSymbol size={size ?? 26} name="pawprint.fill" color={color} />
                    // ),
                    tabBarIcon: () => ({sfSymbol: 'pawprint.fill'})
                }}
            />

            {/* Agenda (index/novo/[id]/mapa/rotas) */}
            <Tabs.Screen
                name="agenda"
                options={{
                    title: 'Agenda',
                    // tabBarIcon: ({ color, size }) => (
                    //     <IconSymbol size={size ?? 26} name="calendar" color={color} />
                    // ),
                    tabBarIcon: () => ({sfSymbol: 'calendar'})
                }}
            />
            <Tabs.Screen
                name="financeiro"
                options={{
                    title: 'Financeiro',
                    // tabBarIcon: ({ color, size }) => (
                    //     <IconSymbol size={size ?? 26} name="banknote.fill" color={color} />
                    // ),
                    tabBarIcon: () => ({sfSymbol: 'banknote.fill'})
                }}
            />

            {/* Financeiro (index, faturas, recebimentos) */}
            {/* <Tabs.Screen
                name="faturas"
                options={{
                    title: 'Faturas',
                    tabBarIcon: ({ color, size }) => (
                        <IconSymbol size={size ?? 26} name="doc.richtext" color={color} />
                    ),
                }}
            />

            <Tabs.Screen
                name="pagamentos"
                options={{
                    title: 'Pagamentos',
                    tabBarIcon: ({ color, size }) => (
                        <IconSymbol size={size ?? 26} name="creditcard.fill" color={color} />
                    ),
                }}
            /> */}
            {/* <Tabs.Screen name="configuracoes" options={{ href: null }} /> */}
            {/* <Tabs.Screen name="financeiro" options={{ href: null }} /> */}
            <Tabs.Screen name="biblioteca" options={{ href: null }} />
        </Tabs>
    );
}