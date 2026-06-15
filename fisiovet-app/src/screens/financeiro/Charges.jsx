import React from "react";
import { Text, View } from "react-native";

export default function Charges() {
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
        Cobranças
      </Text>

      <Text style={{ marginTop: 8 }}>
        Integrações com meios de pagamento serão adicionadas futuramente.
      </Text>
    </View>
  );
}
