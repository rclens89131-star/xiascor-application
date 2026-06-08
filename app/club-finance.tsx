/* XS_FINANCIAL_CENTER_V1 */
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

type ClubFinancialSummary = {
  ok?: boolean;
  clubValueEur?: number | null;
  clubValueText?: string | null;
  totalInvestedEur?: number | null;
  totalInvestedText?: string | null;
  totalSoldEur?: number | null;
  totalSoldText?: string | null;
  estimatedProfitEur?: number | null;
  estimatedProfitText?: string | null;
  roiPct?: number | null;
  roiText?: string | null;
  pricedCards?: number | null;
  cardCount?: number | null;
  coveragePct?: number | null;
};

async function readClubFinanceDeviceIdV1(): Promise<string | null> {
  const oauthId = (await AsyncStorage.getItem(OAUTH_DEVICE_ID_KEY)) || "";
  if (oauthId.trim()) {
    try { await AsyncStorage.setItem(DEVICE_ID_KEY, oauthId.trim()); } catch {}
    return oauthId.trim();
  }
  const jwtId = (await AsyncStorage.getItem(JWT_DEVICE_ID_KEY)) || "";
  if (jwtId.trim()) return jwtId.trim();
  const existing = (await AsyncStorage.getItem(DEVICE_ID_KEY)) || "";
  return existing.trim() || null;
}

