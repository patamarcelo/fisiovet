import React from 'react';
import { Text } from 'react-native';
import Screen from '../_ui/Screen';

export default function AgendaRoutes() {
    return (
        <Screen>
            <Text style={{ fontSize: 20, fontWeight: '600' }}>Rotas do Dia</Text>
            <Text>Otimização de percurso</Text>
        </Screen>
    );
}