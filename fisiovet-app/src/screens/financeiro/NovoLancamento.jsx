import React from "react";
import { Text, View } from "react-native";

export default function NovoLancamento() {
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
        Novo lançamento
      </Text>

      <Text style={{ marginTop: 8 }}>
        Criação manual de lançamento financeiro.
      </Text>
    </View>
  );
}
