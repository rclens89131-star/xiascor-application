/* XS_HOME_NOTIFICATION_CENTER_V1 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useCallback, useEffect, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { apiFetch } from "../src/api";

const DEVICE_ID_KEY = "XS_DEVICE_ID_V1";
const JWT_DEVICE_ID_KEY = "XS_JWT_DEVICE_ID_V1";
const OAUTH_DEVICE_ID_KEY = "xs_device_id";

type NotificationItem = {
  id: string;
  type?: string | null;
  title?: string | null;
  message?: string | null;
  severity?: string | null;
  createdAt?: string | null;
  readAt?: string | null;
  relatedScreen?: string | null;
};

type NotificationsPayload = {
  ok?: boolean;
  unreadCount?: number | null;
  items?: NotificationItem[];
};

async function readNotificationsDeviceIdV1(): Promise<string | null> {
  const oauthId = (await AsyncStorage.getItem(OAUTH_DEVICE_ID_KEY)) || "";
  if (oauthId.trim()) return oauthId.trim();
  const jwtId = (await AsyncStorage.getItem(JWT_DEVICE_ID_KEY)) || "";
  if (jwtId.trim()) return jwtId.trim();
  const existing = (await AsyncStorage.getItem(DEVICE_ID_KEY)) || "";
  return existing.trim() || null;
}

function notificationDateLabelV1(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function notificationToneV1(severity?: string | null) {
  if (severity === "success") return { icon: "checkmark-circle", color: "#2FE66B" };
  if (severity === "warning") return { icon: "warning", color: "#FFD43B" };
  if (severity === "error") return { icon: "alert-circle", color: "#FF3148" };
  return { icon: "notifications", color: "#FF3148" };
}

export default function NotificationsScreen() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadNotifications = useCallback(async (mode: "initial" | "refresh" | "focus" = "initial") => {
    try {
      if (mode === "initial") setLoading(true);
      if (mode === "refresh") setRefreshing(true);
      const deviceId = await readNotificationsDeviceIdV1();
      const qs = new URLSearchParams();
      if (deviceId) qs.set("deviceId", deviceId);
      const payload = await apiFetch<NotificationsPayload>(`/notifications${qs.toString() ? `?${qs.toString()}` : ""}`);
      if (!payload || payload.ok === false) throw new Error("notifications_unavailable");
      setItems(Array.isArray(payload.items) ? payload.items : []);
      setUnreadCount(Number(payload.unreadCount || 0));
      setError(null);
    } catch {
      setError("Notifications indisponibles pour le moment.");
      setItems([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications("initial");
  }, [loadNotifications]);

  useFocusEffect(
    useCallback(() => {
      loadNotifications("focus");
      return undefined;
    }, [loadNotifications])
  );

  const markOneRead = useCallback(async (item: NotificationItem) => {
    try {
      const deviceId = await readNotificationsDeviceIdV1();
      await apiFetch(`/notifications/${encodeURIComponent(item.id)}/read`, {
        method: "POST",
        body: JSON.stringify({ deviceId }),
      });
      setItems((current) => current.map((row) => row.id === item.id ? { ...row, readAt: row.readAt || new Date().toISOString() } : row));
      setUnreadCount((count) => Math.max(0, count - (item.readAt ? 0 : 1)));
      if (item.relatedScreen) (router as any).push(item.relatedScreen);
    } catch {
      if (item.relatedScreen) (router as any).push(item.relatedScreen);
    }
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      const deviceId = await readNotificationsDeviceIdV1();
      await apiFetch("/notifications/read-all", {
        method: "POST",
        body: JSON.stringify({ deviceId }),
      });
      const now = new Date().toISOString();
      setItems((current) => current.map((item) => ({ ...item, readAt: item.readAt || now })));
      setUnreadCount(0);
    } catch {
      setError("Lecture impossible pour le moment.");
    }
  }, []);

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadNotifications("refresh")} tintColor="#FF3148" />}
      >
        <View style={styles.header}>
          <Pressable accessibilityRole="button" onPress={() => router.back()} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          </Pressable>
          <View style={styles.headerText}>
            <Text style={styles.title}>Notifications</Text>
            <Text style={styles.subtitle}>{unreadCount > 0 ? `${unreadCount} non lue(s)` : "Centre du club à jour"}</Text>
          </View>
          <Pressable accessibilityRole="button" onPress={markAllRead} style={({ pressed }) => [styles.readAllButton, pressed && styles.pressed]}>
            <Text style={styles.readAllText}>Tout lire</Text>
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Lecture du centre de notifications...</Text>
          </View>
        ) : error ? (
          <View style={styles.emptyCard}>
            <Ionicons name="cloud-offline-outline" size={28} color="#FF3148" />
            <Text style={styles.emptyTitle}>{error}</Text>
            <Text style={styles.emptyText}>Les données reviendront automatiquement quand le backend sera disponible.</Text>
          </View>
        ) : items.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="checkmark-circle-outline" size={32} color="#2FE66B" />
            <Text style={styles.emptyTitle}>Aucune notification</Text>
            <Text style={styles.emptyText}>Le club n'a rien de nouveau à signaler pour le moment.</Text>
          </View>
        ) : (
          items.map((item) => {
            const tone = notificationToneV1(item.severity);
            return (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                onPress={() => markOneRead(item)}
                style={({ pressed }) => [styles.notificationCard, !item.readAt && styles.unreadCard, pressed && styles.pressed]}
              >
                <View style={[styles.iconBubble, { borderColor: tone.color }]}>
                  <Ionicons name={tone.icon as any} size={20} color={tone.color} />
                </View>
                <View style={styles.notificationBody}>
                  <View style={styles.notificationTopLine}>
                    <Text style={styles.notificationTitle}>{item.title || "Notification Xiascor"}</Text>
                    {!item.readAt ? <View style={styles.unreadDot} /> : null}
                  </View>
                  <Text style={styles.notificationMessage}>{item.message || "Donnée indisponible"}</Text>
                  <Text style={styles.notificationDate}>{notificationDateLabelV1(item.createdAt)}</Text>
                </View>
                {item.relatedScreen ? <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.55)" /> : null}
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#030406",
  },
  content: {
    gap: 14,
    paddingBottom: 96,
    paddingHorizontal: 18,
    paddingTop: 8,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  backButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderColor: "rgba(255,255,255,0.14)",
    borderRadius: 22,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  headerText: {
    flex: 1,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "900",
  },
  subtitle: {
    color: "rgba(255,255,255,0.62)",
    fontSize: 14,
    fontWeight: "800",
    marginTop: 3,
  },
  readAllButton: {
    backgroundColor: "rgba(255,33,59,0.16)",
    borderColor: "rgba(255,49,72,0.55)",
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  readAllText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
  },
  notificationCard: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.045)",
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 14,
  },
  unreadCard: {
    backgroundColor: "rgba(255,49,72,0.10)",
    borderColor: "rgba(255,49,72,0.35)",
  },
  iconBubble: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.32)",
    borderRadius: 18,
    borderWidth: 1,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  notificationBody: {
    flex: 1,
    gap: 4,
  },
  notificationTopLine: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  notificationTitle: {
    color: "#FFFFFF",
    flex: 1,
    fontSize: 15,
    fontWeight: "900",
  },
  unreadDot: {
    backgroundColor: "#FF3148",
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  notificationMessage: {
    color: "rgba(255,255,255,0.70)",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },
  notificationDate: {
    color: "rgba(255,255,255,0.42)",
    fontSize: 11,
    fontWeight: "800",
  },
  emptyCard: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.045)",
    borderColor: "rgba(255,49,72,0.20)",
    borderRadius: 18,
    borderWidth: 1,
    gap: 10,
    padding: 22,
  },
  emptyTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
    textAlign: "center",
  },
  emptyText: {
    color: "rgba(255,255,255,0.62)",
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },
  pressed: {
    opacity: 0.72,
  },
});
