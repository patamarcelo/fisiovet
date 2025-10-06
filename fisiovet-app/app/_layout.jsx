// app/_layout.jsx
import 'react-native-gesture-handler';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useEffect, useState } from 'react';

import { useColorScheme } from '@/hooks/useColorScheme';

// Redux
import { Provider, useSelector, useDispatch } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from '../src/store';

// Firebase
import auth from '@react-native-firebase/auth';
import { mapFirebaseUserToDTO } from '@/firebase/authUserDTO';
import { setUser } from '@/src/store/slices/userSlice';

// Fonts
import { Fonts } from '@/assets/assets';

// NEW: provider/variant
import { LayoutProvider } from '@/src/providers/LayoutProvider';
import { useLayoutVariant } from '@/hooks/useLayoutVariant';


import { DarkAppTheme, LightAppTheme } from '@/src/theme/AppTheme'; // opcional (custom)
import { ColorSchemeProvider, useColorMode } from '@/src/theme/color-scheme';
import { GestureHandlerRootView } from 'react-native-gesture-handler';


function useAuthBinding() {
  const dispatch = useDispatch();
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const unsub = auth().onAuthStateChanged((u) => {
      dispatch(setUser(mapFirebaseUserToDTO(u)));
      setAuthReady(true);
    });
    return unsub;
  }, [dispatch]);

  return authReady;
}

function AuthBootstrap({ children }) {
  const ready = useAuthBinding();
  if (!ready) return null; // espera o primeiro snapshot do Firebase
  return children;
}

function AuthGate({ children }) {
  const user = useSelector((state) => state.user.user);
  const router = useRouter();
  const segments = useSegments();
  const variant = useLayoutVariant(); // "phone" | "tabletPortrait" | "tabletLandscape"

  useEffect(() => {
    const group = segments[0]; // "(phone)" | "(tablet)" | "(auth)" | "configuracoes" | undefined
    const atRoot = segments.length === 0;
    const inAuth = group === '(auth)' || group === 'firebaseCheck';

    // ✅ rotas de topo permitidas fora dos grupos
    const ALLOWED_TOP = ['configuracoes', '(modals)', 'pacientes', '(maps)', '(files)']; // adicione outras se precisar
    const inAllowedTop = ALLOWED_TOP.includes(group);

    if (!user) {
      if (!inAuth) router.replace('/(auth)/login');
      return;
    }

    // Se o user está logado:
    const shouldBeTablet = variant === 'tabletLandscape';
    const target = shouldBeTablet ? '/(tablet)' : '/(phone)';
    const inPhone = group === '(phone)';
    const inTablet = group === '(tablet)';

    // Permite ficar em rotas de topo whitelisted
    if (inAllowedTop) return;

    // Se está em auth, na raiz, ou no grupo “errado”, redireciona
    if (inAuth || atRoot || (shouldBeTablet && !inTablet) || (!shouldBeTablet && !inPhone)) {
      router.replace(target);
    }
  }, [user, segments, router, variant]);

  return children;
}

function RootNavigator() {
  const { scheme } = useColorMode(); // 'light' | 'dark'
  return (
    <ThemeProvider value={scheme === 'dark' ? DarkAppTheme : LightAppTheme}>
      <AuthGate>
        <GestureHandlerRootView style={{ flex: 1 }}>

          <Stack screenOptions={{ headerShown: false }}>
            {/* Grupos principais */}
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="(phone)" />
            <Stack.Screen name="(tablet)" />
            <Stack.Screen name="configuracoes" options={{ headerShown: false }} />
            <Stack.Screen name="(modals)" options={{ headerShown: false, presentation: 'modal' }} />
            <Stack.Screen name="(maps)" options={{ headerShown: false}} />
            {/* Suas outras rotas soltas */}
            <Stack.Screen name="testeRota" />
            <Stack.Screen name="+not-found" />

          </Stack>
        </GestureHandlerRootView>
      </AuthGate>
      <StatusBar style="dark" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const [fontsReady] = useFonts({
    SpaceMono: Fonts.SpaceMono,
  });

  if (!fontsReady) return null;

  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <AuthBootstrap>
          {/* Provider que expõe a variante de layout */}
          <ColorSchemeProvider>
            <RootNavigator />
          </ ColorSchemeProvider>
        </AuthBootstrap>
      </PersistGate>
    </Provider>
  );
}