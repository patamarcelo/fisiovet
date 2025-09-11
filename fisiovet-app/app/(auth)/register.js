import { useState } from "react";
import {
	View,
	Text,
	TextInput,
	TouchableOpacity,
	StyleSheet
} from "react-native";
import auth from "@react-native-firebase/auth";
import { useDispatch } from "react-redux";
import { setUser } from "../../src/store/slices/userSlice";

export default function Register() {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const dispatch = useDispatch();

	const handleRegister = async () => {
		try {
			const userCredential = await auth().createUserWithEmailAndPassword(
				email,
				password
			);
			dispatch(setUser(userCredential.user));
		} catch (err) {
			setError(err.message);
		}
	};

	return (
		<View style={styles.container}>
			<Text style={styles.title}>Criar Conta</Text>
			{error ? <Text style={styles.error}>{error}</Text> : null}

			<TextInput
				style={styles.input}
				placeholder="E-mail"
				value={email}
				onChangeText={setEmail}
				autoCapitalize="none"
			/>

			<TextInput
				style={styles.input}
				placeholder="Senha"
				value={password}
				onChangeText={setPassword}
				secureTextEntry
			/>

			<TouchableOpacity style={styles.button} onPress={handleRegister}>
				<Text style={styles.buttonText}>Registrar</Text>
			</TouchableOpacity>
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, justifyContent: "center", padding: 20 },
	title: {
		fontSize: 24,
		fontWeight: "bold",
		marginBottom: 20,
		textAlign: "center"
	},
	input: {
		borderWidth: 1,
		borderColor: "#ccc",
		padding: 12,
		borderRadius: 8,
		marginBottom: 10
	},
	button: { backgroundColor: "#34C759", padding: 15, borderRadius: 8 },
	buttonText: { color: "#fff", fontWeight: "bold", textAlign: "center" },
	error: { color: "red", marginBottom: 10, textAlign: "center" }
});
