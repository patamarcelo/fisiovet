// app/(tablet)/_layout.jsx
import React, { useMemo, useState } from 'react';
import { Drawer } from 'expo-router/drawer';
import { DrawerContentScrollView } from '@react-navigation/drawer';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

const COLLAPSED_WIDTH = 72;
const EXPANDED_WIDTH = 200;

const NAV_ITEMS = [
    { route: 'index', title: 'Home', icon: 'house.fill' },
    { route: 'tutores', title: 'Tutores', icon: 'person.2.fill' },
    { route: 'animais', title: 'Animais', icon: 'pawprint.fill' },
    { route: 'agenda', title: 'Agenda', icon: 'calendar' },
    { route: 'faturas', title: 'Faturas', icon: 'doc.richtext' },
    { route: 'pagamentos', title: 'Pagamentos', icon: 'creditcard.fill' },
];

export default function TabletDrawerLayout() {
    const [collapsed, setCollapsed] = useState(true); // inicia compacto
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];

    const drawerWidth = collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH;

    return (
        <Drawer
            screenOptions={{
                headerShown: false,
                drawerType: 'permanent',
                swipeEnabled: false,
                drawerStyle: { width: drawerWidth },
                // mantemos o padrão de cor/ativo como nas tabs
                drawerActiveTintColor: colors.tint,
                drawerInactiveTintColor: colorScheme === 'dark' ? '#ddd' : '#111',
                drawerActiveBackgroundColor:
                    colorScheme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
            }}
            drawerContent={(props) => (
                <CustomDrawerContent
                    {...props}
                    collapsed={collapsed}
                    onToggle={() => setCollapsed((c) => !c)}
                    width={drawerWidth}
                />
            )}
        >
            {/* As telas continuam as mesmas; o conteúdo da barra é customizado */}
            <Drawer.Screen name="index" options={{ title: 'Home' }} />
            <Drawer.Screen name="tutores" options={{ title: 'Tutores' }} />
            <Drawer.Screen name="animais" options={{ title: 'Animais' }} />
            <Drawer.Screen name="agenda" options={{ title: 'Agenda' }} />
            <Drawer.Screen name="faturas" options={{ title: 'Faturas' }} />
            <Drawer.Screen name="pagamentos" options={{ title: 'Pagamentos' }} />
        </Drawer>
    );
}

function CustomDrawerContent({ collapsed, onToggle, width, state, navigation }) {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];

    const items = useMemo(() => NAV_ITEMS, []);
    const currentRouteName = state?.routeNames?.[state?.index] ?? 'index';

    return (
        <View
            style={[
                styles.drawer,
                {
                    width,
                    borderColor: '#eee',
                    backgroundColor: colorScheme === 'dark' ? '#0c0c0c' : '#fafafa',
                },
            ]}
        >
            <DrawerContentScrollView contentContainerStyle={styles.scroll} scrollEnabled={false}>
                <View style={styles.items}>
                    {items.map((item) => {
                        const isActive = currentRouteName === item.route;
                        return (
                            <Pressable
                                key={item.route}
                                // Use a navegação do Drawer para manter estado/ativo corretos
                                onPress={() => navigation.navigate(item.route)}
                                style={({ pressed }) => [
                                    styles.item,
                                    collapsed ? styles.itemCompact : null,
                                    // isActive && {
                                    //     backgroundColor:
                                    //         colorScheme === 'dark'
                                    //             ? 'rgba(255,255,255,0.06)'
                                    //             : 'rgba(0,0,0,0.05)',
                                    //     borderRadius: 10,
                                    // },
                                    pressed && { opacity: 0.85 },
                                ]}
                                hitSlop={collapsed ? { left: 6, right: 6, top: 6, bottom: 6 } : undefined}
                            >
                                <IconSymbol
                                    name={item.icon}
                                    size={collapsed ? 22 : 20}
                                    color={!isActive ? colors.tint : undefined}
                                />
                                {!collapsed && (
                                    <Text
                                        numberOfLines={1}
                                        style={[
                                            styles.label,
                                            { color: isActive ? colors.tint : colorScheme === 'dark' ? '#eee' : '#111' },
                                        ]}
                                    >
                                        {item.title}
                                    </Text>
                                )}
                            </Pressable>
                        );
                    })}
                </View>
            </DrawerContentScrollView>

            {/* Botão para expandir/recolher com ícones padrão iOS */}
            <View style={[styles.footer, { borderTopColor: '#eee' }]}>
                <Pressable
                    onPress={onToggle}
                    style={({ pressed }) => [
                        styles.toggleBtn,
                        collapsed && styles.toggleCentered,
                        // { backgroundColor: colorScheme === 'dark' ? '#141414' : '#f1f1f1' },
                        pressed && { opacity: 0.9 },
                    ]}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityRole="button"
                    accessibilityLabel={collapsed ? 'Expandir painel lateral' : 'Recolher painel lateral'}
                >
                    <IconSymbol
                        name={collapsed ? 'sidebar.left' : 'sidebar.right'}
                        size={20}
                        color={colorScheme === 'dark' ? '#bbb' : '#444'}
                    />
                    {!collapsed && (
                        <Text style={[styles.toggleText, { color: colorScheme === 'dark' ? '#bbb' : '#444' }]}>
                            {collapsed ? '' : ''}
                        </Text>
                    )}
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    drawer: {
        flex: 1,
        borderRightWidth: 1,
    },
    scroll: {
        paddingTop: 12,
        paddingBottom: 12,
    },
    items: {
        paddingTop: 20,
        gap: 8,
        paddingHorizontal: 8,
    },
    item: {
        height: 44,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 8,
        paddingHorizontal: 12,
    },
    itemCompact: {
        justifyContent: 'center',
        paddingHorizontal: 0,
    },
    label: {
        fontSize: 15,
        fontWeight: '500',
        flexShrink: 1,
    },
    footer: {
        borderTopWidth: 1,
        padding: 12,
    },
    toggleBtn: {
        height: 40,
        borderRadius: 10,
        alignItems: 'center',
        flexDirection: 'row',
        gap: 10,
        paddingHorizontal: 12,
    },
    toggleCentered: {
        justifyContent: 'center',
    },
    toggleText: {
        fontSize: 14,
        fontWeight: '500',
    },
});