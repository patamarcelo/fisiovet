// eslint.config.js
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
	expoConfig,
	{
		rules: {
			"import/no-unresolved": "off" // se ele estiver reclamando do require
		},
		// Garante que o ESLint parseie JSX e ES moderno
		languageOptions: {
			ecmaVersion: "latest",
			sourceType: "module",
			ecmaFeatures: { jsx: true }
		},
		settings: {
			"import/resolver": {
				// resolve imports de node_modules (inclui expo-status-bar)
				node: {
					extensions: [".js", ".jsx", ".json"]
				},
				// resolve caminhos com '@'
				alias: {
					map: [["@", "."]], // ou ['./src'] se usar src/
					extensions: [".js", ".jsx", ".json"]
				},
				// entende plataforma RN (ios/android/native)
				"react-native": {
					platform: "ios",
					extensions: [
						".ios.js",
						".android.js",
						".native.js",
						".js",
						".jsx",
						".json"
					]
				}
			},
			// (opcional) evita que o plugin tente analisar node_modules
			"import/ignore": ["node_modules"]
		},
		ignores: ["dist/*"]
	}
]);
