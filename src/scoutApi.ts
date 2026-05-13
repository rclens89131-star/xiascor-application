import { apiFetch } from "./api";
/* XS_SCOUT_BASE_URL_V1 */
const AUTH_BASE_URL =
process.env.EXPO_PUBLIC_AUTH_BASE_URL ??
process.env.EXPO_PUBLIC_BASE_URL ??
"https://xiascor-backend-tssdy62zqa-ez.a.run.app"; // XS_MYCARDS_AUTH_BASE_V2
const BASE_URL =
  process.env.EXPO_PUBLIC_BASE_URL ??
  "https://xiascor-backend-tssdy62zqa-ez.a.run.app";

const XS_FRONT_RECRUTER_NEW_BACKEND_MARKER_V1 = "XS_FRONT_RECRUTER_NEW_BACKEND_V1";
const XS_FRONT_RECRUTER_BOARD_MARKER_V1 = "XS_FRONT_RECRUTER_BOARD_V1";

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

export type RecruterOffer = {
  id?: string | null;
  offerId?: string | null;
  cardId?: string | null;
  cardSlug?: string | null;
  playerSlug?: string | null;
  playerName?: string | null;
  pictureUrl?: string | null;
  rarity?: string | null;
  season?: number | null;
  serialNumber?: number | null;
  position?: string | null;
  clubName?: string | null;
  clubSlug?: string | null;
  leagueName?: string | null;
  leagueSlug?: string | null;
  price?: {
    eur?: number | null;
    eurCents?: number | null;
    text?: string | null;
    wei?: string | null;
  } | null;
  seller?: any;
  raw?: any;
};

export type RecruterPlayer = {
  slug: string;
  displayName?: string | null;
  pictureUrl?: string | null;
  position?: string | null;
  clubName?: string | null;
  clubSlug?: string | null;
  leagueName?: string | null;
  leagueSlug?: string | null;
  cardsCount?: number | null;
  minEur?: number | null;
  rarities?: string[] | null;
  playerSlug?: string | null;
  playerName?: string | null;
  activeClubName?: string | null;
  activeClub?: { name?: string | null; slug?: string | null } | null;
  minPriceEur?: number | null;
  offerCount?: number | null;
  offersCount?: number | null;
  leagues?: string[] | null;
};

export type RecruterLeague = {
  slug: string;
  name?: string | null;
  playersCount?: number | null;
  cardsCount?: number | null;
  minEur?: number | null;
};

export type RecruterIndexResponse = {
  ok?: boolean;
  marker?: string | null;
  fromCache?: boolean;
  stale?: boolean;
  warning?: string | null;
  fetchedAt?: string | null;
  ageMs?: number | null;
  summary?: {
    offersCount?: number;
    playersCount?: number;
    leaguesCount?: number;
    pagesFetched?: number;
  } | null;
};

export type RecruterLeaguesResponse = {
  ok?: boolean;
  fromIndex?: boolean;
  indexFetchedAt?: string | null;
  count?: number;
  items: RecruterLeague[];
};

export type RecruterPlayersResponse = {
  ok?: boolean;
  league?: string | null;
  count?: number;
  items: RecruterPlayer[];
};

export type RecruterOffersResponse = {
  ok?: boolean;
  count?: number;
  fromCache?: boolean;
  pageInfo?: PageInfo;
  items: RecruterOffer[];
};

export type RecruterPlayerCardsResponse = {
  ok?: boolean;
  playerSlug?: string;
  count?: number;
  items: RecruterOffer[];
  player?: {
    slug?: string | null;
    displayName?: string | null;
    position?: string | null;
    activeClub?: { name?: string | null; slug?: string | null } | null;
    pictureUrl?: string | null;
  } | null;
  offers?: any[];
};

export type RecruterCardResponse = {
  ok?: boolean;
  item?: RecruterOffer | null;
};

function xsRecruterTailV1(qs: URLSearchParams) {
  const s = qs.toString();
  return s ? `?${s}` : "";
}

function xsRecruterNormV1(v: unknown) {
  return String(v ?? "").trim().toLowerCase();
}

