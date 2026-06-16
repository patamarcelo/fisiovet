// src/components/financeiro/FinanceiroPendentesCard.jsx
// @ts-nocheck

import React, {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from 'react';

import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';

import {
    useDispatch,
    useSelector,
} from 'react-redux';

import {
    useFocusEffect,
    router,
} from 'expo-router';

import * as Haptics from 'expo-haptics';

import {
    Ionicons,
} from '@expo/vector-icons';

import {
    useThemeColor,
} from '@/hooks/useThemeColor';

import {
    loadLancamentos,
    selectAllLancamentos,
    selectFinanceiroStatus,
} from '@/src/store/slices/financeiroSlice';

import {
    selectAgendaState,
} from '@/src/store/slices/agendaSlice';

import {
    selectTutores,
} from '@/src/store/slices/tutoresSlice';

import {
    selectPetsState,
} from '@/src/store/slices/petsSlice';

import {
    FINANCEIRO_STATUS,
} from '@/src/features/financeiro/financeiro.constants';

/* =========================================================
   Constantes
========================================================= */

const COLORS = {
    card: '#FFFFFF',

    text: '#111827',
    subtle: '#6B7280',
    tertiary: '#9CA3AF',

    orange: '#F97316',
    orangeStrong: '#EA580C',
    orangeSoft: 'rgba(249,115,22,0.09)',

    green: '#16A34A',
    blue: '#0A84FF',
    red: '#EF4444',

    border: 'rgba(15,23,42,0.08)',
    pressed: 'rgba(249,115,22,0.07)',
};

const PENDING_FINANCIAL_STATUSES = [
    FINANCEIRO_STATUS.PENDENTE,
    FINANCEIRO_STATUS.PARCIAL,
    FINANCEIRO_STATUS.VENCIDO,
];

const currencyFormatterBR =
    new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2,
    });

/* =========================================================
   Helpers
========================================================= */

function formatCurrencyBRL(value) {
    const number = Number(value || 0);

    return currencyFormatterBR.format(
        Number.isFinite(number)
            ? number
            : 0
    );
}

function hiddenMoney() {
    return 'R$ •••••';
}

function safeDate(value) {
    if (!value) {
        return null;
    }

    const date = new Date(value);

    return Number.isNaN(date.getTime())
        ? null
        : date;
}

function formatDateFullBR(value) {
    const date = safeDate(value);

    if (!date) {
        return '—';
    }

    return date.toLocaleDateString(
        'pt-BR'
    );
}

function normalizeStatus(value) {
    return String(value || '')
        .trim()
        .toLowerCase();
}

function isEventoConfirmado(evento) {
    const status =
        normalizeStatus(
            evento?.status
        );

    return [
        'confirmado',
        'confirmada',
        'concluido',
        'concluida',
        'concluído',
        'concluída',
    ].includes(status);
}

function getStatusMeta(status) {
    if (
        status ===
        FINANCEIRO_STATUS.VENCIDO
    ) {
        return {
            label: 'Vencido',
            color: COLORS.red,
            background:
                'rgba(239,68,68,0.10)',
        };
    }

    if (
        status ===
        FINANCEIRO_STATUS.PARCIAL
    ) {
        return {
            label: 'Parcial',
            color: COLORS.blue,
            background:
                'rgba(10,132,255,0.10)',
        };
    }

    return {
        label: 'Pendente',
        color: COLORS.orangeStrong,
        background:
            COLORS.orangeSoft,
    };
}

/* =========================================================
   Linha
========================================================= */

