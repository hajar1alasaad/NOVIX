import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AiBadge } from "@/components/AiBadge";
import { useApp } from "@/context/AppContext";
import { useLanguage } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";

// --- Hero cycling activities ---
const AI_ACTIVITIES_EN = [
  "Reading and processing emails...",
  "Negotiating with a client...",
  "Preparing today's schedule...",
  "Searching for new opportunities...",
  "Reviewing pending approvals...",
  "Managing active projects...",
  "Drafting client proposals...",
  "Monitoring pipeline activity...",
];

const AI_ACTIVITIES_AR = [
  "قراءة ومعالجة الرسائل...",
  "التفاوض مع عميل...",
  "إعداد جدول أعمال اليوم...",
  "البحث عن فرص جديدة...",
  "مراجعة الموافقات المعلقة...",
  "إدارة المشاريع النشطة...",
  "صياغة مقترحات للعملاء...",
  "متابعة نشاط الصفقات...",
];

// --- Live activity feed ---
interface ActivityItem {
  id: string;
  icon: React.ComponentProps<typeof Feather>["name"];
  action: string;
  actionAr: string;
  detail: string;
  detailAr: string;
  time: string;
  type: "done" | "pending" | "active";
  accent: string;
}

// --- AI stat card type ---
interface AiStat {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  labelAr: string;
  value: string | number;
  accent: string;
  accentBg: string;
  route?: string;
}

function usePulse() {
  const anim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 0.4, duration: 900, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, [anim]);
  return anim;
}

