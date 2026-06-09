import React, { useMemo, useState } from "react";
import {
	Alert,
	ActivityIndicator,
	Pressable,
	StyleSheet,
	Text,
	View,
} from "react-native";
import { useRouter } from "expo-router";
import { useThemeColor } from "@/hooks/useThemeColor";

import { auth, db } from "@/src/services/firebaseClient";
import { deleteUser, signOut } from "firebase/auth";
import {
	collection,
	deleteDoc,
	doc,
	documentId,
	getDocs,
	limit,
	orderBy,
	query,
	startAfter,
	writeBatch,
} from "firebase/firestore";

export default function DeleteAccountScreen() {
	const router = useRouter();
	const bg = useThemeColor({}, "background");
	const text = useThemeColor({}, "text");
	const tint = useThemeColor({}, "tint");

	const [loading, setLoading] = useState(false);

	const uiUser = auth.currentUser;

	const userLabel = useMemo(() => {
		if (!uiUser) return "";
		return uiUser.email ? `(${uiUser.email})` : "";
	}, [uiUser]);

	async function deleteCollectionInBatches(colRef, batchSize = 200) {
		let lastDoc = null;

		while (true) {
			const q = lastDoc
				? query(colRef, orderBy(documentId()), startAfter(lastDoc), limit(batchSize))
				: query(colRef, orderBy(documentId()), limit(batchSize));

			const snap = await getDocs(q);

			if (snap.empty) break;

			const batch = writeBatch(db);
			snap.docs.forEach((d) => batch.delete(d.ref));
			await batch.commit();

			lastDoc = snap.docs[snap.docs.length - 1];

			if (snap.size < batchSize) break;
		}
	}

	async function deleteUserDataFirebaseOnly(uid) {
		const userRef = doc(db, "users", String(uid));

		try {
			await deleteCollectionInBatches(collection(userRef, "pets"), 200);
			await deleteCollectionInBatches(collection(userRef, "tutores"), 200);
			await deleteCollectionInBatches(collection(userRef, "agenda"), 200);
		} catch (e) {
			console.warn("Falha ao apagar subcoleções:", e?.message);
			throw e;
		}

		try {
			await deleteDoc(userRef);
		} catch (e) {
			console.warn("Falha ao deletar users/{uid}:", e?.message);
			throw e;
		}
	}

	async function handleDeleteAccount() {
		const currentUser = auth.currentUser;

		if (!currentUser) {
			Alert.alert("Sessão inválida", "Faça login novamente para excluir a conta.");
			router.replace("/login");
			return;
		}

		Alert.alert(
			"Excluir conta",
			`Esta ação é permanente. Seus dados serão removidos e você perderá o acesso.\n\nDeseja continuar? ${userLabel}`,
			[
				{ text: "Cancelar", style: "cancel" },
				{
					text: "Excluir",
					style: "destructive",
					onPress: async () => {
						try {
							setLoading(true);

							const freshUser = auth.currentUser;

							if (!freshUser) {
								Alert.alert(
									"Sessão inválida",
									"Faça login novamente para excluir a conta."
								);
								router.replace("/login");
								return;
							}

							const uid = freshUser.uid;

							await deleteUserDataFirebaseOnly(uid);

							await deleteUser(freshUser);

							try {
								await signOut(auth);
							} catch {}

							Alert.alert("Conta excluída", "Sua conta foi removida com sucesso.");
							router.replace("/login");
						} catch (e) {
							const code = e?.code || "";
							console.warn("Erro delete account:", code, e?.message);

							if (code === "auth/requires-recent-login") {
								Alert.alert(
									"Confirmação necessária",
									"Por segurança, faça login novamente e tente excluir a conta de novo.",
									[
										{
											text: "OK",
											onPress: async () => {
												try {
													await signOut(auth);
												} catch {}
												router.replace("/login");
											},
										},
									]
								);
								return;
							}

							Alert.alert(
								"Não foi possível excluir",
								"Ocorreu um erro ao excluir sua conta. Tente novamente."
							);
						} finally {
							setLoading(false);
						}
					},
				},
			]
		);
	}

	return (
		<View style={[styles.container, { backgroundColor: bg }]}>
			<Text style={[styles.title, { color: text }]}>Excluir conta</Text>

			<View style={styles.card}>
				<Text style={[styles.cardText, { color: "#111827" }]}>
					Esta ação é permanente. Você perderá o acesso e os dados associados à
					sua conta serão removidos.
				</Text>

				<Text style={[styles.cardHint, { color: "#6B7280" }]}>
					Se solicitado, você precisará fazer login novamente para confirmar a
					exclusão.
				</Text>
			</View>

			<Pressable
				disabled={loading}
				onPress={handleDeleteAccount}
				style={({ pressed }) => [
					styles.dangerBtn,
					(pressed || loading) && { opacity: 0.9 },
					loading && { opacity: 0.7 },
				]}
			>
				{loading ? (
					<ActivityIndicator color="#fff" />
				) : (
					<Text style={styles.dangerText}>Excluir minha conta</Text>
				)}
			</Pressable>

			<Pressable
				disabled={loading}
				onPress={() => router.back()}
				style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.85 }]}
			>
				<Text style={[styles.secondaryText, { color: tint }]}>Voltar</Text>
			</Pressable>
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, padding: 16 },
	title: { fontSize: 22, fontWeight: "800", marginTop: 10, marginBottom: 12 },
	card: {
		backgroundColor: "#F3F4F6",
		borderRadius: 12,
		padding: 14,
		borderWidth: 1,
		borderColor: "#E5E7EB",
		marginBottom: 16,
	},
	cardText: { fontSize: 15, fontWeight: "600", marginBottom: 8 },
	cardHint: { fontSize: 13, lineHeight: 18 },
	dangerBtn: {
		backgroundColor: "#DC2626",
		borderRadius: 12,
		height: 48,
		alignItems: "center",
		justifyContent: "center",
	},
	dangerText: { color: "#fff", fontSize: 16, fontWeight: "800" },
	secondaryBtn: {
		marginTop: 12,
		height: 44,
		alignItems: "center",
		justifyContent: "center",
		borderRadius: 12,
		borderWidth: 1,
		borderColor: "#E5E7EB",
		backgroundColor: "#FFFFFF",
	},
	secondaryText: { fontSize: 15, fontWeight: "800" },
});