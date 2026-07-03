import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AiBadge } from "@/components/AiBadge";
import { useApp, type EmailItem } from "@/context/AppContext";
import { useLanguage } from "@/context/LanguageContext";
import { useAI } from "@/hooks/useAI";
import { useColors } from "@/hooks/useColors";

export default function EmailsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { emails, markEmailRead } = useApp();
  const { generateEmailReply, loading } = useAI();
  const { t, isRTL } = useLanguage();
  const [selected, setSelected] = useState<EmailItem | null>(null);
  const [aiReply, setAiReply] = useState("");
  const [editingReply, setEditingReply] = useState("");
  const [generating, setGenerating] = useState(false);
  const [folder, setFolder] = useState<"inbox" | "sent" | "drafts" | "archive">("inbox");

  const topPt = Platform.OS === "web" ? 67 : insets.top;
  const filtered = emails.filter((e) => e.folder === folder);
  const unread = emails.filter((e) => !e.read && e.folder === "inbox").length;

  const openEmail = (email: EmailItem) => {
    markEmailRead(email.id);
    setSelected(email);
    setAiReply(email.aiReply ?? "");
    setEditingReply(email.aiReply ?? "");
    Haptics.selectionAsync();
  };

  const handleGenerateReply = async () => {
    if (!selected) return;
    setGenerating(true);
    try {
      const reply = await generateEmailReply(
        `From: ${selected.fromName}\nSubject: ${selected.subject}\n\n${selected.body}`
      );
      setAiReply(reply);
      setEditingReply(reply);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } finally {
      setGenerating(false);
    }
  };

  const priorityColor = (p: string) =>
    p === "high" ? colors.red : p === "low" ? colors.mutedForeground : colors.blue;

  const folderLabels: Record<string, string> = {
    inbox: t.inbox,
    sent: t.sent,
    drafts: t.drafts,
    archive: t.archive,
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPt + 12, backgroundColor: colors.background, borderBottomColor: colors.border, flexDirection: isRTL ? "row-reverse" : "row" }]}>
        <View style={{ alignItems: isRTL ? "flex-end" : "flex-start" }}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>{t.emailCenter}</Text>
          {unread > 0 && (
            <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>{t.unreadAiReady(unread)}</Text>
          )}
        </View>
        <AiBadge label={t.aiInbox} />
      </View>

      {/* Folder Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.tabs, { borderBottomColor: colors.border }]}
        contentContainerStyle={styles.tabsContent}
      >
        {(["inbox", "sent", "drafts", "archive"] as const).map((f) => (
          <TouchableOpacity
            key={f}
            onPress={() => setFolder(f)}
            style={[styles.tab, folder === f && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
          >
            <Text style={[styles.tabText, { color: folder === f ? colors.primary : colors.mutedForeground }]}>
              {folderLabels[f]}{f === "inbox" && unread > 0 ? ` (${unread})` : ""}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Email List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 100 }]}
        ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: colors.border }]} />}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => openEmail(item)}
            style={[styles.emailItem, { backgroundColor: !item.read ? colors.card : colors.background, flexDirection: isRTL ? "row-reverse" : "row" }]}
          >
            <View style={[styles.emailLeft, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
              <View style={[styles.unreadDot, { backgroundColor: !item.read ? colors.primary : "transparent" }]} />
              <View style={styles.avatarSmall}>
                <Text style={[styles.avatarText, { color: colors.primary }]}>{item.fromName.charAt(0)}</Text>
              </View>
            </View>
            <View style={[styles.emailContent, { alignItems: isRTL ? "flex-end" : "flex-start" }]}>
              <View style={[styles.emailTop, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                <Text style={[styles.emailFrom, { color: colors.foreground, fontFamily: item.read ? "Inter_400Regular" : "Inter_700Bold" }]}>
                  {item.fromName}
                </Text>
                <Text style={[styles.emailDate, { color: colors.mutedForeground }]}>{formatDate(item.date)}</Text>
              </View>
              <Text style={[styles.emailSubject, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]} numberOfLines={1}>
                {item.subject}
              </Text>
              <View style={[styles.emailBottom, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                <Text style={[styles.emailPreview, { color: colors.mutedForeground }]} numberOfLines={1}>{item.preview}</Text>
                {item.aiReply && <AiBadge label={t.ai} />}
              </View>
            </View>
            <View style={[styles.priorityBar, { backgroundColor: priorityColor(item.priority) }]} />
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="mail" size={40} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>{t.noEmailsIn(folderLabels[folder])}</Text>
          </View>
        }
      />

      {/* Email Detail Modal */}
      <Modal visible={!!selected} animationType="slide" presentationStyle="pageSheet">
        {selected && (
          <View style={[styles.modal, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border, flexDirection: isRTL ? "row-reverse" : "row" }]}>
              <TouchableOpacity onPress={() => setSelected(null)}>
                <Feather name="x" size={22} color={colors.foreground} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.foreground }]} numberOfLines={1}>{selected.subject}</Text>
              <View style={{ width: 22 }} />
            </View>
            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              <View style={[styles.emailMeta, { borderBottomColor: colors.border }]}>
                {[{ label: t.from, value: `${selected.fromName} · ${selected.from}` }, { label: t.date, value: new Date(selected.date).toLocaleString() }].map((row) => (
                  <View key={row.label} style={[styles.metaRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                    <Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>{row.label}</Text>
                    <Text style={[styles.metaValue, { color: colors.foreground }]}>{row.value}</Text>
                  </View>
                ))}
              </View>
              <Text style={[styles.emailBody, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]}>{selected.body}</Text>
              <View style={[styles.replySection, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.replySectionHeader, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                  <View style={[styles.aiIcon, { backgroundColor: colors.redDim }]}>
                    <Feather name="cpu" size={14} color={colors.red} />
                  </View>
                  <Text style={[styles.replySectionTitle, { color: colors.foreground }]}>{t.aiReply}</Text>
                  <AiBadge />
                </View>
                {generating || loading ? (
                  <View style={[styles.generating, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                    <ActivityIndicator color={colors.primary} />
                    <Text style={[styles.generatingText, { color: colors.mutedForeground }]}>{t.draftingReply}</Text>
                  </View>
                ) : editingReply ? (
                  <TextInput
                    value={editingReply}
                    onChangeText={setEditingReply}
                    multiline
                    textAlign={isRTL ? "right" : "left"}
                    style={[styles.replyInput, { color: colors.foreground, borderColor: colors.border }]}
                  />
                ) : (
                  <Text style={[styles.noReply, { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" }]}>{t.aiReplyPlaceholder}</Text>
                )}
                <View style={[styles.replyActions, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                  <TouchableOpacity onPress={handleGenerateReply} style={[styles.genBtn, { borderColor: colors.border }]}>
                    <Feather name="refresh-cw" size={14} color={colors.foreground} />
                    <Text style={[styles.genBtnText, { color: colors.foreground }]}>
                      {editingReply ? t.regenerate : t.generateReply}
                    </Text>
                  </TouchableOpacity>
                  {editingReply && (
                    <TouchableOpacity
                      onPress={() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); setSelected(null); }}
                      style={[styles.sendBtn, { backgroundColor: colors.primary }]}
                    >
                      <Feather name="send" size={14} color="#fff" />
                      <Text style={styles.sendBtnText}>{t.sendReply}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </ScrollView>
          </View>
        )}
      </Modal>
    </View>
  );
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60 * 60 * 1000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / 3600000)}h ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 14, justifyContent: "space-between", borderBottomWidth: 1 },
  headerTitle: { fontSize: 26, fontFamily: "Inter_700Bold", letterSpacing: -0.8 },
  headerSub: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  tabs: { borderBottomWidth: 1 },
  tabsContent: { paddingHorizontal: 20, gap: 4 },
  tab: { paddingVertical: 12, paddingHorizontal: 4, marginRight: 20 },
  tabText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  list: { paddingTop: 4 },
  separator: { height: 1, marginLeft: 72 },
  emailItem: { alignItems: "center", paddingVertical: 14, paddingHorizontal: 16, gap: 12 },
  emailLeft: { alignItems: "center", gap: 8 },
  unreadDot: { width: 8, height: 8, borderRadius: 4 },
  avatarSmall: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#FF2D5520", alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 15, fontFamily: "Inter_700Bold" },
  emailContent: { flex: 1, gap: 3 },
  emailTop: { justifyContent: "space-between" },
  emailFrom: { fontSize: 14 },
  emailDate: { fontSize: 11, fontFamily: "Inter_400Regular" },
  emailSubject: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  emailBottom: { alignItems: "center", gap: 8 },
  emailPreview: { fontSize: 12, fontFamily: "Inter_400Regular", flex: 1 },
  priorityBar: { width: 3, height: 40, borderRadius: 2, marginLeft: 4 },
  empty: { alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 16, fontFamily: "Inter_400Regular" },
  modal: { flex: 1 },
  modalHeader: { alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16, borderBottomWidth: 1 },
  modalTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", flex: 1, textAlign: "center", marginHorizontal: 12 },
  modalContent: { flex: 1, padding: 20 },
  emailMeta: { paddingBottom: 16, marginBottom: 16, borderBottomWidth: 1, gap: 8 },
  metaRow: { gap: 12 },
  metaLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", width: 44 },
  metaValue: { fontSize: 12, fontFamily: "Inter_400Regular", flex: 1 },
  emailBody: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 24, marginBottom: 24 },
  replySection: { borderRadius: 16, padding: 16, borderWidth: 1, gap: 12, marginBottom: 40 },
  replySectionHeader: { alignItems: "center", gap: 10 },
  aiIcon: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  replySectionTitle: { fontSize: 15, fontFamily: "Inter_700Bold", flex: 1 },
  generating: { alignItems: "center", gap: 10, paddingVertical: 8 },
  generatingText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  replyInput: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22, borderWidth: 1, borderRadius: 10, padding: 12, minHeight: 120 },
  noReply: { fontSize: 14, fontFamily: "Inter_400Regular", fontStyle: "italic" },
  replyActions: { gap: 10 },
  genBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
  genBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  sendBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12, borderRadius: 12 },
  sendBtnText: { color: "#fff", fontSize: 13, fontFamily: "Inter_600SemiBold" },
});
