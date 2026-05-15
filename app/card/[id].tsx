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

/* XS_FIFA_RADAR_POSITION_WEIGHTS_V1 */
type XsRadarPositionV1 = "GK" | "DEF" | "MID" | "FW" | "GEN";

// XS_PATCH_TRUE_L10_FROM_HISTORY_V1 BEGIN
function xsAverageLastValidScoresV1(items: any[], take: number): number | null {
  const scores = Array.isArray(items)
    ? items
        .filter((x) => {
          const score = Number(x?.scoreSorare);
          const minutes = Number(x?.minutes);
          return Number.isFinite(score) && Number.isFinite(minutes) && minutes > 0;
        })
        .slice(0, take)
        .map((x) => Number(x.scoreSorare))
    : [];

  if (!scores.length) return null;
  return Math.round(scores.reduce((sum, n) => sum + n, 0) / scores.length);
}
// XS_PATCH_TRUE_L10_FROM_HISTORY_V1 END
type XsRadarRangeV1 = "L5" | "L10" | "L40";
type XsRadarTrendV1 = "up" | "down" | "stable";
type XsRadarVolatilityV1 = "stable" | "medium" | "high" | "unknown";

/* XS_FIX_MYCARDS_POSITION_DEVICEID_AND_SYNC_V1 */
/* XS_FIX_POSITION_FROM_MYCARDS_CACHE_V1 */
const XS_POSITION_CACHE_TTL_MS_V1 = 24 * 60 * 60 * 1000;
const XS_POSITION_CACHE_V1 = new Map<string, { position: XsRadarPositionV1; raw?: string; at: number }>();

function xsNormalizePositionCodeV1(raw: any): XsRadarPositionV1 {
  const token = Array.isArray(raw) ? raw[0] : raw;
  const s = String(token ?? "").trim().toLowerCase();
  if (!s || s === "—" || s === "-" || s === "unk" || s === "unknown") return "GEN";
  if (s === "gk" || s.includes("goalkeeper") || s.includes("keeper")) return "GK";
  if (s === "def" || s === "df" || s.includes("defender") || s.includes("defence") || s.includes("defense")) return "DEF";
  if (s === "mid" || s === "mf" || s.includes("midfielder") || s.includes("mid")) return "MID";
  if (s === "fw" || s === "fwd" || s.includes("forward") || s.includes("striker") || s.includes("attacker")) return "FW";
  return "GEN";
}

function xsPickMyCardsPositionRawV1(card: any): any {
  const values = [
    card?.position,
    card?.positionRaw,
    card?.playingPosition,
    card?.anyPosition,
    Array.isArray(card?.anyPositions) ? card.anyPositions[0] : null,
    card?.anyPlayer?.position,
    card?.anyPlayer?.positionRaw,
    card?.anyPlayer?.playingPosition,
    card?.anyPlayer?.anyPosition,
    Array.isArray(card?.anyPlayer?.anyPositions) ? card.anyPlayer.anyPositions[0] : null,
    card?.player?.position,
    card?.player?.positionRaw,
    card?.player?.playingPosition,
    card?.player?.anyPosition,
    Array.isArray(card?.player?.anyPositions) ? card.player.anyPositions[0] : null,
  ];
  return values.find((v) => String(v ?? "").trim().length > 0) ?? null;
}

async function xsReadPositionDeviceIdV1(): Promise<string> {
  for (const key of ["xs_device_id", "XS_JWT_DEVICE_ID_V1", "XS_DEVICE_ID_V1", "xs_device_id_v1"]) {
    try {
      const value = String((await AsyncStorage.getItem(key)) || "").trim();
      if (value) return value;
    } catch {}
  }
  return "";
}

function xsMyCardsPlayerSlugV1(card: any): string {
  return String(
    card?.playerSlug ||
    card?.anyPlayer?.slug ||
    card?.player?.slug ||
    ""
  ).trim().toLowerCase();
}

function xsPositionFallbackBaseUrlV1(): string {
  return String(
    process.env.EXPO_PUBLIC_AUTH_BASE_URL ||
    process.env.EXPO_PUBLIC_BASE_URL ||
    XS_HISTORY_CHART_CLOUDRUN_V2
  ).replace(/\/+$/, "");
}

async function xsFetchPlayerPositionCachedV1(slug: string): Promise<{ position: XsRadarPositionV1; raw?: string; source?: string }> {
  const key = String(slug || "").trim().toLowerCase();
  if (!key) return { position: "GEN", source: "missing_slug" };

  const now = Date.now();
  const cached = XS_POSITION_CACHE_V1.get(key);
  if (cached && now - cached.at < XS_POSITION_CACHE_TTL_MS_V1) {
    return { position: cached.position, raw: cached.raw, source: "memory" };
  }

  try {
    const deviceId = await xsReadPositionDeviceIdV1();
    const base = xsPositionFallbackBaseUrlV1();
    try {
      console.log("[position fallback] baseUrl=", base);
      console.log("[position fallback] deviceId=", deviceId || "—");
      console.log("[position fallback] playerSlug=", key);
    } catch {}
    if (!deviceId) return { position: "GEN", source: "missing_device_id" };

    const url = `${base}/my-cards?deviceId=${encodeURIComponent(deviceId)}&first=200`;
    const resp = await fetch(url, { headers: { accept: "application/json" } });
    const json = await resp.json().catch(() => null);
    const cards = Array.isArray(json?.cards) ? json.cards : (Array.isArray(json?.items) ? json.items : []);
    const match = cards.find((card: any) => xsMyCardsPlayerSlugV1(card) === key) || null;
    const rawValue = xsPickMyCardsPositionRawV1(match);
    const raw = rawValue != null ? String(rawValue) : undefined;
    const position = xsNormalizePositionCodeV1(raw);
    try {
      console.log("[position fallback] cardsCount=", cards.length);
      console.log("[position fallback] match=", match ? xsMyCardsPlayerSlugV1(match) : null);
      if (!match) console.log("[position fallback] firstSlugs=", cards.slice(0, 10).map((card: any) => xsMyCardsPlayerSlugV1(card)).filter(Boolean));
      console.log("[position fallback] resolved=", position, raw || "");
    } catch {}
    if (position !== "GEN") {
      const result = { position, raw, at: now };
      XS_POSITION_CACHE_V1.set(key, result);
    }
    return { position, raw, source: match ? "my-cards" : "my-cards_miss" };
  } catch {
    try { console.log("[position fallback] resolved=", "GEN", "network_error"); } catch {}
    return { position: "GEN", source: "network_error" };
  }
}
/* XS_FIX_POSITION_FROM_MYCARDS_CACHE_V1_END */

function xsRadarPositionFromTokenV1(token: any): XsRadarPositionV1 {
  return xsNormalizePositionCodeV1(token);
}

function xsRadarNormalizePositionV1(source: any): XsRadarPositionV1 {
  const vals = [
    source?.positionRaw,
    source?.position,
    source?.playingPosition,
    source?.playerPosition,
    source?.anyPosition,
    source?.anyPositions,
    source?.card?.positionRaw,
    source?.card?.position,
    source?.card?.playingPosition,
    source?.card?.playerPosition,
    source?.card?.anyPosition,
    source?.card?.anyPositions,
    source?.player?.position,
    source?.player?.playingPosition,
    source?.player?.anyPosition,
    source?.player?.anyPositions,
    source?.card?.player?.position,
    source?.card?.player?.playingPosition,
    source?.card?.player?.anyPosition,
    source?.card?.player?.anyPositions,
    source?.anyPlayer?.position,
    source?.anyPlayer?.playingPosition,
    source?.anyPlayer?.anyPosition,
    source?.anyPlayer?.anyPositions,
    source?.card?.anyPlayer?.position,
    source?.card?.anyPlayer?.playingPosition,
    source?.card?.anyPlayer?.anyPosition,
    source?.card?.anyPlayer?.anyPositions,
    source?.perf?.position,
    source?.perf?.playingPosition,
  ];

  for (const v of vals) {
    const pos = xsRadarPositionFromTokenV1(v);
    if (pos !== "GEN") return pos;
  }
  return "GEN";
}

/* XS_FIX_CARD_POSITION_AND_SYNC_V1 */
function xsCardParamStringV1(value: any): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return String(raw ?? "").trim();
}

function xsCardDetailPositionV1(input: {
  positionParam?: any;
  positionRawParam?: any;
  card?: any;
  perf?: any;
}): XsRadarPositionV1 {
  const card = input.card || null;
  const perf = input.perf || null;
  const values = [
    input.positionParam,
    input.positionRawParam,
    card?.position,
    card?.positionRaw,
    card?.playingPosition,
    card?.anyPlayer?.position,
    card?.anyPlayer?.playingPosition,
    card?.anyPlayer?.anyPositions,
    card?.player?.position,
    card?.player?.playingPosition,
    card?.player?.anyPositions,
    perf?.position,
    perf?.playingPosition,
  ];

  for (const value of values) {
    const pos = xsRadarPositionFromTokenV1(value);
    if (pos !== "GEN") return pos;
  }
  return "GEN";
}

function xsDisplayPositionLabelV1(position: any): "GK" | "DEF" | "MIL" | "ATT" | "GEN" {
  const pos = xsNormalizePositionCodeV1(position);
  if (pos === "MID") return "MIL";
  if (pos === "FW") return "ATT";
  return pos;
}
/* XS_FIX_CARD_POSITION_AND_SYNC_V1_END */

function xsRadarDetailsStatTotalV1(details: any, keys: string[]): number | null {
  const wanted = keys.map((k) => k.toLowerCase());
  let total = 0;
  let found = false;

  function add(v: any) {
    const n = xsRadarNumV1(v);
    if (n == null) return;
    total += n;
    found = true;
  }

  function matchesLabel(node: any) {
    const label = String(
      node?.stat ?? node?.category ?? node?.name ?? node?.label ?? ""
    ).toLowerCase();
    if ((wanted.includes("goal") || wanted.includes("goals")) && label.includes("assist")) return false;
    return wanted.some((k) => label.includes(k));
  }

  function visit(node: any, depth: number) {
    if (!node || depth > 5) return;
    if (Array.isArray(node)) {
      node.forEach((x) => visit(x, depth + 1));
      return;
    }
    if (typeof node !== "object") return;

    for (const k of Object.keys(node)) {
      if (wanted.includes(k.toLowerCase())) add(node[k]);
    }

    if (matchesLabel(node)) add(node.statValue ?? node.value ?? node.count);

    for (const k of Object.keys(node)) visit(node[k], depth + 1);
  }

  visit(details, 0);
  return found ? total : null;
}

function xsRadarCountMetricV1(total: number | null, matches: number, strongPerMatch: number): number | null {
  if (total == null || !matches) return null;
  return xsRadarClampV1((total / Math.max(1, matches * strongPerMatch)) * 100);
}

function xsRadarTotalRowsStatV1(rows: any[], key: string): number | null {
  const hasStat = rows.some((row: any) => row && row[key] != null);
  if (!hasStat) return null;
  return rows.reduce((sum: number, row: any) => sum + (row?.[key] ?? 0), 0);
}

function xsRadarGoalMetricV1(totalGoals: number | null, matches: number, positionUsed: XsRadarPositionV1): number | null {
  if (totalGoals == null || !matches) return null;
  const perMatch = totalGoals / Math.max(1, matches);
  const multiplier =
    positionUsed === "GK" ? 1200 :
    positionUsed === "DEF" ? 360 :
    positionUsed === "MID" ? 230 :
    positionUsed === "FW" ? 155 :
    220;
  const exceptionalBonus = totalGoals > 0 && positionUsed === "GK" ? 15 : 0;
  return xsRadarClampV1(perMatch * multiplier + exceptionalBonus);
}

function xsRadarProfileV1(
  positionUsed: XsRadarPositionV1,
  m: {
    attack: number;
    creation: number;
    defense: number;
    reliability: number;
    regularity: number;
    form: number;
    impact: number;
    goalMetric: number;
    highScoreRate: number;
  }
): string {
  if (positionUsed === "GK") {
    if (m.reliability < 50 || m.regularity < 50) return "risky_keeper";
    if (m.impact >= 70 || m.goalMetric >= 65) return "shot_stopper";
    return "reliable_keeper";
  }
  if (positionUsed === "DEF") {
    if (m.attack >= 62 && m.goalMetric >= 45) return "set_piece_threat";
    if (m.creation >= 65) return "ball_playing_defender";
    return "defensive_anchor";
  }
  if (positionUsed === "MID") {
    if (m.attack >= 70) return "attacking_midfielder";
    if (m.creation >= 68) return "playmaker";
    if (m.defense >= 66 && m.creation < 62) return "ball_winner";
    return "box_to_box";
  }
  if (positionUsed === "FW") {
    if (m.attack >= 70) return "finisher";
    if (m.creation >= 65) return "creator_forward";
    if (m.form >= 70 || m.highScoreRate >= 0.45) return "explosive_attacker";
    return "boom_or_bust";
  }
  return m.creation >= m.attack ? "balanced_creator" : "balanced_attacker";
}
/* XS_FIFA_RADAR_POSITION_WEIGHTS_V1_END */

/* XS_FIFA_RADAR_BY_POSITION_V1 */
type XsRadarMetricsByPositionV1 = {
  form: number;
  regularity: number;
  gameTime: number;
  impact: number;
  attack: number;
  creation: number;
  defense: number;
  reliability: number;
  saves: number;
  cleanSheets: number;
  duels: number;
  matches?: number;
  range?: XsRadarRangeV1;
  confidence?: number;
  detailedStats?: boolean;
  l5?: number;
  L10?: number;
  l40?: number;
  confidenceScore?: number;
  overall?: number;
  coachAdjustedOverall?: number;
  coachScore?: number;
  scoreSeries?: number[];
};

type XsRadarAutoProfileToneV1 = "safe" | "upside" | "risk" | "balanced";
type XsRadarAutoProfileV1 = {
  label: string;
  tone: XsRadarAutoProfileToneV1;
  reason: string;
};

type XsRadarConfidenceEnhancedV1 = {
  score: number;
  label: "Faible" | "Moyen" | "Élevé";
  color: "red" | "orange" | "green";
  reason: string;
};

type XsRadarRecommendationV1 = {
  label: string;
  tone: "play" | "avoid" | "watch" | "risky";
  reason: string;
};

type XsRadarCoachDecisionV1 = {
  score: number;
  decision: "Titulaire" | "Borderline" | "Risqué" | "À éviter";
  tone: "play" | "watch" | "risky" | "avoid";
  adjustedOverall: number;
  rawOverall: number;
  matchBonus: number;
  trend: XsRadarTrendV1;
  volatility: XsRadarVolatilityV1;
  ceiling: number;
  reasons: string[];
  reason: string;
  windowBlendLabel?: string;
};

type XsCoachDecisionSmartItemV1 = {
  icon?: string;
  title: string;
  text: string;
};

type XsPlayerStatusCodeV1 = "available" | "injured" | "suspended" | "doubtful" | "unknown";

type XsPlayerStatusV1 = {
  playerSlug?: string | null;
  status: XsPlayerStatusCodeV1;
  reason?: string | null;
  expectedReturnDate?: string | null;
  source?: string | null;
  sourceUrl?: string | null;
  updatedAt?: string | null;
  yellowCards?: number | null;
  redCards?: number | null;
  suspensionMatches?: number | null;
  injuryDate?: string | null;
  statusDate?: string | null;
};

type XsCoachDecisionDeepAnalysisV2 = {
  verdict: string;
  mainReason: XsCoachDecisionSmartItemV1;
  positiveSignals: XsCoachDecisionSmartItemV1[];
  negativeSignals: XsCoachDecisionSmartItemV1[];
  actionAdvice: XsCoachDecisionSmartItemV1;
  availability?: XsCoachDecisionSmartItemV1;
  playerStatus?: XsPlayerStatusV1 | null;
};

type XsRadarDecisionV2 = {
  finalLabel: string;
  finalTone: "strongPlay" | "play" | "borderline" | "joker" | "risk" | "avoid";
  playStyle: string;
  summary: string;
  bullets: string[];
  whyItems?: XsCoachDecisionSmartItemV1[];
  riskItems?: XsCoachDecisionSmartItemV1[];
  deepAnalysis?: XsCoachDecisionDeepAnalysisV2;
};

type XsRadarPositionPercentileV1 = {
  percentileLabel: string;
  deltaLabel: string;
  tier: "elite" | "strong" | "average" | "weak";
  reason: string;
};

type XsCardMatchContextV1 = {
  /* XS_COACH_DECISION_UI_CLEAN_V2 */
  opponentName: string | null;
  opponentSlug?: string | null;
  opponentLogoUrl?: string | null;
  competition: string | null;
  homeAway: "home" | "away" | "unknown";
  matchDate: string | null;
  difficulty: "easy" | "medium" | "hard" | "unknown";
  difficultyScore: number | null;
  reason: string;
  source?: string | null;
};

type XsAiPlayerScorePredictionV1 = {
  ok?: boolean;
  predictionId?: string | null;
  playerSlug?: string | null;
  cardId?: string | null;
  nextMatchKey?: string | null;
  nextMatchDate?: string | null;
  opponentName?: string | null;
  opponentLogoUrl?: string | null;
  projectedScore?: number | null;
  projectedRangeLow?: number | null;
  projectedRangeHigh?: number | null;
  confidence?: string | null;
  confidenceScore?: number | null;
  riskLevel?: string | null;
  why?: string | null;
  positivePoints?: string[] | null;
  negativePoints?: string[] | null;
  actionableAdvice?: string | null;
  aiUsed?: boolean;
  aiError?: string | null;
  calculationBreakdown?: any;
};

function xsAiPredictionTextV1(value: any, fallback = ""): string {
  const s = String(value ?? "").trim();
  return s || fallback;
}

function xsAiPredictionCardIdV1(card: any, fallbackId: string): string {
  return xsAiPredictionTextV1(
    card?.id ??
    card?.cardId ??
    card?.slug ??
    card?.assetId ??
    fallbackId,
    fallbackId
  );
}

function xsAiPredictionCardBonusV1(card: any): number | null {
  const raw =
    card?.bonus ??
    card?.bonusTotal ??
    card?.xpBonus ??
    card?.seasonBonus ??
    card?.cardPower ??
    card?.power ??
    null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  if (n > 0 && n < 2) return Math.max(0, (n - 1) * 100);
  return Math.max(0, Math.min(100, n));
}

function xsAiPredictionMatchKeyV1(playerSlug: string, card: any, matchContext?: XsCardMatchContextV1 | null): string {
  const direct = xsAiPredictionTextV1(
    (matchContext as any)?.nextMatchKey ??
    (matchContext as any)?.matchId ??
    (matchContext as any)?.gameId ??
    ""
  );
  if (direct) return `${playerSlug}|${xsAiPredictionCardIdV1(card, "")}|${direct}`;
  return [
    playerSlug,
    xsAiPredictionCardIdV1(card, ""),
    xsAiPredictionTextV1(matchContext?.matchDate, "no-date"),
    xsAiPredictionTextV1(matchContext?.opponentName, "no-opponent"),
    xsAiPredictionTextV1(matchContext?.competition, "no-competition")
  ].join("|").toLowerCase();
}

function xsAiPredictionMatchIsFutureV1(matchContext?: XsCardMatchContextV1 | null): boolean {
  const raw = xsAiPredictionTextV1(matchContext?.matchDate);
  if (!raw) return Boolean(matchContext?.opponentName);
  const t = Date.parse(raw);
  if (!Number.isFinite(t)) return Boolean(matchContext?.opponentName);
  return t > Date.now() - 2 * 3600000;
}

function xsRadarChartPositionLabelV1(positionUsed: XsRadarPositionV1): "GK" | "DEF" | "MID" | "FWD" | "GEN" {
  return positionUsed === "FW" ? "FWD" : positionUsed;
}

function xsRadarWeightedOverallByPositionV1(positionUsed: XsRadarPositionV1, m: XsRadarMetricsByPositionV1): number {
  if (positionUsed === "GK") {
    return xsRadarClampV1(m.saves * 0.3 + m.cleanSheets * 0.2 + m.regularity * 0.15 + m.reliability * 0.15 + m.impact * 0.1 + m.gameTime * 0.1);
  }
  if (positionUsed === "DEF") {
    return xsRadarClampV1(m.defense * 0.3 + m.duels * 0.2 + m.regularity * 0.15 + m.reliability * 0.15 + m.impact * 0.1 + m.gameTime * 0.1);
  }
  if (positionUsed === "MID") {
    return xsRadarClampV1(m.creation * 0.25 + m.impact * 0.2 + m.regularity * 0.2 + m.defense * 0.15 + m.reliability * 0.1 + m.gameTime * 0.1);
  }
  if (positionUsed === "FW") {
    return xsRadarClampV1(m.attack * 0.3 + m.impact * 0.25 + m.creation * 0.15 + m.regularity * 0.15 + m.reliability * 0.1 + m.gameTime * 0.05);
  }
  return xsRadarAvgV1([m.form, m.regularity, m.gameTime, m.impact, m.attack, m.creation, m.defense, m.reliability]) ?? 50;
}

/* XS_RADAR_POSITION_PERCENTILE_V1 */
function xsRadarPositionGroupLabelV1(positionUsed: XsRadarPositionV1): string {
  if (positionUsed === "GK") return "gardiens";
  if (positionUsed === "DEF") return "défenseurs";
  if (positionUsed === "MID") return "milieux";
  if (positionUsed === "FW") return "attaquants";
  return "joueurs";
}

