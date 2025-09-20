import React, { useMemo, useRef, useState, useEffect, useCallback, useDeferredValue } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  SectionList,
  TextInput,
  InteractionManager,
  Platform
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector, useDispatch } from 'react-redux';
import { selectAllPetsJoined, fetchAllPets, clearActiveTutorId } from '@/src/store/slices/petsSlice';
import { useFocusEffect, router, useNavigation } from 'expo-router';
import { useThemeColor } from '@/hooks/useThemeColor';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';

import { Stack } from 'expo-router';

const FILTERS = ['todos', 'cachorro', 'gato'];

/** Agrupa por letra inicial (A-Z/Ç) ou # para outros */
function groupByInitial(items) {
  const map = new Map();
  for (const p of items) {
    const first = (p?.nome?.[0] || '').toUpperCase();
    const key = /[A-ZÇ]/.test(first) ? first : '#';
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(p);
  }
  const sections = Array.from(map.entries())
    .sort(([a], [b]) => (a === '#' ? 1 : b === '#' ? -1 : a.localeCompare(b)))
    .map(([title, data]) => ({
      title,
      data: data.sort((a, b) => a.nome.localeCompare(b.nome)),
    }));
  return sections;
}

function FilterPills({ value, onChange, border, accent, totals, text }) {
  const label = (f) =>
    f === 'todos'
      ? `Todos (${totals.todos})`
      : f === 'cachorro'
        ? `Cachorros (${totals.cachorro})`
        : `Gatos (${totals.gato})`;

  return (
    <View style={styles.pills}>
      {FILTERS.map((f) => {
        const active = value === f;
        return (
          <Pressable
            key={f}
            onPress={() => onChange(f)}
            style={({ pressed }) => [
              styles.pill,
              { borderColor: border },
              active && { backgroundColor: accent, borderColor: accent },
              pressed && { opacity: 0.9 },
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Filtrar por ${f}`}
          >
            <Text style={[styles.pillText, { color: active ? '#fff' : text }]}>
              {label(f)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const PetRow = React.memo(function PetRow({ pet, border, text, subtle }) {
  const icon = pet.especie === 'gato' ? 'cat.fill' : 'dog.fill';
  return (
    <Pressable
      onPress={() => router.push(`/(phone)/pacientes/${pet.id}`)}
      style={({ pressed }) => [
        styles.row,
        { borderColor: border },
        pressed && { opacity: 0.6 },
      ]}
    >
      <View style={styles.avatar}>
        <IconSymbol name={icon} size={16} color="#fff" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, { color: text }]}>{pet.nome}</Text>
        <Text style={{ color: subtle, marginTop: 2 }}>
          {[pet.especie, pet.raca, pet.cor].filter(Boolean).join(' • ')}
        </Text>
      </View>
      <IconSymbol name="chevron.right" size={14} />
    </Pressable>
  );
});

export default function PetsList() {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const allPets = useSelector(selectAllPetsJoined); // ✅ agora já vem com tutor.nome

  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();

  const [filter, setFilter] = useState('todos');
  const [query, setQuery] = useState('');

  const deferredQuery = useDeferredValue(query);
  const deferredFilter = useDeferredValue(filter);

  const text = useThemeColor({}, 'text');
  const subtle = useThemeColor({ light: '#6B7280', dark: '#9AA0A6' }, 'text');
  const border = useThemeColor({ light: 'rgba(0,0,0,0.08)', dark: 'rgba(255,255,255,0.12)' }, 'border');
  const bg = useThemeColor({}, 'background');
  const tint = useThemeColor({}, 'tint');
  const bannerBg = useThemeColor({ light: '#E5E7EB', dark: '#2A2A2C' }, 'card'); // cinza do banner
  const bannerText = useThemeColor({ light: '#111827', dark: '#F3F4F6' }, 'text');
  const accent = useThemeColor({ light: '#10B981', dark: '#10B981' }, 'tint'); // verde


  const imTaskRef = useRef(null);



  const listRef = useRef(null);

  useEffect(() => {
    navigation.setOptions({
      headerLargeTitle: true,
      headerTitle: 'Pets',

      // 🔹 cor do título normal
      headerTintColor: tint,

      // 🔹 estilos do título grande (iOS)
      headerLargeTitleStyle: {
        color: tint,
        fontWeight: '800',
      },

      // 🔹 cor de fundo do header
      headerStyle: {
        backgroundColor: bg
      },
    });
  }, [navigation, tint, bg]);

  // Carrega dados on-focus
  useFocusEffect(
    useCallback(() => {
      dispatch(clearActiveTutorId());  // 🔹 garante que a lista não herda filtro
      if (allPets?.length) return;
      imTaskRef.current?.cancel?.();
      imTaskRef.current = InteractionManager.runAfterInteractions(() => {
        dispatch(fetchAllPets());
      });
      return () => imTaskRef.current?.cancel?.();
    }, [dispatch, allPets?.length])
  );

  // 1) Busca
  const queryFiltered = useMemo(() => {
    if (!deferredQuery.trim()) return allPets;
    const q = deferredQuery.trim().toLowerCase();
    return allPets.filter(
      (p) =>
        p.nome?.toLowerCase().includes(q) ||
        p.tutor?.nome?.toLowerCase().includes(q) ||
        p.raca?.toLowerCase().includes(q)
    );
  }, [allPets, deferredQuery]);

  // 2) Totais (com base na busca)
  const totals = useMemo(() => {
    const t = queryFiltered.length;
    const d = queryFiltered.filter((p) => p.especie === 'cachorro').length;
    const g = queryFiltered.filter((p) => p.especie === 'gato').length;
    return { todos: t, cachorro: d, gato: g };
  }, [queryFiltered]);

  // 3) Filtro por espécie
  const filtered = useMemo(() => {
    if (deferredFilter === 'todos') return queryFiltered;
    return queryFiltered.filter((p) => p.especie === deferredFilter);
  }, [queryFiltered, deferredFilter]);

  const sections = useMemo(() => groupByInitial(filtered), [filtered]);
  const letters = useMemo(() => sections.map((s) => s.title), [sections]);

  const renderItem = useCallback(
    ({ item }) => <PetRow pet={item} border={border} text={text} subtle={subtle} />,
    [border, text, subtle]
  );

  // const jumpTo = (letter) => {
  //   const idx = sections.findIndex((s) => s.title === letter);
  //   if (idx >= 0 && listRef.current) {
  //     listRef.current.scrollToLocation({ sectionIndex: idx, itemIndex: 0, animated: true });
  //   }
  // };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: bg }]} edges={['left', 'right', 'top']}>
      <View style={{ flex: 1 }}>
        <SectionList
          ref={listRef}
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          removeClippedSubviews={Platform.OS === 'android'}
          initialNumToRender={20}
          maxToRenderPerBatch={20}
          updateCellsBatchingPeriod={16}
          windowSize={10}
          ListHeaderComponent={
            <View style={[styles.headerInner, { borderBottomColor: border }]}>
              {/* Busca */}
              <View style={[styles.searchBox, { borderColor: border }]}>
                <IconSymbol name="magnifyingglass" size={14} />
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Buscar por nome, tutor ou raça"
                  placeholderTextColor={subtle}
                  style={[styles.searchInput, { color: text }]}
                  returnKeyType="search"
                />
                {!!query && (
                  <Pressable onPress={() => setQuery('')} hitSlop={8}>
                    <IconSymbol name="xmark.circle.fill" size={16} />
                  </Pressable>
                )}
              </View>

              {/* Filtros com contadores */}
              <FilterPills
                value={filter}
                onChange={setFilter}
                border={border}
                accent={accent}
                totals={totals}
                text={text}
              />
            </View>
          }
          contentContainerStyle={{
            paddingBottom: Math.max(tabBarHeight, insets.bottom),
          }}
          automaticallyAdjustContentInsets
          contentInsetAdjustmentBehavior="automatic"
          stickySectionHeadersEnabled
          renderSectionHeader={({ section: { title } }) => (
            <View style={styles.sectionHeaderContainer}>
              <View style={[styles.sectionBanner, { backgroundColor: bannerBg, borderColor: border, borderWidth: 0.2 }]}>
                <Text style={[styles.sectionBannerText, { color: bannerText }]}>{title}</Text>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={{ color: subtle }}>Nenhum pet encontrado.</Text>
            </View>
          }
        />

        {/* Índice alfabético à direita (opcional) */}
        {/* {letters.length > 1 && (
          <View style={styles.index}>
            {letters.map((l) => (
              <Pressable key={l} onPress={() => jumpTo(l)} hitSlop={6}>
                <Text style={[styles.indexLetter, { color: accent }]}>{l}</Text>
              </Pressable>
            ))}
          </View>
        )} */}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },

  // Header que rola junto (busca + filtros)
  headerInner: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    borderBottomWidth: 1,
    gap: 10,
  },

  // Busca
  searchBox: {
    height: 38,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInput: { flex: 1, paddingVertical: 6 },

  // Pills
  pills: { flexDirection: 'row', gap: 8 },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  pillText: { fontWeight: '700' },

  // Linha
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 0,
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  avatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 16, fontWeight: '700' },

  // Banner de seção (cinza)
  sectionHeaderContainer: { paddingVertical: 0 },
  sectionBanner: {
    alignSelf: 'stretch',
    paddingHorizontal: 12,
    height: 24,
    borderRadius: 0,
    borderWidth: 0.3,
    justifyContent: 'center',
  },
  sectionBannerText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },

  empty: { alignItems: 'center', padding: 24 },

  // Índice alfabético
  index: {
    position: 'absolute',
    right: 6,
    top: 90,
    bottom: 20,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 2,
  },
  indexLetter: { fontSize: 12, fontWeight: '800', opacity: 0.9 },
});