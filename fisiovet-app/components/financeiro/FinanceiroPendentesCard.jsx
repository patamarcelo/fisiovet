// src/components/financeiro/FinanceiroPendentesCard.jsx
// @ts-nocheck
import React, { useMemo, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useSelector } from 'react-redux';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { useThemeColor } from '@/hooks/useThemeColor';
import { selectAllEventos } from '@/src/store/slices/agendaSlice';

/* ========== Helpers ========== */

const currencyFormatterBR = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
});

function formatCurrencyBRL(value) {
    const num = Number(value || 0);
    if (!Number.isFinite(num)) return currencyFormatterBR.format(0);
    return currencyFormatterBR.format(num);
}

function hiddenMoney() {
    return '••••••';
}

function formatDateFullBR(isoStr) {
    if (!isoStr) return '—';

    const d = new Date(isoStr);

    if (Number.isNaN(d.getTime())) return '—';

    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();

    return `${dd}/${mm}/${yyyy}`;
}

function isConfirmadoStatus(statusRaw) {
    const s = String(statusRaw || '').toLowerCase();

    return (
        s === 'confirmado' ||
        s === 'confirmada' ||
        s === 'concluido' ||
        s === 'concluida'
    );
}

function getEventoPreco(item) {
    return Number(item?.financeiro?.preco ?? item?.preco ?? 0) || 0;
}

/* ========== Mini row de lançamento pendente ========== */

const PendingRow = React.memo(function PendingRow({
    item,
    border,
    textColor,
    subtleColor,
    showValues,
}) {
    const preco = getEventoPreco(item);
    const tutorNome = item.tutorNome || item.cliente || 'Tutor não informado';

    const petNome =
        item.petNome ||
        (Array.isArray(item.petIds) && item.petIds.length
            ? `(${item.petIds.length} pets)`
            : null);

    const valueLabel = showValues ? formatCurrencyBRL(preco) : hiddenMoney();

    return (
        <Pressable
            onPress={() => {
                Haptics.selectionAsync().catch(() => {});

                router.push({
                    pathname: '/(modals)/agenda-new',
                    params: { id: String(item.id) },
                });
            }}
            android_ripple={{ color: 'rgba(0,0,0,0.06)' }}
            style={({ pressed }) => [
                styles.row,
                { borderColor: border },
                pressed && { backgroundColor: 'rgba(249,115,22,0.08)' },
            ]}
        >
            <View style={styles.rowStripe} />

            <View style={styles.rowContent}>
                <View style={styles.rowTitleLine}>
                    <Text
                        style={[styles.rowTitle, { color: textColor }]}
                        numberOfLines={1}
                    >
                        {item.title || 'Sessão'}
                    </Text>

                    <Text
                        style={[
                            styles.rowValue,
                            {
                                color: '#F97316',
                                fontVariant: ['tabular-nums'],
                            },
                        ]}
                    >
                        {valueLabel}
                    </Text>
                </View>

                <View style={styles.rowBottomLine}>
                    <Text
                        style={[styles.rowMeta, { color: subtleColor }]}
                        numberOfLines={1}
                    >
                        {tutorNome}
                        {petNome ? ` • ${petNome}` : ''}
                    </Text>

                    <Text
                        style={[
                            styles.rowMeta,
                            {
                                color: subtleColor,
                                fontVariant: ['tabular-nums'],
                            },
                        ]}
                    >
                        {formatDateFullBR(item.start)}
                    </Text>
                </View>
            </View>

            <View style={styles.arrowContainer}>
                <Ionicons name="chevron-forward" size={18} color={subtleColor} />
            </View>
        </Pressable>
    );
});

/* ========== Card principal ========== */

