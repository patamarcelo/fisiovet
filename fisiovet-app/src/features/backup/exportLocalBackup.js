// src/features/backup/exportLocalBackup.js
// @ts-nocheck
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as XLSX from "xlsx";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { ensureFirebase } from "@/firebase/firebase";
import { listEventos } from "@/src/services/agenda";

const APP_NAME = "FisioVet";

const ASYNC_STORAGE_KEYS = {
	system: "FV_SYSTEM_V1",
	syncQueue: "FV_SYNC_QUEUE_V1",
};

const FIRESTORE_COLLECTIONS = [
	{
		key: "tutores",
		path: "tutores",
		label: "Tutores",
	},
	{
		key: "pets",
		path: "pets",
		label: "Pets",
	},
	{
		key: "eventos",
		path: "eventos",
		label: "Eventos",
	},
	{
		key: "avaliacoes",
		path: "avaliacoes",
		label: "Avaliações",
	},
	{
		key: "sessoes",
		path: "sessoes",
		label: "Sessões",
	},
	{
		key: "configuracoes",
		path: "configuracoes",
		label: "Configurações",
	},
];

function pad(n) {
	return String(n).padStart(2, "0");
}

function buildTimestampSlug() {
	const d = new Date();

	return [
		d.getFullYear(),
		pad(d.getMonth() + 1),
		pad(d.getDate()),
		`${pad(d.getHours())}-${pad(d.getMinutes())}`,
	].join("-");
}

function safeJsonParse(raw, fallback = null) {
	if (!raw) return fallback;

	try {
		return JSON.parse(raw);
	} catch {
		return fallback;
	}
}

function normalizeFirestoreValue(value) {
	if (value == null) return value;

	if (value instanceof Date) {
		return value.toISOString();
	}

	if (typeof value?.toDate === "function") {
		try {
			return value.toDate().toISOString();
		} catch {}
	}

	if (
		typeof value?._seconds === "number" &&
		typeof value?._nanoseconds === "number"
	) {
		return new Date(value._seconds * 1000).toISOString();
	}

	if (
		typeof value?.latitude === "number" &&
		typeof value?.longitude === "number"
	) {
		return {
			lat: value.latitude,
			lng: value.longitude,
		};
	}

	if (Array.isArray(value)) {
		return value.map(normalizeFirestoreValue);
	}

	if (typeof value === "object") {
		const output = {};

		Object.entries(value).forEach(([key, val]) => {
			output[key] = normalizeFirestoreValue(val);
		});

		return output;
	}

	return value;
}

function normalizeDoc(doc) {
	const data = normalizeFirestoreValue(doc.data?.() || {});

	return {
		id: String(doc.id),
		...data,
	};
}

async function getCollectionRows(collectionRef) {
	const snap = await collectionRef.get();
	return snap.docs.map(normalizeDoc);
}

async function getSafeCollectionRows(collectionRef, label = "coleção") {
	try {
		return await getCollectionRows(collectionRef);
	} catch (error) {
		console.log(`Erro ao exportar ${label}:`, error);
		return [];
	}
}

async function collectFirestoreRootCollections(userRef) {
	const collections = {};

	for (const spec of FIRESTORE_COLLECTIONS) {
		collections[spec.key] = await getSafeCollectionRows(
			userRef.collection(spec.path),
			spec.path
		);
	}

	return collections;
}

async function collectAgendaFromService() {
	try {
		const rows = await listEventos();
		return Array.isArray(rows) ? rows.map(normalizeFirestoreValue) : [];
	} catch (error) {
		console.log("Erro ao exportar agenda pelo service:", error);
		return [];
	}
}

function mergeRowsById(...lists) {
	const map = new Map();

	for (const list of lists || []) {
		for (const item of list || []) {
			if (!item) continue;

			const id = item.id != null ? String(item.id) : null;
			const key = id || JSON.stringify(item);

			if (!map.has(key)) {
				map.set(key, item);
			}
		}
	}

	return Array.from(map.values());
}

