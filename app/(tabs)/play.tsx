import React, { useMemo, useState } from "react";
import { FlatList, Pressable, SafeAreaView, Text, TextInput, View, Image } from "react-native";
import { theme } from "../../src/theme";
import { useAppStore } from "../../src/store/useAppStore";
import { CardListItem } from "../../src/components/CardListItem";
import { createLineup } from "../../src/apiLineups";

type Slot = "GK" | "DEF" | "MID" | "FWD" | "FLEX";
const slots: Slot[] = ["GK", "DEF", "MID", "FWD", "FLEX"];

export default function PlayScreen() {
  const gallery = useAppStore((s) => s.gallery);

  // XS_PLAY_GALLERY_BYKEY_V1
  const galleryByKey = React.useMemo(() => {
    const m = new Map<string, any>();
    for (const it of (gallery ?? [])) {
      const k = cardKey(it);
      if (k) m.set(k, it);
    }
    return m;
  }, [gallery]);

  // Slots state: slug par slot
  const [picked, setPicked] = useState<Record<Slot, string | null>>({
    GK: null, DEF: null, MID: null, FWD: null, FLEX: null,
  });

  const [activeSlot, setActiveSlot] = useState<Slot>("FLEX");
  const [name, setName] = useState("GW - lineup");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const pickedSlugs = useMemo(() => slots.map((s) => picked[s]).filter(Boolean) as string[], [picked]);

  const pickedCards = useMemo(() => {
    const map = new Map((gallery ?? []).map((c: any) => [cardKey(c), c]));
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
    setActiveSlot("FLEX");
    setToast("Reset OK");
    setTimeout(() => setToast(null), 1500);
  }

  function removeSlug(slug: string) {
    const next: any = { ...picked };
    for (const s of slots) if (next[s] === slug) next[s] = null;
    setPicked(next);
  }

  function normalizePos(value: string | null | undefined) {
  const s = String(value || "").toUpperCase();
  if (s.includes("GK") || s.includes("GOAL")) return "GK";
  if (s.includes("DEF")) return "DEF";
  if (s.includes("MID")) return "MID";
  if (s.includes("FWD") || s.includes("FOR")) return "FWD";
  return "";
}


// XS_PLAY_CARDKEY_HELPERS_V1: stable key + pos normalization for slots
/* XS_PLAY_CARDKEY_FALLBACK_V1: guarantee non-empty stable key (avoid "" -> slots show "Vide") */
function xsHash32(input: string): string {
  let h = 2166136261; // FNV-1a 32-bit
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  // unsigned + base36
  return (h >>> 0).toString(36);
}

// XS_PLAY_CARDKEY_HELPERS_V1: stable key + pos normalization for slots
function cardKey(item: any): string {
  // priorité: slug -> cardSlug -> id (+ variantes)
  const k =
    item?.slug ??
    item?.cardSlug ??
    item?.id ??
    item?.card?.slug ??
    item?.card?.cardSlug ??
    item?.card?.id ??
    item?.token?.id ??
    item?.tokenId ??
    item?.assetId ??
    item?.publicId ??
    item?.card?.publicId;

  const key = String(k ?? "").trim();
  if (key) return key;

  // fallback déterministe (évite "" et garde une stabilité raisonnable)
  const fp = [
    String(item?.pictureUrl ?? item?.card?.pictureUrl ?? ""),
    String(item?.playerName ?? item?.card?.playerName ?? ""),
    String(item?.seasonYear ?? item?.card?.seasonYear ?? ""),
    String(item?.rarity ?? item?.card?.rarity ?? ""),
    String(item?.teamName ?? item?.card?.teamName ?? ""),
    String(item?.position ?? item?.card?.position ?? ""),
  ].join("|");

  return "fb_" + xsHash32(fp);
}
/* XS_PLAY_CARDPOS_FALLBACK_V1: cardPosCode must not be "" (otherwise GK/DEF/MID/FWD never match and it falls to FLEX) */
function cardPosCode(item: any): string {
  // Essayez plusieurs shapes (selon source: /cards, snapshots, etc.)
  const rawPos =
    item?.position ??
    item?.playerPosition ??
    item?.anyPosition ??
    item?.card?.position ??
    item?.card?.playerPosition ??
    item?.card?.anyPosition ??
    (Array.isArray(item?.anyPositions) ? item?.anyPositions?.[0] : null) ??
    (Array.isArray(item?.card?.anyPositions) ? item?.card?.anyPositions?.[0] : null) ??
    item?.player?.position ??
    item?.card?.player?.position ??
    "";

  const raw = String(rawPos ?? "").toUpperCase().trim();
  if (!raw) return "";

  // normalise vers GK/DEF/MID/FWD si possible
  if (raw === "GK" || raw.includes("GOAL")) return "GK";
  if (raw === "DEF" || raw.includes("DEF")) return "DEF";
  if (raw === "MID" || raw.includes("MID")) return "MID";
  if (raw === "FWD" || raw.includes("FORW") || raw.includes("ATT") || raw.includes("STRIK")) return "FWD";

  // sinon laisser brut (au cas où)
  return raw;
}
/* XS_PLAY_SLOT_MINICARD_V1: show selected card inside slots as a mini card */
function SlotMiniCard({ card }: { card: any }) {
  const url = String(card?.pictureUrl ?? card?.card?.pictureUrl ?? "").trim();
  const name = String(card?.playerName ?? card?.card?.playerName ?? "Unknown");
  const rarity = String(card?.rarity ?? card?.card?.rarity ?? "").toUpperCase();

  return (
    <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
      <View
        style={{
          width: 46,
          height: 64, // mini ratio proche carte
          borderRadius: 10,
          overflow: "hidden",
          backgroundColor: theme.panel2,
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.12)",
        }}
      >
        {url ? (
          <Image source={{ uri: url }} style={{ width: "100%", height: "100%" }} resizeMode="contain" />
        ) : (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: theme.muted, fontSize: 10, fontWeight: "800" }}>—</Text>
          </View>
        )}
      </View>

      <View style={{ flex: 1 }}>
        <Text style={{ color: theme.text, fontWeight: "900" }} numberOfLines={1}>{name}</Text>
        <Text style={{ color: theme.muted, marginTop: 2, fontSize: 12 }} numberOfLines={1}>
          {rarity || "—"}
        </Text>
      </View>
    </View>
  );
}

