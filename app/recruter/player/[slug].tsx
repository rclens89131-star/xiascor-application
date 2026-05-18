import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Image, SafeAreaView, Text, TouchableOpacity, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { apiFetch } from "../../../src/api";
import FifaRadarChart from "../../../src/components/FifaRadarChart";
import { publicPlayerPerformance, recruterPlayerCards, recruterSaleStatus, type PublicPlayerPerformance, type RecruterOffer, type RecruterPlayer } from "../../../src/scoutApi";

// XS_FRONT_RECRUTER_PLAYERS_INDEX_V1
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

function normalizePositionV1(value: unknown) {
  const raw = String(value || "").trim().toUpperCase();
  if (/GK|GOAL/.test(raw)) return "GK";
  if (/DEF|DF|BACK/.test(raw)) return "DEF";
  if (/MID|MD|MIL/.test(raw)) return "MID";
  if (/FW|FWD|ATT|FORWARD|ST/.test(raw)) return "FW";
  return raw || "GEN";
}

function scoreFromRowV1(row: any) {
  return num(row?.scoreSorare ?? row?.score ?? row?.totalScore ?? row?.so5Score, NaN);
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
  const score = clamp(overallBase + difficultyBonusV1(params.matchContext) + (trend === "up" ? 4 : trend === "down" ? -4 : 0) + (ceiling >= 80 ? 4 : ceiling >= 70 ? 2 : 0) - (volatility === "high" ? 8 : volatility === "medium" ? 3 : 0) - statusPenaltyV1(params.playerStatus));
  const position = normalizePositionV1((params.perf as any)?.position || params.fallbackPosition);
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
    params.matchContext?.difficulty === "easy" ? "Contexte favorable" : null,
    ceiling >= 75 ? "Plafond intéressant" : null,
  ].filter(Boolean) as string[];
  const risks = [
    statusPenaltyV1(params.playerStatus) >= 45 ? "Indisponibilité joueur" : null,
    volatility === "high" ? "Scores très irréguliers" : null,
    confidence < 50 ? "Confiance limitée" : null,
    params.matchContext?.difficulty === "hard" ? "Match difficile" : null,
  ].filter(Boolean) as string[];

  return {
    values: [
      { label: "Forme", value: l5 ?? overallBase },
      { label: "Régularité", value: regularity },
      { label: "Temps de jeu", value: clamp((l40 ?? overallBase) + 8) },
      { label: position === "DEF" ? "Défense" : position === "MID" ? "Création" : position === "GK" ? "Fiabilité" : "Impact", value: l10 ?? overallBase },
      { label: "Impact", value: clamp((l5 ?? overallBase) * 0.55 + (ceiling || overallBase) * 0.45) },
      { label: "Fiabilité", value: confidence },
    ],
    overall: Math.round(score),
    confidence: confidence / 100,
    matches: scores.length,
    l5,
    l15,
    l40,
    hasPerformanceData,
    positionUsed: position,
    profile: "Profil Recruter",
    range: "L10" as const,
    coachDecision: {
      score: Math.round(score),
      decision,
      tone,
      adjustedOverall: Math.round(score),
      rawOverall: Math.round(overallBase),
      matchBonus: difficultyBonusV1(params.matchContext),
      trend,
      volatility,
      ceiling: Math.round(ceiling || 0),
      reasons: [...why, ...risks].slice(0, 4),
      reason: [...why, ...risks][0] || "Analyse basée sur les performances disponibles.",
      windowBlendLabel: "L5 40% · L10 35% · L40 25%",
    },
    decisionV2: {
      finalLabel,
      finalTone,
      playStyle: finalTone === "strongPlay" || finalTone === "play" ? "Safe pick" : finalTone === "risk" ? "Watchlist" : finalTone === "avoid" ? "Rotation risk" : "Option",
      summary: forcedAvoid
        ? "À éviter : statut joueur défavorable."
        : `${finalLabel} : ${why[0] || "données exploitables"}${risks[0] ? `, mais ${risks[0].toLowerCase()}` : "."}`,
      bullets: [...why, ...risks].slice(0, 3),
      whyItems: why.slice(0, 3).map((title) => ({ title, text: "Signal positif détecté sur les données disponibles." })),
      riskItems: (risks.length ? risks : ["Aucun signal bloquant"]).slice(0, 2).map((title) => ({ title, text: title === "Aucun signal bloquant" ? "Risque principal limité par les données actuelles." : "Point à surveiller avant achat." })),
      deepAnalysis: {
        verdict: forcedAvoid ? "À éviter : statut joueur défavorable." : `${finalLabel} avant achat.`,
        mainReason: { title: why[0] || risks[0] || "Données limitées", text: why[0] ? "Point fort principal du profil actuel." : "Analyse prudente faute de signaux complets." },
        positiveSignals: why.slice(0, 3).map((title) => ({ title, text: "Signal favorable pour le prochain match." })),
        negativeSignals: risks.slice(0, 3).map((title) => ({ title, text: "Risque à intégrer avant achat." })),
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
      percentileLabel: score >= 70 ? `Profil fort local des ${position}` : score >= 55 ? `Profil correct local des ${position}` : `Profil à surveiller local des ${position}`,
      deltaLabel: `${Math.round(score - 55) >= 0 ? "+" : ""}${Math.round(score - 55)} au-dessus moyenne`,
      tier: score >= 75 ? "elite" : score >= 65 ? "strong" : score >= 45 ? "average" : "weak",
      reason: "Comparaison locale provisoire basée sur le score coach Recruter.",
    },
  };
}

