/* XS_FINANCIAL_CENTER_V1 */
/* XS_FINANCIAL_CENTER_V2_V1 */
/* XS_GAMEWEEK_REWARDS_ACCOUNTING_V1 */
/* XS_SORARE_TRANSACTIONS_V1 */
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
  investedEur?: number | null;
  investedText?: string | null;
  soldEur?: number | null;
  soldText?: string | null;
  rewardCashEur?: number | null;
  rewardCashText?: string | null;
  rewardEthEur?: number | null;
  rewardEthText?: string | null;
  rewardCardsValueEur?: number | null;
  rewardCardsValueText?: string | null;
  totalRewardsEur?: number | null;
  totalRewardsText?: string | null;
  rewardCount?: number | null;
  totalAssetsEur?: number | null;
  totalAssetsText?: string | null;
  profitEur?: number | null;
  profitText?: string | null;
  status?: string | null;
  totalInvestedEur?: number | null;
  totalInvestedText?: string | null;
  totalSoldEur?: number | null;
  totalSoldText?: string | null;
  estimatedProfitEur?: number | null;
  estimatedProfitText?: string | null;
  roiPct?: number | null;
  roiText?: string | null;
  transactionCount?: number | null;
  buyCount?: number | null;
  sellCount?: number | null;
  realizedProfitText?: string | null;
  realizedRoiText?: string | null;
  pricedCards?: number | null;
  cardCount?: number | null;
  coveragePct?: number | null;
};

type ClubRewardItem = {
  id?: string | null;
  gameWeekLabel?: string | null;
  competition?: string | null;
  division?: string | null;
  rewardType?: string | null;
  rewardCashText?: string | null;
  rewardEthText?: string | null;
  rewardCardPlayerName?: string | null;
  rewardCardValueText?: string | null;
  rewardTotalText?: string | null;
  createdAt?: string | null;
};

type ClubRewardsSummary = {
  ok?: boolean;
  totalRewardEur?: number | null;
  totalRewardText?: string | null;
  cashRewardText?: string | null;
  ethRewardText?: string | null;
  cardRewardValueText?: string | null;
  rewardCount?: number | null;
  items?: ClubRewardItem[];
};

type ClubTransactionItem = {
  id?: string | null;
  transactionType?: string | null;
  playerName?: string | null;
  cardSlug?: string | null;
  amountText?: string | null;
  transactionDate?: string | null;
};

