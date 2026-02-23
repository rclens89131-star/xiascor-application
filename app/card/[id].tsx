import React, { useMemo } from "react";
import { ScrollView, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { theme } from "../../src/theme";
import { xsCardNavGet } from "../_lib/cardNavCache";
/* XS_PERF_SECTION_V1_BEGIN */
function xsClamp01(n: number){ return Math.max(0, Math.min(1, n)); }
function xsClampScore(n: number){ return Math.max(0, Math.min(100, n)); }
function xsColorKey(score: number): "r"|"o"|"y"|"g" {
  if(score >= 70) return "g";
  if(score >= 50) return "y";
  if(score >= 30) return "o";
  return "r";
}

function XSScorePill({ label, value }: { label: string; value: number | null | undefined }){
  const v = (typeof value === "number" && Number.isFinite(value)) ? Math.round(value) : null;
  return (
    <View style={{ alignItems: "center", gap: 6 }}>      <Text style={{ color: "#9aa0a6", fontSize: 12 }}>{label}</Text>
      <View style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: "#141414", borderWidth: 1, borderColor: "#242424", minWidth: 54, alignItems: "center" }}>
        <Text style={{ color: "white", fontWeight: "700" }}>{v == null ? "—" : String(v)}</Text>
      </View>
    </View>
  );
}

function XSPerfChart({ scores }: { scores: number[] }){
  const arr = (Array.isArray(scores) ? scores : []).slice(-15).map((n) => xsClampScore(n));
  const max = 100;
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8, paddingVertical: 12 }}>      {arr.length === 0 ? (
        <Text style={{ color: "#9aa0a6" }}>Historique indisponible (mode public / pas encore sync).</Text>
      ) : arr.map((s, i) => {
        const h = Math.round(10 + xsClamp01(s / max) * 110);
        const key = xsColorKey(s);
        const bg = key === "g" ? "#22c55e" : (key === "y" ? "#facc15" : (key === "o" ? "#fb923c" : "#ef4444"));
        return (
          <View key={i} style={{ width: 16, height: h, borderRadius: 8, backgroundColor: bg, opacity: 0.92 }} />        );
      })}
    </View>
  );
}

function XSPerformanceSection({ card }: { card: any }){
  const l5  = (typeof card?.l5 === "number") ? card.l5 : null;
  const l10 = (typeof card?.l10 === "number") ? card.l10 : null;
  const l40 = (typeof card?.l40 === "number") ? card.l40 : null;

  const raw =
    card?.recentScores ??
    card?.scores ??
    card?.lastScores ??
    card?.player?.recentScores ??
    card?.anyPlayer?.recentScores ??
    [];

  const scores = Array.isArray(raw) ? raw.map((x: any) => {
    const v = (typeof x === "number") ? x : (typeof x === "string" ? Number(x) : (x?.score ?? x?.total ?? x?.value));
    const n = (typeof v === "number") ? v : (typeof v === "string" ? Number(v) : NaN);
    return Number.isFinite(n) ? xsClampScore(n) : null;
  }).filter((n: any) => typeof n === "number") : [];

  return (
    <View style={{ marginTop: 16, padding: 14, borderRadius: 16, backgroundColor: "#0f0f0f", borderWidth: 1, borderColor: "#1f1f1f" }}>      <Text style={{ color: "white", fontSize: 18, fontWeight: "800", marginBottom: 10 }}>Performance du joueur</Text>

      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
        <XSScorePill label="5 derniers" value={l5} />
        <XSScorePill label="10 derniers" value={l10} />
        <XSScorePill label="40 derniers" value={l40} />
      </View>

      <XSPerfChart scores={scores} />
    </View>
  );
}
/* XS_PERF_SECTION_V1_END */

/**
 * XS_CARD_DETAIL_SCREEN_V3
 * - Affiche Prix + L15 + infos détaillées
 * - N'affiche PAS la rareté (même si dispo)
 * - PS-safe: pas de template strings/backticks
 */

function asFinite(v: unknown): number | null {
  if (typeof v !== "number") return null;
  return Number.isFinite(v) ? v : null;
}

function formatEur(v: unknown): string {
  const n = asFinite(v);
  if (n === null) return "—";
  return n.toFixed(2) + " €";
}

function pickStr(v: unknown): string {
  return typeof v === "string" && v.trim() ? v.trim() : "—";
}

