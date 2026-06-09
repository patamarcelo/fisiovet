// src/screens/agenda/List.jsx
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
  Animated,
  InteractionManager,
  Platform,
  Pressable,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect, useNavigation } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { shallowEqual, useDispatch, useSelector } from "react-redux";
import { Swipeable } from "react-native-gesture-handler";

import { useThemeColor } from "@/hooks/useThemeColor";
import {
  loadAgenda,
  selectAllEventos,
  selectEventoById,
  updateEvento,
} from "@/src/store/slices/agendaSlice";
import { selectTutorById } from "@/src/store/slices/tutoresSlice";
import { selectPetsState } from "@/src/store/slices/petsSlice";

import { EmptyAgendaCard } from "./_ListEmpty";

const STATUS_COLORS = {
  confirmado: "#1ABC9C",
  pendente: "#F39C12",
  cancelado: "#E74C3C",
};

const STATUS_LABELS = {
  confirmado: "Confirmado",
  pendente: "Pendente",
  cancelado: "Cancelado",
};

const SCOPE_FILTERS = [
  { key: "hoje", label: "Hoje", tone: "blue" },
  { key: "semana", label: "Semana", tone: "blue" },
  { key: "todos", label: "Todos", tone: "blue" },
];

const TEMPORAL_FILTERS = [
  { key: "futuros", label: "Futuros", tone: "green" },
  { key: "passados", label: "Passados", tone: "orange" },
  { key: "todos", label: "Todos", tone: "blue" },
];

const STATUS_FILTERS = [
  { key: "todos", label: "Status", tone: "blue" },
  { key: "confirmado", label: "Confirmados", tone: "green" },
  { key: "pendente", label: "Pendentes", tone: "orange" },
  { key: "cancelado", label: "Cancelados", tone: "red" },
];

function norm(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

function toDateLocal(v) {
  if (v instanceof Date) return v;
  if (v && typeof v.toDate === "function") return v.toDate();
  if (typeof v === "number") return new Date(v < 1e12 ? v * 1000 : v);

  if (typeof v === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return new Date(`${v}T00:00:00`);
    return new Date(v);
  }

  return new Date(v);
}

function fmtHour(dateStr) {
  const d = toDateLocal(dateStr);

  if (Number.isNaN(d.getTime())) return "--:--";

  const hh = d.getHours().toString().padStart(2, "0");
  const mm = d.getMinutes().toString().padStart(2, "0");

  return `${hh}:${mm}`;
}

function startOfDayLocal(d) {
  const safeDate = toDateLocal(d);

  if (Number.isNaN(safeDate.getTime())) return new Date();

  return new Date(
    safeDate.getFullYear(),
    safeDate.getMonth(),
    safeDate.getDate()
  );
}

function sameDayLocal(a, b) {
  const da = startOfDayLocal(a);
  const db = startOfDayLocal(b);

  return da.getTime() === db.getTime();
}

function inThisWeekLocal(dateLike, nowLike = new Date()) {
  const now = toDateLocal(nowLike);
  const start = startOfDayLocal(now);

  const dow = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - dow);

  const end = new Date(start);
  end.setDate(start.getDate() + 7);

  const d = toDateLocal(dateLike);

  return d >= start && d < end;
}

