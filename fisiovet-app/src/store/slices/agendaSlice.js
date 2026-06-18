// src/store/slices/agendaSlice.js
// @ts-nocheck

import {
    createAsyncThunk,
    createSelector,
    createSlice,
} from "@reduxjs/toolkit";

import {
    listEventos as svcListEventos,
    createEvento as svcCreateEvento,
    updateEvento as svcUpdateEvento,
    removeEvento as svcRemoveEvento,
} from "@/src/services/agenda";

import {
    enqueueSyncTask,
} from "@/src/store/slices/syncQueueSlice";

import {
    selectGoogleCalendarIntegration,
} from "@/src/store/slices/systemSlice";

/* ---------------- helpers ---------------- */

const pad2 =
    (value) =>
        String(value).padStart(
            2,
            "0"
        );

const toLocalIsoNoTZ =
    (date) =>
        `${date.getFullYear()}-${pad2(
            date.getMonth() + 1
        )}-${pad2(
            date.getDate()
        )}T${pad2(
            date.getHours()
        )}:${pad2(
            date.getMinutes()
        )}:${pad2(
            date.getSeconds()
        )}`;

const hhmmToMinutes =
    (value) => {
        const match =
            String(value || "").match(
                /^(\d{1,2}):([0-5]\d)$/
            );

        if (!match) {
            return 60;
        }

        return (
            parseInt(
                match[1],
                10
            ) *
            60 +
            parseInt(
                match[2],
                10
            )
        );
    };

const ensureStringId =
    (value) =>
        value == null
            ? null
            : String(value);

const toDateLocal =
    (value) => {
        if (value?.toDate) {
            return value.toDate();
        }

        if (
            value instanceof Date
        ) {
            return value;
        }

        if (
            typeof value ===
            "number"
        ) {
            return new Date(
                value < 1e12
                    ? value * 1000
                    : value
            );
        }

        return new Date(value);
    };

const isValidDate =
    (date) =>
        date instanceof Date &&
        !Number.isNaN(
            date.getTime()
        );

function hasUsableDateValue(
    value
) {
    if (
        value == null ||
        value === ""
    ) {
        return false;
    }

    if (
        value instanceof Date
    ) {
        return isValidDate(
            value
        );
    }

    if (
        typeof value ===
        "string" ||
        typeof value ===
        "number"
    ) {
        return isValidDate(
            toDateLocal(value)
        );
    }

    if (
        typeof value?.toDate ===
        "function"
    ) {
        try {
            return isValidDate(
                value.toDate()
            );
        } catch {
            return false;
        }
    }

    return false;
}

function buildStartEndFrom(
    dateLike,
    duration
) {
    const startDate =
        toDateLocal(
            dateLike
        );

    if (
        !isValidDate(
            startDate
        )
    ) {
        console.warn(
            "⚠️ buildStartEndFrom: data inválida recebida ->",
            dateLike
        );

        return null;
    }

    const endDate =
        new Date(
            startDate
        );

    endDate.setMinutes(
        endDate.getMinutes() +
        hhmmToMinutes(
            duration ||
            "1:00"
        )
    );

    return {
        start:
            toLocalIsoNoTZ(
                startDate
            ),

        end:
            toLocalIsoNoTZ(
                endDate
            ),
    };
}

function isGoogleCalendarEnabled(
    state
) {
    const googleCalendar =
        selectGoogleCalendarIntegration(
            state
        );

    return Boolean(
        googleCalendar?.enabled &&
        googleCalendar?.status !==
        "disabled" &&
        googleCalendar?.feedToken
    );
}

function buildGoogleAgendaDisabled() {
    return {
        enabled: false,
        calendarId: null,
        eventId: null,
        htmlLink: null,
        syncStatus: "disabled",
        lastAction: null,
        syncedAt: null,
        error: null,
    };
}

