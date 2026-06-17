// PetsList.jsx
// @ts-nocheck
import React, {
	useMemo,
	useRef,
	useCallback,
	useDeferredValue,
	useLayoutEffect,
	useState,
	useEffect,
} from "react";
import {
	View,
	Text,
	StyleSheet,
	Pressable,
	FlatList,
	TextInput,
	Platform,
	RefreshControl,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useSelector, useDispatch } from "react-redux";
import { selectAllPetsJoined, fetchAllPets } from "@/src/store/slices/petsSlice";
import { router, useNavigation } from "expo-router";
import { useThemeColor } from "@/hooks/useThemeColor";
import { IconSymbol } from "@/components/ui/IconSymbol";
import * as Haptics from "expo-haptics";

const FILTERS = ["todos", "cachorro", "gato"];

function normalizeText(value) {
	return String(value || "")
		.normalize("NFD")
		.replace(/\p{Diacritic}/gu, "")
		.toLowerCase()
		.trim();
}

function speciesLabel(value) {
	if (value === "cachorro") return "Cachorro";
	if (value === "gato") return "Gato";
	return value || "Pet";
}

function getPetSearchText(pet) {
	return [
		pet?.nome,
		pet?.especie,
		pet?.raca,
		pet?.cor,
		pet?.sexo,
		pet?.tutor?.nome,
		pet?.tutor?.telefone,
		pet?.tutor?.email,
	]
		.filter(Boolean)
		.join(" ");
}

function groupToFlat(items = []) {
	const map = new Map();

	for (const pet of items) {
		const first = normalizeText(pet?.nome)?.[0] || "#";
		const letter = /[a-z]/i.test(first) ? first.toUpperCase() : "#";

		if (!map.has(letter)) map.set(letter, []);
		map.get(letter).push(pet);
	}

	const letters = Array.from(map.keys()).sort((a, b) => {
		if (a === "#") return 1;
		if (b === "#") return -1;
		return a.localeCompare(b, "pt-BR");
	});

	const flat = [];

	for (const letter of letters) {
		const list = map
			.get(letter)
			.sort((a, b) =>
				String(a?.nome || "").localeCompare(String(b?.nome || ""), "pt-BR")
			);

		flat.push({
			_type: "header",
			letter,
			id: `__h__${letter}`,
			count: list.length,
		});

		for (const pet of list) {
			flat.push({
				_type: "item",
				pet,
				id: String(pet.id),
			});
		}
	}

	return { flat, letters };
}

function navigateToPet(petId) {
	if (!petId) return;

	Haptics.selectionAsync().catch(() => {});

	router.push({
		pathname: "/(modals)/pets/[id]",
		params: { id: String(petId) },
	});
}

function navigateToNewPet() {
	Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

	router.push("/(modals)/pet-new");
}

function FilterPills({ value, onChange, border, accent, totals, text }) {
	const label = (filter) => {
		if (filter === "todos") return `Todos (${totals.todos})`;
		if (filter === "cachorro") return `Cachorros (${totals.cachorro})`;
		return `Gatos (${totals.gato})`;
	};

	return (
		<View style={styles.pills}>
			{FILTERS.map((filter) => {
				const active = value === filter;

				return (
					<Pressable
						key={filter}
						onPress={() => {
							Haptics.selectionAsync().catch(() => {});
							onChange(filter);
						}}
						style={({ pressed }) => [
							styles.pill,
							{ borderColor: active ? accent : border },
							active && { backgroundColor: accent },
							pressed && { opacity: 0.88 },
						]}
						accessibilityRole="button"
						accessibilityLabel={`Filtrar por ${filter}`}
					>
						<Text style={[styles.pillText, { color: active ? "#fff" : text }]}>
							{label(filter)}
						</Text>
					</Pressable>
				);
			})}
		</View>
	);
}

