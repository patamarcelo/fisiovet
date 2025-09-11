import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TextInput, SectionList, Pressable, StyleSheet } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { fetchTutores, deleteTutor } from '@/src/store/slices/tutoresSlice';
import { useThemeColor } from '@/hooks/useThemeColor';
import { router } from 'expo-router';
import Avatar from '@/components/ui/Avatar';

import { SafeAreaView } from 'react-native-safe-area-context';
import { maskPhone } from '@/src/utils/masks';



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
  const sections = Array.from(map.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([title, data]) => ({ title, data: data.sort((a, b) => a.nome.localeCompare(b.nome)) }));
  return sections;
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

function AlphabetBar({ letters, onJump }) {
  return (
    <View style={styles.alphaBar}>
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
  const bg = useThemeColor({ light: '#F9FAFB', dark: '#0c0c0c' }, 'background');

  const [query, setQuery] = useState('');
  const listRef = useRef(null);



  useEffect(() => {
    dispatch(fetchTutores());
  }, [dispatch]);

  const sections = useMemo(() => makeSections(items, query), [items, query]);
  const letters = useMemo(() => sections.map((s) => s.title), [sections]);

  const jumpTo = (letter) => {
    const idx = sections.findIndex((s) => s.title === letter);
    if (idx >= 0) listRef.current?.scrollToLocation({ sectionIndex: idx, itemIndex: 0, animated: true });
  };

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['left', 'right', 'bottom']}>
      {/* Caixa de busca abaixo do header nativo */}
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
          <View style={styles.searchBox}>
            <TextInput
              placeholder="Buscar por nome, telefone ou e-mail"
              placeholderTextColor={subtle}
              value={query}
              onChangeText={setQuery}
              style={[styles.input, { color: text, borderColor: 'rgba(0,0,0,0.12)' }]}
            />
          </View>
        }
        stickySectionHeadersEnabled
        contentInsetAdjustmentBehavior="automatic"   // iOS: ajusta sob header grande
        automaticallyAdjustContentInsets={false}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        ListEmptyComponent={() => (
          <View style={{ padding: 16 }}>
            <Text style={{ color: subtle }}>Nenhum tutor encontrado.</Text>
          </View>
        )}
        contentContainerStyle={{ paddingBottom: 40 }}
      />

      {letters.length > 0 && <AlphabetBar letters={letters} onJump={jumpTo} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  addBtn: {
    marginLeft: 'auto',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
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
    bottom: 90,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 2,
    gap: 2,
  },
  alphaBtn: { paddingVertical: 2, paddingHorizontal: 4 },
  alphaTxt: { fontSize: 11, fontWeight: '700', color: '#6B7280' },
});