// src/screens/financeiro/Index.jsx
// @ts-nocheck

import AsyncStorage from "@react-native-async-storage/async-storage";

import {
	listEventos,
} from "@/src/services/agenda";

import {
	migrateEventosFinanceiros,
} from "@/src/features/financeiro/financeiro.migration";

import React, {
	useCallback,
	useEffect,
	useMemo,
	useState,
} from "react";

import {
	ActivityIndicator,
	FlatList,
	Pressable,
	RefreshControl,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from "react-native";

import {
	SafeAreaView,
} from "react-native-safe-area-context";

import {
	router,
} from "expo-router";

import {
	useFocusEffect,
	useNavigation,
} from "@react-navigation/native";

import {
	Ionicons,
} from "@expo/vector-icons";

import * as Haptics from "expo-haptics";

import {
	useDispatch,
	useSelector,
} from "react-redux";

import {
	loadLancamentos,
	selectAllLancamentos,
	selectFinanceiroStatus,
} from "@/src/store/slices/financeiroSlice";

import {
	selectTutores,
} from "@/src/store/slices/tutoresSlice";

import {
	selectPetsState,
} from "@/src/store/slices/petsSlice";

import {
	FINANCEIRO_STATUS,
} from "@/src/features/financeiro/financeiro.constants";

import {
	useThemeColor,
} from "@/hooks/useThemeColor";

import {
	loadAgenda,
	selectAgendaState,
} from "@/src/store/slices/agendaSlice";

/* =========================================================
   Constantes
========================================================= */

const COLORS = {
	bg: "#F5F5F7",
	card: "#FFFFFF",

	primary: "#FF6FA5",
	primarySoft: "rgba(255,111,165,0.11)",

	text: "#111827",
	subtext: "#6B7280",
	tertiary: "#9CA3AF",

	border: "rgba(15,23,42,0.08)",

	paid: "#16A34A",
	paidSoft: "rgba(22,163,74,0.10)",

	pending: "#F59E0B",
	pendingSoft: "rgba(245,158,11,0.10)",

	overdue: "#EF4444",
	overdueSoft: "rgba(239,68,68,0.10)",

	partial: "#0A84FF",
	partialSoft: "rgba(10,132,255,0.10)",

	draft: "#8E8E93",
	cancelled: "#6B7280",
};

/*
 * Migração temporária dos eventos financeiros legados.
 *
 * Remover este fluxo aproximadamente em outubro de 2026,
 * quando todos os usuários ativos já tiverem aberto esta versão.
 */
const LEGACY_FINANCEIRO_MIGRATION_KEY =
	"fisiovet:financeiro_migration:eventos_v2";

const MES_LABELS = [
	"Janeiro",
	"Fevereiro",
	"Março",
	"Abril",
	"Maio",
	"Junho",
	"Julho",
	"Agosto",
	"Setembro",
	"Outubro",
	"Novembro",
	"Dezembro",
];

const STATUS_META = {
	[FINANCEIRO_STATUS.RASCUNHO]: {
		label: "Rascunho",
		color: COLORS.draft,
		background: "rgba(142,142,147,0.12)",
	},

	[FINANCEIRO_STATUS.PENDENTE]: {
		label: "Pendente",
		color: COLORS.pending,
		background: COLORS.pendingSoft,
	},

	[FINANCEIRO_STATUS.PARCIAL]: {
		label: "Parcial",
		color: COLORS.partial,
		background: COLORS.partialSoft,
	},

	[FINANCEIRO_STATUS.PAGO]: {
		label: "Pago",
		color: COLORS.paid,
		background: COLORS.paidSoft,
	},

	[FINANCEIRO_STATUS.VENCIDO]: {
		label: "Vencido",
		color: COLORS.overdue,
		background: COLORS.overdueSoft,
	},

	[FINANCEIRO_STATUS.CANCELADO]: {
		label: "Cancelado",
		color: COLORS.cancelled,
		background: "rgba(107,114,128,0.11)",
	},
};

/* =========================================================
   Helpers
========================================================= */

const currencyFormatterBR =
	new Intl.NumberFormat("pt-BR", {
		style: "currency",
		currency: "BRL",
		minimumFractionDigits: 2,
	});

function formatCurrency(value) {
	const number =
		Number(value || 0);

	return currencyFormatterBR.format(
		Number.isFinite(number)
			? number
			: 0
	);
}

function hiddenCurrency() {
	return "R$ •••••";
}

function safeDate(value) {
	if (!value) {
		return null;
	}

	const date =
		new Date(value);

	return Number.isNaN(
		date.getTime()
	)
		? null
		: date;
}

function formatDateBR(value) {
	const date =
		safeDate(value);

	if (!date) {
		return "—";
	}

	return date.toLocaleDateString(
		"pt-BR"
	);
}

function isSameMonthYear(
	value,
	monthIndex,
	year
) {
	const date =
		safeDate(value);

	if (!date) {
		return false;
	}

	return (
		date.getMonth() ===
			monthIndex &&
		date.getFullYear() ===
			year
	);
}

function getPreviousMonthYear(
	monthIndex,
	year
) {
	if (monthIndex === 0) {
		return {
			monthIndex: 11,
			year: year - 1,
		};
	}

	return {
		monthIndex:
			monthIndex - 1,

		year,
	};
}

function normalizeSearchText(
	value
) {
	return String(value || "")
		.normalize("NFD")
		.replace(
			/[\u0300-\u036f]/g,
			""
		)
		.trim()
		.toLowerCase();
}

function calculateSummary(
	list = []
) {
	return list.reduce(
		(accumulator, item) => {
			if (
				item.status ===
				FINANCEIRO_STATUS.CANCELADO
			) {
				return accumulator;
			}

			accumulator.faturado +=
				Number(
					item?.valores
						?.final || 0
				);

			accumulator.recebido +=
				Number(
					item?.valores
						?.recebido || 0
				);

			accumulator.aReceber +=
				Number(
					item?.valores
						?.saldo || 0
				);

			if (
				item.status ===
				FINANCEIRO_STATUS.VENCIDO
			) {
				accumulator.vencido +=
					Number(
						item?.valores
							?.saldo || 0
					);
			}

			return accumulator;
		},
		{
			faturado: 0,
			recebido: 0,
			aReceber: 0,
			vencido: 0,
		}
	);
}

function normalizeAgendaStatus(
	value
) {
	return String(value || "")
		.trim()
		.toLowerCase();
}

function isEventoConfirmado(
	evento
) {
	const status =
		normalizeAgendaStatus(
			evento?.status
		);

	return [
		"confirmado",
		"confirmada",
		"concluido",
		"concluida",
		"concluído",
		"concluída",
	].includes(status);
}

function isEventoPendente(
	evento
) {
	const status =
		normalizeAgendaStatus(
			evento?.status
		);

	return (
		!status ||
		status === "pendente"
	);
}

function isEventoCancelado(
	evento
) {
	const status =
		normalizeAgendaStatus(
			evento?.status
		);

	return [
		"cancelado",
		"cancelada",
	].includes(status);
}

/* =========================================================
   Tela
========================================================= */

export default function FinanceiroScreen() {
	const dispatch =
		useDispatch();

	const navigation =
		useNavigation();

	const today =
		new Date();

	const tint =
		useThemeColor(
			{},
			"tint"
		);

	const lancamentos =
		useSelector(
			selectAllLancamentos
		) || [];

	const loadStatus =
		useSelector(
			selectFinanceiroStatus
		);

	const agendaState =
		useSelector(
			selectAgendaState
		);

	const eventosById =
		agendaState?.byId || {};

	const tutores =
		useSelector(
			selectTutores
		) || [];

	const petsState =
		useSelector(
			selectPetsState
		);

	const petsById =
		petsState?.byId || {};

	const [
		filtroStatus,
		setFiltroStatus,
	] = useState("todos");

	const [
		filtroAno,
		setFiltroAno,
	] = useState(
		today.getFullYear()
	);

	const [
		filtroMesIndex,
		setFiltroMesIndex,
	] = useState(
		today.getMonth()
	);

	const [
		modoGeral,
		setModoGeral,
	] = useState(false);

	const [
		valoresVisiveis,
		setValoresVisiveis,
	] = useState(false);

	const [
		refreshing,
		setRefreshing,
	] = useState(false);

	const [
		migratingLegacy,
		setMigratingLegacy,
	] = useState(false);

	const [
		incluirEventosPendentes,
		setIncluirEventosPendentes,
	] = useState(false);

	const [
		busca,
		setBusca,
	] = useState("");

	const buscaNormalizada =
		useMemo(
			() =>
				normalizeSearchText(
					busca
				),
			[busca]
		);

	const tutorsById =
		useMemo(() => {
			const result = {};

			tutores.forEach(
				(tutor) => {
					if (
						tutor?.id != null
					) {
						result[
							String(
								tutor.id
							)
						] = tutor;
					}
				}
			);

			return result;
		}, [tutores]);

	const lancamentosComAgenda =
		useMemo(() => {
			return lancamentos.map(
				(lancamento) => {
					const eventoId =
						lancamento
							?.origem
							?.eventoId;

					const evento =
						eventoId
							? eventosById[
									String(
										eventoId
									)
								] ||
								null
							: null;

					const isEvento =
						lancamento
							?.origem
							?.tipo ===
						"evento";

					return {
						...lancamento,

						agenda: {
							isEvento,

							eventoId:
								eventoId
									? String(
											eventoId
										)
									: null,

							status:
								evento
									?.status ||
								null,

							confirmado:
								isEvento
									? isEventoConfirmado(
											evento
										)
									: true,

							pendente:
								isEvento
									? isEventoPendente(
											evento
										)
									: false,

							cancelado:
								isEvento
									? isEventoCancelado(
											evento
										)
									: false,
						},
					};
				}
			);
		}, [
			lancamentos,
			eventosById,
		]);

	const migrateLegacyEventosIfNeeded =
		useCallback(async () => {
			try {
				const alreadyMigrated =
					await AsyncStorage.getItem(
						LEGACY_FINANCEIRO_MIGRATION_KEY
					);

				console.log(
					"[Financeiro migration] status local:",
					alreadyMigrated
				);

				if (
					alreadyMigrated ===
					"done"
				) {
					return {
						skipped: true,
						reason:
							"already_done",
					};
				}

				setMigratingLegacy(
					true
				);

				const eventos =
					await listEventos();

				console.log(
					"[Financeiro migration] eventos encontrados:",
					eventos?.length || 0
				);

				const eventosMigraveis =
					(eventos || []).filter(
						(evento) => {
							const preco =
								Number(
									evento
										?.financeiro
										?.preco ??
									evento?.preco ??
									0
								);

							const temFinanceiroLegado =
								evento
									?.financeiro &&
								typeof evento
									.financeiro ===
									"object";

							const temLancamento =
								Boolean(
									evento
										?.financeiro
										?.lancamentoId
								);

							return (
								evento?.id &&
								!temLancamento &&
								(
									temFinanceiroLegado ||
									preco > 0
								)
							);
						}
					);

				console.log(
					"[Financeiro migration] candidatos:",
					eventosMigraveis.length
				);

				if (
					eventosMigraveis
						.length === 0
				) {
					await AsyncStorage.setItem(
						LEGACY_FINANCEIRO_MIGRATION_KEY,
						"done"
					);

					return {
						skipped: false,
						total: 0,
						created: 0,
					};
				}

				const result =
					await migrateEventosFinanceiros(
						eventosMigraveis
					);

				console.log(
					"[Financeiro migration] resultado:",
					result
				);

				const migrationErrors =
					Array.isArray(
						result?.errors
					)
						? result.errors
						: Array.isArray(
								result?.erros
							)
							? result.erros
							: [];

				if (
					result &&
					migrationErrors
						.length === 0
				) {
					await AsyncStorage.setItem(
						LEGACY_FINANCEIRO_MIGRATION_KEY,
						"done"
					);
				} else {
					console.warn(
						"[Financeiro migration] não marcada como concluída:",
						migrationErrors
					);
				}

				return result;
			} catch (error) {
				console.warn(
					"[Financeiro migration] erro:",
					error
				);

				return {
					skipped: false,
					error,
				};
			} finally {
				setMigratingLegacy(
					false
				);
			}
		}, []);

	const triggerHaptic =
		useCallback(() => {
			Haptics.impactAsync(
				Haptics
					.ImpactFeedbackStyle
					.Light
			).catch(() => {});
		}, []);

	const loadData =
		useCallback(async () => {
			try {
				setRefreshing(true);

				await migrateLegacyEventosIfNeeded();

				await Promise.all([
					dispatch(
						loadAgenda()
					).unwrap(),

					dispatch(
						loadLancamentos()
					).unwrap(),
				]);
			} catch (error) {
				console.warn(
					"Erro ao carregar lançamentos:",
					error
				);
			} finally {
				setRefreshing(false);
			}
		}, [
			dispatch,
			migrateLegacyEventosIfNeeded,
		]);

	useEffect(() => {
		const blurSubscription =
			navigation.addListener(
				"blur",
				() => {
					setValoresVisiveis(
						false
					);
				}
			);

		return blurSubscription;
	}, [navigation]);

	useFocusEffect(
		useCallback(() => {
			loadData();
		}, [loadData])
	);

	const lancamentosConsiderados =
		useMemo(() => {
			return lancamentosComAgenda.filter(
				(lancamento) => {
					if (
						lancamento.status ===
						FINANCEIRO_STATUS.CANCELADO
					) {
						return false;
					}

					if (
						!lancamento.agenda
							?.isEvento
					) {
						return true;
					}

					if (
						lancamento.agenda
							.cancelado
					) {
						return false;
					}

					if (
						lancamento.agenda
							.confirmado
					) {
						return true;
					}

					if (
						lancamento.agenda
							.pendente
					) {
						return incluirEventosPendentes;
					}

					return incluirEventosPendentes;
				}
			);
		}, [
			lancamentosComAgenda,
			incluirEventosPendentes,
		]);

	const lancamentosPeriodo =
		useMemo(() => {
			if (modoGeral) {
				return lancamentosConsiderados;
			}

			return lancamentosConsiderados.filter(
				(item) =>
					isSameMonthYear(
						item.competencia ||
							item.vencimento,
						filtroMesIndex,
						filtroAno
					)
			);
		}, [
			lancamentosConsiderados,
			modoGeral,
			filtroMesIndex,
			filtroAno,
		]);

	/*
	 * O filtro financeiro é aplicado antes da busca.
	 * Dessa forma, os cards também passam a refletir
	 * o status selecionado.
	 */
	const lancamentosPorStatus =
		useMemo(() => {
			if (
				filtroStatus ===
				"pendente"
			) {
				return lancamentosPeriodo.filter(
					(item) =>
						[
							FINANCEIRO_STATUS.PENDENTE,
							FINANCEIRO_STATUS.PARCIAL,
							FINANCEIRO_STATUS.VENCIDO,
						].includes(
							item.status
						)
				);
			}

			if (
				filtroStatus ===
				"pago"
			) {
				return lancamentosPeriodo.filter(
					(item) =>
						item.status ===
						FINANCEIRO_STATUS.PAGO
				);
			}

			return lancamentosPeriodo;
		}, [
			lancamentosPeriodo,
			filtroStatus,
		]);

	/*
	 * Busca por:
	 * - tutor;
	 * - pets;
	 * - descrição;
	 * - categoria;
	 * - origem;
	 * - status.
	 *
	 * A busca também alimenta os cards de resumo.
	 */
	const lancamentosFiltrados =
		useMemo(() => {
			const result =
				lancamentosPorStatus.filter(
					(item) => {
						if (
							!buscaNormalizada
						) {
							return true;
						}

						const tutor =
							item.tutorId
								? tutorsById[
										String(
											item.tutorId
										)
									]
								: null;

						const tutorName =
							tutor?.nome ||
							tutor?.name ||
							"";

						const petNames =
							(
								item.petIds ||
								[]
							)
								.map(
									(petId) => {
										const pet =
											petsById[
												String(
													petId
												)
											];

										return (
											pet
												?.nome ||
											pet
												?.name ||
											""
										);
									}
								)
								.filter(
									Boolean
								)
								.join(" ");

						const statusLabel =
							STATUS_META[
								item.status
							]?.label || "";

						const origemLabel =
							item?.origem
								?.tipo ===
							"evento"
								? "evento"
								: "avulso";

						const searchableText =
							normalizeSearchText(
								[
									item.descricao,
									item.categoria,
									tutorName,
									petNames,
									statusLabel,
									origemLabel,
								].join(" ")
							);

						return searchableText.includes(
							buscaNormalizada
						);
					}
				);

			return result.sort(
				(a, b) => {
					const dateA =
						safeDate(
							a.competencia ||
								a.vencimento
						)?.getTime() ||
						0;

					const dateB =
						safeDate(
							b.competencia ||
								b.vencimento
						)?.getTime() ||
						0;

					return (
						dateB -
						dateA
					);
				}
			);
		}, [
			lancamentosPorStatus,
			buscaNormalizada,
			tutorsById,
			petsById,
		]);

	/*
	 * Todos os filtros alteram os cards:
	 * período, previstos, status e busca.
	 */
	const resumo =
		useMemo(
			() =>
				calculateSummary(
					lancamentosFiltrados
				),
			[lancamentosFiltrados]
		);

	const resumoContexto =
		useMemo(() => {
			if (busca.trim()) {
				return `${lancamentosFiltrados.length} resultado${
					lancamentosFiltrados.length ===
					1
						? ""
						: "s"
				} na busca`;
			}

			if (modoGeral) {
				return `${lancamentosFiltrados.length} lançamento${
					lancamentosFiltrados.length ===
					1
						? ""
						: "s"
				}`;
			}

			return `${MES_LABELS[filtroMesIndex]} ${filtroAno}`;
		}, [
			busca,
			lancamentosFiltrados.length,
			modoGeral,
			filtroMesIndex,
			filtroAno,
		]);

	function handlePreviousMonth() {
		triggerHaptic();

		const previous =
			getPreviousMonthYear(
				filtroMesIndex,
				filtroAno
			);

		setFiltroMesIndex(
			previous.monthIndex
		);

		setFiltroAno(
			previous.year
		);

		setModoGeral(false);
	}

	function handleNextMonth() {
		triggerHaptic();

		if (
			filtroMesIndex === 11
		) {
			setFiltroMesIndex(0);

			setFiltroAno(
				(previous) =>
					previous + 1
			);
		} else {
			setFiltroMesIndex(
				(previous) =>
					previous + 1
			);
		}

		setModoGeral(false);
	}

	function handleTodayMonth() {
		triggerHaptic();

		const now =
			new Date();

		setFiltroMesIndex(
			now.getMonth()
		);

		setFiltroAno(
			now.getFullYear()
		);

		setFiltroStatus(
			"todos"
		);

		setModoGeral(false);
	}

	function handleClearSearch() {
		triggerHaptic();
		setBusca("");
	}

	function handleOpenNovo() {
		triggerHaptic();

		router.push(
			"/(modals)/financeiro/novo"
		);
	}

	function handleOpenLancamento(
		lancamento
	) {
		triggerHaptic();

		router.push({
			pathname:
				"/(modals)/financeiro/[id]",

			params: {
				id: String(
					lancamento.id
				),
			},
		});
	}

	const isInitialLoading =
		loadStatus === "loading" &&
		lancamentos.length === 0;

	return (
		<SafeAreaView
			style={styles.safeArea}
			edges={["top"]}
		>
			<View style={styles.header}>
				<View
					style={
						styles.headerLeft
					}
				>
					<Text
						style={[
							styles.headerTitle,
							{
								color: tint,
							},
						]}
					>
						Financeiro
					</Text>

					<Text
						style={
							styles.headerSubtitle
						}
					>
						Lançamentos e recebimentos
					</Text>

					{migratingLegacy && (
						<View
							style={
								styles.migrationRow
							}
						>
							<ActivityIndicator
								size="small"
								color={
									COLORS.primary
								}
							/>

							<Text
								style={
									styles.migrationText
								}
							>
								Importando lançamentos antigos…
							</Text>
						</View>
					)}
				</View>

				<TouchableOpacity
					style={
						styles.eyeButton
					}
					onPress={() => {
						triggerHaptic();

						setValoresVisiveis(
							(previous) =>
								!previous
						);
					}}
				>
					<Text
						style={
							styles.eyeButtonText
						}
					>
						{valoresVisiveis
							? "🙈"
							: "👁"}
					</Text>
				</TouchableOpacity>

				<TouchableOpacity
					style={[
						styles.newButton,
						{
							backgroundColor:
								tint,
						},
					]}
					onPress={
						handleOpenNovo
					}
				>
					<Ionicons
						name="add"
						size={20}
						color="#FFFFFF"
					/>
				</TouchableOpacity>
			</View>

			<View
				style={
					styles.resumoGrid
				}
			>
				<ResumoCard
					label="Faturado"
					icon="wallet-outline"
					color={
						COLORS.primary
					}
					background={
						COLORS.primarySoft
					}
					helper={
						resumoContexto
					}
					value={formatCurrency(
						resumo.faturado
					)}
					hide={
						!valoresVisiveis
					}
				/>

				<ResumoCard
					label="A receber"
					icon="time-outline"
					color={
						COLORS.pending
					}
					background={
						COLORS.pendingSoft
					}
					helper={
						incluirEventosPendentes
							? "Confirmado + previsto"
							: resumoContexto
					}
					value={formatCurrency(
						resumo.aReceber
					)}
					hide={
						!valoresVisiveis
					}
				/>

				<ResumoCard
					label="Recebido"
					icon="checkmark-circle-outline"
					color={
						COLORS.paid
					}
					background={
						COLORS.paidSoft
					}
					helper={
						resumoContexto
					}
					value={formatCurrency(
						resumo.recebido
					)}
					hide={
						!valoresVisiveis
					}
				/>

				<ResumoCard
					label="Vencido"
					icon="alert-circle-outline"
					color={
						COLORS.overdue
					}
					background={
						COLORS.overdueSoft
					}
					helper={
						resumo.vencido > 0
							? "Saldo em atraso"
							: resumoContexto
					}
					value={formatCurrency(
						resumo.vencido
					)}
					hide={
						!valoresVisiveis
					}
				/>
			</View>

			<View
				style={
					styles.monthFilterRow
				}
			>
				<TouchableOpacity
					onPress={
						handlePreviousMonth
					}
					style={
						styles.monthNavButton
					}
					disabled={
						modoGeral
					}
				>
					<Ionicons
						name="chevron-back"
						size={19}
						color={
							modoGeral
								? "#D1D5DB"
								: COLORS.primary
						}
					/>
				</TouchableOpacity>

				<View
					style={
						styles.monthLabelBox
					}
				>
					<Text
						style={
							styles.monthLabelText
						}
					>
						{modoGeral
							? `Todos os períodos (${lancamentosFiltrados.length})`
							: `${MES_LABELS[filtroMesIndex]} ${filtroAno} (${lancamentosFiltrados.length})`}
					</Text>

					{busca.trim() ? (
						<Text
							style={
								styles.monthSearchHint
							}
							numberOfLines={1}
						>
							Resultado filtrado por “{busca.trim()}”
						</Text>
					) : null}
				</View>

				<TouchableOpacity
					onPress={
						handleNextMonth
					}
					style={
						styles.monthNavButton
					}
					disabled={
						modoGeral
					}
				>
					<Ionicons
						name="chevron-forward"
						size={19}
						color={
							modoGeral
								? "#D1D5DB"
								: COLORS.primary
						}
					/>
				</TouchableOpacity>
			</View>

			<View
				style={
					styles.searchSection
				}
			>
				<View
					style={
						styles.searchBox
					}
				>
					<Ionicons
						name="search"
						size={17}
						color={
							COLORS.tertiary
						}
					/>

					<TextInput
						value={busca}
						onChangeText={
							setBusca
						}
						placeholder="Buscar por tutor, pet ou lançamento"
						placeholderTextColor={
							COLORS.tertiary
						}
						autoCapitalize="none"
						autoCorrect={false}
						clearButtonMode="never"
						returnKeyType="search"
						style={
							styles.searchInput
						}
					/>

					{!!busca && (
						<Pressable
							onPress={
								handleClearSearch
							}
							hitSlop={8}
							style={({
								pressed,
							}) => [
								styles.searchClearButton,
								pressed && {
									opacity: 0.6,
								},
							]}
						>
							<Ionicons
								name="close-circle"
								size={18}
								color={
									COLORS.tertiary
								}
							/>
						</Pressable>
					)}
				</View>

				{/*
				 * Espaço preparado para um futuro DatePicker.
				 *
				 * Exemplo:
				 *
				 * <Pressable style={styles.dateFilterButton}>
				 *     <Ionicons
				 *         name="calendar-outline"
				 *         size={18}
				 *         color={COLORS.primary}
				 *     />
				 * </Pressable>
				 */}
			</View>

			<View
				style={
					styles.filtersContainer
				}
			>
				<View
					style={
						styles.statusFilterGroup
					}
				>
					<FiltroChip
						label="Todos"
						icon="list-outline"
						active={
							filtroStatus ===
							"todos"
						}
						onPress={() => {
							triggerHaptic();

							setFiltroStatus(
								"todos"
							);
						}}
					/>

					<FiltroChip
						label="Pendentes"
						icon="time-outline"
						active={
							filtroStatus ===
							"pendente"
						}
						onPress={() => {
							triggerHaptic();

							setFiltroStatus(
								"pendente"
							);
						}}
					/>

					<FiltroChip
						label="Pagos"
						icon="checkmark-circle-outline"
						active={
							filtroStatus ===
							"pago"
						}
						onPress={() => {
							triggerHaptic();

							setFiltroStatus(
								"pago"
							);
						}}
					/>
				</View>

				<View
					style={
						styles.scopeFilterRow
					}
				>
					<TouchableOpacity
						style={[
							styles.scopeButton,
							incluirEventosPendentes &&
								styles.forecastButtonActive,
						]}
						onPress={() => {
							triggerHaptic();

							setIncluirEventosPendentes(
								(previous) =>
									!previous
							);
						}}
					>
						<Ionicons
							name="calendar-outline"
							size={13}
							color={
								incluirEventosPendentes
									? COLORS.pending
									: COLORS.subtext
							}
						/>

						<Text
							style={[
								styles.scopeButtonText,
								incluirEventosPendentes &&
									styles.forecastButtonTextActive,
							]}
						>
							Previstos
						</Text>
					</TouchableOpacity>

					<TouchableOpacity
						style={
							styles.scopeButton
						}
						onPress={
							handleTodayMonth
						}
					>
						<Ionicons
							name="today-outline"
							size={13}
							color={
								COLORS.subtext
							}
						/>

						<Text
							style={
								styles.scopeButtonText
							}
						>
							Mês atual
						</Text>
					</TouchableOpacity>

					<TouchableOpacity
						style={[
							styles.scopeButton,
							modoGeral &&
								styles.scopeButtonActive,
						]}
						onPress={() => {
							triggerHaptic();

							setModoGeral(
								(previous) =>
									!previous
							);
						}}
					>
						<Ionicons
							name="albums-outline"
							size={13}
							color={
								modoGeral
									? "#FFFFFF"
									: COLORS.subtext
							}
						/>

						<Text
							style={[
								styles.scopeButtonText,
								modoGeral &&
									styles.scopeButtonTextActive,
							]}
						>
							Geral
						</Text>
					</TouchableOpacity>
				</View>
			</View>

			{isInitialLoading ? (
				<View
					style={
						styles.loadingBox
					}
				>
					<ActivityIndicator
						size="small"
						color={
							COLORS.primary
						}
					/>

					<Text
						style={
							styles.loadingText
						}
					>
						Carregando lançamentos…
					</Text>
				</View>
			) : (
				<FlatList
					data={
						lancamentosFiltrados
					}
					keyExtractor={(
						item
					) =>
						String(
							item.id
						)
					}
					showsVerticalScrollIndicator
					keyboardShouldPersistTaps="handled"
					keyboardDismissMode="on-drag"
					contentContainerStyle={
						styles.listContent
					}
					refreshControl={
						<RefreshControl
							refreshing={
								refreshing
							}
							onRefresh={
								loadData
							}
							tintColor={
								COLORS.primary
							}
							colors={[
								COLORS.primary,
							]}
						/>
					}
					renderItem={({
						item,
					}) => (
						<LancamentoCard
							lancamento={
								item
							}
							tutor={
								item.tutorId
									? tutorsById[
											String(
												item.tutorId
											)
										]
									: null
							}
							pets={(
								item.petIds ||
								[]
							)
								.map(
									(
										petId
									) =>
										petsById[
											String(
												petId
											)
										]
								)
								.filter(
									Boolean
								)}
							hideValues={
								!valoresVisiveis
							}
							onPress={() =>
								handleOpenLancamento(
									item
								)
							}
						/>
					)}
					ListEmptyComponent={
						<View
							style={
								styles.emptyBox
							}
						>
							<View
								style={
									styles.emptyIconCircle
								}
							>
								<Ionicons
									name={
										busca.trim()
											? "search-outline"
											: "wallet-outline"
									}
									size={28}
									color={
										COLORS.primary
									}
								/>
							</View>

							<Text
								style={
									styles.emptyTitle
								}
							>
								{busca.trim()
									? "Nenhum resultado"
									: "Nenhum lançamento"}
							</Text>

							<Text
								style={
									styles.emptyText
								}
							>
								{busca.trim()
									? `Não encontramos tutor, pet ou lançamento correspondente a “${busca.trim()}”.`
									: "Crie um lançamento avulso ou registre um atendimento com valor."}
							</Text>

							{busca.trim() ? (
								<Pressable
									onPress={
										handleClearSearch
									}
									style={
										styles.clearSearchEmptyButton
									}
								>
									<Text
										style={
											styles.clearSearchEmptyText
										}
									>
										Limpar busca
									</Text>
								</Pressable>
							) : (
								<Pressable
									onPress={
										handleOpenNovo
									}
									style={
										styles.emptyButton
									}
								>
									<Ionicons
										name="add"
										size={18}
										color="#FFFFFF"
									/>

									<Text
										style={
											styles.emptyButtonText
										}
									>
										Novo lançamento
									</Text>
								</Pressable>
							)}
						</View>
					}
				/>
			)}
		</SafeAreaView>
	);
}

/* =========================================================
   Componentes internos
========================================================= */

function ResumoCard({
	label,
	helper,
	value,
	hide,
	icon,
	color,
	background,
}) {
	return (
		<View
			style={
				styles.resumoCard
			}
		>
			<View
				style={
					styles.resumoHeader
				}
			>
				<View
					style={[
						styles.resumoIconBox,
						{
							backgroundColor:
								background,
						},
					]}
				>
					<Ionicons
						name={icon}
						size={15}
						color={color}
					/>
				</View>

				<Text
					style={
						styles.resumoLabel
					}
					numberOfLines={1}
				>
					{label}
				</Text>
			</View>

			<Text
				style={[
					styles.resumoValue,
					{
						color,
					},
				]}
				numberOfLines={1}
				adjustsFontSizeToFit
				minimumFontScale={0.82}
			>
				{hide
					? hiddenCurrency()
					: value}
			</Text>

			<Text
				style={
					styles.resumoHelper
				}
				numberOfLines={1}
			>
				{helper}
			</Text>
		</View>
	);
}

function FiltroChip({
	label,
	icon,
	active,
	onPress,
}) {
	return (
		<TouchableOpacity
			style={[
				styles.statusFilterButton,
				active &&
					styles.statusFilterButtonActive,
			]}
			onPress={onPress}
			activeOpacity={0.78}
		>
			{!!icon && (
				<Ionicons
					name={icon}
					size={13}
					color={
						active
							? "#FFFFFF"
							: COLORS.subtext
					}
				/>
			)}

			<Text
				style={[
					styles.statusFilterText,
					active &&
						styles.statusFilterTextActive,
				]}
				numberOfLines={1}
			>
				{label}
			</Text>
		</TouchableOpacity>
	);
}

function LancamentoCard({
	lancamento,
	tutor,
	pets,
	onPress,
	hideValues,
}) {
	const status =
		STATUS_META[
			lancamento.status
		] ||
		STATUS_META[
			FINANCEIRO_STATUS.PENDENTE
		];

	const tutorName =
		tutor?.nome ||
		tutor?.name ||
		"Sem tutor";

	const petNames =
		pets
			.map(
				(pet) =>
					pet?.nome ||
					pet?.name
			)
			.filter(Boolean)
			.join(", ");

	const isPrevisto =
		Boolean(
			lancamento?.agenda
				?.isEvento &&
				lancamento?.agenda
					?.pendente
		);

	return (
		<TouchableOpacity
			style={
				styles.lancamentoCard
			}
			onPress={onPress}
			activeOpacity={0.8}
		>
			<View
				style={
					styles.lancamentoHeader
				}
			>
				<View
					style={
						styles.lancamentoTitleBox
					}
				>
					<Text
						style={
							styles.lancamentoTitle
						}
						numberOfLines={1}
					>
						{lancamento.descricao ||
							"Lançamento"}
					</Text>

					<Text
						style={
							styles.lancamentoSubtitle
						}
						numberOfLines={1}
					>
						{tutorName}
						{petNames
							? ` · ${petNames}`
							: ""}
					</Text>
				</View>

				<View
					style={[
						styles.badge,
						{
							backgroundColor:
								status.background,
						},
					]}
				>
					<Text
						style={[
							styles.badgeText,
							{
								color:
									status.color,
							},
						]}
					>
						{status.label}
					</Text>
				</View>
			</View>

			<View
				style={
					styles.lancamentoFooter
				}
			>
				<View
					style={
						styles.lancamentoMeta
					}
				>
					<Text
						style={
							styles.lancamentoData
						}
					>
						{formatDateBR(
							lancamento.competencia ||
								lancamento.vencimento
						)}
					</Text>

					{lancamento
						?.origem
						?.tipo ===
						"evento" && (
						<Text
							style={
								styles.originText
							}
						>
							Gerado por evento
						</Text>
					)}

					{isPrevisto && (
						<Text
							style={
								styles.forecastText
							}
						>
							Evento ainda pendente
						</Text>
					)}
				</View>

				<View
					style={
						styles.valueBlock
					}
				>
					<Text
						style={
							styles.lancamentoValor
						}
					>
						{hideValues
							? hiddenCurrency()
							: formatCurrency(
									lancamento
										?.valores
										?.final
								)}
					</Text>

					{!hideValues &&
						Number(
							lancamento
								?.valores
								?.saldo ||
								0
						) > 0 && (
						<Text
							style={
								styles.balanceText
							}
						>
							Saldo{" "}
							{formatCurrency(
								lancamento
									?.valores
									?.saldo
							)}
						</Text>
					)}
				</View>
			</View>
		</TouchableOpacity>
	);
}

/* =========================================================
   Styles
========================================================= */

const styles =
	StyleSheet.create({
		safeArea: {
			flex: 1,
			backgroundColor:
				COLORS.bg,
		},

		header: {
			paddingHorizontal: 16,
			paddingTop: 16,
			paddingBottom: 6,
			flexDirection: "row",
			alignItems: "center",
			gap: 8,
		},

		headerLeft: {
			flex: 1,
		},

		headerTitle: {
			fontSize: 24,
			fontWeight: "850",
		},

		headerSubtitle: {
			marginTop: 2,
			color: COLORS.subtext,
			fontSize: 13,
		},

		migrationRow: {
			marginTop: 4,
			flexDirection: "row",
			alignItems: "center",
			gap: 6,
		},

		migrationText: {
			color: COLORS.subtext,
			fontSize: 11,
			fontWeight: "650",
		},

		eyeButton: {
			width: 38,
			height: 38,
			borderRadius: 19,
			backgroundColor:
				COLORS.card,
			alignItems: "center",
			justifyContent: "center",
			borderWidth: 1,
			borderColor:
				COLORS.border,
		},

		eyeButtonText: {
			fontSize: 19,
			lineHeight: 23,
		},

		newButton: {
			width: 38,
			height: 38,
			borderRadius: 19,
			alignItems: "center",
			justifyContent: "center",
		},

		resumoGrid: {
			paddingHorizontal: 16,
			paddingTop: 6,
			paddingBottom: 7,
			flexDirection: "row",
			flexWrap: "wrap",
			justifyContent:
				"space-between",
			rowGap: 8,
		},

		resumoCard: {
			width: "48.5%",
			minHeight: 89,
			paddingHorizontal: 11,
			paddingVertical: 10,
			borderRadius: 15,
			backgroundColor:
				COLORS.card,
			borderWidth: 1,
			borderColor:
				COLORS.border,

			shadowColor: "#000",
			shadowOpacity: 0.055,
			shadowRadius: 5,
			shadowOffset: {
				width: 0,
				height: 2,
			},

			elevation: 2,
		},

		resumoHeader: {
			flexDirection: "row",
			alignItems: "center",
			gap: 6,
		},

		resumoIconBox: {
			width: 25,
			height: 25,
			borderRadius: 8,
			alignItems: "center",
			justifyContent: "center",
		},

		resumoLabel: {
			flex: 1,
			color: COLORS.subtext,
			fontSize: 10.5,
			fontWeight: "750",
		},

		resumoValue: {
			marginTop: 7,
			fontSize: 16,
			lineHeight: 20,
			fontWeight: "850",
			fontVariant: [
				"tabular-nums",
			],
		},

		resumoHelper: {
			marginTop: 3,
			color: COLORS.subtext,
			fontSize: 9.5,
			fontWeight: "500",
		},

		monthFilterRow: {
			minHeight: 39,
			flexDirection: "row",
			alignItems: "center",
			paddingHorizontal: 16,
			paddingVertical: 3,
		},

		monthNavButton: {
			width: 34,
			height: 34,
			alignItems: "center",
			justifyContent: "center",
		},

		monthLabelBox: {
			flex: 1,
			alignItems: "center",
			paddingHorizontal: 5,
		},

		monthLabelText: {
			color: COLORS.text,
			fontSize: 13,
			fontWeight: "750",
			textAlign: "center",
		},

		monthSearchHint: {
			maxWidth: "100%",
			marginTop: 2,
			color: COLORS.primary,
			fontSize: 9.5,
			fontWeight: "650",
			textAlign: "center",
		},

		searchSection: {
			paddingHorizontal: 16,
			paddingTop: 3,
			paddingBottom: 7,
			flexDirection: "row",
			alignItems: "center",
			gap: 7,
		},

		searchBox: {
			flex: 1,
			height: 40,
			paddingLeft: 12,
			paddingRight: 7,
			borderRadius: 12,
			backgroundColor:
				COLORS.card,
			borderWidth: 1,
			borderColor:
				COLORS.border,
			flexDirection: "row",
			alignItems: "center",
			gap: 8,
		},

		searchInput: {
			flex: 1,
			height: "100%",
			paddingVertical: 0,
			color: COLORS.text,
			fontSize: 12.5,
			fontWeight: "500",
		},

		searchClearButton: {
			width: 30,
			height: 30,
			alignItems: "center",
			justifyContent: "center",
		},

		dateFilterButton: {
			width: 40,
			height: 40,
			borderRadius: 12,
			backgroundColor:
				COLORS.card,
			borderWidth: 1,
			borderColor:
				COLORS.border,
			alignItems: "center",
			justifyContent: "center",
		},

		filtersContainer: {
			paddingHorizontal: 16,
			paddingTop: 0,
			paddingBottom: 8,
			gap: 7,
		},

		statusFilterGroup: {
			height: 36,
			padding: 3,
			borderRadius: 12,
			backgroundColor:
				"rgba(118,118,128,0.10)",
			flexDirection: "row",
			alignItems: "center",
			gap: 3,
		},

		statusFilterButton: {
			flex: 1,
			height: 30,
			borderRadius: 9,
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			gap: 4,
		},

		statusFilterButtonActive: {
			backgroundColor:
				COLORS.primary,

			shadowColor: "#000",
			shadowOpacity: 0.1,
			shadowRadius: 3,
			shadowOffset: {
				width: 0,
				height: 1,
			},

			elevation: 2,
		},

		statusFilterText: {
			color: COLORS.subtext,
			fontSize: 10.5,
			fontWeight: "700",
		},

		statusFilterTextActive: {
			color: "#FFFFFF",
			fontWeight: "850",
		},

		scopeFilterRow: {
			flexDirection: "row",
			alignItems: "center",
			gap: 6,
		},

		scopeButton: {
			flex: 1,
			minHeight: 31,
			paddingHorizontal: 6,
			borderRadius: 10,
			borderWidth: 1,
			borderColor:
				COLORS.border,
			backgroundColor:
				COLORS.card,
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			gap: 4,
		},

		scopeButtonActive: {
			backgroundColor:
				COLORS.primary,
			borderColor:
				COLORS.primary,
		},

		scopeButtonText: {
			color: COLORS.subtext,
			fontSize: 10,
			fontWeight: "750",
		},

		scopeButtonTextActive: {
			color: "#FFFFFF",
			fontWeight: "850",
		},

		forecastButtonActive: {
			backgroundColor:
				COLORS.pendingSoft,
			borderColor:
				"rgba(245,158,11,0.35)",
		},

		forecastButtonTextActive: {
			color: COLORS.pending,
			fontWeight: "850",
		},

		listContent: {
			paddingHorizontal: 16,
			paddingTop: 7,
			paddingBottom: 100,
			flexGrow: 1,
		},

		lancamentoCard: {
			marginBottom: 11,
			padding: 13,
			borderRadius: 17,
			backgroundColor:
				COLORS.card,
			borderWidth: 1,
			borderColor:
				COLORS.border,

			shadowColor: "#000",
			shadowOpacity: 0.07,
			shadowRadius: 7,
			shadowOffset: {
				width: 0,
				height: 3,
			},

			elevation: 3,
		},

		lancamentoHeader: {
			flexDirection: "row",
			alignItems: "flex-start",
		},

		lancamentoTitleBox: {
			flex: 1,
			minWidth: 0,
			marginRight: 10,
		},

		lancamentoTitle: {
			color: COLORS.text,
			fontSize: 14,
			fontWeight: "800",
		},

		lancamentoSubtitle: {
			marginTop: 3,
			color: COLORS.subtext,
			fontSize: 12,
		},

		badge: {
			paddingHorizontal: 9,
			paddingVertical: 5,
			borderRadius: 999,
		},

		badgeText: {
			fontSize: 10,
			fontWeight: "850",
		},

		lancamentoFooter: {
			marginTop: 11,
			paddingTop: 10,
			borderTopWidth: 1,
			borderTopColor:
				"rgba(15,23,42,0.06)",
			flexDirection: "row",
			justifyContent:
				"space-between",
			alignItems: "flex-end",
		},

		lancamentoMeta: {
			flex: 1,
			minWidth: 0,
			marginRight: 10,
		},

		lancamentoData: {
			color: COLORS.subtext,
			fontSize: 12,
			fontWeight: "650",
		},

		originText: {
			marginTop: 3,
			color: COLORS.partial,
			fontSize: 10,
			fontWeight: "650",
		},

		forecastText: {
			marginTop: 3,
			color: COLORS.pending,
			fontSize: 10,
			fontWeight: "750",
		},

		valueBlock: {
			alignItems: "flex-end",
		},

		lancamentoValor: {
			color: COLORS.primary,
			fontSize: 16,
			fontWeight: "850",
			fontVariant: [
				"tabular-nums",
			],
		},

		balanceText: {
			marginTop: 2,
			color: COLORS.pending,
			fontSize: 10,
			fontWeight: "700",
		},

		loadingBox: {
			flex: 1,
			alignItems: "center",
			justifyContent: "center",
			gap: 10,
		},

		loadingText: {
			color: COLORS.subtext,
			fontSize: 13,
		},

		emptyBox: {
			marginTop: 24,
			paddingHorizontal: 20,
			paddingVertical: 24,
			borderRadius: 18,
			backgroundColor:
				COLORS.card,
			borderWidth: 1,
			borderColor:
				COLORS.border,
			alignItems: "center",
		},

		emptyIconCircle: {
			width: 58,
			height: 58,
			marginBottom: 12,
			borderRadius: 29,
			backgroundColor:
				COLORS.primarySoft,
			alignItems: "center",
			justifyContent: "center",
		},

		emptyTitle: {
			color: COLORS.text,
			fontSize: 16,
			fontWeight: "850",
		},

		emptyText: {
			marginTop: 6,
			color: COLORS.subtext,
			fontSize: 13,
			lineHeight: 18,
			textAlign: "center",
		},

		emptyButton: {
			minHeight: 42,
			marginTop: 15,
			paddingHorizontal: 15,
			borderRadius: 21,
			backgroundColor:
				COLORS.primary,
			flexDirection: "row",
			alignItems: "center",
			gap: 5,
		},

		emptyButtonText: {
			color: "#FFFFFF",
			fontSize: 13,
			fontWeight: "850",
		},

		clearSearchEmptyButton: {
			minHeight: 38,
			marginTop: 14,
			paddingHorizontal: 15,
			borderRadius: 19,
			backgroundColor:
				COLORS.primarySoft,
			alignItems: "center",
			justifyContent: "center",
		},

		clearSearchEmptyText: {
			color: COLORS.primary,
			fontSize: 12,
			fontWeight: "800",
		},
	});