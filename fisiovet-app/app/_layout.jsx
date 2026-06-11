// app/_layout.jsx
// @ts-nocheck

import "react-native-gesture-handler";
import "react-native-reanimated";

import {
	ActivityIndicator,
	Appearance,
	Image,
	StyleSheet,
	View,
} from "react-native";
import { ThemeProvider } from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import * as SplashScreen from "expo-splash-screen";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { Provider, useDispatch, useSelector } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { store, persistor } from "../src/store";

import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/src/services/firebaseClient";
import { setUser, syncUserProfile } from "@/src/store/slices/userSlice";
import { mapFirebaseUserToDTO } from "@/firebase/authUserDTO";

import { Fonts } from "@/assets/assets";

import { LayoutProvider } from "@/src/providers/LayoutProvider";
import { useLayoutVariant } from "@/hooks/useLayoutVariant";

import { DarkAppTheme, LightAppTheme } from "@/src/theme/AppTheme";
import { ColorSchemeProvider, useColorMode } from "@/src/theme/color-scheme";
import SplashLoadingScreen from "@/components/SplashLoadingScreen";

const SPLASH_BG = "#F7F8FA";
const SPLASH_IMAGE = require("@/assets/images/splash-fisiovet.png");

SplashScreen.preventAutoHideAsync().catch(() => {});

function StaticSplash({ showSpinner = false }) {
	return (
		<View style={styles.staticSplash}>
			<Image
				source={SPLASH_IMAGE}
				style={styles.staticSplashImage}
				resizeMode="contain"
				fadeDuration={0}
			/>

			{showSpinner ? (
				<ActivityIndicator
					size="small"
					color="#159E9C"
					style={styles.staticSplashSpinner}
				/>
			) : null}
		</View>
	);
}

function BootSplash() {
	const [showFullSplash, setShowFullSplash] = useState(false);

	useEffect(() => {
		const timer = setTimeout(() => {
			setShowFullSplash(true);
		}, 280);

		return () => clearTimeout(timer);
	}, []);

	if (showFullSplash) {
		return <SplashLoadingScreen />;
	}

	return <StaticSplash showSpinner={false} />;
}

function useAuthBinding() {
	const dispatch = useDispatch();
	const [authReady, setAuthReady] = useState(false);

	useEffect(() => {
		let alive = true;

		const unsub = onAuthStateChanged(auth, async (u) => {
			try {
				const dto = mapFirebaseUserToDTO(u);

				dispatch(setUser(dto));

				if (dto?.uid) {
					try {
						await dispatch(syncUserProfile(dto)).unwrap();
					} catch (e) {
						console.log("Falha ao sincronizar profile:", e);
					}
				}
			} catch (e) {
				console.log("Falha no auth binding:", e);
			} finally {
				if (alive) {
					setAuthReady(true);
				}
			}
		});

		return () => {
			alive = false;
			unsub?.();
		};
	}, [dispatch]);

	return authReady;
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
			if (!inAuth) {
				router.replace("/(auth)/login");
			}

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
					<Stack.Screen name="(auth)" />
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

function AppBoot({ fontsReady, persistReady }) {
	const authReady = useAuthBinding();
	const didHideNativeSplash = useRef(false);

	const appReady = fontsReady && persistReady && authReady;

	useEffect(() => {
		if (didHideNativeSplash.current) return;

		const timer = setTimeout(() => {
			didHideNativeSplash.current = true;
			SplashScreen.hideAsync().catch(() => {});
		}, 80);

		return () => clearTimeout(timer);
	}, []);

	if (!appReady) {
		return <BootSplash />;
	}

	return (
		<ColorSchemeProvider>
			<LayoutProvider>
				<GestureHandlerRootView style={{ flex: 1, backgroundColor: SPLASH_BG }}>
					<RootNavigator />
				</GestureHandlerRootView>
			</LayoutProvider>
		</ColorSchemeProvider>
	);
}

function RootLayoutInner({ fontsReady }) {
	const [persistReady, setPersistReady] = useState(false);

	return (
		<PersistGate
			persistor={persistor}
			loading={<StaticSplash showSpinner={false} />}
			onBeforeLift={() => {
				setPersistReady(true);
			}}
		>
			<AppBoot fontsReady={fontsReady} persistReady={persistReady} />
		</PersistGate>
	);
}

export default function RootLayout() {
	const [fontsReady] = useFonts({
		SpaceMono: Fonts.SpaceMono,
	});

	useEffect(() => {
		Appearance.setColorScheme("light");
	}, []);

	return (
		<View style={styles.root}>
			<Provider store={store}>
				<RootLayoutInner fontsReady={fontsReady} />
			</Provider>
		</View>
	);
}

const styles = StyleSheet.create({
	root: {
		flex: 1,
		backgroundColor: SPLASH_BG,
	},

	staticSplash: {
		flex: 1,
		backgroundColor: SPLASH_BG,
		alignItems: "center",
		justifyContent: "center",
	},

	staticSplashImage: {
		width: 178,
		height: 178,
	},

	staticSplashSpinner: {
		marginTop: 18,
	},
});