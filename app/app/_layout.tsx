import React from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

// XS_ROOT_STACK_EXPLICIT_V1: declare tabs + player route so /player/[slug] resolves
export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="player/[slug]" options={{ headerShown: true, title: "Joueur" }} />
        <Stack.Screen name="modal" options={{ presentation: "modal", headerShown: false }} />
      </Stack>
    </>
  );
}
