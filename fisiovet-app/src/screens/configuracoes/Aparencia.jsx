import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useColorMode } from '@/src/theme/color-scheme';
import Screen from '@/src/screens/_ui/Screen';

const OPTIONS = [
    { key: 'system', label: 'Automático' },
    { key: 'light', label: 'Claro' },
    { key: 'dark', label: 'Escuro' },
];

export default function AparenciaScreen() {
    const { mode, scheme, setColorMode } = useColorMode();
    const bg = useThemeColor({ light: '#F2F2F7', dark: '#000000' }, 'background');
    const card = useThemeColor({ light: '#FFFFFF', dark: '#1C1C1E' }, 'background');
    const text = useThemeColor({}, 'text');
    const subtle = useThemeColor({ light: '#6B7280', dark: '#9AA0A6' }, 'text');
    const tint = useThemeColor({}, 'tint');

    return (
        <Screen style={[styles.screen, { backgroundColor: bg }]}>
            {/* Controle segmentado (iOS-like) */}
            <View style={styles.segmentWrap}>
                <View style={[styles.segment, { backgroundColor: card, borderColor: 'rgba(0,0,0,0.08)' }]}>
                    {OPTIONS.map((opt) => {
                        const active = mode === opt.key;
                        return (
                            <Pressable
                                key={opt.key}
                                onPress={() => setColorMode(opt.key)}
                                style={[
                                    styles.segmentBtn,
                                    active && { backgroundColor: tint },
                                ]}
                            >
                                <Text style={{ color: active ? '#fff' : subtle, fontWeight: '700', fontSize: 13 }}>
                                    {opt.label}
                                </Text>
                            </Pressable>
                        );
                    })}
                </View>
                <Text style={{ color: subtle, fontSize: 12, marginTop: 6 }}>
                    Atual: {mode === 'system' ? `Automático (${scheme})` : mode}
                </Text>
            </View>

            {/* Grupo de pré-visualização (opcional) */}
            <View style={[styles.group, { backgroundColor: card }]}>
                <View style={styles.preview}>
                    <View style={[styles.previewNav, { backgroundColor: tint }]} />
                    <View style={styles.previewRow}>
                        <View style={[styles.previewCell, { backgroundColor: 'rgba(0,0,0,0.08)' }]} />
                        <View style={[styles.previewCell, { backgroundColor: 'rgba(0,0,0,0.08)' }]} />
                    </View>
                    <View style={styles.previewRow}>
                        <View style={[styles.previewCell, { backgroundColor: 'rgba(0,0,0,0.08)' }]} />
                        <View style={[styles.previewCell, { backgroundColor: 'rgba(0,0,0,0.08)' }]} />
                    </View>
                </View>
                <View style={styles.tip}>
                    <Text style={{ color: subtle, fontSize: 12 }}>
                        O modo “Automático” segue a aparência do sistema (Claro/Escuro).
                    </Text>
                </View>
            </View>
        </Screen>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1 },
    segmentWrap: { paddingTop: 24, paddingHorizontal: 16 },
    segment: {
        flexDirection: 'row',
        borderRadius: 10,
        borderWidth: 1,
        overflow: 'hidden',
    },
    segmentBtn: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
    },
    group: {
        marginTop: 24,
        marginHorizontal: 14,
        borderRadius: 12,
        overflow: 'hidden',
        padding: 14,
        gap: 12,
    },
    preview: {
        borderRadius: 10,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.08)',
    },
    previewNav: { height: 22 },
    previewRow: { flexDirection: 'row' },
    previewCell: { flex: 1, height: 28, margin: 8, borderRadius: 6 },
    tip: { paddingTop: 4 },
});