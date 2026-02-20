import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useCallback, useEffect, useMemo, useState } from "react";
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

// XS_MY_CARDS_TAB_V2_BEGIN
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

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const id =
          (await AsyncStorage.getItem("xs_device_id_v1")) ||
          (await AsyncStorage.getItem("deviceId")) ||
          "";
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

  const loadPage = useCallback(
    async (mode: "reset" | "more") => {
      const id = String(deviceId || "").trim();
      if (!id) {
        setError("deviceId introuvable. Ouvre Paramètres/Connexion puis réessaie.");
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
        const res = await myCardsPage(id, {
          first: 20,
          after: mode === "more" ? (endCursor ?? undefined) : undefined,
        });

        if (!res.ok) {
          setError(res.error || "Erreur de chargement");
        } else {
          setCards((prev) => uniqBySlug(mode === "reset" ? res.cards : [...prev, ...res.cards]));
          setEndCursor(res.pageInfo?.endCursor ?? null);
          setHasNextPage(Boolean(res.pageInfo?.hasNextPage));
          setMeta(res.meta ?? null);
        }
      } catch (e: any) {
        setError(String(e?.message || e || "Erreur de chargement"));
      }

      if (mode === "reset") setLoading(false);
      setLoadingMore(false);
    },
    [deviceId, endCursor]
  );

  useEffect(() => {
    if (!deviceId) {
      setLoading(false);
      return;
    }
    loadPage("reset");
    myCardsStatus(deviceId)
      .then((st) => {
        if (st && st.meta) setMeta(st.meta);
      })
      .catch(() => {});
  }, [deviceId, loadPage]);

  const onSync = useCallback(async () => {
    const id = String(deviceId || "").trim();
    if (!id) {
      setError("deviceId introuvable. Ouvre Paramètres/Connexion puis réessaie.");
      return;
    }
    setSyncing(true);
    setError(null);
    try {
      // opts safe: defaults already exist server-side; keep it small for dev
      await myCardsSync(id, { first: 50, maxPages: 2, sleepMs: 0 });
    } catch (e: any) {
      setError(String(e?.message || e || "Échec de synchronisation"));
    }
    await loadPage("reset");
    setSyncing(false);
  }, [deviceId, loadPage]);

  const headerLabel = useMemo(() => {
    const count = meta?.count ?? cards.length;
    const fetched = meta?.fetchedAt ? String(meta.fetchedAt) : "";
    return fetched ? `${count} cartes • ${fetched}` : `${count} cartes`;
  }, [cards.length, meta]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={{ padding: 16, gap: 10 }}>
        <Text style={{ color: theme.text, fontSize: 22, fontWeight: "900" }}>Mes cartes</Text>

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
                Aucune carte en cache. Lance une synchronisation.
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
// XS_MY_CARDS_TAB_V2_END
