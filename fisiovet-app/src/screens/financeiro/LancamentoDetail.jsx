// src/screens/financeiro/LancamentoDetail.jsx
// @ts-nocheck

import React, {
    useCallback,
    useLayoutEffect,
    useMemo,
    useState,
} from "react";

import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

import {
    router,
    useLocalSearchParams,
    useNavigation,
} from "expo-router";

import {
    Ionicons,
} from "@expo/vector-icons";

import * as Haptics from "expo-haptics";

import {
    SafeAreaView,
    useSafeAreaInsets,
} from "react-native-safe-area-context";

import {
    useDispatch,
    useSelector,
} from "react-redux";

import {
    cancelLancamento,
    deleteLancamento,
    deleteRecebimento,
    loadLancamentoById,
    registerRecebimento,
    selectLancamentoById,
} from "@/src/store/slices/financeiroSlice";

import {
    updateEvento,
    selectEventoById,
} from "@/src/store/slices/agendaSlice";

import {
    selectTutorById,
} from "@/src/store/slices/tutoresSlice";

import {
    selectPetsState,
} from "@/src/store/slices/petsSlice";

import {
    buildEventoFinanceiroResumo,
    normalizeMoney,
} from "@/src/features/financeiro/financeiro.helpers";

import {
    FINANCEIRO_FORMA_PAGAMENTO,
    FINANCEIRO_STATUS,
} from "@/src/features/financeiro/financeiro.constants";

import {
    useThemeColor,
} from "@/hooks/useThemeColor";

/* =========================================================
   Constantes
========================================================= */

const COLORS = {
    bg: "#F5F5F7",
    card: "#FFFFFF",
    text: "#111827",
    subtle: "#6B7280",
    border: "rgba(15,23,42,0.08)",
    blue: "#0A84FF",
    green: "#16A34A",
    orange: "#F59E0B",
    red: "#EF4444",
    gray: "#8E8E93",
};

const STATUS_META = {
    rascunho: {
        label: "Rascunho",
        color: COLORS.gray,
        background: "rgba(142,142,147,0.12)",
        icon: "document-outline",
    },

    pendente: {
        label: "Pendente",
        color: COLORS.orange,
        background: "rgba(245,158,11,0.12)",
        icon: "time-outline",
    },

    parcial: {
        label: "Parcial",
        color: COLORS.blue,
        background: "rgba(10,132,255,0.11)",
        icon: "pie-chart-outline",
    },

    pago: {
        label: "Pago",
        color: COLORS.green,
        background: "rgba(22,163,74,0.11)",
        icon: "checkmark-circle-outline",
    },

    vencido: {
        label: "Vencido",
        color: COLORS.red,
        background: "rgba(239,68,68,0.11)",
        icon: "alert-circle-outline",
    },

    cancelado: {
        label: "Cancelado",
        color: COLORS.gray,
        background: "rgba(107,114,128,0.11)",
        icon: "close-circle-outline",
    },
};

const PAYMENT_OPTIONS = [
    {
        value: FINANCEIRO_FORMA_PAGAMENTO.PIX,
        label: "Pix",
    },
    {
        value: FINANCEIRO_FORMA_PAGAMENTO.DINHEIRO,
        label: "Dinheiro",
    },
    {
        value: FINANCEIRO_FORMA_PAGAMENTO.CARTAO_CREDITO,
        label: "Crédito",
    },
    {
        value: FINANCEIRO_FORMA_PAGAMENTO.CARTAO_DEBITO,
        label: "Débito",
    },
    {
        value: FINANCEIRO_FORMA_PAGAMENTO.TRANSFERENCIA,
        label: "Transferência",
    },
    {
        value: FINANCEIRO_FORMA_PAGAMENTO.OUTRO,
        label: "Outro",
    },
];

/* =========================================================
   Helpers
========================================================= */

function formatCurrency(value) {
    return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
    }).format(Number(value || 0));
}

function formatDate(value, includeTime = false) {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "—";
    }

    return date.toLocaleString(
        "pt-BR",
        includeTime
            ? {
                dateStyle: "short",
                timeStyle: "short",
            }
            : {
                dateStyle: "short",
            }
    );
}

function normalizeMoneyInput(value) {
    let normalized = String(value || "")
        .replace(/[^\d.,]/g, "");

    const parts =
        normalized.split(/[.,]/);

    if (parts.length > 2) {
        normalized =
            parts[0] +
            "," +
            parts.slice(1).join("");
    }

    return normalized;
}

/* =========================================================
   Componentes
========================================================= */

