import React, { useState, useMemo } from 'react';
import { View, Text, Pressable, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { useDispatch } from 'react-redux';
import { updateTutor } from '@/src/store/slices/tutoresSlice';
import { geocodeAddress } from '@/src/services/geocoding';
import { useThemeColor } from '@/hooks/useThemeColor';
import { IconSymbol } from '@/components/ui/IconSymbol';
import MapCard from '@/components/MapCard';

function EnderecoCard({ tutor }) {
    const dispatch = useDispatch();
    const [geoLoading, setGeoLoading] = useState(false);

    const text = useThemeColor({}, 'text');
    const subtle = useThemeColor({ light: '#6B7280', dark: '#9AA0A6' }, 'text');
    const success = useThemeColor({}, 'success');
    const border = useThemeColor({ light: 'rgba(0,0,0,0.08)', dark: 'rgba(255,255,255,0.08)' }, 'border');
    const bg = useThemeColor({}, 'background');

    const hasGeo = Boolean(tutor?.geo?.lat && tutor?.geo?.lng);
    const btnLabel = hasGeo ? 'Atualizar coordenadas' : 'Obter coordenadas';

    const handleGeocode = async () => {
        if (!tutor?.endereco) {
            Alert.alert('Endereço', 'Não há endereço cadastrado para geocodificar.');
            return;
        }
        setGeoLoading(true);
        try {
            const geo = await geocodeAddress(tutor.endereco);
            await dispatch(updateTutor({ id: tutor.id, patch: { geo } }));
            Alert.alert('Pronto', 'Coordenadas atualizadas com sucesso.');
        } catch (e) {
            Alert.alert('Geocodificação', e?.message || 'Não foi possível obter coordenadas.');
        } finally {
            setGeoLoading(false);
        }
    };

    return (
        <View style={[styles.block, { borderColor: border, backgroundColor: bg }]}>
            <Text style={[styles.blockTitle, { color: text }]}>Endereço</Text>
            <Text style={{ color: subtle, marginBottom: 10 }}>
                {tutor?.endereco?.logradouro} {tutor?.endereco?.numero}{'\n'}
                {tutor?.endereco?.bairro}{'\n'}
                {tutor?.endereco?.cidade} - {tutor?.endereco?.uf} · {tutor?.endereco?.cep}
            </Text>
            {tutor?.geo?.lat && tutor?.geo?.lng ? (
                <View style={{ marginTop: 12, marginBottom: 12 }}>
                    <MapCard lat={tutor.geo.lat} lng={tutor.geo.lng} title={tutor.nome} height={180} 
                    forceGoogleProviderIOS
                    interactive
                    />
                    
                </View>
            ) : null}
            <Pressable
                onPress={handleGeocode}
                disabled={geoLoading}
                style={({ pressed }) => [
                    styles.geoBtn,
                    { borderColor: border, opacity: pressed && !geoLoading ? 0.85 : 1 },
                ]}
            >
                {geoLoading ? (
                    <ActivityIndicator size="small" />
                ) : (
                    <>
                        <IconSymbol name="location.fill" size={14} color={success} />
                        <Text style={{ color: success, fontWeight: '700' }}>{btnLabel}</Text>
                    </>
                )}
            </Pressable>
        </View>
    );
}

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
    geoBtn: {
        height: 40,
        borderRadius: 10,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 8,
    },
});

export default EnderecoCard;