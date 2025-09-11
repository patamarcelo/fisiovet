import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 'system' | 'light' | 'dark'
const STORAGE_KEY = '@fv_color_mode';

const Ctx = createContext(null);

export function ColorSchemeProvider({ children }) {
    const [mode, setMode] = useState('system'); // preferência do usuário
    const [systemScheme, setSystemScheme] = useState(Appearance.getColorScheme() || 'light');

    // carrega preferência salva
    useEffect(() => {
        (async () => {
            const saved = await AsyncStorage.getItem(STORAGE_KEY);
            if (saved === 'light' || saved === 'dark' || saved === 'system') setMode(saved);
        })();
    }, []);

    // ouve mudanças do sistema
    useEffect(() => {
        const sub = Appearance.addChangeListener(({ colorScheme }) => {
            setSystemScheme(colorScheme || 'light');
        });
        return () => sub.remove();
    }, []);

    const scheme = mode === 'system' ? systemScheme : mode;

    const setColorMode = useCallback(async (nextMode) => {
        const normalized = ['light', 'dark', 'system'].includes(nextMode) ? nextMode : 'system';
        setMode(normalized);
        await AsyncStorage.setItem(STORAGE_KEY, normalized);
    }, []);

    const value = useMemo(() => ({ mode, scheme, setColorMode }), [mode, scheme, setColorMode]);

    return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useColorMode() {
    const ctx = useContext(Ctx);
    if (!ctx) throw new Error('useColorMode must be used within ColorSchemeProvider');
    return ctx; // { mode, scheme, setColorMode }
}