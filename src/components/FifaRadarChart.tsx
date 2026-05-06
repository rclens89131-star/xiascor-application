import React from "react";
import { View, Text } from "react-native";

type RadarValue = {
  label: string;
  value: number;
};

type RadarRange = "L5" | "L15" | "L40";
type RadarTrend = "up" | "down" | "stable";
type RadarVolatility = "stable" | "medium" | "high" | "unknown";
type RadarAutoProfile = {
  label: string;
  tone: "safe" | "upside" | "risk" | "balanced";
  reason: string;
};
type RadarConfidenceEnhanced = {
  score: number;
  label: "Faible" | "Moyen" | "Élevé";
  color: "red" | "orange" | "green";
  reason: string;
};
type RadarRecommendation = {
  label: string;
  tone: "play" | "avoid" | "watch" | "risky";
  reason: string;
};
type RadarCoachDecision = {
  score: number;
  decision: "Titulaire" | "Borderline" | "Risqué" | "À éviter";
  tone: "play" | "watch" | "risky" | "avoid";
  adjustedOverall: number;
  rawOverall: number;
  matchBonus: number;
  trend?: RadarTrend;
  volatility?: RadarVolatility;
  ceiling?: number;
  reasons: string[];
  reason: string;
  windowBlendLabel?: string;
};
type RadarDecisionV2 = {
  finalLabel: string;
  finalTone: "strongPlay" | "play" | "borderline" | "joker" | "risk" | "avoid";
  playStyle: string;
  summary: string;
  bullets: string[];
};
type RadarMatchContext = {
  opponentName: string | null;
  competition: string | null;
  homeAway: "home" | "away" | "unknown";
  matchDate: string | null;
  difficulty: "easy" | "medium" | "hard" | "unknown";
  difficultyScore: number | null;
  reason: string;
};
type RadarPositionPercentile = {
  percentileLabel: string;
  deltaLabel: string;
  tier: "elite" | "strong" | "average" | "weak";
  reason: string;
};

function clamp(v: number) {
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(100, v));
}

function colorFromValue(v: number) {
  const n = clamp(v);
  if (n >= 70) return "#38BDF8";
  if (n >= 55) return "#22C55E";
  if (n >= 40) return "#FACC15";
  return "#EF4444";
}

function autoProfileToneStyle(tone: RadarAutoProfile["tone"]) {
  if (tone === "safe") return { fg: "#22C55E", bg: "rgba(34,197,94,0.12)", border: "rgba(34,197,94,0.38)" };
  if (tone === "upside") return { fg: "#38BDF8", bg: "rgba(56,189,248,0.12)", border: "rgba(56,189,248,0.38)" };
  if (tone === "risk") return { fg: "#FB923C", bg: "rgba(251,146,60,0.13)", border: "rgba(251,146,60,0.42)" };
  return { fg: "#FACC15", bg: "rgba(250,204,21,0.10)", border: "rgba(250,204,21,0.32)" };
}

function confidenceColorStyle(color: RadarConfidenceEnhanced["color"]) {
  if (color === "green") return { fg: "#22C55E", bg: "rgba(34,197,94,0.10)", border: "rgba(34,197,94,0.34)" };
  if (color === "orange") return { fg: "#FB923C", bg: "rgba(251,146,60,0.11)", border: "rgba(251,146,60,0.36)" };
  return { fg: "#EF4444", bg: "rgba(239,68,68,0.11)", border: "rgba(239,68,68,0.36)" };
}

function recommendationToneStyle(tone: RadarRecommendation["tone"]) {
  if (tone === "play") return { fg: "#22C55E", bg: "rgba(34,197,94,0.10)", border: "rgba(34,197,94,0.34)" };
  if (tone === "avoid") return { fg: "#EF4444", bg: "rgba(239,68,68,0.11)", border: "rgba(239,68,68,0.36)" };
  if (tone === "risky") return { fg: "#FB923C", bg: "rgba(251,146,60,0.11)", border: "rgba(251,146,60,0.36)" };
  return { fg: "#FACC15", bg: "rgba(250,204,21,0.10)", border: "rgba(250,204,21,0.32)" };
}

/* XS_RADAR_DECISION_ENGINE_V1 */
function coachDecisionToneStyle(tone: RadarCoachDecision["tone"]) {
  if (tone === "play") return { fg: "#22C55E", bg: "rgba(34,197,94,0.12)", border: "rgba(34,197,94,0.40)" };
  if (tone === "avoid") return { fg: "#EF4444", bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.42)" };
  if (tone === "risky") return { fg: "#FB923C", bg: "rgba(251,146,60,0.13)", border: "rgba(251,146,60,0.42)" };
  return { fg: "#FACC15", bg: "rgba(250,204,21,0.11)", border: "rgba(250,204,21,0.36)" };
}

