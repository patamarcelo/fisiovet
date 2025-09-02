module.exports = function (api) {
	api.cache(true);
	return {
		presets: ["babel-preset-expo"],
		plugins: [
			[
				"module-resolver",
				{
					root: ["./"], // <— importante
					alias: { "@": "./" }, // ou './src' se você usa src/
					extensions: [".js", ".jsx", ".ts", ".tsx", ".json"]
				}
			],
			"react-native-reanimated/plugin" // sempre por último
		]
	};
};
