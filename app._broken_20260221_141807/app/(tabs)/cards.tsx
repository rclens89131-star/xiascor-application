import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Image, Pressable, RefreshControl, SafeAreaView, Text, View } from "react-native";
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

function parseIsoMs(s?: string) {
  const t = Date.parse(String(s || ""));
  return Number.isFinite(t) ? t : 0;
}

// XS_MY_CARDS_TAB_V5_BEGIN
export default function CardsScreen() {
  const [deviceId, setDeviceId] = useState("");
  const [cards, setCards] = useState<MyCard[]>([]);
  const [meta, setMeta] = useState<any>(null);

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Erreurs: visibles seulement si l'utilisateur a cliqué "Synchroniser"
  const [userSyncError, setUserSyncError] = useState<string | null>(null);

  const [endCursor, setEndCursor] = useState<string | null>(null);
  const [hasNextPage, setHasNextPage] = useState(false);
  const endCursorRef = useRef<string | null>(null);
  useEffect(() => { endCursorRef.current = endCursor; }, [endCursor]);

  const xsAutoSyncInFlight = useRef(false);
  const xsLastAutoSyncAt = useRef(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const id = await ensureDeviceId();
        if (!alive) return;
        setDeviceId(String(id || "").trim());
      } catch {
        if (!alive) return;
        setDeviceId("");
      }
    })();
    return () => { alive = false; };
  }, []);

  const refreshStatus = useCallback(async (id: string) => {
    try {
      const st = await myCardsStatus(id);
      if (st && st.meta) setMeta(st.meta);
      return st || null;
    } catch {
      return null;
    }
  }, []);

  const loadPage = useCallback(async (mode: "reset" | "more") => {
    const id = String(deviceId || "").trim();
    if (!id) {
      setLoading(false);
      return;
    }

    if (mode === "reset") {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const after = mode === "more" ? (endCursorRef.current ?? undefined) : undefined;
      const res = await myCardsPage(id, { first: 20, after });

      if (res.ok) {
        setCards((prev) => uniqBySlug(mode === "reset" ? res.cards : [...prev, ...res.cards]));
        setEndCursor(res.pageInfo?.endCursor ?? null);
        setHasNextPage(Boolean(res.pageInfo?.hasNextPage));
        if (res.meta) setMeta(res.meta);
      }
    } catch {
      // silencieux (pas de debug visible)
    }

    if (mode === "reset") setLoading(false);
    setLoadingMore(false);
  }, [deviceId]);

  // Sync: silent=true => pas de messages visibles
  const runSync = useCallback(async (silent: boolean) => {
    const id = String(deviceId || "").trim();
    if (!id) return;

    if (!silent) setUserSyncError(null);
    setSyncing(true);

    try {
      await myCardsSync(id, { first: 50, maxPages: 6, sleepMs: 0 });
      await refreshStatus(id);
      await loadPage("reset");
    } catch (e: any) {
      if (!silent) setUserSyncError(String(e?.message || e || "Échec sync"));
    } finally {
      setSyncing(false);
    }
  }, [deviceId, loadPage, refreshStatus]);

  // Premier chargement + auto-sync "en arrière-plan" (tant que l'écran est ouvert)
  useEffect(() => {
    const id = String(deviceId || "").trim();
    if (!id) { setLoading(false); return; }

    (async () => {
      await loadPage("reset");

      const st = await refreshStatus(id);

      // Heuristique auto-sync:
      // - si pas de cache, ou cache trop vieux (> 6h), on sync en SILENCIEUX
      // - anti-spam: au max 1 auto-sync toutes les 3 minutes
      const now = Date.now();
      const fetchedAtMs = parseIsoMs(st?.meta?.fetchedAt);
      const stale = !fetchedAtMs || (now - fetchedAtMs) > (6 * 60 * 60 * 1000);
      const throttled = (now - xsLastAutoSyncAt.current) < (3 * 60 * 1000);

      if (!throttled && stale && !xsAutoSyncInFlight.current) {
        xsAutoSyncInFlight.current = true;
        xsLastAutoSyncAt.current = now;
        try {
          await runSync(true);
        } finally {
          xsAutoSyncInFlight.current = false;
        }
      }
    })();
  }, [deviceId, loadPage, refreshStatus, runSync]);

  const headerLabel = useMemo(() => {
    const count = meta?.count ?? cards.length;
    const fetched = meta?.fetchedAt ? String(meta.fetchedAt) : "";
    return fetched ? `${count} cartes • ${fetched}` : `${count} cartes`;
  }, [cards.length, meta]);

  const onManualSync = useCallback(() => runSync(false), [runSync]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={{ padding: 16, gap: 10 }}>
        <Text style={{ color: theme.text, fontSize: 22, fontWeight: "900" }}>Mes cartes</Text>

        {/* UI produit: on garde seulement une info utile (compte + dernière synchro) */}
        <Text style={{ color: theme.muted }}>{headerLabel}</Text>

        {userSyncError ? (
          <Text style={{ color: theme.bad, fontWeight: "800" }}>
            Impossible de synchroniser. Réessaie.
          </Text>
        ) : null}

        <Pressable
          onPress={onManualSync}
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
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
          }}
        >
          {syncing ? <ActivityIndicator /> : null}
          <Text style={{ color: theme.text, fontWeight: "800" }}>
            {syncing ? "Synchronisation…" : "Synchroniser"}
          </Text>
        </Pressable>
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
          refreshControl={
            <RefreshControl refreshing={false} onRefresh={() => loadPage("reset")} />
          }
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
              <Text style={{ color: theme.muted }}>Aucune carte en cache. Appuie sur Synchroniser.</Text>
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
// XS_MY_CARDS_TAB_V5_END
