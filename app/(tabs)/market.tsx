import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Image, RefreshControl, SafeAreaView, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { apiFetch } from "../../src/api";
import {
  recruterLeagueIndex,
  recruterPlayersIndexBuild,
  recruterSaleStatus,
  type RecruterLeagueIndexResponse,
  type RecruterPlayer,
  type RecruterPlayersIndexBuildResponse,
} from "../../src/scoutApi";

// XS_FRONT_RECRUTER_PLAYERS_INDEX_V1
// XS_RECRUTER_FRONT_LEAGUE_INDEX_V1: Recruter uses the full backend league cache for Ligue 1.
// XS_RECRUTER_FRONT_LEAGUES_VISIBLE_V1: Recruter loads every available league-index cache.
// XS_RECRUTER_GLOBAL_LEAGUES_PRIORITY_123_V1: show global Sorare league-index filters.
const XS_RECRUTER_FRONT_LEAGUE_INDEX_DEFAULT_V1 = "ligue-1-fr";
const XS_RECRUTER_FRONT_VISIBLE_LEAGUES_V1 = [
  { label: "Ligue 1", slug: "ligue-1-fr" },
  { label: "Premier League", slug: "premier-league" },
  { label: "LaLiga", slug: "laliga" },
  { label: "Serie A", slug: "serie-a" },
  { label: "Bundesliga", slug: "bundesliga" },
  { label: "Ligue 2", slug: "ligue-2" },
  { label: "Eredivisie", slug: "eredivisie" },
  { label: "Liga Portugal", slug: "liga-portugal" },
  { label: "Championship", slug: "championship" },
  { label: "MLS", slug: "mls" },
  { label: "Jupiler Pro League", slug: "belgium-pro-league" },
  { label: "Scottish Premiership", slug: "scottish-premiership" },
  { label: "Swiss Super League", slug: "swiss-super-league" },
  { label: "Austrian Bundesliga", slug: "austrian-bundesliga" },
  { label: "Süper Lig", slug: "super-lig" },
  { label: "Danish Superliga", slug: "danish-superliga" },
  { label: "Eliteserien", slug: "eliteserien" },
  { label: "Croatian HNL", slug: "croatian-hnl" },
  { label: "2. Bundesliga", slug: "bundesliga-2" },
  { label: "LALIGA HYPERMOTION", slug: "laliga-hypermotion" },
  { label: "Brasileirão Série A", slug: "brasileirao" },
  { label: "Argentine Primera", slug: "argentina-primera" },
  { label: "Liga MX", slug: "liga-mx" },
  { label: "Liga Pro Ecuador", slug: "ecuador-liga-pro" },
  { label: "Primera A Colombie", slug: "colombia-primera-a" },
  { label: "Liga 1 Pérou", slug: "peru-liga-1" },
  { label: "Primera Uruguay", slug: "uruguay-primera" },
  { label: "J League", slug: "j-league" },
  { label: "K League", slug: "k-league" },
  { label: "Chinese Super League", slug: "chinese-super-league" },
];

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

