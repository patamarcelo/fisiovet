// src/screens/_ui/Screen.jsx
import React from 'react';
import { ScrollView, StyleSheet, View, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
// Se a tela estiver dentro de Tabs, você pode usar a linha abaixo.
// Caso não esteja em tabs, pode remover o import e passar tabBarHeight manualmente via prop.
// import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';

export default function Screen({
    children,
    padded = true,
    style = {},
    withTabBar = true,   // 👈 se a tela estiver numa Tab, deixe true
    extraBottom = 0,     // 👈 para adicionar margem extra quando quiser
}) {
    const insets = useSafeAreaInsets();
    // const tabBarHeight = withTabBar ? useBottomTabBarHeight() : 0; // use se estiver em tabs
    const tabBarHeight = withTabBar ? 58 : 0; // fallback fixo (mesma altura que você definiu no tabBar)

    const basePad = padded ? 16 : 0;
    const bottomPadding = basePad + insets.bottom + tabBarHeight + extraBottom;

    return (
        <SafeAreaView style={styles.safe} edges={['left', 'right']}>
            <ScrollView
                contentInsetAdjustmentBehavior={Platform.OS === 'ios' ? 'automatic' : 'never'}
                automaticallyAdjustsScrollIndicatorInsets
                keyboardShouldPersistTaps="handled"
                // 👇 aplica paddingTop padrão (quando padded) e paddingBottom calculado
                contentContainerStyle={[
                    styles.container,
                    padded && { paddingTop: 16, paddingHorizontal: 2 },
                    { paddingBottom: bottomPadding },
                    style,
                ]}
            >
                <View style={styles.inner}>{children}</View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1,},
    container: { flexGrow: 1 },
    inner: { gap: 12 },
    
});