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
  Alert,
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
  deleteEvento,
  loadAgenda,
  selectAllEventos,
  selectEventoById,
  updateEvento,
} from "@/src/store/slices/agendaSlice";
import { loadSyncQueue } from "@/src/store/slices/syncQueueSlice";
import { selectTutorById } from "@/src/store/slices/tutoresSlice";
import { selectPetsState } from "@/src/store/slices/petsSlice";
import { useStore } from "react-redux";

import { EmptyAgendaCard } from "./_ListEmpty";
import { processSyncQueue } from "@/src/services/syncProcessor";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STATUS_COLORS = {
  confirmado: "#1ABC9C",
  pendente: "#F39C12",
  cancelado: "#E74C3C",
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
  { key: "todos", label: "Todos", tone: "blue" },
  { key: "confirmado", label: "Confirmados", tone: "green" },
  { key: "pendente", label: "Pendentes", tone: "orange" },
  { key: "cancelado", label: "Cancelados", tone: "red" },
];

const AGENDA_FILTERS_STORAGE_KEY = "@fisiovet:agenda:list-filters:v1";
const AGENDA_VIEW_STORAGE_KEY = "@fisiovet:agenda:view-mode:v1";

const VIEW_MODES = {
  TIMELINE: "timeline",
  CALENDAR: "calendar",
};

const DEFAULT_AGENDA_FILTERS = {
  scope: "todos",
  temporal: "futuros",
  statusFilter: "todos",
};

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
    safeDate.getDate(),
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
    weekday: "long",
    day: "2-digit",
    month: "short",
    year: 'numeric'
  });
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

function dateKeyLocal(dateLike) {
  const d = startOfDayLocal(dateLike);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function monthTitle(dateLike) {
  const d = toDateLocal(dateLike);
  const label = d.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });

  return label.charAt(0).toUpperCase() + label.slice(1);
}

function buildCalendarDays(monthDate) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const first = new Date(year, month, 1);
  const mondayIndex = (first.getDay() + 6) % 7;
  const gridStart = new Date(year, month, 1 - mondayIndex);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);

    return {
      date,
      key: dateKeyLocal(date),
      inCurrentMonth: date.getMonth() === month,
    };
  });
}

function AgendaViewToggle({ value, onChange }) {
  return (
    <View style={styles.viewToggleOuter}>
      <Pressable
        onPress={() => onChange(VIEW_MODES.TIMELINE)}
        style={({ pressed }) => [
          styles.viewToggleItem,
          value === VIEW_MODES.TIMELINE && styles.viewToggleItemActive,
          pressed && { opacity: 0.78 },
        ]}
      >
        <Ionicons
          name="list-outline"
          size={16}
          color={value === VIEW_MODES.TIMELINE ? "#111827" : "#6B7280"}
        />
        <Text
          style={[
            styles.viewToggleText,
            value === VIEW_MODES.TIMELINE && styles.viewToggleTextActive,
          ]}
        >
          Timeline
        </Text>
      </Pressable>

      <Pressable
        onPress={() => onChange(VIEW_MODES.CALENDAR)}
        style={({ pressed }) => [
          styles.viewToggleItem,
          value === VIEW_MODES.CALENDAR && styles.viewToggleItemActive,
          pressed && { opacity: 0.78 },
        ]}
      >
        <Ionicons
          name="calendar-clear-outline"
          size={16}
          color={value === VIEW_MODES.CALENDAR ? "#111827" : "#6B7280"}
        />
        <Text
          style={[
            styles.viewToggleText,
            value === VIEW_MODES.CALENDAR && styles.viewToggleTextActive,
          ]}
        >
          Calendário
        </Text>
      </Pressable>
    </View>
  );
}

function CalendarEventRow({ item, petsById }) {
  const tutor = useSelector((state) => selectTutorById(state, item?.tutorId));
  const evento = useSelector((state) => selectEventoById(item?.id)(state));

  const status = evento?.status ?? item?.status ?? "pendente";
  const color = STATUS_COLORS[status] || "#8E8E93";
  const petNames = getEventPetNames(item, petsById);
  const address = tutorShortAddress(tutor);

  const openEvent = useCallback(() => {
    Haptics.selectionAsync().catch(() => { });
    router.push({
      pathname: "/(modals)/agenda-new",
      params: { id: String(item.id) },
    });
  }, [item.id]);

  return (
    <Pressable
      onPress={openEvent}
      style={({ pressed }) => [
        styles.calendarEventRow,
        pressed && { backgroundColor: "#F6F7F9" },
      ]}
    >
      <View style={[styles.calendarEventStripe, { backgroundColor: color }]} />

      <View style={styles.calendarEventTimeWrap}>
        <Text style={styles.calendarEventTime}>{fmtHour(item.start)}</Text>
        <Text style={styles.calendarEventEnd}>{fmtHour(item.end)}</Text>
      </View>

      <View style={styles.calendarEventContent}>
        <Text style={styles.calendarEventTitle} numberOfLines={1}>
          {item.title || "Evento"}
        </Text>

        <Text style={styles.calendarEventMeta} numberOfLines={1}>
          {[petNames, item.cliente || item.tutorNome, address]
            .filter(Boolean)
            .join(" • ") || "Sem informações adicionais"}
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={16} color="#A1A1AA" />
    </Pressable>
  );
}

