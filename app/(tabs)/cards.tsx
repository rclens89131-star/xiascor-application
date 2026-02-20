import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Image, Pressable, SafeAreaView, Text, View } from "react-native";
import { myCardsPage, myCardsStatus, myCardsSync } from "../../src/scoutApi";
import { theme } from "../../src/theme";

type MyCard = {
  slug?: string;
  pictureUrl?: string;
  rarity?: string;
  rarityTyped?: string;
  seasonYear?: number | string;
  serialNumber?: number | string;
};

function uniqBySlug(items: MyCard[]) {
  const m = new Map<string, MyCard>();
  for (const c of items) {
    const k = String(c?.slug || "").trim();
    if (!k) continue;
    if (!m.has(k)) m.set(k, c);
  }
  return Array.from(m.values());
}

const XS_DEVICE_KEY = "xs_device_id_v1";
function makeDeviceId() {
  const rand = Math.random().toString(36).slice(2, 10);
  return `dev_${Date.now()}_${rand}`;
}
async function ensureDeviceId() {
  const existing = String((await AsyncStorage.getItem(XS_DEVICE_KEY)) || "").trim();
  if (existing) return existing;
  const generated = makeDeviceId();
  await AsyncStorage.setItem(XS_DEVICE_KEY, generated);
  return generated;
}

