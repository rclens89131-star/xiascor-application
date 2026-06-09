/* XS_HOME_CLUB_EVOLUTION_HISTORY_V1 */
/* XS_GAMEWEEK_REWARDS_ACCOUNTING_V1 */
/* XS_HOME_AUDIT_FIX_V1 */
/* XS_CLUB_EVOLUTION_DATE_AXIS_V1 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { apiFetch } from "../src/api";

const DEVICE_ID_KEY = "XS_DEVICE_ID_V1";
const JWT_DEVICE_ID_KEY = "XS_JWT_DEVICE_ID_V1";
const OAUTH_DEVICE_ID_KEY = "xs_device_id";
const CLUB_VALUE_HISTORY_KEY = "club_value_history";
const XS_HOME_AUDIT_FIX_CLOUD_BASE_V1 = "https://xiascor-backend-tssdy62zqa-ez.a.run.app";

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

type ClubRewardHistoryItem = {
  id?: string | null;
  gameWeekLabel?: string | null;
  competition?: string | null;
  division?: string | null;
  rewardType?: string | null;
  rewardTotalText?: string | null;
  rewardCashText?: string | null;
  rewardEthText?: string | null;
  rewardCardPlayerName?: string | null;
  rewardCardValueText?: string | null;
  createdAt?: string | null;
};

function normalizeBackendHistoryItemV1(item: any): ClubValueHistorySnapshot {
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

async function readDeviceIdV1(): Promise<string | null> {
  const oauthId = (await AsyncStorage.getItem(OAUTH_DEVICE_ID_KEY)) || "";
  if (oauthId.trim()) return oauthId.trim();
  const jwtId = (await AsyncStorage.getItem(JWT_DEVICE_ID_KEY)) || "";
  if (jwtId.trim()) return jwtId.trim();
  const existing = (await AsyncStorage.getItem(DEVICE_ID_KEY)) || "";
  return existing.trim() || null;
}

function metricNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(String(value).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function formatEuro(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "—";
  return `${Math.round(value).toLocaleString("fr-FR")} €`;
}

function formatSignedEuro(value: number): string {
  const rounded = Math.round(value);
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded.toLocaleString("fr-FR")} €`;
}

function formatSnapshotDate(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "—";
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
}

function xsClubEvolutionSnapshotDateV1(item: ClubValueHistorySnapshot): Date | null {
  const date = new Date(item.createdAt);
  return Number.isFinite(date.getTime()) ? date : null;
}

function xsClubEvolutionHasRepeatedDayV1(history: ClubValueHistorySnapshot[]): boolean {
  const counts = new Map<string, number>();
  history.forEach((item) => {
    const date = xsClubEvolutionSnapshotDateV1(item);
    if (!date) return;
    const key = date.toISOString().slice(0, 10);
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  return Array.from(counts.values()).some((count) => count > 1);
}

function xsClubEvolutionDateLabelV1(item: ClubValueHistorySnapshot, includeTime: boolean): string {
  const date = xsClubEvolutionSnapshotDateV1(item);
  if (!date) return "—";
  const datePart = date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
  if (!includeTime) return datePart;
  const timePart = date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  return `${datePart} ${timePart}`;
}

function xsClubEvolutionSecondaryLabelV1(item: ClubValueHistorySnapshot): string | null {
  if (!item.label || /^session\s+\d+$/i.test(item.label)) return null;
  return item.label;
}

function xsClubEvolutionAxisLabelIndexesV1(length: number): Set<number> {
  if (length <= 4) return new Set(Array.from({ length }, (_, index) => index));
  return new Set([0, Math.floor((length - 1) / 2), length - 1]);
}

async function xsEvolutionAuditFetchJsonV1<T>(path: string, options: RequestInit = {}): Promise<T> {
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

async function xsEvolutionAuditClubFetchV1<T>(
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
    const cloud = await xsEvolutionAuditFetchJsonV1<T>(path, options);
    if (isUsable(cloud)) return cloud;
  } catch {}
  if (primary !== null) return primary as T;
  throw new Error("club_endpoint_unavailable");
}

function xsEvolutionHistoryPayloadUsableV1(payload: any): boolean {
  return payload && payload.ok !== false && Array.isArray(payload.items) && payload.items.length > 1;
}

async function readHistoryV1(): Promise<ClubValueHistorySnapshot[]> {
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

async function upsertCurrentSnapshotV1(): Promise<ClubValueHistorySnapshot[]> {
  const deviceId = await readDeviceIdV1();
  const qs = new URLSearchParams();
  if (deviceId) qs.set("deviceId", deviceId);
  const payload = await xsEvolutionAuditClubFetchV1<any>(
    `/club/value-detail${qs.toString() ? `?${qs.toString()}` : ""}`,
    {},
    (value) => value && value.ok !== false && metricNumber(value.clubValueEur) !== null
  );
  const value = metricNumber(payload?.clubValueEur);
  const current = await readHistoryV1();
  if (value === null) return current;
  const today = new Date();
  const dayKey = today.toISOString().slice(0, 10);
  const last = current[current.length - 1];
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
  await AsyncStorage.setItem(CLUB_VALUE_HISTORY_KEY, JSON.stringify(trimmed));
  return trimmed;
}

async function readBackendHistoryV1(deviceId: string | null): Promise<ClubValueHistorySnapshot[]> {
  const qs = new URLSearchParams();
  if (deviceId) qs.set("deviceId", deviceId);
  const payload = await xsEvolutionAuditClubFetchV1<any>(
    `/club/value-history${qs.toString() ? `?${qs.toString()}` : ""}`,
    {},
    xsEvolutionHistoryPayloadUsableV1
  );
  const items = Array.isArray(payload?.items) ? payload.items : [];
  return items
    .map(normalizeBackendHistoryItemV1)
    .filter((item) => item.createdAt && Number.isFinite(item.clubValueEur));
}

async function createBackendSnapshotV1(deviceId: string | null): Promise<void> {
  const qs = new URLSearchParams();
  if (deviceId) qs.set("deviceId", deviceId);
  await xsEvolutionAuditClubFetchV1<any>(`/club/value-history/snapshot${qs.toString() ? `?${qs.toString()}` : ""}`, { method: "POST" });
}

async function readRewardEventsV1(deviceId: string | null): Promise<ClubRewardHistoryItem[]> {
  const qs = new URLSearchParams();
  if (deviceId) qs.set("deviceId", deviceId);
  const payload = await xsEvolutionAuditClubFetchV1<any>(`/club/rewards-history${qs.toString() ? `?${qs.toString()}` : ""}`);
  const items = Array.isArray(payload?.items) ? payload.items : [];
  return items.map((item: any) => ({
    id: item?.id ? String(item.id) : null,
    gameWeekLabel: item?.gameWeekLabel ? String(item.gameWeekLabel) : null,
    competition: item?.competition ? String(item.competition) : null,
    division: item?.division ? String(item.division) : null,
    rewardType: item?.rewardType ? String(item.rewardType) : null,
    rewardTotalText: item?.rewardTotalText ? String(item.rewardTotalText) : null,
    rewardCashText: item?.rewardCashText ? String(item.rewardCashText) : null,
    rewardEthText: item?.rewardEthText ? String(item.rewardEthText) : null,
    rewardCardPlayerName: item?.rewardCardPlayerName ? String(item.rewardCardPlayerName) : null,
    rewardCardValueText: item?.rewardCardValueText ? String(item.rewardCardValueText) : null,
    createdAt: item?.createdAt ? String(item.createdAt) : null,
  }));
}

function ChartLine({ history }: { history: ClubValueHistorySnapshot[] }) {
  const [selectedIndex, setSelectedIndex] = useState(Math.max(0, history.length - 1));
  const includeTime = xsClubEvolutionHasRepeatedDayV1(history);
  const labelIndexes = xsClubEvolutionAxisLabelIndexesV1(history.length);
  const values = history.map((item) => item.clubValueEur);
  const min = Math.min(...values);
  const max = Math.max(...values, 1);
  const range = Math.max(1, max - min);
  const plotWidth = 300;
  const plotHeight = 168;
  const pad = 18;
  const step = history.length > 1 ? (plotWidth - pad * 2) / (history.length - 1) : 0;
  const points = history.map((item, index) => ({
    item,
    x: pad + step * index,
    y: pad + (1 - ((item.clubValueEur - min) / range)) * (plotHeight - pad * 2),
  }));
  const selected = points[selectedIndex] || points[points.length - 1] || null;
  return (
    <View style={styles.chart}>
      <View style={styles.chartGrid} />
      <View style={styles.lineHeader}>
        <View>
          <Text style={styles.chartValueLarge}>{selected ? (selected.item.clubValueText || formatEuro(selected.item.clubValueEur)) : "—"}</Text>
          <Text style={styles.chartLabel}>{selected ? xsClubEvolutionDateLabelV1(selected.item, true) : "—"}</Text>
        </View>
        <Text style={styles.cardAction}>Valeur du club</Text>
      </View>
      <View style={[styles.linePlot, { width: plotWidth, height: plotHeight }]}>
        {points.slice(1).map((point, index) => {
          const previous = points[index];
          const dx = point.x - previous.x;
          const dy = point.y - previous.y;
          const length = Math.sqrt(dx * dx + dy * dy);
          const angle = `${Math.atan2(dy, dx)}rad`;
          return (
            <LinearGradient
              key={`segment-${point.item.id}-${index}`}
              colors={["#FF3148", "#FF6A3D"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[
                styles.lineSegment,
                {
                  left: previous.x,
                  top: previous.y,
                  width: length,
                  transform: [{ rotate: angle }],
                },
              ]}
            />
          );
        })}
        {points.map((point, index) => (
          <Pressable
            key={`point-${point.item.id}-${index}`}
            accessibilityRole="button"
            onPress={() => setSelectedIndex(index)}
            style={[
              styles.linePoint,
              index === selectedIndex && styles.linePointSelected,
              { left: point.x - 6, top: point.y - 6 },
            ]}
          />
        ))}
      </View>
      <View style={styles.lineLabels}>
        {history.map((item, index) => {
          const shouldShow = labelIndexes.has(index);
          return (
            <Text key={`label-${item.id}-${index}`} style={styles.chartLabel} numberOfLines={1}>
              {shouldShow ? xsClubEvolutionDateLabelV1(item, includeTime) : ""}
            </Text>
          );
        })}
      </View>
    </View>
  );
}

function formatSlugLabel(value?: string | null): string {
  if (!value) return "—";
  return value
    .split("-")
    .filter(Boolean)
    .slice(0, 3)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function rewardEventTitleV1(item: ClubRewardHistoryItem): string {
  return item.gameWeekLabel || item.competition || item.rewardType || "Game Week";
}

function rewardEventValueV1(item: ClubRewardHistoryItem): string {
  if (item.rewardTotalText && item.rewardTotalText !== "À connecter") return item.rewardTotalText;
  if (item.rewardCardPlayerName) return `Carte gagnée : ${item.rewardCardPlayerName}`;
  if (item.rewardCashText && item.rewardCashText !== "À connecter") return item.rewardCashText;
  if (item.rewardEthText && item.rewardEthText !== "À connecter") return item.rewardEthText;
  return "À connecter";
}

export default function ClubEvolutionScreen() {
  const [history, setHistory] = useState<ClubValueHistorySnapshot[]>([]);
  const [rewardEvents, setRewardEvents] = useState<ClubRewardHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const deviceId = await readDeviceIdV1();
      const rewards = await readRewardEventsV1(deviceId).catch(() => []);
      let next = await readBackendHistoryV1(deviceId);
      if (!next.length) {
        await createBackendSnapshotV1(deviceId);
        next = await readBackendHistoryV1(deviceId);
      }
      setRewardEvents(rewards);
      setHistory(next.length ? next : await upsertCurrentSnapshotV1());
    } catch {
      setRewardEvents([]);
      setHistory(await readHistoryV1());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const summary = useMemo(() => {
    const first = history[0] || null;
    const last = history[history.length - 1] || null;
    const variation = first && last ? last.clubValueEur - first.clubValueEur : 0;
    const coverage = last?.cardCount ? Math.round(((last.pricedCards || 0) / last.cardCount) * 100) : null;
    const remainingCards = last?.cardCount !== null && last?.cardCount !== undefined
      ? Math.max(0, last.cardCount - (last.pricedCards || 0))
      : null;
    return { first, last, variation, coverage, remainingCards };
  }, [history]);

  const financeReport = useMemo(() => {
    const variationText = formatSignedEuro(summary.variation);
    const priced = summary.last?.pricedCards ?? 0;
    const coverageText = summary.coverage === null ? "indisponible" : `${summary.coverage}%`;
    const remainingText = summary.remainingCards === null ? "Les cartes restantes sont à analyser." : `${summary.remainingCards} carte(s) restent à analyser.`;
    return `La valeur du club a progressé de ${variationText} depuis le premier snapshot. ${priced} carte(s) sont valorisées. La couverture marché atteint ${coverageText}. ${remainingText}`;
  }, [summary]);

  const topMovers = useMemo(() => {
    const best = summary.last?.bestCardSlug && summary.last.bestCardGainEur !== null && summary.last.bestCardGainEur !== undefined
      ? [{ slug: summary.last.bestCardSlug, gain: summary.last.bestCardGainEur }]
      : [];
    const worst = summary.last?.worstCardSlug && summary.last.worstCardGainEur !== null && summary.last.worstCardGainEur !== undefined
      ? [{ slug: summary.last.worstCardSlug, gain: summary.last.worstCardGainEur }]
      : [];
    return { best, worst };
  }, [summary.last]);

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.screen}>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" onPress={() => router.back()} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
            <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
          </Pressable>
          <View style={styles.headerText}>
            <Text style={styles.title}>Évolution du club</Text>
            <Text style={styles.subtitle}>Historique de la valeur du portefeuille Xiascor</Text>
          </View>
        </View>

        <LinearGradient colors={["#4A060E", "#16070B", "#08080B"]} style={styles.hero}>
          <Text style={styles.heroLabel}>Valeur actuelle</Text>
          <Text style={styles.heroValue}>{summary.last?.clubValueText || formatEuro(summary.last?.clubValueEur ?? null)}</Text>
          <Text style={[styles.heroDelta, summary.variation >= 0 ? styles.positive : styles.negative]}>
            {formatSignedEuro(summary.variation)} depuis le premier snapshot
          </Text>
        </LinearGradient>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Évolution de la valeur</Text>
            <Text style={styles.cardAction}>Historique par date</Text>
          </View>
          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color="#FF3148" />
              <Text style={styles.muted}>Chargement de l'historique...</Text>
            </View>
          ) : history.length > 1 ? (
            <ChartLine history={history} />
          ) : history.length === 1 ? (
            <View style={styles.loadingBox}>
              <Ionicons name="trending-up" size={28} color="#FF3148" />
              <Text style={styles.mutedCenter}>L'historique commence aujourd'hui. La courbe apparaîtra après plusieurs snapshots.</Text>
            </View>
          ) : (
            <View style={styles.loadingBox}>
              <Text style={styles.muted}>Aucun historique disponible</Text>
            </View>
          )}
        </View>

        <View style={styles.summaryGrid}>
          <View style={styles.kpi}><Text style={styles.kpiValue}>{summary.last?.clubValueText || "—"}</Text><Text style={styles.kpiLabel}>Valeur actuelle</Text></View>
          <View style={styles.kpi}><Text style={[styles.kpiValue, summary.variation >= 0 ? styles.positive : styles.negative]}>{formatSignedEuro(summary.variation)}</Text><Text style={styles.kpiLabel}>Variation totale</Text></View>
          <View style={styles.kpi}><Text style={styles.kpiValue}>{summary.last?.estimatedProfitPct === null || summary.last?.estimatedProfitPct === undefined ? "À connecter" : `${Math.round(summary.last.estimatedProfitPct)}%`}</Text><Text style={styles.kpiLabel}>ROI</Text></View>
          <View style={styles.kpi}><Text style={styles.kpiValue}>{summary.coverage === null ? "—" : `${summary.coverage}%`}</Text><Text style={styles.kpiLabel}>Couverture marché</Text></View>
          <View style={styles.kpi}><Text style={styles.kpiValue}>{summary.last?.pricedCards ?? "—"} / {summary.last?.cardCount ?? "—"}</Text><Text style={styles.kpiLabel}>Cartes valorisées</Text></View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Rapport du Directeur Financier</Text>
            <Ionicons name="analytics" size={18} color="#FF3148" />
          </View>
          <Text style={styles.reportText}>{financeReport}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Historique</Text>
          {history.map((item, index) => {
            const previous = index > 0 ? history[index - 1].clubValueEur : item.clubValueEur;
            const diff = item.clubValueEur - previous;
            const secondaryLabel = xsClubEvolutionSecondaryLabelV1(item);
            return (
              <View key={`${item.id}-row-${index}`} style={styles.historyRow}>
                <View>
                  <Text style={styles.historyLabel}>{xsClubEvolutionDateLabelV1(item, true)}</Text>
                  {secondaryLabel ? <Text style={styles.muted}>{secondaryLabel}</Text> : null}
                </View>
                <View style={styles.historyRight}>
                  <Text style={styles.historyValue}>{item.clubValueText || formatEuro(item.clubValueEur)}</Text>
                  {index > 0 ? <Text style={diff >= 0 ? styles.positive : styles.negative}>{formatSignedEuro(diff)}</Text> : null}
                </View>
              </View>
            );
          })}
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Événements financiers</Text>
            <Ionicons name="trophy" size={18} color="#FF3148" />
          </View>
          {rewardEvents.length ? (
            rewardEvents.slice(0, 8).map((item, index) => (
              <View key={`${item.id || item.gameWeekLabel || "reward"}-${index}`} style={styles.historyRow}>
                <View>
                  <Text style={styles.historyLabel}>{rewardEventTitleV1(item)}</Text>
                  <Text style={styles.muted}>{item.competition || item.division || item.rewardType || formatSnapshotDate(item.createdAt || "")}</Text>
                </View>
                <Text style={styles.historyValue}>{rewardEventValueV1(item)}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.muted}>Aucun événement financier connecté.</Text>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Top progressions</Text>
          {topMovers.best.length ? (
            topMovers.best.map((item) => (
              <View key={`best-${item.slug}`} style={styles.historyRow}>
                <Text style={styles.historyLabel}>{formatSlugLabel(item.slug)}</Text>
                <Text style={styles.positive}>{formatSignedEuro(item.gain)}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.muted}>Top hausses à connecter</Text>
          )}
          <View style={styles.separator} />
          <Text style={styles.cardSubTitle}>Top baisses</Text>
          {topMovers.worst.length ? (
            topMovers.worst.map((item) => (
              <View key={`worst-${item.slug}`} style={styles.historyRow}>
                <Text style={styles.historyLabel}>{formatSlugLabel(item.slug)}</Text>
                <Text style={styles.negative}>{formatSignedEuro(item.gain)}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.muted}>Top baisses à connecter</Text>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Performance nette</Text>
          <View style={styles.historyRow}><Text style={styles.muted}>Dépenses</Text><Text style={styles.historyValue}>{summary.last?.totalInvestedEur === null || summary.last?.totalInvestedEur === undefined ? "À connecter" : formatEuro(summary.last.totalInvestedEur)}</Text></View>
          <View style={styles.historyRow}><Text style={styles.muted}>Reventes</Text><Text style={styles.historyValue}>{summary.last?.totalSoldEur === null || summary.last?.totalSoldEur === undefined ? "À connecter" : formatEuro(summary.last.totalSoldEur)}</Text></View>
          <View style={styles.historyRow}><Text style={styles.muted}>Profit net</Text><Text style={styles.historyValue}>{summary.last?.estimatedProfitEur === null || summary.last?.estimatedProfitEur === undefined ? "À connecter" : formatSignedEuro(summary.last.estimatedProfitEur)}</Text></View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#050507" },
  content: { padding: 18, paddingBottom: 34, gap: 16 },
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  backButton: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" },
  headerText: { flex: 1 },
  title: { color: "#FFFFFF", fontSize: 32, fontWeight: "900" },
  subtitle: { color: "rgba(255,255,255,0.68)", fontSize: 14, marginTop: 3 },
  hero: { borderRadius: 20, borderWidth: 1, borderColor: "rgba(255,49,72,0.55)", padding: 18, gap: 6 },
  heroLabel: { color: "rgba(255,255,255,0.64)", fontSize: 13, fontWeight: "800", textTransform: "uppercase" },
  heroValue: { color: "#FFFFFF", fontSize: 44, fontWeight: "900" },
  heroDelta: { fontSize: 16, fontWeight: "900" },
  card: { borderRadius: 18, padding: 14, gap: 14, backgroundColor: "rgba(13,14,18,0.96)", borderWidth: 1, borderColor: "rgba(255,49,72,0.26)" },
  cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  cardTitle: { color: "#FFFFFF", fontSize: 18, fontWeight: "900" },
  cardSubTitle: { color: "rgba(255,255,255,0.72)", fontSize: 13, fontWeight: "900", textTransform: "uppercase" },
  cardAction: { color: "rgba(255,255,255,0.45)", fontSize: 11, fontWeight: "800" },
  reportText: { color: "rgba(255,255,255,0.78)", fontSize: 14, fontWeight: "700", lineHeight: 21 },
  chart: { minHeight: 230, borderRadius: 14, overflow: "hidden", backgroundColor: "rgba(0,0,0,0.30)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  chartGrid: { ...StyleSheet.absoluteFillObject, borderTopWidth: 1, borderBottomWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  lineHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12, padding: 12, paddingBottom: 2 },
  chartValueLarge: { color: "#FFFFFF", fontSize: 24, fontWeight: "900" },
  linePlot: { alignSelf: "center", marginTop: 4, position: "relative" },
  lineSegment: { height: 4, borderRadius: 999, position: "absolute" },
  linePoint: { width: 12, height: 12, borderRadius: 6, position: "absolute", backgroundColor: "#FF3148", borderWidth: 2, borderColor: "#140407" },
  linePointSelected: { backgroundColor: "#FFFFFF", borderColor: "#FF3148", transform: [{ scale: 1.2 }] },
  lineLabels: { flexDirection: "row", justifyContent: "space-between", gap: 6, paddingHorizontal: 12, paddingBottom: 12 },
  chartRows: { flex: 1, flexDirection: "row", alignItems: "flex-end", gap: 8, padding: 12 },
  chartColumn: { flex: 1, alignItems: "center", gap: 6, minWidth: 54 },
  chartValue: { color: "rgba(255,255,255,0.72)", fontSize: 10, fontWeight: "800" },
  barTrack: { height: 140, width: "100%", justifyContent: "flex-end", alignItems: "center" },
  bar: { width: "72%", borderRadius: 8 },
  chartLabel: { color: "rgba(255,255,255,0.52)", fontSize: 10, fontWeight: "800" },
  loadingBox: { minHeight: 160, alignItems: "center", justifyContent: "center", gap: 10 },
  muted: { color: "rgba(255,255,255,0.58)", fontSize: 13, fontWeight: "700" },
  mutedCenter: { color: "rgba(255,255,255,0.62)", fontSize: 13, fontWeight: "800", textAlign: "center", lineHeight: 20, maxWidth: 280 },
  summaryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  kpi: { width: "48%", borderRadius: 14, padding: 12, backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: "rgba(255,255,255,0.09)" },
  kpiValue: { color: "#FFFFFF", fontSize: 20, fontWeight: "900" },
  kpiLabel: { color: "rgba(255,255,255,0.56)", fontSize: 12, fontWeight: "700", marginTop: 4 },
  historyRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, paddingVertical: 8, borderBottomWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  historyLabel: { color: "#FFFFFF", fontSize: 15, fontWeight: "900" },
  historyRight: { alignItems: "flex-end" },
  historyValue: { color: "#FFFFFF", fontSize: 15, fontWeight: "900" },
  separator: { height: 1, backgroundColor: "rgba(255,255,255,0.06)", marginVertical: 2 },
  positive: { color: "#2FE66B" },
  negative: { color: "#FF4D61" },
  pressed: { opacity: 0.72, transform: [{ scale: 0.99 }] },
});
