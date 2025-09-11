import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Linking, Alert, Platform } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { fetchTutor, deleteTutor } from '@/src/store/slices/tutoresSlice';
import { useLocalSearchParams, router } from 'expo-router';
import { useThemeColor } from '@/hooks/useThemeColor';
import Avatar from '@/components/ui/Avatar';
import ThemedButton from '@/components/ui/ThemedButton';
import MapCard from '@/components/MapCard';


import Screen from '../_ui/Screen';
import useHideTabBar from '@/hooks/useHideBar';
import EnderecoCard from './EnderecoCard';

import { maskPhone } from '@/src/utils/masks';
import { openWhatsapp } from '@/src/utils/openWhatsapp';
import Action from '@/components/ui/Action';

export default function TutorDetail() {
  useHideTabBar(true); // 👈 esconde a tab bar enquanto essa tela estiver ativa
  const { id } = useLocalSearchParams();
  const dispatch = useDispatch();
  const tutor = useSelector((s) => s.tutores.byId[id]);
  const text = useThemeColor({}, 'text');
  const subtle = useThemeColor({ light: '#6B7280', dark: '#9AA0A6' }, 'text');
  const tint = useThemeColor({}, 'tint');

  useEffect(() => {
    if (!tutor) dispatch(fetchTutor(id));
  }, [id, tutor, dispatch]);

  if (!tutor) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: subtle }}>Carregando…</Text>
      </View>
    );
  }

  const call = () => {
    if (tutor.telefone) Linking.openURL(`tel:${tutor.telefone}`);
  };
  const email = () => {
    if (tutor.email) Linking.openURL(`mailto:${tutor.email}`);
  };
  const maps = () => {
    const { geo, endereco } = tutor;
    if (geo?.lat && geo?.lng) {
      const q = encodeURIComponent(`${endereco?.logradouro ?? ''} ${endereco?.numero ?? ''}, ${endereco?.cidade ?? ''} - ${endereco?.uf ?? ''}`);
      const url = Platform.select({
        // ios: `http://maps.apple.com/?ll=${geo.lat},${geo.lng}&q=${q}`,
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
    <Screen style={styles.container}>
      <View style={styles.header}>
        <Avatar name={tutor.nome} size={72} />
        <Text style={{ color: text, fontSize: 22, fontWeight: '700' }}>{tutor.nome}</Text>
        {!!tutor.telefone && <Text selectable style={{ color: subtle }}>{maskPhone(tutor.telefone)}</Text>}
        {!!tutor.email && <Text selectable style={{ color: subtle }}>{tutor.email}</Text>}
      </View>

      <View style={styles.actions}>
        {/* <Action title="Ligar" onPress={call} tint={tint} /> */}
        <Action
          title="WhatsApp"
          icon="message.fill"
          onPress={() => openWhatsapp(tutor.telefone, `Olá ${tutor.nome}`)}
          tint={tint}
        />
        <Action
          title="E-mail"
          icon="envelope.fill"
          onPress={email}
          tint={tint}
        />
        <Action
          title="Rota"
          icon="car.fill"
          onPress={maps}
          tint={tint}
        />
      </View>

      <EnderecoCard tutor={tutor} />

      <View style={[styles.block, { marginTop: 16 }]}>
        <ThemedButton title="Editar" variant="primary" onPress={() => router.push(`/(phone)/tutores/${tutor.id}/edit`)} style={({ pressed }) => [styles.btn, { backgroundColor: tint, opacity: pressed ? 0.85 : 1 }]} />
        <Pressable
          onPress={async () => {
            const ok = await new Promise((r) =>
              Alert.alert('Excluir', 'Deseja excluir este tutor?', [
                { text: 'Cancelar', style: 'cancel', onPress: () => r(false) },
                { text: 'Excluir', style: 'destructive', onPress: () => r(true) },
              ])
            );
            if (ok) {
              await dispatch(deleteTutor(tutor.id));
              router.back();
            }
          }}
          style={({ pressed }) => [styles.btn, { backgroundColor: '#fee2e2', opacity: pressed ? 0.85 : 1 }]}
        >
          <Text style={{ color: '#b91c1c', fontWeight: '700' }}>Excluir</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 16, paddingTop: 0 },
  header: { alignItems: 'center', gap: 6, marginTop: 6 },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: 'space-evenly',
    gap: 20,
    
    paddingVertical: 5,
    paddingHorizontal: 0,
    borderRadius: 20, // 👈 mais arredondado, estilo "pill"
  },
  label: { fontSize: 14, fontWeight: "600" },
  block: { padding: 12, borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)', borderRadius: 12, rowGap: 10 },
  blockTitle: { fontSize: 16, fontWeight: '700', marginBottom: 6 },
  btn: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
});