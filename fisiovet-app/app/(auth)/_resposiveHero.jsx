// components/ResponsiveHero.jsx
// @ts-nocheck
import React from 'react';
import { ImageBackground, View, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from 'react-native';

export default function ResponsiveHero({
    source,          // require('@/assets/images/fisiovet-hero.png')
    children,        // conteúdo por cima (cartão, etc.)
    fullScreen = true, // true = cobre a tela toda; false = banner de topo
    overlay = true,    // liga/desliga camada de contraste
    radius = 24,       // arredondamento quando NÃO for fullscreen
}) {
    const insets = useSafeAreaInsets();
    const scheme = useColorScheme();

    if (fullScreen) {
        return (
            <ImageBackground
                source={source}
                resizeMode="cover"
                style={{
                    flex: 1,
                    paddingTop: Platform.OS === 'ios' ? insets.top : 0,
                    paddingBottom: Platform.OS === 'ios' ? insets.bottom : 0,
                }}
            >
                {overlay && (
                    <View
                        pointerEvents="none"
                        style={[
                            StyleSheet.absoluteFill,
                            // overlay suave para garantir contraste independente da imagem
                            { backgroundColor: scheme === 'dark' ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.10)' },
                        ]}
                    />
                )}
                {children}
            </ImageBackground>
        );
    }

    // Modo banner (altura responsiva)
    return (
        <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
            <ImageBackground
                source={source}
                resizeMode="cover"
                style={{
                    // regra responsiva de altura
                    height: 220,              // base
                    borderRadius: radius,
                    overflow: 'hidden',
                }}
                imageStyle={{ borderRadius: radius }}
            >
                {overlay && (
                    <View
                        pointerEvents="none"
                        style={[
                            StyleSheet.absoluteFill,
                            { backgroundColor: scheme === 'dark' ? 'rgba(0,0,0,0.22)' : 'rgba(0,0,0,0.08)' },
                        ]}
                    />
                )}
                {children}
            </ImageBackground>
        </View>
    );
}