// XS_MY_CARDS_TAB_V3_BEGIN
export default function CardsScreen() {
  const [deviceId, setDeviceId] = useState("");
  const [cards, setCards] = useState<MyCard[]>([]);
  const [meta, setMeta] = useState<any>(null);

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [endCursor, setEndCursor] = useState<string | null>(null);
  const [hasNextPage, setHasNextPage] = useState(false);

  // Anti-loop: utiliser un ref pour endCursor au lieu de le mettre dans deps d'un callback
  const endCursorRef = useRef<string | null>(null);
  useEffect(() => {
    endCursorRef.current = endCursor;
  }, [endCursor]);

  // Debug visible: status snapshot
  const [statusSnap, setStatusSnap] = useState<any>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        // On force xs_device_id_v1 si absent (sinon sur iPhone ça peut être vide)
        const id = await ensureDeviceId();
        if (!alive) return;
        setDeviceId(String(id || "").trim());
      } catch (e) {
        if (!alive) return;
        setDeviceId("");
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const refreshStatus = useCallback(async (id: string) => {
    try {
      const st = await myCardsStatus(id);
      setStatusSnap(st || null);
      if (st && st.meta) setMeta(st.meta);
    } catch {
      // ignore
    }
  }, []);

  const loadPage = useCallback(
    async (mode: "reset" | "more") => {
      const id = String(deviceId || "").trim();
      if (!id) {
        setError("deviceId introuvable (AsyncStorage).");
        setLoading(false);
        return;
      }

      if (mode === "reset") {
        setLoading(true);
        setError(null);
      } else {
        setLoadingMore(true);
      }

      try {
        const after = mode === "more" ? (endCursorRef.current ?? undefined) : undefined;
        const res = await myCardsPage(id, { first: 20, after });

        if (!res.ok) {
          setError(res.error || "Erreur de chargement");
        } else {
          setCards((prev) => uniqBySlug(mode === "reset" ? res.cards : [...prev, ...res.cards]));
          setEndCursor(res.pageInfo?.endCursor ?? null);
          setHasNextPage(Boolean(res.pageInfo?.hasNextPage));
          if (res.meta) setMeta(res.meta);
        }
      } catch (e: any) {
        setError(String(e?.message || e || "Erreur de chargement"));
      }

      if (mode === "reset") setLoading(false);
      setLoadingMore(false);
    },
    [deviceId]
  );

  // IMPORTANT: déclencher le premier load UNIQUEMENT quand deviceId arrive (anti-loop)
  useEffect(() => {
    const id = String(deviceId || "").trim();
    if (!id) {
      setLoading(false);
      return;
    }
    loadPage("reset");
    refreshStatus(id);
  }, [deviceId, loadPage, refreshStatus]);

  const onSync = useCallback(async () => {
    const id = String(deviceId || "").trim();
    if (!id) {
      setError("deviceId introuvable.");
      return;
    }
    setSyncing(true);
    setError(null);

    try {
      // Flow: sync -> status -> reload page1
      await myCardsSync(id, { first: 50, maxPages: 2, sleepMs: 0 });
      await refreshStatus(id);
    } catch (e: any) {
      setError(String(e?.message || e || "Échec sync (voir logs)"));
    }

    await loadPage("reset");
    setSyncing(false);
  }, [deviceId, loadPage, refreshStatus]);

  const headerLabel = useMemo(() => {
    const count = meta?.count ?? cards.length;
    const fetched = meta?.fetchedAt ? String(meta.fetchedAt) : "";
    return fetched ? `${count} cartes • ${fetched}` : `${count} cartes`;
  }, [cards.length, meta]);

  const debugLine = useMemo(() => {
    const st = statusSnap || {};
    const cached = typeof st.cached === "boolean" ? String(st.cached) : "-";
    const cnt = (st.count != null) ? String(st.count) : "-";
    const user = st?.meta?.userSlug ? String(st.meta.userSlug) : "-";
    return `deviceId=${deviceId || "-"} • cached=${cached} • count=${cnt} • user=${user}`;
  }, [statusSnap, deviceId]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={{ padding: 16, gap: 10 }}>
        <Text style={{ color: theme.text, fontSize: 22, fontWeight: "900" }}>Mes cartes</Text>

        <Text style={{ color: theme.muted, fontSize: 12 }} numberOfLines={2}>
          {debugLine}
        </Text>

        <Pressable
          onPress={onSync}
          disabled={syncing}
          style={{
            alignSelf: "flex-start",
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 12,
            backgroundColor: "rgba(59,130,246,0.18)",
            borderWidth: 1,
            borderColor: "rgba(59,130,246,0.35)",
            opacity: syncing ? 0.7 : 1,
          }}
        >
          <Text style={{ color: theme.text, fontWeight: "800" }}>
            {syncing ? "Synchronisation…" : "Synchroniser"}
          </Text>
        </Pressable>

        <Text style={{ color: theme.muted }}>{headerLabel}</Text>
        {error ? <Text style={{ color: theme.bad, fontWeight: "800" }}>Erreur: {error}</Text> : null}
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator />
          <Text style={{ color: theme.muted, marginTop: 8 }}>Chargement…</Text>
        </View>
      ) : (
        <FlatList
          data={cards}
          keyExtractor={(item, idx) => String(item?.slug || idx)}
          numColumns={2}
          contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 120 }}
          columnWrapperStyle={{ gap: 10 }}
          renderItem={({ item }) => (
            <View
              style={{
                width: "48%",
                backgroundColor: theme.panel,
                borderRadius: 12,
                marginBottom: 10,
                borderWidth: 1,
                borderColor: theme.stroke,
                overflow: "hidden",
              }}
            >
              <Image
                source={{ uri: item?.pictureUrl || "https://via.placeholder.com/400x560?text=No+Image" }}
                style={{ width: "100%", aspectRatio: 0.72, backgroundColor: "#1a1a1a" }}
              />
              <View style={{ padding: 8, gap: 4 }}>
                <Text style={{ color: theme.text, fontWeight: "700" }}>
                  {String(item?.rarity || item?.rarityTyped || "unknown")}
                </Text>
                <Text style={{ color: theme.muted, fontSize: 12 }}>
                  Saison {String(item?.seasonYear ?? "-")} • #{String(item?.serialNumber ?? "-")}
                </Text>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={{ padding: 16 }}>
              <Text style={{ color: theme.muted }}>
                Aucune carte en cache. Appuie sur Synchroniser.
              </Text>
            </View>
          }
          ListFooterComponent={
            <View style={{ paddingVertical: 14, alignItems: "center" }}>
              {loadingMore ? (
                <ActivityIndicator />
              ) : hasNextPage ? (
                <Pressable
                  onPress={() => loadPage("more")}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 9,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: theme.stroke,
                    backgroundColor: theme.panel,
                  }}
                >
                  <Text style={{ color: theme.text, fontWeight: "700" }}>Charger plus</Text>
                </Pressable>
              ) : null}
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
// XS_MY_CARDS_TAB_V3_END