function buildPetsById(pets = []) {
	const map = {};

	(pets || []).forEach((pet) => {
		if (pet?.id) {
			map[String(pet.id)] = pet;
		}
	});

	return map;
}

function getPetNamesFromEvent(evento, petsById = {}) {
	const petIds = Array.isArray(evento?.petIds)
		? evento.petIds.map(String)
		: [];

	if (!petIds.length) {
		return {
			petIds: "",
			petNomes: evento?.petNome || "",
		};
	}

	const names = petIds
		.map((id) => petsById[id]?.nome || "")
		.filter(Boolean);

	return {
		petIds: petIds.join(", "),
		petNomes: names.join(", "),
	};
}

function isEventoConfirmado(evento) {
	const status = String(evento?.status || "").toLowerCase();

	return (
		status === "confirmado" ||
		status === "confirmada" ||
		status === "concluido" ||
		status === "concluida" ||
		status === "concluído" ||
		status === "concluída"
	);
}

function buildFinanceiroRows(eventos = [], pets = []) {
	const petsById = buildPetsById(pets);

	return (eventos || [])
		.filter((evento) => evento?.financeiro || evento?.preco != null)
		.map((evento) => {
			const financeiro = evento.financeiro || {};
			const petInfo = getPetNamesFromEvent(evento, petsById);

			const preco = Number(financeiro.preco ?? evento.preco ?? 0);
			const pago = Boolean(financeiro.pago);

			return {
				eventoId: String(evento.id || ""),
				titulo: evento.title || "Evento",
				statusAgenda: evento.status || "",
				confirmado: isEventoConfirmado(evento) ? "Sim" : "Não",

				dataInicio: evento.start || "",
				dataFim: evento.end || "",
				duracao: evento.duracao || "",

				tutorId: evento.tutorId || "",
				tutorNome: evento.tutorNome || evento.cliente || "",
				cliente: evento.cliente || "",

				petIds: petInfo.petIds,
				petNomes: petInfo.petNomes,

				local: evento.local || "",
				observacoes: evento.observacoes || "",

				preco,
				pago: pago ? "Sim" : "Não",
				statusPagamento: pago ? "Pago" : "Pendente",
				comprovanteUrl: financeiro.comprovanteUrl || "",

				googleAgendaEnabled: evento.googleAgenda?.enabled ? "Sim" : "Não",
				googleAgendaStatus: evento.googleAgenda?.syncStatus || "",
				googleEventId: evento.googleAgenda?.eventId || "",

				createdAt: evento.createdAt || "",
				updatedAt: evento.updatedAt || "",
			};
		})
		.sort((a, b) => {
			const da = new Date(a.dataInicio || 0).getTime();
			const db = new Date(b.dataInicio || 0).getTime();
			return da - db;
		});
}

