import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";


type Position = "GK" | "DEF" | "MID" | "FW" | "FWD" | "FLEX";

type SorareCard = {
  id?: string;
  cardId?: string;
  slug?: string;
  name?: string;
  displayName?: string;
  playerName?: string;
  position?: Position | string;
  positionRaw?: string;
  pictureUrl?: string;
  imageUrl?: string;
  cardPictureUrl?: string;
  avatarUrl?: string;
  clubName?: string;
  teamName?: string;
  leagueSlug?: string | null;
  leagueName?: string | null;
  age?: number | null;
  birthDate?: string | null;
  dateOfBirth?: string | null;
  nextOpponent?: string;
  nextMatch?: string;
  l5?: number;
  l15?: number;
  l40?: number;
  score?: number;
  projection?: number;
  projectedScore?: number;
  power?: string | number;
  bonus?: number;
  totalBonus?: number;
  [key: string]: any;
};

type GameWeekAiPrediction = {
  ok?: boolean;
  projectedTotalScore?: number;
  projectedRangeLow?: number;
  projectedRangeHigh?: number;
  confidence?: string;
  confidenceScore?: number;
  riskLevel?: string;
  bestPick?: { name?: string; playerSlug?: string; projectedScore?: number } | null;
  mostRisky?: { name?: string; playerSlug?: string; riskScore?: number } | null;
  captainAdvice?: string;
  actionableAdvice?: string;
  positivePoints?: string[];
  negativePoints?: string[];
  why?: string;
  aiUsed?: boolean;
  aiError?: string | null;
};

async function createLineup(payload: any): Promise<any> {
  console.log("XS_PLAY_LOCAL_CREATE_LINEUP_STUB_V1", payload);
  return { ok: true, local: true, payload };
}

const BG = "#07070A";
const BG_TOP = "#180407";
const BG_BOTTOM = "#020203";
const PANEL = "#0B0B10";
const PANEL_SOFT = "#111118";
const STROKE = "rgba(255,255,255,0.12)";
const STROKE_SOFT = "rgba(255,255,255,0.08)";
const TEXT = "#ffffff";
const MUTED = "rgba(255,255,255,0.62)";
const MUTED_SOFT = "rgba(255,255,255,0.42)";
const YELLOW = "#FF3148";
const YELLOW_DEEP = "#A70F20";
const GREEN = "#19f07a";
const RED = "#FF3148";
const RED_DARK = "#7A0714";
const BLUE = "#26A8FF";
const PURPLE = "#A855F7";


/* XS_PLAY_APPLY_CARD_BONUS_V1 BEGIN */
function xsPlayBonusPctV1(card: any): number | null {
  const raw = card?.power ?? card?.cardPower ?? card?.bonusPct ?? card?.totalBonus ?? card?.bonus;
  const n = Number(String(raw ?? "").replace(",", "."));
  if (!Number.isFinite(n)) return null;
  if (n > 0 && n < 3) return Math.round((n - 1) * 1000) / 10;
  return Math.round(n * 10) / 10;
}

function xsPlayScoreWithBonusV1(score: number, card: any): number {
  const bonus = xsPlayBonusPctV1(card);
  if (bonus === null) return Math.round(score);
  return Math.round(score * (1 + bonus / 100));
}

function xsPlayBonusLabelV1(card: any): string {
  const bonus = xsPlayBonusPctV1(card);
  return bonus === null ? "Bonus —" : `Bonus +${bonus}%`;
}
/* XS_PLAY_APPLY_CARD_BONUS_V1 END */

/* XS_AI_GAMEWEEK_PREDICTION_V1 */
function xsPlayAiBaseUrlV1(): string {
  return String(
    process.env.EXPO_PUBLIC_BASE_URL ||
    process.env.EXPO_PUBLIC_AUTH_BASE_URL ||
    "https://xiascor-backend-tssdy62zqa-ez.a.run.app"
  ).replace(/\/+$/, "");
}

function xsPlayAiTextV1(value: any, fallback = "—"): string {
  const s = String(value ?? "").trim();
  return s || fallback;
}
/* XS_AI_GAMEWEEK_PREDICTION_V1_END */

type ModeKey = "classic" | "cap240" | "cap220";
type StrategyKey = "safe" | "balanced" | "differential";
type SlotKey = "GK" | "DEF" | "MID" | "FWD" | "FLEX";
type PlayRarityV1 = "Limited" | "Rare" | "Super Rare" | "Unique";
type PlayCompetitionCategoryV1 = "global" | "age" | "league" | "regional" | "arena";
type PlayGameWeekCompetitionV1 = {
  id: string;
  label: string;
  type: PlayCompetitionCategoryV1;
  category: PlayCompetitionCategoryV1;
  rarityAllowed: PlayRarityV1[];
  eligibleLeagues: string[];
  eligiblePositions: SlotKey[];
  minCards: number;
  maxCards: number;
  defaultCards: number;
  rulesDescription: string;
  isActive: boolean;
  futureRulesPlaceholder: string;
};

type CoachStats = {
  l5: number;
  l15: number;
  l40: number;
  probableStart: number;
  injuryRisk: number;
  suspensionRisk: number;
  difficulty: number;
  minutes: number;
  ceiling: number;
  upside: number;
  ownership: number;
};

type CoachPlayer = {
  id: string;
  slug: string;
  name: string;
  position: Exclude<Position, "UNK">;
  match: string;
  club: string;
  pictureUrl: string;
  score: number;
  aiScore: number;
  confidence: number;
  stats: CoachStats;
  colors: [string, string];
  reasons: string[];
  rawCard?: SorareCard;
};

type GeneratedLineup = {
  strategy: StrategyKey;
  title: string;
  projected: number;
  confidence: number;
  secureScore: number;
  maxScore: number;
  slots: { slot: SlotKey; player: CoachPlayer }[];
};
type PlayLineupValidationV1 = {
  isValid: boolean;
  severity: "valid" | "warning" | "error";
  validCardsCount: number;
  requiredCardsCount: number;
  maxCards: number;
  errors: string[];
  warnings: string[];
  missingSlots: number;
  invalidCards: Array<{
    slotId?: string;
    playerName?: string;
    cardSlug?: string;
    reasons: string[];
  }>;
};

const modes: { key: ModeKey; label: string }[] = [
  { key: "classic", label: "Classic" },
  { key: "cap240", label: "Cap 240" },
  { key: "cap220", label: "Cap 220" },
];

const strategies: {
  key: StrategyKey;
  label: string;
  percent: number;
  icon: string;
  title: string;
}[] = [
  { key: "safe", label: "Sécurisé", percent: 78, icon: "shield-checkmark-outline", title: "Compo sécurisée" },
  { key: "balanced", label: "Équilibré", percent: 82, icon: "scale-outline", title: "Compo équilibrée" },
  { key: "differential", label: "Différentiel", percent: 74, icon: "star-outline", title: "Compo différentielle" },
];

