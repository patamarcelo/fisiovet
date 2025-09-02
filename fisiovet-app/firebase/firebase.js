// firebase.js
import firebase from "@react-native-firebase/app";
import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";

// Em RNFirebase, a presença do GoogleService-Info.plist / google-services.json
// já inicializa a default app. Este check evita warnings em dev.
export function ensureFirebase() {
	try {
		firebase.app(); // throws se não estiver inicializado
	} catch (e) {
		// Se cair aqui, normalmente é falta/posição errada dos arquivos de serviço
		console.warn(
			"Firebase app não inicializada. Verifique google services files.",
			e
		);
	}
	return { firebase, auth, firestore };
}