function buildGoogleAgendaPending(
    action,
    previous = {}
) {
    return {
        enabled: true,

        calendarId:
            previous?.calendarId ??
            null,

        eventId:
            previous?.eventId ??
            null,

        htmlLink:
            previous?.htmlLink ??
            null,

        syncStatus:
            "pending",

        lastAction:
            action,

        syncedAt:
            previous?.syncedAt ??
            null,

        error: null,
    };
}

async function enqueueGoogleTaskSafe(
    dispatch,
    task
) {
    try {
        await dispatch(
            enqueueSyncTask(task)
        ).unwrap();

        return true;
    } catch (error) {
        console.warn(
            "⚠️ Não foi possível adicionar task na syncQueue:",
            error
        );

        return false;
    }
}

function sanitizeEvento(
    previousValue,
    patchOrNew
) {
    const nowIso =
        new Date().toISOString();

    const previous =
        previousValue || {};

    const incoming =
        patchOrNew || {};

    const next = {
        ...previous,
        ...incoming,

        financeiro: {
            ...(previous.financeiro ||
                {}),
            ...(incoming.financeiro ||
                {}),
        },

        googleAgenda: {
            ...(previous.googleAgenda ||
                {}),
            ...(incoming.googleAgenda ||
                {}),
        },

        petIds:
            Array.isArray(
                incoming.petIds
            )
                ? [
                    ...incoming.petIds,
                ]
                : Array.isArray(
                    previous.petIds
                )
                    ? [
                        ...previous.petIds,
                    ]
                    : [],
    };

    next.id =
        ensureStringId(
            next.id
        ) ||
        `${Date.now()}-${Math.random()
            .toString(36)
            .slice(2, 8)}`;

    next.tutorId =
        ensureStringId(
            next.tutorId
        );

    next.petIds =
        next.petIds.map(
            (item) =>
                String(item)
        );

    if (!next.status) {
        next.status =
            "pendente";
    }

    if (
        !next.financeiro ||
        typeof next.financeiro !==
        "object" ||
        Array.isArray(
            next.financeiro
        )
    ) {
        next.financeiro =
            {};
    }

    if (
        next.preco != null &&
        next.financeiro
            .preco == null
    ) {
        next.financeiro.preco =
            next.preco;

        delete next.preco;
    }

    if (
        next.financeiro
            .preco != null
    ) {
        const normalizedPrice =
            String(
                next.financeiro
                    .preco
            )
                .replace(
                    /\./g,
                    ""
                )
                .replace(
                    ",",
                    "."
                );

        const numericPrice =
            Number(
                normalizedPrice
            );

        next.financeiro.preco =
            Number.isFinite(
                numericPrice
            )
                ? Math.max(
                    0,
                    numericPrice
                )
                : 0;
    }

    if (
        typeof next.financeiro
            .pago !==
        "boolean"
    ) {
        next.financeiro.pago =
            false;
    }

    if (
        next.financeiro
            .comprovanteUrl ==
        null
    ) {
        next.financeiro.comprovanteUrl =
            null;
    }

    if (
        !next.googleAgenda ||
        typeof next.googleAgenda !==
        "object" ||
        Array.isArray(
            next.googleAgenda
        )
    ) {
        next.googleAgenda =
            {};
    }

    next.googleAgenda = {
        enabled:
            Boolean(
                next.googleAgenda
                    .enabled
            ),

        calendarId:
            next.googleAgenda
                .calendarId ??
            null,

        eventId:
            next.googleAgenda
                .eventId ??
            null,

        htmlLink:
            next.googleAgenda
                .htmlLink ??
            null,

        syncStatus:
            next.googleAgenda
                .syncStatus ??
            "disabled",

        lastAction:
            next.googleAgenda
                .lastAction ??
            null,

        syncedAt:
            next.googleAgenda
                .syncedAt ??
            null,

        error:
            next.googleAgenda
                .error ??
            null,
    };

    if (
        next.seriesId != null
    ) {
        next.seriesId =
            String(
                next.seriesId
            );
    }

    let startEnd =
        null;

    if (
        hasUsableDateValue(
            patchOrNew?.date
        )
    ) {
        startEnd =
            buildStartEndFrom(
                patchOrNew.date,
                patchOrNew.duracao ||
                next.duracao
            );
    } else if (
        hasUsableDateValue(
            patchOrNew?.start
        ) &&
        (
            patchOrNew?.duracao ||
            next.duracao
        )
    ) {
        startEnd =
            buildStartEndFrom(
                patchOrNew.start,
                patchOrNew?.duracao ||
                next.duracao
            );
    } else if (
        patchOrNew?.duracao &&
        hasUsableDateValue(
            next.start
        )
    ) {
        startEnd =
            buildStartEndFrom(
                next.start,
                patchOrNew.duracao
            );
    }

    if (
        startEnd?.start &&
        startEnd?.end
    ) {
        next.start =
            startEnd.start;

        next.end =
            startEnd.end;
    } else {
        if (
            !hasUsableDateValue(
                next.start
            )
        ) {
            delete next.start;
        }

        if (
            !hasUsableDateValue(
                next.end
            )
        ) {
            delete next.end;
        }
    }

    if (
        !previous?.createdAt
    ) {
        next.createdAt =
            next.createdAt ??
            nowIso;
    }

    next.updatedAt =
        nowIso;

    delete next.date;

    return next;
}

