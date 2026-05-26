import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Image, SafeAreaView, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { apiFetch } from "../../../src/api";
import SorarePerformanceChart from "../../../src/components/SorarePerformanceChart";
import { publicPlayerPerformance, recruterPlayerCards, recruterSaleStatus, type PublicPlayerPerformance, type RecruterOffer, type RecruterPlayer } from "../../../src/scoutApi";

// XS_FRONT_RECRUTER_PLAYERS_INDEX_V1
// XS_RECRUTER_PREMIUM_UI_REFERENCE_V1: premium Recruter detail UI aligned with the reference screen.
// XS_RECRUTER_PLAYER_FACE_CROP_FIX_V1: crop Recruter player images toward face/upper body.
// XS_RECRUTER_FACE_CROP_STRONG_OFFSET_V1: stronger vertical crop offsets for Recruter player faces.
// XS_RECRUTER_FACE_CROP_EXTRA_HIGH_V1: push Recruter crops higher so faces are visible first.
// XS_RECRUTER_HEADSHOT_IMAGE_PRIORITY_V1: prefer player avatar/headshot images before full-body card pictures.
// XS_RECRUTER_PLAYER_IMAGE_CONTAIN_V1: show full Recruter player images without aggressive crop.
// XS_RECRUTER_MOVE_RADAR_TO_STATS_V1: keep coach decision in Analyse and move radar metrics to Stats.
// XS_RECRUTER_STATS_GRAPH_L5_L10_L40_V1: reuse card performance graph in Recruter Stats.
// XS_RECRUTER_STATS_GRAPH_LOGOS_RANGE_V1: Stats graph supports L5/L10/L40 ranges and opponent logos.
// XS_RECRUTER_STATS_ALL_LABEL_V1: display the 40-match stats range as All without changing history logic.
// XS_ALL_EXTENSIBLE_HISTORY_V1: load a larger history window only when All is selected.
// XS_RECRUTER_SALE_CARD_IMAGE_V1: sale rows prefer real Sorare card artwork before player portraits.
function text(v: unknown, fallback = "") {
  const s = String(v ?? "").trim();
  return s || fallback;
}

function priceLabel(card: RecruterOffer) {
  const direct = text(card?.price?.text);
  if (direct) return direct;
  const eur = card?.price?.eur;
  if (typeof eur === "number" && Number.isFinite(eur)) return `€${eur.toFixed(2)}`;
  return "Prix indisponible";
}

function rarityLabel(card: RecruterOffer) {
  return text(card?.rarity, "—").toUpperCase();
}

function seasonLabel(card: RecruterOffer) {
  return card?.season != null ? String(card.season) : "—";
}

type RecruterCoachContextV1 = {
  opponentName?: string | null;
  opponentLogoUrl?: string | null;
  competition?: string | null;
  homeAway?: "home" | "away" | "unknown" | string | null;
  matchDate?: string | null;
  difficulty?: "easy" | "medium" | "hard" | "unknown" | string | null;
  difficultyScore?: number | null;
  reason?: string | null;
};

type RecruterPlayerStatusV1 = {
  status?: string | null;
  reason?: string | null;
  expectedReturnDate?: string | null;
  source?: string | null;
  updatedAt?: string | null;
  yellowCards?: number | null;
  redCards?: number | null;
  suspensionMatches?: number | null;
  disciplineRisk?: string | null;
};

type RecruterHistoryPayloadV1 = {
  items?: any[];
  averages?: { l5?: number | null; l10?: number | null; l15?: number | null; l40?: number | null } | null;
  playerName?: string | null;
  position?: string | null;
  activeClub?: { name?: string | null; slug?: string | null } | null;
};

type RecruterPlayerLightV1 = {
  ok?: boolean;
  player?: {
    slug?: string | null;
    displayName?: string | null;
    position?: string | null;
    age?: number | null;
    avatarPictureUrl?: string | null;
    pictureUrl?: string | null;
    activeClub?: { slug?: string | null; name?: string | null; pictureUrl?: string | null } | null;
  } | null;
  imageCandidates?: { field?: string | null; url?: string | null; kind?: string | null }[];
};

type RecruterStatsRangeV1 = 5 | 10 | 40;
const XS_RECRUTER_HISTORY_INITIAL_LIMIT_V1 = 40;
const XS_RECRUTER_HISTORY_ALL_LIMIT_V1 = 100;

const XS_RECRUTER_PERF_FALLBACK_BASE_V1 = "https://xiascor-backend-tssdy62zqa-ez.a.run.app";
const XS_RECRUTER_PLAYER_PLACEHOLDER_V1 = "https://frontend-assets.sorare.com/placeholders/player-v2.png";
const XS_RECRUTER_HEADSHOT_LOGGED_V1 = new Set<string>();

