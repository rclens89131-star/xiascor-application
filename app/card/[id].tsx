import React, { useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ScrollView, Text, View, Image } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { theme } from "../../src/theme";
import { xsCardNavGet } from "../_lib/cardNavCache";
import { publicPlayerPerformance } from "../../src/scoutApi";
import SorarePerformanceChart from "../../src/components/SorarePerformanceChart";

/**
 * XS_CARD_DETAIL_CLEAN_V1
 * - PS-safe (pas de backticks)
 * - Aucun bloc DEBUG / PROBE / Alert
 * - Affiche un chart "Forme" L5/L15/L40 basé sur /public-player-performance
 */


type XsOppAny = any;

/* XS_CARD_DETAIL_DEVICEID_V1 */
const XS_CARD_DEVICE_ID_KEYS = [
  "xs_device_id",
  "xs_device_id_v1",
  "XS_DEVICE_ID_V1",
  "xs_jwt_device_id_v1",
  "XS_JWT_DEVICE_ID_V1",
  "xs_jwt_device_id",
  "jwt_device_id",
  "deviceId",
];

/* XS_CARD_FORCE_OAUTH_DEVICE_PROBE_V1
   Preuve temporaire:
   - force le deviceId OAuth backend connu pour vérifier que les adversaires
     remontent bien dans l'écran carte.
   - Si ce probe marche, le problème réel = AsyncStorage / mauvais deviceId lu sur iPhone.
*/
const XS_CARD_FORCE_DEVICE_ID = "dev_authperf_1772197967309_hgcxmldw";

async function xsLoadPreferredDeviceId(): Promise<string> {
  for (const k of XS_CARD_DEVICE_ID_KEYS) {
    try {
      const v = await AsyncStorage.getItem(k);
      const s = String(v || "").trim();
      if (s) return s;
    } catch {}
  }
  return "";
}

// XS_OPPONENT_EXTRACT_V1: robust extraction for opponent logos/names from various API shapes
function xsPickString(...vals: any[]): string | null {
  for (const v of vals) {
    if (typeof v === "string" && v.trim().length > 0) return v;
  }
  return null;
}

function xsOppLogoUrlFromAny(o: XsOppAny): string | null {
  if(!o) return null;
  const a = o?.logoUrl;
  const b = o?.club?.pictureUrl || o?.club?.logoUrl || o?.club?.avatarUrl;
  const c = o?.opponentClub?.pictureUrl || o?.opponentClub?.logoUrl || o?.opponentClub?.avatarUrl;
  const d = o?.opponent?.club?.pictureUrl || o?.opponent?.club?.logoUrl || o?.opponent?.club?.avatarUrl;
  const e = o?.opponentTeam?.pictureUrl || o?.opponentTeam?.logoUrl || o?.opponentTeam?.avatarUrl;
  const f = o?.opponent?.pictureUrl || o?.opponent?.logoUrl || o?.opponent?.avatarUrl;
  const g = o?.team?.pictureUrl || o?.team?.logoUrl || o?.team?.avatarUrl;
  const h = o?.match?.opponentClub?.pictureUrl || o?.match?.opponentClub?.logoUrl || o?.match?.opponentClub?.avatarUrl;
  return xsPickString(a,b,c,d,e,f,g,h);
}

function xsOppShortFromAny(o: XsOppAny): string | null {
  if(!o) return null;
  const a = o?.name;
  const b = o?.club?.name || o?.club?.shortName || o?.club?.slug;
  const c = o?.opponentClub?.name || o?.opponentClub?.shortName || o?.opponentClub?.slug;
  const d = o?.opponent?.club?.name || o?.opponent?.club?.shortName || o?.opponent?.club?.slug;
  const e = o?.opponentTeam?.name || o?.opponentTeam?.shortName || o?.opponentTeam?.slug;
  const f = o?.opponent?.name || o?.opponent?.shortName || o?.opponent?.slug;
  const g = o?.team?.name || o?.team?.shortName || o?.team?.slug;
  const h = o?.match?.opponentClub?.name || o?.match?.opponentClub?.shortName || o?.match?.opponentClub?.slug;
  return xsPickString(a,b,c,d,e,f,g,h);
}

function xsOpponentLogoUrls(list: any): (string | null)[] {
  const arr = Array.isArray(list) ? list : [];
  return arr.map((o) => xsOppLogoUrlFromAny(o));
}

function xsOpponentShort(list: any): (string | null)[] {
  const arr = Array.isArray(list) ? list : [];
  return arr.map((o) => xsOppShortFromAny(o));
}

function clamp(n: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, n));
}

function pickStr(v: any): string {
  return typeof v === "string" && v.trim() ? v.trim() : "—";
}

function asNum(v: any): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function formatEur(v: any): string {
  const n = asNum(v);
  return n === null ? "—" : (n.toFixed(2) + " €");
}

