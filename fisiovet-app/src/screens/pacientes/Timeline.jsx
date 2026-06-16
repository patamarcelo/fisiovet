// src/screens/pacientes/Timeline.jsx
// @ts-nocheck

import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";

import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  router,
  useLocalSearchParams,
  useNavigation,
} from "expo-router";

import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import * as Haptics from "expo-haptics";

import { ensureFirebase } from "@/firebase/firebase";
import { useThemeColor } from "@/hooks/useThemeColor";

import {
  fetchPet,
  selectPetById,
} from "@/src/store/slices/petsSlice";

import {
  loadAgenda,
  makeSelectEventosByPetId,
  selectAgendaStatus,
} from "@/src/store/slices/agendaSlice";

import {
  loadLancamentos,
  makeSelectLancamentosByPetId,
  selectFinanceiroStatus,
} from "@/src/store/slices/financeiroSlice";

import { usePetAvaliacoes } from "@/src/features/avaliacoes/usePetAvaliacoes";
import { usePetExams } from "@/src/features/exams/usePetExams";

const COLORS = {
  card: "#FFFFFF",
  text: "#111827",
  subtle: "#6B7280",
  faint: "#9CA3AF",
  border: "rgba(15,23,42,0.08)",
  blue: "#0A84FF",
  green: "#16A34A",
  purple: "#8B5CF6",
  pink: "#EC4899",
  teal: "#0F766E",
};

const FILTERS = [
  { key: "todos", label: "Tudo" },
  { key: "evento", label: "Consultas" },
  { key: "avaliacao", label: "Avaliações" },
  { key: "exame", label: "Exames" },
  { key: "financeiro", label: "Financeiro" },
];

const TYPE_META = {
  evento: {
    label: "Consulta",
    color: COLORS.blue,
    background: "rgba(10,132,255,0.10)",
    icon: "calendar-outline",
  },
  avaliacao: {
    label: "Avaliação",
    color: COLORS.purple,
    background: "rgba(139,92,246,0.10)",
    icon: "clipboard-outline",
  },
  exame: {
    label: "Exame",
    color: COLORS.pink,
    background: "rgba(236,72,153,0.10)",
    icon: "document-attach-outline",
  },
  laudo: {
    label: "Documento",
    color: COLORS.teal,
    background: "rgba(15,118,110,0.10)",
    icon: "document-text-outline",
  },
  financeiro: {
    label: "Financeiro",
    color: COLORS.green,
    background: "rgba(22,163,74,0.10)",
    icon: "wallet-outline",
  },
};

/* =========================================================
   Datas e textos
========================================================= */

