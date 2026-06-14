// app/configuracoes/agenda.jsx
// @ts-nocheck

import React, { useMemo, useState } from "react";
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
import {
    setupCalendarFeed,
    revokeCalendarFeed,
} from "@/src/services/fisiovetApi";
import { auth } from "@/firebase/firebase";

function SectionLabel({ children }) {
    return (
        <Text style={styles.sectionLabel}>
            {children}
        </Text>
    );
}

function Card({ children, bg }) {
    return (
        <View style={[styles.card, { backgroundColor: bg }]}>
            {children}
        </View>
    );
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
        loading: {
            bg: "#DBEAFE",
            color: "#1D4ED8",
            icon: "sync-outline",
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
        <View
            style={[
                styles.statusBadgeCompact,
                { backgroundColor: item.bg },
            ]}
        >
            <Ionicons
                name={item.icon}
                size={14}
                color={item.color}
            />
        </View>
    );
}

function InfoRow({
    icon,
    title,
    description,
    textColor,
    subtleColor,
}) {
    return (
        <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
                <IconSymbol
                    name={icon}
                    size={16}
                    color="#FFFFFF"
                />
            </View>

            <View style={styles.infoContent}>
                <Text
                    style={[
                        styles.infoTitle,
                        { color: textColor },
                    ]}
                >
                    {title}
                </Text>

                <Text
                    style={[
                        styles.infoDescription,
                        { color: subtleColor },
                    ]}
                >
                    {description}
                </Text>
            </View>
        </View>
    );
}

function LinkBox({ value, subtleColor }) {
    return (
        <View style={styles.linkBox}>
            <Text
                style={[
                    styles.linkText,
                    { color: subtleColor },
                ]}
                numberOfLines={3}
            >
                {value}
            </Text>
        </View>
    );
}