function SectionCard({
    title,
    icon,
    children,
    right,
}) {
    return (
        <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleWrap}>
                    <View style={styles.sectionIcon}>
                        <Ionicons
                            name={icon}
                            size={16}
                            color={COLORS.blue}
                        />
                    </View>

                    <Text style={styles.sectionTitle}>
                        {title}
                    </Text>
                </View>

                {right}
            </View>

            {children}
        </View>
    );
}

function ValueRow({
    label,
    value,
    strong = false,
    color,
}) {
    return (
        <View style={styles.valueRow}>
            <Text style={styles.valueLabel}>
                {label}
            </Text>

            <Text
                style={[
                    strong
                        ? styles.valueStrong
                        : styles.valueText,
                    color
                        ? { color }
                        : null,
                ]}
            >
                {formatCurrency(value)}
            </Text>
        </View>
    );
}

function PaymentSelector({
    value,
    onChange,
}) {
    return (
        <View style={styles.chipWrap}>
            {PAYMENT_OPTIONS.map(
                (option) => {
                    const active =
                        value ===
                        option.value;

                    return (
                        <Pressable
                            key={
                                option.value
                            }
                            onPress={() =>
                                onChange(
                                    option.value
                                )
                            }
                            style={[
                                styles.paymentChip,
                                active &&
                                styles.paymentChipActive,
                            ]}
                        >
                            <Text
                                style={[
                                    styles.paymentChipText,
                                    active &&
                                    styles.paymentChipTextActive,
                                ]}
                            >
                                {option.label}
                            </Text>
                        </Pressable>
                    );
                }
            )}
        </View>
    );
}

/* =========================================================
   Tela
========================================================= */

