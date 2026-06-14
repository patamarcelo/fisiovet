// src/screens/config/Index.jsx
// @ts-nocheck

import React, { useLayoutEffect, useState } from "react";

import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View
} from "react-native";

import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import Constants from "expo-constants";
import { router, useNavigation } from "expo-router";
import {
  SafeAreaView,
  useSafeAreaInsets
} from "react-native-safe-area-context";

import { Ionicons } from "@expo/vector-icons";
import FontAwesome from "@expo/vector-icons/FontAwesome";

import { useDispatch, useSelector } from "react-redux";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { signOut } from "firebase/auth";

import { useThemeColor } from "@/hooks/useThemeColor";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { useColorMode } from "@/src/theme/color-scheme";

import {
  selectDefaultDuracao,
  selectGoogleCalendarIntegration,
  selectNavPreference,
  selectStartOfDay
} from "@/src/store/slices/systemSlice";

import { clearSession } from "@/src/store/sessionActions";
import { persistor } from "@/src/store";

import { auth } from "@/src/services/firebaseClient";
import { ensureFirebase } from "@/firebase/firebase";
import { openWhatsapp } from "@/src/utils/openWhatsapp";

const HOME_LOGO = require("../../../assets/images/splash-fisiovet.png");

const HEADER_HEIGHT = 108;
const HEADER_CONTENT_HEIGHT = 108;

function SectionLabel({ children }) {
  return (
    <Text style={styles.sectionLabel}>
      {children}
    </Text>
  );
}

function Group({ children, bg }) {
  return (
    <View
      style={[
        styles.group,
        {
          backgroundColor: bg
        }
      ]}
    >
      {children}
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

function Cell({
  title,
  subtitle,
  value,
  leftIcon,
  leftImageSource,
  onPress,
  rightIcon = "chevron.right",
  disabled,
  subtleColor,
  textColor,
  loading,
  destructive
}) {
  const badgeStyle = leftImageSource
    ? [
      styles.iconBadge,
      styles.transparentIconBadge
    ]
    : [
      styles.iconBadge,
      {
        backgroundColor: destructive
          ? "#EF4444"
          : "#25D366"
      }
    ];

  const titleColor = destructive
    ? "#EF4444"
    : textColor;

  const finalSubtle = destructive
    ? "#FCA5A5"
    : subtleColor;

  const hasValue =
    value !== undefined &&
    value !== null &&
    value !== "";

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.cell,
        pressed &&
        !disabled &&
        styles.cellPressed,
        disabled && styles.cellDisabled
      ]}
      accessibilityRole={
        disabled ? "text" : "button"
      }
      accessibilityLabel={title}
      accessibilityState={{
        disabled: !!disabled
      }}
    >
      <View style={styles.cellLeft}>
        {!!(leftIcon || leftImageSource) && (
          <View style={badgeStyle}>
            {leftImageSource ? (
              <Image
                source={leftImageSource}
                style={styles.iconImage}
                contentFit="contain"
              />
            ) : (
              <IconSymbol
                name={leftIcon}
                size={16}
                color="#FFFFFF"
              />
            )}
          </View>
        )}

        <View style={styles.cellTextContainer}>
          <Text
            style={[
              styles.cellTitle,
              {
                color: titleColor
              }
            ]}
            numberOfLines={1}
          >
            {title}
          </Text>

          {!!subtitle && (
            <Text
              style={[
                styles.cellSubtitle,
                {
                  color: finalSubtle
                }
              ]}
              numberOfLines={1}
            >
              {subtitle}
            </Text>
          )}

          {disabled && (
            <Text
              style={[
                styles.cellSubtitle,
                {
                  color: finalSubtle
                }
              ]}
              numberOfLines={1}
            >
              Em breve
            </Text>
          )}
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="small" />
      ) : (
        hasValue && (
          <Text
            style={[
              styles.cellValue,
              {
                color: finalSubtle
              }
            ]}
            numberOfLines={1}
          >
            {value}
          </Text>
        )
      )}

      {!disabled && !!rightIcon && (
        <IconSymbol
          name={rightIcon}
          size={14}
          color={finalSubtle}
        />
      )}
    </Pressable>
  );
}

