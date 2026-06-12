#!/bin/sh

set -e

echo "===== XCODE CLOUD: POST CLONE ====="
echo "PWD inicial: $(pwd)"
echo "CI_WORKSPACE: $CI_WORKSPACE"

echo "===== ENTRANDO NO PROJETO ====="
cd "$CI_WORKSPACE/fisiovet-app"

echo "PWD atual: $(pwd)"

echo "===== INSTALANDO DEPENDÊNCIAS JS ====="
npm install

echo "===== INSTALANDO PODS ====="
cd ios
pod install --repo-update

echo "===== PODS INSTALADOS COM SUCESSO ====="
