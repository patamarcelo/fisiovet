// (phone)/tutores/[id].jsx
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Alert, Platform, Linking, Pressable } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { fetchTutor } from '@/src/store/slices/tutoresSlice';
import { useLocalSearchParams, useNavigation, router } from 'expo-router';
import { useThemeColor } from '@/hooks/useThemeColor';
import { IconSymbol } from '@/components/ui/IconSymbol';
import Avatar from '@/components/ui/Avatar';
import Screen from '../_ui/Screen';
import useHideTabBar from '@/hooks/useHideBar';
import EnderecoCard from './EnderecoCard';
import Action from '@/components/ui/Action';
import { maskPhone } from '@/src/utils/masks';
import { openWhatsapp } from '@/src/utils/openWhatsapp';
import PetsCard from './PetsCard';

export default function TutorDetail() {
  useHideTabBar(true);
  const { id } = useLocalSearchParams();
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const tutor = useSelector((s) => s.tutores.byId[id]);

  const text = useThemeColor({}, 'text');
  const subtle = useThemeColor({ light: '#6B7280', dark: '#9AA0A6' }, 'text');
  const tint = useThemeColor({}, 'tint');
  const iconColor = useThemeColor({}, 'icon');

  useEffect(() => {
    if (!tutor) dispatch(fetchTutor(id));
  }, [id, tutor, dispatch]);

  // 🔹 Configura o header da tela de detalhe
  useEffect(() => {
    navigation.setOptions({
      headerLargeTitle: false,
      headerBackTitleVisible: false,
      headerTitle: '',
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
  }, [navigation, id, tint]);

  if (!tutor) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: subtle }}>Carregando…</Text>
      </View>
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
    <Screen withTabBar={false} style={styles.container}>
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
      <EnderecoCard tutor={tutor} />

      {/* 🔸 Removidos: botões Editar/Excluir do corpo */}
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 16, paddingTop: 0 },
  header: { alignItems: 'center', gap: 6, marginTop: 6 },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    gap: 20,
    paddingVertical: 5,
  },
});