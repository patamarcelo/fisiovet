// app/_layout.jsx
// @ts-nocheck

import "react-native-gesture-handler";
import "react-native-reanimated";

import {
	ActivityIndicator,
	Appearance,
	AppState,
	Image,
	Platform,
	StyleSheet,
	View,
} from "react-native";

import {
	ThemeProvider,
} from "@react-navigation/native";

import {
	useFonts,
} from "expo-font";

import {
	Stack,
	useRouter,
	useSegments,
} from "expo-router";

import {
	StatusBar,
} from "expo-status-bar";

import {
	useEffect,
	useRef,
	useState,
} from "react";

import * as SplashScreen from "expo-splash-screen";

import {
	GestureHandlerRootView,
} from "react-native-gesture-handler";

import {
	KeyboardProvider,
} from "react-native-keyboard-controller";

import {
	Provider,
	useDispatch,
	useSelector,
} from "react-redux";

import {
	PersistGate,
} from "redux-persist/integration/react";

import {
	onAuthStateChanged,
} from "firebase/auth";

import {
	store,
	persistor,
} from "../src/store";

import {
	auth,
} from "@/src/services/firebaseClient";

import {
	setUser,
	syncUserProfile,
} from "@/src/store/slices/userSlice";

import {
	mapFirebaseUserToDTO,
} from "@/firebase/authUserDTO";

import {
	Fonts,
} from "@/assets/assets";

import {
	LayoutProvider,
} from "@/src/providers/LayoutProvider";

import {
	useLayoutVariant,
} from "@/hooks/useLayoutVariant";

import {
	DarkAppTheme,
	LightAppTheme,
} from "@/src/theme/AppTheme";

import {
	ColorSchemeProvider,
	useColorMode,
} from "@/src/theme/color-scheme";

import SplashLoadingScreen from "@/components/SplashLoadingScreen";

import {
	configureAppleSubscriptions,
	getAppleCustomerInfo,
	getPlanFromCustomerInfo,
	logOutAppleSubscriptions,
	subscribeToAppleCustomerInfo,
} from "@/src/services/subscriptions/appleSubscriptions";

import {
	resetSubscription,
	setSubscriptionStatus,
} from "@/src/store/slices/subscriptionSlice";

import {
	postLoginBootstrap,
} from "@/src/store/bootstrapSlice";

const SPLASH_BG =
	"#F7F8FA";

const SPLASH_IMAGE =
	require(
		"@/assets/images/splash-fisiovet.png"
	);

SplashScreen
	.preventAutoHideAsync()
	.catch(() => { });

function StaticSplash({
	showSpinner = false,
}) {
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
					style={
						styles.staticSplashSpinner
					}
				/>
			) : null}
		</View>
	);
}

function BootSplash() {
	const [
		showFullSplash,
		setShowFullSplash,
	] = useState(false);

	useEffect(() => {
		const timer =
			setTimeout(() => {
				setShowFullSplash(true);
			}, 280);

		return () =>
			clearTimeout(timer);
	}, []);

	if (showFullSplash) {
		return (
			<SplashLoadingScreen />
		);
	}

	return (
		<StaticSplash
			showSpinner={false}
		/>
	);
}

