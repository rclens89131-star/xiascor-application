import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Linking, Pressable, ScrollView, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";

const DEVICE_KEY = "xs_device_id";
const LINKED_KEY = "xs_linked_v1";

function makeDeviceId() {
  return "dev_" + Date.now() + "_" + Math.random().toString(36).slice(2, 10);
}

type MeResponse = {
  ok?: boolean;
  userSlug?: string;
  nickname?: string;
  error?: string;
};

type AuthStatusResponse = {
  hasAuth?: boolean;
  hasOAuthToken?: boolean;
  scope?: string | null;
  created_at?: number | null;
};

export default function SorareLoginScreen() {
const BASE_URL = String(process.env.EXPO_PUBLIC_BASE_URL || "https://xiascor-backend-tssdy62zqa-ez.a.run.app").trim();
const AUTH_BASE_URL = String(process.env.EXPO_PUBLIC_AUTH_BASE_URL || "https://xiascor-backend-tssdy62zqa-ez.a.run.app").trim(); // XS_OAUTH_AUTH_BASE_V1

  const [deviceId, setDeviceId] = useState("");
  const [loading, setLoading] = useState(false);
  const [busySync, setBusySync] = useState(false);
  const [statusText, setStatusText] = useState("En attente d'autorisation");

// XS_FIX_LOGIN_AFTER_OAUTH_OK_NAVIGATE_V1 BEGIN
// XS_REPAIR_LOGIN_HOOK_PLACEMENT_V1
// Quand OAuth est OK, on quitte l'écran Connexion Sorare et on revient dans l'application.
useEffect(() => {
  const s = String(statusText || "");
  if (!s.toLowerCase().includes("oauth ok")) return;

  const t = setTimeout(() => {
    try {
      router.replace("/(tabs)/cards" as any);
    } catch {
      try {
        router.replace("/(tabs)" as any);
      } catch {}
    }
  }, 1800);

  return () => clearTimeout(t);
}, [statusText]);
// XS_FIX_LOGIN_AFTER_OAUTH_OK_NAVIGATE_V1 END

  const [debug, setDebug] = useState("");

  const loginUrl = useMemo(() => {
    return AUTH_BASE_URL.replace(/\/+$/, "") + "/auth/sorare"; // XS_OAUTH_CLOUDRUN_LOGIN_V2
  }, [AUTH_BASE_URL]);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const existing = await AsyncStorage.getItem(DEVICE_KEY);
        if (existing) {
          if (alive) setDeviceId(existing);
          return;
        }
        const nextId = makeDeviceId();
        await AsyncStorage.setItem(DEVICE_KEY, nextId);
        if (alive) setDeviceId(nextId);
      } catch (e: any) {
        if (alive) {
          setDebug("deviceId error: " + String(e?.message || e));
        }
      }
    })();
