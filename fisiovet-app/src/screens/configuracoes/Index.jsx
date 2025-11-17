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
  ActivityIndicator,
  Alert
} from 'react-native';
import { router } from 'expo-router';
import { useThemeColor } from '@/hooks/useThemeColor';
import { IconSymbol } from '@/components/ui/IconSymbol';
import Screen from '../_ui/Screen';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { useSelector } from 'react-redux';
import { useColorMode } from '@/src/theme/color-scheme';
import { selectDefaultDuracao, selectStartOfDay } from '@/src/store/slices/systemSlice';


import { signOut } from '@react-native-firebase/auth';
import { useDispatch } from 'react-redux';
import { setUser } from '@/src/store/slices/userSlice';
import { ensureFirebase } from '@/firebase/firebase';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

import auth from '@react-native-firebase/auth';
import * as SecureStore from 'expo-secure-store';
import { clearSession } from '@/src/store/sessionActions';

import { persistor } from "@/src/store";
import { Image } from 'expo-image';
import { openWhatsapp } from '@/src/utils/openWhatsapp';

import { selectNavPreference } from '@/src/store/slices/systemSlice';





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
function Cell({ title, subtitle, value, leftIcon, leftImageSource, onPress, rightIcon = 'chevron.right', disabled, subtleColor, textColor, loading }) {
  const badgeStyle = leftImageSource
    ? [styles.iconBadge, { backgroundColor: 'transparent', padding: 0 }]
    : [styles.iconBadge, { backgroundColor: '#25D366' }]; // verde Whats padrão p/ ícone SF, se usar

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.cell, pressed && { opacity: 0.85 }]}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <View style={styles.cellLeft}>
        {!!(leftIcon || leftImageSource) && (
          <View style={badgeStyle}>
            {leftImageSource ? (
              <Image source={leftImageSource} style={styles.iconImage} />
            ) : (
              <IconSymbol name={leftIcon} size={16} color="#fff" />
            )}
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

      {loading ? (
        <ActivityIndicator size="small" />
      ) : (
        !!value && <Text style={[styles.cellValue, { color: subtleColor }]} numberOfLines={1}>{value}</Text>
      )}
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
  const getColor = title.includes("Integração") || title.includes('Navegação') ? "#8B5CF6" : "#8E8E93"

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.cell, pressed && { opacity: 0.85 }]}>
      <View style={styles.cellLeft}>
        {!!leftIcon && (
          <View style={[styles.iconBadge, { backgroundColor: getColor }]}>
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
  const { mode, scheme } = useColorMode();

  const fb = ensureFirebase()
  const dispatch = useDispatch();
  const [loggingOut, setLoggingOut] = useState(false);
  const [loading, setLoading] = useState(false);




  const handleLogout = async () => {
    try {
      setLoggingOut(true);

      const user = auth().currentUser;
      const loggedWithGoogle = user?.providerData?.some(p => p.providerId === "google.com");

      if (loggedWithGoogle) {
        // seguro chamar mesmo sem estar logado no Google
        await GoogleSignin.revokeAccess().catch(() => { });
        await GoogleSignin.signOut().catch(() => { });
      }

      await auth().signOut();

      // 🔒 trava persist, esvazia buffer e apaga storage
      persistor.pause();
      await persistor.flush();
      // dispara reset na memória (zera todos os slices)
      dispatch(clearSession());
      // remove tudo do AsyncStorage
      await persistor.purge();

      // navega para login
      router.replace("/(auth)/login");
    } catch (e) {
      console.warn("Erro ao sair:", e);
      Alert.alert("Erro", "Não foi possível sair da conta.");
    } finally {
      setLoggingOut(false);
    }
  };

  const handleCallSupport = async () => {
    setLoading(true);
    try {
      const fb = ensureFirebase();
      if (!fb) {
        Alert.alert('Suporte', 'Firebase não inicializado.');
        return;
      }

      // RN Firebase (namespaced): firestoreModule().collection(...).limit(1).get()
      const snap = await fb.firestoreModule().collection('suport').limit(1).get();

      if (snap.empty) {
        Alert.alert('Suporte', 'Nenhum número de suporte encontrado.');
        return;
      }

      const data = snap.docs[0].data() || {};
      const phone =
        data.celphone ?? data.cellphone ?? data.whatsapp ?? data.phone ?? null;

      if (!phone) {
        Alert.alert('Suporte', 'Campo de telefone não encontrado.');
        return;
      }
      console.log('phone: ', phone)
      const formatPhone = `+${phone}`
      openWhatsapp(formatPhone, 'Olá! Preciso de suporte no FisioVet.');
    } catch (err) {
      console.log(err);
      Alert.alert('Suporte', 'Erro ao buscar o número de suporte.');
    } finally {
      setLoading(false);
    }
  };


  // VALORES DEFAULTS
  // TEMA
  const modeLabel =
    mode === 'light' ? 'Claro'
      : mode === 'dark' ? 'Escuro'
        : 'Automático';
  const subtitleTema =
    mode === 'system' ? `Ativo: ${scheme === 'dark' ? 'Escuro' : 'Claro'}` : 'Claro / Escuro / Automático';

  // DURACAO
  const defaultDur = useSelector(selectDefaultDuracao);
  const defaultStartDay = useSelector(selectStartOfDay);
  
  //sistema de navegacao
  const navPreference = useSelector(selectNavPreference);


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
            value={modeLabel}
            subtitle={subtitleTema}
            onPress={() => router.push('/configuracoes/aparencia')}
            subtleColor={subtle}
            textColor={text}
          // disabled
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
            value={defaultDur}
            leftIcon="clock.fill"
            onPress={() => router.push('/configuracoes/duration')}
            subtleColor={subtle}
            textColor={text}
          />
          <Divider />
          <CellValue
            title="Início do dia"
            value={defaultStartDay}
            leftIcon="sunrise.fill"
            onPress={() => router.push('/configuracoes/startevent')}
            subtleColor={subtle}
            textColor={text}
          />
          <Divider />
        </Group>
        {/* INTEGRACOES */}
        <SectionLabel>INTEGRAÇÕES</SectionLabel>
        <Group bg={card}>
          <CellValue
            title="App de Navegação"
            value={navPreference}
            leftIcon="location.circle"
            onPress={() => router.push('/configuracoes/navegador')}
            subtleColor={subtle}
            textColor={text}
          />
          <Divider />
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
            leftIcon="creditcard.fill"
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
          <Divider />
          <Cell
            title="Suporte"
            value="Chamar"
            subtitle="Dúvidas, Sugestões, Reports"
            // use o seu png salvo em /assets/images/whatsapp.png (ajuste o path)
            leftImageSource={require('@/assets/images/whatsapp.png')}
            rightIcon="chevron.right"
            onPress={handleCallSupport}
            subtleColor={'#9CA3AF'}
            textColor={'#111827'}
            loading={loading}
          />
        </Group>
        <Pressable
          onPress={handleLogout}
          disabled={loggingOut}
          style={({ pressed }) => [
            {
              marginTop: 24,
              marginHorizontal: 16,
              paddingVertical: 14,
              borderRadius: 10,
              alignItems: "center",
              backgroundColor: "#EF4444", // vermelho alerta
              opacity: pressed || loggingOut ? 0.8 : 1,
              flexDirection: "row",
              justifyContent: "center",
              gap: 8,
            },
          ]}
        >
          {loggingOut ? (
            <>
              <ActivityIndicator color="#FFF" size="small" />
              <Text style={{ color: "#FFF", fontWeight: "700", fontSize: 16 }}>
                Saindo…
              </Text>
            </>
          ) : (
            <Text style={{ color: "#FFF", fontWeight: "700", fontSize: 16 }}>
              Sair
            </Text>
          )}
        </Pressable>
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
  iconImage: {
    width: 26,
    height: 26,
    resizeMode: 'contain'
  },

  cellTitle: { fontSize: 16, fontWeight: '600' },
  cellSubtitle: { fontSize: 12, marginTop: 2 },
  cellValue: { fontSize: 14, marginRight: 6, maxWidth: 130, textAlign: 'right' },
});