// XS_PLAY_GAMEWEEKS_RULES_V1: local, extensible Sorare Game Week competition rules used only by the Play tab.
// XS_PLAY_ELIGIBILITY_FILTERS_V1: robust local card eligibility extraction and exclusion reasons.
// XS_PLAY_LINEUP_VALIDATION_V1: validate selected Game Week lineups before save or AI prediction.
// XS_PLAY_GAMEWEEK_UX_V1: make Game Week eligibility and lineup validation easier to understand.
// XS_PLAY_CLUB_LEAGUE_FALLBACK_V1: infer league from known club when gallery cards miss league fields.
// XS_PLAY_CLUB_LEAGUE_FALLBACK_EXTENDED_V1: temporary club-to-league fallback until backend cards expose leagueSlug.
// XS_PLAY_USE_BACKEND_ENRICHED_CARDS_V1: refresh Play gallery from /my-cards source=auto and keep cache fallback.
const PLAY_RARITIES_V1: PlayRarityV1[] = ["Limited", "Rare", "Super Rare", "Unique"];
const PLAY_ALL_POSITIONS_V1: SlotKey[] = ["GK", "DEF", "MID", "FWD", "FLEX"];
const PLAY_CLUB_LEAGUE_FALLBACK_V1: Record<string, string> = {
  // Temporary fallback: only recognized clubs are mapped; unknown clubs stay in "donnee manquante".
  // Gallery clubs observed locally.
  "rc-lens": "ligue-1-fr",
  "stade-brestois-29": "ligue-1-fr",
  "rc-strasbourg-alsace": "ligue-1-fr",
  "rc-strasbourg": "ligue-1-fr",
  "as-monaco": "ligue-1-fr",
  "angers-sco": "ligue-1-fr",
  "borussia-dortmund": "bundesliga-de",
  // Champion - Ligue 1.
  "paris-saint-germain": "ligue-1-fr",
  psg: "ligue-1-fr",
  "olympique-de-marseille": "ligue-1-fr",
  "marseille": "ligue-1-fr",
  "olympique-lyonnais": "ligue-1-fr",
  lyon: "ligue-1-fr",
  "losc-lille": "ligue-1-fr",
  lille: "ligue-1-fr",
  "ogc-nice": "ligue-1-fr",
  nice: "ligue-1-fr",
  "stade-rennais-fc": "ligue-1-fr",
  "stade-rennais": "ligue-1-fr",
  rennes: "ligue-1-fr",
  "fc-nantes": "ligue-1-fr",
  nantes: "ligue-1-fr",
  "toulouse-fc": "ligue-1-fr",
  toulouse: "ligue-1-fr",
  "montpellier-hsc": "ligue-1-fr",
  montpellier: "ligue-1-fr",
  "fc-metz": "ligue-1-fr",
  metz: "ligue-1-fr",
  "fc-lorient": "ligue-1-fr",
  lorient: "ligue-1-fr",
  "aj-auxerre": "ligue-1-fr",
  auxerre: "ligue-1-fr",
  "le-havre-ac": "ligue-1-fr",
  "le-havre": "ligue-1-fr",
  "stade-de-reims": "ligue-1-fr",
  reims: "ligue-1-fr",
  "clermont-foot-63": "ligue-1-fr",
  "clermont-foot": "ligue-1-fr",
  "estac-troyes": "ligue-1-fr",
  "as-saint-etienne": "ligue-1-fr",
  "saint-etienne": "ligue-1-fr",
  // Champion - Premier League.
  "arsenal-fc": "premier-league-gb-eng",
  arsenal: "premier-league-gb-eng",
  "chelsea-fc": "premier-league-gb-eng",
  chelsea: "premier-league-gb-eng",
  "liverpool-fc": "premier-league-gb-eng",
  liverpool: "premier-league-gb-eng",
  "manchester-city": "premier-league-gb-eng",
  "manchester-united": "premier-league-gb-eng",
  "tottenham-hotspur": "premier-league-gb-eng",
  tottenham: "premier-league-gb-eng",
  "newcastle-united": "premier-league-gb-eng",
  "aston-villa": "premier-league-gb-eng",
  "brighton-and-hove-albion": "premier-league-gb-eng",
  brighton: "premier-league-gb-eng",
  "west-ham-united": "premier-league-gb-eng",
  "crystal-palace": "premier-league-gb-eng",
  "nottingham-forest": "premier-league-gb-eng",
  "everton-fc": "premier-league-gb-eng",
  everton: "premier-league-gb-eng",
  "fulham-fc": "premier-league-gb-eng",
  fulham: "premier-league-gb-eng",
  "brentford-fc": "premier-league-gb-eng",
  brentford: "premier-league-gb-eng",
  "afc-bournemouth": "premier-league-gb-eng",
  bournemouth: "premier-league-gb-eng",
  "wolverhampton-wanderers": "premier-league-gb-eng",
  wolves: "premier-league-gb-eng",
  "leicester-city": "premier-league-gb-eng",
  "ipswich-town": "premier-league-gb-eng",
  "southampton-fc": "premier-league-gb-eng",
  southampton: "premier-league-gb-eng",
  // Champion - Bundesliga.
  "fc-bayern-munchen": "bundesliga-de",
  "bayern-munchen": "bundesliga-de",
  "bayern-munich": "bundesliga-de",
  "bayer-04-leverkusen": "bundesliga-de",
  "bayer-leverkusen": "bundesliga-de",
  "rb-leipzig": "bundesliga-de",
  "eintracht-frankfurt": "bundesliga-de",
  "vfb-stuttgart": "bundesliga-de",
  "vfl-wolfsburg": "bundesliga-de",
  "borussia-monchengladbach": "bundesliga-de",
  "sc-freiburg": "bundesliga-de",
  "1-fc-union-berlin": "bundesliga-de",
  "union-berlin": "bundesliga-de",
  "werder-bremen": "bundesliga-de",
  "sv-werder-bremen": "bundesliga-de",
  "tsg-1899-hoffenheim": "bundesliga-de",
  hoffenheim: "bundesliga-de",
  "fc-augsburg": "bundesliga-de",
  "mainz-05": "bundesliga-de",
  "1-fsv-mainz-05": "bundesliga-de",
  "fc-st-pauli": "bundesliga-de",
  "holstein-kiel": "bundesliga-de",
  "vfl-bochum": "bundesliga-de",
  "1-fc-heidenheim": "bundesliga-de",
  heidenheim: "bundesliga-de",
  // Champion - LaLiga.
  "real-madrid-cf": "laliga-es",
  "real-madrid": "laliga-es",
  "fc-barcelona": "laliga-es",
  barcelona: "laliga-es",
  "atletico-madrid": "laliga-es",
  "real-sociedad": "laliga-es",
  "athletic-club": "laliga-es",
  "athletic-bilbao": "laliga-es",
  "sevilla-fc": "laliga-es",
  sevilla: "laliga-es",
  "valencia-cf": "laliga-es",
  valencia: "laliga-es",
  "real-betis": "laliga-es",
  "villarreal-cf": "laliga-es",
  villarreal: "laliga-es",
  "girona-fc": "laliga-es",
  girona: "laliga-es",
  "rc-celta": "laliga-es",
  "celta-vigo": "laliga-es",
  "ca-osasuna": "laliga-es",
  osasuna: "laliga-es",
  "rayo-vallecano": "laliga-es",
  "getafe-cf": "laliga-es",
  getafe: "laliga-es",
  "deportivo-alaves": "laliga-es",
  alaves: "laliga-es",
  "rcd-mallorca": "laliga-es",
  mallorca: "laliga-es",
  "ud-las-palmas": "laliga-es",
  "real-valladolid": "laliga-es",
  "cd-leganes": "laliga-es",
  leganes: "laliga-es",
  "espanyol-barcelona": "laliga-es",
  "rcd-espanyol": "laliga-es",
  // Champion - Serie A.
  "juventus-fc": "serie-a-it",
  juventus: "serie-a-it",
  "inter-milano": "serie-a-it",
  "inter-milan": "serie-a-it",
  "fc-internazionale-milano": "serie-a-it",
  "ac-milan": "serie-a-it",
  "ssc-napoli": "serie-a-it",
  napoli: "serie-a-it",
  "as-roma": "serie-a-it",
  roma: "serie-a-it",
  "ss-lazio": "serie-a-it",
  lazio: "serie-a-it",
  "atalanta-bc": "serie-a-it",
  atalanta: "serie-a-it",
  "acf-fiorentina": "serie-a-it",
  fiorentina: "serie-a-it",
  "bologna-fc-1909": "serie-a-it",
  bologna: "serie-a-it",
  "torino-fc": "serie-a-it",
  torino: "serie-a-it",
  "udinese-calcio": "serie-a-it",
  udinese: "serie-a-it",
  "us-sassuolo": "serie-a-it",
  sassuolo: "serie-a-it",
  "genoa-cfc": "serie-a-it",
  genoa: "serie-a-it",
  "hellas-verona": "serie-a-it",
  "empoli-fc": "serie-a-it",
  empoli: "serie-a-it",
  "cagliari-calcio": "serie-a-it",
  cagliari: "serie-a-it",
  "us-lecce": "serie-a-it",
  lecce: "serie-a-it",
  "parma-calcio-1913": "serie-a-it",
  parma: "serie-a-it",
  "como-1907": "serie-a-it",
  como: "serie-a-it",
  // Challenger - Eredivisie.
  "afc-ajax": "eredivisie-nl",
  ajax: "eredivisie-nl",
  "psv-eindhoven": "eredivisie-nl",
  feyenoord: "eredivisie-nl",
  "az-alkmaar": "eredivisie-nl",
  "fc-utrecht": "eredivisie-nl",
  "fc-twente": "eredivisie-nl",
  "sc-heerenveen": "eredivisie-nl",
  "sparta-rotterdam": "eredivisie-nl",
  "fc-groningen": "eredivisie-nl",
  "pec-zwolle": "eredivisie-nl",
  "go-ahead-eagles": "eredivisie-nl",
  "nec-nijmegen": "eredivisie-nl",
  "willem-ii": "eredivisie-nl",
  "nac-breda": "eredivisie-nl",
  "rkc-waalwijk": "eredivisie-nl",
  "fortuna-sittard": "eredivisie-nl",
  "heracles-almelo": "eredivisie-nl",
  // Challenger - Jupiler Pro League.
  "club-brugge": "belgium-pro-league",
  "rsc-anderlecht": "belgium-pro-league",
  "royal-antwerp-fc": "belgium-pro-league",
  "union-saint-gilloise": "belgium-pro-league",
  "krc-genk": "belgium-pro-league",
  "standard-liege": "belgium-pro-league",
  "kaa-gent": "belgium-pro-league",
  "ka-gent": "belgium-pro-league",
  gent: "belgium-pro-league",
  "kvc-westerlo": "belgium-pro-league",
  "kv-mechelen": "belgium-pro-league",
  "sporting-charleroi": "belgium-pro-league",
  "royal-charleroi-sc": "belgium-pro-league",
  "st-truidense-vv": "belgium-pro-league",
  "stvv": "belgium-pro-league",
  "oh-leuven": "belgium-pro-league",
  "oud-heverlee-leuven": "belgium-pro-league",
  "cercle-brugge": "belgium-pro-league",
  "kortrijk": "belgium-pro-league",
  "kv-kortrijk": "belgium-pro-league",
  "beerschot-va": "belgium-pro-league",
  // Challenger - Liga Portugal.
  "sl-benfica": "liga-portugal-pt",
  benfica: "liga-portugal-pt",
  "fc-porto": "liga-portugal-pt",
  "sporting-cp": "liga-portugal-pt",
  "sporting-lisbon": "liga-portugal-pt",
  "sc-braga": "liga-portugal-pt",
  braga: "liga-portugal-pt",
  "vitoria-sc": "liga-portugal-pt",
  "vitoria-guimaraes": "liga-portugal-pt",
  "fc-famalicao": "liga-portugal-pt",
  "rio-ave-fc": "liga-portugal-pt",
  "gil-vicente-fc": "liga-portugal-pt",
  "boavista-fc": "liga-portugal-pt",
  "estoril-praia": "liga-portugal-pt",
  "cd-nacional": "liga-portugal-pt",
  "casa-pia-ac": "liga-portugal-pt",
  // Challenger - Championship.
  "leeds-united": "championship-gb-eng",
  "burnley-fc": "championship-gb-eng",
  burnley: "championship-gb-eng",
  "sheffield-united": "championship-gb-eng",
  "sunderland-afc": "championship-gb-eng",
  sunderland: "championship-gb-eng",
  "middlesbrough-fc": "championship-gb-eng",
  middlesbrough: "championship-gb-eng",
  "west-bromwich-albion": "championship-gb-eng",
  "west-brom": "championship-gb-eng",
  "norwich-city": "championship-gb-eng",
  "coventry-city": "championship-gb-eng",
  "watford-fc": "championship-gb-eng",
  watford: "championship-gb-eng",
  "blackburn-rovers": "championship-gb-eng",
  "millwall-fc": "championship-gb-eng",
  millwall: "championship-gb-eng",
  "qpr": "championship-gb-eng",
  "queens-park-rangers": "championship-gb-eng",
  // Challenger - Super Lig.
  "galatasaray-sk": "super-lig",
  galatasaray: "super-lig",
  "fenerbahce-sk": "super-lig",
  fenerbahce: "super-lig",
  "besiktas-jk": "super-lig",
  besiktas: "super-lig",
  "trabzonspor": "super-lig",
  "istanbul-basaksehir": "super-lig",
  "basaksehir-fk": "super-lig",
  "adana-demirspor": "super-lig",
  "kasimpasa": "super-lig",
  "sivasspor": "super-lig",
  // Contender - MLS.
  "inter-miami-cf": "mls-us",
  "los-angeles-fc": "mls-us",
  "la-galaxy": "mls-us",
  "atlanta-united": "mls-us",
  "seattle-sounders-fc": "mls-us",
  "new-york-city-fc": "mls-us",
  "new-york-red-bulls": "mls-us",
  "fc-cincinnati": "mls-us",
  "columbus-crew": "mls-us",
  "orlando-city-sc": "mls-us",
  "philadelphia-union": "mls-us",
  "portland-timbers": "mls-us",
  "sporting-kansas-city": "mls-us",
  "st-louis-city-sc": "mls-us",
  "real-salt-lake": "mls-us",
  "austin-fc": "mls-us",
  "fc-dallas": "mls-us",
  "houston-dynamo": "mls-us",
  "minnesota-united-fc": "mls-us",
  "nashville-sc": "mls-us",
  "charlotte-fc": "mls-us",
  "toronto-fc": "mls-us",
  "cf-montreal": "mls-us",
  "chicago-fire": "mls-us",
  "dc-united": "mls-us",
  "new-england-revolution": "mls-us",
  "vancouver-whitecaps-fc": "mls-us",
  "san-jose-earthquakes": "mls-us",
  "colorado-rapids": "mls-us",
  // Contender - J-League.
  "kashima-antlers": "j-league",
  "urawa-red-diamonds": "j-league",
  "urawa-reds": "j-league",
  "yokohama-f-marinos": "j-league",
  "kawasaki-frontale": "j-league",
  "vissel-kobe": "j-league",
  "gamba-osaka": "j-league",
  "cerezo-osaka": "j-league",
  "nagoya-grampus": "j-league",
  "sanfrecce-hiroshima": "j-league",
  "fc-tokyo": "j-league",
  "kashiwa-reysol": "j-league",
  "avispa-fukuoka": "j-league",
  "shonan-bellmare": "j-league",
  "kyoto-sanga": "j-league",
  // Contender - K-League.
  "ulsan-hyundai": "k-league",
  "ulsan-hd": "k-league",
  "jeonbuk-hyundai-motors": "k-league",
  "fc-seoul": "k-league",
  "pohang-steelers": "k-league",
  "suwon-fc": "k-league",
  "daegu-fc": "k-league",
  "gangwon-fc": "k-league",
  "incheon-united": "k-league",
  "gwangju-fc": "k-league",
  "jeju-united": "k-league",
  "daejeon-hana-citizen": "k-league",
  // Contender - Brazil.
  "flamengo": "brasileirao",
  "cr-flamengo": "brasileirao",
  "palmeiras": "brasileirao",
  "se-palmeiras": "brasileirao",
  "sao-paulo-fc": "brasileirao",
  "sao-paulo": "brasileirao",
  "sc-corinthians": "brasileirao",
  corinthians: "brasileirao",
  "fluminense-fc": "brasileirao",
  fluminense: "brasileirao",
  "botafogo-fr": "brasileirao",
  botafogo: "brasileirao",
  "gremio-fbpa": "brasileirao",
  gremio: "brasileirao",
  "sc-internacional": "brasileirao",
  internacional: "brasileirao",
  "atletico-mineiro": "brasileirao",
  "cruzeiro-ec": "brasileirao",
  cruzeiro: "brasileirao",
  "santos-fc": "brasileirao",
  santos: "brasileirao",
  "vasco-da-gama": "brasileirao",
  // Contender - Argentina.
  "boca-juniors": "argentina-primera",
  "river-plate": "argentina-primera",
  "racing-club": "argentina-primera",
  "independiente": "argentina-primera",
  "san-lorenzo": "argentina-primera",
  "estudiantes-de-la-plata": "argentina-primera",
  "velez-sarsfield": "argentina-primera",
  "lanus": "argentina-primera",
  "rosario-central": "argentina-primera",
  "newells-old-boys": "argentina-primera",
  "argentinos-juniors": "argentina-primera",
  "talleres-cordoba": "argentina-primera",
  // Contender - Liga MX.
  "club-america": "liga-mx",
  "cf-monterrey": "liga-mx",
  monterrey: "liga-mx",
  "tigres-uanl": "liga-mx",
  "cd-guadalajara": "liga-mx",
  chivas: "liga-mx",
  "cruz-azul": "liga-mx",
  "club-universidad-nacional": "liga-mx",
  pumas: "liga-mx",
  "club-leon": "liga-mx",
  "club-santos-laguna": "liga-mx",
  "pachuca": "liga-mx",
  "toluca": "liga-mx",
  // Contender - other configured leagues.
  "celtic-fc": "scottish-premiership",
  celtic: "scottish-premiership",
  "rangers-fc": "scottish-premiership",
  rangers: "scottish-premiership",
  "heart-of-midlothian": "scottish-premiership",
  hearts: "scottish-premiership",
  "fc-basel": "swiss-super-league",
  "bsc-young-boys": "swiss-super-league",
  "young-boys": "swiss-super-league",
  "fc-zurich": "swiss-super-league",
  "servette-fc": "swiss-super-league",
  "fc-lugano": "swiss-super-league",
  "red-bull-salzburg": "austrian-bundesliga",
  "fc-red-bull-salzburg": "austrian-bundesliga",
  "sk-rapid-wien": "austrian-bundesliga",
  "rapid-vienna": "austrian-bundesliga",
  "sturm-graz": "austrian-bundesliga",
  "lask-linz": "austrian-bundesliga",
  "austria-wien": "austrian-bundesliga",
};
const PLAY_GAMEWEEK_COMPETITIONS_V1: PlayGameWeekCompetitionV1[] = [
  {
    id: "all-star",
    label: "All-Star",
    type: "global",
    category: "global",
    rarityAllowed: PLAY_RARITIES_V1,
    eligibleLeagues: [],
    eligiblePositions: PLAY_ALL_POSITIONS_V1,
    minCards: 5,
    maxCards: 7,
    defaultCards: 5,
    rulesDescription: "Toutes ligues disponibles dans tes cartes, selon rareté sélectionnée.",
    isActive: true,
    futureRulesPlaceholder: "Brancher règles dynamiques Sorare et contraintes spéciales All-Star.",
  },
  {
    id: "champion",
    label: "Champion",
    type: "regional",
    category: "regional",
    rarityAllowed: PLAY_RARITIES_V1,
    eligibleLeagues: ["premier-league", "premier-league-gb-eng", "laliga", "laliga-es", "bundesliga", "bundesliga-de", "serie-a", "serie-a-it", "ligue-1", "ligue-1-fr"],
    eligiblePositions: PLAY_ALL_POSITIONS_V1,
    minCards: 5,
    maxCards: 7,
    defaultCards: 5,
    rulesDescription: "Ligues champion majeures uniquement, selon rareté sélectionnée.",
    isActive: true,
    futureRulesPlaceholder: "Synchroniser la liste officielle Champion Sorare par Game Week.",
  },
  {
    id: "challenger",
    label: "Challenger",
    type: "regional",
    category: "regional",
    rarityAllowed: PLAY_RARITIES_V1,
    eligibleLeagues: ["eredivisie", "eredivisie-nl", "jupiler-pro-league", "belgium-pro-league", "liga-portugal", "liga-portugal-pt", "championship", "championship-gb-eng", "super-lig"],
    eligiblePositions: PLAY_ALL_POSITIONS_V1,
    minCards: 5,
    maxCards: 7,
    defaultCards: 5,
    rulesDescription: "Ligues Challenger configurées localement, extensibles.",
    isActive: true,
    futureRulesPlaceholder: "Remplacer par les règles Challenger exactes et évolutives.",
  },
  {
    id: "contender",
    label: "Contender",
    type: "regional",
    category: "regional",
    rarityAllowed: PLAY_RARITIES_V1,
    eligibleLeagues: ["mls", "mls-us", "mlspa", "j-league", "k-league", "brasileirao", "argentina-primera", "liga-mx", "scottish-premiership", "swiss-super-league", "austrian-bundesliga"],
    eligiblePositions: PLAY_ALL_POSITIONS_V1,
    minCards: 5,
    maxCards: 7,
    defaultCards: 5,
    rulesDescription: "Ligues Contender configurées localement, extensibles.",
    isActive: true,
    futureRulesPlaceholder: "Brancher les règles officielles Contender par calendrier.",
  },
  {
    id: "u23",
    label: "U23",
    type: "age",
    category: "age",
    rarityAllowed: PLAY_RARITIES_V1,
    eligibleLeagues: [],
    eligiblePositions: PLAY_ALL_POSITIONS_V1,
    minCards: 5,
    maxCards: 7,
    defaultCards: 5,
    rulesDescription: "Joueurs de 23 ans ou moins quand l'âge est disponible.",
    isActive: true,
    futureRulesPlaceholder: "Ajouter date de naissance officielle et exceptions Game Week.",
  },
  {
    id: "arena",
    label: "Arena",
    type: "arena",
    category: "arena",
    rarityAllowed: PLAY_RARITIES_V1,
    eligibleLeagues: [],
    eligiblePositions: PLAY_ALL_POSITIONS_V1,
    minCards: 5,
    maxCards: 7,
    defaultCards: 5,
    rulesDescription: "Format Arena local prêt à recevoir les contraintes dynamiques.",
    isActive: true,
    futureRulesPlaceholder: "Brancher contraintes Arena officielles.",
  },
  { id: "mls", label: "MLS", type: "league", category: "league", rarityAllowed: PLAY_RARITIES_V1, eligibleLeagues: ["mls", "mls-us", "mlspa"], eligiblePositions: PLAY_ALL_POSITIONS_V1, minCards: 5, maxCards: 7, defaultCards: 5, rulesDescription: "Cartes MLS uniquement.", isActive: true, futureRulesPlaceholder: "Ajouter règles MLS dynamiques." },
  { id: "ligue-1", label: "Ligue 1", type: "league", category: "league", rarityAllowed: PLAY_RARITIES_V1, eligibleLeagues: ["ligue-1", "ligue-1-fr"], eligiblePositions: PLAY_ALL_POSITIONS_V1, minCards: 5, maxCards: 7, defaultCards: 5, rulesDescription: "Cartes Ligue 1 uniquement.", isActive: true, futureRulesPlaceholder: "Ajouter règles Ligue 1 dynamiques." },
  { id: "premier-league", label: "Premier League", type: "league", category: "league", rarityAllowed: PLAY_RARITIES_V1, eligibleLeagues: ["premier-league", "premier-league-gb-eng"], eligiblePositions: PLAY_ALL_POSITIONS_V1, minCards: 5, maxCards: 7, defaultCards: 5, rulesDescription: "Cartes Premier League uniquement.", isActive: true, futureRulesPlaceholder: "Ajouter règles Premier League dynamiques." },
  { id: "bundesliga", label: "Bundesliga", type: "league", category: "league", rarityAllowed: PLAY_RARITIES_V1, eligibleLeagues: ["bundesliga", "bundesliga-de"], eligiblePositions: PLAY_ALL_POSITIONS_V1, minCards: 5, maxCards: 7, defaultCards: 5, rulesDescription: "Cartes Bundesliga uniquement.", isActive: true, futureRulesPlaceholder: "Ajouter règles Bundesliga dynamiques." },
  { id: "laliga", label: "LaLiga", type: "league", category: "league", rarityAllowed: PLAY_RARITIES_V1, eligibleLeagues: ["laliga", "laliga-es"], eligiblePositions: PLAY_ALL_POSITIONS_V1, minCards: 5, maxCards: 7, defaultCards: 5, rulesDescription: "Cartes LaLiga uniquement.", isActive: true, futureRulesPlaceholder: "Ajouter règles LaLiga dynamiques." },
  { id: "serie-a", label: "Serie A", type: "league", category: "league", rarityAllowed: PLAY_RARITIES_V1, eligibleLeagues: ["serie-a", "serie-a-it"], eligiblePositions: PLAY_ALL_POSITIONS_V1, minCards: 5, maxCards: 7, defaultCards: 5, rulesDescription: "Cartes Serie A uniquement.", isActive: true, futureRulesPlaceholder: "Ajouter règles Serie A dynamiques." },
  { id: "eredivisie", label: "Eredivisie", type: "league", category: "league", rarityAllowed: PLAY_RARITIES_V1, eligibleLeagues: ["eredivisie", "eredivisie-nl"], eligiblePositions: PLAY_ALL_POSITIONS_V1, minCards: 5, maxCards: 7, defaultCards: 5, rulesDescription: "Cartes Eredivisie uniquement.", isActive: true, futureRulesPlaceholder: "Ajouter règles Eredivisie dynamiques." },
  { id: "jupiler-pro-league", label: "Jupiler Pro League", type: "league", category: "league", rarityAllowed: PLAY_RARITIES_V1, eligibleLeagues: ["jupiler-pro-league", "belgium-pro-league"], eligiblePositions: PLAY_ALL_POSITIONS_V1, minCards: 5, maxCards: 7, defaultCards: 5, rulesDescription: "Cartes Jupiler Pro League uniquement.", isActive: true, futureRulesPlaceholder: "Ajouter règles Jupiler Pro League dynamiques." },
];

