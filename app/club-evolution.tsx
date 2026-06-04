/* XS_HOME_CLUB_EVOLUTION_HISTORY_V1 */
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

type ClubValueHistorySnapshot = {
  id: string;
  label: string;
  createdAt: string;
  clubValueEur: number;
  clubValueText: string;
  pricedCards?: number | null;
  cardCount?: number | null;
};

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
  const payload = await apiFetch<any>(`/club/value-detail${qs.toString() ? `?${qs.toString()}` : ""}`);
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

function ChartBars({ history }: { history: ClubValueHistorySnapshot[] }) {
  const values = history.map((item) => item.clubValueEur);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 1);
  const range = Math.max(1, max - min);
  return (
    <View style={styles.chart}>
      <View style={styles.chartGrid} />
      <View style={styles.chartRows}>
        {history.map((item, index) => {
          const height = 18 + ((item.clubValueEur - min) / range) * 118;
          const previous = index > 0 ? history[index - 1].clubValueEur : item.clubValueEur;
          const positive = item.clubValueEur >= previous;
          return (
            <View key={`${item.id}-${index}`} style={styles.chartColumn}>
              <Text style={styles.chartValue}>{formatEuro(item.clubValueEur)}</Text>
              <View style={styles.barTrack}>
                <LinearGradient
                  colors={positive ? ["#FF3148", "#7A111D"] : ["#46A0FF", "#1B335F"]}
                  style={[styles.bar, { height }]}
                />
              </View>
              <Text style={styles.chartLabel}>{item.label || formatSnapshotDate(item.createdAt)}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

export default function ClubEvolutionScreen() {
  const [history, setHistory] = useState<ClubValueHistorySnapshot[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const next = await upsertCurrentSnapshotV1();
      setHistory(next);
    } catch {
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
    return { first, last, variation, coverage };
  }, [history]);

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
            <Text style={styles.cardTitle}>Graphique historique</Text>
            <Text style={styles.cardAction}>club_value_history</Text>
          </View>
          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color="#FF3148" />
              <Text style={styles.muted}>Chargement de l'historique...</Text>
            </View>
          ) : history.length ? (
            <ChartBars history={history} />
          ) : (
            <View style={styles.loadingBox}>
              <Text style={styles.muted}>Aucun historique disponible</Text>
            </View>
          )}
        </View>

        <View style={styles.summaryGrid}>
          <View style={styles.kpi}><Text style={styles.kpiValue}>{summary.last?.clubValueText || "—"}</Text><Text style={styles.kpiLabel}>Valeur actuelle</Text></View>
          <View style={styles.kpi}><Text style={[styles.kpiValue, summary.variation >= 0 ? styles.positive : styles.negative]}>{formatSignedEuro(summary.variation)}</Text><Text style={styles.kpiLabel}>Variation totale</Text></View>
          <View style={styles.kpi}><Text style={styles.kpiValue}>{summary.coverage === null ? "—" : `${summary.coverage}%`}</Text><Text style={styles.kpiLabel}>Couverture marché</Text></View>
          <View style={styles.kpi}><Text style={styles.kpiValue}>{summary.last?.pricedCards ?? "—"} / {summary.last?.cardCount ?? "—"}</Text><Text style={styles.kpiLabel}>Cartes valorisées</Text></View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Historique</Text>
          {history.map((item, index) => {
            const previous = index > 0 ? history[index - 1].clubValueEur : item.clubValueEur;
            const diff = item.clubValueEur - previous;
            return (
              <View key={`${item.id}-row-${index}`} style={styles.historyRow}>
                <View>
                  <Text style={styles.historyLabel}>{item.label || formatSnapshotDate(item.createdAt)}</Text>
                  <Text style={styles.muted}>{formatSnapshotDate(item.createdAt)}</Text>
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
          <Text style={styles.cardTitle}>Performance nette</Text>
          <View style={styles.historyRow}><Text style={styles.muted}>Dépenses</Text><Text style={styles.historyValue}>À connecter</Text></View>
          <View style={styles.historyRow}><Text style={styles.muted}>Reventes</Text><Text style={styles.historyValue}>À connecter</Text></View>
          <View style={styles.historyRow}><Text style={styles.muted}>Profit net</Text><Text style={styles.historyValue}>À connecter</Text></View>
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
  cardAction: { color: "rgba(255,255,255,0.45)", fontSize: 11, fontWeight: "800" },
  chart: { minHeight: 230, borderRadius: 14, overflow: "hidden", backgroundColor: "rgba(0,0,0,0.30)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  chartGrid: { ...StyleSheet.absoluteFillObject, borderTopWidth: 1, borderBottomWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  chartRows: { flex: 1, flexDirection: "row", alignItems: "flex-end", gap: 8, padding: 12 },
  chartColumn: { flex: 1, alignItems: "center", gap: 6, minWidth: 54 },
  chartValue: { color: "rgba(255,255,255,0.72)", fontSize: 10, fontWeight: "800" },
  barTrack: { height: 140, width: "100%", justifyContent: "flex-end", alignItems: "center" },
  bar: { width: "72%", borderRadius: 8 },
  chartLabel: { color: "rgba(255,255,255,0.52)", fontSize: 10, fontWeight: "800" },
  loadingBox: { minHeight: 160, alignItems: "center", justifyContent: "center", gap: 10 },
  muted: { color: "rgba(255,255,255,0.58)", fontSize: 13, fontWeight: "700" },
  summaryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  kpi: { width: "48%", borderRadius: 14, padding: 12, backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: "rgba(255,255,255,0.09)" },
  kpiValue: { color: "#FFFFFF", fontSize: 20, fontWeight: "900" },
  kpiLabel: { color: "rgba(255,255,255,0.56)", fontSize: 12, fontWeight: "700", marginTop: 4 },
  historyRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, paddingVertical: 8, borderBottomWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  historyLabel: { color: "#FFFFFF", fontSize: 15, fontWeight: "900" },
  historyRight: { alignItems: "flex-end" },
  historyValue: { color: "#FFFFFF", fontSize: 15, fontWeight: "900" },
  positive: { color: "#2FE66B" },
  negative: { color: "#FF4D61" },
  pressed: { opacity: 0.72, transform: [{ scale: 0.99 }] },
});
