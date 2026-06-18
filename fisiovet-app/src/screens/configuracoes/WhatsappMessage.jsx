// src/screens/config/WhatsappMessage.jsx
// @ts-nocheck

import React, {
    useCallback,
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
} from "react";

import {
    ActivityIndicator,
    Alert,
    Keyboard,
    Platform,
    Pressable,
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
    SafeAreaView,
    useSafeAreaInsets,
} from "react-native-safe-area-context";

import {
    KeyboardAwareScrollView,
    KeyboardToolbar,
} from "react-native-keyboard-controller";

import {
    Ionicons,
} from "@expo/vector-icons";

import {
    useDispatch,
    useSelector,
} from "react-redux";

import {
    DEFAULT_WHATSAPP_CONFIRMATION_MESSAGE,
    selectWhatsappConfirmationMessage,
    updateSystem,
} from "@/src/store/slices/systemSlice";

import {
    useThemeColor,
} from "@/hooks/useThemeColor";

const MAX_MESSAGE_LENGTH = 1200;

const VARIABLES = [
    {
        label: "Nome do Pet",
        value: "[Nome do Pet]",
    },
    {
        label: "Data",
        value: "[data]",
    },
    {
        label: "Horário",
        value: "[horário]",
    },
    {
        label: "Nome do Tutor",
        value: "[Nome do Tutor]",
    },
];

function clampSelection(selection, textLength) {
    const start = Math.max(
        0,
        Math.min(
            Number(selection?.start ?? textLength),
            textLength
        )
    );

    const end = Math.max(
        start,
        Math.min(
            Number(selection?.end ?? start),
            textLength
        )
    );

    return {
        start,
        end,
    };
}

function buildInsertedText({
    before,
    variable,
    after,
}) {
    const addSpaceBefore =
        before.length > 0 &&
        !/[\s\n]$/.test(before);

    const addSpaceAfter =
        after.length > 0 &&
        !/^[\s\n.,!?;:)]/.test(after);

    return (
        `${addSpaceBefore ? " " : ""}` +
        variable +
        `${addSpaceAfter ? " " : ""}`
    );
}