const PendingRow = React.memo(
    function PendingRow({
        item,
        tutor,
        pets,
        textColor,
        subtleColor,
        showValues,
    }) {
        const statusMeta =
            getStatusMeta(
                item.status
            );

        const saldo =
            Number(
                item?.valores?.saldo || 0
            );

        const tutorNome =
            tutor?.nome ||
            tutor?.name ||
            'Sem tutor';

        const petsLabel =
            (pets || [])
                .map(
                    (pet) =>
                        pet?.nome ||
                        pet?.name
                )
                .filter(Boolean)
                .join(', ');

        const valueLabel =
            showValues
                ? formatCurrencyBRL(
                    saldo
                )
                : hiddenMoney();

        const openLancamento =
            useCallback(() => {
                if (!item?.id) {
                    return;
                }

                Haptics.selectionAsync().catch(
                    () => { }
                );

                router.push({
                    pathname:
                        '/(home-modals)/financeiro/[id]',

                    params: {
                        id: String(
                            item.id
                        ),
                    },
                });
            }, [item?.id]);

        return (
            <Pressable
                onPress={
                    openLancamento
                }
                android_ripple={{
                    color:
                        COLORS.pressed,
                }}
                style={({
                    pressed,
                }) => [
                        styles.row,
                        pressed &&
                        styles.rowPressed,
                    ]}
            >
                <View
                    style={[
                        styles.rowStripe,
                        {
                            backgroundColor:
                                statusMeta.color,
                        },
                    ]}
                />

                <View
                    style={
                        styles.rowContent
                    }
                >
                    <View
                        style={
                            styles.rowTitleLine
                        }
                    >
                        <Text
                            style={[
                                styles.rowTitle,
                                {
                                    color:
                                        textColor,
                                },
                            ]}
                            numberOfLines={1}
                        >
                            {item.descricao ||
                                'Lançamento'}
                        </Text>

                        <Text
                            style={[
                                styles.rowValue,
                                {
                                    color:
                                        statusMeta.color,
                                },
                            ]}
                            numberOfLines={1}
                        >
                            {valueLabel}
                        </Text>
                    </View>

                    <View
                        style={
                            styles.rowInfoLine
                        }
                    >
                        <Text
                            style={[
                                styles.rowMeta,
                                {
                                    color:
                                        subtleColor,
                                },
                            ]}
                            numberOfLines={1}
                        >
                            {tutorNome}
                            {petsLabel
                                ? ` · ${petsLabel}`
                                : ''}
                        </Text>

                        <View
                            style={[
                                styles.statusBadge,
                                {
                                    backgroundColor:
                                        statusMeta.background,
                                },
                            ]}
                        >
                            <Text
                                style={[
                                    styles.statusBadgeText,
                                    {
                                        color:
                                            statusMeta.color,
                                    },
                                ]}
                            >
                                {statusMeta.label}
                            </Text>
                        </View>
                    </View>

                    <View
                        style={
                            styles.rowDateLine
                        }
                    >
                        <Ionicons
                            name="calendar-outline"
                            size={12}
                            color={
                                subtleColor
                            }
                        />

                        <Text
                            style={[
                                styles.rowDate,
                                {
                                    color:
                                        subtleColor,
                                },
                            ]}
                        >
                            {formatDateFullBR(
                                item.vencimento ||
                                item.competencia
                            )}
                        </Text>

                        {item?.origem
                            ?.tipo ===
                            'evento' && (
                                <>
                                    <View
                                        style={
                                            styles.metaDot
                                        }
                                    />

                                    <Text
                                        style={[
                                            styles.originText,
                                            {
                                                color:
                                                    subtleColor,
                                            },
                                        ]}
                                    >
                                        Evento
                                    </Text>
                                </>
                            )}
                    </View>
                </View>

                <View
                    style={
                        styles.arrowContainer
                    }
                >
                    <Ionicons
                        name="chevron-forward"
                        size={17}
                        color={
                            subtleColor
                        }
                    />
                </View>
            </Pressable>
        );
    }
);

/* =========================================================
   Card principal
========================================================= */

