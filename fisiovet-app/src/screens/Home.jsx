// src/screens/Home.jsx
// @ts-nocheck
import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import {
    View,
    Text,
    Pressable,
    StyleSheet,
    Platform,
    SectionList,
    useWindowDimensions,
    ScrollView,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, router, useFocusEffect } from 'expo-router';
import { useDispatch, useSelector, useStore } from 'react-redux';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColor } from '@/hooks/useThemeColor';

import { loadAgenda, selectAllEventos } from '@/src/store/slices/agendaSlice';
import { loadSyncQueue } from '@/src/store/slices/syncQueueSlice';
import { selectUserName, selectUserPhoto } from '@/src/store/slices/userSlice';
import { selectTutores } from '@/src/store/slices/tutoresSlice';
import { selectPetsState } from '@/src/store/slices/petsSlice';

import { Image } from 'expo-image';
import { storage } from '@/src/services/firebaseClient';
import { getCachedAvatar } from '../utils/avatarCache';

import FinanceiroPendentesCard from '@/components/financeiro/FinanceiroPendentesCard';
import { BlurView } from 'expo-blur';

import { updateSystem } from '@/src/store/slices/systemSlice';
import { processSyncQueue } from "@/src/services/syncProcessor";

/* ---------- Consts & helpers ---------- */

const STATUS_COLORS = {
    confirmado: '#16A34A',
    pendente: '#F59E0B',
    cancelado: '#EF4444',
};

const CARD_ELEVATION = {
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
};

const fmtHour = (iso) => {
    try {
        const d = new Date(iso);
        return d.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
        });
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

const isSameLocalDay = (a, b) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

