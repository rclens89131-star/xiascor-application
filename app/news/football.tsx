/* XS_FOOTBALL_NEWS_FEED_V1 */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { API_BASE_URL } from "../../src/config/env";

type FootballNewsItem = {
  id: string;
  title: string;
  source?: string | null;
  url?: string | null;
  googleUrl?: string | null;
  publishedAt?: string | null;
  summary?: string | null;
  imageUrl?: string | null;
};

type FootballNewsPayload = {
  ok?: boolean;
  cached?: boolean;
  updatedAt?: string | null;
  ttlHours?: number;
  error?: string | null;
  items?: FootballNewsItem[];
};

const PAGE_SIZE = 10;

function formatNewsDate(value?: string | null): string {
  if (!value) return "Date indisponible";
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return "Date indisponible";
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function shortText(value?: string | null): string {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) return "Résumé indisponible.";
  return text.length > 190 ? `${text.slice(0, 187).trim()}...` : text;
}

export default function FootballNewsScreen() {
  const [items, setItems] = useState<FootballNewsItem[]>([]);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [cached, setCached] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const visibleItems = useMemo(() => items.slice(0, visibleCount), [items, visibleCount]);
  const canLoadMore = visibleCount < items.length;

  const fetchNews = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    if (mode === "refresh") setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/news/football`);
      const payload: FootballNewsPayload = await response.json().catch(() => ({}));
      if (!response.ok || payload.ok === false) {
        throw new Error(payload.error || `news_http_${response.status}`);
      }
      const nextItems = Array.isArray(payload.items) ? payload.items : [];
      setItems(nextItems);
      setVisibleCount(PAGE_SIZE);
      setUpdatedAt(payload.updatedAt || null);
      setCached(Boolean(payload.cached));
      if (payload.error && !nextItems.length) setError(payload.error);
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchNews("initial");
  }, [fetchNews]);

  const openArticle = useCallback(async (item: FootballNewsItem) => {
    const url = String(item.googleUrl || item.url || "").trim();
    if (!url) return;
    try {
      await Linking.openURL(url);
    } catch {
      setError("Impossible d'ouvrir l'article pour le moment.");
    }
  }, []);

  const loadMore = useCallback(() => {
    if (!canLoadMore) return;
    setVisibleCount((current) => Math.min(current + PAGE_SIZE, items.length));
  }, [canLoadMore, items.length]);

  const renderItem = useCallback(({ item }: { item: FootballNewsItem }) => (
    <Pressable
      accessibilityRole="button"
      onPress={() => openArticle(item)}
      style={({ pressed }) => [styles.articleCard, pressed && styles.pressed]}
    >
      <View style={styles.articleMetaRow}>
        <View style={styles.sourcePill}>
          <Text style={styles.sourceText}>{item.source || "Football"}</Text>
        </View>
        <Text style={styles.dateText}>{formatNewsDate(item.publishedAt)}</Text>
      </View>
      <Text style={styles.articleTitle}>{item.title || "Actualité football"}</Text>
      <Text style={styles.articleSummary}>{shortText(item.summary)}</Text>
      <View style={styles.readRow}>
        <Text style={styles.readText}>Lire l'article</Text>
        <Ionicons name="open-outline" size={16} color="#FF3148" />
      </View>
    </Pressable>
  ), [openArticle]);

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.screen}>
      <FlatList
        data={visibleItems}
        keyExtractor={(item, index) => item.id || `${item.title}-${index}`}
        renderItem={renderItem}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        onEndReached={loadMore}
        onEndReachedThreshold={0.45}
        refreshControl={
          <RefreshControl
            tintColor="#FF3148"
            refreshing={refreshing}
            onRefresh={() => fetchNews("refresh")}
          />
        }
        ListHeaderComponent={
          <View style={styles.headerWrap}>
            <View style={styles.topBar}>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.back()}
                style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
              >
                <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
              </Pressable>
              <View style={styles.headerTextBlock}>
                <Text style={styles.title}>Actualités Foot</Text>
                <Text style={styles.subtitle}>Les dernières news football</Text>
              </View>
            </View>
            <LinearGradient
              colors={["rgba(255,49,72,0.28)", "rgba(20,7,10,0.94)", "rgba(5,5,7,1)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.statusCard}
            >
              <Ionicons name="newspaper-outline" size={24} color="#FFFFFF" />
              <View style={styles.statusTextBlock}>
                <Text style={styles.statusTitle}>{items.length ? `${items.length} articles chargés` : "Fil actualités"}</Text>
                <Text style={styles.statusMeta}>
                  {updatedAt ? `Mis à jour ${formatNewsDate(updatedAt)}` : "Mise à jour toutes les 24h"}
                  {cached ? " · cache 24h" : ""}
                </Text>
              </View>
            </LinearGradient>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color="#FF3148" />
              <Text style={styles.loadingText}>Chargement des actualités...</Text>
            </View>
          ) : (
            <View style={styles.emptyBox}>
              <Ionicons name="newspaper-outline" size={28} color="rgba(255,255,255,0.55)" />
              <Text style={styles.emptyTitle}>Aucune actualité disponible</Text>
              <Text style={styles.emptyText}>Le fil réessaiera au prochain rafraîchissement.</Text>
            </View>
          )
        }
        ListFooterComponent={
          items.length ? (
            <View style={styles.footerBox}>
              {canLoadMore ? (
                <Text style={styles.footerText}>Chargement progressif...</Text>
              ) : (
                <Text style={styles.footerText}>Fin du fil</Text>
              )}
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#030406",
  },
  content: {
    gap: 14,
    paddingBottom: 42,
    paddingHorizontal: 18,
    paddingTop: 8,
  },
  headerWrap: {
    gap: 14,
  },
  topBar: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  backButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderColor: "rgba(255,255,255,0.14)",
    borderRadius: 18,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  headerTextBlock: {
    flex: 1,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 34,
    fontWeight: "900",
  },
  subtitle: {
    color: "rgba(255,255,255,0.66)",
    fontSize: 15,
    fontWeight: "700",
    marginTop: 2,
  },
  statusCard: {
    alignItems: "center",
    borderColor: "rgba(255,49,72,0.42)",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    overflow: "hidden",
    padding: 16,
  },
  statusTextBlock: {
    flex: 1,
  },
  statusTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },
  statusMeta: {
    color: "rgba(255,255,255,0.62)",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 3,
  },
  articleCard: {
    backgroundColor: "rgba(12,14,18,0.96)",
    borderColor: "rgba(255,49,72,0.28)",
    borderRadius: 18,
    borderWidth: 1,
    gap: 10,
    padding: 16,
  },
  articleMetaRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  sourcePill: {
    backgroundColor: "rgba(255,49,72,0.16)",
    borderColor: "rgba(255,49,72,0.32)",
    borderRadius: 999,
    borderWidth: 1,
    maxWidth: "62%",
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  sourceText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "900",
  },
  dateText: {
    color: "rgba(255,255,255,0.52)",
    fontSize: 11,
    fontWeight: "800",
  },
  articleTitle: {
    color: "#FFFFFF",
    fontSize: 19,
    fontWeight: "900",
    lineHeight: 24,
  },
  articleSummary: {
    color: "rgba(255,255,255,0.70)",
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },
  readRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    marginTop: 2,
  },
  readText: {
    color: "#FF3148",
    fontSize: 13,
    fontWeight: "900",
  },
  loadingBox: {
    alignItems: "center",
    gap: 12,
    paddingVertical: 54,
  },
  loadingText: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 14,
    fontWeight: "800",
  },
  emptyBox: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 18,
    borderWidth: 1,
    gap: 8,
    padding: 24,
  },
  emptyTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },
  emptyText: {
    color: "rgba(255,255,255,0.58)",
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },
  errorText: {
    color: "#FFB4BE",
    fontSize: 12,
    fontWeight: "800",
  },
  footerBox: {
    alignItems: "center",
    paddingVertical: 14,
  },
  footerText: {
    color: "rgba(255,255,255,0.48)",
    fontSize: 12,
    fontWeight: "800",
  },
  pressed: {
    opacity: 0.76,
    transform: [{ scale: 0.99 }],
  },
});
