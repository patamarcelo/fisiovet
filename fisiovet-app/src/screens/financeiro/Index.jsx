// src/screens/financeiro/Index.jsx
import React, { useCallback, useMemo, useState, useEffect } from 'react';

import {
	ActivityIndicator,
	FlatList,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
	Alert,
	Modal,
	TextInput,
	RefreshControl,
	KeyboardAvoidingView,
	Platform,
	Pressable,
} from 'react-native';


import { SafeAreaView } from 'react-native-safe-area-context';

import { useFocusEffect, useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';

import { listEventos } from '@/src/services/agenda';
import { listPets } from '@/src/services/pets';

import { useDispatch } from 'react-redux';
import { updateEvento as updateEventoAction } from '@/src/store/slices/agendaSlice';

import { useThemeColor } from "@/hooks/useThemeColor";

/* =======================
   Helpers
======================= */
// formatter criado uma vez só (melhor performance)
const currencyFormatterBR = new Intl.NumberFormat('pt-BR', {
	style: 'currency',
	currency: 'BRL',
	minimumFractionDigits: 2,
});

function formatCurrency(value) {
	const num = Number(value || 0);
	if (!Number.isFinite(num)) return currencyFormatterBR.format(0);
	return currencyFormatterBR.format(num);
}

function hiddenCurrency() {
	return 'R$ •••••';
}

function normalizeMoneyInput(value) {
	let v = String(value || '').replace(/[^\d.,]/g, '');

	const parts = v.split(/[.,]/);

	if (parts.length > 2) {
		v = parts[0] + ',' + parts.slice(1).join('');
	}

	return v;
}

function parseMoneyBR(value) {
	const raw = String(value || '').trim();

	if (!raw) return null;

	const normalized = raw.replace(/\./g, '').replace(',', '.');
	const num = Number(normalized);

	if (!Number.isFinite(num) || num < 0) return null;

	return num;
}



// function formatCurrency(v) {
//   const num = Number(v || 0);
//   if (Number.isNaN(num)) return 'R$ 0,00';
//   return `R$ ${num.toFixed(2).replace('.', ',')}`;
// }

function isSameMonthYear(date, monthIndex, year) {
	if (!date) return false;
	return date.getFullYear() === year && date.getMonth() === monthIndex;
}

function getPreviousMonthYear(monthIndex, year) {
	if (monthIndex === 0) {
		return { monthIndex: 11, year: year - 1 };
	}
	return { monthIndex: monthIndex - 1, year };
}

function formatDateBR(date) {
	if (!date) return '-';
	const dd = String(date.getDate()).padStart(2, '0');
	const mm = String(date.getMonth() + 1).padStart(2, '0');
	const yyyy = date.getFullYear();
	return `${dd}/${mm}/${yyyy}`;
}

const MES_LABELS = [
	'Janeiro',
	'Fevereiro',
	'Março',
	'Abril',
	'Maio',
	'Junho',
	'Julho',
	'Agosto',
	'Setembro',
	'Outubro',
	'Novembro',
	'Dezembro',
];

// transforma eventos da agenda em "lancamentos financeiros"
function mapEventosToLancamentos(eventos = [], petsById = {}) {
	return (eventos || [])
		.filter((evt) => !!evt.financeiro) // só os que têm financeiro
		.map((evt) => {
			const { financeiro = {} } = evt;
			const startDate = evt.start ? new Date(evt.start) : null;

			let petNome = evt.petNome || null;
			if (!petNome && Array.isArray(evt.petIds) && evt.petIds.length) {
				const petObj = petsById[evt.petIds[0]];
				if (petObj?.nome) petNome = petObj.nome;
			}

			const subtitle =
				(evt.local && String(evt.local).trim()) ||
				(evt.observacoes && String(evt.observacoes).trim()) ||
				'';

			const statusAgenda = evt.status || 'pendente';

			return {
				id: evt.id,
				title: evt.title || 'Sessão',
				subtitle,
				descricao: evt.descricao || evt.description || '',
				cliente: evt.cliente || evt.tutorNome || '',
				tutorNome: evt.tutorNome || '',
				petNome: petNome,
				petIds: Array.isArray(evt.petIds) ? evt.petIds : [],
				statusAgenda,
				startDate,
				preco: Number(financeiro.preco || evt.preco || 0),
				pago: !!financeiro.pago,
				comprovanteUrl: financeiro.comprovanteUrl || null,
			};
		})
		.sort((a, b) => {
			if (!a.startDate || !b.startDate) return 0;
			return a.startDate - b.startDate;
		});
}

// resumo:
// - totalPeriodo: tudo que gerou financeiro (pago + pendente) no período
// - aReceberPeriodo: pendentes no período
// - recebidoPeriodo: pagos no período
// - recebidoGeral: pagos em todo o histórico
function calcularResumo(lancamentosConfirmados = [], filtroMesIndex, filtroAno, modoGeral) {
	let totalPeriodo = 0;
	let aReceberPeriodo = 0;
	let recebidoPeriodo = 0;
	let recebidoGeral = 0;

	(lancamentosConfirmados || []).forEach((l) => {
		const d = l.startDate;
		if (!d) return;

		const inPeriodo = modoGeral ? true : isSameMonthYear(d, filtroMesIndex, filtroAno);

		if (l.pago) {
			recebidoGeral += l.preco;
			if (inPeriodo) {
				recebidoPeriodo += l.preco;
			}
		} else {
			if (inPeriodo) {
				aReceberPeriodo += l.preco;
			}
		}

		if (inPeriodo) {
			totalPeriodo += l.preco;
		}
	});

	return {
		totalPeriodo,
		aReceberPeriodo,
		recebidoPeriodo,
		recebidoGeral,
	};
}

/* =======================
   Cores base
======================= */

const COLORS = {
	bg: '#F5F5F5',
	card: '#FFFFFF',
	primary: '#FF6FA5', // depois você troca pro Colors.primary500
	text: '#333333',
	subtext: '#777777',
	paid: '#2ECC71',
	pending: '#F39C12',
};

/* =======================
   Screen
======================= */

export default function FinanceiroScreen() {
	const dispatch = useDispatch();
	const navigation = useNavigation();

	const hoje = new Date();


	const [eventos, setEventos] = useState([]);
	const [pets, setPets] = useState([]);
	const [filtroStatus, setFiltroStatus] = useState('todos'); // 'todos' | 'pendente' | 'pago';

	const [filtroAno, setFiltroAno] = useState(hoje.getFullYear());
	const [filtroMesIndex, setFiltroMesIndex] = useState(hoje.getMonth()); // 0-11

	const [modoGeral, setModoGeral] = useState(false); // lista+cards

	// valores sempre começam ocultos
	const [valoresVisiveis, setValoresVisiveis] = useState(false);

	// modal edição de valor
	const [editModalVisible, setEditModalVisible] = useState(false);
	const [editLancamento, setEditLancamento] = useState(null);
	const [editValorStr, setEditValorStr] = useState('');

	// loading por card / lista
	const [updatingStatusId, setUpdatingStatusId] = useState(null);
	const [updatingValorId, setUpdatingValorId] = useState(null);
	const [refreshing, setRefreshing] = useState(false);

	const tint = useThemeColor({}, "tint");
	const bg = useThemeColor({}, "background");
	const text = useThemeColor({}, "text");


	const triggerHaptic = () => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
	};

	// carregar dados (usado no foco e no pull-to-refresh)
	const loadData = useCallback(async () => {
		setRefreshing(true);
		try {
			const [rows, petsList] = await Promise.all([listEventos(), listPets()]);
			setEventos(rows || []);
			setPets(petsList || []);
		} catch (err) {
			console.log('Erro ao carregar dados para financeiro:', err);
		} finally {
			setRefreshing(false);
		}
	}, []);

	// sempre que a tela ganha foco:
	// - mês atual
	// - modo normal (não geral)
	// - filtro "todos"
	// - valores ocultos
	// - dispara loadData()

	// 🔹 callback do botão voltar do header
	useEffect(() => {
		const blurSub = navigation.addListener('blur', () => {
			setValoresVisiveis(false);
		});

		const removeSub = navigation.addListener('beforeRemove', () => {
			setValoresVisiveis(false);
		});

		return () => {
			blurSub();
			removeSub();
		};
	}, [navigation]);

	useFocusEffect(
		useCallback(() => {
			const now = new Date();
			setFiltroAno(now.getFullYear());
			setFiltroMesIndex(now.getMonth());
			setModoGeral(false);
			setFiltroStatus('todos');
			setValoresVisiveis(false);

			loadData();
		}, [loadData])
	);

	const petsById = useMemo(() => {
		const map = {};
		(pets || []).forEach((p) => {
			if (p?.id) map[p.id] = p;
		});
		return map;
	}, [pets]);

	const lancamentos = useMemo(
		() => mapEventosToLancamentos(eventos || [], petsById),
		[eventos, petsById]
	);

	// separa confirmados x previstos (já pensando em futuros)
	const { lancamentosConfirmados } = useMemo(() => {
		const confirmados = [];
		const previstos = [];

		(lancamentos || []).forEach((l) => {
			const status = String(l.statusAgenda || '').toLowerCase();
			const isConfirmado =
				status === 'confirmado' ||
				status === 'confirmada' ||
				status === 'concluido' ||
				status === 'concluida';

			if (isConfirmado) {
				confirmados.push(l);
			} else {
				previstos.push(l);
			}
		});

		return { lancamentosConfirmados: confirmados, lancamentosPrevistos: previstos };
	}, [lancamentos]);

	// resumo baseado em confirmados e modo (mês ou geral)
	const resumo = useMemo(
		() => calcularResumo(lancamentosConfirmados || [], filtroMesIndex, filtroAno, modoGeral),
		[lancamentosConfirmados, filtroMesIndex, filtroAno, modoGeral]
	);

	// Lista filtrada
	const lancamentosFiltrados = useMemo(() => {
		let base;
		if (modoGeral) {
			base = [...(lancamentosConfirmados || [])]; // todos confirmados
		} else {
			base = (lancamentosConfirmados || []).filter((l) =>
				isSameMonthYear(l.startDate, filtroMesIndex, filtroAno)
			);
		}

		if (filtroStatus === 'pendente') {
			return base.filter((l) => !l.pago);
		}
		if (filtroStatus === 'pago') {
			return base.filter((l) => l.pago);
		}

		return base;
	}, [lancamentosConfirmados, filtroMesIndex, filtroAno, filtroStatus, modoGeral]);

	function handlePrevMonth() {
		triggerHaptic();
		const prev = getPreviousMonthYear(filtroMesIndex, filtroAno);
		setFiltroMesIndex(prev.monthIndex);
		setFiltroAno(prev.year);
		setModoGeral(false);
	}

	function handleNextMonth() {
		triggerHaptic();
		if (filtroMesIndex === 11) {
			setFiltroMesIndex(0);
			setFiltroAno((y) => y + 1);
		} else {
			setFiltroMesIndex((m) => m + 1);
		}
		setModoGeral(false);
	}

	function handleTodayMonth() {
		triggerHaptic();
		const now = new Date();
		setFiltroMesIndex(now.getMonth());
		setFiltroAno(now.getFullYear());
		setFiltroStatus('todos');
		setModoGeral(false);
	}

	function handleToggleGeral() {
		triggerHaptic();
		setModoGeral((prev) => !prev);
	}

	function handleSetFiltroStatus(status) {
		triggerHaptic();
		setFiltroStatus(status);
	}

	async function togglePago(lancamento) {
		triggerHaptic();
		const novoPago = !lancamento.pago;
		setUpdatingStatusId(lancamento.id);
		try {
			// Atualiza na store/Firestore via slice
			await dispatch(
				updateEventoAction({
					id: lancamento.id,
					patch: {
						financeiro: {
							preco: lancamento.preco,
							pago: novoPago,
							comprovanteUrl: lancamento.comprovanteUrl || null,
						},
					},
				})
			).unwrap();

			// Recarrega do backend pra manter lista local coerente
			await loadData();
		} catch (e) {
			console.log('Erro ao atualizar pagamento:', e);
			Alert.alert('Erro', 'Não foi possível atualizar o status de pagamento.');
		} finally {
			setUpdatingStatusId(null);
		}
	}

	function openEditValorModal(lancamento) {
		triggerHaptic();
		setEditLancamento(lancamento);
		setEditValorStr(String(lancamento.preco ?? 0).replace('.', ','));
		setEditModalVisible(true);
	}

	function closeEditValorModal() {
		triggerHaptic();
		setEditModalVisible(false);
		setEditLancamento(null);
		setEditValorStr('');
	}

	async function salvarNovoValor() {
		if (!editLancamento) return;

		triggerHaptic();

		const novoValor = parseMoneyBR(editValorStr);

		if (novoValor === null) {
			Alert.alert('Valor inválido', 'Digite um valor numérico válido.');
			return;
		}

		setUpdatingValorId(editLancamento.id);

		try {
			await dispatch(
				updateEventoAction({
					id: editLancamento.id,
					patch: {
						preco: novoValor,
						financeiro: {
							preco: novoValor,
							pago: editLancamento.pago,
							comprovanteUrl: editLancamento.comprovanteUrl || null,
						},
					},
				})
			).unwrap();

			await loadData();

			setEditModalVisible(false);
			setEditLancamento(null);
			setEditValorStr('');
		} catch (e) {
			console.log('Erro ao atualizar valor:', e);
			Alert.alert('Erro', 'Não foi possível atualizar o valor.');
		} finally {
			setUpdatingValorId(null);
		}
	}

	function handlePressLancamento(lancamento) {
		triggerHaptic();

		Alert.alert(
			'Lançamento',
			`${lancamento.title}\n${formatDateBR(lancamento.startDate)}\nValor: ${valoresVisiveis ? formatCurrency(lancamento.preco) : hiddenCurrency()
			}`,
			[
				{
					text: lancamento.pago ? 'Marcar como pendente' : 'Marcar como pago',
					onPress: () => togglePago(lancamento),
				},
				{
					text: 'Editar valor',
					onPress: () => openEditValorModal(lancamento),
				},
				{
					text: 'Cancelar',
					style: 'cancel',
				},
			]
		);
	}

	const labelCard1 = modoGeral ? 'Faturado geral' : 'Faturado no mês';
	const helperCard1 = modoGeral
		? 'Todos os lançamentos confirmados'
		: `${MES_LABELS[filtroMesIndex]} ${filtroAno}`;

	const helperCard2 = modoGeral
		? 'Pendentes em todos os períodos'
		: `Pendentes em ${MES_LABELS[filtroMesIndex]} ${filtroAno}`;

	const helperCard3 = modoGeral
		? 'Pago em todos os períodos'
		: `Pago em ${MES_LABELS[filtroMesIndex]} ${filtroAno}`;

	return (
		<SafeAreaView style={styles.safeArea} edges={['top']}>
			{/* Header com botão olho */}
			<View style={styles.header}>
				<View style={styles.headerLeft}>
					<Text style={[styles.headerTitle, { color: tint }]}>Financeiro</Text>
					<Text style={styles.headerSubtitle}>Visão geral dos atendimentos</Text>
				</View>
				<TouchableOpacity
					style={styles.eyeButton}
					onPress={() => {
						triggerHaptic();
						setValoresVisiveis((prev) => !prev);
					}}
				>
					<Text style={styles.eyeButtonText}>
						{valoresVisiveis ? '🙈' : '👁'}
					</Text>
				</TouchableOpacity>
			</View>

			{/* Cards de resumo em 2 linhas (grid) */}
			<View style={styles.resumoGrid}>
				<ResumoCard
					label={labelCard1}
					helper={helperCard1}
					value={formatCurrency(resumo.totalPeriodo)}
					hide={!valoresVisiveis}
				/>
				<ResumoCard
					label="A receber"
					helper={helperCard2}
					value={formatCurrency(resumo.aReceberPeriodo)}
					hide={!valoresVisiveis}
				/>
				<ResumoCard
					label="Pago no período"
					helper={helperCard3}
					value={formatCurrency(resumo.recebidoPeriodo)}
					hide={!valoresVisiveis}
				/>
				<ResumoCard
					label="Faturado geral"
					helper="Histórico pago"
					value={formatCurrency(resumo.recebidoGeral)}
					hide={!valoresVisiveis}
				/>
			</View>

			{/* Filtro de mês / ano (para lista) */}
			<View style={styles.monthFilterRow}>
				<TouchableOpacity
					onPress={handlePrevMonth}
					style={styles.monthNavButton}
					disabled={modoGeral}
				>
					<Text
						style={[
							styles.monthNavText,
							modoGeral && { opacity: 0.3 },
						]}
					>
						{'‹'}
					</Text>
				</TouchableOpacity>

				<View style={styles.monthLabelBox}>
					<Text style={styles.monthLabelText}>
						{modoGeral ? `Todos os meses (${lancamentosFiltrados?.length})` : `${MES_LABELS[filtroMesIndex]} ${filtroAno} (${lancamentosFiltrados?.length})`}
					</Text>
				</View>

				<TouchableOpacity
					onPress={handleNextMonth}
					style={styles.monthNavButton}
					disabled={modoGeral}
				>
					<Text
						style={[
							styles.monthNavText,
							modoGeral && { opacity: 0.3 },
						]}
					>
						{'›'}
					</Text>
				</TouchableOpacity>
			</View>

			{/* Filtros + Hoje + Geral */}
			<View style={styles.filtersRow}>
				<View style={styles.filtersChipsRow}>
					<FiltroChip
						label="Todos"
						active={filtroStatus === 'todos'}
						onPress={() => handleSetFiltroStatus('todos')}
					/>
					<FiltroChip
						label="Pendentes"
						active={filtroStatus === 'pendente'}
						onPress={() => handleSetFiltroStatus('pendente')}
					/>
					<FiltroChip
						label="Pagos"
						active={filtroStatus === 'pago'}
						onPress={() => handleSetFiltroStatus('pago')}
					/>
				</View>

				<View style={styles.filtersRightButtons}>
					<TouchableOpacity style={styles.smallButton} onPress={handleTodayMonth}>
						<Text style={styles.smallButtonText}>Hoje</Text>
					</TouchableOpacity>

					<TouchableOpacity
						style={[styles.smallButton, modoGeral && styles.smallButtonActive]}
						onPress={handleToggleGeral}
					>
						<Text
							style={[
								styles.smallButtonText,
								modoGeral && styles.smallButtonTextActive,
							]}
						>
							Geral
						</Text>
					</TouchableOpacity>
				</View>
			</View>

			{/* Lista de lançamentos (somente confirmados) */}
			<FlatList
				data={lancamentosFiltrados}
				keyExtractor={(item) => String(item.id)}
				showsVerticalScrollIndicator
				contentContainerStyle={styles.listContent}
				refreshControl={
					<RefreshControl
						refreshing={refreshing}
						onRefresh={loadData}
						tintColor={COLORS.primary}          // iOS
						colors={[COLORS.primary]}           // Android
						progressBackgroundColor="#FFF"
					/>
				}
				renderItem={({ item }) => (
					<LancamentoCard
						lancamento={item}
						onPress={() => handlePressLancamento(item)}
						updatingStatus={updatingStatusId === item.id}
						updatingValor={updatingValorId === item.id}
						hideValues={!valoresVisiveis}
					/>
				)}
				ListEmptyComponent={
					<View style={styles.emptyBox}>
						<View style={styles.emptyIconCircle}>
							<Text style={styles.emptyIcon}>💳</Text>
						</View>

						<Text style={styles.emptyTitle}>
							Nenhum lançamento encontrado
						</Text>

						<Text style={styles.emptyText}>
							Não há lançamentos financeiros para o filtro selecionado.
						</Text>

						<Text style={styles.emptyHint}>
							Tente alterar o mês, usar “Geral” ou mudar entre Todos, Pendentes e Pagos.
						</Text>
					</View>
				}
			/>

			{/* Modal de edição de valor */}
			<Modal
				visible={editModalVisible}
				transparent
				animationType="fade"
				onRequestClose={closeEditValorModal}
			>
				<View style={styles.modalOverlay}>
					<KeyboardAvoidingView
						behavior={Platform.OS === 'ios' ? 'padding' : undefined}
						style={styles.modalKeyboard}
					>
						<View style={styles.modalBox}>
							<View style={styles.modalTopRow}>
								<View style={{ flex: 1, minWidth: 0 }}>
									<Text style={styles.modalTitle}>Editar valor</Text>

									{editLancamento && (
										<Text style={styles.modalSubtitle} numberOfLines={2}>
											{editLancamento.title} — {formatDateBR(editLancamento.startDate)}
										</Text>
									)}
								</View>

								<Pressable
									onPress={closeEditValorModal}
									hitSlop={10}
									style={({ pressed }) => [
										styles.modalCloseButton,
										pressed && { opacity: 0.65 },
									]}
								>
									<Text style={styles.modalCloseText}>×</Text>
								</Pressable>
							</View>

							<View style={styles.modalInputWrap}>
								<Text style={styles.modalInputPrefix}>R$</Text>

								<TextInput
									style={styles.modalInput}
									value={editValorStr}
									onChangeText={(v) => setEditValorStr(normalizeMoneyInput(v))}
									keyboardType="decimal-pad"
									placeholder="0,00"
									placeholderTextColor="#A1A1AA"
									autoFocus
								/>
							</View>

							<Text style={styles.modalHelper}>
								Use vírgula para centavos. Ex.: 120,50
							</Text>

							<View style={styles.modalButtonsRow}>
								<TouchableOpacity
									style={[styles.modalButton, styles.modalButtonCancel]}
									onPress={closeEditValorModal}
									activeOpacity={0.75}
								>
									<Text style={styles.modalButtonCancelText}>Cancelar</Text>
								</TouchableOpacity>

								<TouchableOpacity
									style={[styles.modalButton, styles.modalButtonSave]}
									onPress={salvarNovoValor}
									activeOpacity={0.75}
									disabled={!!updatingValorId}
								>
									{updatingValorId ? (
										<ActivityIndicator size="small" color="#FFF" />
									) : (
										<Text style={styles.modalButtonSaveText}>Salvar</Text>
									)}
								</TouchableOpacity>
							</View>
						</View>
					</KeyboardAvoidingView>
				</View>
			</Modal>

		</SafeAreaView>
	);
}