function pickL15(card: any): string {
  const v =
    card?.l15 ??
    card?.L15 ??
    card?.l15Score ??
    card?.l15Avg ??
    card?.last15 ??
    card?.last15Avg ??
    card?.scoreL15 ??
    null;
  const n = asFinite(v);
  return n === null ? "—" : n.toFixed(1);
}

export default function CardDetailScreen() {
  const params = useLocalSearchParams();
  const id = String((params as any)?.id || "").trim();

  const card = useMemo(() => {
    if (!id) return null;
    return xsCardNavGet(id);
  }, [id]);

  if (!card) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg, padding: 16, justifyContent: "center" }}>        <Text style={{ color: theme.text, fontWeight: "900", fontSize: 18 }}>Carte introuvable</Text>
        <Text style={{ color: theme.muted, marginTop: 8 }}>
          Ouvre la fiche en cliquant depuis la liste (cache navigation).
        </Text>
      </View>
    );
  }

  const price = (card as any)?.price || {};
  const avg7d = asFinite(price?.avg7dEur);
  const avg30d = asFinite(price?.avg30dEur);
  const trend = avg7d !== null && avg30d !== null ? (avg7d - avg30d) : null;
  const trendLabel =
    trend === null
      ? "—"
      : ((trend >= 0 ? "+" : "") + trend.toFixed(2) + " €");

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.bg }} contentContainerStyle={{ padding: 16, gap: 12 }}>      <Text style={{ color: theme.text, fontWeight: "900", fontSize: 20 }} numberOfLines={2}>
      {/* XS_PERF_SECTION_V1_RENDER */}
      <XSPerformanceSection card={card as any} />
        {pickStr((card as any)?.playerName)}
      </Text>
      <Text style={{ color: theme.muted }} numberOfLines={2}>
        {pickStr((card as any)?.teamName)} • {pickStr((card as any)?.position)} • {pickStr((card as any)?.seasonYear)}
      </Text>

      {/* L15 */}
      <View style={{ borderRadius: 14, borderWidth: 1, borderColor: theme.stroke, backgroundColor: theme.panel, padding: 12 }}>
        <Text style={{ color: theme.text, fontWeight: "900" }}>L15</Text>
        <Text style={{ color: theme.muted, marginTop: 6, fontSize: 16 }}>{pickL15(card)}</Text>
      </View>

      {/* Prix */}
      <View style={{ borderRadius: 14, borderWidth: 1, borderColor: theme.stroke, backgroundColor: theme.panel, padding: 12, gap: 4 }}>
        <Text style={{ color: theme.text, fontWeight: "900" }}>Prix</Text>
        <Text style={{ color: theme.muted }}>Dernière vente: {formatEur(price?.lastSaleEur)}</Text>
        <Text style={{ color: theme.muted }}>Moy. 7j: {formatEur(price?.avg7dEur)}</Text>
        <Text style={{ color: theme.muted }}>Moy. 30j: {formatEur(price?.avg30dEur)}</Text>
        <Text style={{ color: theme.muted }}>Floor: {formatEur(price?.floorEur)}</Text>
        <Text style={{ color: theme.muted }}>Trend 7j/30j: {trendLabel}</Text>
        {!!price?.asOf && <Text style={{ color: theme.muted, fontSize: 12 }}>asOf: {String(price.asOf)}</Text>}
        {!!price?.warning && <Text style={{ color: theme.muted, fontSize: 12 }}>{String(price.warning)}</Text>}
      </View>

      {/* Détails utiles (sans rareté) */}
      <View style={{ borderRadius: 14, borderWidth: 1, borderColor: theme.stroke, backgroundColor: theme.panel, padding: 12 }}>
        <Text style={{ color: theme.text, fontWeight: "900" }}>Détails</Text>
        <Text style={{ color: theme.muted, marginTop: 6 }}>
          ID: {pickStr((card as any)?.id ?? (card as any)?.cardId ?? (card as any)?.slug)}
        </Text>
        <Text style={{ color: theme.muted }}>Club: {pickStr((card as any)?.teamName)}</Text>
        <Text style={{ color: theme.muted }}>Poste: {pickStr((card as any)?.position)}</Text>
        <Text style={{ color: theme.muted }}>Saison: {pickStr((card as any)?.seasonYear)}</Text>
      </View>
    </ScrollView>
  );
}

