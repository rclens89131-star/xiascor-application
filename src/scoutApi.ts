import { apiFetch } from "./api";
/* XS_SCOUT_BASE_URL_V1 */
const AUTH_BASE_URL =
process.env.EXPO_PUBLIC_AUTH_BASE_URL ??
process.env.EXPO_PUBLIC_BASE_URL ??
"https://xiascor-backend-tssdy62zqa-ez.a.run.app"; // XS_MYCARDS_AUTH_BASE_V2
const BASE_URL =
  process.env.EXPO_PUBLIC_BASE_URL ??
  "https://xiascor-backend-tssdy62zqa-ez.a.run.app";


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
  lastScore?: number | null;
  recentScores?: number[];
  meta?: any;
};

export async function publicPlayerPerformance(
  slug: string,
  opts?: { deviceId?: string | null }
): Promise<PublicPlayerPerformance> {
  const s = String(slug || "").trim();
  if (!s) throw new Error("player slug missing");

  const did = String(opts?.deviceId || "").trim();
const PERF_BASE_URL = "https://xiascor-backend-tssdy62zqa-ez.a.run.app"; /* XS_PUBLIC_PLAYER_PERF_FORCE_CLOUDRUN_V1 */
  const limit = 40;

  async function fetchPerfOnce(): Promise<any> {
    // XS_FRONT_AUTH_PERF_SAFE_V1 BEGIN
    // Si deviceId existe, on tente d'abord la route AUTH Sorare.
    // Si ça échoue, on continue vers public-player-performance puis history/player-chart.
    if (did) {
      try {
        const authQs = new URLSearchParams();
        authQs.set("slug", s);
        authQs.set("deviceId", did);

        const authUrl = `${PERF_BASE_URL}/public-player-performance-auth?${authQs.toString()}`;
        const ar = await fetch(authUrl, {
          headers: { accept: "application/json", "ngrok-skip-browser-warning": "1" },
        });

        const atxt = await ar.text();
        let aj: any = null;
        try { aj = atxt ? JSON.parse(atxt) : null; } catch {}

        if (ar.ok && aj) {
          return {
            ...(aj || {}),
            meta: {
              ...((aj && aj.meta) || {}),
              source: "public-player-performance-auth",
              xsAuthFirst: true,
            },
          };
        }

        console.warn("[publicPlayerPerformance] auth failed, fallback public/history:", ar.status, String(atxt || "").slice(0, 180));
      } catch (e: any) {
        console.warn("[publicPlayerPerformance] auth exception, fallback public/history:", String(e?.message || e));
      }
    }
    // XS_FRONT_AUTH_PERF_SAFE_V1 END

    const qs = new URLSearchParams();
    qs.set("slug", s);
    if (did) qs.set("deviceId", did);
    const url = `${PERF_BASE_URL}/public-player-performance?${qs.toString()}`;
    const r = await fetch(url, { headers: { accept: "application/json", "ngrok-skip-browser-warning": "1" } }); /* XS_NGROK_SKIP_HEADER_V1 */
    const txt = await r.text();
    let json: any = null;
    try { json = txt ? JSON.parse(txt) : null; } catch {}
    if (!r.ok) {
      const msg = (json && (json.error || json.message)) ? (json.error || json.message) : ("HTTP " + r.status);
      throw new Error("public-player-performance failed: " + msg);
    }
    return json || {};
  }

  async function fetchChartOnce(): Promise<any> {
    const url = `${PERF_BASE_URL}/history/player-chart/${encodeURIComponent(s)}?limit=${limit}`;
    const r = await fetch(url, { headers: { accept: "application/json", "ngrok-skip-browser-warning": "1" } }); /* XS_NGROK_SKIP_HEADER_V1 */
    const txt = await r.text();
    let json: any = null;
    try { json = txt ? JSON.parse(txt) : null; } catch {}
    if (!r.ok) {
      const msg = (json && (json.error || json.message)) ? (json.error || json.message) : ("HTTP " + r.status);
      throw new Error("history/player-chart failed: " + msg);
    }
    return json || {};
  }

  try {
    const perf: any = await fetchPerfOnce();
    const perfScores = Array.isArray(perf?.recentScores)
      ? perf.recentScores.map((x: any) => Number(x)).filter((n: any) => Number.isFinite(n))
      : [];

    const perfOppsRaw = Array.isArray(perf?.recentOpponents)
      ? perf.recentOpponents
      : (Array.isArray(perf?.opponents) ? perf.opponents : []);

    const perfOpps = perfOppsRaw.map((o: any) => ({
      logoUrl: String(o?.logoUrl || "").trim() || null,
      shortName: String(o?.shortName || o?.name || o?.slug || "").trim() || null,
      opponent: String(o?.name || o?.opponent || "").trim() || null,
      homeAway: String(o?.homeAway || "").trim() || null,
    }));

    if (perfScores.length > 0) {
      function avg(arr: number[], take: number): number | null {
        const slice = arr.slice(0, take).filter((n) => Number.isFinite(n));
        if (!slice.length) return null;
        const sum = slice.reduce((a, b) => a + b, 0);
        return Math.round((sum / slice.length) * 10) / 10;
      }

      return {
        playerSlug: String(perf?.playerSlug || s),
        playerName: perf?.playerName ?? null,
        position: perf?.position ?? null,
        activeClub: perf?.activeClub ?? null,
        lastScore: perfScores.length ? perfScores[0] : null,
        l5: (typeof perf?.l5 === "number") ? perf.l5 : avg(perfScores, 5),
        l15: (typeof perf?.l15 === "number") ? perf.l15 : avg(perfScores, 15),
        recentScores: perfScores,
        recentScores15: perfScores.slice(0, 15),
        recentScores40: perfScores.slice(0, 40),
        meta: {
          source: "public-player-performance",
          opponents: perfOpps,
          raw: perf?.meta ?? null,
        },
      } as any;
    }
  } catch {}

  let json: any = await fetchChartOnce();
  let items = Array.isArray(json?.items) ? json.items : [];

  if ((!items || items.length === 0) && did) {
    const syncQs = new URLSearchParams();
    syncQs.set("slug", s);
    syncQs.set("deviceId", did);
    syncQs.set("last", "10");

    try {
      await fetch(`${PERF_BASE_URL}/history/sync-player-scores?${syncQs.toString()}`, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ slug: s, deviceId: did, last: 10 }),
      });
    } catch {}

    try {
      json = await fetchChartOnce();
      items = Array.isArray(json?.items) ? json.items : [];
    } catch {}
  }

  const scores = (Array.isArray(items) ? items : [])
    .map((it: any) => {
      const n = Number(it?.scoreSorare);
      return Number.isFinite(n) ? n : null;
    })
    .filter((n: any) => n !== null) as number[];

  function avg(arr: number[], take: number): number | null {
    const slice = arr.slice(0, take).filter((n) => Number.isFinite(n));
    if (!slice.length) return null;
    const sum = slice.reduce((a, b) => a + b, 0);
    return Math.round((sum / slice.length) * 10) / 10;
  }

  const opponents = (Array.isArray(items) ? items : []).map((it: any) => ({
    logoUrl: String(it?.opponentLogoUrl || "").trim() || null,
    shortName: String(it?.opponentShort || it?.opponent || "").trim() || null,
    opponent: String(it?.opponent || "").trim() || null,
    homeAway: String(it?.homeAway || "").trim() || null,
  }));

  return {
    playerSlug: s,
    playerName: null,
    position: null,
    activeClub: null,
    lastScore: scores.length ? scores[0] : null,
    l5: avg(scores, 5),
    l15: avg(scores, 15),
    recentScores: scores,
    recentScores15: scores.slice(0, 15),
    recentScores40: scores.slice(0, 40),
    meta: {
      source: "history/player-chart",
      count: items.length,
      items,
      opponents,
    },
  } as any;
}
/* XS_PUBLIC_PLAYER_PERF_CLIENT_V1_END */















