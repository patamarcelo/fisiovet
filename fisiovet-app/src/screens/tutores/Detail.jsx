import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Linking, Alert, Platform } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { fetchTutor, deleteTutor } from '@/src/store/slices/tutoresSlice';
import { useLocalSearchParams, router } from 'expo-router';
import { useThemeColor } from '@/hooks/useThemeColor';
import Avatar from '@/components/ui/Avatar';
import ThemedButton from '@/components/ui/ThemedButton';
import MapCard from '@/components/MapCard';

import { geocodeCepMock, updateTutor } from '@/src/services/tutores';
import Screen from '../_ui/Screen';
import useHideTabBar from '@/hooks/useHideBar';


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
        {!!tutor.telefone && <Text style={{ color: subtle }}>{tutor.telefone}</Text>}
        {!!tutor.email && <Text style={{ color: subtle }}>{tutor.email}</Text>}
      </View>

      <View style={styles.actions}>
        <Action title="Ligar" onPress={call} tint={tint} />
        <Action title="E-mail" onPress={email} tint={tint} />
        <Action title="Rota" onPress={maps} tint={tint} />
      </View>

      <View style={styles.block}>
        <Text style={[styles.blockTitle, { color: text }]}>Endereço</Text>
        <Text style={{ color: subtle }}>
          {tutor?.endereco?.logradouro} {tutor?.endereco?.numero}{'\n'}
          {tutor?.endereco?.bairro}{'\n'}
          {tutor?.endereco?.cidade} - {tutor?.endereco?.uf} · {tutor?.endereco?.cep}
        </Text>

        {/* Card de mapa */}
        <View style={{ marginTop: 12 }}>
          <MapCard
            lat={tutor?.geo?.lat}
            lng={tutor?.geo?.lng}
            title={tutor?.nome}
            height={180}
          />
        </View>
        <Pressable onPress={async () => {
          const geo = await geocodeCepMock(tutor?.endereco?.cep, tutor?.endereco);
          await dispatch(updateTutor({ id: tutor.id, patch: { geo } }));
        }}>
          <Text>Gerar coordenadas</Text>
        </Pressable>
      </View>

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

function Action({ title, onPress, tint }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          minWidth: 96,
          paddingVertical: 10,
          paddingHorizontal: 14,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: 'rgba(0,0,0,0.08)',
          alignItems: 'center',
          backgroundColor: pressed ? 'rgba(0,0,0,0.04)' : 'transparent',
        },
      ]}
    >
      <Text style={{ color: tint, fontWeight: '700' }}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 16 },
  header: { alignItems: 'center', gap: 6, marginTop: 6 },
  actions: { flexDirection: 'row', gap: 12, justifyContent: 'center', marginTop: 4 },
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