function fmtDateLabel(dateLike) {
  const d = startOfDayLocal(dateLike);

  return d.toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

function hexToRgba(hex, alpha = 1) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getEventPetNames(event, petsById) {
  return (event?.petIds || [])
    .map((id) => petsById?.[String(id)]?.nome || petsById?.[String(id)]?.name)
    .filter(Boolean)
    .join(", ");
}

function tutorShortAddress(tutor) {
  if (!tutor) return "";

  const rua = tutor.endereco?.logradouro || tutor.endereco || "";
  const num = tutor.endereco?.numero ? ` ${tutor.endereco.numero}` : "";
  const bairro = tutor.endereco?.bairro ? `, ${tutor.endereco.bairro}` : "";
  const cidade = tutor.endereco?.cidade || tutor.cidade || "";
  const uf = tutor.endereco?.uf || tutor.uf || "";

  const cidadeUf =
    cidade && uf ? ` — ${cidade}/${uf}` : cidade ? ` — ${cidade}` : "";

  return `${rua}${num}${bairro}${cidadeUf}`.trim();
}

function makeSections(items) {
  const map = new Map();

  for (const event of items || []) {
    const d = startOfDayLocal(toDateLocal(event.start));
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const key = `${y}-${m}-${day}`;

    if (!map.has(key)) map.set(key, []);
    map.get(key).push(event);
  }

  return Array.from(map.entries())
    .sort((a, b) => toDateLocal(a[0]) - toDateLocal(b[0]))
    .map(([dateKey, data]) => ({
      title: dateKey,
      data: data.sort((a, b) => toDateLocal(a.start) - toDateLocal(b.start)),
    }));
}

function SearchField({ value, onChangeText, placeholder, onClear }) {
  return (
    <View style={styles.searchWrap}>
      <Ionicons name="search" size={18} color="#8E8E93" />

      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#8E8E93"
        style={styles.searchInput}
        returnKeyType="search"
        autoCorrect={false}
        autoCapitalize="none"
      />

      {!!value && (
        <Pressable
          onPress={onClear}
          accessibilityLabel="Limpar busca"
          hitSlop={10}
          android_ripple={{ color: "#E0E0E0", borderless: true }}
        >
          <Ionicons name="close-circle" size={18} color="#8E8E93" />
        </Pressable>
      )}
    </View>
  );
}

const Chip = React.memo(function Chip({ label, active, onPress, tone = "blue" }) {
  const palette = {
    blue: {
      activeBg: "rgba(10,132,255,0.12)",
      activeBorder: "rgba(10,132,255,0.32)",
      activeText: "#0A84FF",
    },
    green: {
      activeBg: "rgba(22,163,74,0.12)",
      activeBorder: "rgba(22,163,74,0.30)",
      activeText: "#16A34A",
    },
    orange: {
      activeBg: "rgba(245,158,11,0.13)",
      activeBorder: "rgba(245,158,11,0.32)",
      activeText: "#D97706",
    },
    red: {
      activeBg: "rgba(239,68,68,0.11)",
      activeBorder: "rgba(239,68,68,0.30)",
      activeText: "#EF4444",
    },
  };

  const p = palette[tone] || palette.blue;

  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: "rgba(10,132,255,0.10)", borderless: false }}
      style={({ pressed }) => [
        styles.chip,
        active && {
          backgroundColor: p.activeBg,
          borderColor: p.activeBorder,
        },
        pressed && Platform.OS === "ios" ? { opacity: 0.82 } : null,
      ]}
    >
      <Text
        style={[
          styles.chipText,
          active && {
            color: p.activeText,
            fontWeight: "850",
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
});

const AgendaListHeader = React.memo(function AgendaListHeader({
  query,
  setQuery,
  scope,
  setScope,
  temporal,
  setTemporal,
  statusFilter,
  setStatusFilter,
  total,
  filteredTotal,
  onClearAll,
}) {
  const handleSelect = useCallback((setter, value) => {
    Haptics.selectionAsync().catch(() => { });
    setter(value);
  }, []);

  const hasActiveFilters =
    !!query ||
    scope !== "todos" ||
    temporal !== "todos" ||
    statusFilter !== "todos";

  return (
    <View style={styles.listHeader}>
      <View style={styles.filterMetaRow}>
        <Text style={styles.filterMetaText}>
          {filteredTotal} de {total} evento{total === 1 ? "" : "s"}
        </Text>

        {hasActiveFilters && (
          <Pressable
            onPress={onClearAll}
            style={({ pressed }) => [
              styles.clearInlineButton,
              pressed && { opacity: 0.75 },
            ]}
            hitSlop={8}
          >
            <Ionicons name="close-circle-outline" size={14} color="#EF4444" />
            <Text style={styles.clearInlineText}>Limpar filtros</Text>
          </Pressable>
        )}
      </View>

      <SearchField
        value={query}
        onChangeText={setQuery}
        placeholder="Buscar por tutor, pet, local ou observação"
        onClear={() => setQuery("")}
      />

      <View style={styles.filtersBlock}>
        <View style={styles.chipRow}>
          {SCOPE_FILTERS.map((item) => (
            <Chip
              key={item.key}
              label={item.label}
              active={scope === item.key}
              tone={item.tone}
              onPress={() => handleSelect(setScope, item.key)}
            />
          ))}
        </View>

        <View style={styles.chipRow}>
          {TEMPORAL_FILTERS.map((item) => (
            <Chip
              key={item.key}
              label={item.label}
              active={temporal === item.key}
              tone={item.tone}
              onPress={() => handleSelect(setTemporal, item.key)}
            />
          ))}
        </View>

        <View style={styles.chipRow}>
          {STATUS_FILTERS.map((item) => (
            <Chip
              key={item.key}
              label={item.label}
              active={statusFilter === item.key}
              tone={item.tone}
              onPress={() => handleSelect(setStatusFilter, item.key)}
            />
          ))}
        </View>
      </View>
    </View>
  );
});

function SwipeAction({ label, color, onPress, last, disabled }) {
  const scale = useRef(new Animated.Value(1)).current;

  const animateTo = useCallback(
    (to) => {
      Animated.spring(scale, {
        toValue: to,
        useNativeDriver: true,
        speed: 20,
        bounciness: 6,
      }).start();
    },
    [scale]
  );

  const handlePress = useCallback(async () => {
    if (disabled) return;

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch { }

    onPress?.();
  }, [disabled, onPress]);

  return (
    <Animated.View
      style={[
        styles.swipeActionWrap,
        last && styles.swipeActionWrapLast,
        { transform: [{ scale }] },
      ]}
    >
      <Pressable
        disabled={disabled}
        onPressIn={() => animateTo(0.96)}
        onPressOut={() => animateTo(1)}
        onPress={handlePress}
        android_ripple={{ color: "rgba(255,255,255,0.2)" }}
        style={({ pressed }) => [
          styles.swipeAction,
          { backgroundColor: color },
          pressed && Platform.OS === "ios" ? { opacity: 0.82 } : null,
          disabled && { opacity: 0.7 },
        ]}
      >
        <Text style={styles.swipeActionText}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

export default function AgendaScreen() {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const listRef = useRef(null);
  const sectionsRef = useRef([]);

  const [query, setQuery] = useState("");
  const [scope, setScope] = useState("todos");
  const [temporal, setTemporal] = useState("todos");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [refreshing, setRefreshing] = useState(false);

  const tint = useThemeColor({}, "tint");
  const bg = useThemeColor({}, "background");

  const eventos = useSelector(selectAllEventos);
  const petsState = useSelector(selectPetsState, shallowEqual);
  const petsById = petsState?.byId || {};

  useEffect(() => {
    dispatch(loadAgenda());
  }, [dispatch]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLargeTitle: false,
      headerTitle: "Agenda",
      headerTitleStyle: { color: tint, fontWeight: "800" },
      headerStyle: { backgroundColor: bg },
      headerShadowVisible: false,
      headerRight: () => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Adicionar evento"
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => { });
            router.push({ pathname: "/(modals)/agenda-new" });
          }}
          style={({ pressed }) => [
            styles.headerAddButton,
            pressed && { opacity: 0.75 },
          ]}
          hitSlop={8}
        >
          <Ionicons name="calendar-outline" size={25} color="#007AFF" />
          <Ionicons
            name="add-circle"
            size={14}
            color="#007AFF"
            style={styles.headerAddBadge}
          />
        </Pressable>
      ),
    });
  }, [navigation, tint, bg]);

  const filtered = useMemo(() => {
    const q = norm(query);
    const currentNow = new Date();

    let list = (eventos || []).filter((event) => {
      const petNames = getEventPetNames(event, petsById);
      const haystack = norm(
        `${event.title} ${event.cliente} ${event.tutorNome || ""} ${event.local || ""
        } ${event.observacoes || ""} ${petNames}`
      );

      return haystack.includes(q);
    });

    list = list.filter((event) => {
      const d = toDateLocal(event.start);

      if (scope === "hoje") return sameDayLocal(d, currentNow);
      if (scope === "semana") return inThisWeekLocal(d, currentNow);

      return true;
    });

    list = list.filter((event) => {
      const dEnd = toDateLocal(event.end);

      if (temporal === "futuros") return dEnd >= currentNow;
      if (temporal === "passados") return dEnd < currentNow;

      return true;
    });

    list = list.filter((event) => {
      if (statusFilter === "todos") return true;
      return String(event.status || "pendente").toLowerCase() === statusFilter;
    });

    return list.sort((a, b) => toDateLocal(a.start) - toDateLocal(b.start));
  }, [eventos, petsById, query, scope, temporal, statusFilter]);

  const sections = useMemo(() => makeSections(filtered), [filtered]);

  useEffect(() => {
    sectionsRef.current = sections || [];
  }, [sections]);

  const total = eventos?.length || 0;
  const filteredTotal = filtered?.length || 0;
  const now = useMemo(() => new Date(), [sections.length]);

  const scrollToTop = useCallback((animated = false) => {
    requestAnimationFrame(() => {
      InteractionManager.runAfterInteractions(() => {
        try {
          const responder = listRef.current?.getScrollResponder?.();

          if (responder?.scrollTo) {
            responder.scrollTo({
              x: 0,
              y: 0,
              animated,
            });
            return;
          }

          const currentSections = sectionsRef.current || [];
          const firstSection = currentSections[0];

          if (!firstSection || !firstSection.data?.length) return;

          listRef.current?.scrollToLocation?.({
            sectionIndex: 0,
            itemIndex: 0,
            animated,
            viewPosition: 0,
          });
        } catch (err) {
          console.log("Agenda scrollToTop ignorado:", err?.message);
        }
      });
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      scrollToTop(false);
    }, [scrollToTop])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);

    try {
      await dispatch(loadAgenda()).unwrap?.();
    } catch {
      dispatch(loadAgenda());
    } finally {
      setRefreshing(false);
    }
  }, [dispatch]);

  const clearAllFilters = useCallback(() => {
    Haptics.selectionAsync().catch(() => { });
    setQuery("");
    setScope("todos");
    setTemporal("todos");
    setStatusFilter("todos");
    scrollToTop(false);
  }, [scrollToTop]);

  const renderSectionHeader = useCallback(
    ({ section }) => {
      const isToday = sameDayLocal(section.title, now);

      return (
        <View style={styles.sectionBandWrap}>
          <View style={styles.sectionBand}>
            <Text style={styles.sectionBandText}>
              {fmtDateLabel(section.title)}
              {isToday ? " • HOJE" : ""}
            </Text>

            <Text style={styles.sectionBandCount}>
              {section.data.length} evento{section.data.length === 1 ? "" : "s"}
            </Text>
          </View>
        </View>
      );
    },
    [now]
  );

  const renderItem = useCallback(
    ({ item }) => <EventRow item={item} petsById={petsById} />,
    [petsById]
  );

  const listHeader = useMemo(
    () => (
      <AgendaListHeader
        query={query}
        setQuery={setQuery}
        scope={scope}
        setScope={(v) => {
          setScope(v);
          scrollToTop(false);
        }}
        temporal={temporal}
        setTemporal={(v) => {
          setTemporal(v);
          scrollToTop(false);
        }}
        statusFilter={statusFilter}
        setStatusFilter={(v) => {
          setStatusFilter(v);
          scrollToTop(false);
        }}
        total={total}
        filteredTotal={filteredTotal}
        onClearAll={clearAllFilters}
      />
    ),
    [
      query,
      scope,
      temporal,
      statusFilter,
      total,
      filteredTotal,
      clearAllFilters,
      scrollToTop,
    ]
  );

  const hasFilters =
    !!query || scope !== "todos" || temporal !== "todos" || statusFilter !== "todos";

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: bg }]} edges={["left", "right"]}>
      <SectionList
        ref={listRef}
        style={styles.list}
        sections={sections}
        keyExtractor={(item) => String(item.id)}
        ListHeaderComponent={listHeader}
        renderSectionHeader={renderSectionHeader}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={[
          styles.listContent,
          sections.length === 0 && { flexGrow: 1 },
        ]}
        ListEmptyComponent={
          <EmptyAgendaCard
            title="Nenhum evento encontrado"
            subtitle="Ajuste os filtros ou adicione um novo evento."
            actionLabel="Adicionar evento"
            onClearFilters={clearAllFilters}
            hasFilters={hasFilters}
          />
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={tint}
            colors={[tint]}
            progressBackgroundColor="#FFFFFF"
          />
        }
        contentInsetAdjustmentBehavior="automatic"
        stickySectionHeadersEnabled
        removeClippedSubviews={Platform.OS === "android"}
        initialNumToRender={12}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        windowSize={9}
        keyboardShouldPersistTaps="handled"
      />
    </SafeAreaView>
  );
}

