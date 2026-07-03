import { Feather } from "@expo/vector-icons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useLanguage } from "@/context/LanguageContext";

const API_BASE = process.env["EXPO_PUBLIC_API_URL"] ?? "";

type AgentStatusCode = "idle" | "running" | "success" | "error" | "waiting" | "needs_config";

interface AgentStatus {
  name: string;
  displayName: string;
  icon: string;
  status: AgentStatusCode;
  lastRun?: string;
  lastAction?: string;
  runCount: number;
  successCount: number;
  errorCount: number;
  configRequired?: string[];
}

interface Opportunity {
  id: string;
  title: string;
  type: string;
  company?: string;
  description: string;
  estimatedValue?: number;
  score: number;
  status: string;
  discoveredAt: string;
  discoveredBy: string;
}

interface Approval {
  id: string;
  type: string;
  title: string;
  description: string;
  agent: string;
  draft?: string;
  status: string;
  createdAt: string;
}

interface AgentLog {
  id: string;
  agent: string;
  action: string;
  detail: string;
  timestamp: string;
  status: string;
}

interface UserProfile {
  name: string;
  profession: string;
  skills: string[];
  minRate: number;
  audienceSize: number;
  careerGoals: string[];
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return d.toLocaleDateString();
}

function statusColor(status: AgentStatusCode, colors: ReturnType<typeof useColors>) {
  switch (status) {
    case "running": return colors.blue;
    case "success": return colors.green;
    case "error": return colors.red;
    case "needs_config": return colors.orange;
    case "waiting": return colors.purple;
    default: return colors.mutedForeground;
  }
}

function statusLabel(status: AgentStatusCode) {
  switch (status) {
    case "running": return "Running";
    case "success": return "Active";
    case "error": return "Error";
    case "needs_config": return "Setup needed";
    case "waiting": return "Waiting";
    default: return "Idle";
  }
}

const AGENT_ORDER = [
  "supervisor", "opportunity", "browser", "social", "email",
  "negotiation", "outreach", "calendar", "finance", "career", "memory",
];

const AGENT_FALLBACKS: Record<string, Partial<AgentStatus>> = {
  supervisor: { displayName: "Supervisor", icon: "cpu" },
  opportunity: { displayName: "Opportunity Discovery", icon: "zap" },
  browser: { displayName: "Browser Agent", icon: "globe" },
  social: { displayName: "Social Media", icon: "share-2" },
  email: { displayName: "Email Agent", icon: "mail" },
  negotiation: { displayName: "Negotiation", icon: "trending-up" },
  outreach: { displayName: "Company Outreach", icon: "send" },
  calendar: { displayName: "Calendar Agent", icon: "calendar" },
  finance: { displayName: "Finance Agent", icon: "dollar-sign" },
  career: { displayName: "Career Manager", icon: "award" },
  memory: { displayName: "Memory Agent", icon: "database" },
};

