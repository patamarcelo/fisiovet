// app.config.js

// Carrega as variáveis do arquivo .env para process.env
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

		extra: {
			eas: {
				projectId: "b5d74ed0-b6e2-497e-a9e7-b66665675e59"
			}
		},

		ios: {
			supportsTablet: true,
			bundleIdentifier: process.env.IOS_BUNDLE_IDENTIFIER,
			googleServicesFile: "./GoogleService-Info.plist" // <-- ADIÇÃO EXPLÍCITA
		},

		android: {
			adaptiveIcon: {
				foregroundImage: "./assets/images/adaptive-icon.png",
				backgroundColor: "#ffffff"
			},
			edgeToEdgeEnabled: true,
			package: process.env.ANDROID_PACKAGE_NAME,
			googleServicesFile: "./google-services.json" // <-- ADIÇÃO EXPLÍCITA
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
					imageWidth: 200,
					resizeMode: "contain",
					backgroundColor: "#ffffff"
				}
			],
			[
				"expo-build-properties",
				{
					ios: {
						useModularHeaders: true
					}
				}
			]
		],

		experiments: {
			typedRoutes: true
		}
	}
};
