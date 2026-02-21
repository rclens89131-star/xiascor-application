import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "../api";

type Card = any;

type Options = {
  identifier: string;
  first?: number;
};

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
        const filtered = rawCards.filter((c) => String(c?.rarity || "").toLowerCase() !== "common");

        setCards((prev) => (mode === "reset" ? uniqMerge([], filtered) : uniqMerge(prev, filtered)));

        const pi = r?.pageInfo || {};
        hasNextRef.current = !!pi.hasNextPage;
        cursorRef.current = pi.endCursor ?? null;
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
  const loadMore = useCallback(() => fetchPage("more"), [fetchPage]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { cards, loading, loadingMore, error, reload, loadMore };
}
