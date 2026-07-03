import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { fetch } from "expo/fetch";
import React, { useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
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
import { useApp } from "@/context/AppContext";
import { useLanguage } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

const SYSTEM_PROMPT = `You are NOVIX, an elite AI Business Manager. You work autonomously and think like a senior business advisor, executive assistant, and strategic consultant combined.

Your capabilities:
- Analyze business situations and provide strategic insights
- Draft emails, proposals, and client communications
- Prioritize tasks and manage workload intelligently
- Negotiate strategies and deal analysis
- Generate business reports and summaries
- Remember and reference client details
- Identify risks and opportunities
- Automate routine business decisions

Communication style:
- Confident, precise, and action-oriented
- Think in outcomes and ROI
- Give specific, implementable advice
- Never vague — always concrete next steps
- Address the user as a high-performing executive

When asked to take action, describe exactly what you would do and the expected outcome.`;

const BASE_URL = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "";

const generateId = () =>
  Date.now().toString() + Math.random().toString(36).substr(2, 9);

export default function AIScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { clients, tasks, deals, emails, aiMemory, addAiMemory } = useApp();
  const { t, isRTL, language } = useLanguage();
  const topPt = Platform.OS === "web" ? 67 : insets.top;

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: t.welcomeMessage,
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const flatRef = useRef<FlatList>(null);

  const buildContext = () => {
    const langNote = language === "ar" ? "\nIMPORTANT: The user speaks Arabic. Always respond in Arabic." : "";
    return `Current date: ${new Date().toLocaleDateString()}
Active clients: ${clients.length} (${clients.filter((c) => c.status === "active").length} active, ${clients.filter((c) => c.status === "prospect").length} prospects)
Open tasks: ${tasks.filter((tk) => tk.status !== "done").length}
Pipeline deals: ${deals.length} worth $${deals.reduce((s, d) => s + d.value, 0).toLocaleString()}
Unread emails: ${emails.filter((e) => !e.read && e.folder === "inbox").length}
AI Memory: ${aiMemory.slice(0, 5).join("; ")}
Recent clients: ${clients.map((c) => `${c.name} (${c.company})`).join(", ")}${langNote}`;
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || streaming) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const userMsg: Message = { id: generateId(), role: "user", content: text.trim(), timestamp: new Date().toISOString() };
    const assistantId = generateId();
    const assistantMsg: Message = { id: assistantId, role: "assistant", content: "", timestamp: new Date().toISOString() };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput("");
    setStreaming(true);

    const chatHistory = [...messages, userMsg]
      .filter((m) => m.id !== "welcome")
      .slice(-20)
      .map((m) => ({ role: m.role, content: m.content }));

    try {
      const res = await fetch(`${BASE_URL}/api/ai/chat-stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemPrompt: SYSTEM_PROMPT + "\n\nBusiness Context:\n" + buildContext(),
          messages: chatHistory,
        }),
      });

      if (!res.ok || !res.body) throw new Error("Stream failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                accumulated += parsed.content;
                setMessages((prev) =>
                  prev.map((m) => m.id === assistantId ? { ...m, content: accumulated } : m)
                );
              }
            } catch {}
          }
        }
      }

      if (accumulated.length > 0) {
        addAiMemory(`User asked: "${text.slice(0, 60)}" — AI responded`);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) => m.id === assistantId ? { ...m, content: "I encountered an error. Please try again." } : m)
      );
    } finally {
      setStreaming(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === "user";
    const msgRTL = isRTL && !isUser;
    return (
      <View style={[styles.msgRow, isUser && (isRTL ? styles.msgRowUserRTL : styles.msgRowUser)]}>
        {!isUser && (
          <View style={[styles.agentAvatar, { backgroundColor: colors.redDim }]}>
            <Feather name="cpu" size={14} color={colors.red} />
          </View>
        )}
        <View style={[
          styles.bubble,
          isUser
            ? [styles.bubbleUser, { backgroundColor: colors.primary }]
            : [styles.bubbleAgent, { backgroundColor: colors.card, borderColor: colors.border }],
        ]}>
          {!isUser && item.id === "welcome" && (
            <View style={[styles.bubbleHeader, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
              <Text style={[styles.bubbleName, { color: colors.foreground }]}>{t.blackAgent.toUpperCase()}</Text>
              <AiBadge />
            </View>
          )}
          <Text style={[styles.bubbleText, { color: isUser ? "#fff" : colors.foreground, textAlign: msgRTL ? "right" : "left" }]}>
            {item.content}
          </Text>
          {streaming && item.role === "assistant" && item.id === messages[messages.length - 1]?.id && (
            <Text style={{ color: isUser ? "#ffffff80" : colors.mutedForeground }}>▋</Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPt + 12, borderBottomColor: colors.border, flexDirection: isRTL ? "row-reverse" : "row" }]}>
        <View style={[styles.headerLeft, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <View style={[styles.headerIcon, { backgroundColor: colors.redDim }]}>
            <Feather name="cpu" size={18} color={colors.red} />
          </View>
          <View style={{ alignItems: isRTL ? "flex-end" : "flex-start" }}>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>{t.blackAgent.toUpperCase()}</Text>
            <View style={[styles.statusRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
              <View style={[styles.onlineDot, { backgroundColor: colors.green }]} />
              <Text style={[styles.statusText, { color: colors.mutedForeground }]}>{t.activeMonitoring}</Text>
            </View>
          </View>
        </View>
        <AiBadge label={t.ai} />
      </View>

      {/* Messages */}
      <FlatList
        ref={flatRef}
        data={messages}
        keyExtractor={(m) => m.id}
        inverted
        renderItem={({ item }) => renderMessage({ item })}
        contentContainerStyle={styles.messageList}
        showsVerticalScrollIndicator={false}
        style={{ flex: 1 }}
      />

      {/* Quick Prompts */}
      {messages.length <= 1 && (
        <View style={[styles.quickPrompts, { borderTopColor: colors.border }]}>
          <FlatList
            data={[...(t.quickPrompts as readonly string[])] as string[]}
            horizontal
            keyExtractor={(p) => p}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickPromptsContent}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => sendMessage(item)}
                style={[styles.quickPrompt, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <Text style={[styles.quickPromptText, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]}>{item}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* Input */}
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={0}>
        <View style={[styles.inputRow, { backgroundColor: colors.background, borderTopColor: colors.border, paddingBottom: insets.bottom + 8, flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder={t.askBlackAgent}
            placeholderTextColor={colors.mutedForeground}
            textAlign={isRTL ? "right" : "left"}
            style={[styles.input, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border }]}
            multiline
            onSubmitEditing={() => sendMessage(input)}
            blurOnSubmit
          />
          <Pressable
            onPress={() => sendMessage(input)}
            disabled={!input.trim() || streaming}
            style={[styles.sendBtn, { backgroundColor: input.trim() && !streaming ? colors.primary : colors.muted }]}
          >
            <Feather name={streaming ? "loader" : "arrow-up"} size={18} color={input.trim() && !streaming ? "#fff" : colors.mutedForeground} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 14, alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1 },
  headerLeft: { alignItems: "center", gap: 12 },
  headerIcon: { width: 40, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  statusRow: { alignItems: "center", gap: 6 },
  onlineDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  messageList: { paddingHorizontal: 16, paddingTop: 16, gap: 12, flexDirection: "column" },
  msgRow: { flexDirection: "row", alignItems: "flex-end", gap: 10, marginBottom: 12 },
  msgRowUser: { flexDirection: "row-reverse" },
  msgRowUserRTL: { flexDirection: "row" },
  agentAvatar: { width: 30, height: 30, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  bubble: { maxWidth: "80%", borderRadius: 18, padding: 14, gap: 8 },
  bubbleUser: { borderBottomRightRadius: 4 },
  bubbleAgent: { borderBottomLeftRadius: 4, borderWidth: 1 },
  bubbleHeader: { alignItems: "center", gap: 8 },
  bubbleName: { fontSize: 12, fontFamily: "Inter_700Bold" },
  bubbleText: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 22 },
  quickPrompts: { borderTopWidth: 1, paddingVertical: 10 },
  quickPromptsContent: { paddingHorizontal: 16, gap: 8 },
  quickPrompt: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, borderWidth: 1, maxWidth: 220 },
  quickPromptText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  inputRow: { alignItems: "flex-end", gap: 10, paddingHorizontal: 16, paddingTop: 10, borderTopWidth: 1 },
  input: { flex: 1, borderWidth: 1, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, fontFamily: "Inter_400Regular", maxHeight: 120 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
});