const slotLayout: Record<SlotKey, { x: number; y: number }> = {
  GK: { x: 0.5, y: 0.045 },
  DEF: { x: 0.36, y: 0.305 },
  MID: { x: 0.64, y: 0.305 },
  FWD: { x: 0.36, y: 0.662 },
  FLEX: { x: 0.64, y: 0.662 },
};

const mockPlayers: CoachPlayer[] = [
  {
    id: "mock-haaland",
    slug: "erling-haaland",
    name: "Haaland",
    position: "GK",
    match: "vs ATA",
    club: "Manchester City",
    pictureUrl: "https://cdn.sofifa.net/players/239/085/26_240.png",
    score: 71,
    aiScore: 86,
    confidence: 84,
    colors: ["#77b8f2", "#1f78be"],
    stats: {
      l5: 73,
      l15: 69,
      l40: 68,
      probableStart: 92,
      injuryRisk: 4,
      suspensionRisk: 2,
      difficulty: 38,
      minutes: 88,
      ceiling: 96,
      upside: 90,
      ownership: 64,
    },
    reasons: ["Titularisation très probable", "Ceiling haut sur les actions décisives", "L15 stable malgré un match exigeant"],
  },
  {
    id: "mock-donnarumma",
    slug: "gianluigi-donnarumma",
    name: "Donnarumma",
    position: "DEF",
    match: "vs BRE",
    club: "PSG",
    pictureUrl: "https://cdn.sofifa.net/players/230/621/26_240.png",
    score: 69,
    aiScore: 81,
    confidence: 85,
    colors: ["#35b875", "#0c642f"],
    stats: {
      l5: 68,
      l15: 66,
      l40: 64,
      probableStart: 94,
      injuryRisk: 3,
      suspensionRisk: 1,
      difficulty: 34,
      minutes: 90,
      ceiling: 82,
      upside: 70,
      ownership: 52,
    },
    reasons: ["Minutes solides", "Matchup favorable", "Très faible risque de rotation"],
  },
  {
    id: "mock-palmer",
    slug: "cole-palmer",
    name: "Palmer",
    position: "MID",
    match: "vs BHA",
    club: "Chelsea",
    pictureUrl: "https://cdn.sofifa.net/players/257/534/26_240.png",
    score: 72,
    aiScore: 84,
    confidence: 83,
    colors: ["#1f63d1", "#062f7e"],
    stats: {
      l5: 74,
      l15: 70,
      l40: 66,
      probableStart: 88,
      injuryRisk: 5,
      suspensionRisk: 2,
      difficulty: 42,
      minutes: 84,
      ceiling: 91,
      upside: 86,
      ownership: 58,
    },
    reasons: ["Forme récente en hausse", "Fort volume offensif", "Bon équilibre plancher / plafond"],
  },
  {
    id: "mock-salah",
    slug: "mohamed-salah",
    name: "Salah",
    position: "FWD",
    match: "@ MUN",
    club: "Liverpool",
    pictureUrl: "https://cdn.sofifa.net/players/209/331/26_240.png",
    score: 90,
    aiScore: 88,
    confidence: 80,
    colors: ["#e32832", "#8a0d14"],
    stats: {
      l5: 82,
      l15: 77,
      l40: 74,
      probableStart: 90,
      injuryRisk: 4,
      suspensionRisk: 3,
      difficulty: 55,
      minutes: 86,
      ceiling: 98,
      upside: 94,
      ownership: 71,
    },
    reasons: ["Potentiel décisif premium", "L5 supérieur au groupe", "Ceiling maximal de la compo"],
  },
  {
    id: "mock-openda",
    slug: "lois-openda",
    name: "Openda",
    position: "FWD",
    match: "@ LEE",
    club: "Leipzig",
    pictureUrl: "https://cdn.sofifa.net/players/252/371/26_240.png",
    score: 84,
    aiScore: 79,
    confidence: 78,
    colors: ["#efefef", "#1f1f1f"],
    stats: {
      l5: 70,
      l15: 68,
      l40: 65,
      probableStart: 82,
      injuryRisk: 6,
      suspensionRisk: 2,
      difficulty: 45,
      minutes: 80,
      ceiling: 90,
      upside: 88,
      ownership: 38,
    },
    reasons: ["Différentiel utile en FLEX", "Upside supérieur à son ownership", "Match ouvert attendu"],
  },
  {
    id: "mock-martinez",
    slug: "emiliano-martinez",
    name: "Martinez",
    position: "GK",
    match: "vs REN",
    club: "Aston Villa",
    pictureUrl: "https://cdn.sofifa.net/players/202/811/26_240.png",
    score: 76,
    aiScore: 77,
    confidence: 76,
    colors: ["#ffd21f", "#755000"],
    stats: {
      l5: 62,
      l15: 65,
      l40: 67,
      probableStart: 95,
      injuryRisk: 2,
      suspensionRisk: 1,
      difficulty: 40,
      minutes: 90,
      ceiling: 79,
      upside: 63,
      ownership: 45,
    },
    reasons: ["Plancher sécurisé", "Minutes verrouillées", "Bonne alternative si tu veux baisser le risque"],
  },
  {
    id: "mock-theo",
    slug: "theo-hernandez",
    name: "T. Hernandez",
    position: "DEF",
    match: "vs BRE",
    club: "Milan",
    pictureUrl: "https://cdn.sofifa.net/players/226/161/26_240.png",
    score: 68,
    aiScore: 75,
    confidence: 73,
    colors: ["#f5f5f5", "#111111"],
    stats: {
      l5: 65,
      l15: 63,
      l40: 62,
      probableStart: 84,
      injuryRisk: 7,
      suspensionRisk: 3,
      difficulty: 37,
      minutes: 80,
      ceiling: 84,
      upside: 77,
      ownership: 49,
    },
    reasons: ["Profil offensif depuis la défense", "Matchup exploitable", "Alternative plus agressive"],
  },
  {
    id: "mock-eze",
    slug: "eberechi-eze",
    name: "Eze",
    position: "MID",
    match: "@ MCI",
    club: "Crystal Palace",
    pictureUrl: "https://cdn.sofifa.net/players/242/964/26_240.png",
    score: 66,
    aiScore: 74,
    confidence: 69,
    colors: ["#1b1b1b", "#eb7a1d"],
    stats: {
      l5: 69,
      l15: 64,
      l40: 61,
      probableStart: 82,
      injuryRisk: 7,
      suspensionRisk: 2,
      difficulty: 66,
      minutes: 78,
      ceiling: 91,
      upside: 92,
      ownership: 21,
    },
    reasons: ["Faible ownership", "Ceiling supérieur au risque", "Profil différentiel clair"],
  },
  {
    id: "mock-jackson",
    slug: "nicolas-jackson",
    name: "Jackson",
    position: "FWD",
    match: "vs NAP",
    club: "Chelsea",
    pictureUrl: "https://cdn.sofifa.net/players/265/450/26_240.png",
    score: 64,
    aiScore: 72,
    confidence: 70,
    colors: ["#111111", "#bd7a04"],
    stats: {
      l5: 63,
      l15: 61,
      l40: 59,
      probableStart: 80,
      injuryRisk: 8,
      suspensionRisk: 3,
      difficulty: 47,
      minutes: 76,
      ceiling: 86,
      upside: 84,
      ownership: 28,
    },
    reasons: ["Upside intéressant", "Bonne option si tu cherches un boost", "Risque contenu par le volume"],
  },
  {
    id: "mock-rutter",
    slug: "georginio-rutter",
    name: "Rutter",
    position: "FWD",
    match: "@ LEE",
    club: "Brighton",
    pictureUrl: "https://cdn.sofifa.net/players/258/729/26_240.png",
    score: 63,
    aiScore: 70,
    confidence: 68,
    colors: ["#ffc400", "#0c0c0c"],
    stats: {
      l5: 61,
      l15: 60,
      l40: 58,
      probableStart: 76,
      injuryRisk: 9,
      suspensionRisk: 2,
      difficulty: 44,
      minutes: 74,
      ceiling: 84,
      upside: 82,
      ownership: 19,
    },
    reasons: ["Ownership très bas", "Remplaçant agressif pour chasing", "Match compatible avec un scénario upside"],
  },
];

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function hashValue(input: string, salt = 0) {
  let hash = 2166136261 + salt;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
}

function metric(input: string, min: number, max: number, salt: number) {
  const span = max - min;
  return min + (hashValue(input, salt) % (span + 1));
}

function normalizePosition(value: unknown): Exclude<SlotKey, "FLEX"> {
  const raw = String(value ?? "").toLowerCase();
  if (raw.includes("gk") || raw.includes("goal")) return "GK";
  if (raw.includes("def")) return "DEF";
  if (raw.includes("mid")) return "MID";
  if (raw.includes("fwd") || raw.includes("forward") || raw.includes("att")) return "FWD";
  return "FWD";
}

