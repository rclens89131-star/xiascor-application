/* XS_HIDE_COMMON_CARDS_V1D */
/* XS_GALLERY_RARITY_UNKNOWN_V1 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "../api";

type Card = any;

type Options = {
  identifier: string;
  first?: number;
};
/* XS_CARD_PRICE_WIRING_APP_V1 (BEGIN)
   Normalise le payload prix backend pour garder un contrat stable côté UI.
*/
type CardPrice = {
  floorEur: number | null;
  lastSaleEur: number | null;
  avg7dEur: number | null;
  avg30dEur: number | null;
  asOf: string | null;
  source?: string | null;
  warning?: string | null;
};

function toFiniteOrNull(v: unknown): number | null {
  if (typeof v !== "number") return null;
  return Number.isFinite(v) ? v : null;
}

function normalizeCardPrice(card: any): CardPrice | null {
  const direct = card?.price && typeof card.price === "object" ? card.price : null;

  const floorEur =
    toFiniteOrNull(direct?.floorEur) ??
    toFiniteOrNull(card?.floorEur) ??
    toFiniteOrNull(card?.floorPriceEur) ??
    toFiniteOrNull(card?.floorPrice) ??
    null;

  const lastSaleEur =
    toFiniteOrNull(direct?.lastSaleEur) ??
    toFiniteOrNull(card?.lastSaleEur) ??
    toFiniteOrNull(card?.lastSalePriceEur) ??
    toFiniteOrNull(card?.lastSalePrice) ??
    null;

  const avg7dEur = toFiniteOrNull(direct?.avg7dEur) ?? toFiniteOrNull(card?.avg7dEur) ?? null;
  const avg30dEur = toFiniteOrNull(direct?.avg30dEur) ?? toFiniteOrNull(card?.avg30dEur) ?? null;

  const asOfRaw = direct?.asOf ?? card?.priceAsOf ?? null;
  const asOf = typeof asOfRaw === "string" && asOfRaw.trim() ? asOfRaw : null;

  const source = typeof direct?.source === "string" ? direct.source : null;
  const warning = typeof direct?.warning === "string" ? direct.warning : null;

  const hasUsefulValue = floorEur !== null || lastSaleEur !== null || avg7dEur !== null || avg30dEur !== null;
  if (!hasUsefulValue && !asOf && !source && !warning) return null;

  return { floorEur, lastSaleEur, avg7dEur, avg30dEur, asOf, source, warning };
}
/* XS_CARD_PRICE_WIRING_APP_V1 (END) */
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

              // XS_FIX_GALLERY_URL_COMMENT_BREAK_V1:
      // - Ne JAMAIS injecter de commentaire dans une template string URL (ça casse l’URL)
      // - Endpoint: /public-user-cards-page (page1)
            // XS_APP_GALLERY_FORCE_HIDECOMMON_QUERY_V1B:
      // - Demande au backend de NE PAS renvoyer les commons => pas de fetch inutile en arrière-plan
      // - Nécessite backend support ?hideCommon=1 (OK)
      qs.set("hideCommon", "1");
      const r = await apiFetch<any>(`/public-user-cards-page?${qs.toString()}`);
        const rawCards: Card[] = Array.isArray(r?.cards)
          ? r.cards.map((card: any) => {
              const price = normalizeCardPrice(card);
              return price ? { ...card, price } : card;
            })
          : [];
        const filtered = rawCards.filter(isAllowedRarity);
        // XS_HIDE_COMMON_CARDS_V1D (BEGIN)
        const xsDeriveRarityFromSlug = (slug?: string): string => {
          const s = String(slug || "").toLowerCase();
          if (s.includes("-super_rare-") || s.includes("-super-rare-") || s.includes("-superrare-")) return "super_rare";
          if (s.includes("-unique-")) return "unique";
          if (s.includes("-rare-")) return "rare";
          if (s.includes("-limited-")) return "limited";
          if (s.includes("-common-")) return "common";
          return "unknown";
        };
        
        const xsFiltered = (filtered || [])
          .map((card: any) => {
            const existing = card?.rarity?.slug;
            if (existing) return card;
            const derived = xsDeriveRarityFromSlug(card?.slug);
            return { ...card, rarity: { ...(card?.rarity || {}), slug: derived } };
          })
          .filter((card: any) => String(card?.rarity?.slug || "unknown") !== "common");
        // XS_HIDE_COMMON_CARDS_V1D (END)
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
                // XS_GALLERY_NORMALIZE_TO_SORARECARD_V1 (BEGIN)
        const xsNormalizePos = (raw: any): "GK" | "DEF" | "MID" | "FWD" | "UNK" => {
          const s = String(raw || "").toUpperCase().trim();
          if (s === "GK" || s.includes("GOAL")) return "GK";
          if (s === "DEF" || s.includes("DEF")) return "DEF";
          if (s === "MID" || s.includes("MID")) return "MID";
          if (s === "FWD" || s.includes("FWD") || s.includes("FOR")) return "FWD";
          // Sorare enums possibles: "Goalkeeper" "Defender" "Midfielder" "Forward"
          if (s.includes("KEEP")) return "GK";
          if (s.includes("DEFEN")) return "DEF";
          if (s.includes("MIDFI")) return "MID";
          if (s.includes("FORWA")) return "FWD";
          return "UNK";
        };

        const xsFirstAnyPos = (obj: any): any =>
          obj?.anyPosition ??
          (Array.isArray(obj?.anyPositions) ? obj?.anyPositions?.[0] : null) ??
          obj?.playerPosition ??
          obj?.position ??
          obj?.card?.anyPosition ??
          (Array.isArray(obj?.card?.anyPositions) ? obj?.card?.anyPositions?.[0] : null) ??
          obj?.card?.playerPosition ??
          obj?.card?.position ??
          obj?.player?.anyPosition ??
          (Array.isArray(obj?.player?.anyPositions) ? obj?.player?.anyPositions?.[0] : null) ??
          obj?.player?.playerPosition ??
          obj?.player?.position ??
          obj?.card?.player?.anyPosition ??
          (Array.isArray(obj?.card?.player?.anyPositions) ? obj?.card?.player?.anyPositions?.[0] : null) ??
          obj?.card?.player?.playerPosition ??
          obj?.card?.player?.position ??
          null;

        const xsToSorareCard = (c: any) => {
          const id = String(c?.id ?? c?.card?.id ?? c?.slug ?? c?.card?.slug ?? "");
          const slug = String(c?.slug ?? c?.card?.slug ?? id);
          const rarity = String(getRarity(c) || "unknown").toLowerCase();
          const rawPos = xsFirstAnyPos(c);
          const positionRaw = rawPos != null ? String(rawPos) : null;
          const position = xsNormalizePos(rawPos);

          const playerName =
            String(
              c?.playerName ??
              c?.player?.displayName ??
              c?.player?.name ??
              c?.card?.playerName ??
              c?.card?.player?.displayName ??
              c?.card?.player?.name ??
              c?.name ??
              "—"
            );

          const playerSlug =
            c?.playerSlug ??
            c?.player?.slug ??
            c?.card?.playerSlug ??
            c?.card?.player?.slug ??
            null;

          const teamName =
            c?.teamName ??
            c?.team?.name ??
            c?.club?.name ??
            c?.activeClub?.name ??
            c?.card?.teamName ??
            c?.card?.team?.name ??
            c?.card?.club?.name ??
            c?.card?.activeClub?.name ??
            null;

          const teamSlug =
            c?.teamSlug ??
            c?.team?.slug ??
            c?.club?.slug ??
            c?.activeClub?.slug ??
            c?.card?.teamSlug ??
            c?.card?.team?.slug ??
            c?.card?.club?.slug ??
            c?.card?.activeClub?.slug ??
            null;

          const pictureUrl =
            String(
              c?.pictureUrl ??
              c?.picture ??
              c?.imageUrl ??
              c?.card?.pictureUrl ??
              c?.card?.picture ??
              c?.card?.imageUrl ??
              c?.player?.pictureUrl ??
              c?.player?.picture ??
              c?.card?.player?.pictureUrl ??
              ""
            );

          const avatarUrl =
            c?.avatarUrl ??
            c?.player?.avatarUrl ??
            c?.card?.avatarUrl ??
            c?.card?.player?.avatarUrl ??
            null;

          const seasonYear =
            typeof c?.seasonYear === "number" ? c.seasonYear :
            typeof c?.season?.year === "number" ? c.season.year :
            null;

          const season =
            c?.season ?? c?.season?.name ?? null;

          return {
            id: id || slug,
            slug: slug || id,
            rarity: rarity,
            seasonYear,
            season,
            playerName,
            playerSlug,
            teamName,
            teamSlug,
            position,
            positionRaw,
            pictureUrl,
            avatarUrl,
          };
        };

        const xsNormalized = (xsFiltered || []).map(xsToSorareCard);
        // XS_GALLERY_NORMALIZE_TO_SORARECARD_V1 (END)

        setCards((prev) => (mode === "reset" ? uniqMerge([], xsNormalized) : uniqMerge(prev, xsNormalized)));

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




