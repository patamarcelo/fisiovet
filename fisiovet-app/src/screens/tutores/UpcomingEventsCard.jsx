import React, { useMemo } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useSelector } from 'react-redux';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { makeSelectUpcomingEventosByTutor } from '@/src/store/slices/agendaSlice';

const STATUS_COLORS = {
    confirmado: '#16A34A',
    pendente: '#F59E0B',
    cancelado: '#EF4444',
};

function fmtHour(dateStr) {
    const d = new Date(dateStr);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
}

function fmtDate(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString("pt-BR", {
        weekday: "short", // ex: qui
        day: "2-digit",
        month: "short",   // ex: set
    });
}

export function UpcomingEventsCard({ tutorId, title = 'Próximos eventos' }) {
    // selector memoizado (criado uma única vez por tutorId)
    const selector = useMemo(
        () => makeSelectUpcomingEventosByTutor(tutorId, 5),
        [tutorId]
    );
    const eventos = useSelector((s) => selector(s));

    // pega apenas o índice de pets uma vez
    const petsById = useSelector((s) => s.pets?.byId ?? {});

    if (!eventos?.length) return null;

    return (
        <View style={{ borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 12, gap: 10, backgroundColor: 'rgba(107,114,128,0.05)' }}>
            <Text style={{ fontSize: 16, fontWeight: '700' }}>{title}</Text>

            {eventos.map((ev, idx) => {
                const color = STATUS_COLORS[ev.status] || '#6B7280';
                const petNames = (ev.petIds || [])
                    .map((id) => petsById[String(id)])
                    .filter(Boolean)
                    .map((p) => p?.nome || p?.name)
                    .join(', ');

                return (
                    <Pressable
                        key={ev.id}
                        onPress={async () => {
                            await Haptics.selectionAsync();
                            router.push({ pathname: '/(modals)/agenda-new', params: { id: String(ev.id) } });
                        }}
                        android_ripple={{ color: '#ECEFF3' }}
                        style={({ pressed }) => ({
                            paddingVertical: 10,
                            opacity: pressed ? 0.85 : 1,
                            borderTopWidth: idx === 0 ? 0 : 0.2,
                            borderTopColor: 'black',
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 10,
                        })}
                    >
                        <View style={{ width: 8, height: 8, borderRadius: 999, backgroundColor: color, marginTop: 2 }} />

                        <View style={{ flex: 1 }}>
                            <Text style={{ color: '#6B7280', marginTop: 2, marginBottom: 3 }}>
                                {fmtDate(ev.start)}  | {fmtHour(ev.start)} — {fmtHour(ev.end)}
                            </Text>
                            <Text style={{ fontWeight: '700' }} numberOfLines={1}>
                                {ev.title}{petNames ? ` • ${petNames}` : ''}
                            </Text>
                            <Text style={{ color: '#6B7280', marginVertical: 2, fontWeight: 'bold' }}>
                                {ev.observacoes ? `${ev.observacoes}` : ''}
                            </Text>
                            <Text style={{ color: '#6B7280', marginTop: 2 }}>
                                {ev.local ? `• ${ev.local}` : ''}
                            </Text>
                        </View>

                        <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                    </Pressable>
                );
            })}
        </View>
    );
}