// @ts-nocheck
import React, { useMemo, useState, useLayoutEffect, useCallback } from "react";
import {
  View,
  Text,
  SectionList,
  Pressable,
  TextInput,
  RefreshControl,
  Platform,
  Animated
} from "react-native";
import { useNavigation } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
// ⚠️ Import removido para evitar ScrollView interno no Screen
// import Screen from '../_ui/Screen';
import { SafeAreaView } from "react-native-safe-area-context";

import { useThemeColor } from "@/hooks/useThemeColor";
import { router } from "expo-router";

import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { loadAgenda, selectAllEventos, updateEvento, selectEventoById } from '@/src/store/slices/agendaSlice';
import { selectTutorById } from "@/src/store/slices/tutoresSlice";
import { selectPetById } from "@/src/store/slices/petsSlice";

import { shallowEqual } from "react-redux";
import { selectPetsState } from "@/src/store/slices/petsSlice";

import { Swipeable } from "react-native-gesture-handler";
import { EmptyAgendaCard } from "./_ListEmpty";





const STATUS_COLORS = {
  confirmado: "#1ABC9C",
  pendente: "#F39C12",
  cancelado: "#E74C3C"
};

// --- HELPERS ---
function fmtHour(dateStr) {
  const d = new Date(dateStr);
  const hh = d.getHours().toString().padStart(2, "0");
  const mm = d.getMinutes().toString().padStart(2, "0");
  return `${hh}:${mm}`;
}

function toDateLocal(v) {
  if (v instanceof Date) return v;
  if (v && typeof v.toDate === "function") return v.toDate(); // Firestore Timestamp
  if (typeof v === "number") return new Date(v < 1e12 ? v * 1000 : v); // epoch s/ms
  if (typeof v === "string") {
    // "YYYY-MM-DD" (sem hora) => force parse como local (com hora 00:00 local)
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return new Date(v + "T00:00:00");
    return new Date(v); // ISO com timezone, etc.
  }
  return new Date(v);
}

function startOfDayLocal(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function sameDayLocal(a, b) {
  const da = startOfDayLocal(toDateLocal(a));
  const db = startOfDayLocal(toDateLocal(b));
  return da.getTime() === db.getTime();
}

function inThisWeekLocal(dateLike, nowLike = new Date()) {
  const now = toDateLocal(nowLike);
  const start = startOfDayLocal(now);
  // Segunda-feira como início da semana
  const dow = (start.getDay() + 6) % 7; // 0=Seg, 6=Dom
  start.setDate(start.getDate() - dow);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);

  const d = toDateLocal(dateLike);
  return d >= start && d < end;
}

function fmtDateLabel(dateLike) {
  const d = startOfDayLocal(toDateLocal(dateLike));
  return d.toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  });
}



function sameDay(a, b) {
  const da = new Date(a),
    db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

function hexToRgba(hex, alpha = 1) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// --- REUSABLE: Search Field (visual igual Pets/Tutores) ---
function SearchField({
  value,
  onChangeText,
  placeholder = "Buscar...",
  onClear
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        height: 42, // padronizado
        // backgroundColor: '#F2F2F7',
        borderWidth: 2,
        borderColor: "#F2F2F7",
        borderRadius: 12,
        paddingHorizontal: 12
      }}
    >
      <Ionicons name="search" size={18} color="#8E8E93" />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#8E8E93"
        style={{ flex: 1, marginLeft: 8, paddingVertical: 0 }}
        returnKeyType="search"
      />
      {!!value &&
        <Pressable
          onPress={onClear}
          accessibilityLabel="Limpar busca"
          hitSlop={10}
          android_ripple={{ color: "#E0E0E0", borderless: true }}
        >
          <Ionicons name="close-circle" size={18} color="#8E8E93" />
        </Pressable>}
    </View>
  );
}