export default function CalendarSubscriptionSettingsScreen() {
    const dispatch = useDispatch();

    const bgScreen = useThemeColor(
        {
            light: "#F2F2F7",
            dark: "#000000",
        },
        "background"
    );

    const card = useThemeColor(
        {
            light: "#FFFFFF",
            dark: "#1C1C1E",
        },
        "background"
    );

    const text = useThemeColor({}, "text");

    const subtle = useThemeColor(
        {
            light: "#6B7280",
            dark: "#9AA0A6",
        },
        "text"
    );

    const calendarFeed = useSelector(
        selectGoogleCalendarIntegration
    );

    const [enabled, setEnabled] = useState(
        Boolean(calendarFeed?.enabled)
    );

    const [processing, setProcessing] = useState(false);
    const [copying, setCopying] = useState(false);
    const [opening, setOpening] = useState(false);
    const [operationError, setOperationError] = useState(null);

    const feedToken = calendarFeed?.feedToken || null;
    const feedUrl = calendarFeed?.feedUrl || null;
    const webcalUrl = calendarFeed?.webcalUrl || null;

    const status = useMemo(() => {
        if (processing) return "loading";
        if (operationError) return "error";
        if (enabled && feedToken && feedUrl) return "ready";
        return "disabled";
    }, [
        processing,
        operationError,
        enabled,
        feedToken,
        feedUrl,
    ]);

    const getCurrentUserIdOrThrow = () => {
        const uid = auth?.currentUser?.uid;

        if (!uid) {
            throw new Error(
                "Usuário não autenticado. Faça login novamente para configurar o link da agenda."
            );
        }

        return String(uid);
    };

    const persistEnabledCalendar = async ({
        userId,
        setupResult,
    }) => {
        const nextFeedToken =
            setupResult?.feedToken || null;

        const nextFeedUrl =
            setupResult?.feedUrl || null;

        const nextWebcalUrl =
            setupResult?.webcalUrl || null;

        if (!nextFeedToken || !nextFeedUrl) {
            throw new Error(
                "O servidor não retornou um link válido para a agenda."
            );
        }

        await dispatch(
            updateSystem({
                integrations: {
                    googleCalendar: {
                        enabled: true,
                        connected: true,
                        mode: "ics_feed",

                        ownerUserId: userId,

                        feedToken: nextFeedToken,
                        feedUrl: nextFeedUrl,
                        webcalUrl: nextWebcalUrl,

                        status: "ready",

                        email: calendarFeed?.email || "",
                        inviteEmail:
                            calendarFeed?.inviteEmail || "",

                        calendarId: nextFeedToken,
                        calendarLink: nextFeedUrl,

                        inviteSentAt: null,
                        inviteAcceptedAt: null,

                        pendingCount:
                            calendarFeed?.pendingCount || 0,
                        failedCount:
                            calendarFeed?.failedCount || 0,
                        lastSyncAt:
                            calendarFeed?.lastSyncAt || null,

                        error: null,
                        updatedAt: new Date().toISOString(),
                    },
                },
            })
        ).unwrap();
    };

    const persistDisabledCalendar = async () => {
        await dispatch(
            updateSystem({
                integrations: {
                    googleCalendar: {
                        enabled: false,
                        connected: false,
                        mode: "ics_feed",

                        ownerUserId: null,

                        feedToken: null,
                        feedUrl: null,
                        webcalUrl: null,

                        status: "disabled",

                        email: calendarFeed?.email || "",
                        inviteEmail:
                            calendarFeed?.inviteEmail || "",

                        calendarId: null,
                        calendarLink: null,

                        inviteSentAt: null,
                        inviteAcceptedAt: null,

                        pendingCount: 0,
                        failedCount: 0,
                        lastSyncAt: null,

                        error: null,
                        updatedAt: new Date().toISOString(),
                    },
                },
            })
        ).unwrap();
    };

    const activateCalendar = async () => {
        const userId = getCurrentUserIdOrThrow();

        const setupResult = await setupCalendarFeed({
            userId,
            calendarName: "Agenda FisioVet",
        });

        await persistEnabledCalendar({
            userId,
            setupResult,
        });

        setEnabled(true);

        Alert.alert(
            "Calendário ativado",
            "O link da agenda FisioVet foi gerado. Agora você pode copiá-lo ou abri-lo em um aplicativo de calendário."
        );
    };

    const deactivateCalendar = async () => {
        const userId = getCurrentUserIdOrThrow();

        await revokeCalendarFeed({
            userId,
            feedToken,
        });

        await persistDisabledCalendar();

        setEnabled(false);

        Alert.alert(
            "Calendário desativado",
            "O link anterior foi revogado e não poderá mais ser utilizado para acessar sua agenda."
        );
    };

    const handleToggle = async (nextEnabled) => {
        if (processing) return;

        const previousEnabled = enabled;

        setOperationError(null);
        setProcessing(true);

        /*
         * Atualização visual imediata.
         * Em caso de erro, voltamos ao estado anterior.
         */
        setEnabled(nextEnabled);

        try {
            if (nextEnabled) {
                await activateCalendar();
            } else {
                await deactivateCalendar();
            }
        } catch (err) {
            console.warn(
                "Erro ao alterar calendário externo:",
                err
            );

            setEnabled(previousEnabled);
            setOperationError(
                err?.message ||
                "Não foi possível alterar o calendário."
            );

            /*
             * Não apagamos os dados locais se a revogação
             * no servidor falhar, pois o link pode continuar ativo.
             */
            await dispatch(
                updateSystem({
                    integrations: {
                        googleCalendar: {
                            enabled: previousEnabled,
                            connected: Boolean(
                                previousEnabled && feedToken
                            ),
                            status: "error",
                            error:
                                err?.message ||
                                "Erro ao configurar calendário.",
                            updatedAt:
                                new Date().toISOString(),
                        },
                    },
                })
            )
                .unwrap()
                .catch(() => { });

            Alert.alert(
                "Erro",
                err?.message ||
                "Não foi possível alterar o calendário."
            );
        } finally {
            setProcessing(false);
        }
    };

    const handleCopyLink = async () => {
        if (!feedUrl) {
            Alert.alert(
                "Link indisponível",
                "Ative o calendário externo para gerar um novo link."
            );
            return;
        }

        try {
            setCopying(true);

            await Clipboard.setStringAsync(feedUrl);

            Alert.alert(
                "Link copiado",
                "Agora adicione este link no Google Agenda, Apple Calendar ou Outlook usando a opção de assinar ou adicionar calendário por URL."
            );
        } catch (err) {
            console.warn(
                "Erro ao copiar link da agenda:",
                err
            );

            Alert.alert(
                "Erro",
                "Não foi possível copiar o link da agenda."
            );
        } finally {
            setCopying(false);
        }
    };

    const handleOpenCalendar = async () => {
        if (opening) return;

        const url = webcalUrl || feedUrl;

        if (!url) {
            Alert.alert(
                "Link indisponível",
                "Ative o calendário externo para gerar um novo link."
            );
            return;
        }

        try {
            setOpening(true);

            const canOpen = await Linking.canOpenURL(url);

            if (canOpen) {
                await Linking.openURL(url);
                return;
            }

            if (feedUrl) {
                const canOpenFeedUrl =
                    await Linking.canOpenURL(feedUrl);

                if (canOpenFeedUrl) {
                    await Linking.openURL(feedUrl);
                    return;
                }
            }

            throw new Error(
                "Nenhum aplicativo compatível encontrado."
            );
        } catch (err) {
            console.warn(
                "Erro ao abrir link da agenda:",
                err
            );

            Alert.alert(
                "Não foi possível abrir",
                "Copie o link e adicione manualmente no seu aplicativo de calendário."
            );
        } finally {
            setOpening(false);
        }
    };

    return (
        <View
            style={[
                styles.screen,
                { backgroundColor: bgScreen },
            ]}
        >
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
                            <Ionicons
                                name="calendar-outline"
                                size={21}
                                color="#FFFFFF"
                            />
                        </View>

                        <View style={styles.headerContent}>
                            <View style={styles.headerTitleRow}>
                                <Text
                                    style={[
                                        styles.headerTitle,
                                        { color: text },
                                    ]}
                                    numberOfLines={1}
                                >
                                    Assinar calendário
                                </Text>

                                <StatusBadge status={status} />
                            </View>

                            <Text
                                style={[
                                    styles.headerSubtitle,
                                    { color: subtle },
                                ]}
                                numberOfLines={2}
                            >
                                Link para Google Agenda, Apple
                                Calendar e Outlook
                            </Text>
                        </View>
                    </View>

                    <Divider />

                    <View style={styles.switchRow}>
                        <View style={styles.switchContent}>
                            <Text
                                style={[
                                    styles.switchTitle,
                                    { color: text },
                                ]}
                            >
                                Ativar calendário externo
                            </Text>

                            <Text
                                style={[
                                    styles.switchSubtitle,
                                    { color: subtle },
                                ]}
                            >
                                {processing
                                    ? enabled
                                        ? "Gerando link da agenda..."
                                        : "Revogando link da agenda..."
                                    : enabled
                                        ? "Sua agenda está disponível por um link privado."
                                        : "Ative para gerar automaticamente um link da agenda."}
                            </Text>
                        </View>

                        <View style={styles.switchControl}>
                            {processing && (
                                <ActivityIndicator
                                    size="small"
                                    color="#2563EB"
                                />
                            )}

                            <Switch
                                value={enabled}
                                onValueChange={handleToggle}
                                disabled={processing}
                            />
                        </View>
                    </View>

                    {operationError ? (
                        <>
                            <Divider />

                            <View style={styles.errorBox}>
                                <Ionicons
                                    name="alert-circle-outline"
                                    size={17}
                                    color="#B91C1C"
                                />

                                <Text style={styles.errorText}>
                                    {operationError}
                                </Text>
                            </View>
                        </>
                    ) : null}
                </Card>

                {enabled && feedUrl ? (
                    <>
                        <SectionLabel>
                            LINK DA AGENDA
                        </SectionLabel>

                        <Card bg={card}>
                            <View style={styles.linkBlock}>
                                <View
                                    style={styles.linkHeaderRow}
                                >
                                    <View style={styles.linkHeaderContent}>
                                        <Text
                                            style={[
                                                styles.inputLabel,
                                                { color: text },
                                            ]}
                                        >
                                            URL de assinatura
                                        </Text>

                                        <Text
                                            style={[
                                                styles.helperText,
                                                { color: subtle },
                                            ]}
                                        >
                                            Use este link para
                                            assinar a agenda em outro
                                            aplicativo.
                                        </Text>
                                    </View>

                                    <View style={styles.readyDot}>
                                        <FontAwesome
                                            name="check-circle"
                                            size={18}
                                            color="#16A34A"
                                        />
                                    </View>
                                </View>

                                <LinkBox
                                    value={feedUrl}
                                    subtleColor={subtle}
                                />

                                <View style={styles.actionsRow}>
                                    <Pressable
                                        onPress={handleCopyLink}
                                        disabled={
                                            copying || processing || opening
                                        }
                                        style={({ pressed }) => [
                                            styles.secondaryButton,
                                            (copying || processing || opening) && {
                                                opacity: 0.45,
                                            },
                                            pressed && {
                                                opacity: 0.8,
                                            },
                                        ]}
                                    >
                                        {copying ? (
                                            <ActivityIndicator
                                                size="small"
                                                color="#2563EB"
                                            />
                                        ) : (
                                            <Ionicons
                                                name="copy-outline"
                                                size={16}
                                                color="#2563EB"
                                            />
                                        )}

                                        <Text
                                            style={
                                                styles.secondaryButtonText
                                            }
                                        >
                                            {copying
                                                ? "Copiando..."
                                                : "Copiar link"}
                                        </Text>
                                    </Pressable>

                                    <Pressable
                                        onPress={handleOpenCalendar}
                                        disabled={processing || opening}
                                        style={({ pressed }) => [
                                            styles.secondaryButton,
                                            (processing || opening) && {
                                                opacity: 0.45,
                                            },
                                            pressed && {
                                                opacity: 0.8,
                                            },
                                        ]}
                                    >
                                        {opening ? (
                                            <ActivityIndicator
                                                size="small"
                                                color="#2563EB"
                                            />
                                        ) : (
                                            <Ionicons
                                                name="open-outline"
                                                size={16}
                                                color="#2563EB"
                                            />
                                        )}

                                        <Text style={styles.secondaryButtonText}>
                                            {opening ? "Abrindo..." : "Abrir"}
                                        </Text>
                                    </Pressable>
                                </View>

                                <View style={styles.warningBox}>
                                    <Ionicons
                                        name="shield-checkmark-outline"
                                        size={16}
                                        color="#92400E"
                                    />

                                    <Text
                                        style={styles.warningText}
                                    >
                                        Este link funciona como uma
                                        chave de acesso à sua agenda.
                                        Não compartilhe com pessoas
                                        que não devem visualizar seus
                                        eventos.
                                    </Text>
                                </View>
                            </View>
                        </Card>
                    </>
                ) : null}

                <SectionLabel>COMO FUNCIONA</SectionLabel>

                <Card bg={card}>
                    <InfoRow
                        icon="link"
                        title="Link somente leitura"
                        description="O FisioVet gera um link privado da sua agenda. Os eventos continuam sendo editados dentro do app."
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

                    <InfoRow
                        icon="lock.shield"
                        title="Revogação imediata"
                        description="Ao desativar a integração, o link é revogado e os dados de acesso são removidos do aplicativo."
                        textColor={text}
                        subtleColor={subtle}
                    />
                </Card>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
    },

    content: {
        paddingBottom: 40,
    },

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
        shadowOffset: {
            width: 0,
            height: 3,
        },
        elevation: 2,
    },

    divider: {
        height: StyleSheet.hairlineWidth,
        backgroundColor:
            Platform.OS === "ios"
                ? "rgba(60,60,67,0.22)"
                : "#E5E7EB",
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

    headerContent: {
        flex: 1,
        minWidth: 0,
    },

    headerTitleRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        minWidth: 0,
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

    statusBadgeCompact: {
        width: 22,
        height: 22,
        borderRadius: 11,
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
    },

    switchRow: {
        paddingHorizontal: 14,
        paddingVertical: 12,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },

    switchContent: {
        flex: 1,
        minWidth: 0,
    },

    switchControl: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
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

    errorBox: {
        paddingHorizontal: 14,
        paddingVertical: 12,
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 8,
        backgroundColor: "#FEF2F2",
    },

    errorText: {
        flex: 1,
        color: "#B91C1C",
        fontSize: 11.5,
        lineHeight: 16,
        fontWeight: "650",
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

    linkHeaderContent: {
        flex: 1,
        minWidth: 0,
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
        borderColor:
            Platform.OS === "ios"
                ? "rgba(60,60,67,0.22)"
                : "#E5E7EB",
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

    infoContent: {
        flex: 1,
        minWidth: 0,
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
});