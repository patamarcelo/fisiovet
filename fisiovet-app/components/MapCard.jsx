// components/MapCard.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Pressable, StyleSheet, Platform, Text } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useThemeColor } from '@/hooks/useThemeColor';
import { IconSymbol } from '@/components/ui/IconSymbol';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import * as Location from 'expo-location';

export default function MapCard({
    lat,
    lng,
    title,
    onPressOpenMaps,
    height = 160,
    interactive = false,
    forceGoogleProviderIOS = false,
    showUserLocation = true,      // ✅ novo: mostra o pontinho azul
    enableRecenterButton = true,  // ✅ novo: FAB para recentralizar
}) {
    const border = useThemeColor({ light: 'rgba(0,0,0,0.08)', dark: 'rgba(255,255,255,0.08)' }, 'border');
    const bg = useThemeColor({ light: '#FFFFFF', dark: '#1C1C1E' }, 'background');
    const [locGranted, setLocGranted] = useState(false);
    const [myLoc, setMyLoc] = useState(null); // { latitude, longitude }

    // 🔐 Permissão e leitura da localização do usuário (quando habilitado)
    useEffect(() => {
        let sub;
        (async () => {
            if (!showUserLocation) return;
            const { status } = await Location.requestForegroundPermissionsAsync();
            const granted = status === 'granted';
            setLocGranted(granted);
            if (!granted) return;
            // pega posição inicial
            const pos = await Location.getCurrentPositionAsync({});
            setMyLoc({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
            // opcional: acompanhar mudanças (leve)
            sub = await Location.watchPositionAsync(
                { accuracy: Location.Accuracy.Balanced, distanceInterval: 25 },
                (p) => setMyLoc({ latitude: p.coords.latitude, longitude: p.coords.longitude })
            );
        })();
        return () => sub?.remove?.();
    }, [showUserLocation]);

    const goToMyLocation = async () => {
        try {
            if (!locGranted) {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') return;
                setLocGranted(true);
            }
            let coords = myLoc;
            if (!coords) {
                const pos = await Location.getCurrentPositionAsync({});
                coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
                setMyLoc(coords);
            }
            // aproxima um pouco
            mapRef.current?.animateToRegion(
                { ...coords, latitudeDelta: 0.005, longitudeDelta: 0.005 },
                500
            );
        } catch { }
    };

    const region = useMemo(() => {
        if (typeof lat !== 'number' || typeof lng !== 'number') return null;
        return { latitude: lat, longitude: lng, latitudeDelta: 0.01, longitudeDelta: 0.01 };
    }, [lat, lng]);

    // Provider:
    const provider = Platform.select({
        android: PROVIDER_GOOGLE,
        ios: forceGoogleProviderIOS ? PROVIDER_GOOGLE : undefined,
        default: undefined,
    });

    const mapRef = useRef(null);

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
            ios: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
            android: `geo:${lat},${lng}?q=${lat},${lng}(${encodeURIComponent(title || 'Local')})`,
            default: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
        });
        Linking.openURL(url);
    };

    const openFullScreen = () => {
        if (lat == null || lng == null) return;
        router.push({
            pathname: '/(modals)/map-full',
            params: { lat: String(lat), lng: String(lng), title: title ?? '' },
        });
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

    // Se não for interativo, o card inteiro abre o app de mapas.
    const MapContainer = interactive ? View : Pressable;
    const mapProps = interactive
        ? {}
        : { onPress: openMaps, accessibilityRole: 'button', accessibilityLabel: 'Abrir no app de mapas' };

    return (
        <MapContainer {...mapProps} style={({ pressed }) => [!interactive && { opacity: pressed ? 0.95 : 1 }]}>
            <View style={[styles.card, { borderColor: border, height }]}>
                <MapView
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
                    showsUserLocation={showUserLocation && locGranted}
                    showsMyLocationButton={Platform.OS === 'android' && interactive}
                    {...(Platform.OS === 'android' && !interactive ? { liteMode: true } : {})}
                >
                    <Marker coordinate={region} title={title || 'Local'} />
                </MapView>

                {interactive ? (
                    <View style={styles.fabRow}>
                        <Pressable style={styles.fab} onPress={openFullScreen} accessibilityRole="button" accessibilityLabel="Abrir mapa em tela cheia">
                            <IconSymbol name="arrow.up.left.and.arrow.down.right" size={14} color="#fff" />
                        </Pressable>
                        {enableRecenterButton && (
                            <Pressable style={styles.fab} onPress={goToMyLocation} accessibilityRole="button" accessibilityLabel="Ir para minha localização">
                                <IconSymbol name="location.circle.fill" size={14} color="#fff" />
                            </Pressable>
                        )}
                    </View>
                ) : (
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

    // FABs para modo interativo
    fabRow: {
        position: 'absolute',
        right: 8,
        bottom: 8,
        gap: 8,
        flexDirection: 'row',
    },
    fab: {
        backgroundColor: 'rgba(0,0,0,0.6)',
        borderRadius: 18,
        paddingHorizontal: 10,
        paddingVertical: 8,
    },
});