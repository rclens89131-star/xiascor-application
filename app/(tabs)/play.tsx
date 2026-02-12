/* XS_PLAY_REPAIR_ESCAPED_PATCH_V1 */
import React, { useEffect, useMemo, useState } from "react";
import { FlatList, Image, Pressable, SafeAreaView, ScrollView, Switch, Text, TextInput, View, Modal } from "react-native"; /* XS_PLAY_SCROLL_HEADER_V1 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createLineup } from "../../src/apiLineups";
import { CardListItem } from "../../src/components/CardListItem";
import { theme, rarityColor } from "../../src/theme";
import { useAppStore } from "../../src/store/useAppStore";

type Slot = "GK" | "DEF" | "MID" | "FWD" | "FLEX";
type PosCode = "GK" | "DEF" | "MID" | "FWD" | "UNK";
type Scenario = "classic" | "cap_240" | "cap_220";

type HistoryItem = {
  id: string;
  createdAt: string;
  name: string;
  scenario: Scenario;
  picked: Record<Slot, string | null>;
  allowGkInFlex: boolean;
  enableClubRule: boolean;
};

type PersistedPlayState = {
  picked: Record<Slot, string | null>;
  name: string;
  scenario: Scenario;
  allowGkInFlex: boolean;
  enableClubRule: boolean;
  history: HistoryItem[];
};

const slots: Slot[] = ["GK", "DEF", "MID", "FWD", "FLEX"];
const SCENARIO_LABEL: Record<Scenario, string> = {
  classic: "Classic",
  cap_240: "Cap 240",
  cap_220: "Cap 220",
};
const PLAY_PERSIST_KEY = "xs_play_lineup_v2";
const EMPTY_PICKED: Record<Slot, string | null> = { GK: null, DEF: null, MID: null, FWD: null, FLEX: null };

function xsHash32(input: string): string {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  
  return (h >>> 0).toString(36);
}

function cardKey(item: any): string {
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

  const fp = [
    String(item?.pictureUrl ?? item?.card?.pictureUrl ?? ""),
    String(item?.playerName ?? item?.card?.playerName ?? ""),
    String(item?.seasonYear ?? item?.card?.seasonYear ?? ""),
    String(item?.rarity ?? item?.card?.rarity ?? ""),
    String(item?.teamName ?? item?.card?.teamName ?? ""),
    String(item?.position ?? item?.card?.position ?? ""),
  ].join("|");
  
  return `fb_${xsHash32(fp)}`;
}

  // XS_POS_NORM_V2_BEGIN
  function xsPosCodeFromAny(item: any): PosCode {
  const raw =
    item?.positionRaw ??
    item?.position ??
    item?.playerPosition ??
    item?.anyPosition ??
    item?.card?.positionRaw ??
    item?.card?.position ??
    item?.card?.playerPosition ??
    item?.card?.anyPosition ??
    item?.player?.position ??
    item?.player?.anyPosition ??
    "";

  const s0 = String(raw ?? "").trim();
  const s = s0.toLowerCase();

  // If the API literally returns "UNK", treat it as missing and try to resolve via playerSlug.
  if (!s || s === "unk" || s === "unknown") {
    const slug =
      item?.playerSlug ??
      item?.player?.slug ??
      item?.card?.playerSlug ??
      "";
    const key = String(slug ?? "").trim();
    if (key) {
      const cached = xsPosSlugCache?.get?.(key);
      if (cached) return cached;
      // background resolve (no await => no signature changes)
      try { xsResolvePosFromPlayerSlug(key); } catch {}
    }

    try {
      // eslint-disable-next-line no-console
      console.log("[XS_POS_PROBE_V3] still UNK", JSON.stringify({ raw: s0, playerSlug: key, topKeys: Object.keys(item || {}).slice(0, 25) }));
    } catch {}
    return "UNK";
  }

  const code = xsPosCodeFromToken(s0);
  if (code !== "UNK") return code;

  try {
    // eslint-disable-next-line no-console
    console.log("[XS_POS_PROBE_V3] unmapped token", JSON.stringify({ raw: s0 }));
  } catch {}
  return "UNK";
}
  // XS_POS_NORM_V2_END

  // XS_POS_RESOLVE_FROM_PLAYER_SLUG_V1_BEGIN
  // When the API returns "UNK" for position/positionRaw, resolve via backend using playerSlug.
  const xsPosSlugCache = new Map<string, PosCode>();
  const xsPosSlugInflight = new Set<string>();

  function xsPosCodeFromToken(token: any): PosCode {
    const s = String(token ?? "").trim().toLowerCase();
    if (!s || s === "unk" || s === "unknown") return "UNK";
    if (s === "gk" || s.includes("goalkeeper") || s.includes("goal")) return "GK";
    if (s === "def" || s === "df" || s.includes("defender") || s.includes("def")) return "DEF";
    if (s === "mid" || s === "mf" || s.includes("midfielder") || s.includes("mid")) return "MID";
    if (s === "fwd" || s === "fw" || s.includes("forward") || s.includes("att") || s.includes("strik")) return "FWD";
    return "UNK";
  }

    // XS_POS_BASEURL_ROBUST_V1
    // XS_POS_BASEURL_ROBUST_V2 (fix syntax + robust base url on device)
  function xsBestBaseUrl(): string {
    // 1) Prefer an existing BASE_URL if the file already defines it
    try {
      // @ts-ignore
      if (typeof BASE_URL === "string" && BASE_URL) return String(BASE_URL).trim();
    } catch (e) {}

    // 2) Expo env via globalThis.process (more reliable than "process" in some runtimes)
    try {
      // @ts-ignore
      const v = globalThis?.process?.env?.EXPO_PUBLIC_BASE_URL;
      if (typeof v === "string" && v.trim()) return v.trim();
    } catch (e) {}

    // 3) expo-constants fallback (extra / manifest)
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const C: any = require("expo-constants")?.default ?? require("expo-constants");
      const extra =
        C?.expoConfig?.extra ??
        C?.manifest?.extra ??
        C?.manifest2?.extra ??
        null;

      const v =
        extra?.EXPO_PUBLIC_BASE_URL ??
        extra?.expoPublicBaseUrl ??
        extra?.baseUrl ??
        "";
      if (typeof v === "string" && v.trim()) return v.trim();
    } catch (e) {}

    return "";
  }

function xsResolvePosFromPlayerSlug(playerSlug: string): void {
    // XS_BASEURL_MISSING_V1 (diagnostic léger)
    const slug = String(playerSlug ?? "").trim();
    if (!slug) return;
    if (xsPosSlugCache.has(slug)) return;
    if (xsPosSlugInflight.has(slug)) return;

    const base = xsBestBaseUrl();
    if (!base) {
      try {
        // eslint-disable-next-line no-console
        console.log("[XS_BASEURL_MISSING_V1] no base url; cannot resolve pos", JSON.stringify({ playerSlug: slug }));
      } catch {}
      return;
    }xsPosSlugInflight.add(slug);

    const url = `${base.replace(/\/+$/, "")}/public-player?slug=${encodeURIComponent(slug)}`;
    fetch(url)
      .then(r => (r.ok ? r.json() : null))
      .then(j => {
        const token =
          j?.position ??
          j?.player?.position ??
          j?.playerPosition ??
          j?.anyPosition ??
          "";
        const code = xsPosCodeFromToken(token);
        if (code !== "UNK") xsPosSlugCache.set(slug, code);
      })
      .catch(() => {})
      .finally(() => {
        xsPosSlugInflight.delete(slug);
      });
  }
  // XS_POS_RESOLVE_FROM_PLAYER_SLUG_V1_END
function cardPosCode(item: any): PosCode { return xsPosCodeFromAny(item); }

  // XS_PLAY_RESTORE_MISSING_HELPERS_V1_BEGIN
  // Minimal + robust helpers used by Play UI (kept local to this file).

  function cardSeason(card: any): string {
    const start =
      card?.season?.startYear ??
      card?.seasonStartYear ??
      card?.season?.start ??
      card?.seasonStart ??
      null;

    const end =
      card?.season?.endYear ??
      card?.seasonEndYear ??
      card?.season?.end ??
      card?.seasonEnd ??
      null;

    if (start != null && end != null) {
      const s = String(start).trim();
      const e = String(end).trim();
      if (s && e) return `${s}-${e.slice(-2)}`;
    }

    const v =
      card?.season?.name ??
      card?.season?.displayName ??
      card?.season ??
      card?.seasonYear ??
      "";

    const out = String(v ?? "").trim();
    return out || "—";
  }

  function xsPosCandidatesV2(item: any): string[] {
    const vals: any[] = [
      item?.positionRaw,
      item?.position,
      item?.playerPosition,
      item?.anyPosition,
      item?.card?.positionRaw,
      item?.card?.position,
      item?.card?.playerPosition,
      item?.card?.anyPosition,
      item?.player?.position,
      item?.player?.anyPosition,
      item?.playerPositionRaw,
    ];

    const out = vals
      .filter(v => v != null && String(v).trim() !== "")
      .map(v => (typeof v === "string" ? v : String(v)));

    // Dédoublonnage simple (ordre conservé)
    const seen = new Set<string>();
    return out.filter(x => (seen.has(x) ? false : (seen.add(x), true)));
  }
  // XS_PLAY_RESTORE_MISSING_HELPERS_V1_END


function cardClub(card: any): string {
  
  return String(card?.teamName ?? card?.team ?? card?.club ?? card?.card?.teamName ?? card?.player?.activeClub?.name ?? "").trim();
}

function cardRarityLabel(card: any): string {
  
  return String(card?.rarity ?? card?.scarcity ?? card?.card?.rarity ?? "unknown").replace("_", " ").toUpperCase();
}

function isCardCompatibleWithSlot(slot: Slot, pos: PosCode, allowGkInFlex: boolean): boolean {
  if (slot === "GK") return pos === "GK";
  if (slot === "DEF") return pos === "DEF";
  if (slot === "MID") return pos === "MID";
  if (slot === "FWD") return pos === "FWD";
  if (slot === "FLEX") {
    if (pos === "UNK") return false;
    if (pos === "GK") return allowGkInFlex;
  
  return true;
  }
  
  return false;
}

function estimateCardScore(card: any): number | null {
  const candidates = [card?.expectedScore, card?.score, card?.l15, card?.avgScore, card?.card?.expectedScore, card?.card?.score];
  for (const c of candidates) {
    if (typeof c === "number" && Number.isFinite(c)) return c;
  }
  
  return null;
}

function SlotMiniCard({
  slot,
  card,
  onRemove,
  onSwap,
  swapActive,
}: {
  slot: Slot;
  card: any;
  onRemove: () => void;
  onSwap: () => void;
  swapActive: boolean;
}) {
  const url = String(card?.pictureUrl ?? card?.card?.pictureUrl ?? "").trim();
  const name = String(card?.playerName ?? card?.card?.playerName ?? "Unknown");
  const pos = cardPosCode(card);
  const season = cardSeason(card);
  const rarityLabel = cardRarityLabel(card);
  
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
        <View style={{ width: 46, height: 64, borderRadius: 10, overflow: "hidden", backgroundColor: theme.panel2, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" }}>
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
            {pos === "UNK" ? "position inconnue" : pos} • Saison {season}
          </Text>

          <View style={{ alignSelf: "flex-start", marginTop: 5, borderRadius: 10, borderWidth: 1, borderColor: rarityColor(String(card?.rarity ?? card?.card?.rarity ?? "")), paddingHorizontal: 7, paddingVertical: 2, backgroundColor: "rgba(255,255,255,0.02)" }}>
            <Text style={{ fontSize: 10, fontWeight: "900", color: rarityColor(String(card?.rarity ?? card?.card?.rarity ?? "")) }}>
              {rarityLabel}
            </Text>
          </View>
        </View>
      </View>

      <View style={{ flexDirection: "row", gap: 8 }}>
        <Pressable onPress={onRemove} style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: theme.stroke, backgroundColor: "rgba(255,255,255,0.05)" }}>
          <Text style={{ color: theme.text, fontWeight: "900" }}>✖ remove</Text>
        </Pressable>

        <Pressable onPress={onSwap} style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: swapActive ? theme.accent : theme.stroke, backgroundColor: swapActive ? "rgba(59,130,246,0.18)" : "rgba(255,255,255,0.05)" }}>
          <Text style={{ color: theme.text, fontWeight: "900" }}>↔ swap {slot}</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function PlayScreen() {
  const gallery = useAppStore((s) => s.gallery);

  const galleryByKey = useMemo(() => {
    const m = new Map<string, any>();
    for (const it of gallery ?? []) {
      const k = cardKey(it);
      if (k) m.set(k, it);
    }
  
  return m;
  }, [gallery]);

  const [picked, setPicked] = useState<Record<Slot, string | null>>(EMPTY_PICKED);

/* XS_PLAY_PICKED_DIAG_V2C (BEGIN) */
useEffect(() => {
  try {
    const entries = Object.entries((picked as any) ?? {}).map(([slot, key]) => ({ slot, key }));
    const hasFn = (galleryByKey as any)?.has ? (k:any) => (galleryByKey as any).has(k) : (_k:any) => false;
    const missing = entries.filter(e => !!e.key).filter(e => !hasFn(e.key));
    console.log("[XS_PICKED_DIAG_V2C] picked=", entries);
    console.log("[XS_PICKED_DIAG_V2C] galleryLen=", ((gallery as any[])?.length ?? 0), "mapSize=", ((galleryByKey as any)?.size ?? null));
    console.log("[XS_PICKED_DIAG_V2C] missing=", missing);
  } catch (e) {
    console.log("[XS_PICKED_DIAG_V2C] ERROR", e);
  }
}, [picked, gallery, galleryByKey]);
/* XS_PLAY_PICKED_DIAG_V2C (END) */

  const [activeSlot, setActiveSlot] = useState<Slot>("FLEX");
  const [name, setName] = useState("GW - lineup");
  const [scenario, setScenario] = useState<Scenario>("classic");
  const [allowGkInFlex, setAllowGkInFlex] = useState(false);
  const [enableClubRule, setEnableClubRule] = useState(false);
  const [swapFrom, setSwapFrom] = useState<Slot | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

