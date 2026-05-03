import React, { useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ScrollView, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { theme } from "../../src/theme";
import { xsCardNavGet } from "../_lib/cardNavCache";
import { publicPlayerPerformance } from "../../src/scoutApi";
import SorarePerformanceChart from "../../src/components/SorarePerformanceChart";
import FifaRadarChart from "../../src/components/FifaRadarChart";

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

function avgOf(arr: any[]): number | null {
  /* XS_DNT_ZERO_NOT_COUNTED_V1 */
  if (!Array.isArray(arr)) return null;
  const nums = arr
    .map((x: any) => Number(x?.scoreSorare ?? x?.score ?? x))
    .filter((n: number) => Number.isFinite(n) && n > 0);
  if (!nums.length) return null;
  return Math.round(nums.reduce((a: number, b: number) => a + b, 0) / nums.length);
  /* XS_DNT_ZERO_NOT_COUNTED_V1_END */
}

/* XS_FIFA_RADAR_REAL_STATS_V1 */
function xsRadarClampV1(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(100, v));
}

function xsRadarNumV1(v: any): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function xsRadarAvgV1(values: Array<number | null | undefined>): number | null {
  const nums = values.filter((n): n is number => typeof n === "number" && Number.isFinite(n));
  if (!nums.length) return null;
  return nums.reduce((sum, n) => sum + n, 0) / nums.length;
}

function xsRadarStdDevV1(values: number[]): number {
  if (!values.length) return 0;
  const avg = xsRadarAvgV1(values) ?? 0;
  const variance = values.reduce((sum, n) => sum + Math.pow(n - avg, 2), 0) / values.length;
  return Math.sqrt(variance);
}

function xsRadarRateV1<T>(values: T[], predicate: (value: T) => boolean): number {
  if (!values.length) return 0;
  return values.filter(predicate).length / values.length;
}

