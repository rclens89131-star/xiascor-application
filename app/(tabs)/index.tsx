/* XS_HOME_CLUB_PRESIDENT_V1 */
/* XS_HOME_CLUB_EVOLUTION_HISTORY_V1 */
/* XS_FINANCIAL_CENTER_V1 */
/* XS_DIRECTOR_REPORT_V1 */
/* XS_AI_MARKET_OPPORTUNITIES_V1 */
/* XS_BOARD_OBJECTIVES_V1 */
/* XS_HOME_AUDIT_FIX_V1 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";

import { apiFetch } from "../../src/api";
import { myCardsList } from "../../src/scoutApi";

const DEVICE_ID_KEY = "XS_DEVICE_ID_V1";
const JWT_DEVICE_ID_KEY = "XS_JWT_DEVICE_ID_V1";
const OAUTH_DEVICE_ID_KEY = "xs_device_id";
const CLUB_VALUE_HISTORY_KEY = "club_value_history";
const XS_HOME_AUDIT_FIX_CLOUD_BASE_V1 = "https://xiascor-backend-tssdy62zqa-ez.a.run.app";

type HomeAlertItem = { icon: string; tone: "green" | "gold" | "red"; text: string };
type HomeGoalItem = { label: string; done: boolean };
type HomeTrainingSummary = {
  averageForm: number | null;
  inForm: number | null;
  neutral: number | null;
  declining: number | null;
  counted: number;
};

type ClubMetrics = {
  clubValue: number | null;
  squadCount: number | null;
  weeklyDelta: number | null;
  clubValueText?: string | null;
  weeklyDeltaText?: string | null;
  evolutionText?: string | null;
  pricedCards?: number | null;
  coveragePct?: number | null;
  historyCount?: number | null;
};

type DirectorReportPayload = {
  ok?: boolean;
  clubValueText?: string | null;
  variationText?: string | null;
  coveragePct?: number | null;
  pricedCards?: number | null;
  cardCount?: number | null;
  unpricedCards?: number | null;
  bestPerformer?: {
    playerName?: string | null;
    valueText?: string | null;
  } | null;
  watchPlayer?: {
    playerName?: string | null;
    valueText?: string | null;
  } | null;
  summary?: string | null;
};

type MarketOpportunity = {
  playerSlug?: string | null;
  playerName?: string | null;
  priceEur?: number | null;
  priceText?: string | null;
  estimatedValueEur?: number | null;
  estimatedValueText?: string | null;
  potentialPct?: number | null;
  reason?: string | null;
};

type MarketOpportunitiesPayload = {
  ok?: boolean;
  opportunities?: MarketOpportunity[];
};

type BoardObjectivesPayload = {
  ok?: boolean;
  clubValueText?: string | null;
  targetValueEur?: number | null;
  targetValueText?: string | null;
  progressPct?: number | null;
  coveragePct?: number | null;
  cardCount?: number | null;
  pricedCards?: number | null;
  status?: "ahead" | "on_track" | "needs_reinforcement" | "unavailable" | string | null;
  message?: string | null;
};

type ClubValueHistorySnapshot = {
  id: string;
  label: string;
  createdAt: string;
  clubValueEur: number;
  clubValueText: string;
  pricedCards?: number | null;
  cardCount?: number | null;
  totalInvestedEur?: number | null;
  totalSoldEur?: number | null;
  estimatedProfitEur?: number | null;
  estimatedProfitPct?: number | null;
  bestCardSlug?: string | null;
  bestCardGainEur?: number | null;
  worstCardSlug?: string | null;
  worstCardGainEur?: number | null;
};

type HomeGameWeekSummary = {
  label: string;
  rarity: string;
  eligibleCount: number | null;
  state: "prête" | "incomplète" | "indisponible";
  projectionLabel: string;
};

function normalizeClubValueBackendHistoryItemV1(item: any): ClubValueHistorySnapshot {
  return {
    id: String(item?.id || item?.snapshotDate || item?.createdAt || ""),
    label: String(item?.gameWeekLabel || item?.label || ""),
    createdAt: String(item?.snapshotDate || item?.createdAt || ""),
    clubValueEur: metricNumber(item?.clubValueEur) ?? 0,
    clubValueText: String(item?.clubValueText || ""),
    pricedCards: metricNumber(item?.pricedCards),
    cardCount: metricNumber(item?.cardCount),
    totalInvestedEur: metricNumber(item?.totalInvestedEur ?? item?.cashSpentEur),
    totalSoldEur: metricNumber(item?.totalSoldEur ?? item?.cashReceivedEur),
    estimatedProfitEur: metricNumber(item?.estimatedProfitEur ?? item?.profitLossEur),
    estimatedProfitPct: metricNumber(item?.estimatedProfitPct),
    bestCardSlug: item?.bestCardSlug ? String(item.bestCardSlug) : null,
    bestCardGainEur: metricNumber(item?.bestCardGainEur),
    worstCardSlug: item?.worstCardSlug ? String(item.worstCardSlug) : null,
    worstCardGainEur: metricNumber(item?.worstCardGainEur),
  };
}

const HOME_GAMEWEEK_OPTIONS_V1 = [
  { label: "Champion", rarity: "Limited", leagues: ["premier-league-gb-eng", "laliga-es", "bundesliga-de", "serie-a-it", "ligue-1-fr"], requiredCards: 5 },
  { label: "Ligue 1", rarity: "Limited", leagues: ["ligue-1-fr"], requiredCards: 5 },
  { label: "Premier League", rarity: "Limited", leagues: ["premier-league-gb-eng"], requiredCards: 5 },
  { label: "Serie A", rarity: "Limited", leagues: ["serie-a-it"], requiredCards: 5 },
  { label: "MLS", rarity: "Limited", leagues: ["mls", "mls-us", "mlspa"], requiredCards: 5 },
  { label: "All-Star", rarity: "Limited", leagues: [], requiredCards: 5 },
];

function metricNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(String(value).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function firstMetricNumber(...values: unknown[]): number | null {
  for (const value of values) {
    const n = metricNumber(value);
    if (n !== null) return n;
  }
  return null;
}

function formatEuro(value: number | null): string {
  if (value === null) return "—";
  return `${Math.round(value).toLocaleString("fr-FR")} €`;
}

function formatWeeklyDelta(value: number | null): string {
  if (value === null) return "Données indisponibles";
  const rounded = Math.round(value);
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded.toLocaleString("fr-FR")} €`;
}

function formatSignedEuro(value: number): string {
  const rounded = Math.round(value);
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded.toLocaleString("fr-FR")} €`;
}

async function xsHomeAuditFetchJsonV1<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${XS_HOME_AUDIT_FIX_CLOUD_BASE_V1}${path.startsWith("/") ? "" : "/"}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!response.ok) {
    const msg = typeof data === "string" ? data : (data?.error || data?.message || `HTTP ${response.status}`);
    throw new Error(msg);
  }
  return data as T;
}

async function xsHomeAuditClubFetchV1<T>(
  path: string,
  options: RequestInit = {},
  isUsable: (payload: any) => boolean = (payload) => !!payload && payload.ok !== false
): Promise<T> {
  let primary: any = null;
  try {
    primary = await apiFetch<T>(path, options);
    if (isUsable(primary)) return primary as T;
  } catch {}
  try {
    const cloud = await xsHomeAuditFetchJsonV1<T>(path, options);
    if (isUsable(cloud)) return cloud;
  } catch {}
  if (primary !== null) return primary as T;
  throw new Error("club_endpoint_unavailable");
}

function xsHomeAuditHistoryUsableV1(payload: any): boolean {
  return payload && payload.ok !== false && Array.isArray(payload.items) && payload.items.length > 1;
}

function xsHomeAuditMetricsUsableV1(payload: any): boolean {
  return payload && payload.ok !== false && metricNumber(payload.clubValueEur) !== null && metricNumber(payload.cardCount) !== null;
}

async function readClubValueHistoryV1(): Promise<ClubValueHistorySnapshot[]> {
  try {
    const raw = await AsyncStorage.getItem(CLUB_VALUE_HISTORY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed
          .map((item: any) => ({
            id: String(item?.id || item?.createdAt || ""),
            label: String(item?.label || ""),
            createdAt: String(item?.createdAt || ""),
            clubValueEur: metricNumber(item?.clubValueEur) ?? 0,
            clubValueText: String(item?.clubValueText || ""),
            pricedCards: metricNumber(item?.pricedCards),
            cardCount: metricNumber(item?.cardCount),
            totalInvestedEur: metricNumber(item?.totalInvestedEur),
            totalSoldEur: metricNumber(item?.totalSoldEur),
            estimatedProfitEur: metricNumber(item?.estimatedProfitEur),
            estimatedProfitPct: metricNumber(item?.estimatedProfitPct),
            bestCardSlug: item?.bestCardSlug ? String(item.bestCardSlug) : null,
            bestCardGainEur: metricNumber(item?.bestCardGainEur),
            worstCardSlug: item?.worstCardSlug ? String(item.worstCardSlug) : null,
            worstCardGainEur: metricNumber(item?.worstCardGainEur),
          }))
          .filter((item) => item.createdAt && Number.isFinite(item.clubValueEur))
      : [];
  } catch {
    return [];
  }
}

async function upsertClubValueSnapshotV1(payload: any): Promise<ClubValueHistorySnapshot[]> {
  const value = metricNumber(payload?.clubValueEur);
  if (value === null) return readClubValueHistoryV1();
  const current = await readClubValueHistoryV1();
  const last = current[current.length - 1];
  const today = new Date();
  const dayKey = today.toISOString().slice(0, 10);
  const next: ClubValueHistorySnapshot = {
    id: dayKey,
    label: `GW${current.length + 521}`,
    createdAt: today.toISOString(),
    clubValueEur: Math.round(value * 100) / 100,
    clubValueText: typeof payload?.clubValueText === "string" ? payload.clubValueText : formatEuro(value),
    pricedCards: metricNumber(payload?.pricedCards),
    cardCount: metricNumber(payload?.cardCount),
    totalInvestedEur: metricNumber(payload?.totalInvestedEur),
    totalSoldEur: metricNumber(payload?.totalSoldEur),
    estimatedProfitEur: metricNumber(payload?.estimatedProfitEur),
    estimatedProfitPct: metricNumber(payload?.estimatedProfitPct),
    bestCardSlug: payload?.bestCardSlug ? String(payload.bestCardSlug) : null,
    bestCardGainEur: metricNumber(payload?.bestCardGainEur),
    worstCardSlug: payload?.worstCardSlug ? String(payload.worstCardSlug) : null,
    worstCardGainEur: metricNumber(payload?.worstCardGainEur),
  };
  const merged = last && last.id === dayKey
    ? [...current.slice(0, -1), { ...last, ...next, label: last.label || next.label }]
    : current.length && Math.abs((last?.clubValueEur ?? 0) - next.clubValueEur) < 0.01
      ? current
      : [...current, next];
  const trimmed = merged.slice(-120);
  try { await AsyncStorage.setItem(CLUB_VALUE_HISTORY_KEY, JSON.stringify(trimmed)); } catch {}
  return trimmed;
}

async function readClubValueBackendHistoryV1(deviceId: string | null): Promise<ClubValueHistorySnapshot[]> {
  try {
    const qs = new URLSearchParams();
    if (deviceId) qs.set("deviceId", deviceId);
    const payload = await xsHomeAuditClubFetchV1<any>(
      `/club/value-history${qs.toString() ? `?${qs.toString()}` : ""}`,
      {},
      xsHomeAuditHistoryUsableV1
    );
    const items = Array.isArray(payload?.items) ? payload.items : [];
    return items
      .map(normalizeClubValueBackendHistoryItemV1)
      .filter((item) => item.createdAt && Number.isFinite(item.clubValueEur));
  } catch {
    return [];
  }
}

function getClubEvolutionTextV1(history: ClubValueHistorySnapshot[], _currentValue: number | null): string {
  if (!history.length) return "0 €";
  const firstValue = history[0]?.clubValueEur;
  const lastValue = history[history.length - 1]?.clubValueEur;
  if (!Number.isFinite(firstValue)) return "0 €";
  if (!Number.isFinite(lastValue)) return "0 €";
  return formatSignedEuro(lastValue - firstValue);
}

function normalizeHomeTextV1(value: unknown): string {
  return String(value || "").trim().toLowerCase();
}

function getHomeCardRarityV1(card: any): string {
  return normalizeHomeTextV1(card?.rarity || card?.cardRarity || card?.rarityTyped || card?.card_data?.rarity);
}

function getHomeCardLeagueSlugV1(card: any): string {
  return normalizeHomeTextV1(
    card?.currentLeagueSlug ||
      card?.leagueSlug ||
      card?.cardLeagueSlug ||
      card?.currentLeague?.slug ||
      card?.league?.slug ||
      card?.card_data?.currentLeagueSlug ||
      card?.card_data?.leagueSlug
  );
}

function extractHomeGameWeekSummaryV1(payload: any): HomeGameWeekSummary {
  // XS_HOME_REAL_GAMEWEEK_V1: lightweight Home summary from the same cards data used by Mes cartes/Jouer.
  const cards = Array.isArray(payload?.cards) ? payload.cards : [];
  if (!cards.length) {
    return {
      label: "Données indisponibles",
      rarity: "—",
      eligibleCount: null,
      state: "indisponible",
      projectionLabel: "À générer",
    };
  }

  const ranked = HOME_GAMEWEEK_OPTIONS_V1.map((option) => {
    const rarityKey = normalizeHomeTextV1(option.rarity);
    const leagueKeys = option.leagues.map(normalizeHomeTextV1);
    const eligibleCount = cards.filter((card: any) => {
      const rarity = getHomeCardRarityV1(card);
      if (rarity !== rarityKey) return false;
      if (!leagueKeys.length) return true;
      const leagueSlug = getHomeCardLeagueSlugV1(card);
      return leagueSlug ? leagueKeys.includes(leagueSlug) : false;
    }).length;
    return {
      ...option,
      eligibleCount,
      state: eligibleCount >= option.requiredCards ? "prête" : eligibleCount > 0 ? "incomplète" : "indisponible",
    } as const;
  });

  const ready = ranked.find((item) => item.state === "prête");
  const bestPartial = ranked.slice().sort((a, b) => b.eligibleCount - a.eligibleCount)[0];
  const selected = ready || bestPartial;
  return {
    label: selected?.label || "Données indisponibles",
    rarity: selected?.rarity || "—",
    eligibleCount: selected ? selected.eligibleCount : null,
    state: selected?.state || "indisponible",
    projectionLabel: "À générer",
  };
}

async function readHomeDeviceIdV1(): Promise<string | null> {
  // XS_HOME_DEVICE_ID_FIX_V1: mirror Mes cartes deviceId priority.
  const oauthId = (await AsyncStorage.getItem(OAUTH_DEVICE_ID_KEY)) || "";
  if (oauthId.trim()) {
    try { await AsyncStorage.setItem(DEVICE_ID_KEY, oauthId.trim()); } catch {}
    return oauthId.trim();
  }

  const jwtId = (await AsyncStorage.getItem(JWT_DEVICE_ID_KEY)) || "";
  if (jwtId.trim()) return jwtId.trim();

  const existing = (await AsyncStorage.getItem(DEVICE_ID_KEY)) || "";
  if (existing.trim()) return existing.trim();

  const generated = `xs-device-${Date.now()}`;
  await AsyncStorage.setItem(DEVICE_ID_KEY, generated);
  return generated;
}

function extractClubMetricsV1(payload: any): ClubMetrics {
  // XS_HOME_REAL_CLUB_METRICS_V1: reuse /my-cards data already consumed by Mes cartes.
  const cards = Array.isArray(payload?.cards) ? payload.cards : [];
  const meta = payload?.meta || {};
  const summary = payload?.summary || meta?.summary || {};
  const directValue = firstMetricNumber(
    payload?.clubValue,
    payload?.totalValue,
    payload?.collectionValue,
    payload?.valueEur,
    summary?.clubValue,
    summary?.totalValue,
    summary?.collectionValue,
    meta?.clubValue,
    meta?.totalValue,
    meta?.collectionValue
  );
  const cardValues = cards
    .map((card: any) =>
      firstMetricNumber(
        card?.marketValueEur,
        card?.estimatedValueEur,
        card?.floorPriceEur,
        card?.priceEur,
        card?.eur,
        card?.valueEur,
        card?.price?.eur
      )
    )
    .filter((value: number | null): value is number => value !== null && value > 0);
  const clubValue = directValue ?? (cardValues.length ? cardValues.reduce((sum, value) => sum + value, 0) : null);
  const weeklyDelta = firstMetricNumber(
    payload?.weeklyDelta,
    payload?.weeklyDeltaEur,
    payload?.evolutionWeek,
    payload?.weekDelta,
    summary?.weeklyDelta,
    summary?.weeklyDeltaEur,
    meta?.weeklyDelta,
    meta?.weeklyDeltaEur
  );
  const squadCount = firstMetricNumber(payload?.total, payload?.count, summary?.cardsCount, meta?.cardsCount) ?? (cards.length ? cards.length : null);
  return { clubValue, squadCount, weeklyDelta };
}

function getHomeCardPerformanceValueV1(card: any, key: "l5" | "l15"): number | null {
  return firstMetricNumber(
    card?.[key],
    card?.averages?.[key],
    card?.stats?.[key],
    card?.performance?.[key],
    card?.card_data?.[key]
  );
}

function extractHomeTrainingSummaryV1(payload: any): HomeTrainingSummary {
  const cards = Array.isArray(payload?.cards) ? payload.cards : [];
  const l5Values = cards
    .map((card: any) => getHomeCardPerformanceValueV1(card, "l5"))
    .filter((value: number | null): value is number => value !== null && Number.isFinite(value));
  const trendRows = cards
    .map((card: any) => {
      const l5 = getHomeCardPerformanceValueV1(card, "l5");
      const l15 = getHomeCardPerformanceValueV1(card, "l15");
      return l5 === null || l15 === null ? null : l5 - l15;
    })
    .filter((value: number | null): value is number => value !== null && Number.isFinite(value));
  const averageForm = l5Values.length
    ? Math.round(l5Values.reduce((sum, value) => sum + value, 0) / l5Values.length)
    : null;
  return {
    averageForm,
    inForm: trendRows.length ? trendRows.filter((value) => value >= 5).length : null,
    neutral: trendRows.length ? trendRows.filter((value) => value > -5 && value < 5).length : null,
    declining: trendRows.length ? trendRows.filter((value) => value <= -5).length : null,
    counted: l5Values.length,
  };
}

async function fetchHomeClubMetricsEndpointV1(deviceId: string): Promise<ClubMetrics | null> {
  // XS_HOME_CLUB_METRICS_ENDPOINT_V1: President Home reads the dedicated club value endpoint.
  try {
    const qs = new URLSearchParams();
    qs.set("deviceId", deviceId);
    const payload = await xsHomeAuditClubFetchV1<any>(`/club/metrics?${qs.toString()}`, {}, xsHomeAuditMetricsUsableV1);
    if (!payload || payload.ok === false) return null;
    let history = await readClubValueBackendHistoryV1(deviceId);
    if (!history.length) history = await upsertClubValueSnapshotV1(payload);
    const clubValue = firstMetricNumber(payload.clubValueEur);
    const cardCount = firstMetricNumber(payload.cardCount);
    const pricedCards = firstMetricNumber(payload.pricedCards);
    const coveragePct = cardCount && pricedCards !== null ? Math.round((pricedCards / cardCount) * 100) : null;
    return {
      clubValue,
      squadCount: cardCount,
      weeklyDelta: firstMetricNumber(payload.weeklyDeltaEur),
      clubValueText: typeof payload.clubValueText === "string" && payload.clubValueText.trim() ? payload.clubValueText : null,
      weeklyDeltaText: typeof payload.weeklyDeltaText === "string" && payload.weeklyDeltaText.trim() ? payload.weeklyDeltaText : null,
      evolutionText: getClubEvolutionTextV1(history, clubValue),
      pricedCards,
      coveragePct,
      historyCount: history.length,
    };
  } catch {
    return null;
  }
}

async function fetchHomeDirectorReportV1(deviceId: string): Promise<DirectorReportPayload | null> {
  // XS_DIRECTOR_REPORT_V1: President Home reads the data-only sporting director report.
  try {
    const qs = new URLSearchParams();
    qs.set("deviceId", deviceId);
    const payload = await xsHomeAuditClubFetchV1<DirectorReportPayload>(
      `/club/director-report?${qs.toString()}`,
      {},
      (value) => value && value.ok !== false && Boolean(value.clubValueText)
    );
    return payload && payload.ok !== false ? payload : null;
  } catch {
    return null;
  }
}

async function fetchHomeMarketOpportunitiesV1(): Promise<MarketOpportunity[]> {
  // XS_AI_MARKET_OPPORTUNITIES_V1: Accueil reads top data-only mercato opportunities.
  try {
    const payload = await apiFetch<MarketOpportunitiesPayload>("/market/ai-opportunities?limit=3");
    if (!payload || payload.ok === false || !Array.isArray(payload.opportunities)) return [];
    return payload.opportunities.filter((item) => item && item.playerSlug && item.playerName).slice(0, 3);
  } catch {
    return [];
  }
}

async function fetchHomeBoardObjectivesV1(deviceId: string): Promise<BoardObjectivesPayload | null> {
  // XS_BOARD_OBJECTIVES_V1: President Home reads board objectives from club metrics.
  try {
    const qs = new URLSearchParams();
    qs.set("deviceId", deviceId);
    const payload = await xsHomeAuditClubFetchV1<BoardObjectivesPayload>(
      `/club/board-objectives?${qs.toString()}`,
      {},
      (value) => value && value.ok !== false && Boolean(value.clubValueText)
    );
    return payload && payload.ok !== false ? payload : null;
  } catch {
    return null;
  }
}

function SectionCard({ children, style }: { children: React.ReactNode; style?: any }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

function SectionTitle({ icon, title, action }: { icon: keyof typeof Ionicons.glyphMap; title: string; action?: string }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleRow}>
        <Ionicons name={icon} size={18} color="#FF3148" />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {action ? <Text style={styles.sectionAction}>{action}</Text> : null}
    </View>
  );
}

function StatPill({ label, value, onPress }: { label: string; value: string; onPress?: () => void }) {
  const content = (
    <>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </>
  );
  if (onPress) {
    return (
      <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.statPill, pressed && styles.pressed]}>
        {content}
      </Pressable>
    );
  }
  return (
    <View style={styles.statPill}>
      {content}
    </View>
  );
}

function buildHomeMorningAlertsV1(metrics: ClubMetrics, report: DirectorReportPayload | null, gameWeek: HomeGameWeekSummary): HomeAlertItem[] {
  const items: HomeAlertItem[] = [];
  if (report?.summary) items.push({ icon: "analytics", tone: "green", text: report.summary });
  if (report?.variationText && report.variationText !== "Donnée indisponible") items.push({ icon: "trending-up", tone: "green", text: `Évolution du club : ${report.variationText}.` });
  if (metrics.coveragePct !== null && metrics.coveragePct !== undefined) items.push({ icon: "shield-checkmark", tone: "green", text: `Couverture marché : ${metrics.coveragePct}%.` });
  if (report?.watchPlayer?.playerName) items.push({ icon: "eye", tone: "gold", text: `Carte à surveiller : ${report.watchPlayer.playerName}.` });
  if (gameWeek.label !== "Données indisponibles") items.push({ icon: "calendar", tone: gameWeek.state === "prête" ? "green" : "gold", text: `${gameWeek.label} ${gameWeek.rarity} : ${gameWeek.state}.` });
  return items.slice(0, 4);
}

function buildHomeNewsV1(metrics: ClubMetrics, report: DirectorReportPayload | null, gameWeek: HomeGameWeekSummary, opportunities: MarketOpportunity[]): string[] {
  const news: string[] = [];
  if (metrics.historyCount && metrics.historyCount > 1) news.push(`${metrics.historyCount} snapshots de valeur disponibles`);
  if (metrics.pricedCards !== null && metrics.pricedCards !== undefined && metrics.squadCount) news.push(`${metrics.pricedCards}/${metrics.squadCount} cartes valorisées`);
  if (report?.variationText && report.variationText !== "Donnée indisponible") news.push(`Évolution historique : ${report.variationText}`);
  if (gameWeek.label !== "Données indisponibles") news.push(`${gameWeek.label} ${gameWeek.rarity} : ${gameWeek.eligibleCount ?? "—"} carte(s) éligible(s)`);
  if (opportunities.length) news.push(`${opportunities.length} opportunité(s) mercato avec données fiables`);
  return news.slice(0, 4);
}

function buildHomeGoalsV1(metrics: ClubMetrics, board: BoardObjectivesPayload | null, gameWeek: HomeGameWeekSummary): HomeGoalItem[] {
  const target = board?.targetValueText || "prochain palier";
  return [
    { label: `Atteindre ${target} de valeur`, done: Boolean(board?.progressPct !== null && board?.progressPct !== undefined && board.progressPct >= 100) },
    { label: metrics.squadCount === null ? "Effectif à connecter" : `Effectif : ${metrics.squadCount} cartes`, done: Boolean(metrics.squadCount !== null && metrics.squadCount >= 50) },
    { label: metrics.squadCount ? `Valoriser ${metrics.squadCount} cartes` : "Valorisation à connecter", done: Boolean(metrics.squadCount && metrics.pricedCards === metrics.squadCount) },
    { label: gameWeek.label === "Données indisponibles" ? "Game Week à connecter" : `${gameWeek.label} ${gameWeek.rarity}`, done: gameWeek.state === "prête" },
  ];
}

function AlertLine({ item }: { item: HomeAlertItem }) {
  const color = item.tone === "green" ? "#2FE66B" : item.tone === "gold" ? "#FFD43B" : "#FF3148";
  return (
    <View style={styles.alertLine}>
      <Ionicons name={item.icon as any} size={17} color={color} />
      <Text style={styles.alertText}>{item.text}</Text>
    </View>
  );
}

function boardStatusLabelV1(status?: string | null): string {
  if (status === "ahead") return "En avance";
  if (status === "on_track") return "Sur la bonne voie";
  if (status === "needs_reinforcement") return "À renforcer";
  return "Donnée indisponible";
}

export default function HomeScreen() {
  const [clubMetrics, setClubMetrics] = useState<ClubMetrics>({ clubValue: null, squadCount: null, weeklyDelta: null });
  const [trainingSummary, setTrainingSummary] = useState<HomeTrainingSummary>({ averageForm: null, inForm: null, neutral: null, declining: null, counted: 0 });
  const [directorReport, setDirectorReport] = useState<DirectorReportPayload | null>(null);
  const [directorLoading, setDirectorLoading] = useState(false);
  const [marketOpportunities, setMarketOpportunities] = useState<MarketOpportunity[]>([]);
  const [marketOpportunitiesLoading, setMarketOpportunitiesLoading] = useState(false);
  const [boardObjectives, setBoardObjectives] = useState<BoardObjectivesPayload | null>(null);
  const [boardObjectivesLoading, setBoardObjectivesLoading] = useState(false);
  const [gameWeekSummary, setGameWeekSummary] = useState<HomeGameWeekSummary>({
    label: "Données indisponibles",
    rarity: "—",
    eligibleCount: null,
    state: "indisponible",
    projectionLabel: "À générer",
  });

  useEffect(() => {
    let mounted = true;
    async function loadClubMetrics() {
      try {
        const deviceId = await readHomeDeviceIdV1();
        if (!deviceId || !mounted) return;
        const endpointMetrics = await fetchHomeClubMetricsEndpointV1(deviceId);
        const payload = await myCardsList(deviceId, 80);
        if (!mounted) return;
        setClubMetrics(endpointMetrics || extractClubMetricsV1(payload));
        setTrainingSummary(extractHomeTrainingSummaryV1(payload));
        setGameWeekSummary(extractHomeGameWeekSummaryV1(payload));
      } catch {
        if (mounted) {
          setClubMetrics({ clubValue: null, squadCount: null, weeklyDelta: null });
          setTrainingSummary({ averageForm: null, inForm: null, neutral: null, declining: null, counted: 0 });
          setGameWeekSummary({
            label: "Données indisponibles",
            rarity: "—",
            eligibleCount: null,
            state: "indisponible",
            projectionLabel: "À générer",
          });
        }
      }
    }
    loadClubMetrics();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    async function loadDirectorReport() {
      try {
        setDirectorLoading(true);
        const deviceId = await readHomeDeviceIdV1();
        if (!deviceId || !mounted) return;
        const report = await fetchHomeDirectorReportV1(deviceId);
        if (mounted) setDirectorReport(report);
      } catch {
        if (mounted) setDirectorReport(null);
      } finally {
        if (mounted) setDirectorLoading(false);
      }
    }
    loadDirectorReport();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    async function loadBoardObjectives() {
      try {
        setBoardObjectivesLoading(true);
        const deviceId = await readHomeDeviceIdV1();
        if (!deviceId || !mounted) return;
        const payload = await fetchHomeBoardObjectivesV1(deviceId);
        if (mounted) setBoardObjectives(payload);
      } catch {
        if (mounted) setBoardObjectives(null);
      } finally {
        if (mounted) setBoardObjectivesLoading(false);
      }
    }
    loadBoardObjectives();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    async function loadMarketOpportunities() {
      try {
        setMarketOpportunitiesLoading(true);
        const opportunities = await fetchHomeMarketOpportunitiesV1();
        if (mounted) setMarketOpportunities(opportunities);
      } catch {
        if (mounted) setMarketOpportunities([]);
      } finally {
        if (mounted) setMarketOpportunitiesLoading(false);
      }
    }
    loadMarketOpportunities();
    return () => {
      mounted = false;
    };
  }, []);

  const clubStats = useMemo(
    () => [
      { label: "Valeur du club", value: clubMetrics.clubValueText || formatEuro(clubMetrics.clubValue) },
      { label: "Effectif", value: clubMetrics.squadCount === null ? "—" : `${clubMetrics.squadCount} joueurs` },
      { label: "Évolution du club", value: clubMetrics.evolutionText || "0 €" },
      { label: "Réputation", value: "À connecter" },
    ],
    [clubMetrics]
  );
  const gameWeekProgress = Math.min(100, Math.round((((gameWeekSummary.eligibleCount ?? 0) || 0) / 5) * 100));
  const boardProgress = Math.max(0, Math.min(100, Math.round(Number(boardObjectives?.progressPct ?? 0))));
  const morningAlerts = useMemo(() => buildHomeMorningAlertsV1(clubMetrics, directorReport, gameWeekSummary), [clubMetrics, directorReport, gameWeekSummary]);
  const clubNews = useMemo(() => buildHomeNewsV1(clubMetrics, directorReport, gameWeekSummary, marketOpportunities), [clubMetrics, directorReport, gameWeekSummary, marketOpportunities]);
  const seasonGoals = useMemo(() => buildHomeGoalsV1(clubMetrics, boardObjectives, gameWeekSummary), [clubMetrics, boardObjectives, gameWeekSummary]);
  const topMarketOpportunity = marketOpportunities[0] || null;

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <View>
            <Text style={styles.screenTitle}>Accueil</Text>
            <Text style={styles.subtitle}>Bureau du président</Text>
          </View>
          <View style={styles.bellWrap}>
            <Ionicons name="notifications-outline" size={24} color="#FFFFFF" />
            <View style={styles.bellBadge}>
              <Text style={styles.bellBadgeText}>3</Text>
            </View>
          </View>
        </View>

        <LinearGradient colors={["#4A060E", "#13070A", "#07070A"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <View style={styles.heroGlow} />
          <View style={styles.heroTop}>
            <View>
              <Text style={styles.clubName}>RC Darkflow FC</Text>
              <Text style={styles.president}>Président : Darkflow</Text>
            </View>
            <View style={styles.presidentBadge}>
              <Ionicons name="shield-checkmark" size={15} color="#FFFFFF" />
              <Text style={styles.presidentBadgeText}>Président</Text>
            </View>
          </View>
          <View style={styles.statsGrid}>
            {clubStats.map((stat) => (
              <StatPill
                key={stat.label}
                {...stat}
                onPress={
                  stat.label === "Valeur du club"
                    ? () => router.push("/club-value")
                    : stat.label === "Évolution du club"
                      ? () => router.push("/club-evolution")
                      : undefined
                }
              />
            ))}
          </View>
        </LinearGradient>

        <SectionCard style={styles.briefingCard}>
          <SectionTitle icon="sparkles" title="Réunion du matin" action="Directeur Sportif IA" />
          <Text style={styles.briefHello}>Bonjour Président !</Text>
          <Text style={styles.briefSubtitle}>Rapport de votre Directeur Sportif IA</Text>
          <View style={styles.alertStack}>
            {morningAlerts.length ? morningAlerts.map((item) => (
              <AlertLine key={item.text} item={item} />
            )) : <Text style={styles.muted}>Données du rapport indisponibles pour le moment.</Text>}
          </View>
        </SectionCard>

        <SectionCard style={styles.directorCard}>
          <SectionTitle icon="mic-outline" title="Directeur Sportif IA" action="Rapport quotidien" />
          <Text style={styles.directorHello}>Bonjour Président</Text>
          <View style={styles.directorGrid}>
            <View style={styles.directorMetric}>
              <Text style={styles.scoutLabel}>Valeur du club</Text>
              <Text style={styles.scoutValue}>{directorReport?.clubValueText || (directorLoading ? "Chargement..." : "Donnée indisponible")}</Text>
            </View>
            <View style={styles.directorMetric}>
              <Text style={styles.scoutLabel}>Variation</Text>
              <Text style={styles.scoutValueGreen}>{directorReport?.variationText || "Donnée indisponible"}</Text>
            </View>
            <View style={styles.directorMetric}>
              <Text style={styles.scoutLabel}>Couverture marché</Text>
              <Text style={styles.scoutValue}>{directorReport?.coveragePct === null || directorReport?.coveragePct === undefined ? "Donnée indisponible" : `${directorReport.coveragePct}%`}</Text>
            </View>
            <View style={styles.directorMetric}>
              <Text style={styles.scoutLabel}>Cartes valorisées</Text>
              <Text style={styles.scoutValue}>{directorReport ? `${directorReport.pricedCards ?? "—"} / ${directorReport.cardCount ?? "—"}` : "Donnée indisponible"}</Text>
            </View>
          </View>
          <View style={styles.directorLine}>
            <Text style={styles.scoutLabel}>Meilleure progression</Text>
            <Text style={styles.directorValue}>{directorReport?.bestPerformer?.playerName ? `${directorReport.bestPerformer.playerName}${directorReport.bestPerformer.valueText ? ` ${directorReport.bestPerformer.valueText}` : ""}` : "Donnée indisponible"}</Text>
          </View>
          <View style={styles.directorLine}>
            <Text style={styles.scoutLabel}>Carte à surveiller</Text>
            <Text style={styles.directorValue}>{directorReport?.watchPlayer?.playerName || "Donnée indisponible"}</Text>
          </View>
          <Text style={styles.directorSummary}>{directorReport?.summary || (directorLoading ? "Analyse du rapport en cours..." : "Donnée indisponible")}</Text>
        </SectionCard>

        <SectionCard style={styles.boardCard}>
          <SectionTitle icon="business" title="Conseil d'Administration" action="Objectifs" />
          <View style={styles.boardTopRow}>
            <View style={styles.boardMainMetric}>
              <Text style={styles.scoutLabel}>Objectif actuel</Text>
              <Text style={styles.bigMetric}>{boardObjectives?.targetValueText || (boardObjectivesLoading ? "Chargement..." : "—")}</Text>
            </View>
            <View style={styles.boardStatusPill}>
              <Text style={styles.boardStatusText}>{boardStatusLabelV1(boardObjectives?.status)}</Text>
            </View>
          </View>
          <View style={styles.boardProgressTrack}>
            <View style={[styles.boardProgressFill, { width: `${boardProgress}%` as any }]} />
          </View>
          <View style={styles.metricRow}>
            <View>
              <Text style={styles.scoutLabel}>Valeur du club</Text>
              <Text style={styles.scoutValue}>{boardObjectives?.clubValueText || "—"}</Text>
            </View>
            <View>
              <Text style={styles.scoutLabel}>Progression</Text>
              <Text style={styles.scoutValueGreen}>{boardObjectives?.progressPct === null || boardObjectives?.progressPct === undefined ? "—" : `${boardObjectives.progressPct}%`}</Text>
            </View>
            <View>
              <Text style={styles.scoutLabel}>Couverture marché</Text>
              <Text style={styles.scoutValue}>{boardObjectives?.coveragePct === null || boardObjectives?.coveragePct === undefined ? "—" : `${boardObjectives.coveragePct}%`}</Text>
            </View>
          </View>
          <Text style={styles.boardMessage}>
            {boardObjectives?.message || (boardObjectivesLoading ? "Lecture des objectifs du Conseil..." : "Donnée indisponible")}
          </Text>
        </SectionCard>

        <Pressable accessibilityRole="button" onPress={() => router.push("/club-finance")} style={({ pressed }) => [pressed && styles.pressed]}>
          <SectionCard style={styles.financeCard}>
            <SectionTitle icon="cash-outline" title="Centre Financier" action="Patrimoine" />
            <View style={styles.financeMainRow}>
              <View style={styles.financeIconBubble}>
                <Ionicons name="wallet-outline" size={24} color="#FFFFFF" />
              </View>
              <View style={styles.financeTextBlock}>
                <Text style={styles.bigMetric}>{clubMetrics.clubValueText || formatEuro(clubMetrics.clubValue)}</Text>
                <Text style={styles.muted}>Valeur du club suivie comme portefeuille d'investissement.</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.72)" />
            </View>
            <View style={styles.financeKpiRow}>
              <View>
                <Text style={styles.scoutLabel}>Couverture</Text>
                <Text style={styles.scoutValueGreen}>{clubMetrics.coveragePct === null || clubMetrics.coveragePct === undefined ? "—" : `${clubMetrics.coveragePct}%`}</Text>
              </View>
              <View>
                <Text style={styles.scoutLabel}>Cartes valorisées</Text>
                <Text style={styles.scoutValue}>{clubMetrics.pricedCards ?? "—"} / {clubMetrics.squadCount ?? "—"}</Text>
              </View>
              <View>
                <Text style={styles.scoutLabel}>ROI</Text>
                <Text style={styles.scoutValue}>À connecter</Text>
              </View>
            </View>
            <Text style={styles.financeReport}>Directeur Financier : valeur, couverture marché et historique disponibles. Achats, ventes et ROI restent à connecter.</Text>
          </SectionCard>
        </Pressable>

        <View style={styles.twoCols}>
          <SectionCard style={styles.flexCard}>
            <SectionTitle icon="calendar" title="Prochaine Game Week" />
            <Text style={styles.bigMetric}>{gameWeekSummary.label}</Text>
            <Text style={styles.muted}>{gameWeekSummary.rarity} · {gameWeekSummary.state}</Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${gameWeekProgress}%` as any }]} />
            </View>
            <View style={styles.metricRow}>
              <View>
                <Text style={styles.scoutLabel}>Cartes éligibles</Text>
                <Text style={styles.scoreText}>{gameWeekSummary.eligibleCount === null ? "—" : gameWeekSummary.eligibleCount}</Text>
              </View>
              <View>
                <Text style={styles.scoutLabel}>Projection IA</Text>
                <Text style={styles.confidenceText}>{gameWeekSummary.projectionLabel}</Text>
              </View>
            </View>
            <Pressable style={({ pressed }) => [styles.redButton, pressed && styles.pressed]} onPress={() => router.push("/(tabs)/play")}>
              <Text style={styles.redButtonText}>Préparer ma compo</Text>
              <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
            </Pressable>
          </SectionCard>

          <SectionCard style={styles.flexCard}>
            <SectionTitle icon="briefcase" title="Rapport du Directeur Sportif" />
            <Text style={styles.bigMetric}>{topMarketOpportunity?.playerName || "Donnée indisponible"}</Text>
            <Text style={styles.muted}>{topMarketOpportunity ? "Opportunité mercato fiable" : "Recrue recommandée à connecter"}</Text>
            <View style={styles.scoutLine}>
              <Text style={styles.scoutLabel}>Prix actuel</Text>
              <Text style={styles.scoutValue}>{topMarketOpportunity?.priceText || "Prix indisponible"}</Text>
            </View>
            <View style={styles.scoutLine}>
              <Text style={styles.scoutLabel}>Valeur estimée</Text>
              <Text style={styles.scoutValueGreen}>{topMarketOpportunity?.estimatedValueText || "Prix indisponible"}</Text>
            </View>
            <View style={styles.decisionRow}>
              <Text style={styles.buyBadge}>{topMarketOpportunity ? "Surveiller" : "À connecter"}</Text>
              <Pressable onPress={() => router.push("/(tabs)/market")} style={({ pressed }) => [styles.watchButton, pressed && styles.pressed]}>
                <Text style={styles.watchText}>Surveiller</Text>
              </Pressable>
            </View>
          </SectionCard>
        </View>

        <View style={styles.twoCols}>
          <SectionCard style={styles.flexCard}>
            <SectionTitle icon="newspaper" title="Actualités du club" />
            {clubNews.length ? clubNews.map((item) => (
              <View key={item} style={styles.newsLine}>
                <View style={styles.redDot} />
                <Text style={styles.newsText}>{item}</Text>
                <Ionicons name="chevron-forward" size={15} color="rgba(255,255,255,0.45)" />
              </View>
            )) : <Text style={styles.muted}>Aucune actualité fiable à afficher.</Text>}
          </SectionCard>

          <SectionCard style={styles.flexCard}>
            <SectionTitle icon="flag" title="Objectifs saison" />
            {seasonGoals.map((goal) => (
              <View key={goal.label} style={styles.goalLine}>
                <Ionicons name={goal.done ? "checkmark-circle" : "ellipse-outline"} size={18} color={goal.done ? "#2FE66B" : "rgba(255,255,255,0.38)"} />
                <Text style={styles.goalText}>{goal.label}</Text>
              </View>
            ))}
          </SectionCard>
        </View>

        <View style={styles.twoCols}>
          <SectionCard style={styles.flexCard}>
            <SectionTitle icon="trophy" title="Palmarès" />
            <View style={styles.trophyGrid}>
              <StatPill label="GW jouées" value="À connecter" />
              <StatPill label="Podiums" value="À connecter" />
              <StatPill label="Victoires" value="À connecter" />
              <StatPill label="Record" value="À connecter" />
            </View>
          </SectionCard>

          <SectionCard style={styles.flexCard}>
            <SectionTitle icon="barbell" title="Centre d'entraînement" />
            <View style={styles.trainingMain}>
              <Text style={styles.trainingScore}>{trainingSummary.averageForm === null ? "—" : `${trainingSummary.averageForm}%`}</Text>
              <Text style={styles.muted}>{trainingSummary.counted ? `Forme moyenne L5 (${trainingSummary.counted} joueurs)` : "Forme moyenne à connecter"}</Text>
            </View>
            <View style={styles.trainingRow}>
              <Text style={styles.good}>{trainingSummary.inForm === null ? "—" : trainingSummary.inForm} en forme</Text>
              <Text style={styles.neutral}>{trainingSummary.neutral === null ? "—" : trainingSummary.neutral} neutres</Text>
              <Text style={styles.bad}>{trainingSummary.declining === null ? "—" : trainingSummary.declining} en baisse</Text>
            </View>
          </SectionCard>
        </View>

        <SectionCard style={styles.marketOpportunityCard}>
          <SectionTitle icon="flame" title="Opportunités Mercato" action="Assistant IA" />
          {marketOpportunities.length > 0 ? (
            marketOpportunities.map((opportunity) => (
              <Pressable
                accessibilityRole="button"
                key={opportunity.playerSlug || opportunity.playerName || "market-opportunity"}
                onPress={() => {
                  if (opportunity.playerSlug) (router as any).push(`/recruter/player/${opportunity.playerSlug}`);
                }}
                style={({ pressed }) => [styles.marketOpportunityLine, pressed && styles.pressed]}
              >
                <View style={styles.marketOpportunityBadge}>
                  <Text style={styles.marketOpportunityPotential}>
                    {opportunity.potentialPct === null || opportunity.potentialPct === undefined ? "—" : `+${Math.round(opportunity.potentialPct)}%`}
                  </Text>
                </View>
                <View style={styles.marketOpportunityTextBlock}>
                  <Text style={styles.marketOpportunityName}>{opportunity.playerName || "Donnée indisponible"}</Text>
                  <Text style={styles.marketOpportunityMeta}>
                    Prix {opportunity.priceText || "Prix indisponible"} · Valeur {opportunity.estimatedValueText || "Prix indisponible"}
                  </Text>
                  <Text style={styles.marketOpportunityReason}>{opportunity.reason || "Donnée insuffisante"}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.72)" />
              </Pressable>
            ))
          ) : (
            <View style={styles.marketOpportunityEmpty}>
              <Text style={styles.marketOpportunityEmptyTitle}>
                {marketOpportunitiesLoading ? "Analyse du marché en cours..." : "Aucune opportunité fiable aujourd'hui"}
              </Text>
              <Text style={styles.marketOpportunityEmptyText}>Xiascor n'affiche que les joueurs avec prix et performances réelles.</Text>
            </View>
          )}
        </SectionCard>

        <SectionCard>
          <SectionTitle icon="diamond" title="Pépites détectées" action="Marché" />
          {marketOpportunities.length ? marketOpportunities.slice(0, 3).map((gem) => (
            <View key={gem.playerSlug || gem.playerName || "gem"} style={styles.gemLine}>
              <View style={styles.gemAvatar}>
                <Text style={styles.gemInitial}>{(gem.playerName || "?").charAt(0)}</Text>
              </View>
              <View style={styles.gemTextBlock}>
                <Text style={styles.gemName}>{gem.playerName || "Donnée indisponible"}</Text>
                <Text style={styles.gemMeta}>
                  Potentiel {gem.potentialPct === null || gem.potentialPct === undefined ? "—" : `+${Math.round(gem.potentialPct)}%`} · {gem.priceText || "Prix indisponible"}
                </Text>
              </View>
              <Ionicons name="analytics" size={20} color="#FF3148" />
            </View>
          )) : <Text style={styles.muted}>Aucune pépite fiable à afficher.</Text>}
        </SectionCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#030406",
  },
  content: {
    gap: 16,
    paddingBottom: 128,
    paddingHorizontal: 18,
    paddingTop: 8,
  },
  topBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  screenTitle: {
    color: "#FFFFFF",
    fontSize: 38,
    fontWeight: "900",
    letterSpacing: 0,
  },
  subtitle: {
    color: "rgba(255,255,255,0.68)",
    fontSize: 16,
    fontWeight: "700",
    marginTop: 2,
  },
  bellWrap: {
    alignItems: "center",
    height: 46,
    justifyContent: "center",
    width: 46,
  },
  bellBadge: {
    alignItems: "center",
    backgroundColor: "#FF213B",
    borderColor: "#FFFFFF",
    borderRadius: 10,
    borderWidth: 1,
    height: 20,
    justifyContent: "center",
    position: "absolute",
    right: 2,
    top: 2,
    width: 20,
  },
  bellBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "900",
  },
  hero: {
    borderColor: "rgba(255,49,72,0.55)",
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
    padding: 18,
  },
  heroGlow: {
    backgroundColor: "rgba(255,49,72,0.18)",
    borderRadius: 90,
    height: 140,
    position: "absolute",
    right: -36,
    top: -38,
    width: 140,
  },
  heroTop: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  clubName: {
    color: "#FFFFFF",
    fontSize: 27,
    fontWeight: "900",
  },
  president: {
    color: "rgba(255,255,255,0.70)",
    fontSize: 14,
    fontWeight: "800",
    marginTop: 4,
  },
  presidentBadge: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,49,72,0.20)",
    borderColor: "rgba(255,49,72,0.65)",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  presidentBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 18,
  },
  statPill: {
    backgroundColor: "rgba(255,255,255,0.055)",
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: 14,
    borderWidth: 1,
    flexGrow: 1,
    minWidth: 132,
    padding: 12,
  },
  statValue: {
    color: "#FFFFFF",
    fontSize: 19,
    fontWeight: "900",
  },
  statLabel: {
    color: "rgba(255,255,255,0.58)",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 3,
  },
  card: {
    backgroundColor: "rgba(9,11,15,0.94)",
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    shadowColor: "#FF3148",
    shadowOpacity: 0.16,
    shadowRadius: 16,
  },
  briefingCard: {
    borderColor: "rgba(255,49,72,0.45)",
  },
  directorCard: {
    borderColor: "rgba(255,49,72,0.42)",
  },
  directorHello: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
  },
  directorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 14,
  },
  directorMetric: {
    backgroundColor: "rgba(255,255,255,0.055)",
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: 14,
    borderWidth: 1,
    flexGrow: 1,
    minWidth: 145,
    padding: 12,
  },
  directorLine: {
    alignItems: "center",
    borderTopColor: "rgba(255,255,255,0.08)",
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    marginTop: 12,
    paddingTop: 12,
  },
  directorValue: {
    color: "#FFFFFF",
    flex: 1,
    fontSize: 14,
    fontWeight: "900",
    textAlign: "right",
  },
  directorSummary: {
    color: "rgba(255,255,255,0.74)",
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 20,
    marginTop: 14,
  },
  boardCard: {
    borderColor: "rgba(255,49,72,0.36)",
  },
  boardTopRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    marginTop: 6,
  },
  boardMainMetric: {
    flex: 1,
  },
  boardStatusPill: {
    backgroundColor: "rgba(255,49,72,0.16)",
    borderColor: "rgba(255,49,72,0.42)",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  boardStatusText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
  },
  boardProgressTrack: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 999,
    height: 10,
    marginTop: 14,
    overflow: "hidden",
  },
  boardProgressFill: {
    backgroundColor: "#FF3148",
    borderRadius: 999,
    height: "100%",
  },
  boardMessage: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
    marginTop: 12,
  },
  financeCard: {
    borderColor: "rgba(255,49,72,0.38)",
  },
  financeMainRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  financeIconBubble: {
    alignItems: "center",
    backgroundColor: "rgba(255,49,72,0.20)",
    borderColor: "rgba(255,49,72,0.55)",
    borderRadius: 18,
    borderWidth: 1,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  financeTextBlock: {
    flex: 1,
  },
  financeKpiRow: {
    alignItems: "center",
    borderTopColor: "rgba(255,255,255,0.08)",
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14,
    paddingTop: 13,
    gap: 12,
  },
  financeReport: {
    color: "rgba(255,255,255,0.66)",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
    marginTop: 12,
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 9,
    flex: 1,
  },
  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },
  sectionAction: {
    color: "#FF3148",
    fontSize: 12,
    fontWeight: "900",
  },
  briefHello: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "900",
  },
  briefSubtitle: {
    color: "rgba(255,255,255,0.62)",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 2,
  },
  alertStack: {
    gap: 11,
    marginTop: 16,
  },
  alertLine: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  alertText: {
    color: "rgba(255,255,255,0.84)",
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 19,
  },
  twoCols: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
  },
  flexCard: {
    flex: 1,
    minWidth: 260,
  },
  bigMetric: {
    color: "#FFFFFF",
    fontSize: 21,
    fontWeight: "900",
  },
  muted: {
    color: "rgba(255,255,255,0.58)",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 4,
  },
  progressTrack: {
    backgroundColor: "rgba(255,255,255,0.09)",
    borderRadius: 99,
    height: 8,
    marginTop: 14,
    overflow: "hidden",
  },
  progressFill: {
    backgroundColor: "#FF3148",
    borderRadius: 99,
    height: "100%",
  },
  metricRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
  scoreText: {
    color: "#2FE66B",
    fontSize: 24,
    fontWeight: "900",
  },
  confidenceText: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
  },
  redButton: {
    alignItems: "center",
    backgroundColor: "#D9152C",
    borderRadius: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  redButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },
  scoutLine: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  scoutLabel: {
    color: "rgba(255,255,255,0.60)",
    fontSize: 13,
    fontWeight: "800",
  },
  scoutValue: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },
  scoutValueGreen: {
    color: "#2FE66B",
    fontSize: 14,
    fontWeight: "900",
  },
  decisionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  buyBadge: {
    backgroundColor: "rgba(47,230,107,0.16)",
    borderColor: "rgba(47,230,107,0.40)",
    borderRadius: 999,
    borderWidth: 1,
    color: "#2FE66B",
    flex: 1,
    fontSize: 13,
    fontWeight: "900",
    overflow: "hidden",
    paddingVertical: 9,
    textAlign: "center",
  },
  watchButton: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 999,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 9,
  },
  watchText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
    textAlign: "center",
  },
  newsLine: {
    alignItems: "center",
    borderBottomColor: "rgba(255,255,255,0.07)",
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 10,
    paddingVertical: 10,
  },
  redDot: {
    backgroundColor: "#FF3148",
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  newsText: {
    color: "rgba(255,255,255,0.84)",
    flex: 1,
    fontSize: 14,
    fontWeight: "800",
  },
  goalLine: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    paddingVertical: 8,
  },
  goalText: {
    color: "rgba(255,255,255,0.84)",
    flex: 1,
    fontSize: 14,
    fontWeight: "800",
  },
  trophyGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  trainingMain: {
    alignItems: "center",
    marginTop: 2,
  },
  trainingScore: {
    color: "#FFFFFF",
    fontSize: 42,
    fontWeight: "900",
  },
  trainingRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
    marginTop: 16,
  },
  good: {
    color: "#2FE66B",
    fontSize: 12,
    fontWeight: "900",
  },
  neutral: {
    color: "rgba(255,255,255,0.64)",
    fontSize: 12,
    fontWeight: "900",
  },
  bad: {
    color: "#FFB020",
    fontSize: 12,
    fontWeight: "900",
  },
  marketOpportunityCard: {
    borderColor: "rgba(255,49,72,0.34)",
  },
  marketOpportunityLine: {
    alignItems: "center",
    backgroundColor: "rgba(255,49,72,0.055)",
    borderColor: "rgba(255,49,72,0.18)",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    marginTop: 10,
    padding: 11,
  },
  marketOpportunityBadge: {
    alignItems: "center",
    backgroundColor: "rgba(47,230,107,0.14)",
    borderColor: "rgba(47,230,107,0.42)",
    borderRadius: 12,
    borderWidth: 1,
    height: 46,
    justifyContent: "center",
    width: 58,
  },
  marketOpportunityPotential: {
    color: "#2FE66B",
    fontSize: 15,
    fontWeight: "900",
  },
  marketOpportunityTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  marketOpportunityName: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },
  marketOpportunityMeta: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 4,
  },
  marketOpportunityReason: {
    color: "#FFB8C0",
    fontSize: 11,
    fontWeight: "800",
    marginTop: 3,
  },
  marketOpportunityEmpty: {
    backgroundColor: "rgba(255,255,255,0.035)",
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 10,
    padding: 12,
  },
  marketOpportunityEmptyTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },
  marketOpportunityEmptyText: {
    color: "rgba(255,255,255,0.58)",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4,
  },
  gemLine: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.035)",
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    marginTop: 10,
    padding: 10,
  },
  gemAvatar: {
    alignItems: "center",
    backgroundColor: "rgba(255,49,72,0.18)",
    borderColor: "rgba(255,49,72,0.45)",
    borderRadius: 12,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  gemInitial: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
  },
  gemTextBlock: {
    flex: 1,
  },
  gemName: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },
  gemMeta: {
    color: "rgba(255,255,255,0.58)",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 3,
  },
  pressed: {
    opacity: 0.78,
  },
});