function xsPlayRuleKeyV1(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getCardRarity(card: SorareCard): PlayRarityV1 | null {
  const raw = xsPlayRuleKeyV1(
    card.rarity ??
      card.cardRarity ??
      card.rarityTyped ??
      card.rarityName ??
      card.card?.rarity ??
      card.token?.rarity ??
      card.raw?.rarity ??
      card.slug ??
      card.id
  );
  if (raw.includes("super-rare") || raw.includes("superrare")) return "Super Rare";
  if (raw.includes("unique")) return "Unique";
  if (raw.includes("limited")) return "Limited";
  if (raw.includes("rare")) return "Rare";
  return null;
}

function getCardLeagueSlug(card: SorareCard): string | null {
  const values = [
    card.leagueSlug,
    card.league?.slug,
    card.activeLeague?.slug,
    card.competitionSlug,
    card.leagueName,
    card.competition,
    card.competitionName,
    card.tournamentName,
    card.raw?.leagueSlug,
    card.raw?.leagueName,
    card.team?.leagueSlug,
    card.team?.leagueName,
    card.club?.leagueSlug,
    card.club?.leagueName,
    card.anyPlayer?.activeClub?.domesticLeague?.slug,
    card.player?.activeClub?.domesticLeague?.slug,
  ];
  const direct = values.map(xsPlayRuleKeyV1).find(Boolean);
  if (direct) return direct;

  const clubValues = [
    card.clubSlug,
    card.teamSlug,
    card.clubName,
    card.teamName,
    card.club?.slug,
    card.club?.name,
    card.team?.slug,
    card.team?.name,
    card.anyPlayer?.activeClub?.slug,
    card.anyPlayer?.activeClub?.name,
    card.player?.activeClub?.slug,
    card.player?.activeClub?.name,
  ];
  const clubKey = clubValues.map(xsPlayRuleKeyV1).find((key) => key && PLAY_CLUB_LEAGUE_FALLBACK_V1[key]);
  return clubKey ? PLAY_CLUB_LEAGUE_FALLBACK_V1[clubKey] : null;
}

function xsPlayCardLeagueKeysV1(card: SorareCard) {
  return [
    getCardLeagueSlug(card),
    card.leagueSlug,
    card.leagueName,
    card.competition,
    card.competitionName,
    card.tournamentName,
    card.team?.leagueName,
    card.club?.leagueName,
  ].map(xsPlayRuleKeyV1).filter(Boolean);
}

function getCardPosition(card: SorareCard): Exclude<SlotKey, "FLEX"> {
  return normalizePosition(
    card.positionRaw ??
      card.position ??
      card.player?.position ??
      card.anyPlayer?.position ??
      card.raw?.position ??
      card.raw?.player?.position
  );
}

function getCardPlayerAge(card: SorareCard): number | null {
  const direct = Number(card.age ?? card.playerAge ?? card.anyPlayer?.age ?? card.player?.age ?? card.raw?.age ?? card.raw?.player?.age);
  if (Number.isFinite(direct) && direct > 0) return direct;
  const birth = String(
    card.birthDate ??
      card.dateOfBirth ??
      card.anyPlayer?.birthDate ??
      card.anyPlayer?.dateOfBirth ??
      card.player?.birthDate ??
      card.player?.dateOfBirth ??
      card.raw?.birthDate ??
      card.raw?.player?.birthDate ??
      ""
  );
  const year = Number(birth.slice(0, 4));
  if (!Number.isFinite(year) || year <= 1900) return null;
  return new Date().getFullYear() - year;
}

function xsPlayCardMergeKeyV1(card: any, index = 0): string {
  return String(
    card?.cardSlug ??
      card?.slug ??
      card?.cardId ??
      card?.id ??
      card?.playerSlug ??
      card?.player?.slug ??
      card?.anyPlayer?.slug ??
      `play-card-${index}`
  ).trim().toLowerCase();
}

function xsPlayMergeBackendGalleryV1(cacheCards: SorareCard[], backendCards: SorareCard[]): SorareCard[] {
  const cache = Array.isArray(cacheCards) ? cacheCards : [];
  const backend = Array.isArray(backendCards) ? backendCards : [];
  if (!backend.length) return cache;
  const cacheByKey = new Map(cache.map((card, index) => [xsPlayCardMergeKeyV1(card, index), card]));
  const used = new Set<string>();
  const merged = backend.map((card, index) => {
    const key = xsPlayCardMergeKeyV1(card, index);
    used.add(key);
    return {
      ...(cacheByKey.get(key) || {}),
      ...card,
    };
  });
  cache.forEach((card, index) => {
    const key = xsPlayCardMergeKeyV1(card, index);
    if (!used.has(key)) merged.push(card);
  });
  return merged;
}

async function xsPlayReadDeviceIdV1(): Promise<string | null> {
  const candidates = [
    "xs_device_id",
    "XS_JWT_DEVICE_ID_V1",
    "xs_device_id_v1",
  ];
  for (const key of candidates) {
    const value = await AsyncStorage.getItem(key).catch(() => null);
    const text = String(value || "").trim();
    if (text) return text;
  }
  return null;
}

function getCardIneligibilityReasons(card: SorareCard, competition: PlayGameWeekCompetitionV1, rarity: PlayRarityV1) {
  const reasons: string[] = [];
  const cardRarity = getCardRarity(card);
  if (!cardRarity) reasons.push("donnée manquante");
  else if (cardRarity !== rarity || !competition.rarityAllowed.includes(cardRarity)) reasons.push("mauvaise rareté");

  const position = getCardPosition(card);
  if (!competition.eligiblePositions.includes(position) && !competition.eligiblePositions.includes("FLEX")) reasons.push("poste non autorisé");

  if (competition.type === "age") {
    const age = getCardPlayerAge(card);
    if (age == null) reasons.push("âge U23 non confirmé");
    else if (age > 23) reasons.push("âge U23 non confirmé");
  }

  if (competition.eligibleLeagues.length) {
    const leagueKeys = xsPlayCardLeagueKeysV1(card);
    const allowed = competition.eligibleLeagues.map(xsPlayRuleKeyV1);
    if (!leagueKeys.length) reasons.push("donnée manquante");
    else if (!leagueKeys.some((key) => allowed.includes(key))) reasons.push("mauvaise ligue");
  }

  return [...new Set(reasons)];
}

function isCardEligibleForCompetition(card: SorareCard, competition: PlayGameWeekCompetitionV1, rarity: PlayRarityV1) {
  return getCardIneligibilityReasons(card, competition, rarity).length === 0;
}

function getRequiredCardsCount(competition: PlayGameWeekCompetitionV1) {
  return Math.max(competition.minCards, Math.min(competition.defaultCards, competition.maxCards));
}

function getSelectedLineupCards(slots: GeneratedLineup["slots"]) {
  return slots
    .filter((item) => !item.player.rawCard?.isEmptySlot)
    .map((item) => ({ slot: item.slot, player: item.player, card: item.player.rawCard || null }));
}

function xsPlayCardStableIdV1(card: SorareCard | null | undefined, player: CoachPlayer) {
  return String(card?.cardId ?? card?.id ?? card?.slug ?? card?.token?.slug ?? player.id ?? "").trim();
}

function validateLineupForCompetition(
  slots: GeneratedLineup["slots"],
  competition: PlayGameWeekCompetitionV1,
  rarity: PlayRarityV1
): PlayLineupValidationV1 {
  const requiredCardsCount = getRequiredCardsCount(competition);
  const selectedCards = getSelectedLineupCards(slots);
  const errors: string[] = [];
  const warnings: string[] = [];
  const invalidCards: PlayLineupValidationV1["invalidCards"] = [];
  const seen = new Set<string>();
  let validCardsCount = 0;
  const missingSlots = slots.filter((item) => item.player.rawCard?.isEmptySlot).length;

  if (selectedCards.length < requiredCardsCount) {
    errors.push(`Composition incomplète : ajoute encore ${requiredCardsCount - selectedCards.length} carte(s) éligible(s).`);
  }
  if (selectedCards.length > competition.maxCards) {
    errors.push(`Trop de cartes sélectionnées : maximum ${competition.maxCards}.`);
  }
  if (selectedCards.length !== competition.defaultCards) {
    warnings.push(`Format attendu : ${competition.defaultCards} carte(s).`);
  }
  if (missingSlots > 0) {
    errors.push(`${missingSlots} slot(s) vide(s).`);
  }

  selectedCards.forEach(({ slot, player, card }) => {
    const cardSlug = xsPlayCardStableIdV1(card, player);
    const reasons = card ? getCardIneligibilityReasons(card, competition, rarity) : ["donnée manquante"];
    if (cardSlug) {
      if (seen.has(cardSlug)) reasons.push("doublon carte");
      seen.add(cardSlug);
    }
    if (!cardSlug) reasons.push("donnée manquante");

    const uniqueReasons = [...new Set(reasons)];
    if (uniqueReasons.length) {
      invalidCards.push({ slotId: slot, playerName: player.name, cardSlug: cardSlug || undefined, reasons: uniqueReasons });
      return;
    }
    validCardsCount += 1;
  });

  if (invalidCards.length) {
    errors.push(`${invalidCards.length} carte(s) invalide(s).`);
  }
  if (validCardsCount > competition.maxCards) {
    errors.push(`Nombre de cartes valides supérieur au maximum ${competition.maxCards}.`);
  }

  const isValid = errors.length === 0 && validCardsCount >= requiredCardsCount && validCardsCount <= competition.maxCards;
  return {
    isValid,
    severity: isValid ? (warnings.length ? "warning" : "valid") : "error",
    validCardsCount,
    requiredCardsCount,
    maxCards: competition.maxCards,
    errors: [...new Set(errors)],
    warnings: [...new Set(warnings)],
    missingSlots,
    invalidCards,
  };
}

function getLineupValidationMessages(validation: PlayLineupValidationV1) {
  if (validation.isValid) return ["Ta composition est prête."];
  const missing = Math.max(0, validation.requiredCardsCount - validation.validCardsCount);
  if (missing > 0) return [`Il manque ${missing} carte(s) éligible(s).`];
  if (validation.invalidCards.length) return ["Certaines cartes ne respectent pas les règles."];
  return ["Composition invalide pour cette Game Week."];
}

function xsPlayMissingSlotsLabelV1(validation: PlayLineupValidationV1) {
  const slots = validation.invalidCards
    .filter((item) => item.reasons.includes("donnée manquante"))
    .map((item) => item.slotId)
    .filter(Boolean);
  return [...new Set(slots)].join(", ");
}

function xsPlayBlockedReasonV1(validation: PlayLineupValidationV1) {
  return validation.isValid ? "" : getLineupValidationMessages(validation)[0] || "Composition invalide pour cette Game Week.";
}

function xsPlaySlotsForCompetitionV1(competition: PlayGameWeekCompetitionV1): SlotKey[] {
  const base: SlotKey[] = ["GK", "DEF", "MID", "FWD", "FLEX"];
  return base.slice(0, Math.max(competition.minCards, Math.min(competition.defaultCards, competition.maxCards, base.length)));
}

function xsPlayEmptySlotPlayerV1(slot: SlotKey): CoachPlayer {
  return {
    id: `empty-${slot}`,
    slug: `empty-${slot}`,
    name: "Ajouter",
    position: slot === "FLEX" ? "FWD" : slot,
    match: "Slot libre",
    club: "Carte éligible",
    pictureUrl: "",
    score: 0,
    aiScore: 0,
    confidence: 0,
    colors: ["#151515", "#2A1015"],
    stats: { l5: 0, l15: 0, l40: 0, probableStart: 0, injuryRisk: 0, suspensionRisk: 0, difficulty: 0, minutes: 0, ceiling: 0, upside: 0, ownership: 0 },
    reasons: ["Aucune carte éligible disponible pour ce slot."],
    rawCard: { isEmptySlot: true },
  };
}

function readableName(card: SorareCard) {
  const explicit = String(card.playerName ?? "").trim();
  if (explicit) return explicit.split(" ").slice(-1)[0] || explicit;
  const fromSlug = String(card.playerSlug ?? card.slug ?? "Joueur").replace(/-/g, " ");
  return fromSlug
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function buildGalleryCandidates(gallery: SorareCard[], allowMockFallback = true): CoachPlayer[] {
  if (!Array.isArray(gallery) || gallery.length < 5) return allowMockFallback ? mockPlayers : [];

  const colors: [string, string][] = [
    ["#77b8f2", "#1f78be"],
    ["#35b875", "#0c642f"],
    ["#1f63d1", "#062f7e"],
    ["#e32832", "#8a0d14"],
    ["#efefef", "#1f1f1f"],
    ["#ffd21f", "#755000"],
    ["#1b1b1b", "#eb7a1d"],
  ];

  const mapped = gallery.slice(0, 80).map((card, index) => {
    const key = String(card.slug ?? card.id ?? `gallery-${index}`);
    const pos = getCardPosition(card);
    const l5 = metric(key, 56, 88, 5);
    const l15 = metric(key, 55, 84, 15);
    const l40 = metric(key, 52, 80, 40);
    const probableStart = metric(key, 68, 96, 2);
    const injuryRisk = metric(key, 2, 16, 3);
    const suspensionRisk = metric(key, 1, 9, 4);
    const difficulty = metric(key, 28, 68, 6);
    const minutes = metric(key, 62, 92, 7);
    const ceiling = metric(key, 76, 99, 8);
    const upside = metric(key, 60, 96, 9);
    const ownership = metric(key, 15, 74, 10);
    const aiScore = Math.round(
      l5 * 0.26 +
        l15 * 0.22 +
        l40 * 0.12 +
        probableStart * 0.12 +
        minutes * 0.12 +
        ceiling * 0.1 +
        upside * 0.08 -
        difficulty * 0.08 -
        injuryRisk * 0.1 -
        suspensionRisk * 0.08
    );
    const name = readableName(card);

    return {
      id: key,
      slug: key,
      name,
      position: pos,
      match: metric(key, 0, 1, 22) ? "vs BHA" : "@ LEE",
      club: String(card.teamName ?? "Club"),
      pictureUrl: String(card.pictureUrl ?? card.avatarUrl ?? ""),
      score: Math.max(52, Math.min(96, Math.round((l5 + l15) / 2))),
      aiScore: Math.max(55, Math.min(96, aiScore)),
      confidence: Math.max(58, Math.min(94, Math.round((probableStart + minutes + 100 - injuryRisk - suspensionRisk) / 3))),
      colors: colors[index % colors.length],
      stats: { l5, l15, l40, probableStart, injuryRisk, suspensionRisk, difficulty, minutes, ceiling, upside, ownership },
      reasons: [
        l5 >= l15 ? "Forme récente positive" : "Profil stable sur L15",
        difficulty < 45 ? "Matchup favorable" : "Match difficile compensé par le ceiling",
        ownership < 35 ? "Ownership faible" : "Temps de jeu fiable",
      ],
      rawCard: card,
    };
  });

  const hasCore = ["GK", "DEF", "MID", "FWD"].every((position) => mapped.some((player) => player.position === position));
  return hasCore ? mapped : (allowMockFallback ? mockPlayers : mapped);
}

function scoreForStrategy(player: CoachPlayer, strategy: StrategyKey, mode: ModeKey) {
  const s = player.stats;
  const capPenalty = mode === "classic" ? 0 : mode === "cap240" ? player.score * 0.025 : player.score * 0.045;
  if (strategy === "safe") {
    return (
      s.l15 * 0.28 +
      s.l40 * 0.18 +
      s.probableStart * 0.2 +
      s.minutes * 0.18 -
      s.injuryRisk * 0.32 -
      s.suspensionRisk * 0.24 -
      s.difficulty * 0.08 -
      capPenalty
    );
  }
  if (strategy === "differential") {
    return (
      s.ceiling * 0.24 +
      s.upside * 0.28 +
      s.l5 * 0.18 +
      (100 - s.ownership) * 0.18 -
      s.difficulty * 0.08 -
      s.injuryRisk * 0.16 -
      capPenalty
    );
  }
  return (
    s.l5 * 0.22 +
    s.l15 * 0.2 +
    s.l40 * 0.1 +
    s.probableStart * 0.16 +
    s.minutes * 0.12 +
    s.ceiling * 0.1 +
    s.upside * 0.1 -
    s.difficulty * 0.08 -
    s.injuryRisk * 0.14 -
    s.suspensionRisk * 0.08 -
    capPenalty
  );
}

function pickForSlot(candidates: CoachPlayer[], used: Set<string>, slot: SlotKey, strategy: StrategyKey, mode: ModeKey) {
  const compatible = candidates
    .filter((player) => {
      if (used.has(player.id)) return false;
      if (slot === "FLEX") return player.position !== "GK";
      return player.position === slot;
    })
    .sort((a, b) => scoreForStrategy(b, strategy, mode) - scoreForStrategy(a, strategy, mode));

  return compatible[0] ?? xsPlayEmptySlotPlayerV1(slot);
}

function generateLineup(candidates: CoachPlayer[], strategy: StrategyKey, mode: ModeKey, competition: PlayGameWeekCompetitionV1 = PLAY_GAMEWEEK_COMPETITIONS_V1[0]): GeneratedLineup {
  const used = new Set<string>();
  const slots = xsPlaySlotsForCompetitionV1(competition).map((slot) => {
    const player = pickForSlot(candidates, used, slot, strategy, mode);
    used.add(player.id);
    return { slot, player };
  });

  const strategyMeta = strategies.find((item) => item.key === strategy) ?? strategies[1];
  const baseProjected = Math.round(slots.reduce((sum, item) => sum + item.player.score, 0) * 0.75);
  const isMockBalanced =
    strategy === "balanced" &&
    slots[0]?.player.id === "mock-haaland" &&
    slots[1]?.player.id === "mock-donnarumma" &&
    slots[2]?.player.id === "mock-palmer";
  const modeBoost = mode === "classic" ? 0 : mode === "cap240" ? -8 : -15;
  const projected = isMockBalanced ? 289 + modeBoost : Math.max(210, baseProjected + (strategy === "differential" ? 14 : strategy === "safe" ? -6 : 5));
  const confidence = Math.round(slots.reduce((sum, item) => sum + item.player.confidence, 0) / slots.length);

  return {
    strategy,
    title: strategyMeta.title,
    projected,
    confidence: strategyMeta.percent,
    secureScore: Math.max(190, Math.round(projected * 0.82)),
    maxScore: Math.round(projected * (strategy === "differential" ? 1.32 : strategy === "safe" ? 1.12 : 1.22)),
    slots,
  };
}

function modeToApiMode(mode: ModeKey) {
  return mode === "classic" ? "classic" : "cap";
}

function xsPlayAiLineupCardsV1(lineup: GeneratedLineup) {
  return lineup.slots.map((item) => {
    const card = item.player.rawCard || {};
    const nextMatch = card.nextMatch && typeof card.nextMatch === "object" ? card.nextMatch : null;
    return {
      slot: item.slot,
      playerSlug: card.playerSlug ?? card.anyPlayer?.slug ?? card.player?.slug ?? item.player.slug,
      cardId: card.cardId ?? card.id ?? card.slug ?? item.player.id,
      name: card.playerName ?? card.displayName ?? card.name ?? item.player.name,
      position: card.position ?? card.positionRaw ?? item.player.position,
      l5: card.averages?.l5 ?? card.l5 ?? item.player.stats.l5,
      l15: card.averages?.l15 ?? card.l15 ?? item.player.stats.l15,
      l40: card.averages?.l40 ?? card.l40 ?? item.player.stats.l40,
      bonus: xsPlayBonusPctV1(card),
      status: card.playerStatus?.status ?? card.status ?? "unknown",
      playerStatus: card.playerStatus ?? { status: card.status ?? "unknown" },
      nextMatch: card.nextMatch ?? card.upcomingGame ?? null,
      opponentName: card.nextOpponent ?? card.opponentName ?? (nextMatch as any)?.opponentName ?? item.player.match,
      homeAway: card.homeAway ?? (nextMatch as any)?.homeAway ?? "unknown",
      competition: card.competition ?? (nextMatch as any)?.competition ?? null,
      difficulty: card.difficulty ?? card.fixtureDifficulty ?? item.player.stats.difficulty,
      minutesAvg: item.player.stats.minutes,
      expectedMinutes: item.player.stats.minutes,
      projectedScore: item.player.score,
      confidence: item.player.confidence,
    };
  });
}

function usePersistedGallery() {
  const [gallery, setGallery] = useState<SorareCard[]>([]);

  useEffect(() => {
    let mounted = true;
    let cachedCards: SorareCard[] = [];

    async function loadGallery() {
      try {
        const raw = await AsyncStorage.getItem("xs_app_store_v1");
        if (raw && mounted) {
          const parsed = JSON.parse(raw);
          const cards = parsed?.state?.gallery ?? parsed?.gallery;
          if (Array.isArray(cards)) {
            cachedCards = cards;
            setGallery(cards);
          }
        }
      } catch (_) {}

      try {
        const deviceId = await xsPlayReadDeviceIdV1();
        if (!deviceId || !mounted) return;
        const resp = await fetch(`${xsPlayAiBaseUrlV1()}/my-cards?deviceId=${encodeURIComponent(deviceId)}&first=80&source=auto`, {
          headers: { accept: "application/json" },
        });
        const json = await resp.json().catch(() => null);
        const backendCards = Array.isArray(json?.cards) ? json.cards : [];
        if (!resp.ok || !backendCards.length || !mounted) return;
        setGallery(xsPlayMergeBackendGalleryV1(cachedCards, backendCards));
      } catch (_) {
        // Keep AsyncStorage gallery as fallback if backend is unavailable.
      }
    }

    loadGallery();
    return () => {
      mounted = false;
    };
  }, []);

  return gallery;
}

function PremiumPressable({
  children,
  onPress,
  style,
  disabled,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  style?: any;
  disabled?: boolean;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  return (
    <AnimatedPressable
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => {
        Animated.timing(scale, { toValue: 0.975, duration: 110, useNativeDriver: true }).start();
      }}
      onPressOut={() => {
        Animated.spring(scale, { toValue: 1, friction: 6, tension: 180, useNativeDriver: true }).start();
      }}
      style={[style, { transform: [{ scale }], opacity: disabled ? 0.66 : 1 }]}
    >
      {children}
    </AnimatedPressable>
  );
}

function ModeButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <PremiumPressable onPress={onPress} style={[styles.modeButton, active ? styles.modeButtonActive : styles.modeButtonInactive]}>
      <LinearGradient
        colors={active ? [YELLOW, YELLOW_DEEP] : ["#151515", "#0d0d0d"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.fill}
      >
        <Text style={[styles.modeText, { color: active ? "#080808" : TEXT }]}>{label}</Text>
      </LinearGradient>
    </PremiumPressable>
  );
}

function StrategyCard({
  item,
  active,
  onPress,
  glowOpacity,
}: {
  item: (typeof strategies)[number];
  active: boolean;
  onPress: () => void;
  glowOpacity: Animated.AnimatedInterpolation<string | number>;
}) {
  return (
    <PremiumPressable onPress={onPress} style={[styles.strategyCard, active && styles.strategyCardActive]}>
      <LinearGradient
        colors={active ? ["rgba(255,196,0,0.15)", "rgba(255,196,0,0.03)", "rgba(0,0,0,0.96)"] : ["rgba(255,255,255,0.04)", "rgba(0,0,0,0.96)"]}
        style={styles.fill}
      >
        {active ? <Animated.View pointerEvents="none" style={[styles.strategyGlow, { opacity: glowOpacity }]} /> : null}
        <Ionicons name={item.icon as any} size={32} color={active ? YELLOW : TEXT} />
        <Text style={[styles.strategyTitle, active && { color: YELLOW }]}>{item.label}</Text>
        <Text style={[styles.strategyPercent, active && { color: YELLOW }]}>+{item.percent}%</Text>
      </LinearGradient>
    </PremiumPressable>
  );
}

function StatBadge({ small = false }: { small?: boolean }) {
  return (
    <View style={[styles.statBadge, small && styles.statBadgeSmall]}>
      <Ionicons name="stats-chart" size={small ? 10 : 12} color="#FFD11A" />
    </View>
  );
}

function CardPortrait({ player, compact = false }: { player: CoachPlayer; compact?: boolean }) {
  const skinTone = ["#f0c0a1", "#c48763", "#8f5a3d"][hashValue(player.id, 42) % 3];
  const hairTone = ["#1e1713", "#4a2d1a", "#090909", "#b87333"][hashValue(player.id, 43) % 4];

  return (
    <View style={[styles.portraitWrap, compact && styles.portraitWrapCompact]}>
      <View style={[styles.portraitHead, compact && styles.portraitHeadCompact, { backgroundColor: skinTone }]}>
        <View style={[styles.portraitHair, { backgroundColor: hairTone }]} />
      </View>
      <View style={[styles.portraitNeck, { backgroundColor: skinTone }]} />
      <LinearGradient colors={[player.colors[0], player.colors[1]]} style={[styles.portraitTorso, compact && styles.portraitTorsoCompact]}>
        <Text style={[styles.portraitInitial, compact && { fontSize: 16 }]}>{player.name.slice(0, 1)}</Text>
      </LinearGradient>
    </View>
  );
}

function PlayerCard({
  player,
  slot,
  width,
  compact = false,
  onPress,
}: {
  player: CoachPlayer;
  slot?: SlotKey;
  width: number;
  compact?: boolean;
  onPress?: () => void;
}) {
  const height = compact ? Math.round(width * 0.9) : Math.round(width * 1.48);
  const nameStrip = player.colors[0].toLowerCase() === "#efefef" ? "#f3f3f3" : player.colors[1];
  const stripText = player.colors[0].toLowerCase() === "#efefef" ? "#111111" : TEXT;

  return (
    <View style={{ width, alignItems: "center" }}>
      {slot ? <Text style={styles.slotLabel}>{slot}</Text> : null}
      <PremiumPressable onPress={onPress} style={[styles.playerCard, { width, height }]}>
        <LinearGradient colors={["#1a1a1a", player.colors[1], "#080808"]} style={styles.playerImageArea}>
          <View style={styles.cardScoreWrap}>
            <Text style={[styles.cardScore, compact && { fontSize: 14 }]}>{player.score}</Text>
            <Text style={[styles.cardScoreLabel, compact && { fontSize: 7 }]}>Prévu</Text>
          </View>
          <StatBadge small={compact} />
          <CardPortrait player={player} compact={compact} />
          {player.pictureUrl ? (
            <Image
              source={{ uri: player.pictureUrl }}
              resizeMode="contain"
              style={[
                styles.playerImage,
                {
                  height: compact ? height * 0.72 : height * 0.74,
                  bottom: compact ? 20 : 32,
                },
              ]}
            />
          ) : (
            <View style={styles.playerFallback}>
              <Text style={styles.playerFallbackText}>{player.name.slice(0, 1)}</Text>
            </View>
          )}
        </LinearGradient>
        <View style={[styles.playerNameStrip, { backgroundColor: nameStrip, height: compact ? 22 : 30 }]}>
          <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.playerName, { color: stripText, fontSize: compact ? 12 : 15 }]}>
            {player.name}
          </Text>
        </View>
        <View style={[styles.playerMatchStrip, { height: compact ? 22 : 28 }]}>
          <Text numberOfLines={1} style={[styles.playerMatch, compact && { fontSize: 12 }]}>
            {player.match}
          </Text>
        </View>
      </PremiumPressable>
    </View>
  );
}

