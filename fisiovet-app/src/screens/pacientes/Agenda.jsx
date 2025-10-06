// app/(phone)/pacientes/[id]/agenda.jsx
import React, { useMemo, useLayoutEffect } from 'react';
import { View, Text, SectionList, RefreshControl, Pressable, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useNavigation, router } from 'expo-router';
import { useSelector } from 'react-redux';
import { makeSelectEventosByPetGrouped } from '@/src/store/slices/agendaSlice';
import { selectPetById } from '@/src/store/slices/petsSlice';
import { useThemeColor } from '@/hooks/useThemeColor';
import { EventRow } from '@/src/screens/agenda/List'; // reuso

function fmtDateLabel(dateLike) {
    const d = new Date(dateLike);
    return d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });
}

export default function PetAgendaScreen() {
    const { id } = useLocalSearchParams(); // id do pet
    const navigation = useNavigation();
    const tint = useThemeColor({}, 'tint');

    const pet = useSelector(selectPetById(id));

    // memoiza selector por pet
    const selectGrouped = useMemo(() => makeSelectEventosByPetGrouped(id), [id]);
    const sections = useSelector((s) => selectGrouped(s));

    useLayoutEffect(() => {
        navigation.setOptions({
            headerTitle: pet?.nome ? `Agenda · ${pet.nome}` : 'Agenda do Pet',
            headerShown: true,
            headerTitleStyle: { color: tint, fontWeight: "700" },
            headerRight: () => (
                <Pressable
                    onPress={() => {
                        // abre modal de novo evento já mirando nesse pet/tutor
                        router.push({
                            pathname: '/(modals)/agenda-new',
                            params: {
                                tutorId: pet?.tutor?.id ? String(pet.tutor.id) : '',
                                tutorNome: pet?.tutor?.nome || '',
                                preselectPetId: String(id), // opcional (ver passo 3)
                            },
                        });
                    }}
                    style={{ paddingHorizontal: 8, paddingVertical: 4 }}
                    accessibilityLabel="Novo evento"
                >
                    <Text style={{ color: '#007AFF', fontWeight: '700' }}>Novo</Text>
                </Pressable>
            ),
        });
    }, [navigation, pet?.nome, id]);

    const ListEmpty = () => (
        <View style={{ padding: 24, alignItems: 'center' }}>
            <Text style={{ color: '#6B7280' }}>Nenhum evento para este pet</Text>
            <Text style={{ color: '#6B7280', marginTop: 4 }}>Toque em “Novo” para agendar</Text>
        </View>
    );

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#FFF' }} edges={[ 'bottom']}>
            <SectionList
                style={{ flex: 1 }}
                sections={sections}
                keyExtractor={(item) => String(item.id)}
                renderSectionHeader={({ section }) => (
                    <View style={{ backgroundColor: '#FFF' }}>
                        <Text
                            style={{
                                paddingVertical: 6,
                                paddingHorizontal: 12,
                                fontSize: 13,
                                fontWeight: '700',
                                color: 'whitesmoke',
                                backgroundColor: 'rgba(162,181,178,1.0)',
                            }}
                        >
                            {fmtDateLabel(section.title)}
                        </Text>
                    </View>
                )}
                renderItem={({ item }) => <EventRow item={item} />}
                ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: '#E5E7EB' }} />}
                ListEmptyComponent={ListEmpty}
                refreshControl={<RefreshControl tintColor={tint} refreshing={false} onRefresh={() => { }} />}
                contentContainerStyle={{ paddingBottom: 24 }}
                stickySectionHeadersEnabled
                contentInsetAdjustmentBehavior="automatic"
                removeClippedSubviews
            />
        </SafeAreaView>
    );
}