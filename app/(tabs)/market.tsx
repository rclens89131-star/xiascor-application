import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Image, RefreshControl, SafeAreaView, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
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
// XS_RECRUTER_PREMIUM_UI_REFERENCE_V1: premium scouting UI inspired by the reference screen.
// XS_RECRUTER_PLAYER_FACE_CROP_FIX_V1: crop player pictures toward face/upper body in Recruter cards.
// XS_RECRUTER_FACE_CROP_STRONG_OFFSET_V1: stronger vertical crop offsets for player faces.
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

const XS_RECRUTER_FRONT_LEAGUE_SLUG_ALIASES_V1: Record<string, string> = {
  "premier-league": "premier-league-gb-eng",
  laliga: "laliga-es",
  "serie-a": "serie-a-it",
  bundesliga: "bundesliga-de",
  "ligue-2": "ligue-2-fr",
  "liga-portugal": "primeira-liga-pt",
  championship: "championship-gb-eng",
  mls: "mlspa",
  "belgium-pro-league": "jupiler-pro-league",
  "scottish-premiership": "premiership-gb-sct",
  "swiss-super-league": "super-league-ch",
  "super-lig": "spor-toto-super-lig",
  "danish-superliga": "superliga-dk",
  "croatian-hnl": "1-hnl",
  "bundesliga-2": "2-bundesliga",
  "laliga-hypermotion": "segunda-division-es",
  brasileirao: "campeonato-brasileiro-serie-a",
  "argentina-primera": "superliga-argentina-de-futbol",
  "ecuador-liga-pro": "liga-pro",
  "colombia-primera-a": "primera-a",
  "peru-liga-1": "primera-division-pe",
  "uruguay-primera": "primera-division-uy",
  "j-league": "j1-100-year-vision-league",
  "k-league": "k-league-1",
};

const POSITIONS = ["GK", "DEF", "MID", "FW"];
const PLAYER_PLACEHOLDER = "https://frontend-assets.sorare.com/placeholders/player-v2.png";

function text(v: unknown, fallback = "") {
  const s = String(v ?? "").trim();
  return s || fallback;
}

function norm(v: unknown) {
  return String(v ?? "").trim().toLowerCase();
}

function compactNumber(value: number) {
  return new Intl.NumberFormat("fr-FR").format(Math.max(0, Math.round(value || 0)));
}

function xsRecruterFrontLeagueSlugV1(value: unknown) {
  const slug = norm(value);
  return XS_RECRUTER_FRONT_LEAGUE_SLUG_ALIASES_V1[slug] || slug;
}

function playerScore(item: RecruterPlayer) {
  const row: any = item;
  const value = Number(row.lastL5 ?? row.last_l5 ?? row.l5 ?? row.average ?? row.score);
  return Number.isFinite(value) && value > 0 ? Math.round(value) : null;
}

function scoreColor(score: number | null) {
  if (score == null) return "#64748B";
  if (score >= 55) return "#22C55E";
  if (score >= 45) return "#FACC15";
  return "#EF4444";
}

function saleBadge(player: RecruterPlayer) {
  const status = recruterSaleStatus(player);
  if (status === "for_sale") return { label: "En vente", color: "#72e6a2", border: "#245b39", background: "#102219" };
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

function FilterChip({ label, active, onPress }: { label: string; active?: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 10,
        backgroundColor: active ? "#D51F3C" : "#121722",
        borderWidth: 1,
        borderColor: active ? "#F04A62" : "#273142",
      }}
    >
      <Text style={{ color: "white", fontWeight: "900" }} numberOfLines={1}>{label}</Text>
    </TouchableOpacity>
  );
}

function StatCell({ icon, value, label }: { icon: keyof typeof Ionicons.glyphMap; value: string; label: string }) {
  return (
    <View style={{ flex: 1, alignItems: "center", gap: 5 }}>
      <Ionicons name={icon} size={21} color="#AEB7C4" />
      <Text style={{ color: "#F8FAFC", fontSize: 20, fontWeight: "900", fontVariant: ["tabular-nums"] }}>{value}</Text>
      <Text style={{ color: "#A4ABB6", fontSize: 12 }}>{label}</Text>
    </View>
  );
}

