import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useThemeColor } from '@/hooks/useThemeColor';
import { IconSymbol } from '@/components/ui/IconSymbol';
import Screen from '../_ui/Screen';

export default function ConfigIndex() {
  const bg = useThemeColor({ light: '#F2F2F7', dark: '#000000' }, 'background');
  const card = useThemeColor({ light: '#FFFFFF', dark: '#1C1C1E' }, 'background');
  const text = useThemeColor({}, 'text');
  const subtle = useThemeColor({ light: '#6B7280', dark: '#9AA0A6' }, 'text');

  return (
    <Screen style={[styles.screen, { backgroundColor: bg }]}>
      {/* Seção: Aparência */}
      <View style={[styles.group, { backgroundColor: card }]}>
        <Pressable
          onPress={() => router.push('/configuracoes/aparencia')}
          style={({ pressed }) => [styles.cell, { opacity: pressed ? 0.7 : 1 }]}
        >
          <View style={styles.cellLeft}>
            <View style={[styles.iconBadge, { backgroundColor: '#007AFF' }]}>
              <IconSymbol name="paintbrush.fill" size={16} color="#fff" />
            </View>
            <Text style={[styles.cellTitle, { color: text }]}>Aparência</Text>
          </View>
          <Text style={[styles.cellValue, { color: subtle }]}>Automático</Text>
          <IconSymbol name="chevron.right" size={14} color={subtle} />
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  group: {
    marginTop: 28,
    marginHorizontal: 14,
    borderRadius: 12,
    overflow: 'hidden',
  },
  cell: {
    minHeight: 52,
    paddingHorizontal: 14,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  cellLeft: { flexDirection: 'row', gap: 10, alignItems: 'center', flex: 1 },
  iconBadge: {
    width: 26,
    height: 26,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellTitle: { fontSize: 16, fontWeight: '600' },
  cellValue: { fontSize: 14, marginRight: 6 },
});