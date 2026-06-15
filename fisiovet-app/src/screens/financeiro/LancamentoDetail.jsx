import React from "react";
import { Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";

export default function LancamentoDetail() {
  const { id } = useLocalSearchParams();

  return (
    <View
      style={{
        flex: 1,
        padding: 16,
        backgroundColor: "#F2F2F7",
      }}
    >
      <Text
        style={{
          fontSize: 22,
          fontWeight: "800",
        }}
      >
        Detalhe financeiro
      </Text>

      <Text style={{ marginTop: 8 }}>
        Lançamento: {String(id || "")}
      </Text>
    </View>
  );
}
