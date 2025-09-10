import React from 'react';
import { Text } from 'react-native';
import Screen from '../_ui/Screen';

export default function AgendaNew() {
    return (
        <Screen>
            <Text style={{ fontSize: 20, fontWeight: '600' }}>Novo Agendamento</Text>
            <Text>Form com tutor, paciente, data/hora, local, status…</Text>
        </Screen>
    );
}