function xsRecruterPlayerCompatV1(item: RecruterPlayer): RecruterPlayer {
  const slug = String(item?.slug || item?.playerSlug || "").trim();
  const displayName = item?.displayName ?? item?.playerName ?? slug;
  const clubName = item?.clubName ?? item?.activeClubName ?? item?.activeClub?.name ?? null;
  const clubSlug = item?.clubSlug ?? item?.activeClub?.slug ?? null;
  const minEur = typeof item?.minEur === "number" ? item.minEur : (typeof item?.minPriceEur === "number" ? item.minPriceEur : null);
  const cardsCount = typeof item?.cardsCount === "number" ? item.cardsCount : (typeof item?.offersCount === "number" ? item.offersCount : (typeof item?.offerCount === "number" ? item.offerCount : 0));
  const leagues = item?.leagues ?? (item?.leagueSlug ? [item.leagueSlug] : []);

  return {
    ...item,
    slug,
    displayName,
    clubName,
    clubSlug,
    minEur,
    cardsCount,
    playerSlug: item?.playerSlug ?? slug,
    playerName: item?.playerName ?? displayName,
    activeClubName: item?.activeClubName ?? clubName,
    activeClub: item?.activeClub ?? (clubName || clubSlug ? { name: clubName, slug: clubSlug } : null),
    minPriceEur: item?.minPriceEur ?? minEur,
    offerCount: item?.offerCount ?? cardsCount,
    offersCount: item?.offersCount ?? cardsCount,
    leagues,
  };
}

function xsRecruterOfferToScoutOfferV1(item: RecruterOffer): ScoutOffer {
  const eur = typeof item?.price?.eur === "number" ? item.price.eur : null;
  return {
    offerId: String(item?.offerId || item?.id || item?.cardId || item?.cardSlug || ""),
    slug: String(item?.cardSlug || item?.playerSlug || item?.cardId || ""),
    rarity: item?.rarity ?? null,
    seasonYear: typeof item?.season === "number" ? item.season : null,
    pictureUrl: item?.pictureUrl ?? null,
    eur,
    priceText: item?.price?.text ?? (eur != null ? `€${eur.toFixed(2)}` : null),
  };
}

export async function recruterPlayers(params?: { first?: number; league?: string; q?: string; signal?: AbortSignal }): Promise<RecruterPlayersResponse> {
  const qs = new URLSearchParams();
  if (params?.league) qs.set("league", params.league);
  if (params?.first != null) qs.set("first", String(params.first));

  const res = await apiFetch<RecruterPlayersResponse>(`/recruter/players${xsRecruterTailV1(qs)}`, { signal: params?.signal });
  const q = xsRecruterNormV1(params?.q);
  let items = Array.isArray(res?.items) ? res.items.map(xsRecruterPlayerCompatV1) : [];
  if (q) {
    items = items.filter((p) =>
      [p.slug, p.displayName, p.playerName, p.clubName, p.position, p.leagueName, p.leagueSlug]
        .some((x) => xsRecruterNormV1(x).includes(q))
    );
  }
  if (params?.first != null && Number.isFinite(Number(params.first))) {
    items = items.slice(0, Math.max(1, Number(params.first)));
  }
  return { ...res, ok: res?.ok ?? true, count: items.length, items };
}

export async function recruterIndex(params?: { pages?: number; first?: number; force?: boolean; signal?: AbortSignal }): Promise<RecruterIndexResponse> {
  const qs = new URLSearchParams();
  qs.set("pages", String(params?.pages ?? 5));
  qs.set("first", String(params?.first ?? 50));
  if (params?.force) qs.set("force", "1");
  const res = await apiFetch<RecruterIndexResponse>(`/recruter/index${xsRecruterTailV1(qs)}`, { signal: params?.signal });
  return { ...res, marker: res?.marker || XS_FRONT_RECRUTER_BOARD_MARKER_V1 };
}

