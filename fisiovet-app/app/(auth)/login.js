// app/(auth)/login.jsx
// @ts-nocheck
import React, { useEffect, useState } from "react";
import {
	View,
	Text,
	TextInput,
	Pressable,
	StyleSheet,
	KeyboardAvoidingView,
	Platform,
	ScrollView,
	Alert,
	ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as SecureStore from "expo-secure-store";
import { router } from "expo-router";
import { Image } from "expo-image";

import {
	fetchSignInMethodsForEmail,
	sendPasswordResetEmail,
	signInWithCredential,
	signInWithEmailAndPassword,
	GoogleAuthProvider,
	OAuthProvider,
	linkWithCredential,
	updateProfile,
	reload,
} from "firebase/auth";
import { auth } from "@/src/services/firebaseClient";

import { useDispatch, useSelector } from "react-redux";
import { setUser } from "@/src/store/slices/userSlice";
import { mapFirebaseUserToDTO } from "@/firebase/authUserDTO";
import ResponsiveHero from "./_resposiveHero";

import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";

import { configureGoogle } from "@/firebase/google_login";
import { GoogleSignin, statusCodes } from "@react-native-google-signin/google-signin";
import { postLoginBootstrap, selectBootstrapLoading } from "@/src/store/bootstrapSlice";

const colors = {
	teal: "#159E9C",
	tealDark: "#0F7E7C",
	card: "rgba(255,255,255,0.6)",
	text: "#111827",
	sub: "#6B7280",
	line: "#E5E7EB",
	shadow: "rgba(16, 24, 40, 0.08)",
};

const REMEMBER_KEY = "fv_login_email";

export default function Login() {
	const dispatch = useDispatch();

	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [secure, setSecure] = useState(true);
	const [remember, setRemember] = useState(false);
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);

	const [googleLoading, setGoogleLoading] = useState(false);
	const booting = useSelector(selectBootstrapLoading);

	const [appleLoading, setAppleLoading] = useState(false);
	const [appleAvailable, setAppleAvailable] = useState(false);

	const currentYear = new Date().getFullYear();

	useEffect(() => {
		configureGoogle();
	}, []);

	useEffect(() => {
		let mounted = true;

		(async () => {
			try {
				if (Platform.OS !== "ios") {
					if (mounted) setAppleAvailable(false);
					return;
				}

				const available = await AppleAuthentication.isAvailableAsync();

				if (mounted) setAppleAvailable(!!available);
			} catch {
				if (mounted) setAppleAvailable(false);
			}
		})();

		return () => {
			mounted = false;
		};
	}, []);

	useEffect(() => {
		(async () => {
			try {
				const saved = await SecureStore.getItemAsync(REMEMBER_KEY);

				if (saved) {
					setEmail(saved);
					setRemember(true);
				}
			} catch {}
		})();
	}, []);

	useEffect(() => {
		if (error) console.log("error:: ", error);
	}, [error]);

	function randomNonce(length = 32) {
		const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
		let out = "";

		for (let i = 0; i < length; i += 1) {
			out += chars[Math.floor(Math.random() * chars.length)];
		}

		return out;
	}

	const getDisplayName = ({ displayName, fullName, email, fallback }) => {
		if (displayName && displayName.trim()) return displayName.trim();

		const given = fullName?.givenName?.trim();
		const family = fullName?.familyName?.trim();
		const appleName = [given, family].filter(Boolean).join(" ").trim();

		if (appleName) return appleName;

		if (email && email.includes("@")) {
			if (email.endsWith("@privaterelay.appleid.com")) return "Usuário Apple";
			return email.split("@")[0];
		}

		return fallback || "Usuário";
	};

	const isBadAppleName = (name) => {
		if (!name) return true;

		const n = String(name).trim();
		const looksLikeUuid = /^[0-9a-fA-F-]{20,}$/.test(n) && n.includes("-");

		if (looksLikeUuid) return true;
		if (n.length >= 22 && !n.includes(" ")) return true;

		return false;
	};

	async function runPostLoginBootstrap(firebaseUser) {
		if (!firebaseUser?.uid) return;

		try {
			await dispatch(
				postLoginBootstrap({
					uid: firebaseUser.uid,
					clinicId: firebaseUser.clinicId,
				})
			).unwrap();
		} catch (e) {
			console.warn("Bootstrap pós-login falhou:", e);
		}
	}

	async function handleLogin() {
		try {
			await Haptics.selectionAsync();
			setLoading(true);
			setError("");

			const cleanEmail = email.trim();

			if (remember && cleanEmail) {
				await SecureStore.setItemAsync(REMEMBER_KEY, cleanEmail);
			} else {
				await SecureStore.deleteItemAsync(REMEMBER_KEY);
			}

			const { user } = await signInWithEmailAndPassword(auth, cleanEmail, password);

			dispatch(setUser(mapFirebaseUserToDTO(user)));

			const finalUser = auth.currentUser || user;
			await runPostLoginBootstrap(finalUser);

			router.replace("/");
		} catch (err) {
			setError(err?.message?.replace("Firebase:", "").trim() || "Falha no login.");
		} finally {
			setLoading(false);
		}
	}

	async function handleForgot() {
		try {
			await Haptics.selectionAsync();

			const target = email.trim();

			if (!target) {
				Alert.alert(
					"Recuperar senha",
					"Informe seu e-mail no campo acima para enviarmos o link."
				);
				return;
			}

			await sendPasswordResetEmail(auth, target);

			Alert.alert("Pronto", "Enviamos um link de redefinição de senha para seu e-mail.");
		} catch (e) {
			Alert.alert("Erro", e?.message || "Não foi possível enviar o e-mail de recuperação.");
		}
	}

	function goToSignup() {
		router.push("/(auth)/register");
	}

	async function handleAppleLogin() {
		let appleEmail = null;

		try {
			await Haptics.selectionAsync();
			setError("");
			setAppleLoading(true);

			if (!appleAvailable) {
				Alert.alert("Entrar com Apple", "Sign in with Apple não está disponível neste dispositivo.");
				return;
			}

			const rawNonce = randomNonce(32);
			const hashedNonce = await Crypto.digestStringAsync(
				Crypto.CryptoDigestAlgorithm.SHA256,
				rawNonce
			);

			const appleCred = await AppleAuthentication.signInAsync({
				requestedScopes: [
					AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
					AppleAuthentication.AppleAuthenticationScope.EMAIL,
				],
				nonce: hashedNonce,
			});

			if (!appleCred?.identityToken) {
				setError("Não foi possível obter o token da Apple.");
				return;
			}

			appleEmail = appleCred?.email || null;

			const provider = new OAuthProvider("apple.com");
			const appleAuthCredential = provider.credential({
				idToken: appleCred.identityToken,
				rawNonce,
			});

			let fbUser;

			try {
				const res = await signInWithCredential(auth, appleAuthCredential);
				fbUser = res.user;
			} catch (err) {
				if (err?.code === "auth/account-exists-with-different-credential") {
					const emailToCheck = err?.customData?.email || err?.email || appleEmail;

					if (!emailToCheck) {
						Alert.alert(
							"Conta já existente",
							"Esta conta já existe com outro método. Entre com o método usado no cadastro e depois vincule o login da Apple."
						);
						return;
					}

					const methods = await fetchSignInMethodsForEmail(auth, emailToCheck);

					if (methods?.includes("password") && password) {
						const emailLogin = await signInWithEmailAndPassword(
							auth,
							emailToCheck,
							password
						);

						await linkWithCredential(emailLogin.user, appleAuthCredential);
						fbUser = emailLogin.user;
					} else {
						Alert.alert(
							"Conta já existente",
							"Este e-mail já possui cadastro. Entre com e-mail e senha e depois toque em “Entrar com Apple” para vincular."
						);
						return;
					}
				} else if (err?.code === "auth/operation-not-allowed") {
					setError("Login com Apple não está habilitado no Firebase.");
					return;
				} else {
					throw err;
				}
			}

			const finalUser = auth.currentUser || fbUser;

			if (finalUser) {
				const computedName = getDisplayName({
					displayName: finalUser.displayName,
					fullName: appleCred?.fullName,
					email: appleCred?.email,
					fallback: "Usuário Apple",
				});

				if (!finalUser.displayName || isBadAppleName(finalUser.displayName)) {
					try {
						await updateProfile(finalUser, { displayName: computedName });
						await reload(finalUser);
					} catch (e) {
						console.log("[APPLE] Falha ao atualizar displayName (ignorado):", e?.message);
					}
				}

				const reloaded = auth.currentUser || finalUser;

				dispatch(setUser(mapFirebaseUserToDTO(reloaded)));

				await runPostLoginBootstrap(reloaded);

				router.replace("/");
			} else {
				setError("Não foi possível concluir o login com Apple.");
			}
		} catch (e) {
			if (e?.code === "ERR_REQUEST_CANCELED") {
				Alert.alert("Login cancelado", "Você pode tentar novamente quando quiser.");
				return;
			}

			console.log("APPLE ERROR RAW:", e);

			try {
				console.log("APPLE ERROR JSON:", JSON.stringify(e, null, 2));
			} catch {}

			setError((e?.message || "Falha no login com Apple.").replace("Firebase:", "").trim());
		} finally {
			setAppleLoading(false);
		}
	}

	async function handleGoogleLogin() {
		let googleIdToken = null;
		let googlePhoto = null;

		try {
			await Haptics.selectionAsync();
			setError("");
			setGoogleLoading(true);

			console.log("[GOOGLE] Início do login");

			try {
				const cur = await GoogleSignin.getCurrentUser();

				if (cur) {
					await GoogleSignin.revokeAccess().catch(() => {});
					await GoogleSignin.signOut().catch(() => {});
					console.log("[GOOGLE] Sessão anterior revogada");
				} else {
					await GoogleSignin.signOut().catch(() => {});
				}
			} catch (e) {
				console.log("[GOOGLE] Ignorando erro ao limpar sessão:", e?.message);
			}

			await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
			console.log("[GOOGLE] Play Services OK");

			const googleResponse = await GoogleSignin.signIn();

			console.log("[GOOGLE] signIn retornou:", {
				hasUser: !!googleResponse?.user,
				hasIdToken: !!googleResponse?.idToken,
			});

			googleIdToken = googleResponse?.idToken || null;
			googlePhoto = googleResponse?.user?.photo || null;

			if (!googleIdToken) {
				try {
					const tokens = await GoogleSignin.getTokens();

					console.log("[GOOGLE] getTokens() retornou:", {
						hasIdToken: !!tokens?.idToken,
					});

					if (tokens?.idToken) googleIdToken = tokens.idToken;
				} catch (e) {
					console.log("[GOOGLE] getTokens() falhou:", e);
				}
			}

			if (!googleIdToken) {
				Alert.alert(
					"Login Google",
					"Não foi possível obter o token do Google.\n\nVerifique:\n• EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID (tipo Web) do MESMO projeto\n• iOS: URL scheme (REVERSED_CLIENT_ID) no Info.plist\n• Android: SHA-1/SHA-256 cadastrados no Firebase"
				);
				return;
			}

			console.log("[GOOGLE] idToken OK, autenticando no Firebase...");

			const googleCredential = GoogleAuthProvider.credential(googleIdToken);
			let fbUser;

			try {
				const res = await signInWithCredential(auth, googleCredential);
				fbUser = res.user;

				console.log("[GOOGLE] Firebase signInWithCredential OK, uid:", fbUser?.uid);
			} catch (err) {
				console.log("[GOOGLE] Erro signInWithCredential:", err?.code, err?.message);

				if (err?.code === "auth/account-exists-with-different-credential") {
					const emailInFirebase = err?.customData?.email || err?.email;

					if (!emailInFirebase) {
						Alert.alert(
							"Conta já existente",
							"Esta conta já existe com outro método. Entre com o método usado no cadastro e depois vincule o login do Google."
						);
						return;
					}

					const methods = await fetchSignInMethodsForEmail(auth, emailInFirebase);

					console.log("[GOOGLE] Métodos existentes para o e-mail:", methods);

					if (methods?.includes("password") && password) {
						const emailLogin = await signInWithEmailAndPassword(
							auth,
							emailInFirebase,
							password
						);

						await linkWithCredential(emailLogin.user, googleCredential);
						fbUser = emailLogin.user;

						console.log("[GOOGLE] Conta linkada com Google, uid:", fbUser?.uid);
					} else {
						Alert.alert(
							"Conta já existente",
							'Este e-mail já possui cadastro. Entre com e-mail e senha e depois toque novamente em "Entrar com Google" para vincular.'
						);
						return;
					}
				} else if (err?.code === statusCodes?.SIGN_IN_CANCELLED || err?.code === "12501") {
					console.log("[GOOGLE] Usuário cancelou o fluxo Google");
					return;
				} else {
					throw err;
				}
			}

			if (fbUser && !fbUser.photoURL && googlePhoto) {
				try {
					await updateProfile(fbUser, { photoURL: googlePhoto });
					await reload(fbUser);

					console.log("[GOOGLE] Foto atualizada a partir do Google");
				} catch (e) {
					console.log("[GOOGLE] Falha ao atualizar foto (ignorado):", e?.message);
				}
			}

			const finalUser = auth.currentUser || fbUser;

			if (finalUser) {
				dispatch(setUser(mapFirebaseUserToDTO(finalUser)));

				console.log("[GOOGLE] Redux atualizado, navegando...");

				await runPostLoginBootstrap(finalUser);

				router.replace("/");
			} else {
				setError("Não foi possível concluir o login.");
			}
		} catch (e) {
			console.log("[GOOGLE] Catch geral:", e?.code, e?.message);

			if (e?.code === statusCodes?.SIGN_IN_CANCELLED || e?.code === "12501") {
				// cancelou → não mostra erro
			} else if (e?.code === statusCodes?.PLAY_SERVICES_NOT_AVAILABLE) {
				setError("Google Play Services indisponível/atualize para continuar.");
			} else {
				const msg = e?.message || "Falha no login com Google.";
				setError(msg.replace("Firebase:", "").trim());
			}
		} finally {
			setGoogleLoading(false);
			console.log("[GOOGLE] Fim do login (loading=false)");
		}
	}

	return (
		<KeyboardAvoidingView
			behavior={Platform.OS === "ios" ? "padding" : undefined}
			style={{ flex: 1 }}
		>
			<ResponsiveHero
				source={require("@/assets/images/fisiovet-hero.png")}
				fullScreen
				overlay
			>
				<ScrollView
					contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 2 }}
					keyboardShouldPersistTaps="handled"
				>
					<View style={styles.card}>
						<View style={styles.brandRow}>
							<View style={styles.brandIcon}>
								<Ionicons name="paw" size={18} color="whitesmoke" />
							</View>

							<Text style={styles.brandText}>
								<Text style={{ fontWeight: "800" }}>FisioVet</Text>
							</Text>
						</View>

						<Text style={styles.subtitle}>Acesse sua conta</Text>

						<View style={styles.inputOuter}>
							<View style={styles.inputRow}>
								<TextInput
									value={email}
									onChangeText={setEmail}
									placeholder="seu@email.com"
									placeholderTextColor="#9CA3AF"
									autoCapitalize="none"
									keyboardType="email-address"
									returnKeyType="next"
									style={styles.input}
								/>

								<Ionicons name="mail-outline" size={18} color="#9CA3AF" />
							</View>
						</View>

						<View style={[styles.inputOuter, { marginTop: 10 }]}>
							<View style={styles.inputRow}>
								<TextInput
									value={password}
									onChangeText={setPassword}
									placeholder="Senha"
									placeholderTextColor="#9CA3AF"
									secureTextEntry={secure}
									returnKeyType="go"
									onSubmitEditing={handleLogin}
									style={styles.input}
								/>

								<Pressable onPress={() => setSecure((s) => !s)} hitSlop={10}>
									<Ionicons
										name={secure ? "eye-outline" : "eye-off-outline"}
										size={20}
										color="#9CA3AF"
									/>
								</Pressable>
							</View>
						</View>

						<View style={styles.rowBetween}>
							<Pressable
								onPress={() => setRemember((v) => !v)}
								style={styles.rememberRow}
								hitSlop={10}
							>
								<View
									style={[
										styles.checkbox,
										remember && {
											borderColor: colors.teal,
											backgroundColor: "#E6FFFA",
										},
									]}
								>
									{remember ? (
										<Ionicons name="checkmark" size={14} color={colors.teal} />
									) : null}
								</View>

								<Text style={styles.rememberText}>Lembrar-me</Text>
							</Pressable>

							<Pressable onPress={handleForgot} hitSlop={10}>
								<Text style={styles.link}>Esqueceu de senha?</Text>
							</Pressable>
						</View>

						<Pressable
							onPress={handleLogin}
							disabled={loading}
							style={({ pressed }) => [
								styles.button,
								{ opacity: loading || pressed ? 0.9 : 1 },
							]}
						>
							<Text style={styles.buttonText}>{loading ? "Entrando…" : "Entrar"}</Text>
						</Pressable>

						<View style={styles.hr} />

						<View style={[styles.rowCenter, { marginBottom: 12 }]}>
							<Text style={{ color: colors.sub }}>Não tem conta? </Text>

							<Pressable onPress={goToSignup} hitSlop={10}>
								<Text style={[styles.link, { fontWeight: "700" }]}>Cadastre-se</Text>
							</Pressable>

							<Text style={{ color: colors.sub }}> ou </Text>
						</View>

						<Pressable
							onPress={handleGoogleLogin}
							disabled={googleLoading}
							style={({ pressed }) => [
								styles.googleBtn,
								{ opacity: googleLoading || pressed ? 0.9 : 1 },
							]}
						>
							{googleLoading ? (
								<ActivityIndicator color="#000" />
							) : (
								<View style={styles.googleContent}>
									<Image
										source={require("@/assets/images/google-icon.png")}
										style={styles.googleIcon}
									/>

									<Text style={styles.googleText}>Entrar com Google</Text>
								</View>
							)}
						</Pressable>

						{Platform.OS === "ios" && appleAvailable && (
							<Pressable
								onPress={handleAppleLogin}
								disabled={appleLoading}
								style={({ pressed }) => [
									styles.appleBtn,
									{ opacity: appleLoading || pressed ? 0.9 : 1 },
								]}
							>
								{appleLoading ? (
									<ActivityIndicator color="#fff" />
								) : (
									<View style={styles.appleContent}>
										<Ionicons name="logo-apple" size={20} color="#fff" />

										<Text style={styles.appleText}>Entrar com Apple</Text>
									</View>
								)}
							</Pressable>
						)}

						<Text style={styles.footer}>FisioVet • {currentYear}</Text>

						{!!error && (
							<View style={styles.errBox}>
								<Text style={styles.errText}>{error}</Text>
							</View>
						)}

						{booting && (
							<View
								style={{
									position: "absolute",
									left: 0,
									right: 0,
									top: 0,
									bottom: 0,
									backgroundColor: "rgba(255,255,255,0.7)",
									alignItems: "center",
									justifyContent: "center",
									borderRadius: 16,
								}}
							>
								<ActivityIndicator size="large" color={colors.teal} />

								<Text style={{ marginTop: 8, color: "#111", fontWeight: "bold" }}>
									Carregando seus dados…
								</Text>
							</View>
						)}
					</View>
				</ScrollView>
			</ResponsiveHero>
		</KeyboardAvoidingView>
	);
}