const PetRow = React.memo(function PetRow({ pet, border, text, subtle }) {
	const icon = pet?.especie === "gato" ? "cat.fill" : "dog.fill";
	const species = speciesLabel(pet?.especie);
	const details = [species, pet?.raca, pet?.cor].filter(Boolean).join(" • ");
	const tutorName = pet?.tutor?.nome || "";

	return (
		<Pressable
			onPress={() => navigateToPet(pet.id)}
			style={({ pressed }) => [
				styles.rowCard,
				{
					borderColor: border,
					backgroundColor: pressed ? "rgba(37,99,235,0.06)" : "#FFFFFF",
				},
			]}
		>
			<View style={styles.avatar}>
				<IconSymbol name={icon} size={18} color="#fff" />
			</View>

			<View style={styles.rowContent}>
				<View style={styles.rowTop}>
					<Text style={[styles.title, { color: text }]} numberOfLines={1}>
						{pet?.nome || "Pet sem nome"}
					</Text>

					<IconSymbol name="chevron.right" size={14} color={subtle} />
				</View>

				{!!details && (
					<View style={styles.metaLine}>
						<IconSymbol name="pawprint.fill" size={11} color={subtle} />
						<Text style={[styles.metaText, { color: subtle }]} numberOfLines={1}>
							{details}
						</Text>
					</View>
				)}

				{!!tutorName && (
					<View style={styles.metaLine}>
						<IconSymbol name="person.fill" size={11} color={subtle} />
						<Text style={[styles.metaText, { color: subtle }]} numberOfLines={1}>
							{tutorName}
						</Text>
					</View>
				)}

				{!details && !tutorName && (
					<Text style={[styles.metaText, { color: subtle }]} numberOfLines={1}>
						Cadastro básico
					</Text>
				)}
			</View>
		</Pressable>
	);
});

function SearchHeader({
	query,
	setQuery,
	total,
	filteredTotal,
	filter,
	setFilter,
	totals,
	clearSearchAndScrollTop,
	bg,
	text,
	subtle,
	border,
	accent,
}) {
	return (
		<View style={[styles.headerInner, { backgroundColor: bg }]}>
			<View style={styles.summaryRow}>
				<View>
					<Text style={[styles.summaryTitle, { color: text }]}>Pets</Text>
					<Text style={[styles.summarySubtitle, { color: subtle }]}>
						{query || filter !== "todos"
							? `${filteredTotal} resultado${filteredTotal === 1 ? "" : "s"} de ${total}`
							: `${total} pet${total === 1 ? "" : "s"} cadastrado${total === 1 ? "" : "s"}`}
					</Text>
				</View>
			</View>

			<View
				style={[
					styles.searchBox,
					{
						backgroundColor:
							Platform.OS === "ios" ? "rgba(118,118,128,0.12)" : "#F3F4F6",
						borderColor: border,
					},
				]}
			>
				<IconSymbol name="magnifyingglass" size={15} color={subtle} />

				<TextInput
					value={query}
					onChangeText={setQuery}
					placeholder="Buscar por nome, tutor ou raça"
					placeholderTextColor={subtle}
					style={[styles.searchInput, { color: text }]}
					returnKeyType="search"
					autoCapitalize="none"
					autoCorrect={false}
				/>

				{!!query && (
					<Pressable onPress={clearSearchAndScrollTop} hitSlop={8}>
						<IconSymbol name="xmark.circle.fill" size={17} color={subtle} />
					</Pressable>
				)}
			</View>

			<FilterPills
				value={filter}
				onChange={setFilter}
				border={border}
				accent={accent}
				totals={totals}
				text={text}
			/>
		</View>
	);
}

function EmptyState({
	hasAnyPets,
	query,
	filter,
	clearSearchAndScrollTop,
	border,
	text,
	subtle,
	accent,
}) {
	const hasFilter = !!query || filter !== "todos";

	if (hasAnyPets && hasFilter) {
		return (
			<View style={styles.emptyWrap}>
				<View style={[styles.emptyCard, { borderColor: border }]}>
					<View style={styles.emptyIcon}>
						<IconSymbol name="magnifyingglass" size={19} color="#fff" />
					</View>

					<Text style={[styles.emptyTitle, { color: text }]}>Nenhum resultado</Text>

					<Text style={[styles.emptySub, { color: subtle }]}>
						Não encontramos nenhum pet para essa busca ou filtro.
					</Text>

					<Pressable
						onPress={clearSearchAndScrollTop}
						style={({ pressed }) => [
							styles.emptyBtn,
							{ backgroundColor: accent },
							pressed && { opacity: 0.9 },
						]}
						accessibilityRole="button"
						accessibilityLabel="Limpar busca e filtros"
					>
						<IconSymbol name="arrow.counterclockwise" size={14} color="#fff" />
						<Text style={styles.emptyBtnText}>Limpar busca e filtros</Text>
					</Pressable>
				</View>
			</View>
		);
	}

	return (
		<View style={styles.emptyWrap}>
			<View style={[styles.emptyCard, { borderColor: border }]}>
				<View style={styles.emptyIcon}>
					<IconSymbol name="dog.fill" size={19} color="#fff" />
				</View>

				<Text style={[styles.emptyTitle, { color: text }]}>
					Nenhum pet por aqui ainda
				</Text>

				<Text style={[styles.emptySub, { color: subtle }]}>
					Cadastre o primeiro pet para começar o acompanhamento.
				</Text>

				<Pressable
					onPress={navigateToNewPet}
					style={({ pressed }) => [
						styles.emptyBtn,
						{ backgroundColor: accent },
						pressed && { opacity: 0.9 },
					]}
					accessibilityRole="button"
					accessibilityLabel="Adicionar pet"
				>
					<IconSymbol name="plus" size={14} color="#fff" />
					<Text style={styles.emptyBtnText}>Adicionar pet</Text>
				</Pressable>
			</View>
		</View>
	);
}

