import React from 'react';
import { Text } from 'react-native';
import Screen from '../_ui/Screen';
import { useThemeColor } from "@/hooks/useThemeColor";
import { SafeAreaView } from 'react-native-safe-area-context';

export default function FinanceiroIndex() {
  const bg = useThemeColor({}, "background");
  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: bg, marginBottom: 0, padding: 10 }}
      edges={["top"]}
    >
      <Screen

      >
        <Text style={{ fontSize: 20, fontWeight: '700' }}>Financeiro</Text>
        <Text>Resumo: a receber, recebidos, inadimplência</Text>
      </Screen>
    </SafeAreaView>
  );
}
