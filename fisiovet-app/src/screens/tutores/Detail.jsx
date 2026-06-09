// app/(phone)/tutores/[id].jsx
// @ts-nocheck
import React, { useEffect } from "react";
import {
	View,
	Text,
	StyleSheet,
	Alert,
	Platform,
	Linking,
	Pressable,
	ScrollView,
	ActivityIndicator,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import { fetchTutor } from "@/src/store/slices/tutoresSlice";
import { useLocalSearchParams, useNavigation, router } from "expo-router";
import { useThemeColor } from "@/hooks/useThemeColor";
import { IconSymbol } from "@/components/ui/IconSymbol";
import Avatar from "@/components/ui/Avatar";
import EnderecoCard from "./EnderecoCard";
import Action from "@/components/ui/Action";
import { maskPhone } from "@/src/utils/masks";
import { openWhatsapp } from "@/src/utils/openWhatsapp";
import PetsCard from "./PetsCard";
import { UpcomingEventsCard } from "./UpcomingEventsCard";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";

export default function TutorDetail() {
	const { id } = useLocalSearchParams();
	const navigation = useNavigation();
	const dispatch = useDispatch();
	const insets = useSafeAreaInsets();

	const safeId = Array.isArray(id) ? id[0] : String(id || "");
	const tutor = useSelector((s) => s.tutores.byId[safeId]);

	const text = useThemeColor({}, "text");
	const subtle = useThemeColor({ light: "#6B7280", dark: "#9AA0A6" }, "text");
	const tint = useThemeColor({}, "tint");
	const bg = useThemeColor({}, "background");
	const border = useThemeColor(
		{ light: "rgba(15,23,42,0.08)", dark: "rgba(255,255,255,0.12)" },
		"border"
	);

	useEffect(() => {
		if (safeId && !tutor) dispatch(fetchTutor(safeId));
	}, [safeId, tutor, dispatch]);

	useEffect(() => {
		navigation.setOptions({
			headerShown: false,
		});
	}, [navigation]);

	if (!tutor) {
		return (
			<SafeAreaView
				style={[styles.center, { backgroundColor: bg }]}
				edges={["top", "left", "right"]}
			>
				<ActivityIndicator />
				<Text style={{ color: subtle, marginTop: 10 }}>Carregando tutor…</Text>
			</SafeAreaView>
		);
	}

	const email = () => {
		if (tutor.email) Linking.openURL(`mailto:${tutor.email}`);
	};

	const maps = async () => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});

		try {
			const lat = tutor?.geo?.lat;
			const lng = tutor?.geo?.lng;

			if (!lat || !lng) {
				Alert.alert("Endereço", "Sem coordenadas para abrir no mapa.");
				return;
			}

			let origin = "";

			try {
				const { status } = await Location.requestForegroundPermissionsAsync();

				if (status === "granted") {
					const pos = await Location.getCurrentPositionAsync({});
					origin = `${pos.coords.latitude},${pos.coords.longitude}`;
				}
			} catch {}

			const dest = `${lat},${lng}`;

			if (Platform.OS === "android") {
				const navIntent = `google.navigation:q=${encodeURIComponent(dest)}&mode=d`;
				const canNav = await Linking.canOpenURL("google.navigation:q=0,0");

				if (canNav) {
					await Linking.openURL(navIntent);
					return;
				}

				const gmapsWeb =
					`https://www.google.com/maps/dir/?api=1` +
					`&destination=${encodeURIComponent(dest)}` +
					(origin ? `&origin=${encodeURIComponent(origin)}` : "") +
					`&travelmode=driving`;

				await Linking.openURL(gmapsWeb);
				return;
			}

			const gmapsUniversal =
				`https://www.google.com/maps/dir/?api=1` +
				`&destination=${encodeURIComponent(dest)}` +
				(origin ? `&origin=${encodeURIComponent(origin)}` : "") +
				`&travelmode=driving`;

			try {
				await Linking.openURL(gmapsUniversal);
			} catch {
				const apple =
					`http://maps.apple.com/?dirflg=d` +
					`&daddr=${encodeURIComponent(dest)}` +
					(origin ? `&saddr=${encodeURIComponent(origin)}` : "");

				await Linking.openURL(apple);
			}
		} catch (err) {
			console.log("Erro ao abrir direções:", err);
		}
	};

	return (
		<SafeAreaView style={[styles.safe, { backgroundColor: bg }]} edges={["top", "left", "right"]}>
			<View style={styles.topBar}>
				<Pressable
					onPress={() => {
						if (navigation.canGoBack()) {
							navigation.goBack();
							return;
						}

						router.replace("/(phone)/tutores");
					}}
					hitSlop={10}
					style={styles.topButton}
					accessibilityLabel="Voltar"
				>
					<IconSymbol name="chevron.left" size={22} color={tint} />
				</Pressable>

				<Text style={[styles.topTitle, { color: text }]} numberOfLines={1}>
					Tutor
				</Text>

				<Pressable
					onPress={() =>
						router.push({
							pathname: "/(modals)/tutor-new",
							params: { id: safeId, mode: "edit" },
						})
					}
					hitSlop={10}
					style={styles.topButton}
					accessibilityLabel="Editar tutor"
				>
					<IconSymbol name="square.and.pencil" size={23} color={tint} />
				</Pressable>
			</View>

			<ScrollView
				contentContainerStyle={[
					styles.content,
					{ paddingBottom: 16 + insets.bottom + 24 },
				]}
				scrollEventThrottle={16}
				showsVerticalScrollIndicator={false}
			>
				<View style={styles.header}>
					<Avatar name={tutor.nome} size={72} />

					<Text style={[styles.name, { color: text }]} numberOfLines={2}>
						{tutor.nome}
					</Text>

					{!!tutor.telefone && (
						<Text selectable style={[styles.subText, { color: subtle }]}>
							{maskPhone(tutor.telefone)}
						</Text>
					)}

					{!!tutor.email && (
						<Text selectable style={[styles.subText, { color: subtle }]}>
							{tutor.email}
						</Text>
					)}
				</View>

				<View style={styles.actions}>
					<Action
						title="WhatsApp"
						icon="message.fill"
						onPress={() => openWhatsapp(tutor.telefone, `Olá ${tutor.nome}`)}
						tint={tint}
					/>

					<Action title="E-mail" icon="envelope.fill" onPress={email} tint={tint} />

					<Action title="Rota" icon="car.fill" onPress={maps} tint={tint} />
				</View>

				<PetsCard tutor={tutor} />

				{tutor?.observacoes ? (
					<View
						style={[
							styles.noteCard,
							{
								borderColor: border,
								backgroundColor: "rgba(10,132,255,0.06)",
							},
						]}
					>
						<View style={styles.noteHeader}>
							<IconSymbol name="info.circle.fill" size={16} color={tint} />
							<Text style={{ color: text, fontWeight: "800" }}>Observações</Text>
						</View>

						<Text style={{ color: subtle, lineHeight: 20 }}>
							{tutor.observacoes}
						</Text>
					</View>
				) : null}

				<UpcomingEventsCard tutorId={tutor.id} />

				<EnderecoCard tutor={tutor} />
			</ScrollView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	safe: {
		flex: 1,
	},

	center: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
	},

	topBar: {
		height: 48,
		paddingHorizontal: 12,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},

	topButton: {
		width: 44,
		height: 44,
		borderRadius: 22,
		alignItems: "center",
		justifyContent: "center",
	},

	topTitle: {
		flex: 1,
		textAlign: "center",
		fontSize: 16,
		fontWeight: "800",
		marginHorizontal: 8,
	},

	content: {
		paddingHorizontal: 16,
		paddingTop: 8,
		gap: 16,
	},

	header: {
		alignItems: "center",
		gap: 6,
		paddingTop: 4,
	},

	name: {
		fontSize: 24,
		fontWeight: "850",
		letterSpacing: -0.5,
		textAlign: "center",
	},

	subText: {
		fontSize: 14,
		fontWeight: "500",
	},

	actions: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-evenly",
		gap: 20,
		paddingVertical: 5,
	},

	noteCard: {
		borderWidth: StyleSheet.hairlineWidth,
		borderRadius: 16,
		padding: 14,
	},

	noteHeader: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
		marginBottom: 6,
	},
});