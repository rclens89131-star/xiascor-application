import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Image, Pressable, SafeAreaView, Text, View, useWindowDimensions } from "react-native";
import { theme } from "../../src/theme";
import { myCardsList, myCardsSync, type PageInfo } from "../../src/scoutApi";

const DEVICE_ID_KEY = "XS_DEVICE_ID_V1";

/* XS_MY_CARDS_UI_TYPING_V1_BEGIN */
type MyCardItemLocal = {
  slug?: string;
  pictureUrl?: string | null;
  rarity?: string | null;
  rarityTyped?: string | null;
  seasonYear?: number | null;
  serialNumber?: number | null;
  anyTeam?: { name?: string | null } | null;
  anyPlayer?: { displayName?: string | null } | null;
  player?: { displayName?: string | null; activeClub?: { name?: string | null } | null } | null;
};
/* XS_MY_CARDS_UI_TYPING_V1_END */


function cardKey(card: MyCardItemLocal) {
  return String(
    card?.slug ||
      `${card?.anyPlayer?.displayName || card?.player?.displayName || "unknown"}-${card?.seasonYear || "na"}-${card?.serialNumber || "na"}`
  );
}

function CardTile({ card, width }: { card: MyCardItemLocal; width: number }) {
  const playerName = card?.anyPlayer?.displayName || card?.player?.displayName || "Unknown";
  const club = card?.anyTeam?.name || card?.player?.activeClub?.name || "—";
  const rarity = (card?.rarityTyped || card?.rarity || "limited").toString().toLowerCase();

  return (
    <View
      style={{
        width,
        backgroundColor: theme.panel,
        borderWidth: 1,
        borderColor: theme.stroke,
        borderRadius: 16,
        overflow: "hidden",
      }}
    >
      <View style={{ width: "100%", aspectRatio: 320 / 448, backgroundColor: theme.panel2 }}>
        {card?.pictureUrl ? (
          <Image source={{ uri: card.pictureUrl }} style={{ width: "100%", height: "100%" }} resizeMode="contain" />
        ) : null}
      </View>
      <View style={{ padding: 10, gap: 2 }}>
        <Text style={{ color: theme.text, fontWeight: "900" }} numberOfLines={1}>
          {playerName}
        </Text>
        <Text style={{ color: theme.muted }} numberOfLines={1}>
          {club}
        </Text>
        <Text style={{ color: theme.muted }} numberOfLines={1}>
          {card?.seasonYear || "—"} • #{card?.serialNumber || "—"} • {rarity}
        </Text>
      </View>
    </View>
  );
}

export default function CardsScreen() {
  /* XS_MY_CARDS_UI_V1_BEGIN */
  const [deviceId, setDeviceId] = useState("");
  const [items, setItems] = useState<MyCardItemLocal[]>([]);
  const [pageInfo, setPageInfo] = useState<PageInfo | undefined>();
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const loadingMoreRef = useRef(false);

  const ensureDeviceId = useCallback(async () => {
    const existing = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (existing) return existing;
    const generated = `xs-device-${Date.now()}`;
    await AsyncStorage.setItem(DEVICE_ID_KEY, generated);
    return generated;
  }, []);

  const loadInitial = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const id = await ensureDeviceId();
      setDeviceId(id);
      const res = await myCardsList(id, 50);
      setItems(res.cards || []);
      setPageInfo(res.pageInfo);
    } catch (e: any) {
      setError(e?.message || "Erreur chargement");
    } finally {
      setLoading(false);
    }
  }, [ensureDeviceId]);

  const loadMore = useCallback(async () => {
    if (!pageInfo?.hasNextPage || !pageInfo?.endCursor || loadingMoreRef.current || !deviceId) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const res = await myCardsList(deviceId, 50, pageInfo.endCursor || undefined);
      setItems((prev) => [...prev, ...(res.cards || [])]);
      setPageInfo(res.pageInfo);
    } catch (e: any) {
      setError(e?.message || "Erreur pagination");
    } finally {
      setLoadingMore(false);
      loadingMoreRef.current = false;
    }
  }, [deviceId, pageInfo?.endCursor, pageInfo?.hasNextPage]);

  const onSync = useCallback(async () => {
    if (!deviceId) return;
    setSyncing(true);
    setError("");
    try {
      await myCardsSync(deviceId, { first: 50, maxPages: 80, maxCards: 20000, sleepMs: 250 });
      await loadInitial();
    } catch (e: any) {
      setError(e?.message || "Erreur synchronisation");
    } finally {
      setSyncing(false);
    }
  }, [deviceId, loadInitial]);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  const { width } = useWindowDimensions();
  const layout = useMemo(() => {
    const H_PADDING = 16;
    const GAP = 12;
    const itemWidth = Math.floor((width - H_PADDING * 2 - GAP) / 2);
    return { H_PADDING, GAP, itemWidth };
  }, [width]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={{ padding: 16, gap: 10 }}>
        <Text style={{ color: theme.text, fontSize: 22, fontWeight: "900" }}>Mes cartes</Text>

        <Pressable
          onPress={onSync}
          disabled={syncing || loading}
          style={{
            paddingHorizontal: 12,
            paddingVertical: 10,
            alignSelf: "flex-start",
            borderRadius: 14,
            backgroundColor: "rgba(59,130,246,0.18)",
            borderWidth: 1,
            borderColor: "rgba(59,130,246,0.35)",
            opacity: syncing || loading ? 0.7 : 1,
          }}
        >
          <Text style={{ color: theme.text, fontWeight: "900" }}>{syncing ? "Synchronisation…" : "Synchroniser"}</Text>
        </Pressable>

        {error ? (
          <Text style={{ color: theme.bad, fontWeight: "800" }}>Erreur: {error}</Text>
        ) : (
          <Text style={{ color: theme.muted }}>{items.length} cartes • Device: {deviceId || "—"}</Text>
        )}
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator />
          <Text style={{ color: theme.muted, marginTop: 8 }}>Chargement…</Text>
        </View>
      ) : (
        <FlatList
          key="grid2"
          data={items}
          keyExtractor={(item) => cardKey(item)}
          numColumns={2}
          contentContainerStyle={{ paddingHorizontal: layout.H_PADDING, paddingBottom: 120 }}
          onEndReached={loadMore}
          onEndReachedThreshold={0.6}
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
                <CardTile card={item} width={layout.itemWidth} />
              </View>
            );
          }}
          ListFooterComponent={
            loadingMore ? (
              <View style={{ paddingVertical: 16 }}>
                <ActivityIndicator />
              </View>
            ) : (
              <View style={{ height: 16 }} />
            )
          }
          ListEmptyComponent={
            <View style={{ padding: 16 }}>
              <Text style={{ color: theme.muted }}>Aucune carte en cache. Lance une synchronisation.</Text>
              <Pressable onPress={onSync} style={{ marginTop: 12 }}>
                <Text style={{ color: theme.accent, fontWeight: "900" }}>Synchroniser</Text>
              </Pressable>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
  /* XS_MY_CARDS_UI_V1_END */
}

