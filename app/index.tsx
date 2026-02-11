import React, { useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { View, ActivityIndicator } from "react-native";
import { theme } from "../src/theme";

const BASE_URL = process.env.EXPO_PUBLIC_BASE_URL ?? "http://127.0.0.1:3000";

export default function Index() {
  useEffect(() => {
    (async () => {
      try {
        const deviceId = await AsyncStorage.getItem("xs_device_id_v1");
        if (!deviceId) {
          await AsyncStorage.multiRemove(["xs_linked_v1"]);
          router.replace("/(auth)/login");
          return;
        }

        const url = BASE_URL + "/auth/device-status?deviceId=" + encodeURIComponent(deviceId);
        const r = await fetch(url, { headers: { accept: "application/json" } });
        const j = await r.json().catch(() => ({}));

        if (j && j.linked) {
          await AsyncStorage.setItem("xs_linked_v1", "1");
          router.replace("/(tabs)");
        } else {
          await AsyncStorage.multiRemove(["xs_linked_v1"]);
          router.replace("/(auth)/login");
        }
      } catch {
        // en cas de doute -> login
        try { await AsyncStorage.multiRemove(["xs_linked_v1"]); } catch {}
        router.replace("/(auth)/login");
      }
    })();
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: theme.bg }}>
      <ActivityIndicator />
    </View>
  );
}