function num(v: unknown, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(v: unknown, min = 0, max = 100) {
  return Math.max(min, Math.min(max, num(v, min)));
}

function avg(values: number[]) {
  const xs = values.filter((v) => Number.isFinite(v));
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
}

function std(values: number[]) {
  const xs = values.filter((v) => Number.isFinite(v));
  const m = avg(xs);
  if (m == null || xs.length < 2) return 0;
  return Math.sqrt(xs.reduce((a, b) => a + Math.pow(b - m, 2), 0) / xs.length);
}

function normalizeRecruterPositionV1(value: unknown) {
  const raw = String(value || "").trim();
  const upper = raw.toUpperCase();
  if (!upper) return "GEN";
  if (/\b(GK|G)\b|GOALKEEPER|GOALIE|KEEPER|GARDIEN/.test(upper)) return "GK";
  if (/\b(DEF|DF|D)\b|DEFENDER|DEFENSE|DÉFENSE|DEFENCE|DÉFENSEUR|DEFENSEUR|CENTRE BACK|CENTER BACK|FULL BACK|FULLBACK|LEFT BACK|RIGHT BACK|BACK/.test(upper)) return "DEF";
  if (/\b(MID|MD|M|CM|CDM|CAM|LM|RM)\b|MIDFIELDER|MILIEU/.test(upper)) return "MID";
  if (/\b(FW|FWD|ST|CF|LW|RW)\b|FORWARD|ATTACKER|STRIKER|WINGER|ATTAQUANT|ATT/.test(upper)) return "FW";
  return "GEN";
}

function normalizePositionV1(value: unknown) {
  return normalizeRecruterPositionV1(value);
}

function recruterSlugV1(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function recruterAnyPlayerSlugV1(item: any) {
  return recruterSlugV1(item?.playerSlug || item?.player?.slug || item?.anyPlayer?.slug || item?.slug);
}

function pickRecruterPositionFallbackPlayerV1(payload: any, slug: string) {
  const items = Array.isArray(payload?.items) ? payload.items : [];
  const wanted = String(slug || "").trim().toLowerCase();
  return items.find((item: any) => recruterSlugV1(item?.slug || item?.playerSlug) === wanted) || null;
}

function getRecruterPlayerPositionV1(player: any, cards: any[] = [], offers: any[] = [], params: any = {}, fallbacks: any = {}) {
  const routeSlug = recruterSlugV1(params?.slug);
  const rawCandidates: any[] = [];
  const addCandidate = (source: string, value: unknown, sourceSlug: unknown, trusted: boolean) => {
    const normalized = normalizeRecruterPositionV1(value);
    rawCandidates.push({ source, value: value || null, normalized, sourceSlug: recruterSlugV1(sourceSlug), trusted });
  };
  const addExactPlayer = (source: string, entity: any) => {
    const sourceSlug = recruterSlugV1(entity?.slug || entity?.playerSlug);
    const trusted = !!routeSlug && sourceSlug === routeSlug;
    addCandidate(`${source}.position`, entity?.position, sourceSlug, trusted);
    addCandidate(`${source}.primaryPosition`, entity?.primaryPosition, sourceSlug, trusted);
    addCandidate(`${source}.cardPosition`, entity?.cardPosition, sourceSlug, trusted);
    addCandidate(`${source}.activePosition`, entity?.activePosition, sourceSlug, trusted);
  };
  const addExactCard = (source: string, item: any) => {
    const sourceSlug = recruterAnyPlayerSlugV1(item);
    const trusted = !!routeSlug && sourceSlug === routeSlug;
    addCandidate(`${source}.position`, item?.position, sourceSlug, trusted);
    addCandidate(`${source}.anyPlayer.position`, item?.anyPlayer?.position, sourceSlug, trusted);
    addCandidate(`${source}.player.position`, item?.player?.position, sourceSlug, trusted);
  };

  addExactPlayer("player", player);
  cards.forEach((card, index) => addExactCard(`cards[${index}]`, card));
  offers.forEach((offer, index) => addExactCard(`offers[${index}]`, offer));
  addExactPlayer("recruterIndex", fallbacks?.indexPlayer);
  addExactPlayer("postgresPlayer", fallbacks?.dbPlayer);
  addCandidate("route.position", params?.position, routeSlug, false);

  const trusted = rawCandidates.filter((candidate) => candidate.trusted && candidate.normalized !== "GEN");
  const unique = Array.from(new Set(trusted.map((candidate) => candidate.normalized)));
  const conflicts = unique.length > 1 ? trusted : [];
  if (conflicts.length) return { position: null, sourceUsed: "conflict", rawCandidates, conflicts };
  if (unique.length === 1) {
    const source = trusted.find((candidate) => candidate.normalized === unique[0]);
    return { position: unique[0], sourceUsed: source?.source || "trusted", rawCandidates, conflicts: [] };
  }
  return { position: null, sourceUsed: "none", rawCandidates, conflicts: [] };
}

function scoreFromRowV1(row: any) {
  return num(row?.scoreSorare ?? row?.score ?? row?.totalScore ?? row?.so5Score, NaN);
}

function hasRecruterHistoryDataV1(payload: RecruterHistoryPayloadV1 | null | undefined) {
  if (!payload) return false;
  const averages = payload.averages || null;
  return (
    (Array.isArray(payload.items) && payload.items.length > 0) ||
    Number.isFinite(Number(averages?.l5)) ||
    Number.isFinite(Number(averages?.l10)) ||
    Number.isFinite(Number(averages?.l15)) ||
    Number.isFinite(Number(averages?.l40))
  );
}

function xsRecruterHistoryScoreV1(row: any) {
  const value = row?.scoreSorare ?? row?.score ?? row?.playerScore ?? row?.totalScore ?? row?.so5Score;
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n) : null;
}

function xsRecruterHistoryOpponentShortV1(row: any) {
  return text(
    row?.opponentShort ||
    row?.opponentCode ||
    row?.opponentClub?.shortName ||
    row?.opponentClub?.name ||
    row?.opponentTeam?.shortName ||
    row?.opponentTeam?.name ||
    row?.opponentName ||
    row?.opponent?.shortName ||
    row?.opponent?.name ||
    row?.team?.shortName ||
    row?.team?.name ||
    row?.club?.shortName ||
    row?.club?.name ||
    row?.awayTeam?.shortName ||
    row?.awayTeam?.name ||
    row?.homeTeam?.shortName ||
    row?.homeTeam?.name,
    "—"
  );
}

function xsRecruterHistoryOpponentLogoV1(row: any) {
  return text(
    row?.opponentLogoUrl ||
    row?.opponentLogo ||
    row?.logoUrl ||
    row?.clubLogoUrl ||
    row?.teamLogoUrl ||
    row?.crestUrl ||
    row?.logo ||
    row?.pictureUrl ||
    row?.opponentClub?.pictureUrl ||
    row?.opponentClub?.logoUrl ||
    row?.opponentClub?.crestUrl ||
    row?.opponentTeam?.pictureUrl ||
    row?.opponentTeam?.logoUrl ||
    row?.opponentTeam?.crestUrl ||
    row?.opponent?.club?.pictureUrl ||
    row?.opponent?.club?.logoUrl ||
    row?.opponent?.club?.crestUrl ||
    row?.opponent?.pictureUrl ||
    row?.opponent?.logoUrl ||
    row?.team?.pictureUrl ||
    row?.team?.logoUrl ||
    row?.team?.crestUrl ||
    row?.club?.pictureUrl ||
    row?.club?.logoUrl ||
    row?.club?.crestUrl ||
    row?.awayTeam?.pictureUrl ||
    row?.awayTeam?.logoUrl ||
    row?.homeTeam?.pictureUrl ||
    row?.homeTeam?.logoUrl
  ) || null;
}

function normalizeRecruterHistoryPayloadV1(payload: any): RecruterHistoryPayloadV1 {
  const items = Array.isArray(payload?.items)
    ? payload.items
    : Array.isArray(payload?.historyChart)
      ? payload.historyChart
      : Array.isArray(payload?.recentScores)
        ? payload.recentScores.map((score: any) => ({ scoreSorare: score, score }))
        : [];
  const averagesSource = payload?.averages && typeof payload.averages === "object" ? payload.averages : payload;
  const averages = {
    l5: Number.isFinite(Number(averagesSource?.l5)) ? Number(averagesSource.l5) : null,
    l10: Number.isFinite(Number(averagesSource?.l10)) ? Number(averagesSource.l10) : null,
    l15: Number.isFinite(Number(averagesSource?.l15)) ? Number(averagesSource.l15) : null,
    l40: Number.isFinite(Number(averagesSource?.l40)) ? Number(averagesSource.l40) : null,
  };
  return {
    ...payload,
    items,
    averages,
    playerName: payload?.playerName || payload?.name || null,
    position: payload?.position || null,
    activeClub: payload?.activeClub || payload?.club || null,
  };
}

async function fetchRecruterHistoryForCoachV1(slug: string): Promise<RecruterHistoryPayloadV1> {
  // XS_RECRUTER_PERFORMANCE_DATA_WIRING_FIX_V1: Recruter needs a robust performance source, not an empty Cloud history fallback.
  const playerSlug = String(slug || "").trim().toLowerCase();
  if (!playerSlug) return { items: [], averages: null };

  try {
    const direct = normalizeRecruterHistoryPayloadV1(
      await apiFetch<RecruterHistoryPayloadV1>(`/history/player-chart/${encodeURIComponent(playerSlug)}?limit=${XS_RECRUTER_HISTORY_INITIAL_LIMIT_V1}`)
    );
    if (hasRecruterHistoryDataV1(direct)) {
      console.log("[XS_RECRUTER_PERFORMANCE_DATA_WIRING_FIX_V1]", {
        slug: playerSlug,
        source: "history-player-chart",
        averages: direct.averages,
        itemsCount: direct.items?.length || 0,
      });
      return direct;
    }
  } catch (e: any) {
    console.log("[XS_RECRUTER_PERFORMANCE_DATA_WIRING_FIX_V1]", {
      slug: playerSlug,
      source: "history-player-chart",
      error: String(e?.message || e),
    });
  }

  const base = XS_RECRUTER_PERF_FALLBACK_BASE_V1.replace(/\/+$/, "");
  const url = `${base}/public-player-performance?slug=${encodeURIComponent(playerSlug)}&limit=${XS_RECRUTER_HISTORY_INITIAL_LIMIT_V1}`;
  const response = await fetch(url, { headers: { accept: "application/json" } });
  const json = await response.json().catch(() => null);
  if (!response.ok) throw new Error(json?.error || json?.message || `HTTP ${response.status}`);
  const fallback = normalizeRecruterHistoryPayloadV1(json);
  console.log("[XS_RECRUTER_PERFORMANCE_DATA_WIRING_FIX_V1]", {
    slug: playerSlug,
    source: "public-player-performance",
    averages: fallback.averages,
    itemsCount: fallback.items?.length || 0,
  });
  return fallback;
}

function pickScoresV1(perf: PublicPlayerPerformance | null, historyItems?: any[] | null) {
  const p: any = perf || {};
  const rows = Array.isArray(historyItems) && historyItems.length
    ? historyItems
    : (Array.isArray(p.historyChart) ? p.historyChart : []);
  const fromRows = rows
    .map(scoreFromRowV1)
    .filter((v: number) => Number.isFinite(v));
  const fromRecent = Array.isArray(p.recentScores)
    ? p.recentScores.map((v: any) => num(v, NaN)).filter((v: number) => Number.isFinite(v))
    : [];
  return fromRows.length ? fromRows : fromRecent;
}

function pickAverageV1(
  perf: PublicPlayerPerformance | null,
  key: "l5" | "l10" | "l15" | "l40",
  scores: number[],
  historyAverages?: RecruterHistoryPayloadV1["averages"]
) {
  const p: any = perf || {};
  const direct = num(historyAverages?.[key] ?? p.averages?.[key] ?? p[key], NaN);
  if (Number.isFinite(direct)) return clamp(direct);
  const windowSize = key === "l5" ? 5 : key === "l10" ? 10 : key === "l15" ? 15 : 40;
  const fallback = avg(scores.slice(0, windowSize));
  return fallback == null ? null : clamp(fallback);
}

function trendFromScoresV1(scores: number[]) {
  if (scores.length < 6) return "stable" as const;
  const recent = avg(scores.slice(0, 3)) ?? 0;
  const older = avg(scores.slice(3, 6)) ?? 0;
  if (recent - older > 5) return "up" as const;
  if (older - recent > 5) return "down" as const;
  return "stable" as const;
}

function volatilityFromScoresV1(scores: number[]) {
  if (scores.length < 3) return "unknown" as const;
  const s = std(scores.slice(0, 15));
  if (s < 8) return "stable" as const;
  if (s < 15) return "medium" as const;
  return "high" as const;
}

function difficultyBonusV1(ctx: RecruterCoachContextV1 | null) {
  const difficulty = String(ctx?.difficulty || "").toLowerCase();
  const homeAway = String(ctx?.homeAway || "").toLowerCase();
  let bonus = 0;
  if (difficulty === "easy") bonus += 4;
  if (difficulty === "hard") bonus -= 5;
  if (homeAway === "home") bonus += 2;
  if (homeAway === "away") bonus -= 2;
  return bonus;
}

function statusPenaltyV1(status: RecruterPlayerStatusV1 | null) {
  const raw = String(status?.status || "").toLowerCase();
  if (raw === "injured" || raw === "suspended") return 45;
  if (raw === "doubtful") return 10;
  return 0;
}

// XS_RECRUTER_RADAR_SAME_AS_CARDS_V1: mirror card-detail FIFA radar profiles by position for Recruter.
function recruterPositionGroupLabelV1(position: string) {
  if (position === "GK") return "gardiens";
  if (position === "DEF") return "défenseurs";
  if (position === "MID") return "milieux";
  if (position === "FW") return "attaquants";
  return "joueurs";
}

function recruterWeightedOverallByPositionV1(position: string, m: Record<string, number>) {
  if (position === "GK") return clamp(m.saves * 0.3 + m.cleanSheets * 0.2 + m.regularity * 0.15 + m.reliability * 0.15 + m.impact * 0.1 + m.gameTime * 0.1);
  if (position === "DEF") return clamp(m.defense * 0.3 + m.duels * 0.2 + m.regularity * 0.15 + m.reliability * 0.15 + m.impact * 0.1 + m.gameTime * 0.1);
  if (position === "MID") return clamp(m.creation * 0.25 + m.impact * 0.2 + m.regularity * 0.2 + m.defense * 0.15 + m.reliability * 0.1 + m.gameTime * 0.1);
  if (position === "FW") return clamp(m.attack * 0.3 + m.impact * 0.25 + m.creation * 0.15 + m.regularity * 0.15 + m.reliability * 0.1 + m.gameTime * 0.05);
  return clamp((m.form + m.regularity + m.gameTime + m.impact + m.attack + m.creation + m.defense + m.reliability) / 8);
}

function recruterRadarValuesByPositionV1(position: string, m: Record<string, number>) {
  const base = [
    { label: "Forme", value: m.form },
    { label: "Régularité", value: m.regularity },
    { label: "Temps de jeu", value: m.gameTime },
  ];
  if (position === "GK") {
    return [
      ...base,
      { label: "Sécurité", value: m.cleanSheets },
      { label: "Arrêts", value: m.saves },
      { label: "Fiabilité", value: m.reliability },
    ];
  }
  if (position === "DEF") {
    return [
      ...base,
      { label: "Défense", value: m.defense },
      { label: "Duels", value: m.duels },
      { label: "Fiabilité", value: m.reliability },
    ];
  }
  if (position === "MID") {
    return [
      ...base,
      { label: "Création", value: m.creation },
      { label: "Impact", value: m.impact },
      { label: "Volume", value: m.defense },
    ];
  }
  if (position === "FW") {
    return [
      ...base,
      { label: "Attaque", value: m.attack },
      { label: "Décisif", value: m.impact },
      { label: "Plafond", value: m.ceiling },
    ];
  }
  return [
    ...base,
    { label: "Impact", value: m.impact },
    { label: "Plafond", value: m.ceiling },
    { label: "Fiabilité", value: m.reliability },
  ];
}

function recruterAutoProfileV1(position: string, m: Record<string, number>, matches: number) {
  if (matches < 3) return { label: "Profil en construction", reason: "Pas encore assez de matchs fiables." };
  if (position === "GK") {
    if (m.gameTime < 45) return { label: "Gardien à risque", reason: "Temps de jeu faible sur la fenêtre récente." };
    if (m.saves >= 65 && m.cleanSheets >= 60 && m.reliability >= 60) return { label: "Mur défensif", reason: "Sécurité, arrêts et fiabilité au-dessus du repère." };
    if (m.reliability >= 65 && m.regularity >= 60) return { label: "Gardien fiable", reason: "Fiabilité et régularité solides." };
    return { label: "Gardien équilibré", reason: "Profil stable sans pic majeur." };
  }
  if (position === "DEF") {
    if (m.regularity < 45) return { label: "Défenseur irrégulier", reason: "Régularité basse pour un profil défensif." };
    if (m.defense >= 65 && m.duels >= 60) return { label: "Stoppeur", reason: "Défense et duels forts sur la fenêtre récente." };
    if (m.reliability >= 65 && m.regularity >= 65) return { label: "Défenseur sûr", reason: "Fiabilité et régularité fortes." };
    return { label: "Défenseur équilibré", reason: "Base défensive exploitable." };
  }
  if (position === "MID") {
    if (m.regularity < 45) return { label: "Milieu irrégulier", reason: "Régularité fragile pour un profil milieu." };
    if (m.creation >= 65 && m.impact >= 60) return { label: "Créateur", reason: "Création et impact forts." };
    if (m.defense >= 60 && m.regularity >= 60) return { label: "Milieu complet", reason: "Volume et régularité solides." };
    return { label: "Milieu équilibré", reason: "Profil polyvalent." };
  }
  if (position === "FW") {
    if (m.gameTime < 45) return { label: "Attaquant à risque", reason: "Temps de jeu fragile pour un profil offensif." };
    if (m.attack >= 65 && m.impact >= 60) return { label: "Finisseur", reason: "Attaque et impact décisif élevés." };
    if (m.ceiling >= 75 && m.regularity < 55) return { label: "High risk / high reward", reason: "Plafond fort mais régularité instable." };
    return { label: "Attaquant équilibré", reason: "Profil offensif stable." };
  }
  return { label: "Profil général", reason: "Lecture générale faute de poste confirmé." };
}

function recruterPositionSignalsV1(position: string, m: Record<string, number>) {
  if (position === "GK") {
    return {
      positive: m.gameTime >= 62 ? "Temps de jeu fiable" : m.reliability >= 60 ? "Profil stable" : m.cleanSheets >= 60 ? "Sécurité correcte" : null,
      risk: m.gameTime < 50 ? "Temps de jeu gardien fragile" : m.ceiling < 58 ? "Plafond limité" : m.cleanSheets < 45 ? "Dépend fortement du clean sheet" : "Peu de marge si but encaissé",
      main: m.reliability >= 60 ? "Fiabilité du gardien" : "Sécurité gardien",
    };
  }
  if (position === "DEF") {
    return {
      positive: m.defense >= 60 ? "Régularité défensive" : m.gameTime >= 62 ? "Temps de jeu solide" : m.regularity >= 58 ? "Score stable" : null,
      risk: m.regularity < 50 ? "Régularité défensive fragile" : m.ceiling < 60 ? "Plafond moyen" : "Dépend du clean sheet",
      main: m.defense >= m.duels ? "Impact défensif" : "Duels défensifs",
    };
  }
  if (position === "MID") {
    return {
      positive: m.defense >= 60 ? "Volume intéressant" : m.creation >= 60 ? "Création utile" : m.regularity >= 58 ? "Profil régulier" : null,
      risk: m.impact < 45 ? "Impact décisif limité" : m.regularity < 50 ? "Irrégularité possible" : "Dépend du rôle dans l'équipe",
      main: m.creation >= m.defense ? "Création au milieu" : "Volume de jeu",
    };
  }
  if (position === "FW") {
    return {
      positive: m.ceiling >= 70 ? "Plafond élevé" : m.impact >= 60 ? "Potentiel décisif" : m.attack >= 58 ? "Forme offensive" : null,
      risk: m.regularity < 50 ? "Scores irréguliers" : m.impact < 50 ? "Dépend des buts/passes" : "Risque de faible AA",
      main: m.attack >= m.ceiling ? "Impact offensif" : "Plafond offensif",
    };
  }
  return { positive: null, risk: null, main: "Profil général" };
}

function buildRecruterCoachRadarV1(params: {
  perf: PublicPlayerPerformance | null;
  historyItems?: any[];
  historyAverages?: RecruterHistoryPayloadV1["averages"];
  matchContext: RecruterCoachContextV1 | null;
  playerStatus: RecruterPlayerStatusV1 | null;
  fallbackPosition: string;
}) {
  // XS_RECRUTER_COACH_DECISION_DATA_L1540_V1: feed Recruter coach with the same history/player-chart source as card detail.
  const scores = pickScoresV1(params.perf, params.historyItems);
  const l5 = pickAverageV1(params.perf, "l5", scores, params.historyAverages);
  const l10 = pickAverageV1(params.perf, "l10", scores, params.historyAverages);
  const l15 = pickAverageV1(params.perf, "l15", scores, params.historyAverages);
  const l40 = pickAverageV1(params.perf, "l40", scores, params.historyAverages);
  const overallBase = clamp((l5 ?? l10 ?? l40 ?? 50) * 0.4 + (l10 ?? l5 ?? l40 ?? 50) * 0.35 + (l40 ?? l10 ?? l5 ?? 50) * 0.25);
  const trend = trendFromScoresV1(scores);
  const volatility = volatilityFromScoresV1(scores);
  const ceiling = scores.length ? Math.max(...scores.slice(0, 15)) : Math.round(overallBase);
  const regularity = clamp(100 - std(scores.slice(0, 15)) * 2.4);
  const confidence = clamp((scores.length >= 15 ? 78 : scores.length >= 8 ? 62 : scores.length >= 4 ? 45 : 28) - (volatility === "high" ? 12 : volatility === "medium" ? 5 : 0));
  const position = normalizeRecruterPositionV1(params.fallbackPosition);
  const gameTime = clamp((l40 ?? overallBase) + 8);
  const impact = clamp((l5 ?? overallBase) * 0.45 + (l10 ?? overallBase) * 0.2 + (ceiling || overallBase) * 0.35);
  const attack = clamp((l5 ?? overallBase) * 0.45 + impact * 0.35 + (ceiling || overallBase) * 0.2);
  const creation = clamp((l10 ?? overallBase) * 0.5 + impact * 0.25 + regularity * 0.25);
  const defense = clamp((l40 ?? overallBase) * 0.4 + regularity * 0.35 + gameTime * 0.25);
  const duels = clamp(defense * 0.62 + impact * 0.38);
  const saves = clamp(confidence * 0.35 + regularity * 0.25 + (ceiling || overallBase) * 0.2 + gameTime * 0.2);
  const cleanSheets = clamp(defense * 0.45 + confidence * 0.3 + (params.matchContext?.difficulty === "easy" ? 12 : params.matchContext?.difficulty === "hard" ? -8 : 0) + 20);
  const reliability = confidence;
  const positionMetrics = {
    form: l5 ?? overallBase,
    regularity,
    gameTime,
    impact,
    attack,
    creation,
    defense,
    duels,
    saves,
    cleanSheets,
    reliability,
    ceiling: clamp(ceiling || overallBase),
  };
  const positionOverall = recruterWeightedOverallByPositionV1(position, positionMetrics);
  const score = clamp(positionOverall + difficultyBonusV1(params.matchContext) + (trend === "up" ? 4 : trend === "down" ? -4 : 0) + (ceiling >= 80 ? 4 : ceiling >= 70 ? 2 : 0) - (volatility === "high" ? 8 : volatility === "medium" ? 3 : 0) - statusPenaltyV1(params.playerStatus));
  const autoProfile = recruterAutoProfileV1(position, positionMetrics, scores.length);
  const positionSignals = recruterPositionSignalsV1(position, positionMetrics);
  const hasPerformanceData = scores.length > 0 || l5 != null || l15 != null || l40 != null;
  const statusRaw = String(params.playerStatus?.status || "").toLowerCase();
  const forcedAvoid = statusRaw === "injured" || statusRaw === "suspended";
  const finalTone = forcedAvoid || score < 40 ? "avoid" : score >= 75 ? "strongPlay" : score >= 65 ? "play" : score >= 52 ? "borderline" : "risk";
  const finalLabel = forcedAvoid || score < 40 ? "À éviter" : score >= 75 ? "Titulaire évident" : score >= 65 ? "À aligner" : score >= 52 ? "Borderline" : "Pari risqué";
  const decision = forcedAvoid || score < 45 ? "À éviter" : score >= 75 ? "Titulaire" : score >= 60 ? "Borderline" : "Risqué";
  const tone = forcedAvoid || score < 45 ? "avoid" : score >= 75 ? "play" : score >= 60 ? "watch" : "risky";
  const why = [
    l5 != null && l5 >= 60 ? "Forme récente solide" : null,
    regularity >= 62 ? "Régularité correcte" : null,
    positionSignals.positive,
    params.matchContext?.difficulty === "easy" ? "Contexte favorable" : null,
    ceiling >= 75 ? "Plafond intéressant" : null,
  ].filter(Boolean) as string[];
  const risks = [
    statusPenaltyV1(params.playerStatus) >= 45 ? "Indisponibilité joueur" : null,
    volatility === "high" ? "Scores très irréguliers" : null,
    positionSignals.risk,
    confidence < 50 ? "Confiance limitée" : null,
    params.matchContext?.difficulty === "hard" ? "Match difficile" : null,
  ].filter(Boolean) as string[];

  return {
    values: recruterRadarValuesByPositionV1(position, positionMetrics),
    overall: Math.round(score),
    confidence: confidence / 100,
    matches: scores.length,
    l5,
    l10,
    l15,
    l40,
    hasPerformanceData,
    positionUsed: position,
    profile: autoProfile.label,
    range: "L10" as const,
    coachDecision: {
      score: Math.round(score),
      decision,
      tone,
      adjustedOverall: Math.round(score),
      rawOverall: Math.round(positionOverall),
      matchBonus: difficultyBonusV1(params.matchContext),
      trend,
      volatility,
      ceiling: Math.round(ceiling || 0),
      reasons: [...why, ...risks].slice(0, 4),
      reason: [...why, ...risks][0] || autoProfile.reason || "Analyse basée sur les performances disponibles.",
      windowBlendLabel: "L5 40% · L10 35% · L40 25%",
    },
    decisionV2: {
      finalLabel,
      finalTone,
      playStyle: finalTone === "strongPlay" || finalTone === "play" ? "Safe pick" : finalTone === "risk" ? "Watchlist" : finalTone === "avoid" ? "Rotation risk" : "Option",
      summary: forcedAvoid
        ? "À éviter : statut joueur défavorable."
        : `${finalLabel} : ${why[0] || autoProfile.reason || "données exploitables"}${risks[0] ? `, mais ${risks[0].toLowerCase()}` : "."}`,
      bullets: [...why, ...risks].slice(0, 3),
      whyItems: why.slice(0, 3).map((title) => ({ title, text: "Signal positif détecté sur les données disponibles." })),
      riskItems: (risks.length ? risks : ["Aucun signal bloquant"]).slice(0, 2).map((title) => ({ title, text: title === "Aucun signal bloquant" ? "Risque principal limité par les données actuelles." : "Point à surveiller avant achat." })),
      deepAnalysis: {
        verdict: forcedAvoid ? "À éviter : statut joueur défavorable." : `${finalLabel} avant achat.`,
        mainReason: { title: why[0] || risks[0] || positionSignals.main || "Données limitées", text: why[0] ? `${positionSignals.main} : point fort principal du profil ${position}.` : "Analyse prudente faute de signaux complets." },
        positiveSignals: why.slice(0, 3).map((title) => ({ title, text: `Signal favorable pour un profil ${position}.` })),
        negativeSignals: risks.slice(0, 3).map((title) => ({ title, text: `Risque spécifique à intégrer pour ce profil ${position}.` })),
        actionAdvice: { title: finalLabel, text: finalTone === "avoid" ? "À éviter sauf besoin de différentiel très spécifique." : "À comparer avec les options disponibles à ce poste." },
        availability: params.playerStatus ? { title: String(params.playerStatus.status || "unknown"), text: params.playerStatus.reason || "Statut joueur récupéré côté backend." } : undefined,
        playerStatus: params.playerStatus,
      },
    },
    recommendation: {
      label: finalLabel,
      tone: finalTone === "avoid" ? "avoid" : finalTone === "risk" ? "risky" : finalTone === "borderline" ? "watch" : "play",
      reason: risks[0] ? `${why[0] || "Profil exploitable"}, risque : ${risks[0].toLowerCase()}.` : (why[0] || "Profil à surveiller avant achat."),
    },
    matchContext: {
      opponentName: params.matchContext?.opponentName || null,
      opponentLogoUrl: params.matchContext?.opponentLogoUrl || null,
      competition: params.matchContext?.competition || null,
      homeAway: params.matchContext?.homeAway === "home" || params.matchContext?.homeAway === "away" ? params.matchContext.homeAway : "unknown",
      matchDate: params.matchContext?.matchDate || null,
      difficulty: params.matchContext?.difficulty === "easy" || params.matchContext?.difficulty === "medium" || params.matchContext?.difficulty === "hard" ? params.matchContext.difficulty : "unknown",
      difficultyScore: typeof params.matchContext?.difficultyScore === "number" ? params.matchContext.difficultyScore : null,
      reason: params.matchContext?.reason || "Contexte match en attente.",
    },
    positionPercentile: {
      percentileLabel: score >= 70 ? `Profil fort local des ${recruterPositionGroupLabelV1(position)}` : score >= 55 ? `Profil correct local des ${recruterPositionGroupLabelV1(position)}` : `Profil à surveiller local des ${recruterPositionGroupLabelV1(position)}`,
      deltaLabel: `${Math.round(score - 55) >= 0 ? "+" : ""}${Math.round(score - 55)} au-dessus moyenne`,
      tier: score >= 75 ? "elite" : score >= 65 ? "strong" : score >= 45 ? "average" : "weak",
      reason: "Comparaison locale provisoire basée sur le score coach Recruter.",
    },
  };
}

function scoreToneV1(score: number | null) {
  if (typeof score !== "number" || !Number.isFinite(score)) return "#64748B";
  if (score >= 55) return "#22C55E";
  if (score >= 50) return "#22C55E";
  if (score >= 40) return "#FACC15";
  return "#EF4444";
}

function PremiumMetricBarV1({ label, value }: { label: string; value: number }) {
  const color = scoreToneV1(value);
  return (
    <View style={{ gap: 7 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ color: "#F8FAFC", fontWeight: "800" }}>{label}</Text>
        <Text style={{ color, fontWeight: "900", fontVariant: ["tabular-nums"] }}>{Math.round(value)}</Text>
      </View>
      <View style={{ height: 8, borderRadius: 999, backgroundColor: "#1B2230", overflow: "hidden" }}>
        <View style={{ width: `${Math.max(4, Math.min(100, Math.round(value)))}%`, height: "100%", borderRadius: 999, backgroundColor: color }} />
      </View>
    </View>
  );
}

function getRecruterPlayerImageV1(player: any, card?: any, offer?: any) {
  const pick = (source: string, value: unknown, kind: "headshot" | "fullBody") => {
    const uri = text(value);
    return uri ? { uri, source, kind } : null;
  };
  const candidates = [
    pick("player.avatarUrl", player?.avatarUrl, "headshot"),
    pick("player.avatarPictureUrl", player?.avatarPictureUrl, "headshot"),
    pick("player.player.avatarUrl", player?.player?.avatarUrl, "headshot"),
    pick("player.player.avatarPictureUrl", player?.player?.avatarPictureUrl, "headshot"),
    pick("player.anyPlayer.avatarUrl", player?.anyPlayer?.avatarUrl, "headshot"),
    pick("player.anyPlayer.avatarPictureUrl", player?.anyPlayer?.avatarPictureUrl, "headshot"),
    pick("player.photoUrl", player?.photoUrl, "headshot"),
    pick("player.raw.avatarUrl", player?.raw?.avatarUrl, "headshot"),
    pick("player.raw.avatarPictureUrl", player?.raw?.avatarPictureUrl, "headshot"),
    pick("player.raw.player.avatarUrl", player?.raw?.player?.avatarUrl, "headshot"),
    pick("player.raw.player.avatarPictureUrl", player?.raw?.player?.avatarPictureUrl, "headshot"),
    pick("player.raw.anyPlayer.avatarUrl", player?.raw?.anyPlayer?.avatarUrl, "headshot"),
    pick("player.raw.anyPlayer.avatarPictureUrl", player?.raw?.anyPlayer?.avatarPictureUrl, "headshot"),
    pick("player.player.pictureUrl", player?.player?.pictureUrl, "fullBody"),
    pick("player.anyPlayer.pictureUrl", player?.anyPlayer?.pictureUrl, "fullBody"),
    pick("player.pictureUrl", player?.pictureUrl, "fullBody"),
    pick("card.player.avatarUrl", card?.player?.avatarUrl, "headshot"),
    pick("card.player.avatarPictureUrl", card?.player?.avatarPictureUrl, "headshot"),
    pick("card.anyPlayer.avatarUrl", card?.anyPlayer?.avatarUrl, "headshot"),
    pick("card.anyPlayer.avatarPictureUrl", card?.anyPlayer?.avatarPictureUrl, "headshot"),
    pick("card.player.pictureUrl", card?.player?.pictureUrl, "fullBody"),
    pick("card.anyPlayer.pictureUrl", card?.anyPlayer?.pictureUrl, "fullBody"),
    pick("card.pictureUrl", card?.pictureUrl, "fullBody"),
    pick("card.imageUrl", card?.imageUrl, "fullBody"),
    pick("offer.player.avatarUrl", offer?.player?.avatarUrl, "headshot"),
    pick("offer.player.avatarPictureUrl", offer?.player?.avatarPictureUrl, "headshot"),
    pick("offer.anyPlayer.avatarUrl", offer?.anyPlayer?.avatarUrl, "headshot"),
    pick("offer.anyPlayer.avatarPictureUrl", offer?.anyPlayer?.avatarPictureUrl, "headshot"),
    pick("offer.player.pictureUrl", offer?.player?.pictureUrl, "fullBody"),
    pick("offer.anyPlayer.pictureUrl", offer?.anyPlayer?.pictureUrl, "fullBody"),
    pick("offer.pictureUrl", offer?.pictureUrl, "fullBody"),
    pick("offer.imageUrl", offer?.imageUrl, "fullBody"),
  ].filter(Boolean) as { uri: string; source: string; kind: "headshot" | "fullBody" }[];
  const selected = candidates[0] || { uri: null, source: "placeholder", kind: "headshot" as const };
  if (typeof __DEV__ !== "undefined" && __DEV__) {
    const slug = text(player?.slug || player?.playerSlug || card?.playerSlug || offer?.playerSlug || player?.player?.slug || player?.anyPlayer?.slug, "unknown");
    if (!XS_RECRUTER_HEADSHOT_LOGGED_V1.has(slug)) {
      XS_RECRUTER_HEADSHOT_LOGGED_V1.add(slug);
      console.log("[XS_RECRUTER_HEADSHOT_IMAGE_PRIORITY_V1]", {
        slug,
        name: text(player?.displayName || player?.playerName || card?.playerName || offer?.playerName),
        selectedSource: selected.source,
        selectedKind: selected.kind,
        fields: candidates.map((candidate) => ({ source: candidate.source, kind: candidate.kind, hasValue: true })),
      });
    }
  }
  return selected;
}

function getRecruterSaleCardImageV1(item: any, fallbackPlayer?: any) {
  const pick = (source: string, value: unknown) => {
    const uri = text(value);
    return uri ? { uri, source, kind: "fullBody" as const } : null;
  };
  const raw = item?.raw || item?.offerData || {};
  const saleCandidates = [
    pick("item.cardPictureUrl", item?.cardPictureUrl),
    pick("item.cardImageUrl", item?.cardImageUrl),
    pick("item.imageUrl", item?.imageUrl),
    pick("item.pictureUrl", item?.pictureUrl),
    pick("item.card.pictureUrl", item?.card?.pictureUrl),
    pick("item.token.pictureUrl", item?.token?.pictureUrl),
    pick("item.assetUrl", item?.assetUrl),
    pick("raw.pictureUrl", raw?.pictureUrl),
    pick("raw.card.pictureUrl", raw?.card?.pictureUrl),
    pick("raw.token.pictureUrl", raw?.token?.pictureUrl),
    pick("raw.assetUrl", raw?.assetUrl),
    pick("raw.senderSide.anyCards[0].pictureUrl", raw?.senderSide?.anyCards?.[0]?.pictureUrl),
    pick("raw.senderSide.anyCards[0].card.pictureUrl", raw?.senderSide?.anyCards?.[0]?.card?.pictureUrl),
    pick("raw.senderSide.anyCards[0].token.pictureUrl", raw?.senderSide?.anyCards?.[0]?.token?.pictureUrl),
  ].filter(Boolean) as { uri: string; source: string; kind: "fullBody" }[];
  const selected = saleCandidates[0];
  if (selected) {
    if (typeof __DEV__ !== "undefined" && __DEV__) {
      console.log("[XS_RECRUTER_SALE_CARD_IMAGE_V1]", {
        cardSlug: text(item?.cardSlug || item?.cardId || item?.id),
        selectedSource: selected.source,
        hasCardImage: true,
      });
    }
    return selected;
  }
  const fallback = getRecruterPlayerImageV1(fallbackPlayer, item, item);
  if (typeof __DEV__ !== "undefined" && __DEV__) {
    console.log("[XS_RECRUTER_SALE_CARD_IMAGE_V1]", {
      cardSlug: text(item?.cardSlug || item?.cardId || item?.id),
      selectedSource: fallback.source,
      hasCardImage: false,
    });
  }
  return fallback;
}

function RecruterFaceImageV1({
  uri,
  size,
  radius,
  variant = "detail",
  imageKind = "fullBody",
}: {
  uri?: string | null;
  size: { width: number; height: number };
  radius: number;
  variant?: "detail" | "card";
  imageKind?: "headshot" | "fullBody";
}) {
  if (typeof __DEV__ !== "undefined" && __DEV__ && uri) {
    console.log("[XS_RECRUTER_PLAYER_IMAGE_CONTAIN_V1]", { variant, imageKind, uri });
  }
  return (
    <View style={{ width: size.width, height: size.height, borderRadius: radius, overflow: "hidden", backgroundColor: "#050509", alignItems: "center", justifyContent: "center" }}>
      <Image
        source={{ uri: uri || XS_RECRUTER_PLAYER_PLACEHOLDER_V1 }}
        resizeMode="contain"
        style={{ width: size.width, height: size.height }}
      />
      <LinearGradient colors={["transparent", "rgba(5,7,12,0.66)"]} style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: variant === "detail" ? 58 : 34 }} />
    </View>
  );
}

