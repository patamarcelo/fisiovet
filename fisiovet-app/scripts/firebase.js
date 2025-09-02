// scripts/firebase.js
import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";
import app from "@react-native-firebase/app";

// Opcional: verificar se o app já foi inicializado
if (!app.apps.length) {
	app.initializeApp();
}

export { auth, firestore };
