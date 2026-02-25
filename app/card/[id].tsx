import React, { useMemo } from "react";
import { ScrollView, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { theme } from "../../src/theme";
import { xsCardNavGet } from "../_lib/cardNavCache";

/**
 * XS_CARD_DETAIL_SCREEN_V4
 * - Restore écran détail (Prix + L15 + détails)
 * - Ajoute un bandeau PROBE en haut avec id + playerSlug (preuve routing)
 * - Toujours PS-safe (pas de template strings/backticks)
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
  const id = String((params as any)?.id ?? "").trim();
  const playerSlug = String((params as any)?.playerSlug ?? "").trim();

  const card = useMemo(() => {
    if (!id) return null;
    return xsCardNavGet(id);
  }, [id]);

  if (!card) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg, padding: 16, justifyContent: "center" }}>
        <Text style={{ color: theme.text, fontWeight: "900", fontSize: 18 }}>Carte introuvable</Text>
        <Text style={{ color: theme.muted, marginTop: 8 }}>
          Ouvre la fiche en cliquant depuis la liste (cache navigation).
        </Text>

        <View style={{ marginTop: 14, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 14, backgroundColor: theme.panel, borderWidth: 1, borderColor: theme.stroke }}>
          <Text style={{ color: theme.text, fontWeight: "900" }}>XS_CARD_DETAIL_PROBE_V4 ✅</Text>
          <Text style={{ color: theme.muted, marginTop: 6 }}>id: {id || "—"}</Text>
          <Text style={{ color: theme.muted, marginTop: 2 }}>playerSlug: {playerSlug || "—"}</Text>
        </View>
      </View>
    );
  }

  const price = (card as any)?.price || {};
  const avg7d = asFinite(price?.avg7dEur);
  const avg30d = asFinite(price?.avg30dEur);
  const trend = avg7d !== null && avg30d !== null ? (avg7d - avg30d) : null;
  const trendLabel =
    trend === null ? "—" : ((trend >= 0 ? "+" : "") + trend.toFixed(2) + " €");

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.bg }} contentContainerStyle={{ padding: 16, gap: 12 }}>
      {/* PROBE routing (toujours visible) */}
      <View style={{ borderRadius: 14, borderWidth: 1, borderColor: theme.stroke, backgroundColor: theme.panel, padding: 12 }}>
        <Text style={{ color: theme.text, fontWeight: "900" }}>XS_CARD_DETAIL_PROBE_V4 ✅</Text>
        <Text style={{ color: theme.muted, marginTop: 6 }}>id: {id || "—"}</Text>
        <Text style={{ color: theme.muted, marginTop: 2 }}>playerSlug: {playerSlug || "—"}</Text>
      </View>

      <Text style={{ color: theme.text, fontWeight: "900", fontSize: 20 }} numberOfLines={2}>
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
