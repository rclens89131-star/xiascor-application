import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "../api";

type Card = any;

type Options = {
  identifier: string;
  first?: number;
};













function normalizeRarity(v: unknown): string {
  const s = typeof v === "string" ? v.toLowerCase().trim() : "";
  return s
    .replace(/\s+/g, "_")
    .replace(/-+/g, "_")
    .replace(/__+/g, "_");
}

function rarityFromSlug(slug: unknown): string {
  const s = typeof slug === "string" ? slug.toLowerCase() : "";
  if (s.includes("-unique-")) return "unique";
  if (s.includes("-super-rare-") || s.includes("-super_rare-") || s.includes("superrare")) return "super_rare";
  if (s.includes("-rare-")) return "rare";
  if (s.includes("-limited-")) return "limited";
  if (s.includes("-common-")) return "common";
  return "";
}

function getRarity(card: any): string {
  if (!card || typeof card !== "object") return "";

  const fromTyped = normalizeRarity(card?.rarityTyped);
  if (fromTyped) return fromTyped;

  const rarity = card?.rarity;
  if (typeof rarity === "string") return normalizeRarity(rarity);

  const fromName = normalizeRarity(rarity?.name);
  if (fromName) return fromName;

  const fromSlug = normalizeRarity(rarity?.slug);
  if (fromSlug) return fromSlug;

  const fromDisplay = normalizeRarity(rarity?.displayName);
  if (fromDisplay) return fromDisplay;

  return rarityFromSlug(card?.slug);
}

function isAllowedRarity(card: any): boolean {
  const r = getRarity(card);
  if (!r) return false;

  // variantes cheloues
  if (r === "superrare") return true;

  return r === "limited" || r === "rare" || r === "super_rare" || r === "unique";
}

function uniqMerge(prev: Card[], next: Card[]) {
  const map = new Map<string, Card>();

  const put = (c: Card) => {
    const key = String(c?.slug || c?.id || "").trim();
    if (!key) return;
    map.set(key, c);
  };

  prev.forEach(put);
  next.forEach(put);

  return Array.from(map.values());
}

export function useGallery({ identifier, first = 25 }: Options) {
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cursorRef = useRef<string | null>(null);
  const hasNextRef = useRef<boolean>(false);
  const inFlightRef = useRef<"reset" | "more" | null>(null);

  const cleanIdentifier = useMemo(() => String(identifier || "").trim(), [identifier]);

  const fetchPage = useCallback(
    async (mode: "reset" | "more") => {
      if (!cleanIdentifier) {
        setError("Identifier vide");
        setCards([]);
        cursorRef.current = null;
        hasNextRef.current = false;
        return;
      }

      // évite doubles appels (FlatList onEndReached peut spam)
      if (inFlightRef.current) return;

      if (mode === "more" && !hasNextRef.current) return;

      inFlightRef.current = mode;

      if (mode === "reset") {
        setLoading(true);
        setError(null);
        cursorRef.current = null;
        hasNextRef.current = false;
      } else {
        setLoadingMore(true);
      }

      try {
        const qs = new URLSearchParams();
        qs.set("identifier", cleanIdentifier);
        qs.set("first", String(first));
        if (mode === "more" && cursorRef.current) qs.set("after", cursorRef.current);

        const r = await apiFetch<any>(`/public-user-cards-page?${qs.toString()}`);

        const rawCards: Card[] = Array.isArray(r?.cards) ? r.cards : [];
        const filtered = rawCards.filter(isAllowedRarity);
        // Allowlist (Limited/Rare/Super Rare/Unique)
        // Debug rareté (dans logs Metro)
        try {
          const counts = rawCards.reduce((acc: any, c: any) => {
            const r = getRarity(c) || "unknown";
            acc[r] = (acc[r] || 0) + 1;
            return acc;
          }, {});
          console.log("[useGallery] rarityCounts:", counts);
          const s = rawCards[0];
          console.log("[useGallery] sample.rarity fields:", {
            rarityTyped: s?.rarityTyped,
            rarityTier: s?.rarityTier,
            rarity: s?.rarity,
            rarityName: s?.rarity?.name,
            raritySlug: s?.rarity?.slug,
            rarityDisplayName: s?.rarity?.displayName,
          });
        } catch {}

        // Fallback: si allowlist => 0 mais on a des cartes,
        // alors on cache seulement les commons (sinon écran vide)
        if (filtered.length === 0 && rawCards.length > 0) {
          console.warn("[useGallery] allowlist filtered 0 -> fallback to non-common");

        }
        setCards((prev) => (mode === "reset" ? uniqMerge([], filtered) : uniqMerge(prev, filtered)));

        const pi = r?.pageInfo || {};
        // XS_FIX_GALLERY_PAGINATION_STOP_ON_NULL_CURSOR_V1 (BEGIN)
        cursorRef.current = pi.endCursor ?? null;
        hasNextRef.current = !!pi.hasNextPage && !!cursorRef.current;
        // XS_FIX_GALLERY_PAGINATION_STOP_ON_NULL_CURSOR_V1 (END)
      } catch (e: any) {
        setError(e?.message ?? "Erreur chargement");
        if (mode === "reset") setCards([]);
        hasNextRef.current = false;
      } finally {
        inFlightRef.current = null;
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [cleanIdentifier, first]
  );

  const reload = useCallback(() => fetchPage("reset"), [fetchPage]);
  /* XS_FIX_GALLERY_LOADMORE_GUARD_V1
     - Stop net si pas de page suivante OU cursor null
  */
  const loadMore = useCallback(() => {
    if (!hasNextRef.current || !cursorRef.current) return;
    fetchPage("more");
  }, [fetchPage]);
  /* XS_FIX_GALLERY_LOADMORE_GUARD_V1_END */

  useEffect(() => {
    reload();
  }, [reload]);

  return { cards, loading, loadingMore, error, reload, loadMore };
}










