import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/useColorScheme';

// Redux
import { Provider, useSelector } from 'react-redux';
import { store } from '../store';

function RootNavigator() {
  const colorScheme = useColorScheme();
  const user = useSelector((state) => state.user.user); // pega do Redux

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        {user ? (
          // Usuário logado → leva para tabs (home)

          <Stack.Screen name="(tabs)" />

        ) : (
          // Usuário não logado → leva para telas de auth
          <>
            <Stack.Screen name="firebaseCheck" options={{ title: 'Firebase Check' }} />
            <Stack.Screen name="(auth)" />
          </>
        )}
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  if (!loaded) {
    return null;
  }

  return (
    <Provider store={store}>
      <RootNavigator />
    </Provider>
  );
}