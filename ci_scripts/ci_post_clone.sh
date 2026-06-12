#!/bin/sh

set -e

echo "===== XCODE CLOUD: POST CLONE ====="
echo "PWD inicial: $(pwd)"
echo "CI_WORKSPACE: $CI_WORKSPACE"
echo "CI_PRIMARY_REPOSITORY_PATH: $CI_PRIMARY_REPOSITORY_PATH"

echo "===== ENTRANDO NO APP ====="
cd "$CI_PRIMARY_REPOSITORY_PATH/fisiovet-app"

echo "PWD atual: $(pwd)"

echo "===== VERSÕES ====="
node -v
npm -v
pod --version

echo "===== INSTALANDO DEPENDÊNCIAS JS ====="
npm install

echo "===== INSTALANDO PODS ====="
cd ios
pod install --repo-update

echo "===== VALIDANDO PODS-FISIOVET ====="
ls -la "Pods/Target Support Files/Pods-FisioVet/" || true

echo "===== POST CLONE FINALIZADO ====="
