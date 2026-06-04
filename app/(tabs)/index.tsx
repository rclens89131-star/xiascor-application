/* XS_HOME_CLUB_PRESIDENT_V1 */
/* XS_HOME_CLUB_EVOLUTION_HISTORY_V1 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";

import { apiFetch } from "../../src/api";
import { myCardsList } from "../../src/scoutApi";

const DEVICE_ID_KEY = "XS_DEVICE_ID_V1";
const JWT_DEVICE_ID_KEY = "XS_JWT_DEVICE_ID_V1";
const OAUTH_DEVICE_ID_KEY = "xs_device_id";
const CLUB_VALUE_HISTORY_KEY = "club_value_history";

const MORNING_ALERTS = [
  { icon: "trending-up", tone: "green", text: "Ryan Cherki est en forme sur les derniers matchs." },
  { icon: "checkmark-circle", tone: "green", text: "Openda devrait être titulaire cette Game Week." },
  { icon: "warning", tone: "gold", text: "Florian Thauvin reste incertain, minutes à surveiller." },
  { icon: "calendar", tone: "red", text: "2 joueurs sont encore sans compétition éligible." },
];

const NEWS = [
  "Cherki prend de la valeur",
  "Nouveau match ajouté au calendrier",
  "3 joueurs en risque de rotation",
  "Champion Limited jouable",
];

const GOALS = [
  { label: "Atteindre 50 cartes", done: true },
  { label: "Jouer Champion Limited", done: true },
  { label: "Dépasser 3000 € de valeur", done: false },
  { label: "Entrer dans le Top 1000 Xiascor", done: false },
];

const GEMS = [
  { name: "Ryan Cherki", meta: "Score IA 86 · 14 €" },
  { name: "Ainsley Maitland-Niles", meta: "Potentiel +50% · 4 €" },
  { name: "Abdukodir Khusanov", meta: "Défenseur premium · à surveiller" },
];

type ClubMetrics = {
  clubValue: number | null;
  squadCount: number | null;
  weeklyDelta: number | null;
  clubValueText?: string | null;
  weeklyDeltaText?: string | null;
  evolutionText?: string | null;
};

type ClubValueHistorySnapshot = {
  id: string;
  label: string;
  createdAt: string;
  clubValueEur: number;
  clubValueText: string;
  pricedCards?: number | null;
  cardCount?: number | null;
};

type HomeGameWeekSummary = {
  label: string;
  rarity: string;
  eligibleCount: number | null;
  state: "prête" | "incomplète" | "indisponible";
  projectionLabel: string;
};

const HOME_GAMEWEEK_OPTIONS_V1 = [
  { label: "Champion", rarity: "Limited", leagues: ["premier-league-gb-eng", "laliga-es", "bundesliga-de", "serie-a-it", "ligue-1-fr"], requiredCards: 5 },
  { label: "Ligue 1", rarity: "Limited", leagues: ["ligue-1-fr"], requiredCards: 5 },
  { label: "Premier League", rarity: "Limited", leagues: ["premier-league-gb-eng"], requiredCards: 5 },
  { label: "Serie A", rarity: "Limited", leagues: ["serie-a-it"], requiredCards: 5 },
  { label: "MLS", rarity: "Limited", leagues: ["mls", "mls-us", "mlspa"], requiredCards: 5 },
  { label: "All-Star", rarity: "Limited", leagues: [], requiredCards: 5 },
];

function metricNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(String(value).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function firstMetricNumber(...values: unknown[]): number | null {
  for (const value of values) {
    const n = metricNumber(value);
    if (n !== null) return n;
  }
  return null;
}

function formatEuro(value: number | null): string {
  if (value === null) return "—";
  return `${Math.round(value).toLocaleString("fr-FR")} €`;
}

function formatWeeklyDelta(value: number | null): string {
  if (value === null) return "Données indisponibles";
  const rounded = Math.round(value);
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded.toLocaleString("fr-FR")} €`;
}

function formatSignedEuro(value: number): string {
  const rounded = Math.round(value);
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded.toLocaleString("fr-FR")} €`;
}

async function readClubValueHistoryV1(): Promise<ClubValueHistorySnapshot[]> {
  try {
    const raw = await AsyncStorage.getItem(CLUB_VALUE_HISTORY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed
          .map((item: any) => ({
            id: String(item?.id || item?.createdAt || ""),
            label: String(item?.label || ""),
            createdAt: String(item?.createdAt || ""),
            clubValueEur: metricNumber(item?.clubValueEur) ?? 0,
            clubValueText: String(item?.clubValueText || ""),
            pricedCards: metricNumber(item?.pricedCards),
            cardCount: metricNumber(item?.cardCount),
          }))
          .filter((item) => item.createdAt && Number.isFinite(item.clubValueEur))
      : [];
  } catch {
    return [];
  }
}

async function upsertClubValueSnapshotV1(payload: any): Promise<ClubValueHistorySnapshot[]> {
  const value = metricNumber(payload?.clubValueEur);
  if (value === null) return readClubValueHistoryV1();
  const current = await readClubValueHistoryV1();
  const last = current[current.length - 1];
  const today = new Date();
  const dayKey = today.toISOString().slice(0, 10);
  const next: ClubValueHistorySnapshot = {
    id: dayKey,
    label: `GW${current.length + 521}`,
    createdAt: today.toISOString(),
    clubValueEur: Math.round(value * 100) / 100,
    clubValueText: typeof payload?.clubValueText === "string" ? payload.clubValueText : formatEuro(value),
    pricedCards: metricNumber(payload?.pricedCards),
    cardCount: metricNumber(payload?.cardCount),
  };
  const merged = last && last.id === dayKey
    ? [...current.slice(0, -1), { ...last, ...next, label: last.label || next.label }]
    : current.length && Math.abs((last?.clubValueEur ?? 0) - next.clubValueEur) < 0.01
      ? current
      : [...current, next];
  const trimmed = merged.slice(-120);
  try { await AsyncStorage.setItem(CLUB_VALUE_HISTORY_KEY, JSON.stringify(trimmed)); } catch {}
  return trimmed;
}

function getClubEvolutionTextV1(history: ClubValueHistorySnapshot[], currentValue: number | null): string {
  if (currentValue === null || !history.length) return "0 €";
  const firstValue = history[0]?.clubValueEur;
  if (!Number.isFinite(firstValue)) return "0 €";
  return formatSignedEuro(currentValue - firstValue);
}

function normalizeHomeTextV1(value: unknown): string {
  return String(value || "").trim().toLowerCase();
}

function getHomeCardRarityV1(card: any): string {
  return normalizeHomeTextV1(card?.rarity || card?.cardRarity || card?.rarityTyped || card?.card_data?.rarity);
}

function getHomeCardLeagueSlugV1(card: any): string {
  return normalizeHomeTextV1(
    card?.currentLeagueSlug ||
      card?.leagueSlug ||
      card?.cardLeagueSlug ||
      card?.currentLeague?.slug ||
      card?.league?.slug ||
      card?.card_data?.currentLeagueSlug ||
      card?.card_data?.leagueSlug
  );
}

function extractHomeGameWeekSummaryV1(payload: any): HomeGameWeekSummary {
  // XS_HOME_REAL_GAMEWEEK_V1: lightweight Home summary from the same cards data used by Mes cartes/Jouer.
  const cards = Array.isArray(payload?.cards) ? payload.cards : [];
  if (!cards.length) {
    return {
      label: "Données indisponibles",
      rarity: "—",
      eligibleCount: null,
      state: "indisponible",
      projectionLabel: "À générer",
    };
  }

  const ranked = HOME_GAMEWEEK_OPTIONS_V1.map((option) => {
    const rarityKey = normalizeHomeTextV1(option.rarity);
    const leagueKeys = option.leagues.map(normalizeHomeTextV1);
    const eligibleCount = cards.filter((card: any) => {
      const rarity = getHomeCardRarityV1(card);
      if (rarity !== rarityKey) return false;
      if (!leagueKeys.length) return true;
      const leagueSlug = getHomeCardLeagueSlugV1(card);
      return leagueSlug ? leagueKeys.includes(leagueSlug) : false;
    }).length;
    return {
      ...option,
      eligibleCount,
      state: eligibleCount >= option.requiredCards ? "prête" : eligibleCount > 0 ? "incomplète" : "indisponible",
    } as const;
  });

  const ready = ranked.find((item) => item.state === "prête");
  const bestPartial = ranked.slice().sort((a, b) => b.eligibleCount - a.eligibleCount)[0];
  const selected = ready || bestPartial;
  return {
    label: selected?.label || "Données indisponibles",
    rarity: selected?.rarity || "—",
    eligibleCount: selected ? selected.eligibleCount : null,
    state: selected?.state || "indisponible",
    projectionLabel: "À générer",
  };
}

async function readHomeDeviceIdV1(): Promise<string | null> {
  // XS_HOME_DEVICE_ID_FIX_V1: mirror Mes cartes deviceId priority.
  const oauthId = (await AsyncStorage.getItem(OAUTH_DEVICE_ID_KEY)) || "";
  if (oauthId.trim()) {
    try { await AsyncStorage.setItem(DEVICE_ID_KEY, oauthId.trim()); } catch {}
    return oauthId.trim();
  }

  const jwtId = (await AsyncStorage.getItem(JWT_DEVICE_ID_KEY)) || "";
  if (jwtId.trim()) return jwtId.trim();

  const existing = (await AsyncStorage.getItem(DEVICE_ID_KEY)) || "";
  if (existing.trim()) return existing.trim();

  const generated = `xs-device-${Date.now()}`;
  await AsyncStorage.setItem(DEVICE_ID_KEY, generated);
  return generated;
}

function extractClubMetricsV1(payload: any): ClubMetrics {
  // XS_HOME_REAL_CLUB_METRICS_V1: reuse /my-cards data already consumed by Mes cartes.
  const cards = Array.isArray(payload?.cards) ? payload.cards : [];
  const meta = payload?.meta || {};
  const summary = payload?.summary || meta?.summary || {};
  const directValue = firstMetricNumber(
    payload?.clubValue,
    payload?.totalValue,
    payload?.collectionValue,
    payload?.valueEur,
    summary?.clubValue,
    summary?.totalValue,
    summary?.collectionValue,
    meta?.clubValue,
    meta?.totalValue,
    meta?.collectionValue
  );
  const cardValues = cards
    .map((card: any) =>
      firstMetricNumber(
        card?.marketValueEur,
        card?.estimatedValueEur,
        card?.floorPriceEur,
        card?.priceEur,
        card?.eur,
        card?.valueEur,
        card?.price?.eur
      )
    )
    .filter((value: number | null): value is number => value !== null && value > 0);
  const clubValue = directValue ?? (cardValues.length ? cardValues.reduce((sum, value) => sum + value, 0) : null);
  const weeklyDelta = firstMetricNumber(
    payload?.weeklyDelta,
    payload?.weeklyDeltaEur,
    payload?.evolutionWeek,
    payload?.weekDelta,
    summary?.weeklyDelta,
    summary?.weeklyDeltaEur,
    meta?.weeklyDelta,
    meta?.weeklyDeltaEur
  );
  const squadCount = firstMetricNumber(payload?.total, payload?.count, summary?.cardsCount, meta?.cardsCount) ?? (cards.length ? cards.length : null);
  return { clubValue, squadCount, weeklyDelta };
}

async function fetchHomeClubMetricsEndpointV1(deviceId: string): Promise<ClubMetrics | null> {
  // XS_HOME_CLUB_METRICS_ENDPOINT_V1: President Home reads the dedicated club value endpoint.
  try {
    const qs = new URLSearchParams();
    qs.set("deviceId", deviceId);
    const payload = await apiFetch<any>(`/club/metrics?${qs.toString()}`);
    if (!payload || payload.ok === false) return null;
    const history = await upsertClubValueSnapshotV1(payload);
    const clubValue = firstMetricNumber(payload.clubValueEur);
    return {
      clubValue,
      squadCount: firstMetricNumber(payload.cardCount),
      weeklyDelta: firstMetricNumber(payload.weeklyDeltaEur),
      clubValueText: typeof payload.clubValueText === "string" && payload.clubValueText.trim() ? payload.clubValueText : null,
      weeklyDeltaText: typeof payload.weeklyDeltaText === "string" && payload.weeklyDeltaText.trim() ? payload.weeklyDeltaText : null,
      evolutionText: getClubEvolutionTextV1(history, clubValue),
    };
  } catch {
    return null;
  }
}

function SectionCard({ children, style }: { children: React.ReactNode; style?: any }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

function SectionTitle({ icon, title, action }: { icon: keyof typeof Ionicons.glyphMap; title: string; action?: string }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleRow}>
        <Ionicons name={icon} size={18} color="#FF3148" />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {action ? <Text style={styles.sectionAction}>{action}</Text> : null}
    </View>
  );
}

function StatPill({ label, value, onPress }: { label: string; value: string; onPress?: () => void }) {
  const content = (
    <>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </>
  );
  if (onPress) {
    return (
      <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.statPill, pressed && styles.pressed]}>
        {content}
      </Pressable>
    );
  }
  return (
    <View style={styles.statPill}>
      {content}
    </View>
  );
}

function AlertLine({ item }: { item: (typeof MORNING_ALERTS)[number] }) {
  const color = item.tone === "green" ? "#2FE66B" : item.tone === "gold" ? "#FFD43B" : "#FF3148";
  return (
    <View style={styles.alertLine}>
      <Ionicons name={item.icon as any} size={17} color={color} />
      <Text style={styles.alertText}>{item.text}</Text>
    </View>
  );
}

export default function HomeScreen() {
  const [clubMetrics, setClubMetrics] = useState<ClubMetrics>({ clubValue: null, squadCount: null, weeklyDelta: null });
  const [gameWeekSummary, setGameWeekSummary] = useState<HomeGameWeekSummary>({
    label: "Données indisponibles",
    rarity: "—",
    eligibleCount: null,
    state: "indisponible",
    projectionLabel: "À générer",
  });

  useEffect(() => {
    let mounted = true;
    async function loadClubMetrics() {
      try {
        const deviceId = await readHomeDeviceIdV1();
        if (!deviceId || !mounted) return;
        const endpointMetrics = await fetchHomeClubMetricsEndpointV1(deviceId);
        const payload = await myCardsList(deviceId, 80);
        if (!mounted) return;
        setClubMetrics(endpointMetrics || extractClubMetricsV1(payload));
        setGameWeekSummary(extractHomeGameWeekSummaryV1(payload));
      } catch {
        if (mounted) {
          setClubMetrics({ clubValue: null, squadCount: null, weeklyDelta: null });
          setGameWeekSummary({
            label: "Données indisponibles",
            rarity: "—",
            eligibleCount: null,
            state: "indisponible",
            projectionLabel: "À générer",
          });
        }
      }
    }
    loadClubMetrics();
    return () => {
      mounted = false;
    };
  }, []);

  const clubStats = useMemo(
    () => [
      { label: "Valeur du club", value: clubMetrics.clubValueText || formatEuro(clubMetrics.clubValue) },
      { label: "Effectif", value: clubMetrics.squadCount === null ? "—" : `${clubMetrics.squadCount} joueurs` },
      { label: "Évolution du club", value: clubMetrics.evolutionText || "0 €" },
      { label: "Réputation", value: "Niv. 7" },
    ],
    [clubMetrics]
  );
  const gameWeekProgress = Math.min(100, Math.round((((gameWeekSummary.eligibleCount ?? 0) || 0) / 5) * 100));

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <View>
            <Text style={styles.screenTitle}>Accueil</Text>
            <Text style={styles.subtitle}>Bureau du président</Text>
          </View>
          <View style={styles.bellWrap}>
            <Ionicons name="notifications-outline" size={24} color="#FFFFFF" />
            <View style={styles.bellBadge}>
              <Text style={styles.bellBadgeText}>3</Text>
            </View>
          </View>
        </View>

        <LinearGradient colors={["#4A060E", "#13070A", "#07070A"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <View style={styles.heroGlow} />
          <View style={styles.heroTop}>
            <View>
              <Text style={styles.clubName}>RC Darkflow FC</Text>
              <Text style={styles.president}>Président : Darkflow</Text>
            </View>
            <View style={styles.presidentBadge}>
              <Ionicons name="shield-checkmark" size={15} color="#FFFFFF" />
              <Text style={styles.presidentBadgeText}>Président</Text>
            </View>
          </View>
          <View style={styles.statsGrid}>
            {clubStats.map((stat) => (
              <StatPill
                key={stat.label}
                {...stat}
                onPress={
                  stat.label === "Valeur du club"
                    ? () => router.push("/club-value")
                    : stat.label === "Évolution du club"
                      ? () => router.push("/club-evolution")
                      : undefined
                }
              />
            ))}
          </View>
        </LinearGradient>

        <SectionCard style={styles.briefingCard}>
          <SectionTitle icon="sparkles" title="Réunion du matin" action="Directeur Sportif IA" />
          <Text style={styles.briefHello}>Bonjour Président !</Text>
          <Text style={styles.briefSubtitle}>Rapport de votre Directeur Sportif IA</Text>
          <View style={styles.alertStack}>
            {MORNING_ALERTS.map((item) => (
              <AlertLine key={item.text} item={item} />
            ))}
          </View>
        </SectionCard>

        <View style={styles.twoCols}>
          <SectionCard style={styles.flexCard}>
            <SectionTitle icon="calendar" title="Prochaine Game Week" />
            <Text style={styles.bigMetric}>{gameWeekSummary.label}</Text>
            <Text style={styles.muted}>{gameWeekSummary.rarity} · {gameWeekSummary.state}</Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${gameWeekProgress}%` as any }]} />
            </View>
            <View style={styles.metricRow}>
              <View>
                <Text style={styles.scoutLabel}>Cartes éligibles</Text>
                <Text style={styles.scoreText}>{gameWeekSummary.eligibleCount === null ? "—" : gameWeekSummary.eligibleCount}</Text>
              </View>
              <View>
                <Text style={styles.scoutLabel}>Projection IA</Text>
                <Text style={styles.confidenceText}>{gameWeekSummary.projectionLabel}</Text>
              </View>
            </View>
            <Pressable style={({ pressed }) => [styles.redButton, pressed && styles.pressed]} onPress={() => router.push("/(tabs)/play")}>
              <Text style={styles.redButtonText}>Préparer ma compo</Text>
              <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
            </Pressable>
          </SectionCard>

          <SectionCard style={styles.flexCard}>
            <SectionTitle icon="briefcase" title="Rapport du Directeur Sportif" />
            <Text style={styles.bigMetric}>Ryan Cherki</Text>
            <Text style={styles.muted}>Recrue recommandée</Text>
            <View style={styles.scoutLine}>
              <Text style={styles.scoutLabel}>Prix actuel</Text>
              <Text style={styles.scoutValue}>14 €</Text>
            </View>
            <View style={styles.scoutLine}>
              <Text style={styles.scoutLabel}>Valeur estimée</Text>
              <Text style={styles.scoutValueGreen}>19 €</Text>
            </View>
            <View style={styles.decisionRow}>
              <Text style={styles.buyBadge}>Acheter</Text>
              <Pressable onPress={() => router.push("/(tabs)/market")} style={({ pressed }) => [styles.watchButton, pressed && styles.pressed]}>
                <Text style={styles.watchText}>Surveiller</Text>
              </Pressable>
            </View>
          </SectionCard>
        </View>

        <View style={styles.twoCols}>
          <SectionCard style={styles.flexCard}>
            <SectionTitle icon="newspaper" title="Actualités du club" />
            {NEWS.map((item) => (
              <View key={item} style={styles.newsLine}>
                <View style={styles.redDot} />
                <Text style={styles.newsText}>{item}</Text>
                <Ionicons name="chevron-forward" size={15} color="rgba(255,255,255,0.45)" />
              </View>
            ))}
          </SectionCard>

          <SectionCard style={styles.flexCard}>
            <SectionTitle icon="flag" title="Objectifs saison" />
            {GOALS.map((goal) => (
              <View key={goal.label} style={styles.goalLine}>
                <Ionicons name={goal.done ? "checkmark-circle" : "ellipse-outline"} size={18} color={goal.done ? "#2FE66B" : "rgba(255,255,255,0.38)"} />
                <Text style={styles.goalText}>{goal.label}</Text>
              </View>
            ))}
          </SectionCard>
        </View>

        <View style={styles.twoCols}>
          <SectionCard style={styles.flexCard}>
            <SectionTitle icon="trophy" title="Palmarès" />
            <View style={styles.trophyGrid}>
              <StatPill label="GW jouées" value="14" />
              <StatPill label="Podiums" value="3" />
              <StatPill label="Victoires" value="1" />
              <StatPill label="Record" value="392" />
            </View>
          </SectionCard>

          <SectionCard style={styles.flexCard}>
            <SectionTitle icon="barbell" title="Centre d'entraînement" />
            <View style={styles.trainingMain}>
              <Text style={styles.trainingScore}>68%</Text>
              <Text style={styles.muted}>Forme moyenne</Text>
            </View>
            <View style={styles.trainingRow}>
              <Text style={styles.good}>12 en forme</Text>
              <Text style={styles.neutral}>28 neutres</Text>
              <Text style={styles.bad}>11 en baisse</Text>
            </View>
          </SectionCard>
        </View>

        <SectionCard>
          <SectionTitle icon="diamond" title="Pépites détectées" action="Marché" />
          {GEMS.map((gem) => (
            <View key={gem.name} style={styles.gemLine}>
              <View style={styles.gemAvatar}>
                <Text style={styles.gemInitial}>{gem.name.charAt(0)}</Text>
              </View>
              <View style={styles.gemTextBlock}>
                <Text style={styles.gemName}>{gem.name}</Text>
                <Text style={styles.gemMeta}>{gem.meta}</Text>
              </View>
              <Ionicons name="analytics" size={20} color="#FF3148" />
            </View>
          ))}
        </SectionCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#030406",
  },
  content: {
    gap: 16,
    paddingBottom: 128,
    paddingHorizontal: 18,
    paddingTop: 8,
  },
  topBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  screenTitle: {
    color: "#FFFFFF",
    fontSize: 38,
    fontWeight: "900",
    letterSpacing: 0,
  },
  subtitle: {
    color: "rgba(255,255,255,0.68)",
    fontSize: 16,
    fontWeight: "700",
    marginTop: 2,
  },
  bellWrap: {
    alignItems: "center",
    height: 46,
    justifyContent: "center",
    width: 46,
  },
  bellBadge: {
    alignItems: "center",
    backgroundColor: "#FF213B",
    borderColor: "#FFFFFF",
    borderRadius: 10,
    borderWidth: 1,
    height: 20,
    justifyContent: "center",
    position: "absolute",
    right: 2,
    top: 2,
    width: 20,
  },
  bellBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "900",
  },
  hero: {
    borderColor: "rgba(255,49,72,0.55)",
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
    padding: 18,
  },
  heroGlow: {
    backgroundColor: "rgba(255,49,72,0.18)",
    borderRadius: 90,
    height: 140,
    position: "absolute",
    right: -36,
    top: -38,
    width: 140,
  },
  heroTop: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  clubName: {
    color: "#FFFFFF",
    fontSize: 27,
    fontWeight: "900",
  },
  president: {
    color: "rgba(255,255,255,0.70)",
    fontSize: 14,
    fontWeight: "800",
    marginTop: 4,
  },
  presidentBadge: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,49,72,0.20)",
    borderColor: "rgba(255,49,72,0.65)",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  presidentBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 18,
  },
  statPill: {
    backgroundColor: "rgba(255,255,255,0.055)",
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: 14,
    borderWidth: 1,
    flexGrow: 1,
    minWidth: 132,
    padding: 12,
  },
  statValue: {
    color: "#FFFFFF",
    fontSize: 19,
    fontWeight: "900",
  },
  statLabel: {
    color: "rgba(255,255,255,0.58)",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 3,
  },
  card: {
    backgroundColor: "rgba(9,11,15,0.94)",
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    shadowColor: "#FF3148",
    shadowOpacity: 0.16,
    shadowRadius: 16,
  },
  briefingCard: {
    borderColor: "rgba(255,49,72,0.45)",
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 9,
    flex: 1,
  },
  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },
  sectionAction: {
    color: "#FF3148",
    fontSize: 12,
    fontWeight: "900",
  },
  briefHello: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "900",
  },
  briefSubtitle: {
    color: "rgba(255,255,255,0.62)",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 2,
  },
  alertStack: {
    gap: 11,
    marginTop: 16,
  },
  alertLine: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  alertText: {
    color: "rgba(255,255,255,0.84)",
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 19,
  },
  twoCols: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
  },
  flexCard: {
    flex: 1,
    minWidth: 260,
  },
  bigMetric: {
    color: "#FFFFFF",
    fontSize: 21,
    fontWeight: "900",
  },
  muted: {
    color: "rgba(255,255,255,0.58)",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 4,
  },
  progressTrack: {
    backgroundColor: "rgba(255,255,255,0.09)",
    borderRadius: 99,
    height: 8,
    marginTop: 14,
    overflow: "hidden",
  },
  progressFill: {
    backgroundColor: "#FF3148",
    borderRadius: 99,
    height: "100%",
  },
  metricRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
  scoreText: {
    color: "#2FE66B",
    fontSize: 24,
    fontWeight: "900",
  },
  confidenceText: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
  },
  redButton: {
    alignItems: "center",
    backgroundColor: "#D9152C",
    borderRadius: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  redButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },
  scoutLine: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  scoutLabel: {
    color: "rgba(255,255,255,0.60)",
    fontSize: 13,
    fontWeight: "800",
  },
  scoutValue: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },
  scoutValueGreen: {
    color: "#2FE66B",
    fontSize: 14,
    fontWeight: "900",
  },
  decisionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  buyBadge: {
    backgroundColor: "rgba(47,230,107,0.16)",
    borderColor: "rgba(47,230,107,0.40)",
    borderRadius: 999,
    borderWidth: 1,
    color: "#2FE66B",
    flex: 1,
    fontSize: 13,
    fontWeight: "900",
    overflow: "hidden",
    paddingVertical: 9,
    textAlign: "center",
  },
  watchButton: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 999,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 9,
  },
  watchText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
    textAlign: "center",
  },
  newsLine: {
    alignItems: "center",
    borderBottomColor: "rgba(255,255,255,0.07)",
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 10,
    paddingVertical: 10,
  },
  redDot: {
    backgroundColor: "#FF3148",
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  newsText: {
    color: "rgba(255,255,255,0.84)",
    flex: 1,
    fontSize: 14,
    fontWeight: "800",
  },
  goalLine: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    paddingVertical: 8,
  },
  goalText: {
    color: "rgba(255,255,255,0.84)",
    flex: 1,
    fontSize: 14,
    fontWeight: "800",
  },
  trophyGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  trainingMain: {
    alignItems: "center",
    marginTop: 2,
  },
  trainingScore: {
    color: "#FFFFFF",
    fontSize: 42,
    fontWeight: "900",
  },
  trainingRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
    marginTop: 16,
  },
  good: {
    color: "#2FE66B",
    fontSize: 12,
    fontWeight: "900",
  },
  neutral: {
    color: "rgba(255,255,255,0.64)",
    fontSize: 12,
    fontWeight: "900",
  },
  bad: {
    color: "#FFB020",
    fontSize: 12,
    fontWeight: "900",
  },
  gemLine: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.035)",
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    marginTop: 10,
    padding: 10,
  },
  gemAvatar: {
    alignItems: "center",
    backgroundColor: "rgba(255,49,72,0.18)",
    borderColor: "rgba(255,49,72,0.45)",
    borderRadius: 12,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  gemInitial: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
  },
  gemTextBlock: {
    flex: 1,
  },
  gemName: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },
  gemMeta: {
    color: "rgba(255,255,255,0.58)",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 3,
  },
  pressed: {
    opacity: 0.78,
  },
});
