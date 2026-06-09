// app/_layout.jsx
import "react-native-gesture-handler";
import "react-native-reanimated";

import { ThemeProvider } from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import * as SplashScreen from "expo-splash-screen";

import { GestureHandlerRootView } from "react-native-gesture-handler";

// Redux
import { Provider, useSelector, useDispatch } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { store, persistor } from "../src/store";

// Firebase
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/src/services/firebaseClient";
import { setUser, syncUserProfile } from '@/src/store/slices/userSlice';


import { mapFirebaseUserToDTO } from "@/firebase/authUserDTO";

// Fonts
import { Fonts } from "@/assets/assets";

// Layout/provider
import { LayoutProvider } from "@/src/providers/LayoutProvider";
import { useLayoutVariant } from "@/hooks/useLayoutVariant";

// Theme
import { DarkAppTheme, LightAppTheme } from "@/src/theme/AppTheme";
import { ColorSchemeProvider, useColorMode } from "@/src/theme/color-scheme";
import SplashLoadingScreen from "@/components/SplashLoadingScreen";

SplashScreen.preventAutoHideAsync().catch(() => { });

function useAuthBinding() {
	const dispatch = useDispatch();
	const [authReady, setAuthReady] = useState(false);

	useEffect(() => {
		const unsub = onAuthStateChanged(auth, async (u) => {
			const dto = mapFirebaseUserToDTO(u);

			dispatch(setUser(dto));

			if (dto?.uid) {
				try {
					await dispatch(syncUserProfile(dto)).unwrap();
				} catch (e) {
					console.log("Falha ao sincronizar profile:", e);
				}
			}

			setAuthReady(true);
		});

		return unsub;
	}, [dispatch]);

	return authReady;
}

function AuthBootstrap({ children }) {
	const ready = useAuthBinding();

	useEffect(() => {
		if (!ready) return;
		SplashScreen.hideAsync().catch(() => { });
	}, [ready]);

	if (!ready) return <SplashLoadingScreen />;

	return children;
}

function AuthGate({ children }) {
	const user = useSelector((state) => state.user.user);
	const boot = useSelector((state) => state.bootstrap);
	const router = useRouter();
	const segments = useSegments();
	const variant = useLayoutVariant();

	useEffect(() => {
		const group = segments[0];
		const atRoot = segments.length === 0;
		const inAuth = group === "(auth)" || group === "firebaseCheck";

		const ALLOWED_TOP = [
			"configuracoes",
			"(modals)",
			"pacientes",
			"(maps)",
			"(files)",
		];

		const inAllowedTop = ALLOWED_TOP.includes(group);

		if (!user) {
			if (!inAuth) router.replace("/(auth)/login");
			return;
		}

		if (boot?.loading || boot?.done === false) {
			return;
		}

		const shouldBeTablet = variant === "tabletLandscape";
		const target = shouldBeTablet ? "/(tablet)" : "/(phone)";
		const inPhone = group === "(phone)";
		const inTablet = group === "(tablet)";

		if (inAllowedTop) return;

		if (
			inAuth ||
			atRoot ||
			(shouldBeTablet && !inTablet) ||
			(!shouldBeTablet && !inPhone)
		) {
			router.replace(target);
		}
	}, [user, segments, router, variant, boot?.loading, boot?.done]);

	return children;
}

function RootNavigator() {
	const { scheme } = useColorMode();

	return (
		<ThemeProvider value={scheme === "dark" ? DarkAppTheme : LightAppTheme}>
			<AuthGate>
				<Stack screenOptions={{ headerShown: false }}>
					<Stack.Screen name="(phone)" />
					<Stack.Screen name="(tablet)" />
					<Stack.Screen name="configuracoes" options={{ headerShown: false }} />
					<Stack.Screen name="(modals)" options={{ headerShown: false }} />
					<Stack.Screen name="(maps)" options={{ headerShown: false }} />
					<Stack.Screen name="(files)" options={{ headerShown: false }} />

					<Stack.Screen name="testeRota" />
					<Stack.Screen name="+not-found" />
				</Stack>
			</AuthGate>

			<StatusBar style={scheme === "dark" ? "light" : "dark"} />
		</ThemeProvider>
	);
}

export default function RootLayout() {
	const [fontsReady] = useFonts({
		SpaceMono: Fonts.SpaceMono,
	});

	if (!fontsReady) return <SplashLoadingScreen />;

	return (
		<Provider store={store}>
			<PersistGate loading={<SplashLoadingScreen />} persistor={persistor}>
				<AuthBootstrap>
					<ColorSchemeProvider>
						<LayoutProvider>
							<GestureHandlerRootView style={{ flex: 1 }}>
								<RootNavigator />
							</GestureHandlerRootView>
						</LayoutProvider>
					</ColorSchemeProvider>
				</AuthBootstrap>
			</PersistGate>
		</Provider>
	);
}