import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, SafeAreaView, Text, View, useWindowDimensions } from "react-native";
import { CardListItem } from "../../src/components/CardListItem";
import { MyCardItem, MyCardsMeta, myCardsGetPage, myCardsSync } from "../../src/scoutApi";
import { theme } from "../../src/theme";

/* XS_CARDS_AUTOLOAD_ALL_NOUI_V1 */

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

function rarityOf(item: any): string {
  return String(
    item?.rarityTyped ??
    item?.rarity ??
    item?.card?.rarity ??
    ""
  ).toLowerCase().trim();
}

function isAllowedRarity(item: any): boolean {
  const r = rarityOf(item);
  // ✅ Pas de common
  if(!r) return false;
  return r === "limited" || r === "rare" || r === "super_rare" || r === "unique";
}

export default function CardsScreen(){
  const [deviceId, setDeviceId] = useState("");
  const [cards, setCards] = useState<MyCardItem[]>([]);
  const [meta, setMeta] = useState<MyCardsMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const { width } = useWindowDimensions();
  const layout = useMemo(() => {
    const H_PADDING = 16;
    const GAP = 12;
    const itemWidth = Math.floor((width - H_PADDING * 2 - GAP) / 2);
    return { H_PADDING, GAP, itemWidth };
  }, [width]);

  const loadAllPages = useCallback(async (id: string) => {
    let after: string | null = null;
    let guard = 0;

    const all: any[] = [];
    for(;;){
      guard++;
      if(guard > 300) break; // garde-fou

      const res = await myCardsGetPage(id, { first: 200, after });
      const got = Array.isArray((res as any)?.cards) ? (res as any).cards : [];
      for(const c of got){
        if(isAllowedRarity(c)) all.push(c);
      }

      const m = (res && (res as any).meta) ? ((res as any).meta as any) : null;
      if(m) setMeta(m);

      const pi = (res as any)?.pageInfo || null;
      const nextAfter = pi && pi.endCursor ? String(pi.endCursor) : null;
      const hasNext = !!(pi && pi.hasNextPage);

      after = (hasNext && nextAfter) ? nextAfter : null;
      if(!after) break;
    }

    // dédoublonnage (sécurité)
    const seen = new Set<string>();
    const uniq: any[] = [];
    for(const c of all){
      const key = String((c as any)?.slug || "");
      if(!key) continue;
      if(seen.has(key)) continue;
      seen.add(key);
      uniq.push(c);
    }

    setCards(uniq);
  }, []);

  const refreshSilent = useCallback(async (id: string) => {
    setError("");
    setLoading(true);

    try {
      // 1) Sync invisible (backend cache). Si déjà à jour, c'est rapide.
      //    Si pas de token => erreur auth_token_not_found (on gère proprement).
      try {
        await myCardsSync(id, { jwtAud: "sorare:com", first: 100, maxPages: 200, maxCards: 8000, sleepMs: 200 });
      } catch(e: any){
        const msg = String(e?.message || "");
        if(msg.includes("auth_token_not_found")){
          setError("Compte Sorare non connecté sur ce téléphone. Connecte-toi dans Paramètres, puis reviens ici.");
          setCards([]);
          setMeta(null);
          return;
        }
        // autre erreur: on continue quand même avec cache existant
      }

      // 2) Load TOUT (pagination auto) + filtre anti-common
      await loadAllPages(id);
    } catch(e: any){
      setError(e?.message || "Impossible de charger les cartes.");
      setCards([]);
      setMeta(null);
    } finally {
      setLoading(false);
    }
  }, [loadAllPages]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const id = await ensureDeviceId();
        if(!alive) return;
        setDeviceId(id);
        await refreshSilent(id);
      } catch(e: any){
        if(!alive) return;
        setLoading(false);
        setError(e?.message || "Impossible d'initialiser le deviceId.");
      }
    })();
    return () => { alive = false; };
  }, [refreshSilent]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={{ padding: 16, gap: 8 }}>
        <Text style={{ color: theme.text, fontSize: 22, fontWeight: "900" }}>
          Mes cartes • {cards.length}
        </Text>

        <Text style={{ color: theme.muted, fontSize: 12 }} numberOfLines={1}>
          deviceId: {deviceId || "—"}
        </Text>

        <Text style={{ color: theme.muted, fontSize: 12 }} numberOfLines={1}>
          user: {meta?.userSlug || "—"} • fetchedAt: {meta?.fetchedAt || "—"} • pages: {String(meta?.pages ?? "—")}
        </Text>

        {error ? (
          <Text style={{ color: theme.bad, fontWeight: "900" }}>
            Erreur: {error}
          </Text>
        ) : null}
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator />
          <Text style={{ color: theme.muted, marginTop: 8 }}>
            Chargement…
          </Text>
        </View>
      ) : (
        <FlatList
          data={cards}
          keyExtractor={(item, index) => String((item as any)?.slug || `card-${index}`)}
          numColumns={2}
          contentContainerStyle={{ paddingHorizontal: layout.H_PADDING, paddingBottom: 120 }}
          renderItem={({ item, index }) => {
            const isLeft = index % 2 === 0;
            return (
              <View style={{ width: layout.itemWidth, marginBottom: layout.GAP, marginRight: isLeft ? layout.GAP : 0 }}>
                <CardListItem card={item as any} />
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={{ padding: 16 }}>
              <Text style={{ color: theme.muted }}>
                Aucune carte (hors Common) trouvée.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
