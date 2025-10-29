// app/(auth)/signup.jsx
// @ts-nocheck
import React, { useMemo, useState } from 'react';
import {
	View, Text, TextInput, Pressable, StyleSheet,
	KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import auth from '@react-native-firebase/auth';
import { useDispatch } from 'react-redux';
import { setUser } from '@/src/store/slices/userSlice';
import { mapFirebaseUserToDTO } from '@/firebase/authUserDTO';
import { router } from 'expo-router';
import ResponsiveHero from './_resposiveHero';

import { postLoginBootstrap } from '@/src/store/bootstrapSlice';

const colors = {
	teal: '#159E9C',
	tealDark: '#0F7E7C',
	card: 'rgba(255,255,255,0.6)',
	text: '#111827',
	sub: '#6B7280',
	line: '#E5E7EB',
	shadow: 'rgba(16, 24, 40, 0.08)',
};

export default function SignUp() {
	const dispatch = useDispatch();

	const [name, setName] = useState('');
	const [email, setEmail] = useState('');
	const [secure, setSecure] = useState(true);
	const [password, setPassword] = useState('');
	const [confirm, setConfirm] = useState('');
	const [accept, setAccept] = useState(false);

	const [error, setError] = useState('');
	const [submitting, setSubmitting] = useState(false);
	const [booting, setBooting] = useState(false);

	const currentYear = new Date().getFullYear();

	// validações simples
	const emailOk = useMemo(() => /\S+@\S+\.\S+/.test(email.trim()), [email]);
	const passScore = useMemo(() => {
		// força: tamanho + diversidade básica
		let s = 0;
		if (password.length >= 8) s++;
		if (/[A-Z]/.test(password)) s++;
		if (/[a-z]/.test(password)) s++;
		if (/\d/.test(password)) s++;
		if (/[^A-Za-z0-9]/.test(password)) s++;
		return s; // 0..5
	}, [password]);
	const passOk = password.length >= 8 && passScore >= 3;
	const confirmOk = confirm === password && confirm.length > 0;

	const disabled =
		submitting ||
		!name.trim() ||
		!emailOk ||
		!passOk ||
		!confirmOk ||
		!accept;

	function normalizeFirebaseError(code, message) {
		switch (code) {
			case 'auth/email-already-in-use':
				return 'Este e-mail já está em uso.';
			case 'auth/invalid-email':
				return 'E-mail inválido.';
			case 'auth/weak-password':
				return 'A senha é muito fraca (mínimo 8 caracteres, use letras e números).';
			case 'auth/network-request-failed':
				return 'Sem conexão. Verifique sua internet.';
			default:
				return (message || 'Não foi possível criar a conta.').replace('Firebase:', '').trim();
		}
	}

	async function handleRegister() {
		try {
			await Haptics.selectionAsync();
			setError('');
			setSubmitting(true);

			// cria usuário
			const cred = await auth().createUserWithEmailAndPassword(email.trim(), password);
			// define displayName
			if (name.trim()) {
				await cred.user.updateProfile({ displayName: name.trim() });
				await cred.user.reload();
			}

			// despacha usuário no Redux
			const finalUser = auth().currentUser || cred.user;
			dispatch(setUser(mapFirebaseUserToDTO(finalUser)));

			// bootstrap de dados iniciais (tutores, pets, agenda)
			try {
				setBooting(true);
				await dispatch(
					postLoginBootstrap({ uid: finalUser.uid, clinicId: finalUser.clinicId })
				).unwrap();
			} catch (e) {
				console.warn('Bootstrap pós-cadastro falhou:', e);
			} finally {
				setBooting(false);
			}

			// navega para o app
			router.replace('/');
		} catch (e) {
			const msg = normalizeFirebaseError(e?.code, e?.message);
			setError(msg);
			Alert.alert('Cadastro', msg);
		} finally {
			setSubmitting(false);
		}
	}

	function goToLogin() {
		router.replace('/(auth)/login');
	}

	return (
		<KeyboardAvoidingView
			behavior={Platform.OS === 'ios' ? 'padding' : undefined}
			style={{ flex: 1 }}
		>
			<ResponsiveHero
				source={require('@/assets/images/fisiovet-hero.png')}
				fullScreen
				overlay
			>
				<ScrollView
					contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 2 }}
					keyboardShouldPersistTaps="handled"
				>
					<View style={styles.card}>
						{/* Cabeçalho */}
						<View style={styles.brandRow}>
							<View style={styles.brandIcon}>
								<Ionicons name="paw" size={18} color={'whitesmoke'} />
							</View>
							<Text style={styles.brandText}>
								<Text style={{ fontWeight: '800' }}>FisioVet</Text>
							</Text>
						</View>

						<Text style={styles.subtitle}>Criar sua conta</Text>

						{/* Nome */}
						<View style={styles.inputOuter}>
							<View style={styles.inputRow}>
								<TextInput
									value={name}
									onChangeText={setName}
									placeholder="Seu nome"
									placeholderTextColor="#9CA3AF"
									autoCapitalize="words"
									returnKeyType="next"
									style={styles.input}
								/>
								<Ionicons name="person-outline" size={18} color="#9CA3AF" />
							</View>
						</View>

						{/* E-mail */}
						<View style={[styles.inputOuter, { marginTop: 10, borderColor: email.length && !emailOk ? '#FCA5A5' : colors.line }]}>
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
						{email.length > 0 && !emailOk && (
							<Text style={styles.hintError}>Informe um e-mail válido.</Text>
						)}

						{/* Senha */}
						<View style={[styles.inputOuter, { marginTop: 10, borderColor: password.length && !passOk ? '#FCA5A5' : colors.line }]}>
							<View style={styles.inputRow}>
								<TextInput
									value={password}
									onChangeText={setPassword}
									placeholder="Senha (mín. 8 caracteres)"
									placeholderTextColor="#9CA3AF"
									secureTextEntry={secure}
									returnKeyType="next"
									style={styles.input}
								/>
								<Pressable onPress={() => setSecure(s => !s)} hitSlop={10}>
									<Ionicons name={secure ? 'eye-outline' : 'eye-off-outline'} size={20} color="#9CA3AF" />
								</Pressable>
							</View>
						</View>

						{/* medidor simples */}
						{password.length > 0 && (
							<View style={styles.meterWrap}>
								<View style={[styles.meterBar, passScore >= 1 && styles.mOk]} />
								<View style={[styles.meterBar, passScore >= 2 && styles.mOk]} />
								<View style={[styles.meterBar, passScore >= 3 && styles.mOk]} />
								<View style={[styles.meterBar, passScore >= 4 && styles.mOk]} />
								<View style={[styles.meterBar, passScore >= 5 && styles.mOk]} />
							</View>
						)}
						{!passOk && password.length > 0 && (
							<Text style={styles.hintError}>Use pelo menos 8 caracteres combinando letras e números/símbolos.</Text>
						)}

						{/* Confirmar senha */}
						<View style={[styles.inputOuter, { marginTop: 10, borderColor: confirm.length && !confirmOk ? '#FCA5A5' : colors.line }]}>
							<View style={styles.inputRow}>
								<TextInput
									value={confirm}
									onChangeText={setConfirm}
									placeholder="Confirmar senha"
									placeholderTextColor="#9CA3AF"
									secureTextEntry
									returnKeyType="go"
									onSubmitEditing={handleRegister}
									style={styles.input}
								/>
								<Ionicons name="lock-closed-outline" size={18} color="#9CA3AF" />
							</View>
						</View>
						{confirm.length > 0 && !confirmOk && (
							<Text style={styles.hintError}>As senhas não conferem.</Text>
						)}

						{/* Termos */}
						<Pressable
							onPress={() => setAccept(v => !v)}
							style={styles.termsRow}
							hitSlop={10}
						>
							<View style={[styles.checkbox, accept && { borderColor: colors.teal, backgroundColor: '#E6FFFA' }]}>
								{accept ? <Ionicons name="checkmark" size={14} color={colors.teal} /> : null}
							</View>
							<Text style={styles.termsText}>
								Eu li e aceito os <Text style={styles.link}>Termos de Uso</Text> e a <Text style={styles.link}>Política de Privacidade</Text>.
							</Text>
						</Pressable>

						{/* Botão cadastrar */}
						<Pressable
							onPress={handleRegister}
							disabled={disabled}
							style={({ pressed }) => [
								styles.button,
								{ opacity: disabled || pressed ? 0.8 : 1 },
							]}
						>
							{submitting ? (
								<ActivityIndicator color="#FFF" />
							) : (
								<Text style={styles.buttonText}>Criar conta</Text>
							)}
						</Pressable>

						{/* Link para Login */}
						<View style={[styles.rowCenter, { marginTop: 12 }]}>
							<Text style={{ color: colors.sub }}>Já tem conta? </Text>
							<Pressable onPress={goToLogin} hitSlop={10}>
								<Text style={[styles.link, { fontWeight: '700' }]}>Entrar</Text>
							</Pressable>
						</View>

						{/* Erro geral */}
						{!!error && (
							<View style={styles.errBox}>
								<Text style={styles.errText}>{error}</Text>
							</View>
						)}

						{/* Overlay boot pós-cadastro */}
						{booting && (
							<View style={styles.overlay}>
								<ActivityIndicator size="large" color={colors.teal} />
								<Text style={{ marginTop: 8, color: '#111', fontWeight: 'bold' }}>
									Preparando seus dados…
								</Text>
							</View>
						)}

						{/* Rodapé */}
						<Text style={styles.footer}>FisioVet • {currentYear}</Text>
					</View>
				</ScrollView>
			</ResponsiveHero>
		</KeyboardAvoidingView>
	);
}

