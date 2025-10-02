// app.config.js
require("dotenv").config();

const APP_ENV = process.env.APP_ENV ?? "production"; // development | preview | production

// Sufixos por ambiente (ajuste se quiser)
const NAME_SUFFIX =
	APP_ENV === "development" ? " Dev" : APP_ENV === "preview" ? " Preview" : "";
const ID_SUFFIX =
	APP_ENV === "development" ? ".dev" : APP_ENV === "preview" ? ".preview" : "";
const SCHEME_SUFFIX =
	APP_ENV === "development" ? "dev" : APP_ENV === "preview" ? "preview" : "";

// Seleção da Google Maps Key por ambiente:
// defina no EAS Secrets EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_DEVELOPMENT / _PREVIEW / _PRODUCTION
const MAPS_KEY_FROM_ENV =
	process.env[`EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_${APP_ENV.toUpperCase()}`] ||
	process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY; // fallback

module.exports = {
	expo: {
		name: `fisiovet-app${NAME_SUFFIX}`,
		slug: "fisiovet-app",

		version: "1.0.0",
		runtimeVersion: "1.0.0", // Bare exige string fixa

		orientation: "portrait",
		icon: "./assets/images/icon.png",
		scheme: `fisiovetapp${SCHEME_SUFFIX}`, // deep link único por app
		userInterfaceStyle: "automatic",
		newArchEnabled: true,

		extra: {
			eas: { projectId: "b5d74ed0-b6e2-497e-a9e7-b66665675e59" },
			APP_ENV,
		},

		splash: {
			image: "./assets/images/splash-icon.png",
			resizeMode: "contain",
			backgroundColor: "#ffffff",
		},

		ios: {
			supportsTablet: true,
			requireFullScreen: false,
			bundleIdentifier: `${process.env.IOS_BUNDLE_IDENTIFIER}${ID_SUFFIX}`,
			// A chave iOS é aplicada via ios.config.googleMapsApiKey
			config: {
				googleMapsApiKey: MAPS_KEY_FROM_ENV,
			},
			// Se tiver Firebase por ambiente, troque os arquivos aqui:
			googleServicesFile:
				APP_ENV === "preview"
					? "./firebase/preview/GoogleService-Info.plist"
					: APP_ENV === "development"
						? "./firebase/dev/GoogleService-Info.plist"
						: "./GoogleService-Info.plist",
			infoPlist: {
				"UISupportedInterfaceOrientations~ipad": [
					"UIInterfaceOrientationPortrait",
					"UIInterfaceOrientationLandscapeLeft",
					"UIInterfaceOrientationLandscapeRight",
				],
				NSLocationWhenInUseUsageDescription:
					"Permitir que o app use sua localização para rotas e mapa.",
				NSLocationAlwaysAndWhenInUseUsageDescription:
					"Permitir localização em segundo plano para rotas.",
				NSCameraUsageDescription:
					"Permitir que o app use a câmera para fotos dos pets.",
				NSPhotoLibraryUsageDescription:
					"Permitir acessar a galeria para anexos e imagens.",
				NSPhotoLibraryAddUsageDescription:
					"Permitir salvar imagens e anexos no rolo da câmera.",
				NSCalendarsUsageDescription: "Permitir adicionar eventos ao calendário.",
				NSContactsUsageDescription:
					"Permitir acesso aos contatos para vincular tutores.",
				NSFaceIDUsageDescription: "Permitir autenticar com Face ID.",
				UIBackgroundModes: ["location"],
			},
		},

		android: {
			adaptiveIcon: {
				foregroundImage: "./assets/images/adaptive-icon.png",
				backgroundColor: "#ffffff",
			},
			// Em Android, a chave é aplicada via android.config.googleMaps.apiKey
			config: {
				googleMaps: { apiKey: MAPS_KEY_FROM_ENV },
			},
			edgeToEdgeEnabled: true,
			package: `${process.env.ANDROID_PACKAGE_NAME}${ID_SUFFIX}`,
			// Se tiver Firebase por ambiente, troque os arquivos aqui:
			googleServicesFile:
				APP_ENV === "preview"
					? "./firebase/preview/google-services.json"
					: APP_ENV === "development"
						? "./firebase/dev/google-services.json"
						: "./google-services.json",
		},

		web: {
			bundler: "metro",
			output: "static",
			favicon: "./assets/images/favicon.png",
		},

		plugins: [
			"@react-native-firebase/app",
			"@react-native-firebase/auth",
			"@react-native-firebase/crashlytics",
			"expo-router",
			[
				"expo-splash-screen",
				{
					image: "./assets/images/splash-icon.png",
					tabletImage: "./assets/images/splash-icon-tablet.png",
					imageWidth: 200,
					resizeMode: "contain",
					backgroundColor: "#ffffff",
				},
			],
			["react-native-bottom-tabs"],
			["expo-build-properties", { ios: { useFrameworks: "static" } }],
			[
				"expo-location",
				{
					locationAlwaysAndWhenInUsePermission:
						"Permitir que o $(PRODUCT_NAME) use sua localização.",
				},
			],
			"expo-notifications",
			"expo-updates", // garante patches nativos para OTA
		],

		experiments: { typedRoutes: true },

		// EAS Update por canal (APP_ENV) e offline-first
		updates: {
			url: "https://u.expo.dev/b5d74ed0-b6e2-497e-a9e7-b66665675e59",
			requestHeaders: { "expo-channel-name": APP_ENV },
			enabled: true,
			fallbackToCacheTimeout: 0,
		},
	},
};