function averageBoxV1(label: string, value: number | null) {
  const color = scoreToneV1(value);
  return (
    <View
      key={label}
      style={{
        flex: 1,
        minWidth: 0,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: `${color}66`,
        backgroundColor: "#10141b",
        paddingHorizontal: 10,
        paddingVertical: 9,
        gap: 4,
      }}
    >
      <Text numberOfLines={1} style={{ color: "#94A3B8", fontSize: 10, fontWeight: "900" }}>{label}</Text>
      <Text numberOfLines={1} style={{ color, fontSize: 22, fontWeight: "900" }}>{value == null ? "—" : Math.round(value)}</Text>
    </View>
  );
}

export default function RecruterPlayerCardsScreen() {
  const router = useRouter();
  const routeParams = useLocalSearchParams<{ slug?: string; position?: string }>();
  const { slug } = routeParams;
  const playerSlug = String(slug || "").trim().toLowerCase();

  const [items, setItems] = useState<RecruterOffer[]>([]);
  const [player, setPlayer] = useState<RecruterPlayer | null>(null);
  const [lightPlayer, setLightPlayer] = useState<RecruterPlayerLightV1["player"] | null>(null);
  const [saleStatus, setSaleStatus] = useState<string | null>(null);
  const [coachPerf, setCoachPerf] = useState<PublicPlayerPerformance | null>(null);
  const [coachHistory, setCoachHistory] = useState<RecruterHistoryPayloadV1 | null>(null);
  const [coachMatchContext, setCoachMatchContext] = useState<RecruterCoachContextV1 | null>(null);
  const [coachPlayerStatus, setCoachPlayerStatus] = useState<RecruterPlayerStatusV1 | null>(null);
  const [positionFallbacks, setPositionFallbacks] = useState<{ indexPlayer?: any | null; dbPlayer?: any | null; attempted?: boolean }>({});
  const [activeDetailTab, setActiveDetailTab] = useState<"Analyse" | "Stats" | "Historique" | "Similaire">("Analyse");
  const [selectedStatsRange, setSelectedStatsRange] = useState<RecruterStatsRangeV1>(10);
  const [statsAllLoading, setStatsAllLoading] = useState(false);
  const [coachLoading, setCoachLoading] = useState(false);
  const [coachError, setCoachError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const statsAllLoadedBySlugRef = React.useRef<Record<string, boolean>>({});

  const load = useCallback(async () => {
    if (!playerSlug) {
      setError("Slug joueur manquant.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setPositionFallbacks({});
      const [cardsRes, lightRes] = await Promise.allSettled([
        recruterPlayerCards(playerSlug, { first: 20 }),
        apiFetch<RecruterPlayerLightV1>(`/recruter/player/${encodeURIComponent(playerSlug)}/light`),
      ]);
      if (cardsRes.status === "rejected") throw cardsRes.reason;
      const res = cardsRes.value;
      const light = lightRes.status === "fulfilled" ? lightRes.value?.player || null : null;
      const saleItems = Array.isArray(res?.items)
        ? res.items
        : (Array.isArray((res as any)?.cards) ? (res as any).cards : (Array.isArray((res as any)?.offers) ? (res as any).offers : []));
      if (typeof __DEV__ !== "undefined" && __DEV__) {
        console.log("[XS_RECRUTER_PLAYER_SALES_RENDER_FIX_V1]", {
          slug: playerSlug,
          keys: Object.keys(res || {}),
          itemsLen: Array.isArray(res?.items) ? res.items.length : null,
          cardsLen: Array.isArray((res as any)?.cards) ? (res as any).cards.length : null,
          offersLen: Array.isArray((res as any)?.offers) ? (res as any).offers.length : null,
          saleItemsLen: saleItems.length,
        });
      }
      setItems(saleItems);
      setLightPlayer(light);
      setPlayer({ ...((res.player as RecruterPlayer | null) || {}), ...(light || {}) } as RecruterPlayer);
      setSaleStatus(res.saleStatus || null);
    } catch (e: any) {
      setError(e?.message || "Erreur chargement cartes");
    } finally {
      setLoading(false);
    }
  }, [playerSlug]);

  useEffect(() => {
    load();
  }, [load]);

  const loadCoach = useCallback(async () => {
    if (!playerSlug || loading) return;
    try {
      setCoachLoading(true);
      setCoachError(null);
      const teamName = text(player?.clubName || player?.activeClub?.name || items[0]?.clubName);
      const statusPath = `/player/status/${encodeURIComponent(playerSlug)}${teamName ? `?teamName=${encodeURIComponent(teamName)}` : ""}`;
      const [perfRes, historyRes, matchRes, statusRes] = await Promise.allSettled([
        publicPlayerPerformance(playerSlug, { limit: XS_RECRUTER_HISTORY_INITIAL_LIMIT_V1 }),
        fetchRecruterHistoryForCoachV1(playerSlug),
        apiFetch<RecruterCoachContextV1>(`/player/next-match-context/${encodeURIComponent(playerSlug)}`),
        apiFetch<RecruterPlayerStatusV1>(statusPath),
      ]);

      if (perfRes.status === "fulfilled") setCoachPerf(perfRes.value);
      if (historyRes.status === "fulfilled") setCoachHistory(historyRes.value);
      if (matchRes.status === "fulfilled") setCoachMatchContext(matchRes.value);
      if (statusRes.status === "fulfilled") setCoachPlayerStatus(statusRes.value);
      if (perfRes.status === "rejected" && historyRes.status === "rejected" && matchRes.status === "rejected" && statusRes.status === "rejected") {
        setCoachError("Analyse coach indisponible pour ce joueur.");
      }
    } catch (e: any) {
      setCoachError(e?.message || "Analyse coach indisponible.");
    } finally {
      setCoachLoading(false);
    }
  }, [items, loading, player, playerSlug]);

  useEffect(() => {
    if (!playerSlug || loading) return;
    if (positionFallbacks.attempted || positionFallbacks.indexPlayer || positionFallbacks.dbPlayer) return;
    const current = getRecruterPlayerPositionV1(player, items, items, routeParams, positionFallbacks);
    if (current.position) return;
    let alive = true;
    // XS_RECRUTER_POSITION_FALLBACK_SOURCES_V1: only query fallback sources when cards/offers do not expose a usable position.
    Promise.allSettled([
      apiFetch<any>(`/recruter/players?q=${encodeURIComponent(playerSlug)}&first=5`),
      apiFetch<any>(`/recruter/players-db?q=${encodeURIComponent(playerSlug)}&limit=5`),
    ]).then(([indexRes, dbRes]) => {
      if (!alive) return;
      const indexPlayer = indexRes.status === "fulfilled" ? pickRecruterPositionFallbackPlayerV1(indexRes.value, playerSlug) : null;
      const dbPlayer = dbRes.status === "fulfilled" ? pickRecruterPositionFallbackPlayerV1(dbRes.value, playerSlug) : null;
      setPositionFallbacks({ indexPlayer, dbPlayer, attempted: true });
      if (typeof __DEV__ !== "undefined" && __DEV__) {
        console.log("[XS_RECRUTER_POSITION_FALLBACK_SOURCES_V1]", {
          slug: playerSlug,
          indexSlug: indexPlayer?.slug || indexPlayer?.playerSlug || null,
          indexPosition: indexPlayer?.position || null,
          dbSlug: dbPlayer?.slug || dbPlayer?.playerSlug || null,
          dbPosition: dbPlayer?.position || null,
        });
      }
    }).catch(() => {
      if (alive) setPositionFallbacks({ indexPlayer: null, dbPlayer: null, attempted: true });
    });
    return () => {
      alive = false;
    };
  }, [items, loading, player, playerSlug, positionFallbacks, routeParams]);

  useEffect(() => {
    loadCoach();
  }, [loadCoach]);

  useEffect(() => {
    if (selectedStatsRange !== 40) return;
    if (!playerSlug || statsAllLoading) return;
    const currentCount = Array.isArray(coachHistory?.items) ? coachHistory.items.length : 0;
    if (currentCount >= XS_RECRUTER_HISTORY_ALL_LIMIT_V1) return;
    if (statsAllLoadedBySlugRef.current[playerSlug]) return;

    let alive = true;
    statsAllLoadedBySlugRef.current[playerSlug] = true;
    setStatsAllLoading(true);

    apiFetch<RecruterHistoryPayloadV1>(
      `/history/player-chart/${encodeURIComponent(playerSlug)}?limit=${XS_RECRUTER_HISTORY_ALL_LIMIT_V1}`
    )
      .then((payload) => {
        if (!alive) return;
        const normalized = normalizeRecruterHistoryPayloadV1(payload);
        const nextCount = Array.isArray(normalized.items) ? normalized.items.length : 0;
        if (nextCount > currentCount) {
          setCoachHistory(normalized);
        }
        if (typeof __DEV__ !== "undefined" && __DEV__) {
          console.log("[XS_ALL_EXTENSIBLE_HISTORY_V1] recruter_all_fetch_success", {
            slug: playerSlug,
            count: nextCount,
          });
        }
      })
      .catch((err: any) => {
        statsAllLoadedBySlugRef.current[playerSlug] = false;
        if (typeof __DEV__ !== "undefined" && __DEV__) {
          console.log("[XS_ALL_EXTENSIBLE_HISTORY_V1] recruter_all_fetch_error", {
            slug: playerSlug,
            error: String(err?.message || err),
          });
        }
      })
      .finally(() => {
        if (alive) setStatsAllLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [coachHistory, playerSlug, selectedStatsRange, statsAllLoading]);

  const header = useMemo(() => {
    const first = items[0] || null;
    const positionInfo = getRecruterPlayerPositionV1(player, items, items, routeParams, positionFallbacks);
    const prices = items
      .map((card) => card?.price?.eur)
      .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
    const minEur = prices.length ? Math.min(...prices) : null;
    const status = saleStatus === "none_seen" || items.length === 0
      ? "no_sale"
      : recruterSaleStatus(player || { saleStatus, salesCount: items.length, cardsCount: items.length, hasSale: items.length > 0 });
    const image = getRecruterPlayerImageV1(lightPlayer || player, first, first);

    return {
      playerName: text(lightPlayer?.displayName || player?.displayName || player?.playerName || first?.playerName || coachPerf?.playerName || coachHistory?.playerName, playerSlug || "Joueur"),
      clubName: text(lightPlayer?.activeClub?.name || player?.clubName || first?.clubName || player?.activeClub?.name || coachPerf?.activeClub?.name || coachHistory?.activeClub?.name, "Club inconnu"),
      position: positionInfo.position || "Position inconnue",
      positionRawCandidates: positionInfo.rawCandidates,
      positionSourceUsed: positionInfo.sourceUsed,
      positionConflicts: positionInfo.conflicts,
      leagueName: text(player?.leagueName || first?.leagueName, "Ligue inconnue"),
      pictureUrl: image.uri,
      pictureKind: image.kind,
      pictureSource: image.source,
      minEur,
      status,
    };
  }, [coachHistory, coachPerf, items, lightPlayer, player, playerSlug, positionFallbacks, routeParams, saleStatus]);

  const coachRadar = useMemo(
    () => buildRecruterCoachRadarV1({
      perf: coachPerf,
      historyItems: Array.isArray(coachHistory?.items) ? coachHistory.items : [],
      historyAverages: coachHistory?.averages || null,
      matchContext: coachMatchContext,
      playerStatus: coachPlayerStatus,
      fallbackPosition: header.position,
    }),
    [coachHistory, coachMatchContext, coachPerf, coachPlayerStatus, header.position]
  );
  const recruterOfficialScore = typeof coachRadar.l5 === "number" && Number.isFinite(coachRadar.l5)
    ? Math.round(coachRadar.l5)
    : null; // XS_FRONT_PERFORMANCE_PARITY_PROBE_V1
  if (typeof __DEV__ !== "undefined" && __DEV__) {
    console.log("[XS_FRONT_PERFORMANCE_PARITY_PROBE_V1]", {
      screen: "recruter-detail",
      slug: playerSlug,
      displayedScore: recruterOfficialScore,
      displayedL5: coachRadar.l5,
      displayedL10: (coachRadar as any).l10,
      displayedL15: coachRadar.l15,
      displayedL40: coachRadar.l40,
      coachCompositeOverall: coachRadar.overall,
      sourceFields: {
        scoreShown: "coachRadar.l5",
        coachCompositeKeptForDecision: true,
      },
      backendAverages: coachHistory?.averages || (coachPerf as any)?.averages || null,
    });
  }

  const statsGraph = useMemo(() => {
    const rows = Array.isArray(coachHistory?.items) ? coachHistory.items : [];
    const wanted = selectedStatsRange === 40 ? Math.max(40, rows.length) : selectedStatsRange;
    const scoredRows = rows
      .map((row) => ({ row, score: xsRecruterHistoryScoreV1(row) }))
      .filter((item): item is { row: any; score: number } => item.score != null)
      .slice(0, wanted);
    return {
      scores: scoredRows.map((item) => item.score),
      opponentShort: scoredRows.map((item) => xsRecruterHistoryOpponentShortV1(item.row)),
      opponentLogoUrls: scoredRows.map((item) => xsRecruterHistoryOpponentLogoV1(item.row)),
      partial: scoredRows.length > 0 && scoredRows.length < wanted,
      range: wanted,
    };
  }, [coachHistory, selectedStatsRange]);

  useEffect(() => {
    if (typeof __DEV__ !== "undefined" && __DEV__ && coachRadar.hasPerformanceData) {
      // XS_RECRUTER_POSITION_TRUST_FIX_V1: only exact player slug sources can drive GK/DEF/MID/FW.
      console.log("[XS_RECRUTER_POSITION_TRUST_FIX_V1]", {
        slug: playerSlug,
        detectedPosition: header.position === "Position inconnue" ? null : header.position,
        sourceUsed: (header as any).positionSourceUsed,
        rawCandidates: (header as any).positionRawCandidates,
        conflicts: (header as any).positionConflicts,
      });
      console.log("[XS_RECRUTER_DECISION_BY_POSITION_FULL_V1]", {
        slug: playerSlug,
        detectedPosition: coachRadar.positionUsed,
        rawCandidates: (header as any).positionRawCandidates,
        axesLabels: (coachRadar.values || []).map((item: any) => item.label),
      });
    }
  }, [coachRadar.hasPerformanceData, coachRadar.positionUsed, coachRadar.values, header, playerSlug]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#070A10" }}>
      <LinearGradient colors={["#090D14", "#070A10", "#13080E"]} style={{ flex: 1 }}>
        <View style={{ paddingHorizontal: 14, paddingTop: 10, paddingBottom: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <TouchableOpacity onPress={() => router.back()} style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: "#101722", borderWidth: 1, borderColor: "#273142", alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="arrow-back" size={24} color="#F8FAFC" />
          </TouchableOpacity>
          <Text style={{ color: "#F8FAFC", fontSize: 18, fontWeight: "900" }}>Détails joueur</Text>
          <TouchableOpacity style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: "#101722", borderWidth: 1, borderColor: "#273142", alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="share-social-outline" size={21} color="#F8FAFC" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator color="#ff5d73" />
          </View>
        ) : error ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 18 }}>
            <Text style={{ color: "#ff9aa8", textAlign: "center", marginBottom: 12 }}>{error}</Text>
            <TouchableOpacity onPress={load} style={{ backgroundColor: "#D51F3C", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 }}>
              <Text style={{ color: "white", fontWeight: "900" }}>Réessayer</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item, index) => String(item.cardId || item.cardSlug || item.offerId || index)}
            contentContainerStyle={{ padding: 14, paddingBottom: 30, flexGrow: 1 }}
            ListHeaderComponent={
              <View style={{ gap: 14, marginBottom: 14 }}>
                <LinearGradient colors={["#141B27", "#0D121A"]} style={{ borderRadius: 17, borderWidth: 1, borderColor: "#2B3444", padding: 10 }}>
                  <View style={{ flexDirection: "row", gap: 13 }}>
                    <RecruterFaceImageV1 uri={header.pictureUrl} size={{ width: 132, height: 172 }} radius={13} variant="detail" imageKind={header.pictureKind} />
                    <View style={{ flex: 1, paddingVertical: 8, gap: 7 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                        <Text style={{ color: "#fff", fontSize: 22, fontWeight: "900", flex: 1 }} numberOfLines={2}>{header.playerName}</Text>
                        <Ionicons name="heart-outline" size={26} color="#F43F5E" />
                      </View>
                      <Text style={{ color: "#B8BEC8" }} numberOfLines={1}>{header.clubName} · {header.leagueName}</Text>
                      <Text style={{ color: "#A4ABB6" }} numberOfLines={1}>{header.position} · {(player as any)?.age != null ? `${(player as any).age} ans` : "Âge —"}</Text>
                      {typeof __DEV__ !== "undefined" && __DEV__ ? (
                        <Text style={{ color: "#6f7782", fontSize: 11 }} numberOfLines={1}>Position détectée: {header.position === "Position inconnue" ? "GEN" : header.position} · Source: {(header as any).positionSourceUsed || "none"}</Text>
                      ) : null}
                      <View style={{ height: 1, backgroundColor: "#273142", marginVertical: 5 }} />
                      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                        <View>
                          <Text style={{ color: scoreToneV1(recruterOfficialScore), fontSize: 34, fontWeight: "900" }}>{recruterOfficialScore == null ? "—" : recruterOfficialScore}</Text>
                          <Text style={{ color: "#A4ABB6", fontSize: 12 }}>L5 officiel</Text>
                        </View>
                        <View style={{ alignItems: "flex-end" }}>
                          <Text style={{ color: "#F8FAFC", fontWeight: "900" }}>Potentiel</Text>
                          <Text style={{ color: "#C6CDD7" }}>—</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </LinearGradient>

                <View style={{ flexDirection: "row", backgroundColor: "#101722", borderRadius: 14, borderWidth: 1, borderColor: "#1E2634", padding: 4 }}>
                  {["Analyse", "Stats", "Historique", "Similaire"].map((tab) => (
                    <TouchableOpacity key={tab} onPress={() => setActiveDetailTab(tab as typeof activeDetailTab)} style={{ flex: 1, borderRadius: 11, paddingVertical: 10, alignItems: "center", backgroundColor: tab === activeDetailTab ? "#171D29" : "transparent", borderBottomWidth: tab === activeDetailTab ? 2 : 0, borderBottomColor: "#F43F5E" }}>
                      <Text style={{ color: tab === activeDetailTab ? "#F8FAFC" : "#9AA3AF", fontWeight: "800" }}>{tab}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {coachLoading && !coachPerf ? (
                  <View style={{ padding: 14, borderRadius: 14, backgroundColor: "#101722", borderWidth: 1, borderColor: "#273142" }}>
                    <ActivityIndicator color="#72e6a2" />
                    <Text style={{ color: "#9ba1a6", textAlign: "center", marginTop: 8, fontWeight: "800" }}>Analyse coach en cours...</Text>
                  </View>
                ) : null}
                {coachError ? <Text style={{ color: "#ff9aa8", fontWeight: "800" }}>{coachError}</Text> : null}

                {coachRadar.hasPerformanceData && activeDetailTab === "Analyse" ? (
                  <LinearGradient colors={["#101722", "#0C1119"]} style={{ borderRadius: 17, borderWidth: 1, borderColor: "#263143", padding: 16, gap: 14 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: "#F8FAFC", fontSize: 18, fontWeight: "900" }}>Analyse Décision Coach</Text>
                        <Text style={{ color: "#A4ABB6", marginTop: 4 }}>{coachRadar.decisionV2?.summary || "Analyse basée sur ses performances et le contexte"}</Text>
                      </View>
                      <View style={{ backgroundColor: header.status === "for_sale" ? "#102219" : "#241A0B", borderColor: header.status === "for_sale" ? "#245B39" : "#5A3F16", borderWidth: 1, borderRadius: 9, paddingHorizontal: 10, paddingVertical: 6 }}>
                        <Text style={{ color: header.status === "for_sale" ? "#72E6A2" : "#FFD18A", fontWeight: "900", fontSize: 12 }}>{header.status === "for_sale" ? "En vente" : "Vente à vérifier"}</Text>
                      </View>
                    </View>
                    <View style={{ borderRadius: 14, backgroundColor: "#121A27", borderWidth: 1, borderColor: "#273142", padding: 13, gap: 6 }}>
                      <Text style={{ color: scoreToneV1(coachRadar.overall), fontSize: 26, fontWeight: "900" }}>{coachRadar.decisionV2?.finalLabel || coachRadar.coachDecision?.decision || "Décision prudente"}</Text>
                      <Text style={{ color: "#C6CDD7", lineHeight: 19 }}>{coachRadar.decisionV2?.deepAnalysis?.mainReason?.text || coachRadar.coachDecision?.reason || "Décision basée sur les signaux disponibles."}</Text>
                    </View>
                    <View style={{ gap: 10 }}>
                      {(coachRadar.decisionV2?.whyItems || []).slice(0, 2).map((item: any, index: number) => (
                        <Text key={`why-${index}`} style={{ color: "#A7F3D0", fontWeight: "800" }}>+ {item.title}</Text>
                      ))}
                      {(coachRadar.decisionV2?.riskItems || []).slice(0, 2).map((item: any, index: number) => (
                        <Text key={`risk-${index}`} style={{ color: "#FCD34D", fontWeight: "800" }}>! {item.title}</Text>
                      ))}
                    </View>
                    <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
                      <TouchableOpacity style={{ flex: 1, borderRadius: 13, paddingVertical: 14, backgroundColor: "#141B27", borderWidth: 1, borderColor: "#2B3444", flexDirection: "row", justifyContent: "center", gap: 8 }}>
                        <Ionicons name="options-outline" size={19} color="#F8FAFC" />
                        <Text style={{ color: "#F8FAFC", fontWeight: "900" }}>Comparer</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={{ flex: 1, borderRadius: 13, paddingVertical: 14, backgroundColor: "#D51F3C", flexDirection: "row", justifyContent: "center", gap: 8 }}>
                        <Ionicons name="notifications-outline" size={19} color="#FFFFFF" />
                        <Text style={{ color: "#FFFFFF", fontWeight: "900" }}>Surveiller</Text>
                      </TouchableOpacity>
                    </View>
                  </LinearGradient>
                ) : coachRadar.hasPerformanceData && activeDetailTab === "Stats" ? (
                  <LinearGradient colors={["#101722", "#0C1119"]} style={{ borderRadius: 17, borderWidth: 1, borderColor: "#263143", padding: 16, gap: 14 }}>
                    <View>
                      <Text style={{ color: "#F8FAFC", fontSize: 18, fontWeight: "900" }}>Performances match par match</Text>
                      <Text style={{ color: "#A4ABB6", marginTop: 4 }}>{statsAllLoading ? "Chargement de l'historique All..." : (statsGraph.partial ? "Historique partiel" : "Historique récent")} · scores Sorare disponibles</Text>
                    </View>
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      {averageBoxV1("L5", coachRadar.l5)}
                      {averageBoxV1("L10", (coachRadar as any).l10 ?? null)}
                      {averageBoxV1("All", coachRadar.l40)}
                    </View>
                    <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                      {([5, 10, 40] as RecruterStatsRangeV1[]).map((range) => {
                        const active = selectedStatsRange === range;
                        return (
                          <TouchableOpacity
                            key={`stats-range-${range}`}
                            onPress={() => setSelectedStatsRange(range)}
                            activeOpacity={0.86}
                            style={{
                              borderRadius: 999,
                              paddingHorizontal: 14,
                              paddingVertical: 8,
                              backgroundColor: active ? "#D51F3C" : "#121A27",
                              borderWidth: 1,
                              borderColor: active ? "#FF6B82" : "#273142",
                            }}
                          >
                            <Text style={{ color: active ? "#FFFFFF" : "#C6CDD7", fontWeight: "900" }}>{range === 40 ? "All" : `L${range}`}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                    {statsGraph.scores.length ? (
                      <ScrollView horizontal showsHorizontalScrollIndicator nestedScrollEnabled contentContainerStyle={{ paddingRight: 16 }}>
                        <View style={{ width: Math.max(360, statsGraph.scores.length * 58) }}>
                          <SorarePerformanceChart
                            recentScores={statsGraph.scores}
                            opponentLogoUrls={statsGraph.opponentLogoUrls}
                            opponentShort={statsGraph.opponentShort}
                          />
                        </View>
                      </ScrollView>
                    ) : (
                      <View style={{ padding: 13, borderRadius: 13, backgroundColor: "#121A27", borderWidth: 1, borderColor: "#273142" }}>
                        <Text style={{ color: "#F8FAFC", fontWeight: "900" }}>Aucun historique disponible pour ce joueur.</Text>
                        <Text style={{ color: "#9BA1A6", marginTop: 6 }}>Le graphique apparaîtra dès que Sorare fournit des scores exploitables.</Text>
                      </View>
                    )}
                    <View>
                      <Text style={{ color: "#F8FAFC", fontSize: 18, fontWeight: "900" }}>Radar FIFA</Text>
                      <Text style={{ color: "#A4ABB6", marginTop: 4 }}>Profil {coachRadar.positionUsed} · métriques joueur</Text>
                    </View>
                    <View style={{ gap: 13 }}>
                      {(coachRadar.values || []).map((metric: any, index: number) => (
                        <PremiumMetricBarV1 key={`${metric.label}-${index}`} label={metric.label} value={num(metric.value)} />
                      ))}
                    </View>
                  </LinearGradient>
                ) : coachRadar.hasPerformanceData ? (
                  <View style={{ padding: 14, borderRadius: 14, backgroundColor: "#101722", borderWidth: 1, borderColor: "#273142" }}>
                    <Text style={{ color: "#F8FAFC", fontSize: 15, fontWeight: "900" }}>{activeDetailTab} arrive bientôt.</Text>
                    <Text style={{ color: "#9BA1A6", marginTop: 6, lineHeight: 18 }}>Les données principales restent disponibles dans Analyse et Stats.</Text>
                  </View>
                ) : (
                  <View style={{ padding: 14, borderRadius: 14, backgroundColor: "#101722", borderWidth: 1, borderColor: "#273142" }}>
                    <Text style={{ color: "#F8FAFC", fontSize: 15, fontWeight: "900" }}>Performances non disponibles pour ce joueur.</Text>
                    <Text style={{ color: "#9BA1A6", marginTop: 6, lineHeight: 18 }}>La Décision Coach apparaîtra dès que l'historique L5/L15/L40 sera disponible.</Text>
                  </View>
                )}

                <Text style={{ color: "#F8FAFC", fontSize: 19, fontWeight: "900" }}>Cartes en vente</Text>
              </View>
            }
            ListEmptyComponent={
              <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 40 }}>
                <Text style={{ color: "#ff9aa8", fontWeight: "900", fontSize: 16, textAlign: "center" }}>Aucune carte en vente actuellement</Text>
                <Text style={{ color: "#9ba1a6", textAlign: "center", marginTop: 8 }}>Le profil vient de l'index joueurs. Les ventes seront revérifiées au prochain clic ou à la prochaine mise à jour marché.</Text>
              </View>
            }
            renderItem={({ item }) => {
              const seller = text(item?.seller?.nickname || item?.seller?.slug);
              const image = getRecruterSaleCardImageV1(item, lightPlayer || player);
              return (
                <View style={{ flexDirection: "row", gap: 12, padding: 12, marginBottom: 12, borderRadius: 15, backgroundColor: "#101722", borderWidth: 1, borderColor: "#2B3444" }}>
                  <RecruterFaceImageV1 uri={image.uri} size={{ width: 76, height: 102 }} radius={10} variant="card" imageKind={image.kind} />
                  <View style={{ flex: 1, justifyContent: "center", gap: 5 }}>
                    <Text style={{ color: "white", fontWeight: "900" }} numberOfLines={1}>{text(item.playerName, header.playerName)}</Text>
                    <Text style={{ color: "#72e6a2", fontWeight: "900" }}>{priceLabel(item)}</Text>
                    <Text style={{ color: "#c9d1d9" }} numberOfLines={1}>{rarityLabel(item)} · Saison {seasonLabel(item)}</Text>
                    <Text style={{ color: "#9ba1a6" }} numberOfLines={1}>{text(item.clubName, header.clubName)} · {text(item.position, header.position)}</Text>
                    <Text style={{ color: "#8b949e" }} numberOfLines={1}>{seller ? `Vendeur ${seller}` : text(item.leagueName, header.leagueName)}</Text>
                  </View>
                </View>
              );
            }}
          />
        )}
      </LinearGradient>
    </SafeAreaView>
  );
}

