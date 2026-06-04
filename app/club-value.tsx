/* XS_CLUB_VALUE_DETAIL_V1 */
/* XS_CLUB_VALUE_REFRESH_V1 */
/* XS_CLUB_VALUE_AUTO_REFRESH_24H_V1 */
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

type ClubValueCard = {
  playerName?: string | null;
  cardSlug?: string | null;
  rarity?: string | null;
  season?: number | string | null;
  serialNumber?: number | string | null;
  clubName?: string | null;
  estimatedValueEur?: number | null;
  estimatedValueText?: string | null;
  valuationMethod?: string | null;
  valuationLabel?: string | null;
  quickSaleText?: string | null;
  normalSaleText?: string | null;
  optimisticSaleText?: string | null;
};

type ClubValuePayload = {
  ok?: boolean;
  cardCount?: number | null;
  pricedCards?: number | null;
  unpricedCards?: number | null;
  clubValueText?: string | null;
  cards?: ClubValueCard[];
};

type ClubValueRefreshPayload = {
  ok?: boolean;
  marker?: string;
  rateLimited?: boolean;
  skipped?: boolean;
  reason?: string | null;
  attempted?: number;
  filledPlayers?: number;
  insertedOrUpdated?: number;
  status?: string | null;
  lastRunAt?: string | null;
  nextAllowedAt?: string | null;
  processedPlayers?: number | null;
  remainingPlayers?: number | null;
  message?: string | null;
};