function Pitch({
  slots,
  width,
  loading,
  onPlayerPress,
}: {
  slots: GeneratedLineup["slots"];
  width: number;
  loading: boolean;
  onPlayerPress: (slot: SlotKey, player: CoachPlayer) => void;
}) {
  const pitchWidth = Math.max(340, Math.min(width - 36, 940));
  const pitchHeight = Math.max(520, Math.round(pitchWidth * 0.64));
  const cardWidth = pitchWidth < 430 ? 76 : pitchWidth < 720 ? 92 : 118;

  return (
    <View style={[styles.pitchWrap, { width: pitchWidth, height: pitchHeight }]}>
      <LinearGradient
        colors={["rgba(44,4,10,0.88)", "rgba(12,13,18,0.96)", "rgba(5,5,8,0.99)"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.pitch}
      >
        <View style={styles.pitchVignette} />
        <View style={styles.pitchOuterLine} />
        <View style={styles.pitchHalfLine} />
        <View style={styles.pitchCenterCircle} />
        <View style={styles.pitchCenterDot} />
        <View style={[styles.pitchBox, styles.pitchBoxTop]} />
        <View style={[styles.pitchSmallBox, styles.pitchSmallBoxTop]} />
        <View style={[styles.pitchBox, styles.pitchBoxBottom]} />
        <View style={[styles.pitchSmallBox, styles.pitchSmallBoxBottom]} />
        <View style={[styles.cornerArc, styles.cornerTopLeft]} />
        <View style={[styles.cornerArc, styles.cornerTopRight]} />
        <View style={[styles.cornerArc, styles.cornerBottomLeft]} />
        <View style={[styles.cornerArc, styles.cornerBottomRight]} />

        {slots.map(({ slot, player }) => {
          const pos = slotLayout[slot];
          return (
            <View
              key={slot}
              style={{
                position: "absolute",
                left: Math.round(pitchWidth * pos.x - cardWidth / 2),
                top: Math.round(pitchHeight * pos.y),
                zIndex: 5,
              }}
            >
              <PlayerCard player={player} slot={slot} width={cardWidth} onPress={() => onPlayerPress(slot, player)} />
            </View>
          );
        })}
      </LinearGradient>
      {loading ? (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingGlow} />
          <ActivityIndicator color={YELLOW} size="large" />
          <Text style={styles.loadingTitle}>Analyse des meilleures compositions...</Text>
          <View style={styles.skeletonLine} />
          <View style={[styles.skeletonLine, { width: 180, opacity: 0.55 }]} />
        </View>
      ) : null}
    </View>
  );
}

function Suggestions({
  players,
  onPress,
}: {
  players: CoachPlayer[];
  onPress: (player: CoachPlayer) => void;
}) {
  return (
    <View style={styles.suggestionsBlock}>
      <Text style={styles.sectionTitle}>Suggestions IA</Text>
      <Text style={styles.sectionSubtitle}>Remplacer et booster</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestionsRow}>
        {players.map((player) => (
          <PremiumPressable key={player.id} onPress={() => onPress(player)} style={styles.suggestionShell}>
            <PlayerCard player={player} width={154} compact />
            <View style={styles.swapBubble}>
              <Ionicons name="swap-horizontal" size={18} color={TEXT} />
            </View>
          </PremiumPressable>
        ))}
      </ScrollView>
    </View>
  );
}

function AnalysisChips({ onPress }: { onPress: (chip: string) => void }) {
  const chips = ["Forme", "Matchs", "Minutes", "Confrontations", "Stats L5"];
  return (
    <View style={styles.whyBlock}>
      <Text style={styles.whyTitle}>Pourquoi cette compo ?</Text>
      <View style={styles.chipsRow}>
        {chips.map((chip) => (
          <PremiumPressable key={chip} onPress={() => onPress(chip)} style={styles.reasonChip}>
            <LinearGradient colors={["#171717", "#101010"]} style={styles.fillCenter}>
              <Text style={styles.reasonChipText}>{chip}</Text>
            </LinearGradient>
          </PremiumPressable>
        ))}
      </View>
    </View>
  );
}

function ModalShell({ visible, onClose, children }: { visible: boolean; onClose: () => void; children: React.ReactNode }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <Pressable style={styles.modalScrim} onPress={onClose} />
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          {children}
        </View>
      </View>
    </Modal>
  );
}

function ReplacementModal({
  visible,
  slot,
  player,
  candidates,
  onClose,
  onReplace,
}: {
  visible: boolean;
  slot: SlotKey | null;
  player: CoachPlayer | null;
  candidates: CoachPlayer[];
  onClose: () => void;
  onReplace: (slot: SlotKey, player: CoachPlayer) => void;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"score" | "match" | "confidence">("score");

  useEffect(() => {
    if (!visible) setQuery("");
  }, [visible]);

  const compatible = useMemo(() => {
    if (!slot) return [];
    const q = query.trim().toLowerCase();
    const base = candidates.filter((candidate) => {
      if (candidate.id === player?.id) return false;
      if (slot === "FLEX" ? candidate.position === "GK" : candidate.position !== slot) return false;
      if (!q) return true;
      return `${candidate.name} ${candidate.club} ${candidate.match}`.toLowerCase().includes(q);
    });
    return base.sort((a, b) => {
      if (filter === "confidence") return b.confidence - a.confidence;
      if (filter === "match") return a.stats.difficulty - b.stats.difficulty;
      return b.aiScore - a.aiScore;
    });
  }, [candidates, filter, player?.id, query, slot]);

  return (
    <ModalShell visible={visible} onClose={onClose}>
      <View style={styles.modalHeaderRow}>
        <View>
          <Text style={styles.modalTitle}>Remplacer {player?.name ?? "joueur"}</Text>
          <Text style={styles.modalSubtitle}>Joueurs compatibles, scores IA et confiance</Text>
        </View>
        <Pressable onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={20} color={TEXT} />
        </Pressable>
      </View>

      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={18} color={MUTED} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Rechercher"
          placeholderTextColor={MUTED_SOFT}
          style={styles.searchInput}
        />
      </View>

      <View style={styles.filterRow}>
        {[
          ["score", "Score IA"],
          ["match", "Match"],
          ["confidence", "Confiance"],
        ].map(([key, label]) => (
          <PremiumPressable
            key={key}
            onPress={() => setFilter(key as "score" | "match" | "confidence")}
            style={[styles.filterChip, filter === key && styles.filterChipActive]}
          >
            <Text style={[styles.filterText, filter === key && { color: "#080808" }]}>{label}</Text>
          </PremiumPressable>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingBottom: 8 }}>
        {compatible.slice(0, 12).map((candidate) => (
          <PremiumPressable
            key={candidate.id}
            onPress={() => {
              if (slot) onReplace(slot, candidate);
              onClose();
            }}
            style={styles.replacementRow}
          >
            <PlayerCard player={candidate} width={82} compact />
            <View style={styles.replacementInfo}>
              <Text style={styles.replacementName}>{candidate.name}</Text>
              <Text style={styles.replacementMeta}>
                {candidate.match} • difficulté {candidate.stats.difficulty}/100
              </Text>
              <Text style={styles.replacementReason} numberOfLines={2}>
                {candidate.reasons[0]} • {candidate.reasons[1]}
              </Text>
            </View>
            <View style={styles.replacementScoreBox}>
              <Text style={styles.replacementScore}>{candidate.aiScore}</Text>
              <Text style={styles.replacementScoreLabel}>IA</Text>
              <Text style={styles.replacementConfidence}>{candidate.confidence}%</Text>
            </View>
          </PremiumPressable>
        ))}
      </ScrollView>
    </ModalShell>
  );
}

function VariantsModal({
  visible,
  variants,
  activeStrategy,
  onClose,
  onPick,
}: {
  visible: boolean;
  variants: GeneratedLineup[];
  activeStrategy: StrategyKey;
  onClose: () => void;
  onPick: (strategy: StrategyKey) => void;
}) {
  return (
    <ModalShell visible={visible} onClose={onClose}>
      <View style={styles.modalHeaderRow}>
        <View>
          <Text style={styles.modalTitle}>Autres compositions IA</Text>
          <Text style={styles.modalSubtitle}>Safe, agressive, différentiel et upside</Text>
        </View>
        <Pressable onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={20} color={TEXT} />
        </Pressable>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 8 }}>
        {variants.map((variant) => {
          const active = variant.strategy === activeStrategy;
          return (
            <PremiumPressable
              key={variant.strategy}
              onPress={() => {
                onPick(variant.strategy);
                onClose();
              }}
              style={[styles.variantCard, active && styles.variantCardActive]}
            >
              <View>
                <Text style={styles.variantTitle}>{variant.title}</Text>
                <Text style={styles.variantMeta}>
                  Sécurisé {variant.secureScore} pts • potentiel max {variant.maxScore} pts
                </Text>
              </View>
              <View style={styles.variantScoreWrap}>
                <Text style={styles.variantScore}>{variant.projected}</Text>
                <Text style={styles.variantScoreLabel}>pts</Text>
              </View>
            </PremiumPressable>
          );
        })}
      </ScrollView>
    </ModalShell>
  );
}

function AnalysisModal({
  visible,
  chip,
  lineup,
  onClose,
}: {
  visible: boolean;
  chip: string;
  lineup: GeneratedLineup;
  onClose: () => void;
}) {
  const bullets = useMemo(() => {
    if (chip === "Minutes") return ["Les titulaires probables sont priorisés.", "La compo évite les profils à risque de rotation.", "Le FLEX garde un temps de jeu attendu élevé."];
    if (chip === "Matchs") return ["La difficulté adverse est pondérée par poste.", "Les matchups favorables gagnent du poids.", "Les matchs ouverts favorisent l’upside."];
    if (chip === "Confrontations") return ["L’IA réduit le risque sur les duels défensifs compliqués.", "Les profils offensifs gardent de la valeur si le ceiling compense.", "Les historiques récents servent de garde-fou."];
    if (chip === "Stats L5") return ["La forme L5 influence fortement la compo équilibrée.", "L15 et L40 stabilisent les décisions.", "Les pics de forme sans minutes fiables sont pénalisés."];
    return ["La forme récente est positive sur les cadres.", "Les joueurs à fort potentiel décisif restent prioritaires.", "Le niveau de confiance global reste au-dessus de 80%."];
  }, [chip]);

  return (
    <ModalShell visible={visible} onClose={onClose}>
      <View style={styles.modalHeaderRow}>
        <View>
          <Text style={styles.modalTitle}>Pourquoi cette compo ?</Text>
          <Text style={styles.modalSubtitle}>{chip || "Analyse IA détaillée"}</Text>
        </View>
        <Pressable onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={20} color={TEXT} />
        </Pressable>
      </View>
      <View style={styles.analysisScoreRow}>
        <View>
          <Text style={styles.analysisLabel}>Score sécurisé</Text>
          <Text style={styles.analysisValue}>{lineup.secureScore} pts</Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={styles.analysisLabel}>Potentiel max</Text>
          <Text style={styles.analysisValue}>{lineup.maxScore} pts</Text>
        </View>
      </View>
      <View style={{ gap: 10 }}>
        {bullets.map((bullet) => (
          <View key={bullet} style={styles.analysisBullet}>
            <Ionicons name="sparkles-outline" size={17} color={YELLOW} />
            <Text style={styles.analysisBulletText}>{bullet}</Text>
          </View>
        ))}
      </View>
    </ModalShell>
  );
}

