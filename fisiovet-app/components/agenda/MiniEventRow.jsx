// src/components/agenda/MiniEventRow.jsx
// @ts-nocheck

import React, { useMemo } from 'react';
import {
    ActionSheetIOS,
    Alert,
    Linking,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

/* -------------------------------------------------------------------------- */
/*                                   Tokens                                   */
/* -------------------------------------------------------------------------- */

const COLORS = {
    card: '#FFFFFF',
    text: '#111827',
    secondaryText: '#6B7280',
    tertiaryText: '#9CA3AF',

    separator: 'rgba(60, 60, 67, 0.12)',
    pressed: 'rgba(118, 118, 128, 0.08)',

    primary: '#6FAE86',
    primaryStrong: '#578F6D',
    primarySoft: 'rgba(111, 174, 134, 0.12)',

    disabledBackground: 'rgba(118, 118, 128, 0.07)',
    disabledText: 'rgba(60, 60, 67, 0.30)',

    confirmed: '#16A34A',
    pending: '#F59E0B',
    cancelled: '#EF4444',
    neutral: '#8E8E93',
};

const STATUS_CONFIG = {
    confirmado: {
        color: COLORS.confirmed,
        label: 'Confirmado',
        icon: 'checkmark-circle',
    },

    pendente: {
        color: COLORS.pending,
        label: 'Pendente',
        icon: 'time',
    },

    cancelado: {
        color: COLORS.cancelled,
        label: 'Cancelado',
        icon: 'close-circle',
    },

    default: {
        color: COLORS.neutral,
        label: 'Evento',
        icon: 'ellipse',
    },
};

/* -------------------------------------------------------------------------- */
/*                                   Helpers                                  */
/* -------------------------------------------------------------------------- */

function normalizeCoordinate(value) {
    const number = Number(value);

    return Number.isFinite(number)
        ? number
        : null;
}

function formatHour(value) {
    if (!value) {
        return '—';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return '—';
    }

    return date.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
    });
}

function formatTimeRange(start, end) {
    const startText = formatHour(start);
    const endText = formatHour(end);

    if (startText === '—' && endText === '—') {
        return 'Horário não informado';
    }

    if (endText === '—') {
        return startText;
    }

    return `${startText} – ${endText}`;
}

async function canOpenUrl(url) {
    try {
        return await Linking.canOpenURL(url);
    } catch {
        return false;
    }
}

async function openUrl(url, fallbackUrl) {
    try {
        const supported = await canOpenUrl(url);

        if (supported) {
            await Linking.openURL(url);
            return;
        }

        if (fallbackUrl) {
            await Linking.openURL(fallbackUrl);
            return;
        }

        throw new Error(
            'Aplicativo de navegação não disponível.'
        );
    } catch (error) {
        Alert.alert(
            'Navegação',
            error?.message ||
            'Não foi possível abrir o aplicativo de mapas.'
        );
    }
}

