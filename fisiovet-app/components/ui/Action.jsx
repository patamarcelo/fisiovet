// components/ui/Action.jsx
import React from "react";
import { Pressable, Text, StyleSheet } from "react-native";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { useThemeColor } from "@/hooks/useThemeColor";

export default function Action({ title, icon, onPress, tint }) {
    const text = useThemeColor({}, "text");
    const bg = useThemeColor(
        { light: "rgba(0,0,0,0.04)", dark: "rgba(255,255,255,0.08)" },
        "card"
    );

    return (
        <Pressable
            onPress={onPress}
            style={({ pressed }) => [
                styles.action,
                { backgroundColor: bg, opacity: pressed ? 0.7 : 1 },
            ]}
        >
            <IconSymbol name={icon} size={16} color={tint} />
            <Text style={[styles.label, { color: text }]}>{title}</Text>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    action: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 20, // 👈 mais arredondado, estilo "pill"
    },
    label: { fontSize: 14, fontWeight: "600" },
});