import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Image, RefreshControl, SafeAreaView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { apiFetch } from "../../src/api";
import { scoutRecruter } from "../../src/scoutApi";

// XS_RECRUTER_TAB_V1_BEGIN
type RecruterItem = {

  slug: string;
  displayName?: string | null;
  team?: string | null;
  position?: string | null;
  pictureUrl?: string | null;
  minEur?: number | null;
  offersCount?: number | null;

  // XS_RECRUTER_SHAPE_TYPES_V1
  playerSlug?: string;
  playerName?: string;
  minPriceEur?: number;
  activeClubName?: string;
  activeClub?: { name?: string };
  player?: {
    slug?: string;
    displayName?: string;
  };
};

function norm(v?: string | null) {
  return String(v || "").trim().toLowerCase();
}

export default function RecruiterTabScreen() {
  const router = useRouter();
  const [items, setItems] = useState<RecruterItem[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [health, setHealth] = useState<"idle" | "ok" | "ko">("idle");

  const load = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const [dataRes, healthRes] = await Promise.allSettled([
        scoutRecruter({ first: 120 }),
        apiFetch<{ ok?: boolean }>("/health"),
      ]);

      if (dataRes.status === "fulfilled") {
        const raw = (dataRes.value as any)?.items;
        setItems(Array.isArray(raw) ? (raw as RecruterItem[]) : []);
      } else {
        throw dataRes.reason;
      }

      setHealth(healthRes.status === "fulfilled" && healthRes.value?.ok ? "ok" : "ko");
    } catch (e: any) {
      setError(e?.message || "Erreur réseau");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load(false);
    }, [load]),
  );

  const filtered = useMemo(() => {
    const q = norm(query);
    const base = q
      ? items.filter((p) => [p.displayName, p.slug, p.team, p.position].some((x) => norm(x).includes(q)))
      : items;

    return [...base].sort((a, b) => (a.minEur ?? Number.POSITIVE_INFINITY) - (b.minEur ?? Number.POSITIVE_INFINITY));
  }, [items, query]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0f1115" }}>
      <View style={{ padding: 12, gap: 10 }}>
        <Text style={{ color: "white", fontSize: 24, fontWeight: "800" }}>Recruter</Text>
        <Text style={{ color: "#9ba1a6" }}>Marché public · santé API: {health === "ok" ? "OK" : health === "ko" ? "KO" : "…"}</Text>

        <TextInput
          placeholder="Rechercher joueur, club, position"
          placeholderTextColor="#70757a"
          value={query}
          onChangeText={setQuery}
          style={{ backgroundColor: "#1a1d24", color: "#fff", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 }}
        />
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color="#58a6ff" />
        </View>
      ) : error ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 16 }}>
          <Text style={{ color: "#ff7b72", textAlign: "center", marginBottom: 8 }}>{error}</Text>
          <TouchableOpacity onPress={() => load(false)} style={{ backgroundColor: "#1f6feb", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 }}>
            <Text style={{ color: "white", fontWeight: "700" }}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.slug}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#58a6ff" />}
          contentContainerStyle={{ paddingBottom: 30 }}
          ListEmptyComponent={<Text style={{ color: "#9ba1a6", textAlign: "center", marginTop: 30 }}>Aucun joueur trouvé.</Text>}
          renderItem={({ item }) => {
            // XS_RECRUTER_SHAPE_COMPAT_V1_BEGIN
            const xsSlug = String((item?.playerSlug ?? item?.slug ?? item?.player?.slug ?? "") || "").trim();
            const xsName = String((item?.playerName ?? item?.displayName ?? item?.player?.displayName ?? "—") || "—");
            const xsMin = (typeof item?.minPriceEur === "number")
              ? item.minPriceEur
              : ((typeof item?.minEur === "number") ? item.minEur : null);
            const xsTeam = String((item?.team ?? item?.activeClubName ?? item?.activeClub?.name ?? "") || "").trim();
            // XS_RECRUTER_SHAPE_COMPAT_V1_END
            return (
            <TouchableOpacity
              onPress={() => { const s = String(xsSlug || (item as any)?.slug || "").trim(); if (!s) return; router.push({ pathname: "/player/[slug]", params: { slug: s } }); }}
              style={{ marginHorizontal: 12, marginBottom: 10, backgroundColor: "#161b22", borderRadius: 12, padding: 10, flexDirection: "row", gap: 10 }}
            >
              <Image
                source={{ uri: item.pictureUrl || "https://via.placeholder.com/120x160.png?text=Card" }}
                style={{ width: 62, height: 82, borderRadius: 8, backgroundColor: "#0d1117" }}
              />
              <View style={{ flex: 1, justifyContent: "center", gap: 4 }}>
                <Text style={{ color: "#fff", fontWeight: "700" }} numberOfLines={1}>{xsName || xsSlug || "—"}</Text>
                <Text style={{ color: "#9ba1a6" }} numberOfLines={1}>{(xsTeam || "Club inconnu")} · {(item.position || "N/A")}</Text>
                <Text style={{ color: "#58a6ff", fontWeight: "800" }}>
                  Prix min {typeof xsMin === "number" ? `€${xsMin.toFixed(2)}` : "—"}
                </Text>
                <Text style={{ color: "#8b949e" }}>{item.offersCount || 0} offre(s)</Text>
              </View>
            </TouchableOpacity>
          );
        }}
        />
      )}
    </SafeAreaView>
  );
}
// XS_RECRUTER_TAB_V1_END





