import React, { useEffect, useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  SafeAreaView,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { theme } from "../../src/theme";
import { useGallery } from "../../src/hooks/useGallery";
import { CardListItem } from "../../src/components/CardListItem";
import { useAppStore } from "../../src/store/useAppStore";

export default function CardsScreen() {
  const identifier = useAppStore((s) => s.identifier);
  const setIdentifier = useAppStore((s) => s.setIdentifier);

  const { cards, loading, loadingMore, error, loadMore, reload } = useGallery({ identifier, first: 25 });

  const setGallery = useAppStore((s) => s.setGallery);
  const toggleSelected = useAppStore((s) => s.toggleSelected);
  const selected = useAppStore((s) => s.selected);

  useEffect(() => {
    setGallery(cards);
  }, [cards, setGallery]);

  const { width } = useWindowDimensions();

  // ✅ largeur exacte pour 2 colonnes
  const layout = useMemo(() => {
    const H_PADDING = 16;
    const GAP = 12;
    const itemWidth = Math.floor((width - H_PADDING * 2 - GAP) / 2);
    return { H_PADDING, GAP, itemWidth };
  }, [width]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={{ padding: 16, gap: 10 }}>
        <Text style={{ color: theme.text, fontSize: 22, fontWeight: "900" }}>Mes cartes</Text>

        <View style={{ flexDirection: "row", gap: 10 }}>
          <TextInput
            value={identifier}
            onChangeText={setIdentifier}
            placeholder="slug ou URL Sorare my-club"
            placeholderTextColor={theme.muted}
            autoCapitalize="none"
            style={{
              flex: 1,
              color: theme.text,
              backgroundColor: theme.panel,
              borderWidth: 1,
              borderColor: theme.stroke,
              borderRadius: 14,
              paddingHorizontal: 12,
              paddingVertical: 10,
            }}
          />
          <Pressable
            onPress={reload}
            style={{
              paddingHorizontal: 12,
              justifyContent: "center",
              borderRadius: 14,
              backgroundColor: "rgba(59,130,246,0.18)",
              borderWidth: 1,
              borderColor: "rgba(59,130,246,0.35)",
            }}
          >
            <Text style={{ color: theme.text, fontWeight: "900" }}>OK</Text>
          </Pressable>
        </View>

        {error ? (
          <Text style={{ color: theme.bad, fontWeight: "800" }}>Erreur: {error}</Text>
        ) : (
          <Text style={{ color: theme.muted }}>
            {cards.length} cartes (hors commons) • sélection Jouer: {selected.length}/5
          </Text>
        )}
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator />
          <Text style={{ color: theme.muted, marginTop: 8 }}>Chargement…</Text>
        </View>
      ) : (
        <FlatList
          key="grid2" // ✅ force FlatList à recalculer la grille
          data={cards}
          keyExtractor={(item: any) => String(item?.slug || item?.id)}
          numColumns={2}
          contentContainerStyle={{ paddingHorizontal: layout.H_PADDING, paddingBottom: 120 }}
          onEndReached={() => loadMore()}
          onEndReachedThreshold={0.6}
          renderItem={({ item, index }: any) => {
            const isLeft = index % 2 === 0;
            return (
              <View
                style={{
                  width: layout.itemWidth,
                  marginBottom: layout.GAP,
                  marginRight: isLeft ? layout.GAP : 0,
                }}
              >
                <CardListItem
                  card={item}
                  selected={selected.some((c) => c.slug === item.slug)}
                  onPress={() => toggleSelected(item)}
                />
              </View>
            );
          }}
          ListFooterComponent={
            loadingMore ? (
              <View style={{ paddingVertical: 16 }}>
                <ActivityIndicator />
              </View>
            ) : (
              <View style={{ height: 16 }} />
            )
          }
          ListEmptyComponent={
            <View style={{ padding: 16 }}>
              <Text style={{ color: theme.muted }}>
                Aucune carte. Vérifie le slug/URL et clique OK.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

