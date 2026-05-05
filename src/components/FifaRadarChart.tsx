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

      {/* XS_RADAR_DECISION_ENGINE_V1 */}
      <View
        style={{
          borderRadius: 12,
          borderWidth: 1,
          borderColor: coachTone.border,
          backgroundColor: coachTone.bg,
          padding: 11,
          gap: 7,
        }}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <Text style={{ color: "#E5E7EB", fontSize: 14, fontWeight: "900" }}>
            Score Coach : {Math.round(clamp(coachDecision.score))}
          </Text>
          <Text style={{ color: coachTone.fg, fontSize: 14, fontWeight: "900" }}>
            Décision : {coachDecision.decision}
          </Text>
        </View>
        <Text style={{ color: "#CBD5E1", fontSize: 12, lineHeight: 17 }}>
          Radar ajusté : {Math.round(clamp(coachDecision.adjustedOverall))} / brut {Math.round(clamp(coachDecision.rawOverall))}
          {coachDecision.matchBonus ? ` · Bonus match ${coachDecision.matchBonus > 0 ? "+" : ""}${coachDecision.matchBonus}` : ""}
        </Text>
        {/* XS_RADAR_ADVANCED_DECISION_V1 */}
        <View
          style={{
            padding: 10,
            borderRadius: 12,
            backgroundColor: "rgba(255,255,255,0.05)",
            gap: 5,
          }}
        >
          <Text style={{ color: "#E5E7EB", fontWeight: "900", fontSize: 12 }}>
            Forme : {trend === "up" ? "📈 En hausse" : trend === "down" ? "📉 En baisse" : "➖ Stable"}
          </Text>
          <Text style={{ color: "#E5E7EB", fontSize: 12 }}>
            Risque : {volatility === "high" ? "🎰 Très irrégulier" : volatility === "medium" ? "⚠️ Variable" : volatility === "unknown" ? "➖ Inconnu" : "🔒 Stable"}
          </Text>
          <Text style={{ color: "#E5E7EB", fontSize: 12 }}>
            Plafond : 🎯 {Math.round(clamp(ceiling))}
          </Text>
        </View>
        {/* XS_RADAR_ADVANCED_DECISION_V1_END */}
        <View style={{ gap: 3 }}>
          <Text style={{ color: "#E5E7EB", fontSize: 12, fontWeight: "900" }}>Raison :</Text>
          {(coachDecision.reasons && coachDecision.reasons.length ? coachDecision.reasons : [coachDecision.reason])
            .slice(0, 4)
            .map((reason, index) => (
              <Text key={`coach-reason-${index}`} style={{ color: "#CBD5E1", fontSize: 12, lineHeight: 17 }}>
                • {reason}
              </Text>
            ))}
        </View>
      </View>
      {/* XS_RADAR_DECISION_ENGINE_V1_END */}

      {/* XS_RADAR_DECISION_ENGINE_V2 */}
      <View
        style={{
          borderRadius: 12,
          borderWidth: 1,
          borderColor: decisionV2Tone.border,
          backgroundColor: decisionV2Tone.bg,
          padding: 11,
          gap: 7,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <Text style={{ color: decisionV2Tone.fg, fontSize: 14, fontWeight: "900" }}>
            Décision V2 : {decisionV2.finalTone === "strongPlay" ? "🔥 " : ""}{decisionV2.finalLabel}
          </Text>
          <Text
            style={{
              color: decisionV2Tone.fg,
              borderColor: decisionV2Tone.border,
              borderWidth: 1,
              borderRadius: 999,
              paddingHorizontal: 8,
              paddingVertical: 3,
              overflow: "hidden",
              fontSize: 11,
              fontWeight: "900",
            }}
          >
            Style : {decisionV2.playStyle}
          </Text>
        </View>
        <Text style={{ color: "#E5E7EB", fontSize: 12, lineHeight: 17 }}>
          Résumé : {decisionV2.summary}
        </Text>
        <View style={{ gap: 3 }}>
          <Text style={{ color: "#E5E7EB", fontSize: 12, fontWeight: "900" }}>Raisons :</Text>
          {(decisionV2.bullets && decisionV2.bullets.length ? decisionV2.bullets : ["Données encore limitées"])
            .slice(0, 3)
            .map((bullet, index) => (
              <Text key={`decision-v2-${index}`} style={{ color: "#CBD5E1", fontSize: 12, lineHeight: 17 }}>
                - {bullet}
              </Text>
            ))}
        </View>
      </View>
      {/* XS_RADAR_DECISION_ENGINE_V2_END */}

      {/* XS_FIFA_RADAR_AUTO_PROFILE_V1 */}
      <View
        style={{
          borderRadius: 12,
          borderWidth: 1,
          borderColor: autoProfileTone.border,
          backgroundColor: autoProfileTone.bg,
          padding: 10,
          gap: 5,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <Text style={{ color: "#E5E7EB", fontSize: 13, fontWeight: "900" }}>
            Profil : {autoProfile.label}
          </Text>
          <Text
            style={{
              color: autoProfileTone.fg,
              borderColor: autoProfileTone.border,
              borderWidth: 1,
              borderRadius: 999,
              paddingHorizontal: 8,
              paddingVertical: 3,
              overflow: "hidden",
              fontSize: 11,
              fontWeight: "900",
            }}
          >
            {autoProfile.tone}
          </Text>
        </View>
        <Text style={{ color: "#CBD5E1", fontSize: 12, lineHeight: 17 }}>
          Raison : {autoProfile.reason}
        </Text>
      </View>
      {/* XS_FIFA_RADAR_AUTO_PROFILE_V1_END */}

      <View style={{ gap: 8 }}>
        <View
          style={{
            borderRadius: 12,
            borderWidth: 1,
            borderColor: confidenceTone.border,
            backgroundColor: confidenceTone.bg,
            padding: 10,
            gap: 5,
          }}
        >
          <Text style={{ color: "#E5E7EB", fontSize: 13, fontWeight: "900" }}>
            Confiance : {confidenceEnhanced.label} ({Math.round(clamp(confidenceEnhanced.score))})
          </Text>
          <Text style={{ color: "#CBD5E1", fontSize: 12, lineHeight: 17 }}>
            Raison : {confidenceEnhanced.reason}
          </Text>
        </View>

        <View
          style={{
            borderRadius: 12,
            borderWidth: 1,
            borderColor: recommendationTone.border,
            backgroundColor: recommendationTone.bg,
            padding: 10,
            gap: 5,
          }}
        >
          <Text style={{ color: recommendationTone.fg, fontSize: 13, fontWeight: "900" }}>
            Recommandation : {recommendation.label}
          </Text>
          <Text style={{ color: "#CBD5E1", fontSize: 12, lineHeight: 17 }}>
            Raison : {recommendation.reason}
          </Text>
        </View>

        {/* XS_CARD_MATCH_CONTEXT_RECO_V1 */}
        <View
          style={{
            borderRadius: 12,
            borderWidth: 1,
            borderColor: matchTone.border,
            backgroundColor: matchTone.bg,
            padding: 10,
            gap: 5,
          }}
        >
          <Text style={{ color: matchTone.fg, fontSize: 13, fontWeight: "900" }}>
            Contexte match : {matchContext.opponentName || "prochain adversaire non disponible"}
          </Text>
          <Text style={{ color: "#CBD5E1", fontSize: 12, lineHeight: 17 }}>
            Adversaire : {matchContext.opponentName || "—"} · Domicile/extérieur : {homeAwayLabel(matchContext.homeAway)}
          </Text>
          <Text style={{ color: "#CBD5E1", fontSize: 12, lineHeight: 17 }}>
            Difficulté : {matchDifficultyLabel(matchContext.difficulty)}
            {typeof matchContext.difficultyScore === "number" ? ` (${Math.round(clamp(matchContext.difficultyScore))})` : ""}
          </Text>
          {matchContext.competition || matchContext.matchDate ? (
            <Text style={{ color: "#CBD5E1", fontSize: 12, lineHeight: 17 }}>
              {matchContext.competition ? `Compétition : ${matchContext.competition}` : ""}
              {matchContext.competition && matchContext.matchDate ? " · " : ""}
              {matchContext.matchDate ? `Date : ${matchContext.matchDate}` : ""}
            </Text>
          ) : null}
          <Text style={{ color: "#CBD5E1", fontSize: 12, lineHeight: 17 }}>
            Raison : {matchContext.reason}
          </Text>
        </View>
        {/* XS_CARD_MATCH_CONTEXT_RECO_V1_END */}

        {/* XS_RADAR_POSITION_PERCENTILE_V1 */}
        <View
          style={{
            borderRadius: 12,
            borderWidth: 1,
            borderColor: positionPercentileTone.border,
            backgroundColor: positionPercentileTone.bg,
            padding: 10,
            gap: 5,
          }}
        >
          <Text style={{ color: positionPercentileTone.fg, fontSize: 13, fontWeight: "900" }}>
            Comparaison poste : {positionPercentile.percentileLabel}
          </Text>
          <Text style={{ color: "#CBD5E1", fontSize: 12, lineHeight: 17 }}>
            Écart : {positionPercentile.deltaLabel}
          </Text>
          <Text style={{ color: "#CBD5E1", fontSize: 12, lineHeight: 17 }}>
            Raison : {positionPercentile.reason} Comparaison provisoire sans base marché globale.
          </Text>
        </View>
        {/* XS_RADAR_POSITION_PERCENTILE_V1_END */}
      </View>

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