function toDate(value) {
  if (!value) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value?.toDate === "function") {
    try {
      const date = value.toDate();
      return Number.isNaN(date.getTime()) ? null : date;
    } catch {
      return null;
    }
  }

  if (value?._seconds != null) {
    const date = new Date(Number(value._seconds) * 1000);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (value?.seconds != null) {
    const date = new Date(Number(value.seconds) * 1000);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (typeof value === "number") {
    const date = new Date(value < 1e12 ? value * 1000 : value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function firstValidDate(...values) {
  for (const value of values) {
    const date = toDate(value);
    if (date) return date;
  }

  return null;
}

function firstText(...values) {
  return (
    values.find(
      (value) => typeof value === "string" && value.trim()
    )?.trim() || ""
  );
}

function formatDay(date) {
  if (!date) return "Data não informada";

  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatWeekday(date) {
  if (!date) return "";

  const text = date.toLocaleDateString("pt-BR", {
    weekday: "long",
  });

  return text.charAt(0).toUpperCase() + text.slice(1);
}

function formatHour(date) {
  if (!date) return "";

  return date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getDayKey(date) {
  if (!date) return "sem-data";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function isToday(date) {
  if (!date) return false;

  const today = new Date();

  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

function formatCurrency(value) {
  const number = Number(value || 0);

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number.isFinite(number) ? number : 0);
}

function formatBytes(bytes) {
  const value = Number(bytes);

  if (!Number.isFinite(value) || value <= 0) return "";
  if (value < 1024) return `${value} B`;

  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1).replace(".", ",")} KB`;
  }

  return `${(value / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}

/* =========================================================
   Normalização
========================================================= */

function normalizeEvento(evento) {
  const date = firstValidDate(
    evento?.start,
    evento?.date,
    evento?.createdAt
  );

  const status = String(evento?.status || "pendente");

  const statusLabel =
    {
      confirmado: "Confirmado",
      concluido: "Concluído",
      pendente: "Pendente",
      cancelado: "Cancelado",
    }[status] || status;

  return {
    id: `evento:${evento.id}`,
    sourceId: String(evento.id),
    type: "evento",
    date,
    title: firstText(
      evento?.title,
      evento?.descricao,
      "Atendimento"
    ),
    subtitle: firstText(
      evento?.observacoes,
      evento?.descricao,
      evento?.local,
      "Consulta registrada"
    ),
    badge: statusLabel,
    raw: evento,
  };
}

function normalizeAvaliacao(avaliacao) {
  const date = firstValidDate(
    avaliacao?.createdAt,
    avaliacao?.updatedAt,
    avaliacao?.date,
    avaliacao?.data
  );

  const rawType = String(
    avaliacao?.type ||
      avaliacao?.tipo ||
      avaliacao?.fields?.tipo ||
      ""
  ).toLowerCase();

  let typeKey = "anamnese";
  let typeLabel = "Anamnese";

  if (rawType === "neurologica") {
    typeKey = "neurologica";
    typeLabel = "Avaliação neurológica";
  } else if (rawType === "ortopedica") {
    typeKey = "ortopedica";
    typeLabel = "Avaliação ortopédica";
  }

  /*
   * Alguns registros antigos de Anamnese foram salvos
   * com type "avaliacao". Não considerar isso Neurológica.
   */
  const textos = avaliacao?.fields?.textos || {};

  const subtitle = firstText(
    textos?.observacoesGerais,
    textos?.queixaPrincipal,
    textos?.historiaDoencaAtual,
    textos?.historicoOrtopedico,
    textos?.marcha,
    avaliacao?.resumo,
    avaliacao?.conclusao,
    avaliacao?.descricao,
    "Registro de avaliação clínica"
  );

  return {
    id: `avaliacao:${avaliacao.id}`,
    sourceId: String(avaliacao.id),
    type: "avaliacao",
    evaluationType: typeKey,
    date,
    title: firstText(
      avaliacao?.title,
      avaliacao?.titulo,
      typeLabel
    ),
    subtitle,
    badge: typeLabel,
    raw: avaliacao,
  };
}

function normalizeExame(exame) {
  const file = exame?.file || {};

  const date = firstValidDate(
    exame?.createdAt,
    exame?.updatedAt,
    exame?.examDate,
    exame?.uploadedAt
  );

  const mime = String(file?.mime || exame?.mimeType || "").toLowerCase();
  const fileName = firstText(
    file?.name,
    exame?.fileName,
    exame?.filename,
    exame?.name
  );

  let type = "exame";
  let typeLabel = "Arquivo";

  if (mime.includes("pdf")) {
    type = "laudo";
    typeLabel = "PDF";
  } else if (mime.startsWith("image/")) {
    typeLabel = "Imagem";
  } else if (mime.startsWith("video/")) {
    typeLabel = "Vídeo";
  } else if (mime.startsWith("audio/")) {
    typeLabel = "Áudio";
  }

  const subtitle = [
    firstText(exame?.notes, exame?.observacoes, exame?.descricao),
    fileName,
    formatBytes(file?.size),
  ]
    .filter(Boolean)
    .join(" • ");

  return {
    id: `${type}:${exame.id}`,
    sourceId: String(exame.id),
    type,
    date,
    title: firstText(
      exame?.title,
      exame?.titulo,
      fileName,
      typeLabel
    ),
    subtitle: subtitle || "Arquivo anexado",
    badge: typeLabel,
    raw: exame,
  };
}

function normalizeFinanceiro(lancamento) {
  const date = firstValidDate(
    lancamento?.competencia,
    lancamento?.vencimento,
    lancamento?.createdAt
  );

  const status = String(lancamento?.status || "pendente");

  const statusLabel =
    {
      rascunho: "Rascunho",
      pendente: "Pendente",
      parcial: "Parcial",
      pago: "Pago",
      vencido: "Vencido",
      cancelado: "Cancelado",
    }[status] || status;

  const value = Number(
    lancamento?.valores?.final ??
      lancamento?.valor ??
      0
  );

  return {
    id: `financeiro:${lancamento.id}`,
    sourceId: String(lancamento.id),
    type: "financeiro",
    date,
    title: firstText(
      lancamento?.descricao,
      "Lançamento financeiro"
    ),
    subtitle: `${formatCurrency(value)} • ${statusLabel}`,
    badge: statusLabel,
    raw: lancamento,
  };
}

function groupTimelineItems(items) {
  const map = new Map();

  items.forEach((item) => {
    const key = getDayKey(item.date);

    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  });

  return Array.from(map.entries())
    .sort(([keyA], [keyB]) => {
      if (keyA === "sem-data") return 1;
      if (keyB === "sem-data") return -1;

      return new Date(keyB) - new Date(keyA);
    })
    .map(([key, data]) => ({
      key,
      date: key === "sem-data" ? null : new Date(`${key}T12:00:00`),
      data: data.sort(
        (a, b) =>
          (b.date?.getTime?.() || 0) -
          (a.date?.getTime?.() || 0)
      ),
    }));
}

function getAvaliacaoRoute(item) {
  const type = String(
    item?.evaluationType ||
      item?.raw?.type ||
      item?.raw?.tipo ||
      item?.raw?.fields?.tipo ||
      ""
  ).toLowerCase();

  if (type === "neurologica") {
    return "/(modals)/avaliacao/avaliacao-neurologica";
  }

  if (type === "ortopedica") {
    return "/(modals)/avaliacao/avaliacao-ortopedica";
  }

  return "/(modals)/avaliacao/avaliacao-anamnese";
}

/* =========================================================
   Componentes
========================================================= */

function FilterChip({ item, active, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.filterChip,
        active && styles.filterChipActive,
        pressed && { opacity: 0.78 },
      ]}
    >
      <Text
        style={[
          styles.filterChipText,
          active && styles.filterChipTextActive,
        ]}
      >
        {item.label}
      </Text>
    </Pressable>
  );
}

function TimelineItem({ item, last, onPress }) {
  const meta = TYPE_META[item.type] || TYPE_META.evento;

  return (
    <View style={styles.timelineItem}>
      <View style={styles.timelineAxis}>
        <View
          style={[
            styles.timelineDot,
            { backgroundColor: meta.color },
          ]}
        >
          <Ionicons
            name={meta.icon}
            size={15}
            color="#FFFFFF"
          />
        </View>

        {!last && (
          <View
            style={[
              styles.timelineLine,
              { backgroundColor: `${meta.color}35` },
            ]}
          />
        )}
      </View>

      <Pressable
        onPress={() => {
          Haptics.selectionAsync().catch(() => {});
          onPress?.();
        }}
        style={({ pressed }) => [
          styles.timelineCard,
          pressed && {
            opacity: 0.82,
            transform: [{ scale: 0.995 }],
          },
        ]}
      >
        <View style={styles.timelineCardHeader}>
          <View
            style={[
              styles.typePill,
              { backgroundColor: meta.background },
            ]}
          >
            <Text
              style={[
                styles.typePillText,
                { color: meta.color },
              ]}
            >
              {meta.label}
            </Text>
          </View>

          {!!item.date && (
            <Text style={styles.timeText}>
              {formatHour(item.date)}
            </Text>
          )}
        </View>

        <Text
          style={styles.itemTitle}
          numberOfLines={2}
        >
          {item.title}
        </Text>

        {!!item.subtitle && (
          <Text
            style={styles.itemSubtitle}
            numberOfLines={3}
          >
            {item.subtitle}
          </Text>
        )}

        <View style={styles.itemFooter}>
          {!!item.badge && (
            <Text
              style={[
                styles.itemBadge,
                { color: meta.color },
              ]}
              numberOfLines={1}
            >
              {item.badge}
            </Text>
          )}

          <View style={styles.openLabel}>
            <Text style={styles.openLabelText}>
              Abrir
            </Text>

            <Ionicons
              name="chevron-forward"
              size={14}
              color={COLORS.faint}
            />
          </View>
        </View>
      </Pressable>
    </View>
  );
}

function EmptyTimeline({ petName, filter }) {
  const filtered = filter !== "todos";

  return (
    <View style={styles.emptyCard}>
      <View style={styles.emptyIcon}>
        <Ionicons
          name="time-outline"
          size={30}
          color={COLORS.blue}
        />
      </View>

      <Text style={styles.emptyTitle}>
        {filtered
          ? "Nenhum registro neste filtro"
          : "A história clínica começa aqui"}
      </Text>

      <Text style={styles.emptyText}>
        {filtered
          ? "Escolha outro tipo de registro para visualizar a timeline."
          : `Consultas, avaliações e exames de ${
              petName || "este paciente"
            } aparecerão aqui.`}
      </Text>
    </View>
  );
}

function PartialError() {
  return (
    <View style={styles.partialError}>
      <Ionicons
        name="warning-outline"
        size={16}
        color="#B45309"
      />

      <Text style={styles.partialErrorText}>
        Alguns registros não puderam ser carregados.
      </Text>
    </View>
  );
}

/* =========================================================
   Tela
========================================================= */

export default function PetTimelineScreen() {
  const params = useLocalSearchParams();
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();

  const rawId = Array.isArray(params.id)
    ? params.id[0]
    : params.id;

  const petId = rawId ? String(rawId) : null;

  const pet = useSelector((state) =>
    petId ? selectPetById(petId)(state) : null
  );

  const eventosSelector = useMemo(
    () => makeSelectEventosByPetId(petId || ""),
    [petId]
  );

  const financeiroSelector = useMemo(
    () => makeSelectLancamentosByPetId(petId || ""),
    [petId]
  );

  const eventos = useSelector(eventosSelector);
  const lancamentos = useSelector(financeiroSelector);

  const {
    items: avaliacoes,
    loading: loadingAvaliacoes,
    error: avaliacoesError,
    refresh: refreshAvaliacoes,
  } = usePetAvaliacoes(petId);

  const {
    items: exames,
    loading: loadingExames,
    error: examesError,
    refresh: refreshExames,
  } = usePetExams(petId);

  const agendaStatus = useSelector(selectAgendaStatus);
  const financeiroStatus = useSelector(selectFinanceiroStatus);

  const background = useThemeColor({}, "background");
  const tint = useThemeColor({}, "tint");

  const [filter, setFilter] = useState("todos");
  const [refreshing, setRefreshing] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerTitle: pet?.nome
        ? `Timeline de ${pet.nome}`
        : "Timeline",
      headerTitleAlign: "center",
      headerShadowVisible: false,
      headerBackVisible: false,
      headerTintColor: tint,
      headerStyle: {
        backgroundColor: background,
      },
      headerLeft: () => (
        <Pressable
          onPress={() => {
            Haptics.selectionAsync().catch(() => {});

            if (navigation.canGoBack()) {
              router.back();
              return;
            }

            router.replace({
              pathname: "/(modals)/pets/[id]/detail",
              params: {
                id: String(petId),
              },
            });
          }}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          style={({ pressed }) => [
            styles.headerBackButton,
            pressed && { opacity: 0.65 },
          ]}
        >
          <Ionicons
            name="chevron-back"
            size={22}
            color={tint}
          />
        </Pressable>
      ),
    });
  }, [
    navigation,
    pet?.nome,
    petId,
    tint,
    background,
  ]);

  const loadData = useCallback(async () => {
    if (!petId) return;

    await Promise.allSettled([
      dispatch(fetchPet(petId)),
      dispatch(loadAgenda()),
      dispatch(loadLancamentos()),
    ]);
  }, [dispatch, petId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    try {
      setRefreshing(true);

      refreshAvaliacoes();
      refreshExames();

      await loadData();
    } finally {
      setRefreshing(false);
    }
  }, [
    loadData,
    refreshAvaliacoes,
    refreshExames,
  ]);

  const allItems = useMemo(() => {
    const eventItems = (eventos || []).map(normalizeEvento);
    const evaluationItems = (avaliacoes || []).map(normalizeAvaliacao);
    const examItems = (exames || []).map(normalizeExame);
    const financialItems = (lancamentos || []).map(normalizeFinanceiro);

    return [
      ...eventItems,
      ...evaluationItems,
      ...examItems,
      ...financialItems,
    ].sort(
      (a, b) =>
        (b.date?.getTime?.() || 0) -
        (a.date?.getTime?.() || 0)
    );
  }, [
    eventos,
    avaliacoes,
    exames,
    lancamentos,
  ]);

  const filteredItems = useMemo(() => {
    if (filter === "todos") return allItems;

    if (filter === "exame") {
      return allItems.filter(
        (item) =>
          item.type === "exame" ||
          item.type === "laudo"
      );
    }

    return allItems.filter(
      (item) => item.type === filter
    );
  }, [allItems, filter]);

  const groups = useMemo(
    () => groupTimelineItems(filteredItems),
    [filteredItems]
  );

  const summary = useMemo(
    () => ({
      eventos: eventos?.length || 0,
      avaliacoes: avaliacoes?.length || 0,
      exames: exames?.length || 0,
    }),
    [
      eventos?.length,
      avaliacoes?.length,
      exames?.length,
    ]
  );

  const openItem = useCallback(
    (item) => {
      if (!petId) return;

      if (item.type === "evento") {
        router.push({
          pathname: "/(modals)/agenda-new",
          params: {
            id: item.sourceId,
          },
        });

        return;
      }

      if (item.type === "financeiro") {
        router.push({
          pathname: "/(modals)/financeiro/[id]",
          params: {
            id: item.sourceId,
          },
        });

        return;
      }

      if (
        item.type === "exame" ||
        item.type === "laudo"
      ) {
        const firebase = ensureFirebase();
        const uid = firebase?.auth?.currentUser?.uid;

        if (!uid) return;

        router.push({
          pathname: "/(files)/exam-preview",
          params: {
            uid: String(uid),
            petId: String(petId),
            examId: String(item.sourceId),
          },
        });

        return;
      }

      if (item.type === "avaliacao") {
        router.push({
          pathname: getAvaliacaoRoute(item),
          params: {
            id: String(petId),
            avaliacaoId: String(item.sourceId),
            tipo: item.evaluationType || "",
          },
        });
      }
    },
    [petId]
  );

  const initialLoading =
    (
      agendaStatus === "loading" ||
      financeiroStatus === "loading" ||
      loadingAvaliacoes ||
      loadingExames
    ) &&
    allItems.length === 0;

  if (!petId) {
    return (
      <SafeAreaView
        style={[
          styles.center,
          { backgroundColor: background },
        ]}
        edges={["left", "right"]}
      >
        <Text style={styles.invalidText}>
          Paciente inválido.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[
        styles.safe,
        { backgroundColor: background },
      ]}
      edges={["left", "right"]}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom:
              28 +
              Math.max(insets.bottom, 0),
          },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={tint}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Ionicons
              name="git-commit-outline"
              size={26}
              color={COLORS.blue}
            />
          </View>

          <View style={styles.heroMain}>
            <Text style={styles.heroTitle}>
              História de {pet?.nome || "paciente"}
            </Text>

            <Text style={styles.heroSubtitle}>
              Registros clínicos organizados em ordem cronológica.
            </Text>
          </View>
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>
              {summary.eventos}
            </Text>

            <Text style={styles.summaryLabel}>
              Consultas
            </Text>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>
              {summary.avaliacoes}
            </Text>

            <Text style={styles.summaryLabel}>
              Avaliações
            </Text>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>
              {summary.exames}
            </Text>

            <Text style={styles.summaryLabel}>
              Exames
            </Text>
          </View>
        </View>

        {(avaliacoesError || examesError) && (
          <PartialError />
        )}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
        >
          {FILTERS.map((item) => (
            <FilterChip
              key={item.key}
              item={item}
              active={filter === item.key}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                setFilter(item.key);
              }}
            />
          ))}
        </ScrollView>

        {initialLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator
              size="small"
              color={tint}
            />

            <Text style={styles.loadingText}>
              Montando a timeline…
            </Text>
          </View>
        ) : groups.length === 0 ? (
          <EmptyTimeline
            petName={pet?.nome}
            filter={filter}
          />
        ) : (
          <View style={styles.timeline}>
            {groups.map((group) => (
              <View
                key={group.key}
                style={styles.dayGroup}
              >
                <View style={styles.dayHeader}>
                  <View>
                    <Text style={styles.dayTitle}>
                      {formatDay(group.date)}
                    </Text>

                    {!!group.date && (
                      <Text style={styles.weekday}>
                        {formatWeekday(group.date)}
                      </Text>
                    )}
                  </View>

                  {isToday(group.date) && (
                    <View style={styles.todayBadge}>
                      <Text style={styles.todayText}>
                        Hoje
                      </Text>
                    </View>
                  )}
                </View>

                {group.data.map((item, index) => (
                  <TimelineItem
                    key={item.id}
                    item={item}
                    last={
                      index ===
                      group.data.length - 1
                    }
                    onPress={() => openItem(item)}
                  />
                ))}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  invalidText: {
    color: COLORS.subtle,
    fontSize: 14,
  },

  content: {
    paddingHorizontal: 16,
    paddingTop: 14,
    gap: 14,
  },

  headerBackButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(118,118,128,0.10)",
  },

  heroCard: {
    minHeight: 92,
    padding: 15,
    borderRadius: 21,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 9,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 2,
  },

  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(10,132,255,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },

  heroMain: {
    flex: 1,
    minWidth: 0,
  },

  heroTitle: {
    color: COLORS.text,
    fontSize: 17,
    lineHeight: 21,
    fontWeight: "850",
  },

  heroSubtitle: {
    marginTop: 4,
    color: COLORS.subtle,
    fontSize: 12,
    lineHeight: 17,
  },

  summaryRow: {
    minHeight: 78,
    paddingHorizontal: 8,
    borderRadius: 18,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
  },

  summaryItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  summaryValue: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "850",
  },

  summaryLabel: {
    marginTop: 3,
    color: COLORS.subtle,
    fontSize: 10,
    fontWeight: "700",
  },

  summaryDivider: {
    width: 1,
    height: 30,
    backgroundColor: COLORS.border,
  },

  partialError: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "rgba(245,158,11,0.10)",
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.18)",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  partialErrorText: {
    flex: 1,
    color: "#92400E",
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "650",
  },

  filters: {
    gap: 8,
    paddingRight: 10,
  },

  filterChip: {
    minHeight: 36,
    paddingHorizontal: 13,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    alignItems: "center",
    justifyContent: "center",
  },

  filterChipActive: {
    backgroundColor: COLORS.blue,
    borderColor: COLORS.blue,
  },

  filterChipText: {
    color: COLORS.subtle,
    fontSize: 12,
    fontWeight: "750",
  },

  filterChipTextActive: {
    color: "#FFFFFF",
    fontWeight: "850",
  },

  loadingBox: {
    minHeight: 180,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },

  loadingText: {
    color: COLORS.subtle,
    fontSize: 12,
  },

  emptyCard: {
    minHeight: 240,
    padding: 24,
    borderRadius: 22,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyIcon: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: "rgba(10,132,255,0.09)",
    alignItems: "center",
    justifyContent: "center",
  },

  emptyTitle: {
    marginTop: 14,
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "850",
    textAlign: "center",
  },

  emptyText: {
    marginTop: 7,
    maxWidth: 290,
    color: COLORS.subtle,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },

  timeline: {
    gap: 22,
  },

  dayGroup: {
    gap: 5,
  },

  dayHeader: {
    minHeight: 45,
    marginBottom: 6,
    paddingHorizontal: 3,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  dayTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "850",
    textTransform: "capitalize",
  },

  weekday: {
    marginTop: 2,
    color: COLORS.subtle,
    fontSize: 11,
    textTransform: "capitalize",
  },

  todayBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "rgba(10,132,255,0.10)",
  },

  todayText: {
    color: COLORS.blue,
    fontSize: 10,
    fontWeight: "850",
  },

  timelineItem: {
    minHeight: 112,
    flexDirection: "row",
  },

  timelineAxis: {
    width: 42,
    alignItems: "center",
  },

  timelineDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },

  timelineLine: {
    width: 2,
    flex: 1,
    minHeight: 72,
    marginVertical: 3,
  },

  timelineCard: {
    flex: 1,
    minWidth: 0,
    marginBottom: 12,
    padding: 13,
    borderRadius: 18,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 7,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 1,
  },

  timelineCardHeader: {
    minHeight: 25,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  typePill: {
    minHeight: 24,
    paddingHorizontal: 9,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },

  typePillText: {
    fontSize: 10,
    fontWeight: "850",
  },

  timeText: {
    color: COLORS.faint,
    fontSize: 10,
    fontWeight: "700",
  },

  itemTitle: {
    marginTop: 9,
    color: COLORS.text,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "850",
  },

  itemSubtitle: {
    marginTop: 5,
    color: COLORS.subtle,
    fontSize: 12,
    lineHeight: 17,
  },

  itemFooter: {
    marginTop: 11,
    minHeight: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  itemBadge: {
    flex: 1,
    fontSize: 10,
    fontWeight: "800",
  },

  openLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },

  openLabelText: {
    color: COLORS.faint,
    fontSize: 10,
    fontWeight: "750",
  },
});