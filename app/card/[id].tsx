import React from "react";
import { SafeAreaView, View, Text, Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { theme } from "../../src/theme";

/**
 * XS_CARD_DETAIL_PROBE_V1
 * Objectif: prouver que la navigation /card/[id] fonctionne et que les params arrivent.
 * Pas de logique métier ici (on fera le graphique L5 ensuite).
 */
export default function CardDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const id = String((params as any)?.id ?? "");
  const playerSlug = String((params as any)?.playerSlug ?? "");

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={{ padding: 16 }}>
        <View style={{
          paddingVertical: 10,
          paddingHorizontal: 12,
          borderRadius: 14,
          backgroundColor: theme.panel,
          borderWidth: 1,
          borderColor: theme.stroke
        }}>
          <Text style={{ color: theme.text, fontWeight: "900" }}>
            XS_CARD_DETAIL_PROBE_V1 ✅
          </Text>
          <Text style={{ color: theme.muted, marginTop: 6 }}>
            id: {id || "—"}
          </Text>
          <Text style={{ color: theme.muted, marginTop: 2 }}>
            playerSlug: {playerSlug || "—"}
          </Text>
        </View>

        <Pressable
          onPress={() => router.back()}
          style={{ marginTop: 14, alignSelf: "flex-start", paddingVertical: 10, paddingHorizontal: 12, borderRadius: 999, backgroundColor: theme.panel, borderWidth: 1, borderColor: theme.stroke }}
        >
          <Text style={{ color: theme.text, fontWeight: "900" }}>← Retour</Text>
        </Pressable>

        <View style={{ marginTop: 18 }}>
          <Text style={{ color: theme.muted }}>
            Prochaine étape: charger les données et afficher le graphique L5/L15/L40 style Sorare.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