function coachDecisionFromScore(score: number): RadarCoachDecision["decision"] {
  const n = clamp(score);
  if (n >= 75) return "Titulaire";
  if (n >= 60) return "Borderline";
  if (n >= 45) return "Risqué";
  return "À éviter";
}

function coachToneFromScore(score: number): RadarCoachDecision["tone"] {
  const n = clamp(score);
  if (n >= 75) return "play";
  if (n >= 60) return "watch";
  if (n >= 45) return "risky";
  return "avoid";
}
/* XS_RADAR_DECISION_ENGINE_V1_END */

/* XS_RADAR_DECISION_ENGINE_V2 */
function decisionV2ToneStyle(tone: RadarDecisionV2["finalTone"]) {
  if (tone === "strongPlay" || tone === "play") return { fg: "#22C55E", bg: "rgba(34,197,94,0.13)", border: "rgba(34,197,94,0.44)" };
  if (tone === "joker") return { fg: "#38BDF8", bg: "rgba(56,189,248,0.12)", border: "rgba(56,189,248,0.42)" };
  if (tone === "avoid") return { fg: "#EF4444", bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.42)" };
  if (tone === "risk") return { fg: "#FB923C", bg: "rgba(251,146,60,0.13)", border: "rgba(251,146,60,0.42)" };
  return { fg: "#FACC15", bg: "rgba(250,204,21,0.11)", border: "rgba(250,204,21,0.36)" };
}

function decisionV2RecommendationTone(tone: RadarDecisionV2["finalTone"]): RadarRecommendation["tone"] {
  if (tone === "strongPlay" || tone === "play" || tone === "joker") return "play";
  if (tone === "avoid") return "avoid";
  if (tone === "risk") return "risky";
  return "watch";
}
/* XS_RADAR_DECISION_ENGINE_V2_END */

function matchDifficultyToneStyle(difficulty: RadarMatchContext["difficulty"]) {
  if (difficulty === "easy") return { fg: "#22C55E", bg: "rgba(34,197,94,0.10)", border: "rgba(34,197,94,0.34)" };
  if (difficulty === "hard") return { fg: "#FB923C", bg: "rgba(251,146,60,0.12)", border: "rgba(251,146,60,0.40)" };
  if (difficulty === "medium") return { fg: "#FACC15", bg: "rgba(250,204,21,0.10)", border: "rgba(250,204,21,0.32)" };
  return { fg: "#9CA3AF", bg: "rgba(156,163,175,0.10)", border: "rgba(156,163,175,0.28)" };
}

/* XS_RADAR_POSITION_PERCENTILE_V1 */
function positionPercentileToneStyle(tier: RadarPositionPercentile["tier"]) {
  if (tier === "elite") return { fg: "#38BDF8", bg: "rgba(56,189,248,0.12)", border: "rgba(56,189,248,0.38)" };
  if (tier === "strong") return { fg: "#22C55E", bg: "rgba(34,197,94,0.10)", border: "rgba(34,197,94,0.34)" };
  if (tier === "weak") return { fg: "#EF4444", bg: "rgba(239,68,68,0.11)", border: "rgba(239,68,68,0.36)" };
  return { fg: "#FACC15", bg: "rgba(250,204,21,0.10)", border: "rgba(250,204,21,0.32)" };
}
/* XS_RADAR_POSITION_PERCENTILE_V1_END */

function matchDifficultyLabel(difficulty: RadarMatchContext["difficulty"]) {
  if (difficulty === "easy") return "facile";
  if (difficulty === "medium") return "moyenne";
  if (difficulty === "hard") return "difficile";
  return "inconnue";
}

function homeAwayLabel(homeAway: RadarMatchContext["homeAway"]) {
  if (homeAway === "home") return "domicile";
  if (homeAway === "away") return "extérieur";
  return "inconnu";
}

