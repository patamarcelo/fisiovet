#!/bin/sh

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
