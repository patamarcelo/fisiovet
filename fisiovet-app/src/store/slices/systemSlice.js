// src/store/slices/systemSlice.js

import {
    createSlice,
    createAsyncThunk,
    createSelector,
} from '@reduxjs/toolkit';

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'FV_SYSTEM_V1';

export const DEFAULT_WHATSAPP_CONFIRMATION_MESSAGE = `Olá! 😊

Passando para confirmar a sessão do(a) [Nome do Pet] no dia [data], às [horário].

Caso haja necessidade de alteração ou cancelamento, peço a gentileza de avisar com antecedência.

Qualquer dúvida, estou à disposição. 🐾`;

const isHHMM = (value) =>
    /^(\d{1,2}):([0-5]\d)$/.test(
        String(value || '')
    );

const clampHHMM = (
    value,
    fallback = '01:00'
) => {
    return isHHMM(value)
        ? value
        : fallback;
};

const sanitizeNavPreference = (
    value,
    fallback = 'ask'
) => {
    const allowed = [
        'google',
        'waze',
        'ask',
    ];

    if (!value) {
        return fallback;
    }

    return allowed.includes(value)
        ? value
        : fallback;
};

const sanitizeWhatsappMessage = (
    value,
    fallback = DEFAULT_WHATSAPP_CONFIRMATION_MESSAGE
) => {
    if (
        typeof value !== 'string'
    ) {
        return fallback;
    }

    const normalized =
        value.trim();

    return normalized ||
        fallback;
};

const defaultState = {
    defaultDuracao: '01:00',
    startOfDay: '08:00',

    navPreference: 'ask',

    whatsapp: {
        confirmationMessage:
            DEFAULT_WHATSAPP_CONFIRMATION_MESSAGE,
    },

    integrations: {
        google: {
            connected: false,
            token: null,
        },

        googleCalendar: {
            enabled: false,
            connected: false,

            mode: 'ics_feed',

            feedToken: null,
            feedUrl: null,
            webcalUrl: null,

            email: '',
            inviteEmail: '',

            status: 'disabled',

            pendingCount: 0,
            failedCount: 0,
            lastSyncAt: null,

            error: null,

            createdAt: null,
            updatedAt: null,
        },

        asaas: {
            enabled: false,
            apiKey: null,
        },
    },

    financeiro: {
        showValues: false,
        includePendingEvents: true,
    },

    updatedAt: null,
};

async function readFromDevice() {
    const raw =
        await AsyncStorage.getItem(
            STORAGE_KEY
        );

    if (!raw) {
        return null;
    }

    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

async function writeToDevice(
    object
) {
    await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(object)
    );
}

function mergeWithDefaults(
    value
) {
    if (
        !value ||
        typeof value !== 'object'
    ) {
        return defaultState;
    }

    return {
        ...defaultState,
        ...value,

        integrations: {
            ...defaultState.integrations,
            ...(value.integrations || {}),

            google: {
                ...defaultState.integrations.google,
                ...(value.integrations
                    ?.google || {}),
            },

            googleCalendar: {
                ...defaultState.integrations
                    .googleCalendar,
                ...(value.integrations
                    ?.googleCalendar || {}),
            },

            asaas: {
                ...defaultState.integrations.asaas,
                ...(value.integrations
                    ?.asaas || {}),
            },
        },

        financeiro: {
            ...defaultState.financeiro,
            ...(value.financeiro || {}),
        },

        whatsapp: {
            ...defaultState.whatsapp,
            ...(value.whatsapp || {}),

            confirmationMessage:
                sanitizeWhatsappMessage(
                    value.whatsapp
                        ?.confirmationMessage,
                    defaultState.whatsapp
                        .confirmationMessage
                ),
        },

        navPreference:
            sanitizeNavPreference(
                value.navPreference,
                defaultState.navPreference
            ),
    };
}

export const loadSystem =
    createAsyncThunk(
        'system/load',
        async () => {
            const value =
                await readFromDevice();

            if (
                value &&
                typeof value === 'object'
            ) {
                return mergeWithDefaults(
                    value
                );
            }

            await writeToDevice(
                defaultState
            );

            return defaultState;
        }
    );