function CellSwitch({
  title,
  subtitle,
  value,
  onValueChange,
  leftIcon,
  subtleColor,
  textColor,
  disabled
}) {
  return (
    <View
      style={[
        styles.cell,
        disabled && styles.cellDisabled
      ]}
    >
      <View style={styles.cellLeft}>
        {!!leftIcon && (
          <View
            style={[
              styles.iconBadge,
              {
                backgroundColor: "#34C759"
              }
            ]}
          >
            <IconSymbol
              name={leftIcon}
              size={16}
              color="#FFFFFF"
            />
          </View>
        )}

        <View style={styles.cellTextContainer}>
          <Text
            style={[
              styles.cellTitle,
              {
                color: textColor
              }
            ]}
            numberOfLines={1}
          >
            {title}
          </Text>

          {!!subtitle && (
            <Text
              style={[
                styles.cellSubtitle,
                {
                  color: subtleColor
                }
              ]}
              numberOfLines={1}
            >
              {subtitle}
            </Text>
          )}

          {disabled && (
            <Text
              style={[
                styles.cellSubtitle,
                {
                  color: subtleColor
                }
              ]}
              numberOfLines={1}
            >
              Em breve
            </Text>
          )}
        </View>
      </View>

      <Switch
        value={value}
        onValueChange={
          disabled
            ? undefined
            : onValueChange
        }
        disabled={!!disabled}
      />
    </View>
  );
}

function CellValue({
  title,
  value,
  onPress,
  leftIcon,
  subtleColor,
  textColor,
  disabled,
  subtitle
}) {
  const isPrimitiveValue =
    typeof value === "string" ||
    typeof value === "number";

  const badgeColor =
    title.includes("Integração") ||
      title.includes("Navegação") ||
      title.includes("Assinar calendário")
      ? "#8B5CF6"
      : "#8E8E93";

  const leftContent = (
    <View style={styles.cellLeft}>
      {!!leftIcon && (
        <View
          style={[
            styles.iconBadge,
            {
              backgroundColor: badgeColor
            }
          ]}
        >
          <IconSymbol
            name={leftIcon}
            size={16}
            color="#FFFFFF"
          />
        </View>
      )}

      <View style={styles.cellTextContainer}>
        <Text
          style={[
            styles.cellTitle,
            {
              color: textColor
            }
          ]}
          numberOfLines={1}
        >
          {title}
        </Text>

        {!!subtitle && (
          <Text
            style={[
              styles.cellSubtitle,
              {
                color: subtleColor
              }
            ]}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        )}

        {disabled && (
          <Text
            style={[
              styles.cellSubtitle,
              {
                color: subtleColor
              }
            ]}
            numberOfLines={1}
          >
            Em breve
          </Text>
        )}
      </View>
    </View>
  );

  const rightContent = isPrimitiveValue ? (
    <Text
      style={[
        styles.cellValue,
        {
          color: subtleColor
        }
      ]}
      numberOfLines={1}
    >
      {value}
    </Text>
  ) : (
    <View style={styles.customRightValue}>
      {value}
    </View>
  );

  if (disabled) {
    return (
      <View
        style={[
          styles.cell,
          styles.cellDisabled
        ]}
        accessibilityRole="text"
        accessibilityLabel={title}
        accessibilityState={{
          disabled: true
        }}
      >
        {leftContent}
        {rightContent}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.cell,
        pressed && styles.cellPressed
      ]}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      {leftContent}

      {rightContent}

      <IconSymbol
        name="chevron.right"
        size={14}
        color={subtleColor}
      />
    </Pressable>
  );
}

