import AsyncStorage from "@react-native-async-storage/async-storage";

export type NewsItem = {
  id: string;
  title: string;
  url: string;
  source: string;
  publishedAt: number; // epoch ms
  excerpt?: string | null;
  imageUrl?: string | null;
};

type NewsCache = { ts: number; items: NewsItem[] };

const CACHE_KEY = "XS_NEWS_CACHE_V1";
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 min

// Multi-sources (tu peux en ajouter/retirer)
const FEEDS: { source: string; url: string }[] = [
  { source: "Google News (FR)", url: "https://news.google.com/rss/search?q=football&hl=fr&gl=FR&ceid=FR:fr" },
  { source: "L'Équipe",         url: "https://www.lequipe.fr/rss/actu_rss_Football.xml" },
  { source: "RMC Sport",        url: "https://rmcsport.bfmtv.com/rss/football/" },
  { source: "BBC Sport",        url: "https://feeds.bbci.co.uk/sport/football/rss.xml" },
  { source: "The Guardian",     url: "https://www.theguardian.com/football/rss" },
  { source: "ESPN Soccer",      url: "https://www.espn.com/espn/rss/soccer/news" },
];

function stripCdata(s: string) {
  return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
}
function decodeEntities(s: string) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}
function pickTag(block: string, tag: string) {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m = block.match(re);
  if (!m) return null;
  return decodeEntities(stripCdata(m[1]).trim());
}
function pickAttr(block: string, tag: string, attr: string) {
  const re = new RegExp(`<${tag}[^>]*\\s${attr}="([^"]+)"[^>]*\\/?>`, "i");
  const m = block.match(re);
  return m ? m[1] : null;
}
function toEpochMs(dateStr: string | null) {
  if (!dateStr) return Date.now();
  const t = Date.parse(dateStr);
  return Number.isFinite(t) ? t : Date.now();
}

function parseRss(xml: string, sourceFallback: string): NewsItem[] {
  const clean = xml.replace(/\r/g, "");
  const items = clean.split(/<item[\s>]/i).slice(1).map(x => "<item " + x);

  const out: NewsItem[] = [];
  for (const it of items) {
    const title = pickTag(it, "title") ?? "Sans titre";
    const link = pickTag(it, "link") ?? pickTag(it, "guid") ?? "";
    if (!link) continue;

    const pub = pickTag(it, "pubDate") ?? pickTag(it, "published") ?? pickTag(it, "updated");
    const publishedAt = toEpochMs(pub);

    const descRaw = pickTag(it, "description") ?? pickTag(it, "content:encoded");
    const excerpt = descRaw
      ? descRaw.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 180)
      : null;

    const imageUrl =
      pickAttr(it, "media:content", "url") ||
      pickAttr(it, "media:thumbnail", "url") ||
      pickAttr(it, "enclosure", "url") ||
      null;

    const source = pickTag(it, "source") ?? sourceFallback;
    const id = `${source}::${link}`.slice(0, 220);

    out.push({ id, title, url: link, source, publishedAt, excerpt, imageUrl });
  }
  return out;
}

function footballFilter(items: NewsItem[]) {
  // anti faux positifs
  const bad = /(nfl|nba|mlb|nhl|cricket|rugby|tennis|formula 1|f1|motogp|cyclisme|golf)/i;
  return items.filter(x => !bad.test(x.title));
}

async function loadCache(): Promise<NewsCache | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
async function saveCache(items: NewsItem[]) {
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), items }));
  } catch {}
}

export async function fetchFootballNews(opts?: { forceRefresh?: boolean }): Promise<{ items: NewsItem[]; fromCache: boolean }> {
  const forceRefresh = !!opts?.forceRefresh;

  const cached = await loadCache();
  if (!forceRefresh && cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return { items: cached.items ?? [], fromCache: true };
  }

  const results: NewsItem[] = [];
  await Promise.all(
    FEEDS.map(async f => {
      try {
        // cache-busting pour éviter certains caches
        const bust = f.url.includes("?") ? "&" : "?";
        const res = await fetch(`${f.url}${bust}ts=${Date.now()}`);
        const xml = await res.text();
        results.push(...parseRss(xml, f.source));
      } catch {
        // un flux qui tombe ne doit pas casser le feed
      }
    })
  );

  // dédup + tri
  const map = new Map<string, NewsItem>();
  for (const it of footballFilter(results)) {
    const key = it.url || it.id;
    if (!map.has(key)) map.set(key, it);
  }

  const merged = Array.from(map.values())
    .sort((a, b) => b.publishedAt - a.publishedAt)
    .slice(0, 120);

  if (merged.length) await saveCache(merged);

  if (merged.length === 0 && cached?.items?.length) {
    return { items: cached.items, fromCache: true };
  }

  return { items: merged, fromCache: false };
}
