export type Rarity = "common" | "limited" | "rare" | "super_rare" | "unique";
export type Position = "GK" | "DEF" | "MID" | "FWD" | "UNK";

export type SorareCard = {
  id: string;
  slug: string;
  rarity: Rarity;
  seasonYear?: number | null;
  season?: string | null;

  playerName: string;
  playerSlug?: string | null;

  teamName?: string | null;
  teamSlug?: string | null;

  position: Position;
  positionRaw?: string | null;

  pictureUrl: string;
  avatarUrl?: string | null;
};

export type PageInfo = {
  hasNextPage: boolean;
  endCursor?: string | null;
};

export type PublicUserCardsPageResponse = {
  slug: string;
  nickname?: string | null;
  cards: SorareCard[];
  pageInfo: PageInfo;
};

export type Lineup = {
  id: string;
  name: string;
  createdAt: string;
  mode: "classic" | "cap" | "custom";
  gw?: string | null;
  cardSlugs: string[];
};

export type Tag = "A_VENDRE" | "A_GARDER" | "A_UPGRADE" | "DOUBLON";
