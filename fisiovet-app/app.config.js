// app.config.js
require("dotenv").config();

export default {
	expo: {
		name: "fisiovet-app",
		slug: "fisiovet-app",
		version: "1.0.0",
		orientation: "portrait",
		icon: "./assets/images/icon.png",
		scheme: "fisiovetapp",
		userInterfaceStyle: "automatic",
		newArchEnabled: true,

		runtimeVersion: { policy: "appVersion" }, // ✅ OTA estável

		extra: {
			eas: { projectId: "b5d74ed0-b6e2-497e-a9e7-b66665675e59" }
		},

		splash: {
			image: "./assets/images/splash-icon.png",
			// tabletImage: "./assets/images/splash-icon-tablet.png",
			resizeMode: "contain",
			backgroundColor: "#ffffff"
		},

		ios: {
			supportsTablet: true,
			requireFullScreen: false,
			bundleIdentifier: process.env.IOS_BUNDLE_IDENTIFIER,
			config: {
				googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
			},
			googleServicesFile: "./GoogleService-Info.plist",
			infoPlist: {
				"UISupportedInterfaceOrientations~ipad": [
					"UIInterfaceOrientationPortrait",
					"UIInterfaceOrientationLandscapeLeft",
					"UIInterfaceOrientationLandscapeRight"
				],
				NSLocationWhenInUseUsageDescription: "Permitir que o app use sua localização para rotas e mapa.",
				// ❗ Se ainda não for usar localização em segundo plano, remova a linha abaixo:
				NSLocationAlwaysAndWhenInUseUsageDescription: "Permitir localização em segundo plano para rotas.",
				NSCameraUsageDescription: "Permitir que o app use a câmera para fotos dos pets.",
				NSPhotoLibraryUsageDescription: "Permitir acessar a galeria para anexos e imagens.",
				NSPhotoLibraryAddUsageDescription: "Permitir salvar imagens e anexos no rolo da câmera.", // ✅
				NSCalendarsUsageDescription: "Permitir adicionar eventos ao calendário.",
				NSContactsUsageDescription: "Permitir acesso aos contatos para vincular tutores.",
				NSFaceIDUsageDescription: "Permitir autenticar com Face ID.",
				// Se (e quando) usar background location, adicione:
				UIBackgroundModes: ["location"]
			}
		},

		android: {
			adaptiveIcon: {
				foregroundImage: "./assets/images/adaptive-icon.png",
				backgroundColor: "#ffffff"
			},
			config: {
				googleMaps: {
					apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
				}
			},
			// (Opcional) personalize notificações:
			// notification: { icon: "./assets/notification-icon.png", color: "#007AFF" },
			edgeToEdgeEnabled: true,
			package: process.env.ANDROID_PACKAGE_NAME,
			googleServicesFile: "./google-services.json"
		},

		web: {
			bundler: "metro",
			output: "static",
			favicon: "./assets/images/favicon.png"
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
					backgroundColor: "#ffffff"
				}
			],
			[
				"expo-build-properties",
				{ ios: { useFrameworks: "static" } }
			],
			[
				"expo-location",
				{
					locationAlwaysAndWhenInUsePermission: "Permitir que o $(PRODUCT_NAME) use sua localização."
				}
			],
			"expo-notifications"
		],

		experiments: { typedRoutes: true }
	}
};