function scoreToneV1(score: number | null) {
  if (typeof score !== "number" || !Number.isFinite(score)) return "#64748B";
  if (score >= 65) return "#38BDF8";
  if (score >= 50) return "#22C55E";
  if (score >= 40) return "#FACC15";
  return "#EF4444";
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
  const { slug } = useLocalSearchParams<{ slug?: string }>();
  const playerSlug = String(slug || "").trim().toLowerCase();

  const [items, setItems] = useState<RecruterOffer[]>([]);
  const [player, setPlayer] = useState<RecruterPlayer | null>(null);
  const [saleStatus, setSaleStatus] = useState<string | null>(null);
  const [coachPerf, setCoachPerf] = useState<PublicPlayerPerformance | null>(null);
  const [coachHistory, setCoachHistory] = useState<RecruterHistoryPayloadV1 | null>(null);
  const [coachMatchContext, setCoachMatchContext] = useState<RecruterCoachContextV1 | null>(null);
  const [coachPlayerStatus, setCoachPlayerStatus] = useState<RecruterPlayerStatusV1 | null>(null);
  const [coachLoading, setCoachLoading] = useState(false);
  const [coachError, setCoachError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!playerSlug) {
      setError("Slug joueur manquant.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await recruterPlayerCards(playerSlug, { first: 20 });
      setItems(Array.isArray(res.items) ? res.items : []);
      setPlayer((res.player as RecruterPlayer | null) || null);
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
        publicPlayerPerformance(playerSlug, { limit: 40 }),
        apiFetch<RecruterHistoryPayloadV1>(`/history/player-chart/${encodeURIComponent(playerSlug)}?limit=40`),
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
    loadCoach();
  }, [loadCoach]);

  const header = useMemo(() => {
    const first = items[0] || null;
    const prices = items
      .map((card) => card?.price?.eur)
      .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
    const minEur = prices.length ? Math.min(...prices) : null;
    const status = saleStatus === "none_seen" || items.length === 0
      ? "no_sale"
      : recruterSaleStatus(player || { saleStatus, salesCount: items.length, cardsCount: items.length, hasSale: items.length > 0 });

    return {
      playerName: text(player?.displayName || player?.playerName || first?.playerName || coachPerf?.playerName || coachHistory?.playerName, playerSlug || "Joueur"),
      clubName: text(player?.clubName || first?.clubName || player?.activeClub?.name || coachPerf?.activeClub?.name || coachHistory?.activeClub?.name, "Club inconnu"),
      position: text(player?.position || first?.position || coachPerf?.position || coachHistory?.position, "N/A"),
      leagueName: text(player?.leagueName || first?.leagueName, "Ligue inconnue"),
      pictureUrl: text(player?.pictureUrl || first?.pictureUrl, "https://frontend-assets.sorare.com/placeholders/player-v2.png"),
      minEur,
      status,
    };
  }, [coachHistory, coachPerf, items, player, playerSlug, saleStatus]);

  const coachRadar = useMemo(
    () => buildRecruterCoachRadarV1({
      perf: coachPerf,
      historyItems: Array.isArray(coachHistory?.items) ? coachHistory.items : [],
      historyAverages: coachHistory?.averages || null,
      matchContext: coachMatchContext,
      playerStatus: coachPlayerStatus,
      fallbackPosition: coachHistory?.position || header.position,
    }),
    [coachHistory, coachMatchContext, coachPerf, coachPlayerStatus, header.position]
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#08090d" }}>
      <View style={{ paddingHorizontal: 14, paddingTop: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "#241014", backgroundColor: "#0d0f14" }}>
        <TouchableOpacity onPress={() => router.back()} style={{ alignSelf: "flex-start", paddingVertical: 7, paddingHorizontal: 10, borderRadius: 8, backgroundColor: "#2b1117", borderWidth: 1, borderColor: "#5c1f2a" }}>
          <Text style={{ color: "#ffccd2", fontWeight: "800" }}>Retour</Text>
        </TouchableOpacity>

        <View style={{ flexDirection: "row", gap: 12, alignItems: "center", marginTop: 12 }}>
          <Image source={{ uri: header.pictureUrl }} style={{ width: 74, height: 74, borderRadius: 10, backgroundColor: "#050509" }} />
          <View style={{ flex: 1, gap: 5 }}>
            <Text style={{ color: "#fff", fontSize: 22, fontWeight: "900" }} numberOfLines={1}>
              {header.playerName}
            </Text>
            <Text style={{ color: "#b8bec8" }} numberOfLines={1}>
              {header.clubName} · {header.position} · {header.leagueName}
            </Text>
            <Text style={{ color: header.status === "for_sale" ? "#72e6a2" : "#ff5d73", fontWeight: "900" }}>
              {header.status === "for_sale"
                ? `${items.length} carte(s) en vente · Prix min ${header.minEur != null ? `€${header.minEur.toFixed(2)}` : "—"}`
                : "Aucune carte en vente actuellement"}
            </Text>
          </View>
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color="#ff5d73" />
        </View>
      ) : error ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 18 }}>
          <Text style={{ color: "#ff9aa8", textAlign: "center", marginBottom: 12 }}>{error}</Text>
          <TouchableOpacity onPress={load} style={{ backgroundColor: "#c92a3d", borderRadius: 8, paddingHorizontal: 14, paddingVertical: 9 }}>
            <Text style={{ color: "white", fontWeight: "800" }}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item, index) => String(item.cardId || item.cardSlug || item.offerId || index)}
          contentContainerStyle={{ padding: 14, paddingBottom: 30, flexGrow: 1 }}
          ListHeaderComponent={
            <View style={{ marginBottom: 14 }}>
              {coachLoading && !coachPerf ? (
                <View style={{ padding: 14, borderRadius: 14, backgroundColor: "#10141b", borderWidth: 1, borderColor: "#273244", marginBottom: 12 }}>
                  <ActivityIndicator color="#72e6a2" />
                  <Text style={{ color: "#9ba1a6", textAlign: "center", marginTop: 8, fontWeight: "800" }}>Analyse coach en cours...</Text>
                </View>
              ) : null}
              {coachError ? (
                <Text style={{ color: "#ff9aa8", marginBottom: 10, fontWeight: "800" }}>{coachError}</Text>
              ) : null}
              {coachRadar.hasPerformanceData ? (
                <>
                  <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
                    {averageBoxV1("L5", coachRadar.l5)}
                    {averageBoxV1("L15", coachRadar.l15)}
                    {averageBoxV1("L40", coachRadar.l40)}
                  </View>
                  <FifaRadarChart
                    title="Décision Coach"
                    values={coachRadar.values}
                    overall={coachRadar.overall}
                    confidence={coachRadar.confidence}
                    matches={coachRadar.matches}
                    positionUsed={coachRadar.positionUsed}
                    profile={coachRadar.profile}
                    range={coachRadar.range}
                    coachDecision={coachRadar.coachDecision as any}
                    decisionV2={coachRadar.decisionV2 as any}
                    trend={coachRadar.coachDecision.trend}
                    volatility={coachRadar.coachDecision.volatility}
                    ceiling={coachRadar.coachDecision.ceiling}
                    recommendation={coachRadar.recommendation as any}
                    matchContext={coachRadar.matchContext as any}
                    positionPercentile={coachRadar.positionPercentile as any}
                    subtitle="Analyse avant achat basée sur performances, statut et prochain match."
                  />
                </>
              ) : (
                <View style={{ padding: 14, borderRadius: 14, backgroundColor: "#10141b", borderWidth: 1, borderColor: "#273244" }}>
                  <Text style={{ color: "#F8FAFC", fontSize: 15, fontWeight: "900" }}>Performances non disponibles pour ce joueur.</Text>
                  <Text style={{ color: "#9BA1A6", marginTop: 6, lineHeight: 18 }}>
                    La Décision Coach apparaîtra dès que l'historique L5/L15/L40 sera disponible.
                  </Text>
                </View>
              )}
            </View>
          }
          ListEmptyComponent={
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60 }}>
              <Text style={{ color: "#ff9aa8", fontWeight: "900", fontSize: 16, textAlign: "center" }}>Aucune carte en vente actuellement</Text>
              <Text style={{ color: "#9ba1a6", textAlign: "center", marginTop: 8 }}>
                Le profil vient de l'index joueurs. Les ventes seront revérifiées au prochain clic ou à la prochaine mise à jour marché.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const seller = text(item?.seller?.nickname || item?.seller?.slug);
            return (
              <View style={{ flexDirection: "row", gap: 12, padding: 12, marginBottom: 12, borderRadius: 12, backgroundColor: "#12151c", borderWidth: 1, borderColor: "#2a1218" }}>
                <Image
                  source={{ uri: item.pictureUrl || "https://frontend-assets.sorare.com/placeholders/player-v2.png" }}
                  style={{ width: 76, height: 102, borderRadius: 8, backgroundColor: "#050509" }}
                />
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
    </SafeAreaView>
  );
}
