import React, { useMemo, useState, useLayoutEffect, useCallback } from 'react';
import { View, Text, SectionList, Pressable, TextInput, RefreshControl, Platform } from 'react-native';
import { useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
// ⚠️ Import removido para evitar ScrollView interno no Screen
// import Screen from '../_ui/Screen';
import { SafeAreaView } from 'react-native-safe-area-context';

// --- MOCK ---
const mockEvents = [
  { id: '1', title: 'Consulta - Thor', start: '2025-09-15T09:00:00-03:00', end: '2025-09-15T10:00:00-03:00', status: 'confirmado', cliente: 'Carla', local: 'Clínica A' },
  { id: '2', title: 'Vacinação - Luna', start: '2025-09-15T11:00:00-03:00', end: '2025-09-15T11:30:00-03:00', status: 'pendente', cliente: 'Rafael', local: 'Clínica A' },
  { id: '3', title: 'Revisão - Max', start: '2025-09-15T14:00:00-03:00', end: '2025-09-15T15:00:00-03:00', status: 'confirmado', cliente: 'Lívia', local: 'Clínica B' },
  { id: '4', title: 'Retorno - Nina', start: '2025-09-14T16:00:00-03:00', end: '2025-09-14T16:45:00-03:00', status: 'cancelado', cliente: 'João', local: 'Clínica A' },
  { id: '5', title: 'Fisioterapia - Bob', start: '2025-09-16T09:30:00-03:00', end: '2025-09-16T10:00:00-03:00', status: 'confirmado', cliente: 'Marina', local: 'Clínica A' },
  { id: '6', title: 'Avaliação - Mel', start: '2025-09-17T13:00:00-03:00', end: '2025-09-17T14:00:00-03:00', status: 'confirmado', cliente: 'Pedro', local: 'Clínica C' },
];

const STATUS_COLORS = {
  confirmado: '#1ABC9C',
  pendente: '#F39C12',
  cancelado: '#E74C3C',
};

// --- HELPERS ---
function fmtHour(dateStr) {
  const d = new Date(dateStr);
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  return `${hh}:${mm}`;
}

function fmtDateLabel(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });
}

function sameDay(a, b) {
  const da = new Date(a), db = new Date(b);
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
}

function hexToRgba(hex, alpha = 1) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// --- REUSABLE: Search Field (visual igual Pets/Tutores) ---
function SearchField({ value, onChangeText, placeholder = 'Buscar...', onClear }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        height: 44, // padronizado
        backgroundColor: '#F2F2F7',
        borderRadius: 12,
        paddingHorizontal: 12,
      }}
    >
      <Ionicons name="search" size={18} color="#8E8E93" />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#8E8E93"
        style={{ flex: 1, marginLeft: 8, paddingVertical: 0 }}
        returnKeyType="search"
      />
      {!!value && (
        <Pressable onPress={onClear} accessibilityLabel="Limpar busca" hitSlop={10}
          android_ripple={{ color: '#E0E0E0', borderless: true }}
        >
          <Ionicons name="close-circle" size={18} color="#8E8E93" />
        </Pressable>
      )}
    </View>
  );
}

