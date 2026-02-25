import React, { useMemo } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { theme } from "../../src/theme";

// =========================
 // XS_L5_CHART_MOCK_V1_BEGIN
 // Etape 1: chart Sorare-like avec données fictives pour valider le rendu iPhone
 type XSScoreBar = { score: number; label?: string };

 function xsScoreColorV1(s: number): string {
   if (s < 25) return "#ff3b30";       // rouge
   if (s < 35) return "#ff9500";       // orange
   if (s < 55) return "#ffd60a";       // jaune
   if (s < 65) return "#34c759";       // vert pomme
   if (s < 75) return "#248a3d";       // vert foncé
   return "#5ac8fa";                   // bleu clair
 }

 function XSL5ChartMockV1(props: { title: string; bars: XSScoreBar[] }) {
   const H = 140; // hauteur zone barres
   const bars = props.bars ?? [];
   return (
     <View style={{ marginTop: 14, padding: 14, borderRadius: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.10)", backgroundColor: "rgba(255,255,255,0.03)" }}>
       <Text style={{ color: "rgba(255,255,255,0.92)", fontSize: 16, fontWeight: "800", marginBottom: 10 }}>
         {props.title} <Text style={{ color: "rgba(255,255,255,0.55)", fontWeight: "600" }}>(mock)</Text>
       </Text>

       <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 10, height: H }}>
         {bars.map((b, i) => {
           const v = Math.max(0, Math.min(100, Number(b.score ?? 0)));
           const barH = Math.max(6, Math.round((v / 100) * H));
           return (
             <View key={"xsbar-" + i} style={{ width: 34, alignItems: "center", justifyContent: "flex-end" }}>
               <View style={{ width: 34, height: barH, borderRadius: 10, backgroundColor: xsScoreColorV1(v), alignItems: "center", justifyContent: "flex-end", paddingBottom: 6 }}>
                 <Text style={{ color: "rgba(0,0,0,0.85)", fontSize: 12, fontWeight: "900" }}>{String(Math.round(v))}</Text>
               </View>
               <Text style={{ marginTop: 6, color: "rgba(255,255,255,0.55)", fontSize: 11, fontWeight: "700" }}>
                 {b.label ?? "J" + (i + 1)}
               </Text>
             </View>
           );
         })}
       </View>

       <Text style={{ marginTop: 10, color: "rgba(255,255,255,0.45)", fontSize: 12 }}>
         XS_L5_CHART_MOCK_V1 ✅ (Etape 1: rendu UI — logos adverses à l'étape data)
       </Text>
     </View>
   );
 }
 // XS_L5_CHART_MOCK_V1_END
 // =========================

/**
 * XS_CARD_DETAIL_STABLE_V1
 * Objectif:
 * - Prouver que le clic ouvre bien un écran détail (sinon: c'est la nav)
 * - Lire { id, playerSlug } depuis les params
 * - Préparer le terrain pour le futur graphique Sorare-like
 */
export default function CardDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<any>();

  const id = typeof params?.id === "string" ? params.id : Array.isArray(params?.id) ? params.id[0] : "";
  const playerSlug =
    typeof params?.playerSlug === "string"
      ? params.playerSlug
      : Array.isArray(params?.playerSlug)
        ? params.playerSlug[0]
        : "";

  const effective = useMemo(() => {
    return {
      id: String(id || ""),
      playerSlug: String(playerSlug || ""),
      slugGuess: String(playerSlug || id || ""),
    };
  }, [id, playerSlug]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={{ paddingTop: 52, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: theme.stroke }}>
        <Pressable
          onPress={() => router.back()}
          style={{ alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 10, borderRadius: 999, backgroundColor: theme.panel }}
        >
          <Text style={{ color: theme.text, fontWeight: "900" }}>← Retour</Text>
        </Pressable>

        <Text style={{ color: theme.text, fontSize: 22, fontWeight: "900", marginTop: 12 }}>
          Détail carte
        </Text>

        <View style={{ marginTop: 10, padding: 12, borderRadius: 14, backgroundColor: theme.panel2, borderWidth: 1, borderColor: theme.stroke }}>
          <Text style={{ color: theme.text, fontWeight: "900" }}>
            XS_CARD_DETAIL_STABLE_V1 ✅
          </Text>
          <Text style={{ color: theme.muted, marginTop: 6 }}>
            id: {effective.id || "—"}
          </Text>
          <Text style={{ color: theme.muted, marginTop: 4 }}>
            playerSlug: {effective.playerSlug || "—"}
          </Text>
          <Text style={{ color: theme.muted, marginTop: 4 }}>
            slugGuess: {effective.slugGuess || "—"}
          </Text>
          <Text style={{ color: theme.muted, marginTop: 8 }}>
            Si tu vois cet écran, le clic fonctionne. Prochaine étape: vrai graphique L5/L10/L40 Sorare-like.
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View style={{ padding: 14, borderRadius: 16, backgroundColor: theme.panel, borderWidth: 1, borderColor: theme.stroke }}>
          <Text style={{ color: theme.text, fontWeight: "900" }}>Zone graphique (à venir)</Text>
{/* XS_L5_CHART_MOCK_V1_RENDER */}
<XSL5ChartMockV1 title="Graphique L5" bars={[{ score: 12, label: "M1" }, { score: 28, label: "M2" }, { score: 42, label: "M3" }, { score: 61, label: "M4" }, { score: 79, label: "M5" }]} />
          <Text style={{ color: theme.muted, marginTop: 8 }}>
            On branchera ici: scores match, couleurs (rouge/orange/jaune/verts/bleu), logos adverses, labels score dans les barres.
          </Text>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

