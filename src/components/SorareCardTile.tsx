import React from "react";
import { View, Text, Image, TouchableOpacity} from "react-native";
import { theme } from "../theme";
import PerfL5Widget from "./PerfL5Widget";

/**
 * XS_TILE_RETRO_COMPAT_THEME_FIX_V1
 * - Support ancien props ET nouveau { card }
 * - Corrige theme.cardBorder -> theme.stroke
 * - Corrige theme.card -> theme.panel
 */

function xsNum(v: any): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function xsClamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function XSL5MiniBars({ values }: { values: number[] }) {
  const scores = Array.isArray(values) ? values.slice(-5) : [];
  if (scores.length === 0) return null;

  return (
    <PerfL5Widget
      scores={scores}
      height={58}
    />
  );
}

export function SorareCardTile(props: any) {

  // === RETRO COMPAT MODE ===
  const c = props.card ?? props;

  const pictureUrl =
    c.pictureUrl ??
    c.avatarUrl ??
    c.imageUrl ??
    "";

  const playerName =
    c.playerName ??
    c.name ??
    c.slug ??
    "Carte";

  const teamName =
    c.teamName ??
    c.clubName ??
    "";

  const seasonYear =
    xsNum(c.seasonYear) ??
    xsNum(c?.season?.year) ??
    null;

  const serial =
    xsNum(c.serialNumber) ??
    xsNum(c.serial) ??
    null;

  const rarity =
    c.rarityTyped ??
    c.rarity ??
    "";

  const level =
    xsNum(c.level) ??
    xsNum(c.lvl) ??
    null;

  const l5Bars =
    Array.isArray(c.l5Bars) ? c.l5Bars :
    Array.isArray(c.l5) ? c.l5 :
    Array.isArray(c.recentScores) ? c.recentScores :
    undefined;

  /* XS_TILE_CONDITIONAL_TOUCHABLE_V5 */
const xsContentV5 = (
  <>

      <View style={{ padding: 10 }}>
        <View
          style={{
            borderRadius: 16,
            overflow: "hidden",
            borderWidth: 1,
            borderColor: theme.stroke,
            backgroundColor: "#0e0f12",
          }}
        >
          {pictureUrl ? (
            <Image
              source={{ uri: pictureUrl }}
              style={{ width: "100%", aspectRatio: 0.72 }}
              resizeMode="cover"
            />
          ) : (
            <View style={{ width: "100%", aspectRatio: 0.72, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ color: theme.muted }}>Image indisponible</Text>
            </View>
          )}
        </View>

        <View style={{ marginTop: 10 }}>
          <Text style={{ color: theme.text, fontWeight: "900" }} numberOfLines={1}>
            {playerName}
          </Text>

          <Text style={{ color: theme.muted, marginTop: 2 }} numberOfLines={1}>
            {teamName}
          </Text>

          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8 }}>
            <Text style={{ color: theme.muted }} numberOfLines={1}>
              {seasonYear ?? "—"}{"  "}•{"  "}
              {serial ? "#" + serial : "#—"}{"  "}•{"  "}
              {rarity || "—"}
            </Text>

            <View style={{ flex: 1 }} />

            <PerfL5Widget scores={l5Bars} height={58} />
          </View>

          {level !== null && (
            <View style={{
              marginTop: 10,
              alignSelf: "flex-start",
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 999,
              backgroundColor: "#15171C",
              borderWidth: 1,
              borderColor: theme.stroke
            }}>
              <Text style={{ color: theme.text, fontWeight: "900" }}>
                LVL {level}
              </Text>
            </View>
          )}
        </View>
      </View>
    
  </>
);

if (!props?.onPress) {
  return (
    <View style={{
        width: props.width,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: theme.stroke,
        backgroundColor: theme.panel,
        overflow: "hidden",
      }}>
      {xsContentV5}
    </View>
  );
}

return (
  <TouchableOpacity
      
      activeOpacity={0.9}
      onPress={props.onPress}
      style={{
        width: props.width,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: theme.stroke,
        backgroundColor: theme.panel,
        overflow: "hidden",
      }}
    >
    {xsContentV5}
  </TouchableOpacity>
);}










