// src/screens/financeiro/NovoLancamento.jsx
// @ts-nocheck

import React, {
    useCallback,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from "react";

import {
    ActivityIndicator,
    Alert,
    Keyboard,
    KeyboardAvoidingView,
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
    useNavigation,
} from "expo-router";

import {
    Ionicons,
} from "@expo/vector-icons";

import * as Haptics from "expo-haptics";

import DateTimePicker from "@react-native-community/datetimepicker";

import {
    shallowEqual,
    useDispatch,
    useSelector,
} from "react-redux";

import {
    SafeAreaView,
    useSafeAreaInsets,
} from "react-native-safe-area-context";

import {
    useThemeColor,
} from "@/hooks/useThemeColor";

import {
    makeSelectTutoresByQuery,
} from "@/src/store/slices/tutoresSlice";

import {
    fetchPetsByTutor,
    selectLoadingPetsByTutor,
    selectPetsByTutorId,
    selectPetsState,
} from "@/src/store/slices/petsSlice";

import {
    createLancamentoAvulso,
} from "@/src/store/slices/financeiroSlice";

import {
    FINANCEIRO_CATEGORIA,
    FINANCEIRO_FORMA_PAGAMENTO,
} from "@/src/features/financeiro/financeiro.constants";

import {
    normalizeMoney,
} from "@/src/features/financeiro/financeiro.helpers";

/* =========================================================
   Constantes
========================================================= */

const COLORS = {
    bg: "#F5F5F7",
    card: "#FFFFFF",
    text: "#111827",
    subtle: "#6B7280",
    border: "rgba(15,23,42,0.09)",
    blue: "#0A84FF",
    green: "#16A34A",
    red: "#EF4444",
    orange: "#F59E0B",
};

const CATEGORY_OPTIONS = [
    {
        value: FINANCEIRO_CATEGORIA.ATENDIMENTO,
        label: "Atendimento",
        icon: "medkit-outline",
    },
    {
        value: FINANCEIRO_CATEGORIA.AVALIACAO,
        label: "Avaliação",
        icon: "clipboard-outline",
    },
    {
        value: FINANCEIRO_CATEGORIA.LAUDO,
        label: "Laudo",
        icon: "document-text-outline",
    },
    {
        value: FINANCEIRO_CATEGORIA.ANALISE,
        label: "Análise",
        icon: "analytics-outline",
    },
    {
        value: FINANCEIRO_CATEGORIA.PACOTE,
        label: "Pacote",
        icon: "layers-outline",
    },
    {
        value: FINANCEIRO_CATEGORIA.PRODUTO,
        label: "Produto",
        icon: "cube-outline",
    },
    {
        value: FINANCEIRO_CATEGORIA.OUTRO,
        label: "Outro",
        icon: "ellipsis-horizontal-circle-outline",
    },
];

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

function pad2(value) {
    return String(value).padStart(2, "0");
}

function formatDateBR(date) {
    if (!(date instanceof Date)) {
        return "—";
    }

    return `${pad2(date.getDate())}/${pad2(
        date.getMonth() + 1
    )}/${date.getFullYear()}`;
}

function normalizeMoneyInput(value) {
    let normalized = String(value || "")
        .replace(/[^\d.,]/g, "");

    const parts = normalized.split(/[.,]/);

    if (parts.length > 2) {
        normalized =
            parts[0] +
            "," +
            parts.slice(1).join("");
    }

    return normalized;
}

function parseMoneyInput(value) {
    return normalizeMoney(value);
}

function formatCurrency(value) {
    return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
    }).format(Number(value || 0));
}

/* =========================================================
   Componentes auxiliares
========================================================= */

function SectionCard({
    title,
    icon,
    children,
}) {
    return (
        <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
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

            {children}
        </View>
    );
}

function FieldLabel({
    children,
    helper,
}) {
    return (
        <View style={styles.labelWrap}>
            <Text style={styles.label}>
                {children}
            </Text>

            {!!helper && (
                <Text style={styles.helper}>
                    {helper}
                </Text>
            )}
        </View>
    );
}

function InputShell({
    children,
    multiline = false,
}) {
    return (
        <View
            style={[
                styles.inputShell,
                multiline &&
                styles.inputShellMultiline,
            ]}
        >
            {children}
        </View>
    );
}

function AppTextInput({
    value,
    onChangeText,
    placeholder,
    keyboardType,
    multiline = false,
    icon,
}) {
    return (
        <InputShell multiline={multiline}>
            {!!icon && (
                <Ionicons
                    name={icon}
                    size={18}
                    color="#8E8E93"
                    style={styles.inputIcon}
                />
            )}

            <TextInput
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor="#9CA3AF"
                keyboardType={keyboardType}
                multiline={multiline}
                textAlignVertical={
                    multiline ? "top" : "center"
                }
                style={[
                    styles.input,
                    multiline &&
                    styles.inputMultiline,
                ]}
            />
        </InputShell>
    );
}