function buildFinanceiroResumoRows(financeiroRows = []) {
	const rows = financeiroRows || [];

	const totalLancamentos = rows.length;
	const totalConfirmados = rows.filter((r) => r.confirmado === "Sim").length;
	const totalPagos = rows.filter((r) => r.pago === "Sim").length;
	const totalPendentes = rows.filter((r) => r.pago !== "Sim").length;

	const valorTotal = rows.reduce((acc, r) => acc + Number(r.preco || 0), 0);

	const valorPago = rows
		.filter((r) => r.pago === "Sim")
		.reduce((acc, r) => acc + Number(r.preco || 0), 0);

	const valorPendente = rows
		.filter((r) => r.pago !== "Sim")
		.reduce((acc, r) => acc + Number(r.preco || 0), 0);

	const valorConfirmado = rows
		.filter((r) => r.confirmado === "Sim")
		.reduce((acc, r) => acc + Number(r.preco || 0), 0);

	const valorConfirmadoPago = rows
		.filter((r) => r.confirmado === "Sim" && r.pago === "Sim")
		.reduce((acc, r) => acc + Number(r.preco || 0), 0);

	const valorConfirmadoPendente = rows
		.filter((r) => r.confirmado === "Sim" && r.pago !== "Sim")
		.reduce((acc, r) => acc + Number(r.preco || 0), 0);

	return [
		{
			Campo: "Total de lançamentos financeiros",
			Valor: totalLancamentos,
		},
		{
			Campo: "Eventos confirmados/concluídos",
			Valor: totalConfirmados,
		},
		{
			Campo: "Pagos",
			Valor: totalPagos,
		},
		{
			Campo: "Pendentes",
			Valor: totalPendentes,
		},
		{
			Campo: "Valor total",
			Valor: valorTotal,
		},
		{
			Campo: "Valor pago",
			Valor: valorPago,
		},
		{
			Campo: "Valor pendente",
			Valor: valorPendente,
		},
		{
			Campo: "Valor confirmado/concluído",
			Valor: valorConfirmado,
		},
		{
			Campo: "Valor confirmado pago",
			Valor: valorConfirmadoPago,
		},
		{
			Campo: "Valor confirmado pendente",
			Valor: valorConfirmadoPendente,
		},
	];
}

async function collectExamsByPet({ userRef, pets }) {
	const exams = [];

	for (const pet of pets || []) {
		try {
			const snap = await userRef
				.collection("pets")
				.doc(String(pet.id))
				.collection("exams")
				.orderBy("createdAt", "desc")
				.get();

			snap.docs.forEach((doc) => {
				exams.push({
					petId: String(pet.id),
					petNome: pet.nome || "",
					...normalizeDoc(doc),
				});
			});
		} catch (error) {
			console.log("Erro ao exportar exames do pet:", pet?.id, error);
		}
	}

	return exams;
}

async function collectAsyncStorageData() {
	const entries = {};

	for (const [key, storageKey] of Object.entries(ASYNC_STORAGE_KEYS)) {
		try {
			const raw = await AsyncStorage.getItem(storageKey);

			entries[key] = {
				storageKey,
				value: safeJsonParse(raw, raw || null),
			};
		} catch (error) {
			console.log(`Erro ao exportar AsyncStorage ${storageKey}:`, error);

			entries[key] = {
				storageKey,
				value: null,
				error: error?.message || String(error),
			};
		}
	}

	return entries;
}

function normalizeReduxSnapshot(reduxState) {
	if (!reduxState || typeof reduxState !== "object") {
		return null;
	}

	return normalizeFirestoreValue({
		user: reduxState.user || null,
		tutores: reduxState.tutores || null,
		pets: reduxState.pets || null,
		agenda: reduxState.agenda || null,
		system: reduxState.system || null,
		subscription: reduxState.subscription || null,
		syncQueue: reduxState.syncQueue || null,
		avaliacoes: reduxState.avaliacoes || null,
	});
}

function agendaRowsFromRedux(reduxState) {
	const agenda = reduxState?.agenda;

	if (!agenda?.allIds?.length || !agenda?.byId) return [];

	return agenda.allIds
		.map((id) => agenda.byId[String(id)])
		.filter(Boolean)
		.map(normalizeFirestoreValue);
}

function avaliacaoDraftRowsFromRedux(reduxState) {
	const draftsByPet = reduxState?.avaliacoes?.draftsByPet || {};

	return Object.entries(draftsByPet).map(([petId, draft]) => ({
		petId: String(petId),
		...normalizeFirestoreValue(draft),
	}));
}

function syncQueueRowsFromStorage(asyncStorageData) {
	const queue = asyncStorageData?.syncQueue?.value;

	if (!queue?.allIds?.length || !queue?.byId) return [];

	return queue.allIds
		.map((id) => queue.byId[String(id)])
		.filter(Boolean)
		.map(normalizeFirestoreValue);
}

