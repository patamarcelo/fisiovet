// plugins/withIosModularHeaders.js
const {
	withPodfile,
} = require("@expo/config-plugins");

module.exports = function withIosModularHeaders(
	config
) {
	return withPodfile(
		config,
		(config) => {
			let contents =
				config.modResults.contents;

			if (
				contents.includes(
					"use_modular_headers!"
				)
			) {
				return config;
			}

			const platformRegex =
				/platform :ios,[^\n]*\n/;

			if (
				platformRegex.test(
					contents
				)
			) {
				contents =
					contents.replace(
						platformRegex,
						(match) =>
							`${match}\nuse_modular_headers!\n`
					);
			} else {
				contents =
					`use_modular_headers!\n\n${contents}`;
			}

			config.modResults.contents =
				contents;

			return config;
		}
	);
};