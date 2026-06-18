// src/services/firebaseClient.js

import {
  initializeApp,
  getApp,
  getApps,
} from "firebase/app";

import {
  getFirestore,
} from "firebase/firestore";

import {
  getStorage,
} from "firebase/storage";

import {
  getAuth,
  initializeAuth,
  getReactNativePersistence,
} from "firebase/auth";

import AsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey:
    process.env
      .EXPO_PUBLIC_FIREBASE_API_KEY,

  authDomain:
    process.env
      .EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,

  projectId:
    process.env
      .EXPO_PUBLIC_FIREBASE_PROJECT_ID,

  storageBucket:
    process.env
      .EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,

  messagingSenderId:
    process.env
      .EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,

  appId:
    process.env
      .EXPO_PUBLIC_FIREBASE_APP_ID,
};

const app =
  getApps().length > 0
    ? getApp()
    : initializeApp(
        firebaseConfig
      );

let auth;

try {
  auth =
    initializeAuth(app, {
      persistence:
        getReactNativePersistence(
          AsyncStorage
        ),
    });
} catch (error) {
  /*
   * Em Fast Refresh ou em uma segunda importação,
   * o Auth já pode ter sido inicializado.
   *
   * Somente esse caso deve usar getAuth().
   * Outros erros não podem ser silenciados porque
   * podem indicar falha real na persistência local.
   */
  if (
    error?.code ===
      "auth/already-initialized" ||
    error?.code ===
      "auth/already-initialized-with-different-options"
  ) {
    auth =
      getAuth(app);
  } else {
    console.error(
      "[Firebase Auth] Falha ao configurar persistência local:",
      error
    );

    throw error;
  }
}

const db =
  getFirestore(app);

const storage =
  getStorage(app);

export {
  app,
  auth,
  db,
  storage,
};