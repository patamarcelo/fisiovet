// app/(phone)/_layout.jsx
//@ts-nocheck
import React from "react";
import { NativeTabs, Icon, Label } from "expo-router/unstable-native-tabs";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";

export default function PhoneTabsLayout() {
	const colorScheme = useColorScheme();
	const colors = Colors[colorScheme ?? "light"];

	return (
		<NativeTabs
			tintColor={colors.tint}
			backgroundColor={colorScheme === "dark" ? "#111827" : "#F5F5F7"}
			blurEffect={
				colorScheme === "dark"
					? "systemChromeMaterialDark"
					: "systemChromeMaterial"
			}
			labelStyle={{
				fontSize: 9,
				fontWeight: "600",
				letterSpacing: -0.15,
			}}
			// unstable_nativeProps={{
			// 	ios: {
			// 		minimizeBehavior: "onScrollDown",
			// 	},
			// }}
		>
			<NativeTabs.Trigger name="index">
				<Icon sf="house.fill" />
				<Label>Home</Label>
			</NativeTabs.Trigger>

			<NativeTabs.Trigger name="tutores">
				<Icon sf="person.2.fill" />
				<Label>Tutores</Label>
			</NativeTabs.Trigger>

			<NativeTabs.Trigger name="pacientes">
				<Icon sf="pawprint.fill" />
				<Label>Pets</Label>
			</NativeTabs.Trigger>

			<NativeTabs.Trigger name="agenda">
				<Icon sf="calendar" />
				<Label>Agenda</Label>
			</NativeTabs.Trigger>

			<NativeTabs.Trigger name="financeiro">
				<Icon sf="banknote.fill" />
				<Label>Financeiro</Label>
			</NativeTabs.Trigger>

			<NativeTabs.Trigger name="biblioteca">
				<Icon sf="book.fill" />
				<Label>Biblioteca</Label>
			</NativeTabs.Trigger>
		</NativeTabs>
	);
}