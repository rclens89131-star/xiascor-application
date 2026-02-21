/* XS_MYCARDS_GQL_JWT_AUD_V1_BEGIN */
/* patched in-place below */
/* XS_MYCARDS_GQL_JWT_AUD_V1_END */
/* XS_MYCARDS_HELPER_SHIM_V3_BEGIN */
// Ensure helper exists in module scope (prevents ReferenceError in /my-cards/* handlers)
function xsMcFindOAuthTokenMaybeBridgeV1(deviceId){
  try { if (typeof xsFindOAuthTokenMaybeBridgeV1 === "function") return xsFindOAuthTokenMaybeBridgeV1(deviceId); } catch {}
  try { if (typeof xsFindOAuthTokenMaybeBridge === "function") return xsFindOAuthTokenMaybeBridge(deviceId); } catch {}
  try { if (typeof xsFindOAuthTokenByDeviceId === "function") return xsFindOAuthTokenByDeviceId(deviceId); } catch {}
  try { if (typeof xsGetOAuthTokenByDeviceId === "function") return xsGetOAuthTokenByDeviceId(deviceId); } catch {}
  return null;
}
/* XS_MYCARDS_HELPER_SHIM_V3_END */
/* XS_OAUTH_ENV_HARDREAD_V3
   Why: OAuth device sees empty env values even when .env has them.
   Fix: read .env as Buffer, detect encoding, decode, parse ourselves (last occurrence wins).
   Supports: KEY=, "KEY = value", export KEY=value, quoted values.
   Diagnostics: counts/lastLen per watched key, never returns raw secrets. */

function xsEnvHard(k) {
  try {
    const fs = require("fs");
    const path = require("path");

    const p1 = path.join(process.cwd(), ".env");
    const p2 = path.join(__dirname, ".env");
    const envPath = fs.existsSync(p1) ? p1 : p2;

    const st = fs.statSync(envPath);
    global.__XS_ENVHARD_CACHE_V3 = global.__XS_ENVHARD_CACHE_V3 || { mtimeMs: 0, map: {}, envPath: "", diag: {} };

    const needReload =
      !global.__XS_ENVHARD_CACHE_V3.map ||
      global.__XS_ENVHARD_CACHE_V3.mtimeMs !== st.mtimeMs ||
      global.__XS_ENVHARD_CACHE_V3.envPath !== envPath;

    if (needReload) {
      const buf = fs.readFileSync(envPath);
      const size = buf.length;

      // count NUL bytes in first chunk
      let zeros = 0;
      const lim = Math.min(size, 4096);
      for (let i = 0; i < lim; i++) if (buf[i] === 0) zeros++;

      let encoding = "utf8";
      let txt = "";

      // BOM checks
      if (size >= 2 && buf[0] === 0xFF && buf[1] === 0xFE) {
        encoding = "utf16le-bom";
        txt = buf.slice(2).toString("utf16le");
      } else if (size >= 2 && buf[0] === 0xFE && buf[1] === 0xFF) {
        encoding = "utf16be-bom";
        const b = Buffer.from(buf.slice(2));
        for (let i = 0; i + 1 < b.length; i += 2) { const t = b[i]; b[i] = b[i + 1]; b[i + 1] = t; }
        txt = b.toString("utf16le");
      } else if (size >= 3 && buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF) {
        encoding = "utf8-bom";
        txt = buf.slice(3).toString("utf8");
      } else if (zeros > 20) {
        encoding = "utf16le-heuristic";
        txt = buf.toString("utf16le");
      } else {
        encoding = "utf8";
        txt = buf.toString("utf8");
      }

      // Parse ourselves (last occurrence wins)
      const lines = String(txt || "").split(/\r?\n/);
      const map = {};
      const watched = [
        "SORARE_OAUTH_CLIENT_ID",
        "SORARE_OAUTH_CLIENT_SECRET",
        "SORARE_OAUTH_AUTHORIZE_URL",
        "SORARE_OAUTH_TOKEN_URL",
        "SORARE_OAUTH_REDIRECT_URI",
        "SORARE_OAUTH_SCOPES",
        "SORARE_OAUTH_USE_PKCE",
        "SORARE_CLIENT_ID",
        "SORARE_CLIENT_SECRET"
      ];
      const watch = {};
      for (const w of watched) watch[w] = { count: 0, lastLen: 0, present: false };

      for (const ln of lines) {
        if (!ln) continue;
        const raw = String(ln);
        if (/^\s*#/.test(raw) || /^\s*;/.test(raw)) continue;

        const m = raw.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
        if (!m) continue;

        let key = String(m[1] || "");
        key = key.replace(/^\uFEFF/, ""); // safety if BOM sneaks into key
        let v = String(m[2] || "").trim();

        // strip inline comment for unquoted values (best-effort)
        if (!(v.startsWith('"') || v.startsWith("'"))) {
          const hash = v.indexOf(" #");
          if (hash >= 0) v = v.slice(0, hash).trim();
        }

        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
          if (v.length >= 2) v = v.slice(1, -1);
        }

        // last occurrence wins
        map[key] = v;

        if (watch[key]) {
          watch[key].count += 1;
          watch[key].lastLen = String(v).length;
          watch[key].present = true;
        }
      }

      global.__XS_ENVHARD_CACHE_V3 = {
        mtimeMs: st.mtimeMs,
        map,
        envPath,
        diag: {
          size,
          zeros,
          encoding,
          watch,
          oauthKeys: Object.keys(map).filter((kk) => kk.startsWith("SORARE_OAUTH") || kk.startsWith("SORARE_CLIENT")).sort()
        }
      };
    }

    const map = global.__XS_ENVHARD_CACHE_V3.map || {};
    return map[k] ? String(map[k]).trim() : "";
  } catch (e) {
    return "";
  }
}
/* end XS_OAUTH_ENV_HARDREAD_V3 */
/* XS_ENVFILE_FALLBACK_V1
   Why: process.env OAuth values are sometimes empty inside handlers.
   We fallback to reading .env file directly (last occurrence wins).
   Secrets are never logged; caller may log only lengths. */

function xsEnvFileLast(key) {
  try {
    // cache by mtime
    const fs = require("fs");
    const path = require("path");
    const cwdEnv = path.join(process.cwd(), ".env");
    const dirEnv = path.join(__dirname, ".env");
    const envPath = fs.existsSync(cwdEnv) ? cwdEnv : dirEnv;

    const st = fs.statSync(envPath);
    global.__XS_ENVFILE_CACHE_V1 = global.__XS_ENVFILE_CACHE_V1 || { mtimeMs: 0, map: {} };

    if (!global.__XS_ENVFILE_CACHE_V1.map || global.__XS_ENVFILE_CACHE_V1.mtimeMs !== st.mtimeMs) {
      const txt = fs.readFileSync(envPath, "utf8");
      const lines = txt.split(/\r?\n/);
      const map = {};
      for (const ln of lines) {
        const m = ln.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
        if (!m) continue;
        const k = m[1];
        let v = (m[2] || "").trim();
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
          if (v.length >= 2) v = v.slice(1, -1);
        }
        // last occurrence wins
        map[k] = v;
      }
      global.__XS_ENVFILE_CACHE_V1 = { mtimeMs: st.mtimeMs, map };
    }

    const v = (global.__XS_ENVFILE_CACHE_V1.map && global.__XS_ENVFILE_CACHE_V1.map[key]) ? String(global.__XS_ENVFILE_CACHE_V1.map[key]).trim() : "";
    return v;
  } catch (e) {
    return "";
  }
}

// Wrap existing xsEnvNonEmpty if present, else create it.
try {
  if (typeof xsEnvNonEmpty !== "function") {
    global.__XS_ENV_PARSED = global.__XS_ENV_PARSED || {};
    function xsEnvNonEmpty(k) {
      const a = ((process.env && process.env[k]) ? String(process.env[k]) : "").trim();
      if (a) return a;
      const p = global.__XS_ENV_PARSED || {};
      const b = (p && p[k]) ? String(p[k]).trim() : "";
      if (b) return b;
      const c = xsEnvFileLast(k);
      return c;
    }
    global.xsEnvNonEmpty = xsEnvNonEmptyWrapped;
xsEnvNonEmpty = xsEnvNonEmptyWrapped;
  } else {
    const _old = xsEnvNonEmpty;
function xsEnvNonEmptyWrapped(k) {
      const a = _old(k);
      if (a && String(a).trim()) return String(a).trim();
      const c = xsEnvFileLast(k);
      return c;
    }
    global.xsEnvNonEmpty = xsEnvNonEmptyWrapped;
xsEnvNonEmpty = xsEnvNonEmptyWrapped;
  }
} catch (e) {}
/* end XS_ENVFILE_FALLBACK_V1 */
 // XS_DOTENV_OVERRIDE_TRUE_V1 (force load .env early + override existing env vars)
 // Why: existing Windows env vars (even empty) can prevent dotenv from applying .env values.
 try {
   if (!global.__XS_DOTENV_OVERRIDE_TRUE_V1) {
     global.__XS_DOTENV_OVERRIDE_TRUE_V1 = true;
     require("dotenv").config({ override: true });
   }
 } catch (e) {}
 // end XS_DOTENV_OVERRIDE_TRUE_V1

/* XS_ENV_PARSED_FALLBACK_V1
   Why: sometimes process.env has keys but empty values inside handlers.
   We fallback to dotenv.config().parsed when env value is empty. */
try {
  if (!global.__XS_ENV_PARSED_FALLBACK_V1) {
    global.__XS_ENV_PARSED_FALLBACK_V1 = true;
    const rr = require("dotenv").config({ override: false });
    global.__XS_ENV_PARSED = (rr && rr.parsed) ? rr.parsed : (global.__XS_ENV_PARSED || {});
  }
} catch (e) {
  global.__XS_ENV_PARSED = global.__XS_ENV_PARSED || {};
}

function xsEnvNonEmptyParsed(k) {
  const a = ((process.env && process.env[k]) ? String(process.env[k]) : "").trim();
  if (a) return a;
  const p = global.__XS_ENV_PARSED || {};
  const b = (p && p[k]) ? String(p[k]).trim() : "";
  return b;
}
/* end XS_ENV_PARSED_FALLBACK_V1 */
 // XS_DOTENV_EARLY_V1 (force load .env before any env reads)
 try { require("dotenv").config(); } catch (e) {}
/**
 * Companion Sorare — backend propre
 * - /health
 * - /public-user-cards-page?identifier=darkflow&first=20&after=...&enrich=1
 * - /public-player?slug=...
 * - /scout/cards?first=20&eurOnly=1&q=mbappe&rarities=limited,rare&maxEur=50&sort=eur_asc
 * - /scout/watchlist (GET/POST/DELETE)
 * - /scout/alerts (GET/POST/DELETE)
 *
 * Node >= 18 (fetch dispo). Recommandé: Node 20.
 */

const express = require("express");
const cors = require("cors");

/* XS_FIX_XSWEIV8_V1_BEGIN
   But: éviter ReferenceError "xsWeiV8 is not defined" et renvoyer un wei string si dispo.
*/
/* XS_FIX_PUBLIC_USER_CARDS_ENRICH_V1_BEGIN
   Objectif: normaliser une carte user => shape riche (rarity/player/team/position/season/avatars)
   Safe: si un champ n'existe pas (mode public / query limitée), on renvoie undefined sans casser.
*/
function xsNormalizePublicUserCard(n) {
  const slug = String(n?.slug ?? n?.card?.slug ?? n?.id ?? "");
  const pictureUrl = n?.pictureUrl ?? n?.card?.pictureUrl ?? n?.pictureUrl ?? null;

  const rarityRaw =
    n?.rarityTyped ??
    n?.rarity ??
    n?.rarity?.slug ??
    n?.card?.rarityTyped ??
    n?.card?.rarity ??
    n?.card?.rarity?.slug ??
    null;

  const seasonYear =
    n?.seasonYear ??
    n?.season?.startYear ??
    n?.season?.year ??
    n?.card?.seasonYear ??
    n?.card?.season?.startYear ??
    null;

  const playerName =
    n?.playerName ??
    n?.player?.displayName ??
    n?.player?.name ??
    n?.card?.player?.displayName ??
    null;

  const playerSlug =
    n?.playerSlug ??
    n?.player?.slug ??
    n?.card?.player?.slug ??
    null;

  const teamName =
    n?.teamName ??
    n?.team?.name ??
    n?.player?.activeClub?.name ??
    n?.card?.player?.activeClub?.name ??
    null;

  const teamSlug =
    n?.teamSlug ??
    n?.team?.slug ??
    n?.player?.activeClub?.slug ??
    n?.card?.player?.activeClub?.slug ??
    null;

  const anyPos =
    n?.anyPosition ??
    (Array.isArray(n?.anyPositions) ? n.anyPositions[0] : null) ??
    n?.playerPosition ??
    n?.position ??
    n?.positionRaw ??
    n?.card?.anyPosition ??
    (Array.isArray(n?.card?.anyPositions) ? n.card.anyPositions[0] : null) ??
    n?.card?.playerPosition ??
    n?.card?.position ??
    n?.card?.positionRaw ??
    n?.player?.anyPosition ??
    (Array.isArray(n?.player?.anyPositions) ? n.player.anyPositions[0] : null) ??
    n?.player?.playerPosition ??
    n?.player?.position ??
    null;

  const avatarUrl = n?.avatarUrl ?? n?.player?.avatarUrl ?? n?.card?.player?.avatarUrl ?? null;

  // Champs optionnels (si un jour on les a):
  const l15 = n?.l15 ?? n?.stats?.l15 ?? n?.player?.l15 ?? null;
  const eur = n?.eur ?? n?.priceEur ?? n?.offer?.eur ?? null;
  const eurCents = n?.eurCents ?? n?.priceEurCents ?? n?.offer?.eurCents ?? null;

  return {
    id: n?.id ?? null,
    slug,
    pictureUrl,
    rarity: rarityRaw,
    seasonYear,
    season: n?.season ?? n?.card?.season ?? null,
    playerName,
    playerSlug,
    teamName,
    teamSlug,
    position: anyPos,
    positionRaw: n?.positionRaw ?? n?.card?.positionRaw ?? null,
    avatarUrl,
    // optionnels
    l15,
    eur,
    eurCents,
  };
}
/* XS_FIX_PUBLIC_USER_CARDS_ENRICH_V1_END */
function xsWeiV8(x) {
  try {
    if (x == null) return null;
    const w =
      x?.receiverSide?.amounts?.wei ??
      x?.receiverSide?.amount?.wei ??
      x?.amounts?.wei ??
      x?.wei ??
      x?.price?.amount ??
      null;
    if (w == null) return null;
    return String(w);
  } catch {
    return null;
  }
}
/* XS_FIX_XSWEIV8_V1_END */


// XS_SCOUT_WEI_ETH_V3C_HELPER
function xsWeiToEthStrScoutV3c(weiStr, decimals = 6) {
  try {
    if (weiStr === null || weiStr === undefined) return null;
    const s = String(weiStr).trim();
    if (!s) return null;
    const w = BigInt(s);
    const base = 1000000000000000000n; // 1e18
    const whole = w / base;
    const frac = w % base;
    const div = BigInt("1" + "0".repeat(18 - decimals));
    const fracN = (frac / div).toString().padStart(decimals, "0");
    return whole.toString() + "." + fracN;
  } catch {
    return null;
  }
}
// XS_SCOUT_WEI_ETH_V3C_HELPER_END
/* ===== XS_SAFE_TO_FIXED_V1_BEGIN =====
   Prevent crashes when number is null/undefined
====================================== */
function xsSafeToFixed(n, digits = 2) {
  if (typeof n !== "number" || !Number.isFinite(n)) return null;
  try { return n.toFixed(digits); } catch { return null; }
}
/* ===== XS_SAFE_TO_FIXED_V1_END ===== */





require("dotenv").config();
const registerNewsRoutes = require("./routes/news.cjs");
const app = express();





/* XS_DEBUG_PUBLIC_USER_CARDS_RAW_V2 (BEGIN)
 * XS_FIX_DEBUGRAW_PLAYER_FIELD_V1
 * XS_FIX_DEBUGRAW_AVATARURL_FIELD_V1
 * XS_FIX_DEBUGRAW_SEASONYEAR_FIELD_V1
 * XS_FIX_DEBUGRAW_RARITY_FIELD_V1
 * XS_RECOVER_AND_REPATCH_DEBUGRAW_V3_SAFE_PS_V1
 * Debug endpoint: fetch brut Sorare GraphQL + renvoie upstreamStatus/upstreamText même en erreur.
 * Usage: /debug/public-user-cards-raw?identifier=darkflow&first=2&after=... (after optionnel)
 * Dump: backend/_logs/public_user_cards_raw_<ts>.json
 */
app.get("/debug/public-user-cards-raw", async (req, res) => {
  try {
    const identifier = String(req.query.identifier || "").trim();
    const first = Number(req.query.first || 2);
    const after = (req.query.after != null) ? String(req.query.after) : null;

    if (!identifier) return res.status(400).json({ ok: false, error: "missing identifier" });

    const safeFirst = Math.max(1, Math.min(50, Number.isFinite(first) ? first : 2));

    // Query "best effort" SANS football{...} (on veut voir la vraie erreur Sorare si un champ casse)
    const query = `
      query XS_DebugPublicUserCardsRaw(\$slug: String!, \$first: Int!, \$after: String) {
        user(slug: \$slug) {
          slug
          nickname
          cards(first: \$first, after: \$after) {
            nodes {
              id
              slug
              rarityTyped
              seasonYear
              pictureUrl
              
              }
            pageInfo { hasNextPage endCursor }
          }
        }
      }
    `;

    const variables = { slug: identifier, first: safeFirst, after };

    // Fetch brut pour CAPTURER status + text même si Sorare répond 422
    const url = (typeof SORARE_GQL === "string" && SORARE_GQL) ? SORARE_GQL : "https://api.sorare.com/graphql";
    const headers = (typeof sorareHeaders === "function")
      ? sorareHeaders()
      : { "content-type": "application/json", "accept": "application/json" };

    const r = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ query, variables }),
    });

    const upstreamText = await r.text();

    let parsed = null;
    try { parsed = JSON.parse(upstreamText); } catch {}

    // Dump timestampé
    const path = require("path");
    const fs = require("fs");
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const dumpDir = path.join(__dirname, "_logs");
    fs.mkdirSync(dumpDir, { recursive: true });
    const dumpName = "public_user_cards_raw_" + ts + ".json";
    const dumpPath = path.join(dumpDir, dumpName);

    const dumpPayload = {
      at: new Date().toISOString(),
      route: "/debug/public-user-cards-raw",
      url,
      variables,
      upstreamStatus: r.status,
      upstreamOk: r.ok,
      upstreamText,
      parsed,
    };
    fs.writeFileSync(dumpPath, JSON.stringify(dumpPayload, null, 2), "utf8");

    try { res.setHeader("X-XS-DBGRAW-STATUS", String(r.status)); } catch {}
    try { res.setHeader("X-XS-DBGRAW-DUMP", dumpName); } catch {}

    if (!r.ok) {
      return res.status(502).json({
        ok: false,
        error: "Sorare upstream error",
        upstreamStatus: r.status,
        dumpedTo: "backend/_logs/" + dumpName,
        upstreamText: upstreamText.slice(0, 4000),
        parsed,
      });
    }

    return res.json({
      ok: true,
      upstreamStatus: r.status,
      dumpedTo: "backend/_logs/" + dumpName,
      parsed,
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e && e.message ? e.message : e) });
  }
});
/* XS_DEBUG_PUBLIC_USER_CARDS_RAW_V2 (END) */


app.use(cors());
app.use(express.json());

// ----------------------------
// Config
// ----------------------------
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "0.0.0.0";


const XS_SERVER_STARTED_AT_ISO = new Date().toISOString(); // XS_DEBUG_BUILD_V1
// IMPORTANT: endpoint GraphQL (on force federation)
const SORARE_GQL = "https://api.sorare.com/graphql";


const SORARE_APIKEY = process.env.SORARE_APIKEY || process.env.SORARE_API_KEY || "";
const SORARE_JWT    = process.env.SORARE_JWT || "";

const SORARE_JWT_AUD = process.env.SORARE_JWT_AUD || "";
const HAS_SORARE_KEY = Boolean(SORARE_APIKEY || SORARE_JWT);

/* XS_OAUTH_CONFIG_V1_BEGIN
   OAuth global (une seule fois) — utilisé par:
   - sorareHeaders() fallback
   - /auth/sorare, /auth/sorare/callback, /auth/sorare/status
*/
const SORARE_OAUTH_UID = process.env.SORARE_OAUTH_UID || "";
const SORARE_OAUTH_SECRET = process.env.SORARE_OAUTH_SECRET || "";
const SORARE_OAUTH_REDIRECT_URI =
  process.env.SORARE_OAUTH_REDIRECT_URI || "http://localhost:3000/auth/sorare/callback";
const OAUTH_TOKEN_FILE = dataFile("sorare_oauth.json");

function readOAuthToken() {
  return readJson(OAUTH_TOKEN_FILE, null);
}

function hasSorareAuth() {
  const t = readOAuthToken();
  return Boolean(SORARE_APIKEY || SORARE_JWT || (t && t.access_token));
}
/* XS_OAUTH_CONFIG_V1_END */

function sorareHeaders() {
  const h = { "content-type": "application/json", "accept": "application/json" };

  if (SORARE_JWT) h["authorization"] = "Bearer " + SORARE_JWT;
  if (SORARE_JWT_AUD) h["JWT-AUD"] = SORARE_JWT_AUD;

  if (SORARE_APIKEY) {
    // Sorare docs: header APIKEY
    h["APIKEY"] = SORARE_APIKEY;
  }

  // OAuth access token fallback (si pas d'APIKEY/JWT)
  if (!h["authorization"] && !SORARE_APIKEY) {
    try {
      const t = readOAuthToken();
      if (t && t.access_token) h["authorization"] = "Bearer " + t.access_token;
    } catch {}
}

  return h;
}

function hasSorareAuth() {
  const t = readOAuthToken();
  return Boolean(SORARE_APIKEY || SORARE_JWT || (t && t.access_token));
}
// ----------------------------
// Utils: Disk JSON
// ----------------------------
function dataFile(name) {
  const path = require("path");
  return path.join(__dirname, "data", name);
}

