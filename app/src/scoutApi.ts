import { apiFetch } from "./api";

export type ScoutOffer = {
  offerId: string;
  slug: string;
  rarity?: string | null;
  seasonYear?: number | null;
  pictureUrl?: string | null;
  eur?: number | null;
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
}) {
  const qs = new URLSearchParams();
  qs.set("first", String(params.first ?? 20));
  if (params.after) qs.set("after", params.after);
  if (params.eurOnly) qs.set("eurOnly", "1");
  if (params.maxEur != null && !Number.isNaN(params.maxEur)) qs.set("maxEur", String(params.maxEur));

  return apiFetch<ScoutOffersResponse>(`/scout/cards?${qs.toString()}`);
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
