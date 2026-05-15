/* XS_FIX_MYCARDS_BONUS_BADGE_REAL_V3 */
/* XS_FIX_TILE_REMOVE_EMPTY_LVL_AND_POWER_BADGE_V2 */
/* XS_TILE_REMOVE_LVL_KEEP_GREEN_BONUS_V1 */
/* XS_MES_CARTES_GALLERY_IDENTIQUE_V1 */
/* XS_CARD_BONUS_GAMEWEEK_V1 */
/* XS_MES_CARTES_TILE_CLEAN_V2 */
/* XS_MES_CARTES_LVL_POSITION_V3 */
/* XS_FIX_L5_MINI_CHART_ORDER_V1 */
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";

type XsScoreToneV1 = {
  main: string;
  glow: string;
};

function xsNum(v: any): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim()) {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function xsClamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function xsSafeTextV1(value: any, fallback = "—"): string {
  const s = value == null ? "" : String(value).trim();
  return s || fallback;
}

function xsScoreColorV1(score: any): XsScoreToneV1 {
  const n = xsNum(score);
  if (n === null) return { main: "#374151", glow: "rgba(148,163,184,0.25)" };
  if (n < 25) return { main: "#EF1D24", glow: "rgba(239,29,36,0.24)" };
  if (n < 40) return { main: "#F58220", glow: "rgba(245,130,32,0.26)" };
  if (n < 60) return { main: "#FFD21A", glow: "rgba(255,210,26,0.24)" };
  if (n < 75) return { main: "#78BE20", glow: "rgba(120,190,32,0.24)" };
  return { main: "#18A8F5", glow: "rgba(24,168,245,0.26)" };
}

function xsAvgV1(scores: Array<number | null | undefined>): number | null {
  const values = scores.filter((n) => Number.isFinite(n));
  if (!values.length) return null;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

/* XS_TILE_POWER_TOTAL_BONUS_V1 */
function xsCardBonusPctV1(card: any): number | null {
  const raw =
    card?.power ??
    card?.cardPower ??
    card?.bonusPct ??
    card?.totalBonus ??
    card?.bonus ??
    card?.xpBonus ??
    card?.seasonBonus ??
    card?.collectionBonus ??
    card?.raw?.power ??
    card?.card?.power;

  const n = xsNum(raw);
  if (n === null) return null;

  if (n > 0 && n < 3) return Math.round((n - 1) * 1000) / 10;
  return Math.round(n * 10) / 10;
}

function xsFormatBonusPctV1(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "BONUS —";
  const rounded = Math.abs(value - Math.round(value)) < 0.05 ? String(Math.round(value)) : value.toFixed(1);
  return `+${rounded}%`;
}

function xsPickNumFromRowV1(row: any): number | null {
  const raw =
    typeof row === "number" || typeof row === "string"
      ? row
      : row?.score ?? row?.scoreSorare ?? row?.total ?? row?.value ?? row?.so5Score ?? row?.decisiveScore;
  const n = xsNum(raw);
  return n === null ? null : xsClamp(n, 0, 100);
}

function xsDateMsFromRowV1(row: any): number | null {
  const raw =
    row?.date ??
    row?.gameDate ??
    row?.matchDate ??
    row?.playedAt ??
    row?.startDate ??
    row?.fixtureDate ??
    row?.createdAt;
  const time = raw ? new Date(raw).getTime() : NaN;
  return Number.isFinite(time) ? time : null;
}

function xsNormalizeL5MiniChartOrderV1(
  scores: any[],
  order: "newest-first" | "oldest-first" | "auto" = "auto"
): Array<number | null> {
  const source = Array.isArray(scores) ? scores.slice() : [];
  const rows = source
    .map((row, index) => ({
      score: xsPickNumFromRowV1(row),
      dateMs: xsDateMsFromRowV1(row),
      index,
    }))
    .filter((row) => row.score !== null);

  if (!rows.length) return [];

  const dated = rows.filter((row) => row.dateMs !== null);
  if (dated.length >= 2) {
    return rows
      .slice()
      .sort((a, b) => (b.dateMs ?? 0) - (a.dateMs ?? 0))
      .slice(0, 5)
      .sort((a, b) => (a.dateMs ?? 0) - (b.dateMs ?? 0))
      .map((row) => row.score);
  }

  if (order === "newest-first") {
    // XS_FIX_L5_MINI_CHART_ORDER_V1: display oldest -> newest, left -> right
    return rows.slice(0, 5).reverse().map((row) => row.score);
  }

  return rows.slice(-5).map((row) => row.score);
}

function xsGetL5ScoresV1(card: any): Array<number | null> {
  const sources = [
    { value: card?.averagesDebug?.l5Scores, order: "newest-first" as const }, /* XS_OFFICIAL_SORARE_AVERAGES_V1 */
    { value: card?.l5Bars, order: "newest-first" as const },
    { value: card?.recentScores, order: "newest-first" as const },
    { value: card?.so5Scores, order: "newest-first" as const },
    { value: card?.historyChart, order: "newest-first" as const },
    { value: card?.history, order: "newest-first" as const },
    { value: card?.scores, order: "newest-first" as const },
    { value: card?.gameScores, order: "newest-first" as const },
    { value: card?.scoreHistory, order: "newest-first" as const },
    { value: card?.player?.recentScores, order: "newest-first" as const },
    { value: card?.anyPlayer?.recentScores, order: "newest-first" as const },
    { value: card?.l5Scores, order: "auto" as const },
    { value: card?.lastFiveScores, order: "auto" as const },
    { value: card?.player?.l5Scores, order: "auto" as const },
    { value: card?.player?.lastFiveScores, order: "auto" as const },
    { value: card?.anyPlayer?.l5Scores, order: "auto" as const },
    { value: card?.anyPlayer?.lastFiveScores, order: "auto" as const },
  ];

  for (const source of sources) {
    if (!Array.isArray(source.value) || source.value.length === 0) continue;
    const values = xsNormalizeL5MiniChartOrderV1(source.value, source.order);
    if (values.length) return values;
  }

  const one = xsPickNumFromRowV1(card?.l5 ?? card?.lastScore ?? card?.latestScore ?? card?.score);
  return one === null ? [] : [one];
}

function xsGetCardImageV1(card: any): string {
  return xsSafeTextV1(
    card?.pictureUrl ??
      card?.imageUrl ??
      card?.cardPictureUrl ??
      card?.player?.pictureUrl ??
      card?.player?.avatarUrl ??
      card?.anyPlayer?.pictureUrl ??
      card?.avatarUrl,
    ""
  );
}

function xsGetClubLogoV1(card: any): string {
  return xsSafeTextV1(
    card?.clubLogoUrl ??
      card?.teamLogoUrl ??
      card?.anyTeam?.pictureUrl ??
      card?.anyTeam?.logoUrl ??
      card?.player?.activeClub?.pictureUrl ??
      card?.player?.activeClub?.logoUrl,
    ""
  );
}

function xsGetPlayerNameV1(card: any): string {
  return xsSafeTextV1(
    card?.displayName ??
      card?.playerName ??
      card?.name ??
      card?.anyPlayer?.displayName ??
      card?.player?.displayName ??
      card?.anyPlayer?.name ??
      card?.player?.name ??
      card?.slug,
    "Carte"
  );
}

function xsGetClubNameV1(card: any): string {
  return xsSafeTextV1(
    card?.clubName ??
      card?.teamName ??
      card?.anyTeam?.name ??
      card?.player?.activeClub?.name ??
      card?.player?.clubName,
    "—"
  );
}

function xsGetAgeV1(card: any): string {
  const age = xsNum(card?.age ?? card?.player?.age ?? card?.anyPlayer?.age);
  return age === null ? "—" : String(Math.round(age));
}

function xsGetPositionV1(card: any): string {
  const raw = xsSafeTextV1(
    card?.position ??
      card?.playerPosition ??
      card?.positionRaw ??
      card?.player?.position ??
      card?.anyPlayer?.position ??
      card?.player?.anyPositions?.[0] ??
      card?.anyPlayer?.anyPositions?.[0],
    ""
  ).toLowerCase();

  if (!raw) return "—";
  if (raw.includes("goal") || raw === "gk") return "GK";
  if (raw.includes("def") || raw === "df") return "DF";
  if (raw.includes("mid") || raw === "md") return "MD";
  if (raw.includes("forward") || raw === "fw" || raw === "fwd" || raw.includes("attacker")) return "FW";
  return raw.toUpperCase().slice(0, 3);
}

function xsGetCountryV1(card: any): string {
  const raw =
    card?.countryCode ??
    card?.country ??
    card?.player?.countryCode ??
    card?.player?.country ??
    card?.anyPlayer?.countryCode ??
    card?.anyPlayer?.country;

  if (typeof raw === "string") return raw.toUpperCase().slice(0, 3) || "—";
  if (raw?.code) return String(raw.code).toUpperCase().slice(0, 3);
  if (raw?.name) return String(raw.name).toUpperCase().slice(0, 3);
  return "—";
}

function xsGetStarterRateV1(card: any): string {
  const raw =
    card?.starterRate ??
    card?.startRate ??
    card?.titularity ??
    card?.titulaireRate ??
    card?.player?.starterRate ??
    card?.anyPlayer?.starterRate;
  const n = xsNum(raw);
  if (n === null) return "—";
  const pct = n <= 1 ? n * 100 : n;
  return `${Math.round(xsClamp(pct, 0, 100))}%`;
}

function xsGetNextMatchV1(card: any): string {
  const src = card?.nextMatch ?? card?.upcomingGame ?? card?.fixture ?? card?.nextGame ?? card?.player?.nextMatch;
  if (typeof src === "string") return xsSafeTextV1(src);
  const home = xsSafeTextV1(src?.homeTeamShortName ?? src?.homeTeam ?? src?.home ?? src?.homeTeamName, "");
  const away = xsSafeTextV1(src?.awayTeamShortName ?? src?.awayTeam ?? src?.away ?? src?.awayTeamName, "");
  if (home && away) return `${home} vs ${away}`;
  const opponent = xsSafeTextV1(src?.opponentName ?? src?.opponent ?? card?.opponentName, "");
  return opponent ? `vs ${opponent}` : "—";
}

function xsGetDifficultyV1(card: any): number | null {
  const raw =
    card?.fixtureDifficulty ??
    card?.difficulty ??
    card?.nextMatch?.difficulty ??
    card?.upcomingGame?.difficulty ??
    card?.player?.fixtureDifficulty;
  const n = xsNum(raw);
  if (n === null) return null;
  return Math.round(xsClamp(n > 10 ? n / 10 : n, 0, 10));
}

function xsGetRarityMarkV1(card: any): string {
  const raw = xsSafeTextV1(card?.rarityTyped ?? card?.rarity ?? card?.scarcityLabel ?? card?.scarcity, "L");
  return raw.slice(0, 1).toUpperCase();
}

function xsGetRankV1(card: any): string {
  const n = xsNum(card?.serialNumber ?? card?.serial ?? card?.rank ?? card?.ranking);
  return n === null ? "#—" : `#${Math.round(n)}`;
}

function xsDifficultyBarsV1(value: number | null) {
  const active = value === null ? 0 : Math.max(1, Math.round(xsClamp(value, 0, 10) / 10 * 7));
  return Array.from({ length: 7 }, (_, index) => index < active);
}

export function SorareCardTile(props: any) {
  const c = { ...(props.card || {}), ...props };
  const width = xsNum(props.width) ?? 170;
  const imageHeight = Math.round(width * 1.16);
  const l5Scores = xsGetL5ScoresV1(c);
  const l5Avg = xsNum(c?.averages?.l5 ?? c?.avg5 ?? c?.l5Avg ?? c?.l5) ?? xsAvgV1(l5Scores); /* XS_OFFICIAL_SORARE_AVERAGES_V1 */
  const scoreTone = xsScoreColorV1(l5Avg);
  const pictureUrl = xsGetCardImageV1(c);  const bonusPct = xsCardBonusPctV1(c);
  const scoreCircleSize = Math.max(48, Math.round(width * 0.29));
  const scoreBoxSize = Math.max(18, Math.round(width * 0.112));

  const content = (
    <View
      style={{
        width,
        borderRadius: 18,
        borderWidth: 1.4,
        borderColor: "rgba(176,146,78,0.72)",
        backgroundColor: "#050607",
        overflow: "hidden",
        shadowColor: "#000",
        shadowOpacity: 0.28,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 5 },
      }}
    >
      <View style={{ height: imageHeight, backgroundColor: "#0B0D10", overflow: "hidden" }}>
        <LinearGradient
          colors={["#3A2A0C", "#12100A", "#050607"]}
          start={{ x: 0.08, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}
        />
        {pictureUrl ? (
          <Image source={{ uri: pictureUrl }} style={{ width: "100%", height: "100%" }} resizeMode="contain" />
        ) : (
          <LinearGradient
            colors={["#382A0E", "#111827", "#030507"]}
            style={{ width: "100%", height: "100%", alignItems: "center", justifyContent: "center" }}
          >
            <Feather name="user" size={42} color="rgba(255,255,255,0.42)" />
          </LinearGradient>
        )}

        <LinearGradient
          colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.5)", "rgba(0,0,0,0.96)"]}
          locations={[0, 0.54, 1]}
          style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: Math.round(imageHeight * 0.48) }}
        />
        <LinearGradient
          colors={["rgba(121,88,15,0.42)", "rgba(0,0,0,0)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0.75 }}
          style={{ position: "absolute", left: 0, right: 0, top: 0, height: Math.round(imageHeight * 0.45) }}
        />

        <View
          style={{
            position: "absolute",
            top: 10,
            left: 10,
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 8,
            backgroundColor: "rgba(0,0,0,0.56)",
          }}
        >
          <Text style={{ color: "#F8FAFC", fontWeight: "900", fontSize: 12 }}>{xsGetRankV1(c)}</Text>
        </View>

        <View
          style={{
            position: "absolute",
            top: 10,
            right: 2,
            width: 32,
            height: 32,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: "rgba(245,183,0,0.58)",
            backgroundColor: "rgba(0,0,0,0.58)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Feather name="star" size={18} color="#FFD028" fill="#FFD028" />
        </View>

        <View
          style={{
            position: "absolute",
            bottom: 30,
            right: 2,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: "red", // XS_PROBE_BONUS_BADGE_VISIBLE_MOVE_V1
            backgroundColor: "rgba(6,16,12,0.82)",
            paddingHorizontal: 8,
            paddingVertical: 4,
          }}
        >
          <Text style={{ color: bonusPct === null ? "#A4A7AE" : "#86EFAC", fontSize: 11, fontWeight: "900" }}>
            {xsFormatBonusPctV1(bonusPct)}
          </Text>
        </View>

        <View
          style={{
            position: "absolute",
            left: 10,
            bottom: 76,
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 7,
            backgroundColor: "rgba(0,0,0,0.58)",
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.14)",
          }}
        >
          <Text style={{ color: "#FFFFFF", fontSize: 12, fontWeight: "900" }}>{xsGetPositionV1(c)}</Text>
        </View>

        <View style={{ position: "absolute", left: 10, right: scoreCircleSize + 14, bottom: 12 }}>
          <Text
            style={{ color: "#FFFFFF", fontSize: 21, lineHeight: 24, fontWeight: "900", letterSpacing: 0 }}
            numberOfLines={2}
            adjustsFontSizeToFit
            minimumFontScale={0.72}
          >
            {xsGetPlayerNameV1(c).toUpperCase()}
          </Text>
          <Text style={{ color: "#D1D5DB", fontSize: 12, marginTop: 2 }} numberOfLines={1}>
            {xsGetClubNameV1(c)}
          </Text>
        </View>

        <View
          style={{
            position: "absolute",
            right: 8,
            bottom: 12,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <View
            style={{
              width: scoreCircleSize,
              height: scoreCircleSize,
              borderRadius: 999,
              borderWidth: 4,
              borderColor: scoreTone.main,
              backgroundColor: "rgba(0,0,0,0.72)",
              alignItems: "center",
              justifyContent: "center",
              shadowColor: scoreTone.main,
              shadowOpacity: 0.38,
              shadowRadius: 8,
            }}
          >
            <Text style={{ color: "#FFFFFF", fontWeight: "900", fontSize: Math.round(scoreCircleSize * 0.39), lineHeight: Math.round(scoreCircleSize * 0.44) }}>
              {l5Avg === null ? "—" : l5Avg}
            </Text>
          </View>
          <Text style={{ color: "#FFFFFF", fontWeight: "900", fontSize: 10, marginTop: 2 }}>L5</Text>
        </View>
      </View>

      <View style={{ borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.13)", paddingHorizontal: 10, paddingVertical: 9 }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ color: "#C7CBD1", fontSize: 10, fontWeight: "900" }} numberOfLines={1}>
              L5
            </Text>
            <View style={{ flexDirection: "row", gap: 4, marginTop: 6 }}>
              {Array.from({ length: 5 }, (_, i) => {
                const score = l5Scores[i];
                const tone = xsScoreColorV1(score);
                return (
                  <View
                    key={`l5-${i}`}
                    style={{
                      width: scoreBoxSize,
                      height: scoreBoxSize,
                      borderRadius: 6,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: score == null ? "#1F2937" : tone.main,
                    }}
                  >
                    <Text style={{ color: score != null && score >= 75 ? "#FFFFFF" : "#050607", fontSize: 12, fontWeight: "900" }}>
                      {score == null ? "—" : Math.round(score)}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>
      </View>
    </View>
  );

  if (!props?.onPress) return content;

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={props.onPress} style={{ width }}>
      {content}
    </TouchableOpacity>
  );
}