type XsOpp = { logoUrl?: string; name?: string };

function xsScoreColor(score: number): string {
  const s = clamp(Number(score) || 0, 0, 100);
  if (s <= 25) return "#E04545"; // rouge
  if (s <= 35) return "#F08A24"; // orange
  if (s <= 55) return "#F2C230"; // jaune
  if (s <= 65) return "#A7E22E"; // vert pomme
  if (s <= 75) return "#2E9E4E"; // vert foncé
  return "#5BC0EB";              // bleu clair
}

function xsPickSeries(resp: any) {
  const l5 = Array.isArray(resp?.recentScores) ? resp.recentScores.slice(0, 5) : [];
  const l15 = Array.isArray(resp?.recentScores15) ? resp.recentScores15.slice(0, 15) : (Array.isArray(resp?.recentScores) ? resp.recentScores.slice(0, 15) : []);
  const l40 = Array.isArray(resp?.recentScores40) ? resp.recentScores40.slice(0, 40) : (Array.isArray(resp?.recentScores) ? resp.recentScores.slice(0, 40) : []);

  
    // XS_AVG_HELPER_NEAR_BLOCK_V1
  function xsAvg(arr: any[]): number {
    if (!Array.isArray(arr) || arr.length === 0) return 0;
    const nums = arr.map((x) => (typeof x === "number" ? x : Number(x))).filter((n) => Number.isFinite(n));
    if (nums.length === 0) return 0;
    const sum = nums.reduce((a, b) => a + b, 0);
    return Number((sum / nums.length).toFixed(1));
  }

  // XS_AVG_L5L15L40_V1
  const avg5 = xsAvg(l5);
  const avg15 = xsAvg(l15);
  const avg40 = xsAvg(l40);
const rawOpp =
    Array.isArray(resp?.recentOpponents) ? resp.recentOpponents :
    Array.isArray(resp?.opponents) ? resp.opponents :
    [];

  const opp: XsOpp[] = Array.isArray(rawOpp)
    ? rawOpp.map((o: any) => ({
        logoUrl: String(o?.logoUrl || o?.clubLogoUrl || o?.crestUrl || o?.pictureUrl || "").trim() || undefined,
        name: String(o?.name || o?.clubName || o?.shortName || o?.slug || "").trim() || undefined,
      }))
    : [];

  return { l5, l15, l40, opp };
}

