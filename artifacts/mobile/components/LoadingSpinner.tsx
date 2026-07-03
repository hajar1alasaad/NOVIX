import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { useColors } from "@/hooks/useColors";

export function LoadingSpinner({ size = 24 }: { size?: number }) {
  const colors = useColors();
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      })
    ).start();
  }, [rotation]);

  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.spinner,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderTopColor: colors.primary,
            borderRightColor: colors.primary + "40",
            borderBottomColor: colors.primary + "40",
            borderLeftColor: colors.primary + "40",
            transform: [{ rotate: spin }],
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", justifyContent: "center" },
  spinner: {
    borderWidth: 2,
  },
});