// XS_PLAY_SLOT_PICKER_MODAL_V1 (BEGIN)
const [xsPickerOpen, setXsPickerOpen] = useState(false);
const [xsPickerSlot, setXsPickerSlot] = useState<Slot>("GK");
const [xsPickerQ, setXsPickerQ] = useState("");

function xsOpenPicker(slot: Slot) {
  setXsPickerSlot(slot);
  setXsPickerQ("");
  setXsPickerOpen(true);
}
function xsClosePicker() {
  setXsPickerOpen(false);
  setXsPickerQ("");
}

function xsTextHay(card: any): string {
  const a = String(card?.playerName ?? card?.card?.playerName ?? card?.player?.displayName ?? card?.card?.player?.displayName ?? "");
  const b = String(cardClub(card) ?? "");
  const c = String(cardSeason(card) ?? "");
  const d = String(cardRarityLabel(card) ?? "");
  
  return (a + " " + b + " " + c + " " + d).toLowerCase();
}

function xsPickerListForSlot(slot: Slot) {
  const all = (gallery as any[]) ?? [];
  const strict = all.filter((it) => isCardCompatibleWithSlot(slot, cardPosCode(it), allowGkInFlex));
  const isFallback = all.length > 0 && strict.length === 0;
  const base = isFallback ? all : strict;

  const q = xsPickerQ.trim().toLowerCase();
  const filtered = q ? base.filter((it) => xsTextHay(it).includes(q)) : base;

  const pickedSet = new Set(pickedSlugs);
  const items = filtered.filter((it) => !pickedSet.has(cardKey(it)));
  
  return { items, isFallback };
}

