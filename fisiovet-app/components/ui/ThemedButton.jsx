// components/ui/ThemedButton.jsx
import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { useTheme } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';

export default function ThemedButton({
    title,
    onPress,
    variant = 'primary',   // 'primary' | 'secondary' | 'danger'
    style = {},
    textStyle = {},
    disabled = false,
}) {
    const { colors } = useTheme(); // <- pega cores do AppTheme

    const bg =
        disabled
            ? `${colors.text}33` // cinza com transparência
            : variant === 'primary'
                ? colors.success      // 👈 verde do tema
                : variant === 'danger'
                    ? colors.danger
                    : 'transparent';

    const borderColor = variant === 'secondary' ? colors.border : 'transparent';
    const labelColor = variant === 'secondary' ? colors.text : '#fff';

    const handlePress = () => {
        if (disabled) return;
        onPress?.();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    };

    return (
        <Pressable
            onPress={handlePress}
            disabled={disabled}
            style={({ pressed }) => [
                styles.button,
                { backgroundColor: bg, borderColor, opacity: pressed && !disabled ? 0.88 : 1 },
                style,
            ]}
        >
            <Text style={[styles.label, { color: labelColor }, textStyle]}>{title}</Text>
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