function readJson(file, fallback) {
  try {
    const fs = require("fs");
    if (!fs.existsSync(file)) return fallback;
    const raw = fs.readFileSync(file, "utf8");
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeJson(file, obj) {
  try {
    const fs = require("fs");
    const path = require("path");
    const dir = path.dirname(file);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(file, JSON.stringify(obj, null, 2), "utf8");
  } catch {}
}
// XS_SNAPSHOTS_V1_START
function snapshotsFile() {
  return dataFile("snapshots.jsonl");
}

function ensureDataDirForSnapshots() {
  const fs = require("fs");
  const path = require("path");
  const dir = path.dirname(snapshotsFile());
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function csvEscape(value) {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (s.includes('"') || s.includes(",") || s.includes("\n")) {
    return "";
  }
  return s;
}

function parseDayStartUtc(ymd) {
  if (!ymd) return null;
  const d = new Date(`${ymd}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function parseDayEndUtc(ymd) {
  if (!ymd) return null;
  const d = new Date(`${ymd}T23:59:59.999Z`);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function appendSnapshots(snapshots) {
  const fs = require("fs");
  ensureDataDirForSnapshots();
  const lines = snapshots.map((s) => JSON.stringify(s)).join("\n") + "\n";
  fs.appendFileSync(snapshotsFile(), lines, "utf8");
}
// XS_SNAPSHOTS_V1_END



/* XS_TRENDING_HELPERS_FALLBACK_V1 (global)
   - fixes: xsTrendingTrackQuery / xsTrendingComputeTopQueries not defined
   - stores in: data/trending_searches.json
*/
const TRENDING_SEARCHES_FILE = dataFile("trending_searches.json");
const TRENDING_MAX_EVENTS = 20000;
const TRENDING_WINDOW_MS = 24 * 60 * 60 * 1000;

function xsTrendingReadStore() {
  const store = readJson(TRENDING_SEARCHES_FILE, { events: [] }) || { events: [] };
  if (!Array.isArray(store.events)) store.events = [];
  return store;
}

function xsTrendingWriteStoreSafe(store) {
  try {
    const fs = require("fs");
    const path = require("path");
    const dir = path.dirname(TRENDING_SEARCHES_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const tmp = TRENDING_SEARCHES_FILE + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(store, null, 2), "utf8");
    fs.renameSync(tmp, TRENDING_SEARCHES_FILE);
  } catch {}
}

function xsTrendingNormalizeQuery(qRaw) {
  const normalized = String(qRaw || "").trim().toLowerCase().slice(0, 64);
  if (normalized.length < 2) return null;
  return normalized;
}

function xsTrendingTrackQuery(qRaw) {
  const q = xsTrendingNormalizeQuery(qRaw);
  if (!q) return null;
  const now = Date.now();
  const store = xsTrendingReadStore();
  store.events.push({ q, ts: now });

  const cutoff = now - TRENDING_WINDOW_MS;
  store.events = store.events.filter((e) => e && e.q && e.ts >= cutoff);

  if (store.events.length > TRENDING_MAX_EVENTS) {
    store.events = store.events.slice(store.events.length - TRENDING_MAX_EVENTS);
  }
  xsTrendingWriteStoreSafe(store);
  return q;
}

function xsTrendingComputeTopQueries(limit) {
  const lim = Math.max(1, Math.min(50, parseInt(String(limit || "20"), 10) || 20));
  const now = Date.now();
  const store = xsTrendingReadStore();
  const cutoff = now - TRENDING_WINDOW_MS;

  store.events = store.events.filter((e) => e && e.q && e.ts >= cutoff);
  xsTrendingWriteStoreSafe(store);

  const counts = new Map();
  for (const e of store.events) {
    counts.set(e.q, (counts.get(e.q) || 0) + 1);
  }
  const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, lim);
  return sorted.map(([q, count]) => ({ searchTerm: q, q, count })); // XS_TRENDING_SHAPE_V1
}
/* XS_TRENDING_HELPERS_FALLBACK_V1_END */
// ----------------------------
// Disk cache (scout)
// ----------------------------
function scoutCacheFile() {
  return dataFile("scout_cache.json");
}

function scoutCacheRead() {
  const j = readJson(scoutCacheFile(), {});
  // support old formats too:
  // { last: {key, items, ts}, byKey: {key: payload} }
  // OR { key, items, cachedAt } (ancien)
  if (j && typeof j === "object") {
    if (j.byKey || j.last) {
      return { last: j.last || null, byKey: j.byKey || {} };
    }
    if (j.key && Array.isArray(j.items)) {
      const payload = { key: j.key, items: j.items, ts: Date.now() };
      return { last: payload, byKey: { [j.key]: payload } };
    }
  }
  return { last: null, byKey: {} };
}

function scoutCacheWrite(c) {
  writeJson(scoutCacheFile(), c);
}

function scoutCacheGet(key) {
  const c = scoutCacheRead();
  if (c.byKey && c.byKey[key]) return c.byKey[key];
  return c.last || null;
}

function scoutCacheSet(key, payload) {
  const c = scoutCacheRead();
  c.byKey = c.byKey || {};
  c.byKey[key] = payload;
  c.last = payload;
  scoutCacheWrite(c);
}

// ----------------------------
// Sorare GraphQL helper
// ----------------------------
async function sorareGraphQL(query, variables) {
  /* XS_SORARE_GRAPHQL_ENTER_PROBE_V10_BEGIN
     But: si globalThis.__XS_PUC_RAWDUMP est défini (rawDump=1), prouver que sorareGraphQL() est appelée en écrivant:
     - backend/_logs/puc_hook_enter_<stamp>.txt (ONE-SHOT: __entered)
     - si erreur d'écriture: puc_hook_enter_err_<stamp>.json
     Ne touche pas à la logique réseau; uniquement une sonde.
  */
  try {
    var xsFlag10 = globalThis.__XS_PUC_RAWDUMP;
    if (xsFlag10 && !xsFlag10.__entered) {
      xsFlag10.__entered = true;
      (function(){
        try {
          var xsFs10 = require("fs");
          var xsPath10 = require("path");
          var xsStamp10 = String(xsFlag10.stamp || new Date().toISOString().replace(/[:.]/g, "-"));
          var xsDirs10 = [
            xsPath10.join(process.cwd(), "_logs"),
            xsPath10.join(__dirname, "_logs"),
          ];
          var wrote10 = false;
          var lastErr10 = null;

          for (var i10=0; i10<xsDirs10.length; i10++) {
            try {
              xsFs10.mkdirSync(xsDirs10[i10], { recursive: true });
              var fp10 = xsPath10.join(xsDirs10[i10], "puc_hook_enter_" + xsStamp10 + ".txt");
              xsFs10.writeFileSync(fp10, "enter=1\nat=" + new Date().toISOString() + "\n", "utf8");
              wrote10 = true;
              break;
            } catch(e10) { lastErr10 = e10; }
          }

          if (!wrote10 && lastErr10) {
            try {
              xsFs10.mkdirSync(xsDirs10[0], { recursive: true });
              var ef10 = xsPath10.join(xsDirs10[0], "puc_hook_enter_err_" + xsStamp10 + ".json");
              xsFs10.writeFileSync(ef10, JSON.stringify({
                at: new Date().toISOString(),
                message: String(lastErr10 && (lastErr10.message || lastErr10) || ""),
                code: String(lastErr10 && (lastErr10.code || lastErr10.name || "") || ""),
                stack: String(lastErr10 && lastErr10.stack || "")
              }, null, 2), "utf8");
            } catch(e101) {}
          }
        } catch(eOuter10) {}
      })();
    }
  } catch(eAll10) {}
  /* XS_SORARE_GRAPHQL_ENTER_PROBE_V10_END */

  

  const res = await fetch(SORARE_GQL, {
    method: "POST",
    headers: sorareHeaders(),
    body: JSON.stringify({ query, variables: variables || {} }),
  });  // XS_SORAREGRAPHQL_NONOK_HANDLER_V1T (BEGIN)
  // If Sorare returns HTTP !ok (ex 422), capture body to expose GraphQL field errors.
  if (!res.ok) {
    let xsBodyText = "";
    let xsBodyJson = null;
    try { xsBodyText = await res.text(); } catch (e) {}
    try { if (xsBodyText) xsBodyJson = JSON.parse(xsBodyText); } catch (e) {}

    const xsFirstMsg =
      (xsBodyJson && xsBodyJson.errors && xsBodyJson.errors[0] && xsBodyJson.errors[0].message)
        ? xsBodyJson.errors[0].message
        : null;

    const err = new Error(xsFirstMsg ? ("Sorare HTTP " + res.status + ": " + xsFirstMsg) : ("Sorare HTTP " + res.status));
    err.status = res.status;
    err.graphQLErrors = (xsBodyJson && xsBodyJson.errors) ? xsBodyJson.errors : null;
    err.responseBody = xsBodyText ? xsBodyText.slice(0, 4000) : null;
    throw err;
  }
  // XS_SORAREGRAPHQL_NONOK_HANDLER_V1T (END)


  // ex: 429, 502...
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    const err = new Error(`Sorare HTTP ${res.status}`);
    err.status = res.status;
    err.body = txt;
    throw err;
  }


  

  const json = await res.json();

  /* XS_SORARE_GRAPHQL_RAWDUMP_HOOK_V12_BEGIN
     But: si globalThis.__XS_PUC_RAWDUMP est défini, dumper la réponse RAW GraphQL APRES json() (donc gql != null).
     Preuve: écrit aussi un marker puc_hook_rawdump_seen_<stamp>.txt
     Safe: one-shot, try/catch, fallback dirs, vars uniques, n'impacte pas la logique.
  */
  try {
    var xsFlag12 = globalThis.__XS_PUC_RAWDUMP;
    if (xsFlag12 && !xsFlag12.__done12) {
      (function(){
        try {
          var xsFs12 = require("fs");
          var xsPath12 = require("path");
          var xsStamp12 = String(xsFlag12.stamp || new Date().toISOString().replace(/[:.]/g, "-"));
          var xsDirs12 = [
            xsPath12.join(process.cwd(), "_logs"),
            xsPath12.join(__dirname, "_logs"),
          ];

          var xsPayload12 = {
            ...xsFlag12,
            hookAt: new Date().toISOString(),
            hook: "V12_AFTER_JSON",
            query: (typeof query !== "undefined") ? query : null,
            variables: (typeof variables !== "undefined") ? variables : null,
            gql: (typeof json !== "undefined") ? json : null
          };

          var xsWrote12 = false;
          var xsErr12 = null;

          for (var j12=0; j12<xsDirs12.length; j12++) {
            try {
              xsFs12.mkdirSync(xsDirs12[j12], { recursive: true });

              var seen12 = xsPath12.join(xsDirs12[j12], "puc_hook_rawdump_seen_" + xsStamp12 + ".txt");
              xsFs12.writeFileSync(seen12, "seen=1\nat=" + new Date().toISOString() + "\n", "utf8");

              var fp12 = xsPath12.join(xsDirs12[j12], "puc_gql_raw_" + xsStamp12 + ".json");
              xsFs12.writeFileSync(fp12, JSON.stringify(xsPayload12, null, 2), "utf8");

              xsWrote12 = true;
              break;
            } catch(ej12) { xsErr12 = ej12; }
          }

          if (!xsWrote12 && xsErr12) {
            try {
              xsFs12.mkdirSync(xsDirs12[0], { recursive: true });
              var ef12 = xsPath12.join(xsDirs12[0], "puc_gql_raw_err_" + xsStamp12 + ".json");
              xsFs12.writeFileSync(ef12, JSON.stringify({
                at: new Date().toISOString(),
                message: String(xsErr12 && (xsErr12.message || xsErr12) || ""),
                code: String(xsErr12 && (xsErr12.code || xsErr12.name || "") || ""),
                stack: String(xsErr12 && xsErr12.stack || "")
              }, null, 2), "utf8");
            } catch(ej121) {}
          }
        } catch(eh12) {}
      })();

      try { xsFlag12.__done12 = true; } catch(ehDone12) {}
      try { globalThis.__XS_PUC_RAWDUMP = null; } catch(ehClr12) {}
    }
  } catch(eOuter12) {}
  /* XS_SORARE_GRAPHQL_RAWDUMP_HOOK_V12_END */

  if (json.errors && json.errors.length) {
    const err = new Error(json.errors[0]?.message || "Sorare GraphQL error");
    err.graphQLErrors = json.errors;
    err.data = json.data;
    throw err;
  }
  return json.data;
}

// ----------------------------
// Identifier -> slug (user)
// ----------------------------
function resolveUserSlug(identifier) {
  const s = String(identifier || "").trim();
  if (!s) return "";

  // URL sorare club
  // ex: https://sorare.com/fr/football/my-club/darkflow
  // ex: https://sorare.com/fr/football/clubs/darkflow
  const m1 = s.match(/sorare\.com\/[^\/]+\/football\/my-club\/([^\/\?#]+)/i);
  if (m1) return m1[1];
  const m2 = s.match(/sorare\.com\/[^\/]+\/football\/clubs\/([^\/\?#]+)/i);
  if (m2) return m2[1];

  // sinon on suppose slug direct
  return s.replace(/^@/, "");
}

// ----------------------------
// anyCards enrichment (robuste avec fallbacks)
// ----------------------------
async function fetchAnyCards(slugs) {
  const uniq = Array.from(new Set((slugs || []).filter(Boolean)));
  if (!uniq.length) return [];

  const queries = [
    // "riche" (peut échouer si certains champs n'existent pas)
    `
      query AnyCards($slugs:[String!]) {
        anyCards(slugs:$slugs) {
          slug
          rarityTyped
          seasonYear
          serialNumber
          anyPositions
          pictureUrl
          anyTeam { name slug }
          anyPlayer { displayName slug }
        }
      }
    `,
    // fallback 1 (retire slug player/team si ça casse)
    `
      query AnyCards($slugs:[String!]) {
        anyCards(slugs:$slugs) {
          slug
          rarityTyped
          seasonYear
          serialNumber
          anyPositions
          pictureUrl
          anyTeam { name }
          anyPlayer { displayName }
        }
      }
    `,
    // fallback 2 (minimal)
    `
      query AnyCards($slugs:[String!]) {
        anyCards(slugs:$slugs) {
          slug
          rarityTyped
          seasonYear
          anyPositions
        }
      }
    `,
  ];

  let lastErr = null;
  for (const q of queries) {
    try {
      const data = await sorareGraphQL(q, { slugs: uniq });

    

          return (data && data.anyCards) ? data.anyCards : [];
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("anyCards failed");
}

// ----------------------------
// Live single sale offers (public) + EUR best-effort
// ----------------------------
async function fetchLiveSingleSaleOffers(lastN, after) {
  const N = Math.max(1, Math.min(Number(lastN || 50), 200));
  const afterVar = after ? String(after) : null; // XS_PUBLIC_PAGINATION_AFTERVAR_V1

  // Sans clé: on réduit la complexité (pas de pictureUrl)
  const qEur_PUBLIC = `
    query Live($first:Int!, $after:String) {
      tokens {
        liveSingleSaleOffers(first:$first, after:$after) {
          nodes {
            id
            senderSide {
              anyCards { slug }
              amounts { eurCents }
            }
          }
        }
      }
    }
  `;

  const qEur_REAL = `
    query Live($last:Int!) {
      tokens {
        liveSingleSaleOffers(last:$last) {
          nodes {
            id
            senderSide {
              anyCards { slug pictureUrl }
              amounts { eurCents }
            }
          }
        }
      }
    }
  `;

  const qWei_PUBLIC = `
    query Live($last:Int!) {
      tokens {
        liveSingleSaleOffers(last:$last) {
          nodes {
            id
            senderSide {
              anyCards { slug }
              amounts { wei }
            }
          }
        }
      }
    }
  `;

  const qWei_REAL = `
    query Live($last:Int!) {
      tokens {
        liveSingleSaleOffers(last:$last) {
          nodes {
            id
            senderSide {
              anyCards { slug pictureUrl }
              amounts { wei }
            }
          }
        }
      }
    }
  `;

  const qEur = hasSorareAuth() ? qEur_REAL : qEur_PUBLIC;
  const qWei = hasSorareAuth() ? qWei_REAL : qWei_PUBLIC;

  try {
    const data = await sorareGraphQL(qEur, { last: N });
    const nodes = data?.tokens?.liveSingleSaleOffers?.nodes || [];
    return { nodes, eurMode: "eurCents" };
  } catch (e) {
    const data2 = await sorareGraphQL(qWei, { last: N });
    const nodes2 = data2?.tokens?.liveSingleSaleOffers?.nodes || [];
    return { nodes: nodes2, eurMode: "weiOnly" };
  }
}

  
// XS_LOCAL_PAGINATION_HELPERS_V1
function xsParseAfterOffset(afterRaw) {
  if (!afterRaw) return 0;
  const s = String(afterRaw).trim();
  if (!s) return 0;
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}
function xsPaginateArray(items, first, afterOffset) {
  const list = Array.isArray(items) ? items : [];
  const f = Math.max(1, Math.min(Number(first || 10), 50));
  const off = Math.max(0, Math.floor(Number(afterOffset || 0)));
  const slice = list.slice(off, off + f);
  const endCursor = String(off + slice.length);
  const hasNextPage = (off + slice.length) < list.length;
  return { slice, pageInfo: { endCursor, hasNextPage } };
}
// ----------------------------
// Routes
// ----------------------------


// XS_DEBUG_BUILD_V1
app.get("/debug/build", (req, res) => {
  res.json({ ok: true, pid: process.pid, startedAtIso: XS_SERVER_STARTED_AT_ISO }); 

});

  // XS_RESTORE_HEALTH_ROOT_V2
  app.get("/", (req, res) => res.status(200).send("OK"));
/* XS_BACKEND_PAGE1_HIDE_COMMON_SERVER_V2B_HOTFIX (BEGIN)
   - Helper GLOBAL: évite "xsPage1ApplyHideCommon is not defined"
   - Applique hideCommon sur payload.cards et pose headers diag.
*/
function xsPage1ApplyHideCommon(payload, hideCommon, res) {
  try {
    const hide = true; /* XS_PUC_FORCE_NO_COMMON_GLOBAL_V1: force hide commons (ignore query) */
    const cardsArr = (payload && Array.isArray(payload.cards)) ? payload.cards : null;
    const rawCount = cardsArr ? cardsArr.length : 0;

    let outCards = cardsArr;
    if (hide && cardsArr) {
      outCards = cardsArr.filter((c) => {
        const r =
          (typeof (c && c.rarity) === "string") ? c.rarity :
          (c && c.rarity && typeof c.rarity.slug === "string") ? c.rarity.slug : "";
        const rr = String(r || "").toLowerCase();
        const slug = String((c && c.slug) || "").toLowerCase();
        if (rr === "common") return false;
        if (slug.includes("-common-")) return false;
        return true;
      });
    }

    const outCount = outCards ? outCards.length : 0;

    try {
      if (res && typeof res.setHeader === "function") {
        res.setHeader("X-XS-PUC-HIDECOMMON", hide ? "1" : "0");
        res.setHeader("X-XS-PUC-RAWCOUNT", String(rawCount));
        res.setHeader("X-XS-PUC-OUTCOUNT", String(outCount));
      }
    } catch {}

    if (cardsArr) return { ...(payload || {}), cards: outCards };
    return payload;
  } catch (e) {
    try {
      if (res && typeof res.setHeader === "function") {
        res.setHeader("X-XS-PUC-HIDECOMMON", hideCommon ? "1" : "0");
      }
    } catch {}
    return payload;
  }
}
/* XS_BACKEND_PAGE1_HIDE_COMMON_SERVER_V2B_HOTFIX (END) */
/* XS_BACKEND_PAGE1_CACHE_TTL_60S_V1B_SAFE (BEGIN)
   Cache mémoire TTL SAFE pour /public-user-cards-page.
   - clé: identifier|after|first|enrich|hideCommon
   - valeur: { ts, payload }
*/
const xsPage1CacheV1B = new Map();
const XS_PAGE1_CACHE_TTL_MS_V1B = 60 * 1000;

function xsPage1CacheKeyV1B(req) {
  const ident = String(req.query.identifier || "").trim();
  const after = String(req.query.after || "").trim();
  const first = String(req.query.first || "").trim();
  const enrich = String(req.query.enrich || "").trim();
  const hideCommon = String(req.query.hideCommon || "").trim();
  return [ident, after, first, enrich, hideCommon].join("|");
}

function xsPage1CacheGetV1B(key) {
  const now = Date.now();
  const hit = xsPage1CacheV1B.get(key);
  if (!hit) return null;
  if (!hit.ts || (now - hit.ts) > XS_PAGE1_CACHE_TTL_MS_V1B) {
    xsPage1CacheV1B.delete(key);
    return null;
  }
  return hit.payload;
}

function xsPage1CacheSetV1B(key, payload) {
  xsPage1CacheV1B.set(key, { ts: Date.now(), payload });
  // garde-fou mémoire
  if (xsPage1CacheV1B.size > 500) {
    const firstKey = xsPage1CacheV1B.keys().next().value;
    if (firstKey) xsPage1CacheV1B.delete(firstKey);
  }
}
/* XS_BACKEND_PAGE1_CACHE_TTL_60S_V1B_SAFE (END) */
/* XS_BACKEND_PAGE1_RATE_LIMIT_STALE_ON_429_V1C (BEGIN)
   Fallback STALE sur rate-limit Sorare (429) pour /public-user-cards-page.
   - On garde "last good payload" par key (identifier|after|first|enrich|hideCommon)
   - Si 429: renvoyer lastGood au lieu de vide/crash + Retry-After si dispo
*/
const xsPage1LastGoodV1C = new Map();
const XS_PAGE1_LASTGOOD_MAX_V1C = 500;

function xsPage1RememberLastGoodV1C(key, payload) {
  try {
    if (!key) return;
    xsPage1LastGoodV1C.set(key, { ts: Date.now(), payload });
    if (xsPage1LastGoodV1C.size > XS_PAGE1_LASTGOOD_MAX_V1C) {
      const firstKey = xsPage1LastGoodV1C.keys().next().value;
      if (firstKey) xsPage1LastGoodV1C.delete(firstKey);
    }
  } catch {}
}

function xsPage1ExtractRetryAfterV1C(e) {
  try {
    const ra =
      (e && (e.retryAfter || e.retry_after || e["retry-after"])) ||
      (e && e.headers && (e.headers["retry-after"] || e.headers["Retry-After"])) ||
      null;
    if (ra == null) return null;
    const s = String(ra).trim();
    return s.length ? s : null;
  } catch { return null; }
}

function xsLooksLike429V1C(e) {
  try {
    const status =
      (e && (e.status || e.statusCode || e.httpStatus || e.http_status)) ||
      null;
    if (String(status) === "429") return true;
    const msg = String((e && (e.message || e.toString && e.toString())) || "");
    if (msg.includes("429")) return true;
    return false;
  } catch { return false; }
}
/* XS_BACKEND_PAGE1_RATE_LIMIT_STALE_ON_429_V1C (END) */
app.get("/health", (req, res) => res.json({ ok: true }));
  // XS_RESTORE_HEALTH_ROOT_V2_END
// XS_SNAPSHOTS_V1_ROUTES_START
app.post("/snapshots/ingest", (req, res) => {
  try {
    const snapshots = req.body?.snapshots;
    if (!Array.isArray(snapshots)) {
      return res.status(400).json({ ok: false, error: "snapshots_missing_array" });
    }
    const normalized = snapshots.map((snap) => {
      const obj = snap && typeof snap === "object" ? { ...snap } : { value: snap };
      if (!obj.ts) obj.ts = new Date().toISOString();
      return obj;
    });
    if (normalized.length) appendSnapshots(normalized);
return res.json({ ok: true, appended: normalized.length, file: "data/snapshots.jsonl" });
  } catch (e) {
    return res.status(500).json({ ok: false, error: "snapshot_ingest_failed", detail: e?.message || String(e) });
  }
});

app.get("/export/snapshots.csv", (req, res) => {
  try {
    const fs = require("fs");
    const from = parseDayStartUtc(req.query.from ? String(req.query.from) : null);
    const to = parseDayEndUtc(req.query.to ? String(req.query.to) : null);
    const sourceFilter = req.query.source ? String(req.query.source) : null;
  const raw = (o && typeof o.priceEur === "number" && Number.isFinite(o.priceEur)) ? (o.priceEur.toFixed(2) + " €") : "";
    const lines = raw ? raw.split(/\r?\n/).filter(Boolean) : [];

    const header = ["ts","source","playerSlug","playerName","cardSlug","rarity","eur","eurCents","assetId"];
    const rows = ["\uFEFF" + header.join(",")];

    for (const line of lines) {
      let snap;
      try { snap = JSON.parse(line); } catch { continue; }

      const ts = snap?.ts ? new Date(snap.ts) : null;
      if (!ts || Number.isNaN(ts.getTime())) continue;
      if (from && ts < from) continue;
      if (to && ts > to) continue;
      if (sourceFilter && snap?.source !== sourceFilter) continue;

      const row = [
        snap.ts || "",
        snap.source || "",
        snap.playerSlug || "",
        snap.playerName || "",
        snap.cardSlug || "",
        snap.rarity || "",
        snap.eur ?? "",
        snap.eurCents ?? "",
        snap.assetId || ""
      ].map(csvEscape);

      rows.push(row.join(","));
    }

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    return res.send(rows.join("\n"));
  } catch (e) {
    return res.status(500).json({ ok: false, error: "snapshot_export_failed", detail: e?.message || String(e) });
  }
});

app.get("/snapshots/stats", (req, res) => {
  try {
    const fs = require("fs");
  const raw = (o && typeof o.priceEur === "number" && Number.isFinite(o.priceEur)) ? (o.priceEur.toFixed(2) + " €") : "";
    const lines = raw ? raw.split(/\r?\n/).filter(Boolean) : [];
    const sources = {};
    let count = 0;

    for (const line of lines) {
      let snap;
      try { snap = JSON.parse(line); } catch { continue; }
      count += 1;
      const src = snap?.source || "unknown";
      sources[src] = (sources[src] || 0) + 1;
    }
return res.json({ ok: true, lines: count, sources });
  } catch (e) {
    return res.status(500).json({ ok: false, error: "snapshot_stats_failed", detail: e?.message || String(e) });
  }
});
// XS_SNAPSHOTS_V1_ROUTES_END


// Public user cards (paged)
/* XS_FIX_PUBLIC_USER_CARDS_ENRICH_V2_BEGIN
   - Branche /public-user-cards-page sur xsNormalizePublicUserCard(node)
   - Essaie d’enrichir la query GraphQL (rarityTyped/season/player/club/positions/avatar)
   Safe: si champs absents => undefined.
   XS_FIX_PUBLIC_USER_CARDS_ENRICH_V2_END */
/* XS_FIX_PUBLIC_USER_CARDS_ENRICH_V3_BEGIN
   - Enrichit la selection set GraphQL de /public-user-cards-page quand c'est possible
   - Fallback auto: si Sorare refuse des champs (GraphQL errors), retry en mode minimal (slug+pictureUrl)
   XS_FIX_PUBLIC_USER_CARDS_ENRICH_V3_END */
/* XS_PUBLIC_USER_CARDS_ECHO_QUERY_V1_BEGIN
   - En mode debug=1, renvoie la query GraphQL et les variables réellement utilisées
   - But: arrêter de deviner la shape Sorare (preuve brute)
   XS_PUBLIC_USER_CARDS_ECHO_QUERY_V1_END */
/* XS_PUBLIC_USER_CARDS_ECHO_QUERY_FIX_V2_BEGIN
   - Fix ReferenceError "query is not defined" (echo debug)
   - Bufferise query/variables dans xsDbgQuery/xsDbgVariables
   XS_PUBLIC_USER_CARDS_ECHO_QUERY_FIX_V2_END */
/* XS_PUBLIC_USER_CARDS_ECHO_QUERY_FIX_V3_BEGIN
   - Capture la query/variables RÉELLES utilisées par /public-user-cards-page
   - Ici la route utilise q1/q2 (pas const query/variables)
   - debug=1 renvoie _debugQuery/_debugVariables sans jamais crasher
   XS_PUBLIC_USER_CARDS_ECHO_QUERY_FIX_V3_END */
app.get("/public-user-cards-page", async (req, res) => {
  /* XS_PUC_RESJSON_WRAP_V18_BEGIN
     But:
     - Intercepter l'objet réellement envoyé à res.json (peu importe les variables locales)
     - Supporte shapes:
       A) body.cards[] (array)
       B) body.cards.nodes[] (connection)
     - Normalise: season{year} depuis seasonYear si season=null, rarity, serialNumber (si absent)
     - enrich=1: merge anyCard/player/activeClub/anyPositions via fetchAnyCards(slugs)
     Safe: try/catch total + headers debug ; ne casse pas la route
  */
  try {
    if (!res.__xsPucJsonWrapV18) {
      res.__xsPucJsonWrapV18 = true;

      const _xsOrigJsonV18 = res.json.bind(res);

      res.json = function(xsBodyV18) {
        try {
          if (res.__xsPucJsonWrapV18_sent) return;
          res.__xsPucJsonWrapV18_sent = true;
        } catch(eSent) {}

        const doSend = async () => {
          try {
            try { res.setHeader("X-XS-PUC-JSONWRAP", "1"); } catch(eH0) {}

            const wantsEnrich = String(req?.query?.enrich ?? "") === "1";

            let arr = null;
            let where = "";

            // A) cards[] array
            try {
              if (xsBodyV18 && Array.isArray(xsBodyV18.cards)) { arr = xsBodyV18.cards; where = "body.cards[]"; }
            } catch(eA) {}

            // B) cards.nodes[] connection
            try {
              if (!arr && xsBodyV18 && xsBodyV18.cards && Array.isArray(xsBodyV18.cards.nodes)) { arr = xsBodyV18.cards.nodes; where = "body.cards.nodes[]"; }
            } catch(eB) {}

            if (arr && Array.isArray(arr)) {
              try { res.setHeader("X-XS-PUC-NORM-WHERE", where || "?"); res.setHeader("X-XS-PUC-NORM-JSONWRAP", "1"); } catch(eH1) {}

              // 1) Normalize IN-PLACE
              for (let i=0; i<arr.length; i++) {
                const it = arr[i] || {};
                const slug = String(it && it.slug ? it.slug : "");

                // serialNumber (only if missing)
                let serialNumber = (it && typeof it.serialNumber === "number") ? it.serialNumber : null;
                if (serialNumber === null) {
                  try {
                    const m = slug.match(/-(\d+)$/);
                    if (m && m[1]) serialNumber = Number(m[1]);
                  } catch(eS) {}
                }

                // rarity
                const rarityTyped = it && (it.rarityTyped || it.rarity) ? String(it.rarityTyped || it.rarity) : null;
                const rarity = (it && it.rarity) ? it.rarity : (rarityTyped ? rarityTyped : null);

                // season
                const seasonYear = (it && (it.seasonYear || (it.season && it.season.year))) ? Number(it.seasonYear || (it.season && it.season.year)) : null;
                const season = (it && it.season) ? it.season : (seasonYear ? { year: seasonYear } : null);

                arr[i] = {
                  ...it,
                  serialNumber: (serialNumber !== null && !Number.isNaN(serialNumber)) ? serialNumber : (it && it.serialNumber ? it.serialNumber : null),
                  rarity,
                  season,
                };
              }

              // 2) Enrich anyCards
              if (wantsEnrich) {
                try {
                  const slugs = arr.map(x => x && x.slug).filter(Boolean);
                  const xsAny = await fetchAnyCards(slugs).catch(() => []);
                  const map = new Map();
                  try { (xsAny || []).forEach(c => { if (c && c.slug) map.set(String(c.slug), c); }); } catch(eM) {}

                  for (let i=0; i<arr.length; i++) {
                    const n = arr[i] || {};
                    const extra = map.get(String(n && n.slug ? n.slug : "")) || null;
                    if (!extra) continue;

                    const player = (extra.player || extra.anyPlayer || null);
                    let activeClub = (player && player.activeClub) ? player.activeClub : (extra.activeClub || null);
/* XS_PUC_ACTIVECLUB_FALLBACK_V19_BEGIN
   Fallback pragmatique: si Sorare anyCards ne fournit pas player.activeClub,
   on déduit un 'activeClub' minimal depuis anyTeam (name/slug).
*/
try {
  if (!activeClub && extra && extra.anyTeam) {
    activeClub = { name: (extra.anyTeam.name || null), slug: (extra.anyTeam.slug || null) };
  }
} catch(eClubV19) {}
/* XS_PUC_ACTIVECLUB_FALLBACK_V19_END */
                    const anyPositions = (player && player.anyPositions) ? player.anyPositions : (extra.anyPositions || null);

                    arr[i] = {
                      ...n,
                      anyCard: extra,
                      player: n.player || player || null,
                      activeClub: n.activeClub || activeClub || null,
                      anyPositions: n.anyPositions || anyPositions || null,
                    };
                  }

                  try { res.setHeader("X-XS-PUC-ENRICH-ANYCARDS", "1"); } catch(eHe) {}
                } catch(eEn) {
                  try { res.setHeader("X-XS-PUC-ENRICH-ANYCARDS", "ERR"); } catch(eHe2) {}
                }
              }

              // Re-attach if connection
              try {
                if (xsBodyV18 && xsBodyV18.cards && Array.isArray(xsBodyV18.cards.nodes)) xsBodyV18.cards.nodes = arr;
              } catch(eR1) {}
              try {
                if (xsBodyV18 && Array.isArray(xsBodyV18.cards)) xsBodyV18.cards = arr;
              } catch(eR2) {}
            } else {
              try { res.setHeader("X-XS-PUC-NORM-JSONWRAP", "0"); } catch(eH2) {}
            }
          } catch(eAll) {
            try { res.setHeader("X-XS-PUC-NORM-JSONWRAP", "ERR"); } catch(eH3) {}
          }

          return _xsOrigJsonV18(xsBodyV18);
        };

        doSend().catch(() => {
          try { return _xsOrigJsonV18(xsBodyV18); } catch(eFinal) {}
        });
      };

      try { res.setHeader("X-XS-PUC-JSONWRAP-SET", "1"); } catch(eHset) {}
    }
  } catch(eWrap) {}
  /* XS_PUC_RESJSON_WRAP_V18_END */
    /* XS_PUC_GLOBAL_RAWDUMP_FLAG_V7_BEGIN
       But: si rawDump=1, activer un flag global ONE-SHOT pour dumper la prochaine réponse sorareGraphQL().
       Raison: l'appel sorareGraphQL peut être dans une helper => on hook sorareGraphQL directement.
    */
    const xsPucRawDumpFlagV7 = String(req?.query?.rawDump ?? "") === "1";
    if (xsPucRawDumpFlagV7) {
      (function(){
        try {
          var xsStampF7 = new Date().toISOString().replace(/[:.]/g, "-");
          globalThis.__XS_PUC_RAWDUMP = {
            at: new Date().toISOString(),
            stamp: xsStampF7,
            route: "/public-user-cards-page",
            identifier: (typeof identifier !== "undefined") ? identifier : null,
            first: (typeof first !== "undefined") ? first : null,
            after: (typeof after !== "undefined") ? after : null,
            enrich: (typeof enrich !== "undefined") ? enrich : null,
          };
          try { res.setHeader("X-XS-PUC-RAW-FLAG", "1"); res.setHeader("X-XS-PUC-RAW-FLAG-STAMP", String(xsStampF7).slice(-40)); } catch(ehF7) {}
        } catch(eF7) {
          try { res.setHeader("X-XS-PUC-RAW-FLAG", "ERR"); } catch(eh2F7) {}
        }
      })();
    }
    /* XS_PUC_GLOBAL_RAWDUMP_FLAG_V7_END */

    /* XS_PUC_RAW_ENTER_PROBE_V5_BEGIN
       But: prouver que rawDump=1 est vu AU DEBUT du handler /public-user-cards-page,
       éviter collisions de variables (scope isolé), et capturer l'erreur si write fail.
       Écrit backend/_logs/puc_raw_enter_*.txt ou puc_raw_enter_err_*.json
    */
    const xsPucRawEnterV5 = String(req?.query?.rawDump ?? "") === "1";
    if (xsPucRawEnterV5) {
      (function(){
        try {
          var xsFs = require("fs");
          var xsPath = require("path");
          var stamp = new Date().toISOString().replace(/[:.]/g, "-");
          var dirs = [
            xsPath.join(process.cwd(), "_logs"),
            xsPath.join(__dirname, "_logs"),
          ];

          var wrote = false;
          var wrotePath = null;
          var lastErr = null;

          for (var i=0; i<dirs.length; i++) {
            var dir = dirs[i];
            try {
              xsFs.mkdirSync(dir, { recursive: true });
              var fp = xsPath.join(dir, "puc_raw_enter_" + stamp + ".txt");
              xsFs.writeFileSync(fp, "enter=1\n", "utf8");
              wrote = true;
              wrotePath = fp;
              break;
            } catch (e2) {
              lastErr = e2;
            }
          }

          try {
            res.setHeader("X-XS-PUC-RAW-ENTER", wrote ? "1" : "ERR");
            if (wrotePath) res.setHeader("X-XS-PUC-RAW-ENTER-PATH", String(wrotePath).slice(-120));
            if (!wrote && lastErr) {
              var code = (lastErr && (lastErr.code || lastErr.name)) ? String(lastErr.code || lastErr.name) : "err";
              res.setHeader("X-XS-PUC-RAW-ENTER-ERR", code.slice(0, 60));
            }
          } catch(eh) {}

          if (!wrote && lastErr) {
            try {
              xsFs.mkdirSync(dirs[0], { recursive: true });
              var ef = xsPath.join(dirs[0], "puc_raw_enter_err_" + stamp + ".json");
              xsFs.writeFileSync(ef, JSON.stringify({
                at: new Date().toISOString(),
                message: String(lastErr && (lastErr.message || lastErr) || ""),
                code: String(lastErr && (lastErr.code || lastErr.name || "") || ""),
                stack: String(lastErr && lastErr.stack || "")
              }, null, 2), "utf8");
            } catch(e3) {}
          }
        } catch (e) {
          try { res.setHeader("X-XS-PUC-RAW-ENTER", "ERR"); res.setHeader("X-XS-PUC-RAW-ENTER-ERR", "outer"); } catch(eh2) {}
        }
      })();
    }
    /* XS_PUC_RAW_ENTER_PROBE_V5_END */

    

  
  
  
  // XS_BACKEND_PAGE1_CACHE_TTL_60S_V1B_SAFE: cache read + safe res.json wrapper
  const xsPage1KeyV1B = xsPage1CacheKeyV1B(req);
  /* XS_FIX_XSCACHEDPAYLOAD_UNDEFINED_V1G
     Fix: xsCachedPayloadV1B was referenced but not defined => 500.
     On rétablit une lecture cache TTL SAFE.
  */
  let xsCachedPayloadV1B = null;
  try { xsCachedPayloadV1B = xsPage1CacheGetV1B(xsPage1KeyV1B); } catch (e) { xsCachedPayloadV1B = null; }
  /* XS_PUC_RAWDUMP_BYPASS_CACHE_V1H
     rawDump=1 doit forcer l'exécution complète (dump fichiers + headers),
     même si le cache TTL a un HIT.
     Note: le cache-key ignore rawDump => sans bypass, rawDump se fait court-circuiter.
  */
  const xsRawDumpBypassV1H = String(req.query && req.query.rawDump != null ? req.query.rawDump : "").trim() === "1";
  if (xsRawDumpBypassV1H) {
    try {
      res.setHeader("X-XS-PUC-RAW", "1");
      res.setHeader("X-XS-PUC-CACHE-BYPASS", "1");
    } catch (e) {}
    xsCachedPayloadV1B = null; // force MISS => on passe dans le pipeline complet
  }


  /* XS_BACKEND_PAGE1_FORCE_STALE_DIRECT_V1F2 (DEBUG)
     Test STALE SANS throw fragile:
     - ?xsForce429=1 => renvoie lastGood directement (headers STALE + RL + Retry-After)
     Prérequis: faire 1 call normal (MISS) pour remplir lastGood, puis call avec &xsForce429=1.
  */
  const xsForce429DirectV1F2 = String(req.query.xsForce429 || "").trim() === "1";
  if (xsForce429DirectV1F2) {
    const ra = "3";
    const hit = (typeof xsPage1LastGoodV1C !== "undefined") ? xsPage1LastGoodV1C.get(xsPage1KeyV1B) : null;
    if (hit && hit.payload) {
      try {
        res.setHeader("X-XS-PUC-FORCE429", "1");
        res.setHeader("X-XS-PUC-RL", "1");
        res.setHeader("X-XS-PUC-CACHE", "STALE");
        res.setHeader("X-XS-PUC-STALE-AGE-MS", String(Date.now() - (hit.ts || Date.now())));
        res.setHeader("Retry-After", ra);
      } catch {}
      return res.status(200).json(hit.payload);
    }
    try {
      res.setHeader("X-XS-PUC-FORCE429", "1");
      res.setHeader("X-XS-PUC-RL", "1");
      res.setHeader("Retry-After", ra);
    } catch {}
    return res.status(503).json({ ok:false, error:"RATE_LIMIT", hint:"XS forced 429 (no lastGood yet)", retryAfter: ra });
  }

    if (xsCachedPayloadV1B) {
    try {

      res.setHeader("X-XS-PUC-CACHE", "HIT");
      res.setHeader("X-XS-PUC-CACHE-TTLMS", String(XS_PAGE1_CACHE_TTL_MS_V1B));
    } catch {}
    return res.json(xsCachedPayloadV1B);
  } else {
    try {
      res.setHeader("X-XS-PUC-CACHE", "MISS");
      res.setHeader("X-XS-PUC-CACHE-TTLMS", String(XS_PAGE1_CACHE_TTL_MS_V1B));
    } catch {}
  }

  // Wrap res.json() pour capturer le payload FINAL sans toucher aux callsites existants
  const __xsJsonOrigV1B = res.json.bind(res);
  res.json = (payload) => {    
    // XS_BACKEND_PAGE1_RATE_LIMIT_STALE_ON_429_V1C: remember lastGood payload
    try { xsPage1RememberLastGoodV1C(xsPage1KeyV1B, payload); } catch {}

    try {
      xsPage1CacheSetV1B(xsPage1KeyV1B, payload);
      try { res.setHeader("X-XS-PUC-CACHE-WRITE", "1"); } catch {}
    } catch {}
    return __xsJsonOrigV1B(payload);
  };

  // XS_BACKEND_PAGE1_HIDE_COMMON_SERVER_V1:
  // - supporte ?hideCommon=1 (filtre les commons dans la réponse)
  const xsHideCommon = String(req.query.hideCommon || "").trim() === "1";  // XS_PAGE1_FORCE_ENRICH_DEFAULT_V1:
  // Par défaut on veut une shape "riche" (pictureUrl/rarity/playerName/position...).
  // Si le client passe enrich=0 explicitement, on respecte.
  try {
    if (!Object.prototype.hasOwnProperty.call((req.query || {}), "enrich")) {
      req.query.enrich = "1";
    }
  } catch (e) {
    // XS_BACKEND_PAGE1_RATE_LIMIT_STALE_ON_429_V1C: fallback STALE on 429
    try {
      if (xsLooksLike429V1C(e)) {
        const ra = xsPage1ExtractRetryAfterV1C(e);
        const hit = xsPage1LastGoodV1C.get(xsPage1KeyV1B);
        if (hit && hit.payload) {
          try {
            res.setHeader("X-XS-PUC-RL", "1");
            res.setHeader("X-XS-PUC-CACHE", "STALE");
            res.setHeader("X-XS-PUC-STALE-AGE-MS", String(Date.now() - (hit.ts || Date.now())));
            if (ra) res.setHeader("Retry-After", String(ra));
          } catch {}
          return res.status(200).json(hit.payload);
        }
        // no lastGood available: expose retry-after if any and return soft 503
        try {
          res.setHeader("X-XS-PUC-RL", "1");
          if (ra) res.setHeader("Retry-After", String(ra));
        } catch {}
        return res.status(503).json({ ok:false, error:"RATE_LIMIT", hint:"Sorare 429; retry later", retryAfter: ra || null });
      }
    } catch {}
}
// XS_PUBLIC_USER_CARDS_PAGE_HDR_PROBE_V1 (BEGIN)
  try {
    // Probe headers: prouve qu'on touche CETTE route + prouve la valeur reçue
    res.setHeader("X-XS-PUC-HIT", "1");
    res.setHeader("X-XS-PUC-RAW", String(req.query && req.query.rawDump != null ? req.query.rawDump : ""));
    res.setHeader("X-XS-PUC-URL", String(req.originalUrl || req.url || "").slice(0, 180));
  } catch (e) {}
  // XS_PUBLIC_USER_CARDS_PAGE_HDR_PROBE_V1 (END)
  // XS_PUBLIC_USER_CARDS_PAGE_FILE_PROBE_V1 (BEGIN)
  try {
    const xsRawDump2 = String(req.query && req.query.rawDump != null ? req.query.rawDump : "").trim() === "1";
    // Expose cwd/dir for certainty
    try { res.setHeader("X-XS-PUC-CWD", String(process.cwd())); } catch (e0) {}
    try { res.setHeader("X-XS-PUC-DIR", String(__dirname)); } catch (e1) {}
    if (xsRawDump2) {
      const fs = require("fs");
      const path = require("path");
      const ts2 = new Date().toISOString().replace(/[:.]/g, "-");
      const fn2 = "puc_file_probe_" + ts2 + ".txt";
      const dir2 = path.join(__dirname, "_logs");
      fs.mkdirSync(dir2, { recursive: true });
      const p2 = path.join(dir2, fn2);
      fs.writeFileSync(p2, "ok " + new Date().toISOString() + " cwd=" + process.cwd() + " dir=" + __dirname, "utf8");
      try { res.setHeader("X-XS-PUC-PROBEFILE", fn2); } catch (e2) {}
    }
  } catch (e) {
    try { res.setHeader("X-XS-PUC-PROBEERR", String(e && e.message ? e.message : e)); } catch (e3) {}
  }
  // XS_PUBLIC_USER_CARDS_PAGE_FILE_PROBE_V1 (END)
const xsDbg = { query: null, variables: null };

/* XS_PUBLIC_USER_CARDS_DEBUG_SHIM_V1_BEGIN
   - Ajoute debug=1 sur /public-user-cards-page pour inspecter la shape RAW
   - Retourne _rawKeys + chemins candidats (pictureUrl, card.pictureUrl, player.slug, etc.)
   XS_PUBLIC_USER_CARDS_DEBUG_SHIM_V1_END */
const xsNormalizePublicUserCardDbg = (node, debug) => {
  const c = xsNormalizePublicUserCard(node);
  if (!debug) return c;
  const raw = node || {};
  // On évite de renvoyer tout le RAW (potentiellement énorme) => seulement keys + chemins utiles
  return {
    ...c,
    _debug: {
      rawKeys: Object.keys(raw),
      raw_pictureUrl: raw?.pictureUrl ?? null,
      raw_card_pictureUrl: raw?.card?.pictureUrl ?? null,
      raw_anyCard_pictureUrl: raw?.anyCard?.pictureUrl ?? null,
      raw_player_slug: raw?.player?.slug ?? raw?.card?.player?.slug ?? null,
      raw_player_displayName: raw?.player?.displayName ?? raw?.card?.player?.displayName ?? null,
      raw_anyPositions: raw?.player?.anyPositions ?? raw?.card?.player?.anyPositions ?? null,
      raw_activeClub_slug: raw?.player?.activeClub?.slug ?? raw?.card?.player?.activeClub?.slug ?? null,
      raw_activeClub_name: raw?.player?.activeClub?.name ?? raw?.card?.player?.activeClub?.name ?? null,
      raw_rarityTyped: raw?.rarityTyped ?? raw?.card?.rarityTyped ?? null,
      raw_season_startYear: raw?.season?.startYear ?? raw?.card?.season?.startYear ?? null
    }
  };
};


  try {
    const identifier = String(req.query.identifier || "").trim();
      // XS_SCOUT_USE_DEVICE_TOKEN_V1
  const deviceId = String(req.query.deviceId || "").trim();
  const tok = (deviceId && (typeof xsMe_getAccessToken === "function")) ? xsMe_getAccessToken(deviceId) : null;

  // Auth si APIKEY/JWT (env) ou token OAuth device
  const HAS = Boolean(SORARE_APIKEY || SORARE_JWT || tok);
const first = Math.max(1, Math.min(Number(req.query.first || 20), HAS ? 50 : 10));
    const after = req.query.after ? String(req.query.after) : null;
    const xsHasEnrich = Object.prototype.hasOwnProperty.call((req.query || {}), "enrich");
// XS_PAGE1_ENRICH_DEFAULT_COMPUTED_V1:
// - Si enrich est absent => default "1"
// - Si enrich est fourni (0/1) => respecter la valeur
const enrich = String(xsHasEnrich ? (req.query.enrich ?? "0") : "1") === "1";

// XS_PUC_ENRICH_DIAG_HEADERS_V1 (BEGIN)
// But: comprendre si enrich est actif + si on a de l'auth (APIKEY/JWT/device token)
try {
  res.setHeader("X-XS-PUC-ENRICH", enrich ? "1" : "0");
  res.setHeader("X-XS-PUC-ENRICH_Q", String(req.query && req.query.enrich != null ? req.query.enrich : ""));
  res.setHeader("X-XS-PUC-HASAUTH", HAS ? "1" : "0");
} catch (e) {}
// XS_PUC_ENRICH_DIAG_HEADERS_V1 (END)

    const slug = resolveUserSlug(identifier);
    if (!slug) return res.status(400).json({ error: "identifier missing" });


    // Query minimal (robuste)
    const q1 = `
      query UserCards($slug:String!, $first:Int!, $after:String) {
        user(slug:$slug) {
          slug
          nickname
          cards(first:$first, after:$after) {
            nodes { slug pictureUrl rarityTyped seasonYear  }
            pageInfo { endCursor hasNextPage }
          }
        }
      }
    `;

    
    /* XS_PUC_ADD_QMID_AND_DIAG_V1I
       q1 (FULL) peut casser sur certains fields => on tente une query MID (slug + pictureUrl)
       puis fallback MIN (slug only) déjà existant.
       On expose aussi des headers debug: X-XS-PUC-QMODE / Q1ERR / QMIDERR.
    */
    const qMid = `
      query UserCards($slug:String!, $first:Int!, $after:String) {
        user(slug:$slug) {
          slug
          nickname
          cards(first:$first, after:$after) {
            nodes { slug pictureUrl }
            pageInfo { endCursor hasNextPage }
          }
        }
      }
    `;

/* XS_PUC_FIX_Q2_UNDEFINED_V1
   - Fix "q2 is not defined" en fallback MIN
   - On utilise qMin (query MIN sûre) au lieu de q2
*/
const qMin = `
  query UserCards($slug:String!, $first:Int!, $after:String) {
    user(slug:$slug) {
      slug
      nickname
      cards(first:$first, after:$after) {
        nodes { slug pictureUrl }
        pageInfo { endCursor hasNextPage }
      }
    }
  }
`;let userData;
// XS_PUC_TRYCHAIN_Q1_QMID_V1L (BEGIN)
// NOTE: q1/qMid/q2 existent déjà plus haut (const q1/qMid/q2).
// But: tenter FULL -> MID -> MIN en capturant les vraies erreurs GraphQL (pas seulement setHeader).
let xsQMode = "MIN";
try {
  xsDbg.query = q1;
  xsDbg.variables = { slug, first, after };
  userData = await sorareGraphQL(q1, { slug, first, after });
  xsQMode = "FULL";
  xsDbg.qMode = "FULL";
} catch (e1) {
  try {
    const xsQ1Msg =
      (e1 && e1.graphQLErrors && e1.graphQLErrors[0] && e1.graphQLErrors[0].message)
        ? e1.graphQLErrors[0].message
        : String(e1 && e1.message ? e1.message : e1);
    xsDbg.q1Error = xsQ1Msg;
    res.setHeader("X-XS-PUC-Q1ERR", xsDbg.q1Error.slice(0, 220));    try {
      const xsWantRaw = String(req.query && req.query.rawDump != null ? req.query.rawDump : "").trim() === "1";
      if (xsWantRaw) {
        const fs = require("fs");
        const path = require("path");
        const ts = new Date().toISOString().replace(/[:.]/g, "-");
        const base = path.join(__dirname, "_logs");
        try { if (!fs.existsSync(base)) fs.mkdirSync(base, { recursive: true }); } catch (eMk) {}
        const fn = "puc_q1err_" + ts + ".json";
        const fp = path.join(base, fn);
        const payload = {
          at: new Date().toISOString(),
          status: (e1 && e1.status) ? e1.status : null,
          message: xsDbg.q1Error,
          graphQLErrors: (e1 && e1.graphQLErrors) ? e1.graphQLErrors : null
        };
        fs.writeFileSync(fp, JSON.stringify(payload, null, 2), "utf8");
        try { res.setHeader("X-XS-PUC-Q1ERRFILE", fn); } catch (eH) {}
      }
    } catch (eDump) {}
  } catch (eX) {}

  try {
    xsDbg.query = qMid;
    xsDbg.variables = { slug, first, after };
    userData = await sorareGraphQL(qMid, { slug, first, after });
    xsQMode = "MID";
    xsDbg.qMode = "MID";
  } catch (e2) {
    try {
      const xsQMMsg =
        (e2 && e2.graphQLErrors && e2.graphQLErrors[0] && e2.graphQLErrors[0].message)
          ? e2.graphQLErrors[0].message
          : String(e2 && e2.message ? e2.message : e2);
      xsDbg.qMidError = xsQMMsg;
      res.setHeader("X-XS-PUC-QMIDERR", xsDbg.qMidError.slice(0, 220));        try {
          const xsWantRaw = String(req.query && req.query.rawDump != null ? req.query.rawDump : "").trim() === "1";
          if (xsWantRaw) {
            const fs = require("fs");
            const path = require("path");
            const ts = new Date().toISOString().replace(/[:.]/g, "-");
            const base = path.join(__dirname, "_logs");
            try { if (!fs.existsSync(base)) fs.mkdirSync(base, { recursive: true }); } catch (eMk) {}
            const fn = "puc_qmiderr_" + ts + ".json";
            const fp = path.join(base, fn);
            const payload = {
              at: new Date().toISOString(),
              status: (e2 && e2.status) ? e2.status : null,
              message: xsDbg.qMidError,
              graphQLErrors: (e2 && e2.graphQLErrors) ? e2.graphQLErrors : null
            };
            fs.writeFileSync(fp, JSON.stringify(payload, null, 2), "utf8");
            try { res.setHeader("X-XS-PUC-QMIDERRFILE", fn); } catch (eH) {}
          }
        } catch (eDump) {}
    } catch (eX) {}

    xsDbg.query = qMin; /* XS_PUC_FIX_Q2_UNDEFINED_V1 */
    xsDbg.variables = { slug, first, after };
    userData = await sorareGraphQL(qMin, { slug, first, after });
    xsQMode = "MIN";
    xsDbg.qMode = "MIN";
  }
}
try { res.setHeader("X-XS-PUC-QMODE", xsQMode); } catch (eX) {}
// XS_PUC_TRYCHAIN_Q1_QMID_V1L (END)
// XS_FIX_PUC_REMOVE_NESTED_DEBUG_AND_ADD_RAWDUMP_V5 (BEGIN)
    // rawDump=1 => écrit userData (shape GraphQL) dans __dirname/_logs + headers X-XS-RAWDUMP-*
    try {
      const xsRawDump = String(req.query && req.query.rawDump != null ? req.query.rawDump : "").trim() === "1";
      if (xsRawDump) {
        const fs = require("fs");
        const path = require("path");
        const ts = new Date().toISOString().replace(/[:.]/g, "-");
        const dumpDir = path.join(__dirname, "_logs");
        fs.mkdirSync(dumpDir, { recursive: true });
        const dumpName = "puc_userData_" + ts + ".json";
        try { res.setHeader("X-XS-RAWDUMP-HIT", "1"); } catch (eH0) {}
        try { res.setHeader("X-XS-RAWDUMP-FILENAME", dumpName); } catch (eH1) {}
        const payload = {
          at: new Date().toISOString(),
          route: "/public-user-cards-page",
          identifier: String(req.query && req.query.identifier != null ? req.query.identifier : "").trim(),
          first: Number(req.query && req.query.first != null ? req.query.first : 0),
          after: (req.query && req.query.after != null) ? String(req.query.after) : null,
          enrich: String(req.query && req.query.enrich != null ? req.query.enrich : "0"),
          debug: String(req.query && req.query.debug != null ? req.query.debug : "0"),
          userData
        };
        fs.writeFileSync(path.join(dumpDir, dumpName), JSON.stringify(payload, null, 2), "utf8");
        try { res.setHeader("X-XS-RAWDUMP-OK", "1"); } catch (eH2) {}
      }
    } catch (eW) {
      try { res.setHeader("X-XS-RAWDUMP-OK", "0"); } catch (eH3) {}
      try { res.setHeader("X-XS-RAWDUMP-ERR", String(eW && eW.message ? eW.message : eW).slice(0, 160)); } catch (eH4) {}
    }
    // XS_FIX_PUC_REMOVE_NESTED_DEBUG_AND_ADD_RAWDUMP_V5 (END)
    const u = userData?.user;
    if (!u) return res.status(404).json({ error: "user not found or not public" });

    let cards = (u.cards?.nodes || []).map(c => xsNormalizePublicUserCardDbg(c, req.query.debug === "1"));

    // Enrich via anyCards(slugs)
/* XS_PUBLIC_USER_CARDS_ENRICH_NO500_V2_BEGIN
   - But: ne JAMAIS casser le endpoint si anyCards échoue
   - On log l'erreur + on renvoie les cartes non enrichies
   XS_PUBLIC_USER_CARDS_ENRICH_NO500_V2_END */
let xsEnrichError = null;

if (enrich && cards.length) {
  try {
    const slugs = cards.map(c => c.slug).filter(Boolean);
    const enriched = await fetchAnyCards(slugs);
    const map = new Map(enriched.map(x => [x.slug, x]));

    cards = cards.map(c => {
      const e = map.get(c.slug);
      if (!e) return c;
      return {
        ...c,
        pictureUrl: c.pictureUrl || e.pictureUrl || null,
        rarity: e.rarityTyped || null,
        seasonYear: e.seasonYear || null,
        serialNumber: (typeof e.serialNumber === "number") ? e.serialNumber : null,
        position: Array.isArray(e.anyPositions) ? (e.anyPositions[0] || null) : null,
        positions: Array.isArray(e.anyPositions) ? e.anyPositions : [],
        team: e.anyTeam?.name || null,
        teamSlug: e.anyTeam?.slug || null,
        playerName: e.anyPlayer?.displayName || null,
        playerSlug: e.anyPlayer?.slug || null,
      };
    });
  } catch (e) {
    xsEnrichError = String(e?.message || e || "unknown enrich error");
    console.error("XS_PUBLIC_USER_CARDS_ENRICH_NO500_V2 enrich failed:", xsEnrichError);
  }
}
      // XS_PUC_ENRICH_DIAG_HEADERS_V1 (AFTER ENRICH)
  try {
    res.setHeader("X-XS-PUC-ENRICH_TRIED", (enrich && cards.length) ? "1" : "0");
    res.setHeader("X-XS-PUC-ENRICH_ERR", xsEnrichError ? String(xsEnrichError).slice(0, 140) : "");
  } catch (e) {}

  /* XS_PUBLIC_USER_CARDS_FILTER_TDZ_FIX_V1_BEGIN
   - Fix Temporal Dead Zone: filteredCards doit exister avant toute référence
   XS_PUBLIC_USER_CARDS_FILTER_TDZ_FIX_V1_END */
let filteredCards = cards;
/* XS_PUBLIC_USER_CARDS_FILTER_V2_BEGIN
   - Robust rarity getter: rarity / rarityTyped / rarity.slug
   - Avoid infinite pagination: if returned 0, force hasNextPage=false
   - Add debug meta counts (opt-in via debug=1)
*/
function xsGetRaritySlugCard(c) {
  try {
    const a = c && typeof c === "object" ? c : {};
    const r1 = a.rarity;
    if (typeof r1 === "string") return r1.toLowerCase();
    if (r1 && typeof r1.slug === "string") return String(r1.slug).toLowerCase();
    const rt = a.rarityTyped;
    if (typeof rt === "string") return rt.toLowerCase();
    return "";
  } catch { return ""; }
}

const includeCommon = String(req.query.includeCommon || "0") === "1";
const excludeRaw = String(req.query.excludeRarities || "").trim();
const excludeSet = new Set(excludeRaw ? excludeRaw.split(",").map(s => s.trim().toLowerCase()).filter(Boolean) : []);
const defaultExcludeCommon = !includeCommon && !excludeSet.has("common");

const rawCardsArr = Array.isArray(cards) ? cards : [];
const rarityCounts = {};
for (const cc of rawCardsArr) {
  const rr = xsGetRaritySlugCard(cc) || "unknown";
  rarityCounts[rr] = (rarityCounts[rr] || 0) + 1;
}
filteredCards = rawCardsArr.filter(c => {
  const r = xsGetRaritySlugCard(c);
  if (!r) return true; // don't break if missing
  if (excludeSet.size && excludeSet.has(r)) return false;
  if (defaultExcludeCommon && r === "common") return false;
  /* XS_PUBLIC_USER_CARDS_RESPONSE_V3C_BEGIN
     - Anti-boucle HARD: si cards renvoyées = 0 => hasNextPage=false ET endCursor=null
     - Debug meta TOP-LEVEL: rawCount/filteredCount/rarityCounts (debug=1)
  */
  const xsDebug = String(req.query.debug || "0") === "1";
  
  const pi0 = u.cards?.pageInfo || { endCursor: null, hasNextPage: false };
  const outHasCards = Array.isArray(filteredCards) && filteredCards.length > 0;
  
  // Anti-boucle HARD: si on renvoie 0 cartes, on stoppe net la pagination côté client
  const pageInfo = outHasCards ? pi0 : { endCursor: null, hasNextPage: false };
  
  const payload = {
    slug: u.slug,
    nickname: u.nickname || null,
    cards: filteredCards,
    pageInfo,
  };
  
  if (xsDebug) {
    payload.meta = {
      rawCount: Array.isArray(rawCardsArr) ? rawCardsArr.length : 0,
      filteredCount: Array.isArray(filteredCards) ? filteredCards.length : 0,
      rarityCounts: (typeof rarityCounts === "object" && rarityCounts) ? rarityCounts : null,
      includeCommon: (typeof includeCommon !== "undefined") ? includeCommon : null,
      excludeRarities: (typeof excludeSet !== "undefined" && excludeSet && excludeSet.size) ? Array.from(excludeSet) : [],
      forcedHasNextPageFalse: !outHasCards && !!pi0?.hasNextPage,
    };
  }
  
  return res.json(xsPage1ApplyHideCommon(payload, xsHideCommon, res));
  /* XS_PUBLIC_USER_CARDS_RESPONSE_V3C_END */
});
  /* XS_PUBLIC_USER_CARDS_ANTILOOP_AFTER_FILTER_V1_BEGIN
     - Anti-boucle HARD: si filteredCards.length === 0 => u.cards.pageInfo forced to {endCursor:null, hasNextPage:false}
     - Proof header: X-XS-USER-CARDS: ANTILOOP_V1
  */
  try {
    const xsOutHasCards = Array.isArray(filteredCards) && filteredCards.length > 0;
    if (!xsOutHasCards) {
      if (u && u.cards && u.cards.pageInfo) {
        u.cards.pageInfo = { endCursor: null, hasNextPage: false };
      }
    }
    res.setHeader("X-XS-USER-CARDS", "ANTILOOP_V1");
  } catch (e) {
    // never break endpoint
  }
  /* XS_PUBLIC_USER_CARDS_ANTILOOP_AFTER_FILTER_V1_END */

const debug = String(req.query.debug || "0") === "1";
/* XS_PUBLIC_USER_CARDS_FILTER_V2_END */
/* XS_PUBLIC_USER_CARDS_HEADERS_SENT_GUARD_V1_BEGIN
   - But: éviter double réponse (ERR_HTTP_HEADERS_SENT)
   - Si une réponse a déjà été envoyée, on sort proprement
   XS_PUBLIC_USER_CARDS_HEADERS_SENT_GUARD_V1_END */
if (res.headersSent) {
  return;
}

  // XS_BACKEND_PAGE1_HIDE_COMMON_SERVER_V1 (BEGIN)
  // Filtre FINAL côté backend pour éviter que l'app télécharge/pagine des commons.
  // On essaye d'être robuste: rarity peut être string OU objet {slug}.
  const xsRawCount = Array.isArray(cards) ? cards.length : 0;
  let xsOutCards = Array.isArray(cards) ? cards : [];
  if (xsHideCommon) {
    xsOutCards = xsOutCards.filter((c) => {
      const r = String((c && (c.rarity || (c.rarity && c.rarity.slug))) || "").toLowerCase();
      const slug = String((c && c.slug) || "").toLowerCase();
      // Si on ne sait pas, on garde (on ne veut pas supprimer des limited par erreur).
      if (!r && !slug) return true;
      if (r === "common") return false;
      if (slug.includes("-common-")) return false;
      return true;
    });
  }
  const xsOutCount = xsOutCards.length;

  // Remplace "cards" par xsOutCards dans la réponse si possible
  // (on fait ça en réassignant la variable utilisée plus bas).
  cards = xsOutCards;

  // Headers diag
  try {
    res.setHeader("X-XS-PUC-HIDECOMMON", xsHideCommon ? "1" : "0");
    res.setHeader("X-XS-PUC-RAWCOUNT", String(xsRawCount));
    res.setHeader("X-XS-PUC-OUTCOUNT", String(xsOutCount));
  } catch {}
  // XS_BACKEND_PAGE1_HIDE_COMMON_SERVER_V1 (END)

res.json({
  ...(req.query.debug === "1"
    ? {
        _debugQuery: xsDbg.query,
        _debugVariables: xsDbg.variables,
      }
    : {}),
      slug: u.slug,
      nickname: u.nickname || null,
      cards: filteredCards,
    pageInfo: u.cards?.pageInfo || { endCursor: null, hasNextPage: false },
    meta: (req.query.debug === "1") ? { enrichError: (typeof xsEnrichError === "string" ? xsEnrichError : null) } : undefined,
    });
  } catch (e) {
  if (res.headersSent) {
    return;
  }
  res.status(500).json({
      error: String(e.message || e),
      status: e.status || null,
      graphQLErrors: e.graphQLErrors || null,
    });
  }
});

// Public player info (best-effort, plusieurs shapes)
  // XS_PUBLIC_PLAYER_SAFE (schema-safe)
  app.get("/public-player", async (req, res) => {
    try {
      const slug = String(req.query.slug || "").trim();
      if (!slug) return res.status(400).json({ error: "slug missing" });

      const url = "https://api.sorare.com/graphql";
      const query = `
        query PublicPlayer($slug: String!) {
          football {
            player(slug: $slug) {
              slug
              displayName
              anyPositions
              activeClub { name slug }
            }
          }
        }
      `;
      const variables = { slug };

      const r = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "accept": "application/json",
        },
        body: JSON.stringify({ query, variables }),
      });

      const text = await r.text();

      if (!r.ok) {
        return res.status(502).json({
          error: "public-player query failed (upstream).",
          details: "Sorare HTTP " + r.status,
          body: text.slice(0, 3000),
        });
      }

      let json;
      try { json = JSON.parse(text); }
      catch {
        return res.status(502).json({
          error: "public-player query failed (non-JSON).",
          details: "Sorare returned non-JSON",
          body: text.slice(0, 3000),
        });
      }

      if (json.errors) {
        return res.status(502).json({
          error: "public-player query failed (graphql errors).",
          details: "Sorare GraphQL errors",
          graphQLErrors: json.errors,
        });
      }

      const p = json && json.data && json.data.football ? json.data.football.player : null;
      if (!p) return res.status(404).json({ error: "player not found", slug });

      const position =
        Array.isArray(p.anyPositions) && p.anyPositions[0]
          ? (typeof p.anyPositions[0] === "string" ? p.anyPositions[0] : (p.anyPositions[0] && p.anyPositions[0].position))
          : null;
return res.json({
        playerSlug: p.slug,
        playerName: p.displayName || p.slug,
        position,
        activeClub: p.activeClub ? { name: p.activeClub.name, slug: p.activeClub.slug } : null,
      });

    } catch (e) {
      console.error("[public-player] error:", e && e.stack ? e.stack : e);
      return res.status(500).json({ error: "Internal Server Error", message: String((e && e.message) ? e.message : e) });
    }
  });
app.get("/public-player-old", async (req, res) => {
  const slug = String(req.query.slug || "").trim();
  if (!slug) return res.status(400).json({ error: "slug missing" });

  const tries = [
    // shape 1
    `
      query P($slug:String!) {
        football {
          player(slug:$slug) {
            slug
            displayName
            anyPositions
            activeClub { name slug }
          }
        }
      }
    `,
    // shape 2
    `
      query P($slug:String!) {
        footballPlayer(slug:$slug) {
          slug
          displayName
          anyPositions
          activeClub { name slug }
        }
      }
    `,
    // shape 3
    `
      query P($slug:String!) {
        player(slug:$slug) {
          ... on FootballPlayer {
            slug
            displayName
            anyPositions
            activeClub { name slug }
          }
        }
      }
    `,
  ];

  let lastErr = null;
  for (const q of tries) {
    try {
      const data = await sorareGraphQL(q, { slug });


    

    

      const p =
        data?.football?.player ||
        data?.footballPlayer ||
        data?.player ||
        null;

      if (!p) continue;
return res.json({
        slug: p.slug || slug,
        displayName: p.displayName || null,
        positions: Array.isArray(p.anyPositions) ? p.anyPositions : [],
        position: Array.isArray(p.anyPositions) ? (p.anyPositions[0] || null) : null,
        activeClub: p.activeClub ? { name: p.activeClub.name || null, slug: p.activeClub.slug || null } : null,
      });
    } catch (e) {
      lastErr = e;
    }
  }

  return res.status(500).json({
    error: "public-player query failed (schema mismatch).",
    details: String(lastErr?.message || lastErr || ""),
    graphQLErrors: lastErr?.graphQLErrors || null,
  });
});

// Scout — cards (public market snapshot + cache)
app.get("/scout/cards", async (req, res) => {
    // XS_SCOUT_USE_DEVICE_TOKEN_V1
    // XS_SCOUT_PRICE_TEXT_JSON_HOOK_V9B
    try {
      const __json = res.json.bind(res);
      res.json = (body) => {
        try {
          if (body && typeof body === 'object' && Array.isArray(body.items)) {
            body.items = body.items.map(x => {
              try {
                if (x && (!x.priceText || String(x.priceText).trim() === '')) {
                  if (typeof x.eur === 'number' && isFinite(x.eur)) x.priceText = '\u20AC' + (Number.isFinite(Number(x.eur)) ? Number(x.eur).toFixed(2) : String(x.eur));
                  else if (x.eth !== null && x.eth !== undefined && String(x.eth).trim() !== '') x.priceText = '\u039E' + String(x.eth);
                  else if (x.wei !== null && x.wei !== undefined && String(x.wei).trim() !== '') x.priceText = 'wei ' + String(x.wei);
                }
              } catch {}return x;
            });
          }
        } catch {}return __json(body);
      };
    } catch {}// XS_SCOUT_PRICE_TEXT_JSON_HOOK_V9B_END

  const deviceId = String(req.query.deviceId || "").trim();
  const tok = (deviceId && (typeof xsMe_getAccessToken === "function")) ? xsMe_getAccessToken(deviceId) : null;

  // Auth si APIKEY/JWT (env) ou token OAuth device
  const HAS = Boolean(SORARE_APIKEY || SORARE_JWT || tok);
const first = Math.max(1, Math.min(Number(req.query.first || 20), HAS ? 50 : 10));
  const after = req.query.after ? String(req.query.after) : null; // XS_AFTER_FIX_V1
  const eurOnly = String(req.query.eurOnly || "0") === "1";
  const allowUnknownPrices = (String(req.query.allowUnknownPrices || req.query.showUnknownPrices || "") === "1"); // XS_ALLOW_UNKNOWN_PRICES_V1
  const maxEur = req.query.maxEur ? Number(req.query.maxEur) : null;
  const qRaw = String(req.query.q || "").trim().toLowerCase();
  const raritiesRaw = String(req.query.rarities || "").trim().toLowerCase(); // "limited,rare"
  const sort = String(req.query.sort || "").trim().toLowerCase(); // eur_asc|eur_desc|newest

  const rarities = raritiesRaw
    ? raritiesRaw.split(",").map(s => s.trim()).filter(Boolean)
    : [];

    // XS_SCOUT_CACHE_MODE_GUARD_V1
  const xsMode = tok ? "oauth" : ((SORARE_APIKEY || SORARE_JWT) ? "auth" : "public");
  const cacheKey = ["scout", xsMode, qRaw, rarities.join(","), eurOnly ? (allowUnknownPrices ? "eur_any" : "eur") : "any" /* XS_ALLOW_UNKNOWN_PRICES_V1 */, (Number.isFinite(maxEur) ? maxEur : ""), sort].join("|");
  const cached = scoutCacheGet(cacheKey);
  let fromCache = false;
  let cacheExact = false;

  try {
    // On tire plus large, puis on filtre localement (public API limitée)
    const lastN = HAS ? Math.min(200, Math.max(50, first * 5)) : 10; // sans auth: public-safe
        let nodes = [];
    let eurMode = tok ? "oauth" : "public";

// XS_SCOUT_OAUTH_DEBUG_V2
var xsOauthErrors = null;
var xsOauthHasData = null;
var xsOauthNodeCount = null;
var xsOauthSample = null;
if (tok) {
      // Auth via OAuth token (device)
      const qAuth = `
        query ScoutOffersAuth($last: Int!) {
          tokens {
            liveSingleSaleOffers(last: $last) {
              nodes {
                id
      // XS_SCOUT_PRICE_RECEIVERSIDE_V1
                senderSide {
      // XS_OAUTH_QUERY_SENDER_AMOUNTS_V1
      // XS_FIX_GRAPHQL_COMMENT_HASH_V1
              amounts { eurCents wei }
              anyCards { slug pictureUrl }
            }
                receiverSide {
                  amounts { eurCents }
                }
              }
            }
          }
        }
      `;
            const rAuth = await xsDevOauth_graphql(tok, qAuth, { last: lastN });

// XS_SCOUT_OAUTH_DEBUG_V2
xsOauthErrors   = rAuth?.errors || null;
xsOauthHasData  = !!(rAuth?.data?.tokens?.liveSingleSaleOffers);
xsOauthNodeCount = Array.isArray(rAuth?.data?.tokens?.liveSingleSaleOffers?.nodes)
  ? rAuth.data.tokens.liveSingleSaleOffers.nodes.length
  : null;
xsOauthSample   = Array.isArray(rAuth?.data?.tokens?.liveSingleSaleOffers?.nodes)
  ? (rAuth.data.tokens.liveSingleSaleOffers.nodes[0] || null)
  : null;
    // XS_SCOUT_OAUTH_DEBUG_CLEAN_V3 (removed V1 const debug)
      nodes = rAuth?.data?.tokens?.liveSingleSaleOffers?.nodes || [];
    } else {
      const rPub = await fetchLiveSingleSaleOffers(lastN, after); // XS_PUBLIC_PAGINATION_CALL_V1
      nodes = rPub.nodes || [];
      eurMode = rPub.eurMode || "public";
    }
// Flatten offers -> card slugs
    const offers = [];
    const slugs = [];
    for (const o of (nodes || [])) {
      const c = o?.senderSide?.anyCards?.[0];
      if (!c?.slug) continue;

      let eur = null;
      const amt = o?.receiverSide?.amounts || null; // XS_SCOUT_PRICE_RECEIVERSIDE_V1
      // XS_SCOUT_WEI_ETH_V8_CALC
      const xsWeiRawV8 = (o?.receiverSide?.amounts?.wei ?? null) ?? (o?.senderSide?.amounts?.wei ?? null);
      const xsWeiV8 = (xsWeiRawV8 === null || xsWeiRawV8 === undefined) ? null : String(xsWeiRawV8);
      const xsEthV8 = xsWeiV8 ? xsWeiToEthStrScoutV3c(xsWeiV8) : null;
      const xsPriceTextV8 = (typeof eur === 'number' && isFinite(eur)) ? ('\u20AC' + eur.toFixed(2)) : (xsEthV8 ? ('\u039E' + String(xsEthV8)) : (xsWeiV8 ? ('wei ' + xsWeiV8) : ''));

      if (amt) {
        if (typeof amt.eurCents === "number") eur = amt.eurCents / 100;
      }

      offers.push({
        offerId: o.id,
        slug: c.slug,
        pictureUrl: c.pictureUrl || null,
        eur,
        eurMode,
      });
      slugs.push(c.slug);
    }

    // Enrich cards (player/team/positions/rarity/seasonYear)
    let enriched = [];
    try {
      enriched = await fetchAnyCards(slugs);
    } catch {
      enriched = [];
    }
    const map = new Map(enriched.map(x => [x.slug, x]));

    let items = offers.map(o => {
      const e = map.get(o.slug);
      const rarity = e?.rarityTyped || null;

      return {
        offerId: o.offerId,
        slug: o.slug,
        pictureUrl: o.pictureUrl || e?.pictureUrl || null,
        rarity,
        seasonYear: e?.seasonYear || null,
        serialNumber: (typeof e?.serialNumber === "number") ? e.serialNumber : null,
        positions: Array.isArray(e?.anyPositions) ? e.anyPositions : [],
        position: Array.isArray(e?.anyPositions) ? (e.anyPositions[0] || null) : null,
        team: e?.anyTeam?.name || null,
        teamSlug: e?.anyTeam?.slug || null,
        playerName: e?.anyPlayer?.displayName || null,
        playerSlug: e?.anyPlayer?.slug || null,
      eur: o.eur,
        price: (() => {
          // XS_PUBLIC_USER_CARDS_MEDIA_PRICE_V1
          const xsLast = typeof eur === "number" && Number.isFinite(eur) ? eur : null;
          const xsAsOf = new Date().toISOString();
          return {
            lastSaleEur: xsLast,
            avg7dEur: xsLast,
            avg30dEur: xsLast,
            floorEur: xsLast,
            asOf: xsAsOf,
            warning: "fallback: derived from eur (not live market)",
          };
        })(),
      // XS_SCOUT_WEI_ETH_V8_FIELDS
      wei: (() => { try { const w = o?.receiverSide?.amounts?.wei ?? o?.senderSide?.amounts?.wei ?? null; return (w==null? null : String(w)); } catch { return null; } })(), /* XS_FIX_SCOUT_INLINE_PRICE_V1 */
      eth: (() => { try { const w = o?.receiverSide?.amounts?.wei ?? o?.senderSide?.amounts?.wei ?? null; if (w==null) return null; return (typeof xsWeiToEthStrScoutV3c === 'function') ? xsWeiToEthStrScoutV3c(String(w)) : null; } catch { return null; } })(), /* XS_FIX_SCOUT_INLINE_PRICE_V1 */
      priceText: (() => { try {
        const eur = (typeof o?.receiverSide?.amounts?.eurCents === 'number') ? (o.receiverSide.amounts.eurCents/100) : null;
        const w = o?.receiverSide?.amounts?.wei ?? o?.senderSide?.amounts?.wei ?? null;
        const wei = (w==null? null : String(w));
        const eth = (wei && typeof xsWeiToEthStrScoutV3c === 'function') ? xsWeiToEthStrScoutV3c(wei) : null;
        return (typeof eur === 'number' && isFinite(eur)) ? ('€' + (xsSafeToFixed(eur, 2) ?? String(eur))) : (eth ? ('Ξ' + String(eth)) : (wei ? ('wei ' + wei) : 'Prix indisponible (public)'));
      } catch { return ''; } })(), /* XS_FIX_SCOUT_INLINE_PRICE_V1 */

      };
    });
    // XS_SCOUT_FOOTBALL_ONLY_V1
    // Évite les items basket qui polluent parfois les offers "tokens"
    items = items.filter(x => !String(x.position || "").toLowerCase().startsWith("basketball_"));

    // Filters
    if (rarities.length) {
      items = items.filter(x => x.rarity && rarities.includes(String(x.rarity).toLowerCase()));
    }
    if (qRaw) {
      items = items.filter(x => {
        const pn = String(x.playerName || "").toLowerCase();
        const ps = String(x.playerSlug || "").toLowerCase();
        const ts = String(x.team || "").toLowerCase();
        return pn.includes(qRaw) || ps.includes(qRaw) || ts.includes(qRaw);
      });
    }
    if (eurOnly && !allowUnknownPrices) { // XS_ALLOW_UNKNOWN_PRICES_V1
      items = items.filter(x => typeof x.eur === "number" && Number.isFinite(x.eur) && x.eur > 0); // XS_SCOUT_PRICE_RECEIVERSIDE_V1
    }
    if (Number.isFinite(maxEur)) {
      items = items.filter(x => (typeof x.eur === "number" && x.eur <= maxEur));
    }

    // Sort
    if (sort === "eur_asc") {
      items.sort((a,b) => (a.eur ?? Infinity) - (b.eur ?? Infinity));
    } else if (sort === "eur_desc") {
      items.sort((a,b) => (b.eur ?? -Infinity) - (a.eur ?? -Infinity));
    } // else "newest": keep order

    // Trim to first
    // XS_LOCAL_PAGING_V2
    const xsAfterOffsetV2 = xsParseAfterOffset(after);
    const xsItemsFullV2 = Array.isArray(items) ? items : [];
    const xsPagedV2 = xsPaginateArray(xsItemsFullV2, first, xsAfterOffsetV2);
    items = xsPagedV2.slice;
    pageInfo = xsPagedV2.pageInfo;
    // XS_LOCAL_PAGING_V2: ensure stable endCursor (string offset)
    if (pageInfo && (pageInfo.endCursor === "" || pageInfo.endCursor == null)) {
      pageInfo.endCursor = String(xsAfterOffsetV2 + (Array.isArray(items) ? items.length : 0));
    }
        // XS_SCOUT_CACHE_MODE_GUARD_V1
    // Cache fallback if empty (respecte eurOnly => eur > 0)
    if ((!items || items.length === 0) && cached && Array.isArray(cached.items) && cached.items.length) {
      const cachedItems = eurOnly
        ? cached.items.filter(x => typeof x.eur === "number" && Number.isFinite(x.eur) && x.eur > 0)
        : cached.items;

      if (cachedItems.length) {
        items = cachedItems;
        fromCache = true;
        cacheExact = !!(cached.key && cached.key === cacheKey);
      }
    }

    // Save cache if non-empty and not from cache
    if (!fromCache && Array.isArray(items) && items.length) {
      scoutCacheSet(cacheKey, { key: cacheKey, items, ts: Date.now() });
    }

    // XS_SORT_EUR_V1
    const xsSort = String(req.query.sort || "").trim();
    const xsEurVal = (x) => (typeof (x && x.eur) === "number" && isFinite(x.eur)) ? x.eur : null;
    const xsCmp = (a, b) => {
      const ea = xsEurVal(a), eb = xsEurVal(b);
      const aHas = ea !== null, bHas = eb !== null;
      if (aHas !== bHas) return aHas ? -1 : 1; // prix connus d'abord
      if (!aHas && !bHas) return 0;
      if (xsSort === "eur_desc") return eb - ea;
      return ea - eb; // eur_asc (par défaut)
    };
    if (xsSort === "eur_asc" || xsSort === "eur_desc" || String(req.query.eurOnly || "") === "1") {
      items.sort(xsCmp);
    }

    // XS_SCOUT_PRICE_TEXT_POST_V10
    items = (Array.isArray(items) ? items : []).map(x => {
      try {
        if (!x) return x;
    
        // si on a wei mais pas eth, on le calcule (si helper dispo)
        if ((x.eth === null || x.eth === undefined || String(x.eth).trim() === '') && x.wei !== null && x.wei !== undefined && String(x.wei).trim() !== '') {
          try {
            if (typeof xsWeiToEthStrScoutV3c === 'function') x.eth = xsWeiToEthStrScoutV3c(String(x.wei));
          } catch {}
}
    
        // priceText basé sur les champs FINALS de l'item (pas sur des variables locales)
        if (x.priceText === null || x.priceText === undefined || String(x.priceText).trim() === '') {
          if (typeof x.eur === 'number' && isFinite(x.eur)) x.priceText = '\u20AC' + Number(x.eur).toFixed(2);
          else if (x.eth !== null && x.eth !== undefined && String(x.eth).trim() !== '') x.priceText = '\u039E' + String(x.eth);
          else if (x.wei !== null && x.wei !== undefined && String(x.wei).trim() !== '') x.priceText = 'wei ' + String(x.wei);
        }
      } catch {}return x;
    });
    // XS_SCOUT_PRICE_TEXT_POST_V10_END

    // XS_LOCAL_PAGINATION_APPLY_V1
    const afterOffset = xsParseAfterOffset(after);
    const paged = xsPaginateArray(items, first, afterOffset);
    items = paged.slice;
    pageInfo = paged.pageInfo;
    // XS_LOCAL_PAGING_V2
    // XS_FIX_COMMENT_AFTEROFFSET_1171_V1: disabled redeclare -> const afterOffset = xsParseAfterOffset(after);
    // XS_DISABLE_LOCAL_PAGING_V2_V1: disabled -> const itemsFull = Array.isArray(items) ? items : [];
    // XS_DISABLE_LOCAL_PAGING_V2_V1: disabled -> const paged = xsPaginateArray(itemsFull, first, afterOffset);
    // XS_DISABLE_LOCAL_PAGING_V2_V1: disabled -> items = paged.slice;
    // XS_DISABLE_LOCAL_PAGING_V2_V1: disabled -> pageInfo = paged.pageInfo;
    // XS_PAGEINFO_STABLE_V1: guarantee pageInfo/endCursor/hasNextPage (offset pagination)
    try {
      if (!pageInfo || typeof pageInfo !== "object") pageInfo = { hasNextPage: false, endCursor: "" };
      if (pageInfo.endCursor === "" || pageInfo.endCursor == null) {
        // afterOffset comes from XS_LOCAL_PAGINATION_APPLY_V1
        pageInfo.endCursor = String(Number(afterOffset || 0) + Number((Array.isArray(items) ? items.length : 0) || 0));
      }
      if (typeof pageInfo.hasNextPage !== "boolean") {
        // heuristic: if we filled "first", there may be a next page
        pageInfo.hasNextPage = (Array.isArray(items) ? items.length : 0) >= Number(first || 0);
      }
    } catch {}
/* XS_PUBLIC_USER_CARDS_HEADERS_SENT_GUARD_V1_BEGIN
   - But: éviter double réponse (ERR_HTTP_HEADERS_SENT)
   - Si une réponse a déjà été envoyée, on sort proprement
   XS_PUBLIC_USER_CARDS_HEADERS_SENT_GUARD_V1_END */
if (res.headersSent) {
  return;
}
res.json({
      // XS_SCOUT_OAUTH_DEBUG_V1
      oauth: tok ? { hasData: xsOauthHasData, errors: xsOauthErrors, nodeCount: xsOauthNodeCount, sample: xsOauthSample } : null,
      key: cacheKey,
      fromCache,
      cacheExact,
      count: items.length,
      // XS_RETURN_PAGEINFO_V1
      pageInfo,
      items,
      note: (tok ? "V2: liveSingleSaleOffers (oauth via device token)." : "V1: liveSingleSaleOffers (public). Limite PUBLIC: first cap à 10 + last=10 pour rester sous complexity=500. Attention: rate-limit possible; filtres appliqués localement."),
    });
  } catch (e) {
    // On tente cache en dernier recours
    if (cached && Array.isArray(cached.items) && cached.items.length) {
      fromCache = true;
      cacheExact = !!(cached.key && cached.key === cacheKey);
return res.json({
      // XS_SCOUT_OAUTH_DEBUG_V1
      oauth: tok ? { hasData: xsOauthHasData, errors: xsOauthErrors, nodeCount: xsOauthNodeCount, sample: xsOauthSample } : null,
      key: cacheKey,
        fromCache,
        cacheExact,
        count: cached.items.length,
        items: cached.items,
        note: "Fallback cache (erreur API publique).",
        apiError: String(e.message || e),
        apiStatus: e.status || null,
      });
    }

    res.status(500).json({
      error: String(e.message || e),
      status: e.status || null,
      graphQLErrors: e.graphQLErrors || null,
    });
  }
});

// ----------------------------
// Watchlist / Alerts (simple JSON CRUD)
// ----------------------------
// XS_RECRUTER_ENDPOINT_V1_BEGIN
app.get("/scout/recruter", async (req, res) => {
  try {
    const requestedFirst = Math.max(1, Math.min(Number(req.query.first || 120), 120));
    const q = String(req.query.q || "").trim().toLowerCase();
    const position = String(req.query.position || "").trim().toUpperCase();
    const league = String(req.query.league || "").trim().toLowerCase();
    const rarities = String(req.query.rarities || "")
      .split(",")
      .map((x) => String(x || "").trim().toLowerCase())
      .filter(Boolean);

    // Appel interne vers /scout/cards (source publique plafonnée)
    const proto = req.headers["x-forwarded-proto"] || req.protocol || "http";
    const host = req.get("host") || `localhost:${PORT}`;

    
// IMPORTANT: la source publique est plafonnée -> on fixe internalFirst=10
    const internalFirst = 10;
    const cardsUrl = `${proto}://${host}/scout/cards?first=${internalFirst}`;

    const cardsRes = await fetch(cardsUrl);
    if (!cardsRes.ok) {
      const txt = await cardsRes.text().catch(() => "");
      return res.status(cardsRes.status).json({
        error: "scout/recruter: scout/cards call failed",
        status: cardsRes.status,
        body: txt,
      });
    }

    const payload = await cardsRes.json();
    const offers = Array.isArray(payload?.items) ? payload.items : [];

    const byPlayer = new Map();

    for (const offer of offers) {
      const slug = String(offer?.playerSlug || offer?.slug || "").trim();
      if (!slug) continue;

      const rarity = String(offer?.rarity || "").trim().toLowerCase() || null;
      const eur = (typeof offer?.eur === "number" && Number.isFinite(offer.eur)) ? offer.eur : null;

      const posRaw = String(offer?.position || "").toUpperCase();
      const posNorm = ["GK", "DEF", "MID", "FWD"].includes(posRaw) ? posRaw : null;

      const leagueValue = offer?.league || offer?.competition || offer?.leagueSlug || null;

      if (!byPlayer.has(slug)) {
        byPlayer.set(slug, {
          slug,
          displayName: offer?.playerName || slug,
          team: offer?.team || null,
          position: posNorm,
          pictureUrl: offer?.pictureUrl || null,
          minEur: eur,
          offersCount: 0,
          rarities: [],
          rarityCounts: {},
          league: leagueValue,
        });
      }

      const it = byPlayer.get(slug);
      it.offersCount += 1;

      if (eur !== null && (it.minEur === null || eur < it.minEur)) it.minEur = eur;
      if (posNorm && !it.position) it.position = posNorm;
      if (!it.pictureUrl && offer?.pictureUrl) it.pictureUrl = offer.pictureUrl;
      if (!it.team && offer?.team) it.team = offer.team;
      if (!it.league && leagueValue) it.league = leagueValue;

      if (rarity) {
        if (!it.rarities.includes(rarity)) it.rarities.push(rarity);
        it.rarityCounts[rarity] = (it.rarityCounts[rarity] || 0) + 1;
      }
    }

    let items = Array.from(byPlayer.values());

    if (q) {
      items = items.filter((x) => {
        const dn = String(x.displayName || "").toLowerCase();
        const tm = String(x.team || "").toLowerCase();
        const sg = String(x.slug || "").toLowerCase();
        return dn.includes(q) || tm.includes(q) || sg.includes(q);
      });
    }

    if (["GK", "DEF", "MID", "FWD"].includes(position)) {
      items = items.filter((x) => String(x.position || "") === position);
    }

    if (rarities.length) {
      items = items.filter((x) =>
        Array.isArray(x.rarities) && x.rarities.some((r) => rarities.includes(String(r).toLowerCase()))
      );
    }

    if (league) {
      items = items.filter((x) => {
        if (!x.league) return true;
        return String(x.league).toLowerCase().includes(league);
      });
    }

    items = items.slice(0, requestedFirst);

          // XS_RECRUTER_ALIAS_FIELDS_V1_BEGIN
      const itemsAliased = (items || []).map((it) => ({
        ...it,
        playerSlug: it.playerSlug ?? it.slug ?? null,
        playerName: it.playerName ?? it.displayName ?? null,
        minPriceEur: (typeof it.minPriceEur === "number") ? it.minPriceEur : ((typeof it.minEur === "number") ? it.minEur : null),
      }));
      // XS_RECRUTER_ALIAS_FIELDS_V1_END
return res.json({
        count: itemsAliased.length,
        items: itemsAliased,
      note: "recruter via /scout/cards (public). Limite actuelle: source publique plafonnée (appel interne first=10).",
    });
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
});
// XS_RECRUTER_ENDPOINT_V1_END

const WATCHLIST_FILE = dataFile("scout_watchlist.json");
const ALERTS_FILE = dataFile("scout_alerts.json");

// XS_SCOUT_WEI_ETH_V8_END
app.get("/scout/watchlist", (req, res) => {
  const list = readJson(WATCHLIST_FILE, []);
  res.json({ items: Array.isArray(list) ? list : [] });
});

app.post("/scout/watchlist", (req, res) => {
  const list = readJson(WATCHLIST_FILE, []);
  const item = req.body || {};
  const id = item.id || ("w_" + Date.now() + "_" + Math.random().toString(16).slice(2));
  const next = Array.isArray(list) ? list : [];
  next.push({ ...item, id });
  writeJson(WATCHLIST_FILE, next);
  res.json({ ok: true, id });
});

app.delete("/scout/watchlist/:id", (req, res) => {
  const id = String(req.params.id || "");
  const list = readJson(WATCHLIST_FILE, []);
  const next = (Array.isArray(list) ? list : []).filter(x => String(x.id) !== id);
  writeJson(WATCHLIST_FILE, next);
  res.json({ ok: true });
});

app.get("/scout/alerts", (req, res) => {
  const list = readJson(ALERTS_FILE, []);
  res.json({ items: Array.isArray(list) ? list : [] });
});

app.post("/scout/alerts", (req, res) => {
  const list = readJson(ALERTS_FILE, []);
  const item = req.body || {};
  const id = item.id || ("a_" + Date.now() + "_" + Math.random().toString(16).slice(2));
  const next = Array.isArray(list) ? list : [];
  next.push({ ...item, id });
  writeJson(ALERTS_FILE, next);
  res.json({ ok: true, id });
});

app.delete("/scout/alerts/:id", (req, res) => {
  const id = String(req.params.id || "");
  const list = readJson(ALERTS_FILE, []);
  const next = (Array.isArray(list) ? list : []).filter(x => String(x.id) !== id);
  writeJson(ALERTS_FILE, next);
  res.json({ ok: true });
});

// ----------------------------
/* ===== OAuth Sorare ===== */
function _fetchAny(...args) {
  if (typeof fetch === "function") return fetch(...args);
  // Node < 18 fallback (optionnel)
  return import("node-fetch").then(m => m.default(...args));
}

app.get("/auth/sorare", (req, res) => {
  if (!SORARE_OAUTH_UID || !SORARE_OAUTH_SECRET) {
    return res.status(400).json({ error: "OAuth non configuré: SORARE_OAUTH_UID/SECRET manquants" });
  }
  const u = encodeURIComponent(SORARE_OAUTH_UID);
  const r = encodeURIComponent(SORARE_OAUTH_REDIRECT_URI);
  const url = `https://sorare.com/oauth/authorize?client_id=${u}&redirect_uri=${r}&response_type=code&scope=public`;
  res.redirect(url);
});

app.get("/auth/sorare/callback", async (req, res) => {
  
    // ===== XS_DEVICE_OAUTH_BRIDGE_V1 =====
    // Si ce callback reçoit un state généré par /auth/sorare-device/login,
    // on stocke un token PAR deviceId dans oauth_devices.json, puis on return.
    try {
      const stateQ = String(req.query.state || "");
      if (stateQ) {
        const states = xsDevOauth_readJson(xsDevOauth_STATES_FILE, {});
        const st = states[stateQ];
        if (st && st.deviceId) {
          const deviceId = st.deviceId;

          const redirect_uri =
            (process.env.SORARE_OAUTH_DEV_REDIRECT_URI || process.env.SORARE_OAUTH_REDIRECT || process.env.SORARE_OAUTH_REDIRECT_URI) ||
            "http://localhost:3000/auth/sorare/callback";

          /* XS_FIX_DEVICE_OAUTH_ENVREAD_V1: read env directly inside handler (avoid stale consts) */
const xsEnvClientId =
  (xsEnvHard("SORARE_OAUTH_CLIENT_ID") || xsEnvHard("SORARE_CLIENT_ID") || "").trim();
const xsEnvClientSecret =
  (xsEnvHard("SORARE_OAUTH_CLIENT_SECRET") || xsEnvHard("SORARE_CLIENT_SECRET") || "").trim();
/* end XS_FIX_DEVICE_OAUTH_ENVREAD_V1 */

if (!xsEnvClientId || !xsEnvClientSecret) {
  return res.status(500).json({
    error: "Missing env client id/secret for device oauth",
    debug: {
      has_id: !!xsEnvClientId,
      has_secret: !!xsEnvClientSecret,
      id_len: xsEnvClientId ? xsEnvClientId.length : 0,
      secret_len: xsEnvClientSecret ? xsEnvClientSecret.length : 0,
      keys: Object.keys(process.env).filter((k) => k.startsWith("SORARE_OAUTH") || k.startsWith("SORARE_CLIENT")).sort(),
    },
  });
}
/* XS_FIX_DEVICE_OAUTH_ENVREAD_V1: old check removed */ if (false) {
            return res.status(500).json({ error: "Missing env client id/secret for device oauth" });
          }

          const codeQ = String(req.query.code || "");
          if (!codeQ) return res.status(400).send("Missing code");

          const token = await xsDevOauth_tokenRequest({
            grant_type: "authorization_code",
            code: codeQ,
            client_id: xsEnvClientId,
            client_secret: xsEnvClientSecret,
            redirect_uri: redirect_uri,
          });
/* XS_FIX_DEVICE_OAUTH_TOKENREQ_ENV_V1: use xsEnv* for token exchange */

          const accessToken = token.access_token;
          if (!accessToken) return res.status(500).send("No access_token received");

          const me = await xsDevOauth_graphql(accessToken, "query { currentUser { slug nickname } }", {});
          const cu = me && me.data && me.data.currentUser ? me.data.currentUser : null;
          if (!cu || !cu.slug) return res.status(500).send("Unable to read currentUser");

          const devices = xsDevOauth_readJson(xsDevOauth_DEVICES_FILE, {});
          devices[deviceId] = {
            userSlug: cu.slug,
            nickname: cu.nickname || null,
            access_token: token.access_token,
            refresh_token: token.refresh_token,
            expires_in: token.expires_in,
            expires_at: xsDevOauth_nowSec() + (token.expires_in || 0),
            linked_at: new Date().toISOString(),
          };
          xsDevOauth_writeJson(xsDevOauth_DEVICES_FILE, devices);

          delete states[stateQ];
          xsDevOauth_writeJson(xsDevOauth_STATES_FILE, states);

          res.setHeader("Content-Type", "text/html; charset=utf-8");
          res.end("<h2>✅ Connexion Sorare (device) OK</h2><p>Retourne dans l’app. Tu peux fermer cet onglet.</p>");
          return;
        }
      }
    } catch (eBridge) {
      // On ne casse pas le flow existant
      console.warn("[XS_DEVICE_OAUTH_BRIDGE_V1] ignored:", String(eBridge && eBridge.message ? eBridge.message : eBridge));
    }
    // ===== /XS_DEVICE_OAUTH_BRIDGE_V1 =====
try {
    const code = String(req.query.code || "").trim();
    if (!code) return res.status(400).send("Missing ?code=");

    const form = new URLSearchParams();
    form.set("client_id", SORARE_OAUTH_UID);
    form.set("client_secret", SORARE_OAUTH_SECRET);
    form.set("code", code);
    form.set("grant_type", "authorization_code");
    form.set("redirect_uri", SORARE_OAUTH_REDIRECT_URI);

    const r = await _fetchAny("https://api.sorare.com/oauth/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });
  const raw = (o && typeof o.priceEur === "number" && Number.isFinite(o.priceEur)) ? (o.priceEur.toFixed(2) + " €") : "";
    if (!r.ok) return res.status(500).send("Token exchange failed: " + r.status + "\n" + raw);

    const token = JSON.parse(raw);
    writeJson(OAUTH_TOKEN_FILE, token);

    res.send("OK OAuth ✅ Token sauvegardé dans data/sorare_oauth.json. Tu peux fermer cette page.");
  } catch (e) {
    res.status(500).send("Callback error: " + String(e.message || e));
  }
});

app.get("/auth/sorare/status", (req, res) => {
  const t = readOAuthToken();
/* XS_PUBLIC_USER_CARDS_HEADERS_SENT_GUARD_V1_BEGIN
   - But: éviter double réponse (ERR_HTTP_HEADERS_SENT)
   - Si une réponse a déjà été envoyée, on sort proprement
   XS_PUBLIC_USER_CARDS_HEADERS_SENT_GUARD_V1_END */
if (res.headersSent) {
  return;
}
res.json({
    hasAuth: hasSorareAuth(),
    hasApiKey: Boolean(SORARE_APIKEY),
    hasJwt: Boolean(SORARE_JWT),
    hasOAuthToken: Boolean(t && t.access_token),
    scope: t?.scope || null,
    created_at: t?.created_at || null,
  });
});
/* ===== /OAuth Sorare ===== */


// XS_DEBUG_ERROR_MW (dev only)
app.use((err, req, res, next) => {
  try { console.error('[UNHANDLED]', err && err.stack ? err.stack : err); } catch (e) {}
  try {
    res.status(500).json({ error: 'Internal Server Error', message: String(err && err.message ? err.message : err) });
  } catch (e) { try { res.status(500).end(); } catch(_) {} }
});

  // XS_PUBLIC_PLAYER2 (debug endpoint)
  app.get("/public-player2", async (req, res) => {
    try {
      const slug = String(req.query.slug || "").trim();
      if (!slug) return res.status(400).json({ error: "slug missing" });

      const url = "https://api.sorare.com/graphql";
      const query = `
        query PublicPlayer($slug: String!) {
          football {
            player(slug: $slug) {
              slug
              displayName
              anyPositions
              activeClub { name slug }
            }
          }
        }
      `;
      const variables = { slug };

      const r = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "accept": "application/json",
        },
        body: JSON.stringify({ query, variables }),
      });

      const text = await r.text();

      if (!r.ok) {
        return res.status(502).json({
          error: "Sorare upstream error",
          status: r.status,
          body: text.slice(0, 3000),
        });
      }

      let json;
      try { json = JSON.parse(text); }
      catch {
        return res.status(502).json({
          error: "Sorare returned non-JSON",
          body: text.slice(0, 3000),
        });
      }

      if (json.errors) {
        return res.status(502).json({
          error: "Sorare GraphQL errors",
          errors: json.errors,
        });
      }

      const p = json && json.data && json.data.football ? json.data.football.player : null;
      if (!p) return res.status(404).json({ error: "player not found", slug, data: (json && json.data) ? json.data : null });

      const position = Array.isArray(p.anyPositions) && p.anyPositions[0] ? ((typeof p.anyPositions[0]==="string"?p.anyPositions[0]:(p.anyPositions[0]&&p.anyPositions[0].position)) || null) : null;
return res.json({
        playerSlug: p.slug,
        playerName: p.displayName || p.slug,
        position,
        activeClub: p.activeClub ? { name: p.activeClub.name, slug: p.activeClub.slug } : null,
        raw: p,
      });

    } catch (e) {
      console.error("[public-player2] error:", e && e.stack ? e.stack : e);
      return res.status(500).json({ error: "Internal Server Error", message: String((e && e.message) ? e.message : e) });
    }
  });
  // XS_SCOUT_SEARCH (schema-robust; dev)
  // usage: /scout/search?q=mbappe&first=10
  // XS_SCOUT_SEARCH_V2 (players list; schema-robust)
  // usage: /scout/search?q=mbappe&first=10
  // XS_SCOUT_SEARCH_VIA_CARDS (robust; uses /scout/cards + cache)
  // usage: /scout/search?q=mbappe&first=10&eurOnly=1
  // XS_SCOUT_SEARCH_V2 (filter + enrich; robust even when scout/cards falls back cache)
  // usage: /scout/search?q=mbappe&first=10&eurOnly=1&pool=200
  // XS_SCOUT_SEARCH_GRAPHQL (no introspection; tries shapes on searchCards)
  // usage: /scout/search?q=mbappe&first=10
  // XS_SCOUT_SEARCH_WRAPPER (stable)
  // Strategy:
  //  - if q looks like a slug => /public-player
  //  - else => try /scout/search-cached (filter+enrich)
  //  - if cache is non-exact and no matches => 503 with hint (avoid noisy results)
  //  - fallback => /scout/search-cards-v1 (older via-cards)
  // XS_PLAYERS_SEARCH_V1
function xsMapPlayerFromScoutItem(item, fallbackName) {
  if (!item || typeof item !== "object") return null;
  const slug = item.slug || item.playerSlug || null;
  const name =
    item.name ||
    item.displayName ||
    item.playerName ||
    fallbackName ||
    slug ||
    null;

  const pictureUrl =
    item.pictureUrl ||
    item.avatarUrl ||
    item.imageUrl ||
    null;

  const team =
    (item.team && item.team.name) ||
    (item.activeClub && item.activeClub.name) ||
    (item.club && item.club.name) ||
    item.team ||
    null;

  if (!slug && !name) return null;

  return {
    slug: slug || String(name || "").toLowerCase().replace(/\s+/g, "-"),
    name: name || String(slug || ""),
    pictureUrl: pictureUrl || null,
    team: team || null,
  };
}

app.get("/scout/players/search", async (req, res) => {
  try {
    const qRaw = String(req.query.q || "").trim();
    const limit = Math.max(1, Math.min(30, parseInt(String(req.query.limit || "30"), 10) || 30));
    if (qRaw.length < 2) return res.status(400).json({ error: "q too short" });

    // Track searches (24h window)
    xsTrendingTrackQuery(qRaw);

    // Use existing /scout/search wrapper via internal fetch (keeps schema-robust behavior)
    const base = req.protocol + "://" + req.get("host");
    const canFetch = (typeof fetch === "function"); // XS_PLAYERS_SEARCH_FETCH_GUARD_V1

    if (!canFetch)
return res.json({ items: [], note: "fetch not available in this node runtime" });

    let items = [];
    let note = null;

    try {
      const r = await fetch(base + "/scout/search?q=" + encodeURIComponent(qRaw) + "&first=" + limit + "&eurOnly=1&pool=200", {
        headers: { accept: "application/json" },
      });
      if (r.ok) {
        const json = await r.json();
        const rawItems = Array.isArray(json?.items) ? json.items : [];
        items = rawItems.map((it) => xsMapPlayerFromScoutItem(it, qRaw)).filter(Boolean);
      } else {
        note = `search upstream failed (${r.status})`; // XS_FIX_UPSTREAM_NOTE_V1
      }
    } catch (e) {
      note = "search upstream error";
    }

    if (!items.length && !note) note = "no results (public cache)";
return res.json({ items, note: note || undefined });
  } catch (e) {
    console.error("[scout/players/search] error:", e && e.stack ? e.stack : e);
    return res.status(500).json({ error: "Internal Server Error", message: String((e && e.message) ? e.message : e) });
  }
});

app.get("/scout/players/trending", async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(20, parseInt(String(req.query.limit || "20"), 10) || 20));
    const top = xsTrendingComputeTopQueries(limit);
    // Sorare-style: return just {q,count} (super light; app resolves on click)
return res.json({ items: top, note: top.length ? undefined : "no trending searches yet" });
  } catch (e) {
    console.error("[scout/players/trending] error:", e && e.stack ? e.stack : e);
    return res.status(500).json({ error: "Internal Server Error", message: String((e && e.message) ? e.message : e) });
  }
});
// XS_PLAYERS_SEARCH_V1_END
app.get("/scout/search", async (req, res) => {
    try {
      const qRaw0 = String(req.query.q || "").trim();

// Accept full Sorare player URL pasted by user and extract slug
function extractPlayerSlugFromText(s) {
  if (!s) return null;
  const t = String(s).trim();

  // Match common patterns:
  //  - https://sorare.com/football/players/<slug>
  //  - https://sorare.com/players/<slug>
  //  - https://sorare.com/player/<slug>
  //  - also accept query strings after slug
  const m =
    t.match(/sorare\.com\/(?:football\/)?players\/([a-z0-9\-_.]+)/i) ||
    t.match(/sorare\.com\/player\/([a-z0-9\-_.]+)/i);

  return m ? m[1] : null;
}

const extractedSlug = extractPlayerSlugFromText(qRaw0);
const qRaw = extractedSlug || qRaw0;
const first = Math.max(1, Math.min(25, parseInt(String(req.query.first || "10"), 10) || 10));
      const eurOnly = String(req.query.eurOnly || "1") === "1" ? "1" : "0";
      const pool = Math.max(25, Math.min(400, parseInt(String(req.query.pool || "200"), 10) || 200));

      if (!qRaw) return res.status(400).json({ error: "q missing" });

      const base = req.protocol + "://" + req.get("host");

      
      const canFetch = (typeof fetch === "function"); // XS_TRENDING_FETCH_GUARD_V1
async function fetchJson(url) {
        const r = await fetch(url, { headers: { "accept": "application/json" } });
        const text = await r.text();
        let json = null;
        try { json = JSON.parse(text); } catch {}return { ok: r.ok && !!json, status: r.status, json, text: text.slice(0, 2000), url };
      }

      // (A) direct slug -> public-player
      const looksLikeSlug = /^[a-z0-9][a-z0-9\-_.]{2,}$/.test(qRaw) && qRaw.indexOf(" ") === -1;
      if (looksLikeSlug) {
        const p = await fetchJson(`${base}/public-player?slug=${encodeURIComponent(qRaw)}`);
        if (p.ok) {
          const it = p.json;
return res.json({
            q: qRaw,
            mode: "direct-public-player",
            count: 1,
            items: [{
              slug: it.playerSlug,
              displayName: it.playerName,
              position: it.position || null,
              activeClub: it.activeClub || null,
            }]
          });
        }
      }

      // (B) try cached filter+enrich endpoint (your v2)
      const cached = await fetchJson(`${base}/scout/search-cached?q=${encodeURIComponent(qRaw)}&first=${first}&eurOnly=${eurOnly}&pool=${pool}`);
      if (cached.ok) {
        const count = Number(cached.json?.count || 0);
        const aFromCache = !!cached.json?.source?.a?.fromCache;
        const aCacheExact = !!cached.json?.source?.a?.cacheExact;

        // If we have matches, return them
        if (count > 0) return res.json(cached.json);

        // If empty because non-exact cache => do NOT return random stuff; ask for slug
        if (aFromCache && !aCacheExact) {
          return res.status(503).json({
            error: "search unavailable (public API limited / cache non exact)",
            q: qRaw,
            hint: "Utilise le slug Sorare du joueur. Exemple Mbappé: kylian-mbappe-lottin. Test: /public-player?slug=<slug>",
            cachedSource: cached.json?.source || null
          });
        }

        // Otherwise return empty cleanly
        return res.json(cached.json);
      }

      // (C) fallback older via-cards
      const v1 = await fetchJson(`${base}/scout/search-cards-v1?q=${encodeURIComponent(qRaw)}&first=${first}&eurOnly=${eurOnly}`);
      if (v1.ok) return res.json(v1.json);

      // (D) last: whatever you currently have in /scout/search-impl
      const impl = await fetchJson(`${base}/scout/search-impl?q=${encodeURIComponent(qRaw)}&first=${first}&eurOnly=${eurOnly}&pool=${pool}`);
      if (impl.ok) return res.json(impl.json);

      return res.status(502).json({
        error: "scout/search failed (all strategies)",
        q: qRaw,
        details: [
          { tried: "public-player", ok: false },
          { tried: "search-cached", ok: cached.ok, status: cached.status },
          { tried: "search-cards-v1", ok: v1.ok, status: v1.status },
          { tried: "search-impl", ok: impl.ok, status: impl.status }
        ],
      });

    } catch (e) {
      console.error("[scout/search wrapper] error:", e && e.stack ? e.stack : e);
      return res.status(500).json({ error: "Internal Server Error", message: String(e?.message || e) });
    }
  });
  app.get("/scout/search-impl", async (req, res) => {
    try {
      const qRaw = String(req.query.q || "").trim();
      const first = Math.max(1, Math.min(25, parseInt(String(req.query.first || "10"), 10) || 10));
      if (!qRaw) return res.status(400).json({ error: "q missing" });

      const base = req.protocol + "://" + req.get("host");

      
      const canFetch = (typeof fetch === "function"); // XS_TRENDING_FETCH_GUARD_V1
// If it looks like a slug, try direct public-player first (works for kylian-mbappe-lottin)
      const looksLikeSlug = /^[a-z0-9][a-z0-9\-_.]{2,}$/.test(qRaw) && qRaw.indexOf(" ") === -1;
      if (looksLikeSlug) {
        try {
          const rP = await fetch(`${base}/public-player?slug=${encodeURIComponent(qRaw)}`, { headers: { "accept": "application/json" } });
          if (rP.ok) {
            const p = await rP.json();
return res.json({
              q: qRaw,
              mode: "direct-public-player",
              count: 1,
              items: [{
                slug: p.playerSlug,
                displayName: p.playerName,
                position: p.position || null,
                activeClub: p.activeClub || null,
              }],
            });
          }
        } catch {}
}

      const url = "https://api.sorare.com/graphql";

      async function gqlTry(query, variables) {
        const r = await fetch(url, {
          method: "POST",
          headers: { "content-type": "application/json", "accept": "application/json" },
          body: JSON.stringify({ query, variables }),
        });
        const text = await r.text();
        let json = null;
        try { json = JSON.parse(text); } catch {}const ok = r.ok && json && !json.errors;
        return { ok, status: r.status, json, text: text.slice(0, 2500) };
      }

      function positionFromAny(anyPositions) {
        if (Array.isArray(anyPositions) && anyPositions[0]) {
          return (typeof anyPositions[0] === "string") ? anyPositions[0] : (anyPositions[0] && anyPositions[0].position);
        }
        return null;
      }

      function isBasketball(anyPositions, position) {
        const p = (position || "").toLowerCase();
        if (p.startsWith("basketball_")) return true;
        if (Array.isArray(anyPositions) && anyPositions[0] && String(anyPositions[0]).toLowerCase().startsWith("basketball_")) return true;
        return false;
      }

      function pullPlayersFromCardNodes(nodes) {
        const out = [];
        const arr = Array.isArray(nodes) ? nodes : [];
        for (const n of arr) {
          const card = n?.card ? n.card : n; // support {card{...}} or direct card
          const player = card?.player || card?.anyPlayer || null;
          if (!player?.slug) continue;

          const pos = positionFromAny(player.anyPositions);
          if (isBasketball(player.anyPositions, pos)) continue;

          out.push({
            slug: player.slug,
            displayName: player.displayName || player.slug,
            position: pos || null,
            activeClub: player.activeClub ? { name: player.activeClub.name, slug: player.activeClub.slug } : null,
          });
        }
        return out;
      }

      const variables = { q: qRaw };

      // Try multiple shapes for SearchCardHits
      const candidates = [
        {
          name: "searchCards{cards}",
          query: `
            query ScoutSearch($q: String!) {
              searchCards(query: $q) {
                __typename
                cards {
                  __typename
                  player { slug displayName anyPositions activeClub { name slug } }
                }
              }
            }
          `,
          pick: (j) => j?.data?.searchCards?.cards,
        },
        {
          name: "searchCards{hits}",
          query: `
            query ScoutSearch($q: String!) {
              searchCards(query: $q) {
                __typename
                hits {
                  __typename
                  card {
                    __typename
                    anyPlayer { slug displayName anyPositions activeClub { name slug } }
                  }
                }
              }
            }
          `,
          pick: (j) => (j?.data?.searchCards?.hits || []).map(h => h?.card).filter(Boolean),
        },
        {
          name: "searchCards{items}",
          query: `
            query ScoutSearch($q: String!) {
              searchCards(query: $q) {
                __typename
                items {
                  __typename
                  card {
                    __typename
                    player { slug displayName anyPositions activeClub { name slug } }
                  }
                }
              }
            }
          `,
          pick: (j) => (j?.data?.searchCards?.items || []).map(h => h?.card).filter(Boolean),
        },
        {
          name: "searchCards{results}",
          query: `
            query ScoutSearch($q: String!) {
              searchCards(query: $q) {
                __typename
                results {
                  __typename
                  card {
                    __typename
                    player { slug displayName anyPositions activeClub { name slug } }
                  }
                }
              }
            }
          `,
          pick: (j) => (j?.data?.searchCards?.results || []).map(h => h?.card).filter(Boolean),
        },
        {
          name: "searchCards{edges{node}}",
          query: `
            query ScoutSearch($q: String!) {
              searchCards(query: $q) {
                __typename
                edges {
                  __typename
                  node {
                    __typename
                    ... on AnyCard { player { slug displayName anyPositions activeClub { name slug } } }
                    ... on Card    { player { slug displayName anyPositions activeClub { name slug } } }
                  }
                }
              }
            }
          `,
          pick: (j) => (j?.data?.searchCards?.edges || []).map(e => e?.node).filter(Boolean),
        },
      ];

      const attempts = [];
      for (const c of candidates) {
        const r = await gqlTry(c.query, variables);
        attempts.push({
          name: c.name,
          status: r.status,
          ok: r.ok,
          error0: r.json?.errors?.[0]?.message || null,
          typename: r.json?.data?.searchCards?.__typename || null,
        });

        if (!r.ok) continue;

        const nodes = c.pick(r.json) || [];
const players = pullPlayersFromCardNodes(nodes);

// XS_DEBUG_SAMPLE (only when empty)
const debugSample =
  (players && players.length) ? null :
  (Array.isArray(r.json?.data?.searchCards?.hits) ? r.json.data.searchCards.hits.slice(0, 3) : (Array.isArray(nodes) ? nodes.slice(0,3) : null));

        // Dedup by slug
        const map = new Map();
        for (const p of players) {
          if (!p?.slug) continue;
          if (!map.has(p.slug)) map.set(p.slug, p);
        }

        const items = Array.from(map.values()).slice(0, first);
return res.json({
          q: qRaw,
          mode: "graphql-searchCards",
          debugSample,
          engine: c.name,
          count: items.length,
          items,
          attempts,
        });
      }

      return res.status(502).json({
        error: "scout/search failed (no matching searchCards shape)",
        q: qRaw,
        attempts,
        hint: "Copie attempts[].error0 : on ajustera le shape gagnant (cards/hits/items/results/edges...).",
      });

    } catch (e) {
      console.error("[scout/search graphql] error:", e && e.stack ? e.stack : e);
      return res.status(500).json({ error: "Internal Server Error", message: String(e?.message || e) });
    }
  });
  app.get("/scout/search-cached", async (req, res) => {
    try {
      const qRaw = String(req.query.q || "").trim();
      const first = Math.max(1, Math.min(25, parseInt(String(req.query.first || "10"), 10) || 10));
      const eurOnly = String(req.query.eurOnly || "1") === "1" ? "1" : "0";
      const pool = Math.max(25, Math.min(400, parseInt(String(req.query.pool || "200"), 10) || 200));

      if (!qRaw) return res.status(400).json({ error: "q missing" });

      const base = req.protocol + "://" + req.get("host");

      
      const canFetch = (typeof fetch === "function"); // XS_TRENDING_FETCH_GUARD_V1
// normalize helper (lower + remove accents)
      function norm(s) {
        if (!s) return "";
        return String(s)
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");
      }

      const q = norm(qRaw);
      const qTokens = q.split(/[\s\-_.]+/g).filter(t => t.length >= 3);

      // 1) If q looks like a slug, try directly /public-player first
      const looksLikeSlug = /^[a-z0-9][a-z0-9\-_.]{2,}$/.test(q) && q.indexOf(" ") === -1;
      if (looksLikeSlug) {
        try {
          const rP = await fetch(`${base}/public-player?slug=${encodeURIComponent(qRaw)}`, { headers: { "accept": "application/json" } });
          if (rP.ok) {
            const p = await rP.json();
return res.json({
              q: qRaw,
              mode: "direct-public-player",
              count: 1,
              items: [{
                slug: p.playerSlug,
                displayName: p.playerName,
                position: p.position || null,
                activeClub: p.activeClub || null,
              }],
            });
          }
        } catch {}
}

      // 2) Get pool from /scout/cards?q=...
      async function getCards(queryString) {
        const url = `${base}/scout/cards?first=${pool}&eurOnly=${eurOnly}${queryString ? `&q=${encodeURIComponent(queryString)}` : ""}`;
        const r = await fetch(url, { headers: { "accept": "application/json" } });
        const text = await r.text();
        let json = null;
        try { json = JSON.parse(text); } catch {}return { ok: r.ok && !!json, status: r.status, json, text: text.slice(0, 1500), url };
      }

      const a = await getCards(qRaw);
      let offers = Array.isArray(a.json?.items) ? a.json.items : [];
      let fromCache = !!a.json?.fromCache;
      let cacheExact = !!a.json?.cacheExact;

      // 3) If cache was not exact, add a no-q pool to filter locally
      let b = null;
      if (fromCache && !cacheExact) {
        b = await getCards("");
        const offers2 = Array.isArray(b.json?.items) ? b.json.items : [];
        offers = offers.concat(offers2);
      }

      // 4) Build candidate players from offers then FILTER locally
      const map = new Map();

      function readSlug(it) {
        return it.playerSlug || it.player?.slug || it.card?.player?.slug || it.cardPlayerSlug || null;
      }
      function readName(it, slug) {
        return it.playerName || it.player?.displayName || it.card?.player?.displayName || it.cardPlayerName || slug;
      }
      function readPosition(it) {
        return it.position || it.player?.position || it.card?.player?.position || null;
      }

      function matchesQ(slug, name) {
        const s = norm(slug);
        const n = norm(name);
        if (!qTokens.length) return (s.includes(q) || n.includes(q));
        // require ALL tokens to appear somewhere (slug or name)
        return qTokens.every(t => (s.includes(t) || n.includes(t)));
      }

      for (const it of offers) {
        const slug = readSlug(it);
        if (!slug) continue;
        const name = readName(it, slug);
        const pos = readPosition(it);

        // exclude basketball noise
        if (typeof pos === "string" && pos.toLowerCase().startsWith("basketball_")) continue;

        if (!matchesQ(slug, name)) continue;

        if (!map.has(slug)) {
          map.set(slug, {
            slug,
            displayName: name || slug,
            position: pos || null,
            activeClub: null,
            offersCount: 1,
          });
        } else {
          map.get(slug).offersCount += 1;
        }
      }

      const rawItems = Array.from(map.values());

      // 5) Enrich with /public-player (position + activeClub), limited to `first`
      const items = [];
      
      const RESOLVE_MAX = 5; // XS_TRENDING_RESOLVE_CAP_V1
for (const it of rawItems.slice(0, first)) {
        try {
          const rP = await fetch(`${base}/public-player?slug=${encodeURIComponent(it.slug)}`, { headers: { "accept": "application/json" } });
          if (rP.ok) {
            const p = await rP.json();
            items.push({
              slug: it.slug,
              displayName: p.playerName || it.displayName,
              position: p.position || it.position || null,
              activeClub: p.activeClub || null,
              offersCount: it.offersCount,
            });
            continue;
          }
        } catch {}items.push(it);
      }
return res.json({
        q: qRaw,
        mode: "via-scout-cards-filter-enrich",
        first,
        pool,
        eurOnly: eurOnly === "1",
        count: items.length,
        items,
        source: {
          a: { fromCache, cacheExact, note: a.json?.note || null },
          b: b ? { fromCache: !!b.json?.fromCache, cacheExact: !!b.json?.cacheExact, note: b.json?.note || null } : null,
        },
        debug: {
          offersInA: Array.isArray(a.json?.items) ? a.json.items.length : 0,
          offersTotal: offers.length,
          rawMatches: rawItems.length,
        }
      });

    } catch (e) {
      console.error("[scout/search v2] error:", e && e.stack ? e.stack : e);
      return res.status(500).json({ error: "Internal Server Error", message: String(e?.message || e) });
    }
  });
  app.get("/scout/search-cards-v1", async (req, res) => {
    try {
      const q = String(req.query.q || "").trim();
      const first = Math.max(1, Math.min(50, parseInt(String(req.query.first || "10"), 10) || 10));
      const eurOnly = String(req.query.eurOnly || "1") === "1" ? "1" : "0";

      if (!q) return res.status(400).json({ error: "q missing" });

      // Call our own /scout/cards (so we benefit from your existing cache/fallback logic)
      const base = req.protocol + "://" + req.get("host");
      
      const canFetch = (typeof fetch === "function"); // XS_TRENDING_FETCH_GUARD_V1
const url = `${base}/scout/cards?first=${first}&eurOnly=${eurOnly}&q=${encodeURIComponent(q)}`;

      const r = await fetch(url, { headers: { "accept": "application/json" } });
      const text = await r.text();

      let json = null;
      try { json = JSON.parse(text); } catch {}if (!r.ok || !json) {
        return res.status(502).json({
          error: "scout/search failed (via scout/cards)",
          status: r.status,
          body: text.slice(0, 2000),
        });
      }

      const offers = Array.isArray(json.items) ? json.items : [];
      const map = new Map();

      for (const it of offers) {
        // Try to detect slug/name in multiple shapes
        const slug =
          it.playerSlug ||
          it.player?.slug ||
          it.card?.player?.slug ||
          it.cardPlayerSlug ||
          null;

        const name =
          it.playerName ||
          it.player?.displayName ||
          it.card?.player?.displayName ||
          it.cardPlayerName ||
          slug;

        if (!slug) continue;

        // Optional: keep some useful hints
        const club =
          it.activeClub ||
          it.player?.activeClub ||
          it.card?.player?.activeClub ||
          null;

        const position =
          it.position ||
          it.player?.position ||
          it.card?.player?.position ||
          null;

        const key = slug;
        if (!map.has(key)) {
          map.set(key, {
            slug,
            displayName: name || slug,
            position: position || null,
            activeClub: club ? { name: club.name, slug: club.slug } : null,
            offersCount: 1,
          });
        } else {
          map.get(key).offersCount += 1;
        }
      }

      const items = Array.from(map.values()).slice(0, first);
return res.json({
        q,
        first,
        eurOnly: eurOnly === "1",
        count: items.length,
        items,
        source: {
          offersCount: offers.length,
          fromCache: !!json.fromCache,
          cacheExact: !!json.cacheExact,
          note: json.note || null,
        },
      });

    } catch (e) {
      console.error("[scout/search via cards] error:", e && e.stack ? e.stack : e);
      return res.status(500).json({ error: "Internal Server Error", message: String(e?.message || e) });
    }
  });
  app.get("/scout/search-gql", async (req, res) => {
    try {
      const q = String(req.query.q || "").trim();
      const first = Math.max(1, Math.min(25, parseInt(String(req.query.first || "10"), 10) || 10));
      if (!q) return res.status(400).json({ error: "q missing" });

      const url = "https://api.sorare.com/graphql";

      async function gqlTry(query, variables) {
        const r = await fetch(url, {
          method: "POST",
          headers: { "content-type": "application/json", "accept": "application/json" },
          body: JSON.stringify({ query, variables }),
        });
        const text = await r.text();
        let json = null;
        try { json = JSON.parse(text); } catch {}const ok = r.ok && json && !json.errors;
        return { ok, json, text, status: r.status };
      }

      function normItem(slug, displayName, activeClub, anyPositions) {
        const position =
          Array.isArray(anyPositions) && anyPositions[0]
            ? (typeof anyPositions[0] === "string" ? anyPositions[0] : (anyPositions[0] && anyPositions[0].position))
            : null;

        return {
          slug: slug || null,
          displayName: displayName || slug || null,
          position,
          activeClub: activeClub ? { name: activeClub.name, slug: activeClub.slug } : null,
        };
      }

      const variables = { q, first };

      const candidates = [
        {
          name: "football.players(list, query)",
          query: `
            query ScoutSearch($q: String!) {
              football {
                players(query: $q, first: $first) {
                  slug
                  displayName
                  anyPositions
                  activeClub { name slug }
                }
              }
            }
          `,
          pick: (j) => j?.data?.football?.players,
        },
        {
          name: "football.players(list, search)",
          query: `
            query ScoutSearch($q: String!) {
              football {
                players(search: $q, first: $first) {
                  slug
                  displayName
                  anyPositions
                  activeClub { name slug }
                }
              }
            }
          `,
          pick: (j) => j?.data?.football?.players,
        },
        {
          // in case "first" not supported
          name: "football.players(list, query no-first)",
          query: `
            query ScoutSearch($q: String!) {
              football {
                players(query: $q) {
                  slug
                  displayName
                  anyPositions
                  activeClub { name slug }
                }
              }
            }
          `,
          pick: (j) => j?.data?.football?.players,
          vars: (v) => ({ q: v.q }),
        },
        {
          // last resort: try "searchCards" (some schemas only expose card search)
          name: "searchCards fallback",
          query: `
            query ScoutSearch($q: String!) {
              searchCards(query: $q) {
                nodes {
                  __typename
                  ... on AnyCard {
                    player { slug displayName anyPositions activeClub { name slug } }
                  }
                  ... on Card {
                    player { slug displayName anyPositions activeClub { name slug } }
                  }
                }
              }
            }
          `,
          pick: (j) => (j?.data?.searchCards?.nodes || [])
            .map(n => n?.player ? n.player : null)
            .filter(Boolean),
        },
      ];

      const attempts = [];

      for (const c of candidates) {
        const vars = c.vars ? c.vars(variables) : variables;
        const r = await gqlTry(c.query, vars);

        attempts.push({
          name: c.name,
          status: r.status,
          hasJson: !!r.json,
          hasErrors: !!(r.json && r.json.errors),
          error0: r.json?.errors?.[0]?.message || null,
        });

        if (r.ok) {
          const nodes = c.pick(r.json) || [];
          const arr = Array.isArray(nodes) ? nodes : [];
          const items = arr.map(n => {
            const slug = n?.slug;
            if (!slug) return null;
            return normItem(slug, n?.displayName, n?.activeClub, n?.anyPositions);
          }).filter(Boolean);
return res.json({ q, engine: c.name, count: items.length, items, attempts });
        }
      }

      return res.status(502).json({
        error: "scout/search upstream schema mismatch",
        q,
        attempts,
        hint: "Regarde attempts.error0 pour voir le 1er mismatch restant; on ajustera la query gagnante.",
      });

    } catch (e) {
      console.error("[scout/search] error:", e && e.stack ? e.stack : e);
      return res.status(500).json({ error: "Internal Server Error", message: String(e?.message || e) });
    }
  });
  app.get("/scout/search-old", async (req, res) => {
    try {
      const q = String(req.query.q || "").trim();
      const first = Math.max(1, Math.min(25, parseInt(String(req.query.first || "10"), 10) || 10));
      if (!q) return res.status(400).json({ error: "q missing" });

      const url = "https://api.sorare.com/graphql";

      // Helper: call Sorare GraphQL and return {ok,json,text,status}
      async function gqlTry(query, variables) {
        const r = await fetch(url, {
          method: "POST",
          headers: { "content-type": "application/json", "accept": "application/json" },
          body: JSON.stringify({ query, variables }),
        });
        const text = await r.text();
        let json = null;
        try { json = JSON.parse(text); } catch {}const ok = r.ok && json && !json.errors;
        return { ok, json, text, status: r.status };
      }

      // Extract helpers (safe for many shapes)
      function normItem(slug, displayName, activeClub, anyPositions) {
        const position =
          Array.isArray(anyPositions) && anyPositions[0]
            ? (typeof anyPositions[0] === "string" ? anyPositions[0] : (anyPositions[0] && anyPositions[0].position))
            : null;

        return {
          slug: slug || null,
          displayName: displayName || slug || null,
          position,
          activeClub: activeClub ? { name: activeClub.name, slug: activeClub.slug } : null,
        };
      }

      // Candidate queries (try in order)
      const variables = { q, first };

      const candidates = [
        {
          name: "football.players(query)",
          query: `
            query ScoutSearch($q: String!) {
              football {
                players(query: $q, first: $first) {
                  nodes { slug displayName anyPositions activeClub { name slug } }
                }
              }
            }
          `,
          pick: (j) => j?.data?.football?.players?.nodes,
        },
        {
          name: "football.players(search)",
          query: `
            query ScoutSearch($q: String!) {
              football {
                players(search: $q, first: $first) {
                  nodes { slug displayName anyPositions activeClub { name slug } }
                }
              }
            }
          `,
          pick: (j) => j?.data?.football?.players?.nodes,
        },
        {
          name: "football.searchPlayers",
          query: `
            query ScoutSearch($q: String!) {
              football {
                searchPlayers(query: $q, first: $first) {
                  nodes { slug displayName anyPositions activeClub { name slug } }
                }
              }
            }
          `,
          pick: (j) => j?.data?.football?.searchPlayers?.nodes,
        },
        {
          // global search fallback (older style)
          name: "search(query)",
          query: `
            query ScoutSearch($q: String!) {
              search(query: $q, first: $first) {
                nodes {
                  __typename
                  ... on FootballPlayer { slug displayName anyPositions activeClub { name slug } }
                  ... on Player { slug displayName anyPositions activeClub { name slug } }
                }
              }
            }
          `,
          pick: (j) => j?.data?.search?.nodes,
        },
      ];

      const attempts = [];
      for (const c of candidates) {
        const r = await gqlTry(c.query, variables);
        attempts.push({
          name: c.name,
          status: r.status,
          hasJson: !!r.json,
          hasErrors: !!(r.json && r.json.errors),
          error0: r.json?.errors?.[0]?.message || null,
        });

        if (r.ok) {
          const nodes = c.pick(r.json) || [];
          const items = (Array.isArray(nodes) ? nodes : [])
            .map(n => {
              // global search nodes may be mixed types
              const slug = n?.slug;
              const displayName = n?.displayName;
              const activeClub = n?.activeClub;
              const anyPositions = n?.anyPositions;
              if (!slug) return null;
              return normItem(slug, displayName, activeClub, anyPositions);
            })
            .filter(Boolean);
return res.json({
            q,
            engine: c.name,
            count: items.length,
            items,
            attempts,
          });
        }
      }

      return res.status(502).json({
        error: "scout/search upstream schema mismatch",
        q,
        attempts,
        hint: "Aucun candidat n'a matché. On ajustera la query gagnante en lisant 'attempts.error0'.",
      });

    } catch (e) {
      console.error("[scout/search] error:", e && e.stack ? e.stack : e);
      return res.status(500).json({ error: "Internal Server Error", message: String(e?.message || e) });
    }
  });
  // XS_GQL_INTROSPECT (dev)
  // usage:
  //   /debug/gql-type?name=SearchCardHits
  //   /debug/gql-type?name=Query
  app.get("/debug/gql-type", async (req, res) => {
    try {
      const name = String(req.query.name || "").trim();
      if (!name) return res.status(400).json({ error: "name missing" });

      const url = "https://api.sorare.com/graphql";
      const query = `
        query IntrospectType($name: String!) {
          __type(name: $name) {
            name
            kind
            fields(includeDeprecated: true) {
              name
              type {
                kind
                name
                ofType { kind name ofType { kind name } }
              }
            }
            inputFields {
              name
              type { kind name ofType { kind name } }
            }
            enumValues { name }
          }
        }
      `;
      const variables = { name };

      const r = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json", "accept": "application/json" },
        body: JSON.stringify({ query, variables }),
      });

      const text = await r.text();
      let json = null;
      try { json = JSON.parse(text); } catch {}if (!r.ok || !json) {
        return res.status(502).json({ error: "upstream error", status: r.status, body: text.slice(0, 3000) });
      }
      if (json.errors) {
        return res.status(502).json({ error: "graphql errors", errors: json.errors });
      }
      return res.json(json.data);
    } catch (e) {
      console.error("[debug/gql-type] error:", e && e.stack ? e.stack : e);
      return res.status(500).json({ error: "Internal Server Error", message: String(e?.message || e) });
    }
  });

  // XS_GQL_INTROSPECT_SCHEMA (dev)
  // usage: /debug/gql-schema
  app.get("/debug/gql-schema", async (req, res) => {
    try {
      const url = "https://api.sorare.com/graphql";
      const query = `
        query IntrospectSchema {
          __schema {
            queryType { name }
            types {
              name
              kind
            }
          }
        }
      `;
      const r = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json", "accept": "application/json" },
        body: JSON.stringify({ query }),
      });
      const text = await r.text();
      let json = null;
      try { json = JSON.parse(text); } catch {}if (!r.ok || !json) return res.status(502).json({ error: "upstream error", status: r.status, body: text.slice(0,3000) });
      if (json.errors) return res.status(502).json({ error: "graphql errors", errors: json.errors });
      return res.json(json.data);
    } catch (e) {
      console.error("[debug/gql-schema] error:", e && e.stack ? e.stack : e);
      return res.status(500).json({ error: "Internal Server Error", message: String(e?.message || e) });
    }
  });