function SwipeAction({ label, color, onPress, last }) {
  const scale = useRef(new Animated.Value(1)).current;
  const darkBg = "rgba(75, 85, 99, 0.3)";

  const animateTo = (to) =>
    Animated.spring(scale, {
      toValue: to,
      useNativeDriver: true,
      speed: 20,
      bounciness: 6,
    }).start();

  const handlePressIn = () => animateTo(0.96);
  const handlePressOut = () => animateTo(1);

  const handlePress = async () => {
    try {
      // haptic sutil no tap
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch { }
    onPress?.();
  };

  return (
    <Animated.View
      style={{
        transform: [{ scale }],
        overflow: "hidden",
        borderTopLeftRadius: 10,
        borderBottomLeftRadius: 10,
        ...(last ? { borderTopRightRadius: 10, borderBottomRightRadius: 10 } : null),
        marginVertical: 6,
      }}
    >
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        android_ripple={{ color: "rgba(255,255,255,0.2)" }}
        style={({ pressed }) => ({
          paddingHorizontal: 14,
          minWidth: 92,
          height: '100%',
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: pressed && Platform.OS === "ios" ? darkBg : color,
          // para iOS mostrar o “escurecer” por cima da cor:
          ...(Platform.OS === "ios" && pressed ? { backgroundColor: darkBg } : { backgroundColor: color }),
        })}
      >
        <Text style={{ color: "#FFF", fontWeight: "800" }}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

// --- COMPONENT ---
export default function AgendaScreen() {
  const navigation = useNavigation();
  // Defaults: semana / todos
  const dispatch = useDispatch();
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState("todos"); // 'hoje' | 'semana' | 'todos'
  const [temporal, setTemporal] = useState("todos"); // 'futuros' | 'passados' | 'todos'
  const [refreshing, setRefreshing] = useState(false);

  const petsState = useSelector(selectPetsState, shallowEqual);
  const petsById = petsState?.byId || {};

  // normalizador (remove acentos + lower)
  const norm = (s) =>
    String(s || "")
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase();

  const tint = useThemeColor({}, "tint");
  const bg = useThemeColor({}, "background");
  const eventos = useSelector(selectAllEventos);

  eventos?.forEach(element => {
    console.log('elem: ', element)
  });


  useEffect(() => {
    dispatch(loadAgenda());
  }, [dispatch]);


  useLayoutEffect(
    () => {
      navigation.setOptions({
        headerLargeTitle: true,
        headerTitle: "Agenda",
        headerTitleStyle: { color: tint, fontWeight: "700" },
        headerStyle: { backgroundColor: bg }, // 🎨 cor de fundo do header
        headerRight: () =>
          <Pressable
            accessibilityRole="button"
            onPress={() =>
              // await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
              router.push({
                pathname: "/(modals)/agenda-new",
              })
            }
            style={({ pressed }) => ({
              paddingHorizontal: 8,
              paddingVertical: 4,
              opacity: pressed ? 0.7 : 1
            })}
          >
            <View
              style={{
                width: 28,
                height: 28,
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <Ionicons
                name={
                  Platform.OS === "ios"
                    ? "calendar-outline"
                    : "calendar-outline"
                }
                size={26}
                color={"#007AFF"}
              />
              <Ionicons
                name="add-circle"
                size={14}
                color={"#007AFF"}
                style={{ position: "absolute", right: -2, bottom: -2 }}
              />
            </View>
          </Pressable >
      });
    },
    []
  );

  // Converte diferentes formatos para Date em HORÁRIO LOCAL


  const now = new Date();


  // --- FILTER PIPELINE ---
  const filtered = useMemo(() => {
    const q = norm(query);
    const now = new Date();

    // 1) busca por título/cliente/local + NOMES DOS PETS
    let list = eventos.filter((e) => {
      // monta nomes de pets a partir dos ids
      const petNames = (e.petIds || [])
        .map((id) => petsById[String(id)]?.nome)
        .filter(Boolean)
        .join(" ");

      // inclua também tutorNome se quiser
      const haystack = norm(
        `${e.title} ${e.cliente} ${e.tutorNome || ""} ${e.local} ${petNames}`
      );

      return haystack.includes(q);
    });

    // 2) escopo (hoje/semana/todos)
    list = list.filter((e) => {
      const d = toDateLocal(e.start);
      if (scope === "todos") return true;
      if (scope === "hoje") return sameDayLocal(d, now);
      if (scope === "semana") return inThisWeekLocal(d, now);
      return true;
    });

    // 3) temporal (futuros/passados/todos)
    list = list.filter((e) => {
      const dEnd = toDateLocal(e.end);
      if (temporal === "todos") return true;
      if (temporal === "futuros") return dEnd >= now;
      if (temporal === "passados") return dEnd < now;
      return true;
    });

    // 4) ordenação
    list.sort((a, b) => new Date(a.start) - new Date(b.start));
    return list;
  }, [eventos, query, scope, temporal, petsById]);

  // --- GROUP BY DAY ---
  const sections = useMemo(
    () => {
      const map = new Map();
      for (const e of filtered) {
        const d = startOfDayLocal(toDateLocal(e.start));
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const key = `${y}-${m}-${day}`;
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(e);
      }
      return Array.from(map.entries())
        .sort((a, b) => startOfDayLocal(toDateLocal(a[0])) - startOfDayLocal(toDateLocal(b[0])))
        .map(([dateKey, items]) => ({ title: dateKey, data: items }));
    },
    [filtered]
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 600);
  }, []);

  // --- HEADER DA LISTA (100% alinhado) ---
  const ListHeader = (
    <View
      style={{
        paddingHorizontal: 12,
        paddingTop: 8,
        paddingBottom: 8,
        gap: 10
      }}
    >
      {/* Barra de busca padronizada (igual Pets/Tutores) */}
      <SearchField
        value={query}
        onChangeText={setQuery}
        placeholder="Buscar por cliente ou pet"
        onClear={() => setQuery("")}
      />

      {/* Linha 1: escopo */}
      <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
        {["hoje", "semana", "todos"].map(key =>
          <Chip
            key={key}
            label={key.toUpperCase()}
            active={scope === key}
            onPress={async () => {
              await Haptics.selectionAsync();
              setScope(key);
            }}
          />
        )}
      </View>

      {/* Linha 2: temporal */}
      <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
        {["futuros", "passados", "todos"].map(key =>
          <Chip
            key={key}
            label={key.toUpperCase()}
            active={temporal === key}
            onPress={async () => {
              await Haptics.selectionAsync();
              setTemporal(key);
            }}
          />
        )}
      </View>
    </View>
  );

  return (
    // ⚠️ Use SafeAreaView puro aqui para NÃO aninhar VirtualizedLists dentro de ScrollView
    <SafeAreaView
      style={{ flex: 1, backgroundColor: bg, marginBottom: 0 }}
      edges={["top"]}
    >
      <SectionList
        style={{ flex: 1 }}
        sections={sections}
        keyExtractor={item => item.id}
        ListHeaderComponent={ListHeader}
        renderSectionHeader={({ section }) =>
          <View style={{ backgroundColor: "#FFFFFF" }}>
            <Text
              style={{
                paddingVertical: 6,
                paddingHorizontal: 12,
                fontSize: 13,
                fontWeight: "700",
                color: "whitesmoke",
                backgroundColor: "rgba(162,181,178,1.0)"
              }}
            >
              {fmtDateLabel(section.title) + (sameDayLocal(section.title, now) ? ' • HOJE' : '')}
            </Text>
          </View>}
        renderItem={({ item }) => <EventRow item={item} />}
        ItemSeparatorComponent={() =>
          <View style={{ height: 1, backgroundColor: "#E5E7EB" }} />}
        contentContainerStyle={{ paddingBottom: 24 }}
        ListEmptyComponent={EmptyAgendaCard}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={tint} />
        }
        contentInsetAdjustmentBehavior="automatic"
        stickySectionHeadersEnabled
        removeClippedSubviews
      />
    </SafeAreaView>
  );
}

// --- UI PARTS ---
function Chip({ label, active, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: "#D0E6FF", borderless: false }}
      style={({ pressed }) => ({
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: 999,
        backgroundColor: active ? "#E6F0FF" : "#F2F2F7",
        borderWidth: active ? 1 : 0,
        borderColor: active ? "#0A84FF" : "transparent",
        opacity: pressed && Platform.OS === "ios" ? 0.85 : 1
      })}
    >
      <Text
        style={{
          fontSize: 12,
          fontWeight: "700",
          color: active ? "#0A84FF" : "#3C3C43"
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function EventRow({ item }) {
  const { title, start, end, cliente, local, observacoes, tutorId, petIds = [] } = item;
  const tutor = useSelector((state) => selectTutorById(state, tutorId));

  const dispatch = useDispatch();
  const swipeRef = React.useRef(null);
  const [pending, setPending] = useState(false);


  const evento = useSelector((s) => selectEventoById(item.id)(s));
  const status = evento?.status ?? item.status;      // use o status atua

  // pets: pega o dicionário e memoiza a transformação
  const petsState = useSelector(selectPetsState, shallowEqual);
  const petNames = useMemo(() => {
    const byId = petsState.byId || {};
    return petIds
      .map((id) => byId[String(id)])
      .filter(Boolean)
      .map((p) => p?.nome || p?.name)
      .join(", ");
  }, [petIds, petsState.byId]);


  const shortAddr = tutorShortAddress(tutor);

  // Endereço curto para o card
  function tutorShortAddress(t) {
    if (!t) return "";
    // 1) se já tiver formatado

    // 2) monta: "Rua/Av Nº, Bairro — Cidade/UF"
    const rua = t.endereco?.logradouro || t.endereco || "";
    const num = t.endereco?.numero ? ` ${t.endereco.numero}` : "";
    const bairro = t.endereco?.bairro ? `, ${t.endereco.bairro}` : "";
    const cidadeUf = (t.endereco?.cidade || t.cidade) && (t.endereco?.uf || t.uf)
      ? ` — ${t.endereco?.cidade || t.cidade}/${t.endereco?.uf || t.uf}`
      : (t.endereco?.cidade || t.cidade) ? ` — ${t.endereco?.cidade || t.cidade}` : "";

    const base = `${rua}${num}${bairro}`.trim();
    // 3) fallback minimalista
    return base
  }

  const color = STATUS_COLORS[status] || "#8E8E93";

  const handleSetStatus = useCallback(async (id, newStatus) => {
    if (pending) return;
    setPending(true);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await dispatch(updateEvento({ id: String(id), patch: { status: newStatus }, changeStatus: true })).unwrap();
    } finally {
      swipeRef.current?.close();
      setPending(false);
    }
  }, [dispatch, pending]);

  const renderRightActions = useCallback(() => (
    <View style={{ flexDirection: "row", alignItems: "stretch", gap: 6, paddingHorizontal: 8 }}>
      <SwipeAction
        label="Confirmar"
        color="#16A34A"
        onPress={() => handleSetStatus(item.id, "confirmado")}
        disabled={pending}
      />
      <SwipeAction
        label="Pendente"
        color="#F59E0B"
        onPress={() => handleSetStatus(item.id, "pendente")}
        disabled={pending}
      />
      <SwipeAction
        label="Cancelar"
        color="#EF4444"
        onPress={() => handleSetStatus(item.id, "cancelado")}
        last
        disabled={pending}
      />
    </View>
  ), [handleSetStatus, item.id]);
  return (
    // Linha full-bleed (100%)
    <Swipeable
      ref={swipeRef}
      overshootRight={false}
      renderRightActions={renderRightActions}
      friction={2}
      rightThreshold={24}
    >
      <Pressable
        onPress={async () => {
          await Haptics.selectionAsync();
          router.push({
            pathname: "/(modals)/agenda-new", // ✅ sem [id] aqui
            params: { id: String(item.id) },
          });
        }}
        android_ripple={{ color: "#ECEFF3" }}
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: pressed && Platform.OS === "ios" ? "#F7F8FA" : "#FFF",
          alignSelf: "stretch",
          width: "100%",
        })}
      >
        <View
          style={{
            width: 6,
            alignSelf: "stretch",
            backgroundColor: color,
            marginVertical: 2,
          }}
        />
        <View style={{ flex: 1, paddingHorizontal: 12, paddingVertical: 12 }}>
          {/* linha título/pets à esquerda vs horário à direita */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
              marginBottom: 6,
            }}
          >
            <Text
              style={{ fontWeight: "700", fontSize: 15, flex: 1 }}
              numberOfLines={1}
            >
              {title}
              {petNames ? ` • ${petNames}` : ""}
            </Text>
          </View>

          <Text style={{ color: "#6B7280", fontWeight: "bold" }}>
            Tutor: {cliente}
          </Text>

          {observacoes ? (
            <Text style={{ marginTop: 2, color: "#6B7280" }}>
              {observacoes}
            </Text>
          ) : null}

          {shortAddr ? (
            <Text style={{ marginTop: 2, color: "#6B7280" }}>
              • {shortAddr}
            </Text>
          ) : null}
        </View>
        <View style={{ paddingRight: 10, alignSelf: "stretch", justifyContent: 'space-between', marginBottom: 10 }}>
          <Text
            numberOfLines={1}
            style={{ color: "#6B7280", flexShrink: 0, marginTop: 10 }}
          >
            {fmtHour(start)} — {fmtHour(end)}
          </Text>
          <View>
            <StatusPill status={status} />
          </View>
        </View>
      </Pressable>
    </Swipeable>
  );
}

function StatusPill({ status }) {
  const color = STATUS_COLORS[status] || "#8E8E93";
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  const bg = hexToRgba(color, 0.15);
  return (
    <View
      style={{
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: bg,
        // marginRight: 6,
      }}
    >
      <Text style={{ fontSize: 12, fontWeight: "700", color }}>
        {label}
      </Text>
    </View>
  );
}


export { EventRow };