export async function recruterLeagues(params?: { signal?: AbortSignal }): Promise<RecruterLeaguesResponse> {
  const res = await apiFetch<RecruterLeaguesResponse>("/recruter/leagues", { signal: params?.signal });
  const items = Array.isArray(res?.items) ? res.items : [];
  return { ...res, ok: res?.ok ?? true, count: res?.count ?? items.length, items };
}

export async function recruterOffers(params?: { first?: number; force?: boolean; signal?: AbortSignal }): Promise<RecruterOffersResponse> {
  const qs = new URLSearchParams();
  qs.set("first", String(params?.first ?? 50));
  if (params?.force) qs.set("force", "1");
  const res = await apiFetch<RecruterOffersResponse>(`/recruter/offers${xsRecruterTailV1(qs)}`, { signal: params?.signal });
  return { ...res, items: Array.isArray(res?.items) ? res.items : [] };
}

export async function recruterPlayerCards(slug: string, params?: { first?: number; signal?: AbortSignal }): Promise<RecruterPlayerCardsResponse> {
  const s = String(slug || "").trim();
  if (!s) throw new Error("missing player slug");
  const qs = new URLSearchParams();
  if (params?.first != null) qs.set("first", String(params.first));
  const res = await apiFetch<RecruterPlayerCardsResponse>(`/recruter/player/${encodeURIComponent(s)}/cards${xsRecruterTailV1(qs)}`, { signal: params?.signal });
  const items = Array.isArray(res?.items) ? res.items : [];
  const firstOffer = items[0] || null;
  const player = res?.player ?? {
    slug: res?.playerSlug || s,
    displayName: firstOffer?.playerName || s,
    position: firstOffer?.position || null,
    activeClub: firstOffer?.clubName || firstOffer?.clubSlug ? { name: firstOffer?.clubName || null, slug: firstOffer?.clubSlug || null } : null,
    pictureUrl: firstOffer?.pictureUrl || null,
  };
  const offers = items.map((item) => ({
    ...item,
    slug: item.cardSlug || item.playerSlug || item.cardId,
    eur: typeof item?.price?.eur === "number" ? item.price.eur : null,
    priceText: item?.price?.text || null,
  }));
  return { ...res, playerSlug: res?.playerSlug || s, count: items.length, items, player, offers };
}

export async function recruterCard(cardId: string, params?: { signal?: AbortSignal }): Promise<RecruterCardResponse> {
  const id = String(cardId || "").trim();
  if (!id) throw new Error("missing card id");
  return apiFetch<RecruterCardResponse>(`/recruter/card/${encodeURIComponent(id)}`, { signal: params?.signal });
}

export async function fetchScoutCards(params: {
  first?: number;
  after?: string | null;
  eurOnly?: boolean;
  maxEur?: number | null;
  ts?: number;
  signal?: AbortSignal;
}) {
  const out = await recruterOffers({ first: params.first ?? 20, signal: params.signal });
  let items = out.items.map(xsRecruterOfferToScoutOfferV1);
  if (params.eurOnly) items = items.filter((x) => typeof x.eur === "number");
  if (params.maxEur != null && !Number.isNaN(params.maxEur)) items = items.filter((x) => typeof x.eur === "number" && x.eur <= Number(params.maxEur));
  return {
    items,
    pageInfo: out.pageInfo,
    note: XS_FRONT_RECRUTER_NEW_BACKEND_MARKER_V1,
  };
}
// Watchlist compatibility kept local: backend legacy endpoints were removed.
export type WatchItem = { slug: string; addedAt: string };
const xsScoutWatchlistCompatV1: WatchItem[] = [];
export async function getScoutWatchlist() {
  return { items: xsScoutWatchlistCompatV1 };
}
export async function addScoutWatchlist(slug: string) {
  const s = String(slug || "").trim();
  if (s && !xsScoutWatchlistCompatV1.some((x) => x.slug === s)) xsScoutWatchlistCompatV1.push({ slug: s, addedAt: new Date().toISOString() });
  return { ok: true, items: xsScoutWatchlistCompatV1 };
}
export async function removeScoutWatchlist(slug: string) {
  const s = String(slug || "").trim();
  const next = xsScoutWatchlistCompatV1.filter((x) => x.slug !== s);
  xsScoutWatchlistCompatV1.splice(0, xsScoutWatchlistCompatV1.length, ...next);
  return { ok: true, items: xsScoutWatchlistCompatV1 };
}