// XS_MARKET_RESET_V1_BEGIN
// New Market implementation based on Sorare docs (APIKEY + liveSingleSaleOffers)
// - Endpoint: GET /market/offers?last=20
// - Price read via receiverSide.amounts.eur
// - Disk cache + 429 Retry-After passthrough

app.get("/market/offers-old", async (req, res) => {
  const xsFs = require("fs");
  const xsPath = require("path");

  const last = Math.max(1, Math.min(50, parseInt(String(req.query.last || "20"), 10) || 20));
  const cacheFile = xsPath.join(__dirname, "data", "market_cache.json");
  const cacheKey = `offers_last_${last}`;

  const readCache = () => {
    try {
      if (!xsFs.existsSync(cacheFile)) return null;
  const raw = (o && typeof o.priceEur === "number" && Number.isFinite(o.priceEur)) ? (o.priceEur.toFixed(2) + " €") : "";
      const j = JSON.parse(raw);
      return j && j[cacheKey] ? j[cacheKey] : null;
    } catch {
      return null;
    }
  };

  const writeCache = (payload) => {
    try {
      let j = {};
      if (xsFs.existsSync(cacheFile)) {
        try { j = JSON.parse(xsFs.readFileSync(cacheFile, "utf8")); } catch { j = {}; }
      }
      j[cacheKey] = { ts: Date.now(), payload };
      xsFs.writeFileSync(cacheFile, JSON.stringify(j, null, 2), "utf8");
    } catch {}
};

  const cached = readCache();

  const query = `
    query LiveSingleSaleOffers($last: Int!) {
      tokens {
        liveSingleSaleOffers(last: $last) {
          nodes {
            id
            status
            senderSide {
              anyCards { assetId slug name rarityTyped collection pictureUrl }
            }
            receiverSide { amounts { eurCents wei } } }
          }
        }
      }
    }
  `;

  const variables = { last };

  const headers = { "content-type": "application/json" };

  // Optional: APIKEY (recommended) -> 600/min
  if (process.env.SORARE_APIKEY) headers["APIKEY"] = process.env.SORARE_APIKEY;

  // Optional: if your server already has user auth tokens somewhere, you can add them here.
  // For now we keep it public + APIKEY.

  try {
    const r = await fetch("https://api.sorare.com/graphql", {
      method: "POST",
      headers,
      body: JSON.stringify({ operationName: "LiveSingleSaleOffers", query, variables }),
    });

    if (r.status === 429) {
      const retryAfter = r.headers.get("retry-after");
      const secs = retryAfter ? parseInt(retryAfter, 10) : null;
      if (cached?.payload) {
        return res.status(200).json({ ok: true, fromCache: true, retryAfterSeconds: secs, ...cached.payload });
      }
      return res.status(429).json({ error: "rate_limited", retryAfterSeconds: secs });
    }

    const json = await r.json().catch(() => null);
    if (!r.ok || !json) {
      if (cached?.payload) return res.status(200).json({ ok: true, fromCache: true, ...cached.payload });
      return res.status(500).json({ error: "sorare_graphql_failed", status: r.status, raw: json });
    }

    const nodes = json?.data?.tokens?.liveSingleSaleOffers?.nodes || [];
    const items = nodes.map((n) => {
      const card = (n?.senderSide?.anyCards && n.senderSide.anyCards[0]) ? n.senderSide.anyCards[0] : null;
      const eur = n?.receiverSide?.amounts?.eur ?? null;
            // XS_WEI_TO_ETH_V1
      // XS_FIX_WEI_TO_ETH_JS_V1
      const weiRaw =
        (n?.receiverSide?.amounts?.wei ?? null) ??
        (n?.senderSide?.amounts?.wei ?? null);

      const wei = (weiRaw === null || weiRaw === undefined) ? null : String(weiRaw);

      const weiToEthStr = (weiStr) => {
        try {
          if (!weiStr) return null;
          const w = BigInt(weiStr);
          const base = 1000000000000000000n; // 1e18
          const whole = w / base;
          const frac = w % base;
      // on garde 6 décimales pour l'affichage
          const frac6 = (frac / 1000000000000n).toString().padStart(6,'0'); // 1e12 -> 6 decimals
          return `${whole}.${frac6}`;
        } catch {
          return null;
        }
      };

      const eth = wei ? weiToEthStr(wei) : null;
      return {
        id: n?.id,
        status: n?.status,
        eur,
        wei,
        card: card ? {
          assetId: card.assetId,
          slug: card.slug,
          name: card.name,
          rarity: card.rarityTyped,
          collection: card.collection,
          pictureUrl: card.pictureUrl,
        } : null,
      };
    });

    const payload = { ok: true, fromCache: false, count: items.length, items };
    writeCache(payload);
    return res.json(payload);
  } catch (e) {
    if (cached?.payload) return res.status(200).json({ ok: true, fromCache: true, ...cached.payload });
    return res.status(500).json({ error: "market_offers_exception", message: String(e?.message || e) });
  }
});
// XS_MARKET_RESET_V1_END



