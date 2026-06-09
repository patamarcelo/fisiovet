module.exports = function (api) {
	api.cache(true);

	return {
		presets: ["babel-preset-expo"],
		plugins: [
			[
				"module-resolver",
				{
					root: ["./"],
					alias: { "@": "./" },
					extensions: [".js", ".jsx", ".ts", ".tsx", ".json"],
				},
			],

			// sempre por último
			"react-native-reanimated/plugin",
		],
	};
};