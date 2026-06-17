// src/components/agenda/MiniEventRow.jsx
// @ts-nocheck

import React, {
    useCallback,
    useMemo,
    useRef,
    useState,
} from "react";

import {
    ActionSheetIOS,
    Alert,
    Animated,
    Linking,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";

import {
    router,
} from "expo-router";

import {
    Ionicons,
} from "@expo/vector-icons";

import * as Haptics from "expo-haptics";

import {
    useDispatch,
    useSelector,
} from "react-redux";

import {
    Swipeable,
} from "react-native-gesture-handler";

import {
    deleteEvento,
    selectEventoById,
    updateEvento,
} from "@/src/store/slices/agendaSlice";

/* -------------------------------------------------------------------------- */
/*                                   Tokens                                   */
/* -------------------------------------------------------------------------- */

const COLORS = {
    card: "#FFFFFF",

    text: "#111827",
    secondaryText: "#6B7280",
    tertiaryText: "#9CA3AF",

    separator: "rgba(60,60,67,0.12)",
    pressed: "rgba(118,118,128,0.08)",

    primary: "#6FAE86",
    primaryStrong: "#578F6D",
    primarySoft: "rgba(111,174,134,0.12)",

    disabledBackground:
        "rgba(118,118,128,0.07)",

    disabledText:
        "rgba(60,60,67,0.30)",

    confirmed: "#16A34A",
    pending: "#F59E0B",
    cancelled: "#EF4444",
    neutral: "#8E8E93",
};

const STATUS_CONFIG = {
    confirmado: {
        color: COLORS.confirmed,
        label: "Confirmado",
        icon: "checkmark-circle",
    },

    pendente: {
        color: COLORS.pending,
        label: "Pendente",
        icon: "time",
    },

    cancelado: {
        color: COLORS.cancelled,
        label: "Cancelado",
        icon: "close-circle",
    },

    default: {
        color: COLORS.neutral,
        label: "Evento",
        icon: "ellipse",
    },
};

/* -------------------------------------------------------------------------- */
/*                                   Helpers                                  */
/* -------------------------------------------------------------------------- */

function normalizeCoordinate(value) {
    const number =
        Number(value);

    return Number.isFinite(number)
        ? number
        : null;
}

function formatHour(value) {
    if (!value) {
        return "—";
    }

    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return "—";
    }

    return date.toLocaleTimeString(
        "pt-BR",
        {
            hour: "2-digit",
            minute: "2-digit",
        }
    );
}

function formatTimeRange(
    start,
    end
) {
    const startText =
        formatHour(start);

    const endText =
        formatHour(end);

    if (
        startText === "—" &&
        endText === "—"
    ) {
        return "Horário não informado";
    }

    if (endText === "—") {
        return startText;
    }

    return `${startText} – ${endText}`;
}

async function canOpenUrl(url) {
    try {
        return await Linking.canOpenURL(
            url
        );
    } catch {
        return false;
    }
}

async function openUrl(
    url,
    fallbackUrl
) {
    try {
        const supported =
            await canOpenUrl(url);

        if (supported) {
            await Linking.openURL(
                url
            );

            return;
        }

        if (fallbackUrl) {
            await Linking.openURL(
                fallbackUrl
            );

            return;
        }

        throw new Error(
            "Aplicativo de navegação não disponível."
        );
    } catch (error) {
        Alert.alert(
            "Navegação",
            error?.message ||
            "Não foi possível abrir o aplicativo de mapas."
        );
    }
}

const currencyFormatterBR =
    new Intl.NumberFormat(
        "pt-BR",
        {
            style: "currency",
            currency: "BRL",
            minimumFractionDigits: 2,
        }
    );

function formatCurrency(value) {
    const number =
        Number(value || 0);

    return currencyFormatterBR.format(
        Number.isFinite(number)
            ? number
            : 0
    );
}

function getNavigationUrls({
    lat,
    lng,
    label,
}) {
    const coordinates =
        `${lat},${lng}`;

    const encodedLabel =
        encodeURIComponent(
            label || "Destino"
        );

    return {
        appleMaps:
            `http://maps.apple.com/?daddr=${coordinates}` +
            `&q=${encodedLabel}`,

        googleMapsIOS:
            `comgooglemaps://?daddr=${coordinates}` +
            `&directionsmode=driving` +
            `&q=${encodedLabel}`,

        googleMapsAndroid:
            `google.navigation:q=${coordinates}` +
            `&mode=d`,

        googleMapsBrowser:
            `https://www.google.com/maps/dir/?api=1` +
            `&destination=${coordinates}` +
            `&travelmode=driving`,

        waze:
            `waze://?ll=${coordinates}` +
            `&navigate=yes`,

        wazeBrowser:
            `https://www.waze.com/ul?ll=${coordinates}` +
            `&navigate=yes`,
    };
}