function xsRadarPositionPercentileV1(
  positionUsed: XsRadarPositionV1,
  metrics: XsRadarMetricsByPositionV1
): XsRadarPositionPercentileV1 {
  const overall = Math.round(xsRadarClampV1(metrics.coachAdjustedOverall ?? metrics.overall ?? xsRadarWeightedOverallByPositionV1(positionUsed, metrics)));
  const group = xsRadarPositionGroupLabelV1(positionUsed);
  const range = metrics.range || "L10";
  const delta = overall - 55;
  const deltaLabel =
    delta > 0
      ? `+${delta} au-dessus du profil moyen`
      : delta < 0
        ? `${delta} sous le profil moyen`
        : "au niveau du profil moyen";

  if (overall >= 75) {
    return {
      percentileLabel: `Top local des ${group}`,
      deltaLabel,
      tier: "elite",
      reason: `Repère local provisoire: score ajusté ${overall} sur ${range}, sans percentile marché global.`,
    };
  }
  if (overall >= 65) {
    return {
      percentileLabel: `Profil fort local des ${group}`,
      deltaLabel,
      tier: "strong",
      reason: `Repère local provisoire: score ajusté ${overall} sur ${range}, profil fort pour son poste.`,
    };
  }
  if (overall >= 55) {
    return {
      percentileLabel: `Au-dessus du repère local des ${group}`,
      deltaLabel,
      tier: "strong",
      reason: `Repère local provisoire: score ajusté ${overall} sur ${range}, au-dessus du seuil moyen.`,
    };
  }
  if (overall >= 45) {
    return {
      percentileLabel: `Profil local moyen des ${group}`,
      deltaLabel,
      tier: "average",
      reason: `Repère local provisoire: score ajusté ${overall} sur ${range}, proche du profil moyen.`,
    };
  }
  return {
    percentileLabel: `Sous le repère local des ${group}`,
    deltaLabel,
    tier: "weak",
    reason: `Repère local provisoire: score ajusté ${overall} sur ${range}, sous le seuil moyen.`,
  };
}
/* XS_RADAR_POSITION_PERCENTILE_V1_END */

function xsRadarValuesByPositionV1(positionUsed: XsRadarPositionV1, m: XsRadarMetricsByPositionV1) {
  const base = [
    { label: "Forme", value: m.form },
    { label: "Régularité", value: m.regularity },
    { label: "Temps de jeu", value: m.gameTime },
  ];

  if (positionUsed === "GK") {
    return [
      ...base,
      { label: "Arrêts", value: m.saves },
      { label: "Clean sheets", value: m.cleanSheets },
      { label: "Impact", value: m.impact },
      { label: "Fiabilité", value: m.reliability },
    ];
  }
  if (positionUsed === "DEF") {
    return [
      ...base,
      { label: "Défense", value: m.defense },
      { label: "Duels", value: m.duels },
      { label: "Impact", value: m.impact },
      { label: "Fiabilité", value: m.reliability },
    ];
  }
  if (positionUsed === "MID") {
    return [
      ...base,
      { label: "Création", value: m.creation },
      { label: "Défense", value: m.defense },
      { label: "Impact", value: m.impact },
      { label: "Fiabilité", value: m.reliability },
    ];
  }
  if (positionUsed === "FW") {
    return [
      ...base,
      { label: "Attaque", value: m.attack },
      { label: "Création", value: m.creation },
      { label: "Impact", value: m.impact },
      { label: "Fiabilité", value: m.reliability },
    ];
  }
  return [
    ...base,
    { label: "Impact", value: m.impact },
    { label: "Attaque", value: m.attack },
    { label: "Création", value: m.creation },
    { label: "Défense", value: m.defense },
    { label: "Fiabilité", value: m.reliability },
  ];
}
/* XS_FIFA_RADAR_BY_POSITION_V1_END */

/* XS_FIFA_RADAR_AUTO_PROFILE_V1 */
function xsRadarAutoProfileLabelV1(
  positionUsed: XsRadarPositionV1,
  metrics: XsRadarMetricsByPositionV1,
  profile: string
): XsRadarAutoProfileV1 {
  const range = metrics.range || "L10";
  const matches = Math.max(0, Math.round(Number(metrics.matches || 0)));
  const windowText = `fenêtre ${range}`;

  if (matches < 3 || (metrics.confidence != null && metrics.confidence < 0.2)) {
    return {
      label: "Profil en construction",
      tone: "balanced",
      reason: "Pas encore assez de matchs fiables.",
    };
  }

  if (positionUsed === "GK") {
    if (metrics.gameTime < 45) return { label: "Gardien à risque", tone: "risk", reason: `Temps de jeu faible sur la ${windowText}.` };
    if (metrics.regularity < 45) return { label: "Gardien irrégulier", tone: "risk", reason: `Régularité fragile sur la ${windowText}.` };
    if (metrics.saves >= 65 && metrics.cleanSheets >= 60 && metrics.reliability >= 65) {
      return { label: "Mur défensif", tone: "safe", reason: `Arrêts élevés, clean sheets solides et fiabilité forte sur la ${windowText}.` };
    }
    if (metrics.saves >= 65 && metrics.cleanSheets < 55) return { label: "Shot stopper", tone: "upside", reason: `Gros volume d'arrêts malgré peu de clean sheets sur la ${windowText}.` };
    if (metrics.reliability >= 65 && metrics.regularity >= 60) return { label: "Gardien fiable", tone: "safe", reason: `Fiabilité et régularité solides sur la ${windowText}.` };
    return { label: "Gardien équilibré", tone: "balanced", reason: `Profil stable sans pic majeur sur la ${windowText}.` };
  }

  if (positionUsed === "DEF") {
    if (metrics.regularity < 45) return { label: "Défenseur irrégulier", tone: "risk", reason: `Régularité basse sur la ${windowText}.` };
    if (metrics.defense >= 65 && metrics.duels >= 60) return { label: "Stoppeur", tone: "safe", reason: `Défense élevée et duels forts sur la ${windowText}.` };
    if (metrics.reliability >= 65 && metrics.regularity >= 65) return { label: "Défenseur sûr", tone: "safe", reason: `Fiabilité et régularité fortes sur la ${windowText}.` };
    if (metrics.impact >= 65 && metrics.defense >= 50) return { label: "Défenseur impactant", tone: "upside", reason: `Impact fort avec base défensive correcte sur la ${windowText}.` };
    return { label: "Défenseur équilibré", tone: "balanced", reason: `Profil défensif stable sur la ${windowText}.` };
  }

  if (positionUsed === "MID") {
    if (metrics.regularity < 45) return { label: "Milieu irrégulier", tone: "risk", reason: `Régularité basse sur la ${windowText}.` };
    if (metrics.creation >= 65 && metrics.impact >= 60) return { label: "Créateur", tone: "upside", reason: `Création élevée et impact fort sur la ${windowText}.` };
    if (metrics.defense >= 60 && metrics.regularity >= 60) return { label: "Milieu complet", tone: "safe", reason: `Défense et régularité solides sur la ${windowText}.` };
    if (metrics.impact >= 65 && metrics.creation >= 50) return { label: "Box-to-box", tone: "upside", reason: `Impact fort avec création correcte sur la ${windowText}.` };
    return { label: "Milieu équilibré", tone: "balanced", reason: `Profil polyvalent sur la ${windowText}.` };
  }

  if (positionUsed === "FW") {
    if (metrics.gameTime < 45) return { label: "Attaquant à risque", tone: "risk", reason: `Temps de jeu faible sur la ${windowText}.` };
    if (metrics.form >= 65 && metrics.regularity < 55) return { label: "High risk / high reward", tone: "risk", reason: `Forme haute mais régularité instable sur la ${windowText}.` };
    if (metrics.attack >= 65 && metrics.impact >= 60) return { label: "Finisseur", tone: "upside", reason: `Attaque élevée et impact fort sur la ${windowText}.` };
    if (metrics.creation >= 65 && metrics.attack >= 50) return { label: "Attaquant créateur", tone: "upside", reason: `Création forte avec menace offensive correcte sur la ${windowText}.` };
    return { label: "Attaquant équilibré", tone: "balanced", reason: `Profil offensif stable sur la ${windowText}.` };
  }

  if (profile && profile.includes("risk")) {
    return { label: "Profil à surveiller", tone: "risk", reason: `Signaux de volatilité sur la ${windowText}.` };
  }
  return { label: "Profil polyvalent", tone: "balanced", reason: `Lecture générale basée sur les métriques disponibles sur la ${windowText}.` };
}
/* XS_FIFA_RADAR_AUTO_PROFILE_V1_END */

/* XS_FIFA_RADAR_CONFIDENCE_RECO_V1 */
function xsRadarConfidenceEnhancedV1(metrics: XsRadarMetricsByPositionV1): XsRadarConfidenceEnhancedV1 {
  const matches = Math.max(0, Math.round(Number(metrics.matches || 0)));
  const range = metrics.range || "L10";
  const hasDetailedStats = metrics.detailedStats === true;
  const volumeScore = matches < 5 ? 35 : matches <= 15 ? 62 : 82;
  const existingScore =
    typeof metrics.confidence === "number" && Number.isFinite(metrics.confidence)
      ? xsRadarClampV1(metrics.confidence * 100)
      : volumeScore;
  let score = volumeScore * 0.65 + existingScore * 0.35;
  const reasons = [
    `${matches} match${matches > 1 ? "s" : ""} utilisé${matches > 1 ? "s" : ""}`,
  ];

  if (range === "L5") {
    score -= 10;
    reasons.push("fenêtre L5 plus volatile");
  } else if (range === "L40") {
    score += 10;
    reasons.push("fenêtre L40 plus stable");
  } else {
    reasons.push("fenêtre L10 équilibrée");
  }

  if (!hasDetailedStats) {
    score -= 10;
    reasons.push("stats détaillées partiellement en proxy");
  } else {
    reasons.push("stats détaillées disponibles");
  }

  const finalScore = Math.round(xsRadarClampV1(score));
  if (finalScore < 45) {
    return { score: finalScore, label: "Faible", color: "red", reason: reasons.join(" · ") };
  }
  if (finalScore < 70) {
    return { score: finalScore, label: "Moyen", color: "orange", reason: reasons.join(" · ") };
  }
  return { score: finalScore, label: "Élevé", color: "green", reason: reasons.join(" · ") };
}

/* XS_CARD_MATCH_CONTEXT_RECO_V1 */
function xsMcTextV1(value: any): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw == null) return null;
  if (typeof raw === "string" || typeof raw === "number") {
    const s = String(raw).trim();
    return s && s !== "—" && s !== "-" ? s : null;
  }
  return null;
}

function xsMcFirstTextV1(values: any[]): string | null {
  for (const value of values) {
    const picked = xsMcTextV1(value);
    if (picked) return picked;
  }
  return null;
}

function xsMcHomeAwayV1(...values: any[]): "home" | "away" | "unknown" {
  for (const value of values) {
    if (typeof value === "boolean") return value ? "home" : "away";
    const s = String(Array.isArray(value) ? value[0] : value ?? "").trim().toLowerCase();
    if (!s) continue;
    if (s === "home" || s.includes("domicile") || s === "h") return "home";
    if (s === "away" || s.includes("extérieur") || s.includes("exterieur") || s === "a") return "away";
  }
  return "unknown";
}

function xsMcFutureRowsV1(historyChart: any[]): any[] {
  const now = Date.now();
  return (Array.isArray(historyChart) ? historyChart : [])
    .filter((row: any) => {
      const t = new Date(row?.matchDate || row?.startDate || row?.date || 0).getTime();
      return Number.isFinite(t) && t > now;
    })
    .sort((a: any, b: any) => {
      const da = new Date(a?.matchDate || a?.startDate || a?.date || 0).getTime();
      const db = new Date(b?.matchDate || b?.startDate || b?.date || 0).getTime();
      return da - db;
    });
}

/* XS_COACH_MATCH_LOGO_HISTORY_FALLBACK_V3 */
function xsMcPickOpponentLogoUrlV2(row: any): string | null {
  try {
    return xsMcFirstTextV1([
      row?.opponentLogoUrl,
      row?.logoUrl,
      row?.clubLogoUrl,
      row?.teamLogoUrl,
      row?.crestUrl,
      row?.pictureUrl,
      row?.opponentClub?.logoUrl,
      row?.opponentClub?.pictureUrl,
      row?.opponentTeam?.logoUrl,
      row?.opponentTeam?.pictureUrl,
      row?.opponent?.logoUrl,
      row?.opponent?.pictureUrl,
      row?.team?.logoUrl,
      row?.team?.pictureUrl,
      row?.club?.logoUrl,
      row?.club?.pictureUrl,
    ]);
  } catch {
    return null;
  }
}

