import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, Text, View, Image } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { theme } from "../../src/theme";
import { xsCardNavGet } from "../_lib/cardNavCache";
import { publicPlayerPerformance } from "../../src/scoutApi";

/**
 * XS_CARD_DETAIL_SCREEN_V5
 * - V4 + ajoute un bloc L5 (bar chart) via /public-player-performance
 * - Tolérant sur la shape (fallback sur champs déjà en cache si besoin)
 * - Toujours PS-safe (pas de template strings/backticks)
 */

function asFinite(v: unknown): number | null {
  if (typeof v !== "number") return null;
  return Number.isFinite(v) ? v : null;
}

function clamp(n: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, n));
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

/**
 * XS_L5_EXTRACT_V1
 * Essaie d'extraire un tableau de 5 scores depuis la réponse backend.
 * Shape inconnue => on tente plusieurs chemins + fallback cache.
 */
function xsExtractL5(resp: any, fallbackCard: any): number[] | null {
  const take5 = (arr: any[]): number[] => {
    const nums = arr
      .map((x: any) => {
        if (typeof x === "number") return x;
        if (typeof x === "string") return Number(x);
        return x?.score ?? x?.total ?? x?.value ?? x?.points ?? null;
      })
      .map((x: any) => (typeof x === "number" ? x : (typeof x === "string" ? Number(x) : NaN)))
      .filter((n: any) => typeof n === "number" && Number.isFinite(n)) as number[];
    const last = nums.slice(-5);
    return last.length ? last : [];
  };

  if (Array.isArray(resp?.scores)) {
    const t = take5(resp.scores);
    if (t.length) return t;
  }

  if (Array.isArray(resp?.performances)) {
    const t = take5(resp.performances);
    if (t.length) return t;
  }

  if (Array.isArray(resp?.items)) {
    const t = take5(resp.items);
    if (t.length) return t;
  }

  // Fallback cache card
  const arr =
    (fallbackCard as any)?.lastScores ??
    (fallbackCard as any)?.player?.recentScores ??
    (fallbackCard as any)?.anyPlayer?.recentScores ??
    null;

  if (Array.isArray(arr)) {
    const t = take5(arr);
    if (t.length) return t;
  }

  return null;
}

/**
 * XS_L5_COLOR_V1
 * Couleurs par seuil (tu as donné les seuils plus tôt).
 * NB: on peut ajuster les teintes exactes après.
 */
function xsScoreColor(score: number): string {
  if (score < 25) return "#D64B4B";     // rouge
  if (score < 35) return "#E57A2E";     // orange
  if (score < 55) return "#E5C12E";     // jaune
  if (score < 65) return "#8BC34A";     // vert pomme
  if (score < 75) return "#2E7D32";     // vert foncé
  return "#4FC3F7";                     // bleu clair
}

export default function CardDetailScreen() {
  
  // XS_SORARE_CHART_HELPERS_V1
  const XS_SHOW_DEBUG = false; // mettre true temporairement si besoin

  type XsOpp = { logoUrl?: string; name?: string };

  function xsClamp(n: number, a: number, b: number){ return Math.max(a, Math.min(b, n)); }

  // Couleurs par seuil (Sorare-like demandé)
  function xsScoreColor(score: number){
    const s = xsClamp(Number(score) || 0, 0, 100);
    if (s <= 25) return "#E04545"; // rouge
    if (s <= 35) return "#F08A24"; // orange
    if (s <= 55) return "#F2C230"; // jaune
    if (s <= 65) return "#A7E22E"; // vert pomme
    if (s <= 75) return "#2E9E4E"; // vert foncé
    return "#5BC0EB";              // bleu clair >75
  }

  function xsPickSeries(resp: any){
    const l5  = Array.isArray(resp?.recentScores) ? resp.recentScores.slice(0, 5) : (Array.isArray(resp?.l5Scores) ? resp.l5Scores.slice(0, 5) : []);
    const l15 = Array.isArray(resp?.recentScores15) ? resp.recentScores15.slice(0, 15) : (Array.isArray(resp?.l15Scores) ? resp.l15Scores.slice(0, 15) : []);
    const l40 = Array.isArray(resp?.recentScores40) ? resp.recentScores40.slice(0, 40) : (Array.isArray(resp?.l40Scores) ? resp.l40Scores.slice(0, 40) : []);

    // Opponents best-effort (backend peut ne pas fournir encore)
    const rawOpp = Array.isArray(resp?.recentOpponents) ? resp.recentOpponents
                : Array.isArray(resp?.opponents) ? resp.opponents
                : [];

    const opp: XsOpp[] = Array.isArray(rawOpp)
      ? rawOpp.map((o: any) => ({
          logoUrl: String(o?.logoUrl || o?.clubLogoUrl || o?.crestUrl || o?.pictureUrl || "").trim() || undefined,
          name: String(o?.name || o?.clubName || o?.shortName || o?.slug || "").trim() || undefined,
        }))
      : [];

    return { l5, l15, l40, opp };
  }

  function xsBars(scores: number[], opp: XsOpp[]){
    const maxH = 96; // zone barres
    const minH = 10;
    return (
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8, marginTop: 10 }}>
        {scores.map((raw: any, idx: number) => {
          const score = xsClamp(Number(raw) || 0, 0, 100);
          const h = xsClamp(Math.round((score / 100) * maxH), minH, maxH);
          const bg = xsScoreColor(score);
          const meta = opp?.[idx] || {};
          return (
            <View key={String(idx)} style={{ flex: 1, alignItems: "center" }}>
              <View style={{ width: "100%", height: maxH, justifyContent: "flex-end" }}>
                <View style={{ width: "100%", height: h, borderRadius: 10, backgroundColor: bg, alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ color: "#0B0B0B", fontWeight: "900", fontSize: 12 }}>{Math.round(score)}</Text>
                </View>
              </View>

              {/* Logo club adverse sous la barre (fallback si absent) */}
              <View style={{ marginTop: 6, height: 18, alignItems: "center", justifyContent: "center" }}>
                {meta?.logoUrl ? (
                  <Image source={{ uri: meta.logoUrl }} style={{ width: 16, height: 16, borderRadius: 8 }} />
                ) : (
                  <Text style={{ color: theme.muted, fontSize: 10 }}>
                    {meta?.name ? String(meta.name).slice(0, 3).toUpperCase() : "—"}
                  </Text>
                )}
              </View>
            </View>
          );
        })}
      </View>
    );
  }
