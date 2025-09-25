// src/screens/config/Index.jsx (ou onde preferir)
// @ts-nocheck
import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Switch,
  ScrollView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useThemeColor } from '@/hooks/useThemeColor';
import { IconSymbol } from '@/components/ui/IconSymbol';
import Screen from '../_ui/Screen';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import FontAwesome from '@expo/vector-icons/FontAwesome';


function SectionLabel({ children }) {
  return (
    <Text style={{ fontSize: 12, fontWeight: '700', color: '#6B7280', marginHorizontal: 16, marginTop: 22, marginBottom: 8 }}>
      {children}
    </Text>
  );
}

function Group({ children, bg }) {
  return (
    <View style={[styles.group, { backgroundColor: bg }]}>
      {children}
    </View>
  );
}

// Divisor fino entre as células (estilo iOS)
function Divider() {
  return <View style={styles.divider} />;
}

// Célula padrão com ícone à esquerda, título, valor à direita e chevron
function Cell({ title, subtitle, value, leftIcon, onPress, rightIcon = 'chevron.right', disabled, subtleColor, textColor }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.cell, pressed && { opacity: 0.85 }]}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <View style={styles.cellLeft}>
        {!!leftIcon && (
          <View style={[styles.iconBadge, { backgroundColor: '#007AFF' }]}>
            <IconSymbol name={leftIcon} size={16} color="#fff" />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={[styles.cellTitle, { color: textColor }]} numberOfLines={1}>
            {title}
          </Text>
          {!!subtitle && (
            <Text style={[styles.cellSubtitle, { color: subtleColor }]} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>

      {!!value && <Text style={[styles.cellValue, { color: subtleColor }]} numberOfLines={1}>{value}</Text>}
      {!!rightIcon && <IconSymbol name={rightIcon} size={14} color={subtleColor} />}
    </Pressable>
  );
}

// Célula com Switch (sem navegação)
function CellSwitch({ title, subtitle, value, onValueChange, leftIcon, subtleColor, textColor }) {
  return (
    <View style={styles.cell}>
      <View style={styles.cellLeft}>
        {!!leftIcon && (
          <View style={[styles.iconBadge, { backgroundColor: '#34C759' }]}>
            <IconSymbol name={leftIcon} size={16} color="#fff" />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={[styles.cellTitle, { color: textColor }]} numberOfLines={1}>{title}</Text>
          {!!subtitle && (
            <Text style={[styles.cellSubtitle, { color: subtleColor }]} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>
      <Switch value={value} onValueChange={onValueChange} />
    </View>
  );
}

// Célula “texto à direita” (valor editável futuramente via modal)
function CellValue({ title, value, onPress, leftIcon, subtleColor, textColor }) {
  const isString = typeof value === 'string' || typeof value === 'number';

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.cell, pressed && { opacity: 0.85 }]}>
      <View style={styles.cellLeft}>
        {!!leftIcon && (
          <View style={[styles.iconBadge, { backgroundColor: '#8E8E93' }]}>
            <IconSymbol name={leftIcon} size={16} color="#fff" />
          </View>
        )}
        <Text style={[styles.cellTitle, { color: textColor }]} numberOfLines={1}>
          {title}
        </Text>
      </View>

      {isString ? (
        <Text style={[styles.cellValue, { color: subtleColor }]} numberOfLines={1}>
          {value}
        </Text>
      ) : (
        <View style={{ marginRight: 6 }}>{value}</View>
      )}

      <IconSymbol name="chevron.right" size={14} color={subtleColor} />
    </Pressable>
  );
}

export default function ConfigIndex() {
  // cores do tema
  const bgScreen = useThemeColor({ light: '#F2F2F7', dark: '#000000' }, 'background');
  const card = useThemeColor({ light: '#FFFFFF', dark: '#1C1C1E' }, 'background');
  const text = useThemeColor({}, 'text');
  const subtle = useThemeColor({ light: '#6B7280', dark: '#9AA0A6' }, 'text');
  const tint = useThemeColor({}, 'tint');

  // estados locais (exemplo; depois pode ligar no Redux)
  const [notifAgenda, setNotifAgenda] = useState(true);
  const [notifLembretes, setNotifLembretes] = useState(false);
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);

  return (
    <View style={[styles.screen, { backgroundColor: bgScreen }]}>
      <ScrollView
        // ESSENCIAL para largeTitle não “sobrepor”
        contentInsetAdjustmentBehavior="automatic"
        automaticallyAdjustsScrollIndicatorInsets
        scrollEventThrottle={16}
        showsVerticalScrollIndicator
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        {/* CONTA */}
        <SectionLabel>CONTA</SectionLabel>
        <Group bg={card}>
          <Cell
            title="Usuário"
            subtitle="Dados pessoais e credenciais"
            leftIcon="person.crop.circle.fill"
            value=""
            onPress={() => router.push('/configuracoes/perfil')}
            subtleColor={subtle}
            textColor={text}
          />
          <Divider />
          <Cell
            title="Assinatura"
            subtitle="Plano atual e faturamento"
            leftIcon="creditcard.fill"
            value="Plano Free"
            onPress={() => router.push('/configuracoes/assinatura')}
            subtleColor={subtle}
            textColor={text}
          />
        </Group>

        {/* APARÊNCIA */}
        <SectionLabel>APARÊNCIA</SectionLabel>
        <Group bg={card}>
          <Cell
            title="Tema"
            subtitle="Claro / Escuro / Automático"
            leftIcon="paintbrush.fill"
            value="Automático"
            onPress={() => router.push('/configuracoes/aparencia')}
            subtleColor={subtle}
            textColor={text}
          />
          <Divider />
          <Cell
            title="Tamanho da fonte"
            subtitle="Ajuste o tamanho do texto no app"
            leftIcon="textformat.size"
            value="Padrão"
            onPress={() => router.push('/configuracoes/fonte')}
            subtleColor={subtle}
            textColor={text}
          />
        </Group>

        {/* AGENDA */}
        <SectionLabel>AGENDA</SectionLabel>
        <Group bg={card}>
          <CellValue
            title="Duração padrão"
            value="01:00"
            leftIcon="clock.fill"
            onPress={() => router.push('/configuracoes/agenda/duracao')}
            subtleColor={subtle}
            textColor={text}
          />
          <Divider />
          <CellValue
            title="Início do dia"
            value="08:00"
            leftIcon="sunrise.fill"
            onPress={() => router.push('/configuracoes/agenda/inicio')}
            subtleColor={subtle}
            textColor={text}
          />
          <Divider />
        </Group>
        {/* INTEGRACOES */}
        <SectionLabel>INTEGRAÇÕES</SectionLabel>
        <Group bg={card}>
          <CellValue
            title="Integração Google Agenda"
            value={
              isGoogleConnected ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <FontAwesome name="check-circle" size={20} color="#16A34A" />
                </View>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons name="close-circle" size={20} color="#EF4444" />
                </View>
              )
            }
            leftIcon="calendar"
            onPress={() => router.push('/configuracoes/agenda')}
            subtleColor={subtle}
            textColor={text}
          />
          <Divider />
          <CellValue
            title="Integração Asaas"
            value={
              !isGoogleConnected ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <FontAwesome name="check-circle" size={20} color="#16A34A" />
                </View>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons name="close-circle" size={20} color="#EF4444" />
                </View>
              )
            }
            leftIcon="money.fill"
            onPress={() => router.push('/configuracoes/asaas')}
            subtleColor={subtle}
            textColor={text}
          />
        </Group>

        {/* NOTIFICAÇÕES */}
        <SectionLabel>NOTIFICAÇÕES</SectionLabel>
        <Group bg={card}>
          <CellSwitch
            title="Lembretes de eventos"
            subtitle="Alertas antes das consultas"
            leftIcon="bell.fill"
            value={notifAgenda}
            onValueChange={setNotifAgenda}
            subtleColor={subtle}
            textColor={text}
          />
          <Divider />
          <CellSwitch
            title="Lembretes de tarefas"
            subtitle="Checklist pré-atendimento"
            leftIcon="checkmark.seal.fill"
            value={notifLembretes}
            onValueChange={setNotifLembretes}
            subtleColor={subtle}
            textColor={text}
          />
        </Group>

        {/* DADOS & BACKUP */}
        <SectionLabel>DADOS & BACKUP</SectionLabel>
        <Group bg={card}>
          <Cell
            title="Backup local"
            subtitle="Exportar dados para arquivo"
            leftIcon="externaldrive.fill"
            onPress={() => router.push('/configuracoes/backup')}
            subtleColor={subtle}
            textColor={text}
          />
          <Divider />
          <Cell
            title="Restaurar backup"
            subtitle="Importar de arquivo .json"
            leftIcon="arrow.down.doc.fill"
            onPress={() => router.push('/configuracoes/restaurar')}
            subtleColor={subtle}
            textColor={text}
          />
          <Divider />
          <Cell
            title="Limpar dados"
            subtitle="Zerar dados locais do app"
            leftIcon="trash.fill"
            onPress={() => router.push('/configuracoes/limpar')}
            subtleColor={subtle}
            textColor={text}
          />
        </Group>

        {/* SOBRE */}
        <SectionLabel>SOBRE</SectionLabel>
        <Group bg={card}>
          <Cell
            title="Termos & Privacidade"
            leftIcon="doc.text.fill"
            onPress={() => router.push('/configuracoes/termos')}
            subtleColor={subtle}
            textColor={text}
          />
          <Divider />
          <Cell
            title="Versão"
            value="1.0.0"
            leftIcon="info.circle.fill"
            onPress={() => { }}
            subtleColor={subtle}
            textColor={text}
          />
        </Group>

        {/* Rodapé opcional */}
        <Text style={{ fontSize: 12, color: subtle, textAlign: 'center', marginTop: 16 }}>
          FisioVet • Configurações
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },

  group: {
    marginHorizontal: 14,
    borderRadius: 12,
    overflow: 'hidden',
    // sombra sutil no iOS e elevação no Android, como em Ajustes
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },

  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Platform.OS === 'ios' ? 'rgba(60,60,67,0.29)' : '#E5E7EB',
    marginLeft: 56, // alinha com início do texto, deixando ícone “fora” do corte
  },

  cell: {
    minHeight: 54,
    paddingHorizontal: 14,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  cellLeft: { flexDirection: 'row', gap: 10, alignItems: 'center', flex: 1 },

  iconBadge: {
    width: 26,
    height: 26,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },

  cellTitle: { fontSize: 16, fontWeight: '600' },
  cellSubtitle: { fontSize: 12, marginTop: 2 },
  cellValue: { fontSize: 14, marginRight: 6, maxWidth: 130, textAlign: 'right' },
});