export default function PlayScreen() {
  const { width } = useWindowDimensions();
  const gallery = usePersistedGallery();
  const [mode, setMode] = useState<ModeKey>("classic");
  const [strategy, setStrategy] = useState<StrategyKey>("balanced");
  const [competitionId, setCompetitionId] = useState(PLAY_GAMEWEEK_COMPETITIONS_V1[0].id);
  const [selectedRarity, setSelectedRarity] = useState<PlayRarityV1>("Limited");
  const [loadingAi, setLoadingAi] = useState(true);
  const [selected, setSelected] = useState<{ slot: SlotKey; player: CoachPlayer } | null>(null);
  const [variantsOpen, setVariantsOpen] = useState(false);
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const [analysisChip, setAnalysisChip] = useState("Forme");
  const [overrides, setOverrides] = useState<Partial<Record<SlotKey, CoachPlayer>>>({});
  const [toast, setToast] = useState("");
  const [saving, setSaving] = useState(false);
  const [gameweekPrediction, setGameweekPrediction] = useState<GameWeekAiPrediction | null>(null); // XS_AI_GAMEWEEK_PREDICTION_V1
  const [gameweekPredictionLoading, setGameweekPredictionLoading] = useState(false); // XS_AI_GAMEWEEK_PREDICTION_V1
  const [gameweekPredictionError, setGameweekPredictionError] = useState(""); // XS_AI_GAMEWEEK_PREDICTION_V1

  const fade = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fade, {
      toValue: 1,
      duration: 520,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    ).start();
  }, [fade, glow]);

  useEffect(() => {
    setLoadingAi(true);
    setOverrides({});
    const timer = setTimeout(() => setLoadingAi(false), 720);
    return () => clearTimeout(timer);
  }, [competitionId, mode, selectedRarity, strategy]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 1800);
    return () => clearTimeout(timer);
  }, [toast]);

  const selectedCompetition = useMemo(
    () => PLAY_GAMEWEEK_COMPETITIONS_V1.find((item) => item.id === competitionId) ?? PLAY_GAMEWEEK_COMPETITIONS_V1[0],
    [competitionId]
  );
  const eligibilitySummary = useMemo(() => {
    const reasons: Record<string, number> = {};
    const eligible: SorareCard[] = [];
    gallery.forEach((card) => {
      const cardReasons = getCardIneligibilityReasons(card, selectedCompetition, selectedRarity);
      if (!cardReasons.length) {
        eligible.push(card);
        return;
      }
      const mainReason = cardReasons[0] || "donnée manquante";
      reasons[mainReason] = (reasons[mainReason] || 0) + 1;
    });
    const reasonList = Object.entries(reasons)
      .sort((a, b) => b[1] - a[1])
      .map(([reason, count]) => ({ reason, count }));
    return {
      eligible,
      eligibleCount: eligible.length,
      excludedCount: Math.max(0, gallery.length - eligible.length),
      total: gallery.length,
      reasons: reasonList,
      mainReason: reasonList[0]?.reason || null,
    };
  }, [gallery, selectedCompetition, selectedRarity]);
  const eligibleGallery = useMemo(
    () => eligibilitySummary.eligible,
    [eligibilitySummary]
  );
  const candidates = useMemo(() => buildGalleryCandidates(eligibleGallery, gallery.length === 0), [eligibleGallery, gallery.length]);
  const generated = useMemo(() => generateLineup(candidates, strategy, mode, selectedCompetition), [candidates, mode, selectedCompetition, strategy]);
  const displayLineup = useMemo<GeneratedLineup>(() => {
    const slots = generated.slots.map((item) => ({ ...item, player: overrides[item.slot] ?? item.player }));
    const projected = Math.round(slots.reduce((sum, item) => sum + item.player.score, 0) * 0.75);
    return {
      ...generated,
      slots,
      projected: generated.strategy === "balanced" && candidates === mockPlayers ? generated.projected : projected,
      confidence: Math.round(slots.reduce((sum, item) => sum + item.player.confidence, 0) / slots.length),
    };
  }, [candidates, generated, overrides]);
  const lineupValidation = useMemo(
    () => validateLineupForCompetition(displayLineup.slots, selectedCompetition, selectedRarity),
    [displayLineup.slots, selectedCompetition, selectedRarity]
  );
  const lineupValidationMessages = useMemo(() => getLineupValidationMessages(lineupValidation), [lineupValidation]);
  const lineupBlockedReason = useMemo(() => xsPlayBlockedReasonV1(lineupValidation), [lineupValidation]);
  const missingSlotsLabel = useMemo(() => xsPlayMissingSlotsLabelV1(lineupValidation), [lineupValidation]);
  const gameWeekStateLabel = lineupValidation.isValid ? "prête" : lineupValidation.validCardsCount < lineupValidation.requiredCardsCount ? "incomplète" : "invalide";

  const selectedIds = useMemo(() => new Set(displayLineup.slots.map((item) => item.player.id)), [displayLineup.slots]);
  const suggestions = useMemo(
    () =>
      candidates
        .filter((player) => !selectedIds.has(player.id))
        .sort((a, b) => b.aiScore - a.aiScore)
        .slice(0, 8),
    [candidates, selectedIds]
  );
  const variants = useMemo(() => strategies.map((item) => generateLineup(candidates, item.key, mode, selectedCompetition)), [candidates, mode, selectedCompetition]);
  const glowOpacity = glow.interpolate({ inputRange: [0, 1], outputRange: [0.22, 0.72] });
  const pageWidth = Math.min(width, 1024);
  const availableEligibleReplacements = useMemo(
    () => candidates.filter((player) => !selectedIds.has(player.id) && !player.rawCard?.isEmptySlot).slice(0, 5),
    [candidates, selectedIds]
  );
  const gameweekKey = useMemo(
    () => `GW358|${competitionId}|${selectedRarity}|${mode}|${strategy}|${displayLineup.slots.map((item) => item.player.id).join("|")}`,
    [competitionId, displayLineup.slots, mode, selectedRarity, strategy]
  );

  useEffect(() => {
    setGameweekPrediction(null);
    setGameweekPredictionError("");
  }, [gameweekKey]);

  async function runGameweekPrediction() {
    setGameweekPredictionLoading(true);
    setGameweekPredictionError("");
    try {
      if (!lineupValidation.isValid) {
        throw new Error(lineupBlockedReason || "Composition invalide pour cette Game Week.");
      }
      const deviceId =
        (await AsyncStorage.getItem("xs_device_id").catch(() => null)) ||
        (await AsyncStorage.getItem("XS_JWT_DEVICE_ID_V1").catch(() => null)) ||
        (await AsyncStorage.getItem("xs_device_id_v1").catch(() => null)) ||
        undefined;
      const resp = await fetch(`${xsPlayAiBaseUrlV1()}/ai/gameweek-prediction`, {
        method: "POST",
        headers: { accept: "application/json", "content-type": "application/json" },
        body: JSON.stringify({
          deviceId,
          gameweekKey,
          competition: selectedCompetition.id,
          rarity: selectedRarity,
          mode,
          createdAt: new Date().toISOString(),
          lineupCards: xsPlayAiLineupCardsV1(displayLineup),
        }),
      });
      const json = await resp.json().catch(() => null);
      if (!resp.ok || !json?.ok) {
        throw new Error(String(json?.error || json?.details || `Erreur IA ${resp.status}`));
      }
      setGameweekPrediction(json as GameWeekAiPrediction);
    } catch (e: any) {
      setGameweekPredictionError(String(e?.message || e || "Prédiction IA Game Week indisponible."));
    } finally {
      setGameweekPredictionLoading(false);
    }
  }

  async function useLineup() {
    try {
      if (!lineupValidation.isValid) {
        setToast(lineupBlockedReason || "Composition invalide");
        return;
      }
      setSaving(true);
      await createLineup({
        name: displayLineup.title,
        mode: modeToApiMode(mode),
        competition: selectedCompetition.id,
        rarity: selectedRarity,
        cardSlugs: displayLineup.slots.map((item) => item.player.slug),
        gw: "358",
      });
      setToast("Compo IA utilisée");
    } catch {
      setToast("Compo IA prête");
    } finally {
      setSaving(false);
    }
  }

  function replacePlayer(slot: SlotKey, player: CoachPlayer) {
    setOverrides((prev) => ({ ...prev, [slot]: player }));
    setToast(`${player.name} intégré par l’IA`);
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <LinearGradient colors={[BG_TOP, BG, BG_BOTTOM]} style={styles.background}>
        <Animated.View style={[styles.fadeBody, { opacity: fade, transform: [{ translateY: fade.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }]}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: Platform.select({ web: 24, default: 18 }) }]}
          >
            <View style={[styles.page, { maxWidth: pageWidth }]}>
              <View style={styles.headerRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.heroTitle}>Jouer</Text>
                  <Text style={styles.heroSubtitle}>Prépare ta Game Week</Text>
                </View>
                <View style={styles.gwBadge}>
                  <Ionicons name="calendar-outline" size={18} color={RED} />
                  <Text style={styles.gwText}>GW 358</Text>
                </View>
              </View>

              <View style={styles.modeRow}>
                {modes.map((item) => (
                  <ModeButton key={item.key} label={item.label} active={mode === item.key} onPress={() => setMode(item.key)} />
                ))}
              </View>

              <View style={styles.gameWeekRulesCard}>
                <View style={styles.rulesHeaderRow}>
                  <View>
                    <Text style={styles.rulesTitle}>Choisis ta Game Week</Text>
                    <Text style={styles.rulesSubtitle}>{selectedCompetition.label} · {selectedRarity} · {selectedCompetition.rulesDescription}</Text>
                  </View>
                  <View style={[styles.rulesCountBadge, lineupValidation.isValid ? styles.rulesCountBadgeReady : styles.rulesCountBadgeBlocked]}>
                    <Text style={styles.rulesCountText}>{gameWeekStateLabel}</Text>
                    <Text style={styles.rulesCountLabel}>{lineupValidation.validCardsCount}/{lineupValidation.requiredCardsCount}</Text>
                  </View>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rulesChipRow}>
                  {PLAY_GAMEWEEK_COMPETITIONS_V1.filter((item) => item.isActive).map((item) => (
                    <PremiumPressable
                      key={item.id}
                      onPress={() => setCompetitionId(item.id)}
                      style={[styles.rulesChip, competitionId === item.id && styles.rulesChipActive]}
                    >
                      <Text style={[styles.rulesChipText, competitionId === item.id && styles.rulesChipTextActive]}>{item.label}</Text>
                    </PremiumPressable>
                  ))}
                </ScrollView>
                <View style={styles.rarityRow}>
                  {PLAY_RARITIES_V1.map((rarity) => {
                    const disabled = !selectedCompetition.rarityAllowed.includes(rarity);
                    return (
                      <PremiumPressable
                        key={rarity}
                        disabled={disabled}
                        onPress={() => setSelectedRarity(rarity)}
                        style={[styles.rarityChip, selectedRarity === rarity && styles.rarityChipActive, disabled && styles.rarityChipDisabled]}
                      >
                        <Text style={[styles.rarityChipText, selectedRarity === rarity && styles.rarityChipTextActive]}>{rarity}</Text>
                      </PremiumPressable>
                    );
                  })}
                </View>
                <Text style={styles.rulesMeta}>
                  Format requis {lineupValidation.requiredCardsCount} cartes · max {lineupValidation.maxCards} · {selectedCompetition.futureRulesPlaceholder}
                </Text>
                <Text style={styles.rulesMeta}>
                  Ligue déduite du club quand la carte ne fournit pas encore leagueSlug/leagueName.
                </Text>
                <View style={styles.eligibilityBox}>
                  <View style={styles.eligibilityHeader}>
                    <Text style={styles.eligibilityTitle}>Éligibilité</Text>
                    <Text style={styles.eligibilityRatio}>
                      {eligibilitySummary.eligibleCount}/{eligibilitySummary.total || 0}
                    </Text>
                  </View>
                  <Text style={styles.eligibilityText}>
                    {eligibilitySummary.eligibleCount} cartes éligibles · {eligibilitySummary.excludedCount} exclues
                  </Text>
                  {eligibilitySummary.eligibleCount === 0 && eligibilitySummary.total > 0 ? (
                    <Text style={styles.eligibilityWarning}>Aucune carte éligible pour cette compétition avec cette rareté. Change de rareté ou choisis une autre compétition.</Text>
                  ) : null}
                  {eligibilitySummary.reasons.length ? (
                    <View style={styles.eligibilityReasonsRow}>
                      {eligibilitySummary.reasons.slice(0, 3).map((item) => (
                        <Text key={item.reason} style={styles.eligibilityReasonChip}>
                          {item.reason} · {item.count}
                        </Text>
                      ))}
                    </View>
                  ) : null}
                </View>
                <View style={[styles.validationBox, lineupValidation.severity === "valid" ? styles.validationBoxValid : styles.validationBoxError]}>
                  <View style={styles.validationHeader}>
                    <View>
                      <Text style={styles.validationTitle}>Validation composition</Text>
                      <Text style={[styles.validationStatus, lineupValidation.isValid ? styles.validationStatusValid : styles.validationStatusError]}>
                        {lineupValidationMessages[0]}
                      </Text>
                    </View>
                    <View style={styles.validationCountBadge}>
                      <Text style={styles.validationCountText}>{lineupValidation.validCardsCount}/{lineupValidation.requiredCardsCount}</Text>
                      <Text style={styles.validationCountLabel}>max {lineupValidation.maxCards}</Text>
                    </View>
                  </View>
                  {lineupValidation.errors.slice(0, 2).map((message) => (
                    <Text key={`validation-error-${message}`} style={styles.validationErrorText}>• {message}</Text>
                  ))}
                  {lineupValidation.warnings.slice(0, 2).map((message) => (
                    <Text key={`validation-warning-${message}`} style={styles.validationWarningText}>• {message}</Text>
                  ))}
                  {missingSlotsLabel ? (
                    <Text style={styles.validationWarningText}>Postes à compléter : {missingSlotsLabel}</Text>
                  ) : null}
                  {lineupValidation.invalidCards.slice(0, 3).map((item, index) => (
                    <Text key={`${item.slotId || "slot"}-${item.cardSlug || index}`} numberOfLines={1} style={styles.validationInvalidCard}>
                      {item.slotId || "Slot"} · {item.playerName || "Carte"} : {item.reasons[0] || "donnée manquante"}
                    </Text>
                  ))}
                  {availableEligibleReplacements.length ? (
                    <View style={styles.validationReplacementRow}>
                      <Text style={styles.validationReplacementTitle}>Remplacements éligibles</Text>
                      <View style={styles.replacementMiniList}>
                        {availableEligibleReplacements.slice(0, 5).map((player) => (
                          <View key={player.id} style={styles.replacementMiniCard}>
                            <Text numberOfLines={1} style={styles.replacementMiniName}>{player.name}</Text>
                            <Text style={styles.replacementMiniMeta}>{player.position} · {selectedRarity} · {player.score}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  ) : null}
                </View>
              </View>

              <LinearGradient colors={["rgba(96,8,18,0.58)", "rgba(12,12,18,0.98)"]} style={styles.summaryCard}>
                <View style={styles.summaryGlow} />
                <View style={styles.summaryTopRow}>
                  <View style={styles.summaryTitleRow}>
                    <View style={styles.summaryIcon}>
                      <Ionicons name="shield-checkmark-outline" size={24} color={RED} />
                    </View>
                    <Text style={styles.summaryTitle}>{displayLineup.title}</Text>
                  </View>
                  <View style={styles.confidenceRing}>
                    <Text style={styles.confidenceValue}>{displayLineup.confidence}%</Text>
                  </View>
                </View>
                <Text style={styles.compoSubtitle}>Score projeté</Text>
                <Text style={styles.projectedScore}>{displayLineup.projected} pts</Text>
                <View style={styles.summaryDivider} />
                <View style={styles.strategyPillsRow}>
                  {strategies.map((item) => (
                    <PremiumPressable key={item.key} onPress={() => setStrategy(item.key)} style={[styles.strategyPill, strategy === item.key && styles.strategyPillActive]}>
                      <Text style={styles.strategyPillLabel}>{item.label}</Text>
                      <Text style={[styles.strategyPillValue, item.key === "balanced" ? { color: BLUE } : item.key === "differential" ? { color: PURPLE } : null]}>
                        +{item.percent}%
                      </Text>
                    </PremiumPressable>
                  ))}
                </View>
              </LinearGradient>

              <LinearGradient colors={["rgba(180,10,28,0.34)", "rgba(36,4,9,0.92)"]} style={styles.aiGwBox}>
                  <View style={styles.aiGwHeader}>
                    <View style={styles.aiGwIcon}>
                      <Ionicons name="sparkles-outline" size={28} color={RED} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.aiGwTitle}>Prédiction IA Game Week</Text>
                      <Text numberOfLines={1} style={styles.aiGwSubtitle}>
                        Analyse et optimise ta composition
                      </Text>
                    </View>
                    <PremiumPressable onPress={runGameweekPrediction} disabled={gameweekPredictionLoading || !lineupValidation.isValid} style={styles.aiGwButton}>
                      {gameweekPredictionLoading ? (
                        <ActivityIndicator color={TEXT} size="small" />
                      ) : (
                        <Ionicons name="chevron-forward" size={25} color={TEXT} />
                      )}
                    </PremiumPressable>
                  </View>
                  {!lineupValidation.isValid ? (
                    <Text style={styles.aiGwBlockedText}>Bloqué : {lineupBlockedReason}</Text>
                  ) : null}
                  {gameweekPredictionError ? (
                    <Text style={styles.aiGwError}>{gameweekPredictionError}</Text>
                  ) : null}
                  {gameweekPrediction ? (
                    <View style={styles.aiGwResult}>
                      <View style={styles.aiGwScoreRow}>
                        <View>
                          <Text style={styles.aiGwLabel}>Score projeté GW</Text>
                          <Text style={styles.aiGwScore}>{Math.round(gameweekPrediction.projectedTotalScore || 0)} pts</Text>
                        </View>
                        <View style={{ alignItems: "flex-end", flexShrink: 0 }}>
                          <Text style={styles.aiGwLabel}>Fourchette</Text>
                          <Text style={styles.aiGwValue}>
                            {Math.round(gameweekPrediction.projectedRangeLow || 0)}-{Math.round(gameweekPrediction.projectedRangeHigh || 0)}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.aiGwPills}>
                        <Text style={styles.aiGwPill}>Confiance {xsPlayAiTextV1(gameweekPrediction.confidence)}</Text>
                        <Text style={styles.aiGwPill}>Risque {xsPlayAiTextV1(gameweekPrediction.riskLevel)}</Text>
                      </View>
                      <Text numberOfLines={2} style={styles.aiGwText}>
                        Meilleur pick : {xsPlayAiTextV1(gameweekPrediction.bestPick?.name || gameweekPrediction.bestPick?.playerSlug)}
                      </Text>
                      <Text numberOfLines={2} style={styles.aiGwText}>
                        Plus risqué : {xsPlayAiTextV1(gameweekPrediction.mostRisky?.name || gameweekPrediction.mostRisky?.playerSlug)}
                      </Text>
                      <Text numberOfLines={2} style={styles.aiGwText}>
                        {xsPlayAiTextV1(gameweekPrediction.captainAdvice)}
                      </Text>
                      <Text numberOfLines={3} style={styles.aiGwAdvice}>
                        {xsPlayAiTextV1(gameweekPrediction.actionableAdvice)}
                      </Text>
                      {(gameweekPrediction.positivePoints || []).slice(0, 2).map((point, index) => (
                        <Text key={`gw-positive-${index}`} numberOfLines={1} style={styles.aiGwPositive}>+ {point}</Text>
                      ))}
                      {(gameweekPrediction.negativePoints || []).slice(0, 2).map((point, index) => (
                        <Text key={`gw-negative-${index}`} numberOfLines={1} style={styles.aiGwNegative}>- {point}</Text>
                      ))}
                    </View>
                  ) : null}
              </LinearGradient>

              <View style={styles.mainCard}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitle}>Ta composition</Text>
                  <PremiumPressable onPress={() => setVariantsOpen(true)} style={styles.changeLineupButton}>
                    <Ionicons name="sync" size={15} color={RED} />
                    <Text style={styles.changeLineupText}>Changer de compo</Text>
                  </PremiumPressable>
                </View>
                <Pitch
                  slots={displayLineup.slots}
                  width={pageWidth - 36}
                  loading={loadingAi}
                  onPlayerPress={(slot, player) => setSelected({ slot, player })}
                />
              </View>

              <Suggestions
                players={suggestions.length ? suggestions : mockPlayers.slice(5)}
                onPress={(player) => {
                  const slot = displayLineup.slots.find((item) => item.player.position === player.position)?.slot ?? "FLEX";
                  setSelected({ slot, player });
                }}
              />

              <AnalysisChips
                onPress={(chip) => {
                  setAnalysisChip(chip);
                  setAnalysisOpen(true);
                }}
              />

              <PremiumPressable onPress={useLineup} disabled={saving || !lineupValidation.isValid} style={styles.primaryButton}>
                <LinearGradient colors={[YELLOW, YELLOW_DEEP]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.fillCenter}>
                  <Text style={styles.primaryButtonText}>{saving ? "Activation..." : "Utiliser cette compo"}</Text>
                </LinearGradient>
              </PremiumPressable>
              {!lineupValidation.isValid ? (
                <Text style={styles.primaryBlockedText}>Sauvegarde bloquée : {lineupBlockedReason}</Text>
              ) : null}

              <PremiumPressable onPress={() => setVariantsOpen(true)} style={styles.secondaryButton}>
                <View style={styles.secondaryButtonIcon}>
                  <Ionicons name="shield-checkmark-outline" size={24} color={RED} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.secondaryButtonText}>Mes compositions</Text>
                  <Text style={styles.secondaryButtonSubtext}>Gère et sauvegarde tes compositions</Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color={TEXT} />
              </PremiumPressable>
            </View>
          </ScrollView>
          {toast ? (
            <View style={styles.toast}>
              <Text style={styles.toastText}>{toast}</Text>
            </View>
          ) : null}
        </Animated.View>
      </LinearGradient>

      <ReplacementModal
        visible={!!selected}
        slot={selected?.slot ?? null}
        player={selected?.player ?? null}
        candidates={candidates}
        onClose={() => setSelected(null)}
        onReplace={replacePlayer}
      />
      <VariantsModal
        visible={variantsOpen}
        variants={variants}
        activeStrategy={strategy}
        onClose={() => setVariantsOpen(false)}
        onPick={setStrategy}
      />
      <AnalysisModal visible={analysisOpen} chip={analysisChip} lineup={displayLineup} onClose={() => setAnalysisOpen(false)} />
    </SafeAreaView>
  );
}