function AlphabetIndex({ letters, accent, onJump }) {
	if (!letters?.length || letters.length <= 1) return null;

	return (
		<View style={styles.index}>
			{letters.map((letter) => (
				<Pressable key={letter} onPress={() => onJump(letter)} hitSlop={6}>
					<Text style={[styles.indexLetter, { color: accent }]}>{letter}</Text>
				</Pressable>
			))}
		</View>
	);
}

export default function PetsList() {
	const navigation = useNavigation();
	const dispatch = useDispatch();
	const allPets = useSelector(selectAllPetsJoined);
	const insets = useSafeAreaInsets();

	const [filter, setFilter] = useState("todos");
	const [query, setQuery] = useState("");
	const [refreshing, setRefreshing] = useState(false);

	const deferredQuery = useDeferredValue(query);
	const deferredFilter = useDeferredValue(filter);

	const text = useThemeColor({}, "text");
	const subtle = useThemeColor({ light: "#6B7280", dark: "#9AA0A6" }, "text");

	const border = useThemeColor(
		{ light: "rgba(15,23,42,0.08)", dark: "rgba(255,255,255,0.12)" },
		"border"
	);

	const bg = useThemeColor({}, "background");
	const tint = useThemeColor({}, "tint");
	const accent = useThemeColor({ light: "#10B981", dark: "#10B981" }, "tint");

	const listRef = useRef(null);

	const hasAnyPets = allPets?.length > 0;

	useLayoutEffect(() => {
		navigation.setOptions({
			headerShown: true,
			headerLargeTitle: false,
			headerTitle: "Pets",
			title: "Pets",
			headerTintColor: tint,
			headerTitleStyle: { color: tint, fontWeight: "800" },
			headerShadowVisible: false,
			headerStyle: { backgroundColor: bg },
			headerRight: () => (
				<Pressable
					onPress={navigateToNewPet}
					hitSlop={10}
					style={({ pressed }) => [
						styles.navAddButton,
						{ opacity: pressed ? 0.6 : 1 },
					]}
					accessibilityRole="button"
					accessibilityLabel="Adicionar pet"
				>
					<IconSymbol name="plus.circle.fill" size={22} color={tint} />
				</Pressable>
			),
		});
	}, [navigation, tint, bg]);

	useEffect(() => {
		dispatch(fetchAllPets());
	}, [dispatch]);

	const clearSearchAndScrollTop = useCallback(() => {
		setQuery("");
		setFilter("todos");

		requestAnimationFrame(() => {
			listRef.current?.scrollToOffset?.({ offset: 0, animated: false });
		});
	}, []);

	const queryFiltered = useMemo(() => {
		const q = normalizeText(deferredQuery);

		if (!q) return allPets || [];

		return (allPets || []).filter((pet) =>
			normalizeText(getPetSearchText(pet)).includes(q)
		);
	}, [allPets, deferredQuery]);

	const totals = useMemo(() => {
		const todos = queryFiltered.length;
		const cachorro = queryFiltered.filter((p) => p?.especie === "cachorro").length;
		const gato = queryFiltered.filter((p) => p?.especie === "gato").length;

		return { todos, cachorro, gato };
	}, [queryFiltered]);

	const filteredSorted = useMemo(() => {
		const base =
			deferredFilter === "todos"
				? queryFiltered
				: queryFiltered.filter((p) => p?.especie === deferredFilter);

		return [...base].sort((a, b) =>
			String(a?.nome || "").localeCompare(String(b?.nome || ""), "pt-BR")
		);
	}, [queryFiltered, deferredFilter]);

	const { flat, letters } = useMemo(
		() => groupToFlat(filteredSorted),
		[filteredSorted]
	);

	const filteredTotal = filteredSorted.length;

	const onRefresh = useCallback(async () => {
		try {
			setRefreshing(true);
			await dispatch(fetchAllPets()).unwrap();
		} finally {
			setRefreshing(false);
		}
	}, [dispatch]);

	const jumpTo = useCallback(
		(letter) => {
			const index = flat.findIndex(
				(item) => item._type === "header" && item.letter === letter
			);

			if (index < 0) return;

			try {
				listRef.current?.scrollToIndex({
					index,
					animated: true,
					viewPosition: 0,
				});
			} catch {}
		},
		[flat]
	);

	const renderItem = useCallback(
		({ item }) => {
			if (item._type === "header") {
				return (
					<View style={[styles.sectionBanner, { backgroundColor: bg }]}>
						<Text style={[styles.sectionBannerText, { color: subtle }]}>
							{item.letter}
						</Text>

						<Text style={[styles.sectionCount, { color: subtle }]}>
							{item.count}
						</Text>
					</View>
				);
			}

			return (
				<PetRow
					pet={item.pet}
					border={border}
					text={text}
					subtle={subtle}
				/>
			);
		},
		[bg, border, text, subtle]
	);

	const keyExtractor = useCallback((item) => item.id, []);

	const ListHeader = useMemo(() => {
		if (!hasAnyPets) return null;

		return (
			<SearchHeader
				query={query}
				setQuery={setQuery}
				total={allPets.length}
				filteredTotal={filteredTotal}
				filter={filter}
				setFilter={setFilter}
				totals={totals}
				clearSearchAndScrollTop={clearSearchAndScrollTop}
				bg={bg}
				text={text}
				subtle={subtle}
				border={border}
				accent={accent}
			/>
		);
	}, [
		hasAnyPets,
		query,
		allPets.length,
		filteredTotal,
		filter,
		totals,
		clearSearchAndScrollTop,
		bg,
		text,
		subtle,
		border,
		accent,
	]);

	return (
		<SafeAreaView style={[styles.safe, { backgroundColor: bg }]} edges={["left", "right"]}>
			<View style={styles.shell}>
				<FlatList
					ref={listRef}
					data={flat}
					keyExtractor={keyExtractor}
					renderItem={renderItem}
					ListHeaderComponent={ListHeader}
					ListHeaderComponentStyle={{
						backgroundColor: bg,
						paddingTop: 4,
					}}
					contentInsetAdjustmentBehavior="automatic"
					automaticallyAdjustContentInsets
					removeClippedSubviews={Platform.OS === "android"}
					initialNumToRender={14}
					maxToRenderPerBatch={12}
					updateCellsBatchingPeriod={32}
					windowSize={7}
					contentContainerStyle={[
						styles.listContent,
						{
							paddingBottom: Math.max(insets.bottom, 0) + 24,
							flexGrow: 1,
						},
					]}
					keyboardDismissMode="on-drag"
					keyboardShouldPersistTaps="handled"
					showsVerticalScrollIndicator={false}
					style={styles.list}
					refreshControl={
						<RefreshControl
							refreshing={refreshing}
							onRefresh={onRefresh}
							tintColor={tint}
							colors={[tint]}
						/>
					}
					ListEmptyComponent={
						<EmptyState
							hasAnyPets={hasAnyPets}
							query={query}
							filter={filter}
							clearSearchAndScrollTop={clearSearchAndScrollTop}
							border={border}
							text={text}
							subtle={subtle}
							accent={accent}
						/>
					}
					onScrollToIndexFailed={({ index }) => {
						requestAnimationFrame(() => {
							listRef.current?.scrollToOffset?.({
								offset: Math.max(0, index * 86),
								animated: true,
							});
						});
					}}
				/>

				<AlphabetIndex letters={letters} accent={accent} onJump={jumpTo} />
			</View>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	safe: {
		flex: 1,
	},

	shell: {
		flex: 1,
		position: "relative",
	},

	list: {
		flex: 1,
	},

	listContent: {
		paddingHorizontal: 14,
		paddingTop: 4,
	},

	navAddButton: {
		paddingHorizontal: 6,
		paddingVertical: 4,
	},

	headerInner: {
		paddingTop: 6,
		paddingBottom: 14,
	},

	summaryRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginBottom: 12,
		paddingHorizontal: 2,
	},

	summaryTitle: {
		fontSize: 28,
		fontWeight: "800",
		letterSpacing: -0.6,
	},

	summarySubtitle: {
		fontSize: 13,
		fontWeight: "500",
		marginTop: 2,
	},

	searchBox: {
		height: 44,
		borderWidth: StyleSheet.hairlineWidth,
		borderRadius: 14,
		paddingHorizontal: 12,
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
		marginBottom: 10,
	},

	searchInput: {
		flex: 1,
		height: 44,
		fontSize: 15,
		paddingVertical: 0,
	},

	pills: {
		flexDirection: "row",
		gap: 8,
		flexWrap: "wrap",
	},

	pill: {
		paddingHorizontal: 12,
		paddingVertical: 7,
		borderRadius: 999,
		borderWidth: StyleSheet.hairlineWidth,
	},

	pillText: {
		fontWeight: "800",
		fontSize: 13,
	},

	sectionBanner: {
		height: 30,
		paddingHorizontal: 4,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},

	sectionBannerText: {
		fontSize: 13,
		fontWeight: "800",
		letterSpacing: 0.3,
		textTransform: "uppercase",
	},

	sectionCount: {
		fontSize: 12,
		fontWeight: "700",
	},

	rowCard: {
		minHeight: 86,
		borderWidth: StyleSheet.hairlineWidth,
		borderRadius: 18,
		paddingHorizontal: 12,
		paddingVertical: 12,
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
		marginBottom: 10,
		shadowColor: "#000",
		shadowOpacity: 0.05,
		shadowRadius: 10,
		shadowOffset: { width: 0, height: 4 },
		elevation: 1,
	},

	avatar: {
		width: 46,
		height: 46,
		borderRadius: 23,
		backgroundColor: "rgba(15,23,42,0.82)",
		alignItems: "center",
		justifyContent: "center",
	},

	rowContent: {
		flex: 1,
		minWidth: 0,
	},

	rowTop: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		gap: 8,
		marginBottom: 5,
	},

	title: {
		fontSize: 16,
		fontWeight: "750",
		letterSpacing: -0.2,
		flex: 1,
	},

	metaLine: {
		flexDirection: "row",
		alignItems: "center",
		gap: 5,
		minWidth: 0,
		marginTop: 2,
	},

	metaText: {
		fontSize: 13,
		fontWeight: "500",
		flex: 1,
	},

	emptyWrap: {
		flex: 1,
		padding: 24,
		alignItems: "center",
		justifyContent: "center",
	},

	emptyCard: {
		width: "100%",
		maxWidth: 420,
		borderWidth: StyleSheet.hairlineWidth,
		borderRadius: 22,
		paddingHorizontal: 18,
		paddingVertical: 22,
		alignItems: "center",
		backgroundColor: "#FFFFFF",
		gap: 8,
		shadowColor: "#000",
		shadowOpacity: 0.05,
		shadowRadius: 14,
		shadowOffset: { width: 0, height: 6 },
		elevation: 2,
	},

	emptyIcon: {
		width: 58,
		height: 58,
		borderRadius: 29,
		backgroundColor: "#111827",
		alignItems: "center",
		justifyContent: "center",
		marginBottom: 6,
	},

	emptyTitle: {
		fontSize: 17,
		fontWeight: "800",
		textAlign: "center",
	},

	emptySub: {
		fontSize: 13,
		textAlign: "center",
		lineHeight: 19,
		marginBottom: 8,
	},

	emptyBtn: {
		marginTop: 8,
		height: 42,
		borderRadius: 12,
		paddingHorizontal: 16,
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
	},

	emptyBtnText: {
		color: "#fff",
		fontWeight: "800",
	},

	index: {
		position: "absolute",
		right: 4,
		top: 130,
		bottom: 24,
		justifyContent: "center",
		alignItems: "center",
		paddingHorizontal: 2,
		paddingVertical: 6,
		borderRadius: 999,
		backgroundColor: "rgba(255,255,255,0.76)",
		gap: 1,
	},

	indexLetter: {
		fontSize: 10,
		fontWeight: "800",
		opacity: 0.9,
	},
});