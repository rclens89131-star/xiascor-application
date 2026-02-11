import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Image, SafeAreaView, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { scoutPlayer2 } from "../../src/scoutApi"; // XS_PLAYER_USE_SCOUTPLAYER2_V1

// XS_PLAYER_ROUTE_V1: real route file for /player/[slug] (must default export a component)
type PlayerRes = {
  player?: { slug?: string; displayName?: string | null; position?: string | null; activeClub?: { name?: string | null } | null; pictureUrl?: string | null } | null;
  offers?: any[];
  meta?: any;
  note?: string;
};

function xsPriceLabel(o: any) {
  const s = String(o?.priceText || "").trim();
  if (s) return s;
  if (typeof o?.eur === "number" && Number.isFinite(o.eur)) return "€" + o.eur.toFixed(2);
  return "—";
}

export default function PlayerSlugScreen() {
  const { slug } = useLocalSearchParams<{ slug?: string }>();
  const playerSlug = String(slug || "").trim().toLowerCase();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PlayerRes | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!playerSlug) {
        setError("Slug joueur manquant.");
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const res = await scoutPlayer2(playerSlug, { allowUnknownPrices: true, first: 50 }) // XS_PLAYER_USE_SCOUTPLAYER_V1;
        if (alive) setData(res as any);
      } catch (e: any) {
        if (alive) setError(e?.message ?? "Erreur chargement joueur");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [playerSlug]);

  const offers = useMemo(() => (Array.isArray(data?.offers) ? data!.offers : []), [data]);

  if (!playerSlug) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#050509", alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: "white" }}>Slug joueur manquant.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#050509" }}>
      <View style={{ padding: 14 }}>
        <Text style={{ color: "white", fontWeight: "900", fontSize: 18 }}>
          {data?.player?.displayName || playerSlug}
        </Text>
        <Text style={{ color: "#b9b9c6", marginTop: 6 }}>
          {offers.length} offres • Prix inconnus possibles (mode public)
        </Text>
        {error ? <Text style={{ color: "#ff9a9a", marginTop: 8 }}>{error}</Text> : null}
      </View>

      {loading ? (
        <View style={{ paddingTop: 24 }}><ActivityIndicator /></View>
      ) : null}

      <FlatList
        data={offers}
        keyExtractor={(it, idx) => String(it?.offerId || it?.slug || idx)}
        contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 30 }}
        renderItem={({ item }) => {
          const hasKnown = !!String(item?.priceText || "").trim() || (typeof item?.eur === "number");
          return (
            <View style={{ backgroundColor: "#101018", borderRadius: 14, borderWidth: 1, borderColor: "#262636", padding: 12, marginBottom: 10 }}>
              <Text style={{ color: "white", fontWeight: "900" }}>{String(item?.rarity || "—").toUpperCase()}</Text>
              <Text style={{ color: "#d7d7e0", marginTop: 6 }}>{xsPriceLabel(item)}</Text>
              {!hasKnown ? (
                <View style={{ marginTop: 8, alignSelf: "flex-start", paddingVertical: 4, paddingHorizontal: 8, borderRadius: 999, backgroundColor: "rgba(173,216,230,0.18)", borderWidth: 1, borderColor: "rgba(173,216,230,0.36)" }}>
                  <Text style={{ color: "#bcdff5", fontWeight: "800" }}>Prix inconnu</Text>
                </View>
              ) : null}
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}