export default function AgentsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { isRTL } = useLanguage();

  const [agentStatuses, setAgentStatuses] = useState<Record<string, AgentStatus>>({});
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [summary, setSummary] = useState({ totalOpportunities: 0, newOpportunities: 0, pendingApprovals: 0, memoryEntries: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [running, setRunning] = useState(false);
  const [activeTab, setActiveTab] = useState<"agents" | "opportunities" | "approvals" | "activity">("agents");

  // Profile setup
  const [showSetup, setShowSetup] = useState(false);
  const [draftProfession, setDraftProfession] = useState("");
  const [draftSkills, setDraftSkills] = useState("");
  const [draftRate, setDraftRate] = useState("500");
  const [savingProfile, setSavingProfile] = useState(false);

  // Pulse animation for running agents
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.4, duration: 800, useNativeDriver: false }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: false }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [statusRes, oppsRes, approvalsRes, logsRes, profileRes] = await Promise.all([
        fetch(`${API_BASE}/api/agents/status`),
        fetch(`${API_BASE}/api/agents/opportunities?limit=15`),
        fetch(`${API_BASE}/api/agents/approvals`),
        fetch(`${API_BASE}/api/agents/logs?limit=30`),
        fetch(`${API_BASE}/api/agents/profile`),
      ]);

      if (statusRes.ok) {
        const d = await statusRes.json() as { agents: AgentStatus[]; summary: typeof summary };
        const statusMap: Record<string, AgentStatus> = {};
        for (const a of d.agents ?? []) statusMap[a.name] = a;
        setAgentStatuses(statusMap);
        setSummary(d.summary ?? summary);
      }
      if (oppsRes.ok) {
        const d = await oppsRes.json() as { opportunities: Opportunity[] };
        setOpportunities(d.opportunities ?? []);
      }
      if (approvalsRes.ok) {
        const d = await approvalsRes.json() as { approvals: Approval[] };
        setApprovals(d.approvals ?? []);
      }
      if (logsRes.ok) {
        const d = await logsRes.json() as { logs: AgentLog[] };
        setLogs(d.logs ?? []);
      }
      if (profileRes.ok) {
        const d = await profileRes.json() as { profile: UserProfile };
        setProfile(d.profile ?? null);
        if (d.profile && !d.profile.profession) setShowSetup(true);
      }
    } catch {
      // API not available yet
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void fetchData(); }, [fetchData]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => { void fetchData(); }, 30_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleRunAll = async () => {
    setRunning(true);
    try {
      await fetch(`${API_BASE}/api/agents/run`, { method: "POST" });
      setTimeout(() => { void fetchData(); }, 3000);
    } finally {
      setTimeout(() => setRunning(false), 3000);
    }
  };

  const handleApprove = async (id: string, approved: boolean) => {
    await fetch(`${API_BASE}/api/agents/approvals/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approved }),
    });
    void fetchData();
  };

  const handleApprovalPress = (approval: Approval, approved: boolean) => {
    Alert.alert(
      approved ? "Approve Action" : "Reject Action",
      `Are you sure you want to ${approved ? "approve" : "reject"}?\n\n"${approval.title}"`,
      [
        { text: "Cancel", style: "cancel" },
        { text: approved ? "Approve" : "Reject", style: approved ? "default" : "destructive", onPress: () => void handleApprove(approval.id, approved) },
      ]
    );
  };

  const handleUpdateOppStatus = async (id: string, status: string) => {
    await fetch(`${API_BASE}/api/agents/opportunities/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    void fetchData();
  };

  const handleSaveProfile = async () => {
    if (!draftProfession.trim()) return;
    setSavingProfile(true);
    try {
      await fetch(`${API_BASE}/api/agents/profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profession: draftProfession.trim(),
          skills: draftSkills.split(",").map((s) => s.trim()).filter(Boolean),
          minRate: Number(draftRate) || 500,
        }),
      });
      setShowSetup(false);
      void fetchData();
      // Trigger agent run after profile is set
      setTimeout(() => void fetch(`${API_BASE}/api/agents/run`, { method: "POST" }), 1000);
    } finally {
      setSavingProfile(false);
    }
  };

  const paddingTop = Platform.OS === "web" ? 67 : insets.top;
  const tabBarHeight = Platform.OS === "web" ? 84 : 64 + insets.bottom;

  const styles = {
    container: { flex: 1, backgroundColor: colors.background },
    header: { paddingTop: paddingTop + 16, paddingHorizontal: 20, paddingBottom: 12 },
    headerRow: { flexDirection: isRTL ? "row-reverse" : "row", justifyContent: "space-between", alignItems: "center" } as const,
    title: { fontSize: 28, fontFamily: "Inter_700Bold", color: colors.foreground },
    subtitle: { fontSize: 13, color: colors.mutedForeground, marginTop: 2, fontFamily: "Inter_400Regular" },
    runBtn: { backgroundColor: colors.primary, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, flexDirection: "row", alignItems: "center", gap: 6 } as const,
    runBtnText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 13 },
    summaryRow: { flexDirection: "row", gap: 10, paddingHorizontal: 20, marginBottom: 16 } as const,
    summaryCard: { flex: 1, backgroundColor: colors.card, borderRadius: 12, padding: 12, alignItems: "center" } as const,
    summaryValue: { fontSize: 22, fontFamily: "Inter_700Bold", color: colors.primary },
    summaryLabel: { fontSize: 10, fontFamily: "Inter_500Medium", color: colors.mutedForeground, marginTop: 2 },
    tabRow: { flexDirection: "row", paddingHorizontal: 20, gap: 8, marginBottom: 16 } as const,
    tab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
    tabText: { fontSize: 13, fontFamily: "Inter_500Medium" },
    section: { paddingHorizontal: 20, marginBottom: 8 },
    sectionLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: colors.mutedForeground, letterSpacing: 1, marginBottom: 10 },
    agentCard: { backgroundColor: colors.card, borderRadius: 14, padding: 14, marginBottom: 10 },
    agentRow: { flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 12 } as const,
    agentIconBox: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" } as const,
    agentName: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    agentStatus: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
    agentAction: { fontSize: 11, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginTop: 4 },
    statusDot: { width: 8, height: 8, borderRadius: 4, marginLeft: "auto" } as const,
    oppCard: { backgroundColor: colors.card, borderRadius: 14, padding: 14, marginBottom: 10 },
    oppHeader: { flexDirection: isRTL ? "row-reverse" : "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 } as const,
    oppTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.foreground, flex: 1 },
    oppScore: { fontSize: 13, fontFamily: "Inter_700Bold", marginLeft: 8 },
    oppDesc: { fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground, lineHeight: 18 },
    oppMeta: { flexDirection: isRTL ? "row-reverse" : "row", justifyContent: "space-between", alignItems: "center", marginTop: 10 } as const,
    badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
    badgeText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
    oppActions: { flexDirection: "row", gap: 8 } as const,
    approvalCard: { backgroundColor: colors.card, borderRadius: 14, padding: 14, marginBottom: 10 },
    approvalAgent: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: colors.primary, marginBottom: 4, letterSpacing: 0.5, textTransform: "uppercase" as const },
    approvalTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.foreground, marginBottom: 6 },
    approvalDesc: { fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground, lineHeight: 18 },
    approvalActions: { flexDirection: "row", gap: 10, marginTop: 12 } as const,
    approveBtn: { flex: 1, backgroundColor: colors.green + "22", borderRadius: 10, paddingVertical: 10, alignItems: "center" as const },
    rejectBtn: { flex: 1, backgroundColor: colors.red + "22", borderRadius: 10, paddingVertical: 10, alignItems: "center" as const },
    logItem: { flexDirection: isRTL ? "row-reverse" : "row", gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border } as const,
    logDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
    logAgent: { fontSize: 11, fontFamily: "Inter_700Bold", color: colors.primary, textTransform: "uppercase" as const, letterSpacing: 0.5 },
    logAction: { fontSize: 13, fontFamily: "Inter_500Medium", color: colors.foreground },
    logDetail: { fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginTop: 2 },
    logTime: { fontSize: 10, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginTop: 2 },
    setupCard: { backgroundColor: colors.card, borderRadius: 16, padding: 20, marginHorizontal: 20, marginBottom: 16, borderWidth: 1, borderColor: colors.primary + "40" },
    setupTitle: { fontSize: 16, fontFamily: "Inter_700Bold", color: colors.foreground, marginBottom: 4 },
    setupSub: { fontSize: 13, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginBottom: 16 },
    inputLabel: { fontSize: 12, fontFamily: "Inter_500Medium", color: colors.mutedForeground, marginBottom: 6 },
    input: { backgroundColor: colors.background, borderRadius: 10, padding: 12, fontSize: 14, fontFamily: "Inter_400Regular", color: colors.foreground, borderWidth: 1, borderColor: colors.border, marginBottom: 12 },
    saveBtn: { backgroundColor: colors.primary, borderRadius: 12, padding: 14, alignItems: "center" as const },
    saveBtnText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 15 },
    emptyText: { textAlign: "center" as const, color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 14, padding: 24 },
  };

  const allAgents = AGENT_ORDER.map((agentName) => ({
    ...AGENT_FALLBACKS[agentName],
    ...agentStatuses[agentName],
    name: agentName,
    status: agentStatuses[agentName]?.status ?? ("idle" as AgentStatusCode),
    runCount: agentStatuses[agentName]?.runCount ?? 0,
    successCount: agentStatuses[agentName]?.successCount ?? 0,
    errorCount: agentStatuses[agentName]?.errorCount ?? 0,
  })) as (AgentStatus & { name: string })[];

  const pendingApprovals = approvals.filter((a) => a.status === "pending");
  const newOpps = opportunities.filter((o) => o.status === "new");

  const TABS = [
    { key: "agents", label: "Agents", count: 0 },
    { key: "opportunities", label: "Opportunities", count: newOpps.length },
    { key: "approvals", label: "Approvals", count: pendingApprovals.length },
    { key: "activity", label: "Activity", count: 0 },
  ] as const;

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.mutedForeground, marginTop: 12, fontFamily: "Inter_400Regular" }}>Connecting to agents...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Agents Hub</Text>
            <Text style={styles.subtitle}>11 AI employees working 24/7</Text>
          </View>
          <TouchableOpacity style={styles.runBtn} onPress={() => void handleRunAll()} disabled={running}>
            {running ? <ActivityIndicator size="small" color="#fff" /> : <Feather name="play" size={14} color="#fff" />}
            <Text style={styles.runBtnText}>{running ? "Running..." : "Run All"}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Summary stats */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{summary.totalOpportunities}</Text>
          <Text style={styles.summaryLabel}>OPPORTUNITIES</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryValue, { color: colors.orange }]}>{summary.pendingApprovals}</Text>
          <Text style={styles.summaryLabel}>APPROVALS</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryValue, { color: colors.purple }]}>{summary.memoryEntries}</Text>
          <Text style={styles.summaryLabel}>MEMORIES</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryValue, { color: colors.green }]}>{allAgents.filter((a) => a.status === "success").length}</Text>
          <Text style={styles.summaryLabel}>ACTIVE</Text>
        </View>
      </View>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabRow} contentContainerStyle={{ paddingRight: 8 }}>
        {TABS.map((t) => {
          const isActive = activeTab === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              style={[styles.tab, { backgroundColor: isActive ? colors.primary : colors.card }]}
              onPress={() => setActiveTab(t.key)}
            >
              <Text style={[styles.tabText, { color: isActive ? "#fff" : colors.mutedForeground }]}>
                {t.label}{t.count > 0 ? ` (${t.count})` : ""}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: tabBarHeight + 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void fetchData(); }} tintColor={colors.primary} />}
      >
        {/* Profile Setup Card */}
        {showSetup && (
          <View style={styles.setupCard}>
            <Text style={styles.setupTitle}>⚡ Set up your agent profile</Text>
            <Text style={styles.setupSub}>Tell the agents about you so they can find the right opportunities.</Text>

            <Text style={styles.inputLabel}>YOUR PROFESSION</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Fitness Influencer, Business Coach, Photographer"
              placeholderTextColor={colors.mutedForeground}
              value={draftProfession}
              onChangeText={setDraftProfession}
            />
            <Text style={styles.inputLabel}>SKILLS (comma-separated)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Video editing, Public speaking, Branding"
              placeholderTextColor={colors.mutedForeground}
              value={draftSkills}
              onChangeText={setDraftSkills}
            />
            <Text style={styles.inputLabel}>MINIMUM RATE (USD per project)</Text>
            <TextInput
              style={styles.input}
              placeholder="500"
              placeholderTextColor={colors.mutedForeground}
              value={draftRate}
              onChangeText={setDraftRate}
              keyboardType="numeric"
            />
            <TouchableOpacity style={styles.saveBtn} onPress={() => void handleSaveProfile()} disabled={savingProfile}>
              {savingProfile ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Profile &amp; Start Agents</Text>}
            </TouchableOpacity>
          </View>
        )}

        {/* AGENTS TAB */}
        {activeTab === "agents" && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>ALL AGENTS</Text>
            {allAgents.map((agent) => {
              const sc = statusColor(agent.status, colors);
              const isRunningAgent = agent.status === "running";
              return (
                <View key={agent.name} style={styles.agentCard}>
                  <View style={styles.agentRow}>
                    <View style={[styles.agentIconBox, { backgroundColor: sc + "20" }]}>
                      <Feather name={(agent.icon ?? "cpu") as never} size={18} color={sc} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.agentName}>{agent.displayName ?? agent.name}</Text>
                      <Text style={[styles.agentStatus, { color: sc }]}>
                        {isRunningAgent ? "⚡ " : ""}{statusLabel(agent.status)}
                        {agent.runCount > 0 ? ` · ${agent.runCount} runs` : ""}
                      </Text>
                      {agent.lastAction ? (
                        <Text style={styles.agentAction} numberOfLines={2}>{agent.lastAction}</Text>
                      ) : null}
                      {agent.configRequired && agent.configRequired.length > 0 && (
                        <Text style={[styles.agentAction, { color: colors.orange }]}>
                          Needs: {agent.configRequired.slice(0, 2).join(", ")}
                        </Text>
                      )}
                    </View>
                    {isRunningAgent ? (
                      <Animated.View style={[styles.statusDot, { backgroundColor: sc, opacity: pulseAnim }]} />
                    ) : (
                      <View style={[styles.statusDot, { backgroundColor: sc }]} />
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* OPPORTUNITIES TAB */}
        {activeTab === "opportunities" && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>
              {newOpps.length} NEW · {opportunities.length} TOTAL
            </Text>
            {opportunities.length === 0 ? (
              <Text style={styles.emptyText}>
                No opportunities discovered yet.{"\n"}Tap "Run All" to start the discovery agents.
              </Text>
            ) : null}
            {opportunities.map((opp) => {
              const scoreColor = opp.score >= 80 ? colors.green : opp.score >= 60 ? colors.orange : colors.mutedForeground;
              return (
                <View key={opp.id} style={styles.oppCard}>
                  <View style={styles.oppHeader}>
                    <Text style={styles.oppTitle} numberOfLines={2}>{opp.title}</Text>
                    <Text style={[styles.oppScore, { color: scoreColor }]}>{opp.score}</Text>
                  </View>
                  {opp.company ? <Text style={{ fontSize: 12, color: colors.primary, fontFamily: "Inter_500Medium", marginBottom: 4 }}>{opp.company}</Text> : null}
                  <Text style={styles.oppDesc} numberOfLines={3}>{opp.description}</Text>
                  <View style={styles.oppMeta}>
                    <View style={{ flexDirection: "row", gap: 6 }}>
                      <View style={[styles.badge, { backgroundColor: colors.primary + "20" }]}>
                        <Text style={[styles.badgeText, { color: colors.primary }]}>{opp.type.toUpperCase()}</Text>
                      </View>
                      {opp.estimatedValue ? (
                        <View style={[styles.badge, { backgroundColor: colors.green + "20" }]}>
                          <Text style={[styles.badgeText, { color: colors.green }]}>${opp.estimatedValue.toLocaleString()}</Text>
                        </View>
                      ) : null}
                    </View>
                    {opp.status === "new" && (
                      <View style={styles.oppActions}>
                        <Pressable
                          onPress={() => void handleUpdateOppStatus(opp.id, "approved")}
                          style={[styles.badge, { backgroundColor: colors.green + "20", paddingVertical: 6, paddingHorizontal: 12 }]}
                        >
                          <Text style={[styles.badgeText, { color: colors.green }]}>APPROVE</Text>
                        </Pressable>
                        <Pressable
                          onPress={() => void handleUpdateOppStatus(opp.id, "rejected")}
                          style={[styles.badge, { backgroundColor: colors.red + "20", paddingVertical: 6, paddingHorizontal: 12 }]}
                        >
                          <Text style={[styles.badgeText, { color: colors.red }]}>REJECT</Text>
                        </Pressable>
                      </View>
                    )}
                    {opp.status !== "new" && (
                      <View style={[styles.badge, { backgroundColor: opp.status === "approved" ? colors.green + "20" : colors.mutedForeground + "20" }]}>
                        <Text style={[styles.badgeText, { color: opp.status === "approved" ? colors.green : colors.mutedForeground }]}>{opp.status.toUpperCase()}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.logTime, { marginTop: 8 }]}>Discovered by {opp.discoveredBy} · {formatTime(opp.discoveredAt)}</Text>
                </View>
              );
            })}
          </View>
        )}

        {/* APPROVALS TAB */}
        {activeTab === "approvals" && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{pendingApprovals.length} PENDING DECISIONS</Text>
            {pendingApprovals.length === 0 ? (
              <Text style={styles.emptyText}>No pending decisions.{"\n"}Agents will notify you when your input is needed.</Text>
            ) : null}
            {pendingApprovals.map((approval) => (
              <View key={approval.id} style={styles.approvalCard}>
                <Text style={styles.approvalAgent}>{approval.agent} agent</Text>
                <Text style={styles.approvalTitle}>{approval.title}</Text>
                <Text style={styles.approvalDesc} numberOfLines={4}>{approval.description}</Text>
                {approval.draft && (
                  <View style={{ backgroundColor: colors.background, borderRadius: 8, padding: 10, marginTop: 8 }}>
                    <Text style={{ fontSize: 11, color: colors.mutedForeground, fontFamily: "Inter_400Regular" }} numberOfLines={5}>{approval.draft}</Text>
                  </View>
                )}
                <Text style={[styles.logTime, { marginTop: 8 }]}>{formatTime(approval.createdAt)}</Text>
                <View style={styles.approvalActions}>
                  <TouchableOpacity style={styles.rejectBtn} onPress={() => handleApprovalPress(approval, false)}>
                    <Text style={{ color: colors.red, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>Reject</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.approveBtn} onPress={() => handleApprovalPress(approval, true)}>
                    <Text style={{ color: colors.green, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>Approve</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ACTIVITY TAB */}
        {activeTab === "activity" && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>LIVE AGENT ACTIVITY</Text>
            {logs.length === 0 ? (
              <Text style={styles.emptyText}>No activity yet.{"\n"}Tap "Run All" to start the agents.</Text>
            ) : null}
            {logs.map((log) => {
              const dotColor =
                log.status === "success" ? colors.green :
                log.status === "error" ? colors.red :
                log.status === "pending" ? colors.orange :
                colors.blue;
              return (
                <View key={log.id} style={styles.logItem}>
                  <View style={[styles.logDot, { backgroundColor: dotColor }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.logAgent}>{log.agent}</Text>
                    <Text style={styles.logAction}>{log.action}</Text>
                    <Text style={styles.logDetail} numberOfLines={2}>{log.detail}</Text>
                    <Text style={styles.logTime}>{formatTime(log.timestamp)}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