// XS_MARKET_OAUTH_RACHEL_V1_BEGIN
app.get("/market/offers", async (req, res) => {
  const deviceId = String(req.query.deviceId || "").trim();
  const last = Math.max(1, Math.min(50, parseInt(String(req.query.last || "20"), 10) || 20));
  if (!deviceId) return res.status(400).json({ error: "deviceId missing" });

  // récupère le token OAuth stocké par deviceId
  const t = xsGetDeviceOAuthTokenFromDisk(deviceId);
  const accessToken = t?.token;
  if (!accessToken) return res.status(401).json({ error: "no_token", tokenSource: t?.source });

  const query = `
    query LiveSingleSaleOffers($last: Int!) {
      tokens {
        liveSingleSaleOffers(last: $last) {
          nodes {
            id
            status
            senderSide { anyCards { slug
            name
            rarityTyped
            collection
            pictureUrl } }
            receiverSide { amounts { eurCents wei } }
          }
        }
      }
    }
  `;

  try {
    
    // XS_MARKET_CACHE_FALLBACK_V1_BEGIN
    const xsCache = xsReadMarketCache();
    // XS_MARKET_CACHE_FALLBACK_V1_END
const r = await fetch("https://api.sorare.com/graphql", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "Authorization": "Bearer " + accessToken
      },
      body: JSON.stringify({
        operationName: "LiveSingleSaleOffers",
        query,
        variables: { last }
      })
    });

    const text = await r.text();
    let json = null;
    try { json = JSON.parse(text); } catch {}if (!r.ok) {
      // fallback cache si Sorare rate-limit / down
      if (xsCache && xsCache.items && xsCache.items.length) {
        return res.status(200).json({ ok: true, fromCache: true, count: xsCache.items.length, items: xsCache.items, cacheTs: xsCache.ts });
      }
      return res.status(r.status).json({
        error: "sorare_graphql_failed",
        status: r.status,
        tokenSource: t?.source,
        rawText: text,
        rawJson: json
      });
    }

    const data = json?.data || null;
    const nodes = (((data || {}).tokens || {}).liveSingleSaleOffers || {}).nodes || [];

    const items = nodes.map((n) => {
      const card = n?.senderSide?.anyCards?.[0] || null;
          // XS_EUR_EXTRACT_ROBUST_V1
      const recvCentsRaw = n?.receiverSide?.amounts?.eurCents ?? null;
      const sendCentsRaw = n?.senderSide?.amounts?.eurCents ?? null;

      const toNum = (v) => {
        if (v === null || v === undefined) return null;
        if (typeof v === "number" && Number.isFinite(v)) return v;
        if (typeof v === "string") {
          const s = v.trim();
          if (!s) return null;
          const num = Number(s);
          return Number.isFinite(num) ? num : null;
        }
        return null;
      };

      const recvCents = toNum(recvCentsRaw);
      const sendCents = toNum(sendCentsRaw);

      const eurCents = (recvCents !== null ? recvCents : sendCents);
      const eur = (eurCents === null) ? null : (eurCents / 100);
      // XS_WEI_TO_ETH_V1
      // XS_FIX_WEI_TO_ETH_JS_V1
      const weiRaw =
        (n?.receiverSide?.amounts?.wei ?? null) ??
        (n?.senderSide?.amounts?.wei ?? null);

      const wei = (weiRaw === null || weiRaw === undefined) ? null : String(weiRaw);

      const weiToEthStr = (weiStr) => {
        try {
          if (!weiStr) return null;
          const w = BigInt(weiStr);
          const base = 1000000000000000000n; // 1e18
          const whole = w / base;
          const frac = w % base;
      // on garde 6 décimales pour l'affichage
          const frac6 = (frac / 1000000000000n).toString().padStart(6,'0'); // 1e12 -> 6 decimals
          return `${whole}.${frac6}`;
        } catch {
          return null;
        }
      };

      const eth = wei ? weiToEthStr(wei) : null;

      return {
        id: n?.id ?? null,
        status: n?.status ?? null,
        cardSlug: card?.slug ?? null,
        cardName: card?.name ?? null,
        rarity: card?.rarityTyped ?? null,
        collection: card?.collection ?? null,
        pictureUrl: card?.pictureUrl ?? null,
        eur,
        wei
      , eth
        , price: (eur !== null && eur !== undefined) ? { currency: "EUR", amount: eur } : (wei ? { currency: "WEI", amount: wei } : null),
        priceText: (eur !== null && eur !== undefined) ? ("€" + eur.toFixed(2)) : (eth ? ("Ξ" + String(eth)) : (wei ? ("wei " + String(wei)) : "" ))
};
    });

    xsWriteMarketCache({ ts: new Date().toISOString(), deviceId, last, count: items.length, items });
return res.json({ ok: true, fromCache: false, count: items.length, items });
  } catch (e) {
    return res.status(500).json({ error: "market_offers_exception", message: String(e?.message || e) });
  }
});
// XS_MARKET_OAUTH_RACHEL_V1_END

