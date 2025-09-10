import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';

export default function Screen({ children, padded = true }) {
    return (
        <ScrollView contentContainerStyle={[styles.container, padded && styles.padded]}>
            <View style={styles.inner}>{children}</View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white' },
    padded: { padding: 16 },
    inner: { gap: 12 },
});