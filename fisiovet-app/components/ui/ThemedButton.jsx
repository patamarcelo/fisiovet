import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { useThemeColor } from '@/hooks/useThemeColor';
import * as Haptics from 'expo-haptics';

export default function ThemedButton({ title, onPress, variant = 'primary', style = {}, textStyle = {} }) {
    const tint = useThemeColor({}, 'tint');
    const text = useThemeColor({}, 'text');
    const subtle = useThemeColor({ light: '#6B7280', dark: '#9AA0A6' }, 'text');

    const backgroundColor =
        variant === 'primary'
            ? tint
            : variant === 'secondary'
                ? 'transparent'
                : variant === 'danger'
                    ? '#DC2626'
                    : tint;

    const borderColor =
        variant === 'secondary'
            ? subtle
            : 'transparent';

    const textColor =
        variant === 'primary'
            ? '#fff'
            : variant === 'secondary'
                ? text
                : '#fff';

    const handlerPress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
        onPress()
    }
    return (
        <Pressable
            onPress={handlerPress}
            style={({ pressed }) => [
                styles.button,
                { backgroundColor, borderColor, opacity: pressed ? 0.85 : 1 },
                style,
            ]}
        >
            <Text style={[styles.label, { color: textColor }, textStyle]}>{title}</Text>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    button: {
        marginTop: 12,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 10,
        alignItems: 'center',
        borderWidth: 1,
    },
    label: {
        fontSize: 16,
        fontWeight: '700',
    },
});