/* -------------------------------------------------------------------------- */
/*                               Swipe actions                                */
/* -------------------------------------------------------------------------- */

function SwipeAction({
    label,
    icon,
    color,
    onPress,
    last = false,
    disabled = false,
}) {
    const scale =
        useRef(
            new Animated.Value(1)
        ).current;

    const animateTo =
        useCallback(
            (value) => {
                Animated.spring(
                    scale,
                    {
                        toValue: value,
                        useNativeDriver: true,
                        speed: 20,
                        bounciness: 6,
                    }
                ).start();
            },
            [scale]
        );

    const handlePress =
        useCallback(async () => {
            if (disabled) {
                return;
            }

            try {
                await Haptics.impactAsync(
                    Haptics
                        .ImpactFeedbackStyle
                        .Light
                );
            } catch { }

            onPress?.();
        }, [
            disabled,
            onPress,
        ]);

    return (
        <Animated.View
            style={[
                styles.swipeActionWrap,

                last &&
                styles.swipeActionWrapLast,

                {
                    transform: [
                        {
                            scale,
                        },
                    ],
                },
            ]}
        >
            <Pressable
                disabled={disabled}
                onPressIn={() =>
                    animateTo(0.96)
                }
                onPressOut={() =>
                    animateTo(1)
                }
                onPress={
                    handlePress
                }
                android_ripple={{
                    color:
                        "rgba(255,255,255,0.20)",
                }}
                style={({
                    pressed,
                }) => [
                        styles.swipeAction,

                        {
                            backgroundColor:
                                color,
                        },

                        pressed &&
                            Platform.OS === "ios"
                            ? {
                                opacity: 0.82,
                            }
                            : null,

                        disabled && {
                            opacity: 0.7,
                        },
                    ]}
            >
                {!!icon && (
                    <Ionicons
                        name={icon}
                        size={21}
                        color="#FFFFFF"
                    />
                )}

                <Text
                    style={
                        styles.swipeActionText
                    }
                >
                    {label}
                </Text>
            </Pressable>
        </Animated.View>
    );
}

/* -------------------------------------------------------------------------- */
/*                              Action components                             */
/* -------------------------------------------------------------------------- */

function SecondaryAction({
    icon,
    textIcon,
    label,
    onPress,
    disabled = false,
    compact = false,
    value = false,
}) {
    return (
        <Pressable
            disabled={disabled}
            onPress={() => {
                if (disabled) {
                    return;
                }

                Haptics.selectionAsync()
                    .catch(() => { });

                onPress?.();
            }}
            accessibilityRole="button"
            accessibilityLabel={
                label
            }
            accessibilityState={{
                disabled,
            }}
            hitSlop={4}
            style={({
                pressed,
            }) => [
                    styles.secondaryAction,

                    compact &&
                    styles.secondaryActionCompact,

                    value &&
                    styles.secondaryActionValue,

                    pressed &&
                    !disabled &&
                    styles.secondaryActionPressed,
                ]}
        >
            {textIcon ? (
                <Text
                    style={[
                        styles.secondaryActionEmoji,

                        disabled &&
                        styles.secondaryActionEmojiDisabled,
                    ]}
                >
                    {textIcon}
                </Text>
            ) : (
                <Ionicons
                    name={icon}
                    size={18}
                    color={
                        disabled
                            ? COLORS.disabledText
                            : value
                                ? COLORS.primaryStrong
                                : COLORS.secondaryText
                    }
                />
            )}

            {!!label && (
                <Text
                    numberOfLines={1}
                    style={[
                        styles.secondaryActionText,

                        value &&
                        styles.secondaryActionValueText,

                        disabled &&
                        styles.secondaryActionTextDisabled,
                    ]}
                >
                    {label}
                </Text>
            )}
        </Pressable>
    );
}

function PrimaryRouteAction({
    onPress,
    disabled = false,
}) {
    return (
        <Pressable
            disabled={disabled}
            onPress={() => {
                if (disabled) {
                    return;
                }

                Haptics.impactAsync(
                    Haptics
                        .ImpactFeedbackStyle
                        .Light
                ).catch(() => { });

                onPress?.();
            }}
            accessibilityRole="button"
            accessibilityLabel={
                disabled
                    ? "Rota indisponível"
                    : "Abrir rota para o evento"
            }
            accessibilityState={{
                disabled,
            }}
            style={({
                pressed,
            }) => [
                    styles.primaryAction,

                    disabled &&
                    styles.primaryActionDisabled,

                    pressed &&
                    !disabled &&
                    styles.primaryActionPressed,
                ]}
        >
            <Ionicons
                name="navigate"
                size={17}
                color={
                    disabled
                        ? COLORS.disabledText
                        : "#FFFFFF"
                }
            />

            <Text
                style={[
                    styles.primaryActionText,

                    disabled &&
                    styles.primaryActionTextDisabled,
                ]}
            >
                Ir
            </Text>
        </Pressable>
    );
}

