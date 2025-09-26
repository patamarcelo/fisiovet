// app/configuracoes/agenda/inicio.jsx
// @ts-nocheck
import React, { useEffect, useRef, useState, useLayoutEffect } from 'react';
import { View, Text, Platform, Pressable, Modal } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation, router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

import { selectStartOfDay, updateSystem } from '@/src/store/slices/systemSlice';
import Screen from '../_ui/Screen';

const pad2 = (n) => String(n).padStart(2, '0');
const hhmmToDate = (hhmm = '08:00') => {
    const m = (hhmm || '08:00').match(/^(\d{1,2}):([0-5]\d)$/) || [0, '8', '00'];
    const h = parseInt(m[1], 10);
    const mi = parseInt(m[2], 10);
    const d = new Date();
    d.setHours(h, mi, 0, 0);
    return d;
};
const dateToHHMM = (d) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;

export default function InicioDoDiaScreen() {
    const dispatch = useDispatch();
    const navigation = useNavigation();

    // valor vindo do store (ex.: "08:00")
    const storedStart = useSelector(selectStartOfDay);

    // estado local
    const [value, setValue] = useState(hhmmToDate(storedStart));
    const [saving, setSaving] = useState(false);
    const [savedFlag, setSavedFlag] = useState(false);
    const [pickerVisible, setPickerVisible] = useState(false);

    const firstRenderRef = useRef(true);
    const debounceRef = useRef(null);

    useLayoutEffect(() => {
        navigation.setOptions({
            headerTitle: 'Início do dia',
            headerLeft: () => (
                <Pressable onPress={() => router.back()} hitSlop={10} style={{ padding: 6 }}>
                    <Text style={{ color: '#007AFF', fontWeight: '700' }}>Voltar</Text>
                </Pressable>
            ),
            headerRight: () => null,
        });
    }, [navigation]);

    // auto-save com debounce; ignora o primeiro render se nada mudou
    useEffect(() => {
        if (!value) return;

        const current = dateToHHMM(value);
        const initial = storedStart || '08:00';

        if (firstRenderRef.current) {
            firstRenderRef.current = false;
            if (current === initial) {
                setSaving(false);
                setSavedFlag(false);
                return;
            }
            // se diferente já ao entrar, segue para salvar
        }

        if (debounceRef.current) clearTimeout(debounceRef.current);
        setSaving(true);
        setSavedFlag(false);

        debounceRef.current = setTimeout(async () => {
            try {
                await dispatch(updateSystem({ startOfDay: current })).unwrap();
                setSavedFlag(true);
                await Haptics.selectionAsync();
            } catch (e) {
                console.warn('Erro ao salvar início do dia:', e);
            } finally {
                setSaving(false);
            }
        }, 350);

        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [value, storedStart, dispatch]);

    const openPicker = () => setPickerVisible(true);
    const closePicker = () => setPickerVisible(false);

    const handleChange = (event, date) => {
        if (Platform.OS === 'android') {
            if (event?.type === 'set' && date) setValue(date);
            setPickerVisible(false);
        } else {
            if (date) setValue(date);
        }
    };

    return (
        <Screen style={{ flex: 1, backgroundColor: '#FFF', padding: 16, gap: 14 }}>
            {/* Célula que abre o picker */}
            <Pressable
                onPress={openPicker}
                style={({ pressed }) => ({
                    borderWidth: 1.5,
                    borderColor: '#E5E7EB',
                    borderRadius: 12,
                    paddingHorizontal: 14,
                    paddingVertical: 14,
                    backgroundColor: pressed ? '#F9FAFB' : '#FFFFFF',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                })}
            >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View
                        style={{
                            width: 26, height: 26, borderRadius: 6,
                            backgroundColor: '#10B981', alignItems: 'center', justifyContent: 'center',
                        }}
                    >
                        <Ionicons name="sunny-outline" size={16} color="#fff" />
                    </View>
                    <View>
                        <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' }}>Início do dia</Text>
                        <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
                            Horário padrão de abertura da agenda
                        </Text>
                    </View>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#10B981' }}>
                        {dateToHHMM(value)}
                    </Text>
                    <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                </View>
            </Pressable>

            {/* Status de salvamento */}
            <Text style={{ fontSize: 12, color: saving ? '#6B7280' : '#16A34A' }}>
                {saving ? 'Salvando…' : (savedFlag ? 'Salvo' : ' ')}
            </Text>

            {/* iOS: modal com spinner */}
            {Platform.OS === 'ios' ? (
                <Modal
                    visible={pickerVisible}
                    animationType="slide"
                    transparent
                    onRequestClose={closePicker}
                >
                    <Pressable onPress={closePicker} style={{ flex: 1 }} />
                    <View style={{ padding: 12, backgroundColor: 'rgba(0,0,0,0.05)' }}>
                        <View style={{ alignItems: 'flex-end', paddingHorizontal: 6, paddingBottom: 4 }}>
                            <Pressable onPress={closePicker} hitSlop={10} style={{ padding: 6 }}>
                                <Text style={{ color: '#007AFF', fontWeight: '700' }}>OK</Text>
                            </Pressable>
                        </View>
                        <DateTimePicker
                            value={value}
                            onChange={handleChange}
                            mode="time"
                            display="spinner"
                            is24Hour
                            minuteInterval={5}
                            themeVariant="light"
                            textColor="#111827"
                            style={{ backgroundColor: 'transparent' }}
                        />
                    </View>
                </Modal>
            ) : (
                // Android: abre o diálogo do sistema quando renderiza
                pickerVisible && (
                    <DateTimePicker
                        value={value}
                        onChange={handleChange}
                        mode="time"
                        display="default"
                        is24Hour
                        minuteInterval={5}
                    />
                )
            )}

            {/* Dica */}
            <View style={{ marginTop: 8, flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <Ionicons name="information-circle-outline" size={18} color="#8E8E93" />
                <Text style={{ color: '#6B7280' }}>
                    Toque para ajustar o horário de início. O valor é salvo automaticamente.
                </Text>
            </View>
        </Screen>
    );
}