// XS_MARKET_RAW_V1_BEGIN
app.get("/market/offers-raw-debug", async (req, res) => {
  const deviceId = String(req.query.deviceId || "").trim();
  const last = Math.max(1, Math.min(50, parseInt(String(req.query.last || "20"), 10) || 20));
  if (!deviceId) return res.status(400).json({ error: "deviceId missing" });

  const t = xsGetDeviceOAuthTokenFromDisk(deviceId);
  const accessToken = t?.token;
  if (!accessToken) return res.status(401).json({ error: "no_token", tokenSource: t?.source });

  const query = `
    query LiveSingleSaleOffers($last: Int!) {
      tokens {
        liveSingleSaleOffers(last: $last) {
          nodes {
            id
            status
            senderSide { anyCards { slug name rarityTyped collection } }
            receiverSide { amounts { eurCents wei } }
          }
        }
      }
    }
  `;

  try {
    const r = await fetch("https://api.sorare.com/graphql", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "Authorization": "Bearer " + accessToken,
      },
      body: JSON.stringify({ operationName: "LiveSingleSaleOffers", query, variables: { last } }),
    });

    const text = await r.text();
    let json = null;
    try { json = JSON.parse(text); } catch {}return res.status(r.status).json({ status: r.status, tokenSource: t?.source, rawText: text, rawJson: json });
  } catch (e) {
    return res.status(500).json({ error: "offers_raw_exception", message: String(e?.message || e) });
  }
});
// XS_MARKET_RAW_V1_END