function useAuthBinding() {
	const dispatch =
		useDispatch();

	const [
		authReady,
		setAuthReady,
	] = useState(false);

	useEffect(() => {
		let alive = true;

		let currentUserId =
			null;

		let unsubscribeRevenueCat =
			null;

		let revenueCatSyncPromise =
			null;

		const syncRevenueCatCustomerInfo = (
			customerInfo
		) => {
			if (
				!alive ||
				!customerInfo
			) {
				return;
			}

			const subscription =
				getPlanFromCustomerInfo(
					customerInfo
				);

			if (__DEV__) {
				console.log(
					"[RevenueCat] Subscription sync:",
					{
						originalAppUserId:
							customerInfo
								?.originalAppUserId,

						activeEntitlements:
							Object.keys(
								customerInfo
									?.entitlements
									?.active ||
								{}
							),

						subscription,
					}
				);
			}

			dispatch(
				setSubscriptionStatus({
					plan:
						subscription.plan,

					status:
						subscription.status,

					source:
						subscription.source,

					productId:
						subscription.productId,

					currentPeriodEnd:
						subscription
							.currentPeriodEnd,

					originalTransactionId:
						null,
				})
			);
		};

		const syncRevenueCat = async ({
			userId,
			forceRefresh = false,
			configure = false,
		} = {}) => {
			if (
				Platform.OS !==
				"ios" ||
				!userId ||
				!alive
			) {
				return null;
			}

			/*
			 * Evita duas atualizações simultâneas:
			 * por exemplo, auth callback + AppState.
			 */
			if (revenueCatSyncPromise) {
				try {
					await revenueCatSyncPromise;
				} catch {
					// A chamada atual fará nova tentativa.
				}
			}

			revenueCatSyncPromise =
				(async () => {
					const customerInfo =
						configure
							? await configureAppleSubscriptions(
								userId,
								{
									forceRefresh,
								}
							)
							: await getAppleCustomerInfo(
								{
									forceRefresh,
								}
							);

					if (
						alive &&
						currentUserId ===
						userId
					) {
						syncRevenueCatCustomerInfo(
							customerInfo
						);
					}

					return customerInfo;
				})();

			try {
				return await revenueCatSyncPromise;
			} finally {
				revenueCatSyncPromise =
					null;
			}
		};

		const unsubscribeAuth =
			onAuthStateChanged(
				auth,
				(firebaseUser) => {
					const dto =
						mapFirebaseUserToDTO(
							firebaseUser
						);

					currentUserId =
						dto?.uid || null;

					dispatch(
						setUser(dto)
					);

					/*
					 * Libera imediatamente a aplicação.
					 *
					 * A partir daqui, nenhuma chamada de rede
					 * participa mais do boot visual.
					 */
					if (alive) {
						setAuthReady(true);
					}

					unsubscribeRevenueCat?.();
					unsubscribeRevenueCat = null;

					if (!dto?.uid) {
						dispatch(
							resetSubscription()
						);

						if (
							Platform.OS === "ios"
						) {
							void logOutAppleSubscriptions()
								.catch((error) => {
									const message =
										String(
											error?.message || ""
										);

									const alreadyAnonymous =
										message
											.toLowerCase()
											.includes(
												"current user is anonymous"
											);

									if (
										!alreadyAnonymous
									) {
										console.log(
											"Falha ao desconectar RevenueCat:",
											error
										);
									}
								});
						}

						return;
					}

					/*
					 * Atualiza tutores, pets e agenda em background.
					 *
					 * O Redux Persist já liberou os dados locais;
					 * este bootstrap funciona somente como refresh.
					 */
					void dispatch(
						postLoginBootstrap({
							uid: dto.uid,
							clinicId: null,
						})
					)
						.unwrap()
						.catch((error) => {
							console.log(
								"Falha no refresh inicial:",
								error
							);
						});

					/*
					 * Atualização de perfil em background.
					 * Não bloqueia a entrada.
					 */
					void dispatch(
						syncUserProfile(dto)
					)
						.unwrap()
						.catch((error) => {
							console.log(
								"Falha ao sincronizar profile:",
								error
							);
						});

					/*
					 * RevenueCat em background.
					 * O subscriptionSlice persistido continua
					 * sendo usado até chegar uma resposta nova.
					 */
					if (
						Platform.OS === "ios"
					) {
						void syncRevenueCat({
							userId: dto.uid,
							forceRefresh: true,
							configure: true,
						})
							.then(() => {
								if (
									!alive ||
									currentUserId !==
									dto.uid
								) {
									return;
								}

								unsubscribeRevenueCat =
									subscribeToAppleCustomerInfo(
										(
											customerInfo
										) => {
											if (
												currentUserId ===
												dto.uid
											) {
												syncRevenueCatCustomerInfo(
													customerInfo
												);
											}
										}
									);
							})
							.catch((error) => {
								console.log(
									"Falha ao configurar RevenueCat:",
									error
								);
							});
					}
				}
			);

		const appStateSubscription =
			AppState.addEventListener(
				"change",
				async (
					nextState
				) => {
					if (
						nextState !==
						"active" ||
						Platform.OS !==
						"ios" ||
						!currentUserId
					) {
						return;
					}

					try {
						await syncRevenueCat({
							userId:
								currentUserId,

							forceRefresh:
								true,

							configure:
								false,
						});
					} catch (error) {
						console.log(
							"Falha ao atualizar RevenueCat no foreground:",
							error
						);
					}
				}
			);

		return () => {
			alive = false;
			currentUserId = null;

			unsubscribeAuth?.();
			unsubscribeRevenueCat?.();
			appStateSubscription?.remove();
		};
	}, [dispatch]);

	return authReady;
}

