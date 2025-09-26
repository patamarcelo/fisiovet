// app/(auth)/login.jsx
// @ts-nocheck
import React, { useEffect, useState } from 'react';
import {
	View, Text, TextInput, Pressable, StyleSheet,
	KeyboardAvoidingView, Platform, ScrollView, ImageBackground, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as SecureStore from 'expo-secure-store';
import auth from '@react-native-firebase/auth';
import { useDispatch } from 'react-redux';
import { setUser } from '@/src/store/slices/userSlice';
import { mapFirebaseUserToDTO } from '@/firebase/authUserDTO';
import { router } from 'expo-router';
import ResponsiveHero from './_resposiveHero';

const colors = {
	teal: '#159E9C',
	tealDark: '#0F7E7C',
	card: '#FFFFFF',
	text: '#111827',
	sub: '#6B7280',
	line: '#E5E7EB',
	shadow: 'rgba(16, 24, 40, 0.08)',
};

const REMEMBER_KEY = 'fv_login_email';

export default function Login() {
	const dispatch = useDispatch();
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [secure, setSecure] = useState(true);
	const [remember, setRemember] = useState(false);
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(false);

	const currentYear = new Date().getFullYear();


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
		router.push('/signup');
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
					contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding:2 }}
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
						<View style={[styles.rowCenter, { marginTop: 6 }]}>
							<Text style={{ color: colors.sub }}>Não tem conta? </Text>
							<Pressable onPress={goToSignup} hitSlop={10}>
								<Text style={[styles.link, { fontWeight: '700' }]}>Cadastre-se</Text>
							</Pressable>
						</View>

						{/* Rodapé */}
						<Text style={styles.footer}>FisioVet • {currentYear}</Text>

						{/* Erro */}
						{!!error && (
							<View style={styles.errBox}>
								<Text style={styles.errText}>{error}</Text>
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
	footer: { textAlign: 'center', color: '#9AA0A6', marginTop: 10 },

	errBox: {
		marginTop: 12, padding: 10, borderRadius: 8,
		backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FCA5A5'
	},
	errText: { color: '#B91C1C', textAlign: 'center' },
});