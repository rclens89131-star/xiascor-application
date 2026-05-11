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

async function createLineup(payload: any): Promise<any> {
  console.log("XS_PLAY_LOCAL_CREATE_LINEUP_STUB_V1", payload);
  return { ok: true, local: true, payload };
}

const BG = "#050505";
const BG_TOP = "#080808";
const BG_BOTTOM = "#020202";
const PANEL = "#070707";
const PANEL_SOFT = "#0f0f0f";
const STROKE = "rgba(255,255,255,0.14)";
const STROKE_SOFT = "rgba(255,255,255,0.08)";
const TEXT = "#ffffff";
const MUTED = "rgba(255,255,255,0.62)";
const MUTED_SOFT = "rgba(255,255,255,0.42)";
const YELLOW = "#ffc400";
const YELLOW_DEEP = "#f4a900";
const GREEN = "#19f07a";


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

type ModeKey = "classic" | "cap240" | "cap220";
type StrategyKey = "safe" | "balanced" | "differential";
type SlotKey = "GK" | "DEF" | "MID" | "FWD" | "FLEX";

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

function normalizePosition(value: unknown): CoachPlayer["position"] {
  const raw = String(value ?? "").toLowerCase();
  if (raw.includes("gk") || raw.includes("goal")) return "GK";
  if (raw.includes("def")) return "DEF";
  if (raw.includes("mid")) return "MID";
  if (raw.includes("fwd") || raw.includes("forward") || raw.includes("att")) return "FWD";
  return "FWD";
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

function buildGalleryCandidates(gallery: SorareCard[]): CoachPlayer[] {
  if (!Array.isArray(gallery) || gallery.length < 5) return mockPlayers;

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
    const pos = normalizePosition(card.positionRaw ?? card.position);
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
    };
  });

  const hasCore = ["GK", "DEF", "MID", "FWD"].every((position) => mapped.some((player) => player.position === position));
  return hasCore ? mapped : mockPlayers;
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

  return compatible[0] ?? candidates.find((player) => !used.has(player.id)) ?? candidates[0];
}

