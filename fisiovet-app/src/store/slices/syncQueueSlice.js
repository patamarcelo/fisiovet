// src/store/slices/syncQueueSlice.js
import { createSlice, createAsyncThunk, createSelector } from "@reduxjs/toolkit";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "FV_SYNC_QUEUE_V1";

const nowIso = () => new Date().toISOString();

const makeQueueId = () =>
    `queue_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const defaultState = {
    byId: {},
    allIds: [],
    status: "idle",
    error: null,
    lastProcessedAt: null,
};

async function readFromDevice() {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

async function writeToDevice(obj) {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
}

function normalizeQueueItem(payload = {}) {
    const id = String(payload.id || makeQueueId());

    return {
        id,

        provider: payload.provider || "google_calendar",

        // create_event | update_event | delete_event | setup_calendar | send_invite
        action: payload.action || "create_event",

        eventId: payload.eventId ? String(payload.eventId) : null,

        // pending | processing | done | failed
        status: payload.status || "pending",

        attempts: Number.isFinite(Number(payload.attempts))
            ? Number(payload.attempts)
            : 0,

        maxAttempts: Number.isFinite(Number(payload.maxAttempts))
            ? Number(payload.maxAttempts)
            : 5,

        payload: payload.payload || null,

        lastError: payload.lastError || null,

        createdAt: payload.createdAt || nowIso(),
        updatedAt: payload.updatedAt || nowIso(),
        processedAt: payload.processedAt || null,
    };
}

function sortIdsByCreatedAt(byId, allIds) {
    return [...allIds].sort((a, b) => {
        const da = new Date(byId[a]?.createdAt || 0).getTime();
        const db = new Date(byId[b]?.createdAt || 0).getTime();
        return da - db;
    });
}

export const loadSyncQueue = createAsyncThunk("syncQueue/load", async () => {
    const saved = await readFromDevice();

    if (!saved || typeof saved !== "object") {
        await writeToDevice(defaultState);
        return defaultState;
    }

    const byId = saved.byId || {};
    const allIds = Array.isArray(saved.allIds)
        ? saved.allIds.map(String).filter((id) => byId[id])
        : Object.keys(byId);

    return {
        ...defaultState,
        ...saved,
        byId,
        allIds: sortIdsByCreatedAt(byId, allIds),
    };
});

export const persistSyncQueue = createAsyncThunk(
    "syncQueue/persist",
    async (_, { getState }) => {
        const state = getState()?.syncQueue || defaultState;
        await writeToDevice(state);
        return state;
    }
);

export const enqueueSyncTask = createAsyncThunk(
    "syncQueue/enqueue",
    async (payload, { getState }) => {
        const state = getState()?.syncQueue || defaultState;

        const item = normalizeQueueItem(payload);

        const next = {
            ...state,
            byId: {
                ...state.byId,
                [item.id]: item,
            },
            allIds: state.allIds.includes(item.id)
                ? state.allIds
                : [...state.allIds, item.id],
            error: null,
        };

        next.allIds = sortIdsByCreatedAt(next.byId, next.allIds);

        await writeToDevice(next);

        return item;
    }
);

export const updateSyncTask = createAsyncThunk(
    "syncQueue/updateTask",
    async ({ id, patch }, { getState }) => {
        const state = getState()?.syncQueue || defaultState;
        const taskId = String(id);
        const prev = state.byId[taskId];

        if (!prev) {
            throw new Error("Tarefa de sincronização não encontrada.");
        }

        const updated = {
            ...prev,
            ...(patch || {}),
            updatedAt: nowIso(),
        };

        const next = {
            ...state,
            byId: {
                ...state.byId,
                [taskId]: updated,
            },
        };

        await writeToDevice(next);

        return updated;
    }
);

export const markSyncTaskProcessing = createAsyncThunk(
    "syncQueue/markProcessing",
    async (id, { dispatch }) => {
        return dispatch(
            updateSyncTask({
                id,
                patch: {
                    status: "processing",
                },
            })
        ).unwrap();
    }
);

export const markSyncTaskDone = createAsyncThunk(
    "syncQueue/markDone",
    async (id, { dispatch }) => {
        return dispatch(
            updateSyncTask({
                id,
                patch: {
                    status: "done",
                    lastError: null,
                    processedAt: nowIso(),
                },
            })
        ).unwrap();
    }
);

export const markSyncTaskFailed = createAsyncThunk(
    "syncQueue/markFailed",
    async ({ id, error }, { getState }) => {
        const state = getState()?.syncQueue || defaultState;
        const taskId = String(id);
        const prev = state.byId[taskId];

        if (!prev) {
            throw new Error("Tarefa de sincronização não encontrada.");
        }

        const attempts = Number(prev.attempts || 0) + 1;
        const maxAttempts = Number(prev.maxAttempts || 5);

        const status = attempts >= maxAttempts ? "failed" : "pending";

        const updated = {
            ...prev,
            status,
            attempts,
            lastError: error?.message || String(error || "Erro ao sincronizar"),
            updatedAt: nowIso(),
        };

        const next = {
            ...state,
            byId: {
                ...state.byId,
                [taskId]: updated,
            },
        };

        await writeToDevice(next);

        return updated;
    }
);

export const removeSyncTask = createAsyncThunk(
    "syncQueue/remove",
    async (id, { getState }) => {
        const state = getState()?.syncQueue || defaultState;
        const taskId = String(id);

        const nextById = { ...state.byId };
        delete nextById[taskId];

        const next = {
            ...state,
            byId: nextById,
            allIds: state.allIds.filter((x) => String(x) !== taskId),
        };

        await writeToDevice(next);

        return taskId;
    }
);

export const clearDoneSyncTasks = createAsyncThunk(
    "syncQueue/clearDone",
    async (_, { getState }) => {
        const state = getState()?.syncQueue || defaultState;

        const nextById = {};
        const nextAllIds = [];

        for (const id of state.allIds) {
            const item = state.byId[id];

            if (!item || item.status === "done") continue;

            nextById[id] = item;
            nextAllIds.push(id);
        }

        const next = {
            ...state,
            byId: nextById,
            allIds: nextAllIds,
        };

        await writeToDevice(next);

        return next;
    }
);

const syncQueueSlice = createSlice({
    name: "syncQueue",
    initialState: defaultState,

    reducers: {
        resetSyncQueueState: () => defaultState,
    },

    extraReducers: (builder) => {
        builder
            .addCase(loadSyncQueue.pending, (state) => {
                state.status = "loading";
                state.error = null;
            })

            .addCase(loadSyncQueue.fulfilled, (state, action) => {
                return {
                    ...state,
                    ...(action.payload || {}),
                    status: "succeeded",
                    error: null,
                };
            })

            .addCase(loadSyncQueue.rejected, (state, action) => {
                state.status = "failed";
                state.error =
                    action.error?.message || "Erro ao carregar fila de sincronização";
            })

            .addCase(enqueueSyncTask.fulfilled, (state, action) => {
                const item = action.payload;
                state.byId[item.id] = item;

                if (!state.allIds.includes(item.id)) {
                    state.allIds.push(item.id);
                }

                state.allIds = sortIdsByCreatedAt(state.byId, state.allIds);
            })

            .addCase(updateSyncTask.fulfilled, (state, action) => {
                const item = action.payload;
                state.byId[item.id] = item;
            })

            .addCase(markSyncTaskFailed.fulfilled, (state, action) => {
                const item = action.payload;
                state.byId[item.id] = item;
            })

            .addCase(removeSyncTask.fulfilled, (state, action) => {
                const id = String(action.payload);
                delete state.byId[id];
                state.allIds = state.allIds.filter((x) => String(x) !== id);
            })

            .addCase(clearDoneSyncTasks.fulfilled, (state, action) => {
                return {
                    ...state,
                    ...(action.payload || {}),
                };
            });
    },
});

export const { resetSyncQueueState } = syncQueueSlice.actions;
export default syncQueueSlice.reducer;

/* -------- selectors -------- */
export const selectSyncQueueState = (s) => s.syncQueue || defaultState;

export const selectAllSyncTasks = createSelector(
    selectSyncQueueState,
    (queue) => queue.allIds.map((id) => queue.byId[id]).filter(Boolean)
);

export const selectPendingSyncTasks = createSelector(
    selectAllSyncTasks,
    (tasks) => tasks.filter((task) => task.status === "pending")
);

export const selectFailedSyncTasks = createSelector(
    selectAllSyncTasks,
    (tasks) => tasks.filter((task) => task.status === "failed")
);

export const selectGoogleCalendarSyncTasks = createSelector(
    selectAllSyncTasks,
    (tasks) => tasks.filter((task) => task.provider === "google_calendar")
);

export const selectGoogleCalendarPendingCount = createSelector(
    selectGoogleCalendarSyncTasks,
    (tasks) => tasks.filter((task) => task.status === "pending").length
);

export const selectGoogleCalendarFailedCount = createSelector(
    selectGoogleCalendarSyncTasks,
    (tasks) => tasks.filter((task) => task.status === "failed").length
);