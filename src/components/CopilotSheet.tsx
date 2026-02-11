import React, { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { theme } from "../theme";
import { apiFetch } from "../api";
import { useAppStore } from "../store/useAppStore";

type CopilotAction =
  | { type: "CREATE_LINEUP"; payload: { name: string; mode: "classic" | "cap" | "custom"; cardSlugs: string[] } }
  | { type: "TAG_CARD"; payload: { cardSlug: string; tag: "A_VENDRE" | "A_GARDER" | "A_UPGRADE" | "DOUBLON" } }
  | { type: "WATCHLIST_ADD"; payload: { kind: "card" | "player"; idOrSlug: string } }
  | { type: "ALERT_CREATE"; payload: { kind: "price" | "minutes"; target: string; rule: string } }
  | { type: "COMPARE_CARDS"; payload: { cardSlugs: string[] } };

export function CopilotSheet() {
  const open = useAppStore((s) => s.copilotOpen);
  const setOpen = useAppStore((s) => s.setCopilotOpen);
  const messages = useAppStore((s) => s.copilotMessages);
  const push = useAppStore((s) => s.pushCopilot);

  const identifier = useAppStore((s) => s.identifier);
  const gallery = useAppStore((s) => s.gallery);
  const selected = useAppStore((s) => s.selected);

  const setTagLocal = useAppStore((s) => s.setTag);
  const addWatchLocal = useAppStore((s) => s.addWatch);

  const [input, setInput] = useState("");

  const context = useMemo(
    () => ({
      identifier,
      galleryCount: gallery.length,
      selectedCount: selected.length,
      selectedSlugs: selected.map((c) => c.slug),
    }),
    [identifier, gallery.length, selected]
  );

  async function runAction(a: CopilotAction) {
    try {
      if (a.type === "CREATE_LINEUP") {
        await apiFetch("/lineups", { method: "POST", body: JSON.stringify(a.payload) });
        push({ role: "assistant", text: `✅ Lineup sauvegardee: ${a.payload.name}` });
        return;
      }
      if (a.type === "TAG_CARD") {
        setTagLocal(a.payload.cardSlug, a.payload.tag);
        await apiFetch("/tags", { method: "POST", body: JSON.stringify(a.payload) });
        push({ role: "assistant", text: `🏷️ Tag applique: ${a.payload.tag}` });
        return;
      }
      if (a.type === "WATCHLIST_ADD") {
        addWatchLocal(a.payload);
        await apiFetch("/watchlist", { method: "POST", body: JSON.stringify(a.payload) });
        push({ role: "assistant", text: `👀 Ajoute a la watchlist: ${a.payload.idOrSlug}` });
        return;
      }
      if (a.type === "ALERT_CREATE") {
        await apiFetch("/alerts", { method: "POST", body: JSON.stringify(a.payload) });
        push({ role: "assistant", text: `⏰ Alerte creee: ${a.payload.rule}` });
        return;
      }
      if (a.type === "COMPARE_CARDS") {
        push({ role: "assistant", text: `🔎 Comparaison: ${a.payload.cardSlugs.join(", ") || "(vide)"}` });
        return;
      }
    } catch (e: any) {
      push({ role: "assistant", text: `❌ Action echouee: ${e?.message ?? "Erreur"}` });
    }
  }

  async function send() {
    const q = input.trim();
    if (!q) return;
    setInput("");
    push({ role: "user", text: q });

    const low = q.toLowerCase();

    if (low.includes("meilleure compo") || low.includes("compo")) {
      const slugs = selected.map((c) => c.slug).slice(0, 5);
      const actions: CopilotAction[] = [
        { type: "CREATE_LINEUP", payload: { name: "GW - suggestion", mode: "classic", cardSlugs: slugs } },
      ];
      push({
        role: "assistant",
        text:
          "V1: suggestion basee sur ta selection actuelle. V2: on branchera minutes/forme/calendrier/prix indexes.",
        actions,
      });
      return;
    }

    if (low.includes("tag") && low.includes("vendre") && selected[0]) {
      push({
        role: "assistant",
        text: "OK. Je tag la premiere carte selectionnee en A_VENDRE.",
        actions: [{ type: "TAG_CARD", payload: { cardSlug: selected[0].slug, tag: "A_VENDRE" } }],
      });
      return;
    }

    push({
      role: "assistant",
      text:
        "Dis moi: “meilleure compo”, “tag a vendre”, “ajoute watchlist”.\n" +
        `Contexte: ${JSON.stringify(context)}`,
    });
  }

  return (
    <Modal visible={open} animationType="slide" transparent>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.55)" }}>
        <Pressable style={{ flex: 1 }} onPress={() => setOpen(false)} />
        <View style={{ backgroundColor: theme.bg, borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 14 }}>
          <Text style={{ color: theme.text, fontSize: 16, fontWeight: "800", marginBottom: 10 }}>Copilot</Text>

          <ScrollView style={{ maxHeight: 420 }} contentContainerStyle={{ gap: 10, paddingBottom: 8 }}>
            {messages.map((m, idx) => (
              <View
                key={idx}
                style={{
                  alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                  maxWidth: "92%",
                  backgroundColor: m.role === "user" ? theme.panel2 : theme.panel,
                  borderRadius: 14,
                  padding: 10,
                  borderWidth: 1,
                  borderColor: theme.stroke,
                }}
              >
                <Text style={{ color: theme.text, fontSize: 13, lineHeight: 18 }}>{m.text}</Text>

                {!!m.actions?.length && (
                  <View style={{ marginTop: 10, gap: 8 }}>
                    {m.actions.map((a, i) => (
                      <Pressable
                        key={i}
                        onPress={() => runAction(a as any)}
                        style={{
                          paddingVertical: 10,
                          paddingHorizontal: 12,
                          borderRadius: 12,
                          backgroundColor: "rgba(59,130,246,0.18)",
                          borderWidth: 1,
                          borderColor: "rgba(59,130,246,0.35)",
                        }}
                      >
                        <Text style={{ color: theme.text, fontWeight: "800" }}>
                          {a.type === "CREATE_LINEUP" ? "Creer compo" : null}
                          {a.type === "TAG_CARD" ? "Tagger" : null}
                          {a.type === "WATCHLIST_ADD" ? "Ajouter watchlist" : null}
                          {a.type === "ALERT_CREATE" ? "Creer alerte" : null}
                          {a.type === "COMPARE_CARDS" ? "Comparer 3 cartes" : null}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </ScrollView>

          <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Ex: meilleure compo / tag a vendre / ajoute watchlist"
              placeholderTextColor={theme.muted}
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
              onPress={send}
              style={{
                paddingHorizontal: 14,
                justifyContent: "center",
                borderRadius: 14,
                backgroundColor: theme.accent,
              }}
            >
              <Text style={{ color: theme.text, fontWeight: "900" }}>Envoyer</Text>
            </Pressable>
          </View>

          <Text style={{ color: theme.muted, fontSize: 11, marginTop: 10 }}>
            Aide a la decision uniquement. Pas de promesse.
          </Text>
        </View>
      </View>
    </Modal>
  );
}
