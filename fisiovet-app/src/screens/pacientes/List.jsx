// PetsList.jsx
import React,
{
  useMemo,
  useRef,
  useState,
  useCallback,
  useDeferredValue,
  useLayoutEffect,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  TextInput,
  InteractionManager,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector, useDispatch } from 'react-redux';
import { selectAllPetsJoined, fetchAllPets } from '@/src/store/slices/petsSlice';
import { useFocusEffect, router, useNavigation } from 'expo-router';
import { useThemeColor } from '@/hooks/useThemeColor';
import { IconSymbol } from '@/components/ui/IconSymbol';

const FILTERS = ['todos', 'cachorro', 'gato'];
const ITEM_HEIGHT = 64;
const HEADER_HEIGHT = 24;

/** Agrupa e “achata” em uma lista com cabeçalhos de letra */
function groupToFlat(items) {
  const map = new Map();
  for (const p of items) {
    const first = (p?.nome?.[0] || '').toUpperCase();
    const key = /[A-ZÇ]/.test(first) ? first : '#';
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(p);
  }
  const letters = Array.from(map.keys()).sort((a, b) =>
    a === '#' ? 1 : b === '#' ? -1 : a.localeCompare(b)
  );

  const flat = [];
  const sticky = [];
  let index = 0;
  for (const letter of letters) {
    flat.push({ _type: 'header', letter, id: `__h__${letter}` });
    sticky.push(index);
    index += 1;
    const list = map.get(letter).sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
    for (const pet of list) {
      flat.push({ _type: 'item', pet, id: String(pet.id) });
      index += 1;
    }
  }
  return { flat, sticky, letters };
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
            <Text style={[styles.pillText, { color: active ? '#fff' : text }]}>{label(f)}</Text>
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
        <Text style={[styles.title, { color: text }]} numberOfLines={1}>
          {pet.nome}
        </Text>
        <Text style={{ color: subtle, marginTop: 2 }} numberOfLines={1}>
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
  const allPets = useSelector(selectAllPetsJoined);

  const insets = useSafeAreaInsets();

  const [filter, setFilter] = React.useState('todos');
  const [query, setQuery] = React.useState('');

  const deferredQuery = useDeferredValue(query);
  const deferredFilter = useDeferredValue(filter);

  const text = useThemeColor({}, 'text');
  const subtle = useThemeColor({ light: '#6B7280', dark: '#9AA0A6' }, 'text');
  const border = useThemeColor(
    { light: 'rgba(0,0,0,0.08)', dark: 'rgba(255,255,255,0.12)' },
    'border'
  );
  const bg = useThemeColor({}, 'background');
  const tint = useThemeColor({}, 'tint');
  const bannerBg = useThemeColor({ light: '#E5E7EB', dark: '#2A2A2C' }, 'card');
  const bannerText = useThemeColor({ light: '#111827', dark: '#F3F4F6' }, 'text');
  const accent = useThemeColor({ light: '#10B981', dark: '#10B981' }, 'tint');

  const listRef = useRef(null);
  const imTaskRef = useRef(null);

  const hasAnyPets = allPets?.length > 0;


  const clearSearchAndScrollTop = useCallback(() => {
    setQuery('');
    setFilter('todos');

    // espera um tick pra lista recalcular o conteúdo
    requestAnimationFrame(() => {
      if (listRef.current) {
        listRef.current.scrollToOffset({ offset: 0, animated: false });
      }
    });
  }, []);

  // Header com botão "+" no canto direito
  useLayoutEffect(() => {
    navigation.setOptions({
      headerLargeTitle: true,
      headerTitle: 'Pets',
      headerShow: true,
      headerTintColor: tint,
      headerLargeTitleStyle: { color: tint, fontWeight: '800' },
      headerStyle: { backgroundColor: bg },
      headerRight: () => (
        <Pressable
          onPress={() => router.push('/(modals)/pet-new')}
          hitSlop={10}
          style={({ pressed }) => [{ paddingHorizontal: 6, opacity: pressed ? 0.6 : 1 }]}
          accessibilityRole="button"
          accessibilityLabel="Adicionar pet"
        >
          <IconSymbol name="plus.circle.fill" size={22} color={tint} />
        </Pressable>
      ),
    });
  }, [navigation, tint, bg]);

  // Sempre busca do Firestore ao focar
  useFocusEffect(
    useCallback(() => {
      imTaskRef.current?.cancel?.();
      imTaskRef.current = InteractionManager.runAfterInteractions(() => {
        dispatch(fetchAllPets());
      });
      return () => imTaskRef.current?.cancel?.();
    }, [dispatch])
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

  // 2) Totais
  const totals = useMemo(() => {
    const t = queryFiltered.length;
    const d = queryFiltered.filter((p) => p.especie === 'cachorro').length;
    const g = queryFiltered.filter((p) => p.especie === 'gato').length;
    return { todos: t, cachorro: d, gato: g };
  }, [queryFiltered]);

  // 3) Filtro por espécie
  const filteredSorted = useMemo(() => {
    const base =
      deferredFilter === 'todos'
        ? queryFiltered
        : queryFiltered.filter((p) => p.especie === deferredFilter);
    return [...base].sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
  }, [queryFiltered, deferredFilter]);

  // 4) Achata em lista com cabeçalhos e define sticky indices
  const { flat, sticky, letters } = useMemo(
    () => groupToFlat(filteredSorted),
    [filteredSorted]
  );

  const renderItem = useCallback(
    ({ item }) => {
      if (item._type === 'header') {
        return (
          <View
            style={[
              styles.sectionBanner,
              { backgroundColor: bannerBg, borderColor: border, borderWidth: 0.2 },
            ]}
          >
            <Text style={[styles.sectionBannerText, { color: bannerText }]}>
              {item.letter}
            </Text>
          </View>
        );
      }
      return <PetRow pet={item.pet} border={border} text={text} subtle={subtle} />;
    },
    [bannerBg, border, bannerText, text, subtle]
  );

  const keyExtractor = useCallback((item) => item.id, []);

  const getItemLayout = useCallback(
    (_, index) => {
      let headersBefore = 0;
      for (let i = 0; i < sticky.length; i++) {
        if (sticky[i] < index) headersBefore++;
        else break;
      }
      const itemsBefore = index - headersBefore;
      const offset = headersBefore * HEADER_HEIGHT + itemsBefore * ITEM_HEIGHT;
      const length = sticky.includes(index) ? HEADER_HEIGHT : ITEM_HEIGHT;
      return { length, offset, index };
    },
    [sticky]
  );

  // Header (busca + filtros) — agora depende se existem pets cadastrados
  const ListHeader = useMemo(
    () =>
      !hasAnyPets ? null : (
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
              <Pressable onPress={clearSearchAndScrollTop} hitSlop={8}>
                <IconSymbol name="xmark.circle.fill" size={16} />
              </Pressable>
            )}
          </View>

          {/* Filtros */}
          <FilterPills
            value={filter}
            onChange={setFilter}
            border={border}
            accent={accent}
            totals={totals}
            text={text}
          />
        </View>
      ),
    [hasAnyPets, border, query, subtle, text, filter, accent, totals]
  );

  const jumpTo = useCallback(
    (letter) => {
      const idx = flat.findIndex((x) => x._type === 'header' && x.letter === letter);
      if (idx >= 0 && listRef.current) {
        listRef.current.scrollToIndex({ index: idx, animated: true });
      }
    },
    [flat]
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: bg }]} edges={['left', 'right']}>
      <View style={{ flex: 1 }}>
        <FlatList
          ref={listRef}
          data={flat}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentInsetAdjustmentBehavior="automatic"
          automaticallyAdjustContentInsets
          ListHeaderComponent={ListHeader}
          ListHeaderComponentStyle={{
            backgroundColor: bg,
            paddingTop: 8,
          }}
          stickyHeaderIndices={flat.length ? sticky.map((i) => i + 1) : []}
          {...(Platform.OS === 'ios'
            ? { maintainVisibleContentPosition: { minIndexForVisible: 0 } }
            : {})}
          ItemSeparatorComponent={({ leadingItem }) =>
            leadingItem?._type === 'header' ? null : (
              <View style={{ height: 0.5, backgroundColor: border }} />
            )
          }
          removeClippedSubviews={Platform.OS === 'android'}
          initialNumToRender={22}
          maxToRenderPerBatch={22}
          updateCellsBatchingPeriod={16}
          windowSize={12}
          getItemLayout={getItemLayout}
          contentContainerStyle={{
            paddingBottom: Math.max(0, insets.bottom) + 8,
            flexGrow: 1,
          }}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          style={{ flex: 1 }}
          ListEmptyComponent={
            hasAnyPets ? (
              // 👉 Caso 2: tem pet cadastrado mas o filtro/busca não achou nada
              <View style={styles.emptyWrap}>
                <View style={[styles.emptyCard, { borderColor: border }]}>
                  <View style={styles.emptyIcon}>
                    <IconSymbol name="magnifyingglass" size={18} color="#fff" />
                  </View>
                  <Text style={[styles.emptyTitle, { color: text }]}>Nenhum resultado</Text>
                  <Text style={[styles.emptySub, { color: subtle }]}>
                    Não encontramos nada para essa busca ou filtro.
                  </Text>

                  <Pressable
                    onPress={clearSearchAndScrollTop}
                    style={({ pressed }) => [
                      styles.emptyBtn,
                      { backgroundColor: accent },
                      pressed && { opacity: 0.9 },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="Limpar busca e filtros"
                  >
                    <IconSymbol name="arrow.counterclockwise" size={14} color="#fff" />
                    <Text style={styles.emptyBtnText}>Limpar busca e filtros</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              // 👉 Caso 1: nenhum pet cadastrado ainda
              <View style={styles.emptyWrap}>
                <View style={[styles.emptyCard, { borderColor: border }]}>
                  <View style={styles.emptyIcon}>
                    <IconSymbol name="dog.fill" size={18} color="#fff" />
                  </View>
                  <Text style={[styles.emptyTitle, { color: text }]}>
                    Nenhum pet por aqui ainda
                  </Text>
                  <Text style={[styles.emptySub, { color: subtle }]}>
                    Cadastre seu primeiro pet para começar.
                  </Text>

                  <Pressable
                    onPress={() => router.push('/(modals)/pet-new')}
                    style={({ pressed }) => [
                      styles.emptyBtn,
                      { backgroundColor: accent },
                      pressed && { opacity: 0.9 },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="Adicionar pet"
                  >
                    <IconSymbol name="plus" size={14} color="#fff" />
                    <Text style={styles.emptyBtnText}>Adicionar pet</Text>
                  </Pressable>
                </View>
              </View>
            )
          }
        />

        {letters.length > 1 && (
          <View style={styles.index}>
            {letters.map((l) => (
              <Pressable key={l} onPress={() => jumpTo(l)} hitSlop={6}>
                <Text style={[styles.indexLetter, { color: accent }]}>{l}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },

  headerInner: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    borderBottomWidth: 1,
    gap: 10,
  },

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

  pills: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  pillText: { fontWeight: '700' },

  sectionBanner: {
    height: HEADER_HEIGHT,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  sectionBannerText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },

  row: {
    height: ITEM_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 16, fontWeight: '700' },

  // vazio
  emptyWrap: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
  },
  emptyCard: {
    width: '100%',
    maxWidth: 420,
    borderWidth: 1,
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    backgroundColor: 'white',
    gap: 8,
    marginTop: 50,
  },
  emptyIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  emptyTitle: { fontSize: 16, fontWeight: '800' },
  emptySub: { fontSize: 13, textAlign: 'center', marginBottom: 8 },
  emptyBtn: {
    marginTop: 6,
    height: 42,
    borderRadius: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emptyBtnText: { color: '#fff', fontWeight: '800' },

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
