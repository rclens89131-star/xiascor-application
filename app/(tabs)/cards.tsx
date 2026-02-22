import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Image, Pressable, SafeAreaView, Text, View, useWindowDimensions } from "react-native";
import { theme } from "../../src/theme";
import { myCardsList, myCardsSync, type PageInfo } from "../../src/scoutApi";
/* XS_MYCARDS_UI_META_V1_BEGIN */
function xsNum(v: any): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function xsTxt(v: any): string {
  const s = (v == null) ? "" : String(v);
  return s.trim();
}
function xsBonusPctFromPower(power: any): number | null {
  // Sorare power is usually a multiplier string like "1.040"
  const p = xsNum(power);
  if (p === null) return null;
  return (p - 1) * 100;
}
/* XS_MYCARDS_UI_META_V1_END */
import { SorareCardTile } from "../../src/components/SorareCardTile"; // XS_SORARE_TILE_IMPORT_V1


const DEVICE_ID_KEY = "XS_DEVICE_ID_V1";
const JWT_DEVICE_ID_KEY = "XS_JWT_DEVICE_ID_V1";
const OAUTH_DEVICE_ID_KEY = "xs_device_id"; // XS_PREFER_OAUTH_DEVICEID_V2
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
      `${card?.anyPlayer?.displayName || card?.player?.displayName || "unknown"}

/* XS_CARDS_L15_LAST_V1 — helpers safe (L15 + last score) */
function getL15Value(card: any): number | null {
  const v =
    card?.l15 ??
    card?.L15 ??
    card?.l15Score ??
    card?.scoreL15 ??
    card?.player?.l15 ??
    card?.card?.l15 ??
    null;
  const n = typeof v === "number" ? v : (typeof v === "string" ? Number(v) : NaN);
  return Number.isFinite(n) ? n : null;
}

function getLastScoreValue(card: any): number | null {
  const direct =
    card?.lastScore ??
    card?.last_score ??
    card?.score ??
    card?.lastGameScore ??
    null;

  if (typeof direct === "number") return Number.isFinite(direct) ? direct : null;
  if (typeof direct === "string") {
    const n = Number(direct);
    return Number.isFinite(n) ? n : null;
  }

  const arr =
    card?.scores ??
    card?.gameScores ??
    card?.scoreHistory ??
    card?.games ??
    card?.recentScores ??
    null;

  if (Array.isArray(arr) && arr.length > 0) {
    const last = arr[arr.length - 1];
    const v = last?.score ?? last?.total ?? last?.value ?? last;
    const n = typeof v === "number" ? v : (typeof v === "string" ? Number(v) : NaN);
    return Number.isFinite(n) ? n : null;
  }

  return null;
}
/* XS_CARDS_L15_LAST_V1_END */
-${card?.seasonYear || "na"}-${card?.serialNumber || "na"}`
  );
}

/* XS_CARDS_L15_LAST_HELPERS_V2 — helpers safe (L15 + last score) */
function xsGetL15ValueV1(card: any): number | null {
  const v =
    card?.l15 ??
    card?.L15 ??
    card?.l15Score ??
    card?.scoreL15 ??
    card?.player?.l15 ??
    card?.card?.l15 ??
    null;
  const n = typeof v === "number" ? v : (typeof v === "string" ? Number(v) : NaN);
  return Number.isFinite(n) ? n : null;
}

function xsGetLastScoreValueV1(card: any): number | null {
  const direct =
    card?.lastScore ??
    card?.last_score ??
    card?.score ??
    card?.lastGameScore ??
    null;

  if (typeof direct === "number") return Number.isFinite(direct) ? direct : null;
  if (typeof direct === "string") {
    const n = Number(direct);
    return Number.isFinite(n) ? n : null;
  }

  const arr =
    card?.scores ??
    card?.gameScores ??
    card?.scoreHistory ??
    card?.games ??
    card?.recentScores ??
    null;

  if (Array.isArray(arr) && arr.length > 0) {
    const last = arr[arr.length - 1];
    const v = last?.score ?? last?.total ?? last?.value ?? last;
    const n = typeof v === "number" ? v : (typeof v === "string" ? Number(v) : NaN);
    return Number.isFinite(n) ? n : null;
  }

  return null;
}
/* XS_CARDS_L15_LAST_HELPERS_V2_END */
/* XS_MYCARDS_SORARE_TILE_V1_BEGIN */
function xsSafeStr(v: any): string {
  const s = (v == null) ? "" : String(v);
  return s.trim();
}

function xsTrendBarsFromL15(l15: number | null): 0|1|2|3|4 {
  if(typeof l15 !== "number") return 0;
  if(l15 >= 60) return 4;
  if(l15 >= 50) return 3;
  if(l15 >= 40) return 2;
  return 1;
}

