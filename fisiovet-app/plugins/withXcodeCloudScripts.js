const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const scriptContent = `#!/bin/sh

set -e

echo "===== XCODE CLOUD: POST CLONE ====="
echo "PWD inicial: $(pwd)"
echo "CI_PRIMARY_REPOSITORY_PATH: $CI_PRIMARY_REPOSITORY_PATH"

echo "===== ENTRANDO NO APP ====="
cd "$CI_PRIMARY_REPOSITORY_PATH/fisiovet-app"

echo "PWD atual: $(pwd)"

echo "===== VERIFICANDO NODE/NPM ====="

if ! command -v node >/dev/null 2>&1; then
  echo "Node não encontrado. Instalando via Homebrew..."
  brew install node
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm não encontrado mesmo após instalar Node."
  exit 1
fi

echo "Node:"
node -v

echo "npm:"
npm -v

echo "===== INSTALANDO DEPENDÊNCIAS JS ====="

if [ -f package-lock.json ]; then
  npm ci
else
  npm install
fi

echo "===== VERIFICANDO COCOAPODS ====="

if ! command -v pod >/dev/null 2>&1; then
  echo "CocoaPods não encontrado. Instalando via Homebrew..."
  brew install cocoapods
fi

echo "CocoaPods:"
pod --version

echo "===== INSTALANDO PODS ====="
cd ios
pod install --repo-update

echo "===== VALIDANDO PODS-FISIOVET ====="
ls -la "Pods/Target Support Files/Pods-FisioVet/"

echo "===== POST CLONE FINALIZADO ====="
`;

module.exports = function withXcodeCloudScripts(config) {
	return withDangerousMod(config, [
		"ios",
		async (config) => {
			const projectRoot = config.modRequest.projectRoot;
			const iosRoot = path.join(projectRoot, "ios");
			const scriptsDir = path.join(iosRoot, "ci_scripts");
			const scriptPath = path.join(scriptsDir, "ci_post_clone.sh");

			fs.mkdirSync(scriptsDir, { recursive: true });
			fs.writeFileSync(scriptPath, scriptContent);
			fs.chmodSync(scriptPath, 0o755);

			console.log("Xcode Cloud script criado em:", scriptPath);

			return config;
		},
	]);
};