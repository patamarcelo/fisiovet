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
const versionControl = "1.0.16";


module.exports = {
	expo: {
		name: `FisioVet`,
		slug: "fisiovet-app",

		version: versionControl,
		runtimeVersion: versionControl, // Bare exige string fixa por versão

		orientation: "portrait",
		icon: "./assets/images/icon.png",
		scheme: `fisiovetapp${SCHEME_SUFFIX}`, // deep link único por app/ambiente
		userInterfaceStyle: "light",
		newArchEnabled: true,
		jsEngine: "jsc",

		extra: {
			eas: { projectId: "b5d74ed0-b6e2-497e-a9e7-b66665675e59" },
			APP_ENV,
		},

		ios: {
			supportsTablet: true,
			usesAppleSignIn: true,
			requireFullScreen: false,
			bundleIdentifier: process.env.IOS_BUNDLE_IDENTIFIER,
			scheme: "fisiovetapp",
			googleServicesFile: "./GoogleService-Info.plist",
			infoPlist: {
				UIUserInterfaceStyle: "Light",

				"UISupportedInterfaceOrientations~ipad": [
					"UIInterfaceOrientationPortrait",
					"UIInterfaceOrientationLandscapeLeft",
					"UIInterfaceOrientationLandscapeRight",
				],
				NSLocationWhenInUseUsageDescription:
					"Permitir que o app use sua localização para rotas e mapa.",

				NSCameraUsageDescription:
					"Permitir que o app use a câmera para fotos dos pets.",

				NSPhotoLibraryUsageDescription:
					"Precisamos acessar sua galeria para você selecionar e anexar fotos de pacientes, exames ou exercícios ao prontuário (ex.: foto de uma radiografia).",
				NSPhotoLibraryAddUsageDescription:
					"Precisamos salvar imagens geradas no app (ex.: relatório ou foto editada) no seu rolo de câmera, caso você escolha exportar.",
				NSRemindersUsageDescription:
					"Permitir acesso aos lembretes para criar e gerenciar eventos e tarefas relacionados ao atendimento.",
				NSCalendarsUsageDescription:
					"Permitir adicionar eventos ao calendário.",
				NSContactsUsageDescription:
					"Permitir acesso aos contatos para vincular tutores.",

				NSFaceIDUsageDescription: "Permitir autenticar com Face ID.",
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
			googleServicesFile: "./google-services.json",
		},

		web: {
			bundler: "metro",
			output: "static",
			favicon: "./assets/images/favicon.png",
		},

		plugins: [
			"@react-native-community/datetimepicker",
			"expo-font",
			"expo-secure-store",
			"expo-web-browser",
			"expo-router",
			"expo-apple-authentication",

			[
				"expo-splash-screen",
				{
					image: "./assets/images/splash-fisiovet.png",
					imageWidth: 178,
					resizeMode: "contain",
					backgroundColor: "#F7F8FA",
					dark: {
						image: "./assets/images/splash-fisiovet.png",
						backgroundColor: "#F7F8FA"
					}
				}
			],

			[
				"@react-native-google-signin/google-signin",
				{
					iosUrlScheme:
						"com.googleusercontent.apps.629108942932-pt4mjadm9028fn4kjovqoe3h1trebaj8",
				},
			],

			"./plugins/withIosRemoveGoogleMapsPod",
			// "./plugins/withIosNonModularHeaders",

			[
				"expo-location",
				{
					locationWhenInUsePermission:
						"Permitir que o app use sua localização para rotas e mapa enquanto estiver em uso.",
				},
			],

			[
				"expo-calendar",
				{
					calendarPermission: "Permitir adicionar eventos ao calendário.",
					remindersPermission:
						"Permitir acesso aos lembretes para criar e gerenciar eventos e tarefas relacionados ao atendimento.",
				},
			],

			"expo-notifications",
			"expo-updates",
		],

		experiments: { typedRoutes: true },

		updates: {
			enabled: false, // OTA desativado por enquanto
		},
	},
};
