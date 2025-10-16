import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { router } from 'expo-router';
import { useThemeColor } from '@/hooks/useThemeColor';

export function EmptyAgendaCard() {
    const text = useThemeColor({}, 'text');
    const subtle = useThemeColor({ light: '#6B7280', dark: '#9AA0A6' }, 'text');
    const border = useThemeColor({ light: 'rgba(0,0,0,0.08)', dark: 'rgba(255,255,255,0.12)' }, 'border');
    const accent = useThemeColor({ light: '#10B981', dark: '#10B981' }, 'tint');
    const bg = useThemeColor({}, 'background');

    return (
        <View style={styles.wrap}>
            <View style={[styles.card, { borderColor: border, backgroundColor: bg }]}>
                <View style={[styles.iconWrap, { backgroundColor: accent }]}>
                    <Ionicons name="calendar-outline" size={22} color="#fff" />
                </View>
                <Text style={[styles.title, { color: text }]}>Nenhum evento encontrado</Text>
                <Text style={[styles.sub, { color: subtle }]}>
                    Ajuste os filtros ou adicione um novo evento.
                </Text>

                <Pressable
                    onPress={() => router.push('/(modals)/agenda-new')}
                    style={({ pressed }) => [
                        styles.btn,
                        { backgroundColor: accent },
                        pressed && { opacity: 0.9 },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="Adicionar evento"
                >
                    <IconSymbol name="plus" size={14} color="#fff" />
                    <Text style={styles.btnText}>Adicionar evento</Text>
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
    },
    card: {
        width: '100%',
        maxWidth: 420,
        borderWidth: 1,
        borderRadius: 14,
        padding: 20,
        alignItems: 'center',
        gap: 10,
    },
    iconWrap: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: { fontSize: 16, fontWeight: '800', textAlign: 'center' },
    sub: { fontSize: 13, textAlign: 'center', marginBottom: 6 },
    btn: {
        height: 42,
        borderRadius: 10,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 4,
    },
    btnText: { color: '#fff', fontWeight: '800' },
});