function xsBars(scores: number[], opp: XsOpp[]) {
  const maxH = 96;
  const minH = 10;

  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8, marginTop: 10 }}>
      {scores.map((raw: any, idx: number) => {
        const score = clamp(Number(raw) || 0, 0, 100);
        const h = clamp(Math.round((score / 100) * maxH), minH, maxH);
        const bg = xsScoreColor(score);
        const meta = opp?.[idx] || {};
        return (
          <View key={String(idx)} style={{ flex: 1, alignItems: "center" }}>
            <View style={{ width: "100%", height: maxH, justifyContent: "flex-end" }}>
              <View style={{ width: "100%", height: h, borderRadius: 10, backgroundColor: bg, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ color: "#0B0B0B", fontWeight: "900", fontSize: 12 }}>{Math.round(score)}</Text>
              </View>
            </View>

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

export default function CardDetailScreen() {
  const params = useLocalSearchParams();
  const id = String((params as any)?.id ?? "").trim();
  const playerSlugParam = String((params as any)?.playerSlug ?? "").trim();

  const card = useMemo(() => {
    if (!id) return null;
    try { return xsCardNavGet(id); } catch { return null; }
  }, [id]);

  const playerSlug = useMemo(() => {
    const fromCard =
      (card as any)?.anyPlayer?.slug ??
      (card as any)?.player?.slug ??
      (card as any)?.playerSlug ??
      "";
    return String(playerSlugParam || fromCard || "").trim();
  }, [playerSlugParam, card]);

  const [perf, setPerf] = useState<any>(null);
  const [state, setState] = useState<"idle" | "loading" | "ok" | "err">("idle");
  const [activeSeries, setActiveSeries] = useState<"L5" | "L15" | "L40">("L5");
  const [deviceId, setDeviceId] = useState("");
  const [deviceReady, setDeviceReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      try {
        const id = String(XS_CARD_FORCE_DEVICE_ID || "").trim() || await xsLoadPreferredDeviceId();
        if (!cancelled) setDeviceId(String(id || "").trim());
      } catch {
        if (!cancelled) setDeviceId("");
      } finally {
        if (!cancelled) setDeviceReady(true);
      }
    }

    boot();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!playerSlug) {
        setPerf(null);
        setState("idle");
        return;
      }

      if (!deviceReady) {
        setState("loading");
        return;
      }

      setState("loading");
      try {
        const resp = await publicPlayerPerformance(playerSlug as any, {
          deviceId: deviceId || undefined,
        });
        if (cancelled) return;
        setPerf(resp || {});
        setState("ok");
      } catch (e) {
        if (cancelled) return;
        setPerf(null);
        setState("err");
      }
    }

    run();
    return () => { cancelled = true; };
  }, [playerSlug, deviceId, deviceReady]);

  const price = (card as any)?.price || {};
  const avg7d = asNum(price?.avg7dEur);
  const avg30d = asNum(price?.avg30dEur);
  const trend = (avg7d !== null && avg30d !== null) ? (avg7d - avg30d) : null;
  const trendLabel = trend === null ? "—" : ((trend >= 0 ? "+" : "") + trend.toFixed(2) + " €");

  const playerName = pickStr((card as any)?.playerName ?? perf?.playerName);
  const teamName = pickStr((card as any)?.teamName ?? perf?.activeClub?.name);
  const position = pickStr((card as any)?.position ?? perf?.position);
  const seasonYear = pickStr((card as any)?.seasonYear);

  const series = xsPickSeries(perf || {});

/* XS_CARD_CHART_VISUAL_ORDER_V1
   On inverse l'ordre visuel pour afficher les 5 matchs de gauche -> droite
   dans l'ordre attendu à l'écran. On inverse scores + adversaires ensemble
   pour conserver l'alignement exact barres / logos / noms. */
const opp5 = Array.isArray(series?.opp) ? [...series.opp].slice(0, 5).reverse() : [];
const scores =
  activeSeries === "L15" ? (Array.isArray(series?.l15) ? [...series.l15].slice(0, 5).reverse() : []) :
  activeSeries === "L40" ? (Array.isArray(series?.l40) ? [...series.l40].slice(0, 5).reverse() : []) :
  (Array.isArray(series?.l5) ? [...series.l5].slice(0, 5).reverse() : []);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.bg }} contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Text style={{ color: theme.text, fontWeight: "900", fontSize: 20 }} numberOfLines={2}>
        {playerName}
      </Text>
      <Text style={{ color: theme.muted }} numberOfLines={2}>
        {teamName} • {position} • {seasonYear}
      </Text>

      {/* Forme (L5/L15/L40) */}
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
                    fontSize: 12,
                  }}
                >
                  {k}
                </Text>
              );
            })}
          </View>
        </View>

        <Text style={{ color: theme.muted, marginTop: 6, fontSize: 12 }}>
          {state === "loading" ? "Chargement…" : (state === "err" ? "Erreur de chargement" : " ")}
        </Text>

        {Array.isArray(scores) && scores.length > 0 ? (
          <SorarePerformanceChart
  recentScores={scores as any}
  opponentLogoUrls={xsOpponentLogoUrls(opp5)}
  opponentShort={xsOpponentShort(opp5)}
  title="Forme"
/>
        ) : (
          <Text style={{ color: theme.muted, marginTop: 10 }}>
            {playerSlug ? "Aucun score disponible." : "playerSlug manquant."}
          </Text>
        )}
      </View>

      {/* L15 (simple) */}
      <View style={{ borderRadius: 14, borderWidth: 1, borderColor: theme.stroke, backgroundColor: theme.panel, padding: 12 }}>
        <Text style={{ color: theme.text, fontWeight: "900" }}>L15</Text>
        <Text style={{ color: theme.muted, marginTop: 6, fontSize: 16 }}>
          {(() => {
                        // XS_UI_USE_AVG15_V1
            const v = asNum(avg15 || (card as any)?.l15 || perf?.l15);
            return v === null ? "—" : v.toFixed(1);
          })()}
        </Text>
      </View>

      
      {/* XS_UI_ADD_L40_SIMPLE_V1 */}
      <View style={{ marginTop: 10, padding: 12, borderRadius: 14, backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border }}>
        <Text style={{ color: theme.text, fontWeight: "900" }}>L40</Text>
        <Text style={{ color: theme.muted, marginTop: 6 }}>
          {(() => {
            const v = asNum(avg40 || (card as any)?.l40 || perf?.l40);
            return Number.isFinite(v) && v > 0 ? v.toFixed(1) : "—";
          })()}
        </Text>
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

      {/* Détails */}
      <View style={{ borderRadius: 14, borderWidth: 1, borderColor: theme.stroke, backgroundColor: theme.panel, padding: 12 }}>
        <Text style={{ color: theme.text, fontWeight: "900" }}>Détails</Text>
        <Text style={{ color: theme.muted, marginTop: 6 }}>
          ID: {pickStr((card as any)?.id ?? (card as any)?.cardId ?? (card as any)?.slug ?? id)}
        </Text>
        <Text style={{ color: theme.muted }}>Club: {teamName}</Text>
        <Text style={{ color: theme.muted }}>Poste: {position}</Text>
        <Text style={{ color: theme.muted }}>Saison: {seasonYear}</Text>
      </View>
    </ScrollView>
  );
}