function xsBuildFifaRadarValuesFromHistoryV1(
  historyChart: any[],
  fallbackAvg: { avg5?: number | null; avg15?: number | null; avg40?: number | null },
  position: string
) {
  const fallbackScore =
    xsRadarAvgV1([fallbackAvg?.avg5, fallbackAvg?.avg15, fallbackAvg?.avg40]) ?? 50;

  const rows = (Array.isArray(historyChart) ? historyChart : [])
    .slice()
    .sort((a: any, b: any) => {
      const da = new Date(a?.matchDate || a?.date || 0).getTime();
      const db = new Date(b?.matchDate || b?.date || 0).getTime();
      return db - da;
    })
    .slice(0, 40)
    .map((row: any) => ({
      score: xsRadarNumV1(row?.scoreSorare ?? row?.score ?? row?.totalScore),
      minutes: xsRadarNumV1(row?.minutes),
      decisiveScore: xsRadarNumV1(row?.decisiveScore),
      allAroundScore: xsRadarNumV1(row?.allAroundScore),
    }))
    .filter((row: any) => row.score != null);

  const scores = rows.map((row: any) => xsRadarClampV1(row.score));
  const matches = scores.length;
  const confidence = Math.min(1, matches / 20);
  const fallbackValues = [
    { label: "Forme", value: fallbackScore },
    { label: "Régularité", value: fallbackScore },
    { label: "Temps de jeu", value: fallbackScore },
    { label: "Impact", value: fallbackScore },
    { label: "Attaque", value: fallbackScore },
    { label: "Création", value: fallbackScore },
    { label: "Défense", value: fallbackScore },
    { label: "Fiabilité", value: fallbackScore },
  ];

  if (!matches) {
    return { confidence, matches, position, values: fallbackValues };
  }

  const l5 = xsRadarAvgV1(scores.slice(0, 5)) ?? fallbackAvg?.avg5 ?? fallbackScore;
  const l15 = xsRadarAvgV1(scores.slice(0, 15)) ?? fallbackAvg?.avg15 ?? fallbackScore;
  const l40 = xsRadarAvgV1(scores.slice(0, 40)) ?? fallbackAvg?.avg40 ?? fallbackScore;
  const form = xsRadarClampV1(l5 * 0.5 + l15 * 0.3 + l40 * 0.2);

  const stdDev = xsRadarStdDevV1(scores);
  const badScoreRate = xsRadarRateV1(scores, (score) => score < 30);
  const highScoreRate = xsRadarRateV1(scores, (score) => score >= 60);

  const minuteRows = rows.filter((row: any) => row.minutes != null && row.minutes >= 0);
  const minutesAvg = xsRadarAvgV1(minuteRows.map((row: any) => row.minutes));
  const lowMinuteRate = xsRadarRateV1(minuteRows, (row: any) => row.minutes < 30);
  const startLikeRate = xsRadarRateV1(minuteRows, (row: any) => row.minutes >= 60);
  const missingMinutesRate = matches ? (matches - minuteRows.length) / matches : 0;

  const avgScore = xsRadarAvgV1(scores) ?? fallbackScore;
  const avgDecisive = xsRadarAvgV1(rows.map((row: any) => row.decisiveScore)) ?? avgScore;
  const allAroundScores = rows
    .map((row: any) => row.allAroundScore)
    .filter((n: any): n is number => typeof n === "number" && Number.isFinite(n));
  const avgAllAround = xsRadarAvgV1(allAroundScores);
  const normalizedAllAround = avgAllAround == null ? avgScore : xsRadarClampV1(50 + avgAllAround);
  const highAllAroundRate = xsRadarRateV1(allAroundScores, (score) => score >= 15);

  const regularity = xsRadarClampV1(100 - stdDev * 2.2 - badScoreRate * 20);
  const gameTime =
    minutesAvg == null
      ? xsRadarClampV1(fallbackScore)
      : xsRadarClampV1((minutesAvg / 90) * 70 + startLikeRate * 30);
  const impact = xsRadarClampV1(avgScore * 0.45 + avgDecisive * 0.35 + normalizedAllAround * 0.2);
  const attack = xsRadarClampV1(highScoreRate * 40 + avgDecisive * 0.45 + form * 0.15);
  const creation = xsRadarClampV1(normalizedAllAround * 0.65 + regularity * 0.2 + highAllAroundRate * 15);
  const reliability = xsRadarClampV1(
    100 -
      lowMinuteRate * 35 -
      badScoreRate * 35 -
      missingMinutesRate * 15 -
      stdDev * 0.8
  );
  const defense = xsRadarClampV1(regularity * 0.45 + reliability * 0.35 + normalizedAllAround * 0.2);

  return {
    confidence,
    matches,
    position,
    values: [
      { label: "Forme", value: form },
      { label: "Régularité", value: regularity },
      { label: "Temps de jeu", value: gameTime },
      { label: "Impact", value: impact },
      { label: "Attaque", value: attack },
      { label: "Création", value: creation },
      { label: "Défense", value: defense },
      { label: "Fiabilité", value: reliability },
    ],
  };
}
/* XS_FIFA_RADAR_REAL_STATS_V1_END */

/* XS_SCORE_COLOR_L5_L15_L40_V1 */
function xsScoreColorL5L15L40(score: number | null): string {
  if (typeof score !== "number" || !Number.isFinite(score)) return "#9CA3AF";
  if (score >= 65) return "#38BDF8"; // bleu = excellent
  if (score >= 50) return "#22C55E"; // vert = bon
  if (score >= 40) return "#FACC15"; // jaune = moyen
  return "#EF4444"; // rouge = faible
}
/* XS_SCORE_COLOR_L5_L15_L40_V1_END */


const XS_HISTORY_CHART_CLOUDRUN_V2 = "https://xiascor-backend-tssdy62zqa-ez.a.run.app";

const XS_HISTORY_SYNC_CLOUDRUN_V1 = "https://xiascor-backend-tssdy62zqa-ez.a.run.app";


