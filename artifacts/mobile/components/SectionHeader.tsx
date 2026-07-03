import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useColors } from "@/hooks/useColors";

interface SectionHeaderProps {
  title: string;
  action?: string;
  onAction?: () => void;
  isRTL?: boolean;
}

export function SectionHeader({ title, action, onAction, isRTL }: SectionHeaderProps) {
  const colors = useColors();
  return (
    <View style={[styles.row, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
      <Text style={[styles.title, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]}>{title}</Text>
      {action && (
        <TouchableOpacity onPress={onAction}>
          <Text style={[styles.action, { color: colors.primary }]}>{action}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  title: { fontSize: 18, fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  action: { fontSize: 14, fontFamily: "Inter_500Medium" },
});
