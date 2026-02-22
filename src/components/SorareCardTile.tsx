import React from "react";
import { View, Text, StyleSheet, ImageBackground } from "react-native";

export type SorareCardTileProps = {
  l5?: number | null; // XS_SORARE_TILE_FOOTER_FIT_V1
  level?: number | null; // XS_SORARE_TILE_FOOTER_FIT_V1
  width?: number; // XS_SORARE_TILE_WIDTH_V2
  imageUrl: string;
  playerName: string;
  clubName?: string | null;
  seasonLabel?: string | null;   // ex: "2024"
  serialLabel?: string | null;   // ex: "#64"
  scarcityLabel?: string | null; // ex: "limited"
  l15?: number | null;           // ex: 47
  deltaPct?: number | null;      // ex: +11
  trendBars?: 0 | 1 | 2 | 3 | 4;  // petit indicateur vert (0-4)
};

function clamp01(n: number){ return Math.max(0, Math.min(1, n)); }

function l15Level(l15?: number | null){
  if(typeof l15 !== "number") return "none";
  if(l15 >= 60) return "hot2";
  if(l15 >= 50) return "hot1";
  return "base";
}

function formatDelta(deltaPct?: number | null){
  if(typeof deltaPct !== "number") return null;
  const sign = deltaPct > 0 ? "+" : "";
  return `${sign}${Math.round(deltaPct)}%`;
}

// XS_SORARE_TILE_V1 — Sorare-like card tile (image + info footer)
export function SorareCardTile(props: SorareCardTileProps){
  /* XS_SORARE_TILE_FOOTER_FIT_V1_BEGIN */
  const xsL5 = (typeof props.l5 === "number") ? props.l5 : null;
  const xsL15 = (typeof props.l15 === "number") ? props.l15 : null;
  const xsLevel = (typeof props.level === "number") ? props.level : null;
  const xsDelta = (typeof props.deltaPct === "number") ? props.deltaPct : null;
  /* XS_SORARE_TILE_FOOTER_FIT_V1_END */
  const level = l15Level(props.l15);
  const delta = formatDelta(props.deltaPct);

  const season = props.seasonLabel ?? "";
  const serial = props.serialLabel ?? "";
  const scar   = props.scarcityLabel ?? "";

  const metaLeft = [season, serial, scar].filter(Boolean).join(" • ");

  const bars = props.trendBars ?? 3;
  const barCount = Math.max(0, Math.min(4, bars));

  const l15Text = (typeof props.l15 === "number" && isFinite(props.l15)) ? String(Math.round(props.l15)) : "—";

  return (
    <View style={[styles.wrap, (typeof props.width === "number" ? { width: props.width } : null)]}>
      <View style={styles.cardShell}>
        <ImageBackground
          source={{ uri: props.imageUrl }}
          style={styles.img}
          imageStyle={styles.imgRadius}
          resizeMode="contain"
        >
          {/* L'image Sorare a déjà souvent le texte/overlay imprimé dedans.
              On laisse "clean" ici pour matcher le screenshot. */}
          <View style={styles.imgTopFade} />
          <View style={styles.imgBottomFade} />
        </ImageBackground>
      </View>

      <View style={styles.footer}>
        <View style={styles.row1}>
          <View style={styles.row1Left}>
            <Text style={styles.playerName} numberOfLines={1}>{props.playerName}</Text>
            {delta ? (
              <View style={styles.deltaPill}>
                <Text style={styles.deltaTxt}>{delta}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.trend}>
            {[0,1,2,3].map((i) => {
              const on = i < barCount;
              // petites barres de hauteurs progressives comme Sorare
              const h = 6 + i * 3;
              return (
                <View
                  key={i}
                  style={[
                    styles.trendBar,
                    { height: h, opacity: on ? 1 : 0.25 },
                  ]}
                />
              );
            })}
          </View>
        </View>

        <Text style={styles.club} numberOfLines={1} numberOfLines={1} ellipsizeMode="tail">
          {props.clubName ?? ""}
        </Text>

        <View style={styles.row3}>
          <Text style={styles.meta} numberOfLines={1}>{metaLeft}</Text>

          <View style={[styles.l15Pill, level === "hot1" ? styles.l15Hot1 : null, level === "hot2" ? styles.l15Hot2 : null]}>
            <Text style={styles.l15Txt}>{l15Text}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  /* XS_SORARE_TILE_FOOTER_FIT_V1_BEGIN_STYLES */
  wrap: {
    width: 175,
  },

  cardShell: {
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "#0b0b0d",
    // ombre "soft"
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },

  img: {
    width: "100%",
    height: 250, // proche screenshot
  },
  imgRadius: {
    borderRadius: 18,
  },
  imgTopFade: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 18,
    backgroundColor: "rgba(0,0,0,0.12)",
  },
  imgBottomFade: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 22,
    backgroundColor: "rgba(0,0,0,0.18)",
  },

  footer: {
    /* XS_SORARE_TILE_WIDTH_V2_BEGIN */
    backgroundColor: "#101114",
    /* XS_SORARE_TILE_WIDTH_V2_END */
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 10,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    borderColor: "rgba(255,255,255,0.08)",
  },

  row1: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  row1Left: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
    minWidth: 0,
  },
  playerName: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.2,
    maxWidth: 110,
  },

  deltaPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  deltaTxt: {
    color: "rgba(255,255,255,0.92)",
    fontSize: 11,
    fontWeight: "700",
  },

  trend: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 3,
    paddingRight: 2,
  },
  trendBar: {
    width: 4,
    borderRadius: 2,
    backgroundColor: "#4CFF7A",
  },

  club: {
    marginTop: 6,
    color: "rgba(255,255,255,0.62)",
    fontSize: 12,
    fontWeight: "600",
  },

  row3: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  meta: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
    minWidth: 0,
  },

  l15Pill: {
    minWidth: 34,
    height: 28,
    paddingHorizontal: 10,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F4C21A", // jaune Sorare-like
  },
  l15Txt: {
    color: "#0b0b0d",
    fontSize: 13,
    fontWeight: "900",
  },

  // Indicateurs couleur (L15 > 50 / > 60)
  l15Hot1: {
    backgroundColor: "#FFCC33",
    transform: [{ scale: 1.02 }],
  },
  l15Hot2: {
    backgroundColor: "#FFD84D",
    transform: [{ scale: 1.04 }],
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 2,
  },
  metaText: {
    fontSize: 11,
    opacity: 0.9,
  },
  /* XS_SORARE_TILE_FOOTER_FIT_V1_END_STYLES */
});