function xsTryAddToSlot(slot: Slot, cardSlug: string, cardPos: PosCode) {
  
  /* XS_TRYADD_FLOW_DIAG_V3 (BEGIN) */
  try {
    console.log("[XS_TRYADD_FLOW_V3] START", { slot, cardSlug, cardPos });
  } catch {}
  /* XS_TRYADD_FLOW_DIAG_V3 (END) */
// XS_PLAY_TRYADD_DIAG_V1 (BEGIN)
  try {
    console.log("[XS_TRYADD] enter", { xsPickerSlot, args: Array.from(arguments) });
  } catch {}
  // XS_PLAY_TRYADD_DIAG_V1 (END)
  const { isFallback } = xsPickerListForSlot(slot);
  const unkAllowedInFlexFallback = isFallback;

  if (!isCardCompatibleWithSlot(slot, cardPos, allowGkInFlex)) {
    if (cardPos === "UNK" && !unkAllowedInFlexFallback) {
      showToast("Carte ignorée: position inconnue (mode strict)");
    } else if (slot === "FLEX" && cardPos === "GK" && !allowGkInFlex) {
      showToast("GK interdit en FLEX (active “Autoriser GK en FLEX”)");
    } else {
      showToast(`Incompatible pour le slot ${slot}`);
    }
  /* XS_TRYADD_EARLY_RETURN_FALSE_V4 */
  try {
    console.log("[XS_TRYADD_BLOCKED_V4] early-return BEFORE setPicked", { slot, cardSlug, cardPos });
  } catch {}
  return false;
  }
  /* XS_TRYADD_BEFORE_SETPICKED_V3 */
  try { console.log("[XS_TRYADD_FLOW_V3] BEFORE setPicked", { slot, cardSlug, cardPos }); } catch {}


  setPicked((prev) => {
  /* XS_TRYADD_SET_PICKED_DIAG_V2C */
  try {
    console.log("[XS_TRYADD_SET_PICKED_DIAG_V2C] slot=", slot, "cardSlug=", cardSlug, "cardPos=", cardPos, "prev=", prev);
  } catch {}
    const next = { ...prev };
    for (const s of slots) if (next[s] === cardSlug) next[s] = null;
    next[slot] = cardSlug;
  
  return next;
  });

  
  /* XS_TRYADD_RETURN_TRUE_AFTER_SETPICKED_V4 */
  /* XS_TRYADD_SET_ACTIVE_BEFORE_RETURN_TRUE_V5 */
  setActiveSlot(slot);
  
  return true;
xsClosePicker();
  showToast(`Ajouté dans ${slot}`);
}
// XS_PLAY_SLOT_PICKER_MODAL_V1 (END)

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(PLAY_PERSIST_KEY);
        if (!raw || !mounted) { setHydrated(true); return; }
        const parsed = JSON.parse(raw) as Partial<PersistedPlayState>;
        /* XS_PLAY_HYDRATION_NO_OVERWRITE_V1 (BEGIN) */
