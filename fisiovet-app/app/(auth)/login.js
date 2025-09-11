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
import { mapFirebaseUserToDTO } from "@/firebase/authUserDTO";

export default function Login() {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const dispatch = useDispatch();

	const handleLogin = async () => {
		try {
			const { user } = await auth().signInWithEmailAndPassword(
				email,
				password
			);
			dispatch(setUser(mapFirebaseUserToDTO(user)));
		} catch (err) {
			setError(err.message);
		}
	};

	return (
		<View style={styles.container}>
			<Text style={styles.title}>Login</Text>
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

			<TouchableOpacity style={styles.button} onPress={handleLogin}>
				<Text style={styles.buttonText}>Entrar</Text>
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
		marginBottom: 10,
		color: "whitesmoke"
	},
	button: { backgroundColor: "#007AFF", padding: 15, borderRadius: 8 },
	buttonText: { color: "#fff", fontWeight: "bold", textAlign: "center" },
	error: { color: "red", marginBottom: 10, textAlign: "center" }
});