export default function WhatsappMessage() {
    const navigation = useNavigation();
    const dispatch = useDispatch();
    const insets = useSafeAreaInsets();

    const inputRef = useRef(null);

    const savedMessage = useSelector(
        selectWhatsappConfirmationMessage
    );

    const background = useThemeColor(
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
            dark: "#A1A1AA",
        },
        "text"
    );

    const tint = useThemeColor({}, "tint");

    const initialMessage = String(
        savedMessage || ""
    );

    const [message, setMessage] = useState(
        initialMessage
    );

    const [selection, setSelection] = useState({
        start: initialMessage.length,
        end: initialMessage.length,
    });

    const [saving, setSaving] = useState(false);

    useLayoutEffect(() => {
        navigation.setOptions({
            headerShown: false,
        });
    }, [navigation]);

    useEffect(() => {
        const nextMessage = String(
            savedMessage || ""
        );

        setMessage(nextMessage);
        setSelection({
            start: nextMessage.length,
            end: nextMessage.length,
        });
    }, [savedMessage]);

    const focusAtSelection = useCallback(
        (nextSelection) => {
            requestAnimationFrame(() => {
                inputRef.current?.focus?.();

                requestAnimationFrame(() => {
                    inputRef.current?.setNativeProps?.({
                        selection: nextSelection,
                    });
                });
            });
        },
        []
    );

    const insertVariable = useCallback(
        (variable) => {
            const base = String(message || "");
            const safeSelection = clampSelection(
                selection,
                base.length
            );

            const before = base.slice(
                0,
                safeSelection.start
            );

            const after = base.slice(
                safeSelection.end
            );

            const inserted = buildInsertedText({
                before,
                variable,
                after,
            });

            const nextMessage = (
                before + inserted + after
            ).slice(0, MAX_MESSAGE_LENGTH);

            const nextCursor = Math.min(
                before.length + inserted.length,
                nextMessage.length
            );

            const nextSelection = {
                start: nextCursor,
                end: nextCursor,
            };

            setMessage(nextMessage);
            setSelection(nextSelection);
            focusAtSelection(nextSelection);
        },
        [
            focusAtSelection,
            message,
            selection,
        ]
    );

    const handleRestore = useCallback(() => {
        Alert.alert(
            "Restaurar mensagem",
            "Deseja restaurar o texto padrão?",
            [
                {
                    text: "Cancelar",
                    style: "cancel",
                },
                {
                    text: "Restaurar",
                    onPress: () => {
                        const restored = String(
                            DEFAULT_WHATSAPP_CONFIRMATION_MESSAGE ||
                                ""
                        ).slice(
                            0,
                            MAX_MESSAGE_LENGTH
                        );

                        const nextSelection = {
                            start: restored.length,
                            end: restored.length,
                        };

                        setMessage(restored);
                        setSelection(nextSelection);
                        focusAtSelection(nextSelection);
                    },
                },
            ]
        );
    }, [focusAtSelection]);

    const handleBack = useCallback(() => {
        Keyboard.dismiss();

        if (navigation.canGoBack()) {
            navigation.goBack();
            return;
        }

        router.replace("/configuracoes");
    }, [navigation]);

    const handleSave = useCallback(async () => {
        const normalized = String(
            message || ""
        ).trim();

        if (!normalized) {
            Alert.alert(
                "Mensagem vazia",
                "Digite uma mensagem antes de salvar."
            );
            return;
        }

        try {
            setSaving(true);
            Keyboard.dismiss();

            await dispatch(
                updateSystem({
                    whatsapp: {
                        confirmationMessage:
                            normalized,
                    },
                })
            ).unwrap();

            Alert.alert(
                "Mensagem salva",
                "O modelo de confirmação foi atualizado.",
                [
                    {
                        text: "OK",
                        onPress: handleBack,
                    },
                ]
            );
        } catch (error) {
            console.warn(
                "Erro ao salvar mensagem:",
                error
            );

            Alert.alert(
                "Erro",
                "Não foi possível salvar a mensagem."
            );
        } finally {
            setSaving(false);
        }
    }, [
        dispatch,
        handleBack,
        message,
    ]);

    return (
        <SafeAreaView
            edges={[
                "top",
                "left",
                "right",
            ]}
            style={[
                styles.safeArea,
                {
                    backgroundColor:
                        background,
                },
            ]}
        >
            <View style={styles.flex}>
                <View
                    style={[
                        styles.header,
                        {
                            borderBottomColor:
                                Platform.OS === "ios"
                                    ? "rgba(60,60,67,0.18)"
                                    : "#E5E7EB",
                        },
                    ]}
                >
                    <Pressable
                        onPress={handleBack}
                        hitSlop={12}
                        style={({ pressed }) => [
                            styles.headerButton,
                            pressed && styles.pressed,
                        ]}
                    >
                        <Ionicons
                            name="chevron-back"
                            size={25}
                            color={tint}
                        />
                    </Pressable>

                    <View style={styles.headerTitleBox}>
                        <Text
                            style={[
                                styles.headerTitle,
                                { color: text },
                            ]}
                        >
                            Mensagem do WhatsApp
                        </Text>

                        <Text
                            style={[
                                styles.headerSubtitle,
                                { color: subtle },
                            ]}
                        >
                            Confirmação de atendimento
                        </Text>
                    </View>

                    <Pressable
                        onPress={handleRestore}
                        hitSlop={10}
                        style={({ pressed }) => [
                            styles.headerButton,
                            pressed && styles.pressed,
                        ]}
                    >
                        <Ionicons
                            name="refresh-outline"
                            size={21}
                            color={tint}
                        />
                    </Pressable>
                </View>

                <KeyboardAwareScrollView
                    bottomOffset={18}
                    extraKeyboardSpace={48}
                    disableScrollOnKeyboardHide
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="interactive"
                    contentContainerStyle={[
                        styles.content,
                        {
                            paddingBottom:
                                insets.bottom + 110,
                        },
                    ]}
                    showsVerticalScrollIndicator={false}
                >
                    <Text
                        style={[
                            styles.sectionLabel,
                            { color: subtle },
                        ]}
                    >
                        MODELO DA MENSAGEM
                    </Text>

                    <View
                        style={[
                            styles.editorCard,
                            {
                                backgroundColor: card,
                            },
                        ]}
                    >
                        <TextInput
                            ref={inputRef}
                            value={message}
                            onChangeText={setMessage}
                            selection={selection}
                            onSelectionChange={({
                                nativeEvent,
                            }) => {
                                setSelection(
                                    nativeEvent.selection
                                );
                            }}
                            multiline
                            returnKeyType="default"
                            blurOnSubmit={false}
                            textAlignVertical="top"
                            placeholder="Digite a mensagem de confirmação"
                            placeholderTextColor="#A1A1AA"
                            style={[
                                styles.input,
                                { color: text },
                            ]}
                            maxLength={MAX_MESSAGE_LENGTH}
                        />

                        <View style={styles.characterRow}>
                            <Text
                                style={[
                                    styles.characterCount,
                                    { color: subtle },
                                ]}
                            >
                                {message.length}/{MAX_MESSAGE_LENGTH}
                            </Text>
                        </View>
                    </View>

                    <Text
                        style={[
                            styles.helperText,
                            { color: subtle },
                        ]}
                    >
                        Toque em uma variável para inseri-la exatamente na posição atual do cursor. Se houver texto selecionado, ele será substituído.
                    </Text>

                    <Text
                        style={[
                            styles.sectionLabel,
                            { color: subtle },
                        ]}
                    >
                        VARIÁVEIS
                    </Text>

                    <View style={styles.variablesList}>
                        {VARIABLES.map((variable) => (
                            <Pressable
                                key={variable.value}
                                onPress={() =>
                                    insertVariable(
                                        variable.value
                                    )
                                }
                                style={({ pressed }) => [
                                    styles.variableButton,
                                    {
                                        backgroundColor: card,
                                    },
                                    pressed && styles.pressed,
                                ]}
                            >
                                <View style={styles.variableIcon}>
                                    <Ionicons
                                        name="add"
                                        size={16}
                                        color="#25D366"
                                    />
                                </View>

                                <View style={styles.variableTextBox}>
                                    <Text
                                        style={[
                                            styles.variableLabel,
                                            { color: text },
                                        ]}
                                    >
                                        {variable.label}
                                    </Text>

                                    <Text
                                        style={[
                                            styles.variableValue,
                                            { color: subtle },
                                        ]}
                                    >
                                        {variable.value}
                                    </Text>
                                </View>

                                <Ionicons
                                    name="add-circle-outline"
                                    size={20}
                                    color="#25D366"
                                />
                            </Pressable>
                        ))}
                    </View>
                </KeyboardAwareScrollView>

                {Platform.OS === "ios" && (
                    <KeyboardToolbar
                        style={styles.keyboardToolbar}
                    >
                        <KeyboardToolbar.Content>
                            <Text
                                style={styles.keyboardToolbarLabel}
                            >
                                Modelo da mensagem
                            </Text>
                        </KeyboardToolbar.Content>

                        <KeyboardToolbar.Done
                            text="Fechar"
                        />
                    </KeyboardToolbar>
                )}

                <View
                    style={[
                        styles.footer,
                        {
                            paddingBottom: Math.max(
                                insets.bottom,
                                14
                            ),
                            backgroundColor:
                                background,
                        },
                    ]}
                >
                    <Pressable
                        onPress={handleSave}
                        disabled={saving}
                        style={({ pressed }) => [
                            styles.saveButton,
                            pressed &&
                                styles.saveButtonPressed,
                            saving &&
                                styles.saveButtonDisabled,
                        ]}
                    >
                        {saving ? (
                            <ActivityIndicator
                                color="#FFFFFF"
                                size="small"
                            />
                        ) : (
                            <Ionicons
                                name="checkmark"
                                size={19}
                                color="#FFFFFF"
                            />
                        )}

                        <Text style={styles.saveButtonText}>
                            {saving
                                ? "Salvando..."
                                : "Salvar mensagem"}
                        </Text>
                    </Pressable>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    flex: {
        flex: 1,
    },

    safeArea: {
        flex: 1,
    },

    header: {
        minHeight: 64,
        paddingHorizontal: 12,
        flexDirection: "row",
        alignItems: "center",
        borderBottomWidth:
            StyleSheet.hairlineWidth,
    },

    headerButton: {
        width: 42,
        height: 42,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 21,
    },

    headerTitleBox: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },

    headerTitle: {
        fontSize: 16,
        lineHeight: 21,
        fontWeight: "800",
        letterSpacing: -0.25,
    },

    headerSubtitle: {
        marginTop: 1,
        fontSize: 11.5,
        lineHeight: 16,
        fontWeight: "500",
    },

    content: {
        paddingHorizontal: 14,
        paddingTop: 16,
    },

    sectionLabel: {
        marginHorizontal: 4,
        marginBottom: 7,
        marginTop: 8,
        fontSize: 11,
        fontWeight: "800",
        letterSpacing: 0.45,
    },

    editorCard: {
        minHeight: 260,
        borderRadius: 16,
        padding: 14,
        shadowColor: "#000000",
        shadowOpacity: 0.045,
        shadowRadius: 7,
        shadowOffset: {
            width: 0,
            height: 3,
        },
        elevation: 2,
    },

    input: {
        minHeight: 210,
        padding: 0,
        fontSize: 15,
        lineHeight: 22,
        fontWeight: "500",
    },

    characterRow: {
        marginTop: 8,
        alignItems: "flex-end",
    },

    characterCount: {
        fontSize: 11,
        fontWeight: "600",
    },

    helperText: {
        marginTop: 10,
        marginHorizontal: 4,
        fontSize: 12,
        lineHeight: 18,
        fontWeight: "500",
    },

    variablesList: {
        gap: 8,
    },

    variableButton: {
        minHeight: 60,
        paddingHorizontal: 13,
        paddingVertical: 9,
        borderRadius: 14,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        shadowColor: "#000000",
        shadowOpacity: 0.035,
        shadowRadius: 5,
        shadowOffset: {
            width: 0,
            height: 2,
        },
        elevation: 1,
    },

    variableIcon: {
        width: 28,
        height: 28,
        borderRadius: 8,
        backgroundColor:
            "rgba(37,211,102,0.12)",
        alignItems: "center",
        justifyContent: "center",
    },

    variableTextBox: {
        flex: 1,
        minWidth: 0,
    },

    variableLabel: {
        fontSize: 14,
        fontWeight: "700",
    },

    variableValue: {
        marginTop: 2,
        fontSize: 11.5,
        fontWeight: "500",
    },

    keyboardToolbar: {
        minHeight: 46,
        borderTopWidth:
            StyleSheet.hairlineWidth,
        borderTopColor:
            "rgba(60,60,67,0.20)",
        backgroundColor:
            "rgba(248,248,248,0.98)",
    },

    keyboardToolbarLabel: {
        color: "#6B7280",
        fontSize: 12,
        fontWeight: "650",
    },

    footer: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        paddingHorizontal: 14,
        paddingTop: 10,
        borderTopWidth:
            StyleSheet.hairlineWidth,
        borderTopColor:
            "rgba(60,60,67,0.16)",
    },

    saveButton: {
        minHeight: 50,
        borderRadius: 14,
        backgroundColor: "#25D366",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        shadowColor: "#25D366",
        shadowOpacity: 0.2,
        shadowRadius: 8,
        shadowOffset: {
            width: 0,
            height: 4,
        },
        elevation: 3,
    },

    saveButtonPressed: {
        opacity: 0.84,
        transform: [
            {
                scale: 0.99,
            },
        ],
    },

    saveButtonDisabled: {
        opacity: 0.7,
    },

    saveButtonText: {
        color: "#FFFFFF",
        fontSize: 15,
        fontWeight: "800",
    },

    pressed: {
        opacity: 0.62,
    },
});
