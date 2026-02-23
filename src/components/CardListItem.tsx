import React, { useMemo, useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import { theme, rarityColor } from "../theme";

type Props = {
  card: any;
  selected?: boolean;
  onPress?: () => void;
  rightSlot?: React.ReactNode;

  mode?: "default" | "gallery"; /* XS_CARDLIST_GALLERY_UI_V1 */
};

const CARD_AR = 320 / 448; // ≈ Sorare card ratio
function xsFmtEur(value: unknown): string {
  const n = typeof value === "number" ? value : null;
  if (n == null || !Number.isFinite(n)) return "—";
  return `${n.toFixed(2)}€`;
}

function xsFmtAsOf(value: unknown): string {
  const iso = typeof value === "string" ? value : "";
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}
/* XS_CARDLIST_GALLERY_UI_V1_BEGIN */
function toNum(v: any): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function getRecentScores(card: any): number[] {
  const raw =
    card?.recentScores ??
    card?.lastFiveScores ??
    card?.l5Scores ??
    card?.stats?.lastFive ??
    [];
  if (!Array.isArray(raw)) return [];
  return raw.map(toNum).slice(-5);
}

function MiniL5Graph({ scores }: { scores: number[] }) {
  const max = Math.max(60, ...scores, 1);

  return (
    <View style={{ marginTop: 8, flexDirection: "row", alignItems: "flex-end", gap: 4, height: 28 }}>
      {scores.length ? (
        scores.map((s, idx) => (
          <View
            key={"l5-" + String(idx)}
            style={{
              flex: 1,
              height: `${Math.max(12, Math.round((s / max) * 100))}%`,
              borderRadius: 3,
              backgroundColor: "rgba(59,130,246,0.75)",
              opacity: 0.9,
            }}
          />
        ))
      ) : (
        <Text style={{ color: theme.muted, fontSize: 11 }}>L5 indisponible</Text>
      )}
    </View>
  );
}
/* XS_CARDLIST_GALLERY_UI_V1_END */
export function CardListItem({ card, selected, onPress, rightSlot, mode = "default" }: Props) {
  const [imgOk, setImgOk] = useState(true);
  const border = selected ? "rgba(59,130,246,0.55)" : theme.stroke;
  const url = String(card?.pictureUrl || "").trim();

  
  const score = useMemo(() => {
    const raw = card?.score ?? card?.level ?? card?.playerScore ?? 0;
    return Math.round(toNum(raw));
  }, [card]);

  const bonusPct = useMemo(() => {
    const raw = card?.totalBonus ?? card?.bonusPct ?? card?.bonus ?? card?.xpBonus ?? 0;
    const n = toNum(raw);
    return n > 1 ? n : n * 100;
  }, [card]);

  const recentScores = useMemo(() => getRecentScores(card), [card]);
  const galleryMode = mode === "gallery";
return (
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: theme.panel,
        borderRadius: (typeof galleryMode !== "undefined" && galleryMode) ? 20 : 18,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: border,
      }}
    >
      {/* Frame Sorare-like */}
      <View style={{ padding: (typeof galleryMode !== "undefined" && galleryMode) ? 10 : 12, backgroundColor: theme.panel }}>
        <View
          style={{
            width: "100%",
            aspectRatio: CARD_AR,
            borderRadius: (typeof galleryMode !== "undefined" && galleryMode) ? 18 : 16,
            overflow: "hidden",
            backgroundColor: theme.panel2,
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.10)",
          }}
        >
          {url && imgOk ? (
            <Image
              source={{ uri: url }}
              style={{ width: "100%", height: "100%" }}
              resizeMode="contain" // ✅ pas de crop, cadrage comme Sorare
              onError={() => setImgOk(false)}
            />
          ) : (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
              <Text style={{ color: theme.muted, fontWeight: "800" }}>Image indisponible</Text>
              <Text style={{ color: theme.muted, marginTop: 6, fontSize: 12 }} numberOfLines={1}>
                {url || "(pictureUrl vide)"}
              </Text>
            </View>
          )}

          {/* Badge rarity en overlay */}
          <View
            style={{
              position: "absolute",
              top: 10,
              left: 10,
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 999,
              backgroundColor: "rgba(0,0,0,0.55)",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.12)",
            }}
          >
            <Text style={{ color: rarityColor(card?.rarity), fontWeight: "900", fontSize: 12 }}>
              {(card?.rarity || "unknown").toString().toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Infos */}
        <View style={{ marginTop: 10, flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.text, fontWeight: "900" }} numberOfLines={1}>
              {card?.playerName || "Unknown"}
            </Text>
            <Text style={{ color: theme.muted, marginTop: 2 }} numberOfLines={1}>
              {card?.teamName || "—"} • {card?.position || "—"} • {card?.seasonYear || "—"}
            </Text>
          </View>

          {rightSlot ? <View style={{ justifyContent: "center" }}>{rightSlot}</View> : null}
        </View>
        {selected ? (
          <Text style={{ color: theme.accent, fontWeight: "900", marginTop: 6 }}>Sélectionnée</Text>
        ) : null}
      </View>
    </Pressable>
  );
}