// XS_PLAY_GALLERY_BYKEY_V1: map gallery items by stable key (slug/cardSlug/id)

function tryAdd(cardSlug: string, cardPos: string) {
  // XS_PLAY_TRYADD_ATOMIC_V1: compute from latest state (avoid stale picked/slot)
  setPicked((prev) => {
    /* XS_PLAY_SLOT_PROBE_V1 */
    try {
      console.log("[PLAY][tryAdd] tap", {
        cardSlug,
        cardPos,
        activeSlot,
        prevPicked: prev,
        galleryLen: (gallery ?? []).length,
        hasInMap: !!galleryByKey.get(cardSlug),
        keyLooksEmpty: !String(cardSlug || "").trim(),
      });
    } catch {}
    const next = { ...prev } as Record<Slot, string | null>;
    const currentPickedSlugs = slots.map((s) => next[s]).filter(Boolean) as string[];

    // toggle off si déjà présent
    if (currentPickedSlugs.includes(cardSlug)) {
      for (const s of slots) if (next[s] === cardSlug) next[s] = null;
      return next;
    }

    const want = activeSlot;
const isCompatible = (slot: Slot) => slot === "FLEX" || slot === cardPos;

/* XS_PLAY_TRYADD_ALLOW_UNKNOWN_POS_V1:
   Si l'utilisateur a sélectionné un slot précis (GK/DEF/MID/FWD) et qu'il est vide,
   on autorise l'ajout même si cardPos est inconnu (""), sinon ça tombe en FLEX. */
if (want !== "FLEX" && !next[want] && (!cardPos || isCompatible(want))) {
  next[want] = cardSlug;
  return next;
}
if (!next[want] && isCompatible(want)) {
      next[want] = cardSlug;
      return next;
    }

    const exactSlot = (["GK","DEF","MID","FWD"] as Slot[]).find((s) => s === cardPos) as Slot | undefined;
    if (exactSlot && !next[exactSlot]) {
      next[exactSlot] = cardSlug;
      return next;
    }

    if (!next.FLEX) {
      next.FLEX = cardSlug;
      return next;
    }

    setToast("Aucun slot disponible/compatible");
    setTimeout(() => setToast(null), 1500);
    return next;
  });
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

  const filteredGalleryState = useMemo(() => {
  const want = activeSlot === "FLEX" ? "FLEX" : normalizePos(activeSlot);
  let filtered = gallery as any[];
  let isFallback = false;

  if (want === "FLEX") {
    filtered = (gallery as any[]).filter((c: any) => normalizePos(c?.position) !== "GK");
  } else if (want) {
    filtered = (gallery as any[]).filter((c: any) => normalizePos(c?.position) === want);
  }

  if (filtered.length === 0 && (gallery as any[]).length > 0) {
    filtered = gallery as any[];
    isFallback = true;
  }

  return { items: filtered, isFallback };
}, [gallery, activeSlot]);  
  function formatSlotMeta(card: any) {
    const playerName = String(card?.playerName || card?.name || card?.player?.displayName || card?.player?.name || "").trim();
    const club = String(card?.club || card?.team || card?.teamName || card?.player?.activeClub?.name || "").trim();
    const position = String(card?.position || card?.player?.position || "").toUpperCase();
    const rarity = String(card?.rarity || card?.scarcity || "").trim();
    const priceRaw = card?.price ?? card?.lastSalePrice ?? card?.floorPrice;
    const formattedPrice =
      typeof priceRaw === "number"
        ? `Ξ ${priceRaw.toFixed(4)}`
        : String(priceRaw || "").trim();

    const line1 = [club, position].filter(Boolean).join(" • ");
    const line2 = [rarity, formattedPrice].filter(Boolean).join(" • ");
    return { playerName, line1, line2 };
  }


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
  const card: any = slug ? galleryByKey.get(slug) : null;
  const isActive = activeSlot === s;

  return (
    <Pressable
      key={s}
      onPress={() => setActiveSlot(s)}
      style={{
        padding: 12,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: isActive ? "rgba(59,130,246,0.55)" : theme.stroke,
        backgroundColor: theme.panel,
      }}
    >
      <Text style={{ color: theme.muted, fontWeight: "900", marginBottom: 8 }}>{s}</Text>

      {card ? (
        <SlotMiniCard card={card} />
      ) : (
        <Text style={{ color: theme.muted, fontWeight: "800" }}>Vide</Text>
      )}
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
        {filteredGalleryState.isFallback && (
          <Text style={{ color: theme.muted, marginTop: 4 }}>
            Aucune carte pour ce poste, affichage de toute la galerie
          </Text>
        )}
      </View>

      <FlatList
        data={filteredGalleryState.items}
        keyExtractor={(item: any) => cardKey(item)}
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 120 }}
        renderItem={({ item }: any) => (
          <CardListItem
            card={item}
            selected={pickedSlugs.includes(cardKey(item))}
            onPress={() => tryAdd(cardKey(item), cardPosCode(item))}
          />
        )}
        ListEmptyComponent={
          <View style={{ padding: 16 }}>
            <Text style={{ color: theme.muted }}>Aucune carte compatible détectée pour ce slot (ou galerie vide). Va dans “Mes cartes” pour charger ta galerie.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}




