export default function ConfigIndex() {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const totalHeaderHeight =
    insets.top + HEADER_CONTENT_HEIGHT;

  const bgScreen = useThemeColor(
    {
      light: "#F2F2F7",
      dark: "#000000"
    },
    "background"
  );

  const card = useThemeColor(
    {
      light: "#FFFFFF",
      dark: "#1C1C1E"
    },
    "background"
  );

  const text = useThemeColor({}, "text");

  const subtle = useThemeColor(
    {
      light: "#6B7280",
      dark: "#9AA0A6"
    },
    "text"
  );

  const tint = useThemeColor({}, "tint");

  const { mode, scheme } = useColorMode();

  const [loggingOut, setLoggingOut] =
    useState(false);

  const [
    loadingSupport,
    setLoadingSupport
  ] = useState(false);

  const [notifAgenda, setNotifAgenda] =
    useState(true);

  const [
    notifLembretes,
    setNotifLembretes
  ] = useState(false);

  const defaultDur = useSelector(
    selectDefaultDuracao
  );

  const defaultStartDay = useSelector(
    selectStartOfDay
  );

  const navPreference = useSelector(
    selectNavPreference
  );

  const googleCalendar = useSelector(
    selectGoogleCalendarIntegration
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false
    });
  }, [navigation]);

  const handleGoBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    router.replace("/");
  };

  const handleLogout = async () => {
    try {
      setLoggingOut(true);

      const user = auth.currentUser;

      const loggedWithGoogle =
        user?.providerData?.some(
          provider =>
            provider.providerId ===
            "google.com"
        );

      if (loggedWithGoogle) {
        await GoogleSignin.revokeAccess().catch(
          () => { }
        );

        await GoogleSignin.signOut().catch(
          () => { }
        );
      }

      await signOut(auth);

      persistor.pause();
      await persistor.flush();

      dispatch(clearSession());

      await persistor.purge();

      router.replace("/(auth)/login");
    } catch (error) {
      console.warn(
        "Erro ao sair:",
        error
      );

      Alert.alert(
        "Erro",
        "Não foi possível sair da conta."
      );
    } finally {
      setLoggingOut(false);
    }
  };

  const handleCallSupport = async () => {
    setLoadingSupport(true);

    try {
      const firebase = ensureFirebase();

      if (!firebase) {
        Alert.alert(
          "Suporte",
          "Firebase não inicializado."
        );
        return;
      }

      const snapshot = await firebase
        .firestoreModule()
        .collection("suport")
        .limit(1)
        .get();

      if (snapshot.empty) {
        Alert.alert(
          "Suporte",
          "Nenhum número de suporte encontrado."
        );
        return;
      }

      const data =
        snapshot.docs[0].data() || {};

      const phone =
        data.celphone ??
        data.cellphone ??
        data.whatsapp ??
        data.phone ??
        null;

      if (!phone) {
        Alert.alert(
          "Suporte",
          "Campo de telefone não encontrado."
        );
        return;
      }

      openWhatsapp(
        `+${phone}`,
        "Olá! Preciso de suporte no FisioVet."
      );
    } catch (error) {
      console.warn(
        "Erro ao abrir suporte:",
        error
      );

      Alert.alert(
        "Suporte",
        "Erro ao buscar o número de suporte."
      );
    } finally {
      setLoadingSupport(false);
    }
  };

  const modeLabel =
    mode === "light"
      ? "Claro"
      : mode === "dark"
        ? "Escuro"
        : "Automático";

  const subtitleTema =
    mode === "system"
      ? `Ativo: ${scheme === "dark"
        ? "Escuro"
        : "Claro"
      }`
      : "Claro / Escuro / Automático";

  const appVersion =
    Constants?.expoConfig?.version ||
    Constants?.manifest?.version ||
    "1.0.0";

  const buildNumber =
    Platform.OS === "ios"
      ? Constants?.expoConfig?.ios
        ?.buildNumber
      : Constants?.expoConfig?.android
        ?.versionCode;

  const appVersionLabel = buildNumber
    ? `${appVersion} (${buildNumber})`
    : appVersion;

  const isGoogleConnected =
    googleCalendar?.status === "ready" ||
    googleCalendar?.connected === true;

  const isCalendarSubscriptionReady =
    Boolean(
      googleCalendar?.enabled &&
      googleCalendar?.feedToken &&
      googleCalendar?.status !==
      "disabled"
    );

  const blurTint =
    scheme === "dark"
      ? "dark"
      : "light";

  const backButtonOverlay =
    scheme === "dark"
      ? "rgba(255,255,255,0.08)"
      : "rgba(255,255,255,0.28)";

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        {
          backgroundColor: bgScreen
        }
      ]}
      edges={["", ""]}
    >
      <View
        style={[
          styles.screen,
          {
            backgroundColor: bgScreen
          }
        ]}
      >
        <ScrollView
          style={styles.scrollView}
          contentInsetAdjustmentBehavior="never"
          automaticallyAdjustsScrollIndicatorInsets={
            false
          }
          showsVerticalScrollIndicator
          scrollEventThrottle={16}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: totalHeaderHeight + 8
            }
          ]}
        >
          <SectionLabel>
            CONTA
          </SectionLabel>

          <Group bg={card}>
            <Cell
              title="Usuário"
              subtitle="Dados pessoais e credenciais"
              leftIcon="person.crop.circle.fill"
              onPress={() =>
                router.push(
                  "/configuracoes/perfil"
                )
              }
              subtleColor={subtle}
              textColor={text}
            />

            <Divider />

            <Cell
              title="Assinatura"
              subtitle="Plano Free, limites e planos premium"
              leftIcon="sparkles"
              onPress={() =>
                router.push(
                  "/configuracoes/assinatura"
                )
              }
              subtleColor={subtle}
              textColor={text}
            />
          </Group>

          <SectionLabel>
            APARÊNCIA
          </SectionLabel>

          <Group bg={card}>
            <Cell
              title="Tema"
              subtitle={subtitleTema}
              leftIcon="paintbrush.fill"
              value={modeLabel}
              onPress={() =>
                router.push(
                  "/configuracoes/aparencia"
                )
              }
              subtleColor={subtle}
              textColor={text}
            />
          </Group>

          <SectionLabel>
            AGENDA
          </SectionLabel>

          <Group bg={card}>
            <CellValue
              title="Duração padrão"
              value={defaultDur}
              leftIcon="clock.fill"
              onPress={() =>
                router.push(
                  "/configuracoes/duration"
                )
              }
              subtleColor={subtle}
              textColor={text}
            />

            <Divider />

            <CellValue
              title="Início do dia"
              value={defaultStartDay}
              leftIcon="sunrise.fill"
              onPress={() =>
                router.push(
                  "/configuracoes/startevent"
                )
              }
              subtleColor={subtle}
              textColor={text}
            />
          </Group>

          <SectionLabel>
            INTEGRAÇÕES
          </SectionLabel>

          <Group bg={card}>
            <CellValue
              title="App de Navegação"
              value={navPreference}
              leftIcon="location.circle"
              onPress={() =>
                router.push(
                  "/configuracoes/navegador"
                )
              }
              subtleColor={subtle}
              textColor={text}
            />

            <Divider />

            <CellValue
              title="Assinar calendário"
              subtitle="Google Agenda, Apple Calendar e Outlook"
              value={
                isCalendarSubscriptionReady ? (
                  <FontAwesome
                    name="check-circle"
                    size={20}
                    color="#16A34A"
                  />
                ) : googleCalendar?.enabled ? (
                  <Ionicons
                    name="time-outline"
                    size={20}
                    color="#D97706"
                  />
                ) : (
                  <Ionicons
                    name="close-circle"
                    size={20}
                    color="#EF4444"
                  />
                )
              }
              leftIcon="calendar"
              onPress={() =>
                router.push(
                  "/configuracoes/agenda"
                )
              }
              subtleColor={subtle}
              textColor={text}
            />

            <Divider />

            <CellValue
              title="Integração Asaas"
              value={
                isGoogleConnected ? (
                  <FontAwesome
                    name="check-circle"
                    size={20}
                    color="#16A34A"
                  />
                ) : (
                  <Ionicons
                    name="close-circle"
                    size={20}
                    color="#EF4444"
                  />
                )
              }
              leftIcon="creditcard.fill"
              onPress={() =>
                router.push(
                  "/configuracoes/asaas"
                )
              }
              subtleColor={subtle}
              textColor={text}
              disabled
            />
          </Group>

          <SectionLabel>
            NOTIFICAÇÕES
          </SectionLabel>

          <Group bg={card}>
            <CellSwitch
              title="Lembretes de eventos"
              subtitle="Alertas antes das consultas"
              leftIcon="bell.fill"
              value={notifAgenda}
              onValueChange={
                setNotifAgenda
              }
              subtleColor={subtle}
              textColor={text}
              disabled
            />

            <Divider />

            <CellSwitch
              title="Lembretes de tarefas"
              subtitle="Checklist pré-atendimento"
              leftIcon="checkmark.seal.fill"
              value={notifLembretes}
              onValueChange={
                setNotifLembretes
              }
              subtleColor={subtle}
              textColor={text}
              disabled
            />
          </Group>

          <SectionLabel>
            DADOS & BACKUP
          </SectionLabel>

          <Group bg={card}>
            <Cell
              title="Backup local"
              subtitle="Exportar dados em JSON ou Excel"
              leftIcon="externaldrive.fill"
              onPress={() =>
                router.push(
                  "/configuracoes/backup"
                )
              }
              subtleColor={subtle}
              textColor={text}
            />

            <Divider />

            <Cell
              title="Restaurar backup"
              subtitle="Importar de arquivo .json"
              leftIcon="arrow.down.doc.fill"
              onPress={() =>
                router.push(
                  "/configuracoes/restaurar"
                )
              }
              subtleColor={subtle}
              textColor={text}
              disabled
            />
          </Group>

          <SectionLabel>
            SOBRE
          </SectionLabel>

          <Group bg={card}>
            <Cell
              title="Termos & Privacidade"
              leftIcon="doc.text.fill"
              onPress={() =>
                router.push(
                  "/configuracoes/termos"
                )
              }
              subtleColor={subtle}
              textColor={text}
            />

            <Divider />

            <Cell
              title="Versão"
              value={appVersionLabel}
              leftIcon="info.circle.fill"
              rightIcon={null}
              subtleColor={subtle}
              textColor={text}
            />

            <Divider />

            <Cell
              title="Suporte"
              value="Chamar"
              subtitle="Dúvidas, sugestões e relatos"
              leftImageSource={require("@/assets/images/whatsapp.png")}
              onPress={handleCallSupport}
              subtleColor={subtle}
              textColor={text}
              loading={loadingSupport}
            />

            <Divider />

            <Cell
              title="Deletar a conta"
              subtitle="Remover permanentemente sua conta e dados"
              leftIcon="trash.fill"
              onPress={() =>
                router.push(
                  "/configuracoes/deleteaccount"
                )
              }
              subtleColor={subtle}
              textColor={text}
              destructive
            />
          </Group>

          <Pressable
            onPress={handleLogout}
            disabled={loggingOut}
            style={({ pressed }) => [
              styles.logoutButton,
              (pressed || loggingOut) &&
              styles.logoutButtonPressed
            ]}
          >
            {loggingOut ? (
              <>
                <ActivityIndicator
                  color="#FFFFFF"
                  size="small"
                />

                <Text
                  style={styles.logoutText}
                >
                  Saindo…
                </Text>
              </>
            ) : (
              <>
                <Ionicons
                  name="log-out-outline"
                  size={17}
                  color="#FFFFFF"
                />

                <Text
                  style={styles.logoutText}
                >
                  Sair da conta
                </Text>
              </>
            )}
          </Pressable>

          <Text
            style={[
              styles.footerText,
              {
                color: subtle
              }
            ]}
          >
            FisioVet • Configurações
          </Text>
        </ScrollView>

        <View
          style={[
            styles.floatingHeader,
            {
              height: totalHeaderHeight
            }
          ]}
          pointerEvents="box-none"
        >
          <View
            style={[
              styles.headerRow,
              {
                paddingTop: insets.top + 8
              }
            ]}
          >
              <BlurView
                tint={blurTint}
                intensity={100}
                experimentalBlurMethod="dimezisBlurView"
                style={StyleSheet.absoluteFill}
              />
            <View style={styles.backButtonWrapper}>

              <View
                pointerEvents="none"
                style={[
                  StyleSheet.absoluteFill,
                  styles.backButtonGlass,
                  {
                    backgroundColor:
                      scheme === "dark"
                        ? "rgba(35,35,38,0.58)"
                        : "rgba(255,255,255,0.58)",
                    borderColor:
                      scheme === "dark"
                        ? "rgba(255,255,255,0.18)"
                        : "rgba(255,255,255,0.82)"
                  }
                ]}
              />

              <Pressable
                onPress={handleGoBack}
                hitSlop={12}
                style={({ pressed }) => [
                  styles.backButton,
                  pressed && styles.backButtonPressed
                ]}
                accessibilityRole="button"
                accessibilityLabel="Voltar"
              >
                <Ionicons
                  name="chevron-back"
                  size={25}
                  color={tint}
                />
              </Pressable>
            </View>

            <View style={styles.brandBox}>
              <Image
                source={HOME_LOGO}
                style={styles.homeLogo}
                contentFit="contain"
              />

              <Text
                style={[
                  styles.pageTitle,
                  {
                    color: text
                  }
                ]}
              >
                Configurações
              </Text>
            </View>

            <View
              style={
                styles.headerRightPlaceholder
              }
            />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1
  },

  screen: {
    flex: 1,
    position: "relative"
  },

  scrollView: {
    flex: 1
  },

  scrollContent: {
    paddingTop: HEADER_HEIGHT + 8,
    paddingBottom: 24
  },

  floatingHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: HEADER_HEIGHT,
    zIndex: 20,
    elevation: 20
  },

  headerRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingTop: 8,
    paddingHorizontal: 14
  },

  backButtonWrapper: {
    width: 40,
    height: 40,
    marginTop: 6,
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOpacity: 0.08,
    shadowRadius: 7,
    shadowOffset: {
      width: 0,
      height: 3
    },
    elevation: 4
  },

  backButtonOverlay: {
    borderRadius: 20
  },

  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center"
  },

  backButtonPressed: {
    opacity: 0.55
  },

  headerRightPlaceholder: {
    width: 40,
    height: 40,
    marginTop: 6
  },

  brandBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    marginHorizontal: 6
  },

  homeLogo: {
    width: 92,
    height: 70
  },

  pageTitle: {
    marginTop: 0,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "800",
    letterSpacing: -0.25
  },

  sectionLabel: {
    marginHorizontal: 18,
    marginTop: 20,
    marginBottom: 7,
    color: "#8E8E93",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.45
  },

  group: {
    marginHorizontal: 14,
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOpacity: 0.045,
    shadowRadius: 7,
    shadowOffset: {
      width: 0,
      height: 3
    },
    elevation: 2
  },

  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 54,
    backgroundColor:
      Platform.OS === "ios"
        ? "rgba(60,60,67,0.22)"
        : "#E5E7EB"
  },

  cell: {
    minHeight: 50,
    paddingHorizontal: 13,
    paddingVertical: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 9
  },

  cellPressed: {
    opacity: 0.85
  },

  cellDisabled: {
    opacity: 0.52
  },

  cellLeft: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 9
  },

  cellTextContainer: {
    flex: 1,
    minWidth: 0
  },

  iconBadge: {
    width: 25,
    height: 25,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center"
  },

  transparentIconBadge: {
    padding: 0,
    backgroundColor: "transparent"
  },

  iconImage: {
    width: 25,
    height: 25
  },

  cellTitle: {
    fontSize: 14.5,
    fontWeight: "650",
    letterSpacing: -0.15
  },

  cellSubtitle: {
    marginTop: 1,
    fontSize: 11.3,
    lineHeight: 15,
    fontWeight: "500"
  },

  cellValue: {
    maxWidth: 124,
    marginRight: 4,
    fontSize: 12.5,
    fontWeight: "600",
    textAlign: "right"
  },

  customRightValue: {
    marginRight: 6,
    alignItems: "center",
    justifyContent: "center"
  },

  logoutButton: {
    minHeight: 46,
    marginTop: 24,
    marginHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: "#EF4444",
    shadowColor: "#EF4444",
    shadowOpacity: 0.16,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 4
    },
    elevation: 3
  },

  logoutButtonPressed: {
    opacity: 0.82
  },

  logoutText: {
    color: "#FFFFFF",
    fontSize: 14.5,
    fontWeight: "800",
    letterSpacing: -0.1
  },

  footerText: {
    marginTop: 15,
    marginBottom: 8,
    fontSize: 11.5,
    fontWeight: "600",
    textAlign: "center"
  },

  backButtonWrapper: {
    width: 42,
    height: 42,
    marginTop: 6,
    borderRadius: 21,
    overflow: "hidden",

    shadowColor: "#000000",
    shadowOpacity: 0.14,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 4
    },
    elevation: 6
  },

  backButtonGlass: {
    borderRadius: 21,
    borderWidth: StyleSheet.hairlineWidth
  },

  backButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center"
  },

  backButtonPressed: {
    opacity: 0.55,
    transform: [{ scale: 0.96 }]
  },
  safeArea: {
  flex: 1
},

