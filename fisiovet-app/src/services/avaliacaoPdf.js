// src/services/avaliacaoPdf.js
// @ts-nocheck

import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import { Asset } from "expo-asset";

const FISIOVET_LOGO = require("../../assets/images/splash-fisiovet.png");

const REPORT_FILE_NAME = "report-fisiovet.pdf";

const MAX_FIELD_CHARS = 220;
const MAX_SHORT_CHARS = 140;
const MAX_OBS_CHARS = 320;

function escapeHtml(value) {
	if (value == null) return "";

	return String(value)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}

function isFilled(value) {
	if (value == null) return false;
	if (typeof value === "string") return value.trim().length > 0;
	return !!value;
}

function textOrDash(value) {
	return isFilled(value) ? escapeHtml(value) : "Não informado";
}

function compactText(value, max = MAX_FIELD_CHARS) {
	if (!isFilled(value)) return "Não informado";

	const raw = String(value).trim().replace(/\s+/g, " ");

	if (raw.length <= max) return escapeHtml(raw);

	return `${escapeHtml(raw.slice(0, max).trim())}…`;
}

function toDate(value) {
	if (!value) return null;

	if (value instanceof Date) return value;

	if (value?._seconds) return new Date(value._seconds * 1000);

	if (typeof value?.toDate === "function") {
		try {
			return value.toDate();
		} catch { }
	}

	const d = new Date(value);
	return Number.isNaN(d.getTime()) ? null : d;
}