const EventRow = React.memo(function EventRow({ item, petsById }) {
  const { id, title, start, end, cliente, observacoes, tutorId, petIds = [] } =
    item;

  const dispatch = useDispatch();
  const swipeRef = useRef(null);

  const [pending, setPending] = useState(false);

  const text = useThemeColor({}, "text");
  const subtle = useThemeColor({ light: "#6B7280", dark: "#9AA0A6" }, "text");

  const tutor = useSelector((state) => selectTutorById(state, tutorId));
  const evento = useSelector((state) => selectEventoById(id)(state));

  const status = evento?.status ?? item.status ?? "pendente";
  const color = STATUS_COLORS[status] || "#8E8E93";

  const petNames = useMemo(
    () =>
      (petIds || [])
        .map(
          (petId) =>
            petsById?.[String(petId)]?.nome || petsById?.[String(petId)]?.name
        )
        .filter(Boolean)
        .join(", "),
    [petIds, petsById]
  );

  const shortAddr = useMemo(() => tutorShortAddress(tutor), [tutor]);

  const handleSetStatus = useCallback(
    async (newStatus) => {
      if (pending) return;

      setPending(true);

      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        await dispatch(
          updateEvento({
            id: String(id),
            patch: { status: newStatus },
            changeStatus: true,
          })
        ).unwrap();
      } catch (error) {
        console.log("Erro ao atualizar status:", error);
      } finally {
        swipeRef.current?.close?.();
        setPending(false);
      }
    },
    [dispatch, id, pending]
  );

  const renderRightActions = useCallback(
    () => (
      <View style={styles.swipeActionsContainer}>
        <SwipeAction
          label="Confirmar"
          color="#16A34A"
          onPress={() => handleSetStatus("confirmado")}
          disabled={pending}
        />
        <SwipeAction
          label="Pendente"
          color="#F59E0B"
          onPress={() => handleSetStatus("pendente")}
          disabled={pending}
        />
        <SwipeAction
          label="Cancelar"
          color="#EF4444"
          onPress={() => handleSetStatus("cancelado")}
          last
          disabled={pending}
        />
      </View>
    ),
    [handleSetStatus, pending]
  );

  const openEvent = useCallback(async () => {
    await Haptics.selectionAsync();

    router.push({
      pathname: "/(modals)/agenda-new",
      params: { id: String(id) },
    });
  }, [id]);

  return (
    <View style={styles.rowOuter}>
      <Swipeable
        ref={swipeRef}
        overshootRight={false}
        renderRightActions={renderRightActions}
        friction={2}
        rightThreshold={28}
        containerStyle={styles.swipeableContainer}
      >
        <Pressable
          onPress={openEvent}
          android_ripple={{ color: "#ECEFF3" }}
          style={({ pressed }) => [
            styles.eventCard,
            {
              backgroundColor:
                pressed && Platform.OS === "ios" ? "#F7F8FA" : "#FFFFFF",
            },
          ]}
        >
          <View style={[styles.statusStripe, { backgroundColor: color }]} />

          <View style={styles.eventBody}>
            <View style={styles.eventMainLine}>
              <Text style={[styles.eventTitle, { color: text }]} numberOfLines={1}>
                {title || "Evento"}
                {petNames ? ` • ${petNames}` : ""}
              </Text>

              <Text style={[styles.eventHour, { color: subtle }]} numberOfLines={1}>
                {fmtHour(start)} — {fmtHour(end)}
              </Text>
            </View>

            {!!cliente && (
              <Text style={[styles.eventMetaStrong, { color: text }]} numberOfLines={1}>
                Tutor: {cliente}
              </Text>
            )}

            {!!observacoes && (
              <Text style={[styles.eventMeta, { color: subtle }]} numberOfLines={2}>
                {observacoes}
              </Text>
            )}

            {!!shortAddr && (
              <Text style={[styles.eventMeta, { color: subtle }]} numberOfLines={1}>
                • {shortAddr}
              </Text>
            )}

            <View style={styles.eventFooter}>
              <StatusPill status={status} />

              <View style={styles.chevronBox}>
                <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
              </View>
            </View>
          </View>
        </Pressable>
      </Swipeable>
    </View>
  );
});