export default function FinanceiroPendentesCard({
    cardelevation,
    showValues = false,
    onToggleValues,
}) {
    const dispatch = useDispatch();

    const lancamentos =
        useSelector(
            selectAllLancamentos
        ) || [];

    const financeiroStatus =
        useSelector(
            selectFinanceiroStatus
        );

    const agendaState =
        useSelector(
            selectAgendaState
        );

    const tutores =
        useSelector(
            selectTutores
        ) || [];

    const petsState =
        useSelector(
            selectPetsState
        );

    const text =
        useThemeColor(
            {},
            'text'
        );

    const textIcon =
        useThemeColor(
            {},
            'textIcon'
        );

    const tint =
        useThemeColor(
            {},
            'tint'
        );

    const bgCard =
        useThemeColor(
            {
                light: '#FFFFFF',
                dark: '#111827',
            },
            'card'
        );

    const [
        refreshing,
        setRefreshing,
    ] = useState(false);

    const eventosById =
        agendaState?.byId || {};

    const petsById =
        petsState?.byId || {};

    const tutoresById =
        useMemo(() => {
            return tutores.reduce(
                (
                    accumulator,
                    tutor
                ) => {
                    if (
                        tutor?.id != null
                    ) {
                        accumulator[
                            String(
                                tutor.id
                            )
                        ] = tutor;
                    }

                    return accumulator;
                },
                {}
            );
        }, [tutores]);

    const loadData =
        useCallback(async () => {
            try {
                setRefreshing(true);

                await dispatch(
                    loadLancamentos()
                ).unwrap();
            } catch (error) {
                console.warn(
                    'Erro ao carregar pendências financeiras:',
                    error
                );
            } finally {
                setRefreshing(false);
            }
        }, [dispatch]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [loadData])
    );

    const {
        pendentesOrdenados,
        totalAReceber,
        totalCount,
        extrasCount,
    } = useMemo(() => {
        const filtered =
            lancamentos.filter(
                (lancamento) => {
                    if (
                        !PENDING_FINANCIAL_STATUSES.includes(
                            lancamento.status
                        )
                    ) {
                        return false;
                    }

                    const saldo =
                        Number(
                            lancamento
                                ?.valores
                                ?.saldo || 0
                        );

                    if (saldo <= 0) {
                        return false;
                    }

                    const isEvento =
                        lancamento?.origem
                            ?.tipo ===
                        'evento';

                    if (!isEvento) {
                        return true;
                    }

                    const eventoId =
                        lancamento?.origem
                            ?.eventoId;

                    const evento =
                        eventoId
                            ? eventosById[
                            String(
                                eventoId
                            )
                            ]
                            : null;

                    /*
                     * Eventos pendentes ou cancelados na agenda
                     * não entram no card de valores efetivos.
                     * Eles continuam disponíveis no filtro
                     * "Previstos" da tela Financeiro.
                     */
                    return isEventoConfirmado(
                        evento
                    );
                }
            );

        filtered.sort(
            (a, b) => {
                const dateA =
                    safeDate(
                        a.vencimento ||
                        a.competencia
                    )?.getTime() || 0;

                const dateB =
                    safeDate(
                        b.vencimento ||
                        b.competencia
                    )?.getTime() || 0;

                return dateA - dateB;
            }
        );

        const total =
            filtered.reduce(
                (
                    accumulator,
                    lancamento
                ) =>
                    accumulator +
                    Number(
                        lancamento
                            ?.valores
                            ?.saldo || 0
                    ),
                0
            );

        const maxHome = 5;
        const count =
            filtered.length;

        return {
            pendentesOrdenados:
                filtered.slice(
                    0,
                    maxHome
                ),

            totalAReceber:
                total,

            totalCount:
                count,

            extrasCount:
                Math.max(
                    0,
                    count - maxHome
                ),
        };
    }, [
        lancamentos,
        eventosById,
    ]);

    const temPendentes =
        pendentesOrdenados.length >
        0;

    const loading =
        lancamentos.length === 0 &&
        (
            refreshing ||
            financeiroStatus ===
            'loading'
        );

    const totalLabel =
        showValues
            ? formatCurrencyBRL(
                totalAReceber
            )
            : hiddenMoney();

    const handleOpenFinanceiro =
        useCallback(() => {
            Haptics.selectionAsync().catch(
                () => { }
            );

            router.push(
                '/(phone)/financeiro'
            );
        }, []);

    const handleToggleValues =
        useCallback(() => {
            Haptics.selectionAsync().catch(
                () => { }
            );

            onToggleValues?.();
        }, [onToggleValues]);

    return (
        <View
            style={[
                styles.card,
                cardelevation,
                {
                    borderColor:
                        COLORS.border,

                    backgroundColor:
                        bgCard ||
                        COLORS.card,
                },
            ]}
        >
            <View
                style={
                    styles.cardHeader
                }
            >
                <View
                    style={
                        styles.titleGroup
                    }
                >
                    <View
                        style={[
                            styles.titleIcon,
                            {
                                backgroundColor:
                                    `whitesmoke`,
                            },
                        ]}
                    >
                        <Ionicons
                            name="wallet-outline"
                            size={18}
                            color={tint}
                        />
                    </View>

                    <View
                        style={{
                            flex: 1,
                            minWidth: 0,
                        }}
                    >
                        <Text
                            style={[
                                styles.cardTitle,
                                {
                                    color: text,
                                },
                            ]}
                            numberOfLines={1}
                        >
                            Financeiro
                        </Text>

                        <Text
                            style={[
                                styles.cardSubtitle,
                                {
                                    color:
                                        textIcon,
                                },
                            ]}
                            numberOfLines={1}
                        >
                            Valores confirmados a receber
                        </Text>
                    </View>
                </View>

                <View
                    style={
                        styles.headerActions
                    }
                >
                    <Pressable
                        onPress={
                            handleToggleValues
                        }
                        hitSlop={8}
                        accessibilityRole="button"
                        accessibilityLabel={
                            showValues
                                ? 'Ocultar valores'
                                : 'Mostrar valores'
                        }
                        style={({
                            pressed,
                        }) => [
                                styles.monkeyButton,
                                pressed && {
                                    opacity: 0.65,
                                },
                            ]}
                    >
                        <Text
                            style={
                                styles.monkeyIcon
                            }
                        >
                            {showValues
                                ? '🙈'
                                : '👁'}
                        </Text>
                    </Pressable>

                    <Pressable
                        onPress={
                            handleOpenFinanceiro
                        }
                        hitSlop={8}
                        style={({
                            pressed,
                        }) => [
                                styles.openButton,
                                pressed && {
                                    opacity: 0.68,
                                },
                            ]}
                    >
                        <Text
                            style={[
                                styles.openButtonText,
                                {
                                    color: tint,
                                },
                            ]}
                        >
                            Ver tudo
                        </Text>

                        <Ionicons
                            name="chevron-forward"
                            size={14}
                            color={tint}
                        />
                    </Pressable>
                </View>
            </View>

            <View
                style={
                    styles.totalLine
                }
            >
                <View>
                    <Text
                        style={[
                            styles.totalLabel,
                            {
                                color:
                                    textIcon,
                            },
                        ]}
                    >
                        Total a receber
                    </Text>

                    <Text
                        style={
                            styles.totalValue
                        }
                    >
                        {totalLabel}
                    </Text>
                </View>

                {loading ? (
                    <View
                        style={
                            styles.loadingBadge
                        }
                    >
                        <ActivityIndicator
                            size="small"
                            color={
                                COLORS.orangeStrong
                            }
                        />
                    </View>
                ) : temPendentes ? (
                    <View
                        style={
                            styles.countBadge
                        }
                    >
                        <Text
                            style={
                                styles.countBadgeText
                            }
                        >
                            {totalCount}{' '}
                            {totalCount === 1
                                ? 'pendência'
                                : 'pendências'}
                        </Text>
                    </View>
                ) : null}
            </View>

            {loading ? (
                <View
                    style={
                        styles.emptyBox
                    }
                >
                    <ActivityIndicator
                        color={
                            COLORS.orange
                        }
                    />

                    <Text
                        style={[
                            styles.emptyText,
                            {
                                color:
                                    textIcon,
                            },
                        ]}
                    >
                        Carregando pendências…
                    </Text>
                </View>
            ) : temPendentes ? (
                <>
                    <View
                        style={
                            styles.list
                        }
                    >
                        {pendentesOrdenados.map(
                            (lancamento) => {
                                const tutor =
                                    lancamento.tutorId
                                        ? tutoresById[
                                        String(
                                            lancamento.tutorId
                                        )
                                        ] ||
                                        null
                                        : null;

                                const pets =
                                    (
                                        lancamento.petIds ||
                                        []
                                    )
                                        .map(
                                            (
                                                petId
                                            ) =>
                                                petsById[
                                                String(
                                                    petId
                                                )
                                                ]
                                        )
                                        .filter(
                                            Boolean
                                        );

                                return (
                                    <PendingRow
                                        key={String(
                                            lancamento.id
                                        )}
                                        item={
                                            lancamento
                                        }
                                        tutor={
                                            tutor
                                        }
                                        pets={
                                            pets
                                        }
                                        textColor={
                                            text
                                        }
                                        subtleColor={
                                            textIcon
                                        }
                                        showValues={
                                            showValues
                                        }
                                    />
                                );
                            }
                        )}
                    </View>

                    {extrasCount > 0 && (
                        <Pressable
                            onPress={
                                handleOpenFinanceiro
                            }
                            style={({
                                pressed,
                            }) => [
                                    styles.extraButton,
                                    pressed && {
                                        opacity: 0.7,
                                    },
                                ]}
                        >
                            <Text
                                style={
                                    styles.extraHint
                                }
                            >
                                +{extrasCount}{' '}
                                {extrasCount === 1
                                    ? 'lançamento'
                                    : 'lançamentos'}
                            </Text>

                            <Ionicons
                                name="arrow-forward"
                                size={14}
                                color={
                                    COLORS.orangeStrong
                                }
                            />
                        </Pressable>
                    )}
                </>
            ) : (
                <View
                    style={
                        styles.emptyBox
                    }
                >
                    <View
                        style={
                            styles.emptyIcon
                        }
                    >
                        <Ionicons
                            name="checkmark"
                            size={21}
                            color={
                                COLORS.green
                            }
                        />
                    </View>

                    <Text
                        style={[
                            styles.emptyText,
                            {
                                color: text,
                            },
                        ]}
                    >
                        Nenhuma pendência financeira
                    </Text>

                    <Text
                        style={[
                            styles.emptySub,
                            {
                                color:
                                    textIcon,
                            },
                        ]}
                    >
                        Lançamentos confirmados com saldo em aberto aparecerão aqui.
                    </Text>
                </View>
            )}
        </View>
    );
}