function buildSummary({ collections, asyncStorageData, reduxState, origins }) {
	const avaliacaoDraftRows = avaliacaoDraftRowsFromRedux(reduxState);
	const syncQueueRows = syncQueueRowsFromStorage(asyncStorageData);

	const financeiroRows = collections.financeiro || [];
	const financeiroValorTotal = financeiroRows.reduce(
		(acc, row) => acc + Number(row.preco || 0),
		0
	);
	const financeiroValorPago = financeiroRows
		.filter((row) => row.pago === "Sim")
		.reduce((acc, row) => acc + Number(row.preco || 0), 0);
	const financeiroValorPendente = financeiroRows
		.filter((row) => row.pago !== "Sim")
		.reduce((acc, row) => acc + Number(row.preco || 0), 0);

	return {
		tutores: collections.tutores?.length || 0,
		pets: collections.pets?.length || 0,

		eventos: collections.eventos?.length || 0,
		eventosFirestore: origins?.eventosFirestoreCount || 0,
		eventosService: origins?.eventosServiceCount || 0,
		eventosRedux: origins?.eventosReduxCount || 0,

		financeiro: financeiroRows.length,
		financeiroValorTotal,
		financeiroValorPago,
		financeiroValorPendente,

		avaliacoes: collections.avaliacoes?.length || 0,
		avaliacoesFirestore: collections.avaliacoes?.length || 0,
		avaliacoesDraftsRedux: avaliacaoDraftRows.length,

		sessoes: collections.sessoes?.length || 0,
		exames: collections.exames?.length || 0,
		syncQueue: syncQueueRows.length,

		hasSystemLocal: Boolean(asyncStorageData?.system?.value),
		hasSubscriptionRedux: Boolean(reduxState?.subscription),
	};
}

export async function collectLocalBackupData(options = {}) {
	const { reduxState = null } = options;

	const fb = ensureFirebase();

	if (!fb) {
		throw new Error("Firebase não inicializado.");
	}

	const { firestore, auth } = fb;
	const uid = auth?.currentUser?.uid;

	if (!uid) {
		throw new Error("Usuário não autenticado.");
	}

	const userRef = firestore.collection("users").doc(String(uid));

	const userSnap = await userRef.get();
	const userData = userSnap.exists
		? normalizeFirestoreValue(userSnap.data())
		: null;

	const collections = await collectFirestoreRootCollections(userRef);

	const eventosFirestore = collections.eventos || [];
	const eventosService = await collectAgendaFromService();
	const eventosRedux = agendaRowsFromRedux(reduxState);

	collections.eventos = mergeRowsById(
		eventosFirestore,
		eventosService,
		eventosRedux
	);

	const exams = await collectExamsByPet({
		userRef,
		pets: collections.pets || [],
	});

	collections.exames = exams;

	const financeiroRows = buildFinanceiroRows(
		collections.eventos || [],
		collections.pets || []
	);

	const financeiroResumoRows = buildFinanceiroResumoRows(financeiroRows);

	collections.financeiro = financeiroRows;
	collections.financeiroResumo = financeiroResumoRows;

	const asyncStorageData = await collectAsyncStorageData();

	const avaliacoesDraftsRedux = avaliacaoDraftRowsFromRedux(reduxState);
	const syncQueueLocal = syncQueueRowsFromStorage(asyncStorageData);
	const reduxSnapshot = normalizeReduxSnapshot(reduxState);

	const origins = {
		eventosFirestoreCount: eventosFirestore.length,
		eventosServiceCount: eventosService.length,
		eventosReduxCount: eventosRedux.length,
	};

	const derived = {
		agendaService: eventosService,
		agendaRedux: eventosRedux,
		avaliacoesDraftsRedux,
		syncQueueLocal,
		systemLocal: asyncStorageData?.system?.value || null,
		subscriptionRedux: reduxState?.subscription || null,
	};

	const summary = buildSummary({
		collections,
		asyncStorageData,
		reduxState,
		origins,
	});

	return {
		app: APP_NAME,
		type: "local-export",
		version: 4,
		exportedAt: new Date().toISOString(),
		uid: String(uid),

		user: userData,
		summary,

		firestore: {
			userPath: `users/${uid}`,
			collections: {
				...collections,
				eventosFirestore,
			},
		},

		local: {
			asyncStorage: asyncStorageData,
			reduxSnapshot,
			derived,
		},

		collections: {
			...collections,

			eventosFirestore,
			eventosService,
			eventosRedux,

			avaliacoesDraftsRedux,
			syncQueueLocal,
		},
	};
}

