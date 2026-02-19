import React, { useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  SafeAreaView,
  Text,
  View,
} from "react-native";
import { theme } from "../../src/theme";
import { CardListItem } from "../../src/components/CardListItem";
import { myCardsGet, myCardsSync, MyCardItem, MyCardsMeta } from "../../src/scoutApi";

export default function MyCardsCacheScreen(){
  const [deviceId, setDeviceId] = useState<string>("");
  const [meta, setMeta] = useState<MyCardsMeta | null>(null);
  const [cards, setCards] = useState<MyCardItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string>("");

  const title = useMemo(() => {
    const n = meta && typeof meta.count === "number" ? meta.count : cards.length;
    return `Mes cartes (cache) • ${n}`;
  }, [meta, cards.length]);

  async function loadDeviceId(){
    try {
      const id = await AsyncStorage.getItem("xs_device_id_v1");
      setDeviceId(String(id || "").trim());
    } catch(e){
      setDeviceId("");
    }
  }

  async function load(){
    const id = String(deviceId || "").trim();
    if(!id){
      setError("deviceId introuvable. Connecte-toi (écran login) puis reviens ici.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const j = await myCardsGet(id);
      setMeta((j && j.meta) ? (j.meta as any) : null);
      setCards(Array.isArray(j && (j as any).cards) ? ((j as any).cards as any[]) : []);
    } catch(e: any){
      setError(String((e && e.message) ? e.message : e));
    } finally {
      setLoading(false);
    }
  }

  async function syncAll(){
    const id = String(deviceId || "").trim();
    if(!id){
      setError("deviceId introuvable. Connecte-toi (écran login) puis reviens ici.");
      return;
    }
    setSyncing(true);
    setError("");
    try {
      await myCardsSync(id, { jwtAud: "sorare:com", first: 100, maxPages: 120, maxCards: 6000, sleepMs: 200 });
      await load();
    } catch(e: any){
      setError(String((e && e.message) ? e.message : e));
    } finally {
      setSyncing(false);
    }
  }

  useEffect(() => { loadDeviceId(); }, []);
  useEffect(() => { if(deviceId) load(); }, [deviceId]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={{ padding: 16, gap: 10 }}>
        <Text style={{ color: theme.text, fontSize: 18, fontWeight: "900" }}>{title}</Text>

        <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
          <Pressable
            onPress={load}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 10,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: theme.stroke,
              backgroundColor: theme.panel,
            }}
          >
            <Text style={{ color: theme.text, fontWeight: "800" }}>
              {loading ? "Chargement..." : "Recharger"}
            </Text>
          </Pressable>

          <Pressable
            onPress={syncAll}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 10,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: theme.stroke,
              backgroundColor: "rgba(255,255,255,0.06)",
              opacity: syncing ? 0.7 : 1,
            }}
            disabled={syncing}
          >
            <Text style={{ color: theme.text, fontWeight: "900" }}>
              {syncing ? "Sync en cours..." : "Synchroniser (backend)"}
            </Text>
          </Pressable>
        </View>

        {meta ? (
          <View style={{ padding: 12, borderRadius: 12, backgroundColor: theme.panel, borderWidth: 1, borderColor: theme.stroke }}>
            <Text style={{ color: theme.muted, fontSize: 12 }}>
              user: {String(meta.userSlug || "—")} • fetchedAt: {String(meta.fetchedAt || "—")} • pages: {String(meta.pages ?? "—")} • aud: {String(meta.jwtAud || "—")}
            </Text>
          </View>
        ) : null}

        {error ? (
          <View style={{ padding: 12, borderRadius: 12, backgroundColor: "rgba(255,0,0,0.08)", borderWidth: 1, borderColor: "rgba(255,0,0,0.25)" }}>
            <Text style={{ color: theme.text, fontWeight: "800" }}>Erreur</Text>
            <Text style={{ color: theme.muted, marginTop: 6 }}>{error}</Text>
          </View>
        ) : null}
      </View>

      <FlatList
        data={cards}
        keyExtractor={(item, idx) => String((item as any)?.slug || idx)}
        contentContainerStyle={{ paddingBottom: 24 }}
        renderItem={({ item }) => (
          <CardListItem
            card={item as any}
            onPress={() => {}}
          />
        )}
        ListEmptyComponent={
          loading ? (
            <View style={{ padding: 16 }}>
              <ActivityIndicator />
            </View>
          ) : (
            <View style={{ padding: 16 }}>
              <Text style={{ color: theme.muted }}>Aucune carte en cache. Clique “Synchroniser”.</Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}
