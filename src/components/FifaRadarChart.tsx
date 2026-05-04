import React from "react";
import { View, Text } from "react-native";

type RadarValue = {
  label: string;
  value: number;
};

type RadarRange = "L5" | "L15" | "L40";
type RadarAutoProfile = {
  label: string;
  tone: "safe" | "upside" | "risk" | "balanced";
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
