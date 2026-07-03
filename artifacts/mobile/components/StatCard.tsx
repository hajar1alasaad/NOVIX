import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

interface StatCardProps {
  label: string;
  value: string;
  change?: string;
  changePositive?: boolean;
  accent?: string;
  isRTL?: boolean;
}

export function StatCard({ label, value, change, changePositive, accent, isRTL }: StatCardProps) {
  const colors = useColors();
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.dot, { backgroundColor: accent ?? colors.primary, alignSelf: isRTL ? "flex-end" : "flex-start" }]} />
      <Text style={[styles.label, { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" }]}>{label}</Text>
      <Text style={[styles.value, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]}>{value}</Text>
      {change && (
        <Text style={[styles.change, { color: changePositive ? colors.green : colors.destructive, textAlign: isRTL ? "right" : "left" }]}>
          {changePositive ? "▲" : "▼"} {change}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, borderRadius: 16, padding: 16, borderWidth: 1, gap: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, marginBottom: 4 },
  label: { fontSize: 12, fontFamily: "Inter_500Medium", letterSpacing: 0.3 },
  value: { fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  change: { fontSize: 11, fontFamily: "Inter_500Medium" },
});