const styles = {
  safeArea: {
    flex: 1,
    backgroundColor: BG,
  },
  background: {
    flex: 1,
  },
  fadeBody: {
    flex: 1,
  },
  scrollContent: {
    alignItems: "center" as const,
  },
  page: {
    width: "100%" as const,
    paddingHorizontal: 18,
    paddingTop: 22,
    gap: 20,
  },
  headerRow: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    gap: 14,
  },
  stepNumber: {
    color: TEXT,
    fontSize: 26,
    lineHeight: 32,
    fontWeight: "800" as const,
    letterSpacing: 0,
    opacity: 0.96,
  },
  heroTitle: {
    color: TEXT,
    fontSize: 42,
    lineHeight: 48,
    fontWeight: "900" as const,
    letterSpacing: 0,
  },
  heroSubtitle: {
    marginTop: 5,
    color: MUTED,
    fontSize: 19,
    fontWeight: "600" as const,
  },
  gwBadge: {
    height: 58,
    paddingHorizontal: 18,
    borderRadius: 15,
    backgroundColor: "rgba(82,8,17,0.35)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    flexDirection: "row" as const,
    gap: 9,
    marginTop: 12,
    shadowColor: "#000",
    shadowOpacity: 0.45,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    borderWidth: 1,
    borderColor: "rgba(255,49,72,0.38)",
  },
  gwText: {
    color: TEXT,
    fontWeight: "900" as const,
    fontSize: 16,
  },
  modeRow: {
    flexDirection: "row" as const,
    gap: 8,
    marginTop: -4,
  },
  modeButton: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    overflow: "hidden" as const,
  },
  modeButtonActive: {
    shadowColor: YELLOW,
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },
  modeButtonInactive: {
    borderWidth: 1,
    borderColor: STROKE_SOFT,
  },
  fill: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  fillCenter: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  modeText: {
    fontSize: 14,
    fontWeight: "800" as const,
  },
  gameWeekRulesCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,49,72,0.22)",
    backgroundColor: "rgba(10,10,15,0.92)",
    padding: 14,
    gap: 12,
  },
  rulesHeaderRow: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    justifyContent: "space-between" as const,
    gap: 12,
  },
  rulesTitle: {
    color: TEXT,
    fontSize: 18,
    fontWeight: "900" as const,
  },
  rulesSubtitle: {
    marginTop: 3,
    color: MUTED,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700" as const,
    maxWidth: 680,
  },
  rulesCountBadge: {
    minWidth: 72,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,49,72,0.35)",
    backgroundColor: "rgba(255,49,72,0.10)",
    paddingHorizontal: 9,
    paddingVertical: 7,
    alignItems: "center" as const,
  },
  rulesCountBadgeReady: {
    borderColor: "rgba(25,240,122,0.28)",
    backgroundColor: "rgba(25,240,122,0.08)",
  },
  rulesCountBadgeBlocked: {
    borderColor: "rgba(255,49,72,0.35)",
    backgroundColor: "rgba(255,49,72,0.10)",
  },
  rulesCountText: {
    color: TEXT,
    fontSize: 12,
    fontWeight: "900" as const,
    textTransform: "uppercase" as const,
  },
  rulesCountLabel: {
    color: MUTED,
    fontSize: 10,
    fontWeight: "800" as const,
  },
  rulesChipRow: {
    gap: 8,
    paddingRight: 8,
  },
  rulesChip: {
    height: 36,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(255,255,255,0.035)",
    paddingHorizontal: 13,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  rulesChipActive: {
    borderColor: RED,
    backgroundColor: "rgba(255,49,72,0.20)",
  },
  rulesChipText: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 12,
    fontWeight: "900" as const,
  },
  rulesChipTextActive: {
    color: TEXT,
  },
  rarityRow: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: 8,
  },
  rarityChip: {
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(255,255,255,0.035)",
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  rarityChipActive: {
    borderColor: RED,
    backgroundColor: "rgba(255,49,72,0.20)",
  },
  rarityChipDisabled: {
    opacity: 0.38,
  },
  rarityChipText: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 11,
    fontWeight: "900" as const,
  },
  rarityChipTextActive: {
    color: TEXT,
  },
  rulesMeta: {
    color: MUTED_SOFT,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "700" as const,
  },
  eligibilityBox: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.09)",
    backgroundColor: "rgba(0,0,0,0.22)",
    padding: 11,
    gap: 6,
  },
  eligibilityHeader: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    gap: 10,
  },
  eligibilityTitle: {
    color: TEXT,
    fontSize: 14,
    fontWeight: "900" as const,
  },
  eligibilityRatio: {
    color: GREEN,
    fontSize: 14,
    fontWeight: "900" as const,
  },
  eligibilityText: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "800" as const,
  },
  eligibilityWarning: {
    color: "#FFB4BF",
    fontSize: 12,
    fontWeight: "900" as const,
  },
  eligibilityReasonsRow: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: 6,
  },
  eligibilityReasonChip: {
    color: "rgba(255,255,255,0.76)",
    backgroundColor: "rgba(255,255,255,0.055)",
    borderColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderRadius: 999,
    overflow: "hidden" as const,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 11,
    fontWeight: "800" as const,
  },
  validationBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 11,
    gap: 6,
  },
  validationBoxValid: {
    borderColor: "rgba(25,240,122,0.22)",
    backgroundColor: "rgba(25,240,122,0.07)",
  },
  validationBoxError: {
    borderColor: "rgba(255,49,72,0.34)",
    backgroundColor: "rgba(255,49,72,0.08)",
  },
  validationHeader: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "flex-start" as const,
    gap: 10,
  },
  validationTitle: {
    color: TEXT,
    fontSize: 14,
    fontWeight: "900" as const,
  },
  validationStatus: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "900" as const,
  },
  validationStatusValid: {
    color: GREEN,
  },
  validationStatusError: {
    color: "#FFB4BF",
  },
  validationCountBadge: {
    minWidth: 64,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.24)",
    paddingHorizontal: 8,
    paddingVertical: 6,
    alignItems: "center" as const,
  },
  validationCountText: {
    color: TEXT,
    fontSize: 14,
    fontWeight: "900" as const,
  },
  validationCountLabel: {
    color: MUTED,
    fontSize: 10,
    fontWeight: "800" as const,
  },
  validationErrorText: {
    color: "#FFB4BF",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "800" as const,
  },
  validationWarningText: {
    color: "#FFD27A",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "800" as const,
  },
  validationInvalidCard: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 11,
    fontWeight: "800" as const,
  },
  validationReplacementRow: {
    marginTop: 2,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
    paddingTop: 7,
  },
  validationReplacementTitle: {
    color: MUTED,
    fontSize: 11,
    fontWeight: "900" as const,
  },
  validationReplacementNames: {
    marginTop: 3,
    color: TEXT,
    fontSize: 12,
    fontWeight: "800" as const,
  },
  replacementMiniList: {
    marginTop: 6,
    gap: 6,
  },
  replacementMiniCard: {
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.055)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  replacementMiniName: {
    color: TEXT,
    fontSize: 12,
    fontWeight: "900" as const,
  },
  replacementMiniMeta: {
    color: MUTED,
    fontSize: 11,
    marginTop: 2,
    fontWeight: "800" as const,
  },
  strategyRow: {
    flexDirection: "row" as const,
    gap: 10,
  },
  strategyCard: {
    flex: 1,
    height: 138,
    borderRadius: 18,
    overflow: "hidden" as const,
    borderWidth: 1,
    borderColor: STROKE_SOFT,
    backgroundColor: PANEL,
  },
  strategyCardActive: {
    borderColor: YELLOW,
    shadowColor: YELLOW,
    shadowOpacity: 0.27,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
  },
  strategyGlow: {
    position: "absolute" as const,
    left: -40,
    right: -40,
    top: -30,
    height: 90,
    backgroundColor: "rgba(255,196,0,0.18)",
    borderRadius: 100,
  },
  strategyTitle: {
    marginTop: 14,
    color: "rgba(255,255,255,0.68)",
    fontSize: 18,
    fontWeight: "700" as const,
  },
  strategyPercent: {
    marginTop: 4,
    color: TEXT,
    fontSize: 22,
    fontWeight: "900" as const,
  },
  mainCard: {
    borderRadius: 22,
    backgroundColor: "rgba(8,8,12,0.94)",
    borderWidth: 1,
    borderColor: "rgba(255,49,72,0.18)",
    padding: 12,
    shadowColor: "#000",
    shadowOpacity: 0.7,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 18 },
    overflow: "hidden" as const,
  },
  sectionHeaderRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    gap: 12,
    paddingHorizontal: 2,
    paddingBottom: 8,
  },
  changeLineupButton: {
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,49,72,0.22)",
    backgroundColor: "rgba(255,255,255,0.035)",
    paddingHorizontal: 12,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 7,
  },
  changeLineupText: {
    color: TEXT,
    fontSize: 12,
    fontWeight: "900" as const,
  },
  summaryCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,49,72,0.48)",
    padding: 22,
    overflow: "hidden" as const,
    shadowColor: RED,
    shadowOpacity: 0.18,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
  },
  summaryGlow: {
    position: "absolute" as const,
    right: -70,
    top: -70,
    width: 180,
    height: 180,
    borderRadius: 999,
    backgroundColor: "rgba(255,49,72,0.16)",
  },
  summaryTopRow: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    gap: 16,
  },
  summaryTitleRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
    flex: 1,
  },
  summaryIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "rgba(255,49,72,0.13)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  summaryTitle: {
    color: TEXT,
    fontSize: 20,
    lineHeight: 25,
    fontWeight: "900" as const,
    textTransform: "uppercase" as const,
    flex: 1,
  },
  confidenceRing: {
    width: 94,
    height: 94,
    borderRadius: 999,
    borderWidth: 7,
    borderColor: RED,
    backgroundColor: "rgba(0,0,0,0.28)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.10)",
    marginTop: 22,
    marginBottom: 12,
  },
  strategyPillsRow: {
    flexDirection: "row" as const,
    alignItems: "stretch" as const,
  },
  strategyPill: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingVertical: 8,
    borderRightWidth: 1,
    borderRightColor: "rgba(255,255,255,0.10)",
  },
  strategyPillActive: {
    backgroundColor: "rgba(255,49,72,0.08)",
    borderRadius: 12,
  },
  strategyPillLabel: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 13,
    fontWeight: "800" as const,
  },
  strategyPillValue: {
    marginTop: 3,
    color: GREEN,
    fontSize: 20,
    fontWeight: "900" as const,
  },
  compoHeader: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    justifyContent: "space-between" as const,
    gap: 16,
    marginBottom: 12,
    zIndex: 8,
  },
  compoTitle: {
    color: TEXT,
    fontSize: 27,
    lineHeight: 32,
    fontWeight: "900" as const,
  },
  compoSubtitle: {
    marginTop: 30,
    color: MUTED,
    fontSize: 16,
    fontWeight: "600" as const,
  },
  projectedScore: {
    marginTop: 4,
    color: RED,
    fontSize: 48,
    lineHeight: 54,
    fontWeight: "900" as const,
  },
  confidenceLabel: {
    marginTop: 6,
    color: MUTED,
    fontSize: 18,
    fontWeight: "600" as const,
  },
  confidenceValue: {
    color: TEXT,
    fontSize: 26,
    lineHeight: 30,
    fontWeight: "900" as const,
  },
  aiGwBox: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,49,72,0.62)",
    padding: 18,
    gap: 10,
    overflow: "hidden" as const,
  },
  aiGwHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 14,
  },
  aiGwIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: "rgba(255,49,72,0.12)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  aiGwTitle: {
    color: TEXT,
    fontSize: 19,
    fontWeight: "900" as const,
    textTransform: "uppercase" as const,
  },
  aiGwSubtitle: {
    color: MUTED,
    fontSize: 15,
    fontWeight: "700" as const,
    marginTop: 2,
  },
  aiGwButton: {
    width: 54,
    height: 54,
    borderRadius: 999,
    backgroundColor: "rgba(255,49,72,0.18)",
    borderWidth: 1,
    borderColor: RED,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  aiGwButtonText: {
    color: "#080808",
    fontSize: 13,
    fontWeight: "900" as const,
  },
  aiGwError: {
    color: "#ff9a9a",
    fontSize: 12,
    fontWeight: "800" as const,
  },
  aiGwBlockedText: {
    color: "#FFB4BF",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "800" as const,
  },
  aiGwResult: {
    gap: 8,
  },
  aiGwScoreRow: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    justifyContent: "space-between" as const,
    gap: 10,
  },
  aiGwLabel: {
    color: MUTED,
    fontSize: 11,
    fontWeight: "800" as const,
    textTransform: "uppercase" as const,
  },
  aiGwScore: {
    color: GREEN,
    fontSize: 28,
    lineHeight: 32,
    fontWeight: "900" as const,
  },
  aiGwValue: {
    color: TEXT,
    fontSize: 18,
    fontWeight: "900" as const,
  },
  aiGwPills: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: 8,
  },
  aiGwPill: {
    color: TEXT,
    backgroundColor: "rgba(0,0,0,0.38)",
    borderColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderRadius: 999,
    overflow: "hidden" as const,
    paddingHorizontal: 9,
    paddingVertical: 5,
    fontSize: 11,
    fontWeight: "900" as const,
  },
  aiGwText: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700" as const,
  },
  aiGwAdvice: {
    color: TEXT,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "800" as const,
  },
  aiGwPositive: {
    color: "#b7ffd3",
    fontSize: 12,
    fontWeight: "800" as const,
  },
  aiGwNegative: {
    color: "#ffd0a6",
    fontSize: 12,
    fontWeight: "800" as const,
  },
  pitchWrap: {
    alignSelf: "center" as const,
    marginTop: 10,
    borderRadius: 18,
    overflow: "hidden" as const,
    backgroundColor: "#07070A",
  },
  pitch: {
    flex: 1,
    borderRadius: 18,
    overflow: "hidden" as const,
    borderWidth: 1,
    borderColor: "rgba(255,49,72,0.32)",
    shadowColor: RED,
    shadowOpacity: 0.16,
    shadowRadius: 28,
  },
  pitchVignette: {
    position: "absolute" as const,
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.18)",
  },
  pitchOuterLine: {
    position: "absolute" as const,
    left: "4%" as const,
    right: "4%" as const,
    top: "7%" as const,
    bottom: "5%" as const,
    borderWidth: 2,
    borderColor: "rgba(255,49,72,0.19)",
  },
  pitchHalfLine: {
    position: "absolute" as const,
    left: "4%" as const,
    right: "4%" as const,
    top: "50%" as const,
    height: 1,
    backgroundColor: "rgba(255,49,72,0.18)",
  },
  pitchCenterCircle: {
    position: "absolute" as const,
    left: "38%" as const,
    top: "43%" as const,
    width: "24%" as const,
    height: "16%" as const,
    borderWidth: 2,
    borderRadius: 999,
    borderColor: "rgba(255,49,72,0.17)",
  },
  pitchCenterDot: {
    position: "absolute" as const,
    left: "49.3%" as const,
    top: "49.2%" as const,
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255,49,72,0.22)",
  },
  pitchBox: {
    position: "absolute" as const,
    left: "37%" as const,
    width: "26%" as const,
    height: "15%" as const,
    borderWidth: 2,
    borderColor: "rgba(255,49,72,0.16)",
  },
  pitchBoxTop: {
    top: "7%" as const,
  },
  pitchBoxBottom: {
    bottom: "5%" as const,
  },
  pitchSmallBox: {
    position: "absolute" as const,
    left: "43%" as const,
    width: "14%" as const,
    height: "7%" as const,
    borderWidth: 2,
    borderColor: "rgba(255,49,72,0.14)",
  },
  pitchSmallBoxTop: {
    top: "7%" as const,
  },
  pitchSmallBoxBottom: {
    bottom: "5%" as const,
  },
  cornerArc: {
    position: "absolute" as const,
    width: 28,
    height: 28,
    borderWidth: 2,
    borderColor: "rgba(255,49,72,0.14)",
    borderRadius: 999,
  },
  cornerTopLeft: {
    left: "2.5%" as const,
    top: "5.8%" as const,
  },
  cornerTopRight: {
    right: "2.5%" as const,
    top: "5.8%" as const,
  },
  cornerBottomLeft: {
    left: "2.5%" as const,
    bottom: "3.8%" as const,
  },
  cornerBottomRight: {
    right: "2.5%" as const,
    bottom: "3.8%" as const,
  },
  slotLabel: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "900" as const,
    marginBottom: 6,
    textAlign: "center" as const,
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 999,
    overflow: "hidden" as const,
    alignSelf: "center" as const,
  },
  playerCard: {
    borderRadius: 12,
    overflow: "hidden" as const,
    backgroundColor: "#0A080A",
    borderWidth: 1,
    borderColor: "rgba(255,49,72,0.44)",
    shadowColor: "#000",
    shadowOpacity: 0.55,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 7 },
  },
  playerImageArea: {
    flex: 1,
    overflow: "hidden" as const,
  },
  cardScore: {
    color: TEXT,
    fontSize: 17,
    fontWeight: "900" as const,
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  cardScoreWrap: {
    position: "absolute" as const,
    top: 7,
    left: 7,
    zIndex: 4,
    alignItems: "flex-start" as const,
    paddingHorizontal: 5,
    paddingVertical: 3,
    borderRadius: 7,
    backgroundColor: "rgba(67,5,12,0.72)",
  },
  cardScoreLabel: {
    marginTop: -2,
    color: "rgba(255,255,255,0.78)",
    fontSize: 8,
    fontWeight: "800" as const,
    textTransform: "uppercase" as const,
  },
  statBadge: {
    position: "absolute" as const,
    top: 7,
    right: 7,
    width: 22,
    height: 22,
    borderRadius: 5,
    backgroundColor: "rgba(0,0,0,0.68)",
    borderWidth: 1,
    borderColor: "rgba(255,196,0,0.6)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    zIndex: 4,
  },
  statBadgeSmall: {
    width: 18,
    height: 18,
    top: 6,
    right: 6,
  },
  playerImage: {
    position: "absolute" as const,
    left: 0,
    right: 0,
    width: "100%" as const,
    zIndex: 2,
  },
  playerFallback: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  playerFallbackText: {
    color: TEXT,
    fontSize: 36,
    fontWeight: "900" as const,
  },
  portraitWrap: {
    position: "absolute" as const,
    left: "18%" as const,
    right: "18%" as const,
    bottom: 54,
    height: "58%" as const,
    alignItems: "center" as const,
    justifyContent: "flex-end" as const,
    zIndex: 1,
  },
  portraitWrapCompact: {
    left: "20%" as const,
    right: "20%" as const,
    bottom: 34,
    height: "54%" as const,
  },
  portraitHead: {
    width: 44,
    height: 50,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.36)",
    overflow: "hidden" as const,
    zIndex: 2,
  },
  portraitHeadCompact: {
    width: 34,
    height: 38,
    borderRadius: 17,
  },
  portraitHair: {
    position: "absolute" as const,
    left: 0,
    right: 0,
    top: 0,
    height: "32%" as const,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  portraitNeck: {
    width: 18,
    height: 14,
    marginTop: -2,
    borderRadius: 5,
    zIndex: 1,
  },
  portraitTorso: {
    width: 72,
    height: 58,
    marginTop: -2,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  portraitTorsoCompact: {
    width: 56,
    height: 42,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  portraitInitial: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 22,
    fontWeight: "900" as const,
    textShadowColor: "rgba(0,0,0,0.45)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  playerNameStrip: {
    position: "absolute" as const,
    left: 0,
    right: 0,
    bottom: 28,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingHorizontal: 6,
    zIndex: 5,
  },
  playerName: {
    fontWeight: "900" as const,
  },
  playerMatchStrip: {
    position: "absolute" as const,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.78)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingHorizontal: 4,
    zIndex: 5,
  },
  playerMatch: {
    color: TEXT,
    fontSize: 14,
    fontWeight: "800" as const,
  },
  loadingOverlay: {
    position: "absolute" as const,
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: "rgba(0,0,0,0.56)",
    zIndex: 20,
    gap: 12,
  },
  loadingGlow: {
    position: "absolute" as const,
    width: 190,
    height: 190,
    borderRadius: 999,
    backgroundColor: "rgba(255,196,0,0.12)",
  },
  loadingTitle: {
    color: TEXT,
    fontSize: 16,
    fontWeight: "800" as const,
  },
  skeletonLine: {
    width: 240,
    height: 9,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  suggestionsBlock: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,49,72,0.30)",
    backgroundColor: "rgba(10,10,15,0.92)",
    padding: 16,
    gap: 4,
  },
  sectionTitle: {
    color: TEXT,
    fontSize: 22,
    fontWeight: "900" as const,
  },
  sectionSubtitle: {
    marginTop: 2,
    color: MUTED,
    fontSize: 16,
    fontWeight: "600" as const,
  },
  suggestionsRow: {
    paddingTop: 12,
    gap: 12,
    paddingRight: 8,
  },
  suggestionShell: {
    position: "relative" as const,
  },
  swapBubble: {
    position: "absolute" as const,
    right: 9,
    bottom: 30,
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.62)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  whyBlock: {
    borderRadius: 18,
    backgroundColor: "#0A0A0F",
    borderWidth: 1,
    borderColor: "rgba(255,49,72,0.18)",
    padding: 18,
  },
  whyTitle: {
    color: TEXT,
    fontSize: 22,
    fontWeight: "900" as const,
    marginBottom: 14,
  },
  chipsRow: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: 12,
  },
  reasonChip: {
    height: 48,
    minWidth: 142,
    flexGrow: 1,
    borderRadius: 12,
    overflow: "hidden" as const,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  reasonChipText: {
    color: "rgba(255,255,255,0.70)",
    fontSize: 16,
    fontWeight: "700" as const,
  },
  primaryButton: {
    height: 58,
    borderRadius: 16,
    overflow: "hidden" as const,
    shadowColor: YELLOW,
    shadowOpacity: 0.2,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },
  primaryButtonText: {
    color: TEXT,
    fontSize: 20,
    fontWeight: "900" as const,
  },
  primaryBlockedText: {
    marginTop: -10,
    color: "#FFB4BF",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "800" as const,
    textAlign: "center" as const,
  },
  secondaryButton: {
    minHeight: 78,
    borderRadius: 18,
    backgroundColor: "#0B0B10",
    borderWidth: 1,
    borderColor: "rgba(255,49,72,0.22)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    flexDirection: "row" as const,
    gap: 14,
    paddingHorizontal: 18,
    marginTop: -8,
  },
  secondaryButtonIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "rgba(255,49,72,0.12)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  secondaryButtonText: {
    color: TEXT,
    fontSize: 18,
    fontWeight: "900" as const,
    textTransform: "uppercase" as const,
  },
  secondaryButtonSubtext: {
    color: MUTED,
    fontSize: 14,
    marginTop: 3,
    fontWeight: "600" as const,
  },
  toast: {
    position: "absolute" as const,
    alignSelf: "center" as const,
    bottom: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "rgba(15,15,15,0.92)",
    borderWidth: 1,
    borderColor: "rgba(255,196,0,0.32)",
  },
  toastText: {
    color: TEXT,
    fontWeight: "800" as const,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end" as const,
  },
  modalScrim: {
    position: "absolute" as const,
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.68)",
  },
  modalSheet: {
    maxHeight: "84%" as const,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    backgroundColor: "#070707",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    padding: 18,
    gap: 14,
  },
  modalHandle: {
    alignSelf: "center" as const,
    width: 44,
    height: 4,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.20)",
  },
  modalHeaderRow: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "flex-start" as const,
    gap: 12,
  },
  modalTitle: {
    color: TEXT,
    fontSize: 23,
    fontWeight: "900" as const,
  },
  modalSubtitle: {
    marginTop: 4,
    color: MUTED,
    fontSize: 15,
    fontWeight: "600" as const,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: "#121212",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  searchBox: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: STROKE_SOFT,
    backgroundColor: "#101010",
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingHorizontal: 14,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    color: TEXT,
    fontSize: 16,
    fontWeight: "700" as const,
    paddingVertical: 0,
  },
  filterRow: {
    flexDirection: "row" as const,
    gap: 8,
  },
  filterChip: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: STROKE_SOFT,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: "#111111",
  },
  filterChipActive: {
    backgroundColor: YELLOW,
    borderColor: YELLOW,
  },
  filterText: {
    color: TEXT,
    fontSize: 13,
    fontWeight: "900" as const,
  },
  replacementRow: {
    minHeight: 112,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: STROKE_SOFT,
    backgroundColor: "#0b0b0b",
    flexDirection: "row" as const,
    alignItems: "center" as const,
    padding: 10,
    gap: 12,
  },
  replacementInfo: {
    flex: 1,
    gap: 4,
  },
  replacementName: {
    color: TEXT,
    fontSize: 17,
    fontWeight: "900" as const,
  },
  replacementMeta: {
    color: MUTED,
    fontSize: 13,
    fontWeight: "600" as const,
  },
  replacementReason: {
    color: "rgba(255,255,255,0.52)",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600" as const,
  },
  replacementScoreBox: {
    width: 60,
    alignItems: "flex-end" as const,
  },
  replacementScore: {
    color: YELLOW,
    fontSize: 24,
    fontWeight: "900" as const,
  },
  replacementScoreLabel: {
    color: MUTED,
    fontSize: 11,
    fontWeight: "800" as const,
  },
  replacementConfidence: {
    marginTop: 4,
    color: TEXT,
    fontSize: 13,
    fontWeight: "900" as const,
  },
  variantCard: {
    minHeight: 92,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: STROKE_SOFT,
    backgroundColor: "#0c0c0c",
    padding: 16,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    gap: 14,
  },
  variantCardActive: {
    borderColor: YELLOW,
    shadowColor: YELLOW,
    shadowOpacity: 0.18,
    shadowRadius: 18,
  },
  variantTitle: {
    color: TEXT,
    fontSize: 19,
    fontWeight: "900" as const,
  },
  variantMeta: {
    marginTop: 6,
    color: MUTED,
    fontSize: 14,
    fontWeight: "600" as const,
  },
  variantScoreWrap: {
    alignItems: "flex-end" as const,
  },
  variantScore: {
    color: GREEN,
    fontSize: 30,
    fontWeight: "900" as const,
  },
  variantScoreLabel: {
    color: MUTED,
    fontWeight: "800" as const,
  },
  analysisScoreRow: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: STROKE_SOFT,
    backgroundColor: "#0c0c0c",
    padding: 16,
  },
  analysisLabel: {
    color: MUTED,
    fontSize: 13,
    fontWeight: "700" as const,
  },
  analysisValue: {
    color: GREEN,
    fontSize: 24,
    fontWeight: "900" as const,
    marginTop: 4,
  },
  analysisBullet: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
    borderRadius: 14,
    backgroundColor: "#101010",
    borderWidth: 1,
    borderColor: STROKE_SOFT,
    padding: 12,
  },
  analysisBulletText: {
    flex: 1,
    color: TEXT,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "700" as const,
  },
};