type ClubTransactionsSummary = {
  ok?: boolean;
  transactionCount?: number | null;
  buyCount?: number | null;
  sellCount?: number | null;
  investedText?: string | null;
  soldText?: string | null;
  realizedProfitText?: string | null;
  realizedRoiText?: string | null;
  items?: ClubTransactionItem[];
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

function financePendingTextV2(value: unknown): string {
  return cleanFinanceTextV1(value, "À connecter");
}

function rewardEventTitleV1(item: ClubRewardItem): string {
  return cleanFinanceTextV1(item.gameWeekLabel || item.competition || item.rewardType, "Game Week");
}

function rewardEventValueV1(item: ClubRewardItem): string {
  if (item.rewardTotalText && item.rewardTotalText !== "À connecter") return item.rewardTotalText;
  if (item.rewardCardPlayerName) return `Carte gagnée : ${item.rewardCardPlayerName}`;
  return "À connecter";
}

function transactionTitleV1(item: ClubTransactionItem): string {
  const player = cleanFinanceTextV1(item.playerName || item.cardSlug, "Carte Sorare");
  return item.transactionType === "sell" ? `Vente ${player}` : `Achat ${player}`;
}

function transactionValueV1(item: ClubTransactionItem): string {
  const value = financePendingTextV2(item.amountText);
  if (value === "À connecter") return value;
  return item.transactionType === "sell" ? `+${value}` : `-${value}`;
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
  const [rewardsPayload, setRewardsPayload] = useState<ClubRewardsSummary | null>(null);
  const [transactionsPayload, setTransactionsPayload] = useState<ClubTransactionsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSummary = useCallback(async () => {
    try {
      setLoading(true);
      const deviceId = await readClubFinanceDeviceIdV1();
      const qs = new URLSearchParams();
      if (deviceId) qs.set("deviceId", deviceId);
      let result = await apiFetch<ClubFinancialSummary>(`/club/financial-summary-v2${qs.toString() ? `?${qs.toString()}` : ""}`);
      if (!result || result.ok === false) {
        result = await apiFetch<ClubFinancialSummary>(`/club/financial-summary${qs.toString() ? `?${qs.toString()}` : ""}`);
      }
      const rewardsResult = await apiFetch<ClubRewardsSummary>(`/club/rewards-summary${qs.toString() ? `?${qs.toString()}` : ""}`).catch(() => null);
      const transactionsResult = await apiFetch<ClubTransactionsSummary>(`/club/transactions-summary${qs.toString() ? `?${qs.toString()}` : ""}`).catch(() => null);
      setPayload(result && result.ok !== false ? result : null);
      setRewardsPayload(rewardsResult && rewardsResult.ok !== false ? rewardsResult : null);
      setTransactionsPayload(transactionsResult && transactionsResult.ok !== false ? transactionsResult : null);
      setError(null);
    } catch (err) {
      setPayload(null);
      setRewardsPayload(null);
      setTransactionsPayload(null);
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
    const totalAssets = cleanFinanceTextV1(payload?.totalAssetsText, "À connecter");
    const hasFullFinance = payload?.totalAssetsEur !== null && payload?.totalAssetsEur !== undefined;
    const rewardsText = financePendingTextV2(payload?.totalRewardsText ?? rewardsPayload?.totalRewardText);
    const investedText = financePendingTextV2(payload?.investedText ?? transactionsPayload?.investedText);
    const soldText = financePendingTextV2(payload?.soldText ?? transactionsPayload?.soldText);
    if (hasFullFinance) {
      return `Votre club vaut actuellement ${value}. Le patrimoine total est estimé à ${totalAssets}. Investi : ${investedText}. Revente : ${soldText}. Récompenses Game Week : ${rewardsText}. Couverture marché : ${coverage}.`;
    }
    const rewardSentence = rewardsText === "À connecter"
      ? "Les récompenses Game Week ne sont pas encore connectées."
      : `Le club a généré ${rewardsText} de récompenses Game Week.`;
    const transactionSentence = investedText === "À connecter" && soldText === "À connecter"
      ? "Les achats et ventes Sorare ne sont pas encore connectés."
      : `Investi : ${investedText}. Revente : ${soldText}.`;
    return `Votre club vaut actuellement ${value}. ${priced} / ${total} carte(s) sont valorisée(s). ${transactionSentence} ${rewardSentence} Données insuffisantes pour calcul complet du profit et du ROI.`;
  }, [payload, rewardsPayload, transactionsPayload]);

  const rewardItems = useMemo(() => Array.isArray(rewardsPayload?.items) ? rewardsPayload.items.slice(0, 5) : [], [rewardsPayload]);
  const transactionItems = useMemo(() => Array.isArray(transactionsPayload?.items) ? transactionsPayload.items.slice(0, 5) : [], [transactionsPayload]);

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
              <MetricTile label="💸 Total investi" value={financePendingTextV2(payload?.investedText ?? transactionsPayload?.investedText ?? payload?.totalInvestedText)} />
              <MetricTile label="💰 Total revendu" value={financePendingTextV2(payload?.soldText ?? transactionsPayload?.soldText ?? payload?.totalSoldText)} />
              <MetricTile label="🏆 Récompenses Game Week" value={financePendingTextV2(payload?.totalRewardsText ?? rewardsPayload?.totalRewardText)} />
              <MetricTile label="💎 Récompenses ETH" value={financePendingTextV2(payload?.rewardEthText)} />
              <MetricTile label="🎁 Cartes gagnées" value={financePendingTextV2(payload?.rewardCardsValueText)} />
              <MetricTile label="🏦 Patrimoine total" value={financePendingTextV2(payload?.totalAssetsText)} />
              <MetricTile label="📈 Profit estimé" value={financePendingTextV2(payload?.profitText ?? payload?.estimatedProfitText)} />
              <MetricTile label="🚀 ROI estimé" value={financePendingTextV2(payload?.roiText)} />
              <MetricTile label="📌 Profit réalisé" value={financePendingTextV2(payload?.realizedProfitText ?? transactionsPayload?.realizedProfitText)} />
              <MetricTile label="🎯 ROI réalisé" value={financePendingTextV2(payload?.realizedRoiText ?? transactionsPayload?.realizedRoiText)} />
              <MetricTile label="Couverture marché" value={payload?.coveragePct === null || payload?.coveragePct === undefined ? "—" : `${payload.coveragePct}%`} tone="green" />
              <MetricTile label="Cartes valorisées" value={`${payload?.pricedCards ?? "—"} / ${payload?.cardCount ?? "—"}`} />
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleRow}>
                  <Ionicons name="swap-horizontal" size={18} color="#FF3148" />
                  <Text style={styles.cardTitle}>Achats / Ventes Sorare</Text>
                </View>
                <Text style={styles.cardAction}>{transactionsPayload?.transactionCount ?? payload?.transactionCount ?? 0} flux</Text>
              </View>
              {transactionItems.length ? (
                <View style={styles.rewardList}>
                  {transactionItems.map((item, index) => (
                    <View key={`${item.id || item.cardSlug || "transaction"}-${index}`} style={styles.futureRow}>
                      <View>
                        <Text style={styles.futureLabel}>{transactionTitleV1(item)}</Text>
                        <Text style={styles.flowHint}>{item.transactionDate ? new Date(item.transactionDate).toLocaleDateString("fr-FR") : "Transaction Sorare"}</Text>
                      </View>
                      <Text style={item.transactionType === "sell" ? styles.greenText : styles.redText}>{transactionValueV1(item)}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.flowHint}>Achats et ventes Sorare à connecter.</Text>
              )}
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleRow}>
                  <Ionicons name="trophy" size={18} color="#FF3148" />
                  <Text style={styles.cardTitle}>Récompenses Game Week</Text>
                </View>
                <Text style={styles.cardAction}>{rewardsPayload?.rewardCount ?? 0} flux</Text>
              </View>
              <View style={styles.rewardGrid}>
                <View style={styles.rewardTile}><Text style={styles.futureLabel}>Cash gagné</Text><Text style={styles.futureValue}>{financePendingTextV2(rewardsPayload?.cashRewardText ?? payload?.rewardCashText)}</Text></View>
                <View style={styles.rewardTile}><Text style={styles.futureLabel}>ETH gagné</Text><Text style={styles.futureValue}>{financePendingTextV2(rewardsPayload?.ethRewardText ?? payload?.rewardEthText)}</Text></View>
                <View style={styles.rewardTile}><Text style={styles.futureLabel}>Cartes gagnées</Text><Text style={styles.futureValue}>{financePendingTextV2(rewardsPayload?.cardRewardValueText ?? payload?.rewardCardsValueText)}</Text></View>
                <View style={styles.rewardTile}><Text style={styles.futureLabel}>Valeur totale</Text><Text style={styles.futureValue}>{financePendingTextV2(rewardsPayload?.totalRewardText ?? payload?.totalRewardsText)}</Text></View>
              </View>
              {rewardItems.length ? (
                <View style={styles.rewardList}>
                  {rewardItems.map((item, index) => (
                    <View key={`${item.id || item.gameWeekLabel || "reward"}-${index}`} style={styles.futureRow}>
                      <View>
                        <Text style={styles.futureLabel}>{rewardEventTitleV1(item)}</Text>
                        <Text style={styles.flowHint}>{cleanFinanceTextV1(item.competition || item.division || item.rewardType, "Récompense Game Week")}</Text>
                      </View>
                      <Text style={styles.futureValue}>{rewardEventValueV1(item)}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.flowHint}>Les récompenses Game Week ne sont pas encore connectées.</Text>
              )}
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
              <Text style={styles.cardTitle}>Historique des flux</Text>
              <Text style={styles.flowHint}>Achats, ventes et récompenses seront affichés ici dès que Xiascor aura des flux réels à relier.</Text>
              <View style={styles.futureRow}><Text style={styles.futureLabel}>Achats</Text><Text style={styles.futureValue}>À connecter</Text></View>
              <View style={styles.futureRow}><Text style={styles.futureLabel}>Ventes</Text><Text style={styles.futureValue}>À connecter</Text></View>
              <View style={styles.futureRow}><Text style={styles.futureLabel}>Récompenses</Text><Text style={styles.futureValue}>{financePendingTextV2(rewardsPayload?.totalRewardText ?? payload?.totalRewardsText)}</Text></View>
              <View style={styles.futureRow}><Text style={styles.futureLabel}>Profit / ROI</Text><Text style={styles.futureValue}>À connecter</Text></View>
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
  rewardGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  rewardTile: {
    backgroundColor: "rgba(255,49,72,0.08)",
    borderColor: "rgba(255,49,72,0.18)",
    borderRadius: 14,
    borderWidth: 1,
    flexGrow: 1,
    minWidth: 135,
    padding: 12,
  },
  rewardList: { marginTop: 8 },
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
  flowHint: {
    color: "rgba(255,255,255,0.62)",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
    marginTop: 8,
    marginBottom: 2,
  },
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
