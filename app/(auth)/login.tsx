/* XS_JWT_ONLY_UI_SWAP_V1
   - Remplace l'écran "Connexion Sorare" OAuth par un écran JWT-only
   - Supprime la section JWT en bas (elle n'existe plus)
   - Conserve un deviceId persistant (AsyncStorage)
*/
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
const DEVICE_ID_KEY = "xs_device_id";

function nowId() {
  const d = new Date();
  const pad = (n: number) => (n < 10 ? "0" + n : "" + n);
  return (
    "dev_jwt_" +
    d.getFullYear() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    "_" +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds())
  );
}

export default function SorareConnectScreen() {
  const BASE_URL = (process.env.EXPO_PUBLIC_BASE_URL || "http://127.0.0.1:3000").trim();

  const [deviceId, setDeviceId] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [aud, setAud] = useState<string>("sorare:com");

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ linked?: boolean; userSlug?: string; nickname?: string; err?: string }>({});

  // XS_JWT_LOGIN_AUTO_REDIRECT_V1
  // But: après login JWT OK (linked=true), retourner automatiquement dans l'app.
  useEffect(() => {
    if (status?.linked && !loading) {
      const t = setTimeout(() => {
        try {
          // Si l'écran est ouvert depuis l'app (modal/stack), on revient.
          // Sinon fallback vers la home.
          if ((router as any)?.canGoBack && (router as any).canGoBack()) {
            router.back();
          } else {
            router.replace("/(tabs)");
          }
        } catch {
          try { router.replace("/(tabs)"); } catch {}
        }
      }, 350);
      return () => clearTimeout(t);
    }
  }, [status?.linked, loading]);

  const [debug, setDebug] = useState<string>("");

  const canSubmit = useMemo(() => {
    return !!deviceId && email.trim().length >= 3 && password.trim().length >= 3 && aud.trim().length >= 3;
  }, [deviceId, email, password, aud]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const existing = await AsyncStorage.getItem(DEVICE_ID_KEY);
        let id = (existing || "").trim();
        if (!id) {
          id = nowId();
          await AsyncStorage.setItem(DEVICE_ID_KEY, id);
        }
        if (alive) setDeviceId(id);
      } catch (e: any) {
        if (alive) {
          setDeviceId(nowId());
          setDebug("WARN: AsyncStorage deviceId failed: " + (e?.message || String(e)));
        }
      }
    })();
    return () => { alive = false; };
  }, []);

  async function refreshMe(id: string) {
    try {
      const url = BASE_URL + "/me-jwt?deviceId=" + encodeURIComponent(id);
      const res = await fetch(url);
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) {
        setStatus({ linked: false, err: json?.error || ("HTTP " + res.status) });
        return;
      }
      setStatus({ linked: true, userSlug: json?.user?.slug, nickname: json?.user?.nickname });
    } catch (e: any) {
      setStatus({ linked: false, err: e?.message || String(e) });
    }
  }

  async function doLoginJwt() {
    if (!canSubmit) return;
    setLoading(true);
    setDebug("");
    try {
      const payload = { deviceId, email: email.trim(), password, aud: aud.trim() };
      const res = await fetch(BASE_URL + "/auth/jwt/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) {
        setDebug("LOGIN FAIL: " + (json?.error || ("HTTP " + res.status)));
        setStatus({ linked: false, err: json?.error || ("HTTP " + res.status) });
        return;
      }
      setDebug("login ok=true | linked=true");
      await refreshMe(deviceId);
    } catch (e: any) {
      setDebug("LOGIN ERROR: " + (e?.message || String(e)));
      setStatus({ linked: false, err: e?.message || String(e) });
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: "#0b0b0e" }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={{ padding: 18, paddingTop: 26 }}>
        <Text style={{ color: "white", fontSize: 34, fontWeight: "800", marginBottom: 16 }}>Connexion Sorare</Text>

        <View style={{ backgroundColor: "#14141a", borderRadius: 16, padding: 14, marginBottom: 14 }}>
          <Text style={{ color: "#cfcfe6", fontSize: 12, marginBottom: 6 }}>Backend</Text>
          <Text style={{ color: "#ffffff", fontSize: 14 }}>{BASE_URL}</Text>
          <Text style={{ color: "#9aa0aa", fontSize: 12, marginTop: 8 }}>DeviceId</Text>
          <Text style={{ color: "#ffffff", fontSize: 13 }}>{deviceId || "..."}</Text>
        </View>

        <View style={{ backgroundColor: "#14141a", borderRadius: 16, padding: 14, marginBottom: 14 }}>
          <Text style={{ color: "#cfcfe6", fontSize: 12, marginBottom: 8 }}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="ton@email.com"
            placeholderTextColor="#666"
            style={{ color: "white", borderWidth: 1, borderColor: "#2a2a34", borderRadius: 12, padding: 12, marginBottom: 12 }}
          />

          <Text style={{ color: "#cfcfe6", fontSize: 12, marginBottom: 8 }}>Mot de passe</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="••••••••"
            placeholderTextColor="#666"
            style={{ color: "white", borderWidth: 1, borderColor: "#2a2a34", borderRadius: 12, padding: 12, marginBottom: 12 }}
          />

          <Text style={{ color: "#cfcfe6", fontSize: 12, marginBottom: 8 }}>AUD (JWT)</Text>
          <TextInput
            value={aud}
            onChangeText={setAud}
            autoCapitalize="none"
            placeholder="sorare:com"
            placeholderTextColor="#666"
            style={{ color: "white", borderWidth: 1, borderColor: "#2a2a34", borderRadius: 12, padding: 12, marginBottom: 12 }}
          />

          <Pressable
            onPress={doLoginJwt}
            disabled={!canSubmit || loading}
            style={{
              backgroundColor: !canSubmit || loading ? "#2a2a34" : "#ffffff",
              paddingVertical: 14,
              borderRadius: 14,
              alignItems: "center",
            }}
          >
            {loading ? <ActivityIndicator /> : <Text style={{ color: "#000", fontSize: 16, fontWeight: "700" }}>Se connecter à Sorare</Text>}
          </Pressable>
        </View>

        <View style={{ backgroundColor: "#14141a", borderRadius: 16, padding: 14, marginBottom: 14 }}>
          <Text style={{ color: "#cfcfe6", fontSize: 12, marginBottom: 8 }}>Statut</Text>
          {status?.linked ? (
            <Text style={{ color: "#c9ffd1", fontSize: 14 }}>✅ Connecté: {status.nickname || status.userSlug || "ok"}</Text>
          ) : (
            <Text style={{ color: "#ffd7c9", fontSize: 14 }}>⏳ {status.err ? status.err : "En attente d'autorisation"}</Text>
          )}
          {debug ? <Text style={{ color: "#9aa0aa", fontSize: 12, marginTop: 10 }}>{debug}</Text> : null}
        </View>

        <Text style={{ color: "#6b6f7a", fontSize: 11, marginTop: 6 }}>
          XS_JWT_ONLY_UI_SWAP_V1
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}