// XS_DEVICE_DEBUG_V1_BEGIN
app.get("/auth/device-debug", (req, res) => {
  const path = require("path"); const fs = require("fs"); try {
    const deviceId = String(req.query.deviceId || "").trim();

    const dataDir =
      (typeof DATA_DIR !== "undefined" && DATA_DIR) ? DATA_DIR :
      (typeof SCOUT_DATA_DIR !== "undefined" && SCOUT_DATA_DIR) ? SCOUT_DATA_DIR :
      path.join(__dirname, "data");

    const f = path.join(dataDir, "oauth_devices.json");
    const exists = fs.existsSync(f);

    let keys = [];
    let rec = null;
    let hasToken = false;

    if (exists) {
  const raw = (o && typeof o.priceEur === "number" && Number.isFinite(o.priceEur)) ? (o.priceEur.toFixed(2) + " €") : "";
      const j = JSON.parse(raw || "{}");
      keys = Object.keys(j || {});
      rec = deviceId ? (j[deviceId] || null) : null;
      const token = rec?.access_token || rec?.accessToken || null;
      hasToken = !!token;
    }
return res.json({
      ok: true,
      deviceId,
      dataDir,
      file: f,
      exists,
      keysCount: keys.length,
      keysSample: keys.slice(0, 10),
      found: !!rec,
      hasToken
    });
  } catch (e) {
    return res.status(500).json({ error: "device_debug_exception", message: String(e?.message || e) });
  }
});
// XS_DEVICE_DEBUG_V1_END

// XS_GET_DEVICE_TOKEN_HELPER_V2_BEGIN
function xsGetDeviceOAuthTokenFromDisk(deviceId) {
  try {
    const fs = require("fs");
    const path = require("path");
    const id = String(deviceId || "").trim();
    if (!id) return null;

    const f = path.join(__dirname, "data", "oauth_devices.json");
    if (!fs.existsSync(f)) return null;
  const raw = (o && typeof o.priceEur === "number" && Number.isFinite(o.priceEur)) ? (o.priceEur.toFixed(2) + " €") : "";
    const j = JSON.parse(raw || "{}");
    const rec = j?.[id] || null;
    if (!rec) return null;

    const token = rec.access_token || rec.accessToken || null;
    if (!token) return null;

    return { token, source: "oauth_devices.json" };
  } catch {
    return null;
  }
}
// XS_GET_DEVICE_TOKEN_HELPER_V2_END

// XS_MARKET_CACHE_HELPERS_V1_BEGIN
function xsMarketCacheFile() {
  try {
    const path = require("path");
    return path.join(__dirname, "data", "market_cache.json");
  } catch {
    return null;
  }
}
function xsReadMarketCache() {
  try {
    const fs = require("fs");
    const f = xsMarketCacheFile();
    if (!f || !fs.existsSync(f)) return null;
  const raw = (o && typeof o.priceEur === "number" && Number.isFinite(o.priceEur)) ? (o.priceEur.toFixed(2) + " €") : "";
    return JSON.parse(raw || "null");
  } catch {
    return null;
  }
}
function xsWriteMarketCache(payload) {
  try {
    const fs = require("fs");
    const path = require("path");
    const f = xsMarketCacheFile();
    if (!f) return false;
    const dir = path.dirname(f);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(f, JSON.stringify(payload, null, 2), "utf8");
    return true;
  } catch {
    return false;
  }
}
// XS_MARKET_CACHE_HELPERS_V1_END

