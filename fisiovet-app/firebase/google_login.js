// app/_appInit.js (importe uma vez, antes de usar)
import { GoogleSignin } from '@react-native-google-signin/google-signin';

// chame isso no boot do app (ex.: em App.js useEffect)
export function configureGoogle() {
  GoogleSignin.configure({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,    // do OAuth "Web application"
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,    // do plist do AMBIENTE ATUAL
    offlineAccess: true,                // se quiser refresh token
    forceCodeForRefreshToken: false,    // true se precisar explicitamente
    scopes: ['profile', 'email'],
  });
}