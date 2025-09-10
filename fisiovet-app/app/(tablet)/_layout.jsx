// app/(tablet)/_layout.jsx
import React, { useMemo } from 'react';
import { Drawer } from 'expo-router/drawer';
import { DrawerContentScrollView } from '@react-navigation/drawer';
import { View, Text, Pressable, StyleSheet, useWindowDimensions, Platform } from 'react-native';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

const RAIL_WIDTH = 84; // largura fixa do rail (tabbar vertical)

const NAV_ITEMS = [
    { route: 'index', title: 'Home', icon: 'house.fill' },
    { route: 'tutores', title: 'Tutores', icon: 'person.2.fill' },
    { route: 'pacientes', title: 'Pets', icon: 'pawprint.fill' }, // renomeie p/ 'pacientes' se trocar a pasta
    { route: 'agenda', title: 'Agenda', icon: 'calendar' },
    { route: 'financeiro', title: 'Financeiro', icon: 'banknote.fill' }
    // { route: 'faturas', title: 'Faturas', icon: 'doc.richtext' },
    // { route: 'pagamentos', title: 'Pagamentos', icon: 'creditcard.fill' },
];

export default function TabletDrawerLayout() {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];

    return (
        <Drawer
            screenOptions={{
                headerShown: false,
                drawerType: 'permanent',
                swipeEnabled: false,
                drawerStyle: { width: RAIL_WIDTH },
                drawerActiveTintColor: colors.tint,
                drawerInactiveTintColor: colorScheme === 'dark' ? '#A0A0A0' : '#6B7280',
                drawerActiveBackgroundColor:
                    colorScheme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
            }}
            drawerContent={(props) => <RailContent {...props} />}
        >
            {/* telas (conteúdo à direita) */}
            <Drawer.Screen name="index" options={{ title: 'Home' }} />
            <Drawer.Screen name="tutores" options={{ title: 'Tutores' }} />
            <Drawer.Screen name="pacientes" options={{ title: 'Pets' }} />
            <Drawer.Screen name="agenda" options={{ title: 'Agenda' }} />
            <Drawer.Screen name="financeiro" options={{ title: 'Financeiro' }} />
            {/* Adicione esta tela se ainda não existir */}
            <Drawer.Screen name="configuracoes" options={{ title: 'Configurações' }} />
        </Drawer>
    );
}

function RailContent({ state, navigation }) {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const items = useMemo(() => NAV_ITEMS, []);
    const currentRouteName = state?.routeNames?.[state?.index] ?? 'index';

    // Detecta iPad em landscape
    const { width, height } = useWindowDimensions();
    const isLandscape = width > height;
    const isIpadLandscape = Platform.OS === 'ios' && Platform.isPad && isLandscape;

    return (
        <View
            style={[
                styles.rail,
                {
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
                                onPress={() => navigation.navigate(item.route)}
                                style={({ pressed }) => [
                                    styles.item,
                                    isActive && styles.itemActive,
                                    pressed && { opacity: 0.9 },
                                ]}
                                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                                accessibilityRole="button"
                                accessibilityLabel={`Ir para ${item.title}`}
                                accessibilityState={{ selected: isActive }}
                            >
                                {/* indicador lateral do ativo */}
                                <View
                                    style={[
                                        styles.indicator,
                                        { backgroundColor: isActive ? colors.tint : 'transparent' },
                                    ]}
                                />
                                <View style={styles.iconAndLabel}>
                                    <IconSymbol
                                        name={item.icon}
                                        size={30}
                                        color={isActive ? colors.tint : colorScheme === 'dark' ? '#B0B0B0' : '#444'}
                                    />
                                    <Text
                                        numberOfLines={1}
                                        style={[
                                            styles.label,
                                            { color: isActive ? colors.tint : colorScheme === 'dark' ? '#9AA0A6' : '#888' },
                                        ]}
                                    >
                                        {item.title}
                                    </Text>
                                </View>
                            </Pressable>
                        );
                    })}
                </View>
            </DrawerContentScrollView>

            {/* Engrenagem no rodapé: só iPad em landscape */}
            {isIpadLandscape && (
                <View style={styles.footer}>
                    {/* indicador lateral colado à esquerda */}
                    <View
                        style={[
                            styles.footerIndicator,
                            { backgroundColor: currentRouteName === 'configuracoes' ? colors.tint : 'transparent' },
                        ]}
                    />

                    <Pressable
                        onPress={() => navigation.navigate('configuracoes')}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        accessibilityRole="button"
                        accessibilityLabel="Abrir configurações"
                        style={styles.footerButton}
                    >
                        <IconSymbol
                            name="gearshape.fill"
                            size={28}
                            color={
                                currentRouteName === 'configuracoes'
                                    ? colors.tint
                                    : colorScheme === 'dark'
                                        ? '#9AA0A6'
                                        : '#888'
                            }
                        />
                        <Text
                            numberOfLines={1}
                            style={[
                                styles.label,
                                {
                                    color:
                                        currentRouteName === 'configuracoes'
                                            ? colors.tint
                                            : colorScheme === 'dark'
                                                ? '#9AA0A6'
                                                : '#888',
                                },
                            ]}
                        >
                            Config
                        </Text>
                    </Pressable>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    rail: {
        flex: 1,
        borderRightWidth: 1,
    },
    scroll: {
        paddingTop: 12,
        paddingBottom: 12,
    },
    items: {
        paddingTop: 8,
        gap: 1,
        alignItems: 'stretch',
    },
    item: {
        height: 76,                 // espaço para ícone + label
        flexDirection: 'row',       // para o indicador lateral
        alignItems: 'center',
        borderRadius: 0,
        marginHorizontal: 0,
    },
    itemActive: {
        backgroundColor: 'rgba(0,0,0,0.05)', // substituído pela var do tema via screenOptions
    },
    indicator: {
        width: 3.5,
        alignSelf: 'stretch',
        borderTopLeftRadius: 10,
        borderBottomLeftRadius: 10,
        marginRight: 2,
        marginLeft: -5,
    },
    iconAndLabel: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
    },
    label: {
        fontSize: 8,     // bem pequeno
        fontWeight: '600',
    },

    // --- novo: rodapé do rail para a engrenagem ---
    // footer: {
    //     position: 'absolute',
    //     bottom: 10,
    //     left: 0,
    //     right: 0,
    //     height: 40,
    //     alignItems: 'center',
    //     justifyContent: 'center',
    // },
    footer: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 10,
        height: 48,                 // um pouco maior p/ alvo de toque
        justifyContent: 'center',
    },
    footerIndicator: {
        position: 'absolute',
        left: 10,
        top: 0,
        bottom: 0,                  // estica verticalmente
        width: 3.5,
        borderTopLeftRadius: 10,
        borderBottomLeftRadius: 10,
    },
    footerButton: {
        paddingLeft: 10,            // espaço p/ não colar na barra
        paddingRight: 8,
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
    },
});