/* XS_HOME_FEED_V2_PREMIUM_STABLE */
import React, { useMemo, useState } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { CopilotFAB } from "../../src/components/CopilotFAB";
import { CopilotSheet } from "../../src/components/CopilotSheet";
import { FeedCard, type FeedCategory, type FeedItem } from "../../src/components/FeedCard";
import { theme } from "../../src/theme";

const MARKER = "XS_HOME_FEED_V2_PREMIUM_STABLE";
const FILTERS: FeedCategory[] = ["Tout", "Ligue 1", "MLS", "Blessures", "Trending"];

const TRENDS = [
  "PSG : rotation offensive surveillée avant le week-end",
  "MLS : plusieurs titulaires incertains après le voyage",
  "Ligue 1 : les gardiens bonus attirent les managers",
];

const FEED_DATA: FeedItem[] = [
  {
    id: "1",
    title: "Bayern - PSG : énorme pression",
    image: "https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=1200&q=80",
    source: "RMC Sport",
    time: "30 min",
    impact: "PSG offensif → boost attaquants",
    severity: "Élevé",
    l5: 72,
    l15: 65,
    category: "Trending",
  },
  {
    id: "2",
    title: "Marseille prépare un onze très offensif",
    image: "https://images.unsplash.com/photo-1517466787929-bc90951d0974?auto=format&fit=crop&w=1200&q=80",
    source: "L'Équipe",
    time: "1 h",
    impact: "Ailiers titulaires → potentiel décisif en hausse",
    severity: "Moyen",
    l5: 68,
    l15: 61,
    category: "Ligue 1",
  },
  {
    id: "3",
    title: "Los Angeles : le latéral droit reste incertain",
    image: "https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?auto=format&fit=crop&w=1200&q=80",
    source: "MLS Soccer",
    time: "2 h",
    impact: "Joueur incertain → risque DNP",
    severity: "Critique",
    l5: 49,
    l15: 54,
    category: "MLS",
  },
  {
    id: "4",
    title: "Blessure musculaire confirmée pour un milieu clé",
    image: "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=1200&q=80",
    source: "Foot Mercato",
    time: "3 h",
    impact: "Absence probable → minutes redistribuées au remplaçant",
    severity: "Élevé",
    category: "Blessures",
  },
  {
    id: "5",
    title: "Nantes : le gardien monte dans les projections",
    image: "https://images.unsplash.com/photo-1540379708242-14a809bef941?auto=format&fit=crop&w=1200&q=80",
    source: "Data XI",
    time: "4 h",
    impact: "Matchup favorable → clean sheet bonus à surveiller",
    severity: "Faible",
    l5: 63,
    l15: 58,
    category: "Ligue 1",
  },
];

