// src/screens/Home.jsx
// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react';
import {
    View,
    Text,
    Pressable,
    StyleSheet,
    Platform,
    SectionList,
    useWindowDimensions,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, router } from 'expo-router';
import { useSelector } from 'react-redux';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColor } from '@/hooks/useThemeColor';
import { selectAllEventos } from '@/src/store/slices/agendaSlice';
import { selectUserName } from '@/src/store/slices/userSlice';

import { selectUserPhoto } from '@/src/store/slices/userSlice';

import { Image } from 'expo-image';

import { getMetadata, ref } from "firebase/storage";
import { getCachedAvatar } from '../utils/avatarCache';

/* ---------- Consts & helpers ---------- */

const STATUS_COLORS = {
    confirmado: '#16A34A',
    pendente: '#F59E0B',
    cancelado: '#EF4444',
};

const fmtHour = (iso) => {
    try {
        const d = new Date(iso);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
        return '—';
    }
};

const fmtDay = (iso) => {
    const d = new Date(iso);
    return d.toLocaleDateString('pt-BR', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
    });
};

// Agrupa eventos por dia (YYYY-MM-DD)
const isSameLocalDay = (a, b) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

const toSections = (items) => {
    const map = new Map();

    for (const ev of items) {
        const d = new Date(ev.start);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
            d.getDate()
        ).padStart(2, '0')}`;
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(ev);
    }

    const today = new Date();

    return Array.from(map.entries())
        .sort((a, b) => new Date(a[0]) - new Date(b[0]))
        .map(([_, data]) => {
            const d0 = new Date(data[0].start);
            let title = fmtDay(data[0].start);
            if (isSameLocalDay(d0, today)) {
                title = `${title} • Hoje`;
            }
            return {
                title,
                data: data.sort((a, b) => new Date(a.start) - new Date(b.start)),
            };
        });
};

/* ---------- UI subcomponents ---------- */

function MiniEventRow({ item }) {
    const { title, start, end, status, local } = item;
    const color = STATUS_COLORS[status] || '#8E8E93';

    return (
        <Pressable
            onPress={async () => {
                await Haptics.selectionAsync();
                router.push({ pathname: '/(modals)/agenda-new', params: { id: String(item.id) } });
            }}
            android_ripple={{ color: '#ECEFF3' }}
            style={({ pressed }) => [
                styles.row,
                pressed && Platform.OS === 'ios' ? { backgroundColor: '#F7F8FA' } : null,
                { paddingLeft: 4, alignItems: 'center', marginVertical: 4 }
            ]}
        >
            {/* barra de status */}
            <View style={[styles.statusBar, { backgroundColor: color }]} />

            {/* conteúdo */}
            <View style={{ flex: 1, paddingHorizontal: 12, paddingVertical: 10 }}>
                <View style={styles.rowTop}>
                    <Text style={styles.rowTitle} numberOfLines={1}>
                        {title || 'Evento'}
                    </Text>
                    <Text style={styles.rowHour} numberOfLines={1}>
                        {fmtHour(start)} — {fmtHour(end)}
                    </Text>
                </View>

                {!!local && (
                    <Text style={styles.rowSub} numberOfLines={1}>
                        • {local}
                    </Text>
                )}
            </View>

            <Ionicons name="chevron-forward-sharp" size={18} color="#4B5563" style={{ marginRight: 2 }} />
        </Pressable>
    );
}

function UpcomingEventsList({ upcoming, subtle }) {
    const { height } = useWindowDimensions();
    const sections = toSections(upcoming);

    if (!upcoming?.length) {
        return (
            <View style={{ paddingVertical: 12 }}>
                <Text style={{ color: subtle }}>Sem eventos futuros. Que tal criar um agora?</Text>
            </View>
        );
    }

    return (
        <SectionList
            sections={sections}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => <MiniEventRow item={item} />}
            renderSectionHeader={({ section }) => (
                <View
                    style={{
                        backgroundColor: '#F3F4F6',
                        paddingVertical: 6,
                        paddingHorizontal: 6,
                        // borderRadius: 8,
                        // marginHorizontal: 4
                    }}
                >
                    <Text style={{ fontWeight: '700', color: '#374151' }}>{section.title}</Text>
                </View>
            )}
            ItemSeparatorComponent={() => <View style={{ height: 6 }} />}
            contentContainerStyle={{ paddingTop: 4, paddingBottom: 4 }}
            style={{ maxHeight: Math.min(height * 0.45, 360) }}
            stickySectionHeadersEnabled={false}
            showsVerticalScrollIndicator={true}
            indicatorStyle="black"                 // 🔹 iOS: 'white' ou 'black'
            persistentScrollbar={true}             // 🔹 Android: deixa barra sempre visível
        />
    );
}

/* ---------- Screen ---------- */

async function getVersionedPhotoURL(storage, path) {
    const storageRef = ref(storage, path);
    const [url, meta] = await Promise.all([
        getDownloadURL(storageRef),
        getMetadata(storageRef),
    ]);
    const version = meta?.generation || Date.now();
    return `${url}${url.includes("?") ? "&" : "?"}v=${version}`;
}

export default function Home() {
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();

    const tint = useThemeColor({}, 'tint');
    const bg = useThemeColor({}, 'background');
    const text = useThemeColor({}, 'text');
    const border = '#E5E7EB';
    const subtle = '#6B7280';

    const userName = useSelector(selectUserName);
    const photoURL = useSelector(selectUserPhoto);
    const eventos = useSelector(selectAllEventos);
    const [localAvatar, setLocalAvatar] = useState(null);


    useEffect(() => {
        navigation.setOptions({ headerShown: false });
    }, [navigation]);

    // sempre que o path mudar, busca a URL versionada
    useEffect(() => {
        let alive = true;
        (async () => {
            if (!photoURL) return setLocalAvatar(null);
            const res = await getCachedAvatar(storage, photoURL);
            if (!alive) return;
            setLocalAvatar(res.localUri);
        })();
        return () => { alive = false; };
    }, [photoURL]);


    // Próximos eventos (somente futuros)
    const upcoming = useMemo(() => {
        const now = new Date();
        return (eventos || [])
            .filter((e) => new Date(e.start) >= now)
            .sort((a, b) => new Date(a.start) - new Date(b.start))
            .slice(0, 12);
    }, [eventos]);

    return (
        <SafeAreaView style={[styles.safe, { backgroundColor: bg }]} edges={['top', 'left', 'right']}>
            <View style={[styles.container, { paddingBottom: 12 + insets.bottom }]}>
                {/* topo: saudação + engrenagem */}
                {/* topo: avatar + saudação + engrenagem */}
                <View style={styles.topBar}>
                    <View style={styles.topLeft}>
                        {photoURL ? (
                            <Image source={{ uri: photoURL }} style={styles.avatar} cachePolicy='memory-disk' />
                        ) : (
                            <View style={[styles.avatar, { backgroundColor: '#E5E7EB' }]}>
                                <Ionicons name="person" size={20} color="#9CA3AF" />
                            </View>
                        )}

                        <View>
                            <Text style={[styles.hello, { color: subtle }]}>Olá 👋</Text>
                            <Text style={[styles.userName, { color: text }]} numberOfLines={1}>
                                {userName}
                            </Text>
                        </View>
                    </View>

                    <Pressable
                        onPress={async () => {
                            await Haptics.selectionAsync();
                            router.push('/configuracoes');
                        }}
                        hitSlop={10}
                        accessibilityLabel="Configurações"
                        android_ripple={{ color: '#E5E7EB', borderless: true }}
                        style={styles.gearBtn}
                    >
                        <Ionicons name="settings-outline" size={22} color={tint} fontWeight={"bold"} />
                    </Pressable>
                </View>

                {/* atalhos (stories) */}
                <View style={styles.shortcuts}>
                    {/* Adicionar tutor */}
                    <Pressable
                        onPress={async () => {
                            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            router.push('/(modals)/pet-new');
                        }}
                        android_ripple={{ color: '#E5E7EB' }}
                        accessibilityRole="button"
                        accessibilityLabel="Adicionar tutor"
                        hitSlop={8}
                        style={({ pressed }) => [styles.storyItem, pressed && { opacity: 0.9, transform: [{ scale: 0.97 }] }]}
                    >
                        <View style={styles.storyCircle}>
                            <MaterialIcons name="pets" size={24} color={tint} />
                            <Ionicons
                                name="add-circle-sharp"
                                size={18}
                                color={tint}
                                style={{ position: 'absolute', right: 12, bottom: 12 }}
                            />
                        </View>
                        <Text style={styles.storyLabel}>Pet</Text>
                    </Pressable>

                    {/* Adicionar pet */}
                    <Pressable
                        onPress={async () => {
                            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            router.push('/(modals)/tutor-new');
                        }}
                        android_ripple={{ color: '#E5E7EB' }}
                        accessibilityRole="button"
                        accessibilityLabel="Adicionar tutor"
                        hitSlop={8}
                        style={({ pressed }) => [styles.storyItem, pressed && { opacity: 0.9, transform: [{ scale: 0.97 }] }]}
                    >
                        <View style={styles.storyCircle}>
                            <Ionicons name="person-sharp" size={26} color={tint} />
                            <Ionicons
                                name="add-circle-sharp"
                                size={18}
                                color={tint}
                                style={{ position: 'absolute', right: 12, bottom: 12 }}
                            />
                        </View>
                        <Text style={styles.storyLabel}>Tutor</Text>
                    </Pressable>
                    {/* Adicionar evento */}
                    <Pressable
                        onPress={async () => {
                            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            router.push('/(modals)/agenda-new');
                        }}
                        android_ripple={{ color: '#E5E7EB' }}
                        accessibilityRole="button"
                        accessibilityLabel="Adicionar evento"
                        hitSlop={8}
                        style={({ pressed }) => [styles.storyItem, pressed && { opacity: 0.9, transform: [{ scale: 0.97 }] }]}
                    >
                        <View style={styles.storyCircle}>
                            <Ionicons name="calendar-outline" size={26} color={tint} />
                            <Ionicons
                                name="add-circle-sharp"
                                size={18}
                                color={tint}
                                style={{ position: 'absolute', right: 12, bottom: 12 }}
                            />
                        </View>
                        <Text style={styles.storyLabel}>Evento</Text>
                    </Pressable>
                </View>

                {/* próximos eventos */}
                <View style={[styles.card, { borderColor: border }]}>
                    <View style={styles.cardHeader}>
                        <Text style={styles.cardTitle}>Próximos eventos</Text>
                        <Pressable
                            onPress={async () => {
                                await Haptics.selectionAsync();
                                router.push('/(phone)/agenda');
                            }}
                            hitSlop={8}
                            android_ripple={{ color: '#E5E7EB', borderless: true }}
                            style={{ paddingHorizontal: 6, paddingVertical: 2 }}
                        >
                            <Text style={{ color: tint, fontWeight: '700' }}>Ver tudo</Text>
                        </Pressable>
                    </View>

                    <UpcomingEventsList upcoming={upcoming} subtle={subtle} />
                </View>
            </View>
        </SafeAreaView>
    );
}

/* ---------- Styles ---------- */
const styles = StyleSheet.create({
    safe: { flex: 1 },
    container: { flex: 1, padding: 16, gap: 16 },

    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    hello: { fontSize: 13, fontWeight: '600' },
    userName: { fontSize: 22, fontWeight: '800', marginTop: 2 },
    gearBtn: {
        height: 36,
        width: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },

    shortcuts: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'flex-end',
        gap: 16,
    },
    storyItem: {
        width: 72,
        alignItems: 'center',
    },
    storyCircle: {
        width: 68,
        height: 68,
        borderRadius: 34,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        // iOS shadow
        shadowColor: '#000',
        shadowOpacity: 0.12,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 3 },
        // Android shadow
        elevation: 4,
        position: 'relative',
    },
    storyLabel: {
        marginTop: 6,
        fontSize: 12,
        fontWeight: '600',
        color: 'rgba(55,65,81,0.6)',
        textAlign: 'center',
    },

    card: {
        borderWidth: 1,
        borderRadius: 14,
        paddingVertical: 12,
        backgroundColor: '#FFF',
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 6,
        paddingHorizontal: 12
    },
    cardTitle: { fontSize: 16, fontWeight: '800' },

    // linha de evento (mini)
    row: {
        flexDirection: 'row',
        alignItems: 'stretch',
        backgroundColor: '#FFF',
        borderRadius: 10,
        overflow: 'hidden',
        borderWidth: Platform.OS === 'android' ? StyleSheet.hairlineWidth : 0,
        borderColor: '#F1F5F9',
    },
    statusBar: {
        width: 6,
        alignSelf: 'stretch',
        marginVertical: 2,
        borderTopLeftRadius: 6,
        borderBottomLeftRadius: 6,
    },
    rowTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        marginBottom: 2,
    },
    rowTitle: { fontWeight: '700', fontSize: 15, flex: 1 },
    rowHour: { color: '#6B7280' },
    rowSub: { color: '#6B7280' },
    topLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
});