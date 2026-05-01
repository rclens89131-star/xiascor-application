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
        l5: avg(recent5),
        l15: avg(recent15),
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
          count: rawItems.length,
          mappedCount: normalized.length,
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
export async function syncMyCardsHistoryBatch(deviceId: string, cards: any[]) {
  try {
    const BASE_URL =
      process.env.EXPO_PUBLIC_BASE_URL ??
      "https://xiascor-backend-tssdy62zqa-ez.a.run.app";

    const slugs = Array.from(new Set(
      (cards || [])
        .map((c: any) => c?.playerSlug || c?.player?.slug || c?.anyPlayer?.slug)
        .filter(Boolean)
    ));

    if (!slugs.length) return { ok: false, error: "no_slugs" };

    const url =
      `${BASE_URL}/history/sync-my-cards-scores` +
      `?deviceId=${encodeURIComponent(deviceId)}` +
      `&last=100&concurrency=2` +
      `&slugs=${encodeURIComponent(slugs.join(","))}`;

    console.log("[history batch] url=", url);

    const r = await fetch(url, { method: "POST" });
    const json = await r.json();

    console.log("[history batch] result=", json);

    return json;
  } catch (e: any) {
    console.log("[history batch] error=", e?.message || e);
    return { ok: false, error: String(e?.message || e) };
  }
}