function useCyclingText(items: string[], interval = 3200) {
  const [idx, setIdx] = useState(0);
  const fade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const timer = setInterval(() => {
      Animated.sequence([
        Animated.timing(fade, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(fade, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
      setIdx((i) => (i + 1) % items.length);
    }, interval);
    return () => clearInterval(timer);
  }, [items.length, interval, fade]);

  return { text: items[idx], fade };
}

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { emails, tasks, meetings, notifications } = useApp();
  const { isRTL } = useLanguage();
  const pulse = usePulse();

  const activities = isRTL ? AI_ACTIVITIES_AR : AI_ACTIVITIES_EN;
  const { text: currentActivity, fade: activityFade } = useCyclingText(activities);

  const topPt = Platform.OS === "web" ? 67 : insets.top;

  // Derived counts
  const emailsToday = emails.filter((e) => e.folder === "inbox").length;
  const pendingApprovals = notifications.filter((n) => !n.read && n.type === "urgent").length;
  const upcomingMeetings = meetings.filter((m) => m.status === "upcoming").length;
  const tasksToday = tasks.filter((t) => t.status === "done").length;
  const activeTasks = tasks.filter((t) => t.status === "in_progress").length;
  const unreadNotifs = notifications.filter((n) => !n.read).length;

  const AI_STATS: AiStat[] = [
    {
      icon: "mail",
      label: "Emails Processed",
      labelAr: "رسائل معالجة",
      value: emailsToday,
      accent: colors.blue,
      accentBg: colors.blueDim,
      route: "/(tabs)/emails",
    },
    {
      icon: "trending-up",
      label: "Active Negotiations",
      labelAr: "مفاوضات نشطة",
      value: 2,
      accent: colors.orange,
      accentBg: colors.orangeDim,
      route: "/(tabs)/clients",
    },
    {
      icon: "calendar",
      label: "Upcoming Meetings",
      labelAr: "اجتماعات قادمة",
      value: upcomingMeetings,
      accent: colors.purple,
      accentBg: colors.purpleDim,
      route: "/(tabs)/notifications",
    },
    {
      icon: "alert-circle",
      label: "Pending Approvals",
      labelAr: "بانتظار الموافقة",
      value: pendingApprovals,
      accent: colors.red,
      accentBg: colors.redDim,
      route: "/(tabs)/notifications",
    },
    {
      icon: "check-circle",
      label: "Tasks Done Today",
      labelAr: "مهام أُنجزت اليوم",
      value: tasksToday,
      accent: colors.green,
      accentBg: colors.greenDim,
      route: "/(tabs)/tasks",
    },
    {
      icon: "layers",
      label: "Active Projects",
      labelAr: "مشاريع نشطة",
      value: activeTasks,
      accent: colors.blue,
      accentBg: colors.blueDim,
      route: "/(tabs)/tasks",
    },
    {
      icon: "zap",
      label: "Opportunities Found",
      labelAr: "فرص اكتُشفت",
      value: 3,
      accent: colors.orange,
      accentBg: colors.orangeDim,
      route: "/(tabs)/clients",
    },
    {
      icon: "cpu",
      label: "AI Status",
      labelAr: "حالة الذكاء الاصطناعي",
      value: "Active",
      accent: colors.green,
      accentBg: colors.greenDim,
      route: "/(tabs)/ai",
    },
  ];

  const FEED: ActivityItem[] = [
    {
      id: "f1",
      icon: "send",
      action: "Replied to email",
      actionAr: "تم الرد على البريد",
      detail: "Sarah Chen · Q2 Proposal",
      detailAr: "سارة تشن · عرض الربع الثاني",
      time: "2m ago",
      type: "done",
      accent: colors.green,
    },
    {
      id: "f2",
      icon: "clock",
      action: "Waiting for approval",
      actionAr: "بانتظار الموافقة",
      detail: "Contract renewal · GrowthLab",
      detailAr: "تجديد العقد · GrowthLab",
      time: "5m ago",
      type: "pending",
      accent: colors.orange,
    },
    {
      id: "f3",
      icon: "calendar",
      action: "Scheduled a meeting",
      actionAr: "تمت جدولة اجتماع",
      detail: "Nexus Corporation · Discovery Call",
      detailAr: "Nexus Corporation · مكالمة الاستكشاف",
      time: "18m ago",
      type: "done",
      accent: colors.blue,
    },
    {
      id: "f4",
      icon: "trending-up",
      action: "New opportunity found",
      actionAr: "تم اكتشاف فرصة جديدة",
      detail: "Nexus Corp · Est. $75K deal",
      detailAr: "Nexus Corp · صفقة محتملة $75K",
      time: "1h ago",
      type: "done",
      accent: colors.purple,
    },
    {
      id: "f5",
      icon: "file-text",
      action: "Prepared a contract",
      actionAr: "تم إعداد عقد",
      detail: "TechVentures Q2 Agreement",
      detailAr: "اتفاقية TechVentures للربع الثاني",
      time: "2h ago",
      type: "done",
      accent: colors.blue,
    },
    {
      id: "f6",
      icon: "bar-chart-2",
      action: "Generated weekly report",
      actionAr: "تم إنشاء التقرير الأسبوعي",
      detail: "Performance Summary · July 2026",
      detailAr: "ملخص الأداء · يوليو 2026",
      time: "3h ago",
      type: "done",
      accent: colors.green,
    },
    {
      id: "f7",
      icon: "message-circle",
      action: "Negotiated with client",
      actionAr: "تم التفاوض مع عميل",
      detail: "GrowthLab · Renewal Terms",
      detailAr: "GrowthLab · شروط التجديد",
      time: "4h ago",
      type: "active",
      accent: colors.orange,
    },
  ];

  const typeIcon = (type: ActivityItem["type"]) => {
    if (type === "done") return "check-circle";
    if (type === "pending") return "clock";
    return "loader";
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: topPt + 16, paddingBottom: insets.bottom + 100 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={[styles.header, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
        <View style={{ alignItems: isRTL ? "flex-end" : "flex-start" }}>
          <Text style={[styles.greeting, { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" }]}>
            {isRTL ? "مساعدك الذكي" : "Your AI Business Manager"}
          </Text>
          <View style={[styles.titleRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <Text style={[styles.title, { color: colors.foreground, marginRight: isRTL ? 0 : 8, marginLeft: isRTL ? 8 : 0 }]}>
              NOVIX
            </Text>
            <AiBadge label={isRTL ? "مباشر" : "LIVE"} />
          </View>
        </View>
        <Pressable
          onPress={() => router.push("/(tabs)/notifications")}
          style={[styles.notifBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Feather name="bell" size={20} color={colors.foreground} />
          {unreadNotifs > 0 && (
            <View style={[styles.badge, { backgroundColor: colors.primary }]}>
              <Text style={styles.badgeText}>{unreadNotifs}</Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* Hero — AI Current Activity */}
      <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.heroTop, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <View style={[styles.heroIconWrap, { backgroundColor: colors.redDim }]}>
            <Feather name="cpu" size={20} color={colors.red} />
          </View>
          <View style={{ flex: 1, alignItems: isRTL ? "flex-end" : "flex-start" }}>
            <Text style={[styles.heroLabel, { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" }]}>
              {isRTL ? "ما يفعله الذكاء الاصطناعي الآن" : "AI is currently"}
            </Text>
            <Animated.Text
              style={[styles.heroActivity, { color: colors.foreground, opacity: activityFade, textAlign: isRTL ? "right" : "left" }]}
            >
              {currentActivity}
            </Animated.Text>
          </View>
          <View style={[styles.liveChip, { backgroundColor: colors.greenDim, borderColor: colors.green + "50" }]}>
            <Animated.View style={[styles.liveDot, { backgroundColor: colors.green, opacity: pulse }]} />
            <Text style={[styles.liveText, { color: colors.green }]}>
              {isRTL ? "نشط" : "Active"}
            </Text>
          </View>
        </View>

        <View style={[styles.heroDivider, { backgroundColor: colors.border }]} />

        <View style={[styles.heroFooter, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <View style={[styles.heroStat, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <Feather name="activity" size={13} color={colors.mutedForeground} />
            <Text style={[styles.heroStatText, { color: colors.mutedForeground }]}>
              {isRTL ? "يعمل بلا توقف 24/7" : "Working 24/7 for you"}
            </Text>
          </View>
          <Pressable
            onPress={() => router.push("/(tabs)/ai")}
            style={[styles.heroBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={[styles.heroBtnText, { color: "#fff" }]}>
              {isRTL ? "تحدث مع الذكاء الاصطناعي" : "Talk to AI"}
            </Text>
            <Feather name={isRTL ? "arrow-left" : "arrow-right"} size={13} color="#fff" />
          </Pressable>
        </View>
      </View>

      {/* AI Activity Stats Grid */}
      <Text style={[styles.sectionTitle, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]}>
        {isRTL ? "نشاط الذكاء الاصطناعي اليوم" : "AI Activity Today"}
      </Text>
      <View style={styles.statsGrid}>
        {AI_STATS.map((stat) => (
          <Pressable
            key={stat.label}
            onPress={() => stat.route && router.push(stat.route as any)}
            style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <View style={[styles.statIconWrap, { backgroundColor: stat.accentBg }]}>
              <Feather name={stat.icon} size={16} color={stat.accent} />
            </View>
            <Text style={[styles.statValue, { color: colors.foreground }]}>
              {stat.value}
            </Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" }]}>
              {isRTL ? stat.labelAr : stat.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Live Activity Feed */}
      <View style={[styles.feedHeader, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground, marginBottom: 0 }]}>
          {isRTL ? "النشاط المباشر" : "Live Activity Feed"}
        </Text>
        <View style={[styles.feedLive, { flexDirection: isRTL ? "row-reverse" : "row", backgroundColor: colors.redDim, borderColor: colors.red + "40" }]}>
          <Animated.View style={[styles.feedDot, { backgroundColor: colors.red, opacity: pulse }]} />
          <Text style={[styles.feedLiveText, { color: colors.red }]}>
            {isRTL ? "مباشر" : "LIVE"}
          </Text>
        </View>
      </View>

      <View style={[styles.feedCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {FEED.map((item, i) => (
          <View key={item.id}>
            <View style={[styles.feedRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
              {/* Left timeline */}
              <View style={styles.feedTimeline}>
                <View style={[styles.feedIconCircle, { backgroundColor: item.accent + "20", borderColor: item.accent + "40" }]}>
                  <Feather name={item.icon} size={13} color={item.accent} />
                </View>
                {i < FEED.length - 1 && (
                  <View style={[styles.feedLine, { backgroundColor: colors.border }]} />
                )}
              </View>

              {/* Content */}
              <View style={[styles.feedContent, { alignItems: isRTL ? "flex-end" : "flex-start" }]}>
                <View style={[styles.feedContentTop, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                  <Text style={[styles.feedAction, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]}>
                    {isRTL ? item.actionAr : item.action}
                  </Text>
                  <View style={[styles.feedStatusChip, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                    <Feather name={typeIcon(item.type)} size={10} color={item.accent} />
                    <Text style={[styles.feedStatusText, { color: item.accent }]}>
                      {item.type === "done"
                        ? isRTL ? "تم" : "Done"
                        : item.type === "pending"
                        ? isRTL ? "انتظار" : "Pending"
                        : isRTL ? "جاري" : "Active"}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.feedDetail, { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" }]}>
                  {isRTL ? item.detailAr : item.detail}
                </Text>
                <Text style={[styles.feedTime, { color: colors.mutedForeground }]}>{item.time}</Text>
              </View>
            </View>
          </View>
        ))}
      </View>

      {/* Footer CTA */}
      <Pressable
        onPress={() => router.push("/(tabs)/ai")}
        style={[styles.footerCta, { backgroundColor: colors.redDim, borderColor: colors.red + "40" }]}
      >
        <View style={[styles.footerCtaInner, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <View style={[styles.footerCtaIcon, { backgroundColor: colors.primary }]}>
            <Feather name="cpu" size={16} color="#fff" />
          </View>
          <View style={{ flex: 1, alignItems: isRTL ? "flex-end" : "flex-start" }}>
            <Text style={[styles.footerCtaTitle, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]}>
              {isRTL ? "NOVIX يعمل من أجلك الآن" : "NOVIX is working for you now"}
            </Text>
            <Text style={[styles.footerCtaSub, { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" }]}>
              {isRTL ? "اسأله أي شيء أو أعطه مهمة" : "Ask it anything or assign a task"}
            </Text>
          </View>
          <Feather name={isRTL ? "chevron-left" : "chevron-right"} size={18} color={colors.red} />
        </View>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 20 },

  // Header
  header: { alignItems: "flex-start", justifyContent: "space-between" },
  greeting: { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 2 },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: -1 },
  titleRow: { alignItems: "center" },
  notifBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  badge: { position: "absolute", top: -4, right: -4, width: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  badgeText: { color: "#fff", fontSize: 10, fontFamily: "Inter_700Bold" },

  // Hero card
  heroCard: { borderRadius: 20, padding: 18, borderWidth: 1, gap: 14 },
  heroTop: { alignItems: "flex-start", gap: 12 },
  heroIconWrap: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  heroLabel: { fontSize: 11, fontFamily: "Inter_500Medium", letterSpacing: 0.3, marginBottom: 4 },
  heroActivity: { fontSize: 16, fontFamily: "Inter_600SemiBold", lineHeight: 22 },
  liveChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  liveText: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  heroDivider: { height: 1 },
  heroFooter: { alignItems: "center", justifyContent: "space-between" },
  heroStat: { alignItems: "center", gap: 6 },
  heroStatText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  heroBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
  },
  heroBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },

  // Section title
  sectionTitle: { fontSize: 18, fontFamily: "Inter_700Bold", letterSpacing: -0.3, marginBottom: 4 },

  // Stats grid
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statCard: {
    width: "47%",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    gap: 8,
  },
  statIconWrap: { width: 36, height: 36, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  statValue: { fontSize: 26, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  statLabel: { fontSize: 12, fontFamily: "Inter_500Medium", lineHeight: 16 },

  // Feed
  feedHeader: { alignItems: "center", justifyContent: "space-between" },
  feedLive: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  feedDot: { width: 6, height: 6, borderRadius: 3 },
  feedLiveText: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.8 },
  feedCard: { borderRadius: 18, borderWidth: 1, overflow: "hidden" },
  feedRow: { paddingHorizontal: 16, paddingVertical: 14, alignItems: "flex-start", gap: 12 },
  feedTimeline: { alignItems: "center", gap: 0, width: 32 },
  feedIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  feedLine: { width: 1.5, flex: 1, minHeight: 16, marginTop: 4 },
  feedContent: { flex: 1, gap: 3, paddingBottom: 2 },
  feedContentTop: { alignItems: "center", gap: 8 },
  feedAction: { fontSize: 13, fontFamily: "Inter_600SemiBold", flex: 1 },
  feedStatusChip: { alignItems: "center", gap: 4 },
  feedStatusText: { fontSize: 10, fontFamily: "Inter_700Bold" },
  feedDetail: { fontSize: 12, fontFamily: "Inter_400Regular" },
  feedTime: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },

  // Footer CTA
  footerCta: { borderRadius: 18, borderWidth: 1, overflow: "hidden" },
  footerCtaInner: { padding: 16, alignItems: "center", gap: 12 },
  footerCtaIcon: { width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  footerCtaTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  footerCtaSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
});