const styles = StyleSheet.create({
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
	rowCenter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },

	termsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 14 },
	checkbox: {
		width: 18, height: 18, borderRadius: 4, borderWidth: 1.5, borderColor: colors.line,
		alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF'
	},
	termsText: { color: colors.sub, flex: 1, fontSize: 14, lineHeight: 18 },

	button: {
		marginTop: 14, backgroundColor: colors.teal,
		paddingVertical: 14, borderRadius: 10, alignItems: 'center'
	},
	buttonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },

	link: { color: colors.teal, fontSize: 14 },
	footer: { textAlign: 'center', color: colors.teal, marginTop: 10, fontWeight: 'bold' },

	errBox: {
		marginTop: 12, padding: 10, borderRadius: 8,
		backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FCA5A5'
	},
	errText: { color: '#B91C1C', textAlign: 'center' },

	hintError: { marginTop: 6, color: '#B91C1C', fontSize: 12 },

	meterWrap: { flexDirection: 'row', gap: 6, marginTop: 8 },
	meterBar: { flex: 1, height: 6, borderRadius: 3, backgroundColor: '#E5E7EB' },
	mOk: { backgroundColor: '#10B981' },

	overlay: {
		position: 'absolute', left: 0, right: 0, top: 0, bottom: 0,
		backgroundColor: 'rgba(255,255,255,0.7)', alignItems: 'center', justifyContent: 'center',
		borderRadius: 16
	},
});