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
    ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, router, useFocusEffect } from 'expo-router';
import {
    useScrollToTop,
} from '@react-navigation/native';

import { useDispatch, useSelector, useStore } from 'react-redux';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColor } from '@/hooks/useThemeColor';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';

import { loadAgenda, selectAllEventos } from '@/src/store/slices/agendaSlice';
import { loadSyncQueue } from '@/src/store/slices/syncQueueSlice';
import { selectUserName, selectUserPhoto } from '@/src/store/slices/userSlice';
import { selectTutores } from '@/src/store/slices/tutoresSlice';
import { selectPetsState } from '@/src/store/slices/petsSlice';
import { storage } from '@/src/services/firebaseClient';
import { getCachedAvatar } from '../utils/avatarCache';
import FinanceiroPendentesCard from '@/components/financeiro/FinanceiroPendentesCard';
import {
    updateSystem,
    selectNavPreference,
    selectWhatsappConfirmationMessage,
} from '@/src/store/slices/systemSlice';
import { processSyncQueue } from '@/src/services/syncProcessor';

import MiniEventRow from '@/components/agenda/MiniEventRow';

import AsyncStorage from '@react-native-async-storage/async-storage';

/* ---------- Assets ---------- */
const FINANCE_PENDING_FILTER_KEY =
    '@fisiovet:financeiro:includePendingEvents';

const HOME_LOGO = require('../../assets/images/splash-fisiovet.png');

/* ---------- Visual tokens ---------- */

const PAGE_BG = '#F4F8F3';
const CARD_BORDER = '#E5E7EB';
const ACTION_COLOR = '#8DC4A1';

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

const SOFT_ELEVATION = {
    elevation: 4,
    shadowColor: '#0F172A',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
};

/* ---------- Helpers ---------- */

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
        weekday: 'long',
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

        if (!map.has(key)) {
            map.set(key, []);
        }

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
    const itemsCount = Array.isArray(petsState?.items)
        ? petsState.items.length
        : 0;

    const byIdCount = petsState?.byId
        ? Object.keys(petsState.byId).length
        : 0;

    return Math.max(itemsCount, byIdCount);
}

/* ---------- Background ---------- */

function HomeBackgroundArt({ topInset = 0 }) {
    return (
        <View pointerEvents="none" style={styles.bgArt}>
            <LinearGradient
                colors={['#F4F8F3', '#EEF5EF', '#F8FAF7']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.bgBase}
            />

            <LinearGradient
                colors={[
                    'rgba(141, 196, 161, 0.32)',
                    'rgba(157, 218, 208, 0.20)',
                    'rgba(238, 245, 239, 0.50)',
                    'rgba(255, 255, 255, 0)',
                ]}
                locations={[0, 0.34, 0.68, 1]}
                start={{ x: 0.15, y: 0 }}
                end={{ x: 0.85, y: 1 }}
                style={[
                    styles.bgSingleWave,
                    {
                        top: -topInset - 28,
                        height: topInset + 520,
                    },
                ]}
            />
        </View>
    );
}

/* ---------- UI subcomponents ---------- */

function ShortcutButton({
    label,
    icon,
    onPress,
    accessibilityLabel,
    textIcon,
    showAddBadge = true,
}) {
    return (
        <Pressable
            onPress={() => {
                Haptics.impactAsync(
                    Haptics.ImpactFeedbackStyle.Medium
                ).catch(() => { });

                onPress?.();
            }}
            android_ripple={{
                color: '#E5E7EB',
                borderless: true,
            }}
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel}
            hitSlop={6}
            style={({ pressed }) => [
                styles.storyItem,
                pressed && {
                    opacity: 0.9,
                    transform: [{ scale: 0.96 }],
                },
            ]}
        >
            <View style={[styles.storyCircle, SOFT_ELEVATION]}>
                {icon}

                {showAddBadge && (
                    <View style={styles.storyAddBadge}>
                        <Ionicons
                            name="add"
                            size={13}
                            color={ACTION_COLOR}
                        />
                    </View>
                )}
            </View>

            <Text
                style={[styles.storyLabel, { color: textIcon }]}
                numberOfLines={1}
            >
                {label}
            </Text>
        </Pressable>
    );
}



