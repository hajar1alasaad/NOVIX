import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AiBadge } from "@/components/AiBadge";
import { useApp } from "@/context/AppContext";
import { useLanguage } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";
import type { Language } from "@/constants/translations";

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { aiMemory } = useApp();
  const { t, language, setLanguage, isRTL } = useLanguage();
  const [autoReply, setAutoReply] = useState(true);
  const [autoTask, setAutoTask] = useState(true);
  const [autoSchedule, setAutoSchedule] = useState(false);
  const [approvalRequired, setApprovalRequired] = useState(true);
  const [dailyBriefing, setDailyBriefing] = useState(true);
  const [smartPriority, setSmartPriority] = useState(true);

  const topPt = Platform.OS === "web" ? 67 : insets.top;
  const dir = isRTL ? "rtl" : "ltr";

  const handleLanguageChange = (lang: Language) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLanguage(lang);
  };

  const SettingRow = ({
    icon,
    title,
    subtitle,
    value,
    onToggle,
    accent,
  }: {
    icon: React.ComponentProps<typeof Feather>["name"];
    title: string;
    subtitle?: string;
    value: boolean;
    onToggle: (v: boolean) => void;
    accent?: boolean;
  }) => (
    <View style={[styles.settingRow, { borderBottomColor: colors.border, flexDirection: isRTL ? "row-reverse" : "row" }]}>
      <View style={[styles.settingIcon, { backgroundColor: accent ? colors.redDim : colors.muted }]}>
        <Feather name={icon} size={16} color={accent ? colors.red : colors.mutedForeground} />
      </View>
      <View style={[styles.settingContent, { alignItems: isRTL ? "flex-end" : "flex-start" }]}>
        <Text style={[styles.settingTitle, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]}>{title}</Text>
        {subtitle && (
          <Text style={[styles.settingSubtitle, { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" }]}>{subtitle}</Text>
        )}
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: colors.muted, true: colors.primary }}
        thumbColor="#fff"
      />
    </View>
  );

  const MenuRow = ({
    icon,
    title,
    value,
    accent,
  }: {
    icon: React.ComponentProps<typeof Feather>["name"];
    title: string;
    value?: string;
    accent?: boolean;
  }) => (
    <TouchableOpacity style={[styles.menuRow, { borderBottomColor: colors.border, flexDirection: isRTL ? "row-reverse" : "row" }]}>
      <View style={[styles.settingIcon, { backgroundColor: accent ? colors.redDim : colors.muted }]}>
        <Feather name={icon} size={16} color={accent ? colors.red : colors.mutedForeground} />
      </View>
      <Text style={[styles.settingTitle, { color: colors.foreground, flex: 1, textAlign: isRTL ? "right" : "left" }]}>{title}</Text>
      {value && (
        <Text style={[styles.menuValue, { color: colors.mutedForeground }]}>{value}</Text>
      )}
      <Feather name={isRTL ? "chevron-left" : "chevron-right"} size={16} color={colors.mutedForeground} />
    </TouchableOpacity>
  );

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: topPt + 12, paddingBottom: insets.bottom + 100 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={[styles.header, { alignItems: isRTL ? "flex-end" : "flex-start" }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]}>{t.settings}</Text>
      </View>

      {/* Profile Card */}
      <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border, flexDirection: isRTL ? "row-reverse" : "row" }]}>
        <View style={[styles.profileAvatar, { backgroundColor: colors.redDim }]}>
          <Feather name="cpu" size={28} color={colors.red} />
        </View>
        <View style={[styles.profileInfo, { alignItems: isRTL ? "flex-end" : "flex-start" }]}>
          <Text style={[styles.profileName, { color: colors.foreground }]}>{t.blackAgent}</Text>
          <Text style={[styles.profileEmail, { color: colors.mutedForeground }]}>{t.aiBusinessManager}</Text>
        </View>
        <AiBadge label="PRO" />
      </View>

      {/* Language Section */}
      <Text style={[styles.sectionTitle, { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" }]}>
        {t.languageSection}
      </Text>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.langNote, { borderBottomColor: colors.border, flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <View style={[styles.settingIcon, { backgroundColor: colors.blueDim }]}>
            <Feather name="globe" size={16} color={colors.blue} />
          </View>
          <Text style={[styles.settingSubtitle, { color: colors.mutedForeground, flex: 1, textAlign: isRTL ? "right" : "left" }]}>
            {t.languageNote}
          </Text>
        </View>
        <View style={[styles.langOptions, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          {(["en", "ar"] as Language[]).map((lang) => {
            const selected = language === lang;
            const label = lang === "en" ? t.english : t.arabic;
            const flag = lang === "en" ? "🇬🇧" : "🇸🇦";
            return (
              <TouchableOpacity
                key={lang}
                onPress={() => handleLanguageChange(lang)}
                style={[
                  styles.langBtn,
                  {
                    backgroundColor: selected ? colors.primary : colors.background,
                    borderColor: selected ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text style={styles.langFlag}>{flag}</Text>
                <Text
                  style={[
                    styles.langLabel,
                    { color: selected ? "#fff" : colors.foreground },
                  ]}
                >
                  {label}
                </Text>
                {selected && (
                  <Feather name="check" size={14} color="#fff" />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* AI Automation */}
      <Text style={[styles.sectionTitle, { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" }]}>{t.aiAutomation}</Text>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <SettingRow icon="mail" title={t.autoReplyEmails} subtitle={t.autoReplyDesc} value={autoReply} onToggle={setAutoReply} accent />
        <SettingRow icon="check-square" title={t.autoCreateTasks} subtitle={t.autoCreateTasksDesc} value={autoTask} onToggle={setAutoTask} accent />
        <SettingRow icon="calendar" title={t.autoScheduleMeetings} subtitle={t.autoScheduleDesc} value={autoSchedule} onToggle={setAutoSchedule} accent />
        <SettingRow icon="shield" title={t.approvalRequired} subtitle={t.approvalDesc} value={approvalRequired} onToggle={setApprovalRequired} accent />
      </View>

      {/* AI Preferences */}
      <Text style={[styles.sectionTitle, { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" }]}>{t.aiPreferences}</Text>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <SettingRow icon="sun" title={t.dailyBriefing} subtitle={t.dailyBriefingDesc} value={dailyBriefing} onToggle={setDailyBriefing} />
        <SettingRow icon="zap" title={t.smartPrioritization} subtitle={t.smartPriorityDesc} value={smartPriority} onToggle={setSmartPriority} />
      </View>

      {/* AI Memory */}
      <Text style={[styles.sectionTitle, { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" }]}>{t.aiMemory}</Text>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.memoryHeader, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <View style={[styles.settingIcon, { backgroundColor: colors.redDim }]}>
            <Feather name="database" size={16} color={colors.red} />
          </View>
          <View style={[styles.settingContent, { alignItems: isRTL ? "flex-end" : "flex-start" }]}>
            <Text style={[styles.settingTitle, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]}>{t.businessMemory}</Text>
            <Text style={[styles.settingSubtitle, { color: colors.mutedForeground }]}>{t.entriesStored(aiMemory.length)}</Text>
          </View>
          <AiBadge />
        </View>
        <View style={[styles.memoryList, { borderTopColor: colors.border }]}>
          {aiMemory.slice(0, 4).map((mem, i) => (
            <View key={i} style={[styles.memoryItem, { borderBottomColor: colors.border, flexDirection: isRTL ? "row-reverse" : "row" }]}>
              <View style={[styles.memDot, { backgroundColor: colors.red }]} />
              <Text style={[styles.memoryText, { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" }]} numberOfLines={2}>
                {mem}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Integrations */}
      <Text style={[styles.sectionTitle, { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" }]}>{t.integrations}</Text>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {[
          { icon: "mail" as const, title: "Gmail", value: t.connected },
          { icon: "calendar" as const, title: "Google Calendar", value: t.connect },
          { icon: "video" as const, title: "Zoom", value: t.connect },
          { icon: "slack" as const, title: "Slack", value: t.connect },
          { icon: "credit-card" as const, title: "Stripe", value: t.connect },
        ].map((item) => (
          <MenuRow key={item.title} {...item} />
        ))}
      </View>

      {/* Account */}
      <Text style={[styles.sectionTitle, { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" }]}>{t.account}</Text>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <MenuRow icon="user" title={t.profile} />
        <MenuRow icon="lock" title={t.security} />
        <MenuRow icon="bell" title={t.notifications} />
        <MenuRow icon="moon" title={t.appearance} value={t.dark} />
      </View>

      {/* Version */}
      <Text style={[styles.version, { color: colors.mutedForeground }]}>NOVIX v1.0.0 · Production</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 12 },
  header: { marginBottom: 4 },
  headerTitle: { fontSize: 26, fontFamily: "Inter_700Bold", letterSpacing: -0.8 },
  profileCard: {
    alignItems: "center",
    gap: 14,
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 4,
  },
  profileAvatar: { width: 56, height: 56, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 17, fontFamily: "Inter_700Bold" },
  profileEmail: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  sectionTitle: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 0.8, marginTop: 8, marginBottom: 4 },
  card: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  langNote: {
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  langOptions: { gap: 10, padding: 12 },
  langBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  langFlag: { fontSize: 20 },
  langLabel: { fontSize: 15, fontFamily: "Inter_700Bold" },
  settingRow: {
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  menuRow: {
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  settingIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  settingContent: { flex: 1 },
  settingTitle: { fontSize: 15, fontFamily: "Inter_500Medium" },
  settingSubtitle: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  menuValue: { fontSize: 13, fontFamily: "Inter_400Regular" },
  memoryHeader: {
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  memoryList: { borderTopWidth: 1 },
  memoryItem: {
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  memDot: { width: 6, height: 6, borderRadius: 3, marginTop: 6 },
  memoryText: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1, lineHeight: 20 },
  version: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 8, marginBottom: 20 },
});
