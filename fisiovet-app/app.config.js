// app.config.js
require("dotenv").config();

const fs = require("fs");
const path = require("path");

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
const versionPath = path.join(__dirname, "version.json");
const bumpMarkerPath = path.join(__dirname, ".last-prebuild-bump");

function readVersionInfo() {
	return JSON.parse(fs.readFileSync(versionPath, "utf8"));
}

function writeVersionInfo(versionInfo) {
	fs.writeFileSync(versionPath, JSON.stringify(versionInfo, null, 2) + "\n");
}

function bumpPatchVersion(version) {
	const parts = String(version).split(".").map(Number);

	if (parts.length !== 3 || parts.some(Number.isNaN)) {
		throw new Error(`Versão inválida: ${version}. Use o formato x.y.z`);
	}

	const [major, minor, patch] = parts;

	return `${major}.${minor}.${patch + 1}`;
}

function isExpoPrebuildCommand() {
	const argv = process.argv.join(" ");

	return argv.includes("prebuild") && process.env.SKIP_VERSION_BUMP !== "1";
}

function bumpVersionOnce() {
	// Evita incrementar mais de uma vez se o Expo ler o app.config.js várias vezes no mesmo comando
	const now = Date.now();

	try {
		const markerStat = fs.statSync(bumpMarkerPath);
		const secondsSinceLastBump = (now - markerStat.mtimeMs) / 1000;

		if (secondsSinceLastBump < 60) {
			console.log("Version bump ignorado: já executado recentemente.");
			return;
		}
	} catch (_) {
		// marker ainda não existe
	}

	const versionInfo = readVersionInfo();

	versionInfo.version = bumpPatchVersion(versionInfo.version);
	versionInfo.iosBuildNumber = Number(versionInfo.iosBuildNumber || 0) + 1;
	versionInfo.androidVersionCode = Number(versionInfo.androidVersionCode || 0) + 1;

	writeVersionInfo(versionInfo);
	fs.writeFileSync(bumpMarkerPath, String(now));

	console.log("Versão incrementada automaticamente:");
	console.log(`version: ${versionInfo.version}`);
	console.log(`iosBuildNumber: ${versionInfo.iosBuildNumber}`);
	console.log(`androidVersionCode: ${versionInfo.androidVersionCode}`);
}

if (isExpoPrebuildCommand()) {
	bumpVersionOnce();
}

const versionInfo = readVersionInfo();

const versionControl = versionInfo.version;

const iosBuildNumber = String(
	process.env.IOS_BUILD_NUMBER || versionInfo.iosBuildNumber
);

const androidVersionCode = Number(
	process.env.ANDROID_VERSION_CODE || versionInfo.androidVersionCode
);

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
			buildNumber: iosBuildNumber,
			bundleIdentifier: process.env.IOS_BUNDLE_IDENTIFIER,
			scheme: "fisiovetapp",
			googleServicesFile: "./GoogleService-Info.plist",
			infoPlist: {
				UIUserInterfaceStyle: "Light",
				ITSAppUsesNonExemptEncryption: false,
				
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
			versionCode: androidVersionCode,
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
						backgroundColor: "#F7F8FA",
					},
				},
			],

			[
				"@react-native-google-signin/google-signin",
				{
					iosUrlScheme:
						"com.googleusercontent.apps.629108942932-pt4mjadm9028fn4kjovqoe3h1trebaj8",
				},
			],

			"./plugins/withIosModularHeaders",
			"./plugins/withIosRemoveGoogleMapsPod",
			"./plugins/withXcodeCloudScripts",

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