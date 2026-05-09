/* XS_HOME_FEED_V2_PREMIUM_STABLE */
import React, { useState } from "react";
import { GestureResponderEvent, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { theme } from "../theme";

export type FeedCategory = "Tout" | "Ligue 1" | "MLS" | "Blessures" | "Trending";
export type ImpactSeverity = "Faible" | "Moyen" | "Élevé" | "Critique";

export type FeedItem = {
  id: string;
  title: string;
  image: string;
  source: string;
  time: string;
  impact: string;
  severity: ImpactSeverity;
  l5?: number;
  l15?: number;
  category: FeedCategory;
};

type FeedCardProps = {
  item: FeedItem;
  useful: boolean;
  watched: boolean;
  followed: boolean;
  onPress: () => void;
  onUseful: () => void;
  onWatchlist: () => void;
  onFollow: () => void;
};

type ActionButtonProps = {
  active: boolean;
  activeBackground: string;
  activeBorder: string;
  accessibilityLabel: string;
  icon: string;
  label: string;
  onPress: () => void;
};

const severityStyles: Record<ImpactSeverity, { backgroundColor: string; borderColor: string; color: string }> = {
  Faible: {
    backgroundColor: "rgba(34, 197, 94, 0.15)",
    borderColor: "rgba(34, 197, 94, 0.38)",
    color: "#BBF7D0",
  },
  Moyen: {
    backgroundColor: "rgba(245, 158, 11, 0.16)",
    borderColor: "rgba(245, 158, 11, 0.42)",
    color: "#FDE68A",
  },
  Élevé: {
    backgroundColor: "rgba(249, 115, 22, 0.18)",
    borderColor: "rgba(249, 115, 22, 0.48)",
    color: "#FED7AA",
  },
  Critique: {
    backgroundColor: "rgba(239, 68, 68, 0.18)",
    borderColor: "rgba(239, 68, 68, 0.48)",
    color: "#FECACA",
  },
};

function ActionButton({
  active,
  activeBackground,
  activeBorder,
  accessibilityLabel,
  icon,
  label,
  onPress,
}: ActionButtonProps) {
  const handlePress = (event: GestureResponderEvent) => {
    event.stopPropagation();
    onPress();
  };

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.actionButton,
        active ? { backgroundColor: activeBackground, borderColor: activeBorder } : null,
        pressed ? styles.pressed : null,
      ]}
    >
      <Text style={styles.actionIcon}>{icon}</Text>
      <Text style={[styles.actionText, active ? styles.actionTextActive : null]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

export function FeedCard({
  item,
  useful,
  watched,
  followed,
  onPress,
  onUseful,
  onWatchlist,
  onFollow,
}: FeedCardProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const hasStats = typeof item.l5 === "number" || typeof item.l15 === "number";
  const severityStyle = severityStyles[item.severity];
  const showRemoteImage = Boolean(item.image) && !imageFailed;

  return (
    <Pressable
      accessibilityLabel={`Ouvrir le signal ${item.title}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.shadowWrap, pressed ? styles.cardPressed : null]}
    >
      <View style={styles.card}>
        <View style={styles.imageWrap}>
          {showRemoteImage ? (
            <Image
              onError={() => setImageFailed(true)}
              resizeMode="cover"
              source={{ uri: item.image }}
              style={styles.image}
            />
          ) : (
            <LinearGradient colors={["#16324A", "#101827"]} style={styles.imageFallback}>
              <Text style={styles.fallbackKicker}>Signal Sorare</Text>
              <Text style={styles.fallbackTitle}>{item.category}</Text>
            </LinearGradient>
          )}

          <LinearGradient
            colors={["rgba(7, 11, 19, 0.06)", "rgba(7, 11, 19, 0.92)"]}
            style={StyleSheet.absoluteFill}
          />

          <View style={styles.imageTopRow}>
            <View style={styles.categoryChip}>
              <Text style={styles.categoryText}>{item.category}</Text>
            </View>
            <View style={[styles.severityChip, { backgroundColor: severityStyle.backgroundColor, borderColor: severityStyle.borderColor }]}>
              <Text style={[styles.severityText, { color: severityStyle.color }]}>{item.severity}</Text>
            </View>
          </View>

          <View style={styles.imageText}>
            <Text style={styles.title} numberOfLines={2}>
              {item.title}
            </Text>
            <View style={styles.sourceBadge}>
              <Text style={styles.sourceText} numberOfLines={1}>
                {item.source}
              </Text>
              <View style={styles.sourceDot} />
              <Text style={styles.timeText}>{item.time}</Text>
            </View>
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.impactBox}>
            <View style={styles.impactHeader}>
              <Text style={styles.impactLabel}>Impact Sorare</Text>
              <Text style={[styles.impactSeverity, { color: severityStyle.color }]}>{item.severity}</Text>
            </View>
            <Text style={styles.impactText}>{item.impact}</Text>
          </View>

          {hasStats ? (
            <View style={styles.statsRow}>
              <Text style={styles.statsLabel}>Stats joueur</Text>
              <View style={styles.statPill}>
                <Text style={styles.statText}>L5: {typeof item.l5 === "number" ? item.l5 : "-"}</Text>
                <View style={styles.statDivider} />
                <Text style={styles.statText}>L15: {typeof item.l15 === "number" ? item.l15 : "-"}</Text>
              </View>
            </View>
          ) : null}

          <View style={styles.actions}>
            <ActionButton
              accessibilityLabel={`${useful ? "Retirer des signaux utiles" : "Marquer utile"} - ${item.title}`}
              active={useful}
              activeBackground="rgba(34, 197, 94, 0.24)"
              activeBorder="rgba(34, 197, 94, 0.72)"
              icon="👍"
              label="Utile"
              onPress={onUseful}
            />
            <ActionButton
              accessibilityLabel={`${watched ? "Retirer de la watchlist" : "Ajouter à la watchlist"} - ${item.title}`}
              active={watched}
              activeBackground="rgba(245, 158, 11, 0.26)"
              activeBorder="rgba(245, 158, 11, 0.76)"
              icon="⭐"
              label="Watchlist"
              onPress={onWatchlist}
            />
            <ActionButton
              accessibilityLabel={`${followed ? "Ne plus suivre" : "Suivre"} - ${item.title}`}
              active={followed}
              activeBackground="rgba(59, 130, 246, 0.26)"
              activeBorder="rgba(96, 165, 250, 0.78)"
              icon="🔔"
              label="Suivre"
              onPress={onFollow}
            />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shadowWrap: {
    borderRadius: 16,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    width: "100%",
  },
  card: {
    backgroundColor: "#101827",
    borderColor: "rgba(255, 255, 255, 0.11)",
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  cardPressed: {
    opacity: 0.93,
    transform: [{ scale: 0.995 }],
  },
  imageWrap: {
    backgroundColor: theme.panel2,
    height: 188,
    position: "relative",
    width: "100%",
  },
  image: {
    height: "100%",
    width: "100%",
  },
  imageFallback: {
    alignItems: "flex-start",
    height: "100%",
    justifyContent: "center",
    paddingHorizontal: 18,
    width: "100%",
  },
  fallbackKicker: {
    color: "rgba(248, 250, 252, 0.72)",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  fallbackTitle: {
    color: "#F8FAFC",
    fontSize: 28,
    fontWeight: "900",
    marginTop: 4,
  },
  imageTopRow: {
    flexDirection: "row",
    gap: 8,
    left: 12,
    position: "absolute",
    right: 12,
    top: 12,
  },
  categoryChip: {
    backgroundColor: "rgba(15, 23, 42, 0.76)",
    borderColor: "rgba(255, 255, 255, 0.18)",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  categoryText: {
    color: "#F8FAFC",
    fontSize: 11,
    fontWeight: "900",
  },
  severityChip: {
    borderRadius: 999,
    borderWidth: 1,
    marginLeft: "auto",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  severityText: {
    fontSize: 11,
    fontWeight: "900",
  },
  imageText: {
    bottom: 0,
    left: 0,
    padding: 12,
    position: "absolute",
    right: 0,
  },
  title: {
    color: "#F8FAFC",
    fontSize: 21,
    fontWeight: "900",
    lineHeight: 26,
  },
  sourceBadge: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(15, 23, 42, 0.72)",
    borderColor: "rgba(255, 255, 255, 0.16)",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 7,
    marginTop: 8,
    maxWidth: "100%",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  sourceText: {
    color: "#F8FAFC",
    flexShrink: 1,
    fontSize: 12,
    fontWeight: "900",
  },
  sourceDot: {
    backgroundColor: "rgba(248, 250, 252, 0.46)",
    borderRadius: 2,
    height: 4,
    width: 4,
  },
  timeText: {
    color: "rgba(248, 250, 252, 0.74)",
    fontSize: 12,
    fontWeight: "800",
  },
  body: {
    gap: 12,
    padding: 12,
  },
  impactBox: {
    backgroundColor: "rgba(245, 158, 11, 0.10)",
    borderColor: "rgba(245, 158, 11, 0.26)",
    borderRadius: 13,
    borderWidth: 1,
    padding: 12,
  },
  impactHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  impactLabel: {
    color: "#FDE68A",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  impactSeverity: {
    fontSize: 12,
    fontWeight: "900",
  },
  impactText: {
    color: theme.text,
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 21,
    marginTop: 6,
  },
  statsRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  statsLabel: {
    color: theme.muted,
    flexShrink: 0,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  statPill: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderColor: "rgba(255, 255, 255, 0.10)",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statText: {
    color: theme.text,
    fontSize: 13,
    fontWeight: "900",
  },
  statDivider: {
    backgroundColor: "rgba(255, 255, 255, 0.22)",
    height: 14,
    marginHorizontal: 10,
    width: 1,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.055)",
    borderColor: "rgba(255, 255, 255, 0.11)",
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 8,
  },
  actionIcon: {
    fontSize: 14,
  },
  actionText: {
    color: "rgba(226, 232, 240, 0.74)",
    flexShrink: 1,
    fontSize: 12,
    fontWeight: "900",
  },
  actionTextActive: {
    color: "#FFFFFF",
  },
  pressed: {
    opacity: 0.82,
  },
});