const toSections = (items) => {
    const map = new Map();

    for (const ev of items || []) {
        const d = new Date(ev.start);

        if (Number.isNaN(d.getTime())) continue;

        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
            2,
            '0'
        )}-${String(d.getDate()).padStart(2, '0')}`;

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

function countPetsFromState(petsState) {
    const itemsCount = Array.isArray(petsState?.items) ? petsState.items.length : 0;
    const byIdCount = petsState?.byId ? Object.keys(petsState.byId).length : 0;

    return Math.max(itemsCount, byIdCount);
}

/* ---------- UI subcomponents ---------- */

function MiniEventRow({ item }) {
    const { title, start, end, status, local } = item;
    const color = STATUS_COLORS[status] || '#8E8E93';

    return (
        <Pressable
            onPress={() => {
                Haptics.selectionAsync().catch(() => { });
                router.push({
                    pathname: '/(modals)/agenda-new',
                    params: { id: String(item.id) },
                });
            }}
            android_ripple={{ color: '#ECEFF3' }}
            style={({ pressed }) => [
                styles.row,
                pressed && Platform.OS === 'ios'
                    ? { backgroundColor: '#F7F8FA' }
                    : null,
                {
                    paddingLeft: 4,
                    alignItems: 'center',
                    marginVertical: 4,
                },
            ]}
        >
            <View style={[styles.statusBar, { backgroundColor: color }]} />

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

            <Ionicons
                name="chevron-forward-sharp"
                size={18}
                color="#4B5563"
                style={{ marginRight: 2 }}
            />
        </Pressable>
    );
}

function UpcomingEventsList({
    upcoming,
    tint,
    hasTutor,
    hasPet,
    canCreateEvent,
}) {
    const sections = useMemo(() => toSections(upcoming), [upcoming]);

    if (!upcoming?.length) {
        const emptySubtitle = !hasTutor
            ? 'Cadastre um tutor para depois adicionar pets e eventos.'
            : !hasPet
                ? 'Cadastre um pet para liberar a criação de eventos.'
                : 'Toque abaixo para agendar um novo atendimento';

        return (
            <View style={styles.emptyEventsBox}>
                <Ionicons name="calendar-outline" size={42} color="#A1A1AA" />

                <Text style={styles.emptyEventsTitle}>
                    Nenhum evento futuro encontrado
                </Text>

                <Text style={styles.emptyEventsSub}>
                    {emptySubtitle}
                </Text>

                {canCreateEvent && (
                    <Pressable
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(
                                () => { }
                            );

                            router.push({
                                pathname: '/(modals)/agenda-new',
                                params: {
                                    tutorId: '',
                                    tutorNome: '',
                                    preselectPetId: '',
                                    petNome: '',
                                },
                            });
                        }}
                        style={({ pressed }) => [
                            styles.emptyEventsButton,
                            { backgroundColor: tint },
                            pressed && { opacity: 0.85 },
                        ]}
                    >
                        <Text style={styles.emptyEventsButtonText}>+ Adicionar evento</Text>
                    </Pressable>
                )}
            </View>
        );
    }

    return (
        <View style={styles.eventsInlineList}>
            {sections.map((section) => (
                <View key={section.title} style={styles.eventsSection}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionHeaderText}>{section.title}</Text>
                    </View>

                    {section.data.map((item) => (
                        <View key={String(item.id)} style={{ marginBottom: 6 }}>
                            <MiniEventRow item={item} />
                        </View>
                    ))}
                </View>
            ))}
        </View>
    );
}

/* ---------- Screen ---------- */

export default function Home() {
    const navigation = useNavigation();
    const dispatch = useDispatch();
    const insets = useSafeAreaInsets();
    const scrollRef = useRef(null);
    const store = useStore();

    const tint = useThemeColor({}, 'tint');
    const colorIcon = useThemeColor({}, 'colorIcon');
    const bg = useThemeColor({}, 'background');
    const text = useThemeColor({}, 'text');
    const textIcon = useThemeColor({}, 'textIcon');

    const border = '#E5E7EB';
    const subtle = '#6B7280';

    const userName = useSelector(selectUserName);
    const photoURL = useSelector(selectUserPhoto);
    const eventos = useSelector(selectAllEventos);
    const tutores = useSelector(selectTutores);
    const petsState = useSelector(selectPetsState);

    const [localAvatar, setLocalAvatar] = useState(null);

    const showFinanceValues = useSelector(
        (s) => s.system?.financeiro?.showValues ?? false
    );

    const tutoresCount = tutores?.length || 0;

    const petsCount = useMemo(() => countPetsFromState(petsState), [petsState]);

    const hasTutor = tutoresCount > 0;
    const hasPet = petsCount > 0;

    const canCreatePet = hasTutor;
    const canCreateEvent = hasTutor && hasPet;

    useEffect(() => {
        navigation.setOptions({ headerShown: false });
    }, [navigation]);

    // Garante carga inicial da agenda/financeiro ao abrir a Home.
    // O financeiro pendente deriva dos eventos.
    useEffect(() => {
        let alive = true;

        async function boot() {
            try {
                await dispatch(loadAgenda()).unwrap();
                await dispatch(loadSyncQueue()).unwrap();

                if (!alive) return;

                await processSyncQueue(dispatch, store.getState);
            } catch (err) {
                console.log("Boot Home ignorou sync inicial:", err?.message);
            }
        }

        boot();

        return () => {
            alive = false;
        };
    }, [dispatch, store]);

    useFocusEffect(
        useCallback(() => {
            requestAnimationFrame(() => {
                scrollRef.current?.scrollTo?.({
                    y: 0,
                    animated: false,
                });
            });
        }, [])
    );

    useEffect(() => {
        let alive = true;

        (async () => {
            if (!photoURL) {
                setLocalAvatar(null);
                return;
            }

            try {
                const res = await getCachedAvatar(storage, photoURL);

                if (!alive) return;

                setLocalAvatar(res?.localUri || photoURL);
            } catch {
                if (!alive) return;

                setLocalAvatar(photoURL);
            }
        })();

        return () => {
            alive = false;
        };
    }, [photoURL]);

    const upcoming = useMemo(() => {
        const now = new Date();

        return (eventos || [])
            .filter((e) => {
                const start = new Date(e.start);
                return !Number.isNaN(start.getTime()) && start >= now;
            })
            .sort((a, b) => new Date(a.start) - new Date(b.start))
            .slice(0, 12);
    }, [eventos]);

    const avatarUri = localAvatar || photoURL;

    return (
        <SafeAreaView style={[styles.safe, { backgroundColor: bg }]} edges={['left', 'right']}>
            <View style={{ flex: 1 }}>
                <BlurView
                    intensity={10}
                    tint="light"
                    style={[
                        styles.headerContainer,
                        {
                            paddingTop: insets.top + 16,
                            paddingHorizontal: 16,
                        },
                    ]}
                >
                    <View style={styles.topBar}>
                        <View style={styles.topLeft}>
                            {avatarUri ? (
                                <View style={[styles.avatarWrapper, CARD_ELEVATION]}>
                                    <Image
                                        source={{ uri: avatarUri }}
                                        style={styles.avatar}
                                        cachePolicy="memory-disk"
                                    />
                                </View>
                            ) : (
                                <View style={[styles.avatarWrapper, CARD_ELEVATION]}>
                                    <View style={styles.avatarFallback}>
                                        <Ionicons name="person" size={20} color="#9CA3AF" />
                                    </View>
                                </View>
                            )}

                            <View style={styles.nameBox}>
                                <Text style={[styles.hello, { color: text }]}>Olá 👋</Text>

                                <Text
                                    style={[styles.userName, { color: text }]}
                                    numberOfLines={1}
                                    ellipsizeMode="tail"
                                >
                                    {userName || 'Usuário'}
                                </Text>
                            </View>
                        </View>

                        <Pressable
                            onPress={() => {
                                Haptics.selectionAsync().catch(() => { });
                                router.push('/configuracoes');
                            }}
                            hitSlop={10}
                            accessibilityLabel="Configurações"
                            android_ripple={{ color: '#E5E7EB', borderless: true }}
                            style={styles.gearBtn}
                        >
                            <Ionicons
                                name="settings-outline"
                                size={22}
                                color={colorIcon}
                            />
                        </Pressable>
                    </View>
                </BlurView>

                <ScrollView
                    ref={scrollRef}
                    style={styles.scrollArea}
                    contentContainerStyle={{
                        paddingHorizontal: 16,
                        paddingBottom: 12 + insets.bottom + 50,
                        paddingTop: 26,
                        marginTop: 100,
                        gap: 16,
                    }}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.shortcuts}>
                        {canCreatePet && (
                            <Pressable
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(
                                        () => { }
                                    );
                                    router.push('/(modals)/pet-new');
                                }}
                                android_ripple={{ color: '#E5E7EB' }}
                                accessibilityRole="button"
                                accessibilityLabel="Adicionar pet"
                                hitSlop={8}
                                style={({ pressed }) => [
                                    styles.storyItem,
                                    CARD_ELEVATION,
                                    pressed && {
                                        opacity: 0.9,
                                        transform: [{ scale: 0.97 }],
                                    },
                                ]}
                            >
                                <View style={styles.storyCircle}>
                                    <MaterialIcons name="pets" size={24} color={tint} />
                                    <Ionicons
                                        name="add-circle-sharp"
                                        size={18}
                                        color={tint}
                                        style={styles.storyAddIcon}
                                    />
                                </View>
                                <Text style={[styles.storyLabel, { color: textIcon }]}>Pet</Text>
                            </Pressable>
                        )}

                        <Pressable
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(
                                    () => { }
                                );
                                router.push('/(modals)/tutor-new');
                            }}
                            android_ripple={{ color: '#E5E7EB' }}
                            accessibilityRole="button"
                            accessibilityLabel="Adicionar tutor"
                            hitSlop={8}
                            style={({ pressed }) => [
                                styles.storyItem,
                                CARD_ELEVATION,
                                pressed && {
                                    opacity: 0.9,
                                    transform: [{ scale: 0.97 }],
                                },
                            ]}
                        >
                            <View style={styles.storyCircle}>
                                <Ionicons name="person-sharp" size={26} color={tint} />
                                <Ionicons
                                    name="add-circle-sharp"
                                    size={18}
                                    color={tint}
                                    style={styles.storyAddIcon}
                                />
                            </View>
                            <Text style={[styles.storyLabel, { color: textIcon }]}>Tutor</Text>
                        </Pressable>

                        {canCreateEvent && (
                            <Pressable
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(
                                        () => { }
                                    );
                                    router.push('/(modals)/agenda-new');
                                }}
                                android_ripple={{ color: '#E5E7EB' }}
                                accessibilityRole="button"
                                accessibilityLabel="Adicionar evento"
                                hitSlop={8}
                                style={({ pressed }) => [
                                    styles.storyItem,
                                    CARD_ELEVATION,
                                    pressed && {
                                        opacity: 0.9,
                                        transform: [{ scale: 0.97 }],
                                    },
                                ]}
                            >
                                <View style={styles.storyCircle}>
                                    <Ionicons name="calendar-outline" size={26} color={tint} />
                                    <Ionicons
                                        name="add-circle-sharp"
                                        size={18}
                                        color={tint}
                                        style={styles.storyAddIcon}
                                    />
                                </View>
                                <Text style={[styles.storyLabel, { color: textIcon }]}>Evento</Text>
                            </Pressable>
                        )}
                    </View>

                    <View style={[styles.card, CARD_ELEVATION, { borderColor: border }]}>
                        <View style={styles.cardHeader}>
                            <Text style={styles.cardTitle}>Próximos eventos</Text>

                            <Pressable
                                onPress={() => {
                                    Haptics.selectionAsync().catch(() => { });
                                    router.push('/(phone)/agenda');
                                }}
                                hitSlop={8}
                                android_ripple={{
                                    color: '#E5E7EB',
                                    borderless: true,
                                }}
                                style={styles.headerLinkButton}
                            >
                                <Text style={{ color: tint, fontWeight: '700' }}>
                                    Ver tudo
                                </Text>
                            </Pressable>
                        </View>

                        <UpcomingEventsList
                            upcoming={upcoming}
                            subtle={subtle}
                            tint={tint}
                            hasTutor={hasTutor}
                            hasPet={hasPet}
                            canCreateEvent={canCreateEvent}
                        />
                    </View>

                    <FinanceiroPendentesCard
                        cardelevation={CARD_ELEVATION}
                        showValues={showFinanceValues}
                        onToggleValues={() =>
                            dispatch(
                                updateSystem({
                                    financeiro: {
                                        showValues: !showFinanceValues,
                                    },
                                })
                            )
                        }
                    />
                </ScrollView>
            </View>
        </SafeAreaView>
    );
}

/* ---------- Styles ---------- */
const styles = StyleSheet.create({
    safe: {
        flex: 1,
    },

    headerContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
    },

    scrollArea: {
        flex: 1,
    },

    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },

    topLeft: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        minWidth: 0,
    },

    nameBox: {
        flex: 1,
        minWidth: 0,
    },

    hello: {
        fontSize: 13,
        fontWeight: '600',
    },

    userName: {
        fontSize: 22,
        fontWeight: '800',
        marginTop: 2,
    },

    gearBtn: {
        height: 36,
        width: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 10,
    },

    avatarWrapper: {
        width: 60,
        height: 60,
        borderRadius: 40,
        backgroundColor: '#FFF',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.12,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 3 },
        elevation: 4,
    },

    avatar: {
        width: 54,
        height: 54,
        borderRadius: 40,
        overflow: 'hidden',
    },

    avatarFallback: {
        width: 54,
        height: 54,
        borderRadius: 40,
        backgroundColor: '#E5E7EB',
        alignItems: 'center',
        justifyContent: 'center',
    },

    shortcuts: {
        marginTop: 16,
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'flex-end',
        gap: 16,
        minHeight: 94,
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
        shadowColor: '#000',
        shadowOpacity: 0.12,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 3 },
        elevation: 4,
        position: 'relative',
    },

    storyAddIcon: {
        position: 'absolute',
        right: 12,
        bottom: 12,
    },

    storyLabel: {
        marginTop: 6,
        fontSize: 12,
        fontWeight: '600',
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
        paddingHorizontal: 12,
    },

    cardTitle: {
        fontSize: 16,
        fontWeight: '800',
    },

    headerLinkButton: {
        paddingHorizontal: 6,
        paddingVertical: 2,
    },

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

    rowTitle: {
        fontWeight: '700',
        fontSize: 15,
        flex: 1,
    },

    rowHour: {
        color: '#6B7280',
    },

    rowSub: {
        color: '#6B7280',
    },

    sectionHeader: {
        backgroundColor: '#F3F4F6',
        paddingVertical: 6,
        paddingHorizontal: 6,
    },

    sectionHeaderText: {
        fontWeight: '700',
        color: '#374151',
    },

    emptyEventsBox: {
        marginVertical: 12,
        marginHorizontal: 10,
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        backgroundColor: '#F9FAFB',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },

    emptyEventsTitle: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
        fontWeight: '600',
    },

    emptyEventsSub: {
        fontSize: 12,
        color: '#9CA3AF',
        textAlign: 'center',
        marginBottom: 4,
        lineHeight: 17,
    },

    emptyEventsButton: {
        borderRadius: 8,
        paddingHorizontal: 20,
        paddingVertical: 10,
    },

    emptyEventsButtonText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 14,
        textAlign: 'center',
    },
    eventsInlineList: {
        paddingTop: 4,
        paddingBottom: 4,
    },

    eventsSection: {
        marginBottom: 8,
    },
});