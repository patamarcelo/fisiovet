const fs = require("fs");
const path = require("path");

const versionPath = path.join(__dirname, "..", "version.json");

const mode = process.argv[2] || "build";
// modos possíveis:
// build  -> incrementa só buildNumber/versionCode
// patch  -> incrementa 1.0.17 para 1.0.18
// minor  -> incrementa 1.0.17 para 1.1.0
// major  -> incrementa 1.0.17 para 2.0.0

if (!fs.existsSync(versionPath)) {
	console.error("version.json não encontrado.");
	process.exit(1);
}

const versionInfo = JSON.parse(fs.readFileSync(versionPath, "utf8"));

function parseVersion(version) {
	const parts = String(version).split(".").map(Number);

	if (parts.length !== 3 || parts.some(Number.isNaN)) {
		throw new Error(`Versão inválida: ${version}. Use formato x.y.z`);
	}

	return parts;
}

let [major, minor, patch] = parseVersion(versionInfo.version);

if (mode === "patch") {
	patch += 1;
} else if (mode === "minor") {
	minor += 1;
	patch = 0;
} else if (mode === "major") {
	major += 1;
	minor = 0;
	patch = 0;
} else if (mode !== "build") {
	console.error(`Modo inválido: ${mode}`);
	console.error("Use: build, patch, minor ou major");
	process.exit(1);
}

versionInfo.version = `${major}.${minor}.${patch}`;
versionInfo.iosBuildNumber = Number(versionInfo.iosBuildNumber || 0) + 1;
versionInfo.androidVersionCode = Number(versionInfo.androidVersionCode || 0) + 1;

fs.writeFileSync(versionPath, JSON.stringify(versionInfo, null, 2) + "\n");

console.log("Versão atualizada:");
console.log(`version: ${versionInfo.version}`);
console.log(`iosBuildNumber: ${versionInfo.iosBuildNumber}`);
console.log(`androidVersionCode: ${versionInfo.androidVersionCode}`);