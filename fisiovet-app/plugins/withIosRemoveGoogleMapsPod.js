const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

function withIosRemoveGoogleMapsPod(config) {
	return withDangerousMod(config, [
		"ios",
		async (config) => {
			const podfilePath = path.join(
				config.modRequest.platformProjectRoot,
				"Podfile"
			);

			if (!fs.existsSync(podfilePath)) {
				return config;
			}

			let podfile = fs.readFileSync(podfilePath, "utf8");

			podfile = podfile
				.split("\n")
				.filter((line) => !line.includes("pod 'react-native-google-maps'"))
				.join("\n");

			fs.writeFileSync(podfilePath, podfile);

			return config;
		},
	]);
}

module.exports = withIosRemoveGoogleMapsPod;