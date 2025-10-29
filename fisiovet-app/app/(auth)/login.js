// app/(auth)/login.jsx
// @ts-nocheck
import React, { useEffect, useState } from 'react';
import {
	View, Text, TextInput, Pressable, StyleSheet,
	KeyboardAvoidingView, Platform, ScrollView, ImageBackground, Alert, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as SecureStore from 'expo-secure-store';
import auth from '@react-native-firebase/auth';
import { useDispatch, useSelector } from 'react-redux';
import { setUser } from '@/src/store/slices/userSlice';
import { mapFirebaseUserToDTO } from '@/firebase/authUserDTO';
import { router } from 'expo-router';
import ResponsiveHero from './_resposiveHero';
import { Image } from 'expo-image';

const colors = {
	teal: '#159E9C',
	tealDark: '#0F7E7C',
	card: 'rgba(255,255,255,0.6)',
	text: '#111827',
	sub: '#6B7280',
	line: '#E5E7EB',
	shadow: 'rgba(16, 24, 40, 0.08)',
};

const REMEMBER_KEY = 'fv_login_email';

import { configureGoogle } from '@/firebase/google_login';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { postLoginBootstrap, selectBootstrapLoading } from '@/src/store/bootstrapSlice';





export default function Login() {
	const dispatch = useDispatch();
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [secure, setSecure] = useState(true);
	const [remember, setRemember] = useState(false);
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(false);

	const [googleLoading, setGoogleLoading] = useState(false);
	const booting = useSelector(selectBootstrapLoading);




	const currentYear = new Date().getFullYear();

	useEffect(() => { configureGoogle(); }, []);

	// restaura e-mail lembrado
	useEffect(() => {
		(async () => {
			try {
				const saved = await SecureStore.getItemAsync(REMEMBER_KEY);
				if (saved) {
					setEmail(saved);
					setRemember(true);
				}
			} catch { }
		})();
	}, []);

	async function handleLogin() {
		try {
			await Haptics.selectionAsync();
			setLoading(true);
			setError('');

			// lembra/deslembra antes do login
			if (remember && email.trim()) {
				await SecureStore.setItemAsync(REMEMBER_KEY, email.trim());
			} else {
				await SecureStore.deleteItemAsync(REMEMBER_KEY);
			}

			const { user } = await auth().signInWithEmailAndPassword(email.trim(), password);
			dispatch(setUser(mapFirebaseUserToDTO(user)));
			// redirecione como preferir (home):
			try {
				// Passe o que precisar para filtrar os dados do usuário
				await dispatch(postLoginBootstrap({ uid: finalUser.uid, clinicId: finalUser.clinicId })).unwrap();
			} catch (e) {
				// não bloqueie a navegação por erro de uma das listas; só sinalize
				console.warn('Bootstrap pós-login falhou:', e);
			} finally {
			}
			router.replace('/');
		} catch (err) {
			setError(err?.message?.replace('Firebase:', '').trim() || 'Falha no login.');
		} finally {
			setLoading(false);
		}
	}

	async function handleForgot() {
		try {
			await Haptics.selectionAsync();
			const target = email.trim();
			if (!target) {
				Alert.alert('Recuperar senha', 'Informe seu e-mail no campo acima para enviarmos o link.');
				return;
			}
			await auth().sendPasswordResetEmail(target);
			Alert.alert('Pronto', 'Enviamos um link de redefinição de senha para seu e-mail.');
		} catch (e) {
			Alert.alert('Erro', e?.message || 'Não foi possível enviar o e-mail de recuperação.');
		}
	}

	function goToSignup() {
		// troque pela sua rota real de cadastro
		router.push('/(auth)/register');
	}

	console.log('error:: ', error)

	async function handleGoogleLogin() {
		let googleIdToken = null;
		let googlePhoto = null;

		try {
			await Haptics.selectionAsync();
			setError('');
			setGoogleLoading(true);

			console.log('[GOOGLE] Início do login');

			// Evita sessão presa
			try {
				const cur = await GoogleSignin.getCurrentUser(); // pode vir null
				if (cur) {
					await GoogleSignin.revokeAccess().catch(() => { });
					await GoogleSignin.signOut().catch(() => { });
					console.log('[GOOGLE] Sessão anterior revogada');
				} else {
					// mesmo sem usuário, chamamos signOut por via das dúvidas
					await GoogleSignin.signOut().catch(() => { });
				}
			} catch (e) {
				console.log('[GOOGLE] Ignorando erro ao limpar sessão:', e?.message);
			}

			// Play Services (Android)
			await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
			console.log('[GOOGLE] Play Services OK');

			// Abre conta
			const googleResponse = await GoogleSignin.signIn();
			console.log('[GOOGLE] signIn retornou:', {
				hasUser: !!googleResponse?.user,
				hasIdToken: !!googleResponse?.idToken,
			});

			googleIdToken = googleResponse?.idToken || null;
			googlePhoto = googleResponse?.user?.photo || null;

			// Fallback: alguns iOS retornam tokens somente via getTokens()
			if (!googleIdToken) {
				try {
					const tokens = await GoogleSignin.getTokens();
					console.log('[GOOGLE] getTokens() retornou:', { hasIdToken: !!tokens?.idToken });
					if (tokens?.idToken) googleIdToken = tokens.idToken;
				} catch (e) {
					console.log('[GOOGLE] getTokens() falhou:', e);
				}
			}

			if (!googleIdToken) {
				console.log('[GOOGLE] idToken segue nulo → configuração incorreta');
				Alert.alert(
					'Login Google',
					'Não foi possível obter o token do Google.\n\nVerifique:\n• EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID (tipo Web) do MESMO projeto\n• iOS: URL scheme (REVERSED_CLIENT_ID) no Info.plist\n• Android: SHA-1/SHA-256 cadastrados no Firebase'
				);
				return; // sai sem erro visual além do alerta
			}

			console.log('[GOOGLE] idToken OK, autenticando no Firebase...');
			const googleCredential = auth.GoogleAuthProvider.credential(googleIdToken);
			let fbUser;

			try {
				const res = await auth().signInWithCredential(googleCredential);
				fbUser = res.user;
				console.log('[GOOGLE] Firebase signInWithCredential OK, uid:', fbUser?.uid);
			} catch (err) {
				console.log('[GOOGLE] Erro signInWithCredential:', err?.code, err?.message);

				if (err?.code === 'auth/account-exists-with-different-credential' && err?.email) {
					const emailInFirebase = err.email;
					const methods = await auth().fetchSignInMethodsForEmail(emailInFirebase);
					console.log('[GOOGLE] Métodos existentes para o e-mail:', methods);

					if (methods?.includes('password') && password) {
						const emailLogin = await auth().signInWithEmailAndPassword(emailInFirebase, password);
						await emailLogin.user.linkWithCredential(googleCredential);
						fbUser = emailLogin.user;
						console.log('[GOOGLE] Conta linkada com Google, uid:', fbUser?.uid);
					} else {
						Alert.alert(
							'Conta já existente',
							'Este e-mail já possui cadastro. Entre com e-mail e senha e depois toque novamente em "Entrar com Google" para vincular.'
						);
						return;
					}
				}
				else if (err?.code === statusCodes?.SIGN_IN_CANCELLED || err?.code === '12501') {
					console.log('[GOOGLE] Usuário cancelou o fluxo Google');
					return;
				} else {
					throw err;
				}
			}

			// Atualiza foto se não houver
			if (fbUser && !fbUser.photoURL && googlePhoto) {
				try {
					await fbUser.updateProfile({ photoURL: googlePhoto });
					await fbUser.reload();
					console.log('[GOOGLE] Foto atualizada a partir do Google');
				} catch (e) {
					console.log('[GOOGLE] Falha ao atualizar foto (ignorado):', e?.message);
				}
			}

			const finalUser = auth().currentUser || fbUser;
			if (finalUser) {
				dispatch(setUser(mapFirebaseUserToDTO(finalUser)));
				console.log('[GOOGLE] Redux atualizado, navegando...');
				try {
					// Passe o que precisar para filtrar os dados do usuário
					await dispatch(postLoginBootstrap({ uid: finalUser.uid, clinicId: finalUser.clinicId })).unwrap();
				} catch (e) {
					// não bloqueie a navegação por erro de uma das listas; só sinalize
					console.warn('Bootstrap pós-login falhou:', e);
				} finally {
				}
				router.replace('/');
			} else {
				console.log('[GOOGLE] finalUser ausente inesperadamente');
				setError('Não foi possível concluir o login.');
			}
		} catch (e) {
			console.log('[GOOGLE] Catch geral:', e?.code, e?.message);
			if (e?.code === statusCodes?.SIGN_IN_CANCELLED || e?.code === '12501') {
				// cancelou → não mostra erro
			} else if (e?.code === statusCodes?.PLAY_SERVICES_NOT_AVAILABLE) {
				setError('Google Play Services indisponível/atualize para continuar.');
			} else {
				const msg = e?.message || 'Falha no login com Google.';
				setError(msg.replace('Firebase:', '').trim());
			}
		} finally {
			setGoogleLoading(false);
			console.log('[GOOGLE] Fim do login (loading=false)');
		}
	}

	return (
		<KeyboardAvoidingView
			behavior={Platform.OS === 'ios' ? 'padding' : undefined}
			style={{ flex: 1 }}
		>
			<ResponsiveHero
				source={require('@/assets/images/fisiovet-hero.png')}
				fullScreen
				overlay // melhora contraste atrás do card
			>
				<ScrollView
					contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 2 }}
					keyboardShouldPersistTaps="handled"
				>
					{/* Cartão */}
					<View style={styles.card}>
						{/* Logo + título */}
						<View style={styles.brandRow}>
							<View style={styles.brandIcon}>
								{/* <Ionicons name="shield" size={22} color={colors.tier} style={{ position: 'absolute' }} /> */}
								<Ionicons name="paw" size={18} color={'whitesmoke'} />
							</View>
							<Text style={styles.brandText}>
								<Text style={{ fontWeight: '800' }}>FisioVet</Text>
							</Text>
						</View>

						<Text style={styles.subtitle}>Acesse sua conta</Text>

						{/* E-mail */}
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

						{/* Senha */}
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
								<Pressable onPress={() => setSecure(s => !s)} hitSlop={10}>
									<Ionicons name={secure ? 'eye-outline' : 'eye-off-outline'} size={20} color="#9CA3AF" />
								</Pressable>
							</View>
						</View>

						{/* Lembrar-me + Esqueci */}
						<View style={styles.rowBetween}>
							<Pressable
								onPress={() => setRemember(v => !v)}
								style={styles.rememberRow}
								hitSlop={10}
							>
								<View style={[styles.checkbox, remember && { borderColor: colors.teal, backgroundColor: '#E6FFFA' }]}>
									{remember ? <Ionicons name="checkmark" size={14} color={colors.teal} /> : null}
								</View>
								<Text style={styles.rememberText}>Lembrar-me</Text>
							</Pressable>

							<Pressable onPress={handleForgot} hitSlop={10}>
								<Text style={styles.link}>Esqueceu de senha?</Text>
							</Pressable>
						</View>

						{/* Entrar */}
						<Pressable
							onPress={handleLogin}
							disabled={loading}
							style={({ pressed }) => [
								styles.button,
								{ opacity: loading || pressed ? 0.9 : 1 },
							]}
						>
							<Text style={styles.buttonText}>{loading ? 'Entrando…' : 'Entrar'}</Text>
						</Pressable>

						{/* Divisor */}
						<View style={styles.hr} />

						{/* Cadastro */}
						<View style={[styles.rowCenter, { marginBottom: 12 }]}>
							<Text style={{ color: colors.sub }}>Não tem conta? </Text>
							<Pressable onPress={goToSignup} hitSlop={10}>
								<Text style={[styles.link, { fontWeight: '700' }]}>Cadastre-se</Text>
							</Pressable>
							<Text style={{ color: colors.sub }}> ou </Text>
						</View>
						{/* Divisor já existente */}

						{/* Botão Google */}
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
									<Image source={require('@/assets/images/google-icon.png')} style={styles.googleIcon} />
									<Text style={styles.googleText}>Entrar com Google</Text>
								</View>
							)}
						</Pressable>

						{/* Rodapé */}
						<Text style={styles.footer}>FisioVet • {currentYear}</Text>

						{/* Erro */}
						{!!error && (
							<View style={styles.errBox}>
								<Text style={styles.errText}>{error}</Text>
							</View>
						)}
						{booting && (
							<View style={{
								position: 'absolute', left: 0, right: 0, top: 0, bottom: 0,
								backgroundColor: 'rgba(255,255,255,0.7)', alignItems: 'center', justifyContent: 'center',
								borderRadius: 16
							}}>
								<ActivityIndicator size="large" color={colors.teal}/>
								<Text style={{ marginTop: 8, color: '#111', fontWeight: 'bold' }}>Carregando seus dados…</Text>
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
		overflow: 'hidden',
		justifyContent: 'flex-start',
	},
	badge: {
		marginTop: 18,
		marginLeft: 18,
		width: 56,
		height: 56,
		borderRadius: 28,
		backgroundColor: 'rgba(255,255,255,0.22)',
		alignItems: 'center',
		justifyContent: 'center',
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

	brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
	brandIcon: {
		width: 42, height: 42, borderRadius: 21,
		backgroundColor: '#0EA5A4',
		alignItems: 'center', justifyContent: 'center',
	},
	brandText: { fontSize: 28, color: colors.text },
	subtitle: {
		color: colors.text, opacity: 0.8,
		fontSize: 18, marginTop: 4, marginBottom: 16, fontWeight: '600'
	},

	inputOuter: {
		borderWidth: 1,
		borderColor: colors.line,
		borderRadius: 12,
		backgroundColor: '#FFF',
	},
	inputRow: {
		flexDirection: 'row', alignItems: 'center',
		paddingHorizontal: 12, height: 48, gap: 8,
	},
	input: {
		flex: 1, color: colors.text, fontSize: 16, paddingVertical: 0,
	},

	rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
	rememberRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
	checkbox: {
		width: 18, height: 18, borderRadius: 4, borderWidth: 1.5, borderColor: colors.line,
		alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF'
	},
	rememberText: { color: colors.sub, fontSize: 14 },
	link: { color: colors.teal, fontSize: 14 },

	button: {
		marginTop: 14, backgroundColor: colors.teal,
		paddingVertical: 14, borderRadius: 10, alignItems: 'center'
	},
	buttonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },

	hr: { height: 1, backgroundColor: colors.line, marginVertical: 14 },

	rowCenter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
	footer: { textAlign: 'center', color: colors.teal, marginTop: 10, fontWeight: 'bold' },

	errBox: {
		marginTop: 12, padding: 10, borderRadius: 8,
		backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FCA5A5'
	},
	errText: { color: '#B91C1C', textAlign: 'center' },
	googleBtn: {
		backgroundColor: '#fff',
		borderColor: '#E5E7EB',
		borderWidth: 1,
		paddingVertical: 12,
		borderRadius: 10,
		alignItems: 'center',
		justifyContent: 'center',
		// marginTop: 8,
		shadowColor: 'rgba(0, 0, 0, 0.08)',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 1,
		shadowRadius: 3,
		elevation: 2,
		// width: 300
	},

	googleContent: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 8,
	},

	googleIcon: {
		width: 30,
		height: 30,
	},

	googleText: {
		color: '#3C4043',
		fontSize: 16,
		fontWeight: '600',
	},
});