export default function FinanceiroPendentesCard({
    cardelevation,
    showValues = false,
    onToggleValues,
    loading = false,
}) {
    const eventos = useSelector(selectAllEventos);

    const text = useThemeColor({}, 'text');
    const textIcon = useThemeColor({}, 'textIcon');
    const tint = useThemeColor({}, 'tint');

    const border = 'rgba(0,0,0,0.08)';
    const bgCard = useThemeColor({ light: '#FFFFFF', dark: '#111827' }, 'card');

    const { pendentesOrdenados, totalAReceber, totalCount, extrasCount } =
        useMemo(() => {
            const pendentes = (eventos || []).filter((e) => {
                if (!e.financeiro) return false;

                const pago = !!e.financeiro.pago;
                if (pago) return false;

                if (!isConfirmadoStatus(e.status)) return false;

                return true;
            });

            pendentes.sort((a, b) => new Date(a.start) - new Date(b.start));

            const total = pendentes.reduce(
                (acc, ev) => acc + getEventoPreco(ev),
                0
            );

            const totalCount = pendentes.length;
            const maxHome = 5;
            const extrasCount = Math.max(0, totalCount - maxHome);

            return {
                pendentesOrdenados: pendentes.slice(0, maxHome),
                totalAReceber: total,
                totalCount,
                extrasCount,
            };
        }, [eventos]);

    const temPendentes = pendentesOrdenados.length > 0;

    const totalLabel = showValues ? formatCurrencyBRL(totalAReceber) : hiddenMoney();

    const handleOpenFinanceiro = useCallback(() => {
        Haptics.selectionAsync().catch(() => {});
        router.push('/(phone)/financeiro');
    }, []);

    const handleToggleValues = useCallback(() => {
        Haptics.selectionAsync().catch(() => {});
        onToggleValues?.();
    }, [onToggleValues]);

    return (
        <View
            style={[
                styles.card,
                cardelevation,
                { borderColor: border, backgroundColor: bgCard || '#FFF' },
            ]}
        >
            <View style={styles.cardHeader}>
                <View style={styles.titleGroup}>
                    <Ionicons name="cash-outline" size={18} color={tint} />
                    <Text style={[styles.cardTitle, { color: text }]}>
                        Financeiro • A receber
                    </Text>
                </View>

                <View style={styles.headerActions}>
                    <Pressable
                        onPress={handleToggleValues}
                        hitSlop={8}
                        accessibilityRole="button"
                        accessibilityLabel={
                            showValues ? 'Ocultar valores' : 'Mostrar valores'
                        }
                        style={({ pressed }) => [
                            styles.eyeButton,
                            pressed && { opacity: 0.65 },
                        ]}
                    >
                        <Ionicons
                            name={showValues ? 'eye-outline' : 'eye-off-outline'}
                            size={19}
                            color={textIcon}
                        />
                    </Pressable>

                    <Pressable
                        onPress={handleOpenFinanceiro}
                        hitSlop={8}
                        android_ripple={{
                            color: 'rgba(0,0,0,0.06)',
                            borderless: true,
                        }}
                        style={styles.openButton}
                    >
                        <Text style={{ color: tint, fontWeight: '700', fontSize: 12 }}>
                            Ver financeiro
                        </Text>
                    </Pressable>
                </View>
            </View>

            <View style={styles.totalLine}>
                <View>
                    <Text style={{ fontSize: 12, color: textIcon }}>Total pendente</Text>

                    <Text
                        style={[
                            styles.totalValue,
                            {
                                color: '#F97316',
                                fontVariant: ['tabular-nums'],
                            },
                        ]}
                    >
                        {totalLabel}
                    </Text>
                </View>

                {loading ? (
                    <View style={styles.loadingBadge}>
                        <ActivityIndicator size="small" color="#EA580C" />
                    </View>
                ) : temPendentes ? (
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>
                            {totalCount} pendente{totalCount > 1 ? 's' : ''}
                        </Text>
                    </View>
                ) : null}
            </View>

            {loading ? (
                <View style={styles.emptyBox}>
                    <ActivityIndicator color="#F97316" />
                    <Text style={[styles.emptyText, { color: textIcon }]}>
                        Carregando pendências…
                    </Text>
                </View>
            ) : temPendentes ? (
                <>
                    <View style={styles.list}>
                        {pendentesOrdenados.map((ev) => (
                            <PendingRow
                                key={String(ev.id)}
                                item={ev}
                                border={border}
                                textColor={text}
                                subtleColor={textIcon}
                                showValues={showValues}
                            />
                        ))}
                    </View>

                    {extrasCount > 0 && (
                        <Text style={styles.extraHint}>
                            +{extrasCount} lançamento
                            {extrasCount > 1 ? 's' : ''} não exibido
                            {extrasCount > 1 ? 's' : ''} aqui. Toque em “Ver financeiro”
                            para ver todos.
                        </Text>
                    )}
                </>
            ) : (
                <View style={styles.emptyBox}>
                    <Ionicons
                        name="checkmark-done-circle-outline"
                        size={28}
                        color="#16A34A"
                    />

                    <Text style={[styles.emptyText, { color: textIcon }]}>
                        Nenhum lançamento pendente no momento.
                    </Text>

                    <Text style={[styles.emptySub, { color: textIcon }]}>
                        Quando marcar sessões como confirmadas com financeiro pendente,
                        elas aparecem aqui.
                    </Text>
                </View>
            )}
        </View>
    );
}

/* ========== Styles ========== */

const styles = StyleSheet.create({
    card: {
        borderWidth: 1,
        borderRadius: 14,
        paddingVertical: 10,
        paddingHorizontal: 10,
        marginTop: 8,
    },

    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 6,
        gap: 8,
    },

    titleGroup: {
        flex: 1,
        minWidth: 0,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },

    cardTitle: {
        fontSize: 15,
        fontWeight: '800',
    },

    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },

    eyeButton: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(118,118,128,0.10)',
    },

    openButton: {
        paddingHorizontal: 6,
        paddingVertical: 2,
    },

    totalLine: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 4,
        gap: 10,
    },

    totalValue: {
        marginTop: 2,
        fontSize: 20,
        fontWeight: '800',
    },

    badge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
        backgroundColor: 'rgba(249,115,22,0.08)',
    },

    badgeText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#EA580C',
    },

    loadingBadge: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(249,115,22,0.08)',
    },

    list: {
        marginTop: 8,
        gap: 6,
    },

    row: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 10,
        borderWidth: 1,
        backgroundColor: '#FFF',
        overflow: 'hidden',
        minHeight: 56,
    },

    rowStripe: {
        width: 4,
        alignSelf: 'stretch',
        backgroundColor: '#F97316',
    },

    rowContent: {
        flex: 1,
        paddingHorizontal: 10,
        paddingVertical: 6,
        justifyContent: 'center',
    },

    rowTitleLine: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        gap: 6,
    },

    rowTitle: {
        fontSize: 14,
        fontWeight: '700',
        flex: 1,
    },

    rowValue: {
        fontSize: 13,
        fontWeight: '800',
    },

    rowBottomLine: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 2,
        gap: 6,
    },

    rowMeta: {
        fontSize: 11,
        flexShrink: 1,
    },

    arrowContainer: {
        width: 32,
        justifyContent: 'center',
        alignItems: 'center',
    },

    emptyBox: {
        marginTop: 8,
        paddingVertical: 10,
        paddingHorizontal: 6,
        alignItems: 'center',
        gap: 4,
    },

    emptyText: {
        fontSize: 13,
        fontWeight: '600',
        textAlign: 'center',
    },

    emptySub: {
        fontSize: 11,
        textAlign: 'center',
    },

    extraHint: {
        marginTop: 6,
        fontSize: 11,
        color: '#6B7280',
        textAlign: 'right',
    },
});