function CategorySelector({
    value,
    onChange,
}) {
    return (
        <View style={styles.chipWrap}>
            {CATEGORY_OPTIONS.map((item) => {
                const active =
                    value === item.value;

                return (
                    <Pressable
                        key={item.value}
                        onPress={() => {
                            Haptics.selectionAsync().catch(
                                () => { }
                            );

                            onChange(item.value);
                        }}
                        style={({ pressed }) => [
                            styles.categoryChip,
                            active &&
                            styles.categoryChipActive,
                            pressed && {
                                opacity: 0.78,
                            },
                        ]}
                    >
                        <Ionicons
                            name={item.icon}
                            size={15}
                            color={
                                active
                                    ? COLORS.blue
                                    : COLORS.subtle
                            }
                        />

                        <Text
                            style={[
                                styles.categoryChipText,
                                active &&
                                styles.categoryChipTextActive,
                            ]}
                        >
                            {item.label}
                        </Text>
                    </Pressable>
                );
            })}
        </View>
    );
}

function PaymentSelector({
    value,
    onChange,
}) {
    return (
        <View style={styles.chipWrap}>
            {PAYMENT_OPTIONS.map((item) => {
                const active =
                    value === item.value;

                return (
                    <Pressable
                        key={item.value}
                        onPress={() => {
                            Haptics.selectionAsync().catch(
                                () => { }
                            );

                            onChange(item.value);
                        }}
                        style={({ pressed }) => [
                            styles.paymentChip,
                            active &&
                            styles.paymentChipActive,
                            pressed && {
                                opacity: 0.78,
                            },
                        ]}
                    >
                        <Text
                            style={[
                                styles.paymentChipText,
                                active &&
                                styles.paymentChipTextActive,
                            ]}
                        >
                            {item.label}
                        </Text>
                    </Pressable>
                );
            })}
        </View>
    );
}

function TutorSuggestionList({
    items,
    onSelect,
}) {
    return (
        <View style={styles.suggestionBox}>
            {items.length > 0 ? (
                items.slice(0, 8).map(
                    (item, index) => (
                        <Pressable
                            key={String(item.id)}
                            onPress={() => {
                                Haptics.selectionAsync().catch(
                                    () => { }
                                );

                                onSelect(item);
                            }}
                            style={({ pressed }) => [
                                styles.suggestionRow,
                                pressed && {
                                    backgroundColor:
                                        "#F3F4F6",
                                },
                                index ===
                                items.length - 1 && {
                                    borderBottomWidth: 0,
                                },
                            ]}
                        >
                            <View
                                style={
                                    styles.suggestionAvatar
                                }
                            >
                                <Text
                                    style={
                                        styles.suggestionAvatarText
                                    }
                                >
                                    {String(
                                        item?.nome ||
                                        item?.name ||
                                        "?"
                                    )
                                        .charAt(0)
                                        .toUpperCase()}
                                </Text>
                            </View>

                            <View
                                style={{
                                    flex: 1,
                                    minWidth: 0,
                                }}
                            >
                                <Text
                                    style={
                                        styles.suggestionName
                                    }
                                    numberOfLines={1}
                                >
                                    {item?.nome ||
                                        item?.name}
                                </Text>

                                <Text
                                    style={
                                        styles.suggestionSub
                                    }
                                    numberOfLines={1}
                                >
                                    {item?.telefone ||
                                        item?.email ||
                                        "—"}
                                </Text>
                            </View>
                        </Pressable>
                    )
                )
            ) : (
                <View style={styles.emptySuggestion}>
                    <Text
                        style={
                            styles.emptySuggestionTitle
                        }
                    >
                        Nenhum tutor encontrado
                    </Text>

                    <Text
                        style={
                            styles.emptySuggestionText
                        }
                    >
                        Confira o nome, telefone ou
                        e-mail informado.
                    </Text>
                </View>
            )}
        </View>
    );
}

function SelectedTutor({
    tutor,
    onClear,
}) {
    return (
        <View style={styles.selectedTutor}>
            <View
                style={
                    styles.selectedTutorAvatar
                }
            >
                <Text
                    style={
                        styles.selectedTutorAvatarText
                    }
                >
                    {String(
                        tutor?.nome ||
                        tutor?.name ||
                        "?"
                    )
                        .charAt(0)
                        .toUpperCase()}
                </Text>
            </View>

            <View
                style={{
                    flex: 1,
                    minWidth: 0,
                }}
            >
                <Text
                    style={
                        styles.selectedTutorName
                    }
                    numberOfLines={1}
                >
                    {tutor?.nome ||
                        tutor?.name}
                </Text>

                <Text
                    style={
                        styles.selectedTutorSub
                    }
                    numberOfLines={1}
                >
                    {tutor?.telefone ||
                        tutor?.email ||
                        "Tutor selecionado"}
                </Text>
            </View>

            <Pressable
                onPress={onClear}
                hitSlop={10}
            >
                <Ionicons
                    name="close-circle"
                    size={20}
                    color="#8E8E93"
                />
            </Pressable>
        </View>
    );
}

