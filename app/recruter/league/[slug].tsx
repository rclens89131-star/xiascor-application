import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Image, SafeAreaView, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { recruterPlayers, recruterSaleStatus, type RecruterPlayer } from "../../../src/scoutApi";

// XS_FRONT_RECRUTER_PLAYERS_INDEX_V1
function text(v: unknown, fallback = "") {
  const s = String(v ?? "").trim();
  return s || fallback;
}

function norm(v: unknown) {
  return String(v ?? "").trim().toLowerCase();
}

function saleBadge(player: RecruterPlayer) {
  const status = recruterSaleStatus(player);
  if (status === "for_sale") return { label: "En vente", color: "#72e6a2", border: "#245b39", background: "#102219" };
  if (status === "no_sale") return { label: "Aucune vente", color: "#c4cad3", border: "#343a45", background: "#171b22" };
  return { label: "Vente à vérifier", color: "#ffd18a", border: "#5a3f16", background: "#241a0b" };
}

const POSITIONS = ["GK", "DEF", "MID", "FW"];

export default function RecruterLeaguePlayersScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ slug?: string; name?: string }>();
  const leagueSlug = String(params.slug || "").trim().toLowerCase();
  const leagueName = text(params.name, leagueSlug || "Ligue");

  const [items, setItems] = useState<RecruterPlayer[]>([]);
  const [query, setQuery] = useState("");
  const [position, setPosition] = useState("");
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
      const res = await recruterPlayers({ league: leagueSlug });
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

  const filtered = useMemo(() => {
    const q = norm(query);
    return items.filter((item) => {
      if (position && norm(item.position) !== position.toLowerCase()) return false;
      if (!q) return true;
      return [item.displayName, item.playerName, item.playerSlug, item.clubName, item.position]
        .some((value) => norm(value).includes(q));
    });
  }, [items, position, query]);

  const summary = useMemo(() => {
    const forSale = filtered.filter((item) => recruterSaleStatus(item) === "for_sale").length;
    const clubs = new Set(filtered.map((item) => item.clubSlug).filter(Boolean)).size;
    return { players: filtered.length, clubs, forSale };
  }, [filtered]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#08090d" }}>
      <View style={{ paddingHorizontal: 14, paddingTop: 12, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: "#241014", backgroundColor: "#0d0f14", gap: 10 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ alignSelf: "flex-start", paddingVertical: 7, paddingHorizontal: 10, borderRadius: 8, backgroundColor: "#2b1117", borderWidth: 1, borderColor: "#5c1f2a" }}>
          <Text style={{ color: "#ffccd2", fontWeight: "800" }}>Retour</Text>
        </TouchableOpacity>

        <Text style={{ color: "#fff", fontSize: 22, fontWeight: "900" }} numberOfLines={1}>{leagueName}</Text>
        <Text style={{ color: "#ff5d73", fontWeight: "900" }}>
          {summary.players} joueur(s) · {summary.clubs} club(s) · {summary.forSale} en vente
        </Text>

        <TextInput
          placeholder="Rechercher dans la ligue"
          placeholderTextColor="#70757a"
          value={query}
          onChangeText={setQuery}
          style={{ backgroundColor: "#171a22", color: "#fff", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 }}
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          <TouchableOpacity onPress={() => setPosition("")} style={{ borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: position ? "#141821" : "#c92a3d" }}>
            <Text style={{ color: "white", fontWeight: "800" }}>Tous</Text>
          </TouchableOpacity>
          {POSITIONS.map((pos) => (
            <TouchableOpacity key={pos} onPress={() => setPosition(pos)} style={{ borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: position === pos ? "#c92a3d" : "#141821", borderWidth: 1, borderColor: "#2a1218" }}>
              <Text style={{ color: "white", fontWeight: "800" }}>{pos}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
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
          data={filtered}
          keyExtractor={(item, index) => String(item.slug || item.playerSlug || index)}
          contentContainerStyle={{ padding: 14, paddingBottom: 30 }}
          ListEmptyComponent={<Text style={{ color: "#a6adb8", textAlign: "center", marginTop: 30 }}>Aucun joueur disponible dans cette ligue.</Text>}
          renderItem={({ item }) => {
            const slug = text(item.slug || item.playerSlug);
            const displayName = text(item.displayName || item.playerName, slug || "Joueur");
            const badge = saleBadge(item);

            return (
              <TouchableOpacity
                onPress={() => { if (!slug) return; router.push({ pathname: "/recruter/player/[slug]", params: { slug } }); }}
                style={{ flexDirection: "row", gap: 12, padding: 12, marginBottom: 12, borderRadius: 12, backgroundColor: "#12151c", borderWidth: 1, borderColor: "#2a1218" }}
              >
                <Image
                  source={{ uri: item.pictureUrl || "https://frontend-assets.sorare.com/placeholders/player-v2.png" }}
                  style={{ width: 62, height: 62, borderRadius: 8, backgroundColor: "#050509" }}
                />
                <View style={{ flex: 1, justifyContent: "center", gap: 5 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Text style={{ color: "white", fontWeight: "900", flex: 1 }} numberOfLines={1}>{displayName}</Text>
                    <View style={{ backgroundColor: badge.background, borderColor: badge.border, borderWidth: 1, borderRadius: 7, paddingHorizontal: 8, paddingVertical: 4 }}>
                      <Text style={{ color: badge.color, fontWeight: "900", fontSize: 12 }}>{badge.label}</Text>
                    </View>
                  </View>
                  <Text style={{ color: "#b8bec8" }} numberOfLines={1}>{text(item.clubName, "Club inconnu")} · {text(item.position, "N/A")}</Text>
                  <Text style={{ color: "#8b949e" }}>{item.age != null ? `${item.age} ans` : "Age inconnu"}</Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}
