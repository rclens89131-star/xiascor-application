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
type XsRadarRangeV1 = "L5" | "L15" | "L40";

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
  l15?: number;
  l40?: number;
  overall?: number;
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

type XsRadarPositionPercentileV1 = {
  percentileLabel: string;
  deltaLabel: string;
  tier: "elite" | "strong" | "average" | "weak";
  reason: string;
};

type XsCardMatchContextV1 = {
  opponentName: string | null;
  opponentSlug?: string | null;
  competition: string | null;
  homeAway: "home" | "away" | "unknown";
  matchDate: string | null;
  difficulty: "easy" | "medium" | "hard" | "unknown";
  difficultyScore: number | null;
  reason: string;
  source?: string | null;
};

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
  const overall = Math.round(xsRadarClampV1(metrics.overall ?? xsRadarWeightedOverallByPositionV1(positionUsed, metrics)));
  const group = xsRadarPositionGroupLabelV1(positionUsed);
  const range = metrics.range || "L15";
  const delta = overall - 55;
  const deltaLabel =
    delta > 0
      ? `+${delta} au-dessus du profil moyen`
      : delta < 0
        ? `${delta} sous le profil moyen`
        : "au niveau du profil moyen";

  if (overall >= 75) {
    return {
      percentileLabel: `Top 10% des ${group}`,
      deltaLabel,
      tier: "elite",
      reason: `Comparaison provisoire: overall radar ${overall} sur ${range}, au-dessus du seuil elite local.`,
    };
  }
  if (overall >= 65) {
    return {
      percentileLabel: `Top 25% des ${group}`,
      deltaLabel,
      tier: "strong",
      reason: `Comparaison provisoire: overall radar ${overall} sur ${range}, profil fort pour son poste.`,
    };
  }
  if (overall >= 55) {
    return {
      percentileLabel: `Au-dessus de la moyenne des ${group}`,
      deltaLabel,
      tier: "strong",
      reason: `Comparaison provisoire: overall radar ${overall} sur ${range}, au-dessus du seuil moyen.`,
    };
  }
  if (overall >= 45) {
    return {
      percentileLabel: `Profil moyen des ${group}`,
      deltaLabel,
      tier: "average",
      reason: `Comparaison provisoire: overall radar ${overall} sur ${range}, proche du profil moyen.`,
    };
  }
  return {
    percentileLabel: `Sous la moyenne des ${group}`,
    deltaLabel,
    tier: "weak",
    reason: `Comparaison provisoire: overall radar ${overall} sur ${range}, sous le seuil moyen.`,
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
  const range = metrics.range || "L15";
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
  const range = metrics.range || "L15";
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
    reasons.push("fenêtre L15 équilibrée");
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
  const l15 = typeof metrics.l15 === "number" ? metrics.l15 : metrics.form;
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
  if (l5 >= 62 && l15 < 58 && l40 < 58 && metrics.gameTime >= 55) {
    return { label: "Différentiel intéressant", tone: "play", reason: `Différentiel intéressant : L5 fort mais historique L15/L40 encore moyen${opponentText}.` };
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
  range: XsRadarRangeV1 = "L15",
  realMatchContext?: XsCardMatchContextV1 | null
) {
  const positionUsed = xsRadarNormalizePositionV1(positionSource);
  const localMatchContext = xsBuildMatchContextV1(positionSource?.card, positionSource?.perf, historyChart);
  const matchContext = xsIsRealMatchContextUsefulV1(realMatchContext) ? realMatchContext as XsCardMatchContextV1 : localMatchContext;
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
    l15: fallbackAvg?.avg15 ?? fallbackScore,
    l40: fallbackAvg?.avg40 ?? fallbackScore,
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
    const fallbackMatchContext = xsAdjustMatchContextWithMetricsV1(matchContext, fallbackMetrics);
    return {
      confidence,
      matches,
      positionUsed,
      overall: xsRadarWeightedOverallByPositionV1(positionUsed, fallbackMetrics),
      profile: fallbackProfile,
      autoProfile: fallbackAutoProfile,
      confidenceEnhanced: fallbackConfidenceEnhanced,
      recommendation: xsRadarRecommendationV1(positionUsed, fallbackMetrics, fallbackAutoProfile, fallbackConfidenceEnhanced, fallbackMatchContext),
      matchContext: fallbackMatchContext,
      positionPercentile: xsRadarPositionPercentileV1(positionUsed, fallbackMetrics),
      meta: { source: "fallback", positionUsed, range },
      values: xsRadarValuesByPositionV1(positionUsed, fallbackMetrics),
    };
  }

  const l5 = xsRadarAvgV1(scores.slice(0, 5)) ?? fallbackAvg?.avg5 ?? fallbackScore;
  const l15 = xsRadarAvgV1(scores.slice(0, 15)) ?? fallbackAvg?.avg15 ?? fallbackScore;
  const l40 = xsRadarAvgV1(scores.slice(0, 40)) ?? fallbackAvg?.avg40 ?? fallbackScore;
  const trendL5 = xsRadarClampV1(fallbackAvg?.avg5 ?? l5);
  const trendL15 = xsRadarClampV1(fallbackAvg?.avg15 ?? l15);
  const trendL40 = xsRadarClampV1(fallbackAvg?.avg40 ?? l40);
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
    l15: trendL15,
    l40: trendL40,
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
  const adjustedMatchContext = xsAdjustMatchContextWithMetricsV1(matchContext, positionMetrics);
  const recommendation = xsRadarRecommendationV1(positionUsed, positionMetrics, autoProfile, confidenceEnhanced, adjustedMatchContext);
  const positionPercentile = xsRadarPositionPercentileV1(positionUsed, positionMetrics);

  return {
    confidence,
    matches,
    positionUsed,
    overall: positionMetrics.overall,
    profile,
    autoProfile,
    confidenceEnhanced,
    recommendation,
    matchContext: adjustedMatchContext,
    positionPercentile,
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
  const [realMatchContext, setRealMatchContext] = useState<XsCardMatchContextV1 | null>(null); // XS_CARD_REAL_MATCH_CONTEXT_V1
  const [state, setState] = useState<"idle" | "loading" | "ok" | "err">("idle");
  const [error, setError] = useState("");
  const [activeSeries, setActiveSeries] = useState<"L5" | "L15" | "ALL">("L5");
  const [radarRange, setRadarRange] = useState<XsRadarRangeV1>("L15");

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
        const resp = await fetch(url, { headers: { accept: "application/json" } });
        const json = await resp.json().catch(() => null);
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

  /* XS_CARD_HISTORY_AUTO_SYNC_V1 */
  useEffect(() => {
    // XS_FIX_CARD_POSITION_AND_SYNC_V1: history sync is launched from Mes cartes, not on each card open.
    return;
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
        realMatchContext
      ),
    [historyChart, avg5, avg15, avg40, resolvedPosition, positionRawParam, card, perf, radarRange, realMatchContext]
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
        overall={xsFifaRadar.overall}
        confidence={xsFifaRadar.confidence}
        matches={xsFifaRadar.matches}
        positionUsed={xsRadarChartPositionLabelV1(xsFifaRadar.positionUsed)}
        profile={xsFifaRadar.profile}
        range={radarRange}
        onRangeChange={setRadarRange}
        autoProfile={xsFifaRadar.autoProfile}
        confidenceEnhanced={xsFifaRadar.confidenceEnhanced}
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
          recentScores15: {Array.isArray((perf as any)?.recentScores15) ? (perf as any).recentScores15.length : 0}
        </Text>
        <Text style={{ color: theme.muted }}>
          ALL/historyChart: {Array.isArray(historyChart) ? historyChart.length : 0}
        </Text>
      </View>
    </ScrollView>
  );
}
