function flattenObject(obj, prefix = "", output = {}) {
	if (obj == null) return output;

	Object.entries(obj).forEach(([key, value]) => {
		const path = prefix ? `${prefix}.${key}` : key;

		if (value == null) {
			output[path] = "";
			return;
		}

		if (Array.isArray(value)) {
			output[path] = value
				.map((item) => {
					if (item == null) return "";
					if (typeof item === "object") return JSON.stringify(item);
					return String(item);
				})
				.join(", ");
			return;
		}

		if (typeof value === "object") {
			flattenObject(value, path, output);
			return;
		}

		output[path] = value;
	});

	return output;
}

function buildSummaryRows(backup) {
	return [
		{
			Campo: "Aplicativo",
			Valor: backup.app,
		},
		{
			Campo: "Tipo",
			Valor: backup.type,
		},
		{
			Campo: "Versão do backup",
			Valor: backup.version,
		},
		{
			Campo: "Exportado em",
			Valor: backup.exportedAt,
		},
		{
			Campo: "UID",
			Valor: backup.uid,
		},

		{
			Campo: "Tutores",
			Valor: backup.summary.tutores,
		},
		{
			Campo: "Pets",
			Valor: backup.summary.pets,
		},

		{
			Campo: "Eventos consolidados",
			Valor: backup.summary.eventos,
		},
		{
			Campo: "Eventos Firestore",
			Valor: backup.summary.eventosFirestore,
		},
		{
			Campo: "Eventos Service",
			Valor: backup.summary.eventosService,
		},
		{
			Campo: "Eventos Redux",
			Valor: backup.summary.eventosRedux,
		},

		{
			Campo: "Lançamentos financeiros",
			Valor: backup.summary.financeiro,
		},
		{
			Campo: "Financeiro valor total",
			Valor: backup.summary.financeiroValorTotal,
		},
		{
			Campo: "Financeiro valor pago",
			Valor: backup.summary.financeiroValorPago,
		},
		{
			Campo: "Financeiro valor pendente",
			Valor: backup.summary.financeiroValorPendente,
		},

		{
			Campo: "Avaliações Firestore",
			Valor: backup.summary.avaliacoesFirestore,
		},
		{
			Campo: "Rascunhos de avaliações Redux",
			Valor: backup.summary.avaliacoesDraftsRedux,
		},

		{
			Campo: "Sessões",
			Valor: backup.summary.sessoes,
		},
		{
			Campo: "Exames",
			Valor: backup.summary.exames,
		},
		{
			Campo: "Fila local de sincronização",
			Valor: backup.summary.syncQueue,
		},

		{
			Campo: "Configurações locais encontradas",
			Valor: backup.summary.hasSystemLocal ? "Sim" : "Não",
		},
		{
			Campo: "Assinatura local Redux encontrada",
			Valor: backup.summary.hasSubscriptionRedux ? "Sim" : "Não",
		},
	];
}

function rowsToSheet(rows) {
	const safeRows = Array.isArray(rows) ? rows : [];

	if (safeRows.length === 0) {
		return XLSX.utils.json_to_sheet([
			{
				aviso: "Sem dados para exportar",
			},
		]);
	}

	return XLSX.utils.json_to_sheet(safeRows.map((row) => flattenObject(row)));
}

