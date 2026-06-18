// app/(auth)/login.js
// @ts-nocheck

import React, {
	useEffect,
	useState,
} from "react";

import {
	ActivityIndicator,
	Alert,
	KeyboardAvoidingView,
	Platform,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	View,
} from "react-native";

import {
	Ionicons,
} from "@expo/vector-icons";

import * as Haptics from "expo-haptics";
import * as SecureStore from "expo-secure-store";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";

import {
	router,
} from "expo-router";

import {
	Image,
} from "expo-image";

import {
	fetchSignInMethodsForEmail,
	GoogleAuthProvider,
	linkWithCredential,
	OAuthProvider,
	reload,
	sendPasswordResetEmail,
	signInWithCredential,
	signInWithEmailAndPassword,
	updateProfile,
} from "firebase/auth";

import {
	useDispatch,
} from "react-redux";

import {
	GoogleSignin,
	statusCodes,
} from "@react-native-google-signin/google-signin";

import {
	auth,
} from "@/src/services/firebaseClient";

import {
	setUser,
} from "@/src/store/slices/userSlice";

import {
	mapFirebaseUserToDTO,
} from "@/firebase/authUserDTO";

import {
	configureGoogle,
} from "@/firebase/google_login";

import ResponsiveHero from "./_resposiveHero";

const colors = {
	teal: "#159E9C",
	tealDark: "#0F7E7C",
	card: "rgba(255,255,255,0.6)",
	text: "#111827",
	sub: "#6B7280",
	line: "#E5E7EB",
	shadow: "rgba(16, 24, 40, 0.08)",
};

const REMEMBER_KEY =
	"fv_login_email";

function normalizeFirebaseError(
	error,
	fallback
) {
	const code =
		error?.code;

	switch (code) {
		case "auth/invalid-credential":
		case "auth/wrong-password":
		case "auth/user-not-found":
			return "E-mail ou senha inválidos.";

		case "auth/invalid-email":
			return "Informe um e-mail válido.";

		case "auth/too-many-requests":
			return "Muitas tentativas. Aguarde alguns minutos e tente novamente.";

		case "auth/network-request-failed":
			return "Sem conexão. Verifique sua internet.";

		default:
			return (
				error?.message ||
				fallback ||
				"Não foi possível entrar."
			)
				.replace(
					"Firebase:",
					""
				)
				.trim();
	}
}

function randomNonce(
	length = 32
) {
	const chars =
		"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

	let output = "";

	for (
		let index = 0;
		index < length;
		index += 1
	) {
		output +=
			chars[
				Math.floor(
					Math.random() *
						chars.length
				)
			];
	}

	return output;
}

function getDisplayName({
	displayName,
	fullName,
	email,
	fallback,
}) {
	if (
		displayName?.trim()
	) {
		return displayName.trim();
	}

	const givenName =
		fullName?.givenName?.trim();

	const familyName =
		fullName?.familyName?.trim();

	const appleName =
		[
			givenName,
			familyName,
		]
			.filter(Boolean)
			.join(" ")
			.trim();

	if (appleName) {
		return appleName;
	}

	if (
		email?.includes("@")
	) {
		if (
			email.endsWith(
				"@privaterelay.appleid.com"
			)
		) {
			return "Usuário Apple";
		}

		return email.split("@")[0];
	}

	return (
		fallback ||
		"Usuário"
	);
}

function isBadAppleName(
	name
) {
	if (!name) {
		return true;
	}

	const normalized =
		String(name).trim();

	const looksLikeUuid =
		/^[0-9a-fA-F-]{20,}$/.test(
			normalized
		) &&
		normalized.includes("-");

	return (
		looksLikeUuid ||
		(
			normalized.length >=
				22 &&
			!normalized.includes(" ")
		)
	);
}

