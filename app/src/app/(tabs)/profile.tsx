import React from "react";
import { Text, View } from "react-native";

export default function ProfileScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: "#050505", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <Text style={{ color: "#ffffff", fontSize: 24, fontWeight: "800" }}>Profil</Text>
    </View>
  );
}