/* XS_RADAR_PREMIUM_DECISION_CARD_V1 */
function premiumDecisionVerdictV1(label: string, tone: RadarDecisionV2["finalTone"]) {
  if (tone === "strongPlay") return "TITULAIRE";
  if (tone === "play") return "À ALIGNER";
  if (tone === "joker") return "DIFF.";
  if (tone === "risk") return "RISQUÉ";
  if (tone === "avoid") return "À ÉVITER";
  if (/titulaire/i.test(label)) return "TITULAIRE";
  if (/aligner/i.test(label)) return "À ALIGNER";
  if (/risqu/i.test(label)) return "RISQUÉ";
  if (/éviter|eviter/i.test(label)) return "À ÉVITER";
  return "BORDERLINE";
}

function premiumDecisionIconV1(tone: RadarDecisionV2["finalTone"]) {
  if (tone === "strongPlay") return "★";
  if (tone === "play") return "✓";
  if (tone === "joker") return "◆";
  if (tone === "avoid") return "×";
  if (tone === "risk") return "!";
  return "?";
}

function safeTextV1(value: unknown) {
  const text = String(value || "").trim();
  return text || "—";
}

function premiumVolatilityLabelV1(value: RadarVolatility) {
  if (value === "stable") return "Faible";
  if (value === "medium") return "Moyenne";
  if (value === "high") return "Très élevée";
  return "—";
}

function premiumOpponentInitialsV1(value: unknown) {
  const text = String(value || "").trim();
  if (!text) return "—";
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length >= 2) return `${words[0][0] || ""}${words[1][0] || ""}`.toUpperCase();
  return text.slice(0, 2).toUpperCase();
}

function premiumDeltaValueV1(value: unknown) {
  const match = String(value || "").match(/[+-]?\d+/);
  return match ? match[0] : "—";
}

function premiumStatsDetailsLabelV1(reason: string) {
  if (/détaill|detail|réel|real/i.test(reason)) return "Stats détaillées disponibles";
  if (/proxy|absent|indispon|non disponible/i.test(reason)) return "Stats détaillées non confirmées";
  return "Stats détaillées : —";
}
/* XS_RADAR_PREMIUM_DECISION_CARD_V1_END */

