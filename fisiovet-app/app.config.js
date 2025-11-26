// app.config.js
require("dotenv").config();

const APP_ENV = process.env.APP_ENV ?? "production"; // development | preview | production

// Sufixos por ambiente
const NAME_SUFFIX =
	APP_ENV === "development" ? " Dev" : APP_ENV === "preview" ? " Preview" : "";
const ID_SUFFIX =
	APP_ENV === "development" ? ".dev" : APP_ENV === "preview" ? ".preview" : "";
const SCHEME_SUFFIX =
	APP_ENV === "development" ? "dev" : APP_ENV === "preview" ? "preview" : "";

// Google Maps key por ambiente
const MAPS_KEY =
	process.env[`EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_${APP_ENV.toUpperCase()}`] ||
	process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

// Controle de versão centralizado
const versionControl = "1.0.11";

module.exports = {
	expo: {
		name: `fisiovet-app${NAME_SUFFIX}`,
		slug: "fisiovet-app",

		version: versionControl,
		runtimeVersion: versionControl, // Bare exige string fixa por versão

		orientation: "portrait",
		icon: "./assets/images/icon.png",
		scheme: `fisiovetapp${SCHEME_SUFFIX}`, // deep link único por app/ambiente
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
			config: {
				googleMapsApiKey: MAPS_KEY,
			},
			googleServicesFile: "./GoogleService-Info.plist",
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
				NSCalendarsUsageDescription:
					"Permitir adicionar eventos ao calendário.",
				NSContactsUsageDescription:
					"Permitir acesso aos contatos para vincular tutores.",
				NSFaceIDUsageDescription:
					"Permitir autenticar com Face ID.",
				UIBackgroundModes: ["location"],
			},
		},

		android: {
			adaptiveIcon: {
				foregroundImage: "./assets/images/adaptive-icon.png",
				backgroundColor: "#ffffff",
			},
			config: {
				googleMaps: { apiKey: MAPS_KEY },
			},
			edgeToEdgeEnabled: true,
			package: `${process.env.ANDROID_PACKAGE_NAME}${ID_SUFFIX}`,
			googleServicesFile: "./GoogleService-Info.plist",
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
			["@react-native-google-signin/google-signin"],
			["expo-build-properties", { ios: { useFrameworks: "static" } }],
			[
				"expo-location",
				{
					locationAlwaysAndWhenInUsePermission:
						"Permitir que o $(PRODUCT_NAME) use sua localização.",
				},
			],
			"expo-notifications",
			"expo-updates", // mesmo com updates.disabled, deixa plugin configurado
		],

		experiments: { typedRoutes: true },

		updates: {
			enabled: false, // OTA desativado por enquanto
		},
	},
};
