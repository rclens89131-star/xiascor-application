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

/* ============================
   XS_JWT_API_HELPERS_V1_BEGIN
   Objectif:
   - jwtLogin(baseUrl, deviceId, email, password)
   - jwtStatus(baseUrl, deviceId)
   Notes:
   - Le token JWT reste côté backend (jamais renvoyé)
   ============================ */

export async function jwtLogin(baseUrl: string, deviceId: string, email: string, password: string, aud?: string){
  const url = `${baseUrl}/auth/jwt/login`;
  const r = await fetch(url, {
    method: "POST",
    headers: { "content-type":"application/json" },
    body: JSON.stringify({ deviceId, email, password, aud })
  });
  const j = await r.json().catch(()=> ({}));
  if(!r.ok){
    const msg = (j && (j.error || j.message)) ? (j.error || j.message) : `http_${r.status}`;
    throw new Error(`jwtLogin:${msg}`);
  }
  return j as any;
}

export async function jwtStatus(baseUrl: string, deviceId: string){
  const url = `${baseUrl}/auth/jwt/status?deviceId=${encodeURIComponent(deviceId)}`;
  const r = await fetch(url);
  const j = await r.json().catch(()=> ({}));
  if(!r.ok){
    const msg = (j && (j.error || j.message)) ? (j.error || j.message) : `http_${r.status}`;
    throw new Error(`jwtStatus:${msg}`);
  }
  return j as any;
}

/* XS_JWT_API_HELPERS_V1_END */


/* XS_MY_CARDS_API_V1_BEGIN
   Purpose:
   - Client NEVER calls Sorare GraphQL directly.
   - Client reads backend cache via /my-cards and triggers backend sync via /my-cards/sync.
*/
export type MyCardsMeta = {
  model?: string;
  deviceId?: string;
  userSlug?: string | null;
  nickname?: string | null;
  fetchedAt?: string;
  count?: number;
  pages?: number;
  jwtAud?: string | null;
};

export type MyCardItem = {
  slug?: string;
  pictureUrl?: string;
  rarityTyped?: string;
  seasonYear?: number;
  serialNumber?: number;
  // optional extras (backend normalizer may add):
  rarity?: string;
  season?: { year?: number };
};

export async function myCardsGet(deviceId: string){
  const id = String(deviceId || "").trim();
  if(!id) throw new Error("missing deviceId");
  const url = `${BASE_URL}/my-cards?deviceId=${encodeURIComponent(id)}`;
  const r = await fetch(url);
  const j = await r.json().catch(()=>null);
  if(!r.ok) throw new Error((j && (j.error || j.message)) ? String(j.error || j.message) : `HTTP ${r.status}`);
  return j as { ok: boolean; cached?: boolean; meta?: MyCardsMeta; cards?: MyCardItem[]; pageInfo?: any };
}

export type MyCardsSyncOpts = {
  jwtAud?: string;
  first?: number;
  maxPages?: number;
  maxCards?: number;
  sleepMs?: number;
};

export async function myCardsSync(deviceId: string, opts?: MyCardsSyncOpts){
  const id = String(deviceId || "").trim();
  if(!id) throw new Error("missing deviceId");
  const aud = String((opts && opts.jwtAud) || "sorare:com");
  const url = `${BASE_URL}/my-cards/sync?jwtAud=${encodeURIComponent(aud)}`;
  const body = {
    deviceId: id,
    jwtAud: aud,
    first: (opts && opts.first != null) ? opts.first : 100,
    maxPages: (opts && opts.maxPages != null) ? opts.maxPages : 120,
    maxCards: (opts && opts.maxCards != null) ? opts.maxCards : 6000,
    sleepMs: (opts && opts.sleepMs != null) ? opts.sleepMs : 200,
  };
  const r = await fetch(url, { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(body) });
  const j = await r.json().catch(()=>null);
  if(!r.ok) throw new Error((j && (j.error || j.message)) ? String(j.error || j.message) : `HTTP ${r.status}`);
  return j as { ok: boolean; count?: number; cachePath?: string; meta?: MyCardsMeta };
}
/* XS_MY_CARDS_API_V1_END */

