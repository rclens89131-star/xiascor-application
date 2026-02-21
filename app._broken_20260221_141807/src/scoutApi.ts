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

/* XS_MYCARDS_FUNCS_PORTED_V1_BEGIN */
export async function myCardsPage(deviceId: string, opts?: { first?: number; after?: string }

export async function myCardsStatus(deviceId: string): Promise<any> {
  const id = String(deviceId || "").trim();
  if (!id) return { ok: false, error: "deviceId manquant" };
  const qs = new URLSearchParams();
  qs.set("deviceId", id);
  return apiFetch<any>(`/my-cards/status?${qs.toString()}`);
}

export async function myCardsSync(deviceId: string, opts?: MyCardsSyncOpts){
  const id = String(deviceId || "").trim();
  if(!id) throw new Error("missing deviceId");
  const aud = String((opts && opts.jwtAud) || "sorare:com");

  // XS_MYCARDS_SYNC_QS_V1: backend lit surtout la query string (deviceId/opts).
  const first = (opts && opts.first != null) ? opts.first : 100;
  const maxPages = (opts && opts.maxPages != null) ? opts.maxPages : 120;
  const maxCards = (opts && opts.maxCards != null) ? opts.maxCards : 6000;
  const sleepMs = (opts && opts.sleepMs != null) ? opts.sleepMs : 200;

  const qs = new URLSearchParams({
    deviceId: id,
    jwtAud: aud,
    first: String(first),
    maxPages: String(maxPages),
    maxCards: String(maxCards),
    sleepMs: String(sleepMs),
  });
  const url = `${BASE_URL}/my-cards/sync?${qs.toString()}`;

  // On garde aussi le body pour compat (si backend évolue) — mais la source de vérité = query string.
  const body = { deviceId: id, jwtAud: aud, first, maxPages, maxCards, sleepMs };

  // XS_MYCARDS_SYNC_PROBE_V1: log URL réelle appelée (debug iPhone)
  try { console.log("[myCardsSync] BASE_URL=", BASE_URL); } catch {}
  try { console.log("[myCardsSync] url=", url); } catch {}
  const r = await fetch(url, { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(body) });
  const j = await r.json().catch(()=>null);
  if(!r.ok) throw new Error((j && (j.error || j.message)) ? String(j.error || j.message) : `HTTP ${r.status}`);
  return j as { ok: boolean; count?: number; cachePath?: string; meta?: MyCardsMeta };
}
/* XS_MYCARDS_FUNCS_PORTED_V1_END */