if (parsed?.picked) {
  setPicked((prev) => {
    try { console.log("[XS_HYDRATE] apply? prevHasAny=", Object.values(prev ?? {}).some(Boolean)); } catch {}
    const prevHasAny = Object.values(prev ?? {}).some(Boolean);
    if (prevHasAny) return prev; // l'utilisateur a déjà choisi -> ne pas écraser
    return { ...EMPTY_PICKED, ...parsed.picked };
  });
}
/* XS_PLAY_HYDRATION_NO_OVERWRITE_V1 (END) */
        if (typeof parsed?.name === "string") setName(parsed.name);
        if (parsed?.scenario && ["classic", "cap_240", "cap_220"].includes(parsed.scenario)) setScenario(parsed.scenario as Scenario);
        if (typeof parsed?.allowGkInFlex === "boolean") setAllowGkInFlex(parsed.allowGkInFlex);
        if (typeof parsed?.enableClubRule === "boolean") setEnableClubRule(parsed.enableClubRule);
        if (Array.isArray(parsed?.history)) setHistory(parsed.history.slice(0, 3));
      } catch {
        // ignore invalid local state
      } finally {
        if (mounted) setHydrated(true);
      }
    })();
  
  return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const payload: PersistedPlayState = { picked, name, scenario, allowGkInFlex, enableClubRule, history };
    AsyncStorage.setItem(PLAY_PERSIST_KEY, JSON.stringify(payload)).catch(() => null);
  }, [hydrated, picked, name, scenario, allowGkInFlex, enableClubRule, history]);

  const pickedSlugs = useMemo(() => slots.map((s) => picked[s]).filter(Boolean) as string[], [picked]);
  const pickedCards = useMemo(() => pickedSlugs.map((slug) => galleryByKey.get(slug)).filter(Boolean), [galleryByKey, pickedSlugs]);

  const missingCount = Math.max(0, 5 - pickedSlugs.length);

  const hasGk = useMemo(() => pickedCards.some((c) => cardPosCode(c) === "GK"), [pickedCards]);

  const sameClubViolation = useMemo(() => {
    if (!enableClubRule) return false;
    const counts: Record<string, number> = {};
    for (const card of pickedCards) {
      const club = cardClub(card);
      if (!club) continue;
      counts[club] = (counts[club] ?? 0) + 1;
      if (counts[club] > 2) return true;
    }
  
  return false;
  }, [enableClubRule, pickedCards]);

  const validation = useMemo(() => {
    const errors: string[] = [];
    if (pickedSlugs.length !== 5) errors.push("Tu dois avoir 5 cartes");
    if (!hasGk) errors.push("Pas de GK");
    if (sameClubViolation) errors.push("Trop de joueurs même club");
  
  return { ok: errors.length === 0, errors };
  }, [pickedSlugs.length, hasGk, sameClubViolation]);

  const scoreEstimate = useMemo(() => {
    let total = 0;
    let hasAny = false;
    for (const card of pickedCards) {
      const s = estimateCardScore(card);
      if (typeof s === "number") { total += s; hasAny = true; }
    }
  
  return hasAny ? total : null;
  }, [pickedCards]);

  const capRemaining = useMemo(() => {
    const cap = scenario === "cap_240" ? 240 : scenario === "cap_220" ? 220 : null;
    if (!cap || scoreEstimate == null) return null;
  
  return cap - scoreEstimate;
  }, [scenario, scoreEstimate]);

  const filteredGalleryState = useMemo(() => {
    const strictItems = (gallery as any[]).filter((item) => isCardCompatibleWithSlot(activeSlot, cardPosCode(item), allowGkInFlex));
    const canFallback = true; /* XS_PLAY_FALLBACK_UNK_V3 */ if ((gallery as any[]).length > 0 && strictItems.length === 0 && canFallback) {
  
  return { items: gallery as any[], isFallback: true };
    }
  
  return { items: strictItems, isFallback: false };
  }, [gallery, activeSlot, allowGkInFlex]);

  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(null), 1800);
  }

  function reset() {
    setPicked(EMPTY_PICKED);
    setActiveSlot("FLEX");
    setSwapFrom(null);
    showToast("Reset OK");
  }

  function removeFromSlot(slot: Slot) {
    setPicked((prev) => ({ ...prev, [slot]: null }));
  }

  function onSlotSwapPress(slot: Slot) {
    if (!swapFrom) {
      setSwapFrom(slot);
      showToast(`Mode swap actif: choisis un 2e slot (départ ${slot})`);
  
  return;
    }
    if (swapFrom === slot) {
      setSwapFrom(null);
      showToast("Mode swap désactivé");
  
  return;
    }
    setPicked((prev) => {
      const next = { ...prev };
      const first = next[swapFrom];
      next[swapFrom] = next[slot];
      next[slot] = first;
  
  return next;
    });
    setSwapFrom(null);
    showToast(`Swap ${swapFrom} ↔ ${slot} effectué`);
  }

  function onSlotPress(slot: Slot) {
  setActiveSlot(slot);

  // swap mode prioritaire: ne pas ouvrir le picker
  if (swapFrom && swapFrom !== slot) { onSlotSwapPress(slot); return; }

  // ouvrir le picker sur le slot tapé
  xsOpenPicker(slot);
}

  function tryAdd(cardSlug: string, cardPos: PosCode) {
    const unkAllowedInFlexFallback = filteredGalleryState.isFallback; /* XS_PLAY_FALLBACK_UNK_V3 */ if (!isCardCompatibleWithSlot(activeSlot, cardPos, allowGkInFlex)) {
      if (cardPos === "UNK" && !unkAllowedInFlexFallback) {
        showToast("Carte ignorée: position inconnue (mode strict)");
      } else if (activeSlot === "FLEX" && cardPos === "GK" && !allowGkInFlex) {
        showToast("GK interdit en FLEX (active “Autoriser GK en FLEX”)");
      } else {
        showToast(`Incompatible pour le slot ${activeSlot}`);
      }
  
  return;
    }

    setPicked((prev) => {
      const next = { ...prev };
      for (const s of slots) if (next[s] === cardSlug) next[s] = null;
      next[activeSlot] = cardSlug;
  
  return next;
    });
  }

  function pushHistoryFromCurrent() {
    const now = new Date().toISOString();
    const item: HistoryItem = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: now,
      name: name.trim() || "Lineup",
      scenario,
      picked,
      allowGkInFlex,
      enableClubRule,
    };
    setHistory((prev) => [item, ...prev].slice(0, 3));
  }

  function loadHistory(item: HistoryItem) {
    setPicked({ ...EMPTY_PICKED, ...item.picked });
    setName(item.name);
    setScenario(item.scenario);
    setAllowGkInFlex(item.allowGkInFlex);
    setEnableClubRule(item.enableClubRule);
    setSwapFrom(null);
    showToast("Lineup historique rechargée");
  }

  async function save() {
    if (!validation.ok) { showToast(validation.errors[0] ?? "Validation KO"); return; }
    try {
      setSaving(true);
      await createLineup({ name: name.trim() || "Lineup", mode: scenario === "classic" ? "classic" : "cap", cardSlugs: pickedSlugs });
      pushHistoryFromCurrent();
      showToast("Lineup sauvegardée ✅");
    } catch (e: any) {
      showToast(`Erreur: ${e?.message ?? "save KO"}`);
    } finally {
      setSaving(false);
    }
  }
  
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
{/* XS_PLAY_PICKED_UI_V2 */}
<View style={{ paddingHorizontal: 12, paddingTop: 8, paddingBottom: 10 }}>
  <View style={{ padding: 10, borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.14)", backgroundColor: "rgba(255,255,255,0.04)" }}>
    <Text style={{ color: theme.text, fontWeight: "900", fontSize: 12 }}>XS_PICKED_UI_V2</Text>
    <Text style={{ color: theme.muted, marginTop: 4, fontSize: 12 }} numberOfLines={3}>
      {(() => { try { return JSON.stringify(picked ?? {}); } catch { return "picked: <unstringifiable>"; } })()}
    </Text>
  </View>
</View>
      <View style={{ padding: 16, gap: 12 }}>
        <Text style={{ color: theme.text, fontSize: 22, fontWeight: "900" }}>Jouer</Text>
<View style={{ marginTop: 8, padding: 10, borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.18)", backgroundColor: "rgba(34,197,94,0.14)" }}>
  <Text style={{ color: theme.text, fontWeight: "900" }}>XS_PLAY_UI_PROBE_BANNER_V2 ✅ (si tu vois ça, c’est la bonne version)</Text>
</View>

        <View style={{ backgroundColor: theme.panel, borderRadius: 14, borderWidth: 1, borderColor: theme.stroke, padding: 12, gap: 10 }}>
          <Text style={{ color: theme.text, fontWeight: "900" }}>Scénario Sorare</Text>
          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
            {(["classic", "cap_240", "cap_220"] as Scenario[]).map((item) => {
              const active = scenario === item;
  
  return (
                <Pressable key={item} onPress={() => setScenario(item)} style={{ paddingHorizontal: 10, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: active ? "rgba(59,130,246,0.45)" : theme.stroke, backgroundColor: active ? "rgba(59,130,246,0.15)" : "rgba(255,255,255,0.03)" }}>
                  <Text style={{ color: theme.text, fontWeight: "800" }}>{SCENARIO_LABEL[item]}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ color: theme.muted }}>Score estimé</Text>
            <Text style={{ color: theme.text, fontWeight: "900" }}>{scoreEstimate == null ? "—" : scoreEstimate.toFixed(1)}</Text>
          </View>
          {scenario !== "classic" && (
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ color: theme.muted }}>Cap restant</Text>
              <Text style={{ color: theme.text, fontWeight: "900" }}>{capRemaining == null ? "—" : capRemaining.toFixed(1)}</Text>
            </View>
          )}
        </View>

        <View style={{ backgroundColor: theme.panel, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: theme.stroke }}>
          <Text style={{ color: theme.text, fontWeight: "900" }}>Slots (GK/DEF/MID/FWD/FLEX)</Text>

          <View style={{ marginTop: 10, gap: 10 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={{ color: theme.muted, flex: 1 }}>Autoriser GK en FLEX</Text>
              <Switch value={allowGkInFlex} onValueChange={setAllowGkInFlex} />
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={{ color: theme.muted, flex: 1 }}>Activer règle club (max 2 joueurs/club)</Text>
              <Switch value={enableClubRule} onValueChange={setEnableClubRule} />
            </View>
          </View>

          <Text style={{ color: theme.muted, marginTop: 8 }}>
            {missingCount > 0 ? `Il manque ${missingCount} carte${missingCount > 1 ? "s" : ""}` : "Lineup complète"} • {pickedSlugs.length}/5 cartes
          </Text>

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
            {slots.map((s) => {
              const slug = picked[s];
              const card: any = slug ? galleryByKey.get(slug) : null;
const xsHasKey = !!(slug && (galleryByKey as any)?.has?.(slug));
/* XS_PLAY_SLOT_VISIBLE_PROBE_V1 */
              const isActive = activeSlot === s;
              const isSwapTarget = swapFrom === s;
  
  return (
                <Pressable key={s} onPress={() => onSlotPress(s)} style={{ width: "48%", padding: 12, borderRadius: 16, borderWidth: 1, borderColor: isSwapTarget ? "rgba(34,197,94,0.5)" : isActive ? "rgba(59,130,246,0.55)" : theme.stroke, backgroundColor: theme.panel }}>
                  <Text style={{ color: theme.muted, fontWeight: "900", marginBottom: 8 }}>{s}</Text>
                  {card ? (
                    <SlotMiniCard slot={s} card={card} onRemove={() => removeFromSlot(s)} onSwap={() => onSlotSwapPress(s)} swapActive={swapFrom === s} />
                  ) : (
                    <View style={{ gap: 8 }}>
                      <Text style={{ color: theme.muted, fontWeight: "800" }}>Vide</Text>
{slug ? (
  <View style={{ marginTop: 6, padding: 8, borderRadius: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.18)", backgroundColor: "rgba(255,255,255,0.04)" }}>
    <Text style={{ color: theme.text, fontWeight: "900", fontSize: 12 }}>XS_SLOT_PROBE</Text>
    <Text style={{ color: theme.muted, marginTop: 2, fontSize: 12 }} numberOfLines={2}>key={String(slug).slice(0, 60)}</Text>
    <Text style={{ color: theme.muted, marginTop: 2, fontSize: 12 }}>hasKey={String(xsHasKey)}</Text>
  </View>
) : null}
                      <Pressable onPress={() => onSlotSwapPress(s)} style={{ alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: swapFrom === s ? theme.accent : theme.stroke, backgroundColor: swapFrom === s ? "rgba(59,130,246,0.18)" : "rgba(255,255,255,0.04)" }}>
                        <Text style={{ color: theme.text, fontWeight: "900" }}>↔ swap {s}</Text>
                      </Pressable>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>

          <View style={{ marginTop: 10 }}>
            {validation.ok ? (
              <Text style={{ color: theme.good, fontWeight: "900" }}>✅ Valide</Text>
            ) : (
              <Text style={{ color: theme.warn, fontWeight: "900" }}>⚠️ {validation.errors.join(" • ")}</Text>
            )}
          </View>

          <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
            <View style={{ flex: 1, backgroundColor: theme.panel2, borderRadius: 14, borderWidth: 1, borderColor: theme.stroke, paddingHorizontal: 12, paddingVertical: 10 }}>
              <Text style={{ color: theme.muted, fontSize: 11 }}>Nom lineup</Text>
              <TextInput value={name} onChangeText={setName} placeholder="Nom" placeholderTextColor={theme.muted} style={{ color: theme.text, fontWeight: "800", paddingTop: 6 }} />
            </View>

            <Pressable onPress={reset} style={{ paddingHorizontal: 12, justifyContent: "center", borderRadius: 14, backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: theme.stroke }}>
              <Text style={{ color: theme.text, fontWeight: "900" }}>Reset</Text>
            </Pressable>

            <Pressable onPress={save} disabled={saving} style={{ paddingHorizontal: 12, justifyContent: "center", borderRadius: 14, backgroundColor: saving ? "rgba(59,130,246,0.10)" : "rgba(59,130,246,0.18)", borderWidth: 1, borderColor: "rgba(59,130,246,0.35)" }}>
              <Text style={{ color: theme.text, fontWeight: "900" }}>{saving ? "..." : "Save"}</Text>
            </Pressable>
          </View>

          {!!toast && <Text style={{ color: theme.muted, marginTop: 10, fontWeight: "800" }}>{toast}</Text>}
        </View>

        <View style={{ backgroundColor: theme.panel, borderRadius: 14, borderWidth: 1, borderColor: theme.stroke, padding: 12, gap: 8 }}>
          <Text style={{ color: theme.text, fontWeight: "900" }}>Historique (3 derniers)</Text>
          {history.length === 0 ? (
            <Text style={{ color: theme.muted }}>Aucune lineup sauvegardée localement.</Text>
          ) : (
            history.map((item) => {
              const filled = slots.filter((slot) => !!item.picked[slot]).length;
              const historyCards = slots.map((slot) => item.picked[slot]).filter(Boolean) as string[];
              const gkOk = historyCards.some((slug) => {
                const card = galleryByKey.get(slug);
  
  return cardPosCode(card) === "GK";
              });
  
  return (
                <Pressable key={item.id} onPress={() => loadHistory(item)} style={{ borderRadius: 12, borderWidth: 1, borderColor: theme.stroke, padding: 10, backgroundColor: "rgba(255,255,255,0.02)" }}>
                  <Text style={{ color: theme.text, fontWeight: "900" }} numberOfLines={1}>
                    {item.name} • {SCENARIO_LABEL[item.scenario]}
                  </Text>
                  <Text style={{ color: theme.muted, marginTop: 3 }}>
                    {new Date(item.createdAt).toLocaleString()} • {filled}/5, {gkOk ? "GK OK" : "Pas de GK"}
                  </Text>
                </Pressable>
              );
            })
          )}
        </View>

        <Text style={{ color: theme.muted }}>Liste filtrée: {activeSlot} • sélection active {pickedSlugs.length}/5</Text>
        {filteredGalleryState.isFallback && (
          <Text style={{ color: theme.warn, marginTop: 4, fontWeight: "800" }}>
            ⚠️ Fallback: aucune carte compatible détectée, affichage complet
          </Text>
        )}
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 320 }} /* XS_PLAY_SCROLL_PAD_V2 */>
        <View style={{ padding: 16, gap: 10 }}>
          {filteredGalleryState.items.length === 0 ? (
            <View style={{ padding: 16 }}>
              <Text style={{ color: theme.muted }}>
                Aucune carte compatible détectée pour ce slot (ou galerie vide). Va dans “Mes cartes” pour charger ta galerie.
              </Text>
            </View>
          ) : (
            (filteredGalleryState.items as any[]).map((item: any) => {
              const key = cardKey(item);
              const pos = cardPosCode(item);
  
  return (
                <View key={key} style={{ gap: 4 }}>
                  <CardListItem card={item} selected={pickedSlugs.includes(key)} onPress={() => {
                    // XS_PLAY_ASSIGN_COMPAT_SLOT_OK_V1
                    const wantSlot = activeSlot; // "GK" | "DEF" | "MID" | "FWD" | "FLEX"
                    let forcedPos = pos;

                    try {
                      if (wantSlot && wantSlot !== "FLEX") {
                        const cand = xsPosCandidatesV2(item);
                        if (Array.isArray(cand) && cand.includes(wantSlot)) {
                          forcedPos = wantSlot; // force assign sur le slot filtré si compatible
                        }
                      }
                    } catch {}

                    tryAdd(key, forcedPos);
                  }} />
                  {pos === "UNK" && <Text style={{ color: theme.warn, fontSize: 12 }}>position inconnue</Text>}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
          {/* XS_PLAY_SLOT_PICKER_MODAL_V1 UI (BEGIN) */}
      <Modal visible={xsPickerOpen} transparent animationType="slide" onRequestClose={xsClosePicker}>
        <View style={{ flex: 1, justifyContent: "flex-end" }}>
        {/* XS_PLAY_PICKER_BACKDROP_FIX_V1 */}
        <Pressable onPress={xsClosePicker} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.55)" }} />
        <View style={{ maxHeight: "75%", backgroundColor: "rgba(18,18,18,0.98)", borderTopLeftRadius: 18, borderTopRightRadius: 18, borderWidth: 1, borderColor: theme.stroke, padding: 14 }}>
            {(() => {
              const st = xsPickerListForSlot(xsPickerSlot);
  
  return (
                <View>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <Text style={{ color: theme.text, fontWeight: "900", fontSize: 16 }}>
                      Sélection {xsPickerSlot}
                    </Text>
                    <Pressable onPress={xsClosePicker} style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: theme.stroke }}>
                      <Text style={{ color: theme.text, fontWeight: "900" }}>Fermer</Text>
                    </Pressable>
                  </View>

                  {st.isFallback && (
                    <Text style={{ color: theme.muted, marginTop: 6 }}>
                      ⚠️ Aucune carte strictement compatible détectée — affichage fallback.
                    </Text>
                  )}

                  <View style={{ marginTop: 10 }}>
                    <TextInput
                      value={xsPickerQ}
                      onChangeText={setXsPickerQ}
                      placeholder="Rechercher joueur / club / saison / rareté…"
                      placeholderTextColor={theme.muted}
                      style={{ color: theme.text, borderRadius: 12, borderWidth: 1, borderColor: theme.stroke, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: "rgba(255,255,255,0.04)" }}
                    />
                  </View>

                  <Text style={{ color: theme.muted, marginTop: 10 }}>
                    {st.items.length} carte{st.items.length > 1 ? "s" : ""} disponible{st.items.length > 1 ? "s" : ""}
                  </Text>

                  <View style={{ marginTop: 10 }}>
                    <FlatList
                      data={st.items}
                      keyExtractor={(it) => cardKey(it)}
                      numColumns={2}
                      columnWrapperStyle={{ gap: 10 }}
                      contentContainerStyle={{ paddingBottom: 12, gap: 10 }}
                      renderItem={({ item }) => (
                        <Pressable
                          onPress={() => {
                            /* XS_PLAY_PICKER_TAP_PROBE_V1 */
try {
  const k = cardKey(item);
  const p = cardPosCode(item);
  console.log("[XS_PICKER_TAP]", xsPickerSlot, k, p);
  console.log("[XS_PICKER_SELECT_V2] try", xsPickerSlot, k, p); // XS_PLAY_PICKER_FORCE_SELECT_CLOSE_V2
  console.log("[XS_PICKER_SELECT] slot=", xsPickerSlot, "key=", k, "pos=", p);
/* XS_PICKER_OK_V3 */
const ok = (xsTryAddToSlot as any)(xsPickerSlot, k, p);
try { console.log("[XS_PICKER_OK_V3] ok=", ok, "slot=", xsPickerSlot, "key=", k, "pos=", p); } catch {}
  /* XS_PICKER_CLOSE_ONLY_ON_OK_V4 */
  if (ok === false) {
    try { console.log("[XS_PICKER_CLOSE_V4] blocked -> keep open", { slot: xsPickerSlot, key: k, pos: p }); } catch {}
  } else {
  console.log("[XS_PICKER_SELECT_V2] ok -> close", xsPickerSlot, k, p);
  xsClosePicker();
  }} catch (e) {
  console.log("[XS_PICKER_SELECT_V2] ERROR", e);
}
try { showToast(`TAP PICKER ${xsPickerSlot}`); } catch {}
                          }}
                          style={{ flex: 1 }}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                          <View pointerEvents="none" style={{ flex: 1 }}>
                            <CardListItem
                              card={item}
                              selected={false}
                              onPress={() => null}
                            />
                          </View>
                        </Pressable>
                      )}
                      style={{ maxHeight: 420 }}
                    />
                  </View>
                </View>
              );
            })()}
          </View>
        </View>
      </Modal>
      {/* XS_PLAY_SLOT_PICKER_MODAL_V1 UI (END) */}
</SafeAreaView>
  );
}

