function CardTile({ card, width }: { card: MyCardItemLocal; width: number }) {
  const playerName = xsSafeStr(card?.anyPlayer?.displayName || card?.player?.displayName || "Unknown");
  const clubName   = xsSafeStr(card?.anyTeam?.name || card?.player?.activeClub?.name || "—");
  const rarity     = xsSafeStr((card?.rarityTyped || card?.rarity || "limited")).toLowerCase();
  const season     = (card?.seasonYear != null) ? String(card.seasonYear) : "—";
  const serial     = (card?.serialNumber != null) ? "#" + String(card.serialNumber) : "#—";

  const l15 = (typeof (card as any)?.l15 === "number") ? (card as any).l15 : xsGetL15ValueV1(card as any);
  const bonusPct = xsBonusPctFromPower((card as any)?.power ?? (card as any)?.cardPower ?? (card as any)?.playerPower ?? null);

  return (
    <SorareCardTile
      
      width={width} imageUrl={xsSafeStr(card?.pictureUrl)}
      playerName={playerName}
      clubName={clubName}
      seasonLabel={season}
      serialLabel={serial}
      scarcityLabel={rarity}
      l15={l15}
      deltaPct={bonusPct}
      trendBars={xsTrendBarsFromL15(l15)}
    />
  );
}
/* XS_MYCARDS_SORARE_TILE_V1_END */

export default function CardsScreen() {
  /* XS_MY_CARDS_UI_V1_BEGIN */
  const [deviceId, setDeviceId] = useState("");
  const [items, setItems] = useState<MyCardItemLocal[]>([]);
  const [pageInfo, setPageInfo] = useState<PageInfo | undefined>();
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  /* XS_UI_LAST_SYNC_LABEL_V1 */
  const [lastSync, setLastSync] = useState<string>("");
  const loadingMoreRef = useRef(false);

  const ensureDeviceId = useCallback(async () => {
  // XS_PREFER_OAUTH_DEVICEID_V2 — prefer OAuth deviceId (xs_device_id) when available
  const oauthId = (await AsyncStorage.getItem(OAUTH_DEVICE_ID_KEY)) || "";
  if (oauthId.trim()) {
    try { await AsyncStorage.setItem(DEVICE_ID_KEY, oauthId.trim()); } catch {}
    return oauthId.trim();
  }

  // XS_PREFER_JWT_DEVICEID_V2 — then prefer the JWT-linked deviceId set in Settings
  const jwtId = (await AsyncStorage.getItem(JWT_DEVICE_ID_KEY)) || "";
  if (jwtId.trim()) return jwtId.trim();

  const existing = (await AsyncStorage.getItem(DEVICE_ID_KEY)) || "";
  if (existing.trim()) return existing.trim();

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
      
      try { setLastSync(String((res as any)?.meta?.fetchedAt || "")); } catch {}
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
      
      try { setLastSync(String((res as any)?.meta?.fetchedAt || "")); } catch {}
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
          <View style={{ gap: 2 }}>
            <Text style={{ color: theme.muted }}>{items.length} cartes • Device: {deviceId || "—"}</Text>
            {lastSync ? <Text style={{ color: theme.muted }}>Dernière sync: {lastSync}</Text> : null}
          </View>
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
                {/* XS_MYCARDS_UI_META_ITEM_V1 */}
                {(() => {
                  const player =
                    xsTxt((item as any)?.anyPlayer?.displayName) ||
                    xsTxt((item as any)?.player?.displayName) ||
                    xsTxt((item as any)?.anyPlayer?.slug) ||
                    "—";
                  const club =
                    xsTxt((item as any)?.anyTeam?.name) ||
                    xsTxt((item as any)?.player?.activeClub?.name) ||
                    xsTxt((item as any)?.anyTeam?.slug) ||
                    "—";
                    const grade = xsNum((item as any)?.grade);
  /* XS_UI_L5L15_V1 */
  const l5  = xsNum((item as any)?.l5);
  const l15 = xsNum((item as any)?.l15);
                  const bonus = xsBonusPctFromPower((item as any)?.power);
                  return (
                    <Text style={{ color: theme.text, opacity: 0.88, marginTop: 6, lineHeight: 18 }}>
                      {player} • {club}{"\n"}
                      Bonus: {bonus === null ? "—" : bonus.toFixed(1) + "%"}   Level: {grade === null ? "—" : String(grade)}{"\n"}L5: {l5 === null ? "—" : String(l5)}   L15: {l15 === null ? "—" : String(l15)}
                    </Text>
                  );
                })()}
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














