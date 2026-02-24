import React from "react";
import { View, Text, ScrollView } from "react-native";

type PerfPoint = { score: number | null; label?: string };

type Props = {
  recentScores?: any[];
  l5?: number | null;
  l15?: number | null;
};

const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, n));

const colorFor = (score: number) => {
  if (score < 40) return "#E67E22";
  if (score < 60) return "#F1C40F";
  if (score < 80) return "#2ECC71";
  return "#1ABC9C";
};

export default function SorarePerformanceChart({ recentScores, l5, l15 }: Props) {

  const raw = Array.isArray(recentScores) ? recentScores : [];

  const points: PerfPoint[] = raw.map((it: any) => {
    if (typeof it === "number") return { score: it };
    if (it && typeof it === "object") {
      return {
        score: typeof it.score === "number" ? it.score : null,
        label: it.gw ? "GW " + it.gw : undefined
      };
    }
    return { score: null };
  }).slice(-40);

  return (
    <View style={{ marginTop: 12, padding: 14, borderRadius: 16, backgroundColor: "#0f0f0f" }}>

      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 12 }}>
        <Text style={{ color: "white", fontSize: 18, fontWeight: "800" }}>
          Performance
        </Text>

        <View style={{ flexDirection: "row", gap: 10 }}>
          <Text style={{ color: "white", fontWeight: "800" }}>
            L5 {l5 ?? "—"}
          </Text>
          <Text style={{ color: "white", fontWeight: "800" }}>
            L15 {l15 ?? "—"}
          </Text>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ height: 200, flexDirection: "row", alignItems: "flex-end" }}>
          {points.map((pt, idx) => {
            const sc = pt.score;
            const isDnp = sc === null;
            const value = isDnp ? 0 : clamp(sc!, 0, 100);
            const height = isDnp ? 30 : 180 * (value / 100);
            const bg = isDnp ? "#555" : colorFor(value);

            return (
              <View key={idx} style={{ width: 26, marginRight: 10, alignItems: "center" }}>
                <View style={{ width: 26, height, backgroundColor: bg, borderRadius: 6, alignItems: "center" }}>
                  {!isDnp && (
                    <Text style={{ fontSize: 11, fontWeight: "900", marginTop: 4 }}>
                      {Math.round(value)}
                    </Text>
                  )}
                </View>
                {isDnp ? (
                  <Text style={{ fontSize: 10, color: "#aaa", marginTop: 4 }}>DNP</Text>
                ) : (
                  <Text style={{ fontSize: 10, color: "#aaa", marginTop: 4 }}>
                    {pt.label ?? ""}
                  </Text>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