function getNavigationUrls({
    lat,
    lng,
    label,
}) {
    const coordinates = `${lat},${lng}`;

    const encodedLabel = encodeURIComponent(
        label || 'Destino'
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
/*                              Action components                             */
/* -------------------------------------------------------------------------- */

function SecondaryAction({
    icon,
    label,
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

                Haptics.selectionAsync().catch(
                    () => { }
                );

                onPress?.();
            }}
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityState={{
                disabled,
            }}
            hitSlop={4}
            style={({ pressed }) => [
                styles.secondaryAction,
                pressed &&
                !disabled &&
                styles.secondaryActionPressed,
            ]}
        >
            <Ionicons
                name={icon}
                size={18}
                color={
                    disabled
                        ? COLORS.disabledText
                        : COLORS.secondaryText
                }
            />

            <Text
                numberOfLines={1}
                style={[
                    styles.secondaryActionText,
                    disabled &&
                    styles.secondaryActionTextDisabled,
                ]}
            >
                {label}
            </Text>
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
                    Haptics.ImpactFeedbackStyle.Light
                ).catch(() => { });

                onPress?.();
            }}
            accessibilityRole="button"
            accessibilityLabel={
                disabled
                    ? 'Rota indisponível'
                    : 'Abrir rota para o evento'
            }
            accessibilityState={{
                disabled,
            }}
            style={({ pressed }) => [
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
                        : '#FFFFFF'
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
    navPreference = 'ask',
    isLast = false,
}) {
    const {
        title,
        start,
        end,
        status,
        local,
    } = item || {};

    const statusConfig =
        STATUS_CONFIG[status] ||
        STATUS_CONFIG.default;

    const lat = normalizeCoordinate(
        tutor?.geo?.lat
    );

    const lng = normalizeCoordinate(
        tutor?.geo?.lng
    );

    const hasGeo =
        lat !== null &&
        lng !== null;

    const eventTitle =
        title?.trim() || 'Evento';

    const navigationLabel = useMemo(() => {
        return (
            tutor?.nome ||
            item?.tutorNome ||
            item?.cliente ||
            eventTitle
        );
    }, [
        tutor?.nome,
        item?.tutorNome,
        item?.cliente,
        eventTitle,
    ]);

    const tutorName = useMemo(() => {
        return (
            tutor?.nome ||
            item?.tutorNome ||
            item?.cliente ||
            ''
        );
    }, [
        tutor?.nome,
        item?.tutorNome,
        item?.cliente,
    ]);

    /* ---------------------------- Open event ---------------------------- */

    const openEvent = () => {
        if (!item?.id) {
            Alert.alert(
                'Evento',
                'Não foi possível identificar este evento.'
            );

            return;
        }

        router.push({
            pathname: '/(modals)/agenda-new',
            params: {
                id: String(item.id),
            },
        });
    };

    /* ---------------------------- Navigation ---------------------------- */

    const openGoogleMaps = async () => {
        const urls = getNavigationUrls({
            lat,
            lng,
            label: navigationLabel,
        });

        const applicationUrl =
            Platform.OS === 'ios'
                ? urls.googleMapsIOS
                : urls.googleMapsAndroid;

        await openUrl(
            applicationUrl,
            urls.googleMapsBrowser
        );
    };

    const openAppleMaps = async () => {
        const urls = getNavigationUrls({
            lat,
            lng,
            label: navigationLabel,
        });

        await openUrl(
            urls.appleMaps,
            urls.googleMapsBrowser
        );
    };

    const openWaze = async () => {
        const urls = getNavigationUrls({
            lat,
            lng,
            label: navigationLabel,
        });

        await openUrl(
            urls.waze,
            urls.wazeBrowser
        );
    };

    const openBrowserMaps = async () => {
        const urls = getNavigationUrls({
            lat,
            lng,
            label: navigationLabel,
        });

        await openUrl(
            urls.googleMapsBrowser
        );
    };

    const showNavigationOptions = async () => {
        if (!hasGeo) {
            Alert.alert(
                'Rota indisponível',
                'O tutor deste evento ainda não possui coordenadas cadastradas.'
            );

            return;
        }

        if (navPreference === 'google') {
            await openGoogleMaps();
            return;
        }

        if (navPreference === 'waze') {
            await openWaze();
            return;
        }

        try {
            if (Platform.OS === 'ios') {
                const googleMapsAvailable =
                    await canOpenUrl(
                        'comgooglemaps://'
                    );

                const wazeAvailable =
                    await canOpenUrl(
                        'waze://'
                    );

                const options = [
                    'Apple Maps',
                ];

                const handlers = [
                    openAppleMaps,
                ];

                if (googleMapsAvailable) {
                    options.push(
                        'Google Maps'
                    );

                    handlers.push(
                        openGoogleMaps
                    );
                }

                if (wazeAvailable) {
                    options.push('Waze');

                    handlers.push(
                        openWaze
                    );
                }

                options.push(
                    'Abrir no navegador'
                );

                handlers.push(
                    openBrowserMaps
                );

                options.push('Cancelar');

                const cancelButtonIndex =
                    options.length - 1;

                ActionSheetIOS.showActionSheetWithOptions(
                    {
                        title:
                            'Como deseja navegar?',
                        message:
                            navigationLabel,
                        options,
                        cancelButtonIndex,
                    },
                    (buttonIndex) => {
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
                    'waze://'
                );

            const buttons = [
                {
                    text: 'Google Maps',
                    onPress:
                        openGoogleMaps,
                },
            ];

            if (wazeAvailable) {
                buttons.push({
                    text: 'Waze',
                    onPress:
                        openWaze,
                });
            }

            buttons.push({
                text: 'Navegador',
                onPress:
                    openBrowserMaps,
            });

            buttons.push({
                text: 'Cancelar',
                style: 'cancel',
            });

            Alert.alert(
                'Como deseja navegar?',
                navigationLabel,
                buttons
            );
        } catch (error) {
            console.log(
                'Erro ao exibir opções de navegação:',
                error
            );

            Alert.alert(
                'Navegação',
                'Não foi possível exibir as opções de mapas.'
            );
        }
    };

    /* ------------------------------- Render ------------------------------ */

    return (
        <View style={styles.rowContainer}>
            <View
                style={[
                    styles.statusIndicator,
                    {
                        backgroundColor:
                            statusConfig.color,
                    },
                ]}
            />

            <Pressable
                onPress={() => {
                    Haptics.selectionAsync().catch(
                        () => { }
                    );

                    openEvent();
                }}
                accessibilityRole="button"
                accessibilityLabel={`Abrir evento ${eventTitle}`}
                android_ripple={{
                    color: COLORS.pressed,
                }}
                style={({ pressed }) => [
                    styles.contentButton,
                    pressed &&
                    Platform.OS === 'ios' &&
                    styles.contentButtonPressed,
                ]}
            >
                <View style={styles.headerRow}>
                    <View style={styles.titleContainer}>
                        <Text
                            style={styles.title}
                            numberOfLines={1}
                        >
                            {eventTitle}
                        </Text>

                        {!!tutorName && (
                            <Text
                                style={styles.tutorName}
                                numberOfLines={1}
                            >
                                {tutorName}
                            </Text>
                        )}
                    </View>

                    <View style={styles.timeBadge}>
                        <Ionicons
                            name="time-outline"
                            size={13}
                            color={
                                COLORS.secondaryText
                            }
                        />

                        <Text
                            style={styles.timeText}
                            numberOfLines={1}
                        >
                            {formatTimeRange(
                                start,
                                end
                            )}
                        </Text>
                    </View>
                </View>

                {!!local ? (
                    <View style={styles.locationRow}>
                        <View style={styles.locationIcon}>
                            <Ionicons
                                name="location"
                                size={14}
                                color={
                                    COLORS.primaryStrong
                                }
                            />
                        </View>

                        <Text
                            style={styles.locationText}
                            numberOfLines={2}
                        >
                            {local}
                        </Text>
                    </View>
                ) : (
                    <View style={styles.locationRow}>
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
                            style={styles.emptyLocationText}
                            numberOfLines={1}
                        >
                            Local não informado
                        </Text>
                    </View>
                )}
            </Pressable>

            <View style={styles.separator} />

            <View style={styles.actionsBar}>
                <View style={styles.secondaryActions}>
                    <SecondaryAction
                        icon="eye-outline"
                        label="Ver"
                        onPress={openEvent}
                    />

                    <View style={styles.actionSeparator} />

                    <SecondaryAction
                        icon="wallet-outline"
                        label="Financeiro"
                        disabled
                    />
                </View>

                <PrimaryRouteAction
                    onPress={showNavigationOptions}
                    disabled={!hasGeo}
                />
            </View>

            {!isLast && (
                <View style={styles.rowSeparator} />
            )}
        </View>
    );
}

/* -------------------------------------------------------------------------- */
/*                                   Styles                                   */
/* -------------------------------------------------------------------------- */

const styles = StyleSheet.create({
    rowContainer: {
        position: 'relative',
        width: '100%',
        backgroundColor: COLORS.card,
    },

    statusIndicator: {
        position: 'absolute',
        top: 14,
        left: 0,
        bottom: 55,
        width: 3,
        borderTopRightRadius: 3,
        borderBottomRightRadius: 3,
        zIndex: 2,
    },

    contentButton: {
        minHeight: 84,
        paddingTop: 12,
        paddingBottom: 11,
        paddingLeft: 15,
        paddingRight: 13,
        justifyContent: 'center',
    },

    contentButtonPressed: {
        backgroundColor: COLORS.pressed,
    },

    headerRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
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
        fontWeight: '700',

        letterSpacing: -0.2,
    },

    tutorName: {
        marginTop: 3,

        color: COLORS.secondaryText,

        fontSize: 12,
        lineHeight: 16,
        fontWeight: '500',
    },

    timeBadge: {
        minHeight: 28,
        maxWidth: 118,

        paddingHorizontal: 8,

        borderRadius: 9,
        backgroundColor:
            'rgba(118, 118, 128, 0.08)',

        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
    },

    timeText: {
        flexShrink: 1,

        color: COLORS.secondaryText,

        fontSize: 11,
        lineHeight: 14,
        fontWeight: '600',
    },

    locationRow: {
        minWidth: 0,

        marginTop: 11,

        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },

    locationIcon: {
        width: 25,
        height: 25,

        borderRadius: 8,

        backgroundColor:
            COLORS.primarySoft,

        alignItems: 'center',
        justifyContent: 'center',
    },

    locationIconEmpty: {
        backgroundColor:
            'rgba(118, 118, 128, 0.07)',
    },

    locationText: {
        flex: 1,
        minWidth: 0,

        color: COLORS.secondaryText,

        fontSize: 12,
        lineHeight: 17,
        fontWeight: '500',
    },

    emptyLocationText: {
        flex: 1,
        minWidth: 0,

        color: COLORS.tertiaryText,

        fontSize: 12,
        lineHeight: 17,
        fontWeight: '500',
    },

    separator: {
        height: StyleSheet.hairlineWidth,

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
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
    },

    secondaryActions: {
        flex: 1,
        minWidth: 0,

        flexDirection: 'row',
        alignItems: 'center',
    },

    secondaryAction: {
        minWidth: 58,
        height: 38,

        paddingHorizontal: 9,

        borderRadius: 10,

        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
    },

    secondaryActionPressed: {
        backgroundColor: COLORS.pressed,
    },

    secondaryActionText: {
        color: COLORS.secondaryText,

        fontSize: 12,
        lineHeight: 15,
        fontWeight: '600',
    },

    secondaryActionTextDisabled: {
        color: COLORS.disabledText,
    },

    actionSeparator: {
        width: StyleSheet.hairlineWidth,
        height: 22,

        backgroundColor:
            COLORS.separator,
    },

    primaryAction: {
        minWidth: 72,
        height: 38,

        paddingHorizontal: 15,

        borderRadius: 11,
        backgroundColor: COLORS.primary,

        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,

        shadowColor: COLORS.primaryStrong,
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
        color: '#FFFFFF',

        fontSize: 13,
        lineHeight: 16,
        fontWeight: '700',
    },

    primaryActionTextDisabled: {
        color: COLORS.disabledText,
    },
    rowContainer: {
        position: 'relative',
        width: '100%',
        backgroundColor: COLORS.card,
    },
    rowSeparator: {
        height: 1,
        backgroundColor: 'rgba(60, 60, 67, 0.22)',
    },
});