export default function HomeScreen() {
  const [activeFilter, setActiveFilter] = useState<FeedCategory>("Tout");
  const [usefulIds, setUsefulIds] = useState<string[]>([]);
  const [watchlistIds, setWatchlistIds] = useState<string[]>([]);
  const [followedIds, setFollowedIds] = useState<string[]>([]);

  const feedItems = useMemo(() => {
    if (activeFilter === "Tout") return FEED_DATA;
    return FEED_DATA.filter((item) => item.category === activeFilter);
  }, [activeFilter]);

  const toggleId = (ids: string[], id: string) => (ids.includes(id) ? ids.filter((itemId) => itemId !== id) : [...ids, id]);

  const handleCardPress = (item: FeedItem) => {
    console.log(`[${MARKER}] open card placeholder`, item.id);
  };

  const header = (
    <View style={styles.header}>
      <View style={styles.topBar}>
        <Pressable
          accessibilityLabel="Ouvrir paramètres"
          accessibilityRole="button"
          onPress={() => router.push("/(tabs)/settings")}
          style={({ pressed }) => [styles.iconButton, pressed ? styles.pressed : null]}
        >
          <Ionicons name="settings-outline" size={20} color={theme.text} />
        </Pressable>

        <View style={styles.titleBlock}>
          <Text style={styles.screenTitle}>Accueil</Text>
        </View>

        <Pressable
          accessibilityLabel="Notifications"
          accessibilityRole="button"
          onPress={() => console.log(`[${MARKER}] notifications placeholder`)}
          style={({ pressed }) => [styles.iconButton, pressed ? styles.pressed : null]}
        >
          <Ionicons name="notifications-outline" size={20} color={theme.text} />
        </Pressable>
      </View>

      <View style={styles.trendsBox}>
        <View style={styles.trendsHeader}>
          <Text style={styles.trendsTitle}>🔥 Tendances aujourd'hui</Text>
          <Text style={styles.trendsBadge}>Live mock</Text>
        </View>
        {TRENDS.map((trend) => (
          <View key={trend} style={styles.trendRow}>
            <View style={styles.trendDot} />
            <Text style={styles.trendText} numberOfLines={2}>
              {trend}
            </Text>
          </View>
        ))}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
        {FILTERS.map((filter) => {
          const active = activeFilter === filter;

          return (
            <Pressable
              accessibilityLabel={`Filtrer le feed par ${filter}`}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              key={filter}
              onPress={() => {
                console.log(`[${MARKER}] filter`, filter);
                setActiveFilter(filter);
              }}
              style={({ pressed }) => [
                styles.filterButton,
                active ? styles.filterButtonActive : null,
                pressed ? styles.pressed : null,
              ]}
            >
              <Text style={[styles.filterText, active ? styles.filterTextActive : null]}>{filter}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.screen}>
      <FlatList
        contentContainerStyle={styles.feedContent}
        data={feedItems}
        extraData={[activeFilter, usefulIds, watchlistIds, followedIds]}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <View style={styles.contentShell}>
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>Aucun signal Sorare pour le moment.</Text>
              <Text style={styles.emptyText}>Le feed reste disponible dès que de nouvelles données sont ajoutées.</Text>
            </View>
          </View>
        }
        ListHeaderComponent={<View style={styles.contentShell}>{header}</View>}
        renderItem={({ item }) => (
          <View style={styles.contentShell}>
            <FeedCard
              followed={followedIds.includes(item.id)}
              item={item}
              onFollow={() => {
                console.log(`[${MARKER}] follow`, item.id);
                setFollowedIds((ids) => toggleId(ids, item.id));
              }}
              onPress={() => handleCardPress(item)}
              onUseful={() => {
                console.log(`[${MARKER}] useful`, item.id);
                setUsefulIds((ids) => toggleId(ids, item.id));
              }}
              onWatchlist={() => {
                console.log(`[${MARKER}] watchlist`, item.id);
                setWatchlistIds((ids) => toggleId(ids, item.id));
              }}
              useful={usefulIds.includes(item.id)}
              watched={watchlistIds.includes(item.id)}
            />
          </View>
        )}
        showsVerticalScrollIndicator={false}
      />

      <CopilotSheet />
      <CopilotFAB />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: "#070B13",
    flex: 1,
  },
  feedContent: {
    alignItems: "center",
    paddingBottom: 128,
    paddingHorizontal: 14,
  },
  contentShell: {
    alignSelf: "center",
    maxWidth: 560,
    width: "100%",
  },
  header: {
    gap: 14,
    paddingBottom: 16,
    paddingTop: 6,
  },
  topBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  iconButton: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderColor: "rgba(255, 255, 255, 0.10)",
    borderRadius: 14,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  titleBlock: {
    alignItems: "center",
    flex: 1,
  },
  screenTitle: {
    color: theme.text,
    fontSize: 24,
    fontWeight: "900",
  },
  trendsBox: {
    backgroundColor: "#101827",
    borderColor: "rgba(255, 255, 255, 0.10)",
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
    padding: 12,
  },
  trendsHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  trendsTitle: {
    color: theme.text,
    flex: 1,
    fontSize: 15,
    fontWeight: "900",
  },
  trendsBadge: {
    backgroundColor: "rgba(34, 197, 94, 0.13)",
    borderColor: "rgba(34, 197, 94, 0.30)",
    borderRadius: 999,
    borderWidth: 1,
    color: "#BBF7D0",
    fontSize: 11,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  trendRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  trendDot: {
    backgroundColor: theme.warn,
    borderRadius: 4,
    height: 7,
    width: 7,
  },
  trendText: {
    color: theme.muted,
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },
  filters: {
    gap: 8,
    paddingRight: 16,
  },
  filterButton: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderColor: "rgba(255, 255, 255, 0.10)",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 15,
    paddingVertical: 9,
  },
  filterButtonActive: {
    backgroundColor: theme.accent,
    borderColor: "rgba(147, 197, 253, 0.85)",
  },
  filterText: {
    color: theme.muted,
    fontSize: 13,
    fontWeight: "900",
  },
  filterTextActive: {
    color: "#FFFFFF",
  },
  separator: {
    height: 14,
  },
  emptyState: {
    alignItems: "center",
    backgroundColor: "#101827",
    borderColor: "rgba(255, 255, 255, 0.10)",
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 4,
    padding: 18,
  },
  emptyTitle: {
    color: theme.text,
    fontSize: 15,
    fontWeight: "900",
    textAlign: "center",
  },
  emptyText: {
    color: theme.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
    textAlign: "center",
  },
  pressed: {
    opacity: 0.78,
  },
});
