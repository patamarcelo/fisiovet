import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function Home() {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>FisioVet — Home</Text>
            <Text>Bem-vindo(a) 👋</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16, gap: 8, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white' },
    title: { fontSize: 22, fontWeight: '600' },
});