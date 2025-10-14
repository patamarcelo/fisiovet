// firebase.js
import { getApp } from "@react-native-firebase/app";
import { getAuth } from "@react-native-firebase/auth";
import { getFirestore } from "@react-native-firebase/firestore";
import storage from '@react-native-firebase/storage';
import firestoreModule from '@react-native-firebase/firestore'; // 👈 ADICIONE ISTO


export function ensureFirebase() {
	let app;
	try {
		app = getApp(); // pega a default app inicializada pelos arquivos google-services
	} catch (e) {
		console.warn(
			"Firebase app não inicializada. Verifique google services files.",
			e
		);
		return null;
	}

	const auth = getAuth(app);
	const firestore = getFirestore(app);
	const storageInstance = storage();


	return { app, auth, firestore, storageInstance, firestoreModule };
}
