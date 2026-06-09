// src/screens/tutores/List.jsx
// @ts-nocheck
import React, {
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import {
	View,
	Text,
	TextInput,
	SectionList,
	Pressable,
	StyleSheet,
	Platform,
	RefreshControl,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { fetchTutores } from "@/src/store/slices/tutoresSlice";
import { useThemeColor } from "@/hooks/useThemeColor";
import { router, useNavigation } from "expo-router";
import Avatar from "@/components/ui/Avatar";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { maskPhone } from "@/src/utils/masks";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

function normText(value) {
	return String(value || "")
		.normalize("NFD")
		.replace(/\p{Diacritic}/gu, "")
		.toLowerCase()
		.trim();
}

function getTutorSearchText(tutor) {
	const endereco = tutor?.endereco || {};

	return [
		tutor?.nome,
		tutor?.telefone,
		tutor?.email,
		endereco?.logradouro,
		endereco?.bairro,
		endereco?.cidade,
		endereco?.uf,
	]
		.filter(Boolean)
		.join(" ");
}

function getAddressSummary(tutor) {
	const e = tutor?.endereco || {};

	const cityUf = [e?.cidade, e?.uf].filter(Boolean).join(" / ");
	const street = [e?.logradouro, e?.numero].filter(Boolean).join(", ");

	if (street && cityUf) return `${street} • ${cityUf}`;
	if (street) return street;
	if (cityUf) return cityUf;

	return "";
}

function makeSections(items = [], q = "") {
	const query = normText(q);

	const filtered = query
		? items.filter((t) => normText(getTutorSearchText(t)).includes(query))
		: items;

	const map = new Map();

	for (const tutor of filtered) {
		const first = normText(tutor?.nome)?.[0] || "#";
		const letter = /[a-z]/i.test(first) ? first.toUpperCase() : "#";

		if (!map.has(letter)) map.set(letter, []);
		map.get(letter).push(tutor);
	}

	return Array.from(map.entries())
		.sort((a, b) => {
			if (a[0] === "#") return 1;
			if (b[0] === "#") return -1;
			return a[0].localeCompare(b[0], "pt-BR");
		})
		.map(([title, data]) => ({
			title,
			data: data.sort((a, b) =>
				String(a?.nome || "").localeCompare(String(b?.nome || ""), "pt-BR")
			),
		}));
}

function EmptyCard({
	title,
	subtitle,
	actionLabel,
	onAction,
	icon = "person-add-outline",
}) {
	return (
		<View style={styles.emptyWrap}>
			<View style={styles.emptyIconWrap}>
				<Ionicons name={icon} size={28} color="#334155" />
			</View>

			<Text style={styles.emptyTitle}>{title}</Text>

			{!!subtitle && <Text style={styles.emptySubtitle}>{subtitle}</Text>}

			{!!actionLabel && (
				<Pressable
					onPress={onAction}
					style={({ pressed }) => [
						styles.emptyButton,
						pressed && { opacity: 0.88, transform: [{ scale: 0.99 }] },
					]}
				>
					<Text style={styles.emptyButtonText}>{actionLabel}</Text>
				</Pressable>
			)}
		</View>
	);
}

function SearchHeader({
	query,
	setQuery,
	total,
	filteredTotal,
	bg,
	text,
	subtle,
	tint,
	border,
}) {
	return (
		<View style={[styles.headerArea, { backgroundColor: bg }]}>
			<View style={styles.summaryRow}>
				<View>
					<Text style={[styles.summaryTitle, { color: text }]}>Tutores</Text>
					<Text style={[styles.summarySubtitle, { color: subtle }]}>
						{query
							? `${filteredTotal} resultado${filteredTotal === 1 ? "" : "s"} de ${total}`
							: `${total} tutor${total === 1 ? "" : "es"} cadastrado${total === 1 ? "" : "s"}`}
					</Text>
				</View>

				<Pressable
					onPress={async () => {
						await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
						router.push("/(modals)/tutor-new");
					}}
					style={({ pressed }) => [
						styles.headerAddButton,
						{ backgroundColor: tint },
						pressed && { opacity: 0.85 },
					]}
				>
					<Ionicons name="add" size={20} color="#fff" />
				</Pressable>
			</View>

			<View
				style={[
					styles.searchContainer,
					{
						backgroundColor: Platform.OS === "ios" ? "rgba(118,118,128,0.12)" : "#F3F4F6",
						borderColor: border,
					},
				]}
			>
				<Ionicons name="search" size={18} color={subtle} />

				<TextInput
					placeholder="Buscar por nome, telefone ou e-mail"
					placeholderTextColor={subtle}
					value={query}
					onChangeText={setQuery}
					style={[styles.searchInput, { color: text }]}
					returnKeyType="search"
					clearButtonMode="never"
					autoCapitalize="none"
					autoCorrect={false}
				/>

				{!!query && (
					<Pressable
						onPress={() => setQuery("")}
						hitSlop={8}
						style={({ pressed }) => [
							styles.clearSearchButton,
							pressed && { opacity: 0.65 },
						]}
					>
						<Ionicons name="close-circle" size={18} color={subtle} />
					</Pressable>
				)}
			</View>
		</View>
	);
}

function TutorRow({ item, tint, subtle, text, border }) {
	const phone = item?.telefone ? maskPhone(item.telefone) : "";
	const email = item?.email || "";
	const address = getAddressSummary(item);

	return (
		<Pressable
			onPress={async () => {
				await Haptics.selectionAsync();
				router.push(`/(phone)/tutores/${item.id}`);
			}}
			style={({ pressed }) => [
				styles.rowCard,
				{
					borderColor: border,
					backgroundColor: pressed ? "rgba(37,99,235,0.06)" : "#FFFFFF",
				},
			]}
		>
			<Avatar name={item.nome} size={48} bg="#E8ECF1" color="#1F2937" />

			<View style={styles.rowContent}>
				<View style={styles.rowTop}>
					<Text style={[styles.rowName, { color: text }]} numberOfLines={1}>
						{item.nome || "Tutor sem nome"}
					</Text>

					<Ionicons name="chevron-forward" size={18} color={subtle} />
				</View>

				<View style={styles.metaBlock}>
					{!!phone && (
						<View style={styles.metaLine}>
							<Ionicons name="call-outline" size={13} color={subtle} />
							<Text style={[styles.metaText, { color: subtle }]} numberOfLines={1}>
								{phone}
							</Text>
						</View>
					)}

					{!!email && (
						<View style={styles.metaLine}>
							<Ionicons name="mail-outline" size={13} color={subtle} />
							<Text style={[styles.metaText, { color: subtle }]} numberOfLines={1}>
								{email}
							</Text>
						</View>
					)}

					{!!address && (
						<View style={styles.metaLine}>
							<Ionicons name="location-outline" size={13} color={subtle} />
							<Text style={[styles.metaText, { color: subtle }]} numberOfLines={1}>
								{address}
							</Text>
						</View>
					)}

					{!phone && !email && !address && (
						<Text style={[styles.metaText, { color: subtle }]}>
							Cadastro básico
						</Text>
					)}
				</View>
			</View>
		</Pressable>
	);
}

function AlphabetBar({ letters, onJump, bottomOffset = 0 }) {
	if (!letters?.length) return null;

	return (
		<View style={[styles.alphaBar, { bottom: 24 + bottomOffset }]}>
			{letters.map((letter) => (
				<Pressable
					key={letter}
					onPress={() => onJump(letter)}
					style={styles.alphaBtn}
					hitSlop={4}
				>
					<Text style={styles.alphaTxt}>{letter}</Text>
				</Pressable>
			))}
		</View>
	);
}

export default function TutoresList() {
	const dispatch = useDispatch();
	const navigation = useNavigation();
	const insets = useSafeAreaInsets();

	const { items = [], loading } = useSelector((s) => s.tutores);

	const text = useThemeColor({}, "text");
	const textIcon = useThemeColor({}, "textIcon");
	const subtle = useThemeColor({ light: "#6B7280", dark: "#9AA0A6" }, "text");
	const tint = useThemeColor({}, "tint");
	const bg = useThemeColor({}, "background");

	const border = useThemeColor(
		{ light: "rgba(15,23,42,0.08)", dark: "rgba(255,255,255,0.12)" },
		"border"
	);

	const [query, setQuery] = useState("");
	const [refreshing, setRefreshing] = useState(false);

	const listRef = useRef(null);

	useLayoutEffect(() => {
		navigation.setOptions({
			headerShown: true,
			headerStyle: { backgroundColor: bg },
			headerTintColor: tint,
			headerTitleStyle: { color: tint, fontWeight: "700" },
			headerLargeTitle: false,
			headerTransparent: false,
			title: "Tutores",
		});
	}, [navigation, bg, tint]);

	useEffect(() => {
		dispatch(fetchTutores());
	}, [dispatch]);

	const sections = useMemo(() => makeSections(items, query), [items, query]);
	const letters = useMemo(() => sections.map((s) => s.title), [sections]);
	const filteredTotal = useMemo(
		() => sections.reduce((acc, section) => acc + section.data.length, 0),
		[sections]
	);

	const hasAny = items?.length > 0;

	const onRefresh = useCallback(async () => {
		try {
			setRefreshing(true);
			await dispatch(fetchTutores()).unwrap();
		} finally {
			setRefreshing(false);
		}
	}, [dispatch]);

	const jumpTo = useCallback(
		(letter) => {
			const sectionIndex = sections.findIndex((s) => s.title === letter);

			if (sectionIndex < 0) return;

			try {
				listRef.current?.scrollToLocation({
					sectionIndex,
					itemIndex: 0,
					animated: true,
					viewPosition: 0,
				});
			} catch {}
		},
		[sections]
	);

	const renderItem = useCallback(
		({ item }) => (
			<TutorRow
				item={item}
				tint={tint}
				subtle={subtle}
				text={text}
				border={border}
			/>
		),
		[tint, subtle, text, border]
	);

	const renderSectionHeader = useCallback(
		({ section: { title, data } }) => (
			<View style={[styles.sectionHeaderWrap, { backgroundColor: bg }]}>
				<Text style={[styles.sectionHeaderText, { color: subtle }]}>
					{title}
				</Text>

				<Text style={[styles.sectionCount, { color: subtle }]}>
					{data.length}
				</Text>
			</View>
		),
		[bg, subtle]
	);

	const listHeader = useMemo(
		() =>
			hasAny ? (
				<SearchHeader
					query={query}
					setQuery={setQuery}
					total={items.length}
					filteredTotal={filteredTotal}
					bg={bg}
					text={text}
					subtle={subtle}
					tint={tint}
					border={border}
				/>
			) : null,
		[hasAny, query, items.length, filteredTotal, bg, text, subtle, tint, border]
	);

	return (
		<SafeAreaView style={[styles.safe, { backgroundColor: bg }]} edges={["left", "right"]}>
			<SectionList
				ref={listRef}
				sections={sections}
				keyExtractor={(item) => String(item.id)}
				renderItem={renderItem}
				renderSectionHeader={renderSectionHeader}
				ListHeaderComponent={listHeader}
				ListEmptyComponent={
					hasAny ? (
						<EmptyCard
							title="Nenhum resultado"
							subtitle={`Não encontramos nada para “${query}”.`}
							actionLabel="Limpar busca"
							icon="search-outline"
							onAction={() => setQuery("")}
						/>
					) : (
						<EmptyCard
							title="Sem tutores por aqui"
							subtitle="Cadastre o primeiro tutor para começar. Você pode salvar apenas com o nome e completar os dados depois."
							actionLabel="Adicionar tutor"
							icon="person-add-outline"
							onAction={() => router.push("/(modals)/tutor-new")}
						/>
					)
				}
				contentContainerStyle={[
					styles.listContent,
					{
						paddingBottom: insets.bottom + 96,
					},
				]}
				stickySectionHeadersEnabled={false}
				keyboardShouldPersistTaps="handled"
				contentInsetAdjustmentBehavior="automatic"
				refreshControl={
					<RefreshControl
						refreshing={refreshing || loading}
						onRefresh={onRefresh}
						tintColor={tint}
						colors={[tint]}
					/>
				}
				initialNumToRender={16}
				maxToRenderPerBatch={16}
				windowSize={10}
				removeClippedSubviews={Platform.OS === "android"}
				showsVerticalScrollIndicator={false}
				onScrollToIndexFailed={() => {}}
			/>

			{letters.length > 1 && (
				<AlphabetBar
					letters={letters}
					onJump={jumpTo}
					bottomOffset={insets.bottom}
				/>
			)}
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	safe: {
		flex: 1,
	},

	listContent: {
		paddingTop: 4,
		paddingHorizontal: 14,
	},

	headerArea: {
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

	headerAddButton: {
		width: 38,
		height: 38,
		borderRadius: 19,
		alignItems: "center",
		justifyContent: "center",
		shadowColor: "#000",
		shadowOpacity: 0.14,
		shadowRadius: 8,
		shadowOffset: { width: 0, height: 4 },
		elevation: 3,
	},

	searchContainer: {
		height: 44,
		borderRadius: 14,
		borderWidth: StyleSheet.hairlineWidth,
		paddingHorizontal: 12,
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
	},

	searchInput: {
		flex: 1,
		height: 44,
		fontSize: 15,
		paddingVertical: 0,
	},

	clearSearchButton: {
		width: 28,
		height: 28,
		borderRadius: 14,
		alignItems: "center",
		justifyContent: "center",
	},

	sectionHeaderWrap: {
		marginTop: 16,
		marginBottom: 8,
		paddingHorizontal: 4,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},

	sectionHeaderText: {
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

	rowContent: {
		flex: 1,
		minWidth: 0,
	},

	rowTop: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		gap: 8,
	},

	rowName: {
		fontSize: 16,
		fontWeight: "750",
		letterSpacing: -0.2,
		flex: 1,
	},

	metaBlock: {
		marginTop: 5,
		gap: 3,
	},

	metaLine: {
		flexDirection: "row",
		alignItems: "center",
		gap: 5,
		minWidth: 0,
	},

	metaText: {
		fontSize: 13,
		fontWeight: "500",
		flex: 1,
	},

	emptyWrap: {
		marginTop: 42,
		marginHorizontal: 2,
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: "rgba(15,23,42,0.08)",
		backgroundColor: "#FFFFFF",
		borderRadius: 22,
		paddingHorizontal: 18,
		paddingVertical: 22,
		alignItems: "center",
		shadowColor: "#000",
		shadowOpacity: 0.05,
		shadowRadius: 14,
		shadowOffset: { width: 0, height: 6 },
		elevation: 2,
	},

	emptyIconWrap: {
		width: 58,
		height: 58,
		borderRadius: 29,
		backgroundColor: "#EEF2F7",
		alignItems: "center",
		justifyContent: "center",
		marginBottom: 12,
	},

	emptyTitle: {
		fontSize: 17,
		fontWeight: "800",
		color: "#111827",
		textAlign: "center",
	},

	emptySubtitle: {
		color: "#6B7280",
		textAlign: "center",
		marginTop: 6,
		lineHeight: 19,
	},

	emptyButton: {
		marginTop: 16,
		backgroundColor: "#2563EB",
		paddingHorizontal: 18,
		paddingVertical: 11,
		borderRadius: 12,
	},

	emptyButtonText: {
		color: "white",
		fontWeight: "800",
	},

	alphaBar: {
		position: "absolute",
		right: 4,
		top: 130,
		justifyContent: "center",
		alignItems: "center",
		paddingHorizontal: 2,
		paddingVertical: 6,
		borderRadius: 999,
		backgroundColor: "rgba(255,255,255,0.76)",
		gap: 1,
	},

	alphaBtn: {
		paddingVertical: 1,
		paddingHorizontal: 5,
	},

	alphaTxt: {
		fontSize: 10,
		fontWeight: "800",
		color: "#64748B",
	},

	fab: {
		position: "absolute",
		right: 18,
		width: 56,
		height: 56,
		borderRadius: 28,
		alignItems: "center",
		justifyContent: "center",
		shadowColor: "#000",
		shadowOpacity: 0.22,
		shadowRadius: 12,
		shadowOffset: { width: 0, height: 8 },
		elevation: 5,
	},
});