function collectOptions(items: RecruterPlayer[], type: "league" | "club") {
  const map = new Map<string, { slug: string; name: string; count: number }>();
  for (const item of items) {
    const slug = type === "league" ? item.leagueSlug : item.clubSlug;
    const name = type === "league" ? item.leagueName : item.clubName;
    const key = text(slug).toLowerCase();
    if (!key) continue;
    const row = map.get(key) || { slug: key, name: text(name, key), count: 0 };
    row.count += 1;
    map.set(key, row);
  }
  return Array.from(map.values()).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

const POSITIONS = ["GK", "DEF", "MID", "FW"];

function xsRecruterMergeLeagueItemsV1(payloads: RecruterLeagueIndexResponse[]) {
  const bySlug = new Map<string, RecruterPlayer>();
  let clubsCount = 0;
  let playersCount = 0;
  for (const payload of payloads) {
    clubsCount += Number(payload?.clubsCount ?? payload?.summary?.clubsCount ?? 0);
    playersCount += Number(payload?.playersCount ?? payload?.summary?.playersCount ?? 0);
    for (const item of (Array.isArray(payload?.items) ? payload.items : [])) {
      const key = text(item.slug || item.playerSlug).toLowerCase();
      if (!key) continue;
      bySlug.set(key, item);
    }
  }
  const items = Array.from(bySlug.values());
  return {
    ok: true,
    leagueSlug: "all",
    leagueName: "Ligues Recruter",
    clubsCount,
    playersCount: playersCount || items.length,
    items,
  } as RecruterLeagueIndexResponse;
}

export default function RecruiterTabScreen() {
  const router = useRouter();
  const [items, setItems] = useState<RecruterPlayer[]>([]);
  const [query, setQuery] = useState("");
  const [selectedLeague, setSelectedLeague] = useState("");
  const [selectedClub, setSelectedClub] = useState("");
  const [selectedPosition, setSelectedPosition] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [building, setBuilding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [health, setHealth] = useState<"idle" | "ok" | "ko">("idle");
  const [buildMeta, setBuildMeta] = useState<RecruterPlayersIndexBuildResponse | null>(null);
  const [leagueIndex, setLeagueIndex] = useState<RecruterLeagueIndexResponse | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const [playersRes, healthRes] = await Promise.allSettled([
        Promise.allSettled(XS_RECRUTER_FRONT_VISIBLE_LEAGUES_V1.map((league) => recruterLeagueIndex(league.slug))),
        apiFetch<{ ok?: boolean }>("/recruter/health"),
      ]);

      if (playersRes.status === "fulfilled") {
        const fulfilled = playersRes.value
          .filter((res): res is PromiseFulfilledResult<RecruterLeagueIndexResponse> => res.status === "fulfilled")
          .map((res) => res.value);
        if (!fulfilled.length) {
          const firstError = playersRes.value.find((res) => res.status === "rejected") as PromiseRejectedResult | undefined;
          throw firstError?.reason || new Error("Aucune ligue Recruter disponible");
        }
        const merged = xsRecruterMergeLeagueItemsV1(fulfilled);
        setLeagueIndex(merged);
        setItems(Array.isArray(merged.items) ? merged.items : []);
        setSelectedLeague((current) => current && !merged.items.some((item) => norm(item.leagueSlug) === current) ? "" : current);
      } else {
        throw playersRes.reason;
      }

      setHealth(healthRes.status === "fulfilled" && healthRes.value?.ok ? "ok" : "ko");
    } catch (e: any) {
      setError(e?.message || "Erreur réseau");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const continueIndex = useCallback(async () => {
    try {
      setBuilding(true);
      setError(null);
      const res = await recruterPlayersIndexBuild({ limitTeams: 20 });
      setBuildMeta(res);
      await load(true);
    } catch (e: any) {
      setError(e?.message || "Erreur index joueurs");
    } finally {
      setBuilding(false);
    }
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load(false);
    }, [load]),
  );

  const leagues = useMemo(() => {
    const counts = new Map(collectOptions(items, "league").map((league) => [league.slug, league]));
    return XS_RECRUTER_FRONT_VISIBLE_LEAGUES_V1.map((league) => {
      const row = counts.get(norm(league.slug));
      return { slug: norm(league.slug), name: league.label, count: row?.count || 0 };
    });
  }, [items]);
  const clubs = useMemo(() => {
    const base = selectedLeague ? items.filter((item) => norm(item.leagueSlug) === selectedLeague) : items;
    return collectOptions(base, "club");
  }, [items, selectedLeague]);

  const filtered = useMemo(() => {
    const q = norm(query);
    return items.filter((item) => {
      if (selectedLeague && norm(item.leagueSlug) !== selectedLeague) return false;
      if (selectedClub && norm(item.clubSlug) !== selectedClub) return false;
      if (selectedPosition && norm(item.position) !== selectedPosition.toLowerCase()) return false;
      if (!q) return true;
      return [item.displayName, item.playerName, item.playerSlug, item.clubName, item.clubSlug, item.leagueName, item.leagueSlug, item.position]
        .some((value) => norm(value).includes(q));
    });
  }, [items, query, selectedClub, selectedLeague, selectedPosition]);

  const summary = useMemo(() => {
    const forSale = filtered.filter((item) => recruterSaleStatus(item) === "for_sale").length;
    return { total: filtered.length, forSale, leagues: leagues.length, clubs: clubs.length };
  }, [clubs.length, filtered, leagues.length]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#08090d" }}>
      <View style={{ padding: 12, gap: 10, backgroundColor: "#0d0f14", borderBottomWidth: 1, borderBottomColor: "#251016" }}>
        <Text style={{ color: "white", fontSize: 24, fontWeight: "900" }}>Recruter</Text>
        <Text style={{ color: "#a8b0ba" }}>
          Index {leagues.length || XS_RECRUTER_FRONT_VISIBLE_LEAGUES_V1.length} ligues · santé API: {health === "ok" ? "OK" : health === "ko" ? "KO" : "..."}
        </Text>

        <TouchableOpacity
          onPress={continueIndex}
          disabled={building}
          style={{ backgroundColor: building ? "#60202a" : "#c92a3d", borderRadius: 9, paddingHorizontal: 12, paddingVertical: 10, alignItems: "center" }}
        >
          <Text style={{ color: "white", fontWeight: "900" }}>{building ? "Indexation..." : "Continuer l'index joueurs"}</Text>
        </TouchableOpacity>

        {buildMeta?.summary ? (
          <Text style={{ color: "#ff9aa8" }}>
            Cache: {buildMeta.summary.playersCount ?? 0} joueurs · {buildMeta.summary.clubsCount ?? 0} clubs · {buildMeta.summary.leaguesCount ?? 0} ligues
          </Text>
        ) : (
          <Text style={{ color: "#ff9aa8" }}>
            {leagueIndex?.playersCount ?? summary.total} joueurs · {leagueIndex?.clubsCount ?? summary.clubs} clubs · {summary.leagues} ligue{summary.leagues > 1 ? "s" : ""} · {summary.forSale} en vente
          </Text>
        )}

        <TextInput
          placeholder="Rechercher joueur, club, ligue"
          placeholderTextColor="#70757a"
          value={query}
          onChangeText={setQuery}
          style={{ backgroundColor: "#171a22", color: "#fff", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 }}
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          <TouchableOpacity onPress={() => setSelectedPosition("")} style={{ borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: selectedPosition ? "#141821" : "#c92a3d" }}>
            <Text style={{ color: "white", fontWeight: "800" }}>Tous</Text>
          </TouchableOpacity>
          {POSITIONS.map((pos) => (
            <TouchableOpacity key={pos} onPress={() => setSelectedPosition(pos)} style={{ borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: selectedPosition === pos ? "#c92a3d" : "#141821", borderWidth: 1, borderColor: "#2a1218" }}>
              <Text style={{ color: "white", fontWeight: "800" }}>{pos}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          <TouchableOpacity onPress={() => { setSelectedLeague(""); setSelectedClub(""); }} style={{ borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: selectedLeague ? "#141821" : "#c92a3d" }}>
            <Text style={{ color: "white", fontWeight: "800" }}>Ligues</Text>
          </TouchableOpacity>
          {leagues.slice(0, 24).map((league) => (
            <TouchableOpacity key={league.slug} onPress={() => { setSelectedLeague(league.slug); setSelectedClub(""); }} style={{ borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: selectedLeague === league.slug ? "#c92a3d" : "#141821", borderWidth: 1, borderColor: "#2a1218" }}>
              <Text style={{ color: "white", fontWeight: "800" }}>{league.name} ({league.count})</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          <TouchableOpacity onPress={() => setSelectedClub("")} style={{ borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: selectedClub ? "#141821" : "#c92a3d" }}>
            <Text style={{ color: "white", fontWeight: "800" }}>Clubs</Text>
          </TouchableOpacity>
          {clubs.slice(0, 24).map((club) => (
            <TouchableOpacity key={club.slug} onPress={() => setSelectedClub(club.slug)} style={{ borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: selectedClub === club.slug ? "#c92a3d" : "#141821", borderWidth: 1, borderColor: "#2a1218" }}>
              <Text style={{ color: "white", fontWeight: "800" }}>{club.name} ({club.count})</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
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
          keyExtractor={(item, index) => String(item.slug || item.playerSlug || index)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#ff5d73" />}
          contentContainerStyle={{ padding: 12, paddingBottom: 30 }}
          ListEmptyComponent={<Text style={{ color: "#9ba1a6", textAlign: "center", marginTop: 30 }}>Aucun joueur trouvé dans l'index.</Text>}
          renderItem={({ item }) => {
            const slug = text(item.slug || item.playerSlug);
            const displayName = text(item.displayName || item.playerName, slug || "Joueur");
            const clubName = text(item.clubName, "Club inconnu");
            const leagueName = text(item.leagueName, "Ligue inconnue");
            const badge = saleBadge(item);

            return (
              <TouchableOpacity
                onPress={() => { if (!slug) return; router.push({ pathname: "/recruter/player/[slug]", params: { slug } }); }}
                style={{ flexDirection: "row", gap: 12, marginBottom: 10, backgroundColor: "#12151c", borderRadius: 12, borderWidth: 1, borderColor: "#2a1218", padding: 12 }}
              >
                <Image
                  source={{ uri: item.pictureUrl || "https://frontend-assets.sorare.com/placeholders/player-v2.png" }}
                  style={{ width: 64, height: 64, borderRadius: 8, backgroundColor: "#050509" }}
                />
                <View style={{ flex: 1, justifyContent: "center", gap: 5 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Text style={{ color: "#fff", fontWeight: "900", fontSize: 16, flex: 1 }} numberOfLines={1}>{displayName}</Text>
                    <View style={{ backgroundColor: badge.background, borderColor: badge.border, borderWidth: 1, borderRadius: 7, paddingHorizontal: 8, paddingVertical: 4 }}>
                      <Text style={{ color: badge.color, fontWeight: "900", fontSize: 12 }}>{badge.label}</Text>
                    </View>
                  </View>
                  <Text style={{ color: "#b8bec8" }} numberOfLines={1}>{clubName} · {leagueName}</Text>
                  <Text style={{ color: "#8b949e" }}>{text(item.position, "N/A")} · {item.age != null ? `${item.age} ans` : "Age inconnu"}</Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}
