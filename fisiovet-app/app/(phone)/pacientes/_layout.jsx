// app/(phone)/pacientes/_layout.jsx
// @ts-nocheck
import React from "react";
import { Stack } from "expo-router";

export const unstable_settings = {
	initialRouteName: "index",
};

export default function PacientesLayout() {
	return (
		<Stack
			screenOptions={{
				headerShown: false,
				headerLargeTitle: false,
				animation: "slide_from_right",
			}}
		>
			<Stack.Screen
				name="index"
				options={{
					title: "Pets",
					headerShown: true,
					headerLargeTitle: false,
					headerShadowVisible: false,
				}}
			/>

			<Stack.Screen
				name="[id]"
				options={{
					title: "Detalhe",
					headerShown: true,
					headerLargeTitle: false,
					headerShadowVisible: false,
				}}
			/>

			<Stack.Screen
				name="[id]/exam"
				options={{
					title: "Exames",
					headerShown: true,
					headerLargeTitle: false,
					headerShadowVisible: false,
				}}
			/>

			<Stack.Screen
				name="[id]/avaliacao"
				options={{
					title: "Avaliações",
					headerShown: true,
					headerLargeTitle: false,
					headerShadowVisible: false,
				}}
			/>
		</Stack>
	);
}