// Alerts compatibility kept local: backend legacy endpoints were removed.
export type AlertItem = { id: string; slug: string; maxEur: number; createdAt: string; isEnabled: boolean };
const xsScoutAlertsCompatV1: AlertItem[] = [];
export async function getScoutAlerts() {
  return { items: xsScoutAlertsCompatV1 };
}
export async function addScoutAlert(slug: string, maxEur: number) {
  const item = { id: `${String(slug || "").trim()}-${Date.now()}`, slug: String(slug || "").trim(), maxEur, createdAt: new Date().toISOString(), isEnabled: true };
  if (item.slug) xsScoutAlertsCompatV1.push(item);
  return { ok: true, items: xsScoutAlertsCompatV1 };
}
export async function toggleScoutAlert(id: string, isEnabled: boolean) {
  const item = xsScoutAlertsCompatV1.find((x) => x.id === id);
  if (item) item.isEnabled = isEnabled;
  return { ok: true, items: xsScoutAlertsCompatV1 };
}
export async function deleteScoutAlert(id: string) {
  const next = xsScoutAlertsCompatV1.filter((x) => x.id !== id);
  xsScoutAlertsCompatV1.splice(0, xsScoutAlertsCompatV1.length, ...next);
  return { ok: true, items: xsScoutAlertsCompatV1 };
}






/* XS_FRONT_RECRUTER_NEW_BACKEND_V1: compatibility aliases over the new Recruter backend. */
export type RecruiterRow = RecruterPlayer;
export type RecruiterPlayer = RecruterPlayerCardsResponse;
export async function scoutRecruter(params?: { first?: number; q?: string }) {
  const res = await recruterPlayers({ first: params?.first ?? 40, q: params?.q });
  return { items: res.items, meta: { marker: XS_FRONT_RECRUTER_NEW_BACKEND_MARKER_V1, count: res.count ?? res.items.length } };
}
export async function scoutPlayer(slug: string, params?: { first?: number }) {
  return recruterPlayerCards(slug, { first: params?.first ?? 50 });
}








/* XS_SCOUT_PLAYER2_API_V2_BEGIN */
export async function scoutPlayer2(
  slug: string,
  params?: { first?: number; allowUnknownPrices?: boolean }
) {
  return recruterPlayerCards(slug, { first: params?.first ?? 50 });
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
  // XS_MYCARDS_SYNC_PROBE_V1: log URL réelle appelée (debug iPhone)
  try { console.log("[myCardsSync] AUTH_BASE_URL=", AUTH_BASE_URL); } catch {} // XS_MYCARDS_AUTH_BASE_V2
  try { console.log("[myCardsSync] url=", url); } catch {}
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
  const url = `${AUTH_BASE_URL}/my-cards?deviceId=${encodeURIComponent(id)}`; // XS_MYCARDS_AUTH_BASE_V2
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


/* XS_MY_CARDS_LIST_V1_BEGIN */
export async function myCardsList(deviceId: string, first = 50, after?: string) {
  const qs = new URLSearchParams();
  qs.set("deviceId", deviceId);
  qs.set("first", String(first));
  if (after) qs.set("after", after);
  const url = `${AUTH_BASE_URL}/my-cards?${qs.toString()}`; // XS_MYCARDS_REMAINING_AUTH_V5
  const r = await fetch(url);
  const j = await r.json().catch(() => null);
  if (!r.ok) throw new Error((j && (j.error || j.message)) ? String(j.error || j.message) : `HTTP ${r.status}`);
  return j as { ok?: boolean; cached?: boolean; meta?: any; cards: any[]; pageInfo?: PageInfo };
}
/* XS_MY_CARDS_LIST_V1_END */
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
  const url = `${AUTH_BASE_URL}/my-cards/sync?${qs.toString()}`; // XS_MYCARDS_AUTH_BASE_V2

  // On garde aussi le body pour compat (si backend évolue) — mais la source de vérité = query string.
  const body = { deviceId: id, jwtAud: aud, first, maxPages, maxCards, sleepMs };

  // XS_MYCARDS_SYNC_PROBE_V1: log URL réelle appelée (debug iPhone)
  try { console.log("[myCardsSync] AUTH_BASE_URL=", AUTH_BASE_URL); } catch {} // XS_MYCARDS_AUTH_BASE_V2
  try { console.log("[myCardsSync] url=", url); } catch {}
  const r = await fetch(url, { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(body) });
  const j = await r.json().catch(()=>null);
  if(!r.ok) throw new Error((j && (j.error || j.message)) ? String(j.error || j.message) : `HTTP ${r.status}`);
  return j as { ok: boolean; count?: number; cachePath?: string; meta?: MyCardsMeta };
}
/* XS_MY_CARDS_API_V1_END */

