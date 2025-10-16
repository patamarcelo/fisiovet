import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TextInput, SectionList, Pressable, StyleSheet } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { fetchTutores } from '@/src/store/slices/tutoresSlice';
import { useThemeColor } from '@/hooks/useThemeColor';
import { router } from 'expo-router';
import Avatar from '@/components/ui/Avatar';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
// import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { maskPhone } from '@/src/utils/masks';
import { Ionicons } from '@expo/vector-icons';

function makeSections(items, q = '') {
  const norm = (s) => (s || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
  const query = norm(q);
  const filtered = query
    ? items.filter((t) => norm(`${t.nome} ${t.telefone} ${t.email}`).includes(query))
    : items;

  const map = new Map();
  for (const t of filtered) {
    const letter = (t.nome?.[0] || '#').toUpperCase();
    if (!map.has(letter)) map.set(letter, []);
    map.get(letter).push(t);
  }
  return Array.from(map.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([title, data]) => ({ title, data: data.sort((a, b) => a.nome.localeCompare(b.nome)) }));
}

function EmptyCard({ title, subtitle, actionLabel, onAction, icon = 'person-add-outline' }) {
  return (
    <View style={{
      margin: 16,
      borderWidth: 1,
      borderColor: 'rgba(0,0,0,0.08)',
      backgroundColor: 'white',
      borderRadius: 16,
      padding: 16,
      alignItems: 'center',
    }}>
      <View style={{
        width: 56, height: 56, borderRadius: 28,
        backgroundColor: '#E8ECF1',
        alignItems: 'center', justifyContent: 'center', marginBottom: 10
      }}>
        <Text><></></Text>
        {/* Ícone */}
      </View>
      {/* Usamos o Ionicons fora da View para manter simples */}
      <Ionicons name={icon} size={26} color="#1F2937" style={{ marginTop: -56, marginBottom: 22 }} />

      <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827', textAlign: 'center' }}>{title}</Text>
      {!!subtitle && (
        <Text style={{ color: '#6B7280', textAlign: 'center', marginTop: 6 }}>{subtitle}</Text>
      )}

      {!!actionLabel && (
        <Pressable
          onPress={onAction}
          style={({ pressed }) => ({
            marginTop: 14,
            backgroundColor: pressed ? '#1D4ED8' : '#2563EB',
            paddingHorizontal: 16,
            paddingVertical: 10,
            borderRadius: 10,
          })}
        >
          <Text style={{ color: 'white', fontWeight: '700' }}>{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

function TutorRow({ item, tint, subtle, text }) {
  return (
    <Pressable
      onPress={() => router.push(`/(phone)/tutores/${item.id}`)}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: pressed ? 'rgba(0,0,0,0.04)' : 'transparent' },
      ]}
    >
      <Avatar name={item.nome} size={48} bg="#E8ECF1" color="#1F2937" />
      <View style={{ flex: 1 }}>
        <Text style={{ color: text, fontSize: 16, fontWeight: '600' }}>{item.nome}</Text>
        {!!item.telefone && <Text style={{ color: subtle, marginTop: 2 }}>{maskPhone(item.telefone)}</Text>}
      </View>

      <Pressable
        onPress={() => router.push(`/(phone)/tutores/${item.id}`)}
        style={({ pressed }) => [{ paddingHorizontal: 8, opacity: pressed ? 0.6 : 1 }]}
        hitSlop={8}
      >
        <Text style={{ color: tint, fontWeight: '700' }}>Detalhes</Text>
      </Pressable>
    </Pressable>
  );
}

function AlphabetBar({ letters, onJump, bottomOffset = 0 }) {
  return (
    <View style={[styles.alphaBar, { bottom: 6 + bottomOffset }]}>
      {letters.map((L) => (
        <Pressable key={L} onPress={() => onJump(L)} style={styles.alphaBtn} hitSlop={4}>
          <Text style={styles.alphaTxt}>{L}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export default function TutoresList() {
  const dispatch = useDispatch();
  const { items } = useSelector((s) => s.tutores);

  const text = useThemeColor({}, 'text');
  const subtle = useThemeColor({ light: '#6B7280', dark: '#9AA0A6' }, 'text');
  const tint = useThemeColor({}, 'tint');

  const [query, setQuery] = useState('');
  const listRef = useRef(null);

  // const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    dispatch(fetchTutores());
  }, [dispatch]);

  const sections = useMemo(() => makeSections(items, query), [items, query]);
  const letters = useMemo(() => sections.map((s) => s.title), [sections]);

  const jumpTo = (letter) => {
    const idx = sections.findIndex((s) => s.title === letter);
    if (idx >= 0) listRef.current?.scrollToLocation({ sectionIndex: idx, itemIndex: 0, animated: true });
  };

  const hasAny = items?.length > 0;
  const hasResults = sections?.length > 0; // após o filtro

  return (
    // ❗️Sem bottom aqui, para não somar com a tab
    <SafeAreaView style={{ flex: 1 }} edges={['left', 'right']}>
      <SectionList
        ref={listRef}
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <TutorRow item={item} tint={tint} subtle={subtle} text={text} />}
        renderSectionHeader={({ section: { title } }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeaderText}>{title}</Text>
          </View>
        )}
        ListHeaderComponent={
          hasAny && (
            <View style={styles.searchBox}>
              <TextInput
                placeholder="Buscar por nome, telefone ou e-mail"
                placeholderTextColor={subtle}
                value={query}
                onChangeText={setQuery}
                style={[styles.input, { color: text, borderColor: 'rgba(0,0,0,0.12)' }]}
                returnKeyType="search"
              />
            </View>
          )
        }
        stickySectionHeadersEnabled
        contentInsetAdjustmentBehavior="automatic"
        automaticallyAdjustContentInsets={false}
        ItemSeparatorComponent={() => <View className="sep" style={styles.sep} />}
        // ✅ Usa a altura da tab + safe inset para não sobrepor e sem “gap” visível
        contentContainerStyle={{ paddingBottom: 0 + insets.bottom }}
        ListEmptyComponent={
          hasAny
            ? (
              // Tem tutores cadastrados, mas o filtro não achou nada
              <EmptyCard
                title="Nenhum resultado"
                subtitle={`Não encontramos nada para “${query}”.`}
                actionLabel="Limpar busca"
                icon="search-outline"
                onAction={() => setQuery('')}
              />
            )
            : (
              // Não há tutores cadastrados ainda
              <EmptyCard
                title="Sem tutores por aqui"
                subtitle="Cadastre o primeiro tutor para começar."
                actionLabel="Adicionar tutor"
                icon="person-add-outline"
                onAction={() => router.push('/(modals)/tutor-new')}
              />
            )
        }
      />

      {letters.length > 0 && (
        <AlphabetBar letters={letters} onJump={jumpTo} bottomOffset={0 + insets.bottom} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  searchBox: { paddingHorizontal: 16, paddingBottom: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
  },
  sectionHeader: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  sectionHeaderText: { fontSize: 12, fontWeight: '700', color: '#6B7280' },
  row: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sep: { height: 1, backgroundColor: 'rgba(0,0,0,0.06)', marginLeft: 76 },
  alphaBar: {
    position: 'absolute',
    right: 4,
    top: 90,
    // bottom ajustado via prop
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 2,
    gap: 2,
  },
  alphaBtn: { paddingVertical: 2, paddingHorizontal: 4 },
  alphaTxt: { fontSize: 11, fontWeight: '700', color: '#6B7280' },
});