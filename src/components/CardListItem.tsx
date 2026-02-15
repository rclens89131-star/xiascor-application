import React, { useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import { theme, rarityColor } from "../theme";

type Props = {
  card: any;
  selected?: boolean;
  onPress?: () => void;
  rightSlot?: React.ReactNode;
};

const CARD_AR = 320 / 448; // ≈ Sorare card ratio



/* XS_CARD_PRICE_PANEL_UI_V1 (BEGIN) */
function asFinite(v: unknown): number | null {
  if (typeof v !== "number") return null;
  return Number.isFinite(v) ? v : null;
}

function formatEur(v: unknown): string {
  const n = asFinite(v);
  if (n === null) return "—";
  return `${n.toFixed(2)} €`;
}
/* XS_CARD_PRICE_PANEL_UI_V1 (END) */
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
export function CardListItem({ card, selected, onPress, rightSlot }: Props) {
  const [imgOk, setImgOk] = useState(true);
  const border = selected ? "rgba(59,130,246,0.55)" : theme.stroke;
  // XS_CARD_PRICE_PANEL_V1 (BEGIN)
  const price = card?.price;
  const floorEur = xsFmtEur(price?.floorEur);
  const lastSaleEur = xsFmtEur(price?.lastSaleEur);
  const avg7d = typeof price?.avg7dEur === "number" ? price.avg7dEur : null;
  const avg30d = typeof price?.avg30dEur === "number" ? price.avg30dEur : null;
  const trend = avg7d != null && avg30d != null ? avg7d - avg30d : null;
  const trendLabel = trend == null ? "—" : `${trend >= 0 ? "+" : ""}${trend.toFixed(2)}€`;
  const asOf = xsFmtAsOf(price?.asOf);
  const hasPrice = !!price;
  // XS_CARD_PRICE_PANEL_V1 (END)
  const url = String(card?.pictureUrl || "").trim();

  return (
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: theme.panel,
        borderRadius: 18,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: border,
      }}
    >
      {/* Frame Sorare-like */}
      <View style={{ padding: 12, backgroundColor: theme.panel }}>
        <View
          style={{
            width: "100%",
            aspectRatio: CARD_AR,
            borderRadius: 16,
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
        </View>        {/* XS_CARD_PRICE_PANEL_UI_V1 */}
        <View
          style={{
            marginTop: 10,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: theme.stroke,
            backgroundColor: theme.panel2,
            padding: 10,
            gap: 4,
          }}
        >
          <Text style={{ color: theme.text, fontWeight: "900", fontSize: 12 }}>Prix (J15)</Text>
          <Text style={{ color: theme.muted, fontSize: 12 }}>Dernière vente: {formatEur(card?.price?.lastSaleEur)}</Text>
          <Text style={{ color: theme.muted, fontSize: 12 }}>Moy. 7j: {formatEur(card?.price?.avg7dEur)}</Text>
          <Text style={{ color: theme.muted, fontSize: 12 }}>Moy. 30j: {formatEur(card?.price?.avg30dEur)}</Text>
          <Text style={{ color: theme.muted, fontSize: 12 }}>Floor: {formatEur(card?.price?.floorEur)}</Text>
          {!!card?.price?.asOf && (
            <Text style={{ color: theme.muted, fontSize: 11 }}>asOf: {String(card.price.asOf)}</Text>
          )}
        </View>



        {selected ? (
          <Text style={{ color: theme.accent, fontWeight: "900", marginTop: 6 }}>Sélectionnée</Text>
        ) : null}
      

        {/* XS_CARD_PRICE_PANEL_V1 (BEGIN) */}
        <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: theme.stroke }}>
          <Text style={{ color: theme.text, fontWeight: "900", marginBottom: 4 }}>Prix</Text>
          <Text style={{ color: theme.muted, fontSize: 12 }}>Floor: {floorEur}</Text>
          <Text style={{ color: theme.muted, fontSize: 12 }}>Last sale: {lastSaleEur}</Text>
          <Text style={{ color: theme.muted, fontSize: 12 }}>Trend 7j/30j: {trendLabel}</Text>
          <Text style={{ color: theme.muted, fontSize: 12 }}>As of: {asOf}</Text>
          {!hasPrice ? (
            <Text style={{ color: theme.muted, fontSize: 11, marginTop: 4 }}>
              — (prix EUR nécessite auth/APIKEY)
            </Text>
          ) : null}
        </View>
        {/* XS_CARD_PRICE_PANEL_V1 (END) */}
      </View>
    </Pressable>
  );
}

