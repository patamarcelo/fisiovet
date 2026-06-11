// src/store/slices/systemSlice.js
import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'FV_SYSTEM_V1';

const pad2 = (n) => String(n).padStart(2, '0');
const isHHMM = (v) => /^(\d{1,2}):([0-5]\d)$/.test(String(v || ''));
const clampHHMM = (v, fallback = '01:00') => (isHHMM(v) ? v : fallback);

// 🔹 helper pra garantir valor válido
const sanitizeNavPreference = (v, fallback = 'ask') => {
    const allowed = ['google', 'waze', 'ask'];
    if (!v) return fallback;
    return allowed.includes(v) ? v : fallback;
};

const defaultState = {
    // Configurações de agenda
    defaultDuracao: '01:00',  // HH:MM
    startOfDay: '08:00',      // HH:MM

    // Navegação (Google / Waze / Perguntar sempre)
    navPreference: 'ask',     // 'google' | 'waze' | 'ask'

    // Integrações (exemplos; expanda depois)
    integrations: {
        google: { connected: false, token: null },

        googleCalendar: {
            enabled: false,
            connected: false,

            mode: "ics_feed",

            // link secreto do calendário
            feedToken: null,
            feedUrl: null,
            webcalUrl: null,

            // opcional: pode manter email se quiser identificar/mostrar,
            // mas não é necessário para ICS
            email: "",
            inviteEmail: "",

            status: "disabled",
            // disabled | ready | error

            pendingCount: 0,
            failedCount: 0,
            lastSyncAt: null,

            error: null,

            createdAt: null,
            updatedAt: null,
        },

        asaas: { enabled: false, apiKey: null },
    },
    financeiro: {
        showValues: false,
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
    if (v && typeof v === 'object') {
        return {
            ...defaultState,
            ...v,
            integrations: {
                ...defaultState.integrations,
                ...(v.integrations || {}),
                googleCalendar: {
                    ...defaultState.integrations.googleCalendar,
                    ...(v.integrations?.googleCalendar || {}),
                },
                google: {
                    ...defaultState.integrations.google,
                    ...(v.integrations?.google || {}),
                },
                asaas: {
                    ...defaultState.integrations.asaas,
                    ...(v.integrations?.asaas || {}),
                },
            },
            financeiro: {
                ...defaultState.financeiro,
                ...(v.financeiro || {}),
            },
            navPreference: sanitizeNavPreference(v.navPreference, defaultState.navPreference),
        };
    }
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

            google: {
                ...(state.integrations?.google || defaultState.integrations.google),
                ...(patch?.integrations?.google || {}),
            },

            googleCalendar: {
                ...(state.integrations?.googleCalendar || defaultState.integrations.googleCalendar),
                ...(patch?.integrations?.googleCalendar || {}),
            },

            asaas: {
                ...(state.integrations?.asaas || defaultState.integrations.asaas),
                ...(patch?.integrations?.asaas || {}),
            },
        },
        financeiro: {
            ...state.financeiro,
            ...(patch?.financeiro || {}),
        },
        navPreference: sanitizeNavPreference(
            patch?.navPreference ?? state.navPreference ?? defaultState.navPreference
        ),
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

export const selectIntegrations = createSelector(
    selectSystem,
    (sys) => sys.integrations || defaultState.integrations
);

export const selectGoogleCalendarIntegration = createSelector(
    selectIntegrations,
    (integrations) => ({
        ...defaultState.integrations.googleCalendar,
        ...(integrations?.googleCalendar || {}),
    })
);

export const selectIsGoogleCalendarEnabled = createSelector(
    selectGoogleCalendarIntegration,
    (googleCalendar) => Boolean(googleCalendar.enabled)
);

export const selectGoogleCalendarStatus = createSelector(
    selectGoogleCalendarIntegration,
    (googleCalendar) => googleCalendar.status || "disabled"
);


// 🔹 NOVO selector
export const selectNavPreference = createSelector(
    selectSystem,
    (sys) => sys.navPreference ?? 'ask'
);
