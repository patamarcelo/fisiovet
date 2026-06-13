// src/components/EnderecoCard.jsx
// @ts-nocheck
import React, { useState } from 'react';
import {
    View,
    Text,
    Pressable,
    ActivityIndicator,
    Alert,
    StyleSheet,
    Platform,
    Linking,
    ActionSheetIOS,
} from 'react-native';
import { useDispatch } from 'react-redux';

import { updateTutor } from '@/src/store/slices/tutoresSlice';
import { geocodeAddress } from '@/src/services/geocoding';
import { useThemeColor } from '@/hooks/useThemeColor';
import { IconSymbol } from '@/components/ui/IconSymbol';
import MapCard from '@/components/MapCard';


/* ---------- Helpers ---------- */

function normalizeCoordinate(value) {
    const number = Number(value);

    return Number.isFinite(number) ? number : null;
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

        throw new Error('Aplicativo não disponível.');
    } catch (error) {
        Alert.alert(
            'Navegação',
            error?.message || 'Não foi possível abrir o aplicativo de mapas.'
        );
    }
}

function getNavigationUrls({ lat, lng, label }) {
    const encodedLabel = encodeURIComponent(label || 'Destino');
    const coordinates = `${lat},${lng}`;

    return {
        appleMaps: `http://maps.apple.com/?daddr=${coordinates}&q=${encodedLabel}`,

        googleMapsAppIOS:
            `comgooglemaps://?daddr=${coordinates}` +
            `&directionsmode=driving&q=${encodedLabel}`,

        googleMapsAndroid:
            `google.navigation:q=${coordinates}&mode=d`,

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

/* ---------- Component ---------- */

function EnderecoCard({ tutor }) {
    const dispatch = useDispatch();

    const [geoLoading, setGeoLoading] = useState(false);
    const [navigationLoading, setNavigationLoading] = useState(false);

    const text = useThemeColor({}, 'text');

    const subtle = useThemeColor(
        {
            light: '#6B7280',
            dark: '#9AA0A6',
        },
        'text'
    );

    const success = useThemeColor({}, 'success');

    const border = useThemeColor(
        {
            light: 'rgba(0,0,0,0.08)',
            dark: 'rgba(255,255,255,0.08)',
        },
        'border'
    );

    const bg = useThemeColor({}, 'background');

    const lat = normalizeCoordinate(tutor?.geo?.lat);
    const lng = normalizeCoordinate(tutor?.geo?.lng);

    const hasGeo = lat !== null && lng !== null;

    const btnLabel = hasGeo
        ? 'Recalcular localização'
        : 'Localizar no mapa';

    const handleGeocode = async () => {
        const endereco = tutor?.endereco;

        if (!endereco) {
            Alert.alert(
                'Endereço',
                'Não há endereço cadastrado para localizar.'
            );
            return;
        }

        if (!tutor?.id) {
            Alert.alert(
                'Tutor',
                'Não foi possível identificar o tutor.'
            );
            return;
        }

        setGeoLoading(true);

        try {
            const geoResult = await geocodeAddress(endereco);

            const nextLat = normalizeCoordinate(geoResult?.lat);
            const nextLng = normalizeCoordinate(geoResult?.lng);

            if (nextLat === null || nextLng === null) {
                throw new Error(
                    'O serviço não retornou coordenadas válidas.'
                );
            }

            await dispatch(
                updateTutor({
                    id: tutor.id,
                    patch: {
                        geo: {
                            lat: nextLat,
                            lng: nextLng,
                        },
                    },
                })
            ).unwrap();

            Alert.alert(
                'Pronto',
                'Localização atualizada com sucesso.'
            );
        } catch (error) {
            console.log(
                'Erro ao atualizar localização do tutor:',
                error
            );

            Alert.alert(
                'Geocodificação',
                error?.message ||
                'Não foi possível obter as coordenadas.'
            );
        } finally {
            setGeoLoading(false);
        }
    };

    const openAppleMaps = async () => {
        const urls = getNavigationUrls({
            lat,
            lng,
            label: tutor?.nome,
        });

        await openUrl(
            urls.appleMaps,
            urls.googleMapsBrowser
        );
    };

    const openGoogleMaps = async () => {
        const urls = getNavigationUrls({
            lat,
            lng,
            label: tutor?.nome,
        });

        const appUrl =
            Platform.OS === 'ios'
                ? urls.googleMapsAppIOS
                : urls.googleMapsAndroid;

        await openUrl(
            appUrl,
            urls.googleMapsBrowser
        );
    };

    const openWaze = async () => {
        const urls = getNavigationUrls({
            lat,
            lng,
            label: tutor?.nome,
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
            label: tutor?.nome,
        });

        await openUrl(urls.googleMapsBrowser);
    };

    const showNavigationOptions = async () => {
        if (!hasGeo) {
            Alert.alert(
                'Localização',
                'Primeiro obtenha as coordenadas deste endereço.'
            );
            return;
        }

        if (navigationLoading) return;

        setNavigationLoading(true);

        try {
            if (Platform.OS === 'ios') {
                const googleMapsAvailable = await canOpenUrl(
                    'comgooglemaps://'
                );

                const wazeAvailable = await canOpenUrl(
                    'waze://'
                );

                const options = ['Apple Maps'];
                const handlers = [openAppleMaps];

                if (googleMapsAvailable) {
                    options.push('Google Maps');
                    handlers.push(openGoogleMaps);
                }

                if (wazeAvailable) {
                    options.push('Waze');
                    handlers.push(openWaze);
                }

                options.push('Abrir no navegador');
                handlers.push(openBrowserMaps);

                options.push('Cancelar');

                const cancelButtonIndex = options.length - 1;

                ActionSheetIOS.showActionSheetWithOptions(
                    {
                        title: 'Como deseja navegar?',
                        message:
                            tutor?.nome ||
                            'Escolha o aplicativo de mapas.',
                        options,
                        cancelButtonIndex,
                    },
                    (buttonIndex) => {
                        if (buttonIndex === cancelButtonIndex) {
                            return;
                        }

                        handlers[buttonIndex]?.();
                    }
                );

                return;
            }

            const wazeAvailable = await canOpenUrl('waze://');

            const buttons = [
                {
                    text: 'Google Maps',
                    onPress: openGoogleMaps,
                },
            ];

            if (wazeAvailable) {
                buttons.push({
                    text: 'Waze',
                    onPress: openWaze,
                });
            }

            buttons.push({
                text: 'Navegador',
                onPress: openBrowserMaps,
            });

            buttons.push({
                text: 'Cancelar',
                style: 'cancel',
            });

            Alert.alert(
                'Como deseja navegar?',
                tutor?.nome || 'Escolha o aplicativo de mapas.',
                buttons
            );
        } catch (error) {
            console.log(
                'Erro ao abrir opções de navegação:',
                error
            );

            Alert.alert(
                'Navegação',
                'Não foi possível exibir as opções de mapas.'
            );
        } finally {
            setNavigationLoading(false);
        }
    };

    return (
        <View
            style={[
                styles.block,
                {
                    borderColor: border,
                    backgroundColor: bg,
                },
            ]}
        >
            <Text
                style={[
                    styles.blockTitle,
                    {
                        color: text,
                    },
                ]}
            >
                Endereço
            </Text>

            <Text
                style={[
                    styles.addressText,
                    {
                        color: subtle,
                    },
                ]}
            >
                {tutor?.endereco?.logradouro || 'Endereço não informado'}
                {tutor?.endereco?.numero
                    ? `, ${tutor.endereco.numero}`
                    : ''}

                {!!tutor?.endereco?.bairro && (
                    <>
                        {'\n'}
                        {tutor.endereco.bairro}
                    </>
                )}

                {!!tutor?.endereco?.cidade && (
                    <>
                        {'\n'}
                        {tutor.endereco.cidade}
                        {tutor?.endereco?.uf
                            ? ` - ${tutor.endereco.uf}`
                            : ''}
                        {tutor?.endereco?.cep
                            ? ` · ${tutor.endereco.cep}`
                            : ''}
                    </>
                )}
            </Text>

            {hasGeo && (
                <View style={styles.mapContainer}>
                    <MapCard
                        lat={lat}
                        lng={lng}
                        title={tutor?.nome || 'Tutor'}
                        height={180}
                        interactive
                    />
                </View>
            )}

            <View style={styles.actionsRow}>
                <Pressable
                    onPress={handleGeocode}
                    disabled={geoLoading}
                    accessibilityRole="button"
                    accessibilityLabel={btnLabel}
                    style={({ pressed }) => [
                        styles.geoButton,
                        {
                            borderColor: border,
                            opacity:
                                geoLoading
                                    ? 0.65
                                    : pressed
                                        ? 0.82
                                        : 1,
                        },
                    ]}
                >
                    {geoLoading ? (
                        <ActivityIndicator
                            size="small"
                            color={success}
                        />
                    ) : (
                        <>
                            <IconSymbol
                                name="location.fill"
                                size={15}
                                color={success}
                            />

                            <Text
                                numberOfLines={1}
                                style={[
                                    styles.geoButtonText,
                                    {
                                        color: success,
                                    },
                                ]}
                            >
                                {btnLabel}
                            </Text>
                        </>
                    )}
                </Pressable>

                {hasGeo && (
                    <Pressable
                        onPress={showNavigationOptions}
                        disabled={navigationLoading}
                        accessibilityRole="button"
                        accessibilityLabel="Abrir rota no aplicativo de mapas"
                        accessibilityHint="Permite escolher Apple Maps, Google Maps, Waze ou navegador"
                        style={({ pressed }) => [
                            styles.navigationButton,
                            {
                                borderColor: border,
                                opacity:
                                    navigationLoading
                                        ? 0.65
                                        : pressed
                                            ? 0.78
                                            : 1,
                            },
                        ]}
                    >
                        {navigationLoading ? (
                            <ActivityIndicator
                                size="small"
                                color={success}
                            />
                        ) : (
                            <IconSymbol
                                name="arrow.triangle.turn.up.right.diamond.fill"
                                size={25}
                                color="#8DC4A1"
                            />
                        )}
                    </Pressable>
                )}
            </View>
        </View>
    );
}

/* ---------- Styles ---------- */

const styles = StyleSheet.create({
    block: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 12,
    },

    blockTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 6,
    },

    addressText: {
        marginBottom: 10,
        fontSize: 14,
        lineHeight: 20,
    },

    mapContainer: {
        marginTop: 2,
        marginBottom: 12,
        borderRadius: 12,
        overflow: 'hidden',
    },

    actionsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },

    geoButton: {
        flex: 1,
        minWidth: 0,
        height: 42,
        borderRadius: 10,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        paddingHorizontal: 12,
        gap: 8,
    },

    geoButtonText: {
        flexShrink: 1,
        fontSize: 13,
        fontWeight: '700',
        textAlign: 'center',
    },

    navigationButton: {
        width: 48,
        height: 42,
        borderRadius: 10,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
});

export default EnderecoCard;