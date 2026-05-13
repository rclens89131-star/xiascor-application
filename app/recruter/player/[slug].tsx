import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Image, SafeAreaView, Text, TouchableOpacity, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { recruterPlayerCards, type RecruterOffer } from "../../../src/scoutApi";

// XS_FRONT_RECRUTER_PLAYER_CARDS_V1
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
      const res = await recruterPlayerCards(playerSlug, { first: 80 });
      setItems(Array.isArray(res.items) ? res.items : []);
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

    return {
      playerName: text(first?.playerName, playerSlug || "Joueur"),
      clubName: text(first?.clubName, "Club inconnu"),
      position: text(first?.position, "N/A"),
      leagueName: text(first?.leagueName, "Ligue inconnue"),
      minEur,
    };
  }, [items, playerSlug]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#08090d" }}>
      <View style={{ paddingHorizontal: 14, paddingTop: 12, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: "#241014", backgroundColor: "#0d0f14" }}>
        <TouchableOpacity onPress={() => router.back()} style={{ alignSelf: "flex-start", paddingVertical: 7, paddingHorizontal: 10, borderRadius: 8, backgroundColor: "#2b1117", borderWidth: 1, borderColor: "#5c1f2a" }}>
          <Text style={{ color: "#ffccd2", fontWeight: "800" }}>Retour</Text>
        </TouchableOpacity>

        <Text style={{ color: "#fff", fontSize: 22, fontWeight: "900", marginTop: 12 }} numberOfLines={1}>
          {header.playerName}
        </Text>
        <Text style={{ color: "#b8bec8", marginTop: 5 }} numberOfLines={1}>
          {header.clubName} · {header.position} · {header.leagueName}
        </Text>
        <Text style={{ color: "#ff5d73", fontWeight: "900", marginTop: 8 }}>
          {items.length} carte(s) disponible(s) · Prix min {header.minEur != null ? `€${header.minEur.toFixed(2)}` : "—"}
        </Text>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color="#ff5d73" />
        </View>
      ) : error ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 18 }}>
          <Text style={{ color: "#ff9aa8", textAlign: "center", marginBottom: 12 }}>{error}</Text>
          <TouchableOpacity onPress={load} style={{ backgroundColor: "#c92a3d", borderRadius: 8, paddingHorizontal: 14, paddingVertical: 9 }}>
            <Text style={{ color: "white", fontWeight: "800" }}>Reessayer</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item, index) => String(item.cardId || item.cardSlug || item.offerId || index)}
          contentContainerStyle={{ padding: 14, paddingBottom: 30 }}
          ListEmptyComponent={<Text style={{ color: "#a6adb8", textAlign: "center", marginTop: 30 }}>Aucune carte disponible pour ce joueur.</Text>}
          renderItem={({ item }) => (
            <View style={{ flexDirection: "row", gap: 12, padding: 12, marginBottom: 12, borderRadius: 12, backgroundColor: "#12151c", borderWidth: 1, borderColor: "#2a1218" }}>
              <Image
                source={{ uri: item.pictureUrl || "https://via.placeholder.com/120x160.png?text=Card" }}
                style={{ width: 76, height: 102, borderRadius: 8, backgroundColor: "#050509" }}
              />
              <View style={{ flex: 1, justifyContent: "center", gap: 5 }}>
                <Text style={{ color: "white", fontWeight: "900" }} numberOfLines={1}>{text(item.playerName, header.playerName)}</Text>
                <Text style={{ color: "#ff5d73", fontWeight: "900" }}>{priceLabel(item)}</Text>
                <Text style={{ color: "#c9d1d9" }} numberOfLines={1}>{rarityLabel(item)} · Saison {seasonLabel(item)}</Text>
                <Text style={{ color: "#9ba1a6" }} numberOfLines={1}>{text(item.clubName, header.clubName)} · {text(item.position, header.position)}</Text>
                <Text style={{ color: "#8b949e" }} numberOfLines={1}>{text(item.leagueName, header.leagueName)}</Text>
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}