export const updateSystem =
    createAsyncThunk(
        'system/update',
        async (
            patch,
            {
                getState,
            }
        ) => {
            const currentState =
                getState()?.system ??
                defaultState;

            const next = {
                ...currentState,
                ...patch,

                defaultDuracao:
                    clampHHMM(
                        patch?.defaultDuracao ??
                            currentState.defaultDuracao,
                        '01:00'
                    ),

                startOfDay:
                    clampHHMM(
                        patch?.startOfDay ??
                            currentState.startOfDay,
                        '08:00'
                    ),

                integrations: {
                    ...defaultState.integrations,
                    ...(currentState.integrations ||
                        {}),
                    ...(patch?.integrations ||
                        {}),

                    google: {
                        ...defaultState
                            .integrations.google,
                        ...(currentState
                            .integrations
                            ?.google || {}),
                        ...(patch?.integrations
                            ?.google || {}),
                    },

                    googleCalendar: {
                        ...defaultState
                            .integrations
                            .googleCalendar,
                        ...(currentState
                            .integrations
                            ?.googleCalendar ||
                            {}),
                        ...(patch?.integrations
                            ?.googleCalendar ||
                            {}),
                    },

                    asaas: {
                        ...defaultState
                            .integrations.asaas,
                        ...(currentState
                            .integrations
                            ?.asaas || {}),
                        ...(patch?.integrations
                            ?.asaas || {}),
                    },
                },

                financeiro: {
                    ...defaultState.financeiro,
                    ...(currentState.financeiro ||
                        {}),
                    ...(patch?.financeiro ||
                        {}),
                },

                whatsapp: {
                    ...defaultState.whatsapp,
                    ...(currentState.whatsapp ||
                        {}),
                    ...(patch?.whatsapp || {}),

                    confirmationMessage:
                        sanitizeWhatsappMessage(
                            patch?.whatsapp
                                ?.confirmationMessage ??
                                currentState
                                    ?.whatsapp
                                    ?.confirmationMessage,
                            defaultState.whatsapp
                                .confirmationMessage
                        ),
                },

                navPreference:
                    sanitizeNavPreference(
                        patch?.navPreference ??
                            currentState.navPreference ??
                            defaultState.navPreference
                    ),

                updatedAt:
                    new Date().toISOString(),
            };

            await writeToDevice(next);

            return next;
        }
    );

const systemSlice =
    createSlice({
        name: 'system',

        initialState:
            defaultState,

        reducers: {
            resetSystem: () =>
                defaultState,
        },

        extraReducers:
            (builder) => {
                builder
                    .addCase(
                        loadSystem.fulfilled,
                        (
                            state,
                            action
                        ) => {
                            return mergeWithDefaults(
                                action.payload
                            );
                        }
                    )

                    .addCase(
                        updateSystem.fulfilled,
                        (
                            state,
                            action
                        ) => {
                            return mergeWithDefaults(
                                action.payload
                            );
                        }
                    );
            },
    });

export const {
    resetSystem,
} = systemSlice.actions;

export default systemSlice.reducer;

/* ---------- Selectors ---------- */

export const selectSystem =
    (state) =>
        state.system ||
        defaultState;

export const selectDefaultDuracao =
    createSelector(
        selectSystem,
        (system) =>
            system.defaultDuracao
    );

export const selectStartOfDay =
    createSelector(
        selectSystem,
        (system) =>
            system.startOfDay
    );

export const selectIntegrations =
    createSelector(
        selectSystem,
        (system) =>
            system.integrations ||
            defaultState.integrations
    );

export const selectGoogleCalendarIntegration =
    createSelector(
        selectIntegrations,
        (integrations) => ({
            ...defaultState
                .integrations
                .googleCalendar,

            ...(integrations
                ?.googleCalendar ||
                {}),
        })
    );

export const selectIsGoogleCalendarEnabled =
    createSelector(
        selectGoogleCalendarIntegration,
        (googleCalendar) =>
            Boolean(
                googleCalendar.enabled
            )
    );

export const selectGoogleCalendarStatus =
    createSelector(
        selectGoogleCalendarIntegration,
        (googleCalendar) =>
            googleCalendar.status ||
            'disabled'
    );

export const selectNavPreference =
    createSelector(
        selectSystem,
        (system) =>
            system.navPreference ??
            'ask'
    );

export const selectWhatsappSettings =
    createSelector(
        selectSystem,
        (system) => ({
            ...defaultState.whatsapp,
            ...(system.whatsapp ||
                {}),
        })
    );

export const selectWhatsappConfirmationMessage =
    createSelector(
        selectWhatsappSettings,
        (whatsapp) =>
            whatsapp.confirmationMessage ||
            DEFAULT_WHATSAPP_CONFIRMATION_MESSAGE
    );