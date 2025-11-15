// screens/biblioteca/List.jsx
// JSX (sem TypeScript). Estilo iOS Ajustes com seções, busca e navegação.
import React, { useMemo, useState, useLayoutEffect } from 'react';
import {
  View,
  Text,
  SectionList,
  TextInput,
  Pressable,
  StyleSheet,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../_ui/Screen';
import { useNavigation } from "expo-router";
import { useThemeColor } from "@/hooks/useThemeColor";
import { SafeAreaView } from 'react-native-safe-area-context';

// ——————————————————
// Dados de exemplo (você pode popular dinamicamente depois)
const SECTIONS = [
  {
    title: 'Material Didático',
    data: [
      { key: 'md_protocolos', title: 'Protocolos de Reabilitação', subtitle: 'PDFs, fluxos e checklists', icon: 'document-text-outline', route: '/biblioteca/protocolos', tags: ['pdf', 'guias', 'protocolos'] },
      { key: 'md_artigos', title: 'Artigos & Referências', subtitle: 'Base de estudos por afecção', icon: 'book-outline', route: '/biblioteca/artigos', tags: ['artigos', 'referencias', 'estudos'] },
    ],
  },
  {
    title: 'Exercícios & Modalidades',
    data: [
      { key: 'ex_modal', title: 'Banco de Exercícios', subtitle: 'Fortalecimento, propriocepção, alongamentos', icon: 'fitness-outline', route: '/biblioteca/exercicios', tags: ['exercicio', 'modalidades', 'propriocepcao'] },
      { key: 'ex_videos', title: 'Vídeos Demonstrativos', subtitle: 'Passo a passo por técnica', icon: 'play-circle-outline', route: '/biblioteca/videos', tags: ['video', 'tutorial'] },
    ],
  },
  {
    title: 'Equipamentos',
    data: [
      { key: 'eq_laser', title: 'Laserterapia', subtitle: 'Parâmetros, aplicações, precauções', icon: 'sunny-outline', route: '/biblioteca/equip/laser', tags: ['laser', 'parametros', 'dose'] },
      { key: 'eq_magneto', title: 'Magnetoterapia', subtitle: 'Frequências, posicionamento, contraindicações', icon: 'magnet-outline', route: '/biblioteca/equip/magneto', tags: ['magneto', 'campo', 'frequencia'] },
      { key: 'eq_tens', title: 'Eletroterapia (TENS/FES)', subtitle: 'Posicionamento de eletrodos e protocolos', icon: 'flash-outline', route: '/biblioteca/equip/eletro', tags: ['tens', 'fes', 'eletro'] },
    ],
  },
  {
    title: 'Tutoriais',
    data: [
      { key: 'tu_fluxo', title: 'Fluxo de Atendimento', subtitle: 'Da triagem à alta', icon: 'trail-sign-outline', route: '/biblioteca/tutoriais/fluxo', tags: ['fluxo', 'triagem', 'alta'] },
      { key: 'tu_avaliacao', title: 'Avaliação Física', subtitle: 'Checklists objetivos e escalas', icon: 'list-circle-outline', route: '/biblioteca/tutoriais/avaliacao', tags: ['avaliacao', 'escala', 'checklist'] },
    ],
  },
  {
    title: 'Integração com IA',
    data: [
      { key: 'ia_assistente', title: 'Assistente Clínico', subtitle: 'Pergunte sobre protocolos e condutas', icon: 'sparkles-outline', route: '/biblioteca/ia/assistente', tags: ['ia', 'assistente'] },
      { key: 'ia_busca', title: 'Busca Inteligente', subtitle: 'Encontre conteúdo em PDFs e vídeos', icon: 'search-circle-outline', route: '/biblioteca/ia/busca', tags: ['busca', 'semantic', 'pdf'] },
    ],
  },
];

// ——————————————————
export default function BibliotecaList() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const navigation = useNavigation();

  const tint = useThemeColor({}, "tint");
  const bg = useThemeColor({}, "background");
  const text = useThemeColor({}, "text");

  const filteredSections = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SECTIONS;
    return SECTIONS.map(sec => {
      const data = (sec.data || []).filter(it => {
        const hay = `${it.title} ${it.subtitle ?? ''} ${(it.tags || []).join(' ')}`.toLowerCase();
        return hay.includes(q);
      });
      return { ...sec, data };
    }).filter(sec => (sec.data || []).length > 0);
  }, [query]);

  const onPressRow = (item) => {
    if (item?.route) router.push(item.route);
  };


  // useLayoutEffect(
  //   () => {
  //     console.log('here lib')
  //     navigation.setOptions({
  //       headerLargeTitle: true,
  //       headerTitle: "Agenda",
  //       headerTitleStyle: { color: tint, fontWeight: "700" },
  //       headerStyle: { backgroundColor: bg }, // 🎨 cor de fundo do header  
  //     });
  //   },
  //   []
  // );

  const ListHeader = (
    <View style={styles.searchWrap}>
      <Ionicons name="search-outline" size={18} color="#6B7280" style={{ marginRight: 8 }} />
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Pesquisar em toda a biblioteca"
        placeholderTextColor="#9CA3AF"
        style={styles.searchInput}
        autoCapitalize="none"
        returnKeyType="search"
        clearButtonMode="while-editing"
      />
      {query.length > 0 && (
        <Pressable onPress={() => setQuery('')} hitSlop={10}>
          <Ionicons name="close-circle" size={18} color="#9CA3AF" />
        </Pressable>
      )}
    </View>
  );

  return (
     <SafeAreaView
          style={{ flex: 1, backgroundColor: bg, marginBottom: 0 }}
          edges={["top", 'bottom']}
        >
      <View>
        <SectionList
          sections={filteredSections}
          keyExtractor={(item) => item.key}
          stickySectionHeadersEnabled={false}
          ListHeaderComponent={
            <>
              <Text style={styles.title}>Biblioteca</Text>
              {ListHeader}
            </>
          }
          renderSectionHeader={({ section }) => (
            <Text style={[styles.sectionHeader,{color: text}]}>{section.title}</Text>
          )}
          renderSectionFooter={() => <View style={{ height: 8 }} />}
          renderItem={({ item, index, section }) => {
            const total = (section.data || []).length;
            const isFirst = index === 0;
            const isLast = index === total - 1;
            return (
              <Pressable
                onPress={() => onPressRow(item)}
                style={({ pressed }) => [
                  styles.row,
                  isFirst && styles.rowFirst,
                  isLast && styles.rowLast,
                  pressed && styles.rowPressed,
                ]}
              >
                <View style={styles.rowLeft}>
                  <View style={styles.rowIcon}>
                    <Ionicons name={item.icon || 'document-text-outline'} size={18} color="#0F766E" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle} numberOfLines={1}>{item.title}</Text>
                    {!!item.subtitle && (
                      <Text style={styles.rowSubtitle} numberOfLines={1}>{item.subtitle}</Text>
                    )}
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
              </Pressable>
            );
          }}
          contentContainerStyle={{ paddingBottom: 24 }}
          SectionSeparatorComponent={() => null}
          ItemSeparatorComponent={({ leadingItem, section }) => {
            const data = section.data || [];
            const lastKey = data.length ? data[data.length - 1].key : null;
            const isLast = leadingItem?.key === lastKey;
            return isLast ? null : <View style={styles.separator} />;
          }}
        />
      </View>
    </SafeAreaView>
  );
}

// ——————————————————
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    // backgroundColor: 
    // paddingTop: Platform.OS === 'ios' ? 8 : 0,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
  },
  searchWrap: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    color: '#111827',
    fontSize: 16,
    paddingVertical: 0,
  },
  sectionHeader: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    marginHorizontal: 16,
    paddingHorizontal: 12,
    minHeight: 54,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#E5E7EB',
  },
  rowFirst: {
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderTopWidth: 1,
    borderColor: '#E5E7EB',
  },
  rowLast: {
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
  },
  rowPressed: {
    backgroundColor: '#F9FAFB',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    paddingVertical: 10,
  },
  rowIcon: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#E6FFFA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '600',
  },
  rowSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E5E7EB',
    marginLeft: 16 + 12 + 28 + 12, // alinhado após o ícone
    marginRight: 16,
  },
});