/* -------------------------------------------------------------------------- */
/*                                  Component                                 */
/* -------------------------------------------------------------------------- */

export default function MiniEventRow({
    item,
    tutor,
    navPreference = "ask",
    showFinanceValues = false,
    isLast = false,
}) {
    const dispatch =
        useDispatch();

    const swipeRef =
        useRef(null);

    const [
        pendingStatus,
        setPendingStatus,
    ] = useState(false);

    const [
        pendingDelete,
        setPendingDelete,
    ] = useState(false);

    const isPendingAction =
        pendingStatus ||
        pendingDelete;

    const eventId =
        item?.id != null
            ? String(item.id)
            : null;

    const eventoAtual =
        useSelector((state) =>
            eventId
                ? selectEventoById(
                    eventId
                )(state)
                : null
        );

    /*
     * Usa primeiro o evento atualizado no Redux.
     * Caso ainda não esteja no slice, utiliza a prop.
     */
    const evento =
        eventoAtual || item || {};

    const {
        title,
        start,
        end,
        local,
    } = evento;

    const status =
        evento?.status ||
        item?.status ||
        "pendente";

    const statusConfig =
        STATUS_CONFIG[status] ||
        STATUS_CONFIG.default;

    const lat =
        normalizeCoordinate(
            tutor?.geo?.lat
        );

    const lng =
        normalizeCoordinate(
            tutor?.geo?.lng
        );

    const hasGeo =
        lat !== null &&
        lng !== null;

    const eventTitle =
        title?.trim() ||
        "Evento";

    const financeiro =
        evento?.financeiro &&
            typeof evento.financeiro ===
            "object"
            ? evento.financeiro
            : {};

    const lancamentoId =
        financeiro?.lancamentoId
            ? String(
                financeiro.lancamentoId
            )
            : null;

    const financeiroValue =
        Number(
            financeiro?.preco ?? 0
        );

    const hasFinanceiro =
        Boolean(lancamentoId);

    const financeiroLabel =
        showFinanceValues
            ? formatCurrency(
                financeiroValue
            )
            : "";

    const navigationLabel =
        useMemo(() => {
            return (
                tutor?.nome ||
                evento?.tutorNome ||
                evento?.cliente ||
                eventTitle
            );
        }, [
            tutor?.nome,
            evento?.tutorNome,
            evento?.cliente,
            eventTitle,
        ]);

    const tutorName =
        useMemo(() => {
            return (
                tutor?.nome ||
                evento?.tutorNome ||
                evento?.cliente ||
                ""
            );
        }, [
            tutor?.nome,
            evento?.tutorNome,
            evento?.cliente,
        ]);

    const financeiroStatus =
        financeiro?.status ||
        (
            financeiro?.pago
                ? "pago"
                : "pendente"
        );

    const isFinanceiroPago =
        financeiroStatus ===
        "pago";

    const financeiroStatusLabel =
        {
            rascunho:
                "Financeiro em rascunho",

            pendente:
                "Pagamento pendente",

            parcial:
                "Pagamento parcial",

            pago:
                "Pagamento concluído",

            vencido:
                "Pagamento vencido",

            cancelado:
                "Lançamento cancelado",
        }[financeiroStatus] ||
        "Pagamento pendente";

    const financeiroStatusColor =
        {
            rascunho: COLORS.neutral,
            pendente: COLORS.pending,
            parcial: "#F97316",
            pago: COLORS.confirmed,
            vencido: COLORS.cancelled,
            cancelado: COLORS.neutral,
        }[financeiroStatus] ||
        COLORS.pending;

    const financeiroStatusBackground =
        {
            rascunho: "rgba(142,142,147,0.08)",
            pendente: "rgba(245,158,11,0.08)",
            parcial: "rgba(249,115,22,0.08)",
            pago: "rgba(22,163,74,0.08)",
            vencido: "rgba(239,68,68,0.08)",
            cancelado: "rgba(142,142,147,0.08)",
        }[financeiroStatus] ||
        "rgba(245,158,11,0.08)";

    /* ---------------------------- Update status --------------------------- */

    const handleSetStatus =
        useCallback(
            async (
                newStatus
            ) => {
                if (
                    pendingStatus ||
                    !eventId
                ) {
                    return;
                }

                /*
                 * Evita uma gravação desnecessária
                 * caso o usuário toque no status atual.
                 */
                if (
                    newStatus ===
                    status
                ) {
                    swipeRef.current
                        ?.close?.();

                    return;
                }

                setPendingStatus(
                    true
                );

                try {
                    await Haptics
                        .impactAsync(
                            Haptics
                                .ImpactFeedbackStyle
                                .Light
                        );

                    await dispatch(
                        updateEvento({
                            id:
                                eventId,

                            patch: {
                                status:
                                    newStatus,
                            },

                            changeStatus:
                                true,
                        })
                    ).unwrap();
                } catch (error) {
                    console.log(
                        "Erro ao atualizar status do evento na Home:",
                        error
                    );

                    Alert.alert(
                        "Status do evento",
                        error?.message ||
                        "Não foi possível atualizar o status."
                    );
                } finally {
                    swipeRef.current
                        ?.close?.();

                    setPendingStatus(
                        false
                    );
                }
            },
            [
                dispatch,
                eventId,
                pendingStatus,
                status,
            ]
        );

    const renderRightActions =
        useCallback(
            () => (
                <View
                    style={
                        styles.swipeActionsContainer
                    }
                >
                    <SwipeAction
                        label="Confirmar"
                        color={
                            COLORS.confirmed
                        }
                        onPress={() =>
                            handleSetStatus(
                                "confirmado"
                            )
                        }
                        disabled={
                            pendingStatus
                        }
                    />

                    <SwipeAction
                        label="Pendente"
                        color={
                            COLORS.pending
                        }
                        onPress={() =>
                            handleSetStatus(
                                "pendente"
                            )
                        }
                        disabled={
                            pendingStatus
                        }
                    />

                    <SwipeAction
                        label="Cancelar"
                        color={
                            COLORS.cancelled
                        }
                        onPress={() =>
                            handleSetStatus(
                                "cancelado"
                            )
                        }
                        last
                        disabled={
                            pendingStatus
                        }
                    />
                </View>
            ),
            [
                handleSetStatus,
                pendingStatus,
            ]
        );


    /* ---------------------------- Delete event ---------------------------- */

    const confirmDelete =
        useCallback(() => {
            if (
                !eventId ||
                isPendingAction
            ) {
                return;
            }

            swipeRef.current
                ?.close?.();

            Alert.alert(
                "Excluir evento?",
                "Esta ação é irreversível. O evento será removido definitivamente da agenda.",
                [
                    {
                        text: "Cancelar",
                        style: "cancel",
                    },
                    {
                        text: "Excluir",
                        style: "destructive",

                        onPress: async () => {
                            setPendingDelete(
                                true
                            );

                            try {
                                await Haptics
                                    .notificationAsync(
                                        Haptics
                                            .NotificationFeedbackType
                                            .Warning
                                    );

                                await dispatch(
                                    deleteEvento(
                                        eventId
                                    )
                                ).unwrap();

                                await Haptics
                                    .notificationAsync(
                                        Haptics
                                            .NotificationFeedbackType
                                            .Success
                                    )
                                    .catch(() => { });
                            } catch (error) {
                                console.log(
                                    "Erro ao excluir evento:",
                                    error
                                );

                                Alert.alert(
                                    "Não foi possível excluir",
                                    error?.message ||
                                    "Ocorreu um erro ao excluir o evento. Tente novamente."
                                );
                            } finally {
                                setPendingDelete(
                                    false
                                );

                                swipeRef.current
                                    ?.close?.();
                            }
                        },
                    },
                ]
            );
        }, [
            dispatch,
            eventId,
            isPendingAction,
        ]);

    const renderLeftActions =
        useCallback(
            () => (
                <View
                    style={
                        styles.deleteActionContainer
                    }
                >
                    <SwipeAction
                        label="Excluir"
                        icon="trash-outline"
                        color={
                            COLORS.cancelled
                        }
                        onPress={
                            confirmDelete
                        }
                        disabled={
                            isPendingAction
                        }
                        last
                    />
                </View>
            ),
            [
                confirmDelete,
                isPendingAction,
            ]
        );
    /* ---------------------------- Open event ---------------------------- */

    const openEvent =
        useCallback(() => {
            if (!eventId) {
                Alert.alert(
                    "Evento",
                    "Não foi possível identificar este evento."
                );

                return;
            }

            router.push({
                pathname:
                    "/(home-modals)/agenda-new",

                params: {
                    id: eventId,
                },
            });
        }, [eventId]);

    const openFinanceiro =
        useCallback(() => {
            if (!lancamentoId) {
                Alert.alert(
                    "Financeiro",
                    "Este evento ainda não possui um lançamento financeiro vinculado."
                );

                return;
            }

            router.push({
                pathname: "/(home-modals)/financeiro/[id]",
                params: {
                    id: lancamentoId,
                },
            });
        }, [lancamentoId]);

    /* ---------------------------- Navigation ---------------------------- */

    const openGoogleMaps =
        useCallback(async () => {
            const urls =
                getNavigationUrls({
                    lat,
                    lng,
                    label:
                        navigationLabel,
                });

            const applicationUrl =
                Platform.OS ===
                    "ios"
                    ? urls.googleMapsIOS
                    : urls.googleMapsAndroid;

            await openUrl(
                applicationUrl,
                urls.googleMapsBrowser
            );
        }, [
            lat,
            lng,
            navigationLabel,
        ]);

    const openAppleMaps =
        useCallback(async () => {
            const urls =
                getNavigationUrls({
                    lat,
                    lng,
                    label:
                        navigationLabel,
                });

            await openUrl(
                urls.appleMaps,
                urls.googleMapsBrowser
            );
        }, [
            lat,
            lng,
            navigationLabel,
        ]);

    const openWaze =
        useCallback(async () => {
            const urls =
                getNavigationUrls({
                    lat,
                    lng,
                    label:
                        navigationLabel,
                });

            await openUrl(
                urls.waze,
                urls.wazeBrowser
            );
        }, [
            lat,
            lng,
            navigationLabel,
        ]);

    const openBrowserMaps =
        useCallback(async () => {
            const urls =
                getNavigationUrls({
                    lat,
                    lng,
                    label:
                        navigationLabel,
                });

            await openUrl(
                urls.googleMapsBrowser
            );
        }, [
            lat,
            lng,
            navigationLabel,
        ]);

    const showNavigationOptions =
        useCallback(async () => {
            if (!hasGeo) {
                Alert.alert(
                    "Rota indisponível",
                    "O tutor deste evento ainda não possui coordenadas cadastradas."
                );

                return;
            }

            if (
                navPreference ===
                "google"
            ) {
                await openGoogleMaps();

                return;
            }

            if (
                navPreference ===
                "waze"
            ) {
                await openWaze();

                return;
            }

            try {
                if (
                    Platform.OS ===
                    "ios"
                ) {
                    const googleMapsAvailable =
                        await canOpenUrl(
                            "comgooglemaps://"
                        );

                    const wazeAvailable =
                        await canOpenUrl(
                            "waze://"
                        );

                    const options = [
                        "Apple Maps",
                    ];

                    const handlers = [
                        openAppleMaps,
                    ];

                    if (
                        googleMapsAvailable
                    ) {
                        options.push(
                            "Google Maps"
                        );

                        handlers.push(
                            openGoogleMaps
                        );
                    }

                    if (
                        wazeAvailable
                    ) {
                        options.push(
                            "Waze"
                        );

                        handlers.push(
                            openWaze
                        );
                    }

                    options.push(
                        "Abrir no navegador"
                    );

                    handlers.push(
                        openBrowserMaps
                    );

                    options.push(
                        "Cancelar"
                    );

                    const cancelButtonIndex =
                        options.length -
                        1;

                    ActionSheetIOS
                        .showActionSheetWithOptions(
                            {
                                title:
                                    "Como deseja navegar?",

                                message:
                                    navigationLabel,

                                options,

                                cancelButtonIndex,
                            },
                            (
                                buttonIndex
                            ) => {
                                if (
                                    buttonIndex ===
                                    cancelButtonIndex
                                ) {
                                    return;
                                }

                                handlers[
                                    buttonIndex
                                ]?.();
                            }
                        );

                    return;
                }

                const wazeAvailable =
                    await canOpenUrl(
                        "waze://"
                    );

                const buttons = [
                    {
                        text:
                            "Google Maps",

                        onPress:
                            openGoogleMaps,
                    },
                ];

                if (
                    wazeAvailable
                ) {
                    buttons.push({
                        text:
                            "Waze",

                        onPress:
                            openWaze,
                    });
                }

                buttons.push({
                    text:
                        "Navegador",

                    onPress:
                        openBrowserMaps,
                });

                buttons.push({
                    text:
                        "Cancelar",

                    style:
                        "cancel",
                });

                Alert.alert(
                    "Como deseja navegar?",
                    navigationLabel,
                    buttons
                );
            } catch (error) {
                console.log(
                    "Erro ao exibir opções de navegação:",
                    error
                );

                Alert.alert(
                    "Navegação",
                    "Não foi possível exibir as opções de mapas."
                );
            }
        }, [
            hasGeo,
            navPreference,
            navigationLabel,
            openGoogleMaps,
            openAppleMaps,
            openWaze,
            openBrowserMaps,
        ]);

    /* ------------------------------- Render ------------------------------ */

    return (
        <View
            style={
                styles.rowOuter
            }
        >
            <Swipeable
                ref={swipeRef}
                enabled={
                    Boolean(
                        eventId
                    ) &&
                    !isPendingAction
                }
                overshootLeft={
                    false
                }
                overshootRight={
                    false
                }
                renderLeftActions={
                    renderLeftActions
                }
                renderRightActions={
                    renderRightActions
                }
                friction={2}
                leftThreshold={28}
                rightThreshold={28}
                containerStyle={
                    styles.swipeableContainer
                }
            >
                <View
                    style={
                        styles.rowContainer
                    }
                >
                    <View
                        style={[
                            styles.statusIndicator,

                            {
                                backgroundColor:
                                    statusConfig.color,
                            },
                        ]}
                    />

                    {/*
                     * O conteúdo deixou de ser Pressable.
                     * Agora o gesto horizontal pode começar
                     * em qualquer ponto do corpo do evento.
                     */}
                    <View
                        style={
                            styles.contentContainer
                        }
                    >
                        <View
                            style={
                                styles.headerRow
                            }
                        >
                            <View
                                style={
                                    styles.titleContainer
                                }
                            >
                                <Text
                                    style={
                                        styles.title
                                    }
                                    numberOfLines={
                                        1
                                    }
                                >
                                    {
                                        eventTitle
                                    }
                                </Text>

                                {!!tutorName && (
                                    <Text
                                        style={
                                            styles.tutorName
                                        }
                                        numberOfLines={
                                            1
                                        }
                                    >
                                        {
                                            tutorName
                                        }
                                    </Text>
                                )}
                            </View>

                            <View
                                style={
                                    styles.timeBadge
                                }
                            >
                                <Ionicons
                                    name="time-outline"
                                    size={13}
                                    color={
                                        COLORS.secondaryText
                                    }
                                />

                                <Text
                                    style={
                                        styles.timeText
                                    }
                                    numberOfLines={
                                        1
                                    }
                                >
                                    {formatTimeRange(
                                        start,
                                        end
                                    )}
                                </Text>
                            </View>
                        </View>

                        {!!local ? (
                            <View
                                style={
                                    styles.locationRow
                                }
                            >
                                <View
                                    style={
                                        styles.locationIcon
                                    }
                                >
                                    <Ionicons
                                        name="location"
                                        size={14}
                                        color={
                                            COLORS.primaryStrong
                                        }
                                    />
                                </View>

                                <Text
                                    style={
                                        styles.locationText
                                    }
                                    numberOfLines={
                                        2
                                    }
                                >
                                    {
                                        local
                                    }
                                </Text>
                            </View>
                        ) : (
                            <View
                                style={
                                    styles.locationRow
                                }
                            >
                                <View
                                    style={[
                                        styles.locationIcon,
                                        styles.locationIconEmpty,
                                    ]}
                                >
                                    <Ionicons
                                        name="location-outline"
                                        size={14}
                                        color={
                                            COLORS.tertiaryText
                                        }
                                    />
                                </View>

                                <Text
                                    style={
                                        styles.emptyLocationText
                                    }
                                    numberOfLines={
                                        1
                                    }
                                >
                                    Local não informado
                                </Text>
                            </View>
                        )}

                        {hasFinanceiro && (
                            <View
                                style={[
                                    styles.financeSummaryRow,
                                    {
                                        backgroundColor:
                                            financeiroStatusBackground,

                                        borderBottomColor:
                                            financeiroStatusColor,
                                    },
                                ]}
                            >
                                <View
                                    style={[
                                        styles.financeStatusDot,
                                        {
                                            backgroundColor:
                                                financeiroStatusColor,
                                        },
                                    ]}
                                />

                                <Text
                                    style={[
                                        styles.financeSummaryText,
                                        {
                                            color:
                                                financeiroStatusColor,
                                        },
                                    ]}
                                >
                                    {financeiroStatusLabel}
                                </Text>
                            </View>
                        )}
                    </View>

                    <View
                        style={
                            styles.separator
                        }
                    />

                    <View
                        style={
                            styles.actionsBar
                        }
                    >
                        <View
                            style={
                                styles.secondaryActions
                            }
                        >
                            <SecondaryAction
                                textIcon="🐵"
                                label="Ver"
                                onPress={
                                    openEvent
                                }
                            />

                            <View
                                style={
                                    styles.actionSeparator
                                }
                            />

                            <SecondaryAction
                                icon="wallet-outline"
                                label={
                                    financeiroLabel
                                }
                                onPress={
                                    openFinanceiro
                                }
                                disabled={
                                    !hasFinanceiro
                                }
                                compact={
                                    !showFinanceValues
                                }
                                value={
                                    showFinanceValues &&
                                    hasFinanceiro
                                }
                            />
                        </View>

                        <PrimaryRouteAction
                            onPress={
                                showNavigationOptions
                            }
                            disabled={
                                !hasGeo
                            }
                        />
                    </View>

                    {isPendingAction && (
                        <View
                            pointerEvents="none"
                            style={
                                styles.updatingOverlay
                            }
                        >
                            <Text
                                style={
                                    styles.updatingText
                                }
                            >
                                {pendingDelete
                                    ? "Excluindo…"
                                    : "Atualizando…"}
                            </Text>
                        </View>
                    )}
                </View>
            </Swipeable>

            {!isLast && (
                <View
                    style={
                        styles.rowSeparator
                    }
                />
            )}
        </View>
    );
}

