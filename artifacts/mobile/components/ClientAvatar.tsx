import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

const AVATAR_COLORS = ["#FF2D55", "#FF9500", "#34C759", "#007AFF", "#AF52DE", "#FF6B6B"];

interface ClientAvatarProps {
  initials: string;
  size?: number;
  index?: number;
}

export function ClientAvatar({ initials, size = 44, index = 0 }: ClientAvatarProps) {
  const color = AVATAR_COLORS[index % AVATAR_COLORS.length];
  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color + "25",
          borderColor: color + "60",
        },
      ]}
    >
      <Text style={[styles.text, { color, fontSize: size * 0.36 }]}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  text: {
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
});