registerNewsRoutes(app);
/* XS_LINEUPS_V1: simple lineups storage (GET/POST/DELETE) */
(() => {
  const xsFs = require("fs");
  const xsPath = require("path");

  const xsDataDir = (typeof DATA_DIR !== "undefined")
    ? DATA_DIR
    : xsPath.join(__dirname, "data");

  const xsFile = xsPath.join(xsDataDir, "lineups.json");

  function xsReadJson(file, fallback) {
    try {
      if (!xsFs.existsSync(file)) return fallback;
  const raw = (o && typeof o.priceEur === "number" && Number.isFinite(o.priceEur)) ? (o.priceEur.toFixed(2) + " €") : "";
      const v = JSON.parse(raw);
      return v ?? fallback;
    } catch {
      return fallback;
    }
  }

  function xsWriteJson(file, value) {
    xsFs.mkdirSync(xsPath.dirname(file), { recursive: true });
    const tmp = file + ".tmp";
    xsFs.writeFileSync(tmp, JSON.stringify(value, null, 2), "utf8");
    xsFs.renameSync(tmp, file);
  }

  // GET /lineups -> retourne un tableau
  app.get("/lineups", (req, res) => {
    const items = xsReadJson(xsFile, []);
    res.json(items);
  });

  // POST /lineups -> ajoute une lineup
  app.post("/lineups", (req, res) => {
    const items = xsReadJson(xsFile, []);
    const body = req.body || {};
    const item = {
      id: body.id || `lu_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      createdAt: body.createdAt || new Date().toISOString(),
      ...body,
    };
    items.unshift(item);
    xsWriteJson(xsFile, items);
    res.json({ ok: true, item });
  });

  // DELETE /lineups/:id
  app.delete("/lineups/:id", (req, res) => {
    const id = String(req.params.id || "");
    const items = xsReadJson(xsFile, []);
    const next = items.filter(x => String(x?.id) !== id);
    xsWriteJson(xsFile, next);
    res.json({ ok: true, removed: items.length - next.length });
  });
})();

// XS_SCOUT_PLAYER_ENDPOINT_V1_BEGIN
app.get("/scout/player/:slug", async (req, res) => {
/* ===== XS_SCOUT_PLAYER_PROBE_V1 ===== */
const xsProbeT0 = Date.now();
const xsProbeSlug = (req && req.params && req.params.slug) ? req.params.slug : "(no-slug)";
console.log("[XS_SCOUT_PLAYER_PROBE_V1] start slug=", xsProbeSlug);
/* ==================================== */

  try {
    const slug = String(req.params.slug || "").trim();
    
    // XS_SCOUT_PLAYER_FALLBACK_PUBLIC_V2_BEGIN
async function xsFetchPlayerOffersPublicFallback(playerSlug, playerName) {
  const base = req.protocol + "://" + req.get("host"); // XS_SCOUT_PLAYER_FALLBACK_HOST_V2
  const slug = String(playerSlug || "").trim();
  const name = String(playerName || "").trim();

  async function fetchCardsQ(q) {
    if (!q) return [];
    const url = base + "/scout/cards?first=200&allowUnknownPrices=1&q=" + encodeURIComponent(q);
    const r = await fetch(url);
    const j = await r.json().catch(() => ({}));
    return Array.isArray(j?.items) ? j.items : [];
  }

  // A) try q = slug
  const itemsSlug = await fetchCardsQ(slug);
  const hitSlug = itemsSlug.filter(x => x && String(x.playerSlug || "").toLowerCase() === slug.toLowerCase());
  if (hitSlug.length) return hitSlug;

  // B) try q = playerName (public search often works better than slug)
  const itemsName = await fetchCardsQ(name);
  const hitName = itemsName.filter(x => x && String(x.playerSlug || "").toLowerCase() === slug.toLowerCase());
  if (hitName.length) return hitName;

  // C) fallback no-q then filter server-side
  const urlNoQ = base + "/scout/cards?first=400&allowUnknownPrices=1";
  const rn = await fetch(urlNoQ);
  const jn = await rn.json().catch(() => ({}));
  const itemsN = Array.isArray(jn?.items) ? jn.items : [];
  return itemsN.filter(x => x && String(x.playerSlug || "").toLowerCase() === slug.toLowerCase());
}
// XS_SCOUT_PLAYER_FALLBACK_PUBLIC_V2_END
if (!slug) return res.status(400).json({ error: "slug missing" });

    const base = req.protocol + "://" + req.get("host");
    const r = await fetch(`${base}/public-player?slug=${encodeURIComponent(slug)}`, {
      headers: { accept: "application/json" },
    });

    if (!r.ok) {
      const txt = await r.text().catch(() => "");
      return res.status(r.status).json({ error: "player not found", message: txt || "not found" });
    }

    const p = await r.json();
      // XS_SCOUT_PLAYER_RETURNS_OFFERS_V1_BEGIN
  const offers = await xsFetchPlayerOffersPublicFallback(slug, (p?.playerName || p?.displayName || ""));
  const meta = {
    fetchedAt: new Date().toISOString(),
    count: Array.isArray(offers) ? offers.length : 0,
    note: "XS_SCOUT_PLAYER_RETURNS_OFFERS_V1 (fallback public: q then no-q filter)"
  };
/* XS_PLAYER2_FALLBACK_NOQ_V1_BEGIN */
if (!offers || offers.length === 0) {
  const targetSlug = String((req && req.params && req.params.slug) || "");
  if (targetSlug) {
    try {
      const r = await fetch(`${BASE_URL}/scout/cards?first=200&allowUnknownPrices=1`);
      const j = await r.json();
      if (Array.isArray(j?.items)) {
        offers = j.items.filter(o => o?.playerSlug === targetSlug);
      }
    } catch (e) {}
  }
}
/* XS_PLAYER2_FALLBACK_NOQ_V1_END */
  // XS_SCOUT_PLAYER_RETURNS_OFFERS_V1_END
return res.json({
      playerSlug: p?.playerSlug || slug,
      playerName: p?.playerName || p?.displayName || slug,
      position: p?.position || null,
      activeClub: p?.activeClub || null,
      offers,
      meta,
    });
  } catch (e) {
    return res.status(500).json({ error: "scout/player failed", message: String(e?.message || e) });
  }
});
// XS_SCOUT_PLAYER_ENDPOINT_V1_END
  
// XS_SCOUT_PLAYER2_ENDPOINT_V1_BEGIN
app.get("/scout/player2/:slug", async (req, res) => {
  try {
    const slug = String(req.params.slug || "").trim();
    if (!slug) return res.status(400).json({ error: "slug missing" });

    // 1) player info (reuse existing stable endpoint)
    const base = req.protocol + "://" + req.get("host");
    const r = await fetch(`${base}/public-player?slug=${encodeURIComponent(slug)}`, {
      headers: { accept: "application/json" },
    });
    if (!r.ok) {
      const txt = await r.text().catch(() => "");
      return res.status(r.status).json({ error: "player not found", message: txt || "not found" });
    }
    const p = await r.json();

    // 2) offers: call existing /scout/cards (stable), then filter by playerSlug
    const base2 = req.protocol + "://" + req.get("host");
    const rc = await fetch(`${base2}/scout/cards?first=50&q=${encodeURIComponent(slug)}`, {
      headers: { accept: "application/json" },
    });
    if (!rc.ok) {
      const txt2 = await rc.text().catch(() => "");
      return res.status(502).json({ error: "scout/player2 cards fetch failed", message: txt2 || String(rc.status) });
    }
    const jc = await rc.json().catch(() => ({}));
    const items = Array.isArray(jc?.items) ? jc.items : [];
    const offers = items.filter(o => o && o.playerSlug === slug).map(o => ({
      ...o,
      priceText: (function () {
  // XS_PRICE_TEXT_PUBLIC_V1: ensure non-empty label in public mode
  const raw = (o && typeof o.priceEur === "number" && Number.isFinite(o.priceEur)) ? (o.priceEur.toFixed(2) + " €") : "";
  const s = (raw == null) ? "" : String(raw).trim();
  if (s) return s;
  // If we have eur, show it, otherwise explicit label
  const e = (typeof eur !== "undefined") ? eur : (typeof item !== "undefined" ? item?.eur : undefined);
  return (typeof e === "number" && Number.isFinite(e)) ? ((xsSafeToFixed(e, 2) ?? String(e)) + " €") : "Prix indisponible (public)";
})(),
    }));

    const meta = {
      fetchedAt: new Date().toISOString(),
      count: offers.length,
      note: "XS_SCOUT_PLAYER2_ENDPOINT_V1 (public allowUnknownPrices)",
    };
/* XS_PLAYER2_FALLBACK_NOQ_V1_BEGIN */
if (!offers || offers.length === 0) {
  const targetSlug = String((req && req.params && req.params.slug) || "");
  if (targetSlug) {
    try {
      const r = await fetch(`${BASE_URL}/scout/cards?first=200&allowUnknownPrices=1`);
      const j = await r.json();
      if (Array.isArray(j?.items)) {
        offers = j.items.filter(o => o?.playerSlug === targetSlug);
      }
    } catch (e) {}
  }
}
/* XS_PLAYER2_FALLBACK_NOQ_V1_END */
return res.json({
      player: {
        playerSlug: p?.playerSlug || slug,
        playerName: p?.playerName || p?.displayName || slug,
        position: p?.position || null,
        activeClub: p?.activeClub || null,
      },
      offers,
      meta,
    });
  } catch (e) {
    return res.status(500).json({ error: "scout/player2 failed", message: String(e?.message || e) });
  }
});
// XS_SCOUT_PLAYER2_ENDPOINT_V1_END

/* ===== XS_DEBUG_OFFER_SHAPE_V1_BEGIN =====
   Debug: inspect raw offer shape coming from Sorare (public)
======================================== */
app.get("/debug/offer-shape", async (req, res) => {
  try {
    // Try to reuse whatever function exists for fetching offers.
    // We don’t assume names; we just call /scout/cards and return the raw-ish fields we already have access to.
    const base = req.protocol + "://" + req.get("host");
    const r = await fetch(`${base}/scout/cards?first=3`, { headers: { accept: "application/json" } });
    const j = await r.json().catch(() => ({}));
    const it = Array.isArray(j?.items) ? j.items[0] : null;

    // return only what matters for pricing visibility
/* XS_PUBLIC_USER_CARDS_HEADERS_SENT_GUARD_V1_BEGIN
   - But: éviter double réponse (ERR_HTTP_HEADERS_SENT)
   - Si une réponse a déjà été envoyée, on sort proprement
   XS_PUBLIC_USER_CARDS_HEADERS_SENT_GUARD_V1_END */
if (res.headersSent) {
  return;
}
res.json({
      ok: true,
      sampleItemKeys: it ? Object.keys(it) : [],
      sampleItem: it || null,
      note: "If sampleItem has no eur/wei/eth, public mode doesn't expose price in our pipeline."
    });
  } catch (e) {
  if (res.headersSent) {
    return;
  }
  res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});
/* ===== XS_DEBUG_OFFER_SHAPE_V1_END ===== */
/* XS_PUBLIC_USER_CARDS_PAGE2_V1 (BEGIN)
 * XS_ADD_PUBLIC_USER_CARDS_PAGE2_V1
 * Endpoint SAFE (public) basé sur champs VALIDÉS sur AnyCardInterface:
 * - id, slug, rarityTyped, seasonYear, pictureUrl
 * - pageInfo { hasNextPage endCursor }
 * Usage:
 *   /public-user-cards-page2?identifier=darkflow&first=10&after=<cursor?>
 */
app.get("/public-user-cards-page2", async (req, res) => {
  try {
    const identifier = String(req.query.identifier || "").trim();
    const firstRaw = parseInt(String(req.query.first || "10"), 10);
    const safeFirst = Number.isFinite(firstRaw) ? Math.max(1, Math.min(50, firstRaw)) : 10;
    const after = req.query.after ? String(req.query.after) : null;

    if (!identifier) return res.status(400).json({ ok: false, error: "missing identifier" });

    // XS_PUBLIC_USER_CARDS_PAGE2_PROXY_V2:
    // - Réutilise /public-user-cards-page (déjà riche)
    // - Wrappe le résultat au format { ok, user, cards, pageInfo, meta }
    const qs = new URLSearchParams();
    qs.set("identifier", identifier);
    qs.set("first", String(safeFirst));
    if (after) qs.set("after", after);

    // XS_PAGE2_FORCE_ENRICH_DEFAULT_V1:
    // page2 doit renvoyer une shape "riche" par défaut.
    // Si le client passe enrich=0 explicitement, on respecte (propagation plus bas).
    if (!Object.prototype.hasOwnProperty.call((req.query || {}), "enrich")) {
      qs.set("enrich", "1");
    }

    // Propager flags simples (sans casser)
    for (const [k, v] of Object.entries(req.query || {})) {
      if (k === "identifier" || k === "first" || k === "after") continue;
      if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
        qs.set(k, String(v));
      }
    }

    const base = "http://127.0.0.1:" + String(PORT);
    const url = base + "/public-user-cards-page?" + qs.toString();

    const r = await fetch(url, { method: "GET" });
    const json = await r.json().catch(() => null);

    if (!r.ok || !json) {
      return res.status(502).json({
        ok: false,
        error: "page2 proxy failed",
        upstreamStatus: r.status,
        upstream: json,
      });
    }

    const cards = Array.isArray(json.cards) ? json.cards : [];
    const pageInfo = json.pageInfo || { hasNextPage: false, endCursor: null };

    return res.json({
      ok: true,
      user: {
        slug: json.slug || identifier,
        nickname: json.nickname || json.slug || identifier,
      },
      cards,
      pageInfo,
      meta: { source: "page1-proxy", first: safeFirst, after: after },
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e && e.message ? e.message : e) });
  }
});
/* XS_PUBLIC_USER_CARDS_PAGE2_V1 (END) */
/* ===========================
   XS_MY_CARDS_CACHE_V1
   Objectif:
   - Fournir /my-cards/status, /my-cards/list, /my-cards/sync
   - Sync = 1 seul appel à /public-user-cards-page (first=200) => moins de 429
   - Stockage disque par identifier (cache local)
   NOTE: V1 sans pagination multi-pages (safe). V2 possible ensuite.
   =========================== */
try {
  const xsFs = require("fs");
  const xsPath = require("path");

  const XS_MY_CARDS_DIR = xsPath.join(__dirname, "_data", "my_cards_cache");
  if (!xsFs.existsSync(XS_MY_CARDS_DIR)) xsFs.mkdirSync(XS_MY_CARDS_DIR, { recursive: true });

  function xsSafeName(s) {
    return String(s || "")
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/[^a-z0-9._-]+/g, "_")
      .slice(0, 80) || "unknown";
  }

  function xsCacheFile(identifier) {
    return xsPath.join(XS_MY_CARDS_DIR, `my_cards_${xsSafeName(identifier)}.json`);
  }

  function xsReadCache(identifier) {
    const fp = xsCacheFile(identifier);
    if (!xsFs.existsSync(fp)) return null;
    try {
      const raw = xsFs.readFileSync(fp, "utf8");
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function xsWriteCache(identifier, payload) {
    const fp = xsCacheFile(identifier);
    const tmp = fp + ".tmp";
    const body = JSON.stringify(payload, null, 2);
    xsFs.writeFileSync(tmp, body, "utf8");
    xsFs.renameSync(tmp, fp);
    return fp;
  }

  function xsReqId(req) {
    return (req.query && (req.query.identifier || req.query.slug || req.query.user)) || "";
  }

  app.get("/my-cards/status-old", (req, res) => {
    const identifier = xsReqId(req);
    if (!identifier) return res.status(400).json({ error: "identifier required" });

    const c = xsReadCache(identifier);
    if (!c) return res.json({ updatedAtISO: null, count: 0, cache: false });

    const cards = Array.isArray(c.cards) ? c.cards : [];
    return res.json({
      updatedAtISO: c.updatedAtISO || null,
      count: typeof c.count === "number" ? c.count : cards.length,
      cache: true,
    });
  });

  app.get("/my-cards/list", (req, res) => {
    const identifier = xsReqId(req);
    if (!identifier) return res.status(400).json({ error: "identifier required" });

    const c = xsReadCache(identifier);
    if (!c) return res.json({ cards: [], cache: false });

    const cards = Array.isArray(c.cards) ? c.cards : [];
    return res.json({ cards, cache: true, updatedAtISO: c.updatedAtISO || null, count: cards.length });
  });

  app.post("/my-cards/sync-old", async (req, res) => {
    const identifier = xsReqId(req);
    if (!identifier) return res.status(400).json({ error: "identifier required" });

    // 1 seul appel => réduit la pression / 429
    const host = req.get("host");
    const proto = (req.headers["x-forwarded-proto"] || req.protocol || "http");
    const url =
      `${proto}://${host}/public-user-cards-page` +
      `?identifier=${encodeURIComponent(identifier)}` +
      `&first=200&hideCommon=0&rawDump=0&debug=0`;

    try {
      const r = await fetch(url, { method: "GET", headers: { accept: "application/json" } });

      if (r.status === 429) {
        const ra = r.headers.get("retry-after");
        res.setHeader("X-XS-MYCARDS-RETRYAFTER", ra || "");
        return res.status(429).json({ error: "upstream 429", retryAfter: ra || null });
      }

      if (!r.ok) {
        const t = await r.text().catch(() => "");
        return res.status(502).json({ error: "upstream error", status: r.status, body: t.slice(0, 500) });
      }

      const j = await r.json();

      // On stocke ce que le front attend: tableau cards
      const cards = Array.isArray(j.cards) ? j.cards : [];
      const payload = {
        identifier,
        updatedAtISO: new Date().toISOString(),
        count: cards.length,
        cards,
        meta: { source: "public-user-cards-page", first: 200 },
      };

      const fp = xsWriteCache(identifier, payload);
      return res.json({ ok: true, updatedAtISO: payload.updatedAtISO, count: payload.count, cacheFile: fp });
    } catch (e) {
      return res.status(500).json({ error: String(e && e.message ? e.message : e) });
    }
  });
} catch (e) {
  // ne jamais casser le boot serveur si un require/fs échoue
  console.warn("[XS_MY_CARDS_CACHE_V1] init failed:", e && e.message ? e.message : e);
}
/* ===========================
   END XS_MY_CARDS_CACHE_V1
   =========================== */



/* XS_MODEL2_MY_CARDS_CACHE_SYNC_V1_BEGIN
   MODELE 2 (OAuth par utilisateur):
   - POST /my-cards/sync?deviceId=...    => télécharge toutes les cartes (auth) + cache disque
   - GET  /my-cards?deviceId=...         => sert depuis cache (pagination locale)
   - GET  /my-cards/status?deviceId=...  => meta cache
   Objectif: onglet "Mes cartes" = 100% backend cache, zéro 429 côté app.
   Safe: bloc isolé, noms xsMc* uniques, try/catch, headers debug.
*/
try {
  const xsMcFsV1 = require("fs");
  const xsMcPathV1 = require("path");

  const xsMcDataDirV1 = (() => {
    // On privilégie BACK/data si possible, sinon process.cwd()/data
    try { return xsMcPathV1.join(process.cwd(), "data"); } catch(e) {}
    try { return xsMcPathV1.join(__dirname, "data"); } catch(e2) {}
    return "data";
  })();

  const xsMcCacheDirV1 = (() => {
    const p = xsMcPathV1.join(xsMcDataDirV1, "my_cards_cache");
    try { xsMcFsV1.mkdirSync(p, { recursive: true }); } catch(e) {}
    return p;
  })();

  function xsMcJsonReadSafeV1(p) {
    try {
      if (!p) return null;
      if (!xsMcFsV1.existsSync(p)) return null;
      const raw = xsMcFsV1.readFileSync(p, "utf8");
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) { return null; }
  }

  function xsMcJsonWriteSafeV1(p, obj) {
    try {
      xsMcFsV1.mkdirSync(xsMcPathV1.dirname(p), { recursive: true });
      xsMcFsV1.writeFileSync(p, JSON.stringify(obj, null, 2), "utf8");
      return true;
    } catch (e) { return false; }
  }

  function xsMcCachePathV1(deviceId) {
    const safe = String(deviceId || "").replace(/[^a-zA-Z0-9_\-]/g, "_");
    return xsMcPathV1.join(xsMcCacheDirV1, `my_cards_${safe}.json`);
  }

  function xsMcCursorEncodeV1(i) {
    try { return Buffer.from(String(i), "utf8").toString("base64"); } catch(e) { return ""; }
  }
  function xsMcCursorDecodeV1(c) {
    try {
      if (!c) return 0;
      const s = Buffer.from(String(c), "base64").toString("utf8");
      const n = Number(s);
      return Number.isFinite(n) ? n : 0;
    } catch(e) { return 0; }
  }

  function xsMcPaginateArrayV1(items, first, after) {
    const start = Math.max(0, xsMcCursorDecodeV1(after || ""));
    const take = Math.max(1, Math.min(200, Number(first || 50)));
    const slice = items.slice(start, start + take);
    const end = start + slice.length;
    return {
      nodes: slice,
      pageInfo: {
        hasNextPage: end < items.length,
        endCursor: end < items.length ? xsMcCursorEncodeV1(end) : null
      }
    };
  }

  // ---- Token lookup (heuristique) ----
  function xsMcFindOAuthTokenV1(deviceId) {
    const id = String(deviceId || "");
    if (!id) return null;

    const candidates = [
      xsMcPathV1.join(xsMcDataDirV1, "device_tokens.json"),
      xsMcPathV1.join(xsMcDataDirV1, "device_oauth_tokens.json"),
      xsMcPathV1.join(xsMcDataDirV1, "oauth_devices.json"),
      xsMcPathV1.join(__dirname, "data", "device_tokens.json"),
      xsMcPathV1.join(__dirname, "data", "device_oauth_tokens.json"),
      xsMcPathV1.join(__dirname, "data", "oauth_devices.json"),
    ];

    for (const p of candidates) {
      const j = xsMcJsonReadSafeV1(p);
      if (!j) continue;

      // shapes possibles:
      // - { "<deviceId>": { access_token, refresh_token, ... } }
      // - { devices: { "<deviceId>": {...} } }
      // - { tokens: { "<deviceId>": {...} } }
      let tok = null;
      try { if (j[id]) tok = j[id]; } catch(e) {}
      try { if (!tok && j.devices && j.devices[id]) tok = j.devices[id]; } catch(e) {}
      try { if (!tok && j.tokens && j.tokens[id]) tok = j.tokens[id]; } catch(e) {}

      if (tok) {
        const access = tok.access_token || tok.accessToken || tok.token || null;
        const refresh = tok.refresh_token || tok.refreshToken || null;
        if (access) return { access_token: access, refresh_token: refresh, _path: p };
      }
    }
    return null;
  }

  async function xsMcGraphQLV1(accessToken, query, variables, jwtAud){
    // XS_MYCARDS_GQL_JWT_HEADERS_V1 — stable GraphQL call for my-cards sync
    const t = (accessToken || '').toString().trim();
    if(!t) { const e = new Error('missing_token'); e.status = 401; e.body = 'missing_token'; throw e; }
    const aud = (jwtAud || process.env.SORARE_JWT_AUD || 'sorare:com').toString().trim();
    const body = JSON.stringify({ query, variables: variables || {} });
    const headers = {
      'content-type': 'application/json',
      'authorization': 'Bearer ' + t,
      'JWT-AUD': aud
    };
    const r = await fetch('https://api.sorare.com/graphql', { method:'POST', headers, body });
    const text = await r.text().catch(()=> '');
    if(!r.ok){
      const e = new Error('gql_http_' + r.status);
      e.status = r.status;
      e.body = text;
      throw e;
    }
    try { return text ? JSON.parse(text) : {}; }
    catch(e){
      const err = new Error('gql_json_parse_failed');
      err.status = 502;
      err.body = text;
      throw err;
    }
  }

  // ---- Normalisation minimaliste (on réutilise tes champs existants) ----
  function xsMcNormalizeCardV1(n) {
    const slug = String(n && n.slug ? n.slug : "");
    let serialNumber = (n && typeof n.serialNumber === "number") ? n.serialNumber : null;
    if (serialNumber === null) {
      try { const m = slug.match(/-(\d+)$/); if (m && m[1]) serialNumber = Number(m[1]); } catch(e) {}
    }

  /* XS_MYCARDS_FILTER_RARITY_V1_BEGIN */
  function xsMcKeepRarityV1(card){
    try{
      const r = String((card && (card.rarityTyped || card.rarity)) || "").toLowerCase().trim();
      return (r === "limited" || r === "rare" || r === "super_rare" || r === "unique");
    } catch(e){
      return false;
    }
  }
  /* XS_MYCARDS_FILTER_RARITY_V1_END */    const rarity = (n && n.rarity) ? String(n.rarity) : (n && n.rarityTyped ? String(n.rarityTyped) : null);
    const seasonYear = (n && (n.seasonYear || (n.season && n.season.year))) ? Number(n.seasonYear || (n.season && n.season.year)) : null;
    const season = (n && n.season) ? n.season : (seasonYear ? { year: seasonYear } : null);

    return {
      ...n,
      slug,
      serialNumber: (serialNumber !== null && !Number.isNaN(serialNumber)) ? serialNumber : null,
      rarity,
      season,
      seasonYear: seasonYear || null,
    };
  }

  // ============================
  // GET /my-cards/status
  // ============================
  app.get("/my-cards/status", async (req, res) => {
    try { res.setHeader("X-XS-MYCARDS-V1", "1"); } catch(e) {}
    const deviceId = String(req.query.deviceId || "");
    if (!deviceId) return res.status(400).json({ ok:false, error:"missing deviceId" });

    const p = xsMcCachePathV1(deviceId);
    const j = xsMcJsonReadSafeV1(p);
    if (!j) return res.json({ ok:true, cached:false, cachePath:p });

    const count = Array.isArray(j.cards) ? j.cards.length : 0;
    return res.json({
      ok:true,
      cached:true,
      cachePath:p,
      meta: j.meta || null,
      count
    });
  });

  // ============================
  // GET /my-cards  (serve from cache)
  // ============================
  app.get("/my-cards", async (req, res) => {
    try { res.setHeader("X-XS-MYCARDS-V1", "1"); } catch(e) {}
    const deviceId = String(req.query.deviceId || "");
    if (!deviceId) return res.status(400).json({ ok:false, error:"missing deviceId" });

    const first = Number(req.query.first || 50);
    const after = String(req.query.after || "");

    const p = xsMcCachePathV1(deviceId);
    const j = xsMcJsonReadSafeV1(p);
    if (!j || !Array.isArray(j.cards)) {
      return res.status(404).json({ ok:false, cached:false, error:"cache_not_found", hint:"Call POST /my-cards/sync?deviceId=... first", cachePath:p });
    }

    const conn = xsMcPaginateArrayV1(j.cards, first, after);
    return res.json({
      ok:true,
      cached:true,
      meta: j.meta || null,
      cards: conn.nodes,
      pageInfo: conn.pageInfo,
    });
  });

  // ============================
  /* XS_MYCARDS_SYNC_JWT_FALLBACK_V1_BEGIN */
  async function xsMcFindAnyTokenV1(deviceId){
    // 1) Try OAuth token (Model2)
    try {
      if (typeof xsMcFindOAuthTokenMaybeBridgeV1 === "function") {
        const t = await xsMcFindOAuthTokenMaybeBridgeV1(deviceId);
        if (t && t.access_token) return { access_token: t.access_token, refresh_token: t.refresh_token || null, kind:"oauth" };
      }
    } catch(e) {}

    // 2) Fallback: JWT token store (deviceId -> {access_token}) + aud from jwt_devices.json
    try {
      if (typeof xsJwtTokDbReadV3 === "function") {
        const db = xsJwtTokDbReadV3() || {};
        const rec = db && db[deviceId] ? db[deviceId] : null;
        const tok = rec && (rec.access_token || rec.accessToken) ? (rec.access_token || rec.accessToken) : null;

        let aud = null;
        try {
          if (typeof xsJwtDbRead === "function") {
            const jdb = xsJwtDbRead() || {};
            const jrec = jdb && jdb[deviceId] ? jdb[deviceId] : null;
            aud = jrec && jrec.aud ? String(jrec.aud) : null;
          }
        } catch(e2) {}

        if (tok) return { access_token: tok, kind:"jwt", jwtAud: aud };
      }
      if (typeof xsJwtTokDbReadV2 === "function") {
        const db = xsJwtTokDbReadV2() || {};
        const rec = db && db[deviceId] ? db[deviceId] : null;
        const tok = rec && (rec.access_token || rec.accessToken) ? (rec.access_token || rec.accessToken) : null;

        let aud = null;
        try {
          if (typeof xsJwtDbRead === "function") {
            const jdb = xsJwtDbRead() || {};
            const jrec = jdb && jdb[deviceId] ? jdb[deviceId] : null;
            aud = jrec && jrec.aud ? String(jrec.aud) : null;
          }
        } catch(e2) {}

        if (tok) return { access_token: tok, kind:"jwt", jwtAud: aud };
      }
    } catch(e) {}

    return null;
  }
  /* XS_MYCARDS_SYNC_JWT_FALLBACK_V1_END */
  // POST /my-cards/sync  (download + write cache)
  // ============================
  app.post("/my-cards/sync", async (req, res) => {
    try { res.setHeader("X-XS-MYCARDS-V1", "1"); } catch(e) {}
    const deviceId = String(req.query.deviceId || "");
    if (!deviceId) return res.status(400).json({ ok:false, error:"missing deviceId" });

    const first = Math.max(10, Math.min(100, Number(req.query.first || 50)));
    const maxPages = Math.max(1, Math.min(200, Number(req.query.maxPages || 60)));
    const maxCards = Math.max(100, Math.min(20000, Number(req.query.maxCards || 6000)));

    const tok = await xsMcFindAnyTokenV1(deviceId);
    /* XS_MYCARDS_SYNC_JWTAUD_QUERY_V1_BEGIN */
    // Fallback: allow passing jwtAud via querystring (useful when JWT store lacks aud).
    const xsMcJwtAudFromQueryV1 = String(req.query.jwtAud || "").trim();
    // Prefer token-provided aud; fallback to querystring if present.
    const xsMcJwtAudEffectiveV1 = (tok && tok.jwtAud) ? String(tok.jwtAud) : (xsMcJwtAudFromQueryV1 ? xsMcJwtAudFromQueryV1 : null);
    /* XS_MYCARDS_SYNC_JWTAUD_QUERY_V1_END */
    if (!tok || !tok.access_token) {
      return res.status(401).json({
        ok:false,
        error:"token_not_found",
        hint:"No token for this deviceId. If OAuth is disabled (410), use /auth/jwt/login then retry. If OAuth is enabled, relink device.",
      });
    }

    // Query currentUser cards (shape classique)
    const Q = `
      query XSMyCardsV1($first: Int!, $after: String) {
        currentUser {
          slug
          nickname
          cards(first: $first, after: $after) {
            /* XS_MYCARDS_QUERY_ANYCARD_FRAGMENT_V1_BEGIN */
 nodes {
              ... on Card {
                slug
                pictureUrl
                rarityTyped
                seasonYear
                serialNumber
                anyPositions
                anyTeam { name slug }
                anyPlayer { displayName slug }
                player { displayName slug activeClub { name slug } anyPositions }
              }
            }
            /* XS_MYCARDS_QUERY_ANYCARD_FRAGMENT_V1_END */
            }
            pageInfo { hasNextPage endCursor }
          }
        }
      }
    `;

    const all = [];
    let after = null;
    let page = 0;
    let meSlug = null;
let meNick = null;
/* XS_MYCARDS_GQLDEBUG_SCOPE_V1_BEGIN */
let xsMcGqlSnippetV1 = null;
let xsMcGqlHasCurrentUserV1 = null;
let xsMcGqlErrorsV1 = null;
/* XS_MYCARDS_GQLDEBUG_SCOPE_V1_END */

    while (page < maxPages && all.length < maxCards) {
      page++;
      /* XS_MYCARDS_SYNC_GQL_ERRBODY_V1_BEGIN */
      // If Sorare returns HTTP 422/401/etc, expose body only when ?debug=1 (never leak token).
      const xsMcDebugV1 = String(req.query.debug || "").trim();
      let json = null;
      try {
        json = await xsMcGraphQLV1(tok.access_token, Q, { first, after }, (typeof xsMcJwtAudEffectiveV1 !== "undefined" ? xsMcJwtAudEffectiveV1 : (tok.jwtAud || null)));
      } catch (e) {
        const status = (e && e.status) ? Number(e.status) : null;
        const body = (e && e.body) ? String(e.body) : String(e && e.message ? e.message : e);
        const snippet = body.length > 1600 ? (body.slice(0,1600) + "...<snip>...") : body;
        try { res.setHeader("X-XS-MYCARDS-GQLSTATUS", String(status || "")); } catch(_) {}
        if (xsMcDebugV1 === "1" || xsMcDebugV1.toLowerCase() === "true") {
          return res.status(502).json({ ok:false, error:"sorare_graphql_error", status, jwtAudUsed: (typeof xsMcJwtAudEffectiveV1 !== "undefined" ? xsMcJwtAudEffectiveV1 : (tok && tok.jwtAud ? String(tok.jwtAud) : null)), tokenKind: (tok && tok.kind ? String(tok.kind) : null), bodySnippet: snippet });
        }
        return res.status(502).json({ ok:false, error:"sorare_graphql_error", status, hint:"Retry with &debug=1 to see bodySnippet" });
      }
      /* XS_MYCARDS_SYNC_GQL_ERRBODY_V1_END */
      /* XS_MYCARDS_DEBUG_GQLDATA_SNIPPET_V1_BEGIN */
      // When debug=1, attach a safe snippet of GraphQL response shape (no tokens).
      const xsMcDebugDataV1 = String(req.query.debugData || req.query.debug || "").trim();
      let xsMcGqlSnippetV1 = null;
      let xsMcGqlHasCurrentUserV1 = null;
      try {
        xsMcGqlHasCurrentUserV1 = !!(json && json.data && json.data.currentUser);
        const safeObj = {
          hasData: !!(json && json.data),
          hasCurrentUser: xsMcGqlHasCurrentUserV1,
          topKeys: json && json.data ? Object.keys(json.data) : null,
          currentUserKeys: (json && json.data && json.data.currentUser) ? Object.keys(json.data.currentUser) : null,
          // include small samples if present
          pageInfo: (json && json.data && json.data.currentUser && json.data.currentUser.cards && json.data.currentUser.cards.pageInfo) ? json.data.currentUser.cards.pageInfo : null,
          nodesLen: (json && json.data && json.data.currentUser && json.data.currentUser.cards && Array.isArray(json.data.currentUser.cards.nodes)) ? json.data.currentUser.cards.nodes.length : null
        };
        xsMcGqlErrorsV1 = (json && json.errors && Array.isArray(json.errors)) ? json.errors.map(e=> (e && e.message) ? String(e.message) : null).filter(Boolean).slice(0,5) : null;
const s = JSON.stringify({ data: safeObj, errors: json && json.errors ? json.errors : null });
        xsMcGqlSnippetV1 = s.length > 2200 ? (s.slice(0,2200) + "...<snip>...") : s;
      } catch (e) {
        xsMcGqlSnippetV1 = "<snippet_error>";
      }
      /* XS_MYCARDS_DEBUG_GQLDATA_SNIPPET_V1_END */
      const data = json && json.data ? json.data : null;
      const cu = data && data.currentUser ? data.currentUser : null;
      if (!cu) break;

      meSlug = meSlug || cu.slug || null;
      meNick = meNick || cu.nickname || null;

      const conn = cu.cards || null;
      const nodes = conn && Array.isArray(conn.nodes) ? conn.nodes : [];
      for (const n of nodes) {
              /* XS_MYCARDS_FILTER_APPLY_V1_BEGIN */
      const _c = xsMcNormalizeCardV1(n);
      if (xsMcKeepRarityV1(_c)) all.push(_c);
      /* XS_MYCARDS_FILTER_APPLY_V1_END */
        if (all.length >= maxCards) break;
      }

      const pi = conn && conn.pageInfo ? conn.pageInfo : null;
      const hasNext = !!(pi && pi.hasNextPage);
      after = (pi && pi.endCursor) ? pi.endCursor : null;
      if (!hasNext) break;
      if (!after) break;
    }

    const nowIso = new Date().toISOString();
    const payload = {
      meta: {
        model: "oauth_device_model2",
        deviceId,
        userSlug: meSlug || null,
        nickname: meNick || null,
        fetchedAt: nowIso,
        count: all.length,
        pages: page,
        tokenSourcePath: tok._path || null,
            /* XS_MYCARDS_DEBUG_GQLDATA_SNIPPET_V1_META */
            gqlDebug: (((String(req.query.debugData || req.query.debug || "").trim() === "1") || (String(req.query.debugData || req.query.debug || "").trim().toLowerCase() === "true")) ? { snippet: (typeof xsMcGqlSnippetV1 !== "undefined" ? xsMcGqlSnippetV1 : null), hasCurrentUser: (typeof xsMcGqlHasCurrentUserV1 !== "undefined" ? xsMcGqlHasCurrentUserV1 : null) } : null),
      },
      cards: all
    };

    const p = xsMcCachePathV1(deviceId);
    const ok = xsMcJsonWriteSafeV1(p, payload);

    if (!ok) {
      return res.status(500).json({ ok:false, error:"cache_write_failed", cachePath:p, count: all.length });
    }

    return res.json({ ok:true, cachePath:p, meta: payload.meta });
  });

} catch(eTopMcV1) {
  // safe no-op
}
/* XS_MODEL2_MY_CARDS_CACHE_SYNC_V1_END */
/* XS_DEBUG_ENVHARD_ENDPOINT_V3
   Proof endpoint: shows which .env xsEnvHard reads + parsing diagnostics, without leaking secrets. */
try {
  app.get("/debug/envhard", (req, res) => {
    try {
      const crypto = require("crypto");

      // warm cache
      const id = (typeof xsEnvHard === "function") ? (xsEnvHard("SORARE_OAUTH_CLIENT_ID") || "") : "";
      const sc = (typeof xsEnvHard === "function") ? (xsEnvHard("SORARE_OAUTH_CLIENT_SECRET") || "") : "";

      const cache = global.__XS_ENVHARD_CACHE_V3 || global.__XS_ENVHARD_CACHE_V2 || global.__XS_ENVHARD_CACHE_V1 || {};
      const envPath = cache.envPath ? String(cache.envPath) : null;
      const diag = cache.diag || {};
      const watch = diag.watch || {};
      const oauthKeys = diag.oauthKeys || [];

      const sha = (s) => {
        try {
          const t = String(s || "");
          if (!t) return "";
          return crypto.createHash("sha256").update(t, "utf8").digest("hex").slice(0, 10);
        } catch (e) { return ""; }
      };

      return res.json({
        ok: true,
        cwd: process.cwd(),
        __dirname,
        envPath,
        env_size: (diag.size ?? null),
        env_zeros: (diag.zeros ?? null),
        env_encoding: (diag.encoding ?? null),

        // key presence + occurrence counts (no values)
        watch,

        // list of parsed keys under prefixes (names only)
        oauthKeys,

        // lengths + sha10 only (still no values)
        id_len: String(id).length,
        secret_len: String(sc).length,
        id_sha10: sha(id),
        secret_sha10: sha(sc),
        note: "No secret values returned. watch shows occurrences + lastLen only."
      });
    } catch (e) {
      return res.status(500).json({ ok: false, error: String(e && e.message ? e.message : e) });
    }
  });
} catch (e) {}
/* end XS_DEBUG_ENVHARD_ENDPOINT_V3 */
/* XS_MODEL2_TOKEN_BRIDGE_V1_BEGIN
   Goal:
   - Prod (api.tonapp.com) receives OAuth callback and writes device tokens in data/oauth_devices.json.
   - Local dev may NOT receive callback; so /my-cards/sync can pull token from prod via a secured bridge.
   Security:
   - Bridge endpoints require header: X-XS-BRIDGE-SECRET == process.env.XS_OAUTH_BRIDGE_SECRET
   Env:
   - XS_OAUTH_BRIDGE_SECRET=... (same on prod + local)
   - SORARE_OAUTH_DEVICE_BRIDGE_URL=https://api.tonapp.com/bridge/oauth-device-token
*/
try {
  const xsBridgeSecret = () => String(process.env.XS_OAUTH_BRIDGE_SECRET || "");
  const xsBridgeOk = (req) => {
    try {
      const want = xsBridgeSecret();
      if (!want) return false;
      const got = String(req.headers["x-xs-bridge-secret"] || "");
      return Boolean(got && want && got === want);
    } catch (e) { return false; }
  };

  function xsHttpJsonPostV1(urlStr, bodyObj, headers) {
    return new Promise((resolve, reject) => {
      try {
        const u = new URL(String(urlStr || ""));
        const isHttps = u.protocol === "https:";
        const lib = isHttps ? require("https") : require("http");
        const payload = Buffer.from(JSON.stringify(bodyObj || {}), "utf8");

        const req = lib.request({
          protocol: u.protocol,
          hostname: u.hostname,
          port: u.port || (isHttps ? 443 : 80),
          path: (u.pathname || "/") + (u.search || ""),
          method: "POST",
          headers: Object.assign({
            "content-type": "application/json",
            "content-length": payload.length,
          }, headers || {}),
          timeout: 15000,
        }, (res) => {
          let data = "";
          res.on("data", (c) => data += c);
          res.on("end", () => {
            const code = res.statusCode || 0;
            try {
              const j = data ? JSON.parse(data) : null;
              resolve({ status: code, json: j, raw: data });
            } catch (e) {
              resolve({ status: code, json: null, raw: data });
            }
          });
        });

        req.on("timeout", () => { try { req.destroy(new Error("timeout")); } catch (e) {} });
        req.on("error", (e) => reject(e));
        req.write(payload);
        req.end();
      } catch (e) { reject(e); }
    });
  }

  // PROD bridge endpoint (must be protected by secret)
  app.post("/bridge/oauth-device-token", async (req, res) => {
    try {
      if (!xsBridgeOk(req)) return res.status(401).json({ ok:false, error:"unauthorized_bridge" });
      const deviceId = String((req.body && req.body.deviceId) ? req.body.deviceId : "");
      if (!deviceId) return res.status(400).json({ ok:false, error:"missing_deviceId" });

      const devices = (typeof xsDevOauth_readJson === "function") ? xsDevOauth_readJson(xsDevOauth_DEVICES_FILE, {}) : {};
      const rec = devices && devices[deviceId] ? devices[deviceId] : null;
      if (!rec) return res.status(404).json({ ok:false, error:"not_found" });

      return res.json({ ok:true, deviceId, token: rec });
    } catch (e) {
      return res.status(500).json({ ok:false, error:String(e && e.message ? e.message : e) });
    }
  });

  async function xsMcPullTokenFromBridgeV1(deviceId) {
    try {
      const base = String(process.env.SORARE_OAUTH_DEVICE_BRIDGE_URL || "");
      const secret = xsBridgeSecret();
      if (!base || !secret) return null;

      const r = await xsHttpJsonPostV1(base, { deviceId }, { "x-xs-bridge-secret": secret });
      if (!r || r.status !== 200) return null;
      const tok = r.json && r.json.ok && r.json.token ? r.json.token : null;
      if (!tok) return null;

      // Persist locally to oauth_devices.json for reuse
      try {
        const devices = (typeof xsDevOauth_readJson === "function") ? xsDevOauth_readJson(xsDevOauth_DEVICES_FILE, {}) : {};
        devices[deviceId] = tok;
        if (typeof xsDevOauth_writeJson === "function") xsDevOauth_writeJson(xsDevOauth_DEVICES_FILE, devices);
      } catch (e) {}

      return tok;
    } catch (e) {
      return null;
    }
  }

  async function xsMcFindOAuthTokenMaybeBridgeV1(deviceId) {
    const localTok = (typeof xsMcFindOAuthTokenV1 === "function") ? xsMcFindOAuthTokenV1(deviceId) : null;
    if (localTok && localTok.access_token) return localTok;

    const pulled = await xsMcPullTokenFromBridgeV1(deviceId);
    if (!pulled) return null;

    const access = pulled.access_token || pulled.accessToken || pulled.token || null;
    const refresh = pulled.refresh_token || pulled.refreshToken || null;
    if (!access) return null;

    return { access_token: access, refresh_token: refresh, _path: xsDevOauth_DEVICES_FILE, _bridge: true };
  }
} catch(eXsBridge) {}
/* XS_MODEL2_TOKEN_BRIDGE_V1_END */
/* ============================
   XS_JWT_AUTH_ENDPOINTS_V1_BEGIN
   Objectif:
   - POST /auth/jwt/login (email+password -> salt -> bcrypt -> signIn -> store jwt)
   - GET  /auth/jwt/status?deviceId=...
   - GET  /auth/jwt/logout?deviceId=...
   Notes:
   - Token jamais renvoyé au client
   - Stockage disque data/jwt_devices.json (deviceId -> {aud, ts})
   ============================ */

const xsJwtDbPath = require("path").join(__dirname, "data", "jwt_devices.json");
function xsJwtDbRead(){
  try{
    const fs = require("fs");
    if(!fs.existsSync(xsJwtDbPath)) return {};
    const raw = fs.readFileSync(xsJwtDbPath, "utf8");
    return raw ? JSON.parse(raw) : {};
  } catch(e){ return {}; }
}
function xsJwtDbWrite(obj){
  const fs = require("fs");
  const dir = require("path").dirname(xsJwtDbPath);
  if(!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive:true });
  fs.writeFileSync(xsJwtDbPath, JSON.stringify(obj, null, 2), "utf8");
}

/* XS_JWT_TOKEN_STORE_V3_BEGIN
   Stockage backend-only: data/jwt_device_tokens.json
*/
const xsJwtTokDbPathV3 = require("path").join(__dirname, "data", "jwt_device_tokens.json");
function xsJwtTokDbReadV3(){
  try{
    const fs = require("fs");
    if(!fs.existsSync(xsJwtTokDbPathV3)) return {};
    const raw = fs.readFileSync(xsJwtTokDbPathV3, "utf8");
    return raw ? JSON.parse(raw) : {};
  } catch(e){ return {}; }
}
function xsJwtTokDbWriteV3(obj){
  const fs = require("fs");
  const dir = require("path").dirname(xsJwtTokDbPathV3);
  if(!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive:true });
  fs.writeFileSync(xsJwtTokDbPathV3, JSON.stringify(obj, null, 2), "utf8");
}
/* XS_JWT_TOKEN_STORE_V3_END */


/* XS_JWT_TOKEN_STORE_V2_BEGIN
   Stockage backend-only: data/jwt_device_tokens.json
   - Contient access_token JWT (jamais renvoyé au client)
   - Utilisé par /me-jwt et plus tard /my-cards sync via JWT
*/
const xsJwtTokDbPathV2 = require("path").join(__dirname, "data", "jwt_device_tokens.json");
function xsJwtTokDbReadV2(){
  try{
    const fs = require("fs");
    if(!fs.existsSync(xsJwtTokDbPathV2)) return {};
    const raw = fs.readFileSync(xsJwtTokDbPathV2, "utf8");
    return raw ? JSON.parse(raw) : {};
  } catch(e){ return {}; }
}
function xsJwtTokDbWriteV2(obj){
  const fs = require("fs");
  const dir = require("path").dirname(xsJwtTokDbPathV2);
  if(!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive:true });
  fs.writeFileSync(xsJwtTokDbPathV2, JSON.stringify(obj, null, 2), "utf8");
}
/* XS_JWT_TOKEN_STORE_V2_END */


async function xsSorareSalt(email){
  const url = "https://api.sorare.com/api/v1/users/" + encodeURIComponent(email);
  const r = await fetch(url, { method:"GET" });
  if(!r.ok){
    const t = await r.text().catch(()=> "");
    throw new Error("salt_http_" + r.status + ":" + t.slice(0,160));
  }
  const j = await r.json();
  const salt = j && (j.salt || (j.user && j.user.salt));
  if(!salt) throw new Error("salt_missing");
  return salt;
}

async function xsSorareSignInJwt(email, passwordPlain, aud){
  const bcrypt = require("bcryptjs");
  const salt = await xsSorareSalt(email);
  const hashed = bcrypt.hashSync(passwordPlain, salt);

  const query = `
    mutation xsSignIn($email:String!, $password:String!, $aud:String!){
      signIn(input:{email:$email, password:$password}){
        jwtToken(aud:$aud){
          token

        }
        errors{
          message
        }
        currentUser{
          slug
          nickname
        }
      }
    }`;

  /* XS_JWT_FETCH_DIRECT_V1: sorareGraphQL bypassed to avoid signature mismatch */
  const r = await fetch("https://api.sorare.com/graphql", {
    method:"POST",
    headers:{ "content-type":"application/json" },
    body: JSON.stringify({ query, variables:{ email, password: hashed, aud }})
  });
  const j = await r.json();
  return j; /* XS_JWT_SIGNIN_SHAPE_V2 */
}

app.post("/auth/jwt/login", async (req,res)=>{
  try{
    const body = req.body || {};
    const deviceId = (body.deviceId || "").toString().trim();
    const email = (body.email || "").toString().trim();
    const password = (body.password || "").toString();

    const aud = ((body.aud || process.env.SORARE_JWT_AUD || "sorare:com") + "").toString().trim();

    if(!deviceId) return res.status(400).json({ ok:false, error:"missing_deviceId" });
    if(!email) return res.status(400).json({ ok:false, error:"missing_email" });
    if(!password) return res.status(400).json({ ok:false, error:"missing_password" });

        const raw = await xsSorareSignInJwt(email, password, aud);

    // ============================
    // XS_JWT_SIGNIN_SHAPE_V2
    // - Tolère raw.data.signIn ou raw.signIn
    // - Remonte erreurs GraphQL (raw.errors)
    // - Dump safe dans _logs (token redacted)
    // ============================
    let d = raw && raw.data ? raw.data : raw;
    const out = d && d.signIn ? d.signIn : null;

    const gqlErrors = (raw && raw.errors && Array.isArray(raw.errors)) ? raw.errors : null;

    function xsRedactJwtToken(obj){
      try{
        if(!obj || typeof obj !== "object") return obj;
        const clone = JSON.parse(JSON.stringify(obj));
        const s1 = clone && clone.data && clone.data.signIn && clone.data.signIn.jwtToken && clone.data.signIn.jwtToken.token;
        if(s1) clone.data.signIn.jwtToken.token = "[redacted]";
        const s2 = clone && clone.signIn && clone.signIn.jwtToken && clone.signIn.jwtToken.token;
        if(s2) clone.signIn.jwtToken.token = "[redacted]";
        return clone;
      } catch(e){
        return { note:"redact_failed", message: (e && e.message) ? e.message : String(e) };
      }
    }

    try{
      const fs = require("fs");
      const p = require("path");
      const logDir = p.join(__dirname, "_logs");
      if(!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive:true });
      const f = p.join(logDir, "jwt_signin_debug_" + Date.now() + ".json");
      const payload = {
        ts: Date.now(),
        email: email ? (""+email).slice(0,3) + "***" : null,
        aud,
        hasOut: !!out,
        gqlErrors: gqlErrors ? gqlErrors.map(e=> ({ message: e && e.message })) : null,
        raw: xsRedactJwtToken(raw)
      };
      fs.writeFileSync(f, JSON.stringify(payload, null, 2), "utf8");
    } catch(e){
      // ignore dump errors
    }

    if(!out){
      return res.status(401).json({
        ok:false,
        error:"bad_signin_shape",
        graphqlErrors: gqlErrors ? gqlErrors.map(e=> e && e.message).filter(Boolean).slice(0,3) : null,
        hint:"Voir backend/_logs/jwt_signin_debug_*.json"
      });
    }const errs = out.errors && out.errors.length ? out.errors : null;
    const jwtTok = out.jwtToken && out.jwtToken.token ? out.jwtToken : null;

    if(errs && !jwtTok){
      return res.status(401).json({ ok:false, error:"signin_failed", errors: errs.map(e=>e.message).filter(Boolean).slice(0,3) });
    }
    if(!jwtTok || !jwtTok.token){
      return res.status(401).json({ ok:false, error:"no_jwt_token" });
    }

    // Stockage du token dans le store device déjà existant si dispo (deviceTokens etc.)
    // Sinon fallback: on le met dans le même mécanisme que /me utilise (si présent) via global xsDeviceTokens.
    if(typeof xsDeviceTokens === "object" && xsDeviceTokens){
      xsDeviceTokens[deviceId] = { access_token: jwtTok.token, aud: jwtTok.aud || aud, kind:"jwt", ts: Date.now() };
    }

    // Stockage minimal disque (sans token) pour status/debug (le token reste en mémoire / store existant).
    const db = xsJwtDbRead();
    db[deviceId] = { aud: (jwtTok.aud || aud), ts: Date.now(), kind:"jwt" };
    xsJwtDbWrite(db);

    const user = out.currentUser ? { slug: out.currentUser.slug, nickname: out.currentUser.nickname } : null;
    // XS_JWT_TOKEN_STORE_V2: persist JWT token backend-only (never returned to client)
    try{
      if(jwtTok && jwtTok.token){
        const tdb = xsJwtTokDbReadV2();
        tdb[deviceId] = { access_token: jwtTok.token, aud: (jwtTok.aud || aud), kind:"jwt", ts: Date.now() };
        xsJwtTokDbWriteV2(tdb);
      }
    } catch(e){
      // ignore
    }
    // XS_JWT_TOKEN_STORE_V3: persist JWT token backend-only (never returned to client)
    try{
      if(jwtTok && jwtTok.token){
        const tdb = xsJwtTokDbReadV3();
        tdb[deviceId] = { access_token: jwtTok.token, aud: (jwtTok.aud || aud), kind:"jwt", ts: Date.now() };
        xsJwtTokDbWriteV3(tdb);
      }
    } catch(e){
      // ignore
    }


    return res.json({ ok:true, linked:true, deviceId, aud:(jwtTok.aud||aud), user });
  } catch(e){
    return res.status(500).json({ ok:false, error:"jwt_login_error", message: (e && e.message) ? e.message : String(e) });
  }
});


