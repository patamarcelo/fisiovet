import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

export default function Avatar({ name = '', uri = '', size = 46, bg = '#E5E7EB', color = '#111' }) {
    const initials = (name || '')
        .trim()
        .split(/\s+/)
        .map((p) => p[0]?.toUpperCase())
        .slice(0, 2)
        .join('') || '?';

    if (uri) {
        return (
            <Image
                source={{ uri }}
                style={[styles.img, { width: size, height: size, borderRadius: size / 2 }]}
            />
        );
    }

    return (
        <View style={[styles.circle, { width: size, height: size, borderRadius: size / 2, backgroundColor: bg }]}>
            <Text style={[styles.initials, { fontSize: size * 0.42, color }]}>{initials}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    img: { backgroundColor: '#ddd' },
    circle: { alignItems: 'center', justifyContent: 'center' },
    initials: { fontWeight: '700' },
});