export default function Login() {
	const dispatch =
		useDispatch();

	const [
		email,
		setEmail,
	] = useState("");

	const [
		password,
		setPassword,
	] = useState("");

	const [
		secure,
		setSecure,
	] = useState(true);

	const [
		remember,
		setRemember,
	] = useState(false);

	const [
		error,
		setError,
	] = useState("");

	const [
		loading,
		setLoading,
	] = useState(false);

	const [
		googleLoading,
		setGoogleLoading,
	] = useState(false);

	const [
		appleLoading,
		setAppleLoading,
	] = useState(false);

	const [
		appleAvailable,
		setAppleAvailable,
	] = useState(false);

	const currentYear =
		new Date().getFullYear();

	const anyLoading =
		loading ||
		googleLoading ||
		appleLoading;

	useEffect(() => {
		configureGoogle();
	}, []);

	useEffect(() => {
		let mounted = true;

		void (async () => {
			try {
				if (
					Platform.OS !==
					"ios"
				) {
					if (mounted) {
						setAppleAvailable(
							false
						);
					}

					return;
				}

				const available =
					await AppleAuthentication
						.isAvailableAsync();

				if (mounted) {
					setAppleAvailable(
						Boolean(
							available
						)
					);
				}
			} catch {
				if (mounted) {
					setAppleAvailable(
						false
					);
				}
			}
		})();

		return () => {
			mounted = false;
		};
	}, []);

	useEffect(() => {
		void (async () => {
			try {
				const saved =
					await SecureStore
						.getItemAsync(
							REMEMBER_KEY
						);

				if (saved) {
					setEmail(saved);
					setRemember(true);
				}
			} catch {
				// Não bloqueia o login.
			}
		})();
	}, []);

	async function persistRememberedEmail(
		cleanEmail
	) {
		if (
			remember &&
			cleanEmail
		) {
			await SecureStore
				.setItemAsync(
					REMEMBER_KEY,
					cleanEmail
				);

			return;
		}

		await SecureStore
			.deleteItemAsync(
				REMEMBER_KEY
			);
	}

	function finishAuthentication(
		user
	) {
		if (!user) {
			throw new Error(
				"Usuário autenticado não encontrado."
			);
		}

		dispatch(
			setUser(
				mapFirebaseUserToDTO(
					user
				)
			)
		);

		/*
		 * O bootstrap não é executado nesta tela.
		 *
		 * O onAuthStateChanged global do _layout.jsx
		 * inicia o refresh em background.
		 */
		router.replace("/");
	}

	async function handleLogin() {
		if (anyLoading) {
			return;
		}

		try {
			await Haptics
				.selectionAsync();

			setLoading(true);
			setError("");

			const cleanEmail =
				email.trim();

			if (
				!cleanEmail ||
				!password
			) {
				throw new Error(
					"Informe o e-mail e a senha."
				);
			}

			await persistRememberedEmail(
				cleanEmail
			);

			const {
				user,
			} =
				await signInWithEmailAndPassword(
					auth,
					cleanEmail,
					password
				);

			finishAuthentication(
				auth.currentUser ||
					user
			);
		} catch (currentError) {
			setError(
				normalizeFirebaseError(
					currentError,
					"Falha no login."
				)
			);
		} finally {
			setLoading(false);
		}
	}

	async function handleForgot() {
		try {
			await Haptics
				.selectionAsync();

			const target =
				email.trim();

			if (!target) {
				Alert.alert(
					"Recuperar senha",
					"Informe seu e-mail no campo acima para enviarmos o link."
				);

				return;
			}

			await sendPasswordResetEmail(
				auth,
				target
			);

			Alert.alert(
				"Pronto",
				"Enviamos um link de redefinição de senha para seu e-mail."
			);
		} catch (currentError) {
			Alert.alert(
				"Erro",
				normalizeFirebaseError(
					currentError,
					"Não foi possível enviar o e-mail de recuperação."
				)
			);
		}
	}

	function goToSignup() {
		router.push(
			"/(auth)/register"
		);
	}

	async function handleAppleLogin() {
		if (anyLoading) {
			return;
		}

		let appleEmail =
			null;

		try {
			await Haptics
				.selectionAsync();

			setError("");
			setAppleLoading(true);

			if (!appleAvailable) {
				Alert.alert(
					"Entrar com Apple",
					"Sign in with Apple não está disponível neste dispositivo."
				);

				return;
			}

			const rawNonce =
				randomNonce(32);

			const hashedNonce =
				await Crypto
					.digestStringAsync(
						Crypto
							.CryptoDigestAlgorithm
							.SHA256,
						rawNonce
					);

			const appleCredential =
				await AppleAuthentication
					.signInAsync({
						requestedScopes: [
							AppleAuthentication
								.AppleAuthenticationScope
								.FULL_NAME,

							AppleAuthentication
								.AppleAuthenticationScope
								.EMAIL,
						],

						nonce:
							hashedNonce,
					});

			if (
				!appleCredential
					?.identityToken
			) {
				throw new Error(
					"Não foi possível obter o token da Apple."
				);
			}

			appleEmail =
				appleCredential
					?.email ||
				null;

			const provider =
				new OAuthProvider(
					"apple.com"
				);

			const firebaseCredential =
				provider.credential({
					idToken:
						appleCredential
							.identityToken,

					rawNonce,
				});

			let firebaseUser;

			try {
				const result =
					await signInWithCredential(
						auth,
						firebaseCredential
					);

				firebaseUser =
					result.user;
			} catch (
				currentError
			) {
				if (
					currentError?.code ===
					"auth/account-exists-with-different-credential"
				) {
					const emailToCheck =
						currentError
							?.customData
							?.email ||
						currentError
							?.email ||
						appleEmail;

					if (
						!emailToCheck
					) {
						Alert.alert(
							"Conta já existente",
							"Esta conta já existe com outro método. Entre com o método usado no cadastro e depois vincule o login da Apple."
						);

						return;
					}

					const methods =
						await fetchSignInMethodsForEmail(
							auth,
							emailToCheck
						);

					if (
						methods?.includes(
							"password"
						) &&
						password
					) {
						const emailLogin =
							await signInWithEmailAndPassword(
								auth,
								emailToCheck,
								password
							);

						await linkWithCredential(
							emailLogin.user,
							firebaseCredential
						);

						firebaseUser =
							emailLogin.user;
					} else {
						Alert.alert(
							"Conta já existente",
							"Este e-mail já possui cadastro. Entre com e-mail e senha e depois toque novamente em “Entrar com Apple” para vincular."
						);

						return;
					}
				} else if (
					currentError?.code ===
					"auth/operation-not-allowed"
				) {
					throw new Error(
						"Login com Apple não está habilitado no Firebase."
					);
				} else {
					throw currentError;
				}
			}

			const finalUser =
				auth.currentUser ||
				firebaseUser;

			if (!finalUser) {
				throw new Error(
					"Não foi possível concluir o login com Apple."
				);
			}

			const computedName =
				getDisplayName({
					displayName:
						finalUser
							.displayName,

					fullName:
						appleCredential
							?.fullName,

					email:
						appleCredential
							?.email,

					fallback:
						"Usuário Apple",
				});

			if (
				!finalUser
					.displayName ||
				isBadAppleName(
					finalUser
						.displayName
				)
			) {
				try {
					await updateProfile(
						finalUser,
						{
							displayName:
								computedName,
						}
					);

					await reload(
						finalUser
					);
				} catch (
					profileError
				) {
					console.log(
						"[APPLE] Falha ao atualizar displayName:",
						profileError
							?.message
					);
				}
			}

			finishAuthentication(
				auth.currentUser ||
					finalUser
			);
		} catch (currentError) {
			if (
				currentError?.code ===
				"ERR_REQUEST_CANCELED"
			) {
				return;
			}

			console.log(
				"[APPLE] Erro:",
				currentError
			);

			setError(
				normalizeFirebaseError(
					currentError,
					"Falha no login com Apple."
				)
			);
		} finally {
			setAppleLoading(false);
		}
	}

	async function handleGoogleLogin() {
		if (anyLoading) {
			return;
		}

		let googleIdToken =
			null;

		let googlePhoto =
			null;

		try {
			await Haptics
				.selectionAsync();

			setError("");
			setGoogleLoading(true);

			try {
				const currentGoogleUser =
					await GoogleSignin
						.getCurrentUser();

				if (
					currentGoogleUser
				) {
					await GoogleSignin
						.revokeAccess()
						.catch(
							() => {}
						);
				}

				await GoogleSignin
					.signOut()
					.catch(
						() => {}
					);
			} catch (
				clearError
			) {
				console.log(
					"[GOOGLE] Falha ao limpar sessão anterior:",
					clearError
						?.message
				);
			}

			await GoogleSignin
				.hasPlayServices({
					showPlayServicesUpdateDialog:
						true,
				});

			const googleResponse =
				await GoogleSignin
					.signIn();

			googleIdToken =
				googleResponse
					?.idToken ||
				null;

			googlePhoto =
				googleResponse
					?.user
					?.photo ||
				null;

			if (
				!googleIdToken
			) {
				const tokens =
					await GoogleSignin
						.getTokens()
						.catch(
							() => null
						);

				googleIdToken =
					tokens
						?.idToken ||
					null;
			}

			if (
				!googleIdToken
			) {
				throw new Error(
					"Não foi possível obter o token do Google."
				);
			}

			const googleCredential =
				GoogleAuthProvider
					.credential(
						googleIdToken
					);

			let firebaseUser;

			try {
				const result =
					await signInWithCredential(
						auth,
						googleCredential
					);

				firebaseUser =
					result.user;
			} catch (
				currentError
			) {
				if (
					currentError?.code ===
					"auth/account-exists-with-different-credential"
				) {
					const firebaseEmail =
						currentError
							?.customData
							?.email ||
						currentError
							?.email;

					if (
						!firebaseEmail
					) {
						Alert.alert(
							"Conta já existente",
							"Esta conta já existe com outro método. Entre com o método usado no cadastro e depois vincule o login do Google."
						);

						return;
					}

					const methods =
						await fetchSignInMethodsForEmail(
							auth,
							firebaseEmail
						);

					if (
						methods?.includes(
							"password"
						) &&
						password
					) {
						const emailLogin =
							await signInWithEmailAndPassword(
								auth,
								firebaseEmail,
								password
							);

						await linkWithCredential(
							emailLogin.user,
							googleCredential
						);

						firebaseUser =
							emailLogin.user;
					} else {
						Alert.alert(
							"Conta já existente",
							"Este e-mail já possui cadastro. Entre com e-mail e senha e depois toque novamente em “Entrar com Google” para vincular."
						);

						return;
					}
				} else {
					throw currentError;
				}
			}

			if (
				firebaseUser &&
				!firebaseUser
					.photoURL &&
				googlePhoto
			) {
				try {
					await updateProfile(
						firebaseUser,
						{
							photoURL:
								googlePhoto,
						}
					);

					await reload(
						firebaseUser
					);
				} catch (
					profileError
				) {
					console.log(
						"[GOOGLE] Falha ao atualizar foto:",
						profileError
							?.message
					);
				}
			}

			finishAuthentication(
				auth.currentUser ||
					firebaseUser
			);
		} catch (currentError) {
			if (
				currentError?.code ===
					statusCodes
						?.SIGN_IN_CANCELLED ||
				currentError?.code ===
					"12501"
			) {
				return;
			}

			if (
				currentError?.code ===
				statusCodes
					?.PLAY_SERVICES_NOT_AVAILABLE
			) {
				setError(
					"Google Play Services indisponível. Atualize para continuar."
				);

				return;
			}

			console.log(
				"[GOOGLE] Erro:",
				currentError
			);

			setError(
				normalizeFirebaseError(
					currentError,
					"Falha no login com Google."
				)
			);
		} finally {
			setGoogleLoading(false);
		}
	}

	return (
		<KeyboardAvoidingView
			behavior={
				Platform.OS ===
				"ios"
					? "padding"
					: undefined
			}
			style={{
				flex: 1,
			}}
		>
			<ResponsiveHero
				source={require(
					"@/assets/images/fisiovet-hero.png"
				)}
				fullScreen
				overlay
			>
				<ScrollView
					contentContainerStyle={{
						flexGrow: 1,
						justifyContent:
							"center",
						padding: 2,
					}}
					keyboardShouldPersistTaps="handled"
				>
					<View
						style={
							styles.card
						}
					>
						<View
							style={
								styles.brandRow
							}
						>
							<Image
								source={require(
									"@/assets/images/splash-fisiovet.png"
								)}
								style={
									styles.brandLogo
								}
								contentFit="contain"
								transition={0}
							/>
						</View>

						<Text
							style={
								styles.subtitle
							}
						>
							Acesse sua conta
						</Text>

						<View
							style={
								styles.inputOuter
							}
						>
							<View
								style={
									styles.inputRow
								}
							>
								<TextInput
									value={email}
									onChangeText={
										setEmail
									}
									placeholder="seu@email.com"
									placeholderTextColor="#9CA3AF"
									autoCapitalize="none"
									autoCorrect={
										false
									}
									keyboardType="email-address"
									returnKeyType="next"
									style={
										styles.input
									}
								/>

								<Ionicons
									name="mail-outline"
									size={18}
									color="#9CA3AF"
								/>
							</View>
						</View>

						<View
							style={[
								styles.inputOuter,
								{
									marginTop:
										10,
								},
							]}
						>
							<View
								style={
									styles.inputRow
								}
							>
								<TextInput
									value={
										password
									}
									onChangeText={
										setPassword
									}
									placeholder="Senha"
									placeholderTextColor="#9CA3AF"
									secureTextEntry={
										secure
									}
									returnKeyType="go"
									onSubmitEditing={
										handleLogin
									}
									style={
										styles.input
									}
								/>

								<Pressable
									onPress={() =>
										setSecure(
											(
												current
											) =>
												!current
										)
									}
									hitSlop={10}
								>
									<Ionicons
										name={
											secure
												? "eye-outline"
												: "eye-off-outline"
										}
										size={20}
										color="#9CA3AF"
									/>
								</Pressable>
							</View>
						</View>

						<View
							style={
								styles.rowBetween
							}
						>
							<Pressable
								onPress={() =>
									setRemember(
										(
											current
										) =>
											!current
									)
								}
								style={
									styles.rememberRow
								}
								hitSlop={10}
							>
								<View
									style={[
										styles.checkbox,
										remember &&
											styles.checkboxActive,
									]}
								>
									{remember ? (
										<Ionicons
											name="checkmark"
											size={
												14
											}
											color={
												colors.teal
											}
										/>
									) : null}
								</View>

								<Text
									style={
										styles.rememberText
									}
								>
									Lembrar-me
								</Text>
							</Pressable>

							<Pressable
								onPress={
									handleForgot
								}
								hitSlop={10}
							>
								<Text
									style={
										styles.link
									}
								>
									Esqueceu de senha?
								</Text>
							</Pressable>
						</View>

						<Pressable
							onPress={
								handleLogin
							}
							disabled={
								anyLoading
							}
							style={({
								pressed,
							}) => [
								styles.button,
								{
									opacity:
										anyLoading ||
										pressed
											? 0.8
											: 1,
								},
							]}
						>
							{loading ? (
								<ActivityIndicator
									color="#FFF"
								/>
							) : (
								<Text
									style={
										styles.buttonText
									}
								>
									Entrar
								</Text>
							)}
						</Pressable>

						<View
							style={
								styles.hr
							}
						/>

						<View
							style={[
								styles.rowCenter,
								{
									marginBottom:
										12,
								},
							]}
						>
							<Text
								style={{
									color:
										colors.sub,
								}}
							>
								Não tem conta?{" "}
							</Text>

							<Pressable
								onPress={
									goToSignup
								}
								hitSlop={10}
							>
								<Text
									style={[
										styles.link,
										{
											fontWeight:
												"700",
										},
									]}
								>
									Cadastre-se
								</Text>
							</Pressable>

							<Text
								style={{
									color:
										colors.sub,
								}}
							>
								{" "}ou
							</Text>
						</View>

						<Pressable
							onPress={
								handleGoogleLogin
							}
							disabled={
								anyLoading
							}
							style={({
								pressed,
							}) => [
								styles.googleBtn,
								{
									opacity:
										anyLoading ||
										pressed
											? 0.8
											: 1,
								},
							]}
						>
							{googleLoading ? (
								<ActivityIndicator
									color="#000"
								/>
							) : (
								<View
									style={
										styles.googleContent
									}
								>
									<Image
										source={require(
											"@/assets/images/google-icon.png"
										)}
										style={
											styles.googleIcon
										}
									/>

									<Text
										style={
											styles.googleText
										}
									>
										Entrar com Google
									</Text>
								</View>
							)}
						</Pressable>

						{Platform.OS ===
							"ios" &&
						appleAvailable ? (
							<Pressable
								onPress={
									handleAppleLogin
								}
								disabled={
									anyLoading
								}
								style={({
									pressed,
								}) => [
									styles.appleBtn,
									{
										opacity:
											anyLoading ||
											pressed
												? 0.8
												: 1,
									},
								]}
							>
								{appleLoading ? (
									<ActivityIndicator
										color="#FFF"
									/>
								) : (
									<View
										style={
											styles.appleContent
										}
									>
										<Ionicons
											name="logo-apple"
											size={
												20
											}
											color="#FFF"
										/>

										<Text
											style={
												styles.appleText
											}
										>
											Entrar com Apple
										</Text>
									</View>
								)}
							</Pressable>
						) : null}

						<Text
							style={
								styles.footer
							}
						>
							FisioVet •{" "}
							{currentYear}
						</Text>

						{error ? (
							<View
								style={
									styles.errBox
								}
							>
								<Text
									style={
										styles.errText
									}
								>
									{error}
								</Text>
							</View>
						) : null}
					</View>
				</ScrollView>
			</ResponsiveHero>
		</KeyboardAvoidingView>
	);
}

