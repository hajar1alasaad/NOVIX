import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React from "react";
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp, type Notification } from "@/context/AppContext";
import { useLanguage } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";

export default function NotificationsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { notifications, markNotificationRead } = useApp();
  const router = useRouter();
  const { t, isRTL } = useLanguage();

  const topPt = Platform.OS === "web" ? 67 : insets.top;
  const unread = notifications.filter((n) => !n.read).length;

  const handlePress = (notif: Notification) => {
    markNotificationRead(notif.id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (notif.action === "review_email") router.push("/(tabs)/emails");
    else if (notif.action === "view_deal") router.push("/(tabs)/clients");
    else if (notif.action === "view_client") router.push("/(tabs)/clients");
  };

  const typeConfig = {
    urgent: { icon: "alert-circle" as const, color: colors.red, bg: colors.redDim },
    warning: { icon: "alert-triangle" as const, color: colors.orange, bg: colors.orangeDim },
    success: { icon: "check-circle" as const, color: colors.green, bg: colors.greenDim },
    info: { icon: "info" as const, color: colors.blue, bg: colors.blueDim },
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPt + 12, borderBottomColor: colors.border, flexDirection: isRTL ? "row-reverse" : "row" }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>{t.notifications}</Text>
        {unread > 0 && (
          <View style={[styles.badge, { backgroundColor: colors.primary }]}>
            <Text style={styles.badgeText}>{t.unreadNotifs(unread)}</Text>
          </View>
        )}
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 100 }]}
        renderItem={({ item }) => {
          const cfg = typeConfig[item.type];
          return (
            <Pressable
              onPress={() => handlePress(item)}
              style={[styles.notifCard, { backgroundColor: item.read ? colors.background : colors.card, borderColor: item.read ? colors.border : cfg.color + "40", flexDirection: isRTL ? "row-reverse" : "row" }]}
            >
              <View style={[styles.iconWrap, { backgroundColor: cfg.bg }]}>
                <Feather name={cfg.icon} size={18} color={cfg.color} />
              </View>
              <View style={[styles.notifContent, { alignItems: isRTL ? "flex-end" : "flex-start" }]}>
                <View style={[styles.notifTop, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                  <Text style={[styles.notifTitle, { color: colors.foreground, fontFamily: item.read ? "Inter_500Medium" : "Inter_700Bold", textAlign: isRTL ? "right" : "left" }]}>
                    {item.title}
                  </Text>
                  <Text style={[styles.notifTime, { color: colors.mutedForeground }]}>{formatTime(item.timestamp)}</Text>
                </View>
                <Text style={[styles.notifMessage, { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" }]}>{item.message}</Text>
                {item.action && (
                  <TouchableOpacity style={[styles.actionBtn, { borderColor: cfg.color + "60", flexDirection: isRTL ? "row-reverse" : "row" }]}>
                    <Text style={[styles.actionBtnText, { color: cfg.color }]}>{t.takeAction}</Text>
                    <Feather name={isRTL ? "arrow-left" : "arrow-right"} size={12} color={cfg.color} />
                  </TouchableOpacity>
                )}
              </View>
              {!item.read && <View style={[styles.unreadDot, { backgroundColor: cfg.color }]} />}
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="bell-off" size={40} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>{t.noNotifications}</Text>
          </View>
        }
      />
    </View>
  );
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60 * 60 * 1000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / (24 * 60 * 60 * 1000))}d ago`;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 14, justifyContent: "space-between", borderBottomWidth: 1 },
  headerTitle: { fontSize: 26, fontFamily: "Inter_700Bold", letterSpacing: -0.8 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { color: "#fff", fontSize: 12, fontFamily: "Inter_700Bold" },
  list: { padding: 16, gap: 10 },
  notifCard: { alignItems: "flex-start", gap: 14, padding: 16, borderRadius: 18, borderWidth: 1 },
  iconWrap: { width: 40, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  notifContent: { flex: 1, gap: 6 },
  notifTop: { justifyContent: "space-between" },
  notifTitle: { fontSize: 14, flex: 1, marginRight: 8 },
  notifTime: { fontSize: 11, fontFamily: "Inter_400Regular" },
  notifMessage: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
  actionBtn: { alignItems: "center", gap: 6, alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, marginTop: 4 },
  actionBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  unreadDot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  empty: { alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 16, fontFamily: "Inter_400Regular" },
});
