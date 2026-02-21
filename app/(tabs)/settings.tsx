import React from "react";
import { Alert, SafeAreaView, Text, View, Pressable, TextInput } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { theme } from "../../src/theme";

const BASE_URL = process.env.EXPO_PUBLIC_BASE_URL ?? "http://192.168.1.19:3000" /* XS_FIX_BASE_URL_FALLBACK_LAN_V1 */;

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
      <XsJwtDeviceIdPanelV1 />
</SafeAreaView>
  );
}


/* XS_SETTINGS_JWT_DEVICEID_PANEL_V1_BEGIN */
const XS_JWT_DEVICE_ID_KEY = "XS_JWT_DEVICE_ID_V1";

function XsJwtDeviceIdPanelV1() {
  const [current, setCurrent] = React.useState<string>("");
  const [value, setValue] = React.useState<string>("");

  React.useEffect(() => {
    (async () => {
      try {
        const v = await AsyncStorage.getItem(XS_JWT_DEVICE_ID_KEY);
        if (v) { setCurrent(v); setValue(v); }
      } catch {}
    })();
  }, []);

  const save = async () => {
    const v = (value || "").trim();
    if (!v) return;
    await AsyncStorage.setItem(XS_JWT_DEVICE_ID_KEY, v);
    setCurrent(v);
  };

  const clear = async () => {
    await AsyncStorage.removeItem(XS_JWT_DEVICE_ID_KEY);
    setCurrent("");
    setValue("");
  };

  return (
    <View style={{ marginTop: 14, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: theme.stroke, backgroundColor: theme.panel }}>
      <Text style={{ color: theme.text, fontWeight: "900" }}>Connexion JWT (deviceId)</Text>
      <Text style={{ color: theme.muted, marginTop: 6 }}>
        Stocke le deviceId JWT dans AsyncStorage (clé {XS_JWT_DEVICE_ID_KEY}). Exemple: dev_jwt_1771691296
      </Text>

      <Text style={{ color: theme.muted, marginTop: 8 }}>Actuel: {current || "—"}</Text>

      <TextInput
        value={value}
        onChangeText={setValue}
        autoCapitalize="none"
        placeholder="dev_jwt_..."
        placeholderTextColor={theme.muted}
        style={{
          marginTop: 10,
          color: theme.text,
          backgroundColor: theme.panel2,
          borderWidth: 1,
          borderColor: theme.stroke,
          borderRadius: 12,
          paddingHorizontal: 12,
          paddingVertical: 10,
        }}
      />

      <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
        <Pressable
          onPress={save}
          style={{
            paddingHorizontal: 12,
            paddingVertical: 10,
            borderRadius: 12,
            backgroundColor: "rgba(59,130,246,0.18)",
            borderWidth: 1,
            borderColor: "rgba(59,130,246,0.35)",
          }}
        >
          <Text style={{ color: theme.text, fontWeight: "900" }}>Enregistrer</Text>
        </Pressable>

        <Pressable
          onPress={clear}
          style={{
            paddingHorizontal: 12,
            paddingVertical: 10,
            borderRadius: 12,
            backgroundColor: "rgba(239,68,68,0.12)",
            borderWidth: 1,
            borderColor: "rgba(239,68,68,0.28)",
          }}
        >
          <Text style={{ color: theme.text, fontWeight: "900" }}>Effacer</Text>
        </Pressable>
      </View>
    </View>
  );
}
/* XS_SETTINGS_JWT_DEVICEID_PANEL_V1_END */