function StatusPill({ status }) {
  const safeStatus = status || "pendente";
  const color = STATUS_COLORS[safeStatus] || "#8E8E93";
  const label =
    STATUS_LABELS[safeStatus] ||
    `${safeStatus.charAt(0).toUpperCase()}${safeStatus.slice(1)}`;
  const bg = hexToRgba(color, 0.14);

  return (
    <View style={[styles.statusPill, { backgroundColor: bg }]}>
      <Text style={[styles.statusPillText, { color }]}>{label}</Text>
    </View>
  );
}

export { EventRow };

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },

  list: {
    flex: 1,
  },

  listContent: {
    paddingBottom: 96,
  },

  listHeader: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    gap: 10,
  },

  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.07)",
    paddingHorizontal: 14,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },

  summaryTitle: {
    fontSize: 17,
    fontWeight: "850",
    color: "#111827",
    letterSpacing: -0.2,
  },

  summarySub: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
  },

  headerAddButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },

  headerAddBadge: {
    position: "absolute",
    right: 5,
    bottom: 5,
  },

  searchWrap: {
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.08)",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },

  searchInput: {
    flex: 1,
    marginLeft: 8,
    paddingVertical: 0,
    fontSize: 14,
    color: "#111827",
  },

  filtersBlock: {
    gap: 8,
  },

  chipRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "nowrap",
    alignItems: "center",
  },

  chip: {
    minHeight: 34,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.08)",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },

  chipText: {
    fontSize: 12,
    fontWeight: "750",
    color: "#4B5563",
  },

  clearButton: {
    minHeight: 34,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "rgba(239,68,68,0.08)",
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.16)",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  clearButtonText: {
    fontSize: 12,
    fontWeight: "850",
    color: "#EF4444",
  },

  sectionBandWrap: {
    backgroundColor: "#FFFFFF",
    paddingTop: 8,
  },

  sectionBand: {
    minHeight: 34,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "rgba(162,181,178,1.0)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  sectionBandText: {
    fontSize: 12,
    fontWeight: "850",
    color: "#FFFFFF",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },

  sectionBandCount: {
    fontSize: 11,
    fontWeight: "750",
    color: "rgba(255,255,255,0.88)",
  },

  separator: {
    height: 8,
    backgroundColor: "#F5F5F7",
  },

  rowOuter: {
    paddingHorizontal: 0,
  },

  swipeableContainer: {
    overflow: "visible",
  },

  eventCard: {
    borderRadius: 0,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderColor: "rgba(15,23,42,0.07)",
    flexDirection: "row",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },

  statusStripe: {
    width: 6,
    alignSelf: "stretch",
  },

  eventBody: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },

  eventMainLine: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
    marginBottom: 5,
  },

  eventTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "850",
  },

  eventHour: {
    fontSize: 12,
    fontWeight: "700",
  },

  eventMetaStrong: {
    fontSize: 13,
    fontWeight: "800",
  },

  eventMeta: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 17,
  },

  eventFooter: {
    marginTop: 9,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },

  statusPillText: {
    fontSize: 11,
    fontWeight: "800",
  },

  chevronBox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(118,118,128,0.10)",
  },

  swipeActionsContainer: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 6,
    paddingHorizontal: 8,
  },

  swipeActionWrap: {
    overflow: "hidden",
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
    marginVertical: 4,
  },

  swipeActionWrapLast: {
    borderTopRightRadius: 14,
    borderBottomRightRadius: 14,
  },

  swipeAction: {
    paddingHorizontal: 14,
    minWidth: 92,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },

  swipeActionText: {
    color: "#FFFFFF",
    fontWeight: "850",
    fontSize: 12,
  },
  filterMetaRow: {
    minHeight: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 2,
  },

  filterMetaText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
  },

  clearInlineButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(239,68,68,0.08)",
  },

  clearInlineText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#EF4444",
  },
});