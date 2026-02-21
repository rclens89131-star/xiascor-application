import React from "react";
import { SafeAreaView, Text, View, TouchableOpacity } from "react-native";
import { usePathname, useSegments, router } from "expo-router";

// XS_NOT_FOUND_DEBUG_V1: show which path Expo Router tried to open
export default function NotFoundScreen() {
  const pathname = usePathname();
  const segments = useSegments();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0d1117", padding: 16 }}>
      <Text style={{ color: "#fff", fontSize: 22, fontWeight: "800", marginBottom: 10 }}>
        Route introuvable
      </Text>

      <View style={{ backgroundColor: "#161b22", borderRadius: 12, padding: 12, marginBottom: 12 }}>
        <Text style={{ color: "#9ba1a6", marginBottom: 6 }}>pathname</Text>
        <Text style={{ color: "#58a6ff" }}>{String(pathname)}</Text>
      </View>

      <View style={{ backgroundColor: "#161b22", borderRadius: 12, padding: 12, marginBottom: 20 }}>
        <Text style={{ color: "#9ba1a6", marginBottom: 6 }}>segments</Text>
        <Text style={{ color: "#58a6ff" }}>{JSON.stringify(segments)}</Text>
      </View>

      <TouchableOpacity
        onPress={() => router.replace("/(tabs)/market")}
        style={{ backgroundColor: "#238636", padding: 12, borderRadius: 12 }}
      >
        <Text style={{ color: "#fff", fontWeight: "800", textAlign: "center" }}>Retour Recruter</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => router.replace("/")}
        style={{ marginTop: 10, backgroundColor: "#30363d", padding: 12, borderRadius: 12 }}
      >
        <Text style={{ color: "#fff", fontWeight: "800", textAlign: "center" }}>Accueil</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
