import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';


export default function Home() {
    const router = useRouter()
    return (
        <View style={styles.container}>
            <Text style={styles.title}>FisioVet — Home</Text>
            <Text>Bem-vindo(a) 👋</Text>
            <TouchableOpacity
                onPress={() => router.push('/configuracoes')}
                style={{ padding: 12, backgroundColor: '#4a90e2', borderRadius: 8 }}
            >
                <Text style={{ color: '#fff', fontWeight: '600' }}>Configuracoes </Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16, gap: 8, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white' },
    title: { fontSize: 22, fontWeight: '600' },
});