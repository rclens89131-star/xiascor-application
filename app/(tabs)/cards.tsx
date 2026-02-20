import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, SafeAreaView, Text, View, useWindowDimensions, Linking } from "react-native";
import { CardListItem } from "../../src/components/CardListItem";
import { MyCardItem, MyCardsMeta, myCardsGet, myCardsSync, myCardsGetPage } from "../../src/scoutApi"; /* XS_CARDS_MYCARDS_PAGINATION_V3 */
import { theme } from "../../src/theme";

const XS_DEVICE_KEY = "xs_device_id_v1";

function makeDeviceId(){
  const rand = Math.random().toString(36).slice(2, 10);
  return `dev_${Date.now()}_${rand}`;
}

async function ensureDeviceId(){
  const existing = (await AsyncStorage.getItem(XS_DEVICE_KEY))?.trim();
  if(existing) return existing;
  const generated = makeDeviceId();
  await AsyncStorage.setItem(XS_DEVICE_KEY, generated);
  return generated;
}

export default function CardsScreen(){
  /* XS_CARDS_TAB_TO_MYCARDS_CACHE_V1_BEGIN */
  const [deviceId, setDeviceId] = useState("");
  const [cards, setCards] = useState<MyCardItem[]>([]);
  const [meta, setMeta] = useState<MyCardsMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  // Pagination locale backend (/my-cards?first&after)
  const [after, setAfter] = useState<string | null>(null);
  const [hasNext, setHasNext] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const openOAuthLink = useCallback(async () => {
    const id = String(deviceId || "").trim();
    if(!id){ setError("deviceId introuvable"); return; }
    const BASE = (process.env.EXPO_PUBLIC_BASE_URL || "").trim();
    const finalBase = BASE ? BASE : "http://192.168.1.19:3000";
    const link = `${finalBase}/auth/sorare-device/login?deviceId=${encodeURIComponent(id)}`;
    try { await Linking.openURL(link); } catch(e:any){ setError(e?.message || "Impossible d'ouvrir le lien OAuth."); }
  }, [deviceId]);

  const { width } = useWindowDimensions();
  const layout = useMemo(() => {
    const H_PADDING = 16;
    const GAP = 12;
    const itemWidth = Math.floor((width - H_PADDING * 2 - GAP) / 2);
    return { H_PADDING, GAP, itemWidth };
  }, [width]);

  const load = useCallback(async (idArg?: string) => {
    const id = String(idArg || deviceId || "").trim();
    if(!id){
      setError("deviceId introuvable");
      setCards([]);
      setMeta(null);
      setLoading(false);
      return;
    }

    setError("");
    setLoading(true);
    try {
      const res = await myCardsGetPage(id, { first: 50, after: null });
      setMeta((res && (res as any).meta) ? ((res as any).meta as any) : null);
            const got = Array.isArray((res as any).cards) ? ((res as any).cards as any[]) : [];
      setCards(got);
      try {
        const pi = (res as any).pageInfo || null;
        const end = pi && pi.endCursor ? String(pi.endCursor) : null;
        const hn = !!(pi && pi.hasNextPage);
        setAfter(end);
        setHasNext(hn);
      } catch(e) { setAfter(null); setHasNext(false); }} catch(e: any){
      setError(e?.message || "Impossible de charger les cartes (backend).");
      setCards([]);
      setMeta(null);
    } finally {
      setLoading(false);
    }
  }, [deviceId]);
  const loadMore = useCallback(async () => {
    const id = String(deviceId || "").trim();
    if(!id) { setError("deviceId introuvable"); return; }
    if(loadingMore || loading || syncing) return;
    if(!hasNext || !after) return;

    setLoadingMore(true);
    setError("");
    try {
      const res = await myCardsGetPage(id, { first: 50, after });
      const got = Array.isArray((res as any).cards) ? ((res as any).cards as any[]) : [];
      setCards(prev => prev.concat(got));
      try {
        const pi = (res as any).pageInfo || null;
        const end = pi && pi.endCursor ? String(pi.endCursor) : null;
        const hn = !!(pi && pi.hasNextPage);
        setAfter(end);
        setHasNext(hn);
      } catch(e) {}
    } catch(e:any){
      setError(e?.message || "Impossible de charger plus de cartes (backend).");
    } finally {
      setLoadingMore(false);
    }
  }, [deviceId, after, hasNext, loadingMore, loading, syncing]);

  const syncAll = useCallback(async () => {
    const id = String(deviceId || "").trim();
    if(!id){
      setError("deviceId introuvable");
      return;
    }

    setSyncing(true);
    setError("");
    try {
      await myCardsSync(id, { jwtAud: "sorare:com", first: 100, maxPages: 120, maxCards: 6000, sleepMs: 200 });
      await load(id);
    } catch(e: any){
      setError(e?.message || "Synchronisation impossible (backend).");
    } finally {
      setSyncing(false);
    }
  }, [deviceId, load]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const id = await ensureDeviceId();
        if(!alive) return;
        setDeviceId(id);
        await load(id);
      } catch(e: any){
        if(!alive) return;
        setLoading(false);
        setError(e?.message || "Impossible d'initialiser le deviceId.");
      }
    })();
    return () => { alive = false; };
  }, [load]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={{ padding: 16, gap: 10 }}>
        <Text style={{ color: theme.text, fontSize: 22, fontWeight: "900" }}>
          Mes cartes • {meta?.count ?? cards.length}
        </Text>

        <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
          <Pressable
            onPress={() => load()}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 10,
              borderRadius: 14,
              backgroundColor: "rgba(59,130,246,0.18)",
              borderWidth: 1,
              borderColor: "rgba(59,130,246,0.35)",
            }}
          >
            <Text style={{ color: theme.text, fontWeight: "900" }}>Recharger</Text>
          </Pressable>

          <Pressable
            onPress={syncAll}
            disabled={syncing}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 10,
              borderRadius: 14,
              backgroundColor: syncing ? "rgba(156,163,175,0.20)" : "rgba(16,185,129,0.18)",
              borderWidth: 1,
              borderColor: syncing ? "rgba(156,163,175,0.35)" : "rgba(16,185,129,0.35)",
              opacity: syncing ? 0.85 : 1,
            }}
          >
            <Text style={{ color: theme.text, fontWeight: "900" }}>
              {syncing ? "Synchronisation..." : "Synchroniser (backend)"}
            </Text>
          </Pressable>
          <Pressable
            onPress={openOAuthLink}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 10,
              borderRadius: 14,
              backgroundColor: "rgba(168,85,247,0.16)",
              borderWidth: 1,
              borderColor: "rgba(168,85,247,0.35)",
            }}
          >
            <Text style={{ color: theme.text, fontWeight: "900" }}>Lier Sorare (OAuth)</Text>
          </Pressable>

          <Pressable
            onPress={loadMore}
            disabled={!hasNext || loadingMore}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 10,
              borderRadius: 14,
              backgroundColor: (!hasNext || loadingMore) ? "rgba(156,163,175,0.20)" : "rgba(245,158,11,0.16)",
              borderWidth: 1,
              borderColor: (!hasNext || loadingMore) ? "rgba(156,163,175,0.35)" : "rgba(245,158,11,0.35)",
              opacity: (!hasNext || loadingMore) ? 0.85 : 1,
            }}
          >
            <Text style={{ color: theme.text, fontWeight: "900" }}>
              {loadingMore ? "Chargement..." : "Charger plus"}
            </Text>
          </Pressable>
        </View>

        <Text style={{ color: theme.muted, fontSize: 12 }} numberOfLines={2}>
          deviceId: {deviceId || "—"}
        </Text>

        <Text style={{ color: theme.muted, fontSize: 12 }}>
          user: {meta?.userSlug || "—"} • fetchedAt: {meta?.fetchedAt || "—"} • pages: {String(meta?.pages ?? "—")}
        </Text>

        {error ? <Text style={{ color: theme.bad, fontWeight: "800" }}>Erreur: {error}</Text> : null}
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator />
          <Text style={{ color: theme.muted, marginTop: 8 }}>Chargement…</Text>
        </View>
      ) : (
        <FlatList
          key="grid2"
          data={cards}
          keyExtractor={(item: MyCardItem, index) => String((item as any)?.slug || `card-${index}`)}
          numColumns={2}
          contentContainerStyle={{ paddingHorizontal: layout.H_PADDING, paddingBottom: 120 }}
          renderItem={({ item, index }) => {
            const isLeft = index % 2 === 0;
            return (
              <View
                style={{
                  width: layout.itemWidth,
                  marginBottom: layout.GAP,
                  marginRight: isLeft ? layout.GAP : 0,
                }}
              >
                <CardListItem card={item as any} />
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={{ padding: 16 }}>
              <Text style={{ color: theme.muted }}>Aucune carte en cache. Clique “Synchroniser (backend)”.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
  /* XS_CARDS_TAB_TO_MYCARDS_CACHE_V1_END */
}
/* XS_CARDS_MYCARDS_PAGINATION_V3 */

