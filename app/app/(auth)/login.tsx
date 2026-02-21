import React, { useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";
import { BASE_URL } from "../../src/api";

/* XS_LOGIN_JWT_CLEAN_V1_BEGIN
   - JWT-only login UI (no debug panels)
   - POST /auth/jwt/login { deviceId, email, password, aud }
   - GET  /me-jwt?deviceId=...
   - Store xs_linked_v1 on success then router.replace("/(tabs)")
XS_LOGIN_JWT_CLEAN_V1_END */

const theme = {
  bg: "#0b0c0f",
  text: "#f3f5f7",
  muted: "#9aa4b2",
  panel: "#12141a",
  stroke: "#232734",
  danger: "#ff5a5a",
};

type MeJwtResponse = {
  ok?: boolean;
  linked?: boolean;
  user?: { slug?: string; nickname?: string };
  error?: string;
  hint?: string;
};

async function getOrCreateDeviceId(): Promise<string> {
  const key = "xs_device_id_v1";
  const existing = await AsyncStorage.getItem(key);
  if (existing) return existing;
  const id = "dev_" + Date.now().toString(10) + "_" + Math.random().toString(36).slice(2, 10);
  await AsyncStorage.setItem(key, id);
  return id;
}

export default function LoginScreen() {
  const router = useRouter();

  const [deviceId, setDeviceId] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>("");
  const [status, setStatus] = useState<MeJwtResponse | null>(null);

  const canSubmit = useMemo(() => {
    return !!deviceId && email.trim().length >= 3 && password.trim().length >= 3;
  }, [deviceId, email, password]);

  async function refreshMe(id: string) {
    try {
      const url = BASE_URL + "/me-jwt?deviceId=" + encodeURIComponent(id);
      const res = await fetch(url, { headers: { accept: "application/json" } });
      const j = (await res.json().catch(() => ({}))) as MeJwtResponse;
      setStatus(j);

      if (j && (j.ok === true || j.linked === true)) {
        await AsyncStorage.setItem("xs_linked_v1", "1");
        router.replace("/(tabs)");
      }
    } catch (e: any) {
      setStatus({ ok: false, error: String(e?.message || e) });
    }
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const id = await getOrCreateDeviceId();
        if (!alive) return;
        setDeviceId(id);
        // silent check on load (background)
        refreshMe(id);
      } catch (e: any) {
        if (!alive) return;
        setErr(String(e?.message || e));
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onLogin() {
    setErr("");
    if (!canSubmit) return;
    setLoading(true);

    try {
      const payload = { deviceId, email: email.trim(), password, aud: "sorare:com" };
      const res = await fetch(BASE_URL + "/auth/jwt/login", {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify(payload),
      });

      const j = await res.json().catch(() => ({} as any));
      if (!res.ok || (j && j.ok === false)) {
        const msg = (j && (j.error || j.message || j.hint)) || "signin_failed";
        setErr(String(msg));
        return;
      }

      await refreshMe(deviceId);
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  const statusText = useMemo(() => {
    if (!status) return "…";
    if (status.ok === true || status.linked === true) {
      const nick = status.user?.nickname || status.user?.slug || "ok";
      return "✅ Connecté (" + nick + ")";
    }
    return "⏳ Non connecté";
  }, [status]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg, padding: 18, justifyContent: "center" }}>
      <Text style={{ color: theme.text, fontSize: 28, fontWeight: "900", marginBottom: 8 }}>Connexion Sorare</Text>
      <Text style={{ color: theme.muted, marginBottom: 14 }}>
        Connecte-toi pour afficher tes cartes et utiliser le marché avec ton compte.
      </Text>

      <View style={{ gap: 10 }}>
        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="Email Sorare"
          placeholderTextColor={theme.muted}
          style={{
            color: theme.text,
            backgroundColor: theme.panel,
            borderWidth: 1,
            borderColor: theme.stroke,
            paddingVertical: 12,
            paddingHorizontal: 14,
            borderRadius: 14,
          }}
        />
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="Mot de passe"
          placeholderTextColor={theme.muted}
          style={{
            color: theme.text,
            backgroundColor: theme.panel,
            borderWidth: 1,
            borderColor: theme.stroke,
            paddingVertical: 12,
            paddingHorizontal: 14,
            borderRadius: 14,
          }}
        />
      </View>

      <View style={{ height: 14 }} />

      <Pressable
        onPress={onLogin}
        disabled={!canSubmit || loading}
        style={{
          paddingVertical: 14,
          borderRadius: 16,
          alignItems: "center",
          backgroundColor: theme.text,
          opacity: !canSubmit || loading ? 0.6 : 1,
        }}
      >
        {loading ? <ActivityIndicator /> : <Text style={{ color: theme.bg, fontWeight: "900" }}>Se connecter à Sorare</Text>}
      </Pressable>

      <View style={{ height: 12 }} />

      <View style={{ padding: 12, borderRadius: 16, backgroundColor: theme.panel, borderWidth: 1, borderColor: theme.stroke }}>
        <Text style={{ color: theme.text, fontWeight: "800" }}>Statut</Text>
        <Text style={{ color: theme.muted, marginTop: 6 }}>{statusText}</Text>
      </View>

      {!!err && <Text style={{ color: theme.danger, marginTop: 12 }}>Erreur: {err}</Text>}
    </View>
  );
}