// app/_layout.jsx
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/useColorScheme';

// Redux
import { Provider, useSelector, useDispatch } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from '../store';
import { useEffect, useState } from 'react';

// Firebase
import auth from '@react-native-firebase/auth';
import { mapFirebaseUserToDTO } from '@/firebase/authUserDTO';
import { setUser } from '@/store/slices/userSlice';

import { Fonts } from '@/assets/assets';

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

  useEffect(() => {
    const atRoot = segments.length === 0;
    const inTabs = segments[0] === '(tabs)';
    const inAuth = segments[0] === '(auth)' || segments[0] === 'firebaseCheck';

    if (!user && (inTabs || atRoot)) {
      router.replace('/(auth)/login');
    } else if (user && inAuth) {
      router.replace('/(tabs)');
    }
  }, [user, segments, router]);

  return children;
}

function RootNavigator() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthGate>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="testeRota" />
          <Stack.Screen name="+not-found" />
        </Stack>
      </AuthGate>
      <StatusBar style="auto" />
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
          <RootNavigator />
        </AuthBootstrap>
      </PersistGate>
    </Provider>
  );
}