return () => {
      alive = false;
    };
  }, []);

  async function refreshMeAndSync(id: string) {
    const safeBase = AUTH_BASE_URL.replace(/\/+$/, ""); // XS_OAUTH_STATUS_BASE_V1
    setBusySync(true);
    try {
      const meRes = await fetch(safeBase + "/me?deviceId=" + encodeURIComponent(id), {
        headers: { accept: "application/json" },
      });
      const meJson: MeResponse = await meRes.json().catch(() => ({}));
      if (!meRes.ok || !meJson?.ok) {
        throw new Error(String(meJson?.error || ("HTTP " + meRes.status)));
      }

      setStatusText("✅ Connecté: " + String(meJson.nickname || meJson.userSlug || "ok"));

      const syncRes = await fetch(
        safeBase + "/my-cards/sync?deviceId=" + encodeURIComponent(id),
        {
          method: "POST",
          headers: { "content-type": "application/json", accept: "application/json" },
          body: "{}",
        }
      );

      const syncJson = await syncRes.json().catch(() => ({}));
      if (!syncRes.ok || !syncJson?.ok) {
        throw new Error("sync failed: " + String(syncJson?.error || ("HTTP " + syncRes.status)));
      }

      await AsyncStorage.setItem(LINKED_KEY, "1");
      setDebug("sync ok | count=" + String(syncJson?.count ?? "?"));
      router.replace("/(tabs)");
    } finally {
      setBusySync(false);
    }
  }

  useEffect(() => {
    let timer: any = null;
    let alive = true;

    async function poll() {
      if (!deviceId) return;
      try {
        const safeBase = AUTH_BASE_URL.replace(/\/+$/, ""); // XS_OAUTH_STATUS_BASE_V1
        const res = await fetch(safeBase + "/auth/sorare/status", {
          headers: { accept: "application/json" },
        });
        const json: AuthStatusResponse = await res.json().catch(() => ({}));

        if (!alive) return;

        if (json?.hasOAuthToken) {
          setStatusText("OAuth OK — synchronisation en cours...");
          if (!busySync) {
            await refreshMeAndSync(deviceId);
          }
        } else {
          setStatusText("⏳ En attente d'autorisation");
        }
      } catch (e: any) {
        if (!alive) return;
        setDebug("poll error: " + String(e?.message || e));
      }
    }

    timer = setInterval(() => {
      void poll();
    }, 1500);

    void poll();

    return () => {
      alive = false;
      if (timer) clearInterval(timer);
    };
  }, [AUTH_BASE_URL, deviceId, busySync]);

  async function onLogin() {
    if (!loginUrl) return;
    setLoading(true);
    setDebug("");
    try {
      await Linking.openURL(loginUrl);
    } catch (e: any) {
      setDebug("openURL error: " + String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#0b0b0e" }}>
      <ScrollView contentContainerStyle={{ padding: 18, paddingTop: 26 }}>
        <Text style={{ color: "white", fontSize: 34, fontWeight: "800", marginBottom: 16 }}>
          Connexion Sorare
        </Text>

        <View style={{ backgroundColor: "#14141a", borderRadius: 16, padding: 14, marginBottom: 14 }}>
          <Text style={{ color: "#cfcfe6", fontSize: 12, marginBottom: 6 }}>Backend</Text>
          <Text selectable style={{ color: "#ffffff", fontSize: 14 }}>{BASE_URL}</Text>

          <Text style={{ color: "#9aa0aa", fontSize: 12, marginTop: 8 }}>DeviceId</Text>
          <Text selectable style={{ color: "#ffffff", fontSize: 13 }}>{deviceId || "..."}</Text>
        </View>

        <View style={{ backgroundColor: "#14141a", borderRadius: 16, padding: 14, marginBottom: 14 }}>
          <Text style={{ color: "#cfcfe6", fontSize: 14, marginBottom: 10 }}>
            Connecte-toi à Sorare dans le navigateur, puis reviens dans l'app.
          </Text>

          <Pressable
            onPress={onLogin}
            disabled={!deviceId || loading}
            style={{
              backgroundColor: !deviceId || loading ? "#2a2a34" : "#ffffff",
              paddingVertical: 14,
              borderRadius: 14,
              alignItems: "center",
            }}
          >
            {loading ? (
              <ActivityIndicator />
            ) : (
              <Text style={{ color: "#000", fontSize: 16, fontWeight: "700" }}>
                Se connecter à Sorare
              </Text>
            )}
          </Pressable>
        </View>

        <View style={{ backgroundColor: "#14141a", borderRadius: 16, padding: 14, marginBottom: 14 }}>
          <Text style={{ color: "#cfcfe6", fontSize: 12, marginBottom: 8 }}>Statut</Text>
          <Text style={{ color: "#ffffff", fontSize: 14 }}>{statusText}</Text>
          {!!debug ? (
            <Text style={{ color: "#9aa0aa", fontSize: 12, marginTop: 10 }}>{debug}</Text>
          ) : null}
        </View>

        <Text style={{ color: "#6b6f7a", fontSize: 11, marginTop: 6 }}>
          XS_OAUTH_CLOUDRUN_LOGIN_V1
        </Text>
      </ScrollView>
    </View>
  );
}






