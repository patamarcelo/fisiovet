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
    },
};