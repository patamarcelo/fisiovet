// app/(maps)/map-full-screen.jsx
// @ts-nocheck
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { View, StyleSheet, Platform, Pressable, Linking } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useRef, useEffect, useState } from 'react';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/IconSymbol';
import * as Haptics from 'expo-haptics';



export default function MapFull() {
    const { lat, lng, title } = useLocalSearchParams();
    const latitude = Number(lat);
    const longitude = Number(lng);

    const insets = useSafeAreaInsets();
    const mapRef = useRef(null);
    const [locGranted, setLocGranted] = useState(false);
    const [myLoc, setMyLoc] = useState(null);

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

    const openExternalDirections = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        try {
            const d = `${latitude},${longitude}`;
            const o = myLoc ? `${myLoc.latitude},${myLoc.longitude}` : '';

            if (Platform.OS === 'android') {
                // Tenta navegação direta do Google Maps (abre app)
                const navIntent = `google.navigation:q=${d}&mode=d`;
                const canNav = await Linking.canOpenURL('google.navigation:q=0,0');
                if (canNav) {
                    await Linking.openURL(navIntent);
                    return;
                }
                // Fallback: universal link (abre app se instalado ou web)
                const gmapsWeb = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(d)}${o ? `&origin=${encodeURIComponent(o)}` : ''}&travelmode=driving`;
                await Linking.openURL(gmapsWeb);
                return;
            }

            // iOS: use universal link primeiro (não precisa Info.plist)
            const gmapsUniversal = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(d)}${o ? `&origin=${encodeURIComponent(o)}` : ''}&travelmode=driving`;
            await Linking.openURL(gmapsUniversal);
            // Se o app do GMaps estiver instalado, ele abre; senão, abre no Safari.
        } catch (e) {
            // Último fallback (iOS principalmente): Apple Maps
            try {
                const d = `${latitude},${longitude}`;
                const o = myLoc ? `${myLoc.latitude},${myLoc.longitude}` : '';
                const apple = `http://maps.apple.com/?daddr=${encodeURIComponent(d)}${o ? `&saddr=${encodeURIComponent(o)}` : ''}&dirflg=d`;
                await Linking.openURL(apple);
            } catch (err) {
                console.log('Erro ao abrir direções:', err);
            }
        }
    };


    const goToMyLocation = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
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
            <Stack.Screen options={{ headerShown: false }} />

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
                showsMyLocationButton={false} // vamos usar nosso FAB
            >
                <Marker coordinate={{ latitude, longitude }} title={title || 'Local'} />
            </MapView>

            {/* FAB voltar (topo esquerdo) */}
            <Pressable
                onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                    router.back()
                }}
                style={[
                    styles.fab,
                    {
                        top: (insets.top || 12) + 8,
                        left: 16,
                        right: undefined,
                        bottom: undefined,
                        backgroundColor: 'rgba(0,0,0,0.6)',
                    },
                ]}
                hitSlop={8}
            >
                <IconSymbol name="chevron.backward" size={20} color="#fff" />
            </Pressable>

            {/* FAB direções (inferior direito) */}
            <Pressable
                style={[
                    styles.fab,
                    {
                        bottom: (insets.bottom || 16) + 75,
                        right: 16,
                        backgroundColor: '#8E8E93',
                    },
                ]}
                hitSlop={8}
                onPress={goToMyLocation}>
                <IconSymbol name="location.circle.fill" size={20} color="#fff" />
            </Pressable>

            <Pressable
                onPress={openExternalDirections}
                style={[
                    styles.fab,
                    {
                        bottom: (insets.bottom || 16) + 12,
                        right: 16,
                        backgroundColor: '#0A84FF',
                    },
                ]}
                hitSlop={8}
            >
                <IconSymbol name="arrow.triangle.turn.up.right.circle.fill" size={22} color="#fff" />
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    fab: {
        position: 'absolute',
        padding: 12,
        borderRadius: 24,
        elevation: 3,
        shadowColor: '#000',
        shadowOpacity: 0.25,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
    },
});