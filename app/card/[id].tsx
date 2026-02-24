import React, { useMemo } from "react";
import { ScrollView, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { theme } from "../../src/theme";
import { xsCardNavGet } from "../_lib/cardNavCache";
import { publicPlayerPerformance } from "../../src/scoutApi"; /* XS_CARD_PUBLIC_PLAYER_PERF_IMPORT_V4 */
/* XS_PERF_SECTION_V1_BEGIN */
/* XS_SORARE_FULL_BAR_CHART_V1: Sorare-like bar chart (colors + score label + DNP + GW) */
type XSPerfPoint = { gw?: number | string; score: number | null };

function xsClamp(n: number, a: number, b: number){ return Math.max(a, Math.min(b, n)); }

function xsColorForScore(score: number){
  // Sorare-like (approx)
  if(score < 40) return "#E67E22";     // orange
  if(score < 60) return "#F1C40F";     // yellow
  if(score < 80) return "#2ECC71";     // green
  return "#1ABC9C";                    // teal
}

function XSFullPerfBars({ points }: { points: XSPerfPoint[] }){
  const H = 210;            // chart area height
  const BAR_W = 26;
  const GAP = 10;
  const MAX = 100;
  /* XS_SORARE_POINTS_NORMALIZE_V1: normalize perf -> points[{gw,score}] */
  const xsPoints: XSPerfPoint[] = (() => {
    const raw: any = (perf as any) || {};
    const series = raw.series || raw.points || raw.performances || raw.scores || [];
    if(Array.isArray(series) && series.length && typeof series[0] === "number"){
      return (series as number[]).map((n, i) => ({ gw: String(i+1), score: (typeof n === "number" ? n : null) }));
    }
    if(Array.isArray(series)){
      return (series as any[]).map((p: any) => ({
        gw: p?.gw ?? p?.gameWeek ?? p?.week ?? p?.gameweek,
        score: (typeof p?.score === "number") ? p.score : ((typeof p?.value === "number") ? p.value : null),
      }));
    }
    return [];
  })();
  const xsLast40 = xsPoints.slice(Math.max(0, xsPoints.length - 40));


  return (
    <View style={{ paddingTop: 8 }}>
      <View style={{ height: H, flexDirection: "row", alignItems: "flex-end" }}>
        {points.map((p, idx) => {
          const isDnp = (p.score === null || typeof p.score !== "number" || Number.isNaN(p.score));
          const s = isDnp ? 0 : xsClamp(p.score as number, 0, MAX);
          const ratio = isDnp ? 0.18 : xsClamp(s / MAX, 0.05, 1);
          const barH = Math.round(H * ratio);
          const bg = isDnp ? "#4B4F58" : xsColorForScore(s);
          const label = isDnp ? "DNP" : String(Math.round(s));
  /* XS_SORARE_POINTS_NORMALIZE_V1: normalize perf -> points[{gw,score}] */
  const xsPoints: XSPerfPoint[] = (() => {
    const raw: any = (perf as any) || {};
    const series = raw.series || raw.points || raw.performances || raw.scores || [];
    if(Array.isArray(series) && series.length && typeof series[0] === "number"){
      return (series as number[]).map((n, i) => ({ gw: String(i+1), score: (typeof n === "number" ? n : null) }));
    }
    if(Array.isArray(series)){
      return (series as any[]).map((p: any) => ({
        gw: p?.gw ?? p?.gameWeek ?? p?.week ?? p?.gameweek,
        score: (typeof p?.score === "number") ? p.score : ((typeof p?.value === "number") ? p.value : null),
      }));
    }
    return [];
  })();
  const xsLast40 = xsPoints.slice(Math.max(0, xsPoints.length - 40));


          return (
            <View key={"xsbar-" + idx} style={{ width: BAR_W, marginRight: (idx === points.length - 1 ? 0 : GAP), alignItems: "center" }}>
              <View style={{ width: BAR_W, height: barH, backgroundColor: bg, borderRadius: 8, justifyContent: "flex-start", alignItems: "center" }}>
                <Text style={{ color: "#0B0C0F", fontWeight: "900", fontSize: 12, marginTop: 6 }}>
                  {isDnp ? "" : label}
                </Text>
              </View>

              {isDnp && (
                <Text style={{ color: "#B0B5BD", fontWeight: "800", fontSize: 12, marginTop: 6 }}>DNP</Text>
              )}

              <Text style={{ color: "#9AA0A6", fontSize: 10, marginTop: 4 }} numberOfLines={1}>
                {p.gw ? ("GW " + String(p.gw)) : ""}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
function xsClamp01(n: number){ return Math.max(0, Math.min(1, n)); }
/* XS_SORARE_FULL_BAR_CHART_V1: Sorare-like bar chart (colors + score label + DNP + GW) */
type XSPerfPoint = { gw?: number | string; score: number | null };

function xsClamp(n: number, a: number, b: number){ return Math.max(a, Math.min(b, n)); }

function xsColorForScore(score: number){
  // Sorare-like (approx)
  if(score < 40) return "#E67E22";     // orange
  if(score < 60) return "#F1C40F";     // yellow
  if(score < 80) return "#2ECC71";     // green
  return "#1ABC9C";                    // teal
}

function XSFullPerfBars({ points }: { points: XSPerfPoint[] }){
  const H = 210;            // chart area height
  const BAR_W = 26;
  const GAP = 10;
  const MAX = 100;
  /* XS_SORARE_POINTS_NORMALIZE_V1: normalize perf -> points[{gw,score}] */
  const xsPoints: XSPerfPoint[] = (() => {
    const raw: any = (perf as any) || {};
    const series = raw.series || raw.points || raw.performances || raw.scores || [];
    if(Array.isArray(series) && series.length && typeof series[0] === "number"){
      return (series as number[]).map((n, i) => ({ gw: String(i+1), score: (typeof n === "number" ? n : null) }));
    }
    if(Array.isArray(series)){
      return (series as any[]).map((p: any) => ({
        gw: p?.gw ?? p?.gameWeek ?? p?.week ?? p?.gameweek,
        score: (typeof p?.score === "number") ? p.score : ((typeof p?.value === "number") ? p.value : null),
      }));
    }
    return [];
  })();
  const xsLast40 = xsPoints.slice(Math.max(0, xsPoints.length - 40));


  return (
    <View style={{ paddingTop: 8 }}>
      <View style={{ height: H, flexDirection: "row", alignItems: "flex-end" }}>
        {points.map((p, idx) => {
          const isDnp = (p.score === null || typeof p.score !== "number" || Number.isNaN(p.score));
          const s = isDnp ? 0 : xsClamp(p.score as number, 0, MAX);
          const ratio = isDnp ? 0.18 : xsClamp(s / MAX, 0.05, 1);
          const barH = Math.round(H * ratio);
          const bg = isDnp ? "#4B4F58" : xsColorForScore(s);
          const label = isDnp ? "DNP" : String(Math.round(s));
  /* XS_SORARE_POINTS_NORMALIZE_V1: normalize perf -> points[{gw,score}] */
  const xsPoints: XSPerfPoint[] = (() => {
    const raw: any = (perf as any) || {};
    const series = raw.series || raw.points || raw.performances || raw.scores || [];
    if(Array.isArray(series) && series.length && typeof series[0] === "number"){
      return (series as number[]).map((n, i) => ({ gw: String(i+1), score: (typeof n === "number" ? n : null) }));
    }
    if(Array.isArray(series)){
      return (series as any[]).map((p: any) => ({
        gw: p?.gw ?? p?.gameWeek ?? p?.week ?? p?.gameweek,
        score: (typeof p?.score === "number") ? p.score : ((typeof p?.value === "number") ? p.value : null),
      }));
    }
    return [];
  })();
  const xsLast40 = xsPoints.slice(Math.max(0, xsPoints.length - 40));


          return (
            <View key={"xsbar-" + idx} style={{ width: BAR_W, marginRight: (idx === points.length - 1 ? 0 : GAP), alignItems: "center" }}>
              <View style={{ width: BAR_W, height: barH, backgroundColor: bg, borderRadius: 8, justifyContent: "flex-start", alignItems: "center" }}>
                <Text style={{ color: "#0B0C0F", fontWeight: "900", fontSize: 12, marginTop: 6 }}>
                  {isDnp ? "" : label}
                </Text>
              </View>

              {isDnp && (
                <Text style={{ color: "#B0B5BD", fontWeight: "800", fontSize: 12, marginTop: 6 }}>DNP</Text>
              )}

              <Text style={{ color: "#9AA0A6", fontSize: 10, marginTop: 4 }} numberOfLines={1}>
                {p.gw ? ("GW " + String(p.gw)) : ""}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
function xsClampScore(n: number){ return Math.max(0, Math.min(100, n)); }
/* XS_SORARE_FULL_BAR_CHART_V1: Sorare-like bar chart (colors + score label + DNP + GW) */
type XSPerfPoint = { gw?: number | string; score: number | null };

function xsClamp(n: number, a: number, b: number){ return Math.max(a, Math.min(b, n)); }

function xsColorForScore(score: number){
  // Sorare-like (approx)
  if(score < 40) return "#E67E22";     // orange
  if(score < 60) return "#F1C40F";     // yellow
  if(score < 80) return "#2ECC71";     // green
  return "#1ABC9C";                    // teal
}

function XSFullPerfBars({ points }: { points: XSPerfPoint[] }){
  const H = 210;            // chart area height
  const BAR_W = 26;
  const GAP = 10;
  const MAX = 100;
  /* XS_SORARE_POINTS_NORMALIZE_V1: normalize perf -> points[{gw,score}] */
  const xsPoints: XSPerfPoint[] = (() => {
    const raw: any = (perf as any) || {};
    const series = raw.series || raw.points || raw.performances || raw.scores || [];
    if(Array.isArray(series) && series.length && typeof series[0] === "number"){
      return (series as number[]).map((n, i) => ({ gw: String(i+1), score: (typeof n === "number" ? n : null) }));
    }
    if(Array.isArray(series)){
      return (series as any[]).map((p: any) => ({
        gw: p?.gw ?? p?.gameWeek ?? p?.week ?? p?.gameweek,
        score: (typeof p?.score === "number") ? p.score : ((typeof p?.value === "number") ? p.value : null),
      }));
    }
    return [];
  })();
  const xsLast40 = xsPoints.slice(Math.max(0, xsPoints.length - 40));


  return (
    <View style={{ paddingTop: 8 }}>
      <View style={{ height: H, flexDirection: "row", alignItems: "flex-end" }}>
        {points.map((p, idx) => {
          const isDnp = (p.score === null || typeof p.score !== "number" || Number.isNaN(p.score));
          const s = isDnp ? 0 : xsClamp(p.score as number, 0, MAX);
          const ratio = isDnp ? 0.18 : xsClamp(s / MAX, 0.05, 1);
          const barH = Math.round(H * ratio);
          const bg = isDnp ? "#4B4F58" : xsColorForScore(s);
          const label = isDnp ? "DNP" : String(Math.round(s));
  /* XS_SORARE_POINTS_NORMALIZE_V1: normalize perf -> points[{gw,score}] */
  const xsPoints: XSPerfPoint[] = (() => {
    const raw: any = (perf as any) || {};
    const series = raw.series || raw.points || raw.performances || raw.scores || [];
    if(Array.isArray(series) && series.length && typeof series[0] === "number"){
      return (series as number[]).map((n, i) => ({ gw: String(i+1), score: (typeof n === "number" ? n : null) }));
    }
    if(Array.isArray(series)){
      return (series as any[]).map((p: any) => ({
        gw: p?.gw ?? p?.gameWeek ?? p?.week ?? p?.gameweek,
        score: (typeof p?.score === "number") ? p.score : ((typeof p?.value === "number") ? p.value : null),
      }));
    }
    return [];
  })();
  const xsLast40 = xsPoints.slice(Math.max(0, xsPoints.length - 40));


          return (
            <View key={"xsbar-" + idx} style={{ width: BAR_W, marginRight: (idx === points.length - 1 ? 0 : GAP), alignItems: "center" }}>
              <View style={{ width: BAR_W, height: barH, backgroundColor: bg, borderRadius: 8, justifyContent: "flex-start", alignItems: "center" }}>
                <Text style={{ color: "#0B0C0F", fontWeight: "900", fontSize: 12, marginTop: 6 }}>
                  {isDnp ? "" : label}
                </Text>
              </View>

              {isDnp && (
                <Text style={{ color: "#B0B5BD", fontWeight: "800", fontSize: 12, marginTop: 6 }}>DNP</Text>
              )}

              <Text style={{ color: "#9AA0A6", fontSize: 10, marginTop: 4 }} numberOfLines={1}>
                {p.gw ? ("GW " + String(p.gw)) : ""}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
function xsColorKey(score: number): "r"|"o"|"y"|"g" {
  if(score >= 70) return "g";
  if(score >= 50) return "y";
  if(score >= 30) return "o";
  return "r";
}

/* XS_SORARE_FULL_BAR_CHART_V1: Sorare-like bar chart (colors + score label + DNP + GW) */
type XSPerfPoint = { gw?: number | string; score: number | null };

function xsClamp(n: number, a: number, b: number){ return Math.max(a, Math.min(b, n)); }

function xsColorForScore(score: number){
  // Sorare-like (approx)
  if(score < 40) return "#E67E22";     // orange
  if(score < 60) return "#F1C40F";     // yellow
  if(score < 80) return "#2ECC71";     // green
  return "#1ABC9C";                    // teal
}

function XSFullPerfBars({ points }: { points: XSPerfPoint[] }){
  const H = 210;            // chart area height
  const BAR_W = 26;
  const GAP = 10;
  const MAX = 100;
  /* XS_SORARE_POINTS_NORMALIZE_V1: normalize perf -> points[{gw,score}] */
  const xsPoints: XSPerfPoint[] = (() => {
    const raw: any = (perf as any) || {};
    const series = raw.series || raw.points || raw.performances || raw.scores || [];
    if(Array.isArray(series) && series.length && typeof series[0] === "number"){
      return (series as number[]).map((n, i) => ({ gw: String(i+1), score: (typeof n === "number" ? n : null) }));
    }
    if(Array.isArray(series)){
      return (series as any[]).map((p: any) => ({
        gw: p?.gw ?? p?.gameWeek ?? p?.week ?? p?.gameweek,
        score: (typeof p?.score === "number") ? p.score : ((typeof p?.value === "number") ? p.value : null),
      }));
    }
    return [];
  })();
  const xsLast40 = xsPoints.slice(Math.max(0, xsPoints.length - 40));


  return (
    <View style={{ paddingTop: 8 }}>
      <View style={{ height: H, flexDirection: "row", alignItems: "flex-end" }}>
        {points.map((p, idx) => {
          const isDnp = (p.score === null || typeof p.score !== "number" || Number.isNaN(p.score));
          const s = isDnp ? 0 : xsClamp(p.score as number, 0, MAX);
          const ratio = isDnp ? 0.18 : xsClamp(s / MAX, 0.05, 1);
          const barH = Math.round(H * ratio);
          const bg = isDnp ? "#4B4F58" : xsColorForScore(s);
          const label = isDnp ? "DNP" : String(Math.round(s));
  /* XS_SORARE_POINTS_NORMALIZE_V1: normalize perf -> points[{gw,score}] */
  const xsPoints: XSPerfPoint[] = (() => {
    const raw: any = (perf as any) || {};
    const series = raw.series || raw.points || raw.performances || raw.scores || [];
    if(Array.isArray(series) && series.length && typeof series[0] === "number"){
      return (series as number[]).map((n, i) => ({ gw: String(i+1), score: (typeof n === "number" ? n : null) }));
    }
    if(Array.isArray(series)){
      return (series as any[]).map((p: any) => ({
        gw: p?.gw ?? p?.gameWeek ?? p?.week ?? p?.gameweek,
        score: (typeof p?.score === "number") ? p.score : ((typeof p?.value === "number") ? p.value : null),
      }));
    }
    return [];
  })();
  const xsLast40 = xsPoints.slice(Math.max(0, xsPoints.length - 40));


          return (
            <View key={"xsbar-" + idx} style={{ width: BAR_W, marginRight: (idx === points.length - 1 ? 0 : GAP), alignItems: "center" }}>
              <View style={{ width: BAR_W, height: barH, backgroundColor: bg, borderRadius: 8, justifyContent: "flex-start", alignItems: "center" }}>
                <Text style={{ color: "#0B0C0F", fontWeight: "900", fontSize: 12, marginTop: 6 }}>
                  {isDnp ? "" : label}
                </Text>
              </View>

              {isDnp && (
                <Text style={{ color: "#B0B5BD", fontWeight: "800", fontSize: 12, marginTop: 6 }}>DNP</Text>
              )}

              <Text style={{ color: "#9AA0A6", fontSize: 10, marginTop: 4 }} numberOfLines={1}>
                {p.gw ? ("GW " + String(p.gw)) : ""}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
function XSScorePill({ label, value }: { label: string; value: number | null | undefined }){
  const v = (typeof value === "number" && Number.isFinite(value)) ? Math.round(value) : null;
  /* XS_SORARE_POINTS_NORMALIZE_V1: normalize perf -> points[{gw,score}] */
  const xsPoints: XSPerfPoint[] = (() => {
    const raw: any = (perf as any) || {};
    const series = raw.series || raw.points || raw.performances || raw.scores || [];
    if(Array.isArray(series) && series.length && typeof series[0] === "number"){
      return (series as number[]).map((n, i) => ({ gw: String(i+1), score: (typeof n === "number" ? n : null) }));
    }
    if(Array.isArray(series)){
      return (series as any[]).map((p: any) => ({
        gw: p?.gw ?? p?.gameWeek ?? p?.week ?? p?.gameweek,
        score: (typeof p?.score === "number") ? p.score : ((typeof p?.value === "number") ? p.value : null),
      }));
    }
    return [];
  })();
  const xsLast40 = xsPoints.slice(Math.max(0, xsPoints.length - 40));

  return (
    <View style={{ alignItems: "center", gap: 6 }}>      <Text style={{ color: "#9aa0a6", fontSize: 12 }}>{label}</Text>
      <View style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: "#141414", borderWidth: 1, borderColor: "#242424", minWidth: 54, alignItems: "center" }}>
        <Text style={{ color: "white", fontWeight: "700" }}>{v == null ? "—" : String(v)}</Text>
      </View>
    </View>
  );
}

/* XS_SORARE_FULL_BAR_CHART_V1: Sorare-like bar chart (colors + score label + DNP + GW) */
type XSPerfPoint = { gw?: number | string; score: number | null };

function xsClamp(n: number, a: number, b: number){ return Math.max(a, Math.min(b, n)); }

function xsColorForScore(score: number){
  // Sorare-like (approx)
  if(score < 40) return "#E67E22";     // orange
  if(score < 60) return "#F1C40F";     // yellow
  if(score < 80) return "#2ECC71";     // green
  return "#1ABC9C";                    // teal
}

function XSFullPerfBars({ points }: { points: XSPerfPoint[] }){
  const H = 210;            // chart area height
  const BAR_W = 26;
  const GAP = 10;
  const MAX = 100;
  /* XS_SORARE_POINTS_NORMALIZE_V1: normalize perf -> points[{gw,score}] */
  const xsPoints: XSPerfPoint[] = (() => {
    const raw: any = (perf as any) || {};
    const series = raw.series || raw.points || raw.performances || raw.scores || [];
    if(Array.isArray(series) && series.length && typeof series[0] === "number"){
      return (series as number[]).map((n, i) => ({ gw: String(i+1), score: (typeof n === "number" ? n : null) }));
    }
    if(Array.isArray(series)){
      return (series as any[]).map((p: any) => ({
        gw: p?.gw ?? p?.gameWeek ?? p?.week ?? p?.gameweek,
        score: (typeof p?.score === "number") ? p.score : ((typeof p?.value === "number") ? p.value : null),
      }));
    }
    return [];
  })();
  const xsLast40 = xsPoints.slice(Math.max(0, xsPoints.length - 40));


  return (
    <View style={{ paddingTop: 8 }}>
      <View style={{ height: H, flexDirection: "row", alignItems: "flex-end" }}>
        {points.map((p, idx) => {
          const isDnp = (p.score === null || typeof p.score !== "number" || Number.isNaN(p.score));
          const s = isDnp ? 0 : xsClamp(p.score as number, 0, MAX);
          const ratio = isDnp ? 0.18 : xsClamp(s / MAX, 0.05, 1);
          const barH = Math.round(H * ratio);
          const bg = isDnp ? "#4B4F58" : xsColorForScore(s);
          const label = isDnp ? "DNP" : String(Math.round(s));
  /* XS_SORARE_POINTS_NORMALIZE_V1: normalize perf -> points[{gw,score}] */
  const xsPoints: XSPerfPoint[] = (() => {
    const raw: any = (perf as any) || {};
    const series = raw.series || raw.points || raw.performances || raw.scores || [];
    if(Array.isArray(series) && series.length && typeof series[0] === "number"){
      return (series as number[]).map((n, i) => ({ gw: String(i+1), score: (typeof n === "number" ? n : null) }));
    }
    if(Array.isArray(series)){
      return (series as any[]).map((p: any) => ({
        gw: p?.gw ?? p?.gameWeek ?? p?.week ?? p?.gameweek,
        score: (typeof p?.score === "number") ? p.score : ((typeof p?.value === "number") ? p.value : null),
      }));
    }
    return [];
  })();
  const xsLast40 = xsPoints.slice(Math.max(0, xsPoints.length - 40));


          return (
            <View key={"xsbar-" + idx} style={{ width: BAR_W, marginRight: (idx === points.length - 1 ? 0 : GAP), alignItems: "center" }}>
              <View style={{ width: BAR_W, height: barH, backgroundColor: bg, borderRadius: 8, justifyContent: "flex-start", alignItems: "center" }}>
                <Text style={{ color: "#0B0C0F", fontWeight: "900", fontSize: 12, marginTop: 6 }}>
                  {isDnp ? "" : label}
                </Text>
              </View>

              {isDnp && (
                <Text style={{ color: "#B0B5BD", fontWeight: "800", fontSize: 12, marginTop: 6 }}>DNP</Text>
              )}

              <Text style={{ color: "#9AA0A6", fontSize: 10, marginTop: 4 }} numberOfLines={1}>
                {p.gw ? ("GW " + String(p.gw)) : ""}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
function XSPerfChart({ scores }: { scores: number[] }){
  const arr = (Array.isArray(scores) ? scores : []).slice(-15).map((n) => xsClampScore(n));
  const max = 100;
  /* XS_SORARE_POINTS_NORMALIZE_V1: normalize perf -> points[{gw,score}] */
  const xsPoints: XSPerfPoint[] = (() => {
    const raw: any = (perf as any) || {};
    const series = raw.series || raw.points || raw.performances || raw.scores || [];
    if(Array.isArray(series) && series.length && typeof series[0] === "number"){
      return (series as number[]).map((n, i) => ({ gw: String(i+1), score: (typeof n === "number" ? n : null) }));
    }
    if(Array.isArray(series)){
      return (series as any[]).map((p: any) => ({
        gw: p?.gw ?? p?.gameWeek ?? p?.week ?? p?.gameweek,
        score: (typeof p?.score === "number") ? p.score : ((typeof p?.value === "number") ? p.value : null),
      }));
    }
    return [];
  })();
  const xsLast40 = xsPoints.slice(Math.max(0, xsPoints.length - 40));

  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8, paddingVertical: 12 }}>      {arr.length === 0 ? (
        <Text style={{ color: "#9aa0a6" }}>Historique indisponible (mode public / pas encore sync).</Text>
      ) : arr.map((s, i) => {
        const h = Math.round(10 + xsClamp01(s / max) * 110);
        const key = xsColorKey(s);
        const bg = key === "g" ? "#22c55e" : (key === "y" ? "#facc15" : (key === "o" ? "#fb923c" : "#ef4444"));
  /* XS_SORARE_POINTS_NORMALIZE_V1: normalize perf -> points[{gw,score}] */
  const xsPoints: XSPerfPoint[] = (() => {
    const raw: any = (perf as any) || {};
    const series = raw.series || raw.points || raw.performances || raw.scores || [];
    if(Array.isArray(series) && series.length && typeof series[0] === "number"){
      return (series as number[]).map((n, i) => ({ gw: String(i+1), score: (typeof n === "number" ? n : null) }));
    }
    if(Array.isArray(series)){
      return (series as any[]).map((p: any) => ({
        gw: p?.gw ?? p?.gameWeek ?? p?.week ?? p?.gameweek,
        score: (typeof p?.score === "number") ? p.score : ((typeof p?.value === "number") ? p.value : null),
      }));
    }
    return [];
  })();
  const xsLast40 = xsPoints.slice(Math.max(0, xsPoints.length - 40));

        return (
          <View key={i} style={{ width: 16, height: h, borderRadius: 8, backgroundColor: bg, opacity: 0.92 }} />        );
      })}
    </View>
  );
}

/* XS_SORARE_FULL_BAR_CHART_V1: Sorare-like bar chart (colors + score label + DNP + GW) */
type XSPerfPoint = { gw?: number | string; score: number | null };

function xsClamp(n: number, a: number, b: number){ return Math.max(a, Math.min(b, n)); }

function xsColorForScore(score: number){
  // Sorare-like (approx)
  if(score < 40) return "#E67E22";     // orange
  if(score < 60) return "#F1C40F";     // yellow
  if(score < 80) return "#2ECC71";     // green
  return "#1ABC9C";                    // teal
}

function XSFullPerfBars({ points }: { points: XSPerfPoint[] }){
  const H = 210;            // chart area height
  const BAR_W = 26;
  const GAP = 10;
  const MAX = 100;
  /* XS_SORARE_POINTS_NORMALIZE_V1: normalize perf -> points[{gw,score}] */
  const xsPoints: XSPerfPoint[] = (() => {
    const raw: any = (perf as any) || {};
    const series = raw.series || raw.points || raw.performances || raw.scores || [];
    if(Array.isArray(series) && series.length && typeof series[0] === "number"){
      return (series as number[]).map((n, i) => ({ gw: String(i+1), score: (typeof n === "number" ? n : null) }));
    }
    if(Array.isArray(series)){
      return (series as any[]).map((p: any) => ({
        gw: p?.gw ?? p?.gameWeek ?? p?.week ?? p?.gameweek,
        score: (typeof p?.score === "number") ? p.score : ((typeof p?.value === "number") ? p.value : null),
      }));
    }
    return [];
  })();
  const xsLast40 = xsPoints.slice(Math.max(0, xsPoints.length - 40));


  return (
    <View style={{ paddingTop: 8 }}>
      <View style={{ height: H, flexDirection: "row", alignItems: "flex-end" }}>
        {points.map((p, idx) => {
          const isDnp = (p.score === null || typeof p.score !== "number" || Number.isNaN(p.score));
          const s = isDnp ? 0 : xsClamp(p.score as number, 0, MAX);
          const ratio = isDnp ? 0.18 : xsClamp(s / MAX, 0.05, 1);
          const barH = Math.round(H * ratio);
          const bg = isDnp ? "#4B4F58" : xsColorForScore(s);
          const label = isDnp ? "DNP" : String(Math.round(s));
  /* XS_SORARE_POINTS_NORMALIZE_V1: normalize perf -> points[{gw,score}] */
  const xsPoints: XSPerfPoint[] = (() => {
    const raw: any = (perf as any) || {};
    const series = raw.series || raw.points || raw.performances || raw.scores || [];
    if(Array.isArray(series) && series.length && typeof series[0] === "number"){
      return (series as number[]).map((n, i) => ({ gw: String(i+1), score: (typeof n === "number" ? n : null) }));
    }
    if(Array.isArray(series)){
      return (series as any[]).map((p: any) => ({
        gw: p?.gw ?? p?.gameWeek ?? p?.week ?? p?.gameweek,
        score: (typeof p?.score === "number") ? p.score : ((typeof p?.value === "number") ? p.value : null),
      }));
    }
    return [];
  })();
  const xsLast40 = xsPoints.slice(Math.max(0, xsPoints.length - 40));


          return (
            <View key={"xsbar-" + idx} style={{ width: BAR_W, marginRight: (idx === points.length - 1 ? 0 : GAP), alignItems: "center" }}>
              <View style={{ width: BAR_W, height: barH, backgroundColor: bg, borderRadius: 8, justifyContent: "flex-start", alignItems: "center" }}>
                <Text style={{ color: "#0B0C0F", fontWeight: "900", fontSize: 12, marginTop: 6 }}>
                  {isDnp ? "" : label}
                </Text>
              </View>

              {isDnp && (
                <Text style={{ color: "#B0B5BD", fontWeight: "800", fontSize: 12, marginTop: 6 }}>DNP</Text>
              )}

              <Text style={{ color: "#9AA0A6", fontSize: 10, marginTop: 4 }} numberOfLines={1}>
                {p.gw ? ("GW " + String(p.gw)) : ""}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
function XSPerformanceSection({ card, perf }: { card: any; perf?: any }){ /* XS_CARD_PUBLIC_PLAYER_PERF_SECTION_SIG_V4 */
  const l5  = (typeof perf?.l5 === "number") ? perf.l5 : ((typeof card?.l5 === "number") ? card.l5 : null); /* XS_CARD_PUBLIC_PLAYER_PERF_L5_V4 */
  const l10 = (typeof card?.l10 === "number") ? card.l10 : null;
  const l40 = (typeof card?.l40 === "number") ? card.l40 : null;

  const raw =
    perf?.recentScores ?? /* XS_CARD_PUBLIC_PLAYER_PERF_RAW_V4 */
    card?.recentScores ??
    card?.scores ??
    card?.lastScores ??
    card?.player?.recentScores ??
    card?.anyPlayer?.recentScores ??
    [];

  const scores = Array.isArray(raw) ? raw.map((x: any) => {
    const v = (typeof x === "number") ? x : (typeof x === "string" ? Number(x) : (x?.score ?? x?.total ?? x?.value));
    const n = (typeof v === "number") ? v : (typeof v === "string" ? Number(v) : NaN);
    return Number.isFinite(n) ? xsClampScore(n) : null;
  }).filter((n: any) => typeof n === "number") : [];
  /* XS_SORARE_POINTS_NORMALIZE_V1: normalize perf -> points[{gw,score}] */
  const xsPoints: XSPerfPoint[] = (() => {
    const raw: any = (perf as any) || {};
    const series = raw.series || raw.points || raw.performances || raw.scores || [];
    if(Array.isArray(series) && series.length && typeof series[0] === "number"){
      return (series as number[]).map((n, i) => ({ gw: String(i+1), score: (typeof n === "number" ? n : null) }));
    }
    if(Array.isArray(series)){
      return (series as any[]).map((p: any) => ({
        gw: p?.gw ?? p?.gameWeek ?? p?.week ?? p?.gameweek,
        score: (typeof p?.score === "number") ? p.score : ((typeof p?.value === "number") ? p.value : null),
      }));
    }
    return [];
  })();
  const xsLast40 = xsPoints.slice(Math.max(0, xsPoints.length - 40));


  return (
    <View style={{ marginTop: 16, padding: 14, borderRadius: 16, backgroundColor: "#0f0f0f", borderWidth: 1, borderColor: "#1f1f1f" }}>      <Text style={{ color: "white", fontSize: 18, fontWeight: "800", marginBottom: 10 }}>Performance du joueur</Text>

      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
        <XSScorePill label="5 derniers" value={l5} />
        <XSScorePill label="10 derniers" value={l10} />
        <XSScorePill label="40 derniers" value={l40} />
      </View>

      <XSPerfChart scores={scores} />
    </View>
  );
}
/* XS_PERF_SECTION_V1_END */

/**
 * XS_CARD_DETAIL_SCREEN_V3
 * - Affiche Prix + L15 + infos détaillées
 * - N'affiche PAS la rareté (même si dispo)
 * - PS-safe: pas de template strings/backticks
 */

/* XS_SORARE_FULL_BAR_CHART_V1: Sorare-like bar chart (colors + score label + DNP + GW) */
type XSPerfPoint = { gw?: number | string; score: number | null };

function xsClamp(n: number, a: number, b: number){ return Math.max(a, Math.min(b, n)); }

function xsColorForScore(score: number){
  // Sorare-like (approx)
  if(score < 40) return "#E67E22";     // orange
  if(score < 60) return "#F1C40F";     // yellow
  if(score < 80) return "#2ECC71";     // green
  return "#1ABC9C";                    // teal
}

function XSFullPerfBars({ points }: { points: XSPerfPoint[] }){
  const H = 210;            // chart area height
  const BAR_W = 26;
  const GAP = 10;
  const MAX = 100;
  /* XS_SORARE_POINTS_NORMALIZE_V1: normalize perf -> points[{gw,score}] */
  const xsPoints: XSPerfPoint[] = (() => {
    const raw: any = (perf as any) || {};
    const series = raw.series || raw.points || raw.performances || raw.scores || [];
    if(Array.isArray(series) && series.length && typeof series[0] === "number"){
      return (series as number[]).map((n, i) => ({ gw: String(i+1), score: (typeof n === "number" ? n : null) }));
    }
    if(Array.isArray(series)){
      return (series as any[]).map((p: any) => ({
        gw: p?.gw ?? p?.gameWeek ?? p?.week ?? p?.gameweek,
        score: (typeof p?.score === "number") ? p.score : ((typeof p?.value === "number") ? p.value : null),
      }));
    }
    return [];
  })();
  const xsLast40 = xsPoints.slice(Math.max(0, xsPoints.length - 40));


  return (
    <View style={{ paddingTop: 8 }}>
      <View style={{ height: H, flexDirection: "row", alignItems: "flex-end" }}>
        {points.map((p, idx) => {
          const isDnp = (p.score === null || typeof p.score !== "number" || Number.isNaN(p.score));
          const s = isDnp ? 0 : xsClamp(p.score as number, 0, MAX);
          const ratio = isDnp ? 0.18 : xsClamp(s / MAX, 0.05, 1);
          const barH = Math.round(H * ratio);
          const bg = isDnp ? "#4B4F58" : xsColorForScore(s);
          const label = isDnp ? "DNP" : String(Math.round(s));
  /* XS_SORARE_POINTS_NORMALIZE_V1: normalize perf -> points[{gw,score}] */
  const xsPoints: XSPerfPoint[] = (() => {
    const raw: any = (perf as any) || {};
    const series = raw.series || raw.points || raw.performances || raw.scores || [];
    if(Array.isArray(series) && series.length && typeof series[0] === "number"){
      return (series as number[]).map((n, i) => ({ gw: String(i+1), score: (typeof n === "number" ? n : null) }));
    }
    if(Array.isArray(series)){
      return (series as any[]).map((p: any) => ({
        gw: p?.gw ?? p?.gameWeek ?? p?.week ?? p?.gameweek,
        score: (typeof p?.score === "number") ? p.score : ((typeof p?.value === "number") ? p.value : null),
      }));
    }
    return [];
  })();
  const xsLast40 = xsPoints.slice(Math.max(0, xsPoints.length - 40));


          return (
            <View key={"xsbar-" + idx} style={{ width: BAR_W, marginRight: (idx === points.length - 1 ? 0 : GAP), alignItems: "center" }}>
              <View style={{ width: BAR_W, height: barH, backgroundColor: bg, borderRadius: 8, justifyContent: "flex-start", alignItems: "center" }}>
                <Text style={{ color: "#0B0C0F", fontWeight: "900", fontSize: 12, marginTop: 6 }}>
                  {isDnp ? "" : label}
                </Text>
              </View>

              {isDnp && (
                <Text style={{ color: "#B0B5BD", fontWeight: "800", fontSize: 12, marginTop: 6 }}>DNP</Text>
              )}

              <Text style={{ color: "#9AA0A6", fontSize: 10, marginTop: 4 }} numberOfLines={1}>
                {p.gw ? ("GW " + String(p.gw)) : ""}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
function asFinite(v: unknown): number | null {
  if (typeof v !== "number") return null;
  return Number.isFinite(v) ? v : null;
}

/* XS_SORARE_FULL_BAR_CHART_V1: Sorare-like bar chart (colors + score label + DNP + GW) */
type XSPerfPoint = { gw?: number | string; score: number | null };

function xsClamp(n: number, a: number, b: number){ return Math.max(a, Math.min(b, n)); }

function xsColorForScore(score: number){
  // Sorare-like (approx)
  if(score < 40) return "#E67E22";     // orange
  if(score < 60) return "#F1C40F";     // yellow
  if(score < 80) return "#2ECC71";     // green
  return "#1ABC9C";                    // teal
}

function XSFullPerfBars({ points }: { points: XSPerfPoint[] }){
  const H = 210;            // chart area height
  const BAR_W = 26;
  const GAP = 10;
  const MAX = 100;
  /* XS_SORARE_POINTS_NORMALIZE_V1: normalize perf -> points[{gw,score}] */
  const xsPoints: XSPerfPoint[] = (() => {
    const raw: any = (perf as any) || {};
    const series = raw.series || raw.points || raw.performances || raw.scores || [];
    if(Array.isArray(series) && series.length && typeof series[0] === "number"){
      return (series as number[]).map((n, i) => ({ gw: String(i+1), score: (typeof n === "number" ? n : null) }));
    }
    if(Array.isArray(series)){
      return (series as any[]).map((p: any) => ({
        gw: p?.gw ?? p?.gameWeek ?? p?.week ?? p?.gameweek,
        score: (typeof p?.score === "number") ? p.score : ((typeof p?.value === "number") ? p.value : null),
      }));
    }
    return [];
  })();
  const xsLast40 = xsPoints.slice(Math.max(0, xsPoints.length - 40));


  return (
    <View style={{ paddingTop: 8 }}>
      <View style={{ height: H, flexDirection: "row", alignItems: "flex-end" }}>
        {points.map((p, idx) => {
          const isDnp = (p.score === null || typeof p.score !== "number" || Number.isNaN(p.score));
          const s = isDnp ? 0 : xsClamp(p.score as number, 0, MAX);
          const ratio = isDnp ? 0.18 : xsClamp(s / MAX, 0.05, 1);
          const barH = Math.round(H * ratio);
          const bg = isDnp ? "#4B4F58" : xsColorForScore(s);
          const label = isDnp ? "DNP" : String(Math.round(s));
  /* XS_SORARE_POINTS_NORMALIZE_V1: normalize perf -> points[{gw,score}] */
  const xsPoints: XSPerfPoint[] = (() => {
    const raw: any = (perf as any) || {};
    const series = raw.series || raw.points || raw.performances || raw.scores || [];
    if(Array.isArray(series) && series.length && typeof series[0] === "number"){
      return (series as number[]).map((n, i) => ({ gw: String(i+1), score: (typeof n === "number" ? n : null) }));
    }
    if(Array.isArray(series)){
      return (series as any[]).map((p: any) => ({
        gw: p?.gw ?? p?.gameWeek ?? p?.week ?? p?.gameweek,
        score: (typeof p?.score === "number") ? p.score : ((typeof p?.value === "number") ? p.value : null),
      }));
    }
    return [];
  })();
  const xsLast40 = xsPoints.slice(Math.max(0, xsPoints.length - 40));


          return (
            <View key={"xsbar-" + idx} style={{ width: BAR_W, marginRight: (idx === points.length - 1 ? 0 : GAP), alignItems: "center" }}>
              <View style={{ width: BAR_W, height: barH, backgroundColor: bg, borderRadius: 8, justifyContent: "flex-start", alignItems: "center" }}>
                <Text style={{ color: "#0B0C0F", fontWeight: "900", fontSize: 12, marginTop: 6 }}>
                  {isDnp ? "" : label}
                </Text>
              </View>

              {isDnp && (
                <Text style={{ color: "#B0B5BD", fontWeight: "800", fontSize: 12, marginTop: 6 }}>DNP</Text>
              )}

              <Text style={{ color: "#9AA0A6", fontSize: 10, marginTop: 4 }} numberOfLines={1}>
                {p.gw ? ("GW " + String(p.gw)) : ""}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
function formatEur(v: unknown): string {
  const n = asFinite(v);
  if (n === null) return "—";
  return n.toFixed(2) + " €";
}

/* XS_SORARE_FULL_BAR_CHART_V1: Sorare-like bar chart (colors + score label + DNP + GW) */
type XSPerfPoint = { gw?: number | string; score: number | null };

function xsClamp(n: number, a: number, b: number){ return Math.max(a, Math.min(b, n)); }

function xsColorForScore(score: number){
  // Sorare-like (approx)
  if(score < 40) return "#E67E22";     // orange
  if(score < 60) return "#F1C40F";     // yellow
  if(score < 80) return "#2ECC71";     // green
  return "#1ABC9C";                    // teal
}

function XSFullPerfBars({ points }: { points: XSPerfPoint[] }){
  const H = 210;            // chart area height
  const BAR_W = 26;
  const GAP = 10;
  const MAX = 100;
  /* XS_SORARE_POINTS_NORMALIZE_V1: normalize perf -> points[{gw,score}] */
  const xsPoints: XSPerfPoint[] = (() => {
    const raw: any = (perf as any) || {};
    const series = raw.series || raw.points || raw.performances || raw.scores || [];
    if(Array.isArray(series) && series.length && typeof series[0] === "number"){
      return (series as number[]).map((n, i) => ({ gw: String(i+1), score: (typeof n === "number" ? n : null) }));
    }
    if(Array.isArray(series)){
      return (series as any[]).map((p: any) => ({
        gw: p?.gw ?? p?.gameWeek ?? p?.week ?? p?.gameweek,
        score: (typeof p?.score === "number") ? p.score : ((typeof p?.value === "number") ? p.value : null),
      }));
    }
    return [];
  })();
  const xsLast40 = xsPoints.slice(Math.max(0, xsPoints.length - 40));


  return (
    <View style={{ paddingTop: 8 }}>
      <View style={{ height: H, flexDirection: "row", alignItems: "flex-end" }}>
        {points.map((p, idx) => {
          const isDnp = (p.score === null || typeof p.score !== "number" || Number.isNaN(p.score));
          const s = isDnp ? 0 : xsClamp(p.score as number, 0, MAX);
          const ratio = isDnp ? 0.18 : xsClamp(s / MAX, 0.05, 1);
          const barH = Math.round(H * ratio);
          const bg = isDnp ? "#4B4F58" : xsColorForScore(s);
          const label = isDnp ? "DNP" : String(Math.round(s));
  /* XS_SORARE_POINTS_NORMALIZE_V1: normalize perf -> points[{gw,score}] */
  const xsPoints: XSPerfPoint[] = (() => {
    const raw: any = (perf as any) || {};
    const series = raw.series || raw.points || raw.performances || raw.scores || [];
    if(Array.isArray(series) && series.length && typeof series[0] === "number"){
      return (series as number[]).map((n, i) => ({ gw: String(i+1), score: (typeof n === "number" ? n : null) }));
    }
    if(Array.isArray(series)){
      return (series as any[]).map((p: any) => ({
        gw: p?.gw ?? p?.gameWeek ?? p?.week ?? p?.gameweek,
        score: (typeof p?.score === "number") ? p.score : ((typeof p?.value === "number") ? p.value : null),
      }));
    }
    return [];
  })();
  const xsLast40 = xsPoints.slice(Math.max(0, xsPoints.length - 40));


          return (
            <View key={"xsbar-" + idx} style={{ width: BAR_W, marginRight: (idx === points.length - 1 ? 0 : GAP), alignItems: "center" }}>
              <View style={{ width: BAR_W, height: barH, backgroundColor: bg, borderRadius: 8, justifyContent: "flex-start", alignItems: "center" }}>
                <Text style={{ color: "#0B0C0F", fontWeight: "900", fontSize: 12, marginTop: 6 }}>
                  {isDnp ? "" : label}
                </Text>
              </View>

              {isDnp && (
                <Text style={{ color: "#B0B5BD", fontWeight: "800", fontSize: 12, marginTop: 6 }}>DNP</Text>
              )}

              <Text style={{ color: "#9AA0A6", fontSize: 10, marginTop: 4 }} numberOfLines={1}>
                {p.gw ? ("GW " + String(p.gw)) : ""}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
function pickStr(v: unknown): string {
  return typeof v === "string" && v.trim() ? v.trim() : "—";
}

/* XS_SORARE_FULL_BAR_CHART_V1: Sorare-like bar chart (colors + score label + DNP + GW) */
type XSPerfPoint = { gw?: number | string; score: number | null };

function xsClamp(n: number, a: number, b: number){ return Math.max(a, Math.min(b, n)); }

function xsColorForScore(score: number){
  // Sorare-like (approx)
  if(score < 40) return "#E67E22";     // orange
  if(score < 60) return "#F1C40F";     // yellow
  if(score < 80) return "#2ECC71";     // green
  return "#1ABC9C";                    // teal
}

function XSFullPerfBars({ points }: { points: XSPerfPoint[] }){
  const H = 210;            // chart area height
  const BAR_W = 26;
  const GAP = 10;
  const MAX = 100;
  /* XS_SORARE_POINTS_NORMALIZE_V1: normalize perf -> points[{gw,score}] */
  const xsPoints: XSPerfPoint[] = (() => {
    const raw: any = (perf as any) || {};
    const series = raw.series || raw.points || raw.performances || raw.scores || [];
    if(Array.isArray(series) && series.length && typeof series[0] === "number"){
      return (series as number[]).map((n, i) => ({ gw: String(i+1), score: (typeof n === "number" ? n : null) }));
    }
    if(Array.isArray(series)){
      return (series as any[]).map((p: any) => ({
        gw: p?.gw ?? p?.gameWeek ?? p?.week ?? p?.gameweek,
        score: (typeof p?.score === "number") ? p.score : ((typeof p?.value === "number") ? p.value : null),
      }));
    }
    return [];
  })();
  const xsLast40 = xsPoints.slice(Math.max(0, xsPoints.length - 40));


  return (
    <View style={{ paddingTop: 8 }}>
      <View style={{ height: H, flexDirection: "row", alignItems: "flex-end" }}>
        {points.map((p, idx) => {
          const isDnp = (p.score === null || typeof p.score !== "number" || Number.isNaN(p.score));
          const s = isDnp ? 0 : xsClamp(p.score as number, 0, MAX);
          const ratio = isDnp ? 0.18 : xsClamp(s / MAX, 0.05, 1);
          const barH = Math.round(H * ratio);
          const bg = isDnp ? "#4B4F58" : xsColorForScore(s);
          const label = isDnp ? "DNP" : String(Math.round(s));
  /* XS_SORARE_POINTS_NORMALIZE_V1: normalize perf -> points[{gw,score}] */
  const xsPoints: XSPerfPoint[] = (() => {
    const raw: any = (perf as any) || {};
    const series = raw.series || raw.points || raw.performances || raw.scores || [];
    if(Array.isArray(series) && series.length && typeof series[0] === "number"){
      return (series as number[]).map((n, i) => ({ gw: String(i+1), score: (typeof n === "number" ? n : null) }));
    }
    if(Array.isArray(series)){
      return (series as any[]).map((p: any) => ({
        gw: p?.gw ?? p?.gameWeek ?? p?.week ?? p?.gameweek,
        score: (typeof p?.score === "number") ? p.score : ((typeof p?.value === "number") ? p.value : null),
      }));
    }
    return [];
  })();
  const xsLast40 = xsPoints.slice(Math.max(0, xsPoints.length - 40));


          return (
            <View key={"xsbar-" + idx} style={{ width: BAR_W, marginRight: (idx === points.length - 1 ? 0 : GAP), alignItems: "center" }}>
              <View style={{ width: BAR_W, height: barH, backgroundColor: bg, borderRadius: 8, justifyContent: "flex-start", alignItems: "center" }}>
                <Text style={{ color: "#0B0C0F", fontWeight: "900", fontSize: 12, marginTop: 6 }}>
                  {isDnp ? "" : label}
                </Text>
              </View>

              {isDnp && (
                <Text style={{ color: "#B0B5BD", fontWeight: "800", fontSize: 12, marginTop: 6 }}>DNP</Text>
              )}

              <Text style={{ color: "#9AA0A6", fontSize: 10, marginTop: 4 }} numberOfLines={1}>
                {p.gw ? ("GW " + String(p.gw)) : ""}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
function pickL15(card: any): string {
  const v =
    card?.l15 ??
    card?.L15 ??
    card?.l15Score ??
    card?.l15Avg ??
    card?.last15 ??
    card?.last15Avg ??
    card?.scoreL15 ??
    null;
  const n = asFinite(v);
  return n === null ? "—" : n.toFixed(1);
}

/* XS_SORARE_FULL_BAR_CHART_V1: Sorare-like bar chart (colors + score label + DNP + GW) */
type XSPerfPoint = { gw?: number | string; score: number | null };

function xsClamp(n: number, a: number, b: number){ return Math.max(a, Math.min(b, n)); }

function xsColorForScore(score: number){
  // Sorare-like (approx)
  if(score < 40) return "#E67E22";     // orange
  if(score < 60) return "#F1C40F";     // yellow
  if(score < 80) return "#2ECC71";     // green
  return "#1ABC9C";                    // teal
}

function XSFullPerfBars({ points }: { points: XSPerfPoint[] }){
  const H = 210;            // chart area height
  const BAR_W = 26;
  const GAP = 10;
  const MAX = 100;
  /* XS_SORARE_POINTS_NORMALIZE_V1: normalize perf -> points[{gw,score}] */
  const xsPoints: XSPerfPoint[] = (() => {
    const raw: any = (perf as any) || {};
    const series = raw.series || raw.points || raw.performances || raw.scores || [];
    if(Array.isArray(series) && series.length && typeof series[0] === "number"){
      return (series as number[]).map((n, i) => ({ gw: String(i+1), score: (typeof n === "number" ? n : null) }));
    }
    if(Array.isArray(series)){
      return (series as any[]).map((p: any) => ({
        gw: p?.gw ?? p?.gameWeek ?? p?.week ?? p?.gameweek,
        score: (typeof p?.score === "number") ? p.score : ((typeof p?.value === "number") ? p.value : null),
      }));
    }
    return [];
  })();
  const xsLast40 = xsPoints.slice(Math.max(0, xsPoints.length - 40));


  return (
    <View style={{ paddingTop: 8 }}>
      <View style={{ height: H, flexDirection: "row", alignItems: "flex-end" }}>
        {points.map((p, idx) => {
          const isDnp = (p.score === null || typeof p.score !== "number" || Number.isNaN(p.score));
          const s = isDnp ? 0 : xsClamp(p.score as number, 0, MAX);
          const ratio = isDnp ? 0.18 : xsClamp(s / MAX, 0.05, 1);
          const barH = Math.round(H * ratio);
          const bg = isDnp ? "#4B4F58" : xsColorForScore(s);
          const label = isDnp ? "DNP" : String(Math.round(s));
  /* XS_SORARE_POINTS_NORMALIZE_V1: normalize perf -> points[{gw,score}] */
  const xsPoints: XSPerfPoint[] = (() => {
    const raw: any = (perf as any) || {};
    const series = raw.series || raw.points || raw.performances || raw.scores || [];
    if(Array.isArray(series) && series.length && typeof series[0] === "number"){
      return (series as number[]).map((n, i) => ({ gw: String(i+1), score: (typeof n === "number" ? n : null) }));
    }
    if(Array.isArray(series)){
      return (series as any[]).map((p: any) => ({
        gw: p?.gw ?? p?.gameWeek ?? p?.week ?? p?.gameweek,
        score: (typeof p?.score === "number") ? p.score : ((typeof p?.value === "number") ? p.value : null),
      }));
    }
    return [];
  })();
  const xsLast40 = xsPoints.slice(Math.max(0, xsPoints.length - 40));


          return (
            <View key={"xsbar-" + idx} style={{ width: BAR_W, marginRight: (idx === points.length - 1 ? 0 : GAP), alignItems: "center" }}>
              <View style={{ width: BAR_W, height: barH, backgroundColor: bg, borderRadius: 8, justifyContent: "flex-start", alignItems: "center" }}>
                <Text style={{ color: "#0B0C0F", fontWeight: "900", fontSize: 12, marginTop: 6 }}>
                  {isDnp ? "" : label}
                </Text>
              </View>

              {isDnp && (
                <Text style={{ color: "#B0B5BD", fontWeight: "800", fontSize: 12, marginTop: 6 }}>DNP</Text>
              )}

              <Text style={{ color: "#9AA0A6", fontSize: 10, marginTop: 4 }} numberOfLines={1}>
                {p.gw ? ("GW " + String(p.gw)) : ""}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
export default function CardDetailScreen() {
  const params = useLocalSearchParams();
  const id = String((params as any)?.id || "").trim();

  const card = useMemo(() => {
    if (!id) return null;
    return xsCardNavGet(id);
  }, [id]);

  const [xsPerfRemote, setXsPerfRemote] = React.useState<any>(null); /* XS_CARD_PUBLIC_PLAYER_PERF_HOOK_V4 */

  /* XS_CARD_PUBLIC_PLAYER_PERF_EFFECT_V4_BEGIN */
  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const slug =
          (card as any)?.playerSlug ??
          (card as any)?.player?.slug ??
          (card as any)?.anyPlayer?.slug ??
          null;

        if (!slug) {
          if (alive) setXsPerfRemote(null);
          return;
        }

        const perf = await publicPlayerPerformance(String(slug));
        if (alive) setXsPerfRemote(perf || null);
      } catch {
        if (alive) setXsPerfRemote(null);
      }
    })();
  /* XS_SORARE_POINTS_NORMALIZE_V1: normalize perf -> points[{gw,score}] */
  const xsPoints: XSPerfPoint[] = (() => {
    const raw: any = (perf as any) || {};
    const series = raw.series || raw.points || raw.performances || raw.scores || [];
    if(Array.isArray(series) && series.length && typeof series[0] === "number"){
      return (series as number[]).map((n, i) => ({ gw: String(i+1), score: (typeof n === "number" ? n : null) }));
    }
    if(Array.isArray(series)){
      return (series as any[]).map((p: any) => ({
        gw: p?.gw ?? p?.gameWeek ?? p?.week ?? p?.gameweek,
        score: (typeof p?.score === "number") ? p.score : ((typeof p?.value === "number") ? p.value : null),
      }));
    }
    return [];
  })();
  const xsLast40 = xsPoints.slice(Math.max(0, xsPoints.length - 40));


    return () => { alive = false; };
  }, [
    (card as any)?.playerSlug,
    (card as any)?.player?.slug,
    (card as any)?.anyPlayer?.slug,
  ]);
  /* XS_CARD_PUBLIC_PLAYER_PERF_EFFECT_V4_END */

  if (!card) {
  /* XS_SORARE_POINTS_NORMALIZE_V1: normalize perf -> points[{gw,score}] */
  const xsPoints: XSPerfPoint[] = (() => {
    const raw: any = (perf as any) || {};
    const series = raw.series || raw.points || raw.performances || raw.scores || [];
    if(Array.isArray(series) && series.length && typeof series[0] === "number"){
      return (series as number[]).map((n, i) => ({ gw: String(i+1), score: (typeof n === "number" ? n : null) }));
    }
    if(Array.isArray(series)){
      return (series as any[]).map((p: any) => ({
        gw: p?.gw ?? p?.gameWeek ?? p?.week ?? p?.gameweek,
        score: (typeof p?.score === "number") ? p.score : ((typeof p?.value === "number") ? p.value : null),
      }));
    }
    return [];
  })();
  const xsLast40 = xsPoints.slice(Math.max(0, xsPoints.length - 40));

    return (
      <View style={{ flex: 1, backgroundColor: theme.bg, padding: 16, justifyContent: "center" }}>
        <Text style={{ color: theme.text, fontWeight: "900", fontSize: 18 }}>Carte introuvable (fallback perf si slug param)</Text>
        <Text style={{ color: theme.muted, marginTop: 8 }}>
          Ouvre la fiche en cliquant depuis la liste (cache navigation).
        </Text>
      </View>
    );
  }

  const price = (card as any)?.price || {};
  const avg7d = asFinite(price?.avg7dEur);
  const avg30d = asFinite(price?.avg30dEur);
  const trend = avg7d !== null && avg30d !== null ? (avg7d - avg30d) : null;
  const trendLabel =
    trend === null
      ? "—"
      : ((trend >= 0 ? "+" : "") + trend.toFixed(2) + " €");
  /* XS_SORARE_POINTS_NORMALIZE_V1: normalize perf -> points[{gw,score}] */
  const xsPoints: XSPerfPoint[] = (() => {
    const raw: any = (perf as any) || {};
    const series = raw.series || raw.points || raw.performances || raw.scores || [];
    if(Array.isArray(series) && series.length && typeof series[0] === "number"){
      return (series as number[]).map((n, i) => ({ gw: String(i+1), score: (typeof n === "number" ? n : null) }));
    }
    if(Array.isArray(series)){
      return (series as any[]).map((p: any) => ({
        gw: p?.gw ?? p?.gameWeek ?? p?.week ?? p?.gameweek,
        score: (typeof p?.score === "number") ? p.score : ((typeof p?.value === "number") ? p.value : null),
      }));
    }
    return [];
  })();
  const xsLast40 = xsPoints.slice(Math.max(0, xsPoints.length - 40));


  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.bg }} contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Text style={{ color: theme.text, fontWeight: "900", fontSize: 20 }} numberOfLines={2}>
        {pickStr((card as any)?.playerName)}
      </Text>
      {/* XS_PERF_SECTION_V1_RENDER */}
      <XSPerformanceSection card={card as any} perf={xsPerfRemote as any} /> {/* XS_CARD_PUBLIC_PLAYER_PERF_RENDER_V4 */}

      <Text style={{ color: theme.muted }} numberOfLines={2}>
        {pickStr((card as any)?.teamName)} • {pickStr((card as any)?.position)} • {pickStr((card as any)?.seasonYear)}
      </Text>

      {/* L15 */}
      <View style={{ borderRadius: 14, borderWidth: 1, borderColor: theme.stroke, backgroundColor: theme.panel, padding: 12 }}>
        <Text style={{ color: theme.text, fontWeight: "900" }}>L15</Text>
        <Text style={{ color: theme.muted, marginTop: 6, fontSize: 16 }}>{pickL15(card)}</Text>
      </View>

      {/* Prix */}
      <View style={{ borderRadius: 14, borderWidth: 1, borderColor: theme.stroke, backgroundColor: theme.panel, padding: 12, gap: 4 }}>
        <Text style={{ color: theme.text, fontWeight: "900" }}>Prix</Text>
        <Text style={{ color: theme.muted }}>Dernière vente: {formatEur(price?.lastSaleEur)}</Text>
        <Text style={{ color: theme.muted }}>Moy. 7j: {formatEur(price?.avg7dEur)}</Text>
        <Text style={{ color: theme.muted }}>Moy. 30j: {formatEur(price?.avg30dEur)}</Text>
        <Text style={{ color: theme.muted }}>Floor: {formatEur(price?.floorEur)}</Text>
        <Text style={{ color: theme.muted }}>Trend 7j/30j: {trendLabel}</Text>
        {!!price?.asOf && <Text style={{ color: theme.muted, fontSize: 12 }}>asOf: {String(price.asOf)}</Text>}
        {!!price?.warning && <Text style={{ color: theme.muted, fontSize: 12 }}>{String(price.warning)}</Text>}
      </View>

      {/* Détails utiles (sans rareté) */}
      <View style={{ borderRadius: 14, borderWidth: 1, borderColor: theme.stroke, backgroundColor: theme.panel, padding: 12 }}>
        <Text style={{ color: theme.text, fontWeight: "900" }}>Détails</Text>
        <Text style={{ color: theme.muted, marginTop: 6 }}>
          ID: {pickStr((card as any)?.id ?? (card as any)?.cardId ?? (card as any)?.slug)}
        </Text>
        <Text style={{ color: theme.muted }}>Club: {pickStr((card as any)?.teamName)}</Text>
        <Text style={{ color: theme.muted }}>Poste: {pickStr((card as any)?.position)}</Text>
        <Text style={{ color: theme.muted }}>Saison: {pickStr((card as any)?.seasonYear)}</Text>
      </View>
    </ScrollView>
  );
}