function normalizeNewEvent(
    payload
) {
    const scaffold = {
        id:
            payload?.id,

        title:
            payload?.title ||
            "Evento",

        status:
            payload?.status ||
            "pendente",

        cliente:
            payload?.cliente ||
            payload?.tutorNome ||
            "",

        local:
            (
                payload?.local ||
                ""
            ).trim(),

        tutorId:
            payload?.tutorId,

        tutorNome:
            payload?.tutorNome ||
            "",

        petIds:
            Array.isArray(
                payload?.petIds
            )
                ? payload.petIds
                : [],

        duracao:
            payload?.duracao ||
            "1:00",

        observacoes:
            payload?.observacoes ||
            "",

        seriesId:
            payload?.seriesId ??
            null,

        financeiro: {
            preco:
                payload?.financeiro
                    ?.preco ??
                payload?.preco ??
                0,

            pago:
                payload?.financeiro
                    ?.pago ??
                false,

            comprovanteUrl:
                payload?.financeiro
                    ?.comprovanteUrl ??
                null,
        },

        googleAgenda:
            payload?.googleAgenda ||
            buildGoogleAgendaDisabled(),
    };

    if (
        payload?.start &&
        payload?.end
    ) {
        return sanitizeEvento(
            null,
            {
                ...scaffold,
                start:
                    payload.start,
                end:
                    payload.end,
            }
        );
    }

    return sanitizeEvento(
        null,
        {
            ...scaffold,
            date:
                payload?.date,
        }
    );
}

/* ---------------- state ---------------- */

const initialState = {
    byId: {},
    allIds: [],
    status: "idle",
    error: null,
    lastLoadedAt: null,
};

/* ---------------- thunks ---------------- */

export const loadAgenda =
    createAsyncThunk(
        "agenda/load",
        async () => {
            const rows =
                await svcListEventos();

            return Array.isArray(
                rows
            )
                ? rows.map(
                    (evento) =>
                        sanitizeEvento(
                            null,
                            evento
                        )
                )
                : [];
        }
    );

