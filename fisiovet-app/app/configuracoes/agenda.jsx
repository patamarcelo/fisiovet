// app/configuracoes/agenda.jsx
// @ts-nocheck

import React, { useMemo, useState } from "react";
import { router } from "expo-router";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Pressable,
    Switch,
    Alert,
    Platform,
    Linking,
    ActivityIndicator,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import * as Clipboard from "expo-clipboard";

import { useThemeColor } from "@/hooks/useThemeColor";
import { IconSymbol } from "@/components/ui/IconSymbol";
import {
    selectGoogleCalendarIntegration,
    updateSystem,
} from "@/src/store/slices/systemSlice";
import { setupCalendarFeed } from "@/src/services/fisiovetApi";
import { auth } from "@/firebase/firebase";

function SectionLabel({ children }) {
    return <Text style={styles.sectionLabel}>{children}</Text>;
}

function Card({ children, bg }) {
    return <View style={[styles.card, { backgroundColor: bg }]}>{children}</View>;
}

function Divider() {
    return <View style={styles.divider} />;
}

function StatusBadge({ status }) {
    const config = {
        disabled: {
            bg: "#F3F4F6",
            color: "#6B7280",
            icon: "close-circle",
        },
        pending_setup: {
            bg: "#FEF3C7",
            color: "#92400E",
            icon: "time-outline",
        },
        ready: {
            bg: "#DCFCE7",
            color: "#166534",
            icon: "checkmark-circle",
        },
        error: {
            bg: "#FEE2E2",
            color: "#B91C1C",
            icon: "alert-circle",
        },
    };

    const item = config[status] || config.disabled;

    return (
        <View style={[styles.statusBadgeCompact, { backgroundColor: item.bg }]}>
            <Ionicons name={item.icon} size={14} color={item.color} />
        </View>
    );
}

function InfoRow({ icon, title, description, textColor, subtleColor }) {
    return (
        <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
                <IconSymbol name={icon} size={16} color="#FFFFFF" />
            </View>

            <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.infoTitle, { color: textColor }]}>
                    {title}
                </Text>
                <Text style={[styles.infoDescription, { color: subtleColor }]}>
                    {description}
                </Text>
            </View>
        </View>
    );
}

function LinkBox({ value, subtleColor }) {
    return (
        <View style={styles.linkBox}>
            <Text style={[styles.linkText, { color: subtleColor }]} numberOfLines={3}>
                {value || "O link será gerado após ativar o calendário externo."}
            </Text>
        </View>
    );
}

