import React from 'react';
import { View, Pressable, StyleSheet, Platform, Text } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useThemeColor } from '@/hooks/useThemeColor';
import { IconSymbol } from '@/components/ui/IconSymbol';
import * as Linking from 'expo-linking';

export default function MapCard({ lat, lng, title, onPressOpenMaps, height = 160 }) {
    const border = useThemeColor({ light: 'rgba(0,0,0,0.08)', dark: 'rgba(255,255,255,0.08)' }, 'border');
    const bg = useThemeColor({ light: '#FFFFFF', dark: '#1C1C1E' }, 'background');

    const region = lat && lng
        ? { latitude: lat, longitude: lng, latitudeDelta: 0.01, longitudeDelta: 0.01 }
        : null;

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
            <View style={[styles.card, { borderColor: border, backgroundColor: bg, height }]}>
                <View style={styles.empty}>
                    <IconSymbol name="mappin.slash" size={18} color="#999" />
                    <Text style={{ color: '#999', marginTop: 6 }}>Sem coordenadas</Text>
                </View>
            </View>
        );
    }

    return (
        <Pressable onPress={openMaps} style={({ pressed }) => [{ opacity: pressed ? 0.95 : 1 }]}>
            <View style={[styles.card, { borderColor: border, height }]}>
                <MapView
                    style={StyleSheet.absoluteFill}
                    provider={PROVIDER_GOOGLE} // usa Google se disponível
                    initialRegion={region}
                    pointerEvents="none"       // evita rolagem conflitar; toque abre app de mapas
                >
                    <Marker coordinate={region} title={title || 'Local'} />
                </MapView>
                <View style={styles.badge}>
                    <IconSymbol name="location.fill" size={12} color="#fff" />
                    <Text style={styles.badgeText}>Abrir no mapa</Text>
                </View>
            </View>
        </Pressable>
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