// src/store/slices/systemSlice.js
import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'FV_SYSTEM_V1';

const pad2 = (n) => String(n).padStart(2, '0');
const isHHMM = (v) => /^(\d{1,2}):([0-5]\d)$/.test(String(v || ''));
const clampHHMM = (v, fallback = '01:00') => (isHHMM(v) ? v : fallback);

const defaultState = {
    // Configurações de agenda
    defaultDuracao: '01:00',  // HH:MM
    startOfDay: '08:00',      // HH:MM

    // Integrações (exemplos; expanda depois)
    integrations: {
        google: { connected: false, token: null },
        asaas: { enabled: false, apiKey: null },
    },

    // Metadados
    updatedAt: null,
};

async function readFromDevice() {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
}
async function writeToDevice(obj) {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
}

export const loadSystem = createAsyncThunk('system/load', async () => {
    const v = await readFromDevice();
    if (v && typeof v === 'object') return v;
    // primeira vez: grava defaults
    await writeToDevice(defaultState);
    return defaultState;
});

// patch parcial e persistência
export const updateSystem = createAsyncThunk('system/update', async (patch, { getState }) => {
    const state = getState()?.system ?? defaultState;
    // saneamento mínimo
    const next = {
        ...state,
        ...patch,
        defaultDuracao: clampHHMM(patch?.defaultDuracao ?? state.defaultDuracao, '01:00'),
        startOfDay: clampHHMM(patch?.startOfDay ?? state.startOfDay, '08:00'),
        integrations: {
            ...state.integrations,
            ...(patch?.integrations || {}),
        },
        updatedAt: new Date().toISOString(),
    };
    await writeToDevice(next);
    return next;
});

const systemSlice = createSlice({
    name: 'system',
    initialState: defaultState,
    reducers: {
        resetSystem: () => defaultState,
    },
    extraReducers: (builder) => {
        builder
            .addCase(loadSystem.fulfilled, (state, action) => {
                return { ...state, ...(action.payload || {}) };
            })
            .addCase(updateSystem.fulfilled, (state, action) => {
                return { ...state, ...(action.payload || {}) };
            });
    },
});

export const { resetSystem } = systemSlice.actions;
export default systemSlice.reducer;

/* --------- selectors --------- */
export const selectSystem = (s) => s.system || defaultState;
export const selectDefaultDuracao = createSelector(selectSystem, (sys) => sys.defaultDuracao);
export const selectStartOfDay = createSelector(selectSystem, (sys) => sys.startOfDay);