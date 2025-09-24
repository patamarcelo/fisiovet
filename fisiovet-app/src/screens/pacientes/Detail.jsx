import React, { useEffect, useMemo, useCallback, useLayoutEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router, useNavigation } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { fetchPet, selectPetById } from '@/src/store/slices/petsSlice';
import { useThemeColor } from '@/hooks/useThemeColor';
import { IconSymbol } from '@/components/ui/IconSymbol';


function ActionCard({ title, icon, onPress, onAdd, border }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, { borderColor: border }, pressed && { opacity: 0.85 }]}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <IconSymbol name={icon} size={18} />
      <Text style={styles.cardTitle}>{title}</Text>

      {/* Atalho de adicionar (opcional) */}
      {onAdd && (
        <Pressable
          onPress={(e) => { e.stopPropagation(); onAdd(); }}
          hitSlop={8}
          accessibilityLabel={`Adicionar em ${title}`}
          style={styles.addBtn}
        >
          <IconSymbol name="plus.circle.fill" size={18} />
        </Pressable>
      )}

      <IconSymbol name="chevron.right" size={14} />
    </Pressable>
  );
}

export default function PetDetail() {
  const { id, from, tutorId } = useLocalSearchParams();
  const dispatch = useDispatch();
  const navigation = useNavigation();

  const pet = useSelector(selectPetById(id));

  const text = useThemeColor({}, 'text');
  const tint = useThemeColor({}, 'tint');
  const subtle = useThemeColor({ light: '#6B7280', dark: '#9AA0A6' }, 'text');
  const border = useThemeColor({ light: 'rgba(0,0,0,0.08)', dark: 'rgba(255,255,255,0.12)' }, 'border');
  const bg = useThemeColor({}, 'background');
  const accent = '#10B981';

  const _from = Array.isArray(from) ? from[0] : from;
  const _tutorId = Array.isArray(tutorId) ? tutorId[0] : tutorId;



  useEffect(() => {
    if (!pet) dispatch(fetchPet(id));
  }, [dispatch, id, pet]);

  const goBack = React.useCallback(() => {
    // if (navigation.canGoBack()) {
    //   console.log("voltando aqui")
    //   navigation.goBack();
    //   return;
    // }
    // // fallback: volta para a lista
    console.log("voltando aqui para a lista")
    router.replace('/(phone)/pacientes');
  }, [navigation]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: pet?.nome ?? 'Pet',
      headerTintColor: tint,
      headerStyle: { backgroundColor: bg },
      headerBackVisible: false,
      gestureEnabled: true,
      headerLeft: () => (
        <Pressable onPress={goBack} hitSlop={10} accessibilityLabel="Voltar">
          <IconSymbol name="chevron.left" size={20} />
        </Pressable>
      ),
    });
  }, [navigation, pet?.nome, tint, bg, goBack]);




  if (!pet) {
    return (
      <SafeAreaView style={styles.center} edges={['top', 'left', 'right']}>
        <Text style={{ color: subtle }}>Carregando…</Text>
      </SafeAreaView>
    );
  }

  const icon = pet.especie === 'gato' ? 'cat.fill' : 'dog.fill';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]} edges={['left', 'right']}>
      {/* Cabeçalho */}
      <View style={[styles.header, { borderColor: border }]}>
        <View style={[styles.avatarBig, { backgroundColor: accent }]}>
          <IconSymbol name={icon} size={22} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: text }]}>{pet.nome}</Text>
          <Text style={{ color: subtle }}>
            {[pet.especie, pet.raca, pet.cor].filter(Boolean).join(' • ')}
          </Text>
        </View>
        <Pressable
          onPress={() => router.push({ pathname: '/(modals)/pet-new', params: { mode: 'edit', id: String(pet.id) } })}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Editar pet"
          style={styles.editBtn}
        >
          <IconSymbol name="pencil.circle.fill" size={26} color={tint} />
        </Pressable>
      </View>

      {/* Grid de ações (já com “atalho +”) */}
      <View style={styles.grid}>
        <ActionCard
          title={pet.tutor?.nome ? `Tutor: ${pet.tutor.nome}` : 'Tutor'}
          icon="person.crop.circle.fill"
          border={border}
          onPress={() =>
            pet.tutor?.id
              ? router.push(`/(phone)/tutores/${pet.tutor.id}`)
              : Alert.alert('Tutor não vinculado')
          }
          onAdd={
            pet.tutor?.id
              ? undefined
              : () => Alert.alert('Vincular tutor', 'Escolher/vincular um tutor para este pet')
          }
        />
        <ActionCard
          title="Avaliação"
          icon="clipboard"   // ícone de prancheta
          border={border}
          onPress={() => Alert.alert('Avaliação', 'Abrir Página das avaliações')}
          onAdd={() => Alert.alert('Novo registro', 'Adicionar entrada no timeline')}
        />
        <ActionCard
          title="Timeline"
          icon="clock.arrow.circlepath"
          border={border}
          onPress={() => Alert.alert('Timeline', 'Abrir feed cronológico')}
          onAdd={() => Alert.alert('Novo registro', 'Adicionar entrada no timeline')}
        />
        <ActionCard
          title="Exames"
          icon="doc.text.fill"
          border={border}
          onPress={() => Alert.alert('Exames', 'Abrir a lista de exames')}
          onAdd={() => Alert.alert('Novo exame', 'Criar novo exame')}
        />
        <ActionCard
          title="Fotos & Vídeos"
          icon="photo.on.rectangle"
          border={border}
          onPress={() => Alert.alert('Mídia', 'Abrir galeria')}
          onAdd={() => Alert.alert('Adicionar mídia', 'Abrir câmera/galeria')}
        />
        <ActionCard
          title="Agenda"
          icon="calendar"
          border={border}
          onPress={() => router.push({ pathname: '/(phone)/pacientes/[id]/agenda', params: { id: String(pet.id) } })}
          onAdd={() => router.push({
            pathname: '/(modals)/agenda-new',
            params: {
              tutorId: pet.tutor?.id ? String(pet.tutor.id) : '',
              tutorNome: pet.tutor?.nome || '',
              preselectPetId: String(pet.id),
            }
          })}
        />

        {/* Espaço pra futuros cards: Vacinas, Pesagens, Alergias etc. */}
        <ActionCard
          title="Vacinas"
          icon="syringe.fill"
          border={border}
          onPress={() => Alert.alert('Vacinas', 'Abrir carteirinha')}
          onAdd={() => Alert.alert('Registrar vacina', 'Adicionar novo registro')}
        />
        <ActionCard
          title="Pesagens"
          icon="scalemass.fill"
          border={border}
          onPress={() => Alert.alert('Pesagens', 'Histórico de peso')}
          onAdd={() => Alert.alert('Nova pesagem', 'Adicionar peso')}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderWidth: 1,
    borderRadius: 12,
  },
  avatarBig: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 20, fontWeight: '800' },

  grid: { gap: 12 },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderWidth: 1,
    borderRadius: 12,
  },
  cardTitle: { flex: 1, fontSize: 16, fontWeight: '700' },
  addBtn: { marginRight: 6 },
  editBtn: {
    alignSelf: 'center',
  },
});