// src/screens/Settings/NavPreferenceScreen.jsx
import React from 'react';
import {
    SafeAreaView,
    View,
    Text,
    Pressable,
    StyleSheet,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import {
    selectNavPreference,
    updateSystem,
} from '@/src/store/slices/systemSlice';
// Se você já usa esse componente em outras telas:
import { IconSymbol } from '@/components/ui/IconSymbol';

const options = [
    { label: 'Google Maps', value: 'google' },
    { label: 'Waze', value: 'waze' },
    { label: 'Perguntar sempre', value: 'ask' },
];

const OptionRow = ({ label, value, selected, onPress, isFirst }) => {
    const isSelected = selected === value;

    return (
        <Pressable
            onPress={() => onPress(value)}
            style={({ pressed }) => [
                styles.row,
                !isFirst && styles.rowDivider,
                pressed && styles.rowPressed,
            ]}
        >
            <Text style={styles.rowLabel}>{label}</Text>

            {isSelected && (
                <IconSymbol name="checkmark" size={16} color="#007AFF" />
            )}
        </Pressable>
    );
};

export default function NavPreferenceScreen() {
    const dispatch = useDispatch();
    const navPreference = useSelector(selectNavPreference);

    const handleSelect = (value) => {
        dispatch(updateSystem({ navPreference: value }));
    };

    return (
        <SafeAreaView style={styles.safe}>
            <View style={styles.container}>
                <View style={styles.headerRow}>
                    <View style={styles.headerIconBadge}>
                        <IconSymbol name="location.circle.fill" size={20} color="#fff" />
                    </View>
                    <View>
                        <Text style={styles.title}>Navegação padrão</Text>
                        <Text style={styles.subtitle}>
                            Escolha o app usado para abrir rotas
                        </Text>
                    </View>
                </View>

                <View style={styles.card}>
                    <Text style={styles.cardHeader}>Aplicativo</Text>

                    {options.map((opt, index) => (
                        <OptionRow
                            key={opt.value}
                            label={opt.label}
                            value={opt.value}
                            selected={navPreference}
                            onPress={handleSelect}
                            isFirst={index === 0}
                        />
                    ))}
                </View>

                <Text style={styles.footerText}>
                    Essa configuração é usada ao tocar em endereços de tutores e pacientes
                    para abrir a navegação.
                </Text>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: '#F2F2F7', // estilo iOS Settings
    },
    container: {
        flex: 1,
        paddingHorizontal: 16,
        paddingTop: 12,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        marginTop: 4,
    },
    headerIconBadge: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: '#007AFF',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    title: {
        fontSize: 20,
        fontWeight: '600',
        color: '#111827',
    },
    subtitle: {
        fontSize: 13,
        color: '#6B7280',
        marginTop: 2,
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 6,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowOffset: { width: 0, height: 1 },
        shadowRadius: 4,
        elevation: 1,
    },
    cardHeader: {
        fontSize: 13,
        color: '#6B7280',
        textTransform: 'uppercase',
        letterSpacing: 0.6,
        marginBottom: 4,
        marginLeft: 4,
    },
    row: {
        minHeight: 44,
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 4,
        paddingHorizontal: 4,
        justifyContent: 'space-between',
    },
    rowDivider: {
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: '#E5E7EB',
    },
    rowPressed: {
        backgroundColor: 'rgba(0,0,0,0.03)',
        borderRadius: 8,
    },
    rowLabel: {
        fontSize: 16,
        color: '#111827',
    },
    footerText: {
        fontSize: 12,
        color: '#9CA3AF',
        marginTop: 12,
        lineHeight: 16,
    },
});
