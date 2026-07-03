import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
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
import { ClientAvatar } from "@/components/ClientAvatar";
import { useApp, type Client } from "@/context/AppContext";
import { useLanguage } from "@/context/LanguageContext";
import { useAI } from "@/hooks/useAI";
import { useColors } from "@/hooks/useColors";

export default function ClientsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { clients, deals, tasks, updateClient } = useApp();
  const { analyzeDeal, loading } = useAI();
  const { t, isRTL } = useLanguage();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Client | null>(null);
  const [aiInsight, setAiInsight] = useState("");
  const [loadingInsight, setLoadingInsight] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | Client["status"]>("all");

  const topPt = Platform.OS === "web" ? 67 : insets.top;

  const filtered = clients.filter((c) => {
    const matchSearch =
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.company.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleSelectClient = async (client: Client) => {
    setSelected(client);
    setAiInsight("");
    Haptics.selectionAsync();
    setLoadingInsight(true);
    const clientDeals = deals.filter((d) => d.clientId === client.id);
    const clientTasks = tasks.filter((tk) => tk.clientId === client.id);
    try {
      const insight = await analyzeDeal(
        `Client: ${client.name} at ${client.company}\nStatus: ${client.status}\nRevenue: $${client.revenue}\nOpen deals: ${clientDeals.map((d) => d.title + " ($" + d.value + ")").join(", ") || "none"}\nOpen tasks: ${clientTasks.map((tk) => tk.title).join(", ") || "none"}\nLast contact: ${client.lastContact}\nNotes: ${client.notes}`
      );
      setAiInsight(insight);
    } catch {
      setAiInsight(t.noInsight);
    } finally {
      setLoadingInsight(false);
    }
  };

  const statusConfig = {
    active: { color: colors.green, bg: colors.greenDim },
    inactive: { color: colors.mutedForeground, bg: colors.muted },
    prospect: { color: colors.blue, bg: colors.blueDim },
  };

  const statusLabels = {
    all: t.status.all,
    active: t.status.active,
    inactive: t.status.inactive,
    prospect: t.status.prospect,
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPt + 12, borderBottomColor: colors.border, alignItems: isRTL ? "flex-end" : "flex-start" }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>{t.crm}</Text>
        <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
          {t.activeClients(clients.filter((c) => c.status === "active").length)}
        </Text>
      </View>

      {/* Search */}
      <View style={[styles.searchContainer, { borderBottomColor: colors.border }]}>
        <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border, flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            placeholder={t.searchClients}
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
            textAlign={isRTL ? "right" : "left"}
            style={[styles.searchInput, { color: colors.foreground }]}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Feather name="x" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={[styles.filterContent, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          {(["all", "active", "prospect", "inactive"] as const).map((s) => (
            <TouchableOpacity
              key={s}
              onPress={() => setStatusFilter(s)}
              style={[styles.filterChip, { backgroundColor: statusFilter === s ? colors.primary : colors.card, borderColor: statusFilter === s ? colors.primary : colors.border }]}
            >
              <Text style={[styles.filterChipText, { color: statusFilter === s ? "#fff" : colors.mutedForeground }]}>
                {statusLabels[s]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Client List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 100 }]}
        renderItem={({ item, index }) => {
          const clientDeals = deals.filter((d) => d.clientId === item.id);
          const openDealValue = clientDeals.reduce((s, d) => s + d.value, 0);
          return (
            <Pressable
              onPress={() => handleSelectClient(item)}
              style={[styles.clientCard, { backgroundColor: colors.card, borderColor: colors.border, flexDirection: isRTL ? "row-reverse" : "row" }]}
            >
              <ClientAvatar initials={item.avatar ?? item.name.substring(0, 2)} size={48} index={index} />
              <View style={[styles.clientInfo, { alignItems: isRTL ? "flex-end" : "flex-start" }]}>
                <View style={[styles.clientTop, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                  <Text style={[styles.clientName, { color: colors.foreground }]}>{item.name}</Text>
                  <View style={[styles.statusChip, { backgroundColor: statusConfig[item.status].bg }]}>
                    <Text style={[styles.statusText, { color: statusConfig[item.status].color }]}>{statusLabels[item.status]}</Text>
                  </View>
                </View>
                <Text style={[styles.clientCompany, { color: colors.mutedForeground }]}>{item.company}</Text>
                <View style={[styles.clientMeta, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                  {item.revenue > 0 && <Text style={[styles.metaChip, { color: colors.green }]}>${(item.revenue / 1000).toFixed(0)}K</Text>}
                  {openDealValue > 0 && <Text style={[styles.metaChip, { color: colors.blue }]}>${(openDealValue / 1000).toFixed(0)}K</Text>}
                  {item.tags.map((tag) => (
                    <Text key={tag} style={[styles.tag, { backgroundColor: colors.muted, color: colors.mutedForeground }]}>{tag}</Text>
                  ))}
                </View>
              </View>
              <Feather name={isRTL ? "chevron-left" : "chevron-right"} size={16} color={colors.mutedForeground} />
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="users" size={40} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>{t.noClientsFound}</Text>
          </View>
        }
      />

      {/* Client Detail Modal */}
      <Modal visible={!!selected} animationType="slide" presentationStyle="pageSheet">
        {selected && (
          <View style={[styles.modal, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border, flexDirection: isRTL ? "row-reverse" : "row" }]}>
              <TouchableOpacity onPress={() => setSelected(null)}>
                <Feather name="x" size={22} color={colors.foreground} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>{t.clientProfile}</Text>
              <View style={{ width: 22 }} />
            </View>
            <ScrollView contentContainerStyle={[styles.modalContent, { paddingBottom: insets.bottom + 40 }]}>
              <View style={[styles.profileHero, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                <ClientAvatar initials={selected.avatar ?? selected.name.substring(0, 2)} size={72} />
                <View style={[styles.profileInfo, { alignItems: isRTL ? "flex-end" : "flex-start" }]}>
                  <Text style={[styles.profileName, { color: colors.foreground }]}>{selected.name}</Text>
                  <Text style={[styles.profileCompany, { color: colors.mutedForeground }]}>{selected.company}</Text>
                  <View style={[styles.statusChip, { backgroundColor: statusConfig[selected.status].bg, alignSelf: "flex-start" }]}>
                    <Text style={[styles.statusText, { color: statusConfig[selected.status].color }]}>{statusLabels[selected.status]}</Text>
                  </View>
                </View>
              </View>

              <View style={[styles.statsRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                {[
                  { label: t.revenue, value: `$${(selected.revenue / 1000).toFixed(0)}K`, color: colors.green },
                  { label: "Deals", value: String(deals.filter((d) => d.clientId === selected.id).length), color: colors.blue },
                  { label: t.tasks, value: String(tasks.filter((tk) => tk.clientId === selected.id).length), color: colors.orange },
                ].map((s) => (
                  <View key={s.label} style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
                    <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
                  </View>
                ))}
              </View>

              {[{ icon: "mail" as const, value: selected.email }, { icon: "phone" as const, value: selected.phone }].map((item) => (
                <View key={item.icon} style={[styles.contactRow, { borderColor: colors.border, flexDirection: isRTL ? "row-reverse" : "row" }]}>
                  <Feather name={item.icon} size={16} color={colors.mutedForeground} />
                  <Text style={[styles.contactText, { color: colors.foreground }]}>{item.value}</Text>
                </View>
              ))}

              {selected.notes ? (
                <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.sectionTitle, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]}>{t.notes}</Text>
                  <Text style={[styles.sectionText, { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" }]}>{selected.notes}</Text>
                </View>
              ) : null}

              <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.sectionHeader, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                  <Feather name="cpu" size={14} color={colors.red} />
                  <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{t.aiInsight}</Text>
                  <AiBadge />
                </View>
                <Text style={[styles.sectionText, { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" }]}>
                  {loadingInsight || loading ? t.analyzing : aiInsight || t.noInsight}
                </Text>
              </View>

              {selected.tags.length > 0 && (
                <View style={[styles.tagsRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                  {selected.tags.map((tag) => (
                    <View key={tag} style={[styles.tagChip, { backgroundColor: colors.muted }]}>
                      <Text style={[styles.tagText, { color: colors.mutedForeground }]}>{tag}</Text>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
          </View>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1 },
  headerTitle: { fontSize: 26, fontFamily: "Inter_700Bold", letterSpacing: -0.8 },
  headerSub: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  searchContainer: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, gap: 10 },
  searchBar: { alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  searchInput: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  filterScroll: {},
  filterContent: { gap: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  filterChipText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  list: { padding: 16, gap: 12 },
  clientCard: { alignItems: "center", gap: 14, padding: 16, borderRadius: 18, borderWidth: 1 },
  clientInfo: { flex: 1, gap: 4 },
  clientTop: { alignItems: "center", gap: 10 },
  clientName: { fontSize: 15, fontFamily: "Inter_700Bold", flex: 1 },
  statusChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 10, fontFamily: "Inter_700Bold", textTransform: "capitalize" },
  clientCompany: { fontSize: 12, fontFamily: "Inter_400Regular" },
  clientMeta: { flexWrap: "wrap", gap: 6, marginTop: 2 },
  metaChip: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  tag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, fontSize: 10, fontFamily: "Inter_400Regular" },
  empty: { alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 16, fontFamily: "Inter_400Regular" },
  modal: { flex: 1 },
  modalHeader: { alignItems: "center", justifyContent: "space-between", padding: 20, borderBottomWidth: 1 },
  modalTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  modalContent: { padding: 20, gap: 16 },
  profileHero: { alignItems: "center", gap: 16 },
  profileInfo: { flex: 1, gap: 4 },
  profileName: { fontSize: 22, fontFamily: "Inter_700Bold" },
  profileCompany: { fontSize: 14, fontFamily: "Inter_400Regular" },
  statsRow: { gap: 10 },
  statBox: { flex: 1, borderRadius: 14, padding: 14, alignItems: "center", borderWidth: 1, gap: 4 },
  statValue: { fontSize: 20, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },
  contactRow: { alignItems: "center", gap: 12, paddingVertical: 12, borderBottomWidth: 1 },
  contactText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  section: { borderRadius: 14, padding: 16, borderWidth: 1, gap: 8 },
  sectionHeader: { alignItems: "center", gap: 8 },
  sectionTitle: { fontSize: 15, fontFamily: "Inter_700Bold", flex: 1 },
  sectionText: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22 },
  tagsRow: { flexWrap: "wrap", gap: 8 },
  tagChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  tagText: { fontSize: 12, fontFamily: "Inter_500Medium" },
});