/* ====================== */
/*   Componentes internos */
/* ====================== */

function ResumoCard({ label, helper, value, hide }) {
	const displayValue = hide ? hiddenCurrency() : value;

	return (
		<View style={styles.resumoCard}>
			<Text style={styles.resumoLabel}>{label}</Text>
			{helper ? <Text style={styles.resumoHelper}>{helper}</Text> : null}
			<Text style={styles.resumoValue}>{displayValue}</Text>
		</View>
	);
}

function FiltroChip({ label, active, onPress }) {
	return (
		<TouchableOpacity
			style={[styles.chip, active && styles.chipActive]}
			onPress={onPress}
		>
			<Text style={[styles.chipText, active && styles.chipTextActive]}>
				{label}
			</Text>
		</TouchableOpacity>
	);
}

function LancamentoCard({
	lancamento,
	onPress,
	updatingStatus,
	updatingValor,
	hideValues,
}) {
	const dataStr = formatDateBR(lancamento.startDate);

	const statusLabel = lancamento.pago ? 'Pago' : 'Pendente';
	const statusStyle = lancamento.pago ? styles.badgePaid : styles.badgePending;

	return (
		<TouchableOpacity style={styles.lancamentoCard} onPress={onPress} activeOpacity={0.8}>
			<View style={styles.lancamentoHeader}>
				<View style={{ flex: 1, marginRight: 8 }}>
					<Text style={styles.lancamentoTitle} numberOfLines={1}>
						{lancamento.title}
					</Text>

					{!!lancamento.descricao && (
						<Text style={styles.lancamentoDescricao} numberOfLines={1}>
							{lancamento.descricao}
						</Text>
					)}

					{!!lancamento.subtitle && (
						<Text style={styles.lancamentoSubtitle} numberOfLines={1}>
							{lancamento.subtitle}
						</Text>
					)}
				</View>

				<View style={[styles.badge, statusStyle]}>
					{updatingStatus ? (
						<ActivityIndicator size="small" color="#FFF" />
					) : (
						<Text style={styles.badgeText}>{statusLabel}</Text>
					)}
				</View>
			</View>

			{/* Tutor + Pet */}
			<View style={styles.lineBetween}>
				{lancamento.cliente ? (
					<Text style={styles.lancamentoCliente}>
						Tutor:{' '}
						<Text style={{ fontWeight: 'bold' }}>{lancamento.cliente}</Text>
					</Text>
				) : (
					<Text style={styles.lancamentoCliente}>Tutor: -</Text>
				)}
				<Text style={[styles.lancamentoCliente, { fontWeight: 'bold' }]}>
					{lancamento.petNome ||
						(lancamento.petIds?.length
							? `(${lancamento.petIds.length} pets)`
							: '-')}
				</Text>
			</View>

			<View style={styles.lancamentoFooter}>
				<Text style={styles.lancamentoData}>Data: {dataStr}</Text>
				{updatingValor ? (
					<ActivityIndicator size="small" color={COLORS.primary} />
				) : (
					<Text style={styles.lancamentoValor}>
						{hideValues ? hiddenCurrency() : formatCurrency(lancamento.preco)}
					</Text>
				)}
			</View>
		</TouchableOpacity>
	);
}

