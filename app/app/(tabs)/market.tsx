import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator,
  FlatList,
  SafeAreaView,
  Text,
  TouchableOpacity,
  View, Image, Modal, Pressable } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

type MarketOffer = {
  id: string;
  status?: string;
  cardSlug?: string;
  cardName?: string;
  pictureUrl?: string;  // XS_MARKET_APP_IMG_V1
  rarity?: string;
  collection?: string;
  eur?: number | null;
  wei?: string | null;
  price?: { currency: "EUR" | "WEI" | string; amount: any } | null;
  priceText?: string;
};

type MarketOffersResponse = {
  ok: boolean;
  fromCache?: boolean;
  count?: number;   // total renvoyé par backend (après ses filtres)
  items: MarketOffer[];
  error?: string;
};

const BASE_URL = process.env.EXPO_PUBLIC_BASE_URL ?? "http://127.0.0.1:3000";

async function getStoredDeviceId(): Promise<string | null> {
  const v = await AsyncStorage.getItem("deviceId");
  return (v && v.trim() ? v.trim() : "dev_mkwlzdch_ux00v6v0qj"); // fallback debug
}

async function fetchMarketOffers(
  baseUrl: string,
  deviceId: string,
  first = 50,
  eurOnly = true
) {
  const qs = new URLSearchParams();
  qs.set("deviceId", deviceId);
  qs.set("first", String(first));
  if (eurOnly) qs.set("eurOnly", "1");

  const url = `${baseUrl}/market/offers?${qs.toString()}`;
  const res = await fetch(url);
  const text = await res.text();

  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Réponse non-JSON: ${text.slice(0, 160)}`);
  }

  if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
  return { url, data: json as MarketOffersResponse };
}

function formatPrice(o: MarketOffer) {
  if (o?.priceText && o.priceText.trim()) return o.priceText;
  if (typeof o?.eur === "number") return `€${o.eur.toFixed(2)}`;
  if (o?.wei) return `WEI ${o.wei}`;
  if (o?.price?.currency === "WEI" && o?.price?.amount) return `WEI ${String(o.price.amount)}`;
  return "—";
}

function norm(s?: string) {
  return String(s || "").trim().toLowerCase();
}

export default function MarketScreen() {
  
  
  // XS_DEVICEID_STATE_V3_BEGIN
  const [deviceId, setDeviceId] = useState<string>("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const v = await AsyncStorage.getItem("deviceId");
        if (alive && v) setDeviceId(String(v));
      } catch {}
    })();
    return () => { alive = false; };
  }, []);
  // XS_DEVICEID_STATE_V3_END
// XS_MARKET_V3_STATE_V1_BEGIN
  const [selected, setSelected] = useState<MarketOffer | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const xsOpenOffer = (it: MarketOffer) => {
    setSelected(it);
    setModalOpen(true);
  };
  const xsCloseOffer = () => setModalOpen(false);
  // XS_MARKET_V3_STATE_V1_END
const [offers, setOffers] = useState<MarketOffer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [meta, setMeta] = useState<{ fromCache?: boolean; count?: number } | null>(null);

  // UI settings
  const [first, setFirst] = useState(50);
  const [eurOnly, setEurOnly] = useState(true);
  const [footballOnly, setFootballOnly] = useState(true);
  const [rarity, setRarity] = useState<"all" | "limited" | "rare" | "super_rare" | "unique">("all");
  const [sortAsc, setSortAsc] = useState(true);
  const [showDebug, setShowDebug] = useState(false);

  // debug
  const [lastUrl, setLastUrl] = useState<string | null>(null);
  const [lastDeviceId, setLastDeviceId] = useState<string | null>(null);

  const stats = useMemo(() => {
    const fetched = offers.length;
    const eurCount = offers.filter(o => typeof o.eur === "number" && o.eur !== null).length;
    return { fetched, eurCount };
  }, [offers]);
  // XS_MARKET_V3_PREFETCH_V1_BEGIN
  useEffect(() => {
    try {
      const urls = (shown || [])
        .map((o: any) => o?.pictureUrl)
        .filter((u: any) => typeof u === "string" && u.startsWith("http"));
      // évite d'exploser la RAM: on précharge juste les 12 premières
      urls.slice(0, 12).forEach((u: string) => { Image.prefetch(u); });
    } catch {}
  }, [shown]);
  // XS_MARKET_V3_PREFETCH_V1_END


  const shown = useMemo(() => {
    let arr = offers.slice();
if (footballOnly) {
      arr = arr.filter(o => norm(o.collection) === "football");
    }

    if (eurOnly) {
      arr = arr.filter(o => typeof o.eur === "number" && o.eur !== null);
    }

    if (rarity !== "all") {
      arr = arr.filter(o => norm(o.rarity) === rarity);
    }

    // tri prix EUR (les null vont à la fin si eurOnly=false)
    arr.sort((a, b) => {
      const ae = typeof a.eur === "number" ? a.eur : Number.POSITIVE_INFINITY;
      const be = typeof b.eur === "number" ? b.eur : Number.POSITIVE_INFINITY;
      return sortAsc ? (ae - be) : (be - ae);
    });

    return arr;
  }, [offers, eurOnly, footballOnly, rarity, sortAsc]);

  const loadOffers = async () => {
    try {
      setLoading(true);
      setError(null);

      const deviceId = await getStoredDeviceId();
      if (!deviceId) throw new Error("deviceId introuvable. Connecte l'app (device login) puis réessaie.");

      setLastDeviceId(deviceId);

      const { url, data } = await fetchMarketOffers(BASE_URL, deviceId, first, eurOnly);
      setLastUrl(url);

      setOffers(Array.isArray(data.items) ? data.items : []);
      setMeta({ fromCache: data.fromCache, count: data.count });
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  const Chip = ({
    label,
    active,
    onPress,
  }: {
    label: string;
    active: boolean;
    onPress: () => void;
  }) => (
    <TouchableOpacity
      onPress={onPress}
      style={{
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderRadius: 999,
        backgroundColor: active ? "#1f6feb" : "#222",
        marginRight: 8,
        marginTop: 8,
      }}
    >
      <Text style={{ color: "white", fontWeight: "700", fontSize: 12 }}>{label}</Text>
    </TouchableOpacity>
  );

        const renderItem = ({ item }: { item: MarketOffer }) => {
    const isSkeleton = typeof item?.id === "string" && item.id.startsWith("sk-");

    const rarityKey = String(item?.rarity || "").toLowerCase();
    const rarityLabel = (rarityKey || "—").replace(/_/g, " ").toUpperCase();

    const rarityStyle = (() => {
      if (rarityKey === "unique") return { bg: "rgba(255, 215, 0, 0.16)", bd: "rgba(255, 215, 0, 0.35)" };
      if (rarityKey === "super_rare") return { bg: "rgba(0, 200, 255, 0.14)", bd: "rgba(0, 200, 255, 0.32)" };
      if (rarityKey === "rare") return { bg: "rgba(255, 80, 180, 0.14)", bd: "rgba(255, 80, 180, 0.30)" };
      if (rarityKey === "limited") return { bg: "rgba(120, 255, 120, 0.12)", bd: "rgba(120, 255, 120, 0.26)" };
      return { bg: "rgba(255,255,255,0.10)", bd: "rgba(255,255,255,0.18)" };
    })();

    if (isSkeleton) {
      return (
        <View style={{ flex: 1, margin: 6 }}>
          <View
            style={{
              borderRadius: 18,
              overflow: "hidden",
              borderWidth: 1,
              borderColor: "#1d1d1f",
              backgroundColor: "#0b0b10",
            }}
          >
            <View style={{ width: "100%", aspectRatio: 0.72, backgroundColor: "#14141a" }} />
            <View style={{ padding: 12 }}>
              <View style={{ height: 14, borderRadius: 8, backgroundColor: "#1b1b22", width: "88%" }} />
              <View style={{ height: 12, borderRadius: 8, backgroundColor: "#1b1b22", width: "60%", marginTop: 10 }} />
              <View style={{ height: 12, borderRadius: 8, backgroundColor: "#1b1b22", width: "40%", marginTop: 8 }} />
            </View>
          </View>
        </View>
      );
    }

    const priceLabel = formatPrice(item);

    return (
      <Pressable onPress={() => xsOpenOffer(item)} style={{ flex: 1, margin: 6 }}>
        <View
          style={{
            borderRadius: 18,
            overflow: "hidden",
            borderWidth: 1,
            borderColor: "#1d1d1f",
            backgroundColor: "#0b0b10",
          }}
        >
          {item.pictureUrl ? (
            <Image
              source={{ uri: item.pictureUrl }}
              style={{ width: "100%", aspectRatio: 0.72 }}
              resizeMode="cover"
            />
          ) : (
            <View
              style={{
                width: "100%",
                aspectRatio: 0.72,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#111",
              }}
            >
              <Text style={{ color: "#666", fontWeight: "800" }}>Image indisponible</Text>
            </View>
          )}

          {/* Gloss */}
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              top: -50,
              left: -70,
              width: 190,
              height: 140,
              backgroundColor: "rgba(255,255,255,0.10)",
              borderRadius: 40,
              transform: [{ rotate: "-22deg" }],
            }}
          />

          {/* Bottom overlay */}
          <View style={{ position: "absolute", left: 0, right: 0, bottom: 0 }}>
            <View style={{ padding: 12 }}>
              <View
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  bottom: 0,
                  top: 0,
                  backgroundColor: "rgba(0,0,0,0.62)",
                }}
              />

              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text numberOfLines={2} style={{ color: "white", fontSize: 14, fontWeight: "900" }}>
                    {item.cardName || item.cardSlug || item.id}
                  </Text>

                  <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8, gap: 8 }}>
                    <View
                      style={{
                        paddingVertical: 4,
                        paddingHorizontal: 10,
                        borderRadius: 999,
                        backgroundColor: rarityStyle.bg,
                        borderWidth: 1,
                        borderColor: rarityStyle.bd,
                      }}
                    >
                      <Text style={{ color: "white", fontSize: 11, fontWeight: "900" }}>{rarityLabel}</Text>
                    </View>
                  </View>
                </View>

                <View style={{ alignItems: "flex-end" }}>
                  <View
                    style={{
                      paddingVertical: 7,
                      paddingHorizontal: 12,
                      borderRadius: 999,
                      backgroundColor: "rgba(255,255,255,0.14)",
                      borderWidth: 1,
                      borderColor: "rgba(255,255,255,0.20)",
                    }}
                  >
                    <Text style={{ color: "white", fontWeight: "900", fontSize: 13 }}>{priceLabel}</Text>
                  </View>
                </View>
              </View>
            </View>

            {showDebug && item.cardSlug ? (
              <View style={{ paddingHorizontal: 12, paddingBottom: 10 }}>
                <Text style={{ color: "rgba(255,255,255,0.55)", fontSize: 11 }}>{item.cardSlug}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </Pressable>
    );
  };
  // XS_MARKET_GRID_V2
  // XS_MARKET_V3_V1
  // XS_MARKET_CARD_UI_V1

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#050509" }}>
      <View style={{ padding: 12 }}>
        <Text style={{ fontSize: 20, fontWeight: "800", color: "white" }}>Marché</Text>

        {/* XS_FIX_HOOKS_GATING_UI_V1_BEGIN */}
        {(!deviceId || !String(deviceId).trim()) ? (
          <View style={{ marginTop: 10, padding: 12, borderRadius: 14, backgroundColor: "#111", borderWidth: 1, borderColor: "#222" }}>
            <Text style={{ color: "white", fontWeight: "900" }}>Compte non lié</Text>
            <Text style={{ marginTop: 6, color: "#bbb" }}>
              Connecte ton compte Sorare (deviceId) puis reviens ici.
            </Text>
          </View>
        ) : null}
        {/* XS_FIX_HOOKS_GATING_UI_V1_END */}

        <TouchableOpacity
          onPress={loadOffers}
          disabled={loading}
          style={{
            marginTop: 12,
            paddingVertical: 12,
            paddingHorizontal: 14,
            borderRadius: 10,
            backgroundColor: loading ? "#333" : "#1f6feb",
          }}
        >
          <Text style={{ color: "white", fontWeight: "800" }}>
            {loading ? "Chargement..." : "Charger les offres"}
          </Text>
        </TouchableOpacity>

        <Text style={{ marginTop: 10, color: "#bbb" }}>
          affichées: {shown.length} • EUR: {stats.eurCount}/{stats.fetched} • count={meta?.count ?? "?"} • cache={meta?.fromCache ? "oui" : "non"}
        </Text>

        <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 6 }}>
          <Chip label={sortAsc ? "Tri: prix ↑" : "Tri: prix ↓"} active={true} onPress={() => setSortAsc(v => !v)} />
          <Chip label={footballOnly ? "FOOTBALL: ON" : "FOOTBALL: OFF"} active={footballOnly} onPress={() => setFootballOnly(v => !v)} />
          <Chip label={eurOnly ? "EUR: ON" : "EUR: OFF"} active={eurOnly} onPress={() => setEurOnly(v => !v)} />
          <Chip label={showDebug ? "Debug: ON" : "Debug: OFF"} active={showDebug} onPress={() => setShowDebug(v => !v)} />
        </View>

        <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 2 }}>
          <Chip label="Rareté: ALL" active={rarity === "all"} onPress={() => setRarity("all")} />
          <Chip label="LIMITED" active={rarity === "limited"} onPress={() => setRarity("limited")} />
          <Chip label="RARE" active={rarity === "rare"} onPress={() => setRarity("rare")} />
          <Chip label="SUPER RARE" active={rarity === "super_rare"} onPress={() => setRarity("super_rare")} />
          <Chip label="UNIQUE" active={rarity === "unique"} onPress={() => setRarity("unique")} />
        </View>

        {showDebug ? (
          <>
            {lastDeviceId ? <Text style={{ marginTop: 6, color: "#777" }}>deviceId: {lastDeviceId}</Text> : null}
            {lastUrl ? <Text style={{ marginTop: 6, color: "#777" }}>url: {lastUrl}</Text> : null}
          </>
        ) : null}

        {error ? (
          <Text style={{ marginTop: 10, color: "#ff6b6b" }}>Erreur: {error}</Text>
        ) : null}
      </View>

      {loading ? (
        <View style={{ paddingTop: 20 }}>
          <ActivityIndicator />
        </View>
      ) : null}

      <FlatList
        numColumns={2}
        columnWrapperStyle={{ gap: 0 }}
        data={(loading && shown.length === 0) ? Array.from({ length: 6 }, (_, i) => ({ id: "sk-" + i } as any)) : shown}
        keyExtractor={(it) => it.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 30 }}
        refreshing={loading}
        onRefresh={loadOffers}
      />
          {/* XS_MARKET_V3_MODAL_V1_BEGIN */}
      <Modal visible={modalOpen} animationType="slide" transparent={true} onRequestClose={xsCloseOffer}>
        <Pressable
          onPress={xsCloseOffer}
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.72)",
            padding: 14,
            justifyContent: "flex-end",
          }}
        >
          <Pressable
            onPress={() => {}}
            style={{
              borderRadius: 22,
              overflow: "hidden",
              borderWidth: 1,
              borderColor: "#1d1d1f",
              backgroundColor: "#0b0b10",
            }}
          >
            {selected?.pictureUrl ? (
              <Image
                source={{ uri: selected.pictureUrl }}
                style={{ width: "100%", aspectRatio: 0.72 }}
                resizeMode="cover"
              />
            ) : (
              <View style={{ width: "100%", aspectRatio: 0.72, alignItems: "center", justifyContent: "center", backgroundColor: "#111" }}>
                <Text style={{ color: "#666", fontWeight: "900" }}>Image indisponible</Text>
              </View>
            )}

            <View style={{ padding: 14 }}>
              <Text style={{ color: "white", fontWeight: "900", fontSize: 18 }}>
                {selected?.cardName || selected?.cardSlug || selected?.id || "—"}
              </Text>

              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
                <Text style={{ color: "rgba(255,255,255,0.70)", fontWeight: "800" }}>
                  Rareté: {String(selected?.rarity || "—").replace(/_/g," ").toUpperCase()}
                </Text>

                <View
                  style={{
                    paddingVertical: 8,
                    paddingHorizontal: 14,
                    borderRadius: 999,
                    backgroundColor: "rgba(255,255,255,0.14)",
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.20)",
                  }}
                >
                  <Text style={{ color: "white", fontWeight: "900", fontSize: 14 }}>{selected ? formatPrice(selected) : "—"}</Text>
                </View>
              </View>

              {selected?.cardSlug ? (
                <Text style={{ marginTop: 10, color: "rgba(255,255,255,0.50)", fontSize: 12 }}>
                  {selected.cardSlug}
                </Text>
              ) : null}

              <Pressable
                onPress={xsCloseOffer}
                style={{
                  marginTop: 14,
                  paddingVertical: 12,
                  borderRadius: 14,
                  backgroundColor: "#1f6feb",
                  alignItems: "center",
                }}
              >
                <Text style={{ color: "white", fontWeight: "900" }}>Fermer</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
      {/* XS_MARKET_V3_MODAL_V1_END */}
</SafeAreaView>
  );
}









