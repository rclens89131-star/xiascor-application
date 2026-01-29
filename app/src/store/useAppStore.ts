import { create } from "zustand";
import type { Lineup, SorareCard, Tag } from "../types";

type CopilotAction =
  | { type: "CREATE_LINEUP"; payload: { name: string; mode: Lineup["mode"]; cardSlugs: string[] } }
  | { type: "TAG_CARD"; payload: { cardSlug: string; tag: Tag } }
  | { type: "WATCHLIST_ADD"; payload: { kind: "card" | "player"; idOrSlug: string } }
  | { type: "ALERT_CREATE"; payload: { kind: "price" | "minutes"; target: string; rule: string } }
  | { type: "COMPARE_CARDS"; payload: { cardSlugs: string[] } };

type State = {
  identifier: string;
  setIdentifier: (v: string) => void;

  gallery: SorareCard[];
  setGallery: (cards: SorareCard[]) => void;

  selected: SorareCard[];
  toggleSelected: (c: SorareCard) => void;
  clearSelected: () => void;

  tagsBySlug: Record<string, Tag[]>;
  setTag: (cardSlug: string, tag: Tag) => void;

  watchlist: { kind: "card" | "player"; idOrSlug: string }[];
  addWatch: (w: { kind: "card" | "player"; idOrSlug: string }) => void;

  copilotOpen: boolean;
  setCopilotOpen: (v: boolean) => void;
  copilotMessages: { role: "assistant" | "user"; text: string; actions?: CopilotAction[] }[];
  pushCopilot: (m: State["copilotMessages"][number]) => void;
};

const getCardKey = (c: SorareCard) => String(c.slug || c.id);

export const useAppStore = create<State>((set, get) => ({
  identifier: "darkflow",
  setIdentifier: (v) => set({ identifier: v }),

  gallery: [],
  setGallery: (cards) => set({ gallery: cards }),

  selected: [],
  toggleSelected: (c) => {
    const s = get().selected;
    const key = getCardKey(c);
    const exists = s.some((x) => getCardKey(x) === key);
    if (exists) return set({ selected: s.filter((x) => getCardKey(x) !== key) });
    if (s.length >= 5) return;
    set({ selected: [...s, c] });
  },
  clearSelected: () => set({ selected: [] }),

  tagsBySlug: {},
  setTag: (cardSlug, tag) => {
    const cur = get().tagsBySlug[cardSlug] ?? [];
    const next = cur.includes(tag) ? cur : [...cur, tag];
    set({ tagsBySlug: { ...get().tagsBySlug, [cardSlug]: next } });
  },

  watchlist: [],
  addWatch: (w) => {
    const cur = get().watchlist;
    if (cur.some((x) => x.kind === w.kind && x.idOrSlug === w.idOrSlug)) return;
    set({ watchlist: [w, ...cur] });
  },

  copilotOpen: false,
  setCopilotOpen: (v) => set({ copilotOpen: v }),

  copilotMessages: [
    {
      role: "assistant",
      text:
        "Salut 👋 Je suis ton Copilot (coach + trader). Je peux proposer une compo, tagger à vendre, ajouter watchlist, etc.",
    },
  ],
  pushCopilot: (m) => set({ copilotMessages: [...get().copilotMessages, m] }),
}));