export const addEvento =
    createAsyncThunk(
        "agenda/add",

        async (
            payload,
            {
                getState,
                dispatch,
            }
        ) => {
            const state =
                getState();

            const shouldSyncGoogle =
                isGoogleCalendarEnabled(
                    state
                );

            const normalized =
                normalizeNewEvent({
                    ...payload,

                    googleAgenda:
                        shouldSyncGoogle
                            ? buildGoogleAgendaPending(
                                "create_event"
                            )
                            : buildGoogleAgendaDisabled(),
                });

            const saved =
                await svcCreateEvento(
                    normalized
                );

            const safeSaved =
                sanitizeEvento(
                    null,
                    saved
                );

            if (
                shouldSyncGoogle
            ) {
                await enqueueGoogleTaskSafe(
                    dispatch,
                    {
                        provider:
                            "google_calendar",

                        action:
                            "create_event",

                        eventId:
                            String(
                                safeSaved.id
                            ),

                        status:
                            "pending",

                        payload: {
                            eventId:
                                String(
                                    safeSaved.id
                                ),
                        },
                    }
                );
            }

            return safeSaved;
        }
    );

export const updateEvento =
    createAsyncThunk(
        "agenda/update",

        async (
            {
                id,
                patch,
                changeStatus = false,
                skipGoogleSync = false,
            },
            {
                getState,
                dispatch,
            }
        ) => {
            const state =
                getState();

            const previous =
                selectEventoById(
                    id
                )(state);

            if (
                changeStatus ||
                skipGoogleSync
            ) {
                const saved =
                    await svcUpdateEvento(
                        String(id),
                        patch
                    );

                return sanitizeEvento(
                    previous,
                    saved
                );
            }

            const shouldSyncGoogle =
                isGoogleCalendarEnabled(
                    state
                );

            const alreadyGoogleEnabled =
                Boolean(
                    previous?.googleAgenda
                        ?.enabled
                );

            const shouldQueueGoogle =
                shouldSyncGoogle ||
                alreadyGoogleEnabled;

            const normalizedPatch =
                sanitizeEvento(
                    previous,
                    {
                        ...patch,

                        ...(shouldQueueGoogle
                            ? {
                                googleAgenda:
                                    buildGoogleAgendaPending(
                                        "update_event",
                                        previous?.googleAgenda ||
                                        {}
                                    ),
                            }
                            : {}),
                    }
                );

            delete normalizedPatch.date;

            const saved =
                await svcUpdateEvento(
                    String(id),
                    normalizedPatch
                );

            const safeSaved =
                sanitizeEvento(
                    previous,
                    saved
                );

            if (
                shouldQueueGoogle
            ) {
                await enqueueGoogleTaskSafe(
                    dispatch,
                    {
                        provider:
                            "google_calendar",

                        action:
                            "update_event",

                        eventId:
                            String(id),

                        status:
                            "pending",

                        payload: {
                            eventId:
                                String(id),
                        },
                    }
                );
            }

            return safeSaved;
        }
    );

export const deleteEvento =
    createAsyncThunk(
        "agenda/delete",

        async (
            id,
            {
                getState,
                dispatch,
            }
        ) => {
            const state =
                getState();

            const previous =
                selectEventoById(
                    id
                )(state);

            const shouldQueueGoogle =
                Boolean(
                    previous?.googleAgenda
                        ?.enabled &&
                    previous?.googleAgenda
                        ?.syncStatus !==
                    "disabled"
                );

            if (
                shouldQueueGoogle
            ) {
                await enqueueGoogleTaskSafe(
                    dispatch,
                    {
                        provider:
                            "google_calendar",

                        action:
                            "delete_event",

                        eventId:
                            String(id),

                        status:
                            "pending",

                        payload: {
                            eventId:
                                String(id),

                            googleEventId:
                                previous?.googleAgenda
                                    ?.eventId ||
                                null,

                            calendarId:
                                previous?.googleAgenda
                                    ?.calendarId ||
                                null,
                        },
                    }
                );
            }

            const removedId =
                await svcRemoveEvento(
                    String(id)
                );

            return String(
                removedId
            );
        }
    );