screen: {
  flex: 1,
  position: "relative"
},

scrollView: {
  flex: 1
},

scrollContent: {
  paddingBottom: 24
},

floatingHeader: {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  zIndex: 20,
  elevation: 20
},

headerRow: {
  flex: 1,
  flexDirection: "row",
  alignItems: "flex-start",
  justifyContent: "space-between",
  paddingHorizontal: 14
},

backButtonWrapper: {
  width: 42,
  height: 42,
  marginTop: 6,
  borderRadius: 21,
  overflow: "hidden",

  shadowColor: "#000000",
  shadowOpacity: 0.14,
  shadowRadius: 10,
  shadowOffset: {
    width: 0,
    height: 4
  },
  elevation: 6
},

backButtonGlass: {
  borderRadius: 21,
  borderWidth: StyleSheet.hairlineWidth
},

backButton: {
  width: 42,
  height: 42,
  alignItems: "center",
  justifyContent: "center"
},

backButtonPressed: {
  opacity: 0.55,
  transform: [{ scale: 0.96 }]
},

headerRightPlaceholder: {
  width: 42,
  height: 42,
  marginTop: 6
},

brandBox: {
  flex: 1,
  alignItems: "center",
  justifyContent: "flex-start",
  marginHorizontal: 6
},

homeLogo: {
  width: 92,
  height: 54
},

pageTitle: {
  marginTop: -2,
  fontSize: 14,
  lineHeight: 20,
  fontWeight: "800",
  letterSpacing: -0.25
},
});