export default function CalendarSubscriptionSettingsScreen() {
    const dispatch = useDispatch();

    const bgScreen = useThemeColor(
        { light: "#F2F2F7", dark: "#000000" },
        "background"
    );

    const card = useThemeColor(
        { light: "#FFFFFF", dark: "#1C1C1E" },
        "background"
    );

    const text = useThemeColor({}, "text");

    const subtle = useThemeColor(
        { light: "#6B7280", dark: "#9AA0A6" },
        "text"
    );

    const calendarFeed = useSelector(selectGoogleCalendarIntegration);

    const [enabled, setEnabled] = useState(Boolean(calendarFeed?.enabled));
    const [saving, setSaving] = useState(false);
    const [copying, setCopying] = useState(false);

    const feedToken = calendarFeed?.feedToken || null;
    const feedUrl = calendarFeed?.feedUrl || null;
    const webcalUrl = calendarFeed?.webcalUrl || null;

    const status = useMemo(() => {
        if (!enabled) return "disabled";
        if (feedToken && feedUrl) return "ready";
        return "pending_setup";
    }, [enabled, feedToken, feedUrl]);

    const hasChanges = useMemo(() => {
        if (enabled !== Boolean(calendarFeed?.enabled)) return true;
        if (enabled && !calendarFeed?.feedToken) return true;
        return false;
    }, [enabled, calendarFeed?.enabled, calendarFeed?.feedToken]);

    const pendingCount = calendarFeed?.pendingCount || 0;
    const failedCount = calendarFeed?.failedCount || 0;

    const saveButtonLabel = saving
        ? enabled && !feedToken
            ? "Gerando link..."
            : "Salvando..."
        : enabled && !feedToken
            ? "Gerar link da agenda"
            : "Salvar configuração";

    const getCurrentUserIdOrThrow = () => {
        const uid = auth?.currentUser?.uid;

        if (!uid) {
            throw new Error(
                "Usuário não autenticado. Faça login novamente para gerar o link da agenda."
            );
        }

        return String(uid);
    };

    const handleCopyLink = async () => {
        if (!feedUrl) {
            Alert.alert(
                "Link não gerado",
                "Ative o calendário externo e salve a configuração para gerar o link da agenda."
            );
            return;
        }

        try {
            setCopying(true);
            await Clipboard.setStringAsync(feedUrl);

            Alert.alert(
                "Link copiado",
                "Agora adicione este link no Google Agenda, Apple Calendar ou Outlook usando a opção de assinar/adicionar calendário por URL."
            );
        } catch (err) {
            console.warn("Erro ao copiar link da agenda:", err);
            Alert.alert("Erro", "Não foi possível copiar o link da agenda.");
        } finally {
            setCopying(false);
        }
    };

    const handleOpenCalendar = async () => {
        const url = webcalUrl || feedUrl;

        if (!url) {
            Alert.alert(
                "Link não gerado",
                "Ative o calendário externo e salve a configuração para gerar o link da agenda."
            );
            return;
        }

        try {
            const canOpen = await Linking.canOpenURL(url);

            if (!canOpen && feedUrl) {
                await Linking.openURL(feedUrl);
                return;
            }

            await Linking.openURL(url);
        } catch (err) {
            console.warn("Erro ao abrir link da agenda:", err);
            Alert.alert(
                "Não foi possível abrir",
                "Copie o link e adicione manualmente no seu aplicativo de calendário."
            );
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);

            let setupResult = null;
            const currentUid = enabled ? getCurrentUserIdOrThrow() : auth?.currentUser?.uid || null;

            if (enabled && !feedToken) {
                setupResult = await setupCalendarFeed({
                    userId: currentUid,
                    calendarName: "Agenda FisioVet",
                });
            }

            const nextFeedToken = setupResult?.feedToken || feedToken || null;
            const nextFeedUrl = setupResult?.feedUrl || feedUrl || null;
            const nextWebcalUrl = setupResult?.webcalUrl || webcalUrl || null;

            await dispatch(
                updateSystem({
                    integrations: {
                        googleCalendar: {
                            enabled,
                            connected: Boolean(enabled && nextFeedToken),
                            mode: "ics_feed",

                            ownerUserId: enabled ? currentUid : null,

                            feedToken: enabled ? nextFeedToken : null,
                            feedUrl: enabled ? nextFeedUrl : null,
                            webcalUrl: enabled ? nextWebcalUrl : null,

                            status: enabled
                                ? nextFeedToken
                                    ? "ready"
                                    : "pending_setup"
                                : "disabled",

                            email: calendarFeed?.email || "",
                            inviteEmail: calendarFeed?.inviteEmail || "",
                            calendarId: enabled ? nextFeedToken : null,
                            calendarLink: enabled ? nextFeedUrl : null,
                            inviteSentAt: null,
                            inviteAcceptedAt: null,

                            pendingCount: calendarFeed?.pendingCount || 0,
                            failedCount: calendarFeed?.failedCount || 0,
                            lastSyncAt: calendarFeed?.lastSyncAt || null,

                            error: null,
                            updatedAt: new Date().toISOString(),
                        },
                    },
                })
            ).unwrap();

            Alert.alert(
                enabled ? "Calendário ativado" : "Calendário desativado",
                enabled
                    ? "O link da agenda FisioVet está pronto. Copie o link e adicione no Google Agenda, Apple Calendar ou Outlook para assinar o calendário."
                    : "A assinatura do calendário externo foi desativada neste dispositivo.",
                [
                    {
                        text: "OK",
                    },
                ]
            );
        } catch (err) {
            console.warn("Erro ao configurar calendário externo:", err);

            await dispatch(
                updateSystem({
                    integrations: {
                        googleCalendar: {
                            enabled,
                            connected: false,
                            mode: "ics_feed",
                            status: "error",
                            error: err?.message || "Erro ao configurar calendário.",
                            updatedAt: new Date().toISOString(),
                        },
                    },
                })
            ).unwrap().catch(() => { });

            Alert.alert(
                "Erro",
                err?.message ||
                "Não foi possível configurar o link do calendário."
            );
        } finally {
            setSaving(false);
        }
    };

    return (
        <View style={[styles.screen, { backgroundColor: bgScreen }]}>
            <ScrollView
                contentInsetAdjustmentBehavior="automatic"
                automaticallyAdjustsScrollIndicatorInsets
                showsVerticalScrollIndicator
                contentContainerStyle={styles.content}
            >
                <SectionLabel>STATUS</SectionLabel>

                <Card bg={card}>
                    <View style={styles.headerCard}>
                        <View style={styles.headerIcon}>
                            <Ionicons name="calendar-outline" size={21} color="#FFFFFF" />
                        </View>

                        <View style={{ flex: 1, minWidth: 0 }}>
                            <View style={styles.headerTitleRow}>
                                <Text
                                    style={[styles.headerTitle, { color: text }]}
                                    numberOfLines={1}
                                >
                                    Assinar calendário
                                </Text>

                                <StatusBadge status={status} />
                            </View>

                            <Text style={[styles.headerSubtitle, { color: subtle }]} numberOfLines={2}>
                                Link para Google Agenda, Apple Calendar e Outlook
                            </Text>
                        </View>

                    </View>

                    <Divider />

                    <View style={styles.switchRow}>
                        <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={[styles.switchTitle, { color: text }]}>
                                Ativar calendário externo
                            </Text>
                            <Text style={[styles.switchSubtitle, { color: subtle }]}>
                                Eventos criados no FisioVet serão publicados em um link de agenda.
                            </Text>
                        </View>

                        <Switch
                            value={enabled}
                            onValueChange={setEnabled}
                            disabled={saving}
                        />
                    </View>
                </Card>

                <SectionLabel>LINK DA AGENDA</SectionLabel>

                <Card bg={card}>
                    <View style={styles.linkBlock}>
                        <View style={styles.linkHeaderRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.inputLabel, { color: text }]}>
                                    URL de assinatura
                                </Text>
                                <Text style={[styles.helperText, { color: subtle }]}>
                                    Use este link para assinar a agenda em outro aplicativo.
                                </Text>
                            </View>

                            {feedUrl ? (
                                <View style={styles.readyDot}>
                                    <FontAwesome name="check-circle" size={18} color="#16A34A" />
                                </View>
                            ) : (
                                <View style={styles.readyDot}>
                                    <Ionicons name="time-outline" size={19} color="#D97706" />
                                </View>
                            )}
                        </View>

                        <LinkBox value={feedUrl} subtleColor={subtle} />

                        <View style={styles.actionsRow}>
                            <Pressable
                                onPress={handleCopyLink}
                                disabled={!feedUrl || copying || saving}
                                style={({ pressed }) => [
                                    styles.secondaryButton,
                                    (!feedUrl || copying || saving) && { opacity: 0.45 },
                                    pressed && { opacity: 0.8 },
                                ]}
                            >
                                {copying ? (
                                    <ActivityIndicator size="small" color="#2563EB" />
                                ) : (
                                    <Ionicons name="copy-outline" size={16} color="#2563EB" />
                                )}

                                <Text style={styles.secondaryButtonText}>
                                    {copying ? "Copiando..." : "Copiar link"}
                                </Text>
                            </Pressable>

                            <Pressable
                                onPress={handleOpenCalendar}
                                disabled={!feedUrl || saving}
                                style={({ pressed }) => [
                                    styles.secondaryButton,
                                    (!feedUrl || saving) && { opacity: 0.45 },
                                    pressed && { opacity: 0.8 },
                                ]}
                            >
                                <Ionicons name="open-outline" size={16} color="#2563EB" />
                                <Text style={styles.secondaryButtonText}>
                                    Abrir
                                </Text>
                            </Pressable>
                        </View>

                        <View style={styles.warningBox}>
                            <Ionicons name="shield-checkmark-outline" size={16} color="#92400E" />
                            <Text style={styles.warningText}>
                                Este link funciona como uma chave de acesso à sua agenda.
                                Não compartilhe com pessoas que não devem visualizar seus eventos.
                            </Text>
                        </View>
                    </View>
                </Card>

                <SectionLabel>COMO FUNCIONA</SectionLabel>

                <Card bg={card}>
                    <InfoRow
                        icon="link"
                        title="Link somente leitura"
                        description="O FisioVet gera um link privado da sua agenda. Os eventos devem continuar sendo editados dentro do app."
                        textColor={text}
                        subtleColor={subtle}
                    />

                    <Divider />

                    <InfoRow
                        icon="calendar"
                        title="Compatível com calendários externos"
                        description="Adicione o link no Google Agenda, Apple Calendar ou Outlook usando a opção “Adicionar por URL” ou “Assinar calendário”."
                        textColor={text}
                        subtleColor={subtle}
                    />

                    <Divider />

                    <InfoRow
                        icon="arrow.clockwise"
                        title="Atualização automática"
                        description="O calendário externo consulta o link periodicamente. Alterações feitas no FisioVet podem levar alguns minutos para aparecer."
                        textColor={text}
                        subtleColor={subtle}
                    />

                    <Divider />

                    
                </Card>

            </ScrollView>

            <View style={[styles.footer, { backgroundColor: bgScreen }]}>
                <Pressable
                    onPress={handleSave}
                    disabled={saving || !hasChanges}
                    style={({ pressed }) => [
                        styles.saveButton,
                        (pressed || saving) && { opacity: 0.84 },
                        !hasChanges && { opacity: 0.45 },
                    ]}
                >
                    <View style={styles.saveButtonContent}>
                        {saving && (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                        )}

                        <Text style={styles.saveButtonText}>
                            {saveButtonLabel}
                        </Text>
                    </View>
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1 },
    content: { paddingBottom: 110 },

    sectionLabel: {
        fontSize: 11,
        fontWeight: "800",
        color: "#8E8E93",
        marginHorizontal: 18,
        marginTop: 20,
        marginBottom: 7,
        letterSpacing: 0.45,
    },

    card: {
        marginHorizontal: 14,
        borderRadius: 14,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOpacity: 0.045,
        shadowRadius: 7,
        shadowOffset: { width: 0, height: 3 },
        elevation: 2,
    },

    divider: {
        height: StyleSheet.hairlineWidth,
        backgroundColor:
            Platform.OS === "ios" ? "rgba(60,60,67,0.22)" : "#E5E7EB",
        marginLeft: 54,
    },

    headerCard: {
        paddingHorizontal: 14,
        paddingVertical: 14,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },

    headerIcon: {
        width: 34,
        height: 34,
        borderRadius: 10,
        backgroundColor: "#2563EB",
        alignItems: "center",
        justifyContent: "center",
    },

    headerTitle: {
        fontSize: 16,
        fontWeight: "800",
        letterSpacing: -0.2,
    },

    headerSubtitle: {
        fontSize: 12,
        fontWeight: "500",
        marginTop: 2,
        lineHeight: 16,
    },

    statusBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 5,
        borderRadius: 999,
        maxWidth: 138,
    },

    statusBadgeText: {
        fontSize: 10.5,
        fontWeight: "800",
    },

    switchRow: {
        paddingHorizontal: 14,
        paddingVertical: 12,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },

    switchTitle: {
        fontSize: 14.5,
        fontWeight: "750",
    },

    switchSubtitle: {
        fontSize: 11.5,
        lineHeight: 15,
        fontWeight: "500",
        marginTop: 2,
    },

    linkBlock: {
        paddingHorizontal: 14,
        paddingVertical: 13,
    },

    linkHeaderRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        marginBottom: 10,
    },

    readyDot: {
        width: 30,
        height: 30,
        borderRadius: 15,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(118,118,128,0.10)",
    },

    inputLabel: {
        fontSize: 13.5,
        fontWeight: "750",
    },

    helperText: {
        fontSize: 11.5,
        lineHeight: 16,
        fontWeight: "500",
        marginTop: 3,
    },

    linkBox: {
        minHeight: 58,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: Platform.OS === "ios" ? "rgba(60,60,67,0.22)" : "#E5E7EB",
        backgroundColor: "rgba(118,118,128,0.07)",
        paddingHorizontal: 12,
        paddingVertical: 10,
        justifyContent: "center",
    },

    linkText: {
        fontSize: 11.5,
        lineHeight: 16,
        fontWeight: "600",
    },

    actionsRow: {
        flexDirection: "row",
        gap: 10,
        marginTop: 12,
    },

    secondaryButton: {
        flex: 1,
        minHeight: 40,
        borderRadius: 12,
        backgroundColor: "rgba(37,99,235,0.10)",
        borderWidth: 1,
        borderColor: "rgba(37,99,235,0.16)",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: 6,
    },

    secondaryButtonText: {
        color: "#2563EB",
        fontSize: 12.5,
        fontWeight: "850",
    },

    warningBox: {
        marginTop: 12,
        borderRadius: 12,
        backgroundColor: "#FEF3C7",
        paddingHorizontal: 11,
        paddingVertical: 10,
        flexDirection: "row",
        gap: 8,
        alignItems: "flex-start",
    },

    warningText: {
        flex: 1,
        color: "#92400E",
        fontSize: 11.5,
        lineHeight: 16,
        fontWeight: "650",
    },

    infoRow: {
        paddingHorizontal: 14,
        paddingVertical: 13,
        flexDirection: "row",
        gap: 10,
    },

    infoIcon: {
        width: 26,
        height: 26,
        borderRadius: 8,
        backgroundColor: "#8B5CF6",
        alignItems: "center",
        justifyContent: "center",
        marginTop: 1,
    },

    infoTitle: {
        fontSize: 13.8,
        fontWeight: "800",
        letterSpacing: -0.1,
    },

    infoDescription: {
        fontSize: 11.8,
        lineHeight: 16,
        fontWeight: "500",
        marginTop: 2,
    },

    statsRow: {
        flexDirection: "row",
        minHeight: 76,
        alignItems: "center",
    },

    statBox: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },

    statValue: {
        fontSize: 22,
        fontWeight: "900",
    },

    statLabel: {
        fontSize: 11.5,
        fontWeight: "700",
        marginTop: 2,
    },

    statSeparator: {
        width: StyleSheet.hairlineWidth,
        height: 40,
        backgroundColor:
            Platform.OS === "ios" ? "rgba(60,60,67,0.22)" : "#E5E7EB",
    },

    lastSyncBox: {
        paddingHorizontal: 14,
        paddingVertical: 13,
        alignItems: "center",
    },

    lastSyncTitle: {
        fontSize: 13.5,
        fontWeight: "800",
    },

    lastSyncText: {
        fontSize: 12,
        fontWeight: "600",
        marginTop: 3,
    },

    footer: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: Platform.OS === "ios" ? 28 : 14,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor:
            Platform.OS === "ios" ? "rgba(60,60,67,0.22)" : "#E5E7EB",
    },

    saveButton: {
        minHeight: 46,
        borderRadius: 14,
        backgroundColor: "#2563EB",
        alignItems: "center",
        justifyContent: "center",
    },

    saveButtonContent: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
    },

    saveButtonText: {
        color: "#FFFFFF",
        fontSize: 14.5,
        fontWeight: "850",
    },
    headerTitleRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        minWidth: 0,
    },

    statusBadgeCompact: {
        width: 22,
        height: 22,
        borderRadius: 11,
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
    },
});