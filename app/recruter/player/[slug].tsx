import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Image, SafeAreaView, Text, TouchableOpacity, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { recruterPlayerCards, recruterSaleStatus, type RecruterOffer, type RecruterPlayer } from "../../../src/scoutApi";

// XS_FRONT_RECRUTER_PLAYERS_INDEX_V1
function text(v: unknown, fallback = "") {
  const s = String(v ?? "").trim();
  return s || fallback;
}

function priceLabel(card: RecruterOffer) {
  const direct = text(card?.price?.text);
  if (direct) return direct;
  const eur = card?.price?.eur;
  if (typeof eur === "number" && Number.isFinite(eur)) return `€${eur.toFixed(2)}`;
  return "Prix indisponible";
}

function rarityLabel(card: RecruterOffer) {
  return text(card?.rarity, "—").toUpperCase();
}

function seasonLabel(card: RecruterOffer) {
  return card?.season != null ? String(card.season) : "—";
}

export default function RecruterPlayerCardsScreen() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug?: string }>();
  const playerSlug = String(slug || "").trim().toLowerCase();

  const [items, setItems] = useState<RecruterOffer[]>([]);
  const [player, setPlayer] = useState<RecruterPlayer | null>(null);
  const [saleStatus, setSaleStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!playerSlug) {
      setError("Slug joueur manquant.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await recruterPlayerCards(playerSlug, { first: 20 });
      setItems(Array.isArray(res.items) ? res.items : []);
      setPlayer((res.player as RecruterPlayer | null) || null);
      setSaleStatus(res.saleStatus || null);
    } catch (e: any) {
      setError(e?.message || "Erreur chargement cartes");
    } finally {
      setLoading(false);
    }
  }, [playerSlug]);

  useEffect(() => {
    load();
  }, [load]);

  const header = useMemo(() => {
    const first = items[0] || null;
    const prices = items
      .map((card) => card?.price?.eur)
      .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
    const minEur = prices.length ? Math.min(...prices) : null;
    const status = saleStatus === "none_seen" || items.length === 0
      ? "no_sale"
      : recruterSaleStatus(player || { saleStatus, salesCount: items.length, cardsCount: items.length, hasSale: items.length > 0 });

    return {
      playerName: text(player?.displayName || player?.playerName || first?.playerName, playerSlug || "Joueur"),
      clubName: text(player?.clubName || first?.clubName || player?.activeClub?.name, "Club inconnu"),
      position: text(player?.position || first?.position, "N/A"),
      leagueName: text(player?.leagueName || first?.leagueName, "Ligue inconnue"),
      pictureUrl: text(player?.pictureUrl || first?.pictureUrl, "https://frontend-assets.sorare.com/placeholders/player-v2.png"),
      minEur,
      status,
    };
  }, [items, player, playerSlug, saleStatus]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#08090d" }}>
      <View style={{ paddingHorizontal: 14, paddingTop: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "#241014", backgroundColor: "#0d0f14" }}>
        <TouchableOpacity onPress={() => router.back()} style={{ alignSelf: "flex-start", paddingVertical: 7, paddingHorizontal: 10, borderRadius: 8, backgroundColor: "#2b1117", borderWidth: 1, borderColor: "#5c1f2a" }}>
          <Text style={{ color: "#ffccd2", fontWeight: "800" }}>Retour</Text>
        </TouchableOpacity>

        <View style={{ flexDirection: "row", gap: 12, alignItems: "center", marginTop: 12 }}>
          <Image source={{ uri: header.pictureUrl }} style={{ width: 74, height: 74, borderRadius: 10, backgroundColor: "#050509" }} />
          <View style={{ flex: 1, gap: 5 }}>
            <Text style={{ color: "#fff", fontSize: 22, fontWeight: "900" }} numberOfLines={1}>
              {header.playerName}
            </Text>
            <Text style={{ color: "#b8bec8" }} numberOfLines={1}>
              {header.clubName} · {header.position} · {header.leagueName}
            </Text>
            <Text style={{ color: header.status === "for_sale" ? "#72e6a2" : "#ff5d73", fontWeight: "900" }}>
              {header.status === "for_sale"
                ? `${items.length} carte(s) en vente · Prix min ${header.minEur != null ? `€${header.minEur.toFixed(2)}` : "—"}`
                : "Aucune carte en vente actuellement"}
            </Text>
          </View>
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color="#ff5d73" />
        </View>
      ) : error ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 18 }}>
          <Text style={{ color: "#ff9aa8", textAlign: "center", marginBottom: 12 }}>{error}</Text>
          <TouchableOpacity onPress={load} style={{ backgroundColor: "#c92a3d", borderRadius: 8, paddingHorizontal: 14, paddingVertical: 9 }}>
            <Text style={{ color: "white", fontWeight: "800" }}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item, index) => String(item.cardId || item.cardSlug || item.offerId || index)}
          contentContainerStyle={{ padding: 14, paddingBottom: 30, flexGrow: 1 }}
          ListEmptyComponent={
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60 }}>
              <Text style={{ color: "#ff9aa8", fontWeight: "900", fontSize: 16, textAlign: "center" }}>Aucune carte en vente actuellement</Text>
              <Text style={{ color: "#9ba1a6", textAlign: "center", marginTop: 8 }}>
                Le profil vient de l'index joueurs. Les ventes seront revérifiées au prochain clic ou à la prochaine mise à jour marché.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const seller = text(item?.seller?.nickname || item?.seller?.slug);
            return (
              <View style={{ flexDirection: "row", gap: 12, padding: 12, marginBottom: 12, borderRadius: 12, backgroundColor: "#12151c", borderWidth: 1, borderColor: "#2a1218" }}>
                <Image
                  source={{ uri: item.pictureUrl || "https://frontend-assets.sorare.com/placeholders/player-v2.png" }}
                  style={{ width: 76, height: 102, borderRadius: 8, backgroundColor: "#050509" }}
                />
                <View style={{ flex: 1, justifyContent: "center", gap: 5 }}>
                  <Text style={{ color: "white", fontWeight: "900" }} numberOfLines={1}>{text(item.playerName, header.playerName)}</Text>
                  <Text style={{ color: "#72e6a2", fontWeight: "900" }}>{priceLabel(item)}</Text>
                  <Text style={{ color: "#c9d1d9" }} numberOfLines={1}>{rarityLabel(item)} · Saison {seasonLabel(item)}</Text>
                  <Text style={{ color: "#9ba1a6" }} numberOfLines={1}>{text(item.clubName, header.clubName)} · {text(item.position, header.position)}</Text>
                  <Text style={{ color: "#8b949e" }} numberOfLines={1}>{seller ? `Vendeur ${seller}` : text(item.leagueName, header.leagueName)}</Text>
                </View>
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}