/* -------------------------------------------------------------------------- */
/*                                   Styles                                   */
/* -------------------------------------------------------------------------- */

const styles =
    StyleSheet.create({
        rowOuter: {
            width: "100%",
            backgroundColor:
                COLORS.card,
        },

        swipeableContainer: {
            overflow: "visible",
            backgroundColor:
                COLORS.card,
        },

        rowContainer: {
            position: "relative",
            width: "100%",
            backgroundColor:
                COLORS.card,
            overflow: "hidden",
        },

        statusIndicator: {
            position: "absolute",
            top: 14,
            left: 0,
            bottom: 55,
            width: 3,
            borderTopRightRadius: 3,
            borderBottomRightRadius: 3,
            zIndex: 2,
        },

        contentContainer: {
            minHeight: 88,
            paddingTop: 12,
            paddingBottom: 11,
            paddingLeft: 15,
            paddingRight: 13,
            justifyContent:
                "center",
        },

        headerRow: {
            flexDirection: "row",
            alignItems:
                "flex-start",
            gap: 10,
        },

        titleContainer: {
            flex: 1,
            minWidth: 0,
        },

        title: {
            color: COLORS.text,
            fontSize: 15,
            lineHeight: 19,
            fontWeight: "700",
            letterSpacing: -0.2,
        },

        tutorName: {
            marginTop: 3,
            color:
                COLORS.secondaryText,
            fontSize: 12,
            lineHeight: 16,
            fontWeight: "500",
        },

        timeBadge: {
            minHeight: 28,
            maxWidth: 118,
            paddingHorizontal: 8,
            borderRadius: 9,

            backgroundColor:
                "rgba(118,118,128,0.08)",

            flexDirection: "row",
            alignItems: "center",
            justifyContent:
                "center",
            gap: 4,
        },

        timeText: {
            flexShrink: 1,
            color:
                COLORS.secondaryText,
            fontSize: 11,
            lineHeight: 14,
            fontWeight: "600",
        },

        locationRow: {
            minWidth: 0,
            marginTop: 11,
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
        },

        locationIcon: {
            width: 25,
            height: 25,
            borderRadius: 8,
            backgroundColor:
                COLORS.primarySoft,
            alignItems: "center",
            justifyContent:
                "center",
        },

        locationIconEmpty: {
            backgroundColor:
                "rgba(118,118,128,0.07)",
        },

        locationText: {
            flex: 1,
            minWidth: 0,
            color:
                COLORS.secondaryText,
            fontSize: 12,
            lineHeight: 17,
            fontWeight: "500",
        },

        emptyLocationText: {
            flex: 1,
            minWidth: 0,
            color:
                COLORS.tertiaryText,
            fontSize: 12,
            lineHeight: 17,
            fontWeight: "500",
        },

        financeSummaryRow: {
            marginTop: 9,
            minHeight: 28,
            width: "46%",
            paddingHorizontal: 9,

            borderRadius: 8,
            // borderBottomWidth: 1,

            flexDirection: "row",
            alignItems: "center",
            gap: 7,
        },

        financeStatusDot: {
            width: 7,
            height: 7,
            borderRadius: 4,
        },

        financeSummaryText: {
            flex: 1,
            minWidth: 0,
            fontSize: 10.5,
            lineHeight: 14,
            fontWeight: "700",
        },

        separator: {
            height:
                StyleSheet.hairlineWidth,

            marginLeft: 15,

            backgroundColor:
                COLORS.separator,
        },

        actionsBar: {
            minHeight: 50,
            paddingLeft: 8,
            paddingRight: 10,
            paddingTop: 6,
            paddingBottom: 6,

            flexDirection: "row",
            alignItems: "center",
            justifyContent:
                "space-between",
            gap: 8,
        },

        secondaryActions: {
            flex: 1,
            minWidth: 0,
            flexDirection: "row",
            alignItems: "center",
            gap: 3,
        },

        secondaryAction: {
            minWidth: 58,
            height: 38,
            paddingHorizontal: 9,
            borderRadius: 10,

            flexDirection: "row",
            alignItems: "center",
            justifyContent:
                "center",
            gap: 5,
        },

        secondaryActionCompact: {
            minWidth: 44,
            width: 44,
            paddingHorizontal: 6,
        },

        secondaryActionValue: {
            minWidth: 104,
            paddingHorizontal: 9,

            backgroundColor:
                "rgba(111,174,134,0.10)",
        },

        secondaryActionPressed: {
            backgroundColor:
                COLORS.pressed,
        },

        secondaryActionText: {
            color:
                COLORS.secondaryText,
            fontSize: 12,
            lineHeight: 15,
            fontWeight: "600",
        },

        secondaryActionValueText: {
            color:
                COLORS.primaryStrong,
            fontSize: 11,
            fontWeight: "800",
        },

        secondaryActionTextDisabled: {
            color:
                COLORS.disabledText,
        },

        secondaryActionEmoji: {
            fontSize: 17,
            lineHeight: 21,
        },

        secondaryActionEmojiDisabled: {
            opacity: 0.35,
        },

        actionSeparator: {
            width:
                StyleSheet.hairlineWidth,

            height: 20,
            marginHorizontal: 2,

            backgroundColor:
                COLORS.separator,
        },

        primaryAction: {
            minWidth: 72,
            height: 38,
            paddingHorizontal: 15,
            borderRadius: 11,

            backgroundColor:
                COLORS.primary,

            flexDirection: "row",
            alignItems: "center",
            justifyContent:
                "center",
            gap: 6,

            shadowColor:
                COLORS.primaryStrong,

            shadowOpacity: 0.16,
            shadowRadius: 5,

            shadowOffset: {
                width: 0,
                height: 2,
            },

            elevation: 2,
        },

        primaryActionPressed: {
            opacity: 0.82,

            transform: [
                {
                    scale: 0.98,
                },
            ],
        },

        primaryActionDisabled: {
            backgroundColor:
                COLORS.disabledBackground,

            shadowOpacity: 0,
            elevation: 0,
        },

        primaryActionText: {
            color: "#FFFFFF",
            fontSize: 13,
            lineHeight: 16,
            fontWeight: "700",
        },

        primaryActionTextDisabled: {
            color:
                COLORS.disabledText,
        },

        swipeActionsContainer: {
            flexDirection: "row",
            alignItems: "stretch",
            gap: 6,
            paddingHorizontal: 8,
        },

        swipeActionWrap: {
            overflow: "hidden",

            borderTopLeftRadius:
                14,

            borderBottomLeftRadius:
                14,

            marginVertical: 4,
        },

        swipeActionWrapLast: {
            borderTopRightRadius:
                14,

            borderBottomRightRadius:
                14,
        },

        swipeAction: {
            minWidth: 92,
            height: "100%",
            paddingHorizontal: 14,
            alignItems: "center",
            justifyContent:
                "center",
        },

        swipeActionText: {
            color: "#FFFFFF",
            fontSize: 12,
            fontWeight: "850",
        },

        updatingOverlay: {
            ...StyleSheet.absoluteFillObject,

            backgroundColor:
                "rgba(255,255,255,0.62)",

            alignItems: "center",
            justifyContent:
                "center",
        },

        updatingText: {
            color:
                COLORS.secondaryText,
            fontSize: 11,
            fontWeight: "750",
        },

        rowSeparator: {
            height: 1,

            backgroundColor:
                "rgba(60,60,67,0.22)",
        },
        deleteActionContainer: {
            flexDirection: "row",
            alignItems: "stretch",
            paddingLeft: 8,
            paddingRight: 2,
        },

        swipeAction: {
            minWidth: 92,
            height: "100%",
            paddingHorizontal: 14,

            alignItems: "center",
            justifyContent: "center",
            gap: 6,
        },
    });