export default function LancamentoDetail() {
    const {
        id,
    } = useLocalSearchParams();

    const safeId =
        id != null
            ? String(id)
            : null;

    const dispatch = useDispatch();
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();

    const background =
        useThemeColor(
            {},
            "background"
        );

    const selector =
        useMemo(
            () =>
                selectLancamentoById(
                    safeId
                ),
            [safeId]
        );

    const lancamento =
        useSelector(selector);

    const eventoId =
        lancamento?.origem
            ?.eventoId || null;

    const evento =
        useSelector((state) =>
            eventoId
                ? selectEventoById(
                    eventoId
                )(state)
                : null
        );

    const tutor =
        useSelector((state) =>
            lancamento?.tutorId
                ? selectTutorById(
                    state,
                    lancamento.tutorId
                )
                : null
        );

    const petsState =
        useSelector(
            selectPetsState
        );

    const pets =
        useMemo(
            () =>
                (
                    lancamento?.petIds ||
                    []
                )
                    .map(
                        (petId) =>
                            petsState?.byId?.[
                            String(petId)
                            ]
                    )
                    .filter(Boolean),
            [
                lancamento?.petIds,
                petsState?.byId,
            ]
        );

    const [
        loading,
        setLoading,
    ] = useState(true);

    const [
        actionLoading,
        setActionLoading,
    ] = useState(false);

    const [
        paymentModalVisible,
        setPaymentModalVisible,
    ] = useState(false);

    const [
        paymentValue,
        setPaymentValue,
    ] = useState("");

    const [
        paymentMethod,
        setPaymentMethod,
    ] = useState(
        FINANCEIRO_FORMA_PAGAMENTO.PIX
    );

    const [
        paymentObservation,
        setPaymentObservation,
    ] = useState("");

    const statusMeta =
        STATUS_META[
        lancamento?.status
        ] ||
        STATUS_META.pendente;

    const syncEventoResumo =
        useCallback(
            async (
                updatedLancamento
            ) => {
                if (
                    !eventoId ||
                    !updatedLancamento
                        ?.id
                ) {
                    return;
                }

                const resumo =
                    buildEventoFinanceiroResumo(
                        updatedLancamento,
                        evento?.financeiro ||
                        {}
                    );

                await dispatch(
                    updateEvento({
                        id: eventoId,

                        patch: {
                            financeiro:
                                resumo,
                        },

                        skipGoogleSync:
                            true,
                    })
                ).unwrap();
            },
            [
                dispatch,
                eventoId,
                evento?.financeiro,
            ]
        );

    const loadData =
        useCallback(async () => {
            if (!safeId) return;

            try {
                setLoading(true);

                await dispatch(
                    loadLancamentoById(
                        safeId
                    )
                ).unwrap();
            } catch (error) {
                console.warn(
                    "Erro ao carregar lançamento:",
                    error
                );

                Alert.alert(
                    "Erro",
                    error?.message ||
                    "Não foi possível carregar o lançamento.",
                    [
                        {
                            text: "Voltar",
                            onPress: () =>
                                router.back(),
                        },
                    ]
                );
            } finally {
                setLoading(false);
            }
        }, [
            dispatch,
            safeId,
        ]);

    React.useEffect(() => {
        loadData();
    }, [loadData]);

    useLayoutEffect(() => {
        navigation.setOptions({
            headerTitle: "Lançamento",
            headerTitleAlign: "center",
            headerShadowVisible: false,

            headerLeft: () => (
                <Pressable
                    onPress={() => {
                        Haptics.selectionAsync().catch(() => { });

                        if (navigation.canGoBack()) {
                            router.back();
                            return;
                        }

                        router.replace("/(phone)/financeiro");
                    }}
                    hitSlop={10}
                    style={({ pressed }) => [
                        styles.headerBackButton,
                        pressed && { opacity: 0.7 },
                    ]}
                >
                    <Ionicons
                        name="chevron-back"
                        size={20}
                        color={COLORS.green}
                    />
                </Pressable>
            ),
        });
    }, [navigation]);

    const openPaymentModal =
        useCallback(() => {
            const saldo =
                Number(
                    lancamento?.valores
                        ?.saldo || 0
                );

            setPaymentValue(
                saldo > 0
                    ? saldo
                        .toFixed(2)
                        .replace(
                            ".",
                            ","
                        )
                    : ""
            );

            setPaymentMethod(
                FINANCEIRO_FORMA_PAGAMENTO.PIX
            );

            setPaymentObservation("");
            setPaymentModalVisible(true);
        }, [
            lancamento?.valores?.saldo,
        ]);

    const handleRegisterPayment =
        useCallback(async () => {
            const value =
                normalizeMoney(
                    paymentValue
                );

            const saldo =
                Number(
                    lancamento?.valores
                        ?.saldo || 0
                );

            if (value <= 0) {
                Alert.alert(
                    "Valor inválido",
                    "Informe um valor maior que zero."
                );

                return;
            }

            if (value > saldo) {
                Alert.alert(
                    "Valor inválido",
                    "O recebimento não pode ser maior que o saldo atual."
                );

                return;
            }

            try {
                setActionLoading(true);

                const updated =
                    await dispatch(
                        registerRecebimento({
                            lancamentoId:
                                lancamento.id,

                            recebimento: {
                                valor: value,

                                formaPagamento:
                                    paymentMethod,

                                origem:
                                    "manual",

                                recebidoEm:
                                    new Date().toISOString(),

                                observacao:
                                    paymentObservation.trim(),
                            },
                        })
                    ).unwrap();

                await syncEventoResumo(
                    updated
                );

                setPaymentModalVisible(
                    false
                );

                Haptics.notificationAsync(
                    Haptics
                        .NotificationFeedbackType
                        .Success
                ).catch(() => { });
            } catch (error) {
                Alert.alert(
                    "Erro",
                    error?.message ||
                    "Não foi possível registrar o recebimento."
                );
            } finally {
                setActionLoading(false);
            }
        }, [
            dispatch,
            lancamento,
            paymentValue,
            paymentMethod,
            paymentObservation,
            syncEventoResumo,
        ]);

    const handleRemovePayment =
        useCallback(
            (recebimento) => {
                Alert.alert(
                    "Remover recebimento",
                    `Deseja remover o recebimento de ${formatCurrency(
                        recebimento.valor
                    )}?`,
                    [
                        {
                            text: "Cancelar",
                            style: "cancel",
                        },
                        {
                            text: "Remover",
                            style: "destructive",
                            onPress: async () => {
                                try {
                                    setActionLoading(
                                        true
                                    );

                                    const updated =
                                        await dispatch(
                                            deleteRecebimento(
                                                {
                                                    lancamentoId:
                                                        lancamento.id,

                                                    recebimentoId:
                                                        recebimento.id,
                                                }
                                            )
                                        ).unwrap();

                                    await syncEventoResumo(
                                        updated
                                    );
                                } catch (error) {
                                    Alert.alert(
                                        "Erro",
                                        error?.message ||
                                        "Não foi possível remover o recebimento."
                                    );
                                } finally {
                                    setActionLoading(
                                        false
                                    );
                                }
                            },
                        },
                    ]
                );
            },
            [
                dispatch,
                lancamento?.id,
                syncEventoResumo,
            ]
        );

    const handleCancel =
        useCallback(() => {
            Alert.alert(
                "Cancelar lançamento",
                "O lançamento permanecerá no histórico, mas deixará de compor os valores em aberto.",
                [
                    {
                        text: "Voltar",
                        style: "cancel",
                    },
                    {
                        text: "Cancelar lançamento",
                        style: "destructive",
                        onPress: async () => {
                            try {
                                setActionLoading(
                                    true
                                );

                                const updated =
                                    await dispatch(
                                        cancelLancamento(
                                            lancamento.id
                                        )
                                    ).unwrap();

                                await syncEventoResumo(
                                    updated
                                );
                            } catch (error) {
                                Alert.alert(
                                    "Erro",
                                    error?.message ||
                                    "Não foi possível cancelar o lançamento."
                                );
                            } finally {
                                setActionLoading(
                                    false
                                );
                            }
                        },
                    },
                ]
            );
        }, [
            dispatch,
            lancamento?.id,
            syncEventoResumo,
        ]);

    const handleDelete =
        useCallback(() => {
            if (
                lancamento?.origem
                    ?.tipo === "evento"
            ) {
                Alert.alert(
                    "Lançamento vinculado",
                    "Lançamentos gerados por eventos não devem ser excluídos. Cancele o lançamento para manter o histórico e o vínculo com a agenda."
                );

                return;
            }

            Alert.alert(
                "Excluir lançamento",
                "Esta ação removerá definitivamente o lançamento avulso.",
                [
                    {
                        text: "Cancelar",
                        style: "cancel",
                    },
                    {
                        text: "Excluir",
                        style: "destructive",
                        onPress: async () => {
                            try {
                                setActionLoading(
                                    true
                                );

                                await dispatch(
                                    deleteLancamento(
                                        lancamento.id
                                    )
                                ).unwrap();

                                router.back();
                            } catch (error) {
                                Alert.alert(
                                    "Erro",
                                    error?.message ||
                                    "Não foi possível excluir o lançamento."
                                );
                            } finally {
                                setActionLoading(
                                    false
                                );
                            }
                        },
                    },
                ]
            );
        }, [
            dispatch,
            lancamento,
        ]);

    if (
        loading &&
        !lancamento
    ) {
        return (
            <SafeAreaView
                style={[
                    styles.safe,
                    {
                        backgroundColor:
                            background,
                    },
                ]}
                edges={[]}
            >
                <View
                    style={
                        styles.loadingBox
                    }
                >
                    <ActivityIndicator
                        size="small"
                        color={COLORS.blue}
                    />

                    <Text
                        style={
                            styles.loadingText
                        }
                    >
                        Carregando lançamento…
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    if (!lancamento) {
        return null;
    }

    const canReceive =
        ![
            FINANCEIRO_STATUS.PAGO,
            FINANCEIRO_STATUS.CANCELADO,
            FINANCEIRO_STATUS.RASCUNHO,
        ].includes(
            lancamento.status
        ) &&
        Number(
            lancamento?.valores
                ?.saldo || 0
        ) > 0;

    return (
        <SafeAreaView
            style={[
                styles.safe,
                {
                    backgroundColor:
                        background,
                },
            ]}
            edges={[]}
        >
            <ScrollView
                contentContainerStyle={[
                    styles.content,
                    {
                        paddingBottom:
                            30 +
                            Math.max(
                                insets.bottom,
                                0
                            ),
                    },
                ]}
                showsVerticalScrollIndicator={
                    false
                }
            >
                <View
                    style={[
                        styles.statusHero,
                        {
                            backgroundColor:
                                statusMeta.background,
                        },
                    ]}
                >
                    <View
                        style={[
                            styles.statusIcon,
                            {
                                backgroundColor:
                                    statusMeta.color,
                            },
                        ]}
                    >
                        <Ionicons
                            name={
                                statusMeta.icon
                            }
                            size={22}
                            color="#FFFFFF"
                        />
                    </View>

                    <View style={{ flex: 1 }}>
                        <Text
                            style={[
                                styles.statusLabel,
                                {
                                    color:
                                        statusMeta.color,
                                },
                            ]}
                        >
                            {statusMeta.label}
                        </Text>

                        <Text
                            style={
                                styles.heroDescription
                            }
                            numberOfLines={2}
                        >
                            {lancamento.descricao ||
                                "Lançamento financeiro"}
                        </Text>
                    </View>
                </View>

                <SectionCard
                    title="Valores"
                    icon="cash-outline"
                >
                    <ValueRow
                        label="Valor original"
                        value={
                            lancamento.valores
                                ?.original
                        }
                    />

                    <ValueRow
                        label="Desconto"
                        value={
                            lancamento.valores
                                ?.desconto
                        }
                    />

                    <ValueRow
                        label="Acréscimo"
                        value={
                            lancamento.valores
                                ?.acrescimo
                        }
                    />

                    <View
                        style={
                            styles.divider
                        }
                    />

                    <ValueRow
                        label="Valor final"
                        value={
                            lancamento.valores
                                ?.final
                        }
                        strong
                    />

                    <ValueRow
                        label="Recebido"
                        value={
                            lancamento.valores
                                ?.recebido
                        }
                        color={
                            COLORS.green
                        }
                    />

                    <ValueRow
                        label="Saldo"
                        value={
                            lancamento.valores
                                ?.saldo
                        }
                        strong
                        color={
                            Number(
                                lancamento
                                    .valores
                                    ?.saldo || 0
                            ) > 0
                                ? COLORS.orange
                                : COLORS.green
                        }
                    />

                    {canReceive && (
                        <Pressable
                            onPress={
                                openPaymentModal
                            }
                            style={
                                styles.primaryButton
                            }
                        >
                            <Ionicons
                                name="add-circle-outline"
                                size={19}
                                color="#FFFFFF"
                            />

                            <Text
                                style={
                                    styles.primaryButtonText
                                }
                            >
                                Registrar recebimento
                            </Text>
                        </Pressable>
                    )}
                </SectionCard>

                <SectionCard
                    title="Informações"
                    icon="information-circle-outline"
                >
                    <InfoRow
                        label="Categoria"
                        value={
                            lancamento.categoria ||
                            "Outro"
                        }
                    />

                    <InfoRow
                        label="Competência"
                        value={formatDate(
                            lancamento.competencia
                        )}
                    />

                    <InfoRow
                        label="Vencimento"
                        value={formatDate(
                            lancamento.vencimento
                        )}
                    />

                    <InfoRow
                        label="Origem"
                        value={
                            lancamento?.origem
                                ?.tipo ===
                                "evento"
                                ? "Evento da agenda"
                                : "Lançamento avulso"
                        }
                    />

                    {eventoId && (
                        <Pressable
                            onPress={() =>
                                router.push({
                                    pathname: "/(modals)/agenda-new",
                                    params: {
                                        id: String(eventoId),
                                    },
                                })
                            }
                            style={
                                styles.linkButton
                            }
                        >
                            <Ionicons
                                name="calendar-outline"
                                size={17}
                                color={
                                    COLORS.blue
                                }
                            />

                            <Text
                                style={
                                    styles.linkButtonText
                                }
                            >
                                Abrir evento relacionado
                            </Text>
                        </Pressable>
                    )}
                </SectionCard>

                {(tutor ||
                    pets.length > 0) && (
                        <SectionCard
                            title="Tutor e pets"
                            icon="person-circle-outline"
                        >
                            {!!tutor && (
                                <InfoRow
                                    label="Tutor"
                                    value={
                                        tutor.nome ||
                                        tutor.name ||
                                        "—"
                                    }
                                />
                            )}

                            {pets.length > 0 && (
                                <InfoRow
                                    label="Pets"
                                    value={pets
                                        .map(
                                            (pet) =>
                                                pet.nome ||
                                                pet.name
                                        )
                                        .join(", ")}
                                />
                            )}
                        </SectionCard>
                    )}

                <SectionCard
                    title="Recebimentos"
                    icon="wallet-outline"
                    right={
                        <Text
                            style={
                                styles.countText
                            }
                        >
                            {
                                (
                                    lancamento.recebimentos ||
                                    []
                                ).length
                            }
                        </Text>
                    }
                >
                    {(
                        lancamento.recebimentos ||
                        []
                    ).length === 0 ? (
                        <Text
                            style={
                                styles.emptySectionText
                            }
                        >
                            Nenhum recebimento registrado.
                        </Text>
                    ) : (
                        (
                            lancamento.recebimentos ||
                            []
                        ).map(
                            (recebimento) => (
                                <View
                                    key={
                                        recebimento.id
                                    }
                                    style={
                                        styles.receiptRow
                                    }
                                >
                                    <View
                                        style={
                                            styles.receiptIcon
                                        }
                                    >
                                        <Ionicons
                                            name="checkmark"
                                            size={15}
                                            color={
                                                COLORS.green
                                            }
                                        />
                                    </View>

                                    <View
                                        style={{
                                            flex: 1,
                                        }}
                                    >
                                        <Text
                                            style={
                                                styles.receiptValue
                                            }
                                        >
                                            {formatCurrency(
                                                recebimento.valor
                                            )}
                                        </Text>

                                        <Text
                                            style={
                                                styles.receiptMeta
                                            }
                                        >
                                            {String(
                                                recebimento.formaPagamento ||
                                                "Não informado"
                                            ).replaceAll(
                                                "_",
                                                " "
                                            )}
                                            {" · "}
                                            {formatDate(
                                                recebimento.recebidoEm,
                                                true
                                            )}
                                        </Text>

                                        {!!recebimento.observacao && (
                                            <Text
                                                style={
                                                    styles.receiptObservation
                                                }
                                            >
                                                {
                                                    recebimento.observacao
                                                }
                                            </Text>
                                        )}
                                    </View>

                                    <Pressable
                                        onPress={() =>
                                            handleRemovePayment(
                                                recebimento
                                            )
                                        }
                                        hitSlop={10}
                                    >
                                        <Ionicons
                                            name="trash-outline"
                                            size={18}
                                            color={
                                                COLORS.red
                                            }
                                        />
                                    </Pressable>
                                </View>
                            )
                        )
                    )}
                </SectionCard>

                {!!lancamento.observacoes && (
                    <SectionCard
                        title="Observações"
                        icon="document-text-outline"
                    >
                        <Text
                            style={
                                styles.observationText
                            }
                        >
                            {
                                lancamento.observacoes
                            }
                        </Text>
                    </SectionCard>
                )}

                <SectionCard
                    title="Ações"
                    icon="ellipsis-horizontal-circle-outline"
                >
                    {lancamento.status !==
                        FINANCEIRO_STATUS.CANCELADO && (
                            <Pressable
                                onPress={
                                    handleCancel
                                }
                                style={
                                    styles.secondaryDangerButton
                                }
                            >
                                <Ionicons
                                    name="close-circle-outline"
                                    size={18}
                                    color={
                                        COLORS.orange
                                    }
                                />

                                <Text
                                    style={
                                        styles.secondaryDangerText
                                    }
                                >
                                    Cancelar lançamento
                                </Text>
                            </Pressable>
                        )}

                    <Pressable
                        onPress={
                            handleDelete
                        }
                        style={
                            styles.deleteButton
                        }
                    >
                        <Ionicons
                            name="trash-outline"
                            size={18}
                            color={COLORS.red}
                        />

                        <Text
                            style={
                                styles.deleteButtonText
                            }
                        >
                            Excluir lançamento
                        </Text>
                    </Pressable>
                </SectionCard>
            </ScrollView>

            {
                actionLoading && (
                    <View
                        style={
                            styles.actionOverlay
                        }
                    >
                        <ActivityIndicator
                            size="small"
                            color="#FFFFFF"
                        />
                    </View>
                )
            }

            <Modal
                visible={
                    paymentModalVisible
                }
                transparent
                animationType="fade"
                onRequestClose={() =>
                    setPaymentModalVisible(
                        false
                    )
                }
            >
                <KeyboardAvoidingView
                    style={
                        styles.modalOverlay
                    }
                    behavior={
                        Platform.OS ===
                            "ios"
                            ? "padding"
                            : undefined
                    }
                >
                    <View
                        style={
                            styles.modalBox
                        }
                    >
                        <View
                            style={
                                styles.modalHeader
                            }
                        >
                            <View>
                                <Text
                                    style={
                                        styles.modalTitle
                                    }
                                >
                                    Novo recebimento
                                </Text>

                                <Text
                                    style={
                                        styles.modalSubtitle
                                    }
                                >
                                    Saldo atual:{" "}
                                    {formatCurrency(
                                        lancamento
                                            .valores
                                            ?.saldo
                                    )}
                                </Text>
                            </View>

                            <Pressable
                                onPress={() =>
                                    setPaymentModalVisible(
                                        false
                                    )
                                }
                            >
                                <Ionicons
                                    name="close-circle"
                                    size={24}
                                    color={
                                        COLORS.gray
                                    }
                                />
                            </Pressable>
                        </View>

                        <Text
                            style={
                                styles.fieldLabel
                            }
                        >
                            Valor recebido
                        </Text>

                        <View
                            style={
                                styles.moneyInputBox
                            }
                        >
                            <Text
                                style={
                                    styles.moneyPrefix
                                }
                            >
                                R$
                            </Text>

                            <TextInput
                                value={
                                    paymentValue
                                }
                                onChangeText={(
                                    value
                                ) =>
                                    setPaymentValue(
                                        normalizeMoneyInput(
                                            value
                                        )
                                    )
                                }
                                keyboardType="decimal-pad"
                                placeholder="0,00"
                                placeholderTextColor="#9CA3AF"
                                style={
                                    styles.moneyInput
                                }
                            />
                        </View>

                        <Text
                            style={[
                                styles.fieldLabel,
                                {
                                    marginTop: 14,
                                },
                            ]}
                        >
                            Forma de pagamento
                        </Text>

                        <PaymentSelector
                            value={
                                paymentMethod
                            }
                            onChange={
                                setPaymentMethod
                            }
                        />

                        <Text
                            style={[
                                styles.fieldLabel,
                                {
                                    marginTop: 14,
                                },
                            ]}
                        >
                            Observação
                        </Text>

                        <TextInput
                            value={
                                paymentObservation
                            }
                            onChangeText={
                                setPaymentObservation
                            }
                            placeholder="Opcional"
                            placeholderTextColor="#9CA3AF"
                            multiline
                            style={
                                styles.observationInput
                            }
                        />

                        <Pressable
                            disabled={
                                actionLoading
                            }
                            onPress={
                                handleRegisterPayment
                            }
                            style={
                                styles.modalSaveButton
                            }
                        >
                            {actionLoading ? (
                                <ActivityIndicator
                                    size="small"
                                    color="#FFFFFF"
                                />
                            ) : (
                                <Text
                                    style={
                                        styles.modalSaveText
                                    }
                                >
                                    Registrar recebimento
                                </Text>
                            )}
                        </Pressable>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </SafeAreaView >
    );
}

function InfoRow({
    label,
    value,
}) {
    return (
        <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>
                {label}
            </Text>

            <Text
                style={styles.infoValue}
                numberOfLines={3}
            >
                {value || "—"}
            </Text>
        </View>
    );
}

/* =========================================================
   Styles
========================================================= */

const styles = StyleSheet.create({
    safe: {
        flex: 1,
    },

    content: {
        paddingHorizontal: 16,
        paddingTop: 14,
        gap: 14,
    },

    loadingBox: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
    },

    loadingText: {
        color: COLORS.subtle,
        fontSize: 13,
    },

    statusHero: {
        minHeight: 82,
        borderRadius: 20,
        padding: 14,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },

    statusIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: "center",
        justifyContent: "center",
    },

    statusLabel: {
        fontSize: 12,
        fontWeight: "850",
        textTransform: "uppercase",
    },

    heroDescription: {
        marginTop: 4,
        color: COLORS.text,
        fontSize: 16,
        lineHeight: 21,
        fontWeight: "850",
    },

    sectionCard: {
        backgroundColor: COLORS.card,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: 14,
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 7,
        shadowOffset: {
            width: 0,
            height: 3,
        },
        elevation: 2,
    },

    sectionHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 12,
    },

    sectionTitleWrap: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },

    sectionIcon: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: "rgba(10,132,255,0.10)",
        alignItems: "center",
        justifyContent: "center",
    },

    sectionTitle: {
        color: COLORS.text,
        fontSize: 15,
        fontWeight: "850",
    },

    valueRow: {
        minHeight: 31,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
    },

    valueLabel: {
        color: COLORS.subtle,
        fontSize: 12,
        fontWeight: "650",
    },

    valueText: {
        color: COLORS.text,
        fontSize: 13,
        fontWeight: "750",
    },

    valueStrong: {
        color: COLORS.text,
        fontSize: 16,
        fontWeight: "850",
    },

    divider: {
        height: 1,
        backgroundColor: "rgba(15,23,42,0.07)",
        marginVertical: 8,
    },

    primaryButton: {
        marginTop: 14,
        minHeight: 45,
        borderRadius: 15,
        backgroundColor: COLORS.green,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 7,
    },

    primaryButtonText: {
        color: "#FFFFFF",
        fontSize: 14,
        fontWeight: "850",
    },

    infoRow: {
        minHeight: 34,
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 14,
    },

    infoLabel: {
        color: COLORS.subtle,
        fontSize: 12,
        fontWeight: "650",
    },

    infoValue: {
        flex: 1,
        color: COLORS.text,
        fontSize: 12,
        fontWeight: "750",
        textAlign: "right",
    },

    linkButton: {
        marginTop: 10,
        minHeight: 42,
        borderRadius: 14,
        backgroundColor: "rgba(10,132,255,0.09)",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 7,
    },

    linkButtonText: {
        color: COLORS.blue,
        fontSize: 13,
        fontWeight: "800",
    },

    countText: {
        color: COLORS.subtle,
        fontSize: 12,
        fontWeight: "750",
    },

    emptySectionText: {
        color: COLORS.subtle,
        fontSize: 12,
        lineHeight: 17,
    },

    receiptRow: {
        minHeight: 60,
        paddingVertical: 9,
        borderBottomWidth: 1,
        borderBottomColor: "rgba(15,23,42,0.06)",
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },

    receiptIcon: {
        width: 31,
        height: 31,
        borderRadius: 16,
        backgroundColor: "rgba(22,163,74,0.10)",
        alignItems: "center",
        justifyContent: "center",
    },

    receiptValue: {
        color: COLORS.green,
        fontSize: 14,
        fontWeight: "850",
    },

    receiptMeta: {
        marginTop: 3,
        color: COLORS.subtle,
        fontSize: 11,
        textTransform: "capitalize",
    },

    receiptObservation: {
        marginTop: 3,
        color: COLORS.text,
        fontSize: 11,
        lineHeight: 15,
    },

    observationText: {
        color: COLORS.text,
        fontSize: 13,
        lineHeight: 19,
    },

    secondaryDangerButton: {
        minHeight: 44,
        borderRadius: 14,
        backgroundColor: "rgba(245,158,11,0.10)",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 7,
    },

    secondaryDangerText: {
        color: COLORS.orange,
        fontSize: 13,
        fontWeight: "800",
    },

    deleteButton: {
        marginTop: 9,
        minHeight: 44,
        borderRadius: 14,
        backgroundColor: "rgba(239,68,68,0.09)",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 7,
    },

    deleteButtonText: {
        color: COLORS.red,
        fontSize: 13,
        fontWeight: "800",
    },

    actionOverlay: {
        position: "absolute",
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        backgroundColor: "rgba(0,0,0,0.18)",
        alignItems: "center",
        justifyContent: "center",
    },

    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.35)",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 18,
    },

    modalBox: {
        width: "100%",
        maxWidth: 440,
        borderRadius: 20,
        backgroundColor: "#FFFFFF",
        padding: 16,
    },

    modalHeader: {
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 12,
        marginBottom: 16,
    },

    modalTitle: {
        color: COLORS.text,
        fontSize: 18,
        fontWeight: "850",
    },

    modalSubtitle: {
        marginTop: 4,
        color: COLORS.subtle,
        fontSize: 12,
    },

    fieldLabel: {
        marginBottom: 7,
        color: COLORS.subtle,
        fontSize: 12,
        fontWeight: "750",
    },

    moneyInputBox: {
        minHeight: 47,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: "#FAFAFA",
        paddingHorizontal: 12,
        flexDirection: "row",
        alignItems: "center",
    },

    moneyPrefix: {
        marginRight: 8,
        color: COLORS.green,
        fontSize: 15,
        fontWeight: "850",
    },

    moneyInput: {
        flex: 1,
        color: COLORS.text,
        fontSize: 16,
        fontWeight: "750",
    },

    chipWrap: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },

    paymentChip: {
        minHeight: 34,
        paddingHorizontal: 11,
        paddingVertical: 8,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: COLORS.border,
    },

    paymentChipActive: {
        backgroundColor: "rgba(22,163,74,0.10)",
        borderColor: "rgba(22,163,74,0.28)",
    },

    paymentChipText: {
        color: COLORS.subtle,
        fontSize: 12,
        fontWeight: "700",
    },

    paymentChipTextActive: {
        color: COLORS.green,
        fontWeight: "850",
    },

    observationInput: {
        minHeight: 76,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: "#FAFAFA",
        padding: 11,
        color: COLORS.text,
        fontSize: 13,
        textAlignVertical: "top",
    },

    modalSaveButton: {
        marginTop: 17,
        minHeight: 47,
        borderRadius: 15,
        backgroundColor: COLORS.green,
        alignItems: "center",
        justifyContent: "center",
    },

    modalSaveText: {
        color: "#FFFFFF",
        fontSize: 14,
        fontWeight: "850",
    },
    headerBackButton: {
        minHeight: 34,
        paddingHorizontal: 6,
        flexDirection: "row",
        alignItems: "center",
        gap: 2,
    },

    headerBackText: {
        color: COLORS.blue,
        fontSize: 15,
        fontWeight: "750",
    },
});