function xsMcFindOpponentLogoFromHistoryV2(historyChart: any[], opponentName: any): string | null {
  try {
    const rows = Array.isArray(historyChart) ? historyChart : [];
    if (!rows.length) return null;
    const normalize = (value: any) =>
      String(xsMcTextV1(value) || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
    const target = normalize(opponentName);
    if (target) {
      for (const row of rows) {
        const names = [
          row?.opponent,
          row?.opponentName,
          row?.teamName,
          row?.clubName,
          row?.opponent?.displayName,
          row?.opponent?.name,
          row?.opponentTeam?.shortName,
          row?.opponentTeam?.name,
          row?.opponentClub?.displayName,
          row?.opponentClub?.name,
          row?.team?.displayName,
          row?.team?.name,
          row?.club?.displayName,
          row?.club?.name,
        ]
          .map(normalize)
          .filter(Boolean);
        const matched = names.some((name) => name === target || name.includes(target) || target.includes(name));
        if (matched) {
          const logoUrl = xsMcPickOpponentLogoUrlV2(row);
          if (logoUrl) return logoUrl;
        }
      }
    }
    for (const row of rows) {
      const logoUrl = xsMcPickOpponentLogoUrlV2(row);
      if (logoUrl) return logoUrl;
    }
    return null;
  } catch {
    return null;
  }
}

/* XS_COACH_NEXT_OPPONENT_LOGO_FIX_V1 */
function xsMcFindNextOpponentLogoFromHistoryV1(futureRows: any[], opponentName: any): string | null {
  try {
    const rows = Array.isArray(futureRows) ? futureRows : [];
    if (!rows.length) return null;
    const normalize = (value: any) =>
      String(xsMcTextV1(value) || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
    const target = normalize(opponentName);
    if (target) {
      for (const row of rows) {
        const names = [
          row?.opponent,
          row?.opponentName,
          row?.teamName,
          row?.clubName,
          row?.opponent?.displayName,
          row?.opponent?.name,
          row?.opponentTeam?.shortName,
          row?.opponentTeam?.name,
          row?.opponentClub?.displayName,
          row?.opponentClub?.name,
          row?.team?.displayName,
          row?.team?.name,
          row?.club?.displayName,
          row?.club?.name,
        ]
          .map(normalize)
          .filter(Boolean);
        const matched = names.some((name) => name === target || name.includes(target) || target.includes(name));
        if (matched) {
          const logoUrl = xsMcPickOpponentLogoUrlV2(row);
          if (logoUrl) return logoUrl;
        }
      }
    }
    for (const row of rows) {
      const logoUrl = xsMcPickOpponentLogoUrlV2(row);
      if (logoUrl) return logoUrl;
    }
    return null;
  } catch {
    return null;
  }
}

function xsCoachNextOpponentLogoDebugV1(historyChart: any[], matchContext: XsCardMatchContextV1 | null | undefined) {
  try {
    if (typeof process !== "undefined" && process.env?.NODE_ENV === "production") return;
    const lastHistorical = (Array.isArray(historyChart) ? historyChart : [])
      .filter((row: any) => {
        const t = new Date(row?.matchDate || row?.startDate || row?.date || 0).getTime();
        return Number.isFinite(t) && t <= Date.now();
      })
      .sort((a: any, b: any) => {
        const da = new Date(a?.matchDate || a?.startDate || a?.date || 0).getTime();
        const db = new Date(b?.matchDate || b?.startDate || b?.date || 0).getTime();
        return db - da;
      })[0];
    console.log("[XS_COACH_NEXT_OPPONENT_LOGO_FIX_V1]", {
      nextOpponentName: matchContext?.opponentName || null,
      nextOpponentLogoUrl: Boolean(matchContext?.opponentLogoUrl),
      historicalLastOpponentLogoUrl: Boolean(xsMcPickOpponentLogoUrlV2(lastHistorical)),
    });
  } catch {
    // Dev-only diagnostic must never affect the card screen.
  }
}

function xsBuildMatchContextV1(card: any, perf: any, historyChart: any[]): XsCardMatchContextV1 {
  const futureRows = xsMcFutureRowsV1(historyChart);
  const future = futureRows[0] || null;
  const sources = [
    card?.nextGame, card?.nextMatch, card?.upcomingGame, card?.upcomingMatch, card?.fixture,
    perf?.nextGame, perf?.nextMatch, perf?.upcomingGame, perf?.upcomingMatch, perf?.fixture,
    card, perf, future,
  ];

  const opponentName = xsMcFirstTextV1(sources.flatMap((s: any) => [
    s?.opponentName,
    s?.opponent?.displayName,
    s?.opponent?.name,
    s?.opponentTeam?.shortName,
    s?.opponentTeam?.name,
    s?.awayTeam?.name,
    s?.homeTeam?.name,
  ]));
  const nextLogoSources = [
    card?.nextGame, card?.nextMatch, card?.upcomingGame, card?.upcomingMatch, card?.fixture,
    perf?.nextGame, perf?.nextMatch, perf?.upcomingGame, perf?.upcomingMatch, perf?.fixture,
    future,
  ];
  const opponentLogoUrl = xsMcFirstTextV1(nextLogoSources.flatMap((s: any) => [
    s?.opponentLogoUrl,
    s?.opponent?.logoUrl,
    s?.opponent?.pictureUrl,
    s?.nextOpponent?.logoUrl,
    s?.nextOpponent?.pictureUrl,
    s?.nextOpponentLogoUrl,
    s?.nextMatchOpponentLogoUrl,
    s?.nextMatch?.logoUrl,
    s?.nextMatch?.opponentLogoUrl,
    s?.fixture?.opponentLogoUrl,
    s?.opponentTeam?.logoUrl,
    s?.opponentTeam?.pictureUrl,
    s?.opponentClub?.logoUrl,
    s?.opponentClub?.pictureUrl,
    s?.teamLogoUrl,
  ])) || xsMcFindNextOpponentLogoFromHistoryV1(futureRows, opponentName);
  const competition = xsMcFirstTextV1(sources.flatMap((s: any) => [
    s?.competition,
    s?.competitionName,
    s?.gameWeek?.competition,
    s?.match?.competition,
  ]));
  const matchDate = xsMcFirstTextV1(sources.flatMap((s: any) => [
    s?.matchDate,
    s?.startDate,
    s?.date,
    s?.gameWeek?.startDate,
  ]));
  const homeAway = xsMcHomeAwayV1(...sources.flatMap((s: any) => [
    s?.homeAway,
    s?.venue,
    s?.isHome,
    s?.game?.isHome,
    s?.match?.isHome,
  ]));

  if (!opponentName) {
    return {
      opponentName: null,
      opponentLogoUrl,
      competition,
      homeAway,
      matchDate,
      difficulty: "unknown",
      difficultyScore: null,
      reason: "Prochain adversaire non disponible.",
    };
  }

  const recent = (Array.isArray(historyChart) ? historyChart : [])
    .slice()
    .sort((a: any, b: any) => new Date(b?.matchDate || b?.date || 0).getTime() - new Date(a?.matchDate || a?.date || 0).getTime())
    .slice(0, 5);
  const recentScores = recent
    .map((row: any) => xsRadarNumV1(row?.scoreSorare ?? row?.score ?? row?.totalScore))
    .filter((n: any): n is number => typeof n === "number" && Number.isFinite(n));
  const recentAvg = xsRadarAvgV1(recentScores);
  const std = xsRadarStdDevV1(recentScores);
  const badRate = xsRadarRateV1(recentScores, (score) => score < 35);

  let score = 50;
  const reasons: string[] = [];
  if (homeAway === "home") {
    score -= 6;
    reasons.push("domicile");
  } else if (homeAway === "away") {
    score += 8;
    reasons.push("extérieur");
  }
  if (recentAvg != null && recentAvg < 45) {
    score += 10;
    reasons.push("forme récente fragile");
  } else if (recentAvg != null && recentAvg >= 60) {
    score -= 8;
    reasons.push("bonne forme récente");
  }
  if (std > 16 || badRate >= 0.3) {
    score += 8;
    reasons.push("stabilité récente limitée");
  }

  const difficultyScore = Math.round(xsRadarClampV1(score));
  const difficulty = difficultyScore >= 62 ? "hard" : difficultyScore <= 42 ? "easy" : "medium";
  return {
    opponentName,
    opponentLogoUrl,
    competition,
    homeAway,
    matchDate,
    difficulty,
    difficultyScore,
    reason: reasons.length
      ? `Contexte provisoire: ${reasons.join(" + ")}.`
      : "Contexte provisoire basé sur les données disponibles.",
  };
}

function xsAdjustMatchContextWithMetricsV1(
  context: XsCardMatchContextV1,
  metrics: XsRadarMetricsByPositionV1
): XsCardMatchContextV1 {
  if (context.difficultyScore == null || context.difficulty === "unknown") return context;
  let score = context.difficultyScore;
  const reasons: string[] = [context.reason];
  if (metrics.regularity < 50 || metrics.reliability < 50) {
    score += 8;
    reasons.push("régularité/fiabilité fragile");
  }
  if (metrics.form >= 60 || metrics.impact >= 60) {
    score -= 8;
    reasons.push("forme/impact favorables");
  }
  const difficultyScore = Math.round(xsRadarClampV1(score));
  const difficulty = difficultyScore >= 62 ? "hard" : difficultyScore <= 42 ? "easy" : "medium";
  return {
    ...context,
    difficulty,
    difficultyScore,
    reason: reasons.filter(Boolean).join(" · "),
  };
}

/* XS_CARD_REAL_MATCH_CONTEXT_V1 */
function xsNormalizeRealMatchContextV1(value: any): XsCardMatchContextV1 | null {
  if (!value || value.ok !== true) return null;
  const homeAwayRaw = String(value.homeAway || "").toLowerCase();
  const difficultyRaw = String(value.difficulty || "").toLowerCase();
  const homeAway: XsCardMatchContextV1["homeAway"] =
    homeAwayRaw === "home" || homeAwayRaw === "away" ? homeAwayRaw : "unknown";
  const difficulty: XsCardMatchContextV1["difficulty"] =
    difficultyRaw === "easy" || difficultyRaw === "medium" || difficultyRaw === "hard"
      ? difficultyRaw
      : "unknown";
  return {
    opponentName: xsMcTextV1(value.opponentName),
    opponentSlug: xsMcTextV1(value.opponentSlug),
    opponentLogoUrl: xsMcFirstTextV1([
      value.opponentLogoUrl,
      value?.opponent?.logoUrl,
      value?.opponent?.pictureUrl,
      value.nextOpponentLogoUrl,
      value.nextMatchOpponentLogoUrl,
      value?.nextMatch?.logoUrl,
      value?.nextMatch?.opponentLogoUrl,
      value?.fixture?.opponentLogoUrl,
      value.teamLogoUrl,
    ]),
    competition: xsMcTextV1(value.competition),
    homeAway,
    matchDate: xsMcTextV1(value.matchDate),
    difficulty,
    difficultyScore: typeof value.difficultyScore === "number" && Number.isFinite(value.difficultyScore)
      ? xsRadarClampV1(value.difficultyScore)
      : null,
    reason: xsMcTextV1(value.reason) || "Prochain adversaire non disponible.",
    source: xsMcTextV1(value.source),
  };
}

function xsIsRealMatchContextUsefulV1(context: XsCardMatchContextV1 | null | undefined): boolean {
  return Boolean(
    context &&
      (context.opponentName ||
        context.opponentSlug ||
        context.matchDate ||
        context.competition ||
        context.difficulty !== "unknown")
  );
}
/* XS_CARD_REAL_MATCH_CONTEXT_V1_END */

/* XS_RADAR_DECISION_ENGINE_V1 */
function xsRadarMatchBonusV1(matchContext?: XsCardMatchContextV1 | null): { bonus: number; reason: string } {
  if (!matchContext || matchContext.difficulty === "unknown") {
    return { bonus: 0, reason: "Contexte match neutre." };
  }

  let bonus = 0;
  const bits: string[] = [];
  if (matchContext.difficulty === "easy") {
    bonus += 5;
    bits.push("match favorable");
  } else if (matchContext.difficulty === "hard") {
    bonus -= 5;
    bits.push("match difficile");
  } else {
    bits.push("match moyen");
  }

  if (matchContext.homeAway === "home") {
    bonus += 3;
    bits.push("domicile");
  } else if (matchContext.homeAway === "away") {
    bonus -= 3;
    bits.push("extérieur");
  }

  if (matchContext.homeAway === "home" && matchContext.difficulty === "easy") bonus += 2;
  if (matchContext.homeAway === "away" && matchContext.difficulty === "hard") bonus -= 2;

  return {
    bonus: Math.max(-10, Math.min(10, bonus)),
    reason: bits.length ? bits.join(" + ") : "Contexte match neutre.",
  };
}

function xsRadarCoachToneV1(score: number): XsRadarCoachDecisionV1["tone"] {
  if (score >= 75) return "play";
  if (score >= 60) return "watch";
  if (score >= 45) return "risky";
  return "avoid";
}

function xsRadarCoachLabelV1(score: number): XsRadarCoachDecisionV1["decision"] {
  if (score >= 75) return "Titulaire";
  if (score >= 60) return "Borderline";
  if (score >= 45) return "Risqué";
  return "À éviter";
}

/* XS_RADAR_ADVANCED_DECISION_V1 */
function xsRadarTrendV1(scores: number[]): XsRadarTrendV1 {
  if (!scores || scores.length < 3) return "stable";

  const recent = scores.slice(0, 3);
  const older = scores.slice(3, 6);
  if (!older.length) return "stable";

  const avgRecent = recent.reduce((a, b) => a + b, 0) / recent.length;
  const avgOlder = older.reduce((a, b) => a + b, 0) / older.length;

  if (avgRecent - avgOlder > 5) return "up";
  if (avgOlder - avgRecent > 5) return "down";
  return "stable";
}

function xsRadarVolatilityV1(scores: number[]): XsRadarVolatilityV1 {
  if (!scores || scores.length < 3) return "unknown";

  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance = scores.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / scores.length;
  const std = Math.sqrt(variance);

  if (std < 8) return "stable";
  if (std < 15) return "medium";
  return "high";
}

function xsRadarCeilingV1(scores: number[]): number {
  if (!scores || !scores.length) return 0;
  return Math.round(xsRadarClampV1(Math.max(...scores)));
}

function xsRadarAdvancedDecisionBonusV1(
  trend: XsRadarTrendV1,
  volatility: XsRadarVolatilityV1,
  ceiling: number
): { trendBonus: number; volatilityPenalty: number; ceilingBonus: number } {
  let trendBonus = 0;
  if (trend === "up") trendBonus = 5;
  if (trend === "down") trendBonus = -5;

  let volatilityPenalty = 0;
  if (volatility === "high") volatilityPenalty = -8;
  if (volatility === "medium") volatilityPenalty = -3;

  let ceilingBonus = 0;
  if (ceiling >= 80) ceilingBonus = 6;
  else if (ceiling >= 70) ceilingBonus = 3;

  return { trendBonus, volatilityPenalty, ceilingBonus };
}
/* XS_RADAR_ADVANCED_DECISION_V1_END */

function xsRadarCoachDecisionV1(
  positionUsed: XsRadarPositionV1,
  metrics: XsRadarMetricsByPositionV1,
  confidence: XsRadarConfidenceEnhancedV1,
  matchContext?: XsCardMatchContextV1 | null
): XsRadarCoachDecisionV1 {
  const rawOverall = xsRadarClampV1(metrics.overall ?? xsRadarWeightedOverallByPositionV1(positionUsed, metrics));
  const confidenceScore = xsRadarClampV1(confidence.score);
  const adjustedOverall = confidenceScore < 50 ? xsRadarClampV1(rawOverall * 0.85) : rawOverall;
  const formSignal = xsRadarClampV1(metrics.l5 ?? metrics.form);
  const regularity = xsRadarClampV1(metrics.regularity);
  const match = xsRadarMatchBonusV1(matchContext);
  const scoreSeries = (Array.isArray(metrics.scoreSeries) ? metrics.scoreSeries : [])
    .map((score) => xsRadarNumV1(score))
    .filter((score): score is number => typeof score === "number" && Number.isFinite(score))
    .map((score) => xsRadarClampV1(score))
    .slice(0, 15);
  const trend = xsRadarTrendV1(scoreSeries);
  const volatility = xsRadarVolatilityV1(scoreSeries);
  const ceiling = xsRadarCeilingV1(scoreSeries);
  const advanced = xsRadarAdvancedDecisionBonusV1(trend, volatility, ceiling);
  const baseScore =
    adjustedOverall * 0.4 +
      formSignal * 0.2 +
      regularity * 0.15 +
      confidenceScore * 0.15 +
      match.bonus;
  const score = Math.round(xsRadarClampV1(
    baseScore +
      advanced.trendBonus +
      advanced.ceilingBonus +
      advanced.volatilityPenalty
  ));

  const reasons: string[] = [];
  if (formSignal >= 60) reasons.push("Bonne forme L5");
  else if (formSignal < 45) reasons.push("Forme L5 fragile");
  else reasons.push("Forme L5 correcte");

  if (regularity >= 60) reasons.push("Régularité solide");
  else if (regularity < 45) reasons.push("Régularité fragile");

  if (confidenceScore < 50) reasons.push("Confiance faible, radar réduit");
  else if (confidenceScore >= 70) reasons.push("Confiance élevée");

  if (match.bonus > 0) reasons.push(`Contexte favorable: ${match.reason}`);
  else if (match.bonus < 0) reasons.push(`Contexte pénalisant: ${match.reason}`);
  else reasons.push(match.reason);

  if (trend === "up") reasons.push("Trend en hausse");
  else if (trend === "down") reasons.push("Trend en baisse");
  else reasons.push("Trend stable");

  if (volatility === "high") reasons.push("Volatilité élevée");
  else if (volatility === "medium") reasons.push("Volatilité moyenne");
  else if (volatility === "stable") reasons.push("Volatilité stable");

  if (ceiling >= 80) reasons.push(`Plafond très haut (${ceiling})`);
  else if (ceiling >= 70) reasons.push(`Plafond intéressant (${ceiling})`);

  const decision = xsRadarCoachLabelV1(score);
  return {
    score,
    decision,
    tone: xsRadarCoachToneV1(score),
    adjustedOverall: Math.round(adjustedOverall),
    rawOverall: Math.round(rawOverall),
    matchBonus: match.bonus,
    trend,
    volatility,
    ceiling,
    reasons,
    reason: reasons.join(" · "),
  };
}

function xsRadarRecommendationFromCoachV1(
  coachDecision: XsRadarCoachDecisionV1,
  baseRecommendation: XsRadarRecommendationV1,
  matchContext?: XsCardMatchContextV1 | null
): XsRadarRecommendationV1 {
  const opponentText = matchContext?.opponentName ? ` contre ${matchContext.opponentName}` : "";
  return {
    label: coachDecision.decision,
    tone: coachDecision.tone,
    reason: `${coachDecision.decision} : score coach ${coachDecision.score}${opponentText}. ${coachDecision.reason || baseRecommendation.reason}`,
  };
}
/* XS_RADAR_DECISION_ENGINE_V1_END */

/* XS_RADAR_DECISION_ENGINE_V2 */
function xsRadarDecisionToneToRecommendationToneV2(tone: XsRadarDecisionV2["finalTone"]): XsRadarRecommendationV1["tone"] {
  if (tone === "strongPlay" || tone === "play" || tone === "joker") return "play";
  if (tone === "avoid") return "avoid";
  if (tone === "risk") return "risky";
  return "watch";
}

function xsRadarDecisionV2PushBullet(bullets: string[], value: string) {
  const text = String(value || "").trim();
  if (text && bullets.length < 3) bullets.push(text);
}

function xsRadarDecisionDowngradeV2(decision: XsRadarDecisionV2): XsRadarDecisionV2 {
  const map: Record<XsRadarDecisionV2["finalTone"], XsRadarDecisionV2> = {
    strongPlay: {
      finalLabel: "À aligner",
      finalTone: "play",
      playStyle: decision.playStyle === "Safe pick" ? "Stable starter" : decision.playStyle,
      summary: decision.summary.replace(/^Titulaire évident\s*:\s*/i, "À aligner : "),
      bullets: decision.bullets.slice(),
    },
    play: {
      finalLabel: "Borderline",
      finalTone: "borderline",
      playStyle: "Watchlist",
      summary: "Borderline : bon profil mais contexte difficile.",
      bullets: decision.bullets.slice(),
    },
    joker: {
      finalLabel: "Pari risqué",
      finalTone: "risk",
      playStyle: "Boom/Bust",
      summary: "Pari risqué : profil explosif mais contexte difficile.",
      bullets: decision.bullets.slice(),
    },
    borderline: {
      finalLabel: "Pari risqué",
      finalTone: "risk",
      playStyle: "Watchlist",
      summary: "Pari risqué : contexte difficile pour un profil déjà limite.",
      bullets: decision.bullets.slice(),
    },
    risk: {
      finalLabel: "À éviter",
      finalTone: "avoid",
      playStyle: "Watchlist",
      summary: "À éviter : risque renforcé par le contexte.",
      bullets: decision.bullets.slice(),
    },
    avoid: decision,
  };
  return map[decision.finalTone] || decision;
}

function xsRadarDecisionEngineV2(
  positionUsed: XsRadarPositionV1,
  metrics: XsRadarMetricsByPositionV1,
  coachDecision: XsRadarCoachDecisionV1,
  matchContext?: XsCardMatchContextV1 | null
): XsRadarDecisionV2 {
  const scoreCoach = xsRadarClampV1(coachDecision?.score ?? metrics.coachScore ?? 0);
  const confidence = xsRadarClampV1(
    metrics.confidenceScore ??
      (typeof metrics.confidence === "number" ? metrics.confidence * 100 : 0)
  );
  const trend = coachDecision?.trend || "stable";
  const volatility = coachDecision?.volatility || "unknown";
  const ceiling = xsRadarClampV1(coachDecision?.ceiling ?? 0);
  const gameTime = xsRadarClampV1(metrics.gameTime);
  const regularity = xsRadarClampV1(metrics.regularity);
  const hardMatch = matchContext?.difficulty === "hard";
  const easyHome = matchContext?.difficulty === "easy" && matchContext?.homeAway === "home";
  const homeText = matchContext?.homeAway === "home" ? " à domicile" : "";
  const positionText = positionUsed === "FW" ? "offensif" : positionUsed === "GK" ? "gardien" : positionUsed === "DEF" ? "défensif" : "profil";

  let result: XsRadarDecisionV2;
  const bullets: string[] = [];

  if (gameTime < 40 || scoreCoach < 45 || (trend === "down" && volatility === "high")) {
    xsRadarDecisionV2PushBullet(bullets, gameTime < 40 ? "Temps de jeu trop faible" : "Score coach insuffisant");
    if (trend === "down" && volatility === "high") xsRadarDecisionV2PushBullet(bullets, "Forme en baisse + scores irréguliers");
    xsRadarDecisionV2PushBullet(bullets, confidence < 45 ? "Confiance faible, prudence" : "Décision prudente");
    result = {
      finalLabel: "À éviter",
      finalTone: "avoid",
      playStyle: gameTime < 40 ? "Rotation risk" : "Watchlist",
      summary: "À éviter : signaux trop négatifs pour l'aligner sereinement.",
      bullets,
    };
  } else if (scoreCoach >= 75 && confidence >= 60 && (volatility === "stable" || volatility === "medium") && (trend === "up" || trend === "stable")) {
    xsRadarDecisionV2PushBullet(bullets, trend === "up" ? "Forme en hausse" : "Forme stable");
    xsRadarDecisionV2PushBullet(bullets, volatility === "stable" ? "Risque maîtrisé" : "Risque acceptable");
    xsRadarDecisionV2PushBullet(bullets, easyHome ? "Contexte favorable à domicile" : "Confiance suffisante");
    result = {
      finalLabel: "Titulaire évident",
      finalTone: "strongPlay",
      playStyle: "Safe pick",
      summary: `Titulaire évident : score coach fort, ${positionText} fiable et risque contenu.`,
      bullets,
    };
  } else if (scoreCoach >= 65 && confidence >= 50) {
    xsRadarDecisionV2PushBullet(bullets, "Score coach solide");
    xsRadarDecisionV2PushBullet(bullets, trend === "up" ? "Forme en hausse" : "Base exploitable");
    xsRadarDecisionV2PushBullet(bullets, easyHome ? "Contexte favorable à domicile" : "Confiance correcte");
    result = {
      finalLabel: "À aligner",
      finalTone: "play",
      playStyle: trend === "up" ? "Form player" : "Stable starter",
      summary: `À aligner : score coach solide${easyHome ? " et contexte favorable" : ""}.`,
      bullets,
    };
  } else if (trend === "up" && ceiling >= 75 && (volatility === "high" || volatility === "medium")) {
    xsRadarDecisionV2PushBullet(bullets, "Forme en hausse");
    xsRadarDecisionV2PushBullet(bullets, `Plafond élevé (${Math.round(ceiling)})`);
    xsRadarDecisionV2PushBullet(bullets, volatility === "high" ? "Risque élevé : scores irréguliers" : "Profil variable");
    result = {
      finalLabel: "Différentiel intéressant",
      finalTone: "joker",
      playStyle: "Boom/Bust",
      summary: "Différentiel intéressant : trend positif, plafond haut, mais risque réel.",
      bullets,
    };
  } else if (scoreCoach >= 55 && scoreCoach < 65) {
    xsRadarDecisionV2PushBullet(bullets, "Score coach intermédiaire");
    xsRadarDecisionV2PushBullet(bullets, regularity < 50 ? "Régularité limite" : "Profil jouable mais pas dominant");
    xsRadarDecisionV2PushBullet(bullets, easyHome ? "Contexte favorable à domicile" : "Décision à arbitrer");
    result = {
      finalLabel: "Borderline",
      finalTone: "borderline",
      playStyle: ceiling >= 75 ? "High ceiling" : "Watchlist",
      summary: "Borderline : profil utilisable, mais pas assez clair pour être prioritaire.",
      bullets,
    };
  } else if (confidence < 45 || regularity < 45 || volatility === "high") {
    xsRadarDecisionV2PushBullet(bullets, confidence < 45 ? "Confiance faible, prudence" : "Signal fiable limité");
    xsRadarDecisionV2PushBullet(bullets, regularity < 45 ? "Régularité fragile" : "Risque élevé : scores irréguliers");
    xsRadarDecisionV2PushBullet(bullets, ceiling >= 75 ? `Plafond élevé (${Math.round(ceiling)})` : "À réserver aux gros paris");
    result = {
      finalLabel: "Pari risqué",
      finalTone: "risk",
      playStyle: ceiling >= 75 ? "Boom/Bust" : "Watchlist",
      summary: "Pari risqué : le profil peut payer, mais les signaux sont instables.",
      bullets,
    };
  } else {
    xsRadarDecisionV2PushBullet(bullets, "Données encore limitées");
    xsRadarDecisionV2PushBullet(bullets, "Décision prudente");
    result = {
      finalLabel: "À surveiller",
      finalTone: "borderline",
      playStyle: "Watchlist",
      summary: "Données encore limitées, décision prudente.",
      bullets,
    };
  }

  if (hardMatch && !(scoreCoach > 80 && confidence > 70)) {
    result = xsRadarDecisionDowngradeV2(result);
    xsRadarDecisionV2PushBullet(result.bullets, "Match difficile : décision abaissée");
    result.summary = `${result.finalLabel} : contexte difficile${homeText}, décision abaissée d'un cran.`;
  } else if (easyHome) {
    xsRadarDecisionV2PushBullet(result.bullets, "Contexte favorable à domicile");
    if (!/contexte favorable/i.test(result.summary)) {
      result.summary = `${result.summary.replace(/\.$/, "")}, contexte favorable à domicile.`;
    }
  }

  return {
    ...result,
    bullets: result.bullets.slice(0, 3),
  };
}

function xsRadarRecommendationFromDecisionV2(
  decisionV2: XsRadarDecisionV2,
  fallback: XsRadarRecommendationV1
): XsRadarRecommendationV1 {
  if (!decisionV2) return fallback;
  return {
    label: decisionV2.finalLabel,
    tone: xsRadarDecisionToneToRecommendationToneV2(decisionV2.finalTone),
    reason: decisionV2.summary || fallback.reason,
  };
}
/* XS_RADAR_DECISION_ENGINE_V2_END */

/* XS_COACH_DECISION_SMART_REASONS_V1 */
function xsCoachDecisionSmartMetricV1(value: any, fallback = 0): number {
  const n = xsRadarNumV1(value);
  return xsRadarClampV1(n == null ? fallback : n);
}

function xsCoachDecisionSmartPushV1(
  list: XsCoachDecisionSmartItemV1[],
  item: XsCoachDecisionSmartItemV1 | null | undefined
) {
  if (!item || !String(item.title || "").trim()) return;
  const exists = list.some((x) => String(x.title).trim().toLowerCase() === String(item.title).trim().toLowerCase());
  if (!exists) list.push(item);
}

function xsCoachDecisionPositionSignalV1(positionUsed: XsRadarPositionV1, metrics: XsRadarMetricsByPositionV1) {
  if (positionUsed === "GK") {
    const value = Math.max(
      xsCoachDecisionSmartMetricV1(metrics.saves),
      xsCoachDecisionSmartMetricV1(metrics.cleanSheets),
      xsCoachDecisionSmartMetricV1(metrics.reliability)
    );
    return {
      value,
      strongTitle: value >= 65 ? "Base gardien solide" : "Base gardien limitée",
      strongText: value >= 65 ? `Arrêts, clean sheets ou fiabilité à ${Math.round(value)}/100.` : `Signal gardien à ${Math.round(value)}/100.`,
      weakTitle: "Apport gardien insuffisant",
      weakText: `Les signaux gardien restent bas (${Math.round(value)}/100).`,
    };
  }
  if (positionUsed === "DEF") {
    const value = Math.max(xsCoachDecisionSmartMetricV1(metrics.defense), xsCoachDecisionSmartMetricV1(metrics.duels));
    return {
      value,
      strongTitle: "Volume défensif fiable",
      strongText: `Défense/duels ressortent à ${Math.round(value)}/100.`,
      weakTitle: "Impact défensif limité",
      weakText: `Défense/duels trop bas (${Math.round(value)}/100).`,
    };
  }
  if (positionUsed === "MID") {
    const value = Math.max(xsCoachDecisionSmartMetricV1(metrics.creation), xsCoachDecisionSmartMetricV1(metrics.impact));
    return {
      value,
      strongTitle: "Influence au milieu",
      strongText: `Création/impact montent à ${Math.round(value)}/100.`,
      weakTitle: "Influence limitée",
      weakText: `Création/impact trop neutres (${Math.round(value)}/100).`,
    };
  }
  if (positionUsed === "FW") {
    const value = Math.max(xsCoachDecisionSmartMetricV1(metrics.attack), xsCoachDecisionSmartMetricV1(metrics.impact));
    return {
      value,
      strongTitle: "Menace offensive réelle",
      strongText: `Attaque/impact montent à ${Math.round(value)}/100.`,
      weakTitle: "Impact offensif faible",
      weakText: `Attaque/impact insuffisants (${Math.round(value)}/100).`,
    };
  }
  const value = Math.max(xsCoachDecisionSmartMetricV1(metrics.impact), xsCoachDecisionSmartMetricV1(metrics.creation));
  return {
    value,
    strongTitle: "Impact utile",
    strongText: `Impact principal à ${Math.round(value)}/100.`,
    weakTitle: "Impact limité",
    weakText: `Impact principal trop bas (${Math.round(value)}/100).`,
  };
}

function xsCoachDecisionSmartConfidenceV1(
  metrics: XsRadarMetricsByPositionV1,
  coachDecision: XsRadarCoachDecisionV1,
  confidence: XsRadarConfidenceEnhancedV1
): XsRadarConfidenceEnhancedV1 {
  const matches = Math.max(0, Math.round(xsCoachDecisionSmartMetricV1(metrics.matches, 0)));
  const score = xsCoachDecisionSmartMetricV1(coachDecision.score);
  const windows = [metrics.l5, (metrics as any).l10 ?? (metrics as any).l15, metrics.l40]
    .map((value) => xsRadarNumV1(value))
    .filter((value): value is number => value != null)
    .map((value) => xsRadarClampV1(value));
  const spread = windows.length >= 2 ? Math.max(...windows) - Math.min(...windows) : 20;
  const volatility = coachDecision.volatility || "unknown";
  const negativeSignals = [
    metrics.form < 45,
    metrics.gameTime < 45,
    metrics.impact < 45,
    metrics.regularity < 45,
    metrics.reliability < 45,
    volatility === "high",
  ].filter(Boolean).length;

  let decisionScore = matches < 5 ? 36 : matches < 16 ? 58 : 72;
  if (volatility === "stable") decisionScore += 9;
  else if (volatility === "medium") decisionScore += 2;
  else if (volatility === "high") decisionScore -= 12;
  if (spread <= 12 && windows.length >= 2) decisionScore += 9;
  else if (spread >= 25) decisionScore -= 10;
  if (score >= 75 || score < 35) decisionScore += 6;
  if (metrics.detailedStats !== true) decisionScore -= 4;
  if (score < 40 && negativeSignals >= 3 && matches >= 6) decisionScore += 5;
  if (score < 40) decisionScore = Math.min(decisionScore, 68);

  const finalScore = Math.round(xsRadarClampV1(decisionScore));
  const label = finalScore < 50 ? "Faible" : finalScore < 70 ? "Moyen" : "Élevé";
  const target = score < 45 ? "dans la décision d'éviter" : "dans la décision d'aligner";
  const reason = `Confiance ${target} : ${matches} match${matches > 1 ? "s" : ""}, stabilité ${volatility}, écart L5/L10/L40 ${Math.round(spread)} pts.`;
  return {
    score: finalScore,
    label,
    color: finalScore < 50 ? "red" : finalScore < 70 ? "orange" : "green",
    reason: reason || confidence.reason,
  };
}

/* XS_COACH_DECISION_V2_DEEP_ANALYSIS */
function xsCoachDecisionDeepItemV2(icon: string, title: string, text: string): XsCoachDecisionSmartItemV1 {
  return { icon, title, text };
}

function xsCoachDecisionDeepPushV2(
  list: XsCoachDecisionSmartItemV1[],
  item: XsCoachDecisionSmartItemV1 | null | undefined,
  max = 3
) {
  if (!item || list.length >= max) return;
  const title = String(item.title || "").trim();
  if (!title) return;
  const exists = list.some((x) => String(x.title || "").trim().toLowerCase() === title.toLowerCase());
  if (!exists) list.push(item);
}

/* XS_PLAYER_STATUS_DECISION_V1 */
function xsNormalizePlayerStatusV1(value: any, playerSlug?: string | null): XsPlayerStatusV1 {
  const raw = String(value?.status || value?.availability || value?.playerStatus || "").trim().toLowerCase();
  const pickNumber = (...values: any[]): number | null => {
    for (const item of values) {
      const n = Number(item);
      if (Number.isFinite(n)) return n;
    }
    return null;
  };
  const status: XsPlayerStatusCodeV1 =
    raw === "available" || raw === "fit" || raw === "ok"
      ? "available"
      : raw === "injured" || raw === "injury" || raw === "out" || raw === "unavailable"
        ? "injured"
        : raw === "suspended" || raw === "suspension" || raw === "ban"
          ? "suspended"
          : raw === "doubtful" || raw === "uncertain" || raw === "questionable" || raw === "doubt"
            ? "doubtful"
            : "unknown";
  return {
    playerSlug: value?.playerSlug || playerSlug || null,
    status,
    reason: String(value?.reason || value?.details || value?.label || "").trim() || null,
    expectedReturnDate: value?.expectedReturnDate || value?.returnDate || value?.estimatedReturnDate || null,
    source: value?.source || null,
    sourceUrl: value?.sourceUrl || value?.url || null,
    updatedAt: value?.updatedAt || null,
    yellowCards: pickNumber(value?.yellowCards, value?.cards?.yellow, value?.discipline?.yellowCards),
    redCards: pickNumber(value?.redCards, value?.cards?.red, value?.discipline?.redCards),
    suspensionMatches: pickNumber(value?.suspensionMatches, value?.suspendedMatches, value?.banMatches, value?.discipline?.suspensionMatches),
    injuryDate: value?.injuryDate || value?.startDate || null,
    statusDate: value?.statusDate || value?.reportedAt || value?.updatedAt || null,
  };
}

function xsPlayerStatusAvailabilityItemV1(statusValue?: XsPlayerStatusV1 | null): XsCoachDecisionSmartItemV1 {
  const status = statusValue?.status || "unknown";
  const returnText = statusValue?.expectedReturnDate ? ` Retour estimé : ${statusValue.expectedReturnDate}.` : "";
  const reason = statusValue?.reason ? `${statusValue.reason}${returnText}` : "";
  if (status === "injured") {
    return { icon: "!", title: "Blessé", text: reason || `Indisponible jusqu'à confirmation médicale.${returnText}`.trim() };
  }
  if (status === "suspended") {
    return { icon: "!", title: "Suspendu", text: reason || `Ne pas aligner tant que la suspension n'est pas levée.${returnText}`.trim() };
  }
  if (status === "doubtful") {
    return { icon: "?", title: "Incertain", text: reason || `Participation à confirmer avant lock.${returnText}`.trim() };
  }
  if (status === "available") {
    return { icon: "✓", title: "Disponible", text: reason || "Aucun signal d'indisponibilité confirmé." };
  }
  return { icon: "?", title: "Statut non confirmé", text: reason || "Aucune donnée fiable de disponibilité." };
}

function xsCoachDecisionDeepTrendV2(l5: number, L10: number, l40: number): "up" | "down" | "stable" | "mixed" {
  const baseline = xsRadarAvgV1([L10, l40]) ?? L10;
  const spread = Math.max(l5, L10, l40) - Math.min(l5, L10, l40);
  if (spread <= 7) return "stable";
  if (l5 - baseline >= 7) return "up";
  if (baseline - l5 >= 7) return "down";
  return "mixed";
}

function xsCoachDecisionDeepPositionSignalV2(positionUsed: XsRadarPositionV1, metrics: XsRadarMetricsByPositionV1) {
  if (positionUsed === "GK") {
    const value = Math.max(
      xsCoachDecisionSmartMetricV1(metrics.gameTime),
      xsCoachDecisionSmartMetricV1(metrics.cleanSheets),
      xsCoachDecisionSmartMetricV1(metrics.saves),
      xsCoachDecisionSmartMetricV1(metrics.reliability)
    );
    return {
      value,
      positive: xsCoachDecisionDeepItemV2("◆", "Base gardien fiable", `Minutes/fiabilité gardien à ${Math.round(value)}/100.`),
      negative: xsCoachDecisionDeepItemV2("!", "Base gardien fragile", `Minutes, clean sheet ou fiabilité trop bas (${Math.round(value)}/100).`),
    };
  }
  if (positionUsed === "DEF") {
    const value = Math.max(xsCoachDecisionSmartMetricV1(metrics.defense), xsCoachDecisionSmartMetricV1(metrics.duels), xsCoachDecisionSmartMetricV1(metrics.reliability));
    return {
      value,
      positive: xsCoachDecisionDeepItemV2("◆", "Bon volume défensif", `Défense/duels/fiabilité à ${Math.round(value)}/100.`),
      negative: xsCoachDecisionDeepItemV2("!", "Volume défensif faible", `Défense ou duels insuffisants (${Math.round(value)}/100).`),
    };
  }
  if (positionUsed === "MID") {
    const value = Math.max(xsCoachDecisionSmartMetricV1(metrics.creation), xsCoachDecisionSmartMetricV1(metrics.impact), xsCoachDecisionSmartMetricV1(metrics.regularity));
    return {
      value,
      positive: xsCoachDecisionDeepItemV2("◆", "Influence au milieu", `Création/impact/régularité à ${Math.round(value)}/100.`),
      negative: xsCoachDecisionDeepItemV2("!", "Influence limitée", `Création ou impact trop neutres (${Math.round(value)}/100).`),
    };
  }
  if (positionUsed === "FW") {
    const value = Math.max(xsCoachDecisionSmartMetricV1(metrics.attack), xsCoachDecisionSmartMetricV1(metrics.impact));
    return {
      value,
      positive: xsCoachDecisionDeepItemV2("◆", "Menace offensive", `Attaque/impact à ${Math.round(value)}/100.`),
      negative: xsCoachDecisionDeepItemV2("!", "Menace offensive faible", `Attaque ou impact insuffisants (${Math.round(value)}/100).`),
    };
  }
  const value = Math.max(xsCoachDecisionSmartMetricV1(metrics.impact), xsCoachDecisionSmartMetricV1(metrics.reliability));
  return {
    value,
    positive: xsCoachDecisionDeepItemV2("◆", "Impact utile", `Impact/fiabilité à ${Math.round(value)}/100.`),
    negative: xsCoachDecisionDeepItemV2("!", "Impact limité", `Impact ou fiabilité trop bas (${Math.round(value)}/100).`),
  };
}

function xsCoachDecisionDeepMainReasonV2(
  score: number,
  metrics: XsRadarMetricsByPositionV1,
  positionUsed: XsRadarPositionV1,
  matchContext: XsCardMatchContextV1 | null | undefined,
  trend: "up" | "down" | "stable" | "mixed",
  positionSignal: ReturnType<typeof xsCoachDecisionDeepPositionSignalV2>
): XsCoachDecisionSmartItemV1 {
  const form = xsCoachDecisionSmartMetricV1(metrics.l5 ?? metrics.form);
  const gameTime = xsCoachDecisionSmartMetricV1(metrics.gameTime);
  const impact = xsCoachDecisionSmartMetricV1(metrics.impact);
  const regularity = xsCoachDecisionSmartMetricV1(metrics.regularity);
  const reliability = xsCoachDecisionSmartMetricV1(metrics.reliability);
  const contextHard = matchContext?.difficulty === "hard";
  const contextGood = matchContext?.difficulty === "easy" || (matchContext?.difficulty === "medium" && matchContext?.homeAway === "home");

  if (score < 40) {
    const weak = [
      xsCoachDecisionDeepItemV2("↓", "Forme insuffisante", `L5 ${Math.round(form)} : les derniers scores ne donnent pas assez de garanties.`),
      xsCoachDecisionDeepItemV2("!", "Temps de jeu trop faible", `Sécurité minutes ${Math.round(gameTime)}/100, risque fort de rôle limité.`),
      xsCoachDecisionDeepItemV2("!", "Impact limité", `Impact Sorare ${Math.round(impact)}/100, poids trop faible dans les scores.`),
      xsCoachDecisionDeepItemV2("~", "Régularité faible", `Régularité ${Math.round(regularity)}/100, plancher trop fragile.`),
      positionSignal.negative,
    ];
    const values = [form, gameTime, impact, regularity, positionSignal.value];
    const weakestIndex = values.reduce((best, value, index) => (value < values[best] ? index : best), 0);
    if (contextGood && values[weakestIndex] > 48) {
      return xsCoachDecisionDeepItemV2("⌂", "Contexte insuffisant", "Match jouable, mais les métriques joueur restent trop faibles.");
    }
    return weak[weakestIndex];
  }

  if (score >= 70) {
    if (gameTime >= 72) return xsCoachDecisionDeepItemV2("▶", "Temps de jeu sécurisant", `Minutes très fiables (${Math.round(gameTime)}/100), bon socle Sorare.`);
    if (positionSignal.value >= 65) return positionSignal.positive;
    if (impact >= 65) return xsCoachDecisionDeepItemV2("★", "Impact Sorare fort", `Impact ${Math.round(impact)}/100, il pèse vraiment dans le scoring.`);
    if (trend === "up") return xsCoachDecisionDeepItemV2("↗", "Dynamique positive", "L5 au-dessus du L10/L40, forme récente confirmée.");
    if (contextGood) return xsCoachDecisionDeepItemV2("⌂", "Contexte favorable", "Match abordable qui renforce une base déjà solide.");
    if (contextHard) return xsCoachDecisionDeepItemV2("◆", "Profil solide malgré le match", "Le score reste haut malgré un contexte plus exigeant.");
    return xsCoachDecisionDeepItemV2("✓", "Profil complet", "Aucun axe faible majeur dans la synthèse L5/L10/L40.");
  }

  if (score >= 55) {
    if (gameTime >= 65) return xsCoachDecisionDeepItemV2("▶", "Base minutes correcte", `Temps de jeu ${Math.round(gameTime)}/100, utile sans être premium.`);
    if (trend === "up") return xsCoachDecisionDeepItemV2("↗", "Forme récente utile", "L5 supérieur au fond L10/L40, mais confirmation encore nécessaire.");
    if (positionSignal.value >= 60) return positionSignal.positive;
    return xsCoachDecisionDeepItemV2("=", "Option équilibrée", "Quelques signaux positifs, mais pas assez pour un statut prioritaire.");
  }

  if (gameTime < 55) return xsCoachDecisionDeepItemV2("!", "Dépend trop du temps de jeu", `Minutes fragiles (${Math.round(gameTime)}/100), risque de rendement incomplet.`);
  if (trend === "down") return xsCoachDecisionDeepItemV2("↓", "Baisse récente", "L5 inférieur au L10/L40, dynamique négative.");
  if (regularity < 55) return xsCoachDecisionDeepItemV2("~", "Régularité fragile", `Régularité ${Math.round(regularity)}/100, profil difficile à sécuriser.`);
  if (reliability < 55) return xsCoachDecisionDeepItemV2("!", "Fiabilité limitée", `Fiabilité ${Math.round(reliability)}/100, décision prudente.`);
  return xsCoachDecisionDeepItemV2("?", "Profil de dépannage", "Quelques arguments existent, mais la synthèse reste trop moyenne.");
}

function xsBuildCoachDecisionDeepAnalysisV2(
  positionUsed: XsRadarPositionV1,
  metrics: XsRadarMetricsByPositionV1,
  coachDecision: XsRadarCoachDecisionV1,
  confidence: XsRadarConfidenceEnhancedV1,
  matchContext?: XsCardMatchContextV1 | null,
  playerStatus?: XsPlayerStatusV1 | null
): XsCoachDecisionDeepAnalysisV2 {
  const score = xsCoachDecisionSmartMetricV1(coachDecision.score);
  const l5 = xsCoachDecisionSmartMetricV1(metrics.l5 ?? metrics.form);
  const L10 = xsCoachDecisionSmartMetricV1((metrics as any).l10 ?? (metrics as any).l15 ?? metrics.form);
  const l40 = xsCoachDecisionSmartMetricV1(metrics.l40 ?? metrics.form);
  const gameTime = xsCoachDecisionSmartMetricV1(metrics.gameTime);
  const impact = xsCoachDecisionSmartMetricV1(metrics.impact);
  const regularity = xsCoachDecisionSmartMetricV1(metrics.regularity);
  const reliability = xsCoachDecisionSmartMetricV1(metrics.reliability);
  const ceiling = xsCoachDecisionSmartMetricV1(coachDecision.ceiling);
  const volatility = coachDecision.volatility || "unknown";
  const trend = xsCoachDecisionDeepTrendV2(l5, L10, l40);
  const positionSignal = xsCoachDecisionDeepPositionSignalV2(positionUsed, metrics);
  const contextGood = matchContext?.difficulty === "easy" || (matchContext?.difficulty === "medium" && matchContext?.homeAway === "home");
  const contextHard = matchContext?.difficulty === "hard";
  const positive: XsCoachDecisionSmartItemV1[] = [];
  const negative: XsCoachDecisionSmartItemV1[] = [];
  const positiveLimit = score < 40 ? 1 : 3;

  if (gameTime >= 70) xsCoachDecisionDeepPushV2(positive, xsCoachDecisionDeepItemV2("▶", "Temps de jeu stable", `Minutes solides (${Math.round(gameTime)}/100).`), positiveLimit);
  else if (gameTime < 55) xsCoachDecisionDeepPushV2(negative, xsCoachDecisionDeepItemV2("!", "Temps de jeu fragile", `Sécurité minutes ${Math.round(gameTime)}/100.`));

  if (trend === "up" && score >= 40) xsCoachDecisionDeepPushV2(positive, xsCoachDecisionDeepItemV2("↗", "L5 supérieur au fond", `L5 ${Math.round(l5)} au-dessus du L10/L40.`), positiveLimit);
  else if (trend === "down") xsCoachDecisionDeepPushV2(negative, xsCoachDecisionDeepItemV2("↓", "L5 inférieur au L10/L40", `L5 ${Math.round(l5)}, dynamique récente en baisse.`));
  else if (trend === "stable" && score >= 55) xsCoachDecisionDeepPushV2(positive, xsCoachDecisionDeepItemV2("=", "Courbe stable", `L5/L10/L40 cohérents autour de ${Math.round(xsRadarAvgV1([l5, L10, l40]) ?? l5)}.`), positiveLimit);

  if (positionSignal.value >= 62 && score >= 40) xsCoachDecisionDeepPushV2(positive, positionSignal.positive, positiveLimit);
  else if (positionSignal.value < 50) xsCoachDecisionDeepPushV2(negative, positionSignal.negative);

  if (impact >= 65) xsCoachDecisionDeepPushV2(positive, xsCoachDecisionDeepItemV2("★", "Impact réel", `Impact Sorare ${Math.round(impact)}/100.`), positiveLimit);
  else if (impact < 50) xsCoachDecisionDeepPushV2(negative, xsCoachDecisionDeepItemV2("!", "Impact limité", `Impact Sorare ${Math.round(impact)}/100.`));

  if (regularity >= 65 && score >= 55) xsCoachDecisionDeepPushV2(positive, xsCoachDecisionDeepItemV2("✓", "Régularité solide", `Régularité ${Math.round(regularity)}/100.`), positiveLimit);
  else if (regularity < 55) xsCoachDecisionDeepPushV2(negative, xsCoachDecisionDeepItemV2("~", "Régularité faible", `Régularité ${Math.round(regularity)}/100.`));

  if (ceiling >= 75 && score >= 40) xsCoachDecisionDeepPushV2(positive, xsCoachDecisionDeepItemV2("◎", "Plafond intéressant", `Pic déjà observé à ${Math.round(ceiling)}.`), positiveLimit);
  if (ceiling >= 70 && (volatility === "high" || regularity < 55 || score < 55)) {
    xsCoachDecisionDeepPushV2(negative, xsCoachDecisionDeepItemV2("◎", "Score dépend d'un pic", `Plafond ${Math.round(ceiling)}, mais base instable.`));
  }

  if (contextGood) {
    if (score >= 55) xsCoachDecisionDeepPushV2(positive, xsCoachDecisionDeepItemV2("⌂", "Match abordable", matchContext?.opponentName ? `Contexte favorable contre ${matchContext.opponentName}.` : "Contexte match favorable."), positiveLimit);
    else xsCoachDecisionDeepPushV2(negative, xsCoachDecisionDeepItemV2("⌂", "Contexte favorable insuffisant", "Le match aide, mais ne compense pas les faiblesses joueur."));
  } else if (contextHard) {
    const text = score >= 70 && gameTime >= 70
      ? "Match difficile, mais son temps de jeu limite le risque."
      : "Adversaire ou déplacement qui baisse la projection.";
    xsCoachDecisionDeepPushV2(negative, xsCoachDecisionDeepItemV2("!", "Contexte match difficile", text));
  }

  if (volatility === "high") xsCoachDecisionDeepPushV2(negative, xsCoachDecisionDeepItemV2("~", "Volatilité élevée", "Scores très variables, projection moins sûre."));
  else if (volatility === "medium" && score < 70) xsCoachDecisionDeepPushV2(negative, xsCoachDecisionDeepItemV2("~", "Variabilité à surveiller", "Scores variables sur les dernières fenêtres."));

  if (confidence.score < 50) xsCoachDecisionDeepPushV2(negative, xsCoachDecisionDeepItemV2("?", "Confiance décision faible", confidence.reason));
  if (score < 40 && negative.length < 2) xsCoachDecisionDeepPushV2(negative, xsCoachDecisionDeepItemV2("▾", "Plancher bas", `Score coach ${Math.round(score)}, trop peu de sécurité.`));
  if (score >= 70 && negative.length === 0) xsCoachDecisionDeepPushV2(negative, xsCoachDecisionDeepItemV2("✓", "Aucun frein majeur", "Pas de signal bloquant dans la synthèse actuelle."));

  const availability = xsPlayerStatusAvailabilityItemV1(playerStatus);
  const unavailable = playerStatus?.status === "injured" || playerStatus?.status === "suspended";
  const doubtful = playerStatus?.status === "doubtful";
  let mainReason = xsCoachDecisionDeepMainReasonV2(score, metrics, positionUsed, matchContext, trend, positionSignal);
  if (unavailable) {
    mainReason = availability;
    xsCoachDecisionDeepPushV2(negative, availability, 3);
  } else if (doubtful) {
    xsCoachDecisionDeepPushV2(negative, availability, 3);
  }

  let verdict =
    score >= 75
      ? (contextHard ? "À aligner : profil solide malgré le match." : "À aligner : profil fiable avec bon contexte.")
      : score >= 70
        ? "À aligner : signaux forts, risque contrôlé."
        : score >= 55
          ? "Option : utile mais pas prioritaire."
          : score >= 40
            ? (gameTime < 55 ? "Risqué : dépend trop du temps de jeu." : "Risqué : profil instable, plutôt dépannage.")
            : "À éviter : trop peu de garanties actuellement.";
  let actionAdvice =
    score >= 75 && confidence.score >= 60 && (gameTime >= 70 || reliability >= 65)
      ? xsCoachDecisionDeepItemV2("✓", "Conseil", "À aligner en priorité si tu cherches de la sécurité.")
      : score >= 70
        ? xsCoachDecisionDeepItemV2("✓", "Conseil", "À aligner si ton alternative n'offre pas plus de minutes.")
        : score >= 55 && trend === "up" && ceiling >= 70
          ? xsCoachDecisionDeepItemV2("◎", "Conseil", "Bon différentiel si tu acceptes le risque.")
          : score >= 55
            ? xsCoachDecisionDeepItemV2("=", "Conseil", "Bon pick secondaire, pas une priorité absolue.")
            : score >= 40
              ? xsCoachDecisionDeepItemV2("!", "Conseil", "À utiliser seulement si tu manques d'options à ce poste.")
              : ceiling >= 75
                ? xsCoachDecisionDeepItemV2("!", "Conseil", "À éviter sauf contest faible ou besoin de différentiel.")
                : xsCoachDecisionDeepItemV2("!", "Conseil", "À éviter : cherche un profil avec plus de garanties.");

  if (unavailable) {
    verdict = playerStatus?.status === "suspended"
      ? "À éviter : joueur suspendu."
      : "À éviter : joueur blessé.";
    actionAdvice = xsCoachDecisionDeepItemV2("!", "Conseil", "Ne pas aligner tant que le statut n'est pas levé.");
  } else if (doubtful && score >= 55) {
    verdict = "Incertain : attendre confirmation.";
    actionAdvice = xsCoachDecisionDeepItemV2("?", "Conseil", "À garder seulement si tu peux confirmer sa disponibilité avant lock.");
  }

  return {
    verdict,
    mainReason,
    positiveSignals: positive.slice(0, positiveLimit),
    negativeSignals: negative.slice(0, 3),
    actionAdvice,
    availability,
    playerStatus: playerStatus || null,
  };
}
/* XS_COACH_DECISION_V2_DEEP_ANALYSIS_END */

function xsCoachDecisionSmartReasonsV1(
  positionUsed: XsRadarPositionV1,
  metrics: XsRadarMetricsByPositionV1,
  coachDecision: XsRadarCoachDecisionV1,
  decisionV2: XsRadarDecisionV2,
  recommendation: XsRadarRecommendationV1,
  confidence: XsRadarConfidenceEnhancedV1,
  matchContext?: XsCardMatchContextV1 | null,
  playerStatus?: XsPlayerStatusV1 | null
): {
  coachDecision: XsRadarCoachDecisionV1;
  decisionV2: XsRadarDecisionV2;
  recommendation: XsRadarRecommendationV1;
  confidenceEnhanced: XsRadarConfidenceEnhancedV1;
} {
  const score = xsCoachDecisionSmartMetricV1(coachDecision.score);
  const form = xsCoachDecisionSmartMetricV1(metrics.l5 ?? metrics.form);
  const L10 = xsCoachDecisionSmartMetricV1((metrics as any).l10 ?? (metrics as any).l15 ?? metrics.form);
  const l40 = xsCoachDecisionSmartMetricV1(metrics.l40 ?? metrics.form);
  const gameTime = xsCoachDecisionSmartMetricV1(metrics.gameTime);
  const impact = xsCoachDecisionSmartMetricV1(metrics.impact);
  const regularity = xsCoachDecisionSmartMetricV1(metrics.regularity);
  const reliability = xsCoachDecisionSmartMetricV1(metrics.reliability);
  const ceiling = xsCoachDecisionSmartMetricV1(coachDecision.ceiling);
  const volatility = coachDecision.volatility || "unknown";
  const positionSignal = xsCoachDecisionPositionSignalV1(positionUsed, metrics);
  let decisionConfidence = xsCoachDecisionSmartConfidenceV1(metrics, coachDecision, confidence);
  const opponent = matchContext?.opponentName ? ` contre ${matchContext.opponentName}` : "";
  const contextGood = matchContext?.difficulty === "easy" || (matchContext?.difficulty === "medium" && matchContext?.homeAway === "home");
  const contextHard = matchContext?.difficulty === "hard";
  const why: XsCoachDecisionSmartItemV1[] = [];
  const risks: XsCoachDecisionSmartItemV1[] = [];
  const playerStatusCode = playerStatus?.status || "unknown";
  const statusUnavailable = playerStatusCode === "injured" || playerStatusCode === "suspended";
  const statusDoubtful = playerStatusCode === "doubtful";

  if (statusUnavailable) {
    decisionConfidence = xsRadarConfidenceFromScoreV1(
      Math.max(72, decisionConfidence.score),
      `Confiance élevée dans la décision d'éviter : ${playerStatusCode === "suspended" ? "joueur suspendu" : "joueur blessé"}.`
    );
  } else if (statusDoubtful) {
    decisionConfidence = xsRadarConfidenceFromScoreV1(
      Math.max(0, decisionConfidence.score - 18),
      "Confiance abaissée : disponibilité incertaine avant le match."
    );
  }

  if (score >= 70) {
    if (gameTime >= 70) xsCoachDecisionSmartPushV1(why, { icon: "▶", title: "Temps de jeu très fiable", text: `Sécurité minutes élevée (${Math.round(gameTime)}/100).` });
    if (positionSignal.value >= 62) xsCoachDecisionSmartPushV1(why, { icon: "◆", title: positionSignal.strongTitle, text: positionSignal.strongText });
    if (impact >= 62) xsCoachDecisionSmartPushV1(why, { icon: "★", title: "Impact Sorare élevé", text: `Impact à ${Math.round(impact)}/100 sur la fenêtre synthèse.` });
    if (form >= 60 && L10 >= 55) xsCoachDecisionSmartPushV1(why, { icon: "↗", title: "Forme confirmée", text: `L5 ${Math.round(form)} avec L10 ${Math.round(L10)}.` });
    if (contextGood) xsCoachDecisionSmartPushV1(why, { icon: "⌂", title: "Contexte jouable", text: `Match favorable${opponent || ""}.` });
    if (volatility === "high") xsCoachDecisionSmartPushV1(risks, { icon: "~", title: "Irrégularité à surveiller", text: "Plafond intéressant mais sorties encore instables." });
    if (regularity < 55) xsCoachDecisionSmartPushV1(risks, { icon: "!", title: "Régularité limite", text: `Régularité à ${Math.round(regularity)}/100.` });
    if (contextHard) xsCoachDecisionSmartPushV1(risks, { icon: "!", title: "Contexte difficile", text: `Adversaire dur${opponent || ""}.` });
    if (decisionConfidence.score < 55) xsCoachDecisionSmartPushV1(risks, { icon: "?", title: "Confiance à confirmer", text: decisionConfidence.reason });
    if (!risks.length) xsCoachDecisionSmartPushV1(risks, { icon: "✓", title: "Aucun signal bloquant", text: "Le profil reste cohérent avec le score coach." });
  } else if (score >= 55) {
    if (gameTime >= 62) xsCoachDecisionSmartPushV1(why, { icon: "▶", title: "Temps de jeu exploitable", text: `Minutes plutôt sûres (${Math.round(gameTime)}/100).` });
    if (form >= 58) xsCoachDecisionSmartPushV1(why, { icon: "↗", title: "Forme correcte", text: `L5 ${Math.round(form)}, signal récent utilisable.` });
    if (positionSignal.value >= 58) xsCoachDecisionSmartPushV1(why, { icon: "◆", title: positionSignal.strongTitle, text: positionSignal.strongText });
    if (impact >= 58) xsCoachDecisionSmartPushV1(why, { icon: "★", title: "Impact utile", text: `Impact à ${Math.round(impact)}/100.` });
    xsCoachDecisionSmartPushV1(why, { icon: "=", title: "Bon choix mais pas verrouillé", text: "Le score pousse à l'option, pas au lock." });
    if (regularity < 60) xsCoachDecisionSmartPushV1(risks, { icon: "~", title: "Régularité à confirmer", text: `Régularité ${Math.round(regularity)}/100.` });
    if (impact < 58) xsCoachDecisionSmartPushV1(risks, { icon: "!", title: "Impact encore moyen", text: `Impact ${Math.round(impact)}/100, marge limitée.` });
    if (volatility === "high" || volatility === "medium") xsCoachDecisionSmartPushV1(risks, { icon: "~", title: "Scores variables", text: volatility === "high" ? "Variabilité forte sur les derniers matchs." : "Variabilité présente mais acceptable." });
    if (contextHard) xsCoachDecisionSmartPushV1(risks, { icon: "!", title: "Match difficile", text: `Contexte qui limite la recommandation${opponent || ""}.` });
  } else if (score >= 40) {
    if (ceiling >= 70) xsCoachDecisionSmartPushV1(why, { icon: "◎", title: "Plafond exploitable", text: `Pic possible à ${Math.round(ceiling)}, mais profil instable.` });
    if (form >= 55) xsCoachDecisionSmartPushV1(why, { icon: "↗", title: "Signal récent positif", text: `L5 ${Math.round(form)}, utilisable seulement faute d'options.` });
    if (positionSignal.value >= 60) xsCoachDecisionSmartPushV1(why, { icon: "◆", title: positionSignal.strongTitle, text: `${positionSignal.strongText} Le reste ne suit pas assez.` });
    if (!why.length) xsCoachDecisionSmartPushV1(why, { icon: "?", title: "Profil seulement dépannage", text: "Peu de signaux forts pour justifier une place." });
    if (gameTime < 55) xsCoachDecisionSmartPushV1(risks, { icon: "!", title: "Temps de jeu fragile", text: `Sécurité minutes ${Math.round(gameTime)}/100.` });
    if (regularity < 55) xsCoachDecisionSmartPushV1(risks, { icon: "~", title: "Régularité fragile", text: `Régularité ${Math.round(regularity)}/100.` });
    if (impact < 55) xsCoachDecisionSmartPushV1(risks, { icon: "!", title: "Impact limité", text: `Impact Sorare ${Math.round(impact)}/100.` });
    if (contextHard || matchContext?.homeAway === "away") xsCoachDecisionSmartPushV1(risks, { icon: "!", title: "Contexte pénalisant", text: `${matchContext?.homeAway === "away" ? "Extérieur" : "Match dur"}${opponent || ""}.` });
  } else {
    if (form < 45) xsCoachDecisionSmartPushV1(why, { icon: "↓", title: "Forme insuffisante", text: `L5 ${Math.round(form)} : pas assez de garanties récentes.` });
    if (gameTime < 50) xsCoachDecisionSmartPushV1(why, { icon: "!", title: "Temps de jeu trop faible", text: `Sécurité minutes ${Math.round(gameTime)}/100, risque fort de minutes limitées.` });
    if (impact < 50) xsCoachDecisionSmartPushV1(why, { icon: "!", title: "Impact limité", text: `Impact Sorare ${Math.round(impact)}/100, poids trop faible dans les scores.` });
    if (regularity < 50) xsCoachDecisionSmartPushV1(why, { icon: "~", title: "Régularité faible", text: `Régularité ${Math.round(regularity)}/100.` });
    if (positionSignal.value < 50) xsCoachDecisionSmartPushV1(why, { icon: "◆", title: positionSignal.weakTitle, text: positionSignal.weakText });
    if (contextGood) xsCoachDecisionSmartPushV1(why, { icon: "⌂", title: "Contexte insuffisant", text: `Match jouable${opponent || ""}, mais il ne compense pas les signaux faibles.` });
    xsCoachDecisionSmartPushV1(risks, { icon: "▾", title: "Plancher bas", text: ceiling > 0 ? `Plafond seulement ${Math.round(ceiling)} avec score coach ${Math.round(score)}.` : `Score coach ${Math.round(score)}, marge trop faible.` });
    if (volatility === "high" || regularity < 50) xsCoachDecisionSmartPushV1(risks, { icon: "~", title: "Forte irrégularité", text: "Les scores ne donnent pas assez de constance." });
    if (reliability < 50 || gameTime < 50) xsCoachDecisionSmartPushV1(risks, { icon: "!", title: "Fiabilité faible", text: `Fiabilité ${Math.round(reliability)}/100 et minutes à surveiller.` });
    xsCoachDecisionSmartPushV1(risks, { icon: "?", title: `Confiance décision ${decisionConfidence.label.toLowerCase()}`, text: decisionConfidence.reason });
  }

  while (why.length < 3) {
    if (score >= 55) xsCoachDecisionSmartPushV1(why, { icon: "=", title: "Lecture équilibrée", text: `L5 ${Math.round(form)} · L10 ${Math.round(L10)} · L40 ${Math.round(l40)}.` });
    else xsCoachDecisionSmartPushV1(why, { icon: "!", title: "Signaux insuffisants", text: `L5 ${Math.round(form)} · impact ${Math.round(impact)} · minutes ${Math.round(gameTime)}.` });
    break;
  }

  const finalWhy = why.slice(0, 3);
  const finalRisks = risks.slice(0, 3);
  const mainWhy = finalWhy[0]?.title ? finalWhy[0].title.toLowerCase() : "lecture des signaux";
  const riskText = finalRisks[0]?.title ? ` Risque principal : ${finalRisks[0].title.toLowerCase()}.` : "";
  const fallbackSummary =
    score >= 70
      ? `À aligner : ${mainWhy}${opponent ? ` ${opponent}` : ""}.${riskText}`
      : score >= 55
        ? `Option : ${mainWhy}, mais la décision reste nuancée.${riskText}`
        : score >= 40
          ? `Pari risqué : utilisable seulement si manque d'options.${riskText}`
          : `À éviter : ${mainWhy} tire fortement la décision vers le bas.${riskText}`;
  let adjustedCoachDecision = coachDecision;
  let adjustedDecisionV2 = decisionV2;
  let adjustedRecommendation = recommendation;
  if (statusUnavailable) {
    const statusLabel = playerStatusCode === "suspended" ? "Suspendu" : "Blessé";
    const adjustedScore = Math.min(score, 18);
    adjustedCoachDecision = {
      ...coachDecision,
      score: adjustedScore,
      decision: "À éviter",
      tone: "avoid",
      reasons: [statusLabel, ...(coachDecision.reasons || [])].slice(0, 4),
      reason: `${statusLabel}: ne pas aligner tant que le statut n'est pas levé.`,
    };
    adjustedDecisionV2 = {
      ...decisionV2,
      finalLabel: "À éviter",
      finalTone: "avoid",
      playStyle: "Unavailable",
      summary: `${statusLabel}: ne pas aligner.`,
      bullets: [statusLabel, ...(decisionV2.bullets || [])].slice(0, 3),
    };
    adjustedRecommendation = {
      ...recommendation,
      label: "À éviter",
      tone: "avoid",
      reason: `${statusLabel}: ne pas aligner tant que le statut n'est pas levé.`,
    };
  } else if (statusDoubtful) {
    const adjustedScore = Math.max(0, score - 10);
    adjustedCoachDecision = {
      ...coachDecision,
      score: adjustedScore,
      decision: xsRadarCoachLabelV1(adjustedScore),
      tone: xsRadarCoachToneV1(adjustedScore),
      reasons: ["Disponibilité incertaine", ...(coachDecision.reasons || [])].slice(0, 4),
      reason: `Disponibilité incertaine: décision abaissée. ${coachDecision.reason || ""}`.trim(),
    };
    if (decisionV2.finalTone === "strongPlay" || decisionV2.finalTone === "play") {
      adjustedDecisionV2 = {
        ...decisionV2,
        finalLabel: "Pari risqué",
        finalTone: "risk",
        playStyle: "Rotation risk",
        summary: "Pari risqué : disponibilité à confirmer avant lock.",
        bullets: ["Disponibilité incertaine", ...(decisionV2.bullets || [])].slice(0, 3),
      };
      adjustedRecommendation = {
        ...recommendation,
        label: "Pari risqué",
        tone: "risky",
        reason: "Pari risqué : attendre une confirmation de disponibilité avant de l'aligner.",
      };
    }
  }
  const deepAnalysis = xsBuildCoachDecisionDeepAnalysisV2(
    positionUsed,
    metrics,
    adjustedCoachDecision,
    decisionConfidence,
    matchContext,
    playerStatus
  );
  const deepWhy = [deepAnalysis.mainReason, ...deepAnalysis.positiveSignals].slice(0, 3);
  const deepRisks = deepAnalysis.negativeSignals.length ? deepAnalysis.negativeSignals.slice(0, 3) : finalRisks;
  const summary = deepAnalysis.verdict || fallbackSummary;
  const bullets = [
    deepAnalysis.mainReason.title,
    ...deepAnalysis.positiveSignals.map((item) => item.title),
    ...deepRisks.map((item) => item.title),
    deepAnalysis.actionAdvice.title,
  ]
    .filter((item, index, list) => list.indexOf(item) === index)
    .slice(0, 3);
  const smartDecisionV2: XsRadarDecisionV2 = {
    ...adjustedDecisionV2,
    summary,
    bullets,
    whyItems: deepWhy.length ? deepWhy : finalWhy,
    riskItems: deepRisks,
    deepAnalysis,
  };
  const smartCoachDecision: XsRadarCoachDecisionV1 = {
    ...adjustedCoachDecision,
    reasons: bullets,
    reason: `${summary} ${deepAnalysis.mainReason.text} ${deepAnalysis.actionAdvice.text}`,
  };
  const smartRecommendation: XsRadarRecommendationV1 = {
    ...adjustedRecommendation,
    label: adjustedDecisionV2.finalLabel || adjustedRecommendation.label,
    reason: deepAnalysis.actionAdvice.text,
  };
  return {
    coachDecision: smartCoachDecision,
    decisionV2: smartDecisionV2,
    recommendation: smartRecommendation,
    confidenceEnhanced: decisionConfidence,
  };
}
/* XS_COACH_DECISION_SMART_REASONS_V1_END */

/* XS_COACH_DECISION_ACCUMULATED_WINDOWS_V1 */
type XsRadarWindowSnapshotV1 = {
  range: XsRadarRangeV1;
  overall: number;
  metrics: XsRadarMetricsByPositionV1;
};

function xsRadarConfidenceFromScoreV1(score: number, reason: string): XsRadarConfidenceEnhancedV1 {
  const safeScore = Math.round(xsRadarClampV1(score));
  return {
    score: safeScore,
    label: safeScore < 50 ? "Faible" : safeScore < 70 ? "Moyen" : "Élevé",
    color: safeScore < 50 ? "red" : safeScore < 70 ? "orange" : "green",
    reason,
  };
}

function xsRadarMinMatchesForWindowV1(range: XsRadarRangeV1): number {
  if (range === "L5") return 1;
  if (range === "L10") return 6;
  return 16;
}

function xsRadarWindowSnapshotV1(range: XsRadarRangeV1, radar: any): XsRadarWindowSnapshotV1 | null {
  const metrics = radar?.metrics as XsRadarMetricsByPositionV1 | undefined;
  const overall = xsRadarNumV1(radar?.overall ?? metrics?.overall ?? radar?.coachDecision?.rawOverall);
  if (!metrics || overall == null) return null;
  const matches = xsRadarNumV1(metrics.matches ?? radar?.matches) ?? 0;
  if (matches < xsRadarMinMatchesForWindowV1(range)) return null;
  return {
    range,
    overall: xsRadarClampV1(overall),
    metrics,
  };
}

function xsRadarWeightedMetricV1(
  windows: Array<XsRadarWindowSnapshotV1 & { weight: number }>,
  key: keyof XsRadarMetricsByPositionV1,
  fallback: number
): number {
  const weighted = windows
    .map((window) => {
      const value = xsRadarNumV1(window.metrics?.[key]);
      return value == null ? null : { value: xsRadarClampV1(value), weight: window.weight };
    })
    .filter((item): item is { value: number; weight: number } => item != null);

  const totalWeight = weighted.reduce((sum, item) => sum + item.weight, 0);
  if (totalWeight <= 0) return xsRadarClampV1(fallback);
  return xsRadarClampV1(weighted.reduce((sum, item) => sum + item.value * item.weight, 0) / totalWeight);
}

function xsBuildAccumulatedCoachDecisionV1(
  positionUsed: XsRadarPositionV1,
  activeMetrics: XsRadarMetricsByPositionV1,
  activeAutoProfile: XsRadarAutoProfileV1,
  activeMatchContext: XsCardMatchContextV1 | null,
  radarsByRange: Partial<Record<XsRadarRangeV1, any>>
): {
  coachDecision: XsRadarCoachDecisionV1;
  decisionV2: XsRadarDecisionV2;
  recommendation: XsRadarRecommendationV1;
  metrics: XsRadarMetricsByPositionV1;
} | null {
  const baseWeights: Record<XsRadarRangeV1, number> = { L5: 0.4, L10: 0.35, L40: 0.25 };
  const snapshots = (["L5", "L10", "L40"] as XsRadarRangeV1[])
    .map((range) => xsRadarWindowSnapshotV1(range, radarsByRange[range]))
    .filter((snapshot): snapshot is XsRadarWindowSnapshotV1 => snapshot != null);

  const weightTotal = snapshots.reduce((sum, snapshot) => sum + baseWeights[snapshot.range], 0);
  if (weightTotal <= 0) return null;

  const weightedWindows = snapshots.map((snapshot) => ({
    ...snapshot,
    weight: baseWeights[snapshot.range] / weightTotal,
  }));
  const byRange = new Map<XsRadarRangeV1, XsRadarWindowSnapshotV1>(
    snapshots.map((snapshot) => [snapshot.range, snapshot])
  );
  const l5Overall = byRange.get("L5")?.overall;
  const L10Overall = byRange.get("L10")?.overall;
  const l40Overall = byRange.get("L40")?.overall;
  const longerAverage = xsRadarAvgV1([L10Overall, l40Overall]) ?? null;
  const accumulatedOverall = xsRadarClampV1(
    weightedWindows.reduce((sum, window) => sum + window.overall * window.weight, 0)
  );
  const confidenceScore = xsRadarWeightedMetricV1(
    weightedWindows,
    "confidenceScore",
    activeMetrics.confidenceScore ?? (typeof activeMetrics.confidence === "number" ? activeMetrics.confidence * 100 : 50)
  );
  const scoreSeries = (
    byRange.get("L40")?.metrics?.scoreSeries ||
    byRange.get("L10")?.metrics?.scoreSeries ||
    byRange.get("L5")?.metrics?.scoreSeries ||
    activeMetrics.scoreSeries ||
    []
  )
    .map((score: any) => xsRadarNumV1(score))
    .filter((score: number | null): score is number => score != null)
    .map((score: number) => xsRadarClampV1(score));
  const trend = xsRadarTrendV1(scoreSeries);
  const volatility = xsRadarVolatilityV1(scoreSeries);
  const ceiling = xsRadarCeilingV1(scoreSeries);
  const advanced = xsRadarAdvancedDecisionBonusV1(trend, volatility, ceiling);
  const match = xsRadarMatchBonusV1(activeMatchContext);
  const lowConfidencePenalty = confidenceScore < 45 ? 10 : confidenceScore < 60 ? 5 : 0;
  const unconfirmedL5Penalty =
    l5Overall != null && l5Overall >= 75 && longerAverage != null && longerAverage < 55 ? 12 : 0;
  const lowRecentPenalty =
    l5Overall != null && L10Overall != null && l5Overall < 45 && L10Overall < 50 ? 8 : 0;
  const allWindowsHighBonus =
    l5Overall != null &&
    L10Overall != null &&
    l40Overall != null &&
    l5Overall >= 70 &&
    L10Overall >= 70 &&
    l40Overall >= 70
      ? 4
      : 0;
  const score = Math.round(
    xsRadarClampV1(
      accumulatedOverall +
        match.bonus +
        advanced.trendBonus +
        advanced.ceilingBonus +
        advanced.volatilityPenalty -
        lowConfidencePenalty -
        unconfirmedL5Penalty -
        lowRecentPenalty +
        allWindowsHighBonus
    )
  );
  const windowBlendLabel =
    snapshots.length === 3
      ? "Calcul : L5 40% · L10 35% · L40 25%"
      : `Calcul : ${weightedWindows
          .map((window) => `${window.range} ${Math.round(window.weight * 100)}%`)
          .join(" · ")}`;
  const reasons: string[] = [windowBlendLabel];
  if (l5Overall != null) reasons.push(`L5 ${Math.round(l5Overall)}`);
  if (L10Overall != null) reasons.push(`L10 ${Math.round(L10Overall)}`);
  if (l40Overall != null) reasons.push(`L40 ${Math.round(l40Overall)}`);
  if (unconfirmedL5Penalty) reasons.push("Pic L5 non confirmé par L10/L40");
  if (lowRecentPenalty) reasons.push("L5 et L10 faibles");
  if (lowConfidencePenalty) reasons.push("Confiance faible: décision abaissée");
  if (match.bonus > 0) reasons.push(`Contexte favorable: ${match.reason}`);
  else if (match.bonus < 0) reasons.push(`Contexte pénalisant: ${match.reason}`);
  if (trend === "up") reasons.push("Trend en hausse");
  else if (trend === "down") reasons.push("Trend en baisse");
  if (volatility === "high") reasons.push("Volatilité élevée");
  if (ceiling >= 70) reasons.push(`Plafond ${Math.round(ceiling)}`);

  const confidenceForDecision = xsRadarConfidenceFromScoreV1(
    confidenceScore,
    "Confiance synthétisée depuis L5/L10/L40."
  );
  const decisionMetrics: XsRadarMetricsByPositionV1 = {
    ...activeMetrics,
    form: xsRadarClampV1(l5Overall ?? activeMetrics.form),
    regularity: xsRadarWeightedMetricV1(weightedWindows, "regularity", activeMetrics.regularity),
    gameTime: xsRadarWeightedMetricV1(weightedWindows, "gameTime", activeMetrics.gameTime),
    impact: xsRadarWeightedMetricV1(weightedWindows, "impact", activeMetrics.impact),
    attack: xsRadarWeightedMetricV1(weightedWindows, "attack", activeMetrics.attack),
    creation: xsRadarWeightedMetricV1(weightedWindows, "creation", activeMetrics.creation),
    defense: xsRadarWeightedMetricV1(weightedWindows, "defense", activeMetrics.defense),
    reliability: xsRadarWeightedMetricV1(weightedWindows, "reliability", activeMetrics.reliability),
    saves: xsRadarWeightedMetricV1(weightedWindows, "saves", activeMetrics.saves),
    cleanSheets: xsRadarWeightedMetricV1(weightedWindows, "cleanSheets", activeMetrics.cleanSheets),
    duels: xsRadarWeightedMetricV1(weightedWindows, "duels", activeMetrics.duels),
    l5: l5Overall ?? activeMetrics.l5,
    L10: L10Overall ?? null, // XS_FIX_L10_HISTORYCHART_UNDEFINED_V1
    l40: l40Overall ?? activeMetrics.l40,
    overall: accumulatedOverall,
    confidenceScore: confidenceForDecision.score,
    confidence: confidenceForDecision.score / 100,
    coachAdjustedOverall: accumulatedOverall,
    coachScore: score,
    scoreSeries,
  };
  const coachDecision: XsRadarCoachDecisionV1 = {
    score,
    decision: xsRadarCoachLabelV1(score),
    tone: xsRadarCoachToneV1(score),
    adjustedOverall: Math.round(accumulatedOverall),
    rawOverall: Math.round(accumulatedOverall),
    matchBonus: match.bonus,
    trend,
    volatility,
    ceiling,
    reasons,
    reason: reasons.join(" · "),
    windowBlendLabel,
  };
  let decisionV2 = xsRadarDecisionEngineV2(positionUsed, decisionMetrics, coachDecision, activeMatchContext);

  if (
    unconfirmedL5Penalty &&
    (decisionV2.finalTone === "strongPlay" || decisionV2.finalTone === "play")
  ) {
    decisionV2 = {
      finalLabel: "Différentiel intéressant",
      finalTone: "joker",
      playStyle: "Boom/Bust",
      summary: "Différentiel intéressant : L5 haut, mais L10/L40 ne confirment pas encore.",
      bullets: ["Forme récente forte", "L10/L40 plus faibles", "Risque de faux positif"],
    };
  }

  const baseRecommendation = xsRadarRecommendationV1(
    positionUsed,
    decisionMetrics,
    activeAutoProfile,
    confidenceForDecision,
    activeMatchContext
  );
  const recommendation = xsRadarRecommendationFromDecisionV2(
    decisionV2,
    xsRadarRecommendationFromCoachV1(coachDecision, baseRecommendation, activeMatchContext)
  );

  return { coachDecision, decisionV2, recommendation, metrics: decisionMetrics };
}
/* XS_COACH_DECISION_ACCUMULATED_WINDOWS_V1_END */

function xsRadarRecommendationV1(
  positionUsed: XsRadarPositionV1,
  metrics: XsRadarMetricsByPositionV1,
  autoProfile: XsRadarAutoProfileV1,
  confidence: XsRadarConfidenceEnhancedV1,
  matchContext?: XsCardMatchContextV1 | null
): XsRadarRecommendationV1 {
  /* XS_RADAR_COACH_RECOMMENDATION_V1 */
  const opponentText = matchContext?.opponentName ? ` contre ${matchContext.opponentName}` : "";
  const contextOk = matchContext?.difficulty === "easy" || matchContext?.difficulty === "medium";
  const l5 = typeof metrics.l5 === "number" ? metrics.l5 : metrics.form;
  const L10Raw = (metrics as any).l10 ?? (metrics as any).l15;
  const L10 = typeof L10Raw === "number" ? L10Raw : metrics.form;
  const l40 = typeof metrics.l40 === "number" ? metrics.l40 : metrics.form;

  if (metrics.gameTime < 35) {
    return { label: "À éviter", tone: "avoid", reason: `À éviter : temps de jeu trop faible${opponentText} sur la fenêtre sélectionnée.` };
  }
  if (metrics.gameTime < 50) {
    return { label: "Pari risqué", tone: "risky", reason: `Pari risqué : temps de jeu fragile${opponentText}, risque de rotation.` };
  }
  if (matchContext?.difficulty === "hard" && confidence.label === "Faible") {
    return { label: "À surveiller", tone: "watch", reason: `À surveiller : contexte difficile${opponentText} et données peu fiables.` };
  }
  if (matchContext?.homeAway === "away" && metrics.regularity < 50) {
    return { label: "Pari risqué", tone: "risky", reason: `Pari risqué : extérieur${opponentText} et régularité fragile.` };
  }
  if (confidence.label === "Faible") {
    return { label: "À surveiller", tone: "watch", reason: `À surveiller : confiance faible${opponentText}. ${confidence.reason}.` };
  }
  if (metrics.form >= 60 && metrics.gameTime >= 65 && contextOk) {
    return { label: "À aligner", tone: "play", reason: `À aligner : forme solide, temps de jeu élevé et contexte favorable${opponentText}.` };
  }
  if (positionUsed === "FW" && metrics.attack >= 62 && metrics.impact >= 58) {
    return { label: "À aligner", tone: "play", reason: `À aligner : attaque élevée et impact fort${opponentText} sur la fenêtre sélectionnée.` };
  }
  if (l5 >= 62 && L10 < 58 && l40 < 58 && metrics.gameTime >= 55) {
    return { label: "Différentiel intéressant", tone: "play", reason: `Différentiel intéressant : L5 fort mais historique L10/L40 encore moyen${opponentText}.` };
  }
  if (autoProfile.tone === "safe" && confidence.label === "Élevé") {
    return { label: "Bon pick secondaire", tone: "play", reason: `Bon pick secondaire : profil sûr, confiance élevée et base stable${opponentText}.` };
  }
  if (autoProfile.tone === "risk" || /risk|risque|irrégulier/i.test(autoProfile.label)) {
    return { label: "Pari risqué", tone: "risky", reason: `Pari risqué : ${autoProfile.reason}` };
  }
  if ((positionUsed === "DEF" || positionUsed === "GK") && metrics.defense >= 60 && metrics.regularity >= 60) {
    return { label: "Bon pick secondaire", tone: "play", reason: `Bon pick secondaire : base défensive et régularité solides${opponentText}.` };
  }
  if (metrics.regularity < 45) {
    return { label: "Pari risqué", tone: "risky", reason: `Pari risqué : régularité basse${opponentText} sur la fenêtre sélectionnée.` };
  }
  if (metrics.reliability < 45) {
    return { label: "À éviter", tone: "avoid", reason: `À éviter : fiabilité trop fragile${opponentText} sur la fenêtre sélectionnée.` };
  }
  if ((metrics.overall || 0) >= 62) {
    return { label: "Bon pick secondaire", tone: "play", reason: `Bon pick secondaire : niveau radar solide${opponentText}, sans signal premium absolu.` };
  }
  return { label: "À surveiller", tone: "watch", reason: `À surveiller : profil exploitable${opponentText}, mais signal encore insuffisant pour l'aligner franchement.` };
}

/* XS_FIFA_RADAR_RANGE_SWITCH_V1 */
function xsRadarLimitForRangeV1(range: XsRadarRangeV1): number {
  if (range === "L5") return 5;
  if (range === "L40") return 40;
  return 15;
}

function xsBuildFifaRadarValuesFromHistoryV1(
  historyChart: any[],
  fallbackAvg: { avg5?: number | null; avg15?: number | null; avg40?: number | null },
  positionSource: any,
  range: XsRadarRangeV1 = "L10",
  realMatchContext?: XsCardMatchContextV1 | null,
  playerStatus?: XsPlayerStatusV1 | null,
  skipAccumulatedCoachDecision: boolean = false
) {
  const positionUsed = xsRadarNormalizePositionV1(positionSource);
  const localMatchContext = xsBuildMatchContextV1(positionSource?.card, positionSource?.perf, historyChart);
  const matchContext = xsIsRealMatchContextUsefulV1(realMatchContext)
    ? {
        ...localMatchContext,
        ...(realMatchContext as XsCardMatchContextV1),
        opponentLogoUrl: (realMatchContext as XsCardMatchContextV1)?.opponentLogoUrl || localMatchContext.opponentLogoUrl || null,
      }
    : localMatchContext;
  xsCoachNextOpponentLogoDebugV1(historyChart, matchContext);
  const rangeLimit = xsRadarLimitForRangeV1(range);
  const fallbackScore =
    xsRadarAvgV1([fallbackAvg?.avg5, fallbackAvg?.avg15, fallbackAvg?.avg40]) ?? 50;

  const rows = (Array.isArray(historyChart) ? historyChart : [])
    .slice()
    .sort((a: any, b: any) => {
      const da = new Date(a?.matchDate || a?.date || 0).getTime();
      const db = new Date(b?.matchDate || b?.date || 0).getTime();
      return db - da;
    })
    .slice(0, rangeLimit)
    .map((row: any) => ({
      score: xsRadarNumV1(row?.scoreSorare ?? row?.score ?? row?.totalScore),
      minutes: xsRadarNumV1(row?.minutes),
      decisiveScore: xsRadarNumV1(row?.decisiveScore),
      allAroundScore: xsRadarNumV1(row?.allAroundScore),
      goals: xsRadarDetailsStatTotalV1(row?.detailsV1, ["goals", "goal"]),
      assists: xsRadarDetailsStatTotalV1(row?.detailsV1, ["goalAssist", "assist"]),
      saves: xsRadarDetailsStatTotalV1(row?.detailsV1, ["saves", "save"]),
      cleanSheets: xsRadarDetailsStatTotalV1(row?.detailsV1, ["cleanSheet", "clean sheet"]),
      tackles: xsRadarDetailsStatTotalV1(row?.detailsV1, ["wonTackle", "tackle"]),
      interceptions: xsRadarDetailsStatTotalV1(row?.detailsV1, ["interceptionWon", "interception"]),
      duels: xsRadarDetailsStatTotalV1(row?.detailsV1, ["duelWon", "duel"]),
    }))
    .filter((row: any) => row.score != null);

  const scores = rows.map((row: any) => xsRadarClampV1(row.score));
  const matches = scores.length;
  const confidenceBase = Math.min(1, matches / 20);
  const confidence = positionUsed === "GEN" ? confidenceBase * 0.9 : confidenceBase;
  const fallbackMetrics: XsRadarMetricsByPositionV1 = {
    form: fallbackScore,
    regularity: fallbackScore,
    gameTime: fallbackScore,
    impact: fallbackScore,
    attack: fallbackScore,
    creation: fallbackScore,
    defense: fallbackScore,
    reliability: fallbackScore,
    saves: fallbackScore,
    cleanSheets: fallbackScore,
    duels: fallbackScore,
    matches,
    range,
    confidence,
    detailedStats: false,
    l5: fallbackAvg?.avg5 ?? fallbackScore,
    L10: fallbackAvg?.avg15 ?? fallbackScore,
    l40: fallbackAvg?.avg40 ?? fallbackScore,
    scoreSeries: [fallbackAvg?.avg5, fallbackAvg?.avg15, fallbackAvg?.avg40]
      .map((score) => xsRadarNumV1(score))
      .filter((score): score is number => typeof score === "number" && Number.isFinite(score)),
  };
  fallbackMetrics.overall = xsRadarWeightedOverallByPositionV1(positionUsed, fallbackMetrics);

  if (!matches) {
    const fallbackProfile = positionUsed === "GEN" ? "balanced_attacker" : xsRadarProfileV1(positionUsed, {
      attack: fallbackScore,
      creation: fallbackScore,
      defense: fallbackScore,
      reliability: fallbackScore,
      regularity: fallbackScore,
      form: fallbackScore,
      impact: fallbackScore,
      goalMetric: fallbackScore,
      highScoreRate: 0,
    });
    const fallbackAutoProfile = xsRadarAutoProfileLabelV1(positionUsed, fallbackMetrics, fallbackProfile);
    const fallbackConfidenceEnhanced = xsRadarConfidenceEnhancedV1(fallbackMetrics);
    fallbackMetrics.confidenceScore = fallbackConfidenceEnhanced.score;
    const fallbackMatchContext = xsAdjustMatchContextWithMetricsV1(matchContext, fallbackMetrics);
    const fallbackBaseRecommendation = xsRadarRecommendationV1(positionUsed, fallbackMetrics, fallbackAutoProfile, fallbackConfidenceEnhanced, fallbackMatchContext);
    const fallbackCoachDecision = xsRadarCoachDecisionV1(positionUsed, fallbackMetrics, fallbackConfidenceEnhanced, fallbackMatchContext);
    fallbackCoachDecision.windowBlendLabel = "Calcul : L5 40% · L10 35% · L40 25%";
    fallbackMetrics.coachAdjustedOverall = fallbackCoachDecision.adjustedOverall;
    fallbackMetrics.coachScore = fallbackCoachDecision.score;
    const fallbackDecisionV2 = xsRadarDecisionEngineV2(positionUsed, fallbackMetrics, fallbackCoachDecision, fallbackMatchContext);
    const fallbackRecommendation = xsRadarRecommendationFromDecisionV2(
      fallbackDecisionV2,
      xsRadarRecommendationFromCoachV1(fallbackCoachDecision, fallbackBaseRecommendation, fallbackMatchContext)
    );
    const fallbackSmartDecision = xsCoachDecisionSmartReasonsV1(
      positionUsed,
      fallbackMetrics,
      fallbackCoachDecision,
      fallbackDecisionV2,
      fallbackRecommendation,
      fallbackConfidenceEnhanced,
      fallbackMatchContext,
      playerStatus
    );
    return {
      confidence,
      matches,
      positionUsed,
      overall: xsRadarWeightedOverallByPositionV1(positionUsed, fallbackMetrics),
      profile: fallbackProfile,
      autoProfile: fallbackAutoProfile,
      confidenceEnhanced: fallbackSmartDecision.confidenceEnhanced,
      coachDecision: fallbackSmartDecision.coachDecision,
      decisionV2: fallbackSmartDecision.decisionV2,
      recommendation: fallbackSmartDecision.recommendation,
      matchContext: fallbackMatchContext,
      positionPercentile: xsRadarPositionPercentileV1(positionUsed, fallbackMetrics),
      metrics: fallbackMetrics,
      meta: { source: "fallback", positionUsed, range },
      values: xsRadarValuesByPositionV1(positionUsed, fallbackMetrics),
    };
  }

  const officialL5 = xsRadarNumV1(fallbackAvg?.avg5);
  const officialL10 = xsRadarNumV1(fallbackAvg?.avg15);
  const officialL40 = xsRadarNumV1(fallbackAvg?.avg40);
  const l5 = officialL5 ?? xsRadarAvgV1(scores.slice(0, 5)) ?? fallbackScore; /* XS_OFFICIAL_SORARE_AVERAGES_V1 */
  const L10 = officialL10 ?? xsRadarAvgV1(scores.slice(0, 15)) ?? fallbackScore; /* XS_OFFICIAL_SORARE_AVERAGES_V1 */
  const l40 = officialL40 ?? xsRadarAvgV1(scores.slice(0, 40)) ?? fallbackScore; /* XS_OFFICIAL_SORARE_AVERAGES_V1 */
  const trendL5 = xsRadarClampV1(l5);
  const trendL10 = xsRadarClampV1(L10);
  const trendL40 = xsRadarClampV1(l40);
  const form = xsRadarClampV1(l5 * 0.5 + L10 * 0.3 + l40 * 0.2);

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
  const totalGoals = xsRadarAvgV1(rows.map((row: any) => row.goals)) == null
    ? null
    : rows.reduce((sum: number, row: any) => sum + (row.goals ?? 0), 0);
  const totalAssists = xsRadarAvgV1(rows.map((row: any) => row.assists)) == null
    ? null
    : rows.reduce((sum: number, row: any) => sum + (row.assists ?? 0), 0);
  const goalMetricFromDetails = xsRadarGoalMetricV1(totalGoals, matches, positionUsed);
  const goalMetric = goalMetricFromDetails ?? avgDecisive;
  const assistMetric = xsRadarCountMetricV1(totalAssists, matches, positionUsed === "FW" ? 0.25 : 0.18) ?? normalizedAllAround;
  const savesDetailMetric = xsRadarCountMetricV1(xsRadarTotalRowsStatV1(rows, "saves"), matches, 3);
  const cleanSheetsDetailMetric = xsRadarCountMetricV1(xsRadarTotalRowsStatV1(rows, "cleanSheets"), matches, 0.45);
  const duelsDetailMetric = xsRadarCountMetricV1(xsRadarTotalRowsStatV1(rows, "duels"), matches, 5);
  const tacklesDetailMetric = xsRadarCountMetricV1(xsRadarTotalRowsStatV1(rows, "tackles"), matches, 2.5);
  const interceptionsDetailMetric = xsRadarCountMetricV1(xsRadarTotalRowsStatV1(rows, "interceptions"), matches, 1.8);
  const defenseDetailMetric =
    xsRadarAvgV1([
      savesDetailMetric,
      cleanSheetsDetailMetric,
      tacklesDetailMetric,
      interceptionsDetailMetric,
      duelsDetailMetric,
    ]) ?? normalizedAllAround;
  const hasDetailedStats = Boolean(
    goalMetricFromDetails != null ||
    totalAssists != null ||
    savesDetailMetric != null ||
    cleanSheetsDetailMetric != null ||
    duelsDetailMetric != null ||
    tacklesDetailMetric != null ||
    interceptionsDetailMetric != null
  );

  const regularity = xsRadarClampV1(100 - stdDev * 2.2 - badScoreRate * 20);
  const gameTime =
    minutesAvg == null
      ? xsRadarClampV1(fallbackScore)
      : xsRadarClampV1((minutesAvg / 90) * 70 + startLikeRate * 30);
  const reliability = xsRadarClampV1(
    100 -
      lowMinuteRate * 35 -
      badScoreRate * 35 -
      missingMinutesRate * 15 -
      stdDev * 0.8
  );

  const goalWeightByPosition: Record<XsRadarPositionV1, number> = {
    GK: 0.05,
    DEF: 0.25,
    MID: 0.40,
    FW: 0.60,
    GEN: 0.35,
  };
  const goalWeight = goalWeightByPosition[positionUsed];
  const highScoreMetric = highScoreRate * 100;

  let impact = xsRadarClampV1(avgScore * 0.45 + avgDecisive * 0.35 + normalizedAllAround * 0.2);
  let attack = xsRadarClampV1(highScoreRate * 40 + avgDecisive * 0.45 + form * 0.15);
  let creation = xsRadarClampV1(normalizedAllAround * 0.65 + regularity * 0.2 + highAllAroundRate * 15);
  let defense = xsRadarClampV1(regularity * 0.45 + reliability * 0.35 + normalizedAllAround * 0.2);

  if (positionUsed === "GK") {
    impact = xsRadarClampV1(avgScore * 0.35 + avgDecisive * 0.15 + normalizedAllAround * 0.2 + gameTime * 0.3);
    attack = xsRadarClampV1(12 + goalMetric * goalWeight + avgDecisive * 0.15 + highScoreMetric * 0.1);
    creation = xsRadarClampV1(normalizedAllAround * 0.3 + regularity * 0.25 + gameTime * 0.2 + assistMetric * 0.1);
    defense = xsRadarClampV1(reliability * 0.3 + regularity * 0.25 + gameTime * 0.2 + defenseDetailMetric * 0.25);
  } else if (positionUsed === "DEF") {
    impact = xsRadarClampV1(avgScore * 0.3 + avgDecisive * 0.2 + normalizedAllAround * 0.3 + gameTime * 0.2);
    attack = xsRadarClampV1(goalMetric * goalWeight + avgDecisive * 0.35 + highScoreMetric * 0.25 + form * 0.15);
    creation = xsRadarClampV1(normalizedAllAround * 0.45 + regularity * 0.2 + gameTime * 0.15 + assistMetric * 0.1 + highAllAroundRate * 10);
    defense = xsRadarClampV1(regularity * 0.3 + reliability * 0.25 + normalizedAllAround * 0.2 + gameTime * 0.1 + defenseDetailMetric * 0.15);
  } else if (positionUsed === "MID") {
    impact = xsRadarClampV1(avgScore * 0.25 + avgDecisive * 0.25 + normalizedAllAround * 0.35 + gameTime * 0.15);
    attack = xsRadarClampV1(goalMetric * goalWeight + avgDecisive * 0.3 + highScoreMetric * 0.15 + form * 0.15);
    creation = xsRadarClampV1(normalizedAllAround * 0.52 + avgDecisive * 0.18 + assistMetric * 0.15 + regularity * 0.1 + highAllAroundRate * 5);
    defense = xsRadarClampV1(regularity * 0.28 + reliability * 0.24 + normalizedAllAround * 0.24 + gameTime * 0.1 + defenseDetailMetric * 0.14);
  } else if (positionUsed === "FW") {
    impact = xsRadarClampV1(avgScore * 0.25 + avgDecisive * 0.4 + normalizedAllAround * 0.2 + gameTime * 0.15);
    attack = xsRadarClampV1(goalMetric * goalWeight + avgDecisive * 0.25 + highScoreMetric * 0.1 + form * 0.05);
    creation = xsRadarClampV1(normalizedAllAround * 0.3 + avgDecisive * 0.3 + assistMetric * 0.2 + highScoreMetric * 0.1 + form * 0.1);
    defense = xsRadarClampV1(regularity * 0.25 + reliability * 0.3 + normalizedAllAround * 0.2 + gameTime * 0.2 + defenseDetailMetric * 0.05);
  }

  const positionMetrics: XsRadarMetricsByPositionV1 = {
    form,
    regularity,
    gameTime,
    impact,
    attack,
    creation,
    defense,
    reliability,
    saves: savesDetailMetric ?? xsRadarClampV1(defense * 0.45 + impact * 0.3 + regularity * 0.25),
    cleanSheets: cleanSheetsDetailMetric ?? xsRadarClampV1(defense * 0.4 + reliability * 0.35 + gameTime * 0.25),
    duels: duelsDetailMetric ?? xsRadarAvgV1([tacklesDetailMetric, interceptionsDetailMetric, defense, normalizedAllAround]) ?? defense,
    matches,
    range,
    confidence,
    detailedStats: hasDetailedStats,
    l5: trendL5,
    L10: trendL10,
    l40: trendL40,
    scoreSeries: scores.slice(0, 15),
  };
  positionMetrics.overall = xsRadarWeightedOverallByPositionV1(positionUsed, positionMetrics);

  const profile = xsRadarProfileV1(positionUsed, {
    attack,
    creation,
    defense,
    reliability,
    regularity,
    form,
    impact,
    goalMetric,
    highScoreRate,
  });
  const autoProfile = xsRadarAutoProfileLabelV1(positionUsed, positionMetrics, profile);
  const confidenceEnhanced = xsRadarConfidenceEnhancedV1(positionMetrics);
  positionMetrics.confidenceScore = confidenceEnhanced.score;
  const adjustedMatchContext = xsAdjustMatchContextWithMetricsV1(matchContext, positionMetrics);
  const baseRecommendation = xsRadarRecommendationV1(positionUsed, positionMetrics, autoProfile, confidenceEnhanced, adjustedMatchContext);
  const baseCoachDecision = xsRadarCoachDecisionV1(positionUsed, positionMetrics, confidenceEnhanced, adjustedMatchContext);
  let coachDecision = baseCoachDecision;
  let decisionMetrics = positionMetrics;
  let decisionV2 = xsRadarDecisionEngineV2(positionUsed, positionMetrics, coachDecision, adjustedMatchContext);
  let recommendation = xsRadarRecommendationFromDecisionV2(
    decisionV2,
    xsRadarRecommendationFromCoachV1(coachDecision, baseRecommendation, adjustedMatchContext)
  );
  if (!skipAccumulatedCoachDecision) {
    const radarsByRange: Partial<Record<XsRadarRangeV1, any>> = {
      L5: xsBuildFifaRadarValuesFromHistoryV1(historyChart, fallbackAvg, positionSource, "L5", realMatchContext, playerStatus, true),
      L10: xsBuildFifaRadarValuesFromHistoryV1(historyChart, fallbackAvg, positionSource, "L10", realMatchContext, playerStatus, true),
      L40: xsBuildFifaRadarValuesFromHistoryV1(historyChart, fallbackAvg, positionSource, "L40", realMatchContext, playerStatus, true),
    };
    const accumulatedDecision = xsBuildAccumulatedCoachDecisionV1(
      positionUsed,
      positionMetrics,
      autoProfile,
      adjustedMatchContext,
      radarsByRange
    );
    if (accumulatedDecision) {
      coachDecision = accumulatedDecision.coachDecision;
      decisionV2 = accumulatedDecision.decisionV2;
      recommendation = accumulatedDecision.recommendation;
      decisionMetrics = accumulatedDecision.metrics;
    }
  } else {
    coachDecision.windowBlendLabel = `Calcul : ${range} 100%`;
  }
  const smartDecision = xsCoachDecisionSmartReasonsV1(
    positionUsed,
    decisionMetrics,
    coachDecision,
    decisionV2,
    recommendation,
    confidenceEnhanced,
    adjustedMatchContext,
    playerStatus
  );
  coachDecision = smartDecision.coachDecision;
  decisionV2 = smartDecision.decisionV2;
  recommendation = smartDecision.recommendation;
  positionMetrics.coachAdjustedOverall = coachDecision.adjustedOverall;
  positionMetrics.coachScore = coachDecision.score;
  positionMetrics.confidenceScore = smartDecision.confidenceEnhanced.score;
  const positionPercentile = xsRadarPositionPercentileV1(positionUsed, positionMetrics);

  return {
    confidence,
    matches,
    positionUsed,
    overall: positionMetrics.overall,
    profile,
    autoProfile,
    confidenceEnhanced: smartDecision.confidenceEnhanced,
    coachDecision,
    decisionV2,
    recommendation,
    matchContext: adjustedMatchContext,
    positionPercentile,
    metrics: positionMetrics,
    decisionMetrics,
    meta: {
      positionUsed,
      radarPositionLabel: xsRadarChartPositionLabelV1(positionUsed),
      range,
      rangeLimit,
      goalWeight,
      weightsSource: "XS_FIFA_RADAR_BY_POSITION_V1",
      goalsSource: goalMetricFromDetails == null ? "decisiveScore_proxy" : "detailsV1",
      hasDetailedGoals: goalMetricFromDetails != null,
      hasDetailedStats,
    },
    values: xsRadarValuesByPositionV1(positionUsed, positionMetrics),
  };
}
/* XS_FIFA_RADAR_REAL_STATS_V1_END */

/* XS_SCORE_COLOR_L5_L10_L40_V1 */
function xsScoreColorL5L10L40(score: number | null): string {
  if (typeof score !== "number" || !Number.isFinite(score)) return "#9CA3AF";
  if (score >= 65) return "#38BDF8"; // bleu = excellent
  if (score >= 50) return "#22C55E"; // vert = bon
  if (score >= 40) return "#FACC15"; // jaune = moyen
  return "#EF4444"; // rouge = faible
}
/* XS_SCORE_COLOR_L5_L10_L40_V1_END */


const XS_HISTORY_CHART_CLOUDRUN_V2 = "https://xiascor-backend-tssdy62zqa-ez.a.run.app";

const XS_HISTORY_SYNC_CLOUDRUN_V1 = "https://xiascor-backend-tssdy62zqa-ez.a.run.app";
// XS_CARD_AUTO_SYNC_HISTORY_V1: session guard to refresh a player history at most once every 10 minutes.
const XS_CARD_AUTO_SYNC_HISTORY_TTL_MS_V1 = 10 * 60 * 1000;
const XS_CARD_AUTO_SYNC_HISTORY_LAST_V1 = new Map<string, number>();
// XS_CARD_FAST_TABLE_HISTORY_V1: share one fast table history request per player while it is in-flight.
const XS_CARD_FAST_TABLE_HISTORY_INFLIGHT_V1 = new Map<string, Promise<any[]>>();

/* XS_CARD_SPEED_SCORE_V1 */
function xsCardSpeedGradeV1(score: number): string {
  if (score >= 90) return "ultra premium";
  if (score >= 80) return "premium";
  if (score >= 65) return "rapide";
  if (score >= 50) return "correct";
  return "lent";
}

function xsCardClampSpeedV1(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function xsCardSpeedScoreV1(input: {
  tableMs?: number | null;
  fullMs?: number | null;
  syncMs?: number | null;
  renders?: number | null;
  apiCalls?: number | null;
  dataKb?: number | null;
  cacheReopenMs?: number | null;
}): { score: number; grade: string } {
  const tableMs = Number(input.tableMs || 0);
  const fullMs = Number(input.fullMs || tableMs || 0);
  const syncMs = Number(input.syncMs || 0);
  const renders = Number(input.renders || 0);
  const apiCalls = Number(input.apiCalls || 0);
  const dataKb = Number(input.dataKb || 0);
  const cacheReopenMs = Number(input.cacheReopenMs || 0);
  let score = 100;
  score -= Math.min(25, Math.max(0, (tableMs - 500) / 20));
  score -= Math.min(20, Math.max(0, (fullMs - 1000) / 40));
  score -= Math.min(8, Math.max(0, (syncMs - 1500) / 100));
  score -= Math.min(12, Math.max(0, (renders - 6) * 2));
  score -= Math.min(12, Math.max(0, (apiCalls - 4) * 3));
  score -= Math.min(8, Math.max(0, (dataKb - 80) / 20));
  if (cacheReopenMs > 0) score -= Math.min(6, Math.max(0, (cacheReopenMs - 450) / 60));
  const rounded = xsCardClampSpeedV1(score);
  return { score: rounded, grade: xsCardSpeedGradeV1(rounded) };
}
/* XS_CARD_SPEED_SCORE_V1_END */


export default function CardDetailScreen() {
  const params = useLocalSearchParams();
  const id = String((params as any)?.id ?? "").trim();
  const playerSlugParam = String((params as any)?.playerSlug ?? "").trim();
  const positionParam = xsCardParamStringV1((params as any)?.position);
  const positionRawParam = xsCardParamStringV1((params as any)?.positionRaw);

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
  const [historyFastLoading, setHistoryFastLoading] = useState(false); // XS_CARD_FAST_TABLE_HISTORY_V1
  const [realMatchContext, setRealMatchContext] = useState<XsCardMatchContextV1 | null>(null); // XS_CARD_REAL_MATCH_CONTEXT_V1
  const [playerStatus, setPlayerStatus] = useState<XsPlayerStatusV1 | null>(null); // XS_PLAYER_STATUS_DECISION_V1
  const [aiPrediction, setAiPrediction] = useState<XsAiPlayerScorePredictionV1 | null>(null); // XS_AI_PLAYER_SCORE_PREDICTION_V1
  const [aiPredictionLoading, setAiPredictionLoading] = useState(false); // XS_AI_PLAYER_SCORE_PREDICTION_V1
  const [aiPredictionError, setAiPredictionError] = useState<string | null>(null); // XS_AI_PLAYER_SCORE_PREDICTION_V1
  const [state, setState] = useState<"idle" | "loading" | "ok" | "err">("idle");
  const [error, setError] = useState("");
  const [activeSeries, setActiveSeries] = useState<"L5" | "L10" | "ALL">("L5");
  const [radarRange, setRadarRange] = useState<XsRadarRangeV1>("L10");
  const perfAuditSlugRef = React.useRef("");
  const perfAuditStartedAtRef = React.useRef(Date.now());
  const perfAuditRenderCountRef = React.useRef(0);
  const perfAuditFirstTableLoggedRef = React.useRef(false);
  const perfAuditTotalReadyLoggedRef = React.useRef(false);
  const speedApiCallsRef = React.useRef(0); // XS_CARD_SPEED_SCORE_V1
  const speedDataBytesRef = React.useRef(0); // XS_CARD_SPEED_SCORE_V1
  const speedTableMsRef = React.useRef<number | null>(null); // XS_CARD_SPEED_SCORE_V1
  const speedFullMsRef = React.useRef<number | null>(null); // XS_CARD_SPEED_SCORE_V1
  const speedSyncMsRef = React.useRef<number | null>(null); // XS_CARD_SPEED_SCORE_V1
  const speedLoggedPhasesRef = React.useRef<Record<string, boolean>>({}); // XS_CARD_SPEED_SCORE_V1

  if (perfAuditSlugRef.current !== playerSlug) {
    perfAuditSlugRef.current = playerSlug;
    perfAuditStartedAtRef.current = Date.now();
    perfAuditRenderCountRef.current = 0;
    perfAuditFirstTableLoggedRef.current = false;
    perfAuditTotalReadyLoggedRef.current = false;
    speedApiCallsRef.current = 0;
    speedDataBytesRef.current = 0;
    speedTableMsRef.current = null;
    speedFullMsRef.current = null;
    speedSyncMsRef.current = null;
    speedLoggedPhasesRef.current = {};
  }
  perfAuditRenderCountRef.current += 1;
  console.log("[XS_CARD_PERF_AUDIT_V1] render_count", {
    playerSlug: playerSlug || null,
    renders: perfAuditRenderCountRef.current,
    ms: Date.now() - perfAuditStartedAtRef.current,
  });

  function xsCardSpeedTrackPayloadV1(payload: any) {
    try {
      speedDataBytesRef.current += JSON.stringify(payload || {}).length;
    } catch {}
  }

  function xsCardSpeedLogV1(phase: string) {
    if (speedLoggedPhasesRef.current[phase]) return;
    speedLoggedPhasesRef.current[phase] = true;
    const tableMs = speedTableMsRef.current;
    const fullMs = speedFullMsRef.current ?? (phase === "first_table" ? tableMs : null);
    const syncMs = speedSyncMsRef.current;
    const renders = perfAuditRenderCountRef.current;
    const apiCalls = speedApiCallsRef.current;
    const dataKb = Math.round((speedDataBytesRef.current / 1024) * 10) / 10;
    const result = xsCardSpeedScoreV1({ tableMs, fullMs, syncMs, renders, apiCalls, dataKb });
    console.log("[XS_CARD_SPEED_SCORE_V1] summary", {
      playerSlug: playerSlug || null,
      phase,
      tableVisibleMs: tableMs,
      fullReadyMs: fullMs,
      syncMs,
      renders,
      apiCalls,
      dataKb,
      cacheReopenMs: null,
      performanceScore: result.score,
      performanceGrade: result.grade,
    });
  }

  /* XS_CARD_FAST_TABLE_HISTORY_V1 */
  useEffect(() => {
    let cancelled = false;
    const slug = String(playerSlug || "").trim().toLowerCase();
    if (!slug) {
      setHistoryChart([]);
      setHistoryFastLoading(false);
      return;
    }

    const cachedRows = [
      (card as any)?.historyChart,
      (card as any)?.history,
      (card as any)?.recentHistory,
      (card as any)?.recentScores,
      (card as any)?.recentScores10,
      (card as any)?.recentScores40,
    ].find((value) => Array.isArray(value) && value.length);
    if (Array.isArray(cachedRows) && cachedRows.length) {
      console.log("[XS_CARD_FAST_TABLE_HISTORY_V1] cache_used", {
        playerSlug: slug,
        count: cachedRows.length,
      });
    }

    setHistoryChart([]);
    setHistoryFastLoading(true);

    let fastPromise = XS_CARD_FAST_TABLE_HISTORY_INFLIGHT_V1.get(slug);
    if (!fastPromise) {
      fastPromise = (async () => {
        const fastStartedAt = Date.now();
        const base = XS_HISTORY_CHART_CLOUDRUN_V2.replace(/\/+$/, "");
        const histUrl = `${base}/history/player-chart/${encodeURIComponent(slug)}?limit=15`;
        console.log("[XS_CARD_FAST_TABLE_HISTORY_V1] fast_fetch_start", {
          playerSlug: slug,
          limit: 15,
        });
        speedApiCallsRef.current += 1;
        const histResp = await fetch(histUrl, { headers: { accept: "application/json" } });
        const histJson = await histResp.json().catch(() => null);
        xsCardSpeedTrackPayloadV1(histJson);
        if (!histResp.ok) {
          throw new Error(String(histJson?.error || `history_http_${histResp.status}`));
        }
        const items = Array.isArray(histJson?.items) ? histJson.items : [];
        console.log("[XS_CARD_FAST_TABLE_HISTORY_V1] fast_fetch_success", {
          playerSlug: slug,
          count: items.length,
        });
        console.log("[XS_CARD_PERF_AUDIT_V1] fast_history_ms", {
          playerSlug: slug,
          ms: Date.now() - fastStartedAt,
          count: items.length,
        });
        return items;
      })();
      XS_CARD_FAST_TABLE_HISTORY_INFLIGHT_V1.set(slug, fastPromise);
      fastPromise.then(
        () => {
          if (XS_CARD_FAST_TABLE_HISTORY_INFLIGHT_V1.get(slug) === fastPromise) {
            XS_CARD_FAST_TABLE_HISTORY_INFLIGHT_V1.delete(slug);
          }
        },
        () => {
          if (XS_CARD_FAST_TABLE_HISTORY_INFLIGHT_V1.get(slug) === fastPromise) {
            XS_CARD_FAST_TABLE_HISTORY_INFLIGHT_V1.delete(slug);
          }
        }
      );
    }

    fastPromise
      .then((items) => {
        if (!cancelled) setHistoryChart(items);
      })
      .catch((err: any) => {
        console.log("[XS_CARD_FAST_TABLE_HISTORY_V1] error", {
          playerSlug: slug,
          error: String(err?.message || err),
        });
      })
      .finally(() => {
        if (!cancelled) setHistoryFastLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [playerSlug]);
  /* XS_CARD_FAST_TABLE_HISTORY_V1_END */

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

        speedApiCallsRef.current += 1;
    // XS_MANUAL_REMOVE_DUP_HISTORY40_V2 BEGIN
    if (Array.isArray(historyChart) && historyChart.length > 0) {
      console.log("[XS_MANUAL_REMOVE_DUP_HISTORY40_V2] skip publicPlayerPerformance: historyChart already available", historyChart.length);
      return;
    }
    // XS_MANUAL_REMOVE_DUP_HISTORY40_V2 END
        const resp = await publicPlayerPerformance(
          playerSlug,
          xsPerfDeviceId ? { deviceId: xsPerfDeviceId } : undefined
        );
        xsCardSpeedTrackPayloadV1(resp);
        // XS_CARD_DETAIL_PASS_DEVICEID_TO_PERF_V1 END
        if (cancelled) return;
        setPerf(resp || null);

        // XS_CARD_FAST_TABLE_HISTORY_V1: historyChart is loaded by a lightweight table effect first,
        // then refreshed by XS_CARD_AUTO_SYNC_HISTORY_V1 after the background sync succeeds.
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

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!playerSlug) {
        setRealMatchContext(null);
        return;
      }
      try {
        const base = xsPositionFallbackBaseUrlV1();
        const url = `${base}/player/next-match-context/${encodeURIComponent(playerSlug)}`;
        console.log("[card real match context] url=", url);
        speedApiCallsRef.current += 1;
        const resp = await fetch(url, { headers: { accept: "application/json" } });
        const json = await resp.json().catch(() => null);
        xsCardSpeedTrackPayloadV1(json);
        const context = xsNormalizeRealMatchContextV1(json);
        if (!cancelled) {
          setRealMatchContext(context && xsIsRealMatchContextUsefulV1(context) ? context : null);
        }
        console.log("[card real match context] resolved=", context?.opponentName || "fallback-local", context?.difficulty || "unknown");
      } catch (e: any) {
        if (!cancelled) setRealMatchContext(null);
        console.log("[card real match context] fallback=", String(e?.message || e || "error"));
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [playerSlug]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!playerSlug) {
        setPlayerStatus(null);
        return;
      }
      try {
        const base = xsPositionFallbackBaseUrlV1();
        const url = `${base}/player/status/${encodeURIComponent(playerSlug)}`;
        console.log("[XS_PLAYER_STATUS_DECISION_V1] url=", url);
        speedApiCallsRef.current += 1;
        const resp = await fetch(url, { headers: { accept: "application/json" } });
        const json = await resp.json().catch(() => null);
        xsCardSpeedTrackPayloadV1(json);
        const status = xsNormalizePlayerStatusV1(json, playerSlug);
        if (!cancelled) setPlayerStatus(status);
        console.log("[XS_PLAYER_STATUS_DECISION_V1] resolved=", {
          playerSlug,
          status: status.status,
          hasExpectedReturnDate: Boolean(status.expectedReturnDate),
          source: status.source || "unknown",
        });
      } catch (e: any) {
        if (!cancelled) {
          setPlayerStatus(xsNormalizePlayerStatusV1({ status: "unknown", source: "frontend_fallback_error" }, playerSlug));
        }
        console.log("[XS_PLAYER_STATUS_DECISION_V1] fallback=", String(e?.message || e || "error"));
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [playerSlug]);

  const playerName = pickStr((card as any)?.anyPlayer?.displayName ?? (card as any)?.player?.displayName ?? perf?.playerName);
  const teamName = pickStr((card as any)?.anyTeam?.name ?? (card as any)?.player?.activeClub?.name ?? perf?.activeClub?.name);
  const position = xsCardDetailPositionV1({
    positionParam,
    positionRawParam,
    card,
    perf,
  });
  const [resolvedPosition, setResolvedPosition] = useState<XsRadarPositionV1>(position);
  const [positionDebug, setPositionDebug] = useState<{ source: string; raw?: string | null }>({
    source: position === "GEN" ? "initial_gen" : "params/cache",
    raw: positionRawParam || (card as any)?.positionRaw || null,
  });
  const positionDisplay = xsDisplayPositionLabelV1(resolvedPosition);
  const seasonYear = pickStr((card as any)?.seasonYear);
  const rarity = pickStr((card as any)?.rarityTyped ?? (card as any)?.rarity);
  const serial = (card as any)?.serialNumber != null ? "#" + String((card as any).serialNumber) : "—";

  useEffect(() => {
    let cancelled = false;

    if (position !== "GEN") {
      setResolvedPosition(position);
      setPositionDebug({
        source: positionParam || positionRawParam ? "params" : "params/cache",
        raw: positionRawParam || (card as any)?.positionRaw || null,
      });
      return () => {
        cancelled = true;
      };
    }

    if (!playerSlug) {
      setResolvedPosition("GEN");
      setPositionDebug({ source: "missing_slug", raw: null });
      return () => {
        cancelled = true;
      };
    }

    xsFetchPlayerPositionCachedV1(playerSlug).then((result) => {
      if (cancelled) return;
      setResolvedPosition(result.position !== "GEN" ? result.position : "GEN");
      setPositionDebug({ source: result.source || "my-cards", raw: result.raw || null });
    });

    return () => {
      cancelled = true;
    };
  }, [playerSlug, position, positionParam, positionRawParam, card]);

  /* XS_CARD_AUTO_SYNC_HISTORY_V1 */
  useEffect(() => {
    let cancelled = false;
    const slug = String(playerSlug || "").trim().toLowerCase();
    if (!slug) return;

    const now = Date.now();
    const lastSyncedAt = XS_CARD_AUTO_SYNC_HISTORY_LAST_V1.get(slug) || 0;
    if (now - lastSyncedAt < XS_CARD_AUTO_SYNC_HISTORY_TTL_MS_V1) {
      console.log("[XS_CARD_AUTO_SYNC_HISTORY_V1] skip_recent", {
        playerSlug: slug,
        ageMs: now - lastSyncedAt,
      });
      return;
    }
    XS_CARD_AUTO_SYNC_HISTORY_LAST_V1.set(slug, now);

    async function runHistoryRefresh() {
      try {
        const deviceId = await xsReadPositionDeviceIdV1();
        const syncBase = XS_HISTORY_SYNC_CLOUDRUN_V1.replace(/\/+$/, "");
        const syncParams = new URLSearchParams({
          slug,
          last: "40",
          force: "true",
        });
        if (deviceId) syncParams.set("deviceId", deviceId);
        const syncUrl = `${syncBase}/history/sync-player-scores?${syncParams.toString()}`;

        console.log("[XS_CARD_AUTO_SYNC_HISTORY_V1] start", {
          playerSlug: slug,
          hasDeviceId: Boolean(deviceId),
        });

        const syncStartedAt = Date.now();
        speedApiCallsRef.current += 1;
        const syncResp = await fetch(syncUrl, {
          method: "POST",
          headers: { accept: "application/json" },
        });
        const syncJson = await syncResp.json().catch(() => null);
        xsCardSpeedTrackPayloadV1(syncJson);
        if (!syncResp.ok || syncJson?.ok === false) {
          throw new Error(String(syncJson?.error || syncJson?.details || `sync_http_${syncResp.status}`));
        }
        speedSyncMsRef.current = Date.now() - syncStartedAt;
        console.log("[XS_CARD_PERF_AUDIT_V1] sync_ms", {
          playerSlug: slug,
          ms: Date.now() - syncStartedAt,
        });

        const chartBase = XS_HISTORY_CHART_CLOUDRUN_V2.replace(/\/+$/, "");
        const histUrl = `${chartBase}/history/player-chart/${encodeURIComponent(slug)}?limit=15`;
        const reloadStartedAt = Date.now();
        speedApiCallsRef.current += 1;
        const histResp = await fetch(histUrl, { headers: { accept: "application/json" } });
        const histJson = await histResp.json().catch(() => null);
        xsCardSpeedTrackPayloadV1(histJson);
        const items = Array.isArray(histJson?.items) ? histJson.items : [];
        if (!cancelled) setHistoryChart(items);
        console.log("[XS_CARD_FAST_TABLE_HISTORY_V1] sync_reload_success", {
          playerSlug: slug,
          count: items.length,
        });
        console.log("[XS_CARD_PERF_AUDIT_V1] total_ready_ms", {
          playerSlug: slug,
          ms: Date.now() - syncStartedAt,
          reloadMs: Date.now() - reloadStartedAt,
          count: items.length,
        });
        speedFullMsRef.current = Date.now() - perfAuditStartedAtRef.current;
        xsCardSpeedLogV1("after_sync");

        console.log("[XS_CARD_AUTO_SYNC_HISTORY_V1] success", {
          playerSlug: slug,
          count: items.length,
        });
      } catch (err: any) {
        console.log("[XS_CARD_AUTO_SYNC_HISTORY_V1] error", {
          playerSlug: slug,
          error: String(err?.message || err),
        });
      }
    }

    runHistoryRefresh();
    return () => {
      cancelled = true;
    };
  }, [playerSlug]);
  /* XS_CARD_AUTO_SYNC_HISTORY_V1_END */


  const series = useMemo(() => {
    const perfAny = (perf as any) || {};
    const cardAny = (card as any) || {};
    const sourceScores = Array.isArray(perfAny?.recentScores) ? perfAny.recentScores : cardAny?.recentScores;
    const sourceScores15 = Array.isArray(perfAny?.recentScores10 ?? perfAny?.recentScores15) ? perfAny.recentScores10 : cardAny?.recentScores10 ?? cardAny?.recentScores15;
    const sourceScores40 = Array.isArray(perfAny?.recentScores40) ? perfAny.recentScores40 : cardAny?.recentScores40;
    const l5 = Array.isArray(sourceScores) ? sourceScores.slice(0, 5) : [];
    const L10 = Array.isArray(sourceScores15)
      ? sourceScores15.slice(0, 15)
      : (Array.isArray(sourceScores) ? sourceScores.slice(0, 15) : []);
    const l40 = Array.isArray(sourceScores40)
      ? sourceScores40.slice(0, 40)
      : (Array.isArray(sourceScores) ? sourceScores.slice(0, 40) : []);
    // XS_FIX_CARD_DETAIL_OPPONENTS_FALLBACK_V1 BEGIN
    const opp =
      Array.isArray(perfAny?.recentOpponents) ? perfAny.recentOpponents :
      (Array.isArray(perfAny?.opponents) ? perfAny.opponents :
      (Array.isArray(perfAny?.meta?.opponents) ? perfAny.meta.opponents :
      (Array.isArray(cardAny?.recentOpponents) ? cardAny.recentOpponents :
      (Array.isArray(cardAny?.opponents) ? cardAny.opponents :
      (Array.isArray(cardAny?.meta?.opponents) ? cardAny.meta.opponents : [])))));
    // XS_FIX_CARD_DETAIL_OPPONENTS_FALLBACK_V1 END
    return { l5, L10, l40, opp };
  }, [perf, card]);

  const scores =
    activeSeries === "L5" ? series.l5 :
    activeSeries === "L10" ? series.L10 :
    series.l40;

  
  // XS_FIX_CARD_DETAIL_OPPONENT_LOGOS_NESTED_V1 BEGIN
  // Sert à afficher le logo du club adverse sous chaque barre de performance.
  // On garde un fallback texte si l'API ne donne pas encore de logo.
      // XS_CARD_DETAIL_LATEST_MATCH_RIGHT_ALL_CARDS_V1
  // On trie les matchs par date ASC pour afficher le plus récent à droite.
  const xsWantedCount = activeSeries === "L5" ? 5 : activeSeries === "L10" ? 15 : 40;
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
      x?.opponentShort ?? (typeof x?.opponent === "string" ? x.opponent : null) ??
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
  useEffect(() => {
    const tableCount = Array.isArray(xsDisplayScores) ? xsDisplayScores.length : 0;
    if (tableCount > 0 && !perfAuditFirstTableLoggedRef.current) {
      perfAuditFirstTableLoggedRef.current = true;
      speedTableMsRef.current = Date.now() - perfAuditStartedAtRef.current;
      console.log("[XS_CARD_PERF_AUDIT_V1] first_table_ms", {
        playerSlug: playerSlug || null,
        ms: Date.now() - perfAuditStartedAtRef.current,
        tableCount,
        renders: perfAuditRenderCountRef.current,
      });
      xsCardSpeedLogV1("first_table");
    }
    if (tableCount > 0 && state === "ok" && !historyFastLoading && !perfAuditTotalReadyLoggedRef.current) {
      perfAuditTotalReadyLoggedRef.current = true;
      speedFullMsRef.current = Date.now() - perfAuditStartedAtRef.current;
      console.log("[XS_CARD_PERF_AUDIT_V1] total_ready_ms", {
        playerSlug: playerSlug || null,
        phase: "initial_ready",
        ms: Date.now() - perfAuditStartedAtRef.current,
        tableCount,
        renders: perfAuditRenderCountRef.current,
      });
      xsCardSpeedLogV1("initial_ready");
    }
  }, [historyFastLoading, playerSlug, state, xsDisplayScores.length]);
const avg5 =
  asNum((perf as any)?.averages?.l5) ??
  asNum((perf as any)?.l5) ??
  asNum((card as any)?.averages?.l5) ??
  asNum((card as any)?.l5) ??
  avgOf(series.l5);
  const avg15 =
    asNum((perf as any)?.averages?.L10) ??
    asNum((perf as any)?.L10) ??
    asNum((card as any)?.averages?.L10) ??
    asNum((card as any)?.L10) ??
    avgOf(series.L10);
  const avg40 =
    asNum((perf as any)?.averages?.l40) ??
    asNum((perf as any)?.l40) ??
    asNum((card as any)?.averages?.l40) ??
    asNum((card as any)?.l40) ??
    avgOf(series.l40);
  const xsFifaRadar = useMemo(
    () =>
      xsBuildFifaRadarValuesFromHistoryV1(
        historyChart,
        { avg5, avg15, avg40 },
        {
          positionRaw: positionRawParam || (card as any)?.positionRaw,
          position: resolvedPosition,
          playingPosition: (card as any)?.playingPosition,
          playerPosition: (card as any)?.playerPosition,
          anyPosition: (card as any)?.anyPosition,
          anyPositions: (card as any)?.anyPositions,
          card,
          player: (card as any)?.player,
          anyPlayer: (card as any)?.anyPlayer,
          perf,
        },
        radarRange,
        realMatchContext,
        playerStatus
      ),
    [historyChart, avg5, avg15, avg40, resolvedPosition, positionRawParam, card, perf, radarRange, realMatchContext, playerStatus]
  );

  const aiPredictionMatchKey = useMemo(
    () => xsAiPredictionMatchKeyV1(playerSlug, card, xsFifaRadar.matchContext),
    [playerSlug, card, xsFifaRadar.matchContext]
  );
  const aiPredictionMatchActive = useMemo(
    () => xsAiPredictionMatchIsFutureV1(xsFifaRadar.matchContext),
    [xsFifaRadar.matchContext]
  );

  useEffect(() => {
    // XS_AI_PLAYER_SCORE_PREDICTION_V1: reset active prediction when the future match identity changes.
    setAiPrediction(null);
    setAiPredictionError(null);
    setAiPredictionLoading(false);
  }, [aiPredictionMatchKey]);

  async function handleAiPredictionPress() {
    if (!playerSlug) {
      setAiPredictionError("Joueur indisponible pour la prédiction.");
      return;
    }
    if (!aiPredictionMatchActive) {
      setAiPredictionError("Aucun prochain match actif pour cette prédiction.");
      return;
    }
    setAiPredictionLoading(true);
    setAiPredictionError(null);
    try {
      const base = xsPositionFallbackBaseUrlV1();
      const deviceId =
        (await AsyncStorage.getItem("xs_device_id").catch(() => null)) ||
        (await AsyncStorage.getItem("XS_JWT_DEVICE_ID_V1").catch(() => null)) ||
        (await AsyncStorage.getItem("xs_device_id_v1").catch(() => null)) ||
        undefined;
      const matchContext = xsFifaRadar.matchContext;
      const historyScores = (Array.isArray(historyChart) ? historyChart : []).slice(0, 40).map((row: any) => ({
        scoreSorare: asNum(row?.scoreSorare ?? row?.score),
        score: asNum(row?.scoreSorare ?? row?.score),
        minutes: asNum(row?.minutes ?? row?.mins),
        matchDate: row?.matchDate ?? row?.date ?? null,
        opponent: row?.opponent ?? row?.opponentName ?? null,
        competition: row?.competition ?? null,
      }));
      const resp = await fetch(`${base}/ai/player-score-prediction`, {
        method: "POST",
        headers: { accept: "application/json", "content-type": "application/json" },
        body: JSON.stringify({
          playerSlug,
          cardId: xsAiPredictionCardIdV1(card, id),
          deviceId,
          nextMatchKey: aiPredictionMatchKey,
          nextMatchDate: matchContext?.matchDate ?? null,
          opponentName: matchContext?.opponentName ?? null,
          opponentLogoUrl: matchContext?.opponentLogoUrl ?? null,
          homeAway: matchContext?.homeAway ?? "unknown",
          competition: matchContext?.competition ?? null,
          difficulty: matchContext?.difficulty ?? "unknown",
          l5: avg5,
          L10: avg15,
          l40: avg40,
          historyScores,
          minutes: historyScores.map((row) => row.minutes).filter((n): n is number => typeof n === "number" && Number.isFinite(n)),
          position: resolvedPosition,
          cardBonus: xsAiPredictionCardBonusV1(card),
          playerStatus,
        }),
      });
      const json = await resp.json().catch(() => null);
      if (!resp.ok || !json?.ok) {
        throw new Error(String(json?.error || json?.details || `Erreur IA ${resp.status}`));
      }
      setAiPrediction(json as XsAiPlayerScorePredictionV1);
    } catch (e: any) {
      setAiPredictionError(String(e?.message || e || "Prédiction IA indisponible."));
    } finally {
      setAiPredictionLoading(false);
    }
  }

  function pill(label: "L5" | "L10" | "ALL") {
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
        <Text style={{ color: theme.text, fontWeight: "700" }}>Position: {positionDisplay}</Text>
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
        {positionDebug.source ? (
          <Text style={{ color: theme.muted, fontSize: 11, marginTop: 6 }}>
            position source: {positionDebug.source}{positionDebug.raw ? ` · ${positionDebug.raw}` : ""}
          </Text>
        ) : null}
      </View>

      <View style={{ borderRadius: 16, backgroundColor: theme.panel, borderWidth: 1, borderColor: theme.stroke, padding: 14 }}>
        <Text style={{ color: theme.text, fontSize: 18, fontWeight: "900" }}>Forme</Text>

        <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
          {pill("L5")}
          {pill("L10")}
          {pill("ALL")}
        </View>

        <View style={{ marginTop: 12 }}>
          {Array.isArray(xsDisplayScores) && xsDisplayScores.length > 0 ? (
            <View style={{ width: "100%", overflow: "hidden" }}>
              {historyFastLoading ? (
                <Text style={{ color: theme.muted, fontSize: 12, marginBottom: 6 }}>
                  Mise à jour du tableau…
                </Text>
              ) : null}
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
          ) : state === "loading" || historyFastLoading ? (
            <Text style={{ color: theme.muted }}>Chargement du tableau…</Text>
          ) : state === "err" ? (
            <Text style={{ color: "#FF7B7B" }}>Erreur de chargement: {error || "inconnue"}</Text>
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
          <Text style={{ color: xsScoreColorL5L10L40(avg5), fontSize: 24, fontWeight: "900", marginTop: 4 }}>
            {avg5 == null ? "—" : String(Math.round(avg5))}
          </Text>
        </View>

        <View style={{ flex: 1, borderRadius: 16, backgroundColor: theme.panel, borderWidth: 1, borderColor: theme.stroke, padding: 14 }}>
          <Text style={{ color: theme.muted, fontSize: 12, fontWeight: "700" }}>L10</Text>
          <Text style={{ color: xsScoreColorL5L10L40(avg15), fontSize: 24, fontWeight: "900", marginTop: 4 }}>
            {avg15 == null ? "—" : String(Math.round(avg15))}
          </Text>
        </View>

        <View style={{ flex: 1, borderRadius: 16, backgroundColor: theme.panel, borderWidth: 1, borderColor: theme.stroke, padding: 14 }}>
          <Text style={{ color: theme.muted, fontSize: 12, fontWeight: "700" }}>L40</Text>
          <Text style={{ color: xsScoreColorL5L10L40(avg40), fontSize: 24, fontWeight: "900", marginTop: 4 }}>
            {avg40 == null ? "—" : String(Math.round(avg40))}
          </Text>
        </View>
      </View>
      {/* XS_FIFA_RADAR_CARD_DETAIL_V1 */}
      <FifaRadarChart
        title="Radar FIFA"
        values={xsFifaRadar.values}
        overall={xsFifaRadar.overall}
        confidence={xsFifaRadar.confidence}
        matches={xsFifaRadar.matches}
        positionUsed={xsRadarChartPositionLabelV1(xsFifaRadar.positionUsed)}
        profile={xsFifaRadar.profile}
        range={radarRange}
        onRangeChange={setRadarRange}
        autoProfile={xsFifaRadar.autoProfile}
        confidenceEnhanced={xsFifaRadar.confidenceEnhanced}
        coachDecision={xsFifaRadar.coachDecision}
        decisionV2={xsFifaRadar.decisionV2}
        trend={xsFifaRadar.coachDecision?.trend}
        volatility={xsFifaRadar.coachDecision?.volatility}
        ceiling={xsFifaRadar.coachDecision?.ceiling}
        recommendation={xsFifaRadar.recommendation}
        matchContext={xsFifaRadar.matchContext}
        positionPercentile={xsFifaRadar.positionPercentile}
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
          recentScores10: {Array.isArray((perf as any)?.recentScores10) ? (perf as any).recentScores10.length : 0}
        </Text>
        <Text style={{ color: theme.muted }}>
          ALL/historyChart: {Array.isArray(historyChart) ? historyChart.length : 0}
        </Text>
      </View>
    </ScrollView>
  );
}



























// XS_MANUAL_RELOAD15_AFTER_SYNC_V1


// XS_PATCH_L15_TO_L10_UI_RADAR_V1


// XS_FIX_L10_TYPESCRIPT_ERRORS_V1


// XS_FIX_L10_ACTIVE_UNDEFINED_V1



