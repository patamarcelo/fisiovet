// app.config.js
require("dotenv").config();

export default {
	expo: {
		name: "fisiovet-app",
		slug: "fisiovet-app",
		version: "1.0.0",
		orientation: "portrait", // iPhone em portrait por padrão
		icon: "./assets/images/icon.png",
		scheme: "fisiovetapp",
		userInterfaceStyle: "automatic",
		newArchEnabled: true,

		extra: {
			eas: { projectId: "b5d74ed0-b6e2-497e-a9e7-b66665675e59" }
		},

		// 🔹 Splash: inclua um tabletImage se tiver
		splash: {
			image: "./assets/images/splash-icon.png",
			// opcional: use uma arte maior/mais larga para iPad
			// tabletImage: "./assets/images/splash-icon-tablet.png",
			resizeMode: "contain",
			backgroundColor: "#ffffff"
		},

		ios: {
			supportsTablet: true,
			requireFullScreen: false,               // ✅ permite multitarefa no iPad
			bundleIdentifier: process.env.IOS_BUNDLE_IDENTIFIER,
			googleServicesFile: "./GoogleService-Info.plist",
			infoPlist: {
				// ✅ habilita portrait + landscape no iPad
				"UISupportedInterfaceOrientations~ipad": [
					"UIInterfaceOrientationPortrait",
					"UIInterfaceOrientationLandscapeLeft",
					"UIInterfaceOrientationLandscapeRight"
				]
			}
		},

		android: {
			adaptiveIcon: {
				foregroundImage: "./assets/images/adaptive-icon.png",
				backgroundColor: "#ffffff"
			},
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
					tabletImage: "./assets/images/splash-icon-tablet.png", // ✅
					imageWidth: 200,
					resizeMode: "contain",
					backgroundColor: "#ffffff"
				}
			],
			[
				"expo-build-properties",
				{
					ios: {
						useFrameworks: "static",
						// opcional: fixe o alvo mínimo se quiser
						// deploymentTarget: "13.4"
					}
				}
			]
		],

		experiments: { typedRoutes: true }
	}
};