import React from 'react';
import { Text } from 'react-native';
import Screen from './_ui/Screen';

export default function Dashboard() {
    return (
        <Screen>
            <Text style={{ fontSize: 22, fontWeight: '700' }}>Hoje</Text>
            <Text>Resumo do dia: consultas, rotas, pendências financeiras.</Text>
        </Screen>
    );
}