function cleanFinanceTextV1(value: unknown, fallback = "—"): string {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function MetricTile({ label, value, tone }: { label: string; value: string; tone?: "red" | "green" }) {
  return (
    <View style={styles.metricTile}>
      <Text style={[styles.metricValue, tone === "green" ? styles.greenText : tone === "red" ? styles.redText : null]}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

export default function ClubFinanceScreen() {
  const [payload, setPayload] = useState<ClubFinancialSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSummary = useCallback(async () => {
    try {
      setLoading(true);
      const deviceId = await readClubFinanceDeviceIdV1();
      const qs = new URLSearchParams();
      if (deviceId) qs.set("deviceId", deviceId);
      const result = await apiFetch<ClubFinancialSummary>(`/club/financial-summary${qs.toString() ? `?${qs.toString()}` : ""}`);
      setPayload(result && result.ok !== false ? result : null);
      setError(null);
    } catch (err) {
      setPayload(null);
      setError(String(err instanceof Error ? err.message : err || "Données indisponibles"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const financeReport = useMemo(() => {
    const value = cleanFinanceTextV1(payload?.clubValueText);
    const coverage = payload?.coveragePct === null || payload?.coveragePct === undefined ? "—" : `${payload.coveragePct}%`;
    const priced = payload?.pricedCards ?? "—";
    const total = payload?.cardCount ?? "—";
    return `Valeur du club : ${value}. Couverture : ${coverage}. ${priced} / ${total} carte(s) valorisée(s). Historique disponible dans l'évolution du club.`;
  }, [payload]);

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.screen}>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" onPress={() => router.back()} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
            <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
          </Pressable>
          <View style={styles.headerText}>
            <Text style={styles.title}>Centre Financier</Text>
            <Text style={styles.subtitle}>Gestion du patrimoine du club</Text>
          </View>
        </View>

        <LinearGradient colors={["#4A060E", "#16070B", "#07070A"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View>
              <Text style={styles.heroLabel}>Valeur du club</Text>
              <Text style={styles.heroValue}>{cleanFinanceTextV1(payload?.clubValueText)}</Text>
            </View>
            <View style={styles.iconBubble}>
              <Ionicons name="wallet-outline" size={25} color="#FFFFFF" />
            </View>
          </View>
          <Text style={styles.heroNote}>Estimation basée sur les floors marché des cartes possédées.</Text>
        </LinearGradient>

        {loading ? (
          <View style={styles.stateCard}>
            <ActivityIndicator color="#FF3148" />
            <Text style={styles.stateText}>Chargement du centre financier...</Text>
          </View>
        ) : error ? (
          <View style={styles.stateCard}>
            <Ionicons name="warning-outline" size={22} color="#FFD43B" />
            <Text style={styles.stateText}>Données indisponibles</Text>
          </View>
        ) : (
          <>
            <View style={styles.metricGrid}>
              <MetricTile label="Capital investi" value={cleanFinanceTextV1(payload?.totalInvestedText, "À connecter")} />
              <MetricTile label="Revenus ventes" value={cleanFinanceTextV1(payload?.totalSoldText, "À connecter")} />
              <MetricTile label="Profit estimé" value={cleanFinanceTextV1(payload?.estimatedProfitText, "À connecter")} />
              <MetricTile label="ROI" value={cleanFinanceTextV1(payload?.roiText, "À connecter")} />
              <MetricTile label="Couverture marché" value={payload?.coveragePct === null || payload?.coveragePct === undefined ? "—" : `${payload.coveragePct}%`} tone="green" />
              <MetricTile label="Cartes valorisées" value={`${payload?.pricedCards ?? "—"} / ${payload?.cardCount ?? "—"}`} />
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleRow}>
                  <Ionicons name="analytics" size={18} color="#FF3148" />
                  <Text style={styles.cardTitle}>Directeur Financier</Text>
                </View>
                <Text style={styles.cardAction}>Rapport</Text>
              </View>
              <Text style={styles.reportText}>{financeReport}</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>À connecter ensuite</Text>
              <View style={styles.futureRow}><Text style={styles.futureLabel}>Achats</Text><Text style={styles.futureValue}>À connecter</Text></View>
              <View style={styles.futureRow}><Text style={styles.futureLabel}>Ventes</Text><Text style={styles.futureValue}>À connecter</Text></View>
              <View style={styles.futureRow}><Text style={styles.futureLabel}>Profit</Text><Text style={styles.futureValue}>À connecter</Text></View>
              <View style={styles.futureRow}><Text style={styles.futureLabel}>ROI</Text><Text style={styles.futureValue}>À connecter</Text></View>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#050507" },
  content: { gap: 16, padding: 18, paddingBottom: 34 },
  header: { alignItems: "center", flexDirection: "row", gap: 12 },
  backButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 21,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  pressed: { opacity: 0.74 },
  headerText: { flex: 1 },
  title: { color: "#FFFFFF", fontSize: 34, fontWeight: "900" },
  subtitle: { color: "rgba(255,255,255,0.68)", fontSize: 15, fontWeight: "700", marginTop: 2 },
  heroCard: {
    borderColor: "rgba(255,49,72,0.55)",
    borderRadius: 20,
    borderWidth: 1,
    gap: 14,
    padding: 18,
    shadowColor: "#FF1F3A",
    shadowOpacity: 0.22,
    shadowRadius: 20,
  },
  heroTop: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", gap: 12 },
  heroLabel: { color: "rgba(255,255,255,0.72)", fontSize: 14, fontWeight: "800" },
  heroValue: { color: "#FFFFFF", fontSize: 44, fontWeight: "900", marginTop: 4 },
  heroNote: { color: "rgba(255,255,255,0.62)", fontSize: 13, fontWeight: "700", lineHeight: 18 },
  iconBubble: {
    alignItems: "center",
    backgroundColor: "rgba(255,49,72,0.22)",
    borderColor: "rgba(255,49,72,0.55)",
    borderRadius: 18,
    borderWidth: 1,
    height: 52,
    justifyContent: "center",
    width: 52,
  },
  stateCard: {
    alignItems: "center",
    backgroundColor: "rgba(9,11,15,0.94)",
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: 18,
    borderWidth: 1,
    gap: 10,
    justifyContent: "center",
    minHeight: 130,
    padding: 18,
  },
  stateText: { color: "rgba(255,255,255,0.72)", fontSize: 14, fontWeight: "800" },
  metricGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  metricTile: {
    backgroundColor: "rgba(9,11,15,0.94)",
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: 16,
    borderWidth: 1,
    flexGrow: 1,
    minWidth: 150,
    padding: 14,
  },
  metricValue: { color: "#FFFFFF", fontSize: 22, fontWeight: "900" },
  metricLabel: { color: "rgba(255,255,255,0.58)", fontSize: 12, fontWeight: "800", marginTop: 4 },
  greenText: { color: "#2FE66B" },
  redText: { color: "#FF3148" },
  card: {
    backgroundColor: "rgba(9,11,15,0.94)",
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },
  cardHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  cardTitleRow: { alignItems: "center", flexDirection: "row", gap: 9 },
  cardTitle: { color: "#FFFFFF", fontSize: 16, fontWeight: "900" },
  cardAction: { color: "#FF3148", fontSize: 12, fontWeight: "900" },
  reportText: { color: "rgba(255,255,255,0.76)", fontSize: 14, fontWeight: "700", lineHeight: 20 },
  futureRow: {
    alignItems: "center",
    borderTopColor: "rgba(255,255,255,0.07)",
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  futureLabel: { color: "rgba(255,255,255,0.68)", fontSize: 14, fontWeight: "800" },
  futureValue: { color: "#FFFFFF", fontSize: 14, fontWeight: "900" },
});