function AuthGate({
	children,
}) {
	const user =
		useSelector(
			(state) =>
				state.user.user
		);


	const router =
		useRouter();

	const segments =
		useSegments();

	const variant =
		useLayoutVariant();

	useEffect(() => {
		const group =
			segments[0];

		const atRoot =
			segments.length === 0;

		const inAuth =
			group === "(auth)" ||
			group ===
			"firebaseCheck";

		const ALLOWED_TOP = [
			"configuracoes",
			"(modals)",
			"(home-modals)",
			"pacientes",
			"(maps)",
			"(files)",
		];

		const inAllowedTop =
			ALLOWED_TOP.includes(
				group
			);

		if (!user) {
			if (!inAuth) {
				router.replace(
					"/(auth)/login"
				);
			}

			return;
		}


		const shouldBeTablet =
			variant ===
			"tabletLandscape";

		const target =
			shouldBeTablet
				? "/(tablet)"
				: "/(phone)";

		const inPhone =
			group === "(phone)";

		const inTablet =
			group === "(tablet)";

		if (inAllowedTop) {
			return;
		}

		if (
			inAuth ||
			atRoot ||
			(
				shouldBeTablet &&
				!inTablet
			) ||
			(
				!shouldBeTablet &&
				!inPhone
			)
		) {
			router.replace(
				target
			);
		}
	}, [
		user,
		segments,
		router,
		variant,
	]);

	return children;
}

function RootNavigator() {
	const {
		scheme,
	} = useColorMode();

	return (
		<ThemeProvider
			value={
				scheme === "dark"
					? DarkAppTheme
					: LightAppTheme
			}
		>
			<AuthGate>
				<Stack
					screenOptions={{
						headerShown:
							false,
					}}
				>
					<Stack.Screen
						name="(phone)"
					/>

					<Stack.Screen
						name="(tablet)"
					/>

					<Stack.Screen
						name="configuracoes"
						options={{
							headerShown:
								false,
						}}
					/>

					<Stack.Screen
						name="(modals)"
						options={{
							headerShown:
								false,
						}}
					/>

					<Stack.Screen
						name="(home-modals)"
						options={{
							headerShown:
								false,

							presentation:
								"fullScreenModal",

							animation:
								"slide_from_bottom",

							gestureEnabled:
								true,

							gestureDirection:
								"vertical",
						}}
					/>

					<Stack.Screen
						name="(maps)"
						options={{
							headerShown:
								false,
						}}
					/>

					<Stack.Screen
						name="(files)"
						options={{
							headerShown:
								false,
						}}
					/>

					<Stack.Screen
						name="+not-found"
					/>
				</Stack>
			</AuthGate>

			<StatusBar
				style={
					scheme === "dark"
						? "light"
						: "dark"
				}
			/>
		</ThemeProvider>
	);
}

function AppBoot({
	fontsReady,
	persistReady,
}) {
	const authReady =
		useAuthBinding();

	const didHideNativeSplash =
		useRef(false);

	const appReady =
		fontsReady &&
		persistReady &&
		authReady;

	useEffect(() => {
		if (
			didHideNativeSplash
				.current
		) {
			return;
		}

		const timer =
			setTimeout(() => {
				didHideNativeSplash
					.current = true;

				SplashScreen
					.hideAsync()
					.catch(() => { });
			}, 80);

		return () =>
			clearTimeout(timer);
	}, []);

	if (!appReady) {
		return (
			<BootSplash />
		);
	}

	return (
		<ColorSchemeProvider>
			<LayoutProvider>
				<GestureHandlerRootView
					style={{
						flex: 1,
						backgroundColor:
							SPLASH_BG,
					}}
				>
					<KeyboardProvider>
						<RootNavigator />
					</KeyboardProvider>
				</GestureHandlerRootView>
			</LayoutProvider>
		</ColorSchemeProvider>
	);
}

function RootLayoutInner({
	fontsReady,
}) {
	const [
		persistReady,
		setPersistReady,
	] = useState(false);

	return (
		<PersistGate
			persistor={
				persistor
			}
			loading={
				<StaticSplash
					showSpinner={
						false
					}
				/>
			}
			onBeforeLift={() => {
				setPersistReady(
					true
				);
			}}
		>
			<AppBoot
				fontsReady={
					fontsReady
				}
				persistReady={
					persistReady
				}
			/>
		</PersistGate>
	);
}

export default function RootLayout() {
	const [
		fontsReady,
	] = useFonts({
		SpaceMono:
			Fonts.SpaceMono,
	});

	useEffect(() => {
		Appearance.setColorScheme(
			"light"
		);
	}, []);

	return (
		<View style={styles.root}>
			<Provider
				store={store}
			>
				<RootLayoutInner
					fontsReady={
						fontsReady
					}
				/>
			</Provider>
		</View>
	);
}

const styles =
	StyleSheet.create({
		root: {
			flex: 1,
			backgroundColor:
				SPLASH_BG,
		},

		staticSplash: {
			flex: 1,
			backgroundColor:
				SPLASH_BG,
			alignItems:
				"center",
			justifyContent:
				"center",
		},

		staticSplashImage: {
			width: 178,
			height: 178,
		},

		staticSplashSpinner: {
			marginTop: 18,
		},
	});