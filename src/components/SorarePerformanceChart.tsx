import React from "react";
import { View, Text, Image } from "react-native";

type Props = {
  // Scores (0..100). On affiche typiquement les 5 derniers.
  recentScores: number[];
  // Optionnel: logos adverses alignés sur recentScores (même longueur). Si absent => placeholder texte.
  opponentLogoUrls?: (string | null | undefined)[];
  opponentShort?: (string | null | undefined)[];
  title?: string; // ex: "Forme"
};

function xsClamp(n: number, a: number, b: number){
  return Math.max(a, Math.min(b, n));
}

// Palette proche de ce que tu as décrit (rouge -> orange -> jaune -> verts -> bleu clair)
function xsScoreColor(score: number){
  const s = xsClamp(score, 0, 100);
  if(s < 25) return "#ff3b30";      // rouge
  if(s < 35) return "#ff9500";      // orange
  if(s < 55) return "#ffd60a";      // jaune
  if(s < 65) return "#a3e635";      // vert pomme
  if(s < 75) return "#16a34a";      // vert foncé
  return "#5ac8fa";                 // bleu clair
}

export default function SorarePerformanceChart({
  recentScores,
  opponentLogoUrls,
  opponentShort,
  title = "Performance",
}: Props) {
  const values = Array.isArray(recentScores) ? recentScores.slice(0, 5) : [];
  const max = 100;

  return (
    <View style={{ marginTop: 10 }}>
      <Text style={{ color: "white", fontWeight: "900", marginBottom: 10 }}>{title}</Text>

      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 10 }}>
        {values.map((raw, idx) => {
          const v = xsClamp(Number(raw || 0), 0, 100);
          const h = 14 + Math.round((v / max) * 86); // 14..100 approx
          const bg = xsScoreColor(v);

          const logo = opponentLogoUrls?.[idx] ?? null;
          const short = (opponentShort?.[idx] ?? "").toString().trim();

          return (
            <View key={idx} style={{ width: 40, alignItems: "center" }}>
              {/* Bar */}
              <View style={{ height: 110, justifyContent: "flex-end", width: "100%" }}>
                <View style={{ height: h, borderRadius: 10, backgroundColor: bg, width: "100%", justifyContent: "center" }}>
                  <Text style={{ color: "#0b0b0b", fontWeight: "900", textAlign: "center" }}>{Math.round(v)}</Text>
                </View>
              </View>

              {/* Opponent logo (or placeholder) */}
              <View style={{ height: 26, marginTop: 6, alignItems: "center", justifyContent: "center" }}>
                {logo ? (
                  <Image
                    source={{ uri: logo }}
                    style={{ width: 22, height: 22, borderRadius: 11 }}
                    resizeMode="contain"
                  />
                ) : (
                  <Text style={{ color: "#9ca3af", fontSize: 11, fontWeight: "800" }}>
                    {short ? short.slice(0, 4).toUpperCase() : "—"}
                  </Text>
                )}
              </View>
            </View>
          );
        })}
      </View>

      <Text style={{ color: "#9ca3af", fontSize: 12, marginTop: 8 }}>
        {/* XS_SORARE_CHART_STYLE_V1 */}
        Scores sur 5 matchs (barres verticales, couleur selon seuils).
      </Text>
    </View>
  );
}
