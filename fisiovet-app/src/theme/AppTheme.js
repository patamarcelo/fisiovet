// src/theme/AppTheme.js
import { DarkTheme, DefaultTheme } from '@react-navigation/native';

export const LightAppTheme = {
    ...DefaultTheme,
    colors: {
        ...DefaultTheme.colors,
        background: '#F9FAFB',
        card: '#FFFFFF',
        border: '#E5E7EB',
        text: '#111827',
        primary: '#037AFF',
        // 👇 novos tokens
        tint: '#037AFF',      // alias p/ compat (antigo "tint")
        success: '#16A34A',   // verde forte
        danger: '#DC2626',    // vermelho
    },
};

export const DarkAppTheme = {
    ...DarkTheme,
    colors: {
        ...DarkTheme.colors,
        background: '#0c0c0c',
        card: '#121314',
        border: 'rgba(255,255,255,0.08)',
        text: '#E5E7EB',
        primary: '#4DA3FF',
        // 👇 novos tokens
        tint: '#4DA3FF',     // alias p/ compat
        success: '#22C55E',  // verde mais vivo no dark
        danger: '#F87171',   // vermelho no dark
    },
};