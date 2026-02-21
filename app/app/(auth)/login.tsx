import React, { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, ActivityIndicator, Linking } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { theme } from "../../src/theme";

const BASE_URL = process.env.EXPO_PUBLIC_BASE_URL ?? "http://192.168.1.19:3000";
const DEVICE_KEY = "xs_device_id_v2";

function makeDeviceId() {
  return "dev_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2);
}

export default function LoginScreen() {
  const [deviceId, setDeviceId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ linked: boolean; userSlug?: string; nickname?: string } | null>(null);
  const [err, setErr] = useState<string>("");

  const loginUrl = useMemo(() => {
    if (!deviceId) return "";
    return BASE_URL + "/auth/sorare-device/login?deviceId=" + encodeURIComponent(deviceId);
  }, [deviceId]);

  useEffect(() => {
    (async () => {
      try {
        const existing = await AsyncStorage.getItem(DEVICE_KEY);
        if (existing) { setDeviceId(existing); return; }
        const id = makeDeviceId();
        await AsyncStorage.setItem(DEVICE_KEY, id);
        setDeviceId(id);
      } catch (e: any) {
        setErr(String(e?.message || e));
      }
    })();
  }, []);

  useEffect(() => {
    let t: any = null;
    let alive = true;

    async function poll() {
      if (!deviceId) return;
      try {
        const r = await fetch(BASE_URL + "/auth/device-status?deviceId=" + encodeURIComponent(deviceId), {
          headers: { accept: "application/json" },
        });
        const j = await r.json().catch(() => ({}));
        if (!alive) return;
        setStatus(j);

        if (j && j.linked) {
          await AsyncStorage.setItem("xs_linked_v1", "1");
          router.replace("/(tabs)");
        }
      } catch (e: any) {
        if (!alive) return;
        setErr(String(e?.message || e));
      }
    }

    t = setInterval(poll, 1500);
    poll();

    return () => { alive = false; if (t) clearInterval(t); };
  }, [deviceId]);

  async function onLogin() {
    setErr("");
    if (!loginUrl) return;
    setLoading(true);
    try {
      await Linking.openURL(loginUrl);
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg, padding: 18, justifyContent: "center" }}>
      <Text style={{ color: theme.text, fontSize: 28, fontWeight: "900", marginBottom: 8 }}>Connexion Sorare</Text>
      <Text style={{ color: theme.muted, marginBottom: 14 }}>
        Connecte-toi pour afficher tes cartes et utiliser le marché avec ton compte.
      </Text>

      <View style={{ padding: 12, borderRadius: 16, backgroundColor: theme.panel, borderWidth: 1, borderColor: theme.stroke, marginBottom: 14 }}>
        <Text style={{ color: theme.text, fontWeight: "800" }}>DeviceId</Text>
        <Text selectable style={{ color: theme.muted }}>{deviceId || "..."}</Text>
      </View>

      <Pressable
        onPress={onLogin}
        disabled={!deviceId || loading}
        style={{
          paddingVertical: 14,
          borderRadius: 16,
          alignItems: "center",
          backgroundColor: theme.text,
          opacity: (!deviceId || loading) ? 0.6 : 1,
        }}
      >
        {loading ? <ActivityIndicator /> : <Text style={{ color: theme.bg, fontWeight: "900" }}>Se connecter à Sorare</Text>}
      </Pressable>

      <View style={{ height: 12 }} />

      <View style={{ padding: 12, borderRadius: 16, backgroundColor: theme.panel, borderWidth: 1, borderColor: theme.stroke }}>
        <Text style={{ color: theme.text, fontWeight: "800" }}>Statut</Text>
        <Text style={{ color: theme.muted, marginTop: 6 }}>
          {status ? (status.linked ? ("✅ Connecté (" + (status.nickname || status.userSlug || "ok") + ")") : "⏳ En attente d'autorisation") : "…"}
        </Text>
      </View>

      {!!err && (
        <Text style={{ color: "#ff5a5a", marginTop: 12 }}>
          Erreur: {err}
        </Text>
      )}

      <Text style={{ color: theme.muted, marginTop: 14, fontSize: 12 }}>
        Backend: {BASE_URL}
      </Text>
    </View>
  );
}