function RecruterFaceImageV1({
  uri,
  size,
  radius,
  variant = "avatar",
}: {
  uri?: string | null;
  size: { width: number; height: number };
  radius: number;
  variant?: "avatar" | "card";
}) {
  const imageHeight = variant === "card" ? size.height * 1.34 : size.height * 1.24;
  const imageWidth = variant === "card" ? size.width * 1.14 : size.width * 1.08;
  const offsetY = variant === "card" ? -Math.round(size.height * 0.27) : -Math.round(size.height * 0.18);
  return (
    <View style={{ width: size.width, height: size.height, borderRadius: radius, overflow: "hidden", backgroundColor: "#050509", alignItems: "center" }}>
      <Image
        source={{ uri: uri || PLAYER_PLACEHOLDER }}
        resizeMode="cover"
        style={{
          width: imageWidth,
          height: imageHeight,
          transform: [{ translateY: offsetY }],
        }}
      />
      {variant === "card" ? (
        <LinearGradient colors={["transparent", "rgba(5,7,12,0.72)"]} style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 44 }} />
      ) : null}
    </View>
  );
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
        setSelectedLeague((current) => {
          const canonical = xsRecruterFrontLeagueSlugV1(current);
          return canonical && !merged.items.some((item) => norm(item.leagueSlug) === canonical) ? "" : canonical;
        });
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
      const slug = xsRecruterFrontLeagueSlugV1(league.slug);
      const row = counts.get(slug);
      return { slug, name: league.label, count: row?.count || 0 };
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
    return {
      total: filtered.length,
      allPlayers: leagueIndex?.playersCount ?? items.length,
      forSale,
      leagues: leagues.length,
      clubs: selectedLeague ? clubs.length : (leagueIndex?.clubsCount ?? collectOptions(items, "club").length),
    };
  }, [clubs.length, filtered, items, leagueIndex, leagues.length, selectedLeague]);

  const recommended = useMemo(() => {
    return [...filtered]
      .sort((a, b) => (playerScore(b) ?? -1) - (playerScore(a) ?? -1))
      .slice(0, 8);
  }, [filtered]);

  const latest = useMemo(() => filtered.slice(0, 12), [filtered]);

  const openPlayer = useCallback((item: RecruterPlayer) => {
    const slug = text(item.slug || item.playerSlug);
    if (!slug) return;
    router.push({ pathname: "/recruter/player/[slug]", params: { slug } });
  }, [router]);

  const listHeader = (
    <View style={{ gap: 16, paddingBottom: 12 }}>
      <View style={{ paddingTop: 10, gap: 6 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View>
            <Text style={{ color: "white", fontSize: 34, fontWeight: "900", letterSpacing: 0 }}>Recruter</Text>
            <Text style={{ color: "#B8BEC8", fontSize: 16, marginTop: 4 }}>Trouvez les pépites avant tout le monde</Text>
          </View>
          <View style={{ width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "#111722", borderWidth: 1, borderColor: "#273142" }}>
            <Ionicons name="notifications-outline" size={23} color="#F8FAFC" />
            <View style={{ position: "absolute", right: 9, top: 8, width: 10, height: 10, borderRadius: 5, backgroundColor: "#F43F5E" }} />
          </View>
        </View>
      </View>

      <LinearGradient colors={["#18141d", "#10151e"]} style={{ borderRadius: 18, borderWidth: 1, borderColor: "#572331", padding: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          <View style={{ width: 64, height: 64, borderRadius: 16, backgroundColor: "#221924", alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="scan-circle-outline" size={36} color="#F43F5E" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: "#C6CDD7", fontSize: 15 }}>Index en cours</Text>
            <Text style={{ color: "white", fontSize: 24, fontWeight: "900" }}>{summary.leagues} ligues indexées</Text>
            <Text style={{ color: health === "ok" ? "#22C55E" : "#F59E0B", fontWeight: "800" }}>Santé API : {health === "ok" ? "OK" : health === "ko" ? "KO" : "..."}</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#F8FAFC" />
        </View>
      </LinearGradient>

      <TouchableOpacity onPress={continueIndex} disabled={building} activeOpacity={0.88}>
        <LinearGradient colors={building ? ["#6B1E2B", "#8E2032"] : ["#F02548", "#C91435"]} style={{ borderRadius: 15, paddingVertical: 17, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12 }}>
          <Text style={{ color: "white", fontSize: 18, fontWeight: "900" }}>{building ? "Indexation..." : "Continuer l'index joueurs"}</Text>
          <Ionicons name="chevron-forward" size={22} color="white" />
        </LinearGradient>
      </TouchableOpacity>

      <View style={{ borderRadius: 18, backgroundColor: "#111722", borderWidth: 1, borderColor: "#273142", paddingVertical: 15, flexDirection: "row" }}>
        <StatCell icon="person-outline" value={compactNumber(summary.allPlayers)} label="Joueurs" />
        <View style={{ width: 1, backgroundColor: "#273142" }} />
        <StatCell icon="shield-checkmark-outline" value={compactNumber(summary.clubs)} label="Clubs" />
        <View style={{ width: 1, backgroundColor: "#273142" }} />
        <StatCell icon="globe-outline" value={compactNumber(summary.leagues)} label="Ligues" />
        <View style={{ width: 1, backgroundColor: "#273142" }} />
        <StatCell icon="pricetag-outline" value={compactNumber(summary.forSale)} label="En vente" />
      </View>

      <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
        <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#111722", borderRadius: 14, borderWidth: 1, borderColor: "#273142", paddingHorizontal: 14 }}>
          <Ionicons name="search" size={22} color="#B8BEC8" />
          <TextInput
            placeholder="Rechercher joueur, club, ligue..."
            placeholderTextColor="#8A93A0"
            value={query}
            onChangeText={setQuery}
            style={{ flex: 1, color: "#fff", paddingVertical: 13, fontSize: 15 }}
          />
        </View>
        <TouchableOpacity style={{ width: 50, height: 50, borderRadius: 14, backgroundColor: "#111722", borderWidth: 1, borderColor: "#273142", alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="options-outline" size={24} color="#F8FAFC" />
        </TouchableOpacity>
      </View>

      <View style={{ gap: 12 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ color: "#F8FAFC", fontSize: 19, fontWeight: "900" }}>Filtres rapides</Text>
          <TouchableOpacity onPress={() => { setSelectedPosition(""); setSelectedLeague(""); setSelectedClub(""); setQuery(""); }}>
            <Text style={{ color: "#F43F5E", fontWeight: "800" }}>Tout réinitialiser</Text>
          </TouchableOpacity>
        </View>
        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={{ color: "#F8FAFC", width: 62, fontWeight: "900" }}>Poste</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              <FilterChip label="Tous" active={!selectedPosition} onPress={() => setSelectedPosition("")} />
              {POSITIONS.map((pos) => <FilterChip key={pos} label={pos} active={selectedPosition === pos} onPress={() => setSelectedPosition(pos)} />)}
            </ScrollView>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={{ color: "#F8FAFC", width: 62, fontWeight: "900" }}>Ligues</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {leagues.slice(0, 8).map((league) => (
                <FilterChip key={league.slug} label={`${league.name} (${league.count})`} active={selectedLeague === league.slug} onPress={() => { setSelectedLeague(selectedLeague === league.slug ? "" : league.slug); setSelectedClub(""); }} />
              ))}
              <FilterChip label="+" onPress={() => {}} />
            </ScrollView>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={{ color: "#F8FAFC", width: 62, fontWeight: "900" }}>Clubs</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {clubs.slice(0, 8).map((club) => (
                <FilterChip key={club.slug} label={`${club.name} (${club.count})`} active={selectedClub === club.slug} onPress={() => setSelectedClub(selectedClub === club.slug ? "" : club.slug)} />
              ))}
              <FilterChip label="+" onPress={() => {}} />
            </ScrollView>
          </View>
        </View>
      </View>

      <View style={{ height: 1, backgroundColor: "#202734" }} />

      <View style={{ gap: 12 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ color: "#F8FAFC", fontSize: 21, fontWeight: "900" }}>Joueurs recommandés</Text>
          <Text style={{ color: "#F43F5E", fontWeight: "800" }}>Voir tout</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
          {recommended.map((item, index) => {
            const slug = text(item.slug || item.playerSlug, String(index));
            const score = playerScore(item);
            return (
              <TouchableOpacity key={`${slug}-${index}`} onPress={() => openPlayer(item)} activeOpacity={0.9} style={{ width: 174, borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: "#2B3444", backgroundColor: "#111722" }}>
                <LinearGradient colors={["#1A1220", "#0D121A"]} style={{ padding: 12, minHeight: 242 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <View style={{ paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, backgroundColor: "#102B1D" }}>
                      <Text style={{ color: "#55E38D", fontWeight: "900", fontSize: 12 }}>{text(item.position, "—")}</Text>
                    </View>
                    <Ionicons name="heart-outline" size={23} color="#F8FAFC" />
                  </View>
                  <View style={{ alignItems: "center", marginTop: 8 }}>
                    <RecruterFaceImageV1 uri={item.pictureUrl} size={{ width: 128, height: 116 }} radius={12} variant="card" />
                  </View>
                  <Text style={{ color: "white", fontWeight: "900", fontSize: 17, marginTop: 10 }} numberOfLines={1}>{text(item.displayName || item.playerName, slug)}</Text>
                  <Text style={{ color: "#B8BEC8", marginTop: 3 }} numberOfLines={1}>{text(item.clubName, "Club inconnu")} · {text(item.leagueName, "Ligue inconnue")}</Text>
                  <Text style={{ color: "#A4ABB6", marginTop: 5 }}>{item.age != null ? `${item.age} ans` : "Âge —"}</Text>
                  <View style={{ alignSelf: "center", marginTop: 10, borderRadius: 10, borderWidth: 1, borderColor: `${scoreColor(score)}80`, backgroundColor: `${scoreColor(score)}22`, paddingHorizontal: 12, paddingVertical: 5 }}>
                    <Text style={{ color: scoreColor(score), fontSize: 21, fontWeight: "900" }}>{score == null ? "—" : score}</Text>
                    <Text style={{ color: "#C6CDD7", fontSize: 11, textAlign: "center" }}>Score</Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <View style={{ height: 1, backgroundColor: "#202734" }} />

      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ color: "#F8FAFC", fontSize: 21, fontWeight: "900" }}>{selectedPosition ? `${summary.total} ${selectedPosition} trouvés` : "Derniers ajoutés"}</Text>
        <Text style={{ color: "#F43F5E", fontWeight: "800" }}>Trier</Text>
      </View>

      {buildMeta?.summary ? (
        <Text style={{ color: "#FCA5B4" }}>
          Cache: {buildMeta.summary.playersCount ?? 0} joueurs · {buildMeta.summary.clubsCount ?? 0} clubs · {buildMeta.summary.leaguesCount ?? 0} ligues
        </Text>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#070A10" }}>
      <LinearGradient colors={["#090D14", "#070A10", "#13080E"]} style={{ flex: 1 }}>
        {loading ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator color="#ff5d73" />
          </View>
        ) : error ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 16 }}>
            <Text style={{ color: "#ff9aa8", textAlign: "center", marginBottom: 10 }}>{error}</Text>
            <TouchableOpacity onPress={() => load(false)} style={{ backgroundColor: "#D51F3C", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 }}>
              <Text style={{ color: "white", fontWeight: "900" }}>Réessayer</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={latest}
            keyExtractor={(item, index) => String(item.slug || item.playerSlug || index)}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#ff5d73" />}
            ListHeaderComponent={listHeader}
            contentContainerStyle={{ padding: 18, paddingBottom: 34, gap: 10 }}
            ListEmptyComponent={<Text style={{ color: "#9ba1a6", textAlign: "center", marginTop: 30 }}>{selectedLeague ? "Données en cours d'indexation." : "Aucun joueur trouvé dans l'index."}</Text>}
            renderItem={({ item }) => {
              const slug = text(item.slug || item.playerSlug);
              const displayName = text(item.displayName || item.playerName, slug || "Joueur");
              const badge = saleBadge(item);
              const score = playerScore(item);
              return (
                <TouchableOpacity
                  onPress={() => openPlayer(item)}
                  activeOpacity={0.88}
                  style={{ flexDirection: "row", gap: 12, backgroundColor: "#101722", borderRadius: 15, borderWidth: 1, borderColor: "#2B3444", padding: 10, alignItems: "center" }}
                >
                  <RecruterFaceImageV1 uri={item.pictureUrl} size={{ width: 72, height: 72 }} radius={12} variant="avatar" />
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={{ color: "#fff", fontWeight: "900", fontSize: 16 }} numberOfLines={1}>{displayName}</Text>
                    <Text style={{ color: "#B8BEC8" }} numberOfLines={1}>{text(item.clubName, "Club inconnu")} · {text(item.leagueName, "Ligue inconnue")}</Text>
                    <Text style={{ color: "#8B95A4" }} numberOfLines={1}>{text(item.position, "—")} · {item.age != null ? `${item.age} ans` : "Âge inconnu"}</Text>
                    <View style={{ alignSelf: "flex-start", backgroundColor: badge.background, borderColor: badge.border, borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
                      <Text style={{ color: badge.color, fontWeight: "900", fontSize: 12 }}>{badge.label}</Text>
                    </View>
                  </View>
                  <View style={{ alignItems: "center", gap: 8 }}>
                    <Ionicons name="heart-outline" size={23} color="#F8FAFC" />
                    <View style={{ minWidth: 48, borderRadius: 11, borderWidth: 1, borderColor: `${scoreColor(score)}99`, backgroundColor: `${scoreColor(score)}1F`, paddingVertical: 6, alignItems: "center" }}>
                      <Text style={{ color: scoreColor(score), fontWeight: "900", fontSize: 19 }}>{score == null ? "—" : score}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        )}
      </LinearGradient>
    </SafeAreaView>
  );
}