const params = useLocalSearchParams();
  const id = String((params as any)?.id ?? "").trim();
  const playerSlugParam = String((params as any)?.playerSlug ?? "").trim();

  const card = useMemo(() => {
    if (!id) return null;
    return xsCardNavGet(id);
  }, [id]);

  const playerSlug = useMemo(() => {
    const fromCard =
      (card as any)?.anyPlayer?.slug ??
      (card as any)?.player?.slug ??
      (card as any)?.playerSlug ??
      "";
    return String(playerSlugParam || fromCard || "").trim();
  }, [playerSlugParam, card]);

  const [l5, setL5] = useState<number[] | null>(null);
  const [l15, setL15] = useState<number[] | null>(null);
  const [l40, setL40] = useState<number[] | null>(null);
  const [activeSeries, setActiveSeries] = useState<"L5" | "L15" | "L40">("L5");
  const [l5State, setL5State] = useState<"idle" | "loading" | "ok" | "err">("idle");

  /* XS_CARD_DETAIL_L5_DEBUG_PANEL_V1 */
  const [xsPerfDebug, setXsPerfDebug] = useState<any>(null);
  const [xsPerfErr, setXsPerfErr] = useState<string>("");

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!playerSlug) {
        setL5(null);
        setL5State("idle");
        return;
      }

      setL5State("loading");
      try {
        const resp = await publicPlayerPerformance(playerSlug as any);
        
        try { setXsPerfDebug(resp); } catch (e) {}
        try { setXsPerfErr(""); } catch (e) {}
        if (cancelled) return;
                const extracted = xsExtractL5(resp, card);

        // XS_FIX_L5_EXTRACTION_V3: prefer raw recentScores (shape from backend)
        const scores =
          Array.isArray((resp as any)?.recentScores)
            ? (resp as any).recentScores.slice(0, 5)
            : (typeof (resp as any)?.l5 === "number" ? [(resp as any).l5] : []);

        setL5(scores && scores.length ? scores : extracted);
        /* XS_SORARE_SET_SERIES_V1 */
        try {
          const series = xsPickSeries(resp as any);
          const l15Scores = Array.isArray(series?.l15) ? series.l15.slice(0, 15) : [];
          const l40Scores = Array.isArray(series?.l40) ? series.l40.slice(0, 40) : [];
          setL15(l15Scores && l15Scores.length ? l15Scores : null);
          setL40(l40Scores && l40Scores.length ? l40Scores : null);
        } catch (e) {}
setL5State("ok");} catch (e) {
        if (cancelled) return;
        setL5(null);
        setL5State("err");
        try { setXsPerfErr(String((e as any)?.message || e || "error")); } catch (ee) {}
      }
    }

    run();
    return () => { cancelled = true; };
  }, [playerSlug, card]);

  if (false && !card) { /* XS_REMOVE_CARTE_INTROUVABLE_V2 */
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg, padding: 16, justifyContent: "center" }}>
        <Text style={{ color: theme.text, fontWeight: "900", fontSize: 18 }}>Carte introuvable</Text>
        <Text style={{ color: theme.muted, marginTop: 8 }}>
          Cache navigation manquant (xsCardNavGet). On affiche quand même L5 + debug via playerSlug.
        </Text>

        {XS_SHOW_DEBUG ? (
        <View style={{ marginTop: 14, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 14, backgroundColor: theme.panel, borderWidth: 1, borderColor: theme.stroke }}>
          <Text style={{ color: theme.text, fontWeight: "900" }}>XS_CARD_DETAIL_PROBE_V5 (hidden) ✅</Text>
          <Text style={{ color: theme.muted, marginTop: 6 }}>id: {id || "—"}</Text>
          <Text style={{ color: theme.muted, marginTop: 2 }}>playerSlug: {playerSlug || "—"}</Text>
        </View>
        ) : null}

        {/* XS_SHOW_DEBUG_WHEN_CARD_NULL_V1 */}
        <View style={{ marginTop: 12, borderRadius: 14, borderWidth: 1, borderColor: theme.stroke, backgroundColor: theme.panel, padding: 12 }}>
          <Text style={{ color: theme.text, fontWeight: "900" }}>DEBUG perf (temp) 🧪</Text>
          <Text style={{ color: theme.muted, marginTop: 6, fontSize: 12 }}>state: {String(l5State)}</Text>
          {!!xsPerfErr && <Text style={{ color: theme.muted, marginTop: 4, fontSize: 12 }}>err: {xsPerfErr}</Text>}
          <Text style={{ color: theme.muted, marginTop: 4, fontSize: 12 }}>
            keys: {xsPerfDebug ? Object.keys(xsPerfDebug as any).join(", ") : "—"}
          </Text>
          <Text style={{ color: theme.muted, marginTop: 4, fontSize: 12 }}>
            l5Extracted: {Array.isArray(l5) ? "[" + l5.join(", ") + "]" : "—"}
          </Text>
          <Text style={{ color: theme.muted, marginTop: 8, fontSize: 11 }}>
            preview: {xsPerfDebug ? JSON.stringify(xsPerfDebug).slice(0, 600) : "—"}
          </Text>
        </View>

        {/* L5 (bar chart) visible même sans card */}
        <View style={{ marginTop: 12, borderRadius: 14, borderWidth: 1, borderColor: theme.stroke, backgroundColor: theme.panel, padding: 12 }}>
          <Text style={{ color: theme.text, fontWeight: "900" }}>L5</Text>
          <Text style={{ color: theme.muted, marginTop: 4, fontSize: 12 }}>
            {l5State === "loading" ? "Chargement…" : (l5State === "err" ? "Erreur de chargement" : " ")}
          </Text>

          {Array.isArray(l5) && l5.length > 0 ? (
            <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8, marginTop: 10, height: 110 }}>
              {l5.map((s: number, idx: number) => {
                const score = clamp(Number(s) || 0, 0, 100);
                const h = clamp(Math.round((score / 100) * 100), 6, 100);
                const bg = xsScoreColor(score);
                return (
                  <View key={String(idx)} style={{ flex: 1, alignItems: "center", justifyContent: "flex-end" }}>
                    <View style={{ width: "100%", height: h, borderRadius: 10, backgroundColor: bg, alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ color: "#0B0B0B", fontWeight: "900", fontSize: 12 }}>{Math.round(score)}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <Text style={{ color: theme.muted, marginTop: 10 }}>
              {playerSlug ? "Aucun score L5 disponible." : "playerSlug manquant."}
            </Text>
          )}
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
      {XS_SHOW_DEBUG ? (
      <View style={{ borderRadius: 14, borderWidth: 1, borderColor: theme.stroke, backgroundColor: theme.panel, padding: 12 }}>
        <Text style={{ color: theme.text, fontWeight: "900" }}>XS_CARD_DETAIL_PROBE_V5 ✅</Text>
        <Text style={{ color: theme.muted, marginTop: 6 }}>id: {id || "—"}</Text>
        <Text style={{ color: theme.muted, marginTop: 2 }}>playerSlug: {playerSlug || "—"}</Text>
      </View>
      ) : null}

      

      {/* XS_CARD_DETAIL_L5_DEBUG_PANEL_V1 — DEBUG SHAPE */}
      <View style={{ borderRadius: 14, borderWidth: 1, borderColor: theme.stroke, backgroundColor: theme.panel, padding: 12 }}>
        <Text style={{ color: theme.text, fontWeight: "900" }}>DEBUG perf (temp) 🧪</Text>
        <Text style={{ color: theme.muted, marginTop: 6, fontSize: 12 }}>state: {String(l5State)}</Text>
        {!!xsPerfErr && <Text style={{ color: theme.muted, marginTop: 4, fontSize: 12 }}>err: {xsPerfErr}</Text>}
        <Text style={{ color: theme.muted, marginTop: 4, fontSize: 12 }}>keys: {xsPerfDebug ? Object.keys(xsPerfDebug as any).join(", ") : "—"}</Text>
        <Text style={{ color: theme.muted, marginTop: 4, fontSize: 12 }}>
          l5Extracted: {Array.isArray(l5) ? "[" + l5.join(", ") + "]" : "—"}
        </Text>
        <Text style={{ color: theme.muted, marginTop: 8, fontSize: 11 }}>
          preview: {xsPerfDebug ? JSON.stringify(xsPerfDebug).slice(0, 600) : "—"}
        </Text>
      </View>

      <Text style={{ color: theme.text, fontWeight: "900", fontSize: 20 }} numberOfLines={2}>
        {pickStr((card as any)?.playerName)}
      </Text>
      <Text style={{ color: theme.muted }} numberOfLines={2}>
        {pickStr((card as any)?.teamName)} • {pickStr((card as any)?.position)} • {pickStr((card as any)?.seasonYear)}
      </Text>

      {/* L5 (bar chart) */}
      <View style={{ borderRadius: 14, borderWidth: 1, borderColor: theme.stroke, backgroundColor: theme.panel, padding: 12 }}>
        <Text style={{ color: theme.text, fontWeight: "900" }}>L5</Text>
        <Text style={{ color: theme.muted, marginTop: 4, fontSize: 12 }}>
          {l5State === "loading" ? "Chargement…" : (l5State === "err" ? "Erreur de chargement" : " ")}
        </Text>

        {Array.isArray(l5) && l5.length > 0 ? (
          <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8, marginTop: 10, height: 110 }}>
            {l5.map((s: number, idx: number) => {
              const score = clamp(Number(s) || 0, 0, 100);
              const h = clamp(Math.round((score / 100) * 100), 6, 100);
              const bg = xsScoreColor(score);
              return (
                <View key={String(idx)} style={{ flex: 1, alignItems: "center", justifyContent: "flex-end" }}>
                  <View style={{ width: "100%", height: h, borderRadius: 10, backgroundColor: bg, alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ color: "#0B0B0B", fontWeight: "900", fontSize: 12 }}>{Math.round(score)}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <Text style={{ color: theme.muted, marginTop: 10 }}>
            {playerSlug ? "Aucun score L5 disponible." : "playerSlug manquant."}
          </Text>
        )}
      </View>

            {/* XS_SORARE_CHART_RENDER_V1 */}
      <View style={{ marginTop: 12, borderRadius: 14, borderWidth: 1, borderColor: theme.stroke, backgroundColor: theme.panel, padding: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={{ color: theme.text, fontWeight: "900" }}>Forme</Text>

          <View style={{ flexDirection: "row", gap: 8 }}>
            {(["L5","L15","L40"] as const).map((k) => {
              const active = activeSeries === k;
              return (
                <Text
                  key={k}
                  onPress={() => setActiveSeries(k)}
                  style={{
                    color: active ? theme.text : theme.muted,
                    fontWeight: active ? "900" : "700",
                    paddingVertical: 6,
                    paddingHorizontal: 10,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: active ? theme.stroke : "transparent",
                    backgroundColor: active ? theme.bg : "transparent",
                    overflow: "hidden",
                    fontSize: 12
                  }}
                >
                  {k}
                </Text>
              );
            })}
          </View>
        </View>

        <Text style={{ color: theme.muted, marginTop: 6, fontSize: 12 }}>
          {l5State === "loading" ? "Chargement…" : (l5State === "err" ? "Erreur de chargement" : " ")}
        </Text>

        {(() => {
          const base = xsPerfDebug || {};
          const series = xsPickSeries(base as any);
          const opp5 = Array.isArray(series?.opp) ? series.opp.slice(0, 5) : [];

          const scores =
            activeSeries === "L15" ? (Array.isArray(l15) ? l15.slice(0, 5) : []) :
            activeSeries === "L40" ? (Array.isArray(l40) ? l40.slice(0, 5) : []) :
            (Array.isArray(l5) ? l5.slice(0, 5) : []);

          if (Array.isArray(scores) && scores.length > 0) {
            return xsBars(scores as any, opp5 as any);
          }

          return (
            <Text style={{ color: theme.muted, marginTop: 10 }}>
              {playerSlug ? "Aucun score disponible." : "playerSlug manquant."}
            </Text>
          );
        })()}
      </View>
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








