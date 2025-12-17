import React, { useMemo, useState } from "react";
import {
    Alert,
    ActivityIndicator,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";
// Se você usa Storage, descomente:
// import storage from "@react-native-firebase/storage";

import { useRouter } from "expo-router";
import { useThemeColor } from "@/hooks/useThemeColor";

export default function DeleteAccountScreen() {
    const router = useRouter();
    const bg = useThemeColor({}, "background");
    const text = useThemeColor({}, "text");
    const tint = useThemeColor({}, "tint");

    const [loading, setLoading] = useState(false);

    // Usado só para exibir o email na UI (não use este "user" para deletar, ele pode ficar stale).
    const uiUser = auth().currentUser;

    const userLabel = useMemo(() => {
        if (!uiUser) return "";
        return uiUser.email ? `(${uiUser.email})` : "";
    }, [uiUser]);

    async function deleteCollectionInBatches(colRef, batchSize = 200) {
        let lastDoc = null;

        while (true) {
            let q = colRef.orderBy("__name__").limit(batchSize);
            if (lastDoc) q = q.startAfter(lastDoc);

            const snap = await q.get();
            if (snap.empty) break;

            const batch = firestore().batch();
            snap.docs.forEach((d) => batch.delete(d.ref));
            await batch.commit();

            lastDoc = snap.docs[snap.docs.length - 1];

            if (snap.size < batchSize) break;
        }
    }

    async function deleteUserDataFirebaseOnly(uid) {
        const userRef = firestore().collection("users").doc(uid);

        // Apaga subcoleções (doc + subdocs diretos)
        try {
            await deleteCollectionInBatches(userRef.collection("pets"), 200);
            await deleteCollectionInBatches(userRef.collection("tutores"), 200);
            await deleteCollectionInBatches(userRef.collection("agenda"), 200);
        } catch (e) {
            // Se falhar por permissão/regra, prefira falhar e não deletar o Auth,
            // para não deixar dados órfãos.
            console.warn("Falha ao apagar subcoleções:", e?.message);
            throw e;
        }

        // Por fim, apaga o doc raiz
        try {
            await userRef.delete();
        } catch (e) {
            console.warn("Falha ao deletar users/{uid}:", e?.message);
            // Se falhar aqui também, é melhor falhar para não deletar Auth e deixar dados.
            throw e;
        }

        // (Opcional) Storage
        // try { await storage().ref(`users_profile/${uid}.jpg`).delete(); } catch {}
    }

    async function handleDeleteAccount() {
        const currentUser = auth().currentUser;

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

                            const freshUser = auth().currentUser;
                            if (!freshUser) {
                                Alert.alert(
                                    "Sessão inválida",
                                    "Faça login novamente para excluir a conta."
                                );
                                router.replace("/login");
                                return;
                            }

                            const uid = freshUser.uid;

                            // 1) Apaga dados no Firestore (inclui subcoleções)
                            await deleteUserDataFirebaseOnly(uid);

                            // 2) Apaga conta do Firebase Auth (pode exigir login recente)
                            await freshUser.delete();

                            // 3) Limpa sessão local
                            try {
                                await auth().signOut();
                            } catch { }

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
                                                    await auth().signOut();
                                                } catch { }
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