function PetChip({
    pet,
    active,
    onPress,
}) {
    return (
        <Pressable
            onPress={onPress}
            style={({ pressed }) => [
                styles.petChip,
                active &&
                styles.petChipActive,
                pressed && {
                    opacity: 0.78,
                },
            ]}
        >
            <Ionicons
                name={
                    active
                        ? "paw"
                        : "paw-outline"
                }
                size={14}
                color={
                    active
                        ? COLORS.blue
                        : COLORS.subtle
                }
            />

            <Text
                style={[
                    styles.petChipText,
                    active &&
                    styles.petChipTextActive,
                ]}
            >
                {pet?.nome ||
                    pet?.name ||
                    "Pet"}
            </Text>
        </Pressable>
    );
}

/* =========================================================
   Tela
========================================================= */

export default function NovoLancamento() {
    const navigation = useNavigation();
    const dispatch = useDispatch();
    const insets = useSafeAreaInsets();

    const tint = useThemeColor({}, "tint");
    const background = useThemeColor(
        {},
        "background"
    );

    const petsState = useSelector(
        selectPetsState,
        shallowEqual
    );

    const tutorSearchSelectorRef =
        useRef(
            makeSelectTutoresByQuery()
        );

    const [
        descricao,
        setDescricao,
    ] = useState("");

    const [
        categoria,
        setCategoria,
    ] = useState(
        FINANCEIRO_CATEGORIA.ATENDIMENTO
    );

    const [
        tutorQuery,
        setTutorQuery,
    ] = useState("");

    const [
        tutor,
        setTutor,
    ] = useState(null);

    const [
        selectedPetIds,
        setSelectedPetIds,
    ] = useState([]);

    const [
        competencia,
        setCompetencia,
    ] = useState(new Date());

    const [
        vencimento,
        setVencimento,
    ] = useState(new Date());

    const [
        valorText,
        setValorText,
    ] = useState("");

    const [
        descontoText,
        setDescontoText,
    ] = useState("");

    const [
        acrescimoText,
        setAcrescimoText,
    ] = useState("");

    const [
        registrarRecebimento,
        setRegistrarRecebimento,
    ] = useState(false);

    const [
        valorRecebidoText,
        setValorRecebidoText,
    ] = useState("");

    const [
        formaPagamento,
        setFormaPagamento,
    ] = useState(
        FINANCEIRO_FORMA_PAGAMENTO.PIX
    );

    const [
        observacoes,
        setObservacoes,
    ] = useState("");

    const [
        saving,
        setSaving,
    ] = useState(false);

    const tutoresBuscados =
        useSelector((state) =>
            tutorSearchSelectorRef.current(
                state,
                tutorQuery
            )
        );

    const petsDoTutor =
        useSelector(
            selectPetsByTutorId(
                tutor?.id || ""
            )
        );

    const loadingPets =
        useSelector(
            selectLoadingPetsByTutor(
                tutor?.id || ""
            )
        );

    const valores = useMemo(() => {
        const original =
            parseMoneyInput(valorText);

        const desconto =
            parseMoneyInput(
                descontoText
            );

        const acrescimo =
            parseMoneyInput(
                acrescimoText
            );

        const final = Math.max(
            0,
            original -
            desconto +
            acrescimo
        );

        const recebido =
            registrarRecebimento
                ? parseMoneyInput(
                    valorRecebidoText
                )
                : 0;

        return {
            original,
            desconto,
            acrescimo,
            final,
            recebido,
            saldo: Math.max(
                final - recebido,
                0
            ),
        };
    }, [
        valorText,
        descontoText,
        acrescimoText,
        registrarRecebimento,
        valorRecebidoText,
    ]);

    const canSave = useMemo(() => {
        if (!descricao.trim()) {
            return false;
        }

        if (
            registrarRecebimento &&
            valores.recebido <= 0
        ) {
            return false;
        }

        if (
            valores.recebido >
            valores.final
        ) {
            return false;
        }

        return true;
    }, [
        descricao,
        registrarRecebimento,
        valores,
    ]);

    useLayoutEffect(() => {
        navigation.setOptions({
            headerTitle:
                "Novo lançamento",

            headerTitleAlign:
                "center",

            headerShadowVisible:
                false,

            headerLeft: () => (
                <Pressable
                    onPress={() =>
                        router.back()
                    }
                    hitSlop={10}
                    style={
                        styles.headerButton
                    }
                >
                 <Ionicons name="arrow-back" size={18} color={tint} />
                </Pressable>
            ),
        });
    }, [navigation]);

    useEffect(() => {
        if (!tutor?.id) {
            setSelectedPetIds([]);
            return;
        }

        dispatch(
            fetchPetsByTutor({
                tutorId: tutor.id,
            })
        );
    }, [
        tutor?.id,
        dispatch,
    ]);

    useEffect(() => {
        if (!registrarRecebimento) {
            setValorRecebidoText("");
        }
    }, [registrarRecebimento]);

    const handleSelectTutor =
        useCallback((item) => {
            setTutor(item);
            setTutorQuery("");
            setSelectedPetIds([]);
        }, []);

    const handleClearTutor =
        useCallback(() => {
            setTutor(null);
            setTutorQuery("");
            setSelectedPetIds([]);
        }, []);

    const handleSubmit =
        useCallback(async () => {
            if (
                !canSave ||
                saving
            ) {
                return;
            }

            try {
                setSaving(true);

                await Haptics.impactAsync(
                    Haptics
                        .ImpactFeedbackStyle
                        .Medium
                );

                const recebimentos =
                    registrarRecebimento
                        ? [
                            {
                                valor:
                                    valores.recebido,

                                formaPagamento,

                                origem:
                                    "manual",

                                recebidoEm:
                                    new Date().toISOString(),

                                observacao:
                                    "Recebimento registrado na criação do lançamento.",
                            },
                        ]
                        : [];

                const saved =
                    await dispatch(
                        createLancamentoAvulso({
                            tutorId:
                                tutor?.id ||
                                null,

                            petIds:
                                selectedPetIds,

                            categoria,

                            descricao:
                                descricao.trim(),

                            competencia:
                                competencia.toISOString(),

                            vencimento:
                                vencimento.toISOString(),

                            valores: {
                                original:
                                    valores.original,

                                desconto:
                                    valores.desconto,

                                acrescimo:
                                    valores.acrescimo,
                            },

                            recebimentos,

                            observacoes:
                                observacoes.trim(),
                        })
                    ).unwrap();

                Haptics.notificationAsync(
                    Haptics
                        .NotificationFeedbackType
                        .Success
                ).catch(() => { });

                router.push({
                    pathname: "/(modals)/financeiro/[id]",
                    params: {
                        id: String(saved.id),
                    },
                });
            } catch (error) {
                console.warn(
                    "Erro ao criar lançamento:",
                    error
                );

                Alert.alert(
                    "Erro",
                    error?.message ||
                    "Não foi possível criar o lançamento."
                );
            } finally {
                setSaving(false);
            }
        }, [
            canSave,
            saving,
            registrarRecebimento,
            valores,
            formaPagamento,
            tutor?.id,
            selectedPetIds,
            categoria,
            descricao,
            competencia,
            vencimento,
            observacoes,
            dispatch,
        ]);

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
            <KeyboardAvoidingView
                style={styles.flex}
                behavior={
                    Platform.OS === "ios"
                        ? "padding"
                        : undefined
                }
                keyboardVerticalOffset={
                    Platform.OS === "ios"
                        ? 90
                        : 0
                }
            >
                <ScrollView
                    style={styles.flex}
                    contentContainerStyle={[
                        styles.content,
                        {
                            paddingBottom:
                                112 +
                                Math.max(
                                    insets.bottom,
                                    0
                                ),
                        },
                    ]}
                    keyboardShouldPersistTaps="handled"
                    onScrollBeginDrag={
                        Keyboard.dismiss
                    }
                    showsVerticalScrollIndicator={
                        false
                    }
                >
                    <SectionCard
                        title="Lançamento"
                        icon="receipt-outline"
                    >
                        <FieldLabel>
                            Descrição
                        </FieldLabel>

                        <AppTextInput
                            value={descricao}
                            onChangeText={
                                setDescricao
                            }
                            placeholder="Ex.: Laudo fisioterapêutico"
                        />

                        <View
                            style={
                                styles.fieldGap
                            }
                        />

                        <FieldLabel>
                            Categoria
                        </FieldLabel>

                        <CategorySelector
                            value={categoria}
                            onChange={
                                setCategoria
                            }
                        />
                    </SectionCard>

                    <SectionCard
                        title="Tutor e pets"
                        icon="person-circle-outline"
                    >
                        <FieldLabel helper="Opcional. Você pode criar um lançamento sem vincular um tutor.">
                            Tutor
                        </FieldLabel>

                        {!tutor?.id ? (
                            <>
                                <AppTextInput
                                    value={
                                        tutorQuery
                                    }
                                    onChangeText={
                                        setTutorQuery
                                    }
                                    placeholder="Buscar tutor"
                                    icon="search-outline"
                                />

                                {!!tutorQuery && (
                                    <TutorSuggestionList
                                        items={
                                            tutoresBuscados
                                        }
                                        onSelect={
                                            handleSelectTutor
                                        }
                                    />
                                )}
                            </>
                        ) : (
                            <SelectedTutor
                                tutor={tutor}
                                onClear={
                                    handleClearTutor
                                }
                            />
                        )}

                        {!!tutor?.id && (
                            <View
                                style={
                                    styles.petsBlock
                                }
                            >
                                <FieldLabel>
                                    Pets
                                </FieldLabel>

                                {loadingPets &&
                                    !petsDoTutor?.length ? (
                                    <View
                                        style={
                                            styles.loadingRow
                                        }
                                    >
                                        <ActivityIndicator
                                            size="small"
                                            color={
                                                COLORS.blue
                                            }
                                        />

                                        <Text
                                            style={
                                                styles.loadingText
                                            }
                                        >
                                            Carregando pets…
                                        </Text>
                                    </View>
                                ) : null}

                                <View
                                    style={
                                        styles.chipWrap
                                    }
                                >
                                    {(
                                        petsDoTutor ||
                                        []
                                    ).map(
                                        (
                                            pet
                                        ) => {
                                            const petId =
                                                String(
                                                    pet.id
                                                );

                                            const active =
                                                selectedPetIds.includes(
                                                    petId
                                                );

                                            return (
                                                <PetChip
                                                    key={
                                                        petId
                                                    }
                                                    pet={
                                                        pet
                                                    }
                                                    active={
                                                        active
                                                    }
                                                    onPress={() =>
                                                        setSelectedPetIds(
                                                            (
                                                                previous
                                                            ) =>
                                                                previous.includes(
                                                                    petId
                                                                )
                                                                    ? previous.filter(
                                                                        (
                                                                            id
                                                                        ) =>
                                                                            id !==
                                                                            petId
                                                                    )
                                                                    : [
                                                                        ...previous,
                                                                        petId,
                                                                    ]
                                                        )
                                                    }
                                                />
                                            );
                                        }
                                    )}
                                </View>

                                {!loadingPets &&
                                    (!petsDoTutor ||
                                        petsDoTutor.length ===
                                        0) && (
                                        <Text
                                            style={
                                                styles.emptyText
                                            }
                                        >
                                            Este tutor não
                                            possui pets
                                            cadastrados.
                                        </Text>
                                    )}
                            </View>
                        )}
                    </SectionCard>

                    <SectionCard
                        title="Datas"
                        icon="calendar-outline"
                    >
                        <FieldLabel>
                            Competência
                        </FieldLabel>

                        <View
                            style={
                                styles.dateBox
                            }
                        >
                            <DateTimePicker
                                value={
                                    competencia
                                }
                                mode="date"
                                display={
                                    Platform.OS ===
                                        "ios"
                                        ? "compact"
                                        : "default"
                                }
                                onChange={(
                                    _,
                                    selected
                                ) => {
                                    if (
                                        selected
                                    ) {
                                        setCompetencia(
                                            selected
                                        );
                                    }
                                }}
                                locale="pt-BR"
                                themeVariant={
                                    Platform.OS ===
                                        "ios"
                                        ? "light"
                                        : undefined
                                }
                            />

                            <Text
                                style={
                                    styles.dateText
                                }
                            >
                                {formatDateBR(
                                    competencia
                                )}
                            </Text>
                        </View>

                        <View
                            style={
                                styles.fieldGap
                            }
                        />

                        <FieldLabel>
                            Vencimento
                        </FieldLabel>

                        <View
                            style={
                                styles.dateBox
                            }
                        >
                            <DateTimePicker
                                value={
                                    vencimento
                                }
                                mode="date"
                                display={
                                    Platform.OS ===
                                        "ios"
                                        ? "compact"
                                        : "default"
                                }
                                onChange={(
                                    _,
                                    selected
                                ) => {
                                    if (
                                        selected
                                    ) {
                                        setVencimento(
                                            selected
                                        );
                                    }
                                }}
                                locale="pt-BR"
                                themeVariant={
                                    Platform.OS ===
                                        "ios"
                                        ? "light"
                                        : undefined
                                }
                            />

                            <Text
                                style={
                                    styles.dateText
                                }
                            >
                                {formatDateBR(
                                    vencimento
                                )}
                            </Text>
                        </View>
                    </SectionCard>

                    <SectionCard
                        title="Valores"
                        icon="cash-outline"
                    >
                        <FieldLabel>
                            Valor original
                        </FieldLabel>

                        <InputShell>
                            <Text
                                style={
                                    styles.moneyPrefix
                                }
                            >
                                R$
                            </Text>

                            <TextInput
                                value={
                                    valorText
                                }
                                onChangeText={(
                                    value
                                ) =>
                                    setValorText(
                                        normalizeMoneyInput(
                                            value
                                        )
                                    )
                                }
                                placeholder="0,00"
                                placeholderTextColor="#9CA3AF"
                                keyboardType="decimal-pad"
                                style={
                                    styles.moneyInput
                                }
                            />
                        </InputShell>

                        <View
                            style={
                                styles.valuesRow
                            }
                        >
                            <View
                                style={
                                    styles.valueColumn
                                }
                            >
                                <FieldLabel>
                                    Desconto
                                </FieldLabel>

                                <InputShell>
                                    <Text
                                        style={
                                            styles.moneyPrefixMuted
                                        }
                                    >
                                        R$
                                    </Text>

                                    <TextInput
                                        value={
                                            descontoText
                                        }
                                        onChangeText={(
                                            value
                                        ) =>
                                            setDescontoText(
                                                normalizeMoneyInput(
                                                    value
                                                )
                                            )
                                        }
                                        placeholder="0,00"
                                        placeholderTextColor="#9CA3AF"
                                        keyboardType="decimal-pad"
                                        style={
                                            styles.moneyInput
                                        }
                                    />
                                </InputShell>
                            </View>

                            <View
                                style={
                                    styles.valueColumn
                                }
                            >
                                <FieldLabel>
                                    Acréscimo
                                </FieldLabel>

                                <InputShell>
                                    <Text
                                        style={
                                            styles.moneyPrefixMuted
                                        }
                                    >
                                        R$
                                    </Text>

                                    <TextInput
                                        value={
                                            acrescimoText
                                        }
                                        onChangeText={(
                                            value
                                        ) =>
                                            setAcrescimoText(
                                                normalizeMoneyInput(
                                                    value
                                                )
                                            )
                                        }
                                        placeholder="0,00"
                                        placeholderTextColor="#9CA3AF"
                                        keyboardType="decimal-pad"
                                        style={
                                            styles.moneyInput
                                        }
                                    />
                                </InputShell>
                            </View>
                        </View>

                        <View
                            style={
                                styles.summaryBox
                            }
                        >
                            <View
                                style={
                                    styles.summaryRow
                                }
                            >
                                <Text
                                    style={
                                        styles.summaryLabel
                                    }
                                >
                                    Valor final
                                </Text>

                                <Text
                                    style={
                                        styles.summaryValue
                                    }
                                >
                                    {formatCurrency(
                                        valores.final
                                    )}
                                </Text>
                            </View>

                            <View
                                style={
                                    styles.summaryDivider
                                }
                            />

                            <View
                                style={
                                    styles.summaryRow
                                }
                            >
                                <Text
                                    style={
                                        styles.summaryLabel
                                    }
                                >
                                    Saldo
                                </Text>

                                <Text
                                    style={[
                                        styles.summaryValue,
                                        {
                                            color:
                                                valores.saldo >
                                                    0
                                                    ? COLORS.orange
                                                    : COLORS.green,
                                        },
                                    ]}
                                >
                                    {formatCurrency(
                                        valores.saldo
                                    )}
                                </Text>
                            </View>
                        </View>
                    </SectionCard>

                    <SectionCard
                        title="Recebimento inicial"
                        icon="checkmark-circle-outline"
                    >
                        <Pressable
                            onPress={() => {
                                Haptics.selectionAsync().catch(
                                    () => { }
                                );

                                setRegistrarRecebimento(
                                    (
                                        previous
                                    ) =>
                                        !previous
                                );
                            }}
                            style={
                                styles.toggleRow
                            }
                        >
                            <View
                                style={
                                    registrarRecebimento
                                        ? styles.toggleCircleActive
                                        : styles.toggleCircle
                                }
                            >
                                {registrarRecebimento && (
                                    <Ionicons
                                        name="checkmark"
                                        size={15}
                                        color="#FFFFFF"
                                    />
                                )}
                            </View>

                            <View
                                style={{
                                    flex: 1,
                                }}
                            >
                                <Text
                                    style={
                                        styles.toggleTitle
                                    }
                                >
                                    Registrar pagamento
                                    agora
                                </Text>

                                <Text
                                    style={
                                        styles.toggleDescription
                                    }
                                >
                                    Marque esta opção
                                    caso o valor já tenha
                                    sido recebido.
                                </Text>
                            </View>
                        </Pressable>

                        {registrarRecebimento && (
                            <View
                                style={
                                    styles.initialPaymentBlock
                                }
                            >
                                <FieldLabel>
                                    Valor recebido
                                </FieldLabel>

                                <InputShell>
                                    <Text
                                        style={
                                            styles.moneyPrefix
                                        }
                                    >
                                        R$
                                    </Text>

                                    <TextInput
                                        value={
                                            valorRecebidoText
                                        }
                                        onChangeText={(
                                            value
                                        ) =>
                                            setValorRecebidoText(
                                                normalizeMoneyInput(
                                                    value
                                                )
                                            )
                                        }
                                        placeholder="0,00"
                                        placeholderTextColor="#9CA3AF"
                                        keyboardType="decimal-pad"
                                        style={
                                            styles.moneyInput
                                        }
                                    />
                                </InputShell>

                                {valores.recebido >
                                    valores.final && (
                                        <Text
                                            style={
                                                styles.validationError
                                            }
                                        >
                                            O valor recebido
                                            não pode ser maior
                                            que o valor final.
                                        </Text>
                                    )}

                                <View
                                    style={
                                        styles.fieldGap
                                    }
                                />

                                <FieldLabel>
                                    Forma de pagamento
                                </FieldLabel>

                                <PaymentSelector
                                    value={
                                        formaPagamento
                                    }
                                    onChange={
                                        setFormaPagamento
                                    }
                                />
                            </View>
                        )}
                    </SectionCard>

                    <SectionCard
                        title="Observações"
                        icon="document-text-outline"
                    >
                        <AppTextInput
                            value={
                                observacoes
                            }
                            onChangeText={
                                setObservacoes
                            }
                            placeholder="Informações adicionais sobre o lançamento"
                            multiline
                        />
                    </SectionCard>
                </ScrollView>

                <View
                    style={[
                        styles.footer,
                        {
                            paddingBottom:
                                Math.max(
                                    insets.bottom,
                                    10
                                ),
                        },
                    ]}
                >
                    <Pressable
                        disabled={
                            !canSave ||
                            saving
                        }
                        onPress={
                            handleSubmit
                        }
                        style={({ pressed }) => [
                            styles.saveButton,
                            {
                                backgroundColor:
                                    canSave
                                        ? tint
                                        : "#9CA3AF",
                            },
                            pressed &&
                                canSave &&
                                !saving
                                ? {
                                    opacity: 0.88,
                                }
                                : null,
                        ]}
                    >
                        {saving ? (
                            <ActivityIndicator
                                size="small"
                                color="#FFFFFF"
                            />
                        ) : (
                            <>
                                <Ionicons
                                    name="checkmark-circle-outline"
                                    size={19}
                                    color="#FFFFFF"
                                />

                                <Text
                                    style={
                                        styles.saveButtonText
                                    }
                                >
                                    Salvar lançamento
                                </Text>
                            </>
                        )}
                    </Pressable>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

/* =========================================================
   Estilos
========================================================= */

const styles = StyleSheet.create({
    flex: {
        flex: 1,
    },

    safe: {
        flex: 1,
    },

    content: {
        paddingHorizontal: 16,
        paddingTop: 14,
        gap: 14,
    },

    sectionCard: {
        backgroundColor: COLORS.card,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: 14,
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowRadius: 8,
        shadowOffset: {
            width: 0,
            height: 4,
        },
        elevation: 3,
    },

    sectionHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 12,
    },

    sectionIcon: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor:
            "rgba(10,132,255,0.10)",
    },

    sectionTitle: {
        fontSize: 15,
        fontWeight: "850",
        color: COLORS.text,
    },

    labelWrap: {
        marginBottom: 7,
    },

    label: {
        fontSize: 12,
        color: COLORS.subtle,
        fontWeight: "750",
    },

    helper: {
        marginTop: 4,
        fontSize: 11,
        lineHeight: 16,
        color: COLORS.subtle,
    },

    inputShell: {
        minHeight: 46,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 14,
        paddingHorizontal: 12,
        backgroundColor: "#FAFAFA",
        flexDirection: "row",
        alignItems: "center",
    },

    inputShellMultiline: {
        minHeight: 92,
        paddingTop: 11,
        paddingBottom: 11,
        alignItems: "flex-start",
    },

    inputIcon: {
        marginRight: 8,
    },

    input: {
        flex: 1,
        fontSize: 14,
        fontWeight: "600",
        color: COLORS.text,
        paddingVertical: 0,
    },

    inputMultiline: {
        minHeight: 66,
        lineHeight: 19,
    },

    fieldGap: {
        height: 13,
    },

    chipWrap: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },

    categoryChip: {
        minHeight: 36,
        paddingHorizontal: 11,
        paddingVertical: 8,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: "#FFFFFF",
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
    },

    categoryChipActive: {
        borderColor:
            "rgba(10,132,255,0.30)",
        backgroundColor:
            "rgba(10,132,255,0.11)",
    },

    categoryChipText: {
        fontSize: 12,
        fontWeight: "750",
        color: COLORS.subtle,
    },

    categoryChipTextActive: {
        color: COLORS.blue,
        fontWeight: "850",
    },

    paymentChip: {
        minHeight: 34,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: "#FFFFFF",
    },

    paymentChipActive: {
        backgroundColor:
            "rgba(22,163,74,0.10)",
        borderColor:
            "rgba(22,163,74,0.26)",
    },

    paymentChipText: {
        color: COLORS.subtle,
        fontSize: 12,
        fontWeight: "750",
    },

    paymentChipTextActive: {
        color: COLORS.green,
        fontWeight: "850",
    },

    suggestionBox: {
        marginTop: 8,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 16,
        backgroundColor: "#FFFFFF",
        overflow: "hidden",
    },

    suggestionRow: {
        minHeight: 54,
        paddingHorizontal: 12,
        paddingVertical: 9,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        borderBottomWidth: 1,
        borderBottomColor: "#F1F5F9",
    },

    suggestionAvatar: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor:
            "rgba(10,132,255,0.10)",
    },

    suggestionAvatarText: {
        color: COLORS.blue,
        fontWeight: "850",
    },

    suggestionName: {
        color: COLORS.text,
        fontSize: 14,
        fontWeight: "800",
    },

    suggestionSub: {
        marginTop: 2,
        color: COLORS.subtle,
        fontSize: 12,
    },

    emptySuggestion: {
        padding: 14,
    },

    emptySuggestionTitle: {
        color: COLORS.text,
        fontSize: 13,
        fontWeight: "800",
    },

    emptySuggestionText: {
        marginTop: 4,
        color: COLORS.subtle,
        fontSize: 12,
        lineHeight: 17,
    },

    selectedTutor: {
        minHeight: 58,
        padding: 11,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 16,
        backgroundColor:
            "rgba(118,118,128,0.07)",
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },

    selectedTutorAvatar: {
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor:
            "rgba(10,132,255,0.12)",
    },

    selectedTutorAvatarText: {
        color: COLORS.blue,
        fontWeight: "850",
    },

    selectedTutorName: {
        color: COLORS.text,
        fontSize: 14,
        fontWeight: "850",
    },

    selectedTutorSub: {
        marginTop: 2,
        color: COLORS.subtle,
        fontSize: 12,
    },

    petsBlock: {
        marginTop: 14,
    },

    petChip: {
        minHeight: 34,
        paddingHorizontal: 11,
        paddingVertical: 8,
        borderRadius: 999,
        backgroundColor: "#F2F2F7",
        borderWidth: 1,
        borderColor: "transparent",
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
    },

    petChipActive: {
        backgroundColor:
            "rgba(10,132,255,0.12)",
        borderColor:
            "rgba(10,132,255,0.30)",
    },

    petChipText: {
        color: COLORS.subtle,
        fontSize: 12,
        fontWeight: "750",
    },

    petChipTextActive: {
        color: COLORS.blue,
        fontWeight: "850",
    },

    loadingRow: {
        marginBottom: 8,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },

    loadingText: {
        color: COLORS.subtle,
        fontSize: 12,
        fontWeight: "650",
    },

    emptyText: {
        marginTop: 8,
        color: COLORS.subtle,
        fontSize: 12,
    },

    dateBox: {
        minHeight: 48,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 14,
        backgroundColor: "#FAFAFA",
        paddingHorizontal: 10,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
    },

    dateText: {
        color: COLORS.text,
        fontSize: 13,
        fontWeight: "800",
    },

    moneyPrefix: {
        color: COLORS.green,
        fontSize: 15,
        fontWeight: "850",
        marginRight: 8,
    },

    moneyPrefixMuted: {
        color: COLORS.subtle,
        fontSize: 14,
        fontWeight: "800",
        marginRight: 7,
    },

    moneyInput: {
        flex: 1,
        color: COLORS.text,
        fontSize: 15,
        fontWeight: "750",
        paddingVertical: 0,
    },

    valuesRow: {
        marginTop: 13,
        flexDirection: "row",
        gap: 10,
    },

    valueColumn: {
        flex: 1,
    },

    summaryBox: {
        marginTop: 14,
        borderRadius: 16,
        backgroundColor:
            "rgba(118,118,128,0.07)",
        padding: 12,
    },

    summaryRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
    },

    summaryLabel: {
        color: COLORS.subtle,
        fontSize: 12,
        fontWeight: "750",
    },

    summaryValue: {
        color: COLORS.text,
        fontSize: 15,
        fontWeight: "850",
    },

    summaryDivider: {
        height: 1,
        backgroundColor:
            "rgba(15,23,42,0.07)",
        marginVertical: 10,
    },

    toggleRow: {
        minHeight: 52,
        flexDirection: "row",
        alignItems: "center",
        gap: 11,
    },

    toggleCircle: {
        width: 25,
        height: 25,
        borderRadius: 13,
        borderWidth: 1.5,
        borderColor:
            "rgba(107,114,128,0.35)",
        alignItems: "center",
        justifyContent: "center",
    },

    toggleCircleActive: {
        width: 25,
        height: 25,
        borderRadius: 13,
        backgroundColor: COLORS.green,
        alignItems: "center",
        justifyContent: "center",
    },

    toggleTitle: {
        color: COLORS.text,
        fontSize: 14,
        fontWeight: "800",
    },

    toggleDescription: {
        marginTop: 2,
        color: COLORS.subtle,
        fontSize: 12,
        lineHeight: 16,
    },

    initialPaymentBlock: {
        marginTop: 14,
        paddingTop: 14,
        borderTopWidth: 1,
        borderTopColor:
            "rgba(15,23,42,0.07)",
    },

    validationError: {
        marginTop: 7,
        color: COLORS.red,
        fontSize: 11,
        lineHeight: 16,
        fontWeight: "650",
    },

    footer: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        paddingHorizontal: 16,
        paddingTop: 10,
        backgroundColor:
            "rgba(245,245,247,0.94)",
        borderTopWidth: 1,
        borderTopColor:
            "rgba(15,23,42,0.08)",
    },

    saveButton: {
        height: 50,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: 8,
        shadowColor: "#000",
        shadowOpacity: 0.11,
        shadowRadius: 8,
        shadowOffset: {
            width: 0,
            height: 4,
        },
        elevation: 4,
    },

    saveButtonText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "850",
    },

    headerButton: {
        minHeight: 34,
        paddingHorizontal: 8,
        alignItems: "center",
        justifyContent: "center",
    },

    headerButtonText: {
        color: COLORS.blue,
        fontSize: 15,
        fontWeight: "750",
    },
});