/* XS_SCOUTAPI_MYCARDS_GETPAGE_V2 */
export async function myCardsGetPage(
  deviceId: string,
  opts?: { first?: number; after?: string | null }
): Promise<any> {
  const id = String(deviceId || "").trim();
  if (!id) throw new Error("missing deviceId");

  const qs = new URLSearchParams();
  qs.set("deviceId", id);

  const first = opts && opts.first != null ? Number(opts.first) : null;
  const after = opts && opts.after != null ? String(opts.after) : "";

  if (first != null && Number.isFinite(first)) qs.set("first", String(first));
  if (after) qs.set("after", after);

  const base =
    (typeof BASE_URL !== "undefined" && String((BASE_URL as any) || "").trim())
      ? String((BASE_URL as any)).trim()
      : ((process.env.EXPO_PUBLIC_BASE_URL || "").trim() || "https://xiascor-backend-tssdy62zqa-ez.a.run.app");

  const url = `${AUTH_BASE_URL}/my-cards?${qs.toString()}`; // XS_MYCARDS_ALL_AUTH_V4
  const r = await fetch(url);
  const j = await r.json().catch(() => null);
  if (!r.ok) throw new Error(j && (j.error || j.message) ? String(j.error || j.message) : `HTTP ${r.status}`);
  return j;
}

/* XS_MY_CARDS_API_V3_BEGIN
   Add missing helpers for backend cache pipeline WITHOUT redefining myCardsSync.
   - myCardsSync already exists in this file (keep it).
   - Add:
     - myCardsPage: GET /my-cards
     - myCardsStatus: GET /my-cards/status
*/
export type MyCardsPageResponse = {
  ok: boolean;
  cached?: boolean;
  cards: any[];
  pageInfo?: { hasNextPage: boolean; endCursor: string | null };
  meta?: any;
  error?: string;
  hint?: string;
};

export async function myCardsPage(deviceId: string, opts?: { first?: number; after?: string }): Promise<MyCardsPageResponse> {
  const id = String(deviceId || "").trim();
  if (!id) return { ok: false, cards: [], error: "deviceId manquant" };

  const qs = new URLSearchParams();
  qs.set("deviceId", id);
  qs.set("first", String(opts?.first ?? 20));
  if (opts?.after) qs.set("after", String(opts.after));

  const url = `${AUTH_BASE_URL}/my-cards?${qs.toString()}`; // XS_MYCARDS_REMAINING_AUTH_V5
  const r = await fetch(url);
  const data = await r.json().catch(() => null) as MyCardsPageResponse;
  if (!r.ok) throw new Error((data && ((data as any).error || (data as any).message)) ? String((data as any).error || (data as any).message) : `HTTP ${r.status}`);
  return {
    ...data,
    ok: Boolean((data as any)?.ok),
    cards: Array.isArray((data as any)?.cards) ? (data as any).cards : [],
  };
}