const styles =
	StyleSheet.create({
		card: {
			marginTop: -34,
			marginHorizontal:
				16,
			backgroundColor:
				colors.card,
			borderRadius: 18,
			padding: 18,
			shadowColor:
				colors.shadow,
			shadowOpacity: 1,
			shadowRadius: 24,
			shadowOffset: {
				width: 0,
				height: 8,
			},
			elevation: 4,
		},

		brandRow: {
			alignItems:
				"center",
			justifyContent:
				"center",
			marginBottom: 8,
		},

		brandLogo: {
			width: 180,
			height: 88,
		},

		subtitle: {
			textAlign: 'center',
			color:
				colors.text,
			opacity: 0.8,
			fontSize: 18,
			marginTop: 4,
			marginBottom: 16,
			fontWeight:
				"600",
		},

		inputOuter: {
			borderWidth: 1,
			borderColor:
				colors.line,
			borderRadius: 12,
			backgroundColor:
				"#FFF",
		},

		inputRow: {
			flexDirection:
				"row",
			alignItems:
				"center",
			paddingHorizontal:
				12,
			height: 48,
			gap: 8,
		},

		input: {
			flex: 1,
			color:
				colors.text,
			fontSize: 16,
			paddingVertical: 0,
		},

		rowBetween: {
			flexDirection:
				"row",
			alignItems:
				"center",
			justifyContent:
				"space-between",
			marginTop: 12,
		},

		rememberRow: {
			flexDirection:
				"row",
			alignItems:
				"center",
			gap: 8,
		},

		checkbox: {
			width: 18,
			height: 18,
			borderRadius: 4,
			borderWidth: 1.5,
			borderColor:
				colors.line,
			alignItems:
				"center",
			justifyContent:
				"center",
			backgroundColor:
				"#FFF",
		},

		checkboxActive: {
			borderColor:
				colors.teal,
			backgroundColor:
				"#E6FFFA",
		},

		rememberText: {
			color:
				colors.sub,
			fontSize: 14,
		},

		link: {
			color:
				colors.teal,
			fontSize: 14,
		},

		button: {
			marginTop: 14,
			backgroundColor:
				colors.teal,
			paddingVertical:
				14,
			borderRadius: 10,
			alignItems:
				"center",
		},

		buttonText: {
			color: "#FFF",
			fontSize: 16,
			fontWeight:
				"700",
		},

		hr: {
			height: 1,
			backgroundColor:
				colors.line,
			marginVertical:
				14,
		},

		rowCenter: {
			flexDirection:
				"row",
			alignItems:
				"center",
			justifyContent:
				"center",
		},

		footer: {
			textAlign:
				"center",
			color:
				colors.teal,
			marginTop: 10,
			fontWeight:
				"bold",
		},

		errBox: {
			marginTop: 12,
			padding: 10,
			borderRadius: 8,
			backgroundColor:
				"#FEF2F2",
			borderWidth: 1,
			borderColor:
				"#FCA5A5",
		},

		errText: {
			color:
				"#B91C1C",
			textAlign:
				"center",
		},

		googleBtn: {
			backgroundColor:
				"#FFF",
			borderColor:
				"#E5E7EB",
			borderWidth: 1,
			paddingVertical:
				12,
			borderRadius: 10,
			alignItems:
				"center",
			justifyContent:
				"center",
			shadowColor:
				"rgba(0,0,0,0.08)",
			shadowOffset: {
				width: 0,
				height: 2,
			},
			shadowOpacity: 1,
			shadowRadius: 3,
			elevation: 2,
		},

		googleContent: {
			flexDirection:
				"row",
			alignItems:
				"center",
			justifyContent:
				"center",
			gap: 8,
		},

		googleIcon: {
			width: 30,
			height: 30,
		},

		googleText: {
			color:
				"#3C4043",
			fontSize: 16,
			fontWeight:
				"600",
		},

		appleBtn: {
			backgroundColor:
				"#000",
			borderRadius: 10,
			paddingVertical:
				12,
			alignItems:
				"center",
			justifyContent:
				"center",
			marginTop: 10,
		},

		appleContent: {
			flexDirection:
				"row",
			alignItems:
				"center",
			justifyContent:
				"center",
			gap: 8,
		},

		appleText: {
			color: "#FFF",
			fontSize: 16,
			fontWeight:
				"700",
		},
	});
