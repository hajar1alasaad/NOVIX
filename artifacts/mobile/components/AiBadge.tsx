import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

export function AiBadge({ label = "AI" }: { label?: string }) {
  const colors = useColors();
  return (
    <View style={[styles.badge, { backgroundColor: colors.redDim, borderColor: colors.red + "40" }]}>
      <Text style={[styles.text, { color: colors.red }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  text: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.8,
  },
});
