// app/configuracoes/termos.jsx
// @ts-nocheck

import React from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Platform,
    Pressable,
    Linking,
    Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import { useThemeColor } from "@/hooks/useThemeColor";
import { IconSymbol } from "@/components/ui/IconSymbol";

const PRIVACY_URL = "https://fisiovet.app/privacidade";
const TERMS_URL = "https://fisiovet.app/termos";

function SectionLabel({ children }) {
    return <Text style={styles.sectionLabel}>{children}</Text>;
}

function Card({ children, bg }) {
    return <View style={[styles.card, { backgroundColor: bg }]}>{children}</View>;
}

function Divider() {
    return <View style={styles.divider} />;
}

function LegalSection({ title, children, textColor, subtleColor }) {
    return (
        <View style={styles.legalSection}>
            <Text style={[styles.legalTitle, { color: textColor }]}>
                {title}
            </Text>

            <Text style={[styles.legalText, { color: subtleColor }]}>
                {children}
            </Text>
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

function LinkButton({ label, icon, onPress }) {
    return (
        <Pressable
            onPress={onPress}
            style={({ pressed }) => [
                styles.linkButton,
                pressed && { opacity: 0.82 },
            ]}
        >
            <Ionicons name={icon} size={16} color="#2563EB" />
            <Text style={styles.linkButtonText}>{label}</Text>
        </Pressable>
    );
}

export default function TermsAndPrivacyScreen() {
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

    const openUrl = async (url) => {
        try {
            const canOpen = await Linking.canOpenURL(url);

            if (!canOpen) {
                Alert.alert("Não foi possível abrir", "Tente acessar pelo navegador.");
                return;
            }

            await Linking.openURL(url);
        } catch (err) {
            console.warn("Erro ao abrir link legal:", err);
            Alert.alert("Erro", "Não foi possível abrir o link.");
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
                <SectionLabel>DOCUMENTOS LEGAIS</SectionLabel>

                <Card bg={card}>
                    <View style={styles.hero}>
                        <View style={styles.heroIcon}>
                            <IconSymbol name="doc.text.fill" size={20} color="#FFFFFF" />
                        </View>

                        <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={[styles.heroTitle, { color: text }]}>
                                Termos & Privacidade
                            </Text>

                            <Text style={[styles.heroDescription, { color: subtle }]}>
                                Ao usar o FisioVet, você concorda com os termos de uso e reconhece o app como ferramenta de organização e gestão.
                            </Text>
                        </View>
                    </View>

                    <Divider />

                    <InfoRow
                        icon="checkmark.shield.fill"
                        title="Ferramenta de gestão"
                        description="O FisioVet auxilia na organização da rotina profissional, mas não substitui julgamento clínico ou responsabilidade técnica."
                        textColor={text}
                        subtleColor={subtle}
                    />

                    <Divider />

                    <InfoRow
                        icon="lock.fill"
                        title="Dados do usuário"
                        description="Os dados cadastrados devem ser utilizados de forma adequada e com responsabilidade pelo profissional usuário."
                        textColor={text}
                        subtleColor={subtle}
                    />
                </Card>

                <SectionLabel>TERMOS DE USO</SectionLabel>

                <Card bg={card}>
                    <LegalSection
                        title="1. Aceitação dos termos"
                        textColor={text}
                        subtleColor={subtle}
                    >
                        Ao acessar ou utilizar o FisioVet, o usuário declara que leu, compreendeu e concorda com estes Termos de Uso. Caso não concorde, deve interromper o uso do aplicativo.
                    </LegalSection>

                    <Divider />

                    <LegalSection
                        title="2. Finalidade do aplicativo"
                        textColor={text}
                        subtleColor={subtle}
                    >
                        O FisioVet é uma ferramenta de organização para profissionais de fisioterapia veterinária. O app auxilia no cadastro de tutores e pets, gestão de agenda, registros de avaliações, exames, biblioteca e controle financeiro básico.
                    </LegalSection>

                    <Divider />

                    <LegalSection
                        title="3. Responsabilidade profissional"
                        textColor={text}
                        subtleColor={subtle}
                    >
                        O FisioVet não substitui julgamento clínico, avaliação profissional, diagnóstico ou conduta terapêutica. As decisões relacionadas aos pacientes são de responsabilidade exclusiva do profissional usuário do aplicativo.
                    </LegalSection>

                    <Divider />

                    <LegalSection
                        title="4. Conta do usuário"
                        textColor={text}
                        subtleColor={subtle}
                    >
                        O usuário é responsável por manter a segurança de sua conta, credenciais de acesso e informações cadastradas. O uso indevido da conta ou compartilhamento não autorizado de acesso pode comprometer a segurança dos dados.
                    </LegalSection>

                    <Divider />

                    <LegalSection
                        title="5. Dados cadastrados"
                        textColor={text}
                        subtleColor={subtle}
                    >
                        O usuário é responsável pela veracidade, legalidade e adequação dos dados inseridos no aplicativo, incluindo informações de tutores, pets, agenda, avaliações, exames e lançamentos financeiros.
                    </LegalSection>

                    <Divider />

                    <LegalSection
                        title="6. Planos e limites"
                        textColor={text}
                        subtleColor={subtle}
                    >
                        O FisioVet pode oferecer plano gratuito com limites de uso e planos pagos com recursos adicionais. Os valores, limites e recursos disponíveis podem ser alterados conforme a evolução do produto, sempre buscando manter transparência com os usuários.
                    </LegalSection>

                    <Divider />

                    <LegalSection
                        title="7. Disponibilidade do serviço"
                        textColor={text}
                        subtleColor={subtle}
                    >
                        O FisioVet busca manter o aplicativo disponível e funcionando corretamente, mas podem ocorrer interrupções temporárias por manutenção, atualizações, falhas técnicas, indisponibilidade de terceiros ou motivos fora do controle do app.
                    </LegalSection>

                    <Divider />

                    <LegalSection
                        title="8. Uso adequado"
                        textColor={text}
                        subtleColor={subtle}
                    >
                        O usuário concorda em não utilizar o FisioVet para fins ilegais, abusivos, fraudulentos, ofensivos ou que possam prejudicar a segurança, estabilidade ou funcionamento do serviço.
                    </LegalSection>

                    <Divider />

                    <LegalSection
                        title="9. Alterações nos termos"
                        textColor={text}
                        subtleColor={subtle}
                    >
                        Estes Termos de Uso podem ser atualizados periodicamente. A continuidade do uso do aplicativo após alterações representa concordância com a versão mais recente.
                    </LegalSection>
                </Card>

                <SectionLabel>PRIVACIDADE</SectionLabel>

                <Card bg={card}>
                    <LegalSection
                        title="Tratamento de dados"
                        textColor={text}
                        subtleColor={subtle}
                    >
                        O FisioVet utiliza dados cadastrados pelo usuário para funcionamento dos recursos do aplicativo, incluindo cadastro de tutores, pets, agenda, avaliações, exames, biblioteca e controles relacionados à rotina profissional.
                    </LegalSection>

                    <Divider />

                    <LegalSection
                        title="Responsabilidade sobre informações cadastradas"
                        textColor={text}
                        subtleColor={subtle}
                    >
                        O usuário deve inserir, manter e utilizar os dados de forma adequada, respeitando deveres profissionais, privacidade de terceiros e normas aplicáveis à sua atuação.
                    </LegalSection>

                    <Divider />

                    <LegalSection
                        title="Calendário externo"
                        textColor={text}
                        subtleColor={subtle}
                    >
                        Ao ativar a assinatura de calendário, o FisioVet gera um link privado somente leitura. Quem tiver esse link poderá visualizar os eventos publicados na agenda externa, por isso ele não deve ser compartilhado indevidamente.
                    </LegalSection>
                </Card>

                <SectionLabel>VERSÃO DOS DOCUMENTOS</SectionLabel>

                <Card bg={card}>
                    <View style={styles.noteBox}>
                        <Ionicons name="information-circle-outline" size={18} color="#2563EB" />

                        <Text style={[styles.noteText, { color: subtle }]}>
                            Última atualização: 09 de junho de 2026. Estes termos são uma versão inicial e podem ser revisados antes da ativação comercial completa dos planos pagos.
                        </Text>
                    </View>

                    <Divider />

                    <View style={styles.linksArea}>
                        <LinkButton
                            label="Abrir termos no site"
                            icon="open-outline"
                            onPress={() => openUrl(TERMS_URL)}
                        />

                        <LinkButton
                            label="Abrir privacidade no site"
                            icon="shield-checkmark-outline"
                            onPress={() => openUrl(PRIVACY_URL)}
                        />
                    </View>
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
        paddingBottom: 30,
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
        shadowOffset: { width: 0, height: 3 },
        elevation: 2,
    },

    divider: {
        height: StyleSheet.hairlineWidth,
        backgroundColor:
            Platform.OS === "ios" ? "rgba(60,60,67,0.22)" : "#E5E7EB",
        marginLeft: 54,
    },

    hero: {
        paddingHorizontal: 14,
        paddingVertical: 15,
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 11,
    },

    heroIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: "#2563EB",
        alignItems: "center",
        justifyContent: "center",
        marginTop: 1,
    },

    heroTitle: {
        fontSize: 18,
        fontWeight: "900",
        letterSpacing: -0.35,
    },

    heroDescription: {
        fontSize: 12.5,
        lineHeight: 18,
        fontWeight: "500",
        marginTop: 4,
    },

    infoRow: {
        paddingHorizontal: 14,
        paddingVertical: 13,
        flexDirection: "row",
        gap: 10,
    },

    infoIcon: {
        width: 27,
        height: 27,
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

    legalSection: {
        paddingHorizontal: 14,
        paddingVertical: 13,
    },

    legalTitle: {
        fontSize: 14,
        fontWeight: "850",
        letterSpacing: -0.12,
        marginBottom: 5,
    },

    legalText: {
        fontSize: 12.2,
        lineHeight: 18,
        fontWeight: "500",
    },

    noteBox: {
        paddingHorizontal: 14,
        paddingVertical: 13,
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 8,
    },

    noteText: {
        flex: 1,
        fontSize: 11.8,
        lineHeight: 17,
        fontWeight: "600",
    },

    linksArea: {
        paddingHorizontal: 14,
        paddingVertical: 12,
        gap: 9,
    },

    linkButton: {
        minHeight: 40,
        borderRadius: 12,
        backgroundColor: "rgba(37,99,235,0.10)",
        borderWidth: 1,
        borderColor: "rgba(37,99,235,0.16)",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: 7,
    },

    linkButtonText: {
        color: "#2563EB",
        fontSize: 12.5,
        fontWeight: "850",
    },
});