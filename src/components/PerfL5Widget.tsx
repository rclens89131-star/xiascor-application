import React from "react";
import { View, Text, Image } from "react-native";

/**
 * XS_PERF_L5_WIDGET_V1
 * Mini widget L5 pour tuiles Mes cartes.
 * - Barres verticales + score dans la barre
 * - Couleurs par seuil (comme Sorare-like)
 * - Logos optionnels (si dispo)
 */
export type PerfOpponentMini = {
  name?: string | null;
  slug?: string | null;
  logoUrl?: string | null;
};

export function xsScoreColor(score: number): string {
  // On NE fixe pas la palette globale de l'app ici; on suit les seuils demandés.
  // Rouge 0–25, orange 25–35, jaune 35–55, vert pomme 55–65, vert foncé 65–75, bleu clair >75
  if (!Number.isFinite(score)) return "#666666";
  if (score < 25) return "#E53935";
  if (score < 35) return "#FB8C00";
  if (score < 55) return "#FDD835";
  if (score < 65) return "#7CB342";
  if (score < 75) return "#2E7D32";
  return "#29B6F6";
}

export default function PerfL5Widget(props: {
  scores: Array<number | null | undefined>;
  opponents?: Array<PerfOpponentMini | null | undefined>;
  height?: number;
}) {
  const height = Math.max(44, Math.min(96, Number(props.height ?? 64)));
  const scores = Array.isArray(props.scores) ? props.scores.slice(0, 5) : [];
  const opps = Array.isArray(props.opponents) ? props.opponents.slice(0, 5) : [];

  // Garde-fou: on évite les layouts cassés si pas de data
  if (scores.length === 0) {
    return (
      <View style={{ height, justifyContent: "center" }}>
        <Text style={{ color: "#9aa0a6", fontSize: 12 }}>—</Text>
      </View>
    );
  }

  return (
    <View style={{ flexDirection: "column", gap: 6 }}>
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 6 }}>
        {scores.map((s, idx) => {
          const v = Number(s ?? 0);
          const pct = Math.max(6, Math.min(100, Math.round((v / 100) * 100)));
          const barH = Math.round((height * pct) / 100);

          return (
            <View key={"l5b_" + idx} style={{ width: 16, alignItems: "center" }}>
              <View
                style={{
                  width: 16,
                  height: barH,
                  borderRadius: 6,
                  backgroundColor: xsScoreColor(v),
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Text style={{ color: "#111", fontSize: 10, fontWeight: "900" }}>
                  {Number.isFinite(v) ? String(Math.round(v)) : "—"}
                </Text>
              </View>

              {/* Logo optionnel */}
              {opps[idx]?.logoUrl ? (
                <Image
                  source={{ uri: String(opps[idx]?.logoUrl) }}
                  style={{ width: 14, height: 14, marginTop: 4, borderRadius: 7, opacity: 0.95 }}
                />
              ) : (
                <View style={{ width: 14, height: 14, marginTop: 4 }} />
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}