export async function myCardsStatus(deviceId: string): Promise<any> {
  const id = String(deviceId || "").trim();
  if (!id) return { ok: false, error: "deviceId manquant" };
  const qs = new URLSearchParams();
  qs.set("deviceId", id);
  const url = `${AUTH_BASE_URL}/my-cards/status?${qs.toString()}`; // XS_MYCARDS_REMAINING_AUTH_V5
  const r = await fetch(url);
  const j = await r.json().catch(() => null);
  if (!r.ok) throw new Error((j && (j.error || j.message)) ? String(j.error || j.message) : `HTTP ${r.status}`);
  return j;
}
/* XS_MY_CARDS_API_V3_END */



export const XS_MYCARDS_SYNC_TAG = "XS_MYCARDS_SYNC_QS_V1+LOG_V1";


/* XS_DEVICE_STATUS_API_V1_BEGIN
   Purpose:
   - Allow UI to know whether current deviceId is linked (Sorare OAuth device flow).
   - Provide a safe login URL helper (devLocal=1 for LAN dev).
*/
export async function deviceStatus(deviceId: string): Promise<{ linked?: boolean; userSlug?: string; nickname?: string; [k: string]: any }> {
  const id = String(deviceId || "").trim();
  if (!id) throw new Error("missing deviceId");
  const url = `${AUTH_BASE_URL}/auth/device-status?deviceId=${encodeURIComponent(id)}`; // XS_MYCARDS_AUTH_BASE_V2
  const r = await fetch(url);
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = (j && (j.error || j.message)) ? String(j.error || j.message) : `HTTP ${r.status}`;
    throw new Error(`deviceStatus:${msg}`);
  }
  return j as any;
}

export function sorareDeviceLoginUrl(deviceId: string, opts?: { devLocal?: boolean }): string {
  const id = String(deviceId || "").trim();
  const qs = new URLSearchParams();
  qs.set("deviceId", id);
  if (opts?.devLocal) qs.set("devLocal", "1");
  return `${AUTH_BASE_URL}/auth/sorare-device/login?${qs.toString()}`; // XS_MYCARDS_AUTH_BASE_V2
}
/* XS_DEVICE_STATUS_API_V1_END */





/* XS_PUBLIC_PLAYER_PERF_CLIENT_V1_BEGIN */
export type PublicPlayerPerformance = {
  playerSlug: string;
  playerName?: string | null;
  position?: string | null;
  activeClub?: { name?: string | null; slug?: string | null } | null;
  l5?: number | null;
  l15?: number | null;
  l40?: number | null;
  averages?: { l5?: number | null; l15?: number | null; l40?: number | null } | null; // XS_OFFICIAL_SORARE_AVERAGES_V1
  averagesDebug?: any;
  lastScore?: number | null;
  recentScores?: number[];
  recentScores15?: number[];
  recentScores40?: number[];
  opponentLogoUrls?: (string | null)[];
  opponentShort?: (string | null)[];
  meta?: any;
};


/* XS_FIX_FRONT_PERF_HISTORY_FIRST_NO_403_V5
 * Cloud Run -> Sorare peut être bloqué par CloudFront 403 sur les routes perf.
 * Pour stabiliser l'app, on utilise d'abord /history/player-chart.
 * Si history est vide/KO, on retourne un fallback propre au lieu de casser l'UI.
 */
/* XS_FIX_PERF_BASE_URL_GLOBAL_V51
 * Constante globale utilisée par publicPlayerPerformance().
 * Cloud Run reste la source stable pour history/player-chart.
 */