function objectToSheet(obj) {
	if (!obj) {
		return XLSX.utils.json_to_sheet([
			{
				aviso: "Sem dados para exportar",
			},
		]);
	}

	if (Array.isArray(obj)) {
		return rowsToSheet(obj);
	}

	return XLSX.utils.json_to_sheet([flattenObject(obj)]);
}

function appendSheet(workbook, name, rowsOrObject, mode = "rows") {
	const sheet =
		mode === "object" ? objectToSheet(rowsOrObject) : rowsToSheet(rowsOrObject);

	XLSX.utils.book_append_sheet(workbook, sheet, name.slice(0, 31));
}

async function shareFile(uri, mimeType, dialogTitle) {
	if (!(await Sharing.isAvailableAsync())) {
		throw new Error("Compartilhamento não disponível neste dispositivo.");
	}

	await Sharing.shareAsync(uri, {
		mimeType,
		dialogTitle,
		UTI:
			mimeType ===
			"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
				? "com.microsoft.excel.xlsx"
				: "public.json",
	});
}

export async function exportBackupAsJson(options = {}) {
	const backup = await collectLocalBackupData(options);
	const slug = buildTimestampSlug();
	const fileName = `fisiovet-backup-${slug}.json`;
	const uri = `${FileSystem.cacheDirectory}${fileName}`;

	await FileSystem.writeAsStringAsync(uri, JSON.stringify(backup, null, 2), {
		encoding: FileSystem.EncodingType.UTF8,
	});

	await shareFile(uri, "application/json", "Exportar backup JSON");

	return {
		uri,
		fileName,
		backup,
	};
}

export async function exportBackupAsExcel(options = {}) {
	const backup = await collectLocalBackupData(options);
	const slug = buildTimestampSlug();
	const fileName = `fisiovet-dados-${slug}.xlsx`;
	const uri = `${FileSystem.cacheDirectory}${fileName}`;

	const workbook = XLSX.utils.book_new();

	appendSheet(workbook, "Resumo", buildSummaryRows(backup));

	appendSheet(workbook, "Tutores", backup.collections.tutores);
	appendSheet(workbook, "Pets", backup.collections.pets);

	appendSheet(workbook, "Eventos", backup.collections.eventos);

	appendSheet(workbook, "Financeiro", backup.collections.financeiro);
	appendSheet(
		workbook,
		"Financeiro Resumo",
		backup.collections.financeiroResumo
	);

	appendSheet(workbook, "Eventos Firestore", backup.collections.eventosFirestore);
	appendSheet(workbook, "Eventos Service", backup.collections.eventosService);
	appendSheet(workbook, "Eventos Redux", backup.collections.eventosRedux);

	appendSheet(workbook, "Avaliações", backup.collections.avaliacoes);
	appendSheet(
		workbook,
		"Avaliações Drafts",
		backup.collections.avaliacoesDraftsRedux
	);

	appendSheet(workbook, "Sessões", backup.collections.sessoes);
	appendSheet(workbook, "Exames", backup.collections.exames);
	appendSheet(workbook, "SyncQueue", backup.collections.syncQueueLocal);

	appendSheet(workbook, "Usuário", backup.user, "object");
	appendSheet(workbook, "System Local", backup.local.derived.systemLocal, "object");
	appendSheet(
		workbook,
		"Subscription",
		backup.local.derived.subscriptionRedux,
		"object"
	);

	const base64 = XLSX.write(workbook, {
		type: "base64",
		bookType: "xlsx",
	});

	await FileSystem.writeAsStringAsync(uri, base64, {
		encoding: FileSystem.EncodingType.Base64,
	});

	await shareFile(
		uri,
		"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
		"Exportar dados em Excel"
	);

	return {
		uri,
		fileName,
		backup,
	};
}