export default function CardDetailScreen() {
  const params = useLocalSearchParams();
  const id = String((params as any)?.id ?? "").trim();
  const playerSlugParam = String((params as any)?.playerSlug ?? "").trim();

  const card = useMemo(() => {
    if (!id) return null;
    try {
      return xsCardNavGet(id);
    } catch {
      return null;
    }
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
  const [historyChart, setHistoryChart] = useState<any[]>([]); // XS_HISTORY_CHART_LOGOS_LOAD_V1
  const [state, setState] = useState<"idle" | "loading" | "ok" | "err">("idle");
  const [error, setError] = useState("");
  const [activeSeries, setActiveSeries] = useState<"L5" | "L15" | "ALL">("L5");

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!playerSlug) {
        if (!cancelled) {
          setPerf(null);
          setState("idle");
          setError("");
        }
        return;
      }

      if (!cancelled) {
        setState("loading");
        setError("");
      }

      try {
                // XS_CARD_DETAIL_PASS_DEVICEID_TO_PERF_V1 BEGIN
        let xsPerfDeviceId = "";
        try {
          const keys = [
            "xs_device_id",
            "xs_device_id_v1",
            "XS_DEVICE_ID_V1",
            "xs_jwt_device_id_v1",
            "XS_JWT_DEVICE_ID_V1",
            "jwt_device_id",
            "deviceId"
          ];

          for (const k of keys) {
            const v = await AsyncStorage.getItem(k);
            if (v && String(v).trim()) {
              xsPerfDeviceId = String(v).trim();
              break;
            }
          }
        } catch {}

        const resp = await publicPlayerPerformance(
          playerSlug,
          xsPerfDeviceId ? { deviceId: xsPerfDeviceId } : undefined
        );
        // XS_CARD_DETAIL_PASS_DEVICEID_TO_PERF_V1 END
        if (cancelled) return;
        setPerf(resp || null);

        // XS_HISTORY_CHART_LOGOS_LOAD_V1
        try {
          const base = XS_HISTORY_CHART_CLOUDRUN_V2.replace(/\/+$/, "");
          const histUrl = `${base}/history/player-chart/${encodeURIComponent(playerSlug)}?limit=500`;
          console.log("[card history logos] url=", histUrl);
          const histResp = await fetch(histUrl);
          const histJson = await histResp.json();
          const items = Array.isArray(histJson?.items) ? histJson.items : [];
          console.log("[card history logos] count=", items.length, "logos=", items.map((x:any)=>x?.opponentLogoUrl).filter(Boolean).length);
          if (!cancelled) setHistoryChart(items);
        } catch (histErr:any) {
          console.log("[card history logos] error=", String(histErr?.message || histErr));
          if (!cancelled) setHistoryChart([]);
        }
        setState("ok");
      } catch (e: any) {
        if (cancelled) return;
        setPerf(null);
        setState("err");
        setError(String(e?.message || e || "Erreur inconnue"));
      }
    }

    run();
return () => { cancelled = true; };
  }, [playerSlug]);

  const playerName = pickStr((card as any)?.anyPlayer?.displayName ?? (card as any)?.player?.displayName ?? perf?.playerName);
  const teamName = pickStr((card as any)?.anyTeam?.name ?? (card as any)?.player?.activeClub?.name ?? perf?.activeClub?.name);
  const position = pickStr((card as any)?.position ?? perf?.position);
  const seasonYear = pickStr((card as any)?.seasonYear);
  const rarity = pickStr((card as any)?.rarityTyped ?? (card as any)?.rarity);
  const serial = (card as any)?.serialNumber != null ? "#" + String((card as any).serialNumber) : "—";

  /* XS_CARD_HISTORY_AUTO_SYNC_V1 */
  useEffect(() => {
    if (!playerSlug) return;

    let cancelled = false;

    (async () => {
      try {
        const base = XS_HISTORY_SYNC_CLOUDRUN_V1.replace(/\/+$/, "");
        const syncUrl = `${base}/history/sync-player-scores`;
        const chartUrl = `${base}/history/player-chart/${encodeURIComponent(playerSlug)}?limit=500`;

        console.log("[card history sync] start", { playerSlug, last: 100 });

        await fetch(syncUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug: playerSlug, last: 100 }),
        });

        const refreshed = await fetch(chartUrl);
        const refreshedJson = await refreshed.json().catch(() => null);
        const refreshedItems = Array.isArray((refreshedJson as any)?.items) ? (refreshedJson as any).items : [];

        if (!cancelled && refreshedItems.length > 0) {
          setHistoryChart(refreshedItems);
        }

        if (!cancelled) {
          console.log("[card history sync] ok", { playerSlug, count: refreshedItems.length });
        }
      } catch (e: any) {
        if (!cancelled) {
          console.log("[card history sync] error", { playerSlug, message: e?.message || String(e) });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [playerSlug]);
  /* XS_CARD_HISTORY_AUTO_SYNC_V1_END */


  const series = useMemo(() => {
    const l5 = Array.isArray((perf as any)?.recentScores) ? (perf as any).recentScores.slice(0, 5) : [];
    const l15 = Array.isArray((perf as any)?.recentScores15)
      ? (perf as any).recentScores15.slice(0, 15)
      : (Array.isArray((perf as any)?.recentScores) ? (perf as any).recentScores.slice(0, 15) : []);
    const l40 = Array.isArray((perf as any)?.recentScores40)
      ? (perf as any).recentScores40.slice(0, 40)
      : (Array.isArray((perf as any)?.recentScores) ? (perf as any).recentScores.slice(0, 40) : []);
    // XS_FIX_CARD_DETAIL_OPPONENTS_FALLBACK_V1 BEGIN
    const opp =
      Array.isArray((perf as any)?.recentOpponents) ? (perf as any).recentOpponents :
      (Array.isArray((perf as any)?.opponents) ? (perf as any).opponents :
      (Array.isArray((perf as any)?.meta?.opponents) ? (perf as any).meta.opponents : []));
    // XS_FIX_CARD_DETAIL_OPPONENTS_FALLBACK_V1 END
    return { l5, l15, l40, opp };
  }, [perf]);

  const scores =
    activeSeries === "L5" ? series.l5 :
    activeSeries === "L15" ? series.l15 :
    series.l40;

  
  // XS_FIX_CARD_DETAIL_OPPONENT_LOGOS_NESTED_V1 BEGIN
  // Sert à afficher le logo du club adverse sous chaque barre de performance.
  // On garde un fallback texte si l'API ne donne pas encore de logo.
      // XS_CARD_DETAIL_LATEST_MATCH_RIGHT_ALL_CARDS_V1
  // On trie les matchs par date ASC pour afficher le plus récent à droite.
  const xsWantedCount = activeSeries === "L5" ? 5 : activeSeries === "L15" ? 15 : 40;
  const xsBaseHistory = Array.isArray(historyChart) && historyChart.length ? historyChart.slice(0, xsWantedCount) : [];
  const xsSortedHistory = xsBaseHistory
    .slice()
    .sort((a: any, b: any) => {
      const da = new Date(a?.matchDate || a?.date || 0).getTime();
      const db = new Date(b?.matchDate || b?.date || 0).getTime();
      return da - db;
    });

  const xsOppSlice = xsSortedHistory.length
    ? xsSortedHistory
    : (Array.isArray(series.opp) ? series.opp.slice(0, scores.length || 5).reverse() : []);

  const xsDisplayScores = xsSortedHistory.length
    ? xsSortedHistory.map((x: any) => Number(x?.scoreSorare ?? x?.score ?? 0))
    : (Array.isArray(scores) ? scores.slice(0, xsWantedCount).reverse() : []);

  function xsPickOpponentLogoUrl(x: any): string | null {
    const raw =
      x?.logoUrl ??
      x?.opponentLogoUrl ??
      x?.clubLogoUrl ??
      x?.teamLogoUrl ??
      x?.crestUrl ??
      x?.logo ??
      x?.pictureUrl ??
      x?.club?.pictureUrl ??
      x?.club?.logoUrl ??
      x?.club?.crestUrl ??
      x?.opponentClub?.pictureUrl ??
      x?.opponentClub?.logoUrl ??
      x?.opponentClub?.crestUrl ??
      x?.opponent?.club?.pictureUrl ??
      x?.opponent?.club?.logoUrl ??
      x?.opponent?.club?.crestUrl ??
      x?.opponentTeam?.pictureUrl ??
      x?.opponentTeam?.logoUrl ??
      x?.opponentTeam?.crestUrl ??
      x?.opponent?.pictureUrl ??
      x?.opponent?.logoUrl ??
      x?.team?.pictureUrl ??
      x?.team?.logoUrl ??
      x?.team?.crestUrl ??
      x?.match?.opponentClub?.pictureUrl ??
      x?.match?.opponentClub?.logoUrl ??
      x?.match?.opponentClub?.crestUrl ??
      null;

    const s = String(raw || "").trim();
    return s.length > 0 ? s : null;
  }

  function xsPickOpponentShort(x: any): string | null {
    const raw =
      x?.shortName ??
      x?.opponentShort ??
      x?.short ??
      x?.code ??
      x?.opponent ??
      x?.name ??
      x?.club?.shortName ??
      x?.club?.name ??
      x?.opponentClub?.shortName ??
      x?.opponentClub?.name ??
      x?.opponent?.club?.shortName ??
      x?.opponent?.club?.name ??
      x?.opponentTeam?.shortName ??
      x?.opponentTeam?.name ??
      x?.opponent?.shortName ??
      x?.opponent?.name ??
      x?.team?.shortName ??
      x?.team?.name ??
      x?.match?.opponentClub?.shortName ??
      x?.match?.opponentClub?.name ??
      null;

    const s = String(raw || "").trim();
    return s.length > 0 ? s : null;
  }

    const xsOpponentLogoUrls = xsOppSlice.map((x: any) => xsPickOpponentLogoUrl(x));
  const xsOpponentShort = xsOppSlice.map((x: any) => xsPickOpponentShort(x));
  // XS_FIX_CARD_DETAIL_OPPONENT_LOGOS_NESTED_V1 END
const avg5 = avgOf(series.l5) ?? asNum((card as any)?.l5) ?? asNum((perf as any)?.l5);
  const avg15 = avgOf(series.l15) ?? asNum((card as any)?.l15) ?? asNum((perf as any)?.l15);
  const avg40 = avgOf(series.l40) ?? asNum((card as any)?.l40) ?? asNum((perf as any)?.l40);
  const xsFifaRadar = useMemo(
    () =>
      xsBuildFifaRadarValuesFromHistoryV1(
        historyChart,
        { avg5, avg15, avg40 },
        position
      ),
    [historyChart, avg5, avg15, avg40, position]
  );

  function pill(label: "L5" | "L15" | "ALL") {
    const active = activeSeries === label;
return (
      <Text
        onPress={() => setActiveSeries(label)}
        style={{
          paddingVertical: 8,
          paddingHorizontal: 12,
          borderRadius: 999,
          overflow: "hidden",
          color: active ? "#0B1220" : theme.text,
          backgroundColor: active ? "#F2C230" : theme.panel,
          borderWidth: 1,
          borderColor: active ? "#F2C230" : theme.stroke,
          fontWeight: "800",
        }}
      >
        {label}
      </Text>
    );
  }
return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.bg }}
      contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 12 }}
    >
      <View style={{ borderRadius: 16, backgroundColor: theme.panel, borderWidth: 1, borderColor: theme.stroke, padding: 14 }}>
        <Text style={{ color: theme.text, fontSize: 22, fontWeight: "900" }}>{playerName}</Text>
        <Text style={{ color: theme.muted, marginTop: 4 }}>{teamName}</Text>

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
          <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: theme.bg, borderWidth: 1, borderColor: theme.stroke }}>
            <Text style={{ color: theme.text, fontWeight: "700" }}>Position: {position}</Text>
          </View>
          <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: theme.bg, borderWidth: 1, borderColor: theme.stroke }}>
            <Text style={{ color: theme.text, fontWeight: "700" }}>Rareté: {rarity}</Text>
          </View>
          <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: theme.bg, borderWidth: 1, borderColor: theme.stroke }}>
            <Text style={{ color: theme.text, fontWeight: "700" }}>Saison: {seasonYear}</Text>
          </View>
          <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: theme.bg, borderWidth: 1, borderColor: theme.stroke }}>
            <Text style={{ color: theme.text, fontWeight: "700" }}>Serial: {serial}</Text>
          </View>
        </View>
      </View>

      <View style={{ borderRadius: 16, backgroundColor: theme.panel, borderWidth: 1, borderColor: theme.stroke, padding: 14 }}>
        <Text style={{ color: theme.text, fontSize: 18, fontWeight: "900" }}>Forme</Text>

        <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
          {pill("L5")}
          {pill("L15")}
          {pill("ALL")}
        </View>

        <View style={{ marginTop: 12 }}>
          {state === "loading" ? (
            <Text style={{ color: theme.muted }}>Chargement…</Text>
          ) : state === "err" ? (
            <Text style={{ color: "#FF7B7B" }}>Erreur de chargement: {error || "inconnue"}</Text>
          ) : scores.length > 0 ? (
            <View style={{ width: "100%", overflow: "hidden" }}>
  {/* XS_CHART_HORIZONTAL_SCROLL_V2 */}
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={true}
    nestedScrollEnabled
    contentContainerStyle={{ paddingRight: 16 }}
  >
    <View style={{ width: Math.max(360, (Array.isArray(xsDisplayScores) ? xsDisplayScores.length : 5) * 58) }}>
      <SorarePerformanceChart
              recentScores={xsDisplayScores as any}
              opponentLogoUrls={xsOpponentLogoUrls}
              opponentShort={xsOpponentShort}
            />
    </View>
  </ScrollView>
  {/* XS_CHART_HORIZONTAL_SCROLL_V2_END */}
</View>
          ) : (
            <Text style={{ color: theme.muted }}>
              {playerSlug ? "Aucun score disponible." : "playerSlug manquant."}
            </Text>
          )}
        </View>
      </View>

      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1, borderRadius: 16, backgroundColor: theme.panel, borderWidth: 1, borderColor: theme.stroke, padding: 14 }}>
          <Text style={{ color: theme.muted, fontSize: 12, fontWeight: "700" }}>L5</Text>
          <Text style={{ color: xsScoreColorL5L15L40(avg5), fontSize: 24, fontWeight: "900", marginTop: 4 }}>
            {avg5 == null ? "—" : String(Math.round(avg5))}
          </Text>
        </View>

        <View style={{ flex: 1, borderRadius: 16, backgroundColor: theme.panel, borderWidth: 1, borderColor: theme.stroke, padding: 14 }}>
          <Text style={{ color: theme.muted, fontSize: 12, fontWeight: "700" }}>L15</Text>
          <Text style={{ color: xsScoreColorL5L15L40(avg15), fontSize: 24, fontWeight: "900", marginTop: 4 }}>
            {avg15 == null ? "—" : String(Math.round(avg15))}
          </Text>
        </View>

        <View style={{ flex: 1, borderRadius: 16, backgroundColor: theme.panel, borderWidth: 1, borderColor: theme.stroke, padding: 14 }}>
          <Text style={{ color: theme.muted, fontSize: 12, fontWeight: "700" }}>L40</Text>
          <Text style={{ color: xsScoreColorL5L15L40(avg40), fontSize: 24, fontWeight: "900", marginTop: 4 }}>
            {avg40 == null ? "—" : String(Math.round(avg40))}
          </Text>
        </View>
      </View>
      {/* XS_FIFA_RADAR_CARD_DETAIL_V1 */}
      <FifaRadarChart
        title="Radar FIFA"
        values={xsFifaRadar.values}
        confidence={xsFifaRadar.confidence}
        matches={xsFifaRadar.matches}
      />
      {/* XS_FIFA_RADAR_CARD_DETAIL_V1_END */}


      <View style={{ borderRadius: 16, backgroundColor: theme.panel, borderWidth: 1, borderColor: theme.stroke, padding: 14, gap: 6 }}>
        <Text style={{ color: theme.text, fontSize: 16, fontWeight: "900" }}>Debug utile minimal</Text>
        <Text style={{ color: theme.muted }}>route id: {id || "—"}</Text>
        <Text style={{ color: theme.muted }}>playerSlug: {playerSlug || "—"}</Text>
        <Text style={{ color: theme.muted }}>
          cache card: {card ? "oui" : "non"}
        </Text>
        <Text style={{ color: theme.muted }}>
          recentScores: {Array.isArray((perf as any)?.recentScores) ? (perf as any).recentScores.length : 0}
        </Text>
        <Text style={{ color: theme.muted }}>
          recentScores15: {Array.isArray((perf as any)?.recentScores15) ? (perf as any).recentScores15.length : 0}
        </Text>
        <Text style={{ color: theme.muted }}>
          ALL/historyChart: {Array.isArray(historyChart) ? historyChart.length : 0}
        </Text>
      </View>
    </ScrollView>
  );
}
























