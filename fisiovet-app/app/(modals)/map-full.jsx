// app/(modals)/map-full.jsx
import { Stack, useLocalSearchParams } from 'expo-router';
import { View, StyleSheet, Platform, Pressable } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useRef, useEffect, useState } from 'react';
import * as Location from 'expo-location';
import { IconSymbol } from '@/components/ui/IconSymbol';

export default function MapFull() {
    const { lat, lng, title } = useLocalSearchParams();
    const latitude = Number(lat);
    const longitude = Number(lng);

    const mapRef = useRef(null);
    const [locGranted, setLocGranted] = useState(false);
    const [myLoc, setMyLoc] = useState(null);

    // Pede permissão e acompanha posição
    useEffect(() => {
        let sub;
        (async () => {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') return;
            setLocGranted(true);

            const pos = await Location.getCurrentPositionAsync({});
            setMyLoc({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });

            sub = await Location.watchPositionAsync(
                { accuracy: Location.Accuracy.Balanced, distanceInterval: 25 },
                (p) => setMyLoc({ latitude: p.coords.latitude, longitude: p.coords.longitude })
            );
        })();
        return () => sub?.remove?.();
    }, []);

    const goToMyLocation = async () => {
        try {
            let coords = myLoc;
            if (!coords) {
                const pos = await Location.getCurrentPositionAsync({});
                coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
                setMyLoc(coords);
            }
            mapRef.current?.animateToRegion(
                { ...coords, latitudeDelta: 0.005, longitudeDelta: 0.005 },
                500
            );
        } catch { }
    };

    return (
        <View style={{ flex: 1 }}>
            <Stack.Screen options={{ title: title || 'Local' }} />
            <MapView
                ref={mapRef}
                style={StyleSheet.absoluteFill}
                provider={PROVIDER_GOOGLE}
                initialRegion={{
                    latitude,
                    longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                }}
                showsUserLocation={locGranted}
                showsMyLocationButton={Platform.OS === 'android'}
            >
                <Marker coordinate={{ latitude, longitude }} title={title || 'Local'} />
            </MapView>

            {/* FAB para recentralizar (iOS e Android) */}
            <Pressable style={styles.fab} onPress={goToMyLocation}>
                <IconSymbol name="location.circle.fill" size={20} color="#fff" />
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    fab: {
        position: 'absolute',
        bottom: 20,
        right: 20,
        backgroundColor: 'rgba(0,0,0,0.7)',
        borderRadius: 24,
        padding: 12,
    },
});