import React from "react";
import { View, Text } from "react-native";

type RadarValue = {
  label: string;
  value: number;
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

export default function FifaRadarChart(props: {
  title?: string;
  values?: RadarValue[];
  confidence?: number | null;
  matches?: number | null;
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

  const avg =
    values.reduce((a, b) => a + clamp(b.value), 0) / Math.max(1, values.length);

  const accent = colorFromValue(avg);
  const hasMatches = typeof props.matches === "number" && Number.isFinite(props.matches);
  const hasConfidence = typeof props.confidence === "number" && Number.isFinite(props.confidence);
  const subtitle =
    props.subtitle ||
    (hasMatches && hasConfidence
      ? `Basé sur ${Math.max(0, Math.round(props.matches || 0))} matchs · Confiance ${Math.round(
          clamp((props.confidence || 0) * 100)
        )}%`
      : "Basé sur l'historique disponible");

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
