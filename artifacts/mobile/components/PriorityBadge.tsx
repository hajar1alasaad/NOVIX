import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

interface PriorityBadgeProps {
  priority: "high" | "medium" | "low";
}

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  const colors = useColors();

  const config = {
    high: { bg: colors.redDim, text: colors.red, label: "HIGH" },
    medium: { bg: colors.orangeDim, text: colors.orange, label: "MED" },
    low: { bg: colors.greenDim, text: colors.green, label: "LOW" },
  }[priority];

  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <Text style={[styles.text, { color: config.text }]}>{config.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  text: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
});
