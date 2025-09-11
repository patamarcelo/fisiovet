import React from 'react';
import { ScrollView, StyleSheet, View, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';


/**
 * Container base de tela.
 * - Usa SafeArea nas bordas laterais/inf. (top é do Header nativo)
 * - Ajusta insets de conteúdo automaticamente (iOS)
 */
export default function Screen({ children, padded = true, style={} }) {
    return (
        <SafeAreaView
            style={styles.safe}
            edges={['left', 'right', 'bottom']} // top é do header do Stack
        >
            <ScrollView
                contentInsetAdjustmentBehavior={Platform.OS === 'ios' ? 'automatic' : 'never'}
                automaticallyAdjustsScrollIndicatorInsets={true}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={[styles.container, padded && styles.padded, style]}
            >
                <View style={styles.inner}>{children}</View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1 },
    container: { flexGrow: 1 },
    padded: { padding: 16 },
    inner: { gap: 12 },
});