const styles = StyleSheet.create({
	bannerWrap: { paddingTop: 22, paddingHorizontal: 16 },
	banner: {
		height: 180,
		borderRadius: 16,
		overflow: "hidden",
		justifyContent: "flex-start",
	},
	badge: {
		marginTop: 18,
		marginLeft: 18,
		width: 56,
		height: 56,
		borderRadius: 28,
		backgroundColor: "rgba(255,255,255,0.22)",
		alignItems: "center",
		justifyContent: "center",
	},

	card: {
		marginTop: -34,
		marginHorizontal: 16,
		backgroundColor: colors.card,
		opacity: 1,
		borderRadius: 18,
		padding: 18,
		shadowColor: colors.shadow,
		shadowOpacity: 1,
		shadowRadius: 24,
		shadowOffset: { width: 0, height: 8 },
		elevation: 4,
	},

	brandRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
	brandIcon: {
		width: 42,
		height: 42,
		borderRadius: 21,
		backgroundColor: "#0EA5A4",
		alignItems: "center",
		justifyContent: "center",
	},
	brandText: { fontSize: 28, color: colors.text },
	subtitle: {
		color: colors.text,
		opacity: 0.8,
		fontSize: 18,
		marginTop: 4,
		marginBottom: 16,
		fontWeight: "600",
	},

	inputOuter: {
		borderWidth: 1,
		borderColor: colors.line,
		borderRadius: 12,
		backgroundColor: "#FFF",
	},
	inputRow: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 12,
		height: 48,
		gap: 8,
	},
	input: {
		flex: 1,
		color: colors.text,
		fontSize: 16,
		paddingVertical: 0,
	},

	rowBetween: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginTop: 12,
	},
	rememberRow: { flexDirection: "row", alignItems: "center", gap: 8 },
	checkbox: {
		width: 18,
		height: 18,
		borderRadius: 4,
		borderWidth: 1.5,
		borderColor: colors.line,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "#FFF",
	},
	rememberText: { color: colors.sub, fontSize: 14 },
	link: { color: colors.teal, fontSize: 14 },

	button: {
		marginTop: 14,
		backgroundColor: colors.teal,
		paddingVertical: 14,
		borderRadius: 10,
		alignItems: "center",
	},
	buttonText: { color: "#FFF", fontSize: 16, fontWeight: "700" },

	hr: { height: 1, backgroundColor: colors.line, marginVertical: 14 },

	rowCenter: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
	footer: { textAlign: "center", color: colors.teal, marginTop: 10, fontWeight: "bold" },

	errBox: {
		marginTop: 12,
		padding: 10,
		borderRadius: 8,
		backgroundColor: "#FEF2F2",
		borderWidth: 1,
		borderColor: "#FCA5A5",
	},
	errText: { color: "#B91C1C", textAlign: "center" },

	googleBtn: {
		backgroundColor: "#fff",
		borderColor: "#E5E7EB",
		borderWidth: 1,
		paddingVertical: 12,
		borderRadius: 10,
		alignItems: "center",
		justifyContent: "center",
		shadowColor: "rgba(0, 0, 0, 0.08)",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 1,
		shadowRadius: 3,
		elevation: 2,
	},
	googleContent: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 8,
	},
	googleIcon: {
		width: 30,
		height: 30,
	},
	googleText: {
		color: "#3C4043",
		fontSize: 16,
		fontWeight: "600",
	},

	appleBtn: {
		backgroundColor: "#000",
		borderRadius: 10,
		paddingVertical: 12,
		alignItems: "center",
		justifyContent: "center",
		marginTop: 10,
	},
	appleContent: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 8,
	},
	appleText: {
		color: "#fff",
		fontSize: 16,
		fontWeight: "700",
	},
});