function formatDateTime(value) {
	const d = toDate(value);

	if (!d) return "Sem data";

	return d.toLocaleString("pt-BR", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

function formatDateOnly(value) {
	const d = toDate(value);

	if (!d) return "Sem data";

	return d.toLocaleDateString("pt-BR", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
	});
}

function getKind(item) {
	const type = item?.type;
	const tipo = item?.tipo || item?.fields?.tipo;

	if (type === "neurologica" || tipo === "neurologica") {
		return "neurologica";
	}

	if (type === "ortopedica" || tipo === "ortopedica") {
		return "ortopedica";
	}

	return "anamnese";
}

function getKindLabel(item) {
	const kind = getKind(item);

	if (kind === "neurologica") return "Avaliação Neurológica";
	if (kind === "ortopedica") return "Avaliação Ortopédica";

	return "Anamnese";
}

function getKindColor(item) {
	const kind = getKind(item);

	if (kind === "neurologica") {
		return {
			primary: "#2563EB",
			soft: "#DBEAFE",
			softText: "#1D4ED8",
		};
	}

	if (kind === "ortopedica") {
		return {
			primary: "#0F766E",
			soft: "#CCFBF1",
			softText: "#0F766E",
		};
	}

	return {
		primary: "#7C3AED",
		soft: "#EDE9FE",
		softText: "#6D28D9",
	};
}

async function getFisioVetLogoDataUri() {
	try {
		const asset = Asset.fromModule(FISIOVET_LOGO);

		await asset.downloadAsync();

		const uri = asset.localUri || asset.uri;

		if (!uri) return "";

		const base64 = await FileSystem.readAsStringAsync(uri, {
			encoding: FileSystem.EncodingType.Base64,
		});

		return `data:image/png;base64,${base64}`;
	} catch (error) {
		console.log("getFisioVetLogoDataUri error", error);
		return "";
	}
}

function renderBrand(logoDataUri) {
	const logo = logoDataUri
		? `
			<img
				class="brand-logo-img"
				src="${logoDataUri}"
				alt="FisioVet"
			/>
		`
		: `
			<div class="brand-logo-fallback">
				FisioVet
			</div>
		`;

	return `
		<div class="brand">
			<div class="brand-logo">
				${logo}
			</div>

			<div class="brand-copy">
				<div class="brand-name">FisioVet</div>
				<div class="brand-subtitle">documento clínico</div>
			</div>
		</div>
	`;
}

function renderTextField(label, value, options = {}) {
	const { max = MAX_FIELD_CHARS, wide = false } = options;

	return `
		<div class="field ${wide ? "field-wide" : ""}">
			<div class="field-label">${escapeHtml(label)}</div>
			<div class="field-value">${compactText(value, max)}</div>
		</div>
	`;
}

function renderFieldGrid(fields) {
	return `
		<div class="field-grid">
			${fields.join("")}
		</div>
	`;
}

function renderSelectedList(labels, values, maxItems = 8) {
	const selected = Object.entries(values || {})
		.filter(([, value]) => Boolean(value))
		.map(([key]) => labels[key])
		.filter(Boolean)
		.slice(0, maxItems);

	if (!selected.length) {
		return `<div class="empty">Nenhum item selecionado.</div>`;
	}

	return `
		<div class="selected-list">
			${selected
			.map(
				(label) => `
						<div class="selected-pill">
							<span class="selected-check">✓</span>
							<span>${escapeHtml(label)}</span>
						</div>
					`
			)
			.join("")}
		</div>
	`;
}

function renderStatusRow(label, value, normalLabel = "Normal") {
	const safeValue = value || "Não informado";
	const isNormal = safeValue === normalLabel;

	return `
		<div class="status-row">
			<div class="status-label">${escapeHtml(label)}</div>
			<div class="status-pill ${isNormal ? "status-normal" : "status-changed"}">
				<span class="status-dot"></span>
				<span>${escapeHtml(safeValue)}</span>
			</div>
		</div>
	`;
}

function renderStatusGrid(rows) {
	return `
		<div class="status-grid">
			${rows.join("")}
		</div>
	`;
}

function renderSection(number, title, content, options = {}) {
	const { compact = false } = options;

	return `
		<section class="section ${compact ? "section-compact" : ""}">
			<div class="section-header">
				<div class="section-number">${escapeHtml(number)}</div>
				<h2>${escapeHtml(title)}</h2>
			</div>

			<div class="section-body">
				${content}
			</div>
		</section>
	`;
}

/* =========================
   Labels
========================= */

const anamneseHabitosLabels = {
	escadas: "Escadas",
	acessoRua: "Acesso à rua",
	pisoLiso: "Piso liso",
	pisoAntiderrapante: "Piso antiderrapante",
	sobeDesceSofa: "Sobe/desce sofá",
	sobeDesceCama: "Sobe/desce cama",
};

const anamneseFuncionalLabels = {
	levantaSozinho: "Levanta sozinho",
	caminhaSemApoio: "Caminha sem apoio",
	escorrega: "Escorrega",
	dificuldadeLevantar: "Dificuldade para levantar",
};

const anamneseExpectativasLabels = {
	reduzirDor: "Reduzir dor",
	melhorarMobilidade: "Melhorar mobilidade",
	reabilitacaoPosCirurgia: "Reabilitação pós-cirurgia",
	qualidadeVida: "Qualidade de vida",
};

const ortopedicaLocalizacaoLabels = {
	membroToracicoDireito: "Membro torácico direito",
	membroToracicoEsquerdo: "Membro torácico esquerdo",
	membroPelvicoDireito: "Membro pélvico direito",
	membroPelvicoEsquerdo: "Membro pélvico esquerdo",
	colunaCervical: "Coluna cervical",
	colunaToracica: "Coluna torácica",
	colunaLombar: "Coluna lombar",
	pelve: "Pelve",
};

const ortopedicaFuncionalLabels = {
	levantaSozinho: "Levanta sozinho",
	caminhaSemApoio: "Caminha sem apoio",
	sobeEscadas: "Sobe escadas",
	salta: "Salta",
	escorrega: "Escorrega",
	dificuldadeSentarLevantar: "Dificuldade para sentar/levantar",
};

const ortopedicaCondutaLabels = {
	analgesia: "Analgesia / controle de dor",
	exerciciosTerapeuticos: "Exercícios terapêuticos",
	eletroterapia: "Eletroterapia",
	crioterapia: "Crioterapia",
	termoterapia: "Termoterapia",
	orientacaoAmbiental: "Orientação ambiental",
};

const nervosCranianosLabels = {
	olfatorio: "I - Olfatório",
	optico: "II - Óptico",
	oculomotorTroclear: "III/IV/VI - Oculomotor / Troclear / Abducente",
	trigemeo: "V - Trigêmeo",
	facial: "VII - Facial",
	vestibulococlear: "VIII - Vestibulococlear",
	glossoVago: "IX/X - Glossofaríngeo / Vago",
	acessorio: "XI - Acessório espinal",
	hipoglosso: "XII - Hipoglosso",
};

const reflexosLabels = {
	patelar: "Patelar",
	flexor: "Flexor (retirada)",
	extensorCruzado: "Extensor cruzado",
	perineal: "Perineal",
	cutaneoTronco: "Cutâneo do tronco",
};

const sensibilidadeLabels = {
	superficial: "Sensibilidade superficial",
	profunda: "Sensibilidade profunda",
};

const statusLabels = {
	normal: "Normal",
	alterado: "Alterado",
	ausente: "Ausente",
	diminuido: "Diminuído",
	aumentado: "Aumentado",
	diminuida: "Diminuída / alterada",
	alerta: "Alerta",
	depressao: "Depressão",
	delirium: "Delírio",
	estupor: "Estupor",
	coma: "Coma",
	demencia: "Demência",
	headPress: "Head press",
	leve: "Leve",
	moderada: "Moderada",
	intensa: "Intensa",
	parcial: "Parcial",
	semApoio: "Sem apoio",
	presente: "Presente",
	sensivel: "Sensível",
	dolorido: "Dolorido",
	naoPermite: "Não permite",
};

function humanStatus(value) {
	return statusLabels[value] || value || "Não informado";
}

/* =========================
   Render por tipo
========================= */

function renderAnamnese(item) {
	const f = item?.fields || {};
	const textos = f.textos || {};
	const dor = f.dor || {};

	return `
		${renderSection(
		"1",
		"Queixa principal",
		renderTextField("Descrição", textos.queixaPrincipal, {
			max: MAX_FIELD_CHARS,
			wide: true,
		}),
		{ compact: true }
	)}

		${renderSection(
		"2",
		"História da doença atual",
		renderTextField("Evolução do quadro", textos.historiaDoencaAtual, {
			max: MAX_FIELD_CHARS,
			wide: true,
		}),
		{ compact: true }
	)}

		${renderSection(
		"3",
		"Antecedentes médicos",
		renderFieldGrid([
			renderTextField("Vacinas e vermífugos", textos.vacinasVermifugos, {
				max: MAX_SHORT_CHARS,
			}),
			renderTextField("Alimentação", textos.alimentacao, {
				max: MAX_SHORT_CHARS,
			}),
			renderTextField("Hidratação", textos.hidratacao, {
				max: MAX_SHORT_CHARS,
			}),
			renderTextField("Fezes e urina", textos.fezesUrina, {
				max: MAX_SHORT_CHARS,
			}),
			renderTextField("Medicações anteriores", textos.medicacoesAnteriores, {
				max: MAX_SHORT_CHARS,
			}),
			renderTextField("Medicações em uso", textos.medicacoesUso, {
				max: MAX_SHORT_CHARS,
			}),
			renderTextField("Histórico de neoplasias", textos.historicoNeoplasias, {
				max: MAX_SHORT_CHARS,
			}),
		]),
		{ compact: true }
	)}

		${renderSection(
		"4",
		"Hábitos e rotina",
		[
			renderSelectedList(anamneseHabitosLabels, f.habitos),
			renderFieldGrid([
				renderTextField("Local onde dorme", textos.localDormir, {
					max: MAX_SHORT_CHARS,
				}),
			]),
		].join(""),
		{ compact: true }
	)}

		${renderSection(
		"5",
		"Avaliação funcional",
		renderSelectedList(anamneseFuncionalLabels, f.funcional),
		{ compact: true }
	)}

		${renderSection(
		"6",
		"Avaliação da dor",
		[
			renderStatusGrid([
				renderStatusRow("Intensidade", humanStatus(dor.nivel || "leve"), "Leve"),
			]),
			renderTextField("Descrição da dor", textos.descricaoDor, {
				max: MAX_SHORT_CHARS,
				wide: true,
			}),
		].join(""),
		{ compact: true }
	)}

		${renderSection(
		"7",
		"Expectativas do tutor",
		renderSelectedList(anamneseExpectativasLabels, f.expectativas),
		{ compact: true }
	)}

		${renderSection(
		"8",
		"Observações gerais",
		renderTextField("Informações adicionais", textos.observacoesGerais, {
			max: MAX_OBS_CHARS,
			wide: true,
		}),
		{ compact: true }
	)}
	`;
}

function renderNeurologica(item) {
	const f = item?.fields || {};
	const textos = f.textos || {};
	const estadoMental = f.estadoMental || {};
	const nervos = f.nervosCranianos || {};
	const reflexos = f.reflexos || {};
	const sensibilidade = f.sensibilidade || {};

	return `
		${renderSection(
		"1",
		"Estado mental e consciência",
		renderStatusGrid([
			renderStatusRow(
				"Nível de consciência",
				humanStatus(estadoMental.nivelConsciencia || "alerta"),
				"Alerta"
			),
			renderStatusRow(
				"Comportamento",
				humanStatus(estadoMental.comportamento || "normal"),
				"Normal"
			),
		]),
		{ compact: true }
	)}

		${renderSection(
		"2",
		"Postura, marcha e reações",
		renderFieldGrid([
			renderTextField("Postura", textos.postura, { max: MAX_SHORT_CHARS }),
			renderTextField("Marcha / locomoção", textos.marcha, {
				max: MAX_SHORT_CHARS,
			}),
			renderTextField("Reações posturais", textos.reacoesPosturais, {
				max: MAX_SHORT_CHARS,
			}),
		]),
		{ compact: true }
	)}

		${renderSection(
		"3",
		"Nervos cranianos",
		renderStatusGrid(
			Object.entries(nervosCranianosLabels).map(([key, label]) =>
				renderStatusRow(
					label,
					humanStatus(nervos[key] || "normal"),
					"Normal"
				)
			)
		),
		{ compact: true }
	)}

		${renderSection(
		"4",
		"Reflexos espinhais",
		renderStatusGrid(
			Object.entries(reflexosLabels).map(([key, label]) =>
				renderStatusRow(
					label,
					humanStatus(reflexos[key] || "normal"),
					"Normal"
				)
			)
		),
		{ compact: true }
	)}

		${renderSection(
		"5",
		"Avaliação sensitiva",
		renderStatusGrid(
			Object.entries(sensibilidadeLabels).map(([key, label]) =>
				renderStatusRow(
					label,
					humanStatus(sensibilidade[key] || "normal"),
					"Normal"
				)
			)
		),
		{ compact: true }
	)}

		${renderSection(
		"6",
		"Observações gerais",
		renderTextField("Informações adicionais", textos.observacoesGerais, {
			max: MAX_OBS_CHARS,
			wide: true,
		}),
		{ compact: true }
	)}
	`;
}

function renderOrtopedica(item) {
	const f = item?.fields || {};
	const textos = f.textos || {};
	const marcha = f.marcha || {};
	const dor = f.dor || {};

	return `
		${renderSection(
		"1",
		"Queixa e histórico",
		renderFieldGrid([
			renderTextField("Queixa principal", textos.queixaPrincipal, {
				max: MAX_FIELD_CHARS,
			}),
			renderTextField("Histórico ortopédico", textos.historicoOrtopedico, {
				max: MAX_FIELD_CHARS,
			}),
		]),
		{ compact: true }
	)}

		${renderSection(
		"2",
		"Localização principal",
		renderSelectedList(ortopedicaLocalizacaoLabels, f.localizacao),
		{ compact: true }
	)}

		${renderSection(
		"3",
		"Inspeção e marcha",
		[
			renderStatusGrid([
				renderStatusRow(
					"Claudicação",
					humanStatus(marcha.claudicacao || "ausente"),
					"Ausente"
				),
				renderStatusRow("Apoio", humanStatus(marcha.apoio || "normal"), "Normal"),
				renderStatusRow(
					"Compensação",
					humanStatus(marcha.compensacao || "ausente"),
					"Ausente"
				),
			]),
			renderFieldGrid([
				renderTextField("Inspeção estática", textos.inspecaoEstatica, {
					max: MAX_SHORT_CHARS,
				}),
				renderTextField("Inspeção dinâmica", textos.inspecaoDinamica, {
					max: MAX_SHORT_CHARS,
				}),
			]),
		].join(""),
		{ compact: true }
	)}

		${renderSection(
		"4",
		"Palpação, dor e amplitude",
		[
			renderStatusGrid([
				renderStatusRow("Nível de dor", humanStatus(dor.nivel || "leve"), "Leve"),
				renderStatusRow(
					"Resposta à palpação",
					humanStatus(dor.respostaPalpacao || "normal"),
					"Normal"
				),
			]),
			renderFieldGrid([
				renderTextField("Palpação", textos.palpacao, {
					max: MAX_SHORT_CHARS,
				}),
				renderTextField("Amplitude de movimento", textos.amplitudeMovimento, {
					max: MAX_SHORT_CHARS,
				}),
				renderTextField("Descrição da dor", textos.dor, {
					max: MAX_SHORT_CHARS,
				}),
			]),
		].join(""),
		{ compact: true }
	)}

		${renderSection(
		"5",
		"Funcionalidade",
		renderSelectedList(ortopedicaFuncionalLabels, f.funcional),
		{ compact: true }
	)}

		${renderSection(
		"6",
		"Conduta inicial",
		renderSelectedList(ortopedicaCondutaLabels, f.conduta),
		{ compact: true }
	)}

		${renderSection(
		"7",
		"Observações gerais",
		renderTextField("Informações adicionais", textos.observacoesGerais, {
			max: MAX_OBS_CHARS,
			wide: true,
		}),
		{ compact: true }
	)}
	`;
}

function renderDocumentBody(item) {
	const kind = getKind(item);

	if (kind === "neurologica") {
		return renderNeurologica(item);
	}

	if (kind === "ortopedica") {
		return renderOrtopedica(item);
	}

	return renderAnamnese(item);
}

function renderAvaliacaoPage(item, index, meta = {}) {
	const kindLabel = getKindLabel(item);
	const title = item?.title?.trim?.() || kindLabel;
	const createdAt = item?.createdAt || item?.updatedAt;
	const colors = getKindColor(item);
	const pageNumber = index + 1;
	const total = meta.total || 1;
	const body = renderDocumentBody(item);

	return `
		<article class="page">
			<div class="page-shell">
				<div class="top-accent" style="background:${colors.primary};"></div>

				<header class="doc-header">
					${renderBrand(meta.logoDataUri)}

					<div class="doc-badge" style="background:${colors.soft}; color:${colors.softText};">
						${escapeHtml(kindLabel)}
					</div>
				</header>

				<section class="doc-hero">
					<div class="hero-eyebrow">PRONTUÁRIO / RELATÓRIO EXPORTADO</div>
					<h1 class="hero-title">${escapeHtml(title)}</h1>
					<div class="hero-subtitle">Relatório clínico exportado pelo FisioVet App</div>
				</section>

				<section class="meta-grid">
					<div class="meta-card">
						<div class="meta-label">Paciente</div>
						<div class="meta-value">${textOrDash(meta.petName)}</div>
					</div>

					<div class="meta-card">
						<div class="meta-label">Tipo</div>
						<div class="meta-value">${escapeHtml(kindLabel)}</div>
					</div>

					<div class="meta-card">
						<div class="meta-label">Data do registro</div>
						<div class="meta-value">${escapeHtml(formatDateOnly(createdAt))}</div>
					</div>

					<div class="meta-card">
						<div class="meta-label">Emitido em</div>
						<div class="meta-value">${escapeHtml(formatDateTime(new Date()))}</div>
					</div>
				</section>

				<main class="doc-body">
					${body}
				</main>

				<footer class="doc-footer">
					<div>FisioVet App • documento gerado automaticamente</div>
					<div>Página ${pageNumber} de ${total}</div>
				</footer>
			</div>
		</article>
	`;
}

async function buildHtml({ evaluations, petName }) {
	const logoDataUri = await getFisioVetLogoDataUri();

	return `
		<!DOCTYPE html>
		<html lang="pt-BR">
			<head>
				<meta charset="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1.0" />

				<style>
					@page {
						size: A4;
						margin: 0;
					}

					* {
						box-sizing: border-box;
					}

					html,
					body {
						width: 210mm;
						margin: 0;
						padding: 0;
						background: #FFFFFF;
						color: #0F172A;
						font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
						font-size: 9.4px;
						line-height: 1.2;
						-webkit-print-color-adjust: exact;
						print-color-adjust: exact;
					}

					.page {
						width: 210mm;
						height: 270mm;
						margin: 0;
						padding: 5mm;
						overflow: hidden;
						page-break-after: always;
						background: #FFFFFF;
					}

					.page:last-child {
						page-break-after: auto;
					}

					.page-shell {
						width: 100%;
						height: 100%;
						border: 1px solid #E2E8F0;
						border-radius: 14px;
						overflow: hidden;
						position: relative;
						background: #FFFFFF;
						display: grid;
						grid-template-rows: 4px 43px auto 38px minmax(0, 1fr) 22px;
					}

					.top-accent {
						height: 4px;
						width: 100%;
					}

					.doc-header {
						padding: 8px 12px 5px 12px;
						display: flex;
						align-items: flex-start;
						justify-content: space-between;
						gap: 10px;
						min-height: 43px;
					}

					.brand {
						display: flex;
						align-items: center;
						gap: 8px;
						min-width: 0;
					}

					.brand-logo {
						width: 38px;
						height: 38px;
						display: flex;
						align-items: center;
						justify-content: center;
						flex-shrink: 0;
						overflow: visible;
					}

					.brand-logo-img {
						width: 38px;
						height: 38px;
						object-fit: contain;
						display: block;
					}

					.brand-logo-fallback {
						width: 38px;
						height: 38px;
						border-radius: 11px;
						background: #159E9C;
						color: #FFFFFF;
						display: flex;
						align-items: center;
						justify-content: center;
						font-size: 8px;
						font-weight: 900;
					}

					.brand-name {
						font-size: 12.4px;
						font-weight: 900;
						color: #0F172A;
						line-height: 1.05;
						letter-spacing: -0.1px;
					}

					.brand-subtitle {
						font-size: 8.4px;
						font-weight: 600;
						color: #64748B;
						margin-top: 2px;
					}

					.doc-badge {
						padding: 4px 9px;
						border-radius: 999px;
						font-size: 8.5px;
						font-weight: 900;
						white-space: nowrap;
						margin-top: 3px;
					}

					.doc-hero {
						padding: 2px 12px 7px 12px;
					}

					.hero-eyebrow {
						font-size: 7.8px;
						font-weight: 900;
						color: #64748B;
						letter-spacing: 0.55px;
						margin-bottom: 2px;
					}

					.hero-title {
						margin: 0;
						font-size: 15.4px;
						line-height: 1.1;
						font-weight: 900;
						color: #0F172A;
						letter-spacing: -0.22px;
					}

					.hero-subtitle {
						margin-top: 3px;
						font-size: 8.6px;
						font-weight: 500;
						color: #475569;
					}

					.meta-grid {
						padding: 0 12px 5px 12px;
						display: grid;
						grid-template-columns: repeat(4, minmax(0, 1fr));
						gap: 6px;
						min-height: 38px;
					}

					.meta-card {
						border: 1px solid #E2E8F0;
						background: #F8FAFC;
						border-radius: 10px;
						padding: 6px 7px;
						min-height: 33px;
					}

					.meta-label {
						font-size: 6.9px;
						font-weight: 900;
						text-transform: uppercase;
						letter-spacing: 0.2px;
						color: #64748B;
						margin-bottom: 2px;
					}

					.meta-value {
						font-size: 8.6px;
						font-weight: 800;
						color: #0F172A;
						word-break: break-word;
						line-height: 1.13;
					}

					.doc-body {
						padding: 0 12px 6px 12px;
						overflow: hidden;
						min-height: 0;
					}

					.section {
						border: 1px solid #E2E8F0;
						border-radius: 9px;
						overflow: hidden;
						margin-top: 5px;
						background: #FFFFFF;
					}

					.section:first-child {
						margin-top: 2px;
					}

					.section-header {
						display: flex;
						align-items: center;
						gap: 6px;
						padding: 5px 7px;
						background: linear-gradient(180deg, #F8FAFC 0%, #F1F5F9 100%);
						border-bottom: 1px solid #E2E8F0;
					}

					.section-number {
						width: 15px;
						height: 15px;
						border-radius: 5px;
						background: #E2E8F0;
						color: #0F172A;
						display: flex;
						align-items: center;
						justify-content: center;
						font-size: 7.2px;
						font-weight: 900;
						flex-shrink: 0;
					}

					.section-header h2 {
						margin: 0;
						font-size: 9.5px;
						line-height: 1.1;
						font-weight: 900;
						color: #0F172A;
						letter-spacing: -0.05px;
					}

					.section-body {
						padding: 5px 7px 3px 7px;
					}

					.field-grid {
						display: grid;
						grid-template-columns: repeat(2, minmax(0, 1fr));
						column-gap: 8px;
						row-gap: 1px;
					}

					.field {
						margin-bottom: 4px;
						min-width: 0;
					}

					.field-wide {
						grid-column: 1 / -1;
					}

					.field-label {
						font-size: 7px;
						font-weight: 900;
						color: #64748B;
						text-transform: uppercase;
						letter-spacing: 0.16px;
						margin-bottom: 1px;
					}

					.field-value {
						font-size: 8.5px;
						line-height: 1.2;
						color: #0F172A;
						word-break: break-word;
						font-weight: 500;
					}

					.empty {
						color: #94A3B8;
						font-style: italic;
						font-size: 8.2px;
						padding-bottom: 2px;
					}

					.selected-list {
						display: flex;
						flex-wrap: wrap;
						gap: 4px;
					}

					.selected-pill {
						display: inline-flex;
						align-items: center;
						gap: 4px;
						border: 1px solid #DCE7F3;
						background: #FBFDFF;
						border-radius: 999px;
						padding: 3px 6px;
						font-size: 8.1px;
						font-weight: 700;
						color: #0F172A;
						line-height: 1;
					}

					.selected-check {
						width: 11px;
						height: 11px;
						border-radius: 50%;
						background: #DCFCE7;
						color: #15803D;
						display: inline-flex;
						align-items: center;
						justify-content: center;
						font-size: 7px;
						font-weight: 900;
						flex-shrink: 0;
					}

					.status-grid {
						display: grid;
						grid-template-columns: repeat(2, minmax(0, 1fr));
						column-gap: 8px;
					}

					.status-row {
						display: flex;
						align-items: center;
						justify-content: space-between;
						gap: 5px;
						padding: 3px 0;
						border-bottom: 1px solid #EEF2F7;
						min-width: 0;
					}

					.status-row:nth-last-child(-n + 2) {
						border-bottom: 0;
					}

					.status-label {
						flex: 1;
						font-size: 8.3px;
						font-weight: 700;
						color: #0F172A;
						line-height: 1.12;
						min-width: 0;
					}

					.status-pill {
						display: inline-flex;
						align-items: center;
						gap: 3px;
						padding: 2px 5px;
						border-radius: 999px;
						font-size: 7.3px;
						font-weight: 900;
						white-space: nowrap;
						border: 1px solid transparent;
						justify-content: center;
						flex-shrink: 0;
					}

					.status-pill .status-dot {
						width: 4px;
						height: 4px;
						border-radius: 999px;
						background: currentColor;
						display: inline-block;
					}

					.status-normal {
						background: #ECFDF5;
						color: #15803D;
						border-color: #BBF7D0;
					}

					.status-changed {
						background: #FFF7ED;
						color: #C2410C;
						border-color: #FED7AA;
					}

					.doc-footer {
						height: 22px;
						display: flex;
						align-items: center;
						justify-content: space-between;
						gap: 10px;
						padding: 0 12px;
						border-top: 1px solid #E2E8F0;
						background: #FFFFFF;
						font-size: 7.4px;
						color: #64748B;
						font-weight: 700;
					}
				</style>
			</head>

			<body>
				${evaluations
			.map((item, index) =>
				renderAvaliacaoPage(item, index, {
					petName,
					total: evaluations.length,
					logoDataUri,
				})
			)
			.join("")}
			</body>
		</html>
	`;
}

export async function exportAvaliacoesPdf({
	evaluations,
	petName,
} = {}) {
	const safeEvaluations = Array.isArray(evaluations) ? evaluations : [];

	if (!safeEvaluations.length) {
		throw new Error("Nenhuma avaliação selecionada para exportar.");
	}

	const html = await buildHtml({
		evaluations: safeEvaluations,
		petName,
	});

	const result = await Print.printToFileAsync({
		html,
		base64: false,
	});

	if (!result?.uri) {
		throw new Error("Não foi possível gerar o PDF.");
	}

	const targetUri = `${FileSystem.documentDirectory}${REPORT_FILE_NAME}`;

	try {
		await FileSystem.deleteAsync(targetUri, { idempotent: true });
	} catch { }

	await FileSystem.copyAsync({
		from: result.uri,
		to: targetUri,
	});

	const available = await Sharing.isAvailableAsync();

	if (!available) {
		return {
			uri: targetUri,
			shared: false,
			fileName: REPORT_FILE_NAME,
		};
	}

	await Sharing.shareAsync(targetUri, {
		mimeType: "application/pdf",
		dialogTitle: "Exportar avaliações",
		UTI: "com.adobe.pdf",
	});

	return {
		uri: targetUri,
		shared: true,
		fileName: REPORT_FILE_NAME,
	};
}