export const addEventosBatch =
    createAsyncThunk(
        "agenda/addBatch",

        async (
            payloadList,
            {
                getState,
                dispatch,
            }
        ) => {
            const state =
                getState();

            const shouldSyncGoogle =
                isGoogleCalendarEnabled(
                    state
                );

            const results = [];

            for (
                const payload
                of payloadList || []
            ) {
                const normalized =
                    normalizeNewEvent({
                        ...payload,

                        googleAgenda:
                            shouldSyncGoogle
                                ? buildGoogleAgendaPending(
                                    "create_event"
                                )
                                : buildGoogleAgendaDisabled(),
                    });

                const saved =
                    await svcCreateEvento(
                        normalized
                    );

                const safeSaved =
                    sanitizeEvento(
                        null,
                        saved
                    );

                results.push(
                    safeSaved
                );

                if (
                    shouldSyncGoogle
                ) {
                    await enqueueGoogleTaskSafe(
                        dispatch,
                        {
                            provider:
                                "google_calendar",

                            action:
                                "create_event",

                            eventId:
                                String(
                                    safeSaved.id
                                ),

                            status:
                                "pending",

                            payload: {
                                eventId:
                                    String(
                                        safeSaved.id
                                    ),
                            },
                        }
                    );
                }
            }

            return results;
        }
    );

/* ---------------- slice ---------------- */

function sortAgendaIds(
    state
) {
    state.allIds.sort(
        (a, b) => {
            const timeA =
                new Date(
                    state.byId[a]
                        ?.start || 0
                ).getTime();

            const timeB =
                new Date(
                    state.byId[b]
                        ?.start || 0
                ).getTime();

            return (
                (
                    Number.isFinite(
                        timeA
                    )
                        ? timeA
                        : 0
                ) -
                (
                    Number.isFinite(
                        timeB
                    )
                        ? timeB
                        : 0
                )
            );
        }
    );
}