/* =========================================================
   Styles
========================================================= */

const styles = StyleSheet.create({
    card: {
        borderWidth:
            StyleSheet.hairlineWidth,
        borderRadius: 18,
        paddingVertical: 12,
        paddingHorizontal: 12,
        marginTop: 8,
        overflow: 'hidden',
    },

    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent:
            'space-between',
        gap: 10,
    },

    titleGroup: {
        flex: 1,
        minWidth: 0,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 9,
    },

    titleIcon: {
        width: 34,
        height: 34,
        borderRadius: 11,
        alignItems: 'center',
        justifyContent: 'center',
    },

    cardTitle: {
        fontSize: 15,
        lineHeight: 18,
        fontWeight: '800',
        letterSpacing: -0.2,
    },

    cardSubtitle: {
        marginTop: 2,
        fontSize: 10.5,
        lineHeight: 14,
        fontWeight: '500',
    },

    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },

    monkeyButton: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor:
            'rgba(118,118,128,0.09)',
    },

    monkeyIcon: {
        fontSize: 18,
        lineHeight: 22,
    },

    openButton: {
        minHeight: 34,
        paddingHorizontal: 5,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 1,
    },

    openButtonText: {
        fontSize: 11.5,
        fontWeight: '750',
    },

    totalLine: {
        minHeight: 62,
        marginTop: 10,
        paddingHorizontal: 11,
        paddingVertical: 9,
        borderRadius: 14,
        backgroundColor:
            COLORS.orangeSoft,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent:
            'space-between',
        gap: 10,
    },

    totalLabel: {
        fontSize: 10.5,
        fontWeight: '650',
    },

    totalValue: {
        marginTop: 3,
        color: COLORS.orangeStrong,
        fontSize: 20,
        lineHeight: 24,
        fontWeight: '850',
        fontVariant: [
            'tabular-nums',
        ],
    },

    countBadge: {
        paddingHorizontal: 9,
        paddingVertical: 5,
        borderRadius: 999,
        backgroundColor:
            'rgba(249,115,22,0.11)',
    },

    countBadgeText: {
        color: COLORS.orangeStrong,
        fontSize: 10.5,
        fontWeight: '800',
    },

    loadingBadge: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor:
            'rgba(249,115,22,0.10)',
    },

    list: {
        marginTop: 9,
        gap: 7,
    },

    row: {
        minHeight: 68,
        borderRadius: 13,
        borderWidth:
            StyleSheet.hairlineWidth,
        borderColor: COLORS.border,
        backgroundColor: '#FFFFFF',
        overflow: 'hidden',
        flexDirection: 'row',
        alignItems: 'stretch',
    },

    rowPressed: {
        backgroundColor:
            COLORS.pressed,
    },

    rowStripe: {
        width: 3,
    },

    rowContent: {
        flex: 1,
        minWidth: 0,
        paddingHorizontal: 10,
        paddingVertical: 8,
        justifyContent: 'center',
    },

    rowTitleLine: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 8,
    },

    rowTitle: {
        flex: 1,
        minWidth: 0,
        fontSize: 13.5,
        lineHeight: 17,
        fontWeight: '750',
    },

    rowValue: {
        flexShrink: 0,
        maxWidth: 110,
        fontSize: 12.5,
        lineHeight: 16,
        fontWeight: '850',
        fontVariant: [
            'tabular-nums',
        ],
    },

    rowInfoLine: {
        marginTop: 4,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },

    rowMeta: {
        flex: 1,
        minWidth: 0,
        fontSize: 10.5,
        lineHeight: 14,
        fontWeight: '500',
    },

    statusBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 999,
    },

    statusBadgeText: {
        fontSize: 9,
        lineHeight: 12,
        fontWeight: '800',
    },

    rowDateLine: {
        marginTop: 4,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },

    rowDate: {
        fontSize: 10,
        lineHeight: 13,
        fontWeight: '550',
    },

    metaDot: {
        width: 3,
        height: 3,
        borderRadius: 2,
        marginHorizontal: 2,
        backgroundColor:
            COLORS.tertiary,
    },

    originText: {
        fontSize: 10,
        lineHeight: 13,
        fontWeight: '600',
    },

    arrowContainer: {
        width: 30,
        alignItems: 'center',
        justifyContent: 'center',
    },

    emptyBox: {
        marginTop: 10,
        paddingVertical: 15,
        paddingHorizontal: 10,
        alignItems: 'center',
        gap: 5,
    },

    emptyIcon: {
        width: 42,
        height: 42,
        borderRadius: 21,
        marginBottom: 2,
        backgroundColor:
            'rgba(22,163,74,0.10)',
        alignItems: 'center',
        justifyContent: 'center',
    },

    emptyText: {
        fontSize: 13,
        lineHeight: 17,
        fontWeight: '700',
        textAlign: 'center',
    },

    emptySub: {
        maxWidth: 280,
        fontSize: 10.5,
        lineHeight: 15,
        textAlign: 'center',
    },

    extraButton: {
        minHeight: 31,
        marginTop: 7,
        paddingHorizontal: 4,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 4,
    },

    extraHint: {
        color: COLORS.orangeStrong,
        fontSize: 10.5,
        fontWeight: '750',
    },
});