// --- COMPONENT ---
export default function AgendaScreen() {
  const navigation = useNavigation();
  // Defaults: semana / todos
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState('semana'); // 'hoje' | 'semana' | 'todos'
  const [temporal, setTemporal] = useState('todos'); // 'futuros' | 'passados' | 'todos'
  const [refreshing, setRefreshing] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLargeTitle: true,
      headerTitle: 'Agenda',
      headerTitleStyle: { color: '#222', fontWeight: '700' },
      headerRight: () => (
        <Pressable
          accessibilityRole="button"
          onPress={async () => {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            console.log('novo evento');
          }}
          style={({ pressed }) => ({ paddingHorizontal: 8, paddingVertical: 4, opacity: pressed ? 0.7 : 1 })}
        >
          <View style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name={Platform.OS === 'ios' ? 'calendar-outline' : 'calendar-outline'} size={26} color={'#007AFF'} />
            <Ionicons name="add-circle" size={14} color={'#007AFF'} style={{ position: 'absolute', right: -2, bottom: -2 }} />
          </View>
        </Pressable>
      ),
    });
  }, [navigation]);

  const now = new Date();

  // --- FILTER PIPELINE ---
  const filtered = useMemo(() => {
    let list = mockEvents.filter((e) => {
      const haystack = `${e.title} ${e.cliente} ${e.local}`.toLowerCase();
      return haystack.includes(query.trim().toLowerCase());
    });
    list = list.filter((e) => {
      const d = new Date(e.start);
      if (scope === 'todos') return true;
      if (scope === 'hoje') return sameDay(d, now);
      if (scope === 'semana') {
        const startOfWeek = new Date(now);
        const day = (now.getDay() + 6) % 7;
        startOfWeek.setDate(now.getDate() - day);
        startOfWeek.setHours(0, 0, 0, 0);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 7);
        return d >= startOfWeek && d < endOfWeek;
      }
      return true;
    });
    list = list.filter((e) => {
      const d = new Date(e.end);
      if (temporal === 'todos') return true;
      if (temporal === 'futuros') return d >= now;
      if (temporal === 'passados') return d < now;
      return true;
    });
    list.sort((a, b) => new Date(a.start) - new Date(b.start));
    return list;
  }, [query, scope, temporal, now]);

  // --- GROUP BY DAY ---
  const sections = useMemo(() => {
    const map = new Map();
    for (const e of filtered) {
      const key = new Date(e.start).toISOString().slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(e);
    }
    return Array.from(map.entries())
      .sort((a, b) => new Date(a[0]) - new Date(b[0]))
      .map(([dateKey, items]) => ({ title: dateKey, data: items }));
  }, [filtered]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 600);
  }, []);

  // --- EMPTY LIST ---
  const ListEmpty = () => (
    <View style={{ padding: 24, alignItems: 'center' }}>
      <Ionicons name="calendar-outline" size={48} color="#C0C0C0" />
      <Text style={{ marginTop: 8, color: '#8E8E93' }}>Nenhum evento encontrado</Text>
      <Text style={{ marginTop: 4, color: '#8E8E93' }}>Ajuste os filtros ou toque no + para criar</Text>
    </View>
  );

  // --- HEADER DA LISTA (100% alinhado) ---
  const ListHeader = (
    <View style={{ paddingHorizontal: 12, paddingTop: 8, paddingBottom: 8, gap: 10 }}>
      {/* Barra de busca padronizada (igual Pets/Tutores) */}
      <SearchField
        value={query}
        onChangeText={setQuery}
        placeholder="Buscar por cliente, pet ou local"
        onClear={() => setQuery('')}
      />

      {/* Linha 1: escopo */}
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        {['hoje', 'semana', 'todos'].map((key) => (
          <Chip key={key} label={key.toUpperCase()} active={scope === key} onPress={async () => { await Haptics.selectionAsync(); setScope(key); }} />
        ))}
      </View>

      {/* Linha 2: temporal */}
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        {['futuros', 'passados', 'todos'].map((key) => (
          <Chip key={key} label={key.toUpperCase()} active={temporal === key} onPress={async () => { await Haptics.selectionAsync(); setTemporal(key); }} />
        ))}
      </View>
    </View>
  );

  return (
    // ⚠️ Use SafeAreaView puro aqui para NÃO aninhar VirtualizedLists dentro de ScrollView
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }} edges={['top', 'bottom']}>
      <SectionList
        style={{ flex: 1 }}
        sections={sections}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={ListHeader}
        renderSectionHeader={({ section }) => (
          <View style={{ backgroundColor: '#FFFFFF' }}>
            <Text style={{ paddingVertical: 6, paddingHorizontal: 12, fontSize: 13, fontWeight: '700', color: '#6B7280' }}>{fmtDateLabel(section.title)}</Text>
          </View>
        )}
        renderItem={({ item }) => <EventRow item={item} />}
        ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: '#E5E7EB' }} />}
        contentContainerStyle={{ paddingBottom: 24 }}
        ListEmptyComponent={ListEmpty}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentInsetAdjustmentBehavior="automatic"
        stickySectionHeadersEnabled
        removeClippedSubviews
      />
    </SafeAreaView>
  );
}

// --- UI PARTS ---
function Chip({ label, active, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: '#D0E6FF', borderless: false }}
      style={({ pressed }) => ({
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: 999,
        backgroundColor: active ? '#E6F0FF' : '#F2F2F7',
        borderWidth: active ? 1 : 0,
        borderColor: active ? '#0A84FF' : 'transparent',
        opacity: pressed && Platform.OS === 'ios' ? 0.85 : 1,
      })}
    >
      <Text style={{ fontSize: 12, fontWeight: '700', color: active ? '#0A84FF' : '#3C3C43' }}>{label}</Text>
    </Pressable>
  );
}

function EventRow({ item }) {
  const { title, start, end, status, cliente, local } = item;
  const color = STATUS_COLORS[status] || '#8E8E93';
  return (
    // Linha full-bleed (100%)
    <Pressable
      onPress={async () => { await Haptics.selectionAsync(); console.log('abrir evento', item.id); }}
      android_ripple={{ color: '#ECEFF3' }}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: pressed && Platform.OS === 'ios' ? '#F7F8FA' : '#FFF',
        alignSelf: 'stretch',
        width: '100%',
      })}
    >
      <View style={{ width: 6, alignSelf: 'stretch', backgroundColor: color }} />
      <View style={{ flex: 1, paddingHorizontal: 12, paddingVertical: 12 }}>
        <Text style={{ fontWeight: '700', fontSize: 15 }} numberOfLines={1}>{title}</Text>
        <Text style={{ marginTop: 2, color: '#6B7280' }}>{fmtHour(start)} — {fmtHour(end)} • {local}</Text>
        <Text style={{ marginTop: 2, color: '#6B7280' }}>Cliente: {cliente}</Text>
      </View>
      <StatusPill status={status} />
    </Pressable>
  );
}

function StatusPill({ status }) {
  const color = STATUS_COLORS[status] || '#8E8E93';
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  const bg = hexToRgba(color, 0.15);
  return (
    <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: bg, marginRight: 12 }}>
      <Text style={{ fontSize: 12, fontWeight: '700', color }}>{label}</Text>
    </View>
  );
}
