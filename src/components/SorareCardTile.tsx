import React from "react";
import { View, Text, Image, TouchableOpacity } from "react-native";
import { theme } from "../theme";

/**
 * XS_REWRITE_SORARECARDTILE_L5_ONLY_V1
 * Objectif:
 * - Supprimer l'ancien indicateur "+%" (trend) => supprimé
 * - Afficher un mini L5 bars "Sorare-like" à droite en bas
 * - Éviter toute SyntaxError (plus de JSX comment au mauvais endroit)
 */

function xsNum(v: any): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function xsClamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function XSL5MiniBars({ values }: { values?: number[] }) {
  const arr = Array.isArray(values) ? values.slice(-5) : [];
  if (!arr.length) return null;

  const H = 14;
  const W = 4;
  const GAP = 3;

  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
      {arr.map((raw, idx) => {
        const v = xsNum(raw);
        const val = v === null ? 0 : xsClamp(v, 0, 100);
        const isDnp = v === null;
        const h = Math.max(3, Math.round((H * val) / 100));
        return (
          <View
            key={"xs-l5-" + idx}
            style={{
              width: W,
              height: H,
              marginRight: idx === arr.length - 1 ? 0 : GAP,
              borderRadius: 2,
              overflow: "hidden",
              backgroundColor: theme.cardBorder,
              opacity: 0.95,
            }}
          >
            <View
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                height: isDnp ? Math.max(3, Math.round(H * 0.25)) : h,
                backgroundColor: isDnp ? "#4B4F58" : "#2D7CFF",
                borderRadius: 2,
              }}
            />
          </View>
        );
      })}
    </View>
  );
}

export function SorareCardTile(props: {
  card: any;
  onPress?: () => void;
  width?: number;
}) {
  const c = props.card || {};
  const w = typeof props.width === "number" ? props.width : undefined;

  const pictureUrl =
    (typeof c.pictureUrl === "string" && c.pictureUrl) ||
    (typeof c.avatarUrl === "string" && c.avatarUrl) ||
    "";

  const playerName =
    (typeof c.playerName === "string" && c.playerName) ||
    (typeof c.name === "string" && c.name) ||
    (typeof c.slug === "string" && c.slug) ||
    "Carte";

  const teamName =
    (typeof c.teamName === "string" && c.teamName) ||
    (typeof c.clubName === "string" && c.clubName) ||
    "";

  const seasonYear =
    xsNum(c.seasonYear) ?? xsNum(c?.season?.year) ?? null;

  const serial =
    xsNum(c.serialNumber) ?? xsNum(c.serial) ?? null;

  const rarity =
    (typeof c.rarityTyped === "string" && c.rarityTyped) ||
    (typeof c.rarity === "string" && c.rarity) ||
    "";

  const level =
    xsNum(c.level) ?? xsNum(c.lvl) ?? null;

  // L5 mini bars: on accepte plusieurs shapes (l5Bars, l5, recentScores)
  const l5Bars: number[] | undefined =
    Array.isArray(c.l5Bars) ? c.l5Bars :
    Array.isArray(c.l5) ? c.l5 :
    Array.isArray(c.recentScores) ? c.recentScores :
    undefined;

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={props.onPress}
      style={{
        width: w,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: theme.cardBorder,
        backgroundColor: theme.card,
        overflow: "hidden",
      }}
    >
      <View style={{ padding: 10 }}>
        <View
          style={{
            borderRadius: 16,
            overflow: "hidden",
            borderWidth: 1,
            borderColor: theme.cardBorder,
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
              {seasonYear ? String(seasonYear) : "—"}{"  "}•{"  "}
              {serial !== null ? ("#" + String(serial)) : "#—"}{"  "}•{"  "}
              {rarity ? rarity : "—"}
            </Text>

            <View style={{ flex: 1 }} />

            {/* ✅ Zone entourée sur ton screenshot: mini L5 bars */}
            <View style={{ alignItems: "flex-end" }}>
              <XSL5MiniBars values={l5Bars} />
            </View>
          </View>

          {/* ✅ On garde le level si présent (sinon rien) */}
          {level !== null ? (
            <View style={{ marginTop: 10, alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: "#15171C", borderWidth: 1, borderColor: theme.cardBorder }}>
              <Text style={{ color: theme.text, fontWeight: "900" }}>LVL {String(level)}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}