const PERF_BASE_URL = "https://xiascor-backend-tssdy62zqa-ez.a.run.app";
export async function publicPlayerPerformance(
  slug: string,
  opts?: { deviceId?: string | null; limit?: number } | string
): Promise<PublicPlayerPerformance> {
  const s = String(slug || "").trim();

  const limit =
    typeof opts === "object" && opts?.limit
      ? Math.max(1, Math.min(40, Number(opts.limit) || 40))
      : 40;

  const empty: any = {
    ok: true,
    playerSlug: s,
    slug: s,
    l5: null,
    l15: null,
    l40: null,
    averageScore: null,
    recentScores: [],
    recentScores15: [],
    recentScores40: [],
    scores: [],
    items: [],
    matches: [],
    opponentLogoUrls: [],
    opponentShort: [],
    meta: {
      source: "front-history-empty-fallback",
      marker: "XS_FIX_FRONT_PERF_HISTORY_FIRST_NO_403_V5",
      reason: "history empty or unavailable; Sorare perf routes skipped to avoid CloudFront 403",
    },
    source: "front-history-empty-fallback",
  };

  if (!s) return empty as PublicPlayerPerformance;

  const base =
    typeof PERF_BASE_URL === "string" && PERF_BASE_URL
      ? PERF_BASE_URL.replace(/\/+$/, "")
      : "";

  async function fetchTextSafe(url: string) {
    const r = await fetch(url, {
      headers: {
        accept: "application/json",
      },
    });

    const txt = await r.text().catch(() => "");
    let json: any = null;

    try {
      json = txt ? JSON.parse(txt) : null;
    } catch {
      json = null;
    }

    return { r, txt, json };
  }

  try {
    const historyUrl =
      base +
      "/history/player-chart/" +
      encodeURIComponent(s) +
      "?limit=" +
      encodeURIComponent(String(limit));

    const { r, txt, json } = await fetchTextSafe(historyUrl);

    if (r.ok && json) {
      const rawItems = Array.isArray(json.items)
        ? json.items
        : Array.isArray(json.matches)
          ? json.matches
          : Array.isArray(json.scores)
            ? json.scores
            : [];

      // XS_FIX_FRONT_HISTORY_SCORE_MAPPING_V1 BEGIN
      const toFiniteScore = (item: any): number | null => {
        const candidates = [
          item?.scoreSorare,
          item?.score,
          item?.totalScore,
          item?.so5Score,
          item?.playerScore,
          item?.points,
        ];

        for (const v of candidates) {
          const n = Number(v);
          if (Number.isFinite(n)) return Math.max(0, Math.min(100, n));
        }

        return null;
      };

      const normalized = rawItems
        .map((item: any) => {
          const score = toFiniteScore(item);
          if (score == null) return null;

          const opponentShort =
            String(
              item?.opponentShort ??
              item?.opponent?.shortName ??
              item?.opponent?.name ??
              item?.against ??
              ""
            ).trim();

          const opponentLogoUrl =
            item?.opponentLogoUrl ??
            item?.opponent?.pictureUrl ??
            item?.opponent?.avatarUrl ??
            item?.opponent?.logoUrl ??
            null;

          return {
            score,
            opponentShort,
            opponentLogoUrl,
          };
        })
        .filter(Boolean) as Array<{
          score: number;
          opponentShort: string;
          opponentLogoUrl: string | null;
        }>;

      const recent40 = normalized.map((x) => x.score).slice(0, 40);
      const recent15 = recent40.slice(0, 15);
      const recent5 = recent40.slice(0, 5);

      const avg = (arr: number[]) =>
        arr.length
          ? Math.round(arr.reduce((sum, n) => sum + n, 0) / arr.length)
          : null;
      const backendAverages = json?.averages && typeof json.averages === "object" ? json.averages : null; // XS_OFFICIAL_SORARE_AVERAGES_V1
      const backendL5 = Number.isFinite(Number(backendAverages?.l5)) ? Number(backendAverages.l5) : null;
      const backendL15 = Number.isFinite(Number(backendAverages?.l15)) ? Number(backendAverages.l15) : null;
      const backendL40 = Number.isFinite(Number(backendAverages?.l40)) ? Number(backendAverages.l40) : null;

      const opponentLogoUrls = normalized.map((x) => x.opponentLogoUrl).slice(0, 5);
      const opponentShort = normalized.map((x) => x.opponentShort).slice(0, 5);
      // XS_FIX_FRONT_HISTORY_SCORE_MAPPING_V1 END

      return {
        ok: true,
        playerSlug: s,
        slug: s,
        playerName: json.playerName || json.name || s,
        position: json.position || null,
        activeClub: json.activeClub || json.club || null,
        l5: backendL5 ?? avg(recent5),
        l15: backendL15 ?? avg(recent15),
        l40: backendL40 ?? avg(recent40),
        averages: backendAverages,
        averagesDebug: json?.averagesDebug || null,
        lastScore: recent5.length ? recent5[0] : null,
        recentScores: recent5,
        recentScores15: recent15,
        recentScores40: recent40,
        opponentLogoUrls,
        opponentShort,
        meta: {
          ...(json.meta || {}),
          source: "history/player-chart",
          marker: "XS_FIX_FRONT_HISTORY_SCORE_MAPPING_V1",
          averagesMarker: "XS_OFFICIAL_SORARE_AVERAGES_V1",
          count: rawItems.length,
          mappedCount: normalized.length,
          averages: backendAverages,
        },
        source: "history/player-chart",
      } as PublicPlayerPerformance;
    }

    console.warn(
      "[publicPlayerPerformance] history failed, safe fallback:",
      r.status,
      String(txt || "").slice(0, 160)
    );
  } catch (e: any) {
    console.warn(
      "[publicPlayerPerformance] history exception, safe fallback:",
      String(e?.message || e)
    );
  }

  return empty as PublicPlayerPerformance;
}


