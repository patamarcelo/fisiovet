// src/screens/pacientes/info/Avaliacao.jsx (JS)
import { useEffect, useMemo, useState, useCallback } from 'react';
import {
    View, Text, SectionList, TouchableOpacity, RefreshControl,
    Alert, Platform, ActionSheetIOS, ActivityIndicator, Pressable
} from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';

import { ensureFirebase } from '@/firebase/firebase';
import { createDraft, clearDraft } from '@/src/store/slices/avaliacaoSlice';


function sameDay(a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
function humanDateLabel(d) {
    const t = new Date(), y = new Date(); y.setDate(t.getDate() - 1);
    if (sameDay(d, t)) return 'Hoje';
    if (sameDay(d, y)) return 'Ontem';
    return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}
function groupByDay(items) {
    const map = new Map();
    for (const it of items) {
        const ts = it.createdAt?._seconds ? new Date(it.createdAt._seconds * 1000)
            : it.createdAt instanceof Date ? it.createdAt : new Date(0);
        const key = `${ts.getFullYear()}-${String(ts.getMonth() + 1).padStart(2, '0')}-${String(ts.getDate()).padStart(2, '0')}`;
        if (!map.has(key)) map.set(key, { date: ts, data: [] });
        map.get(key).data.push(it);
    }
    return Array.from(map.values())
        .sort((a, b) => b.date - a.date)
        .map(s => ({ title: humanDateLabel(s.date), data: s.data }));
}

export default function AvaliacaoList() {
    const { firestore, auth } = ensureFirebase() || {};
    const { id: petId } = useLocalSearchParams();

    const dispatch = useDispatch();
    const [items, setItems] = useState([]);
    const [err, setErr] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    const [saving, setSaving] = useState(false);

    // Carrega lista em tempo real
    useEffect(() => {
        if (!firestore) return;
        const uid = auth?.currentUser?.uid;
        if (!uid || !petId) return;

        const colRef = firestore
            .collection('users').doc(String(uid))
            .collection('pets').doc(String(petId))
            .collection('avaliacoes');

        const unsub = colRef.orderBy('createdAt', 'desc').onSnapshot(
            snap => {
                setErr(null);
                setItems(snap?.docs?.map(d => ({ id: d.id, ...d.data() })) ?? []);
            },
            e => { console.warn('avaliacoes onSnapshot', e); setErr(e); setItems([]); }
        );
        return unsub;
    }, [firestore, auth, petId]);

    const sections = useMemo(() => groupByDay(items), [items]);

    // Abrir “detalhe” (por enquanto só um alerta; depois vocês criam o modal)
    const openDetail = useCallback((item) => {
        router.push({
            pathname: '/(modals)/avaliacao-new/',
            params: { id: String(petId), avaliacaoId: String(item.id) }
        });
        // Exemplo de navegação futura:
        // router.push({ pathname: '/(modals)/avaliacao-detail', params: { petId: String(petId), id: String(item.id) } });
    }, [petId]);

    // Botão “...” por item (apagar, etc.)
    const handleDelete = useCallback((item) => {
        const uid = auth?.currentUser?.uid;
        if (!uid || !petId) return;
        Alert.alert('Apagar', 'Deseja apagar esta avaliação?', [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Apagar', style: 'destructive', onPress: async () => {
                    try {
                        await firestore
                            .collection('users').doc(String(uid))
                            .collection('pets').doc(String(petId))
                            .collection('avaliacoes').doc(String(item.id))
                            .delete();
                    } catch (e) {
                        console.log('delete avaliacao error', e);
                        Alert.alert('Apagar', 'Falha ao apagar a avaliação.');
                    }
                }
            }
        ]);
    }, [auth, petId, firestore]);

    const openActions = useCallback((item) => {
        const options = ['Apagar', 'Cancelar'];
        const cancelButtonIndex = 1;
        if (Platform.OS === 'ios') {
            ActionSheetIOS.showActionSheetWithOptions(
                { options, destructiveButtonIndex: 0, cancelButtonIndex },
                (i) => { if (i === 0) handleDelete(item); }
            );
        } else {
            Alert.alert('Avaliação', 'Escolha uma ação', [
                { text: 'Apagar', style: 'destructive', onPress: () => handleDelete(item) },
                { text: 'Cancelar', style: 'cancel' }
            ]);
        }
    }, [handleDelete]);

    const renderItem = ({ item }) => {
        const radiosCount = Object.keys(item?.fields?.radios || {}).length;
        const switchesGroups = Object.keys(item?.fields?.switches || {}).length;
        return (
            <TouchableOpacity
                onPress={() => openDetail(item)}
                onLongPress={() => openActions(item)}
                style={{
                    flexDirection: 'row',
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    alignItems: 'center',
                }}
            >
                {/* Ícone + Data */}
                <View
                    style={{
                        width: 56,
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <View
                        style={{
                            width: 44,
                            height: 44,
                            borderRadius: 8,
                            backgroundColor: '#E5E7EB',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <Ionicons name="clipboard-outline" size={20} color="#374151" />
                    </View>
                    {item?.createdAt && (
                        <View style={{ alignItems: 'center', marginTop: 4 }}>
                            <Text style={{ fontSize: 10, color: '#9CA3AF' }}>
                                {new Date(
                                    item.createdAt?._seconds
                                        ? item.createdAt._seconds * 1000
                                        : item.createdAt
                                ).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                            </Text>
                            <Text style={{ fontSize: 10, color: '#9CA3AF' }}>
                                {new Date(
                                    item.createdAt?._seconds
                                        ? item.createdAt._seconds * 1000
                                        : item.createdAt
                                ).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </Text>
                        </View>
                    )}
                </View>

                {/* Título e descrição */}
                <View style={{ marginLeft: 12, flex: 1 }}>
                    <Text
                        numberOfLines={1}
                        style={{ fontWeight: '600', fontSize: 16 }}
                    >
                        Avaliação
                    </Text>
                    <Text
                        numberOfLines={1}
                        style={{ color: '#6B7280', marginTop: 2, fontSize: 12 }}
                    >
                        Radios: {radiosCount} • Switches: {switchesGroups} •{' '}
                        {item?.fields?.notes ? 'Com observações' : 'Sem observações'}
                    </Text>
                </View>

                <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
            </TouchableOpacity>
        );
    };

    const renderSectionHeader = ({ section }) => (
        <View style={{ paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#F3F4F6', borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)' }}>
            <Text style={{ color: '#374151', fontWeight: '700' }}>{section.title}</Text>
        </View>
    );


    const handleAddDraft = useCallback(() => {
        try {
            // 🔹 Garante que o Redux começa limpo
            dispatch(clearDraft({ petId: String(petId) }));
            dispatch(createDraft({ petId: String(petId) }));

            // 🔹 Abre o formulário de nova avaliação
            router.push({
                pathname: '/(modals)/avaliacao-new',
                params: { id: String(petId) },
            });
        } catch (e) {
            console.log('handleAdd avaliacao error', e);
            Alert.alert('Avaliações', 'Não foi possível iniciar uma nova avaliação.');
        }
    }, [dispatch, petId]);


    return (
        <View style={{ flex: 1, backgroundColor: 'white' }}>
            <Stack.Screen
                options={{
                    title: 'Avaliações',
                    headerRight: () => (
                        <Pressable
                            onPress={handleAddDraft}
                            hitSlop={8}
                            style={{ paddingHorizontal: 4 }}
                        >
                            <Ionicons name="add-circle" size={24} color="#007AFF" />
                        </Pressable>
                    ),
                }}
            />

            {err ? (
                <View style={{ padding: 16 }}>
                    <Text style={{ color: 'crimson' }}>Não foi possível carregar as avaliações.</Text>
                </View>
            ) : null}

            <SectionList
                sections={sections}
                keyExtractor={(i) => i.id}
                renderItem={renderItem}
                renderSectionHeader={renderSectionHeader}
                stickySectionHeadersEnabled
                ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: 'rgba(0,0,0,0.04)', marginLeft: 72 }} />}
                ListEmptyComponent={
                    <View style={{ padding: 24 }}>
                        <Text style={{ color: '#6B7280' }}>Nenhuma avaliação por aqui ainda.</Text>
                    </View>
                }
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => { setRefreshing(true); setTimeout(() => setRefreshing(false), 350); }}
                    />
                }
                contentContainerStyle={{ paddingBottom: 16 }}
            />

            {saving && (
                <View style={{
                    position: 'absolute', left: 0, right: 0, top: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
                }}>
                    <View style={{ backgroundColor: '#111827', padding: 16, borderRadius: 12, minWidth: 180, alignItems: 'center' }}>
                        <ActivityIndicator size="large" color="#fff" />
                        <Text style={{ color: 'white', marginTop: 10, fontWeight: '600' }}>
                            Salvando…
                        </Text>
                    </View>
                </View>
            )}
        </View>
    );
}