const agendaSlice =
    createSlice({
        name: "agenda",

        initialState,

        reducers: {
            resetAgendaState:
                () =>
                    initialState,
        },

        extraReducers:
            (builder) => {
                builder
                    /* ---------- LOAD ---------- */

                    .addCase(
                        loadAgenda.pending,
                        (state) => {
                            state.status =
                                "loading";

                            state.error =
                                null;
                        }
                    )

                    .addCase(
                        loadAgenda.fulfilled,
                        (
                            state,
                            action
                        ) => {
                            state.status =
                                "succeeded";

                            state.error =
                                null;

                            const rows =
                                Array.isArray(
                                    action.payload
                                )
                                    ? action.payload
                                    : [];

                            /*
                             * Proteção da Fase 0:
                             * uma resposta vazia não apaga
                             * a agenda já restaurada pelo Redux Persist.
                             */
                            if (
                                rows.length ===
                                0 &&
                                state.allIds
                                    .length > 0
                            ) {
                                state.lastLoadedAt =
                                    new Date()
                                        .toISOString();

                                return;
                            }

                            state.byId =
                                {};

                            state.allIds =
                                [];

                            for (
                                const event
                                of rows
                            ) {
                                const safe =
                                    sanitizeEvento(
                                        null,
                                        event
                                    );

                                const id =
                                    String(
                                        safe.id
                                    );

                                state.byId[
                                    id
                                ] = safe;

                                state.allIds.push(
                                    id
                                );
                            }

                            sortAgendaIds(
                                state
                            );

                            state.lastLoadedAt =
                                new Date()
                                    .toISOString();
                        }
                    )

                    .addCase(
                        loadAgenda.rejected,
                        (
                            state,
                            action
                        ) => {
                            state.status =
                                "failed";

                            state.error =
                                action.error
                                    ?.message ||
                                "Erro ao carregar agenda";

                            /*
                             * Não altera byId/allIds.
                             */
                        }
                    )

                    /* ---------- ADD ---------- */

                    .addCase(
                        addEvento.fulfilled,
                        (
                            state,
                            action
                        ) => {
                            const event =
                                sanitizeEvento(
                                    null,
                                    action.payload
                                );

                            const id =
                                String(
                                    event.id
                                );

                            state.byId[id] =
                                event;

                            if (
                                !state.allIds.includes(
                                    id
                                )
                            ) {
                                state.allIds.push(
                                    id
                                );
                            }

                            sortAgendaIds(
                                state
                            );
                        }
                    )

                    /* ---------- UPDATE ---------- */

                    .addCase(
                        updateEvento.fulfilled,
                        (
                            state,
                            action
                        ) => {
                            const incoming =
                                action.payload;

                            if (
                                !incoming?.id
                            ) {
                                return;
                            }

                            const id =
                                String(
                                    incoming.id
                                );

                            const previous =
                                state.byId[id] ||
                                {};

                            const merged = {
                                ...previous,
                                ...incoming,

                                ...(incoming?.financeiro
                                    ? {
                                        financeiro: {
                                            ...(previous.financeiro ||
                                                {}),
                                            ...incoming.financeiro,
                                        },
                                    }
                                    : {}),

                                ...(incoming?.googleAgenda
                                    ? {
                                        googleAgenda: {
                                            ...(previous.googleAgenda ||
                                                {}),
                                            ...incoming.googleAgenda,
                                        },
                                    }
                                    : {}),
                            };

                            state.byId[id] =
                                sanitizeEvento(
                                    previous,
                                    merged
                                );

                            if (
                                !state.allIds.includes(
                                    id
                                )
                            ) {
                                state.allIds.push(
                                    id
                                );
                            }

                            sortAgendaIds(
                                state
                            );
                        }
                    )

                    /* ---------- DELETE ---------- */

                    .addCase(
                        deleteEvento.fulfilled,
                        (
                            state,
                            action
                        ) => {
                            const id =
                                String(
                                    action.payload
                                );

                            delete state.byId[
                                id
                            ];

                            state.allIds =
                                state.allIds.filter(
                                    (itemId) =>
                                        itemId !== id
                                );
                        }
                    )

                    /* ---------- ADD BATCH ---------- */

                    .addCase(
                        addEventosBatch.fulfilled,
                        (
                            state,
                            action
                        ) => {
                            const rows =
                                Array.isArray(
                                    action.payload
                                )
                                    ? action.payload
                                    : [];

                            for (
                                const event
                                of rows
                            ) {
                                const safe =
                                    sanitizeEvento(
                                        null,
                                        event
                                    );

                                const id =
                                    String(
                                        safe.id
                                    );

                                state.byId[id] =
                                    safe;

                                if (
                                    !state.allIds.includes(
                                        id
                                    )
                                ) {
                                    state.allIds.push(
                                        id
                                    );
                                }
                            }

                            sortAgendaIds(
                                state
                            );
                        }
                    );
            },
    });

export const {
    resetAgendaState,
} = agendaSlice.actions;

export default agendaSlice.reducer;

/* ---------------- selectors ---------------- */

export const selectAgendaState =
    (state) =>
        state.agenda ||
        initialState;

export const selectAllEventos =
    createSelector(
        selectAgendaState,
        (agenda) =>
            agenda.allIds
                .map(
                    (id) =>
                        agenda.byId[id]
                )
                .filter(Boolean)
    );

export const selectEventoById =
    (id) =>
        createSelector(
            selectAgendaState,
            (agenda) =>
                agenda.byId[
                String(id)
                ]
        );

export const selectAgendaStatus =
    createSelector(
        selectAgendaState,
        (agenda) =>
            agenda.status
    );

