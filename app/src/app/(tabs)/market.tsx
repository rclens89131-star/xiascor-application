// XS_FRONT_RECRUTER_MARKET_SUMMARY_V1
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { scoutPlayer, scoutRecruter, type RecruiterCard, type RecruiterMarketSummary, type RecruiterPlayer, type RecruiterRow } from "../../scoutApi";

const BG = "#050505";
const PANEL = "#0c0c0c";
const PANEL_SOFT = "#121212";
const STROKE = "rgba(255,255,255,0.12)";
const TEXT = "#ffffff";
const MUTED = "rgba(255,255,255,0.62)";
const MUTED_SOFT = "rgba(255,255,255,0.42)";
const YELLOW = "#ffc400";
const GREEN = "#22c55e";

function formatEur(value?: number | null) {
  return typeof value === "number" && Number.isFinite(value) ? `€${value.toFixed(2)}` : "—";
}

function formatCount(value?: number | null) {
  return typeof value === "number" && Number.isFinite(value) ? String(value) : "—";
}

function rarityLine(summary?: RecruiterMarketSummary | null) {
  if (!summary) return "—";
  const parts = [
    ["Limited", summary.limitedCount],
    ["Rare", summary.rareCount],
    ["Super Rare", summary.superRareCount],
    ["Unique", summary.uniqueCount],
  ]
    .filter(([, count]) => typeof count === "number" && count > 0)
    .map(([label, count]) => `${label} ${count}`);
  return parts.length ? parts.join(" · ") : "—";
}

function cardPrice(card: RecruiterCard) {
  if (card.priceText && !card.priceText.toLowerCase().includes("indisponible")) return card.priceText;
  return formatEur(card.priceEur ?? card.price ?? card.minPriceEur ?? null);
}

function MarketMetric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text numberOfLines={1} adjustsFontSizeToFit style={styles.metricValue}>
        {value}
      </Text>
    </View>
  );
}

function MarketSummaryBlock({ summary }: { summary?: RecruiterMarketSummary | null }) {
  const bestCard = summary?.bestValueCard as RecruiterCard | null | undefined;
  if (!summary) {
    return (
      <View style={styles.summaryPanel}>
        <Text style={styles.sectionTitle}>Résumé marché</Text>
        <Text style={styles.emptyText}>Résumé marché indisponible</Text>
      </View>
    );
  }

  return (
    <View style={styles.summaryPanel}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Résumé marché</Text>
        <View style={styles.summaryBadge}>
          <Ionicons name="stats-chart-outline" size={14} color={YELLOW} />
          <Text style={styles.summaryBadgeText}>V1</Text>
        </View>
      </View>

      <View style={styles.metricsGrid}>
        <MarketMetric label="Cartes en vente" value={formatCount(summary.cardsOnSale)} />
        <MarketMetric label="Prix minimum" value={summary.cheapestPriceText || formatEur(summary.cheapestPriceEur)} />
        <MarketMetric label="Prix moyen" value={formatEur(summary.averagePriceEur)} />
        <MarketMetric label="Prix médian" value={formatEur(summary.medianPriceEur)} />
        <MarketMetric label="Vendeurs" value={formatCount(summary.sellerCount)} />
        <MarketMetric label="Best value" value={summary.bestValueScore == null ? "—" : String(summary.bestValueScore)} />
      </View>

      <View style={styles.summaryLine}>
        <Text style={styles.summaryLineLabel}>Raretés</Text>
        <Text style={styles.summaryLineValue}>{rarityLine(summary)}</Text>
      </View>

      <View style={styles.bestValueRow}>
        <Ionicons name="sparkles-outline" size={18} color={GREEN} />
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={styles.bestValueTitle}>
            {bestCard?.cardName || bestCard?.name || bestCard?.slug || "Meilleure opportunité indisponible"}
          </Text>
          <Text style={styles.bestValueMeta}>
            Score {summary.bestValueScore == null ? "—" : summary.bestValueScore} · {bestCard ? cardPrice(bestCard) : "—"}
          </Text>
        </View>
      </View>
    </View>
  );
}

function PlayerRow({ row, active, onPress }: { row: RecruiterRow; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.playerRow, active && styles.playerRowActive]}>
      <View style={styles.playerAvatar}>
        {row.pictureUrl || row.avatar ? (
          <Image source={{ uri: String(row.pictureUrl || row.avatar) }} style={styles.playerImage} />
        ) : (
          <Text style={styles.avatarInitial}>{(row.playerName || row.playerSlug || "?").slice(0, 1)}</Text>
        )}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={styles.playerName}>
          {row.playerName || row.playerSlug}
        </Text>
        <Text numberOfLines={1} style={styles.playerMeta}>
          {[row.clubName, row.leagueName, row.position].filter(Boolean).join(" · ") || "Joueur Sorare"}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={active ? YELLOW : MUTED_SOFT} />
    </Pressable>
  );
}

