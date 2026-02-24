/* XS_TEXT_OUTSIDE_TEXT_SEP_FIX_V1 */
// XS_HOME_NEWS_V1
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Image, Linking, Pressable, SafeAreaView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { theme } from "../../src/theme";
import { CopilotFAB } from "../../src/components/CopilotFAB";
import { CopilotSheet } from "../../src/components/CopilotSheet";
import { fetchFootballNews, type NewsItem } from "../../src/news";

function timeAgo(ms: number) {
  const diff = Date.now() - ms;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "à l’instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  return `il y a ${days} j`;
}

export default function HomeScreen() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);

  const load = useCallback(async (forceRefresh: boolean) => {
    setError(null);
    forceRefresh ? setRefreshing(true) : setLoading(true);
    try {
      const res = await fetchFootballNews({ forceRefresh });
      setItems(res.items);
      setFromCache(res.fromCache);
    } catch (e: any) {
      setError(e?.message ?? "Impossible de charger les actualités.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load(false);
  }, [load]);

  const header = useMemo(() => {
    return (
      <View style={{ paddingHorizontal: 16, paddingTop: 6, paddingBottom: 10, gap: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Pressable
            onPress={() => router.push("/(tabs)/settings")}
            style={{
              width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center",
              backgroundColor: theme.panel, borderWidth: 1, borderColor: theme.stroke,
            }}
            accessibilityLabel="Ouvrir paramètres"
          >
            <Ionicons name="settings-outline" size={20} color={theme.text} />
          </Pressable>

          <Text style={{ color: theme.text, fontSize: 18, fontWeight: "900" }}>Actualités Football</Text>

          <Pressable
            onPress={() => { /* futur: notifications */ }}
            style={{
              width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center",
              backgroundColor: theme.panel, borderWidth: 1, borderColor: theme.stroke, opacity: 0.9,
            }}
            accessibilityLabel="Notifications"
          >
            <Ionicons name="notifications-outline" size={20} color={theme.text} />
          </Pressable>
        </View>

        <Text style={{ color: theme.muted, fontSize: 12 }}>
          Foot uniquement • toutes ligues • cache 15 min • {fromCache ? "affichage depuis cache" : "live"}
        </Text>

        {error ? (
          <View style={{ backgroundColor: theme.panel, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: theme.stroke }}>
            <Text style={{ color: theme.bad, fontWeight: "800" }}>Erreur</Text>
            <Text style={{ color: theme.muted, marginTop: 4 }}>{error}</Text>
            <Pressable
              onPress={() => load(true)}
              style={{
                marginTop: 10, alignSelf: "flex-start",
                backgroundColor: theme.panel2, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8,
                borderWidth: 1, borderColor: theme.stroke,
              }}
            >
              <Text style={{ color: theme.text, fontWeight: "800" }}>Réessayer</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    );
  }, [error, fromCache, load]);

  const renderItem = ({ item }: { item: NewsItem }) => (
    <Pressable
      onPress={() => item.url && Linking.openURL(item.url)}
      style={{
        backgroundColor: theme.panel,
        borderRadius: 16,
        padding: 12,
        borderWidth: 1,
        borderColor: theme.stroke,
        flexDirection: "row",
        gap: 12,
      }}
    >
      <View style={{ flex: 1, gap: 6 }}>
        <Text style={{ color: theme.text, fontSize: 14, fontWeight: "800" }} numberOfLines={3}>
          {item.title}
        </Text>
        <Text style={{ color: theme.muted, fontSize: 12 }} numberOfLines={1}>
          {item.source}<Text>{" • "}</Text>{timeAgo(item.publishedAt)}
        </Text>
        {item.excerpt ? (
          <Text style={{ color: theme.muted, fontSize: 12 }} numberOfLines={2}>
            {item.excerpt}
          </Text>
        ) : null}
      </View>

      {item.imageUrl ? (
        <Image
          source={{ uri: item.imageUrl }}
          style={{ width: 96, height: 72, borderRadius: 12, backgroundColor: theme.panel2 }}
        />
      ) : null}
    </Pressable>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <FlatList
        data={items}
        keyExtractor={(x) => x.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 12, paddingBottom: 120 }}
        ListHeaderComponent={header}
        refreshing={refreshing}
        onRefresh={() => load(true)}
        ListEmptyComponent={
          loading ? (
            <View style={{ paddingVertical: 18 }}>
              <ActivityIndicator />
            </View>
          ) : !error ? (
            <View style={{ paddingVertical: 18 }}>
              <Text style={{ color: theme.muted }}>Aucune actualité pour le moment.</Text>
            </View>
          ) : null
        }
      />

      <CopilotSheet />
      <CopilotFAB />
    </SafeAreaView>
  );
}

