import React from "react";
import { Alert, SafeAreaView, Text, View, Pressable } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { theme } from "../../src/theme";

const BASE_URL = process.env.EXPO_PUBLIC_BASE_URL ?? "http://192.168.1.19:3000";

export default function SettingsScreen() {
  async function onLogout() {
    const ok = await new Promise<boolean>((resolve) => {
      Alert.alert(
        "Déconnexion",
        "Tu veux te déconnecter et délier ce téléphone du serveur ?",
        [
          { text: "Annuler", style: "cancel", onPress: () => resolve(false) },
          { text: "Se déconnecter", style: "destructive", onPress: () => resolve(true) },
        ]
      );
    });

    if (!ok) return;

    try {
      const deviceId = await AsyncStorage.getItem("xs_device_id_v1");

      // 1) unlink côté serveur
      if (deviceId) {
        try {
          await fetch(BASE_URL + "/auth/device-unlink?deviceId=" + encodeURIComponent(deviceId));
        } catch {}
      }

      // 2) clean local
      try {
        await AsyncStorage.multiRemove(["xs_linked_v1", "xs_device_id_v1"]);
      } catch {}

      // 3) go login
      router.replace("/(auth)/login");
    } catch {
      router.replace("/(auth)/login");
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={{ padding: 16, gap: 12 }}>
        <Text style={{ color: theme.text, fontSize: 22, fontWeight: "900" }}>Paramètres</Text>

        <View style={{ backgroundColor: theme.panel, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: theme.stroke }}>
          <Text style={{ color: theme.text, fontWeight: "900" }}>Compte</Text>
          <Text style={{ color: theme.muted, marginTop: 6 }}>
            Déconnexion = suppression locale + device unlink côté serveur.
          </Text>
        </View>

        <Pressable
          onPress={onLogout}
          style={{
            paddingVertical: 14,
            borderRadius: 16,
            alignItems: "center",
            backgroundColor: "#ff5a5a",
          }}
        >
          <Text style={{ color: "white", fontWeight: "900" }}>Se déconnecter</Text>
        </Pressable>

        <Text style={{ color: theme.muted, marginTop: 14, fontSize: 12 }}>
          Backend: {BASE_URL}
        </Text>
      </View>
    </SafeAreaView>
  );
}
