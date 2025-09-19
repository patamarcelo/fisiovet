import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, FlatList, Alert } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import {
    fetchPetsByTutor,
    selectPetsByTutorId,
    selectLoadingPetsByTutor,
} from '@/src/store/slices/petsSlice';
import { useThemeColor } from '@/hooks/useThemeColor';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { router } from 'expo-router';

function PetItem({ pet, textColor, subtle, tutor }) {
    const subtitle = [pet.especie, pet.raca, pet.cor].filter(Boolean).join(' • ');

    // escolhe o ícone de acordo com a espécie
    const iconName =
        pet.especie === 'gato'
            ? 'cat.fill'     // ícone de gato
            : 'dog.fill';    // ícone de cachorro (fallback)

    return (
        <Pressable
            onPress={() => router.push({ pathname: '/(phone)/pacientes/[id]', params: { id: pet.id, from: 'tutor', tutorId: tutor.id } })}
            style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1, paddingVertical: 10 }]}
        >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={styles.avatar}>
                    <IconSymbol name={iconName} size={16} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={{ color: textColor, fontWeight: '700' }}>{pet.nome}</Text>
                    {!!subtitle && <Text style={{ color: subtle, marginTop: 2 }}>{subtitle}</Text>}
                </View>
                <IconSymbol name="chevron.right" size={14} />
            </View>
        </Pressable>
    );
}

export default function PetsCard({ tutor }) {
    const dispatch = useDispatch();
    const border = useThemeColor({ light: 'rgba(0,0,0,0.08)', dark: 'rgba(255,255,255,0.08)' }, 'border');
    const text = useThemeColor({}, 'text');
    const subtle = useThemeColor({ light: '#6B7280', dark: '#9AA0A6' }, 'text');
    const tint = useThemeColor({}, 'tint');
    const bg = useThemeColor({}, 'background');

    // 🔹 seletores memoizados (sem recriar arrays a cada render)
    const pets = useSelector(selectPetsByTutorId(tutor.id));
    const loading = useSelector(selectLoadingPetsByTutor(tutor.id));

    // 🔹 sabemos se já houve tentativa de carregar para esse tutor:
    const idsOrUndefined = useSelector(s => s.pets.byTutorId[tutor.id]);

    useEffect(() => {
        // chama sem force – só quando nunca carregou
        dispatch(fetchPetsByTutor({ tutorId: tutor.id }));
    }, [dispatch, tutor.id]);


    return (
        <View style={[styles.block, { borderColor: border, backgroundColor: bg }]}>
            <View style={styles.headerRow}>
                <Text style={[styles.blockTitle, { color: text }]}>Pets</Text>

                <Pressable
                    onPress={() =>
                        router.push({
                            pathname: "/(modals)/pet-new",
                            params: { tutorId: tutor.id, tutorNome: tutor.nome },
                        })
                    }
                    hitSlop={8}
                    accessibilityLabel="Adicionar pet"
                >
                    <IconSymbol name="plus.circle.fill" size={22} color={tint} />
                </Pressable>
            </View>

            {loading && <Text style={{ color: subtle }}>Carregando…</Text>}

            {!loading && pets.length === 0 && (
                <Text style={{ color: subtle }}>Nenhum pet cadastrado para este tutor.</Text>
            )}

            {!loading && pets.length > 0 && (
                <FlatList
                    data={pets}
                    keyExtractor={(item) => item.id}
                    ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
                    renderItem={({ item }) => <PetItem pet={item} textColor={text} subtle={subtle} tutor={tutor} />}
                    scrollEnabled={false}
                    contentContainerStyle={{ paddingTop: 6 }}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    block: {
        padding: 12,
        borderWidth: 1,
        borderRadius: 12,
    },
    blockTitle: { fontSize: 16, fontWeight: '700' },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    avatar: {
        width: 28, height: 28, borderRadius: 14,
        backgroundColor: 'rgba(0,0,0,0.6)',
        alignItems: 'center', justifyContent: 'center',
    },
});