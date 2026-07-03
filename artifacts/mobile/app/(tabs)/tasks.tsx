import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AiBadge } from "@/components/AiBadge";
import { PriorityBadge } from "@/components/PriorityBadge";
import { useApp, type Task } from "@/context/AppContext";
import { useLanguage } from "@/context/LanguageContext";
import { useAI } from "@/hooks/useAI";
import { useColors } from "@/hooks/useColors";

type StatusFilter = "all" | "todo" | "in_progress" | "done";

export default function TasksScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { tasks, clients, updateTask, addTask, deleteTask } = useApp();
  const { generateTaskList, loading } = useAI();
  const { t, isRTL } = useLanguage();
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newPriority, setNewPriority] = useState<Task["priority"]>("medium");

  const topPt = Platform.OS === "web" ? 67 : insets.top;

  const filtered = tasks.filter((tk) => filter === "all" || tk.status === filter);
  const counts = {
    all: tasks.length,
    todo: tasks.filter((tk) => tk.status === "todo").length,
    in_progress: tasks.filter((tk) => tk.status === "in_progress").length,
    done: tasks.filter((tk) => tk.status === "done").length,
  };

  const cycleStatus = (task: Task) => {
    const next: Record<Task["status"], Task["status"]> = {
      todo: "in_progress",
      in_progress: "done",
      done: "todo",
    };
    updateTask(task.id, { status: next[task.status] });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleAddTask = () => {
    if (!newTitle.trim()) return;
    addTask({
      title: newTitle.trim(),
      description: newDesc.trim(),
      priority: newPriority,
      status: "todo",
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      aiGenerated: false,
    });
    setNewTitle(""); setNewDesc(""); setNewPriority("medium");
    setShowAdd(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleAiGenerate = async () => {
    const context = `Business context: ${clients.length} active clients. Current tasks: ${tasks.map((tk) => tk.title).join(", ")}. Focus on revenue-generating activities and client retention.`;
    const generated = await generateTaskList(context);
    for (const tk of generated) {
      addTask({
        title: tk.title,
        description: tk.description,
        priority: tk.priority ?? "medium",
        status: "todo",
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        aiGenerated: true,
      });
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const statusIcon = (status: Task["status"]) =>
    status === "done" ? "check-circle" : status === "in_progress" ? "loader" : "circle";
  const statusColor = (status: Task["status"]) =>
    status === "done" ? colors.green : status === "in_progress" ? colors.blue : colors.mutedForeground;

  const filterLabels: Record<StatusFilter, string> = {
    all: t.all,
    todo: "Todo",
    in_progress: t.active,
    done: t.done,
  };

  const priorityColors = {
    high: colors.red,
    medium: colors.orange,
    low: colors.green,
  };
  const priorityLabels = { high: t.high, medium: t.medium, low: t.low };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPt + 12, backgroundColor: colors.background, borderBottomColor: colors.border, flexDirection: isRTL ? "row-reverse" : "row" }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>{t.tasks}</Text>
        <View style={[styles.headerActions, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <TouchableOpacity
            onPress={handleAiGenerate}
            disabled={loading}
            style={[styles.aiBtn, { backgroundColor: colors.redDim, borderColor: colors.red + "40", flexDirection: isRTL ? "row-reverse" : "row" }]}
          >
            <Feather name="cpu" size={14} color={colors.red} />
            <Text style={[styles.aiBtnText, { color: colors.red }]}>{loading ? t.generating : t.aiGenerate}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowAdd(true)} style={[styles.addBtn, { backgroundColor: colors.primary }]}>
            <Feather name="plus" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={[styles.filters, { borderBottomColor: colors.border, flexDirection: isRTL ? "row-reverse" : "row" }]}>
        {(["all", "todo", "in_progress", "done"] as StatusFilter[]).map((s) => (
          <TouchableOpacity
            key={s}
            onPress={() => setFilter(s)}
            style={[styles.filterTab, filter === s && { backgroundColor: colors.primary + "20", borderColor: colors.primary }, { borderColor: filter === s ? colors.primary : colors.border }]}
          >
            <Text style={[styles.filterText, { color: filter === s ? colors.primary : colors.mutedForeground }]}>
              {filterLabels[s]} <Text style={styles.filterCount}>{counts[s]}</Text>
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Task List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 100 }]}
        renderItem={({ item }) => {
          const client = clients.find((c) => c.id === item.clientId);
          return (
            <View style={[styles.taskCard, { backgroundColor: colors.card, borderColor: colors.border, opacity: item.status === "done" ? 0.6 : 1, flexDirection: isRTL ? "row-reverse" : "row" }]}>
              <TouchableOpacity onPress={() => cycleStatus(item)} style={styles.statusBtn}>
                <Feather name={statusIcon(item.status)} size={22} color={statusColor(item.status)} />
              </TouchableOpacity>
              <View style={[styles.taskBody, { alignItems: isRTL ? "flex-end" : "flex-start" }]}>
                <Text style={[styles.taskTitle, { color: colors.foreground, textDecorationLine: item.status === "done" ? "line-through" : "none", textAlign: isRTL ? "right" : "left" }]} numberOfLines={2}>
                  {item.title}
                </Text>
                {item.description ? (
                  <Text style={[styles.taskDesc, { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" }]} numberOfLines={1}>{item.description}</Text>
                ) : null}
                <View style={[styles.taskMeta, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                  <PriorityBadge priority={item.priority} />
                  {item.aiGenerated && <AiBadge />}
                  {client && (
                    <Text style={[styles.clientChip, { color: colors.blue, backgroundColor: colors.blueDim }]}>{client.name}</Text>
                  )}
                  <Text style={[styles.dueDate, { color: colors.mutedForeground }]}>
                    {new Date(item.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => { deleteTask(item.id); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
                <Feather name="trash-2" size={16} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="check-square" size={40} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>{t.noTasksHere}</Text>
            <TouchableOpacity onPress={handleAiGenerate} style={[styles.emptyBtn, { backgroundColor: colors.primary }]}>
              <Text style={styles.emptyBtnText}>{t.letAiGenerateTasks}</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Add Task Modal */}
      <Modal visible={showAdd} animationType="slide" presentationStyle="formSheet">
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border, flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <TouchableOpacity onPress={() => setShowAdd(false)}>
              <Text style={[styles.modalCancel, { color: colors.mutedForeground }]}>{t.cancel}</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>{t.newTask}</Text>
            <TouchableOpacity onPress={handleAddTask}>
              <Text style={[styles.modalSave, { color: colors.primary }]}>{t.add}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.modalBody}>
            <TextInput
              placeholder={t.taskTitle}
              placeholderTextColor={colors.mutedForeground}
              value={newTitle}
              onChangeText={setNewTitle}
              textAlign={isRTL ? "right" : "left"}
              style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
              autoFocus
            />
            <TextInput
              placeholder={t.description}
              placeholderTextColor={colors.mutedForeground}
              value={newDesc}
              onChangeText={setNewDesc}
              multiline
              textAlign={isRTL ? "right" : "left"}
              style={[styles.input, styles.textArea, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
            />
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" }]}>{t.priority}</Text>
            <View style={[styles.priorityRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
              {(["high", "medium", "low"] as const).map((p) => (
                <TouchableOpacity
                  key={p}
                  onPress={() => setNewPriority(p)}
                  style={[styles.priorityBtn, { backgroundColor: newPriority === p ? priorityColors[p] + "20" : colors.card, borderColor: newPriority === p ? priorityColors[p] : colors.border }]}
                >
                  <Text style={{ color: newPriority === p ? priorityColors[p] : colors.mutedForeground, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>
                    {priorityLabels[p]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 14, justifyContent: "space-between", borderBottomWidth: 1 },
  headerTitle: { fontSize: 26, fontFamily: "Inter_700Bold", letterSpacing: -0.8 },
  headerActions: { alignItems: "center", gap: 10 },
  aiBtn: { alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  aiBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  addBtn: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  filters: { paddingHorizontal: 16, paddingVertical: 10, gap: 8, borderBottomWidth: 1 },
  filterTab: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  filterText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  filterCount: { fontFamily: "Inter_400Regular" },
  list: { padding: 16, gap: 10 },
  taskCard: { alignItems: "center", gap: 14, padding: 16, borderRadius: 16, borderWidth: 1 },
  statusBtn: { padding: 2 },
  taskBody: { flex: 1, gap: 6 },
  taskTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  taskDesc: { fontSize: 12, fontFamily: "Inter_400Regular" },
  taskMeta: { alignItems: "center", gap: 6, flexWrap: "wrap" },
  clientChip: { fontSize: 10, fontFamily: "Inter_600SemiBold", paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5 },
  dueDate: { fontSize: 11, fontFamily: "Inter_400Regular" },
  empty: { alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 14 },
  emptyText: { fontSize: 16, fontFamily: "Inter_400Regular" },
  emptyBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  emptyBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  modal: { flex: 1 },
  modalHeader: { justifyContent: "space-between", alignItems: "center", padding: 20, borderBottomWidth: 1 },
  modalTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  modalCancel: { fontSize: 16, fontFamily: "Inter_400Regular" },
  modalSave: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  modalBody: { padding: 20, gap: 14 },
  input: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 15, fontFamily: "Inter_400Regular" },
  textArea: { minHeight: 80 },
  fieldLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
  priorityRow: { gap: 10 },
  priorityBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, alignItems: "center" },
});