export default function FifaRadarChart(props: {
  title?: string;
  values?: RadarValue[];
  overall?: number | null;
  confidence?: number | null;
  matches?: number | null;
  positionUsed?: string | null;
  profile?: string | null;
  range?: RadarRange;
  onRangeChange?: (range: RadarRange) => void;
  autoProfile?: RadarAutoProfile | null;
  confidenceEnhanced?: RadarConfidenceEnhanced | null;
  coachDecision?: RadarCoachDecision | null;
  decisionV2?: RadarDecisionV2 | null;
  trend?: RadarTrend | null;
  volatility?: RadarVolatility | null;
  ceiling?: number | null;
  recommendation?: RadarRecommendation | null;
  matchContext?: RadarMatchContext | null;
  positionPercentile?: RadarPositionPercentile | null;
  subtitle?: string;
}) {
  const values =
    props.values && props.values.length
      ? props.values
      : [
          { label: "Forme", value: 50 },
          { label: "Régularité", value: 50 },
          { label: "Temps de jeu", value: 50 },
          { label: "Impact", value: 50 },
          { label: "Attaque", value: 50 },
          { label: "Création", value: 50 },
          { label: "Défense", value: 50 },
          { label: "Fiabilité", value: 50 },
        ];

  const weightedOverall =
    typeof props.overall === "number" && Number.isFinite(props.overall)
      ? clamp(props.overall)
      : null;
  const avg =
    weightedOverall ??
    values.reduce((a, b) => a + clamp(b.value), 0) / Math.max(1, values.length);

  const accent = colorFromValue(avg);
  const hasMatches = typeof props.matches === "number" && Number.isFinite(props.matches);
  const hasConfidence = typeof props.confidence === "number" && Number.isFinite(props.confidence);
  const headingBits = [props.positionUsed, props.profile]
    .map((v) => String(v || "").trim())
    .filter(Boolean);
  if (hasMatches) headingBits.push(`${Math.max(0, Math.round(props.matches || 0))} matchs`);
  if (hasConfidence) headingBits.push(`Confiance ${Math.round(clamp((props.confidence || 0) * 100))}%`);
  const subtitle =
    props.subtitle ||
    (headingBits.length
      ? headingBits.join(" · ")
      : "Basé sur l'historique disponible");
  const activeRange: RadarRange = props.range || "L15";
  const ranges: RadarRange[] = ["L5", "L15", "L40"];
  const autoProfile =
    props.autoProfile || {
      label: "Profil en construction",
      tone: "balanced" as const,
      reason: "Pas encore assez de matchs fiables.",
    };
  const autoProfileTone = autoProfileToneStyle(autoProfile.tone);
  const confidenceEnhanced =
    props.confidenceEnhanced || {
      score: 0,
      label: "Faible" as const,
      color: "red" as const,
      reason: "Pas encore assez de matchs fiables.",
    };
  const confidenceTone = confidenceColorStyle(confidenceEnhanced.color);
  const coachDecision =
    props.coachDecision || {
      score: Math.round(avg),
      decision: coachDecisionFromScore(avg),
      tone: coachToneFromScore(avg),
      adjustedOverall: Math.round(avg),
      rawOverall: Math.round(avg),
      matchBonus: 0,
      trend: "stable" as const,
      volatility: "unknown" as const,
      ceiling: 0,
      reasons: ["Données radar partielles"],
      reason: "Données radar partielles.",
    };
  const coachTone = coachDecisionToneStyle(coachDecision.tone);
  const trend: RadarTrend = props.trend || coachDecision.trend || "stable";
  const volatility: RadarVolatility = props.volatility || coachDecision.volatility || "unknown";
  const ceiling = typeof props.ceiling === "number" && Number.isFinite(props.ceiling)
    ? props.ceiling
    : (typeof coachDecision.ceiling === "number" && Number.isFinite(coachDecision.ceiling) ? coachDecision.ceiling : 0);
  const decisionV2 =
    props.decisionV2 || {
      finalLabel: "À surveiller",
      finalTone: "borderline" as const,
      playStyle: "Watchlist",
      summary: "Données encore limitées, décision prudente.",
      bullets: ["Données encore limitées", "Décision prudente"],
    };
  const decisionV2Tone = decisionV2ToneStyle(decisionV2.finalTone);
  const recommendation =
    props.recommendation || (props.decisionV2 ? {
      label: decisionV2.finalLabel,
      tone: decisionV2RecommendationTone(decisionV2.finalTone),
      reason: decisionV2.summary,
    } : {
      label: "À surveiller",
      tone: "watch" as const,
      reason: "Pas encore assez de matchs fiables.",
    });
  const recommendationTone = recommendationToneStyle(recommendation.tone);
  const matchContext =
    props.matchContext || {
      opponentName: null,
      competition: null,
      homeAway: "unknown" as const,
      matchDate: null,
      difficulty: "unknown" as const,
      difficultyScore: null,
      reason: "Prochain adversaire non disponible.",
    };
  const matchTone = matchDifficultyToneStyle(matchContext.difficulty);
  const positionPercentile =
    props.positionPercentile || {
      percentileLabel: "Comparaison poste indisponible",
      deltaLabel: "base provisoire insuffisante",
      tier: "average" as const,
      reason: "Comparaison provisoire en attente de données radar suffisantes.",
    };
  const positionPercentileTone = positionPercentileToneStyle(positionPercentile.tier);
  const premiumTone = decisionV2Tone;
  const premiumVerdict = premiumDecisionVerdictV1(decisionV2.finalLabel, decisionV2.finalTone);
  const premiumIcon = premiumDecisionIconV1(decisionV2.finalTone);
  const premiumScore = Math.round(clamp(coachDecision.score));
  const decisionBullets = (decisionV2.bullets || [])
    .map((item) => String(item || "").trim())
    .filter(Boolean);
  const riskPattern = /risque|faible|irrég|irreg|difficile|rotation|baisse|extérieur|exterieur|variable|prudence/i;
  const whyItems = [
    ...decisionBullets.filter((item) => !riskPattern.test(item)),
    ...(coachDecision.reasons || []).filter((item) => !riskPattern.test(String(item || ""))),
  ]
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .filter((item, index, list) => list.indexOf(item) === index)
    .slice(0, 3);
  const displayedWhy = whyItems.length
    ? whyItems
    : [safeTextV1(decisionV2.summary || recommendation.reason)];
  const riskItems = [
    ...decisionBullets.filter((item) => riskPattern.test(item)),
    ...(confidenceEnhanced.score < 50 ? ["Confiance faible, prudence"] : []),
    ...(volatility === "high" ? ["Scores très irréguliers"] : []),
    ...(volatility === "medium" ? ["Scores variables"] : []),
    ...(matchContext.difficulty === "hard" ? ["Contexte match difficile"] : []),
    ...(matchContext.homeAway === "away" && volatility !== "stable" ? ["Extérieur avec stabilité à surveiller"] : []),
  ]
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .filter((item, index, list) => list.indexOf(item) === index)
    .slice(0, 3);
  const displayedRisks = riskItems.length ? riskItems : ["—"];
  const confidenceScore = Math.round(clamp(confidenceEnhanced.score));
  const matchDateLabel = safeTextV1(matchContext.matchDate);
  const premiumWhy = displayedWhy.slice(0, 3);
  const premiumRisks = displayedRisks.slice(0, 2);
  const volatilityLabel = premiumVolatilityLabelV1(volatility);
  const opponentInitials = premiumOpponentInitialsV1(matchContext.opponentName);
  const difficultyScoreLabel =
    typeof matchContext.difficultyScore === "number" && Number.isFinite(matchContext.difficultyScore)
      ? `(${Math.round(clamp(matchContext.difficultyScore))}/100)`
      : "";
  const positionDeltaValue = premiumDeltaValueV1(positionPercentile.deltaLabel);
  const statsDetailsLabel = premiumStatsDetailsLabelV1(confidenceEnhanced.reason);
  const v3WhyItems = [
    {
      icon: "↗",
      title: "Forme en hausse",
      text: "Bonne dynamique sur les 5 derniers matchs.",
    },
    {
      icon: "⌂",
      title: "Contexte favorable",
      text: matchContext.homeAway === "home"
        ? "Match à domicile contre une équipe à la portée."
        : "Contexte de match à surveiller.",
    },
    {
      icon: "★",
      title: `Confiance ${confidenceEnhanced.label.toLowerCase()}`,
      text: `${confidenceScore}% de confiance sur la fenêtre ${activeRange}.`,
    },
  ];
  const v3RiskTitle = volatility === "high"
    ? "Très irrégulier"
    : volatility === "medium"
      ? "Risque moyen"
      : "Risque contenu";
  const v3RiskText = volatility === "high"
    ? "Scores instables, peut manquer de constance."
    : volatility === "medium"
      ? "Quelques variations à surveiller."
      : "Profil plutôt stable.";
  const v3ProfileTitle = positionPercentile.percentileLabel || "Profil local";
  const v3ProfileText = positionPercentile.reason || "Comparaison locale provisoire.";

  return (
    <View
      style={{
        borderRadius: 16,
        backgroundColor: "#111318",
        borderWidth: 1,
        borderColor: "#242833",
        padding: 14,
        gap: 12,
      }}
    >
      {/* XS_FIFA_RADAR_NATIVE_V1 */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: "white", fontSize: 18, fontWeight: "900" }}>
            {props.title || "Radar FIFA"}
          </Text>
          {/* XS_FIFA_RADAR_REAL_STATS_V1 */}
          <Text style={{ color: "#9CA3AF", fontSize: 12, marginTop: 3 }}>
            {subtitle}
          </Text>
          {/* XS_FIFA_RADAR_REAL_STATS_V1_END */}
        </View>

        <View
          style={{
            width: 54,
            height: 54,
            borderRadius: 999,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(255,255,255,0.06)",
            borderWidth: 2,
            borderColor: accent,
          }}
        >
          <Text style={{ color: accent, fontSize: 20, fontWeight: "900" }}>
            {Math.round(avg)}
          </Text>
        </View>
      </View>

      {/* XS_FIFA_RADAR_RANGE_SWITCH_V1 */}
      {props.onRangeChange ? (
        <View style={{ flexDirection: "row", gap: 8 }}>
          {ranges.map((range) => {
            const active = range === activeRange;
            return (
              <Text
                key={range}
                onPress={() => props.onRangeChange?.(range)}
                style={{
                  flex: 1,
                  textAlign: "center",
                  paddingVertical: 8,
                  borderRadius: 999,
                  overflow: "hidden",
                  color: active ? "#08111F" : "#CBD5E1",
                  backgroundColor: active ? accent : "rgba(255,255,255,0.06)",
                  borderWidth: 1,
                  borderColor: active ? accent : "#2A2F3A",
                  fontSize: 12,
                  fontWeight: "900",
                }}
              >
                {range}
              </Text>
            );
          })}
        </View>
      ) : null}
      {/* XS_FIFA_RADAR_RANGE_SWITCH_V1_END */}

      {/* XS_MOVE_RADAR_BEFORE_DECISION_V1 */}
      <View style={{ gap: 10 }}>
        {values.map((v) => {
          const n = clamp(v.value);
          const c = colorFromValue(n);

          return (
            <View key={v.label} style={{ gap: 5 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ color: "#E5E7EB", fontWeight: "800", fontSize: 13 }}>
                  {v.label}
                </Text>
                <Text style={{ color: c, fontWeight: "900", fontSize: 13 }}>
                  {Math.round(n)}
                </Text>
              </View>

              <View
                style={{
                  height: 10,
                  borderRadius: 999,
                  backgroundColor: "rgba(255,255,255,0.08)",
                  overflow: "hidden",
                }}
              >
                <View
                  style={{
                    width: `${n}%`,
                    height: "100%",
                    borderRadius: 999,
                    backgroundColor: c,
                  }}
                />
              </View>
            </View>
          );
        })}
      </View>
      {/* XS_MOVE_RADAR_BEFORE_DECISION_V1_END */}

      {/* XS_RADAR_PIXEL_PERFECT_DECISION_V3 */}
      <View
        style={{
          borderRadius: 22,
          borderWidth: 2,
          borderColor: premiumTone.border,
          backgroundColor: "#071017",
          padding: 12,
          gap: 10,
          shadowColor: premiumTone.fg,
          shadowOpacity: 0.22,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 8 },
        }}
      >
        <View style={{ alignItems: "center", paddingTop: 2, paddingBottom: 2 }}>
          <Text style={{ color: premiumTone.fg, fontSize: 15, fontWeight: "900", letterSpacing: 0 }}>
            ♣ DÉCISION COACH
          </Text>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View
            style={{
              width: 54,
              height: 54,
              borderRadius: 16,
              backgroundColor: premiumTone.fg,
              alignItems: "center",
              justifyContent: "center",
              shadowColor: premiumTone.fg,
              shadowOpacity: 0.35,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 6 },
            }}
          >
            <Text style={{ color: "#FFFFFF", fontSize: 34, fontWeight: "900" }}>
              {premiumIcon}
            </Text>
          </View>

          <View style={{ flex: 1, minWidth: 0 }}>
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.68}
              style={{ color: premiumTone.fg, fontSize: 34, lineHeight: 38, fontWeight: "900", letterSpacing: 0 }}
            >
              {premiumVerdict}
            </Text>
            <Text numberOfLines={2} style={{ color: "#F8FAFC", fontSize: 13, lineHeight: 17, marginTop: 1 }}>
              {safeTextV1(decisionV2.summary || recommendation.reason)}
            </Text>
            {coachDecision.windowBlendLabel ? (
              <Text numberOfLines={1} style={{ color: "#CBD5E1", fontSize: 11, lineHeight: 15, marginTop: 4, fontWeight: "800" }}>
                {coachDecision.windowBlendLabel}
              </Text>
            ) : null}
          </View>

          <View
            style={{
              width: 86,
              borderRadius: 14,
              borderWidth: 1.5,
              borderColor: "rgba(148,163,184,0.28)",
              backgroundColor: "rgba(15,23,42,0.66)",
              paddingVertical: 8,
              paddingHorizontal: 7,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#F8FAFC", fontSize: 9, fontWeight: "900", letterSpacing: 0 }}>
              SCORE COACH
            </Text>
            <View style={{ flexDirection: "row", alignItems: "flex-end", marginTop: 4 }}>
              <Text style={{ color: premiumTone.fg, fontSize: 31, fontWeight: "900", lineHeight: 34 }}>
                {premiumScore}
              </Text>
              <Text style={{ color: "#94A3B8", fontSize: 13, fontWeight: "800", marginBottom: 3 }}>
                /100
              </Text>
            </View>
          </View>
        </View>

        <View style={{ height: 1, backgroundColor: "rgba(148,163,184,0.18)" }} />

        <View style={{ flexDirection: "row", gap: 9, alignItems: "stretch" }}>
          <View style={{ flex: 1.08, gap: 7, minWidth: 0 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 999,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: premiumTone.fg,
                }}
              >
                <Text style={{ color: "#071017", fontSize: 12, fontWeight: "900" }}>✓</Text>
              </View>
              <Text style={{ color: premiumTone.fg, fontSize: 15, fontWeight: "900" }}>POURQUOI ?</Text>
            </View>

            {v3WhyItems.map((item, index) => {
              const icons = ["↗", "⌂", "★"];
              return (
                <View key={`premium-why-${index}`} style={{ flexDirection: "row", gap: 7, alignItems: "center" }}>
                  <View
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 999,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: "rgba(34,197,94,0.13)",
                    }}
                  >
                    <Text style={{ color: premiumTone.fg, fontSize: 16, fontWeight: "900" }}>
                      {item.icon || icons[index] || "✓"}
                    </Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78} style={{ color: "#F8FAFC", fontSize: 13, fontWeight: "900" }}>
                      {item.title}
                    </Text>
                    <Text numberOfLines={2} style={{ color: "#CBD5E1", fontSize: 11, lineHeight: 14 }}>
                      {item.text}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>

          <View style={{ width: 1, backgroundColor: "rgba(148,163,184,0.18)" }} />

          <View style={{ flex: 0.92, gap: 7, minWidth: 0 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text style={{ color: "#F59E0B", fontSize: 16, fontWeight: "900" }}>⚠</Text>
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ color: "#F59E0B", fontSize: 15, fontWeight: "900" }}>RISQUES</Text>
            </View>

            <View style={{ flexDirection: "row", gap: 7, alignItems: "center" }}>
              <View
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 999,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "rgba(245,158,11,0.12)",
                }}
              >
                <Text style={{ color: "#F59E0B", fontSize: 16, fontWeight: "900" }}>~</Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.76} style={{ color: "#F8FAFC", fontSize: 13, fontWeight: "900" }}>
                  {v3RiskTitle}
                </Text>
                <Text numberOfLines={2} style={{ color: "#CBD5E1", fontSize: 11, lineHeight: 14 }}>
                  {v3RiskText}
                </Text>
              </View>
            </View>

            <View
              style={{
                borderRadius: 12,
                borderWidth: 1,
                borderColor: "rgba(148,163,184,0.22)",
                backgroundColor: "rgba(15,23,42,0.58)",
                paddingHorizontal: 8,
                paddingVertical: 7,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Text style={{ color: "#FB7185", fontSize: 17, fontWeight: "900" }}>◎</Text>
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72} style={{ color: "#F8FAFC", fontSize: 11, fontWeight: "900", flex: 1 }}>
                PLAFOND
              </Text>
              <Text style={{ color: "#C084FC", fontSize: 16, fontWeight: "900" }}>
                {Math.round(clamp(ceiling))}
              </Text>
            </View>

            <View
              style={{
                borderRadius: 12,
                borderWidth: 1,
                borderColor: "rgba(148,163,184,0.22)",
                backgroundColor: "rgba(15,23,42,0.58)",
                paddingHorizontal: 8,
                paddingVertical: 7,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Text style={{ color: "#60A5FA", fontSize: 17, fontWeight: "900" }}>▮▮▮</Text>
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.62} style={{ color: "#F8FAFC", fontSize: 10, fontWeight: "900", flex: 1 }}>IRRÉGULARITÉ</Text>
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={{ color: "#60A5FA", fontSize: 11, fontWeight: "900", maxWidth: 58 }}>
                {volatilityLabel}
              </Text>
            </View>
          </View>
        </View>

        <View
          style={{
            borderRadius: 14,
            borderWidth: 1,
            borderColor: "rgba(148,163,184,0.20)",
            backgroundColor: "rgba(15,23,42,0.45)",
            padding: 10,
            gap: 8,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={{ color: "#60A5FA", fontSize: 15, fontWeight: "900" }}>▦</Text>
            <Text style={{ color: "#60A5FA", fontSize: 15, fontWeight: "900" }}>CONTEXTE MATCH</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 9 }}>
            <View
              style={{
                width: 50,
                height: 58,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: "rgba(96,165,250,0.28)",
                backgroundColor: "rgba(34,197,94,0.12)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: premiumTone.fg, fontSize: 22, fontWeight: "900" }}>
                {opponentInitials}
              </Text>
            </View>
            <View style={{ flex: 1, gap: 3, minWidth: 0 }}>
              <Text numberOfLines={1} style={{ color: "#F8FAFC", fontSize: 15, fontWeight: "900" }}>
                {safeTextV1(matchContext.opponentName)}
              </Text>
              <Text numberOfLines={1} style={{ color: "#CBD5E1", fontSize: 12 }}>
                ⌂ {homeAwayLabel(matchContext.homeAway)} · ♛ {safeTextV1(matchContext.competition)}
              </Text>
              <Text numberOfLines={1} style={{ color: "#CBD5E1", fontSize: 12 }}>
                ▣ {matchDateLabel}
              </Text>
            </View>
            <View style={{ flex: 1, gap: 6, minWidth: 0 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.76} style={{ color: "#F8FAFC", fontSize: 12, fontWeight: "900" }}>DIFFICULTÉ</Text>
                <Text
                  style={{
                    color: matchTone.fg,
                    backgroundColor: matchTone.bg,
                    borderColor: matchTone.border,
                    borderWidth: 1,
                    borderRadius: 9,
                    overflow: "hidden",
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    fontSize: 11,
                    fontWeight: "900",
                  }}
                >
                  {matchDifficultyLabel(matchContext.difficulty).toUpperCase()}
                </Text>
                <Text style={{ color: "#94A3B8", fontSize: 11, fontWeight: "800" }}>
                  {difficultyScoreLabel}
                </Text>
              </View>
              <Text numberOfLines={2} style={{ color: "#CBD5E1", fontSize: 11, lineHeight: 15 }}>
                {safeTextV1(matchContext.reason)}
              </Text>
            </View>
          </View>
        </View>

        <View
          style={{
            borderRadius: 14,
            borderWidth: 1,
            borderColor: "rgba(148,163,184,0.20)",
            backgroundColor: "rgba(15,23,42,0.45)",
            padding: 10,
            gap: 8,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={{ color: positionPercentileTone.fg, fontSize: 15, fontWeight: "900" }}>♟</Text>
            <Text style={{ color: positionPercentileTone.fg, fontSize: 15, fontWeight: "900" }}>COMPARAISON POSTE</Text>
          </View>
          <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
            <View style={{ width: 96, alignItems: "center" }}>
              <View
                style={{
                  width: 92,
                  height: 44,
                  borderTopLeftRadius: 999,
                  borderTopRightRadius: 999,
                  borderWidth: 10,
                  borderBottomWidth: 0,
                  borderColor: positionPercentileTone.border,
                  backgroundColor: "transparent",
                }}
              />
              <Text style={{ color: positionPercentileTone.fg, fontSize: 22, fontWeight: "900", marginTop: -38 }}>
                {positionDeltaValue}
              </Text>
              <Text numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.72} style={{ color: "#F8FAFC", fontSize: 10, lineHeight: 12, textAlign: "center", fontWeight: "900", marginTop: 2 }}>
                AU-DESSUS{"\n"}DE LA MOYENNE
              </Text>
            </View>
            <View style={{ width: 1, height: 58, backgroundColor: "rgba(148,163,184,0.20)" }} />
            <View style={{ flex: 1, gap: 4, minWidth: 0 }}>
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78} style={{ color: "#F8FAFC", fontSize: 14, fontWeight: "900" }}>
                {safeTextV1(v3ProfileTitle)}
              </Text>
              <Text numberOfLines={2} style={{ color: "#CBD5E1", fontSize: 12, lineHeight: 16 }}>
                {safeTextV1(v3ProfileText)}
              </Text>
            </View>
          </View>
        </View>

        <View
          style={{
            borderRadius: 14,
            borderWidth: 1,
            borderColor: confidenceTone.border,
            backgroundColor: "rgba(15,23,42,0.58)",
            paddingHorizontal: 10,
            paddingVertical: 9,
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
          }}
        >
          <View
            style={{
              width: 34,
              height: 34,
              borderRadius: 999,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: confidenceTone.bg,
              borderWidth: 1,
              borderColor: confidenceTone.border,
            }}
          >
            <Text style={{ color: confidenceTone.fg, fontSize: 20, fontWeight: "900" }}>◇</Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.76} style={{ color: confidenceTone.fg, fontSize: 15, fontWeight: "900" }}>
              CONFIANCE : {confidenceEnhanced.label.toUpperCase()} ({confidenceScore}%)
            </Text>
            <Text numberOfLines={1} style={{ color: "#CBD5E1", fontSize: 12, lineHeight: 16 }}>
              {hasMatches ? `${Math.max(0, Math.round(props.matches || 0))} matchs utilisés` : "—"} · Fenêtre {activeRange} · {statsDetailsLabel}
            </Text>
          </View>
        </View>
      </View>
      {/* XS_RADAR_PIXEL_PERFECT_DECISION_V3_END */}

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {values.map((v) => {
          const n = clamp(v.value);
          return (
            <View
              key={"pill-" + v.label}
              style={{
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 999,
                backgroundColor: "rgba(255,255,255,0.05)",
                borderWidth: 1,
                borderColor: "#2A2F3A",
              }}
            >
              <Text style={{ color: "#CBD5E1", fontSize: 12, fontWeight: "800" }}>
                {v.label}: {Math.round(n)}
              </Text>
            </View>
          );
        })}
      </View>
      {/* XS_FIFA_RADAR_NATIVE_V1_END */}
    </View>
  );
}
