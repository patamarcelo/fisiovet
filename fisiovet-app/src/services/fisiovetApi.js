// src/services/fisiovetApi.js
// Cliente HTTP do backend oficial FisioVet

const API_URL = process.env.EXPO_PUBLIC_FISIOVET_API_URL;
const INTERNAL_TOKEN = process.env.EXPO_PUBLIC_FISIOVET_INTERNAL_TOKEN;

function normalizeBaseUrl(url) {
    return String(url || "").replace(/\/+$/, "");
}

async function parseResponseBody(res) {
    const text = await res.text().catch(() => "");

    if (!text) return null;

    try {
        return JSON.parse(text);
    } catch {
        return text;
    }
}

async function request(path, options = {}) {
    const baseUrl = normalizeBaseUrl(API_URL);

    if (!baseUrl) {
        throw new Error("EXPO_PUBLIC_FISIOVET_API_URL não configurada.");
    }

    if (!INTERNAL_TOKEN) {
        throw new Error("EXPO_PUBLIC_FISIOVET_INTERNAL_TOKEN não configurado.");
    }

    const res = await fetch(`${baseUrl}${path}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${INTERNAL_TOKEN}`,
            ...(options.headers || {}),
        },
    });

    const data = await parseResponseBody(res);

    if (!res.ok) {
        throw new Error(
            data?.error ||
            data?.message ||
            `Erro HTTP ${res.status} ao chamar FisioVet Server.`
        );
    }

    return data;
}

export async function healthCheckFisioVetServer() {
    const baseUrl = normalizeBaseUrl(API_URL);

    if (!baseUrl) {
        throw new Error("EXPO_PUBLIC_FISIOVET_API_URL não configurada.");
    }

    const res = await fetch(`${baseUrl}/health`);
    const data = await parseResponseBody(res);

    if (!res.ok) {
        throw new Error(data?.error || "Erro ao verificar FisioVet Server.");
    }

    return data;
}

export async function setupCalendarFeed({ userId, calendarName } = {}) {
    const response = await request("/calendar/feed/setup", {
        method: "POST",
        body: JSON.stringify({
            userId: userId || "beta-user",
            calendarName: calendarName || "Agenda FisioVet",
        }),
    });

    return response?.data || response;
}

export async function sendSyncTask(task) {
    const response = await request("/sync/task", {
        method: "POST",
        body: JSON.stringify(task),
    });

    return response?.data || response;
}