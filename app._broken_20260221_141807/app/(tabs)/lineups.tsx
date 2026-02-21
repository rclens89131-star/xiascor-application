import React, { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, SafeAreaView, Text, View } from "react-native";
import { theme } from "../../src/theme";
import { listLineups } from "../../src/apiLineups";
import type { Lineup } from "../../src/types";

export default function LineupsScreen() {
  const [items, setItems] = useState<Lineup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const r = await listLineups();
      setItems(r.items || []);
    } catch (e: any) {
      setError(e?.message ?? "Erreur");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={{ padding: 16, gap: 10 }}>
        <Text style={{ color: theme.text, fontSize: 22, fontWeight: "900" }}>Historique</Text>
        <Text style={{ color: theme.muted }}>Lineups sauvegardées (backend).</Text>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator />
          <Text style={{ color: theme.muted, marginTop: 8 }}>Chargement…</Text>
        </View>
      ) : error ? (
        <View style={{ padding: 16 }}>
          <Text style={{ color: theme.bad, fontWeight: "800" }}>Erreur: {error}</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(x) => x.id}
          contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 120 }}
          renderItem={({ item }) => (
            <View style={{ backgroundColor: theme.panel, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: theme.stroke }}>
              <Text style={{ color: theme.text, fontWeight: "900" }}>{item.name}</Text>
              <Text style={{ color: theme.muted, marginTop: 6 }}>Mode: {item.mode} • GW: {item.gw ?? "—"}</Text>
              <Text style={{ color: theme.muted, marginTop: 6 }}>Cartes: {item.cardSlugs.join(", ")}</Text>
              <Text style={{ color: theme.muted, marginTop: 6 }}>Créé: {item.createdAt}</Text>
            </View>
          )}
          ListEmptyComponent={
            <View style={{ padding: 16 }}>
              <Text style={{ color: theme.muted }}>Aucune lineup sauvegardée pour l’instant.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
