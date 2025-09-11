// components/MapCard.jsx
import React, { useEffect, useMemo, useRef } from 'react';
import { View, Pressable, StyleSheet, Platform, Text } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useThemeColor } from '@/hooks/useThemeColor';
import { IconSymbol } from '@/components/ui/IconSymbol';
import * as Linking from 'expo-linking';

/**
 * Props:
 * - lat, lng: números
 * - title: string
 * - height: número (px)
 * - onPressOpenMaps: função opcional
 * - interactive: boolean (default false) -> permite gestos no card
 * - forceGoogleProviderIOS: boolean (default false) -> usar Google no iOS (requer Dev Client + API key nativa)
 */
export default function MapCard({
    lat,
    lng,
    title,
    onPressOpenMaps,
    height = 160,
    interactive = false,
    forceGoogleProviderIOS = false,
}) {
    const border = useThemeColor({ light: 'rgba(0,0,0,0.08)', dark: 'rgba(255,255,255,0.08)' }, 'border');
    const bg = useThemeColor({ light: '#FFFFFF', dark: '#1C1C1E' }, 'background');

    const region = useMemo(() => {
        if (typeof lat !== 'number' || typeof lng !== 'number') return null;
        return { latitude: lat, longitude: lng, latitudeDelta: 0.01, longitudeDelta: 0.01 };
    }, [lat, lng]);

    // ⚠️ Provider:
    // - Android: Google
    // - iOS: Apple por padrão (funciona em Expo Go). Se você estiver em Dev Client com SDK configurado, ative forceGoogleProviderIOS.
    const provider = Platform.select({
        android: PROVIDER_GOOGLE,
        ios: forceGoogleProviderIOS ? PROVIDER_GOOGLE : undefined,
        default: undefined,
    });

    const mapRef = useRef(null);

    // Quando as coords mudarem (ex.: depois de geocodificar), anima o mapa para a nova região
    useEffect(() => {
        if (!region || !mapRef.current) return;
        try {
            mapRef.current.animateToRegion(region, 600);
        } catch { }
    }, [region]);

    const openMaps = () => {
        if (!lat || !lng) return;
        if (onPressOpenMaps) return onPressOpenMaps();
        const url = Platform.select({
            ios: `http://maps.apple.com/?ll=${lat},${lng}&q=${encodeURIComponent(title || 'Local')}`,
            android: `geo:${lat},${lng}?q=${lat},${lng}(${encodeURIComponent(title || 'Local')})`,
            default: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
        });
        Linking.openURL(url);
    };

    if (!region) {
        return (
            <View style={[styles.card, { borderColor: border, backgroundColor: bg, height }]} accessible accessibilityLabel="Mapa indisponível">
                <View style={styles.empty}>
                    <IconSymbol name="mappin.slash" size={18} color="#999" />
                    <Text style={{ color: '#999', marginTop: 6 }}>Sem coordenadas</Text>
                </View>
            </View>
        );
    }

    // Se não for interativo, deixamos pointerEvents="none" no MapView e usamos o Pressable por fora.
    const MapContainer = interactive ? View : Pressable;
    const mapProps = interactive
        ? {}
        : { onPress: openMaps, accessibilityRole: 'button', accessibilityLabel: 'Abrir no app de mapas' };

    return (
        <MapContainer style={({ pressed }) => [!interactive && { opacity: pressed ? 0.95 : 1 }]} {...mapProps}>
            <View style={[styles.card, { borderColor: border, height }]}>

                {/* <MapView
                    ref={mapRef}
                    style={StyleSheet.absoluteFill}
                    provider={provider}
                    initialRegion={region}
                    pointerEvents={interactive ? 'auto' : 'none'}
                    toolbarEnabled={false}
                    zoomTapEnabled={interactive}
                    zoomEnabled={interactive}
                    scrollEnabled={interactive}
                    rotateEnabled={interactive}
                    pitchEnabled={interactive}
                    loadingEnabled
                    loadingIndicatorColor="#999"
                    moveOnMarkerPress={false}
                    {...(Platform.OS === 'android' && !interactive ? { liteMode: true } : {})}
                >
                    <Marker coordinate={region} title={title || 'Local'} />
                </MapView> */}

                {!interactive && (
                    <View style={styles.badge}>
                        <IconSymbol name="location.fill" size={12} color="#fff" />
                        <Text style={styles.badgeText}>Abrir no mapa</Text>
                    </View>
                )}
            </View>
        </MapContainer>
    );
}

const styles = StyleSheet.create({
    card: {
        borderWidth: 1,
        borderRadius: 12,
        overflow: 'hidden',
    },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    badge: {
        position: 'absolute',
        bottom: 8,
        right: 8,
        backgroundColor: 'rgba(0,0,0,0.55)',
        borderRadius: 16,
        paddingHorizontal: 10,
        paddingVertical: 6,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    badgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
});