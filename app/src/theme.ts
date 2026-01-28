import { Colors } from "../constants/theme";

const base = Colors.dark ?? Colors;

export const theme = {
  bg: base.background ?? "#070A12",
  panel: base.card ?? base.background ?? "#0B1220",
  panel2: base.card ?? base.background ?? "#0F1B33",

  text: base.text ?? "#EAF0FF",
  muted: base.icon ?? "rgba(234,240,255,0.65)",
  stroke: "rgba(255,255,255,0.10)",

  accent: base.tint ?? "#3B82F6",
  good: "#22C55E",
  warn: "#F59E0B",
  bad: "#EF4444",
};

export const rarityColor = (rarity: string) => {
  switch (String(rarity || "").toLowerCase()) {
    case "limited":
      return "#F5C542";
    case "rare":
      return "#FF4D4D";
    case "super_rare":
      return "#4DA3FF";
    case "unique":
      return "#B44DFF";
    default:
      return base.icon ?? "#9AA4B2";
  }
};
