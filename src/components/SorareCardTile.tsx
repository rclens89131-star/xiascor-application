import React from "react";
import { View, Text, Image, TouchableOpacity, Alert} from "react-native";
import { theme } from "../theme";

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

function XSL5MiniBars({ values }: { values?: number[] }) {
  const arr = Array.isArray(values) ? values.slice(-5) : [];
  if (!arr.length) return null;

  const H = 14;
  const W = 4;
  const GAP = 3;

  return (
    <View pointerEvents="none" /* XS_TILE_POINTER_EVENTS_NONE_PROBE_V2 */ style={{ flexDirection: "row", alignItems: "flex-end" }}>
      {arr.map((raw, idx) => {
        const v = xsNum(raw);
        const val = v === null ? 0 : xsClamp(v, 0, 100);
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
              backgroundColor: theme.stroke,
              opacity: 0.95,
            }}
          >
            <View
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                height: h,
                backgroundColor: "#2D7CFF",
                borderRadius: 2,
              }}
            />
          </View>
        );
      })}
    </View>
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

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => { /* XS_TILE_TOUCHABLE_PROBE_V1 */ try { Alert.alert("XS_TILE_TOUCHABLE_PROBE_V1","tap reçu INSIDE tile ✅"); } catch(e){ console.log("XS_TILE_TOUCHABLE_PROBE_V1", e); } try { props?.onPress?.(); } catch(e){ console.log("XS_TILE_TOUCHABLE_PROBE_V1 call props.onPress error", e); } }}
      style={{
        width: props.width,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: theme.stroke,
        backgroundColor: theme.panel,
        overflow: "hidden",
      }}
    >
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

            <XSL5MiniBars values={l5Bars} />
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
    </TouchableOpacity>
  );
}


