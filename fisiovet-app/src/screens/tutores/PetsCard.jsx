import React, { useEffect } from "react";
import {
	View,
	Text,
	StyleSheet,
	Pressable,
	FlatList,
	Image,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import {
	fetchPetsByTutor,
	selectPetsByTutorId,
} from "@/src/store/slices/petsSlice";
import { useThemeColor } from "@/hooks/useThemeColor";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { router } from "expo-router";

const EMPTY_PETS_IMAGE = require("@/assets/images/splash-fisiovet.png");

function PetItem({ pet, textColor, subtle, tutor }) {
	const subtitle = [pet?.especie, pet?.raca, pet?.cor]
		.filter(Boolean)
		.join(" • ");

	const especie = String(pet?.especie || "").toLowerCase();

	const iconName =
		especie === "gato" || especie === "felino"
			? "cat.fill"
			: "dog.fill";

	const openPet = () => {
		if (!pet?.id) return;

		router.push({
			pathname: "/(modals)/pets/[id]/detail",
			params: {
				id: String(pet.id),
				from: "tutor",
				tutorId: String(tutor.id),
			},
		});
	};

	return (
		<Pressable
			onPress={openPet}
			accessibilityRole="button"
			accessibilityLabel={`Abrir pet ${pet?.nome || ""}`}
			style={({ pressed }) => [
				styles.petButton,
				{
					opacity: pressed ? 0.6 : 1,
				},
			]}
		>
			<View style={styles.petRow}>
				<View style={styles.avatar}>
					<IconSymbol
						name={iconName}
						size={16}
						color="#fff"
					/>
				</View>

				<View style={styles.petContent}>
					<Text
						style={[
							styles.petName,
							{
								color: textColor,
							},
						]}
						numberOfLines={1}
					>
						{pet?.nome || "Pet"}
					</Text>

					{!!subtitle && (
						<Text
							style={[
								styles.petSubtitle,
								{
									color: subtle,
								},
							]}
							numberOfLines={1}
						>
							{subtitle}
						</Text>
					)}
				</View>

				<IconSymbol
					name="chevron.right"
					size={14}
					color={subtle}
				/>
			</View>
		</Pressable>
	);
}

function EmptyPets({ subtle, text, tint, tutor }) {
	const createPet = () => {
		if (!tutor?.id) return;

		router.push({
			pathname: "/(modals)/pet-new",
			params: {
				tutorId: String(tutor.id),
				tutorNome: tutor?.nome || "",
			},
		});
	};

	return (
		<View style={styles.emptyBox}>
			<Image
				source={EMPTY_PETS_IMAGE}
				style={styles.emptyImage}
				resizeMode="contain"
			/>

			<Text
				style={[
					styles.emptyTitle,
					{
						color: text,
					},
				]}
			>
				Nenhum pet cadastrado
			</Text>

			<Text
				style={[
					styles.emptyText,
					{
						color: subtle,
					},
				]}
				numberOfLines={2}
			>
				Adicione o primeiro paciente vinculado a este tutor.
			</Text>

			<Pressable
				onPress={createPet}
				accessibilityRole="button"
				accessibilityLabel="Cadastrar pet"
				style={({ pressed }) => [
					styles.emptyButton,
					{
						backgroundColor: tint,
						opacity: pressed ? 0.7 : 1,
					},
				]}
			>
				<IconSymbol
					name="plus"
					size={15}
					color="#fff"
				/>

				<Text style={styles.emptyButtonText}>
					Cadastrar pet
				</Text>
			</Pressable>
		</View>
	);
}

export default function PetsCard({ tutor }) {
	const dispatch = useDispatch();

	const border = useThemeColor(
		{
			light: "rgba(0,0,0,0.08)",
			dark: "rgba(255,255,255,0.08)",
		},
		"border"
	);

	const text = useThemeColor({}, "text");

	const subtle = useThemeColor(
		{
			light: "#6B7280",
			dark: "#9AA0A6",
		},
		"text"
	);

	const tint = useThemeColor({}, "tint");
	const bg = useThemeColor({}, "background");

	const pets = useSelector(
		selectPetsByTutorId(tutor?.id)
	);

	const hasPets = pets.length > 0;

	useEffect(() => {
		if (!tutor?.id) return;

		dispatch(
			fetchPetsByTutor({
				tutorId: tutor.id,
			})
		);
	}, [dispatch, tutor?.id]);

	const createPet = () => {
		if (!tutor?.id) return;

		router.push({
			pathname: "/(modals)/pet-new",
			params: {
				tutorId: String(tutor.id),
				tutorNome: tutor?.nome || "",
			},
		});
	};

	return (
		<View
			style={[
				styles.block,
				{
					borderColor: border,
					backgroundColor: bg,
					paddingTop: hasPets ? 12 : 8,
				},
			]}
		>
			{hasPets && (
				<View style={styles.headerRow}>
					<Text
						style={[
							styles.blockTitle,
							{
								color: text,
							},
						]}
					>
						Pets
					</Text>

					<Pressable
						onPress={createPet}
						hitSlop={8}
						accessibilityRole="button"
						accessibilityLabel="Adicionar pet"
						style={({ pressed }) => [
							styles.headerAddButton,
							{
								backgroundColor: tint,
								opacity: pressed ? 0.7 : 1,
							},
						]}
					>
						<IconSymbol
							name="plus"
							size={15}
							color="#fff"
						/>
					</Pressable>
				</View>
			)}

			{!hasPets && (
				<EmptyPets
					subtle={subtle}
					text={text}
					tint={tint}
					tutor={tutor}
				/>
			)}

			{hasPets && (
				<FlatList
					data={pets}
					keyExtractor={(item) =>
						String(item.id)
					}
					ItemSeparatorComponent={() => (
						<View style={styles.separator} />
					)}
					renderItem={({ item }) => (
						<PetItem
							pet={item}
							textColor={text}
							subtle={subtle}
							tutor={tutor}
						/>
					)}
					scrollEnabled={false}
					contentContainerStyle={styles.listContent}
				/>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	block: {
		padding: 12,
		borderWidth: 1,
		borderRadius: 12,
	},

	blockTitle: {
		fontSize: 16,
		fontWeight: "700",
	},

	headerRow: {
		minHeight: 30,
		marginBottom: 6,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},

	headerAddButton: {
		width: 30,
		height: 30,
		borderRadius: 15,
		alignItems: "center",
		justifyContent: "center",
	},

	listContent: {
		paddingTop: 6,
	},

	separator: {
		height: 10,
	},

	petButton: {
		paddingVertical: 10,
	},

	petRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
	},

	petContent: {
		flex: 1,
		minWidth: 0,
	},

	petName: {
		fontWeight: "700",
	},

	petSubtitle: {
		marginTop: 2,
	},

	avatar: {
		width: 28,
		height: 28,
		borderRadius: 14,
		backgroundColor: "rgba(0,0,0,0.6)",
		alignItems: "center",
		justifyContent: "center",
	},

	emptyBox: {
		alignItems: "center",
		paddingTop: 6,
		paddingBottom: 12,
		paddingHorizontal: 8,
		gap: 6,
	},

	emptyImage: {
		width: 74,
		height: 74,
		marginBottom: -2,
	},

	emptyTitle: {
		fontSize: 15,
		fontWeight: "800",
		textAlign: "center",
	},

	emptyText: {
		width: "100%",
		fontSize: 13,
		lineHeight: 17,
		textAlign: "center",
	},

	emptyButton: {
		marginTop: 6,
		height: 34,
		paddingHorizontal: 14,
		borderRadius: 17,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 7,
	},

	emptyButtonText: {
		color: "#fff",
		fontSize: 13,
		fontWeight: "800",
	},
});