/* XS_ME_JWT_ENDPOINT_V3_BEGIN */
app.get("/me-jwt", async (req,res)=>{
  try{
    const deviceId = (req.query.deviceId || "").toString().trim();
    if(!deviceId) return res.status(400).json({ ok:false, error:"missing_deviceId" });

    const tdb = xsJwtTokDbReadV3();
    const rec = tdb[deviceId] || null;
    if(!rec || !rec.access_token){
      return res.status(401).json({ ok:false, error:"not_linked_jwt" });
    }

    const aud = (rec.aud || process.env.SORARE_JWT_AUD || "sorare:com").toString().trim();
    const query = "query xsMeJwt { currentUser { slug nickname } }";

    const r = await fetch("https://api.sorare.com/graphql", {
      method:"POST",
      headers:{
        "content-type":"application/json",
        "authorization":"Bearer " + rec.access_token,
        "JWT-AUD": aud
      },
      body: JSON.stringify({ query, variables:{} })
    });

    const json = await r.json().catch(()=> ({}));
    if(!r.ok) return res.status(502).json({ ok:false, error:"sorare_http_"+r.status, body: json });
    if(json && json.errors && Array.isArray(json.errors) && json.errors.length){
      return res.status(401).json({ ok:false, error:"graphql_error", graphqlErrors: json.errors.map(e=> e && e.message).filter(Boolean).slice(0,5) });
    }
    return res.json({ ok:true, user: (json && json.data && json.data.currentUser) ? json.data.currentUser : null });
  } catch(e){
    return res.status(500).json({ ok:false, error:"me_jwt_error", message: (e && e.message) ? e.message : String(e) });
  }
});
/* XS_ME_JWT_ENDPOINT_V3_END */
app.get("/auth/jwt/status", async (req,res)=>{
  try{
    const deviceId = (req.query.deviceId || "").toString().trim();
    if(!deviceId) return res.status(400).json({ ok:false, error:"missing_deviceId" });
    const db = xsJwtDbRead();
    const row = db[deviceId] || null;
    const inMem = (typeof xsDeviceTokens === "object" && xsDeviceTokens && xsDeviceTokens[deviceId]) ? true : false;
    return res.json({ ok:true, deviceId, linked: !!row, inMem, meta: row });
  } catch(e){
    return res.status(500).json({ ok:false, error:"jwt_status_error", message: (e && e.message) ? e.message : String(e) });
  }
});

app.get("/auth/jwt/logout", async (req,res)=>{
  try{
    const deviceId = (req.query.deviceId || "").toString().trim();
    if(!deviceId) return res.status(400).json({ ok:false, error:"missing_deviceId" });

    if(typeof xsDeviceTokens === "object" && xsDeviceTokens && xsDeviceTokens[deviceId]){
      delete xsDeviceTokens[deviceId];
    }
    const db = xsJwtDbRead();
    if(db[deviceId]){ delete db[deviceId]; xsJwtDbWrite(db); }

    return res.json({ ok:true, deviceId, linked:false });
  } catch(e){
    return res.status(500).json({ ok:false, error:"jwt_logout_error", message: (e && e.message) ? e.message : String(e) });
  }
});
/* XS_JWT_AUTH_ENDPOINTS_V1_END */
/* ============================
   XS_JWT_ONLY_DISABLE_OAUTH_V1
   But: désactiver les routes OAuth "device" => JWT only.
   ============================ */
(function xsJwtOnlyDisableOauth(){
  const xsJwtOnly = true;
  if(!xsJwtOnly) return;

  function xsOauthDisabled(res){
    // XS_OAUTH_DISABLED_RESTORE_V2 — safe blocker (syntax-proof)
    try {
      return res.status(403).json({
        ok: false,
        error: 'oauth_disabled',
        hint: 'JWT only. Use POST /auth/jwt/login then GET /me-jwt?deviceId=...'
      });
    } catch (e) {
      try { return res.status(403).send('oauth_disabled'); } catch (_) {}
      return;
    }
  }

  app.get("/auth/sorare-device/login", (req,res)=> xsOauthDisabled(res));
  app.get("/auth/device-status", (req,res)=> xsOauthDisabled(res));
  app.get("/auth/sorare/callback", (req,res)=> xsOauthDisabled(res));
  app.get("/auth/sorare-device/callback", (req,res)=> xsOauthDisabled(res));
})();
/* ============================
   XS_JWT_ONLY_DISABLE_OAUTH_V1_END
   ============================ */
app.listen(PORT, HOST, () => {
  console.log(`[OK] Companion backend on http://${HOST}:${PORT}`);
  console.log(`[OK] GraphQL -> ${SORARE_GQL}`);
});































// ===== XS_DEVICE_OAUTH_V1 =====
// OAuth Sorare par deviceId (MVP dev) - ajout parallèle (ne remplace rien)

const xsDevOauth_DATA_DIR =
  (typeof DATA_DIR !== "undefined" ? DATA_DIR : require("path").join(__dirname, "data"));
const xsDevOauth_DEVICES_FILE = require("path").join(xsDevOauth_DATA_DIR, "oauth_devices.json"); // deviceId -> token + user
const xsDevOauth_STATES_FILE  = require("path").join(xsDevOauth_DATA_DIR, "oauth_states.json");  // state -> deviceId

function xsDevOauth_readJson(file, fallback) {
  try { return JSON.parse(require("fs").readFileSync(file, "utf8")); }
  catch { return fallback; }
}
function xsDevOauth_writeJson(file, obj) {
  const fs2 = require("fs");
  if (!fs2.existsSync(xsDevOauth_DATA_DIR)) fs2.mkdirSync(xsDevOauth_DATA_DIR, { recursive: true });
  fs2.writeFileSync(file, JSON.stringify(obj, null, 2), "utf8");
}
function xsDevOauth_nowSec() { return Math.floor(Date.now() / 1000); }

const xsDevOauth_CLIENT_ID =
  xsEnvHard("SORARE_OAUTH_CLIENT_ID") || process.env.SORARE_OAUTH_CLIENTID || xsEnvHard("SORARE_CLIENT_ID") || "";
const xsDevOauth_CLIENT_SECRET =
  xsEnvHard("SORARE_OAUTH_CLIENT_SECRET") || process.env.SORARE_OAUTH_CLIENTSECRET || xsEnvHard("SORARE_CLIENT_SECRET") || "";
const xsDevOauth_REDIRECT =
  (process.env.SORARE_OAUTH_DEV_REDIRECT_URI || process.env.SORARE_OAUTH_REDIRECT || process.env.SORARE_OAUTH_REDIRECT_URI) || "http://localhost:3000/auth/sorare-device/callback";

async function xsDevOauth_tokenRequest(params) {
  const body = new URLSearchParams(params).toString();
  const r = await fetch("https://api.sorare.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body,
  });
  let json = {};
  try { json = await r.json(); } catch { json = {}; }
  if (!r.ok) throw new Error("xsDevOauth oauth/token " + r.status + ": " + JSON.stringify(json));
  return json;
}

async function xsDevOauth_graphql(accessToken, query, variables) {
  const r = await fetch("https://api.sorare.com/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + accessToken,
    },
    body: JSON.stringify({ query: (String(query)).replace(/[*/]/g, ""), variables: variables }) /* XS_JWT_QUERY_SANITIZE_V1 */,
  });
  let json = {};
  try { json = await r.json(); } catch { json = {}; }
  if (!r.ok) throw new Error("xsDevOauth GraphQL " + r.status + ": " + JSON.stringify(json));
  return json;
}

async function xsDevOauth_getTokenForDevice(deviceId) {
  if (!deviceId) return null;
  const devices = xsDevOauth_readJson(xsDevOauth_DEVICES_FILE, {});
  const rec = devices[deviceId];
  if (!rec) return null;

  const exp = rec.expires_at || 0;
  if (rec.access_token && exp > (xsDevOauth_nowSec() + 60)) return rec.access_token;

  if (!rec.refresh_token) return null;
  if (!xsDevOauth_CLIENT_ID || !xsDevOauth_CLIENT_SECRET) return null;

  const refreshed = await xsDevOauth_tokenRequest({
    grant_type: "refresh_token",
    refresh_token: rec.refresh_token,
    client_id: xsDevOauth_CLIENT_ID,
    client_secret: xsDevOauth_CLIENT_SECRET,
  });

  rec.access_token  = refreshed.access_token  || rec.access_token;
  rec.refresh_token = refreshed.refresh_token || rec.refresh_token;
  rec.expires_in    = refreshed.expires_in;
  rec.expires_at    = xsDevOauth_nowSec() + (refreshed.expires_in || 0);
  rec.refreshed_at  = new Date().toISOString();

  devices[deviceId] = rec;
  xsDevOauth_writeJson(xsDevOauth_DEVICES_FILE, devices);
  return rec.access_token || null;
}

// --- Routes (nouveau namespace) ---
app.get("/auth/sorare-device/login", (req, res) => {
    // ==========================================================
  // XS_ALIGN_DEVICE_LOGIN_REDIRECT_V3
  // PROD: utilise SORARE_OAUTH_REDIRECT_URI
  // DEV:  ?devLocal=1 => localhost callback
  // ==========================================================
  const xsDevLocal = String(req.query.devLocal || "") === "1" || String(req.query.devLocal || "").toLowerCase() === "true";
  const xsRedirectUri = xsDevLocal
    ? "http://localhost:3000/auth/sorare-device/callback"
    : (process.env.SORARE_OAUTH_REDIRECT_URI || "");
  if (!xsRedirectUri) { return res.status(500).send("missing SORARE_OAUTH_REDIRECT_URI"); }
  const deviceId = String(req.query.deviceId || "").trim();
  if (!deviceId) return res.status(400).json({ error: "Missing deviceId" });

  if (!xsDevOauth_CLIENT_ID) {
    return res.status(500).json({
  error: "Missing env client id (SORARE_OAUTH_CLIENT_ID)",
  debug: {
    id_len: (xsEnvHard("SORARE_OAUTH_CLIENT_ID") || "").trim().length,
    secret_len: (xsEnvHard("SORARE_OAUTH_CLIENT_SECRET") || "").trim().length,
    keys: Object.keys(process.env).filter((k) => k.startsWith("SORARE_OAUTH") || k.startsWith("SORARE_CLIENT")).sort(),
  },
});
  }

  const state = Math.random().toString(36).slice(2) + "." + Date.now();
  const states = xsDevOauth_readJson(xsDevOauth_STATES_FILE, {});
  states[state] = { deviceId: deviceId, created_at: new Date().toISOString() };
  xsDevOauth_writeJson(xsDevOauth_STATES_FILE, states);

  const u = new URL("https://sorare.com/oauth/authorize");

    /* XS_DEVLOCAL_REDIRECT_URI_V1

     Dev helper: allow local callback only when explicitly requested,
     and ONLY when:
       - XS_DEVLOCAL_ENABLED=1
       - NODE_ENV != production
       - request is loopback (localhost)
     Usage: /auth/sorare-device/login?deviceId=...&devLocal=1

     Default unchanged (prod uses xsDevOauth_REDIRECT). */

  let xsDevRedirectOverride = "";

  try {
    const q = String((req && req.query && req.query.devLocal) || "");

    // Local-only guard (cannot be used by real users)
    const xsIsLoopbackReq = (rq) => {
      const ip = (rq && (rq.ip || rq.connection?.remoteAddress) || "").toString();
      return ip.includes("127.0.0.1") || ip === "::1" || ip.includes("::ffff:127.0.0.1");
    };

    const xsDevLocalAllowed = (rq) => {
      const enabled = (process.env.XS_DEVLOCAL_ENABLED || "") === "1";
      const env = (process.env.NODE_ENV || "").toLowerCase();
      const notProd = env !== "production";
      return enabled && notProd && xsIsLoopbackReq(rq);
    };

    if ((q === "1" || q.toLowerCase() === "true") && xsDevLocalAllowed(req)) {
      const p = String(process.env.PORT || 3000);
      xsDevRedirectOverride = "http://localhost:" + p + "/auth/sorare-device/callback";
    }
  } catch {}

  /* end XS_DEVLOCAL_REDIRECT_URI_V1 */
  u.searchParams.set("client_id", xsDevOauth_CLIENT_ID);
  u.searchParams.set("redirect_uri", (xsDevRedirectOverride || xsRedirectUri)); // XS_ALIGN_DEVICE_LOGIN_REDIRECT_V4
  u.searchParams.set("response_type", "code");
  /* XS_FIX_DEVICE_LOGIN_SCOPES_V1 */
  try {
    const scp = (xsEnvHard("SORARE_OAUTH_SCOPES") || "").trim();
    u.searchParams.set("scope", scp || "public");
  } catch {}
  /* end XS_FIX_DEVICE_LOGIN_SCOPES_V1 */
  // (removed by XS_FIX_DEVICE_LOGIN_SCOPES_V2) u.searchParams.set("scope","public");
  u.searchParams.set("state", state);  /* XS_FIX_DEVICE_LOGIN_SCOPES_V2 */
  try {
    // last write wins: override scope just before redirect
    const scpRaw = (typeof xsEnvHard === "function" ? (xsEnvHard("SORARE_OAUTH_SCOPES") || "") : (process.env.SORARE_OAUTH_SCOPES || "")).trim();
    const scp = scpRaw ? scpRaw.replace(/\s+/g, " ").trim() : "public";
    try { u.searchParams.set("scope", scp); } catch {}
  } catch {}
  /* end XS_FIX_DEVICE_LOGIN_SCOPES_V2 */

  res.redirect(u.toString());
});

app.get("/auth/sorare-device/callback", async (req, res) => {
  try {
    const code = String(req.query.code || "");
    const state = String(req.query.state || "");
    if (!code) return res.status(400).send("Missing code");
    if (!state) return res.status(400).send("Missing state");

    const states = xsDevOauth_readJson(xsDevOauth_STATES_FILE, {});
    const st = states[state];
    if (!st || !st.deviceId) return res.status(400).send("Invalid state");
    const deviceId = st.deviceId;

    /* XS_FIX_DEVICE_OAUTH_ENVREAD_V1: read env directly inside handler (avoid stale consts) */
const xsEnvClientId =
  (xsEnvHard("SORARE_OAUTH_CLIENT_ID") || xsEnvHard("SORARE_CLIENT_ID") || "").trim();
const xsEnvClientSecret =
  (xsEnvHard("SORARE_OAUTH_CLIENT_SECRET") || xsEnvHard("SORARE_CLIENT_SECRET") || "").trim();
/* end XS_FIX_DEVICE_OAUTH_ENVREAD_V1 */

if (!xsEnvClientId || !xsEnvClientSecret) {
  return res.status(500).json({
    error: "Missing env client id/secret for device oauth",
    debug: {
      has_id: !!xsEnvClientId,
      has_secret: !!xsEnvClientSecret,
      id_len: xsEnvClientId ? xsEnvClientId.length : 0,
      secret_len: xsEnvClientSecret ? xsEnvClientSecret.length : 0,
      keys: Object.keys(process.env).filter((k) => k.startsWith("SORARE_OAUTH") || k.startsWith("SORARE_CLIENT")).sort(),
    },
  });
}
/* XS_FIX_DEVICE_OAUTH_ENVREAD_V1: old check removed */ if (false) {
      return res.status(500).send("Missing env client id/secret (SORARE_OAUTH_CLIENT_ID/_SECRET)");
    }

    const token = await xsDevOauth_tokenRequest({
      grant_type: "authorization_code",
      code: code,
      client_id: (xsEnvHard("SORARE_OAUTH_CLIENT_ID") || xsEnvHard("SORARE_CLIENT_ID") || "").trim(),
      client_secret: (xsEnvHard("SORARE_OAUTH_CLIENT_SECRET") || xsEnvHard("SORARE_CLIENT_SECRET") || "").trim(),
      /* XS_FIX_DEVICE_CALLBACK_REDIRECT_URI_V1 */
      redirect_uri: (
        (process.env.SORARE_OAUTH_DEV_REDIRECT_URI || process.env.SORARE_OAUTH_REDIRECT || "") ||
        (process.env.SORARE_OAUTH_REDIRECT_URI || "") ||
        ("http://localhost:" + String(process.env.PORT || 3000) + "/auth/sorare-device/callback")
      ),
/* end XS_FIX_DEVICE_CALLBACK_REDIRECT_URI_V1 */
/* XS_FIX_DEVICE_CB_TOKENREQ_ENV_V1: use envhard inside callback */
    });

    const accessToken = token.access_token;
    if (!accessToken) return res.status(500).send("No access_token received");

    const me = await xsDevOauth_graphql(accessToken, "query { currentUser { slug nickname } }", {});
    const cu = me && me.data && me.data.currentUser ? me.data.currentUser : null;
    if (!cu || !cu.slug) return res.status(500).send("Unable to read currentUser");

    const devices = xsDevOauth_readJson(xsDevOauth_DEVICES_FILE, {});
    devices[deviceId] = {
      userSlug: cu.slug,
      nickname: cu.nickname || null,
      access_token: token.access_token,
      refresh_token: token.refresh_token,
      expires_in: token.expires_in,
      expires_at: xsDevOauth_nowSec() + (token.expires_in || 0),
      linked_at: new Date().toISOString(),
    };
    xsDevOauth_writeJson(xsDevOauth_DEVICES_FILE, devices);

    // cleanup state
    delete states[state];
    xsDevOauth_writeJson(xsDevOauth_STATES_FILE, states);

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.end("<h2>✅ Connexion Sorare (device) OK</h2><p>Retourne dans l’app. Tu peux fermer cet onglet.</p>");
  } catch (e) {
    res.status(500).send(String(e && e.message ? e.message : e));
  }
});

app.get("/auth/device-status", (req, res) => {
  const deviceId = String(req.query.deviceId || "").trim();
  if (!deviceId) return res.status(400).json({ error: "Missing deviceId" });

  const devices = xsDevOauth_readJson(xsDevOauth_DEVICES_FILE, {});
  const rec = devices[deviceId];
  if (!rec)
return res.json({ linked: false });

  res.json({ linked: true, userSlug: rec.userSlug, nickname: rec.nickname || null });
});

app.get("/auth/sorare-device/me", async (req, res) => {
  try {
    const deviceId = String(req.query.deviceId || "").trim();
    const tok = await xsDevOauth_getTokenForDevice(deviceId);
    if (!tok) return res.status(401).json({ error: "Not linked. Use /auth/sorare-device/login?deviceId=..." });

    const out = await xsDevOauth_graphql(tok, "query { currentUser { slug nickname } }", {});
    res.json(out);
  } catch (e) {
  if (res.headersSent) {
    return;
  }
  res.status(500).json({ error: String(e && e.message ? e.message : e) });
  }
});

// ===== /XS_DEVICE_OAUTH_V1 =====

  // ===== XS_ME_V1 =====
  // Endpoint privé: identité utilisateur via token OAuth stocké (deviceId -> access_token)
  // ⚠️ Ne renvoie JAMAIS le token au client.

  function xsMe_getDevice(deviceId) {
    try {
      const devices = xsDevOauth_readJson(xsDevOauth_DEVICES_FILE, {});
      return devices && devices[deviceId] ? devices[deviceId] : null;
    } catch (e) {
      return null;
    }
  }

  function xsMe_getAccessToken(deviceId) {
    const d = xsMe_getDevice(deviceId);
    if (!d) return null;
    return d.access_token || null;
  }

  app.get("/me", async (req, res) => {
    try {
      const deviceId = String(req.query.deviceId || "").trim();
      if (!deviceId) return res.status(400).json({ error: "Missing deviceId" });

      const tok = xsMe_getAccessToken(deviceId);
      if (!tok) return res.status(401).json({ error: "Not linked. Use /auth/sorare-device/login?deviceId=..." });

      const q = "query { currentUser { slug nickname } }";
      const me = await xsDevOauth_graphql(tok, q, {});

      const cu = me && me.data && me.data.currentUser ? me.data.currentUser : null;
      if (!cu || !cu.slug) return res.status(502).json({ error: "Unable to read currentUser", raw: me });

      res.json({ ok: true, userSlug: cu.slug, nickname: cu.nickname || null });
    } catch (e) {
  if (res.headersSent) {
    return;
  }
  res.status(500).json({ error: String(e && e.message ? e.message : e) });
    }
  });

  // ===== /XS_ME_V1 =====

  // ===== XS_DEVICE_UNLINK_V1 =====
  // Dé-lie un deviceId (supprime son token stocké). Utile pour "logout" réel.
  // ⚠️ Ne renvoie jamais de token.
  app.get("/auth/device-unlink", async (req, res) => {
    try {
      const deviceId = String(req.query.deviceId || "").trim();
      if (!deviceId) return res.status(400).json({ error: "Missing deviceId" });

      const devices = xsDevOauth_readJson(xsDevOauth_DEVICES_FILE, {});
      if (devices && devices[deviceId]) {
        delete devices[deviceId];
        xsDevOauth_writeJson(xsDevOauth_DEVICES_FILE, devices);
      }

      // on supprime aussi un state éventuel (optionnel)
      try {
        const states = xsDevOauth_readJson(xsDevOauth_STATES_FILE, {});
        for (const k of Object.keys(states || {})) {
          if (states[k] && states[k].deviceId === deviceId) delete states[k];
        }
        xsDevOauth_writeJson(xsDevOauth_STATES_FILE, states);
      } catch {}
return res.json({ ok: true, unlinked: true, deviceId });
    } catch (e) {
      return res.status(500).json({ error: String(e && e.message ? e.message : e) });
    }
  });
  // ===== /XS_DEVICE_UNLINK_V1 =====

  // ===== XS_MARKET_AUTH_RAW_V1 =====
  // Debug: prouve qu'on peut appeler une query "marché" avec Authorization: Bearer (token user via deviceId).
  // Ne casse rien : endpoint nouveau, et on renvoie le brut pour inspecter la shape.

  app.get("/market/auth/raw", async (req, res) => {
    try {
      const deviceId = String(req.query.deviceId || "").trim();
      if (!deviceId) return res.status(400).json({ error: "Missing deviceId" });

      // xsMe_getAccessToken vient du patch XS_ME_V1
      const tok = (typeof xsMe_getAccessToken === "function") ? xsMe_getAccessToken(deviceId) : null;
      if (!tok) return res.status(401).json({ error: "Not linked. Use /auth/sorare-device/login?deviceId=..." });

      // Params simples
      const first = Math.max(1, Math.min(50, Number(req.query.first || 10)));
      const after = String(req.query.after || "") || null;

      // ⚠️ Query volontairement MINIMALE pour éviter les erreurs de schéma.
      // On teste juste "liveSingleSaleOffers" + prix en EUR cents.
      // Si Sorare renvoie une erreur de schéma, on l'affiche en clair (sans casser le serveur).
      const query = `
        query MarketAuthRaw($first: Int!, $after: String) {
          tokens {
            liveSingleSaleOffers(first: $first, after: $after) {
              nodes {
                id
                price { amounts { eurCents } }
              }
              pageInfo { endCursor hasNextPage }
            }
          }
        }
      `;

      const vars = { first, after };

      const r = await xsDevOauth_graphql(tok, query, vars);

      // On renvoie brut + un petit résumé
      const offers = r?.data?.tokens?.liveSingleSaleOffers?.nodes || [];
/* XS_PUBLIC_USER_CARDS_HEADERS_SENT_GUARD_V1_BEGIN
   - But: éviter double réponse (ERR_HTTP_HEADERS_SENT)
   - Si une réponse a déjà été envoyée, on sort proprement
   XS_PUBLIC_USER_CARDS_HEADERS_SENT_GUARD_V1_END */
if (res.headersSent) {
  return;
}
res.json({
        ok: true,
        deviceId,
        count: Array.isArray(offers) ? offers.length : 0,
        sample: Array.isArray(offers) && offers[0] ? offers[0] : null,
        raw: r
      });
    } catch (e) {
  if (res.headersSent) {
    return;
  }
  res.status(500).json({ error: String(e && e.message ? e.message : e) });
    }
  });

  // ===== /XS_MARKET_AUTH_RAW_V1 =====

  // ===== XS_MARKET_AUTH_INSPECT_V1 =====
  // Découverte safe du schéma: on trouve le bon champ de prix sur TokenOffer en testant plusieurs candidats.

  app.get("/market/auth/inspect", async (req, res) => {
    try {
      const deviceId = String(req.query.deviceId || "").trim();
      if (!deviceId) return res.status(400).json({ error: "Missing deviceId" });

      const tok = (typeof xsMe_getAccessToken === "function") ? xsMe_getAccessToken(deviceId) : null;
      if (!tok) return res.status(401).json({ error: "Not linked. Use /auth/sorare-device/login?deviceId=..." });

      const first = Math.max(1, Math.min(20, Number(req.query.first || 5)));
      const after = String(req.query.after || "") || null;

      // 1) Query minimale: id + __typename (doit passer)
      const q0 = `
        query Q0($first: Int!, $after: String) {
          tokens {
            liveSingleSaleOffers(first: $first, after: $after) {
              nodes { id __typename }
              pageInfo { endCursor hasNextPage }
            }
          }
        }
      `;
      const vars = { first, after };
      const base = await xsDevOauth_graphql(tok, q0, vars);

      const nodes0 = base?.data?.tokens?.liveSingleSaleOffers?.nodes || [];
      const typename = nodes0 && nodes0[0] ? nodes0[0].__typename : null;

      // 2) On tente des candidats de prix (un par un) pour éviter de casser si un champ n'existe pas
      const candidates = [
        "buyNowPrice",
        "startPrice",
        "startingPrice",
        "currentPrice",
        "priceInFiat",
        "fiatPrice",
        "price",          // on sait déjà que NON sur TokenOffer, mais on le garde pour debug
        "amount",
      ];

      let winner = null;
      let winnerRaw = null;
      let lastErr = null;

      for (const f of candidates) {
        const qTry = `
          query QTry($first: Int!, $after: String) {
            tokens {
              liveSingleSaleOffers(first: $first, after: $after) {
                nodes {
                  id
                  __typename
                  ${f} { amounts { eurCents } }
                }
                pageInfo { endCursor hasNextPage }
              }
            }
          }
        `;
        try {
          const r = await xsDevOauth_graphql(tok, qTry, vars);
          const n = r?.data?.tokens?.liveSingleSaleOffers?.nodes || [];
          if (Array.isArray(n) && n.length) {
            // Si le champ existe, il sera présent (ou null) — mais la query passe = victoire
            winner = f;
            winnerRaw = r;
            break;
          }
        } catch (e) {
          lastErr = String(e && e.message ? e.message : e);
          continue;
        }
      }
/* XS_PUBLIC_USER_CARDS_HEADERS_SENT_GUARD_V1_BEGIN
   - But: éviter double réponse (ERR_HTTP_HEADERS_SENT)
   - Si une réponse a déjà été envoyée, on sort proprement
   XS_PUBLIC_USER_CARDS_HEADERS_SENT_GUARD_V1_END */
if (res.headersSent) {
  return;
}
res.json({
        ok: true,
        deviceId,
        typename,
        count: Array.isArray(nodes0) ? nodes0.length : 0,
        baseSample: Array.isArray(nodes0) && nodes0[0] ? nodes0[0] : null,
        priceField: winner,
        priceSample: winnerRaw?.data?.tokens?.liveSingleSaleOffers?.nodes?.[0] || null,
        lastError: winner ? null : lastErr,
      });
    } catch (e) {
  if (res.headersSent) {
    return;
  }
  res.status(500).json({ error: String(e && e.message ? e.message : e) });
    }
  });

  // ===== /XS_MARKET_AUTH_INSPECT_V1 =====

  // ===== XS_MARKET_FIELDHUNT_V1 =====
  // Scan de champs potentiels sur TokenOffer, sans introspection.
  // - Si champ scalaire: on le lit direct.
  // - Si champ objet: on lit { __typename }.
  // On renvoie un tableau avec succès/erreur par champ.

  app.get("/market/auth/fieldhunt", async (req, res) => {
    try {
      const deviceId = String(req.query.deviceId || "").trim();
      if (!deviceId) return res.status(400).json({ error: "Missing deviceId" });

      const tok = (typeof xsMe_getAccessToken === "function") ? xsMe_getAccessToken(deviceId) : null;
      if (!tok) return res.status(401).json({ error: "Not linked. Use /auth/sorare-device/login?deviceId=..." });

      const first = Math.max(1, Math.min(10, Number(req.query.first || 3)));
      const after = String(req.query.after || "") || null;
      const vars = { first, after };

      // 0) base: on récupère un node id pour tester
      const q0 = `
        query Q0($first: Int!, $after: String) {
          tokens {
            liveSingleSaleOffers(first: $first, after: $after) {
              nodes { id __typename }
              pageInfo { endCursor hasNextPage }
            }
          }
        }
      `;
      const base = await xsDevOauth_graphql(tok, q0, vars);
      const nodes0 = base?.data?.tokens?.liveSingleSaleOffers?.nodes || [];
      const sample0 = Array.isArray(nodes0) && nodes0[0] ? nodes0[0] : null;
      if (!sample0?.id)
return res.json({ ok: true, deviceId, note: "No offers to inspect", base });

      const candidates = [
        // très communs
        "buyNowPrice","startPrice","startingPrice","currentPrice","price","amount",
        // fiats
        "fiatPrice","priceInFiat","fiatAmount","eurAmount","usdAmount",
        // crypto / wei / eth
        "weiAmount","priceWei","ethAmount","cryptoAmount",
        // enchères / offres
        "currentBid","bestBid","bidAmount","reservePrice","endPrice",
        // autres noms possibles
        "dealPrice","dealAmount","salePrice","finalPrice","acceptedPrice",
        "priceInEur","eurPrice","minPrice","maxPrice"
      ];

      async function tryScalar(fieldName) {
        const q = `
          query QScalar($first: Int!, $after: String) {
            tokens {
              liveSingleSaleOffers(first: $first, after: $after) {
                nodes { id __typename ${fieldName} }
                pageInfo { endCursor hasNextPage }
              }
            }
          }
        `;
        return await xsDevOauth_graphql(tok, q, vars);
      }

      async function tryObjectTypename(fieldName) {
        const q = `
          query QObject($first: Int!, $after: String) {
            tokens {
              liveSingleSaleOffers(first: $first, after: $after) {
                nodes { id __typename ${fieldName} { __typename } }
                pageInfo { endCursor hasNextPage }
              }
            }
          }
        `;
        return await xsDevOauth_graphql(tok, q, vars);
      }

      const results = [];

      for (const f of candidates) {
        // 1) scalar attempt
        try {
          const r1 = await tryScalar(f);
          const n1 = r1?.data?.tokens?.liveSingleSaleOffers?.nodes || [];
          const s1 = Array.isArray(n1) && n1[0] ? n1[0] : null;
          results.push({
            field: f,
            ok: true,
            kind: "scalar",
            sample: s1 && Object.prototype.hasOwnProperty.call(s1, f) ? s1[f] : null
          });
          continue;
        } catch (e1) {
          const msg1 = String(e1 && e1.message ? e1.message : e1);

          // 2) si l'erreur ressemble à "must have a selection of subfields", c'est probablement un objet
          // (sinon on tente quand même QObject pour être sûr)
          try {
            const r2 = await tryObjectTypename(f);
            const n2 = r2?.data?.tokens?.liveSingleSaleOffers?.nodes || [];
            const s2 = Array.isArray(n2) && n2[0] ? n2[0] : null;
            const obj = s2 ? s2[f] : null;

            results.push({
              field: f,
              ok: true,
              kind: "object",
              objectType: obj && obj.__typename ? obj.__typename : null,
              sample: obj || null
            });
          } catch (e2) {
            const msg2 = String(e2 && e2.message ? e2.message : e2);
            results.push({
              field: f,
              ok: false,
              errScalar: msg1,
              errObject: msg2
            });
          }
        }
      }
/* XS_PUBLIC_USER_CARDS_HEADERS_SENT_GUARD_V1_BEGIN
   - But: éviter double réponse (ERR_HTTP_HEADERS_SENT)
   - Si une réponse a déjà été envoyée, on sort proprement
   XS_PUBLIC_USER_CARDS_HEADERS_SENT_GUARD_V1_END */
if (res.headersSent) {
  return;
}
res.json({
        ok: true,
        deviceId,
        baseSample: sample0,
        results
      });
    } catch (e) {
  if (res.headersSent) {
    return;
  }
  res.status(500).json({ error: String(e && e.message ? e.message : e) });
    }
  });

  // ===== /XS_MARKET_FIELDHUNT_V1 =====




































































/* XS_JWT_FIX_REMOVE_SLASH_COMMENTS_V1 applied */













