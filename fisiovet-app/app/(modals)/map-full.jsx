// app/(modals)/map-full.jsx
import { Stack, useLocalSearchParams } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

export default function MapFull() {
    const { lat, lng, title } = useLocalSearchParams();
    const latitude = Number(lat);
    const longitude = Number(lng);

    return (
        <View style={{ flex: 1 }}>
            <Stack.Screen options={{ title: title || 'Local' }} />
            <MapView
                style={StyleSheet.absoluteFill}
                provider={PROVIDER_GOOGLE}
                initialRegion={{
                    latitude,
                    longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                }}
            >
                <Marker coordinate={{ latitude, longitude }} title={title || 'Local'} />
            </MapView>
        </View>
    );
}