function UpcomingEventsList({
    upcoming,
    tint,
    hasTutor,
    hasPet,
    canCreateEvent,
    tutoresById,
    petsById,
    navPreference,
    showFinanceValues,
    whatsappConfirmationMessage,
}) {
    const sections = useMemo(
        () => toSections(upcoming),
        [upcoming]
    );

    if (!upcoming?.length) {
        const emptySubtitle = !hasTutor
            ? 'Cadastre um tutor para depois adicionar pets e eventos.'
            : !hasPet
                ? 'Cadastre um pet para liberar a criação de eventos.'
                : 'Sua agenda não possui atendimentos próximos neste período.';

        return (
            <View style={styles.emptyEventsBox}>
                <Ionicons
                    name="calendar-outline"
                    size={42}
                    color="#A1A1AA"
                />

                <Text style={styles.emptyEventsTitle}>
                    Nenhum evento nos próximos 7 dias
                </Text>

                <Text style={styles.emptyEventsSub}>
                    {emptySubtitle}
                </Text>

                {canCreateEvent && (
                    <Pressable
                        onPress={() => {
                            Haptics.impactAsync(
                                Haptics.ImpactFeedbackStyle.Medium
                            ).catch(() => { });

                            router.push({
                                pathname: '/(home-modals)/agenda-new',
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
                            {
                                backgroundColor: tint,
                            },
                            pressed && {
                                opacity: 0.85,
                            },
                        ]}
                    >
                        <Text style={styles.emptyEventsButtonText}>
                            + Adicionar evento
                        </Text>
                    </Pressable>
                )}
            </View>
        );
    }

    return (
        <View style={styles.eventsInlineList}>
            {sections.map((section, sectionIndex) => {
                const isLastSection =
                    sectionIndex === sections.length - 1;

                return (
                    <View
                        key={section.title}
                        style={[
                            styles.eventsSection,
                            isLastSection &&
                            styles.eventsSectionLast,
                        ]}
                    >
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionHeaderText}>
                                {section.title}
                            </Text>
                        </View>

                        <View style={styles.sectionEvents}>
                            {section.data.map((item, index) => {
                                const isLast =
                                    index ===
                                    section.data.length - 1;

                                const eventPetId =
                                    item?.petId != null
                                        ? String(
                                            item.petId
                                        )
                                        : Array.isArray(
                                            item?.petIds
                                        ) &&
                                            item.petIds.length > 0
                                            ? String(
                                                item.petIds[0]
                                            )
                                            : null;

                                const eventPet =
                                    eventPetId
                                        ? petsById[
                                        eventPetId
                                        ] || null
                                        : null;

                                return (
                                    <MiniEventRow
                                        key={String(item.id)}
                                        item={item}
                                        tutor={
                                            tutoresById[
                                            String(
                                                item?.tutorId ||
                                                ""
                                            )
                                            ] || null
                                        }
                                        pet={eventPet}
                                        navPreference={
                                            navPreference
                                        }
                                        showFinanceValues={
                                            showFinanceValues
                                        }
                                        whatsappConfirmationMessage={
                                            whatsappConfirmationMessage
                                        }
                                        isLast={isLast}
                                    />
                                );
                            })}
                        </View>
                    </View>
                );
            })}
        </View>
    );
}

/* ---------- Screen ---------- */

export default function Home() {
    const navigation = useNavigation();
    const dispatch = useDispatch();
    const insets = useSafeAreaInsets();
    const scrollRef = useRef(null);

    useScrollToTop(scrollRef);

    const store = useStore();

    const tint = useThemeColor({}, 'tint');
    const text = useThemeColor({}, 'text');
    const textIcon = useThemeColor({}, 'textIcon');

    const userName = useSelector(selectUserName);
    const photoURL = useSelector(selectUserPhoto);
    const eventos = useSelector(selectAllEventos);
    const tutores = useSelector(selectTutores);
    const petsState = useSelector(selectPetsState);

    const pets =
        useMemo(() => {
            if (
                Array.isArray(
                    petsState?.items
                )
            ) {
                return petsState.items;
            }

            if (
                petsState?.byId &&
                typeof petsState.byId ===
                "object"
            ) {
                return Object.values(
                    petsState.byId
                );
            }

            return [];
        }, [
            petsState,
        ]);

    const petsById =
        useMemo(() => {
            return pets.reduce(
                (
                    accumulator,
                    pet
                ) => {
                    if (
                        pet?.id != null
                    ) {
                        accumulator[
                            String(pet.id)
                        ] = pet;
                    }

                    return accumulator;
                },
                {}
            );
        }, [
            pets,
        ]);

    const navPreference = useSelector(
        selectNavPreference
    );

    const tutoresById = useMemo(() => {
        return (tutores || []).reduce(
            (acc, tutor) => {
                if (tutor?.id != null) {
                    acc[String(tutor.id)] =
                        tutor;
                }

                return acc;
            },
            {}
        );
    }, [tutores]);

    const [localAvatar, setLocalAvatar] = useState(null);

    const showFinanceValues = useSelector(
        (state) => state.system?.financeiro?.showValues ?? false
    );

    const includePendingFinanceEvents =
        useSelector(
            (state) =>
                state.system
                    ?.financeiro
                    ?.includePendingEvents ??
                true
        );

    const [
        financeFilterHydrated,
        setFinanceFilterHydrated,
    ] = useState(false);

    const tutoresCount = tutores?.length || 0;

    const petsCount = useMemo(
        () => countPetsFromState(petsState),
        [petsState]
    );

    const hasTutor = tutoresCount > 0;
    const hasPet = petsCount > 0;

    const canCreatePet = hasTutor;
    const canCreateEvent = hasTutor && hasPet;

    const whatsappConfirmationMessage =
        useSelector(
            selectWhatsappConfirmationMessage
        );

    useEffect(() => {
        navigation.setOptions({
            headerShown: false,
        });
    }, [navigation]);

    useEffect(() => {
        let alive = true;

        async function loadFinanceFilterPreference() {
            try {
                const savedValue =
                    await AsyncStorage.getItem(
                        FINANCE_PENDING_FILTER_KEY
                    );

                if (!alive) {
                    return;
                }

                if (savedValue !== null) {
                    const includePending =
                        savedValue === 'true';

                    dispatch(
                        updateSystem({
                            financeiro: {
                                includePendingEvents:
                                    includePending,
                            },
                        })
                    );
                }
            } catch (error) {
                console.warn(
                    'Erro ao carregar filtro financeiro:',
                    error
                );
            } finally {
                if (alive) {
                    setFinanceFilterHydrated(
                        true
                    );
                }
            }
        }

        loadFinanceFilterPreference();

        return () => {
            alive = false;
        };
    }, [dispatch]);

    useEffect(() => {
        let alive = true;

        async function boot() {
            try {
                await dispatch(loadAgenda()).unwrap();
                await dispatch(loadSyncQueue()).unwrap();

                if (!alive) return;

                await processSyncQueue(
                    dispatch,
                    store.getState
                );
            } catch (err) {
                console.log(
                    'Boot Home ignorou sync inicial:',
                    err?.message
                );
            }
        }

        boot();

        return () => {
            alive = false;
        };
    }, [dispatch, store]);


    useEffect(() => {
        let currentNavigation =
            navigation;

        const subscriptions = [];

        /*
         * A Home pode estar dentro de um Stack que, por sua vez,
         * está dentro do navegador de tabs.
         *
         * Registramos o tabPress em todos os pais; somente o
         * navegador de tabs emitirá esse evento.
         */
        while (currentNavigation) {
            const unsubscribe =
                currentNavigation.addListener?.(
                    'tabPress',
                    () => {
                        /*
                         * Só sobe quando a Home já está selecionada.
                         * Ao entrar nela vindo de outra tab, mantém
                         * o comportamento normal.
                         */
                        if (
                            !navigation.isFocused()
                        ) {
                            return;
                        }

                        Haptics.selectionAsync().catch(
                            () => { }
                        );

                        requestAnimationFrame(
                            () => {
                                scrollRef.current?.scrollTo?.({
                                    y: 0,
                                    animated: true,
                                });
                            }
                        );
                    }
                );

            if (
                typeof unsubscribe ===
                'function'
            ) {
                subscriptions.push(
                    unsubscribe
                );
            }

            currentNavigation =
                currentNavigation.getParent?.();
        }

        return () => {
            subscriptions.forEach(
                (unsubscribe) =>
                    unsubscribe()
            );
        };
    }, [navigation]);

    // useFocusEffect(
    //     useCallback(() => {
    //         requestAnimationFrame(() => {
    //             scrollRef.current?.scrollTo?.({
    //                 y: 0,
    //                 animated: false,
    //             });
    //         });
    //     }, [])
    // );

    useEffect(() => {
        let alive = true;

        (async () => {
            if (!photoURL) {
                setLocalAvatar(null);
                return;
            }

            try {
                const result = await getCachedAvatar(
                    storage,
                    photoURL
                );

                if (!alive) return;

                setLocalAvatar(
                    result?.localUri || photoURL
                );
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

        /*
         * Janela de 7 dias:
         * hoje + próximos 6 dias.
         */
        const endDate = new Date(now);

        endDate.setDate(
            endDate.getDate() + 6
        );

        endDate.setHours(
            23,
            59,
            59,
            999
        );

        return (eventos || [])
            .filter((event) => {
                const start = new Date(
                    event?.start
                );

                if (
                    Number.isNaN(
                        start.getTime()
                    )
                ) {
                    return false;
                }

                return (
                    start >= now &&
                    start <= endDate
                );
            })
            .sort((a, b) => {
                return (
                    new Date(a.start).getTime() -
                    new Date(b.start).getTime()
                );
            })
            .slice(0, 10);
    }, [eventos]);

    const avatarUri = localAvatar || photoURL;

    const handleTogglePendingFinanceEvents =
        useCallback(async () => {
            const nextValue =
                !includePendingFinanceEvents;

            Haptics.selectionAsync().catch(
                () => { }
            );

            /*
             * Atualiza imediatamente a interface.
             */
            dispatch(
                updateSystem({
                    financeiro: {
                        includePendingEvents:
                            nextValue,
                    },
                })
            );

            /*
             * Persiste a preferência para
             * as próximas aberturas do app.
             */
            try {
                await AsyncStorage.setItem(
                    FINANCE_PENDING_FILTER_KEY,
                    String(nextValue)
                );
            } catch (error) {
                console.warn(
                    'Erro ao salvar filtro financeiro:',
                    error
                );
            }
        }, [
            dispatch,
            includePendingFinanceEvents,
        ]);

    return (
        <SafeAreaView
            style={styles.safe}
            edges={['left', 'right']}
        >
            <StatusBar
                style="dark"
                translucent
                backgroundColor="transparent"
            />

            <View style={styles.root}>
                <HomeBackgroundArt topInset={insets.top} />

                <BlurView
                    intensity={8}
                    tint="light"
                    style={[
                        styles.headerContainer,
                        {
                            paddingTop: insets.top + 16,
                            paddingHorizontal: 18,
                        },
                    ]}
                >
                    <View style={styles.topBar}>
                        <View style={styles.topLeft}>
                            {avatarUri ? (
                                <View
                                    style={[
                                        styles.avatarWrapper,
                                        CARD_ELEVATION,
                                    ]}
                                >
                                    <Image
                                        source={{ uri: avatarUri }}
                                        style={styles.avatar}
                                        cachePolicy="memory-disk"
                                    />
                                </View>
                            ) : (
                                <View
                                    style={[
                                        styles.avatarWrapper,
                                        CARD_ELEVATION,
                                    ]}
                                >
                                    <View style={styles.avatarFallback}>
                                        <Ionicons
                                            name="person"
                                            size={20}
                                            color="#9CA3AF"
                                        />
                                    </View>
                                </View>
                            )}

                            <View style={styles.nameBox}>
                                <Text
                                    style={[
                                        styles.hello,
                                        {
                                            color: text,
                                        },
                                    ]}
                                >
                                    Olá 👋
                                </Text>

                                <Text
                                    style={[
                                        styles.userName,
                                        {
                                            color: text,
                                        },
                                    ]}
                                    numberOfLines={1}
                                    ellipsizeMode="tail"
                                >
                                    {userName || 'Usuário'}
                                </Text>
                            </View>
                        </View>

                        <View
                            pointerEvents="none"
                            style={styles.headerLogoBox}
                        >
                            <Image
                                source={HOME_LOGO}
                                style={styles.headerLogo}
                                contentFit="contain"
                            />
                        </View>
                    </View>
                </BlurView>

                <ScrollView
                    ref={scrollRef}
                    style={styles.scrollArea}
                    contentContainerStyle={[
                        styles.scrollContent,
                        {
                            paddingBottom:
                                12 + insets.bottom + 50,
                        },
                    ]}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.shortcutsArea}>
                        <View style={styles.shortcutsGroup}>
                            <ShortcutButton
                                label="Ajustes"
                                accessibilityLabel="Abrir configurações"
                                textIcon={textIcon}
                                showAddBadge={false}
                                onPress={() => router.push('/configuracoes')}
                                icon={
                                    <MaterialIcons
                                        name="settings"
                                        size={27}
                                        color={"grey"}
                                    />
                                }
                            />

                            {canCreatePet && (
                                <ShortcutButton
                                    label="Pet"
                                    accessibilityLabel="Adicionar pet"
                                    textIcon={textIcon}
                                    onPress={() => router.push('/(home-modals)/pet-new')}
                                    icon={
                                        <MaterialIcons
                                            name="pets"
                                            size={25}
                                            color={ACTION_COLOR}
                                        />
                                    }
                                />
                            )}

                            <ShortcutButton
                                label="Tutor"
                                accessibilityLabel="Adicionar tutor"
                                textIcon={textIcon}
                                onPress={() => router.push('/(home-modals)/tutor-new')}
                                icon={
                                    <Ionicons
                                        name="person-sharp"
                                        size={26}
                                        color={ACTION_COLOR}
                                    />
                                }
                            />

                            {canCreateEvent && (
                                <ShortcutButton
                                    label="Evento"
                                    accessibilityLabel="Adicionar evento"
                                    textIcon={textIcon}
                                    onPress={() => router.push('/(home-modals)/agenda-new')}
                                    icon={
                                        <Ionicons
                                            name="calendar-outline"
                                            size={26}
                                            color={ACTION_COLOR}
                                        />
                                    }
                                />
                            )}
                        </View>
                    </View>

                    <View
                        style={[
                            styles.card,
                            styles.eventsCard,
                            CARD_ELEVATION,
                            {
                                borderColor: CARD_BORDER,
                            },
                        ]}
                    >
                        <View style={styles.cardHeader}>
                            <Text style={styles.cardTitle}>
                                Próximos eventos
                            </Text>

                            <Pressable
                                onPress={() => {
                                    Haptics.selectionAsync().catch(
                                        () => { }
                                    );

                                    router.push('/(phone)/agenda');
                                }}
                                hitSlop={8}
                                android_ripple={{
                                    color: '#E5E7EB',
                                    borderless: true,
                                }}
                                style={({ pressed }) => [
                                    styles.headerLinkButton,
                                    pressed && {
                                        opacity: 0.72,
                                    },
                                ]}
                            >
                                <Text
                                    style={{
                                        color: tint,
                                        fontWeight: '700',
                                    }}
                                >
                                    Ver tudo
                                </Text>
                            </Pressable>
                        </View>

                        <UpcomingEventsList
                            upcoming={upcoming}
                            tint={tint}
                            hasTutor={hasTutor}
                            hasPet={hasPet}
                            canCreateEvent={canCreateEvent}
                            tutoresById={tutoresById}
                            navPreference={navPreference}
                            showFinanceValues={showFinanceValues}
                            whatsappConfirmationMessage={
                                whatsappConfirmationMessage
                            }
                            petsById={petsById}
                        />
                    </View>

                    <FinanceiroPendentesCard
                        cardelevation={
                            CARD_ELEVATION
                        }
                        showValues={
                            showFinanceValues
                        }
                        onToggleValues={() =>
                            dispatch(
                                updateSystem({
                                    financeiro: {
                                        showValues:
                                            !showFinanceValues,
                                    },
                                })
                            )
                        }
                        includePendingEvents={
                            includePendingFinanceEvents
                        }
                        pendingFilterHydrated={
                            financeFilterHydrated
                        }
                        onTogglePendingEvents={
                            handleTogglePendingFinanceEvents
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
        backgroundColor: PAGE_BG,
    },

    root: {
        flex: 1,
        position: 'relative',
        backgroundColor: PAGE_BG,
        overflow: 'hidden',
    },

    bgArt: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 0,
        backgroundColor: PAGE_BG,
        overflow: 'hidden',
    },

    bgBase: {
        ...StyleSheet.absoluteFillObject,
    },

    bgSingleWave: {
        position: 'absolute',
        left: -90,
        right: -70,
        borderTopLeftRadius: 0,
        borderTopRightRadius: 0,
        borderBottomLeftRadius: 260,
        borderBottomRightRadius: 190,
        transform: [{ scaleX: 1.08 }],
    },

    headerContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        paddingBottom: 8,
        backgroundColor: 'transparent',
    },

    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        minHeight: 60,
    },

    topLeft: {
        flex: 1,
        minWidth: 0,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingRight: 8,
    },

    nameBox: {
        flex: 1,
        minWidth: 0,
    },

    hello: {
        fontSize: 13,
        fontWeight: '600',
        letterSpacing: -0.1,
    },

    userName: {
        marginTop: 2,
        fontSize: 22,
        fontWeight: '800',
        letterSpacing: -0.4,
    },

    headerLogoBox: {
        width: 102,
        height: 68,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 8,
        marginRight: -6,
    },

    headerLogo: {
        width: 90,
        height: 110,
    },

    avatarWrapper: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#FFF',
        alignItems: 'center',
        justifyContent: 'center',
    },

    avatar: {
        width: 54,
        height: 54,
        borderRadius: 27,
        overflow: 'hidden',
    },

    avatarFallback: {
        width: 54,
        height: 54,
        borderRadius: 27,
        backgroundColor: '#E5E7EB',
        alignItems: 'center',
        justifyContent: 'center',
    },

    scrollArea: {
        flex: 1,
        zIndex: 1,
        backgroundColor: 'transparent',
    },

    scrollContent: {
        paddingHorizontal: 16,
        paddingTop: 26,
        marginTop: 100,
        gap: 10,
    },

    shortcutsArea: {
        marginTop: 32,
        minHeight: 96,
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'flex-end',
    },



    storyItem: {
        width: 72,
        alignItems: 'center',
    },

    storyCircle: {
        width: 66,
        height: 66,
        borderRadius: 33,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: 'rgba(141, 196, 161, 0.30)',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        position: 'relative',
    },

    storyAddBadge: {
        position: 'absolute',
        right: 9,
        bottom: 9,
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(141, 196, 161, 0.38)',
        shadowColor: '#0F172A',
        shadowOpacity: 0.08,
        shadowRadius: 4,
        shadowOffset: {
            width: 0,
            height: 2,
        },
        elevation: 2,
    },
    shortcutsGroup: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'flex-end',
        gap: 14,
    },

    eventsCard: {
        marginTop: -4,
    },

    storyLabel: {
        marginTop: 7,
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: -0.1,
        textAlign: 'center',
    },
    card: {
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: 18,
        backgroundColor: '#FFFFFF',
        overflow: 'hidden',
    },

    cardHeader: {
        minHeight: 48,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 14,
        paddingTop: 10,
        paddingBottom: 8,
    },

    cardTitle: {
        fontSize: 16,
        fontWeight: '800',
        letterSpacing: -0.2,
    },

    headerLinkButton: {
        paddingHorizontal: 6,
        paddingVertical: 2,
    },

    row: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        borderRadius: 12,
        overflow: 'hidden',
        marginVertical: 4,
        marginHorizontal: 4,
        paddingLeft: 4,
        borderWidth:
            Platform.OS === 'android'
                ? StyleSheet.hairlineWidth
                : 0,
        borderColor: '#F1F5F9',
    },

    rowContent: {
        flex: 1,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },

    rowChevron: {
        marginRight: 2,
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
        flex: 1,
        fontWeight: '700',
        fontSize: 15,
        color: '#111827',
    },

    rowHour: {
        color: '#6B7280',
        fontSize: 13,
    },

    rowSub: {
        color: '#6B7280',
        fontSize: 13,
    },



    emptyEventsBox: {
        marginVertical: 12,
        marginHorizontal: 10,
        padding: 16,
        borderRadius: 14,
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
        marginBottom: 4,
        fontSize: 12,
        lineHeight: 17,
        color: '#9CA3AF',
        textAlign: 'center',
    },

    emptyEventsButton: {
        borderRadius: 10,
        paddingHorizontal: 20,
        paddingVertical: 10,
    },

    emptyEventsButtonText: {
        color: '#FFF',
        fontWeight: '700',
        fontSize: 14,
        textAlign: 'center',
    },

    eventsInlineList: {
        paddingTop: 2,
        paddingBottom: 0,
    },

    eventsSection: {
        marginBottom: 0,
    },

    eventsSectionLast: {
        marginBottom: 0,
    },

    sectionHeader: {
        width: '100%',
        minHeight: 34,
        paddingHorizontal: 14,
        paddingVertical: 8,
        justifyContent: 'center',
        backgroundColor: '#F2F2F7',
    },

    sectionHeaderText: {
        color: '#6B7280',
        fontSize: 12,
        lineHeight: 16,
        fontWeight: '700',
        letterSpacing: 0.2,
        textTransform: 'uppercase',
    },

    sectionEvents: {
        width: '100%',
        backgroundColor: '#FFFFFF',
    },


});