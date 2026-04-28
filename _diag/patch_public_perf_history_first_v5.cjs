const fs = require("fs");
const path = require("path");

const file = path.join(process.cwd(), "src", "scoutApi.ts");
const marker = "XS_FIX_FRONT_PERF_HISTORY_FIRST_NO_403_V5";

let text = fs.readFileSync(file, "utf8");

if (text.includes(marker)) {
  console.log("Patch V5 déjà présent, aucune modification.");
  process.exit(0);
}

const sig = "export async function publicPlayerPerformance";
const start = text.indexOf(sig);

if (start < 0) {
  throw new Error("Impossible de trouver publicPlayerPerformance dans src/scoutApi.ts");
}

const bodyNeedle = "): Promise<PublicPlayerPerformance> {";
const bodyNeedleAt = text.indexOf(bodyNeedle, start);

if (bodyNeedleAt < 0) {
  throw new Error("Impossible de trouver la vraie ouverture de corps : " + bodyNeedle);
}

const braceStart = bodyNeedleAt + bodyNeedle.length - 1;

let depth = 0;
let end = -1;
let inString = false;
let stringChar = "";
let escaped = false;
let inLineComment = false;
let inBlockComment = false;

for (let i = braceStart; i < text.length; i++) {
  const ch = text[i];
  const next = text[i + 1] || "";

  if (inLineComment) {
    if (ch === "\n") inLineComment = false;
    continue;
  }

  if (inBlockComment) {
    if (ch === "*" && next === "/") {
      inBlockComment = false;
      i++;
    }
    continue;
  }

  if (inString) {
    if (escaped) {
      escaped = false;
      continue;
    }

    if (ch === "\\") {
      escaped = true;
      continue;
    }

    if (ch === stringChar) {
      inString = false;
      stringChar = "";
    }

    continue;
  }

  if (ch === "/" && next === "/") {
    inLineComment = true;
    i++;
    continue;
  }

  if (ch === "/" && next === "*") {
    inBlockComment = true;
    i++;
    continue;
  }

  if (ch === "'" || ch === '"' || ch === "`") {
    inString = true;
    stringChar = ch;
    continue;
  }

  if (ch === "{") {
    depth++;
    continue;
  }

  if (ch === "}") {
    depth--;

    if (depth === 0) {
      end = i + 1;
      break;
    }
  }
}

if (end < 0) {
  throw new Error("Impossible de trouver la fin de publicPlayerPerformance");
}

const before = text.slice(0, start);
const after = text.slice(end);

const newFunction = String.raw`
/* XS_FIX_FRONT_PERF_HISTORY_FIRST_NO_403_V5
 * Cloud Run -> Sorare peut être bloqué par CloudFront 403 sur les routes perf.
 * Pour stabiliser l'app, on utilise d'abord /history/player-chart.
 * Si history est vide/KO, on retourne un fallback propre au lieu de casser l'UI.
 */
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

      const nums = rawItems
        .map((it: any) => {
          const v =
            it?.score ??
            it?.playerScore ??
            it?.so5Score ??
            it?.decisiveScore ??
            it?.value ??
            it;

          const n = Number(v);
          return Number.isFinite(n) ? n : null;
        })
        .filter((n: any) => n !== null);

      const avg = (arr: number[]) =>
        arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null;

      const recent40 = nums.slice(0, 40);
      const recent15 = recent40.slice(0, 15);
      const recent5 = recent40.slice(0, 5);

      return {
        ...(json || {}),
        ok: true,
        playerSlug: json.playerSlug || s,
        slug: json.slug || s,
        recentScores: recent5,
        recentScores15: recent15,
        recentScores40: recent40,
        scores: recent40,
        items: rawItems,
        matches: rawItems,
        l5: json.l5 ?? avg(recent5),
        l15: json.l15 ?? avg(recent15),
        l40: json.l40 ?? avg(recent40),
        averageScore: json.averageScore ?? avg(recent5),
        opponentLogoUrls: json.opponentLogoUrls || [],
        opponentShort: json.opponentShort || [],
        meta: {
          ...(json.meta || {}),
          source: "history/player-chart",
          marker: "XS_FIX_FRONT_PERF_HISTORY_FIRST_NO_403_V5",
          count: rawItems.length,
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

`;

fs.writeFileSync(file, before + newFunction + after, "utf8");
console.log("Patch V5 appliqué.");
