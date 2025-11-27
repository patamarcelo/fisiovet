// src/components/financeiro/FinanceiroPendentesCard.jsx
// @ts-nocheck
import React, { useMemo, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSelector } from 'react-redux';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { useThemeColor } from '@/hooks/useThemeColor';
import { selectAllEventos } from '@/src/store/slices/agendaSlice';

/* ========== Helpers ========== */

// formatter criado uma vez só (melhor performance)
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

function formatDateBRShort(isoStr) {
    if (!isoStr) return '—';
    const d = new Date(isoStr);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${dd}/${mm}`;
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

/* ========== Mini row de lançamento pendente ========== */

const PendingRow = React.memo(function PendingRow({
    item,
    border,
    textColor,
    subtleColor,
}) {
    const preco = item.financeiro?.preco ?? item.preco ?? 0;
    const tutorNome = item.tutorNome || item.cliente || 'Tutor não informado';
    const petNome =
        item.petNome ||
        (Array.isArray(item.petIds) && item.petIds.length
            ? `(${item.petIds.length} pets)`
            : null);

    const formatDateFullBR = (isoStr) => {
        if (!isoStr) return '—';
        const d = new Date(isoStr);
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        return `${dd}/${mm}/${yyyy}`;
    };

    return (
        <Pressable
            onPress={async () => {
                await Haptics.selectionAsync(); // 💥 haptic ao tocar
                router.push({
                    pathname: '/(modals)/agenda-new',
                    params: { id: String(item.id) },
                });
            }}
            android_ripple={{ color: 'rgba(0,0,0,0.06)' }}
            style={({ pressed }) => [
                styles.row,
                { borderColor: border },
                // 🔹 efeito visual no iOS / geral
                pressed && { backgroundColor: 'rgba(249,115,22,0.08)' }, // laranja bem suave
            ]}
        >
            {/* faixa esquerda fixa */}
            <View style={styles.rowStripe} />

            {/* conteúdo central */}
            <View style={styles.rowContent}>
                {/* linha principal: título + valor */}
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
                            { color: '#F97316', fontVariant: ['tabular-nums'] },
                        ]}
                    >
                        {formatCurrencyBRL(preco)}
                    </Text>
                </View>

                {/* linha inferior: tutor/pet | data */}
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
                            { color: subtleColor, fontVariant: ['tabular-nums'] },
                        ]}
                    >
                        {formatDateFullBR(item.start)}
                    </Text>
                </View>
            </View>

            {/* seta alinhada ao centro */}
            <View style={styles.arrowContainer}>
                <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={subtleColor}
                />
            </View>
        </Pressable>
    );
});


/* ========== Card principal ========== */

export default function FinanceiroPendentesCard({cardelevation}) {
    const eventos = useSelector(selectAllEventos);

    const bg = useThemeColor({}, 'background');
    const text = useThemeColor({}, 'text');
    const textIcon = useThemeColor({}, 'textIcon');
    const tint = useThemeColor({}, 'tint');
    const border = 'rgba(0,0,0,0.08)';
    const bgCard = useThemeColor({ light: '#FFFFFF', dark: '#111827' }, 'card');

    // filtra só eventos com financeiro pendente (não pago)
    const { pendentesOrdenados, totalAReceber, totalCount, extrasCount } =
        useMemo(() => {
            const pendentes = (eventos || []).filter((e) => {
                if (!e.financeiro) return false;
                const pago = !!e.financeiro.pago;
                if (pago) return false;
                // opcional: só confirmados / concluídos
                if (!isConfirmadoStatus(e.status)) return false;
                return true;
            });

            pendentes.sort((a, b) => new Date(a.start) - new Date(b.start));

            const total = pendentes.reduce(
                (acc, ev) => acc + Number(ev.financeiro?.preco ?? ev.preco ?? 0),
                0
            );

            const totalCount = pendentes.length;
            const maxHome = 5;
            const extrasCount = Math.max(0, totalCount - maxHome);

            return {
                pendentesOrdenados: pendentes.slice(0, maxHome), // limita a 5 na Home
                totalAReceber: total,
                totalCount,
                extrasCount,
            };
        }, [eventos]);

    const temPendentes = pendentesOrdenados.length > 0;

    const handleOpenFinanceiro = useCallback(async () => {
        await Haptics.selectionAsync();
        router.push('/(phone)/financeiro');
    }, []);

    return (
        <View
            style={[
                styles.card,
                cardelevation,
                { borderColor: border, backgroundColor: bgCard || '#FFF' },
            ]}
        >
            {/* Cabeçalho */}
            <View style={styles.cardHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="cash-outline" size={18} color={tint} />
                    <Text style={[styles.cardTitle, { color: text }]}>
                        Financeiro • A receber
                    </Text>
                </View>

                <Pressable
                    onPress={handleOpenFinanceiro}
                    hitSlop={8}
                    android_ripple={{ color: 'rgba(0,0,0,0.06)', borderless: true }}
                    style={{ paddingHorizontal: 6, paddingVertical: 2 }}
                >
                    <Text style={{ color: tint, fontWeight: '700', fontSize: 12 }}>
                        Ver financeiro
                    </Text>
                </Pressable>
            </View>

            {/* Total */}
            <View style={styles.totalLine}>
                <View>
                    <Text style={{ fontSize: 12, color: textIcon }}>Total pendente</Text>
                    <Text
                        style={[
                            styles.totalValue,
                            { color: '#F97316', fontVariant: ['tabular-nums'] },
                        ]}
                    >
                        {formatCurrencyBRL(totalAReceber)}
                    </Text>
                </View>

                {temPendentes && (
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>
                            {totalCount} pendente{totalCount > 1 ? 's' : ''}
                        </Text>
                    </View>
                )}
            </View>

            {/* Lista resumida */}
            {temPendentes ? (
                <>
                    <View style={{ marginTop: 8, gap: 6 }}>
                        {pendentesOrdenados.map((ev) => (
                            <PendingRow
                                key={String(ev.id)}
                                item={ev}
                                border={border}
                                textColor={text}
                                subtleColor={textIcon}
                            />
                        ))}
                    </View>

                    {extrasCount > 0 && (
                        <Text style={styles.extraHint}>
                            +{extrasCount} lançamento
                            {extrasCount > 1 ? 's' : ''} não exibido
                            {extrasCount > 1 ? 's' : ''} aqui. Toque em “Ver financeiro” para
                            ver todos.
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
    },
    cardTitle: {
        fontSize: 15,
        fontWeight: '800',
    },

    totalLine: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 4,
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

    row: {
        flexDirection: 'row',
        alignItems: 'stretch',
        borderRadius: 10,
        borderWidth: 1,
        backgroundColor: '#FFF',
        overflow: 'hidden',
        minHeight: 52,
    },
    rowStripe: {
        width: 4,
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


});