/* ====================== */
/*        Styles          */
/* ====================== */

const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
		backgroundColor: COLORS.bg,
		// paddingTop: 35
	},
	header: {
		paddingHorizontal: 16,
		paddingTop: 16,
		paddingBottom: 4,
		flexDirection: 'row',
		alignItems: 'center',
	},
	headerLeft: {
		flex: 1,
	},
	headerTitle: {
		fontSize: 24,
		fontWeight: 'bold',
		color: COLORS.text,
	},
	headerSubtitle: {
		fontSize: 13,
		color: COLORS.subtext,
		marginTop: 2,
	},
	eyeButton: {
		paddingHorizontal: 8,
		paddingVertical: 4,
	},
	eyeButtonText: {
		fontSize: 20,
	},
	// grid 2x2 de cards
	resumoGrid: {
		paddingHorizontal: 16,
		paddingTop: 4,
		paddingBottom: 4,
		flexDirection: 'row',
		flexWrap: 'wrap',
		justifyContent: 'space-between',
		rowGap: 8,
	},
	resumoCard: {
		backgroundColor: COLORS.card,
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 12,
		width: '48%',
		minHeight: 64,
		elevation: 3,
		shadowColor: '#000',
		shadowOpacity: 0.12,
		shadowRadius: 4,
		shadowOffset: { width: 0, height: 2 },
	},
	resumoLabel: {
		fontSize: 11,
		color: COLORS.subtext,
		fontWeight: '500',
	},
	resumoHelper: {
		fontSize: 10,
		color: COLORS.subtext,
		marginTop: 1,
	},
	resumoValue: {
		marginTop: 4,
		fontSize: 15,
		fontWeight: '700',
		color: COLORS.primary,
	},
	monthFilterRow: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 16,
		paddingBottom: 4,
		marginTop: 2,
	},
	monthNavButton: {
		paddingHorizontal: 8,
		paddingVertical: 4,
	},
	monthNavText: {
		fontSize: 18,
		color: COLORS.primary,
		fontWeight: '700',
	},
	monthLabelBox: {
		flex: 1,
		alignItems: 'center',
	},
	monthLabelText: {
		fontSize: 14,
		fontWeight: '600',
		color: COLORS.text,
	},
	filtersRow: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 16,
		paddingBottom: 4,
		marginTop: 2,
	},
	filtersChipsRow: {
		flexDirection: 'row',
		gap: 8,
		flexShrink: 1,
	},
	filtersRightButtons: {
		flexDirection: 'row',
		marginLeft: 'auto',
		gap: 6,
	},
	smallButton: {
		paddingHorizontal: 10,
		paddingVertical: 5,
		borderRadius: 999,
		borderWidth: 1,
		borderColor: COLORS.primary,
	},
	smallButtonActive: {
		backgroundColor: COLORS.primary,
	},
	smallButtonText: {
		fontSize: 11,
		color: COLORS.primary,
		fontWeight: '600',
	},
	smallButtonTextActive: {
		color: '#FFF',
	},
	chip: {
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 999,
		borderWidth: 1,
		borderColor: '#DDD',
	},
	chipActive: {
		backgroundColor: COLORS.primary,
		borderColor: COLORS.primary,
	},
	chipText: {
		fontSize: 12,
		color: COLORS.subtext,
	},
	chipTextActive: {
		color: '#FFF',
		fontWeight: '600',
	},
	listContent: {
		paddingHorizontal: 16,
		paddingTop: 8,
		paddingBottom: 90,
	},
	lancamentoCard: {
		backgroundColor: COLORS.card,
		borderRadius: 16,
		padding: 12,
		marginBottom: 12,
		elevation: 5,
		shadowColor: '#000',
		shadowOpacity: 0.18,
		shadowRadius: 7,
		shadowOffset: { width: 0, height: 4 },
	},
	lancamentoHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	lancamentoTitle: {
		fontSize: 14,
		fontWeight: '600',
		color: COLORS.text,
	},
	lancamentoDescricao: {
		fontSize: 11,
		color: COLORS.text,
		marginTop: 1,
	},
	lancamentoSubtitle: {
		fontSize: 11,
		color: COLORS.subtext,
		marginTop: 1,
	},
	lineBetween: {
		marginTop: 8,
		flexDirection: 'row',
		justifyContent: 'space-between',
	},
	lancamentoCliente: {
		fontSize: 12,
		color: COLORS.subtext,
	},
	lancamentoFooter: {
		marginTop: 8,
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	lancamentoData: {
		fontSize: 12,
		color: COLORS.subtext,
	},
	lancamentoValor: {
		fontSize: 16,
		fontWeight: '700',
		color: COLORS.primary,
	},
	badge: {
		paddingHorizontal: 8,
		paddingVertical: 3,
		borderRadius: 999,
		minWidth: 60,
		alignItems: 'center',
	},
	badgePaid: {
		backgroundColor: COLORS.paid,
	},
	badgePending: {
		backgroundColor: COLORS.pending,
	},
	badgeText: {
		fontSize: 10,
		color: '#FFF',
		fontWeight: '600',
	},
	emptyBox: {
		marginTop: 28,
		marginHorizontal: 16,
		paddingHorizontal: 18,
		paddingVertical: 22,
		borderRadius: 18,
		backgroundColor: '#FFFFFF',
		borderWidth: 1,
		borderColor: 'rgba(0,0,0,0.06)',
		alignItems: 'center',
		shadowColor: '#000',
		shadowOpacity: 0.08,
		shadowRadius: 8,
		shadowOffset: { width: 0, height: 4 },
		elevation: 3,
	},

	emptyIconCircle: {
		width: 58,
		height: 58,
		borderRadius: 29,
		backgroundColor: 'rgba(255,111,165,0.10)',
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 12,
	},

	emptyIcon: {
		fontSize: 28,
	},

	emptyTitle: {
		fontSize: 16,
		fontWeight: '800',
		color: COLORS.text,
		textAlign: 'center',
		marginBottom: 6,
	},

	emptyText: {
		fontSize: 13,
		color: COLORS.subtext,
		textAlign: 'center',
		lineHeight: 18,
	},

	emptyHint: {
		marginTop: 8,
		fontSize: 12,
		color: COLORS.subtext,
		textAlign: 'center',
		lineHeight: 17,
		opacity: 0.8,
	},
	// modal
	modalOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.35)',
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: 18,
	},

	modalKeyboard: {
		width: '100%',
		alignItems: 'center',
	},

	modalBox: {
		width: '100%',
		maxWidth: 420,
		backgroundColor: '#FFF',
		borderRadius: 18,
		padding: 16,
		shadowColor: '#000',
		shadowOpacity: 0.18,
		shadowRadius: 18,
		shadowOffset: { width: 0, height: 8 },
		elevation: 8,
	},

	modalTopRow: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		gap: 10,
	},

	modalCloseButton: {
		width: 32,
		height: 32,
		borderRadius: 16,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#F3F4F6',
	},

	modalCloseText: {
		fontSize: 24,
		lineHeight: 26,
		color: COLORS.subtext,
		fontWeight: '600',
	},

	modalTitle: {
		fontSize: 17,
		fontWeight: '800',
		color: COLORS.text,
	},

	modalSubtitle: {
		fontSize: 12,
		color: COLORS.subtext,
		marginTop: 4,
		lineHeight: 17,
	},

	modalInputWrap: {
		marginTop: 14,
		height: 48,
		borderWidth: 1,
		borderColor: '#DDD',
		borderRadius: 12,
		paddingHorizontal: 12,
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#FAFAFA',
	},

	modalInputPrefix: {
		fontSize: 15,
		fontWeight: '800',
		color: COLORS.primary,
		marginRight: 8,
	},

	modalInput: {
		flex: 1,
		height: 48,
		fontSize: 18,
		fontWeight: '700',
		color: COLORS.text,
		paddingVertical: 0,
	},

	modalHelper: {
		marginTop: 7,
		fontSize: 11,
		color: COLORS.subtext,
	},

	modalButtonsRow: {
		marginTop: 16,
		flexDirection: 'row',
		justifyContent: 'flex-end',
		gap: 8,
	},

	modalButton: {
		minWidth: 96,
		height: 40,
		paddingHorizontal: 14,
		borderRadius: 999,
		alignItems: 'center',
		justifyContent: 'center',
	},

	modalButtonCancel: {
		backgroundColor: '#EEE',
	},

	modalButtonSave: {
		backgroundColor: COLORS.primary,
	},

	modalButtonCancelText: {
		fontSize: 13,
		color: COLORS.text,
		fontWeight: '600',
	},

	modalButtonSaveText: {
		fontSize: 13,
		color: '#FFF',
		fontWeight: '800',
	},

});
