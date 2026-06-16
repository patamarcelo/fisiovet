// app/(modals)/financeiro/_layout.jsx

import React from "react";
import { Stack } from "expo-router";

export default function FinanceiroModalLayout() {
	return (
		<Stack
			screenOptions={{
				headerShown: true,
				headerShadowVisible: false,
				headerBackTitleVisible: false,
				headerTitleAlign: "center",
				gestureEnabled: true,
			}}
		>
			<Stack.Screen
				name="novo"
				options={{
					title: "Novo lançamento",
					presentation: "fullScreenModal",
					animation: "slide_from_bottom",
					gestureDirection: "vertical",
				}}
			/>

			<Stack.Screen
				name="[id]"
				options={{
					title: "Lançamento",
					presentation: "card",
					animation: "slide_from_right",
					gestureDirection: "horizontal",
				}}
			/>
		</Stack>
	);
}