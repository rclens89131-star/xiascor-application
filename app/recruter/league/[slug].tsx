import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Image, SafeAreaView, Text, TouchableOpacity, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { recruterPlayers, type RecruterPlayer } from "../../../src/scoutApi";

// XS_FRONT_RECRUTER_BOARD_V1
function text(v: unknown, fallback = "") {
  const s = String(v ?? "").trim();
  return s || fallback;
}

export default function RecruterLeaguePlayersScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ slug?: string; name?: string }>();
  const leagueSlug = String(params.slug || "").trim().toLowerCase();
  const leagueName = text(params.name, leagueSlug || "Ligue");

  const [items, setItems] = useState<RecruterPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!leagueSlug) {
      setError("Slug ligue manquant.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await recruterPlayers({ league: leagueSlug, first: 200 });
      setItems(Array.isArray(res.items) ? res.items : []);
    } catch (e: any) {
      setError(e?.message || "Erreur chargement joueurs");
    } finally {
      setLoading(false);
    }
  }, [leagueSlug]);

  useEffect(() => {
    load();
  }, [load]);

  const summary = useMemo(() => {
    const cards = items.reduce((sum, item) => sum + Number(item.cardsCount || item.offersCount || item.offerCount || 0), 0);
    const prices = items
      .map((item) => item.minEur)
      .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
    return { cards, minEur: prices.length ? Math.min(...prices) : null };
  }, [items]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#08090d" }}>
      <View style={{ paddingHorizontal: 14, paddingTop: 12, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: "#241014", backgroundColor: "#0d0f14" }}>
        <TouchableOpacity onPress={() => router.back()} style={{ alignSelf: "flex-start", paddingVertical: 7, paddingHorizontal: 10, borderRadius: 8, backgroundColor: "#2b1117", borderWidth: 1, borderColor: "#5c1f2a" }}>
          <Text style={{ color: "#ffccd2", fontWeight: "800" }}>Retour</Text>
        </TouchableOpacity>

        <Text style={{ color: "#fff", fontSize: 22, fontWeight: "900", marginTop: 12 }} numberOfLines={1}>{leagueName}</Text>
        <Text style={{ color: "#ff5d73", fontWeight: "900", marginTop: 8 }}>
          {items.length} joueur(s) · {summary.cards} carte(s) · Prix min {summary.minEur != null ? `€${summary.minEur.toFixed(2)}` : "—"}
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
            <Text style={{ color: "white", fontWeight: "800" }}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item, index) => String(item.slug || item.playerSlug || index)}
          contentContainerStyle={{ padding: 14, paddingBottom: 30 }}
          ListEmptyComponent={<Text style={{ color: "#a6adb8", textAlign: "center", marginTop: 30 }}>Aucun joueur disponible dans cette ligue.</Text>}
          renderItem={({ item }) => {
            const slug = String(item.slug || item.playerSlug || "").trim();
            const displayName = text(item.displayName || item.playerName, slug || "Joueur");
            const clubName = text(item.clubName || item.activeClubName || item.activeClub?.name, "Club inconnu");
            const minEur = typeof item.minEur === "number" ? item.minEur : null;
            const cardsCount = Number(item.cardsCount || item.offersCount || item.offerCount || 0);
            const rarities = Array.isArray(item.rarities) && item.rarities.length
              ? item.rarities.map((x) => String(x || "").toUpperCase()).join(", ")
              : "—";

            return (
              <TouchableOpacity
                onPress={() => { if (!slug) return; router.push({ pathname: "/recruter/player/[slug]", params: { slug } }); }}
                style={{ flexDirection: "row", gap: 12, padding: 12, marginBottom: 12, borderRadius: 12, backgroundColor: "#12151c", borderWidth: 1, borderColor: "#2a1218" }}
              >
                <Image
                  source={{ uri: item.pictureUrl || "https://via.placeholder.com/120x160.png?text=Card" }}
                  style={{ width: 62, height: 82, borderRadius: 8, backgroundColor: "#050509" }}
                />
                <View style={{ flex: 1, justifyContent: "center", gap: 5 }}>
                  <Text style={{ color: "white", fontWeight: "900" }} numberOfLines={1}>{displayName}</Text>
                  <Text style={{ color: "#b8bec8" }} numberOfLines={1}>{clubName} · {text(item.position, "N/A")}</Text>
                  <Text style={{ color: "#ff5d73", fontWeight: "900" }}>Prix min {minEur != null ? `€${minEur.toFixed(2)}` : "—"}</Text>
                  <Text style={{ color: "#8b949e" }}>{cardsCount} carte(s) · {rarities}</Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}