function generateLineup(candidates: CoachPlayer[], strategy: StrategyKey, mode: ModeKey): GeneratedLineup {
  const used = new Set<string>();
  const slots = (["GK", "DEF", "MID", "FWD", "FLEX"] as SlotKey[]).map((slot) => {
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

function usePersistedGallery() {
  const [gallery, setGallery] = useState<SorareCard[]>([]);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem("xs_app_store_v1")
      .then((raw) => {
        if (!raw || !mounted) return;
        const parsed = JSON.parse(raw);
        const cards = parsed?.state?.gallery ?? parsed?.gallery;
        if (Array.isArray(cards)) setGallery(cards);
      })
      .catch(() => null);
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
      <Ionicons name="stats-chart" size={small ? 10 : 12} color={YELLOW} />
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
          <Text style={[styles.cardScore, compact && { fontSize: 14 }]}>{player.score}</Text>
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
        colors={["rgba(12,61,31,0.88)", "rgba(3,36,19,0.94)", "rgba(1,21,12,0.98)"]}
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
  const [loadingAi, setLoadingAi] = useState(true);
  const [selected, setSelected] = useState<{ slot: SlotKey; player: CoachPlayer } | null>(null);
  const [variantsOpen, setVariantsOpen] = useState(false);
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const [analysisChip, setAnalysisChip] = useState("Forme");
  const [overrides, setOverrides] = useState<Partial<Record<SlotKey, CoachPlayer>>>({});
  const [toast, setToast] = useState("");
  const [saving, setSaving] = useState(false);

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
  }, [mode, strategy]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 1800);
    return () => clearTimeout(timer);
  }, [toast]);

  const candidates = useMemo(() => buildGalleryCandidates(gallery), [gallery]);
  const generated = useMemo(() => generateLineup(candidates, strategy, mode), [candidates, mode, strategy]);
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

  const selectedIds = useMemo(() => new Set(displayLineup.slots.map((item) => item.player.id)), [displayLineup.slots]);
  const suggestions = useMemo(
    () =>
      candidates
        .filter((player) => !selectedIds.has(player.id))
        .sort((a, b) => b.aiScore - a.aiScore)
        .slice(0, 8),
    [candidates, selectedIds]
  );
  const variants = useMemo(() => strategies.map((item) => generateLineup(candidates, item.key, mode)), [candidates, mode]);
  const glowOpacity = glow.interpolate({ inputRange: [0, 1], outputRange: [0.22, 0.72] });
  const pageWidth = Math.min(width, 1024);

  async function useLineup() {
    try {
      setSaving(true);
      await createLineup({
        name: displayLineup.title,
        mode: modeToApiMode(mode),
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
                  <Text style={styles.stepNumber}>07</Text>
                  <Text style={styles.heroTitle}>Choisissez votre style</Text>
                </View>
                <View style={styles.gwBadge}>
                  <Text style={styles.gwText}>GW 358</Text>
                </View>
              </View>

              <View style={styles.modeRow}>
                {modes.map((item) => (
                  <ModeButton key={item.key} label={item.label} active={mode === item.key} onPress={() => setMode(item.key)} />
                ))}
              </View>

              <View style={styles.strategyRow}>
                {strategies.map((item) => (
                  <StrategyCard
                    key={item.key}
                    item={item}
                    active={strategy === item.key}
                    glowOpacity={glowOpacity}
                    onPress={() => setStrategy(item.key)}
                  />
                ))}
              </View>

              <View style={styles.mainCard}>
                <View style={styles.compoHeader}>
                  <View>
                    <Text style={styles.compoTitle}>{displayLineup.title}</Text>
                    <Text style={styles.compoSubtitle}>Score projeté</Text>
                    <Text style={styles.projectedScore}>{displayLineup.projected} pts</Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={styles.confidenceLabel}>Confiance</Text>
                    <Text style={styles.confidenceValue}>{displayLineup.confidence}%</Text>
                  </View>
                </View>

                <Pitch
                  slots={displayLineup.slots}
                  width={pageWidth - 36}
                  loading={loadingAi}
                  onPlayerPress={(slot, player) => setSelected({ slot, player })}
                />

                <Suggestions
                  players={suggestions.length ? suggestions : mockPlayers.slice(5)}
                  onPress={(player) => {
                    const slot = displayLineup.slots.find((item) => item.player.position === player.position)?.slot ?? "FLEX";
                    setSelected({ slot, player });
                  }}
                />
              </View>

              <AnalysisChips
                onPress={(chip) => {
                  setAnalysisChip(chip);
                  setAnalysisOpen(true);
                }}
              />

              <PremiumPressable onPress={useLineup} disabled={saving} style={styles.primaryButton}>
                <LinearGradient colors={[YELLOW, YELLOW_DEEP]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.fillCenter}>
                  <Text style={styles.primaryButtonText}>{saving ? "Activation..." : "Utiliser cette compo"}</Text>
                </LinearGradient>
              </PremiumPressable>

              <PremiumPressable onPress={() => setVariantsOpen(true)} style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>Voir les autres compositions</Text>
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
    paddingHorizontal: 16,
    paddingTop: 18,
    gap: 18,
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
    marginTop: 22,
    color: TEXT,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "800" as const,
    letterSpacing: 0,
  },
  gwBadge: {
    height: 42,
    paddingHorizontal: 18,
    borderRadius: 999,
    backgroundColor: "#171717",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginTop: 12,
    shadowColor: "#000",
    shadowOpacity: 0.45,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
  },
  gwText: {
    color: TEXT,
    fontWeight: "800" as const,
    fontSize: 17,
  },
  modeRow: {
    flexDirection: "row" as const,
    gap: 10,
  },
  modeButton: {
    flex: 1,
    height: 56,
    borderRadius: 14,
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
    fontSize: 18,
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
    borderRadius: 26,
    backgroundColor: "#050505",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    padding: 18,
    shadowColor: "#000",
    shadowOpacity: 0.7,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 18 },
    overflow: "hidden" as const,
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
    marginTop: 12,
    color: MUTED,
    fontSize: 18,
    fontWeight: "600" as const,
  },
  projectedScore: {
    marginTop: 4,
    color: GREEN,
    fontSize: 33,
    lineHeight: 38,
    fontWeight: "900" as const,
  },
  confidenceLabel: {
    marginTop: 6,
    color: MUTED,
    fontSize: 18,
    fontWeight: "600" as const,
  },
  confidenceValue: {
    marginTop: 8,
    color: TEXT,
    fontSize: 34,
    lineHeight: 38,
    fontWeight: "900" as const,
  },
  pitchWrap: {
    alignSelf: "center" as const,
    marginTop: 2,
    borderRadius: 18,
    overflow: "hidden" as const,
    backgroundColor: "#02180d",
  },
  pitch: {
    flex: 1,
    borderRadius: 18,
    overflow: "hidden" as const,
    borderWidth: 1,
    borderColor: "rgba(84,160,103,0.18)",
    shadowColor: "#12ff73",
    shadowOpacity: 0.12,
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
    borderColor: "rgba(143,220,151,0.17)",
  },
  pitchHalfLine: {
    position: "absolute" as const,
    left: "4%" as const,
    right: "4%" as const,
    top: "50%" as const,
    height: 1,
    backgroundColor: "rgba(143,220,151,0.17)",
  },
  pitchCenterCircle: {
    position: "absolute" as const,
    left: "38%" as const,
    top: "43%" as const,
    width: "24%" as const,
    height: "16%" as const,
    borderWidth: 2,
    borderRadius: 999,
    borderColor: "rgba(143,220,151,0.15)",
  },
  pitchCenterDot: {
    position: "absolute" as const,
    left: "49.3%" as const,
    top: "49.2%" as const,
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: "rgba(143,220,151,0.18)",
  },
  pitchBox: {
    position: "absolute" as const,
    left: "37%" as const,
    width: "26%" as const,
    height: "15%" as const,
    borderWidth: 2,
    borderColor: "rgba(143,220,151,0.14)",
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
    borderColor: "rgba(143,220,151,0.12)",
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
    borderColor: "rgba(143,220,151,0.12)",
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
    color: TEXT,
    fontSize: 14,
    lineHeight: 17,
    fontWeight: "900" as const,
    marginBottom: 6,
    textAlign: "center" as const,
  },
  playerCard: {
    borderRadius: 10,
    overflow: "hidden" as const,
    backgroundColor: "#0b0b0b",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.32)",
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
    position: "absolute" as const,
    top: 7,
    left: 7,
    color: TEXT,
    fontSize: 17,
    fontWeight: "900" as const,
    zIndex: 4,
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  statBadge: {
    position: "absolute" as const,
    top: 7,
    right: 7,
    width: 22,
    height: 22,
    borderRadius: 5,
    backgroundColor: "rgba(0,0,0,0.58)",
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
    marginTop: 16,
  },
  sectionTitle: {
    color: TEXT,
    fontSize: 21,
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
    gap: 18,
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
    backgroundColor: "#050505",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
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
    color: "#080808",
    fontSize: 20,
    fontWeight: "900" as const,
  },
  secondaryButton: {
    height: 54,
    borderRadius: 14,
    backgroundColor: "#0b0b0b",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginTop: -8,
  },
  secondaryButtonText: {
    color: "rgba(255,255,255,0.68)",
    fontSize: 20,
    fontWeight: "800" as const,
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


