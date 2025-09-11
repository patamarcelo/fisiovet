import React from 'react';
import { TextInput, StyleSheet } from 'react-native';
import { useThemeColor } from '@/hooks/useThemeColor';

export default function ThemedTextInput(props) {
    const text = useThemeColor({}, 'text');
    const subtle = useThemeColor({ light: '#6B7280', dark: '#9AA0A6' }, 'text');
    const border = useThemeColor({ light: 'rgba(0,0,0,0.12)', dark: 'rgba(255,255,255,0.12)' }, 'border');

    return (
        <TextInput
            {...props}
            placeholderTextColor={subtle}
            style={[
                styles.input,
                { color: text, borderColor: border },
                props.style,
            ]}
        />
    );
}

const styles = StyleSheet.create({
    input: {
        borderWidth: 1,
        padding: 10,
        borderRadius: 10,
        fontSize: 16,
    },
});