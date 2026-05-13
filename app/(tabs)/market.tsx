import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, SafeAreaView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { apiFetch } from "../../src/api";
import { recruterIndex, recruterLeagues, type RecruterIndexResponse, type RecruterLeague } from "../../src/scoutApi";

// XS_FRONT_RECRUTER_BOARD_V1
function norm(v?: string | null) {
  return String(v || "").trim().toLowerCase();
}

export default function RecruiterTabScreen() {
  const router = useRouter();
  const [items, setItems] = useState<RecruterLeague[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [indexing, setIndexing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [health, setHealth] = useState<"idle" | "ok" | "ko">("idle");
  const [indexMeta, setIndexMeta] = useState<RecruterIndexResponse | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const [leaguesRes, healthRes] = await Promise.allSettled([
        recruterLeagues(),
        apiFetch<{ ok?: boolean }>("/recruter/health"),
      ]);

      if (leaguesRes.status === "fulfilled") {
        setItems(Array.isArray(leaguesRes.value.items) ? leaguesRes.value.items : []);
      } else {
        throw leaguesRes.reason;
      }

      setHealth(healthRes.status === "fulfilled" && healthRes.value?.ok ? "ok" : "ko");
    } catch (e: any) {
      setError(e?.message || "Erreur réseau");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const refreshMarket = useCallback(async () => {
    try {
      setIndexing(true);
      setError(null);
      const res = await recruterIndex({ pages: 5, first: 50, force: true });
      setIndexMeta(res);
      await load(true);
    } catch (e: any) {
      setError(e?.message || "Erreur actualisation marché");
    } finally {
      setIndexing(false);
    }
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load(false);
    }, [load]),
  );

  const filtered = useMemo(() => {
    const q = norm(query);
    const base = q
      ? items.filter((league) => [league.name, league.slug].some((x) => norm(x).includes(q)))
      : items;

    return [...base].sort((a, b) => (Number(b.cardsCount || 0) - Number(a.cardsCount || 0)));
  }, [items, query]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#08090d" }}>
      <View style={{ padding: 12, gap: 10, backgroundColor: "#0d0f14", borderBottomWidth: 1, borderBottomColor: "#251016" }}>
        <Text style={{ color: "white", fontSize: 24, fontWeight: "900" }}>Recruter</Text>
        <Text style={{ color: "#a8b0ba" }}>
          Ligues avec cartes en vente · santé API: {health === "ok" ? "OK" : health === "ko" ? "KO" : "..."}
        </Text>

        <TouchableOpacity
          onPress={refreshMarket}
          disabled={indexing}
          style={{ backgroundColor: indexing ? "#60202a" : "#c92a3d", borderRadius: 9, paddingHorizontal: 12, paddingVertical: 10, alignItems: "center" }}
        >
          <Text style={{ color: "white", fontWeight: "900" }}>{indexing ? "Actualisation..." : "Actualiser le marché"}</Text>
        </TouchableOpacity>

        {indexMeta?.summary ? (
          <Text style={{ color: "#ff9aa8" }}>
            Index: {indexMeta.summary.offersCount ?? 0} offres · {indexMeta.summary.playersCount ?? 0} joueurs · {indexMeta.summary.leaguesCount ?? 0} ligues
          </Text>
        ) : null}

        <TextInput
          placeholder="Rechercher une ligue"
          placeholderTextColor="#70757a"
          value={query}
          onChangeText={setQuery}
          style={{ backgroundColor: "#171a22", color: "#fff", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 }}
        />
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color="#ff5d73" />
        </View>
      ) : error ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 16 }}>
          <Text style={{ color: "#ff9aa8", textAlign: "center", marginBottom: 10 }}>{error}</Text>
          <TouchableOpacity onPress={() => load(false)} style={{ backgroundColor: "#c92a3d", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 }}>
            <Text style={{ color: "white", fontWeight: "800" }}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.slug}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#ff5d73" />}
          contentContainerStyle={{ padding: 12, paddingBottom: 30 }}
          ListEmptyComponent={<Text style={{ color: "#9ba1a6", textAlign: "center", marginTop: 30 }}>Aucune ligue trouvée.</Text>}
          renderItem={({ item }) => {
            const slug = String(item.slug || "").trim();
            const name = String(item.name || item.slug || "Ligue inconnue");
            const cardsCount = Number(item.cardsCount || 0);
            const playersCount = Number(item.playersCount || 0);
            const minEur = typeof item.minEur === "number" ? item.minEur : null;

            return (
              <TouchableOpacity
                onPress={() => { if (!slug) return; router.push({ pathname: "/recruter/league/[slug]", params: { slug, name } }); }}
                style={{ marginBottom: 10, backgroundColor: "#12151c", borderRadius: 12, borderWidth: 1, borderColor: "#2a1218", padding: 13 }}
              >
                <Text style={{ color: "#fff", fontWeight: "900", fontSize: 16 }} numberOfLines={1}>{name}</Text>
                <Text style={{ color: "#b8bec8", marginTop: 6 }}>{playersCount} joueur(s) · {cardsCount} carte(s)</Text>
                <Text style={{ color: "#ff5d73", fontWeight: "900", marginTop: 6 }}>
                  Prix min {minEur != null ? `€${minEur.toFixed(2)}` : "—"}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}
