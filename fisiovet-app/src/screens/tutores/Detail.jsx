// (phone)/tutores/[id].jsx
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Alert, Platform, Linking, Pressable, ScrollView } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { fetchTutor } from '@/src/store/slices/tutoresSlice';
import { useLocalSearchParams, useNavigation, router } from 'expo-router';
import { useThemeColor } from '@/hooks/useThemeColor';
import { IconSymbol } from '@/components/ui/IconSymbol';
import Avatar from '@/components/ui/Avatar';
import EnderecoCard from './EnderecoCard';
import Action from '@/components/ui/Action';
import { maskPhone } from '@/src/utils/masks';
import { openWhatsapp } from '@/src/utils/openWhatsapp';
import PetsCard from './PetsCard';
import { UpcomingEventsCard } from './UpcomingEventsCard';

export default function TutorDetail() {
  const { id } = useLocalSearchParams();
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();

  const tutor = useSelector((s) => s.tutores.byId[id]);

  const text = useThemeColor({}, 'text');
  const subtle = useThemeColor({ light: '#6B7280', dark: '#9AA0A6' }, 'text');
  const tint = useThemeColor({}, 'tint');

  useEffect(() => {
    if (!tutor) dispatch(fetchTutor(id));
  }, [id, tutor, dispatch]);

  // Header nativo com título grande que colapsa ao rolar
  useEffect(() => {
    navigation.setOptions({
      headerLargeTitle: false,               // título grande
      headerBackTitleVisible: false,
      headerTitle: tutor?.nome ?? 'Tutor',
      headerRight: () => (
        <Pressable
          onPress={() => router.push(`/(phone)/tutores/${id}/edit`)}
          hitSlop={10}
          accessibilityLabel="Editar tutor"
        >
          <IconSymbol name="square.and.pencil" size={24} />
        </Pressable>
      ),
    });
  }, [navigation, id, tutor?.nome]);

  if (!tutor) {
    return (
      <SafeAreaView style={styles.center} edges={['top', 'left', 'right']}>
        <Text style={{ color: subtle }}>Carregando…</Text>
      </SafeAreaView>
    );
  }

  const email = () => tutor.email && Linking.openURL(`mailto:${tutor.email}`);
  const maps = () => {
    const { geo, endereco } = tutor;
    if (geo?.lat && geo?.lng) {
      const q = encodeURIComponent(`${endereco?.logradouro ?? ''} ${endereco?.numero ?? ''}, ${endereco?.cidade ?? ''} - ${endereco?.uf ?? ''}`);
      const url = Platform.select({
        ios: `https://www.google.com/maps/search/?api=1&query=${geo.lat},${geo.lng}`,
        android: `geo:${geo.lat},${geo.lng}?q=${q}`,
        default: `https://www.google.com/maps/search/?api=1&query=${geo.lat},${geo.lng}`,
      });
      Linking.openURL(url);
    } else {
      Alert.alert('Endereço', 'Sem coordenadas para abrir no mapa.');
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right']}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: 16 + insets.bottom + 24 }, // evita sobrepor a tab bar
        ]}
        // melhora o colapso do large title no iOS
        scrollEventThrottle={16}
      >
        {/* Cabeçalho “visual” que rola junto ao conteúdo */}
        <View style={styles.header}>
          <Avatar name={tutor.nome} size={72} />
          <Text style={{ color: text, fontSize: 22, fontWeight: '700' }}>{tutor.nome}</Text>
          {!!tutor.telefone && <Text selectable style={{ color: subtle }}>{maskPhone(tutor.telefone)}</Text>}
          {!!tutor.email && <Text selectable style={{ color: subtle }}>{tutor.email}</Text>}
        </View>

        <View style={styles.actions}>
          <Action
            title="WhatsApp"
            icon="message.fill"
            onPress={() => openWhatsapp(tutor.telefone, `Olá ${tutor.nome}`)}
            tint={tint}
          />
          <Action title="E-mail" icon="envelope.fill" onPress={email} tint={tint} />
          <Action title="Rota" icon="car.fill" onPress={maps} tint={tint} />
        </View>

        <PetsCard tutor={tutor} />
        <UpcomingEventsCard tutorId={tutor.id} />
        <EnderecoCard tutor={tutor} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 16, gap: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: { alignItems: 'center', gap: 6, marginTop: 6 },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    gap: 20,
    paddingVertical: 5,
  },
});