function CalendarAgendaView({
  filtered,
  petsById,
  refreshing,
  onRefresh,
  tint,
  hasFilters,
  clearAllFilters,
}) {
  const today = useMemo(() => startOfDayLocal(new Date()), []);
  const [visibleMonth, setVisibleMonth] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [selectedDate, setSelectedDate] = useState(today);

  const eventsByDay = useMemo(() => {
    const map = new Map();

    for (const event of filtered || []) {
      const key = dateKeyLocal(event.start);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(event);
    }

    for (const [, items] of map) {
      items.sort((a, b) => toDateLocal(a.start) - toDateLocal(b.start));
    }

    return map;
  }, [filtered]);

  const days = useMemo(() => buildCalendarDays(visibleMonth), [visibleMonth]);
  const selectedKey = dateKeyLocal(selectedDate);
  const selectedEvents = eventsByDay.get(selectedKey) || [];

  const changeMonth = useCallback((amount) => {
    Haptics.selectionAsync().catch(() => { });

    setVisibleMonth((current) => {
      const next = new Date(
        current.getFullYear(),
        current.getMonth() + amount,
        1,
      );
      setSelectedDate(new Date(next.getFullYear(), next.getMonth(), 1));
      return next;
    });
  }, []);

  const goToday = useCallback(() => {
    Haptics.selectionAsync().catch(() => { });
    const current = startOfDayLocal(new Date());
    setVisibleMonth(new Date(current.getFullYear(), current.getMonth(), 1));
    setSelectedDate(current);
  }, []);

  return (
    <SectionList
      sections={[
        {
          title: selectedKey,
          data: selectedEvents,
        },
      ]}
      keyExtractor={(item) => String(item.id)}
      renderItem={({ item }) => (
        <CalendarEventRow item={item} petsById={petsById} />
      )}
      ItemSeparatorComponent={() => (
        <View style={styles.calendarEventDivider} />
      )}
      ListHeaderComponent={
        <View style={styles.calendarContent}>
          <View style={styles.calendarCard}>
            <View style={styles.calendarMonthHeader}>
              <Pressable
                onPress={() => changeMonth(-1)}
                hitSlop={10}
                style={({ pressed }) => [
                  styles.calendarNavButton,
                  pressed && { opacity: 0.58 },
                ]}
              >
                <Ionicons name="chevron-back" size={21} color="#0A84FF" />
              </Pressable>

              <Pressable
                onPress={goToday}
                style={styles.calendarMonthTitleButton}
              >
                <Text style={styles.calendarMonthTitle}>
                  {monthTitle(visibleMonth)}
                </Text>
                <Text style={styles.calendarTodayHint}>
                  Toque para voltar a hoje
                </Text>
              </Pressable>

              <Pressable
                onPress={() => changeMonth(1)}
                hitSlop={10}
                style={({ pressed }) => [
                  styles.calendarNavButton,
                  pressed && { opacity: 0.58 },
                ]}
              >
                <Ionicons name="chevron-forward" size={21} color="#0A84FF" />
              </Pressable>
            </View>

            <View style={styles.calendarWeekHeader}>
              {["SEG", "TER", "QUA", "QUI", "SEX", "SÁB", "DOM"].map((day) => (
                <Text key={day} style={styles.calendarWeekDay}>
                  {day}
                </Text>
              ))}
            </View>

            <View style={styles.calendarGrid}>
              {days.map((day) => {
                const isSelected = day.key === selectedKey;
                const isToday = day.key === dateKeyLocal(today);
                const dayEvents = eventsByDay.get(day.key) || [];
                const eventColors = Array.from(
                  new Set(
                    dayEvents
                      .map((event) => STATUS_COLORS[event.status || "pendente"])
                      .filter(Boolean),
                  ),
                ).slice(0, 3);

                return (
                  <Pressable
                    key={day.key}
                    onPress={() => {
                      Haptics.selectionAsync().catch(() => { });
                      setSelectedDate(day.date);

                      if (!day.inCurrentMonth) {
                        setVisibleMonth(
                          new Date(
                            day.date.getFullYear(),
                            day.date.getMonth(),
                            1,
                          ),
                        );
                      }
                    }}
                    style={({ pressed }) => [
                      styles.calendarDayCell,
                      pressed && { opacity: 0.62 },
                    ]}
                  >
                    <View
                      style={[
                        styles.calendarDayNumberWrap,
                        isSelected && styles.calendarDayNumberSelected,
                        isToday && !isSelected && styles.calendarDayNumberToday,
                      ]}
                    >
                      <Text
                        style={[
                          styles.calendarDayNumber,
                          !day.inCurrentMonth &&
                          styles.calendarDayNumberOutside,
                          isToday &&
                          !isSelected &&
                          styles.calendarDayNumberTodayText,
                          isSelected && styles.calendarDayNumberSelectedText,
                        ]}
                      >
                        {day.date.getDate()}
                      </Text>
                    </View>

                    <View style={styles.calendarDotsRow}>
                      {eventColors.map((eventColor) => (
                        <View
                          key={eventColor}
                          style={[
                            styles.calendarDot,
                            { backgroundColor: eventColor },
                          ]}
                        />
                      ))}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.selectedDayHeader}>
            <View>
              <Text style={styles.selectedDayEyebrow}>AGENDA DO DIA</Text>
              <Text style={styles.selectedDayTitle}>
                {selectedDate.toLocaleDateString("pt-BR", {
                  weekday: "long",
                  day: "2-digit",
                  month: "long",
                })}
              </Text>
            </View>

            <View style={styles.selectedDayCountBadge}>
              <Text style={styles.selectedDayCountText}>
                {selectedEvents.length}
              </Text>
            </View>
          </View>
        </View>
      }
      ListEmptyComponent={
        <View style={styles.calendarEmptyWrap}>
          <Ionicons name="calendar-clear-outline" size={30} color="#A1A1AA" />
          <Text style={styles.calendarEmptyTitle}>Nenhum evento neste dia</Text>
          <Text style={styles.calendarEmptyText}>
            Selecione outra data ou adicione um novo atendimento.
          </Text>
          {hasFilters && (
            <Pressable
              onPress={clearAllFilters}
              style={styles.calendarClearFiltersButton}
            >
              <Text style={styles.calendarClearFiltersText}>
                Limpar filtros
              </Text>
            </Pressable>
          )}
        </View>
      }
      contentContainerStyle={styles.calendarListContent}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={tint}
          colors={[tint]}
          progressBackgroundColor="#FFFFFF"
        />
      }
      stickySectionHeadersEnabled={false}
      showsVerticalScrollIndicator={false}
      contentInsetAdjustmentBehavior="automatic"
    />
  );
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

const Chip = React.memo(function Chip({
  label,
  active,
  onPress,
  tone = "blue",
}) {
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
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.86}
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
  viewMode,
  onChangeView,
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
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  const handleSelect = useCallback((setter, value) => {
    Haptics.selectionAsync().catch(() => {});
    setter(value);
  }, []);

  const toggleFilters = useCallback(() => {
    Haptics.selectionAsync().catch(() => {});
    setFiltersExpanded((current) => !current);
  }, []);

  const isCalendarView = viewMode === VIEW_MODES.CALENDAR;

  const activeFilterCount = useMemo(() => {
    let count = 0;

    if (!isCalendarView) {
      if (scope !== DEFAULT_AGENDA_FILTERS.scope) count += 1;
      if (temporal !== DEFAULT_AGENDA_FILTERS.temporal) count += 1;
    }

    if (statusFilter !== DEFAULT_AGENDA_FILTERS.statusFilter) count += 1;

    return count;
  }, [isCalendarView, scope, temporal, statusFilter]);

  const hasActiveFilters = Boolean(query) || activeFilterCount > 0;

  return (
    <View style={styles.listHeader}>
      <AgendaViewToggle value={viewMode} onChange={onChangeView} />

      <SearchField
        value={query}
        onChangeText={setQuery}
        placeholder="Buscar por tutor, pet, local ou observação"
        onClear={() => setQuery("")}
      />

      <View style={styles.filtersCard}>
        <Pressable
          onPress={toggleFilters}
          accessibilityRole="button"
          accessibilityLabel={
            filtersExpanded ? "Recolher filtros" : "Expandir filtros"
          }
          style={({ pressed }) => [
            styles.filtersAccordionHeader,
            pressed && styles.filtersAccordionHeaderPressed,
          ]}
        >
          <View style={styles.filtersAccordionLeft}>
            <View style={styles.filtersIconWrap}>
              <Ionicons name="options-outline" size={17} color="#0A84FF" />
            </View>

            <View style={styles.filtersAccordionTextWrap}>
              <Text style={styles.filtersAccordionTitle}>Filtros</Text>
              <Text style={styles.filtersAccordionSubtitle} numberOfLines={1}>
                {activeFilterCount > 0
                  ? `${activeFilterCount} filtro${activeFilterCount === 1 ? "" : "s"} ativo${activeFilterCount === 1 ? "" : "s"}`
                  : "Refine período e status"}
              </Text>
            </View>
          </View>

          <View style={styles.filtersAccordionRight}>
            {activeFilterCount > 0 && (
              <View style={styles.activeFiltersCountBadge}>
                <Text style={styles.activeFiltersCountText}>
                  {activeFilterCount}
                </Text>
              </View>
            )}

            <Ionicons
              name={filtersExpanded ? "chevron-up" : "chevron-down"}
              size={18}
              color="#6B7280"
            />
          </View>
        </Pressable>

        {filtersExpanded && (
          <View style={styles.filtersAccordionContent}>
            {!isCalendarView && (
              <>
                <View style={styles.filterGroup}>
                  <Text style={styles.filterGroupLabel}>PERÍODO</Text>
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
                </View>

                <View style={styles.filterGroup}>
                  <Text style={styles.filterGroupLabel}>TEMPORALIDADE</Text>
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
                </View>
              </>
            )}

            <View style={styles.filterGroup}>
              <Text style={styles.filterGroupLabel}>STATUS</Text>
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
        )}
      </View>

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
    </View>
  );
});

function SwipeAction({
  label,
  icon,
  color,
  onPress,
  last = false,
  disabled = false,
}) {
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
    [scale],
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
        {!!icon && (
          <Ionicons
            name={icon}
            size={21}
            color="#FFFFFF"
          />
        )}

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
  const store = useStore();

  const [query, setQuery] = useState("");
  const [scope, setScope] = useState(DEFAULT_AGENDA_FILTERS.scope);
  const [temporal, setTemporal] = useState(DEFAULT_AGENDA_FILTERS.temporal);
  const [statusFilter, setStatusFilter] = useState(
    DEFAULT_AGENDA_FILTERS.statusFilter,
  );
  const [filtersHydrated, setFiltersHydrated] = useState(false);
  const [viewMode, setViewMode] = useState(VIEW_MODES.TIMELINE);
  const [viewHydrated, setViewHydrated] = useState(false);

  const [refreshing, setRefreshing] = useState(false);

  const tint = useThemeColor({}, "tint");
  const bg = useThemeColor({}, "background");

  const eventos = useSelector(selectAllEventos);
  const petsState = useSelector(selectPetsState, shallowEqual);
  const petsById = petsState?.byId || {};

  useEffect(() => {
    let alive = true;

    async function hydrateFilters() {
      try {
        const raw = await AsyncStorage.getItem(AGENDA_FILTERS_STORAGE_KEY);

        if (!alive) return;

        if (!raw) {
          setScope(DEFAULT_AGENDA_FILTERS.scope);
          setTemporal(DEFAULT_AGENDA_FILTERS.temporal);
          setStatusFilter(DEFAULT_AGENDA_FILTERS.statusFilter);
          return;
        }

        const parsed = JSON.parse(raw);

        const savedScope = SCOPE_FILTERS.some(
          (item) => item.key === parsed?.scope,
        )
          ? parsed.scope
          : DEFAULT_AGENDA_FILTERS.scope;

        const savedTemporal = TEMPORAL_FILTERS.some(
          (item) => item.key === parsed?.temporal,
        )
          ? parsed.temporal
          : DEFAULT_AGENDA_FILTERS.temporal;

        const savedStatus = STATUS_FILTERS.some(
          (item) => item.key === parsed?.statusFilter,
        )
          ? parsed.statusFilter
          : DEFAULT_AGENDA_FILTERS.statusFilter;

        setScope(savedScope);
        setTemporal(savedTemporal);
        setStatusFilter(savedStatus);
      } catch (err) {
        console.log("Erro ao carregar filtros da agenda:", err?.message);

        setScope(DEFAULT_AGENDA_FILTERS.scope);
        setTemporal(DEFAULT_AGENDA_FILTERS.temporal);
        setStatusFilter(DEFAULT_AGENDA_FILTERS.statusFilter);
      } finally {
        if (alive) setFiltersHydrated(true);
      }
    }

    hydrateFilters();

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!filtersHydrated) return;

    AsyncStorage.setItem(
      AGENDA_FILTERS_STORAGE_KEY,
      JSON.stringify({
        scope,
        temporal,
        statusFilter,
      }),
    ).catch((err) => {
      console.log("Erro ao salvar filtros da agenda:", err?.message);
    });
  }, [filtersHydrated, scope, temporal, statusFilter]);

  useEffect(() => {
    let alive = true;

    AsyncStorage.getItem(AGENDA_VIEW_STORAGE_KEY)
      .then((savedView) => {
        if (!alive) return;

        setViewMode(
          savedView === VIEW_MODES.CALENDAR
            ? VIEW_MODES.CALENDAR
            : VIEW_MODES.TIMELINE,
        );
      })
      .catch((err) => {
        console.log("Erro ao carregar visão da agenda:", err?.message);
      })
      .finally(() => {
        if (alive) setViewHydrated(true);
      });

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!viewHydrated) return;

    AsyncStorage.setItem(AGENDA_VIEW_STORAGE_KEY, viewMode).catch((err) => {
      console.log("Erro ao salvar visão da agenda:", err?.message);
    });
  }, [viewHydrated, viewMode]);

  useEffect(() => {
    let alive = true;

    async function bootAgenda() {
      try {
        await Promise.all([
          dispatch(loadAgenda()).unwrap(),
          dispatch(loadSyncQueue()).unwrap(),
        ]);

        if (!alive) return;

        await processSyncQueue(dispatch, store.getState);
      } catch (err) {
        console.log("Boot Agenda ignorou sync inicial:", err?.message);

        dispatch(loadAgenda());
        dispatch(loadSyncQueue());
      }
    }

    bootAgenda();

    return () => {
      alive = false;
    };
  }, [dispatch, store]);

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
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(
              () => { },
            );
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
        } ${event.observacoes || ""} ${petNames}`,
      );

      return haystack.includes(q);
    });

    if (viewMode === VIEW_MODES.TIMELINE) {
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
    }

    list = list.filter((event) => {
      if (statusFilter === "todos") return true;
      return String(event.status || "pendente").toLowerCase() === statusFilter;
    });

    return list.sort((a, b) => toDateLocal(a.start) - toDateLocal(b.start));
  }, [
    eventos,
    petsById,
    query,
    scope,
    temporal,
    statusFilter,
    viewMode,
  ]);

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
    }, [scrollToTop]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);

    try {
      await Promise.all([
        dispatch(loadAgenda()).unwrap(),
        dispatch(loadSyncQueue()).unwrap(),
      ]);

      await processSyncQueue(dispatch, store.getState);
    } catch (err) {
      console.log("Refresh Agenda ignorou sync:", err?.message);

      dispatch(loadAgenda());
      dispatch(loadSyncQueue());
    } finally {
      setRefreshing(false);
    }
  }, [dispatch, store]);

  const clearAllFilters = useCallback(() => {
    Haptics.selectionAsync().catch(() => { });

    setQuery("");
    setStatusFilter(DEFAULT_AGENDA_FILTERS.statusFilter);

    if (viewMode === VIEW_MODES.TIMELINE) {
      setScope(DEFAULT_AGENDA_FILTERS.scope);
      setTemporal(DEFAULT_AGENDA_FILTERS.temporal);
    }

    scrollToTop(false);
  }, [scrollToTop, viewMode]);

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
    [now],
  );

  const renderItem = useCallback(
    ({ item }) => <EventRow item={item} petsById={petsById} />,
    [petsById],
  );

  const listHeader = useMemo(
    () => (
      <AgendaListHeader
        viewMode={viewMode}
        onChangeView={(nextView) => {
          Haptics.selectionAsync().catch(() => { });
          setViewMode(nextView);
          scrollToTop(false);
        }}
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
      viewMode,
      query,
      scope,
      temporal,
      statusFilter,
      total,
      filteredTotal,
      clearAllFilters,
      scrollToTop,
    ],
  );

  const hasFilters =
    viewMode === VIEW_MODES.CALENDAR
      ? !!query || statusFilter !== DEFAULT_AGENDA_FILTERS.statusFilter
      :
      !!query ||
      scope !== DEFAULT_AGENDA_FILTERS.scope ||
      temporal !== DEFAULT_AGENDA_FILTERS.temporal ||
      statusFilter !== DEFAULT_AGENDA_FILTERS.statusFilter;

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: bg }]}
      edges={["left", "right"]}
    >
      {viewMode === VIEW_MODES.TIMELINE ? (
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
      ) : (
        <View style={styles.calendarScreen}>
          {listHeader}

          <CalendarAgendaView
            filtered={filtered}
            petsById={petsById}
            refreshing={refreshing}
            onRefresh={onRefresh}
            tint={tint}
            hasFilters={hasFilters}
            clearAllFilters={clearAllFilters}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const EventRow = React.memo(function EventRow({ item, petsById }) {
  const {
    id,
    title,
    start,
    end,
    cliente,
    observacoes,
    tutorId,
    petIds = [],
  } = item;

  const dispatch = useDispatch();
  const swipeRef = useRef(null);

  const [pendingStatus, setPendingStatus] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(false);

  const isPendingAction = pendingStatus || pendingDelete;

  const text = useThemeColor({}, "text");
  const subtle = useThemeColor({ light: "#6B7280", dark: "#9AA0A6" }, "text");

  const tutor = useSelector((state) => selectTutorById(state, tutorId));
  const evento = useSelector((state) => selectEventoById(id)(state));

  const status = evento?.status ?? item.status ?? "pendente";
  const color = STATUS_COLORS[status] || "#8E8E93";

  const financeiro =
    evento?.financeiro &&
    typeof evento.financeiro === "object" &&
    !Array.isArray(evento.financeiro)
      ? evento.financeiro
      : item?.financeiro &&
          typeof item.financeiro === "object" &&
          !Array.isArray(item.financeiro)
        ? item.financeiro
        : {};

  const lancamentoId =
    financeiro?.lancamentoId != null
      ? String(financeiro.lancamentoId)
      : null;

  const hasFinanceiro = Boolean(lancamentoId);

  const financeiroStatus =
    financeiro?.status ||
    (financeiro?.pago ? "pago" : "pendente");

  const financeiroStatusLabel =
    {
      rascunho: "Financeiro em rascunho",
      pendente: "Pagamento pendente",
      parcial: "Pagamento parcial",
      pago: "Pagamento concluído",
      vencido: "Pagamento vencido",
      cancelado: "Lançamento cancelado",
    }[financeiroStatus] || "Pagamento pendente";

  const financeiroStatusColor =
    {
      rascunho: "#8E8E93",
      pendente: "#F59E0B",
      parcial: "#F97316",
      pago: "#16A34A",
      vencido: "#EF4444",
      cancelado: "#8E8E93",
    }[financeiroStatus] || "#F59E0B";

  const financeiroStatusBackground =
    {
      rascunho: "rgba(142,142,147,0.08)",
      pendente: "rgba(245,158,11,0.08)",
      parcial: "rgba(249,115,22,0.08)",
      pago: "rgba(22,163,74,0.08)",
      vencido: "rgba(239,68,68,0.08)",
      cancelado: "rgba(142,142,147,0.08)",
    }[financeiroStatus] || "rgba(245,158,11,0.08)";

  const petNames = useMemo(
    () =>
      (petIds || [])
        .map(
          (petId) =>
            petsById?.[String(petId)]?.nome || petsById?.[String(petId)]?.name,
        )
        .filter(Boolean)
        .join(", "),
    [petIds, petsById],
  );

  const shortAddr = useMemo(() => tutorShortAddress(tutor), [tutor]);

  const handleSetStatus = useCallback(
    async (newStatus) => {
      if (isPendingAction) return;

      if (newStatus === status) {
        swipeRef.current?.close?.();
        return;
      }

      setPendingStatus(true);

      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        await dispatch(
          updateEvento({
            id: String(id),
            patch: { status: newStatus },
            changeStatus: true,
          }),
        ).unwrap();
      } catch (error) {
        console.log("Erro ao atualizar status:", error);
      } finally {
        swipeRef.current?.close?.();
        setPendingStatus(false);
      }
    },
    [dispatch, id, isPendingAction, status],
  );

  const renderRightActions = useCallback(
    () => (
      <View style={styles.swipeActionsContainer}>
        <SwipeAction
          label="Confirmar"
          color="#16A34A"
          onPress={() => handleSetStatus("confirmado")}
          disabled={isPendingAction}
        />
        <SwipeAction
          label="Pendente"
          color="#F59E0B"
          onPress={() => handleSetStatus("pendente")}
          disabled={isPendingAction}
        />
        <SwipeAction
          label="Cancelar"
          color="#EF4444"
          onPress={() => handleSetStatus("cancelado")}
          last
          disabled={isPendingAction}
        />
      </View>
    ),
    [handleSetStatus, isPendingAction],
  );

  const confirmDelete = useCallback(() => {
    if (!id || isPendingAction) return;

    swipeRef.current?.close?.();

    Alert.alert(
      "Excluir evento?",
      "Esta ação é irreversível. O evento será removido definitivamente da agenda.",
      [
        {
          text: "Cancelar",
          style: "cancel",
        },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            setPendingDelete(true);

            try {
              await Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Warning,
              );

              await dispatch(deleteEvento(String(id))).unwrap();

              await Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success,
              ).catch(() => {});
            } catch (error) {
              console.log("Erro ao excluir evento:", error);

              Alert.alert(
                "Não foi possível excluir",
                error?.message ||
                  "Ocorreu um erro ao excluir o evento. Tente novamente.",
              );
            } finally {
              setPendingDelete(false);
              swipeRef.current?.close?.();
            }
          },
        },
      ],
    );
  }, [dispatch, id, isPendingAction]);

  const renderLeftActions = useCallback(
    () => (
      <View style={styles.deleteActionContainer}>
        <SwipeAction
          label="Excluir"
          icon="trash-outline"
          color="#EF4444"
          onPress={confirmDelete}
          disabled={isPendingAction}
          last
        />
      </View>
    ),
    [confirmDelete, isPendingAction],
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
        enabled={Boolean(id) && !isPendingAction}
        overshootLeft={false}
        overshootRight={false}
        renderLeftActions={renderLeftActions}
        renderRightActions={renderRightActions}
        friction={2}
        leftThreshold={28}
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
              <Text
                style={[styles.eventTitle, { color: text }]}
                numberOfLines={1}
              >
                {title || "Evento"}
                {petNames ? ` • ${petNames}` : ""}
              </Text>

              <Text
                style={[styles.eventHour, { color: subtle }]}
                numberOfLines={1}
              >
                {fmtHour(start)} — {fmtHour(end)}
              </Text>
            </View>

            {!!cliente && (
              <Text
                style={[styles.eventMetaStrong, { color: text }]}
                numberOfLines={1}
              >
                {cliente}
              </Text>
            )}

            {!!observacoes && (
              <Text
                style={[styles.eventMeta, { color: subtle }]}
                numberOfLines={2}
              >
                {observacoes}
              </Text>
            )}

            {!!shortAddr && (
              <Text
                style={[styles.eventMeta, { color: subtle }]}
                numberOfLines={1}
              >
                • {shortAddr}
              </Text>
            )}

            <View style={styles.eventFooter}>
              {hasFinanceiro ? (
                <View
                  style={[
                    styles.financeSummaryRow,
                    {
                      backgroundColor: financeiroStatusBackground,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.financeStatusDot,
                      {
                        backgroundColor: financeiroStatusColor,
                      },
                    ]}
                  />

                  <Text
                    numberOfLines={1}
                    style={[
                      styles.financeSummaryText,
                      {
                        color: financeiroStatusColor,
                      },
                    ]}
                  >
                    {financeiroStatusLabel}
                  </Text>
                </View>
              ) : (
                <View />
              )}

              <View style={styles.chevronBox}>
                <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
              </View>
            </View>

            {isPendingAction && (
              <View pointerEvents="none" style={styles.updatingOverlay}>
                <Text style={styles.updatingText}>
                  {pendingDelete ? "Excluindo…" : "Atualizando…"}
                </Text>
              </View>
            )}
          </View>
        </Pressable>
      </Swipeable>
    </View>
  );
});

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

  filtersCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.07)",
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },

  filtersAccordionHeader: {
    minHeight: 58,
    paddingHorizontal: 13,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  filtersAccordionHeaderPressed: {
    backgroundColor: "rgba(118,118,128,0.06)",
  },

  filtersAccordionLeft: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  filtersIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: "rgba(10,132,255,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },

  filtersAccordionTextWrap: {
    flex: 1,
    minWidth: 0,
  },

  filtersAccordionTitle: {
    color: "#111827",
    fontSize: 13,
    fontWeight: "850",
  },

  filtersAccordionSubtitle: {
    marginTop: 2,
    color: "#8E8E93",
    fontSize: 11,
    fontWeight: "650",
  },

  filtersAccordionRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  activeFiltersCountBadge: {
    minWidth: 24,
    height: 24,
    paddingHorizontal: 7,
    borderRadius: 12,
    backgroundColor: "rgba(10,132,255,0.11)",
    alignItems: "center",
    justifyContent: "center",
  },

  activeFiltersCountText: {
    color: "#0A84FF",
    fontSize: 11,
    fontWeight: "850",
  },

  filtersAccordionContent: {
    paddingHorizontal: 13,
    paddingTop: 12,
    paddingBottom: 13,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(60,60,67,0.12)",
    gap: 14,
  },

  filterGroup: {
    gap: 7,
  },

  filterGroupLabel: {
    paddingLeft: 2,
    color: "#8E8E93",
    fontSize: 9.5,
    fontWeight: "850",
    letterSpacing: 0.45,
  },

  chipRow: {
    width: "100%",
    flexDirection: "row",
    gap: 6,
    flexWrap: "nowrap",
    alignItems: "center",
  },

  chip: {
    flex: 1,
    minWidth: 0,
    minHeight: 30,
    paddingHorizontal: 6,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.08)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.035,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },

  chipText: {
    fontSize: 10.5,
    lineHeight: 13,
    fontWeight: "750",
    color: "#4B5563",
    textAlign: "center",
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
    paddingTop: 0,
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
    minHeight: 28,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  financeSummaryRow: {
    minHeight: 28,
    width: "46%",
    maxWidth: 220,
    paddingHorizontal: 9,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  financeStatusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },

  financeSummaryText: {
    flex: 1,
    minWidth: 0,
    fontSize: 10.5,
    lineHeight: 14,
    fontWeight: "700",
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
    gap: 6,
  },

  swipeActionText: {
    color: "#FFFFFF",
    fontWeight: "850",
    fontSize: 12,
  },

  deleteActionContainer: {
    flexDirection: "row",
    alignItems: "stretch",
    paddingLeft: 8,
    paddingRight: 2,
  },

  updatingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.62)",
    alignItems: "center",
    justifyContent: "center",
  },

  updatingText: {
    color: "#6B7280",
    fontSize: 11,
    fontWeight: "750",
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

  viewToggleOuter: {
    height: 38,
    padding: 3,
    borderRadius: 12,
    backgroundColor: "rgba(118,118,128,0.12)",
    flexDirection: "row",
  },

  viewToggleItem: {
    flex: 1,
    borderRadius: 9,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  viewToggleItemActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },

  viewToggleText: {
    color: "#6B7280",
    fontSize: 13,
    fontWeight: "700",
  },

  viewToggleTextActive: {
    color: "#111827",
    fontWeight: "850",
  },

  calendarScreen: {
    flex: 1,
  },

  calendarTopControls: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
    gap: 8,
  },

  calendarFilterSummary: {
    minHeight: 22,
    paddingHorizontal: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  calendarFilterSummaryText: {
    color: "#6B7280",
    fontSize: 12,
    fontWeight: "700",
  },

  calendarFilterClearText: {
    color: "#EF4444",
    fontSize: 12,
    fontWeight: "850",
  },

  calendarListContent: {
    paddingBottom: 96,
  },

  calendarContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },

  calendarCard: {
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 12,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.07)",
    shadowColor: "#000",
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },

  calendarMonthHeader: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  calendarNavButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(10,132,255,0.09)",
    alignItems: "center",
    justifyContent: "center",
  },

  calendarMonthTitleButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  calendarMonthTitle: {
    color: "#111827",
    fontSize: 17,
    fontWeight: "850",
    letterSpacing: -0.25,
  },

  calendarTodayHint: {
    marginTop: 2,
    color: "#8E8E93",
    fontSize: 10,
    fontWeight: "650",
  },

  calendarWeekHeader: {
    marginTop: 8,
    marginBottom: 3,
    flexDirection: "row",
  },

  calendarWeekDay: {
    flex: 1,
    textAlign: "center",
    color: "#8E8E93",
    fontSize: 10,
    fontWeight: "800",
  },

  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },

  calendarDayCell: {
    width: "14.285714%",
    height: 47,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 4,
  },

  calendarDayNumberWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },

  calendarDayNumberSelected: {
    backgroundColor: "#0A84FF",
    shadowColor: "#0A84FF",
    shadowOpacity: 0.25,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },

  calendarDayNumberToday: {
    borderWidth: 1.5,
    borderColor: "#0A84FF",
  },

  calendarDayNumber: {
    color: "#111827",
    fontSize: 13,
    fontWeight: "750",
  },

  calendarDayNumberOutside: {
    color: "#C7C7CC",
  },

  calendarDayNumberTodayText: {
    color: "#0A84FF",
    fontWeight: "850",
  },

  calendarDayNumberSelectedText: {
    color: "#FFFFFF",
    fontWeight: "850",
  },

  calendarDotsRow: {
    height: 6,
    marginTop: 3,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },

  calendarDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },

  selectedDayHeader: {
    minHeight: 76,
    paddingHorizontal: 4,
    paddingTop: 18,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  selectedDayEyebrow: {
    color: "#8E8E93",
    fontSize: 10,
    fontWeight: "850",
    letterSpacing: 0.45,
  },

  selectedDayTitle: {
    marginTop: 3,
    color: "#111827",
    fontSize: 17,
    fontWeight: "850",
    textTransform: "capitalize",
    letterSpacing: -0.2,
  },

  selectedDayCountBadge: {
    minWidth: 34,
    height: 28,
    paddingHorizontal: 9,
    borderRadius: 14,
    backgroundColor: "rgba(10,132,255,0.11)",
    alignItems: "center",
    justifyContent: "center",
  },

  selectedDayCountText: {
    color: "#0A84FF",
    fontSize: 13,
    fontWeight: "850",
  },

  calendarEventRow: {
    minHeight: 72,
    marginHorizontal: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.07)",
    paddingRight: 12,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
  },

  calendarEventStripe: {
    width: 5,
    alignSelf: "stretch",
  },

  calendarEventTimeWrap: {
    width: 58,
    paddingLeft: 11,
  },

  calendarEventTime: {
    color: "#111827",
    fontSize: 13,
    fontWeight: "850",
  },

  calendarEventEnd: {
    marginTop: 2,
    color: "#8E8E93",
    fontSize: 11,
    fontWeight: "700",
  },

  calendarEventContent: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 12,
    paddingRight: 8,
  },

  calendarEventTitle: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "850",
  },

  calendarEventMeta: {
    marginTop: 4,
    color: "#6B7280",
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "600",
  },

  calendarEventDivider: {
    height: 8,
  },

  calendarEmptyWrap: {
    marginHorizontal: 16,
    minHeight: 175,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.07)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },

  calendarEmptyTitle: {
    marginTop: 10,
    color: "#111827",
    fontSize: 15,
    fontWeight: "850",
  },

  calendarEmptyText: {
    marginTop: 4,
    color: "#6B7280",
    fontSize: 12,
    lineHeight: 17,
    textAlign: "center",
  },

  calendarClearFiltersButton: {
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(239,68,68,0.09)",
  },

  calendarClearFiltersText: {
    color: "#EF4444",
    fontSize: 12,
    fontWeight: "850",
  },
});
