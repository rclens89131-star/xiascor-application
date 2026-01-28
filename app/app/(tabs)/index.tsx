import React from "react";
import { SafeAreaView, Text, View, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { theme } from "../../src/theme";
import { CopilotFAB } from "../../src/components/CopilotFAB";
import { CopilotSheet } from "../../src/components/CopilotSheet";

export default function HomeScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      {/* Header pro */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingTop: 6,
          paddingBottom: 10,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Settings */}
        <Pressable
          onPress={() => router.push("/(tabs)/settings")}
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.panel,
            borderWidth: 1,
            borderColor: theme.stroke,
          }}
          accessibilityLabel="Ouvrir paramètres"
        >
          <Ionicons name="settings-outline" size={20} color={theme.text} />
        </Pressable>

        {/* Title */}
        <Text style={{ color: theme.text, fontSize: 18, fontWeight: "900" }}>Accueil</Text>

        {/* Bell placeholder */}
        <Pressable
          onPress={() => {
            // plus tard: écran notifications
          }}
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.panel,
            borderWidth: 1,
            borderColor: theme.stroke,
            opacity: 0.9,
          }}
          accessibilityLabel="Notifications"
        >
          <Ionicons name="notifications-outline" size={20} color={theme.text} />
        </Pressable>
      </View>

      <View style={{ paddingHorizontal: 16, gap: 12 }}>
        <View style={{ backgroundColor: theme.panel, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: theme.stroke }}>
          <Text style={{ color: theme.text, fontSize: 14, fontWeight: "800" }}>Résultats Gameweek</Text>
          <Text style={{ color: theme.muted, marginTop: 6 }}>
            Placeholder V1. V2: scores, rewards, ranking, résumé perf, alertes et priorités.
          </Text>
        </View>

        <View style={{ backgroundColor: theme.panel, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: theme.stroke }}>
          <Text style={{ color: theme.text, fontSize: 14, fontWeight: "800" }}>Prochaines priorités</Text>
          <Text style={{ color: theme.muted, marginTop: 6 }}>
            • 1 compo recommandée • 2 joueurs à surveiller • 1 achat/vente potentiel (via Copilot)
          </Text>
        </View>
      </View>

      <CopilotSheet />
      <CopilotFAB />
    </SafeAreaView>
  );
}
