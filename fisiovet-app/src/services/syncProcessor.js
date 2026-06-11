// src/services/syncProcessor.js
// Processor local da fila de sincronização.
// Envia tasks pendentes para o FisioVet Server.
// Na versão beta, o provider "google_calendar" é mantido por compatibilidade,
// mas o backend publica os eventos no feed ICS do FisioVet.

import {
    selectPendingSyncTasks,
    markSyncTaskDone,
    markSyncTaskFailed,
    updateSyncTask,
} from "@/src/store/slices/syncQueueSlice";

import { updateEvento } from "@/src/store/slices/agendaSlice";
import { sendSyncTask } from "@/src/services/fisiovetApi";

function isCalendarTask(task) {
    return task?.provider === "google_calendar" || task?.provider === "calendar_feed";
}

function isProcessableTask(task) {
    if (!task?.id) return false;
    if (!task?.provider) return false;
    if (!task?.action) return false;

    return true;
}

function getCalendarFeedState(state) {
    return state?.system?.integrations?.googleCalendar || {};
}

function getTaskEventId(task) {
    return task?.eventId || task?.payload?.eventId || null;
}

function toServerPayload(task, state) {
    const eventId = getTaskEventId(task);
    const event = eventId ? state?.agenda?.byId?.[String(eventId)] : null;
    const calendarFeed = getCalendarFeedState(state);

    return {
        id: task.id,

        // Mantém google_calendar para compatibilidade com o agendaSlice atual.
        // O server interpreta google_calendar como calendar_feed nesta fase.
        provider: task.provider || "google_calendar",

        action: task.action,
        eventId,

        feedToken:
            task?.feedToken ||
            task?.payload?.feedToken ||
            calendarFeed?.feedToken ||
            null,

        payload: {
            ...(task.payload || {}),

            eventId,

            feedToken:
                task?.feedToken ||
                task?.payload?.feedToken ||
                calendarFeed?.feedToken ||
                null,

            event,

            calendarFeed: {
                feedToken: calendarFeed?.feedToken || null,
                feedUrl: calendarFeed?.feedUrl || null,
                webcalUrl: calendarFeed?.webcalUrl || null,
            },
        },
    };
}

function shouldSkipTaskBeforeServer(task, state) {
    if (!isCalendarTask(task)) return false;

    const calendarFeed = getCalendarFeedState(state);
    const feedToken =
        task?.feedToken ||
        task?.payload?.feedToken ||
        calendarFeed?.feedToken ||
        null;

    // Se o usuário ativou a integração mas ainda não gerou link,
    // deixa a task pendente para tentar novamente depois do setup.
    if (!feedToken) {
        return true;
    }

    return false;
}

async function updateLocalEventSyncStatus({ dispatch, task, result, state }) {
    if (!isCalendarTask(task)) return;
    if (task.action === "delete_event") return;

    const eventId = getTaskEventId(task);

    if (!eventId) return;

    const calendarFeed = getCalendarFeedState(state);

    await dispatch(
        updateEvento({
            id: String(eventId),
            patch: {
                googleAgenda: {
                    enabled: true,

                    // Campos mantidos por compatibilidade com o modelo antigo.
                    // Aqui calendarId representa o feedToken e htmlLink representa o feedUrl.
                    calendarId: result?.feedToken || calendarFeed?.feedToken || null,
                    eventId: String(eventId),
                    htmlLink: calendarFeed?.feedUrl || null,

                    syncStatus: result?.status || "synced",
                    lastAction: task.action,
                    syncedAt: result?.syncedAt || new Date().toISOString(),
                    error: null,
                },
            },

            // Evita gerar nova task de sync por causa desse update técnico.
            changeStatus: true,
        })
    ).unwrap();
}

export async function processSyncQueue(dispatch, getState) {
    const initialState = getState();
    const pendingTasks = selectPendingSyncTasks(initialState);

    if (!pendingTasks?.length) {
        return {
            ok: true,
            processed: 0,
            failed: 0,
            skipped: 0,
            message: "Nenhuma tarefa pendente.",
        };
    }

    let processed = 0;
    let failed = 0;
    let skipped = 0;

    for (const task of pendingTasks) {
        const latestState = getState();

        if (!isProcessableTask(task)) {
            skipped += 1;
            continue;
        }

        if (shouldSkipTaskBeforeServer(task, latestState)) {
            skipped += 1;

            console.log("[syncProcessor] task aguardando feedToken:", {
                taskId: task.id,
                provider: task.provider,
                action: task.action,
            });

            continue;
        }

        try {
            await dispatch(
                updateSyncTask({
                    id: task.id,
                    patch: {
                        status: "processing",
                        lastError: null,
                    },
                })
            ).unwrap();

            const payload = toServerPayload(task, latestState);
            const result = await sendSyncTask(payload);

            await updateLocalEventSyncStatus({
                dispatch,
                task,
                result,
                state: latestState,
            });

            await dispatch(markSyncTaskDone(task.id)).unwrap();

            processed += 1;

            console.log("[syncProcessor] task processed:", {
                taskId: task.id,
                provider: task.provider,
                action: task.action,
                result,
            });
        } catch (err) {
            failed += 1;

            await dispatch(
                markSyncTaskFailed({
                    id: task.id,
                    error: err,
                })
            ).unwrap();

            console.warn("[syncProcessor] task failed:", {
                taskId: task.id,
                provider: task.provider,
                action: task.action,
                error: err?.message,
            });
        }
    }

    return {
        ok: failed === 0,
        processed,
        failed,
        skipped,
        message:
            failed > 0
                ? "Algumas tarefas não foram sincronizadas."
                : skipped > 0
                    ? "Algumas tarefas ainda aguardam o link do calendário."
                    : "Fila sincronizada.",
    };
}