import { apiFetch } from "./api";
/* XS_SCOUT_BASE_URL_V1 */
const BASE_URL =
  process.env.EXPO_PUBLIC_BASE_URL ??
  "http://127.0.0.1:3000";


export type ScoutOffer = {
  offerId: string;
  slug: string;
  rarity?: string | null;
  seasonYear?: number | null;
  pictureUrl?: string | null;
  eur?: number | null;
  priceText?: string | null; // XS_ALLOW_UNKNOWN_PRICES_APP_V1
};
export type PageInfo = {
  hasNextPage: boolean;
  endCursor?: string | null;
};
export type ScoutOffersResponse = {
  items: ScoutOffer[];
  pageInfo?: PageInfo;
  note?: string;
};
export async function fetchScoutCards(params: {
  first?: number;
  after?: string | null;
  eurOnly?: boolean;
  maxEur?: number | null;
  ts?: number;
  signal?: AbortSignal;
}) {
  const qs = new URLSearchParams();
  qs.set("first", String(params.first ?? 20));
  if (params.after) qs.set("after", params.after);
  if (params.eurOnly) {
    qs.set("eurOnly", "1");
    qs.set("allowUnknownPrices", "1"); // XS_ALLOW_UNKNOWN_PRICES_APP_V1
  }
  if (params.maxEur != null && !Number.isNaN(params.maxEur)) qs.set("maxEur", String(params.maxEur));
  qs.set("ts", String(params.ts ?? Date.now()));
  return apiFetch<ScoutOffersResponse>(`/scout/cards?${qs.toString()}`, { signal: params.signal });
}
// Watchlist Scout
export type WatchItem = { slug: string; addedAt: string };
export async function getScoutWatchlist() {
  return apiFetch<{ items: WatchItem[] }>(`/scout/watchlist`);
}
export async function addScoutWatchlist(slug: string) {
  return apiFetch<{ ok: boolean; items: WatchItem[] }>(`/scout/watchlist`, {
    method: "POST",
    body: JSON.stringify({ slug }),
  });
}
export async function removeScoutWatchlist(slug: string) {
  return apiFetch<{ ok: boolean; items: WatchItem[] }>(`/scout/watchlist`, {
    method: "DELETE",
    body: JSON.stringify({ slug }),
  });
}

// Alertes Scout
export type AlertItem = { id: string; slug: string; maxEur: number; createdAt: string; isEnabled: boolean };
export async function getScoutAlerts() {
  return apiFetch<{ items: AlertItem[] }>(`/scout/alerts`);
}
export async function addScoutAlert(slug: string, maxEur: number) {
  return apiFetch<{ ok: boolean; items: AlertItem[] }>(`/scout/alerts`, {
    method: "POST",
    body: JSON.stringify({ slug, maxEur }),
  });
}
export async function toggleScoutAlert(id: string, isEnabled: boolean) {
  return apiFetch<{ ok: boolean; items: AlertItem[] }>(`/scout/alerts`, {
    method: "PATCH",
    body: JSON.stringify({ id, isEnabled }),
  });
}
export async function deleteScoutAlert(id: string) {
  return apiFetch<{ ok: boolean; items: AlertItem[] }>(`/scout/alerts`, {
    method: "DELETE",
    body: JSON.stringify({ id }),
  });
}






/* XS_SCOUT_RECRUTER_API_V1: helpers for /scout/recruter and /scout/player/:slug */
export type RecruiterRow = {
  playerSlug: string;
  playerName?: string | null;
  position?: string | null;
  activeClub?: { name?: string | null; slug?: string | null } | null;
  minPriceEur?: number | null;
  offerCount?: number | null;
  leagues?: string[] | null;
};
export type RecruiterPlayer = {
  playerSlug: string;
  playerName?: string | null;
  position?: string | null;
  activeClub?: { name?: string | null; slug?: string | null } | null;
  offersByLeague?: Record<string, any[]> | null;
  offers?: any[] | null;
};
export async function scoutRecruter(params?: { first?: number; q?: string }) {
  const qs = new URLSearchParams();
  qs.set("first", String(params?.first ?? 40));
  if (params?.q) qs.set("q", params.q);

  const url = `${BASE_URL}/scout/recruter?${qs.toString()}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`scoutRecruter HTTP ${r.status}`);
  return (await r.json()) as { items: RecruiterRow[]; meta?: any };
}
export async function scoutPlayer(slug: string, params?: { first?: number }) {
  const qs = new URLSearchParams();
  qs.set("first", String(params?.first ?? 50));

  const url = `${BASE_URL}/scout/player2/${encodeURIComponent(slug)}?${qs.toString()}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`scoutPlayer HTTP ${r.status}`);
  return (await r.json()) as RecruiterPlayer;
}








/* XS_SCOUT_PLAYER2_API_V2_BEGIN */
export async function scoutPlayer2(
  slug: string,
  params?: { first?: number; allowUnknownPrices?: boolean }
) {
  const qs = new URLSearchParams();
  if (params?.first != null) qs.set("first", String(params.first));
  if (params?.allowUnknownPrices) qs.set("allowUnknownPrices", "1");
  const tail = qs.toString() ? `?${qs.toString()}` : "";
  return apiFetch<any>(`/scout/player2/${encodeURIComponent(String(slug || ""))}${tail}`);
}
/* XS_SCOUT_PLAYER2_API_V2_END */

