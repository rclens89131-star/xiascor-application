import React, { useMemo, useState } from "react";
import { FlatList, Pressable, SafeAreaView, Text, TextInput, View } from "react-native";
import { theme } from "../../src/theme";
import { useAppStore } from "../../src/store/useAppStore";
import { CardListItem } from "../../src/components/CardListItem";
import { createLineup } from "../../src/apiLineups";

type Slot = "GK" | "DEF" | "MID" | "FWD" | "FLEX";
const slots: Slot[] = ["GK", "DEF", "MID", "FWD", "FLEX"];

export default function PlayScreen() {
  const gallery = useAppStore((s) => s.gallery);

  // Slots state: slug par slot
  const [picked, setPicked] = useState<Record<Slot, string | null>>({
    GK: null, DEF: null, MID: null, FWD: null, FLEX: null,
  });

  const [activeSlot, setActiveSlot] = useState<Slot>("GK");
  const [name, setName] = useState("GW - lineup");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const pickedSlugs = useMemo(() => slots.map((s) => picked[s]).filter(Boolean) as string[], [picked]);

  const pickedCards = useMemo(() => {
    const map = new Map(gallery.map((c) => [c.slug, c]));
    return pickedSlugs.map((slug) => map.get(slug)).filter(Boolean);
  }, [gallery, pickedSlugs]);

  const validation = useMemo(() => {
    const errors: string[] = [];
    if (!picked.GK) errors.push("Il manque un GK");
    if (!picked.DEF) errors.push("Il manque un DEF");
    if (!picked.MID) errors.push("Il manque un MID");
    if (!picked.FWD) errors.push("Il manque un FWD");
    // FLEX optionnel mais recommandé
    return { ok: errors.length === 0, errors };
  }, [picked]);

  function reset() {
    setPicked({ GK: null, DEF: null, MID: null, FWD: null, FLEX: null });
    setActiveSlot("GK");
    setToast("Reset OK");
    setTimeout(() => setToast(null), 1500);
  }

  function removeSlug(slug: string) {
    const next: any = { ...picked };
    for (const s of slots) if (next[s] === slug) next[s] = null;
    setPicked(next);
  }

  function tryAdd(cardSlug: string, cardPos: string) {
    // retire si déjà présent
    if (pickedSlugs.includes(cardSlug)) {
      removeSlug(cardSlug);
      return;
    }

    // place dans activeSlot si compatible, sinon dans FLEX si libre, sinon refuse
    const want = activeSlot;
    const isCompatible = (slot: Slot) => slot === "FLEX" || slot === cardPos;

    if (!picked[want] && isCompatible(want)) {
      setPicked((p) => ({ ...p, [want]: cardSlug }));
      return;
    }

    // si slot actif pas possible, tenter slot exact correspondant
    const exactSlot = (["GK","DEF","MID","FWD"] as Slot[]).find((s) => s === cardPos) as Slot | undefined;
    if (exactSlot && !picked[exactSlot]) {
      setPicked((p) => ({ ...p, [exactSlot]: cardSlug }));
      return;
    }

    // sinon flex si libre
    if (!picked.FLEX) {
      setPicked((p) => ({ ...p, FLEX: cardSlug }));
      return;
    }

    setToast("Aucun slot disponible/compatible");
    setTimeout(() => setToast(null), 1500);
  }

    function slotToPos(slot: string | null | undefined) {
    const s = String(slot || "").toUpperCase();
    if (s === "GK" || s.includes("GOAL")) return "GK";
    if (s === "DEF" || s.includes("DEF")) return "DEF";
    if (s === "MID" || s.includes("MID")) return "MID";
    if (s === "FWD" || s.includes("FOR")) return "FWD";
    if (s.includes("FLEX")) return "FLEX";
    return "";
  }

  const filteredGallery = useMemo(() => {
    const want = slotToPos(activeSlot);
    if (!want) return gallery;

    // FLEX = tout sauf GK
    if (want === "FLEX") {
      return gallery.filter((c: any) => String(c?.position || "").toUpperCase() !== "GK");
    }

    return gallery.filter((c: any) => String(c?.position || "").toUpperCase() === want);
  }, [gallery, activeSlot]);

  async function save() {
    if (!validation.ok) {
      setToast(validation.errors[0] ?? "Validation KO");
      setTimeout(() => setToast(null), 1800);
      return;
    }
    try {
      setSaving(true);
      await createLineup({ name: name.trim() || "Lineup", mode: "classic", cardSlugs: pickedSlugs });
      setToast("Lineup sauvegardée ✅");
      setTimeout(() => setToast(null), 1800);
    } catch (e: any) {
      setToast(`Erreur: ${e?.message ?? "save KO"}`);
      setTimeout(() => setToast(null), 2200);
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={{ padding: 16, gap: 12 }}>
        <Text style={{ color: theme.text, fontSize: 22, fontWeight: "900" }}>Jouer</Text>

        {/* Slots */}
        <View style={{ backgroundColor: theme.panel, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: theme.stroke }}>
          <Text style={{ color: theme.text, fontWeight: "900" }}>Slots (GK/DEF/MID/FWD/FLEX)</Text>
          <Text style={{ color: theme.muted, marginTop: 6 }}>
            Tap un slot → sélectionne une carte compatible dessous. (FLEX = n’importe quel poste)
          </Text>

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
            {slots.map((s) => {
              const slug = picked[s];
              const card: any = slug ? gallery.find((c: any) => c.slug === slug) : null;
              const active = activeSlot === s;

              return (
                <Pressable
                  key={s}
                  onPress={() => setActiveSlot(s)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    borderRadius: 14,
                    backgroundColor: active ? "rgba(59,130,246,0.18)" : theme.panel2,
                    borderWidth: 1,
                    borderColor: active ? "rgba(59,130,246,0.35)" : theme.stroke,
                    minWidth: 92,
                  }}
                >
                  <Text style={{ color: theme.text, fontWeight: "900" }}>{s}</Text>
                  <Text style={{ color: theme.muted, marginTop: 4 }} numberOfLines={1}>
                    {card ? card.playerName : "Vide"}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Validation */}
          <View style={{ marginTop: 10 }}>
            {validation.ok ? (
              <Text style={{ color: theme.good, fontWeight: "900" }}>✅ Valide (slots obligatoires remplis)</Text>
            ) : (
              <Text style={{ color: theme.warn, fontWeight: "900" }}>⚠️ {validation.errors.join(" • ")}</Text>
            )}
          </View>

          {/* Nom + actions */}
          <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
            <View style={{ flex: 1, backgroundColor: theme.panel2, borderRadius: 14, borderWidth: 1, borderColor: theme.stroke, paddingHorizontal: 12, paddingVertical: 10 }}>
              <Text style={{ color: theme.muted, fontSize: 11 }}>Nom lineup</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Nom"
                placeholderTextColor={theme.muted}
                style={{ color: theme.text, fontWeight: "800", paddingTop: 6 }}
              />
            </View>

            <Pressable
              onPress={reset}
              style={{ paddingHorizontal: 12, justifyContent: "center", borderRadius: 14, backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: theme.stroke }}
            >
              <Text style={{ color: theme.text, fontWeight: "900" }}>Reset</Text>
            </Pressable>

            <Pressable
              onPress={save}
              disabled={saving}
              style={{
                paddingHorizontal: 12,
                justifyContent: "center",
                borderRadius: 14,
                backgroundColor: saving ? "rgba(59,130,246,0.10)" : "rgba(59,130,246,0.18)",
                borderWidth: 1,
                borderColor: "rgba(59,130,246,0.35)",
              }}
            >
              <Text style={{ color: theme.text, fontWeight: "900" }}>{saving ? "..." : "Save"}</Text>
            </Pressable>
          </View>

          {!!toast && (
            <Text style={{ color: theme.muted, marginTop: 10, fontWeight: "800" }}>{toast}</Text>
          )}
        </View>

        <Text style={{ color: theme.muted }}>
          Liste filtrée: {activeSlot === "FLEX" ? "tous postes" : activeSlot} • Sélection: {pickedSlugs.length}/5
        </Text>
      </View>

      <FlatList
        data={filteredGallery}
        keyExtractor={(item: any) => item.id || item.slug}
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 120 }}
        renderItem={({ item }: any) => (
          <CardListItem
            card={item}
            selected={pickedSlugs.includes(item.slug)}
            onPress={() => tryAdd(item.slug, item.position)}
          />
        )}
        ListEmptyComponent={
          <View style={{ padding: 16 }}>
            <Text style={{ color: theme.muted }}>Va dans “Mes cartes” pour charger ta galerie.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}









