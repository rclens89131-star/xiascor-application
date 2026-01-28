import React from "react";
import { Pressable, Text } from "react-native";
import { theme } from "../theme";
import { useAppStore } from "../store/useAppStore";

export function CopilotFAB() {
  const setOpen = useAppStore((s) => s.setCopilotOpen);
  return (
    <Pressable
      onPress={() => setOpen(true)}
      style={{
        position: "absolute",
        right: 16,
        bottom: 20,
        backgroundColor: theme.accent,
        borderRadius: 999,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.18)",
      }}
    >
      <Text style={{ color: theme.text, fontWeight: "900" }}>Copilot</Text>
    </Pressable>
  );
}
