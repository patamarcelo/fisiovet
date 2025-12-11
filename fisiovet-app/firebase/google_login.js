// app/_appInit.js (importe uma vez, antes de usar)
import { GoogleSignin } from '@react-native-google-signin/google-signin';

import Constants from 'expo-constants';


// chame isso no boot do app (ex.: em App.js useEffect)
const APP_ENV = Constants.expoConfig?.extra?.APP_ENV ?? 'production';

const iosClientId =
  APP_ENV === 'development'
    ? process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID_DEV
    : process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

export function configureGoogle() {
  GoogleSignin.configure({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,    // do OAuth "Web application"
    iosClientId,
    offlineAccess: true,                // se quiser refresh token
    forceCodeForRefreshToken: false,    // true se precisar explicitamente
    scopes: ['profile', 'email'],
  });
}