async function readClubValueDeviceIdV1(): Promise<string | null> {
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

function cleanTextV1(value: unknown, fallback = "—"): string {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function formatRarityV1(value: unknown): string {
  const text = cleanTextV1(value).replace(/_/g, " ");
  return text === "—" ? text : text.charAt(0).toUpperCase() + text.slice(1);
}

function getValuationToneV1(method: unknown): "green" | "gold" | "muted" {
  if (method === "exact_card_slug") return "green";
  if (method === "player_rarity_season_floor" || method === "player_rarity_floor") return "gold";
  return "muted";
}

function formatClubValueDateV1(value: unknown): string {
  const text = String(value ?? "").trim();
  if (!text) return "—";
  const date = new Date(text);
  if (!Number.isFinite(date.getTime())) return "—";
  return date.toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default function ClubValueScreen() {
  const [payload, setPayload] = useState<ClubValuePayload | null>(null);
  const [refreshStatus, setRefreshStatus] = useState<ClubValueRefreshPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadValueDetail = useCallback(async (opts?: { quiet?: boolean }) => {
    try {
      if (!opts?.quiet) setLoading(true);
      const deviceId = await readClubValueDeviceIdV1();
      const qs = new URLSearchParams();
      if (deviceId) qs.set("deviceId", deviceId);
      const result = await apiFetch<ClubValuePayload>(`/club/value-detail${qs.toString() ? `?${qs.toString()}` : ""}`);
      const status = await apiFetch<ClubValueRefreshPayload>(`/club/value-refresh-status${qs.toString() ? `?${qs.toString()}` : ""}`).catch(() => null);
      setPayload(result && result.ok !== false ? result : null);
      setRefreshStatus(status && status.ok !== false ? status : null);
      setError(null);
    } catch (err) {
      setPayload(null);
      setError(String(err instanceof Error ? err.message : err || "Données indisponibles"));
    } finally {
      if (!opts?.quiet) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadValueDetail();
  }, [loadValueDetail]);

  const refreshClubValue = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    setStatusMessage("Analyse du marché en cours...");
    try {
      const deviceId = await readClubValueDeviceIdV1();
      const qs = new URLSearchParams();
      if (deviceId) qs.set("deviceId", deviceId);
      qs.set("limitPlayers", "5");
      const result = await apiFetch<ClubValueRefreshPayload>(`/club/value-refresh-all?${qs.toString()}`, { method: "POST" });
      setRefreshStatus(result && result.ok !== false ? result : null);
      if (result?.rateLimited) {
        setStatusMessage("Sorare limite temporairement les demandes. Xiascor reprendra automatiquement plus tard.");
      } else if (result?.skipped && result?.reason === "global_cooldown") {
        setStatusMessage("Analyse récente déjà effectuée. Réessayez dans quelques instants.");
      } else if (result?.status === "partial") {
        setStatusMessage("Analyse complète lancée. Xiascor continue progressivement pour éviter les limites Sorare.");
      } else {
        setStatusMessage("Valeur du club actualisée");
      }
      await loadValueDetail({ quiet: true });
    } catch {
      setStatusMessage("Actualisation indisponible pour le moment.");
    } finally {
      setRefreshing(false);
    }
  }, [loadValueDetail, refreshing]);

  const cards = useMemo(() => {
    const items = Array.isArray(payload?.cards) ? payload.cards : [];
    return items.slice().sort((a, b) => {
      const av = typeof a.estimatedValueEur === "number" ? a.estimatedValueEur : -1;
      const bv = typeof b.estimatedValueEur === "number" ? b.estimatedValueEur : -1;
      return bv - av;
    });
  }, [payload]);
  const pricedCount = typeof payload?.pricedCards === "number" ? payload.pricedCards : 0;
  const totalCount = typeof payload?.cardCount === "number" ? payload.cardCount : 0;
  const unpricedCount = typeof payload?.unpricedCards === "number" ? payload.unpricedCards : Math.max(0, totalCount - pricedCount);
  const marketCoverage = totalCount > 0 ? Math.round((pricedCount / totalCount) * 100) : null;
  const processedPlayers = typeof refreshStatus?.processedPlayers === "number" ? refreshStatus.processedPlayers : null;
  const remainingPlayers = typeof refreshStatus?.remainingPlayers === "number" ? refreshStatus.remainingPlayers : unpricedCount;

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.screen}>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" onPress={() => router.back()} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
            <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
          </Pressable>
          <View style={styles.headerText}>
            <Text style={styles.title}>Valeur du club</Text>
            <Text style={styles.subtitle}>Estimation basée sur les floors du marché</Text>
          </View>
        </View>

        <LinearGradient colors={["#4A060E", "#16070B", "#08080B"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.summaryCard}>
          <View style={styles.summaryTop}>
            <View>
              <Text style={styles.summaryLabel}>Valeur totale du club</Text>
              <Text style={styles.summaryValue}>{cleanTextV1(payload?.clubValueText)}</Text>
            </View>
            <View style={styles.iconBubble}>
              <Ionicons name="cash-outline" size={24} color="#FFFFFF" />
            </View>
          </View>
          <View style={styles.kpiRow}>
            <View style={styles.kpiPill}>
              <Text style={styles.kpiValue}>{payload?.cardCount ?? "—"}</Text>
              <Text style={styles.kpiLabel}>Cartes</Text>
            </View>
            <View style={styles.kpiPill}>
              <Text style={styles.kpiValue}>{payload?.pricedCards ?? "—"}</Text>
              <Text style={styles.kpiLabel}>Valorisées</Text>
            </View>
            <View style={styles.kpiPill}>
              <Text style={styles.kpiValue}>{payload?.unpricedCards ?? "—"}</Text>
              <Text style={styles.kpiLabel}>Sans prix</Text>
            </View>
          </View>
          <View style={styles.coveragePanel}>
            <View style={styles.coverageHeader}>
              <View>
                <Text style={styles.coverageLabel}>Valeur actuelle</Text>
                <Text style={styles.coverageValue}>{cleanTextV1(payload?.clubValueText)}</Text>
              </View>
              <View style={styles.coverageBadge}>
                <Text style={styles.coverageBadgeText}>{marketCoverage === null ? "—" : `${marketCoverage}%`}</Text>
              </View>
            </View>
            <View style={styles.coverageLine}>
              <Text style={styles.coverageMuted}>Cartes valorisées</Text>
              <Text style={styles.coverageStrong}>{pricedCount || "—"} / {totalCount || "—"}</Text>
            </View>
            <View style={styles.coverageLine}>
              <Text style={styles.coverageMuted}>Couverture marché</Text>
              <Text style={styles.coverageStrong}>{marketCoverage === null ? "—" : `${marketCoverage}%`}</Text>
            </View>
            <View style={styles.coverageLine}>
              <Text style={styles.coverageMuted}>Cartes restantes à analyser</Text>
              <Text style={styles.coverageStrong}>{totalCount ? unpricedCount : "—"}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              disabled={refreshing}
              onPress={refreshClubValue}
              style={({ pressed }) => [styles.refreshButton, (pressed || refreshing) && styles.pressed]}
            >
              {refreshing ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Ionicons name="sync" size={18} color="#FFFFFF" />}
              <Text style={styles.refreshButtonText}>{refreshing ? "Analyse du marché en cours..." : "Actualiser toute la valeur du club"}</Text>
            </Pressable>
            {statusMessage ? <Text style={styles.refreshStatus}>{statusMessage}</Text> : null}
            <View style={styles.refreshMetaPanel}>
              <View style={styles.coverageLine}>
                <Text style={styles.coverageMuted}>Joueurs analysés</Text>
                <Text style={styles.coverageStrong}>{processedPlayers === null ? "—" : processedPlayers}</Text>
              </View>
              <View style={styles.coverageLine}>
                <Text style={styles.coverageMuted}>Restants</Text>
                <Text style={styles.coverageStrong}>{remainingPlayers}</Text>
              </View>
              <View style={styles.coverageLine}>
                <Text style={styles.coverageMuted}>Dernière actualisation</Text>
                <Text style={styles.coverageStrong}>{formatClubValueDateV1(refreshStatus?.lastRunAt)}</Text>
              </View>
              <View style={styles.coverageLine}>
                <Text style={styles.coverageMuted}>Prochaine reprise</Text>
                <Text style={styles.coverageStrong}>{formatClubValueDateV1(refreshStatus?.nextAllowedAt)}</Text>
              </View>
              {refreshStatus?.status === "partial" ? (
                <Text style={styles.refreshStatus}>Xiascor continue l'analyse progressivement pour éviter les limites Sorare.</Text>
              ) : null}
              {refreshStatus?.status === "rate_limited" ? (
                <Text style={styles.refreshStatus}>Sorare limite temporairement les demandes. Xiascor reprendra automatiquement plus tard.</Text>
              ) : null}
            </View>
          </View>
        </LinearGradient>

        {loading ? (
          <View style={styles.stateCard}>
            <ActivityIndicator color="#FF3148" />
            <Text style={styles.stateText}>Chargement de la valorisation...</Text>
          </View>
        ) : error ? (
          <View style={styles.stateCard}>
            <Ionicons name="warning-outline" size={22} color="#FFD43B" />
            <Text style={styles.stateText}>Données indisponibles</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {cards.map((card, index) => {
              const tone = getValuationToneV1(card.valuationMethod);
              const hasPrice = typeof card.estimatedValueEur === "number";
              return (
                <View key={card.cardSlug || `${card.playerName}-${index}`} style={styles.card}>
                  <View style={styles.cardTop}>
                    <View style={styles.cardMain}>
                      <Text style={styles.playerName}>{cleanTextV1(card.playerName)}</Text>
                      <Text style={styles.cardMeta}>
                        {formatRarityV1(card.rarity)} · {cleanTextV1(card.season)} · #{cleanTextV1(card.serialNumber)}
                      </Text>
                      <Text style={styles.clubName}>{cleanTextV1(card.clubName)}</Text>
                    </View>
                    <View style={styles.valueBlock}>
                      <Text style={styles.valueText}>{hasPrice ? cleanTextV1(card.estimatedValueText) : "Prix indisponible"}</Text>
                      <Text style={[styles.methodText, styles[`${tone}Text`]]}>{cleanTextV1(card.valuationLabel)}</Text>
                    </View>
                  </View>

                  <View style={styles.saleRow}>
                    <View style={styles.salePill}>
                      <Text style={styles.saleLabel}>Vente rapide</Text>
                      <Text style={styles.saleValue}>{hasPrice ? cleanTextV1(card.quickSaleText) : "Prix indisponible"}</Text>
                    </View>
                    <View style={styles.salePill}>
                      <Text style={styles.saleLabel}>Vente normale</Text>
                      <Text style={styles.saleValue}>{hasPrice ? cleanTextV1(card.normalSaleText) : "Prix indisponible"}</Text>
                    </View>
                    <View style={styles.salePill}>
                      <Text style={styles.saleLabel}>Optimiste</Text>
                      <Text style={styles.saleValue}>{hasPrice ? cleanTextV1(card.optimisticSaleText) : "Prix indisponible"}</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#050507",
  },
  content: {
    padding: 18,
    paddingBottom: 34,
    gap: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  headerText: {
    flex: 1,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 34,
    fontWeight: "900",
  },
  subtitle: {
    color: "rgba(255,255,255,0.68)",
    fontSize: 15,
    marginTop: 2,
  },
  summaryCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,49,72,0.55)",
    padding: 18,
    gap: 18,
    shadowColor: "#FF1F3A",
    shadowOpacity: 0.22,
    shadowRadius: 20,
  },
  summaryTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  summaryLabel: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 14,
    fontWeight: "700",
  },
  summaryValue: {
    color: "#FFFFFF",
    fontSize: 44,
    fontWeight: "900",
    marginTop: 4,
  },
  iconBubble: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,49,72,0.22)",
    borderWidth: 1,
    borderColor: "rgba(255,49,72,0.55)",
  },
  kpiRow: {
    flexDirection: "row",
    gap: 10,
  },
  kpiPill: {
    flex: 1,
    borderRadius: 14,
    padding: 12,
    backgroundColor: "rgba(0,0,0,0.28)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  kpiValue: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
  },
  kpiLabel: {
    color: "rgba(255,255,255,0.58)",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2,
  },
  coveragePanel: {
    borderRadius: 16,
    padding: 14,
    gap: 10,
    backgroundColor: "rgba(0,0,0,0.30)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  coverageHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  coverageLabel: {
    color: "rgba(255,255,255,0.58)",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  coverageValue: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "900",
    marginTop: 2,
  },
  coverageBadge: {
    minWidth: 58,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,49,72,0.20)",
    borderWidth: 1,
    borderColor: "rgba(255,49,72,0.55)",
  },
  coverageBadgeText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },
  coverageLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  coverageMuted: {
    color: "rgba(255,255,255,0.62)",
    fontSize: 13,
    fontWeight: "700",
    flex: 1,
  },
  coverageStrong: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
  },
  refreshButton: {
    minHeight: 46,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "rgba(255,49,72,0.26)",
    borderWidth: 1,
    borderColor: "rgba(255,49,72,0.70)",
  },
  refreshButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },
  refreshStatus: {
    color: "rgba(255,255,255,0.70)",
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  refreshMetaPanel: {
    borderRadius: 12,
    padding: 10,
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  stateCard: {
    minHeight: 140,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  stateText: {
    color: "rgba(255,255,255,0.72)",
    fontWeight: "800",
  },
  list: {
    gap: 12,
  },
  card: {
    borderRadius: 18,
    padding: 14,
    gap: 14,
    backgroundColor: "rgba(13,14,18,0.96)",
    borderWidth: 1,
    borderColor: "rgba(255,49,72,0.26)",
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  cardMain: {
    flex: 1,
    minWidth: 0,
  },
  playerName: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
  },
  cardMeta: {
    color: "#FFD43B",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 4,
    textTransform: "uppercase",
  },
  clubName: {
    color: "rgba(255,255,255,0.62)",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 3,
  },
  valueBlock: {
    alignItems: "flex-end",
    maxWidth: 150,
  },
  valueText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
  },
  methodText: {
    fontSize: 11,
    fontWeight: "800",
    marginTop: 4,
    textAlign: "right",
  },
  greenText: {
    color: "#2FE66B",
  },
  goldText: {
    color: "#FFD43B",
  },
  mutedText: {
    color: "rgba(255,255,255,0.48)",
  },
  saleRow: {
    flexDirection: "row",
    gap: 8,
  },
  salePill: {
    flex: 1,
    borderRadius: 12,
    padding: 10,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  saleLabel: {
    color: "rgba(255,255,255,0.52)",
    fontSize: 11,
    fontWeight: "800",
  },
  saleValue: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
    marginTop: 4,
  },
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.99 }],
  },
});
