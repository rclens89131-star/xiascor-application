import React, { useMemo } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { theme } from "../../src/theme";

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
          <Text style={{ color: theme.muted, marginTop: 8 }}>
            On branchera ici: scores match, couleurs (rouge/orange/jaune/verts/bleu), logos adverses, labels score dans les barres.
          </Text>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}
