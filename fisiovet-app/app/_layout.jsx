// app/_layout.jsx
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
import { store, persistor } from '../store';

// Firebase
import auth from '@react-native-firebase/auth';
import { mapFirebaseUserToDTO } from '@/firebase/authUserDTO';
import { setUser } from '@/store/slices/userSlice';

// Fonts
import { Fonts } from '@/assets/assets';

// NEW: provider/variant
import { LayoutProvider } from '@/src/providers/LayoutProvider';
import { useLayoutVariant } from '@/hooks/useLayoutVariant';

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
    const atRoot = segments.length === 0;
    const group = segments[0]; // "(phone)" | "(tablet)" | "(auth)" | undefined
    const inPhone = group === '(phone)';
    const inTablet = group === '(tablet)';
    const inAuth = group === '(auth)' || group === 'firebaseCheck';

    // Não logado -> manda para auth
    if (!user) {
      if (!inAuth) router.replace('/(auth)/login');
      return;
    }

    // Logado -> decide grupo por variante
    const shouldBeTablet = variant === 'tabletLandscape';
    const target = shouldBeTablet ? '/(tablet)' : '/(phone)';

    // Se está em auth ou na raiz, ou no grupo errado, redireciona
    if (inAuth || atRoot || (shouldBeTablet && !inTablet) || (!shouldBeTablet && !inPhone)) {
      router.replace(target);
    }
  }, [user, segments, router, variant]);

  return children;
}

function RootNavigator() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthGate>
        <Stack screenOptions={{ headerShown: false }}>
          {/* Grupos principais */}
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="(phone)" />
          <Stack.Screen name="(tablet)" />
          {/* Suas outras rotas soltas */}
          <Stack.Screen name="testeRota" />
          <Stack.Screen name="+not-found" />
        </Stack>
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
          <LayoutProvider>
            <RootNavigator />
          </LayoutProvider>
        </AuthBootstrap>
      </PersistGate>
    </Provider>
  );
}