/* XS_PUBLIC_PLAYER_PERF_CLIENT_V1_END */



















// XS_SYNC_MY_CARDS_HISTORY_BATCH_V1
type XsMyCardsHistoryBatchOptsV1 = {
  maxPlayers?: number;
  last?: number;
  concurrency?: number;
  force?: boolean;
  ttlHours?: number;
  budgetMs?: number;
};

export async function syncMyCardsHistoryBatch(deviceId: string, cards: any[], opts?: XsMyCardsHistoryBatchOptsV1) {
  /* XS_MYCARDS_FAST_HISTORY_BACKGROUND_V1 */
  try {
    const baseUrl = String(AUTH_BASE_URL || BASE_URL || "https://xiascor-backend-tssdy62zqa-ez.a.run.app").replace(/\/+$/, "");
    const maxPlayers = Math.max(1, Math.min(50, Number(opts?.maxPlayers ?? 15) || 15));
    const last = Math.max(1, Math.min(100, Number(opts?.last ?? 40) || 40));
    const concurrency = Math.max(1, Math.min(4, Number(opts?.concurrency ?? 2) || 2));
    const ttlHours = Math.max(1, Math.min(720, Number(opts?.ttlHours ?? 24) || 24));
    const budgetMs = Math.max(0, Math.min(120000, Number(opts?.budgetMs ?? 15000) || 15000));
    const force = opts?.force === true;

    const slugs = Array.from(new Set(
      (cards || [])
        .map((c: any) => c?.playerSlug || c?.player?.slug || c?.anyPlayer?.slug)
        .filter(Boolean)
        .map((s: any) => String(s).trim().toLowerCase())
        .filter(Boolean)
    )).slice(0, maxPlayers);

    if (!slugs.length) return { ok: false, error: "no_slugs" };

    const url =
      `${baseUrl}/history/sync-my-cards-scores` +
      `?deviceId=${encodeURIComponent(deviceId)}` +
      `&last=${encodeURIComponent(String(last))}` +
      `&concurrency=${encodeURIComponent(String(concurrency))}` +
      `&maxPlayers=${encodeURIComponent(String(maxPlayers))}` +
      `&force=${force ? "1" : "0"}` +
      `&ttlHours=${encodeURIComponent(String(ttlHours))}` +
      `&historyBudgetMs=${encodeURIComponent(String(budgetMs))}` +
      `&slugs=${encodeURIComponent(slugs.join(","))}`;

    console.log("[XS_MYCARDS_FAST_HISTORY_BACKGROUND_V1] url=", url);

    const r = await fetch(url, { method: "POST" });
    const json = await r.json().catch(() => null);

    console.log("[XS_MYCARDS_FAST_HISTORY_BACKGROUND_V1] result=", json);

    return json || { ok: false, error: `history_batch_http_${r.status}` };
  } catch (e: any) {
    console.log("[XS_MYCARDS_FAST_HISTORY_BACKGROUND_V1] error=", e?.message || e);
    return { ok: false, error: String(e?.message || e) };
  }
}