export const selectEventosGroupedByDay =
    createSelector(
        selectAllEventos,

        (list) => {
            const map =
                new Map();

            for (
                const event
                of list
            ) {
                const date =
                    new Date(
                        event.start
                    );

                const key =
                    `${date.getFullYear()}-${pad2(
                        date.getMonth() +
                        1
                    )}-${pad2(
                        date.getDate()
                    )}`;

                if (!map.has(key)) {
                    map.set(
                        key,
                        []
                    );
                }

                map.get(key).push(
                    event
                );
            }

            return Array.from(
                map.entries()
            )
                .sort(
                    (a, b) =>
                        new Date(a[0]) -
                        new Date(b[0])
                )
                .map(
                    ([
                        title,
                        data,
                    ]) => ({
                        title,

                        data:
                            data.sort(
                                (a, b) =>
                                    new Date(
                                        a.start
                                    ) -
                                    new Date(
                                        b.start
                                    )
                            ),
                    })
                );
        }
    );

export const makeSelectEventosBetween =
    () =>
        createSelector(
            [
                selectAllEventos,
                (_, start) =>
                    start,
                (
                    _,
                    __,
                    end
                ) => end,
            ],

            (
                list,
                start,
                end
            ) => {
                const startDate =
                    start
                        ? new Date(start)
                        : null;

                const endDate =
                    end
                        ? new Date(end)
                        : null;

                return list.filter(
                    (event) => {
                        const eventDate =
                            new Date(
                                event.start
                            );

                        if (
                            startDate &&
                            eventDate <
                            startDate
                        ) {
                            return false;
                        }

                        if (
                            endDate &&
                            eventDate >
                            endDate
                        ) {
                            return false;
                        }

                        return true;
                    }
                );
            }
        );

export const makeSelectUpcomingEventosByTutor =
    (
        tutorId,
        limit = 3
    ) =>
        createSelector(
            [
                selectAllEventos,
            ],

            (list) => {
                const now =
                    new Date();

                const safeTutorId =
                    String(tutorId);

                return list
                    .filter(
                        (event) =>
                            String(
                                event.tutorId
                            ) ===
                            safeTutorId &&
                            new Date(
                                event.end
                            ) >= now
                    )
                    .sort(
                        (a, b) =>
                            new Date(
                                a.start
                            ) -
                            new Date(
                                b.start
                            )
                    )
                    .slice(
                        0,
                        limit
                    );
            }
        );

export const makeSelectEventosByPetId =
    (petId) =>
        createSelector(
            selectAllEventos,

            (list) => {
                const safePetId =
                    String(petId);

                return list.filter(
                    (event) =>
                        Array.isArray(
                            event.petIds
                        ) &&
                        event.petIds
                            .map(String)
                            .includes(
                                safePetId
                            )
                );
            }
        );

export const makeSelectEventosByPetGrouped =
    (petId) =>
        createSelector(
            makeSelectEventosByPetId(
                petId
            ),

            (list) => {
                const map =
                    new Map();

                for (
                    const event
                    of list
                ) {
                    const date =
                        new Date(
                            event.start
                        );

                    const key =
                        `${date.getFullYear()}-${pad2(
                            date.getMonth() +
                            1
                        )}-${pad2(
                            date.getDate()
                        )}`;

                    if (
                        !map.has(key)
                    ) {
                        map.set(
                            key,
                            []
                        );
                    }

                    map.get(key).push(
                        event
                    );
                }

                return Array.from(
                    map.entries()
                )
                    .sort(
                        (a, b) =>
                            new Date(a[0]) -
                            new Date(b[0])
                    )
                    .map(
                        ([
                            title,
                            data,
                        ]) => ({
                            title,

                            data:
                                data.sort(
                                    (a, b) =>
                                        new Date(
                                            a.start
                                        ) -
                                        new Date(
                                            b.start
                                        )
                                ),
                        })
                    );
            }
        );

export const makeSelectEventosBySeriesId =
    (seriesId) =>
        createSelector(
            selectAllEventos,

            (list) => {
                const safeSeriesId =
                    String(
                        seriesId || ""
                    );

                return list.filter(
                    (event) =>
                        String(
                            event.seriesId ||
                            ""
                        ) ===
                        safeSeriesId
                );
            }
        );