function CardRow({ card }: { card: RecruiterCard }) {
  return (
    <View style={styles.cardRow}>
      {card.pictureUrl ? <Image source={{ uri: card.pictureUrl }} style={styles.cardImage} /> : <View style={styles.cardImageFallback} />}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={styles.cardName}>
          {card.cardName || card.name || card.slug || "Carte"}
        </Text>
        <Text numberOfLines={1} style={styles.cardMeta}>
          {[card.rarity, card.season ?? card.seasonYear, card.serialNumber ? `#${card.serialNumber}` : null].filter(Boolean).join(" · ")}
        </Text>
        <Text numberOfLines={1} style={styles.cardSeller}>
          {card.sellerNickname || card.sellerSlug || "Vendeur indisponible"}
        </Text>
      </View>
      <View style={styles.cardPriceBox}>
        <Text numberOfLines={1} adjustsFontSizeToFit style={styles.cardPrice}>
          {cardPrice(card)}
        </Text>
        <Text style={styles.cardPower}>{card.power ? `PWR ${card.power}` : card.xp != null ? `${card.xp} XP` : ""}</Text>
      </View>
    </View>
  );
}

export default function MarketScreen() {
  const [query, setQuery] = useState("");
  const [players, setPlayers] = useState<RecruiterRow[]>([]);
  const [selected, setSelected] = useState<RecruiterRow | null>(null);
  const [player, setPlayer] = useState<RecruiterPlayer | null>(null);
  const [playersLoading, setPlayersLoading] = useState(true);
  const [cardsLoading, setCardsLoading] = useState(false);
  const [playersError, setPlayersError] = useState<string | null>(null);
  const [cardsError, setCardsError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const timer = setTimeout(async () => {
      try {
        setPlayersLoading(true);
        setPlayersError(null);
        const data = await scoutRecruter({ first: 40, q: query.trim() || undefined });
        if (!alive) return;
        const rows = Array.isArray(data.items) ? data.items : [];
        setPlayers(rows);
        setSelected((current) => (current && rows.some((row) => row.playerSlug === current.playerSlug) ? current : rows[0] ?? null));
      } catch (e) {
        if (!alive) return;
        setPlayersError(String(e instanceof Error ? e.message : e));
      } finally {
        if (alive) setPlayersLoading(false);
      }
    }, 180);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [query]);

  useEffect(() => {
    if (!selected?.playerSlug) {
      setPlayer(null);
      return;
    }
    let alive = true;
    setCardsLoading(true);
    setCardsError(null);
    scoutPlayer(selected.playerSlug, { first: 10 })
      .then((data) => {
        if (alive) setPlayer(data);
      })
      .catch((e) => {
        if (alive) setCardsError(String(e instanceof Error ? e.message : e));
      })
      .finally(() => {
        if (alive) setCardsLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [selected?.playerSlug]);

  const cards = useMemo(() => player?.cards ?? player?.offers ?? [], [player]);
  const title = player?.playerName || selected?.playerName || selected?.playerSlug || "Joueur";

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>Recruter</Text>
            <Text style={styles.title}>Marché joueur</Text>
          </View>
          {player?.cache?.hit ? (
            <View style={styles.cachePill}>
              <Ionicons name="flash-outline" size={14} color={GREEN} />
              <Text style={styles.cacheText}>Cache</Text>
            </View>
          ) : null}
        </View>

        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Rechercher un joueur"
          placeholderTextColor={MUTED_SOFT}
          style={styles.search}
        />

        {playersError ? <Text style={styles.errorText}>{playersError}</Text> : null}

        <View style={styles.layout}>
          <View style={styles.playersPanel}>
            {playersLoading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator color={YELLOW} />
              </View>
            ) : players.length ? (
              players.map((row) => (
                <PlayerRow
                  key={row.playerSlug}
                  row={row}
                  active={selected?.playerSlug === row.playerSlug}
                  onPress={() => setSelected(row)}
                />
              ))
            ) : (
              <Text style={styles.emptyText}>Aucun joueur trouvé</Text>
            )}
          </View>

          <View style={styles.detailPanel}>
            <View style={styles.detailHeader}>
              <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={styles.detailTitle}>
                  {title}
                </Text>
                <Text numberOfLines={1} style={styles.detailSubtitle}>
                  {selected?.clubName || player?.activeClub?.name || "Club indisponible"}
                </Text>
              </View>
            </View>

            {cardsLoading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator color={YELLOW} />
              </View>
            ) : cardsError ? (
              <Text style={styles.errorText}>{cardsError}</Text>
            ) : (
              <>
                <MarketSummaryBlock summary={player?.marketSummary} />
                <View style={styles.cardsList}>
                  <Text style={styles.sectionTitle}>Cartes disponibles</Text>
                  {cards.length ? cards.map((card, index) => <CardRow key={card.offerId || card.slug || String(index)} card={card} />) : <Text style={styles.emptyText}>Aucune carte en vente</Text>}
                </View>
              </>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BG,
  },
  page: {
    padding: 16,
    gap: 14,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  eyebrow: {
    color: YELLOW,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0,
    textTransform: "uppercase",
  },
  title: {
    color: TEXT,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "900",
    letterSpacing: 0,
  },
  cachePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.35)",
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  cacheText: {
    color: GREEN,
    fontSize: 12,
    fontWeight: "800",
  },
  search: {
    minHeight: 46,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: STROKE,
    backgroundColor: PANEL,
    color: TEXT,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  layout: {
    gap: 14,
  },
  playersPanel: {
    gap: 8,
  },
  playerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: STROKE,
    backgroundColor: PANEL,
    padding: 10,
  },
  playerRowActive: {
    borderColor: "rgba(255,196,0,0.55)",
    backgroundColor: "#151205",
  },
  playerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: PANEL_SOFT,
    overflow: "hidden",
  },
  playerImage: {
    width: 40,
    height: 40,
  },
  avatarInitial: {
    color: TEXT,
    fontSize: 16,
    fontWeight: "900",
  },
  playerName: {
    color: TEXT,
    fontSize: 15,
    fontWeight: "800",
  },
  playerMeta: {
    color: MUTED,
    fontSize: 12,
    marginTop: 2,
  },
  detailPanel: {
    gap: 12,
  },
  detailHeader: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: STROKE,
    backgroundColor: PANEL,
    padding: 14,
  },
  detailTitle: {
    color: TEXT,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "900",
  },
  detailSubtitle: {
    color: MUTED,
    fontSize: 13,
    marginTop: 3,
  },
  summaryPanel: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: STROKE,
    backgroundColor: PANEL,
    padding: 14,
    gap: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  sectionTitle: {
    color: TEXT,
    fontSize: 16,
    fontWeight: "900",
  },
  summaryBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  summaryBadgeText: {
    color: YELLOW,
    fontSize: 12,
    fontWeight: "800",
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  metric: {
    width: "31.8%",
    minWidth: 106,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: STROKE,
    backgroundColor: PANEL_SOFT,
    padding: 10,
  },
  metricLabel: {
    color: MUTED,
    fontSize: 11,
    fontWeight: "700",
  },
  metricValue: {
    color: TEXT,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "900",
    marginTop: 4,
  },
  summaryLine: {
    borderTopWidth: 1,
    borderTopColor: STROKE,
    paddingTop: 10,
  },
  summaryLineLabel: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "800",
  },
  summaryLineValue: {
    color: TEXT,
    fontSize: 13,
    marginTop: 4,
  },
  bestValueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 8,
    backgroundColor: "rgba(34,197,94,0.08)",
    padding: 10,
  },
  bestValueTitle: {
    color: TEXT,
    fontSize: 13,
    fontWeight: "800",
  },
  bestValueMeta: {
    color: MUTED,
    fontSize: 12,
    marginTop: 2,
  },
  cardsList: {
    gap: 8,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: STROKE,
    backgroundColor: PANEL,
    padding: 10,
  },
  cardImage: {
    width: 48,
    height: 66,
    borderRadius: 6,
    backgroundColor: PANEL_SOFT,
  },
  cardImageFallback: {
    width: 48,
    height: 66,
    borderRadius: 6,
    backgroundColor: PANEL_SOFT,
  },
  cardName: {
    color: TEXT,
    fontSize: 14,
    fontWeight: "800",
  },
  cardMeta: {
    color: MUTED,
    fontSize: 12,
    marginTop: 3,
  },
  cardSeller: {
    color: MUTED_SOFT,
    fontSize: 11,
    marginTop: 3,
  },
  cardPriceBox: {
    width: 76,
    alignItems: "flex-end",
  },
  cardPrice: {
    color: YELLOW,
    fontSize: 14,
    fontWeight: "900",
  },
  cardPower: {
    color: MUTED,
    fontSize: 10,
    marginTop: 4,
  },
  loadingBox: {
    minHeight: 110,
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: {
    color: "#ff7b7b",
    fontSize: 13,
  },
  emptyText: {
    color: MUTED,
    fontSize: 13,
  },
});
