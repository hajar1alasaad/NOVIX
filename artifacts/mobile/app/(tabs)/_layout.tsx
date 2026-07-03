import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { SymbolView } from "expo-symbols";
import React from "react";
import { Platform, StyleSheet, View, useColorScheme } from "react-native";
import { useColors } from "@/hooks/useColors";
import { useApp } from "@/context/AppContext";

function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "house", selected: "house.fill" }} />
        <Label>Dashboard</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="ai">
        <Icon sf={{ default: "cpu", selected: "cpu.fill" }} />
        <Label>AI Agent</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="emails">
        <Icon sf={{ default: "envelope", selected: "envelope.fill" }} />
        <Label>Emails</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="clients">
        <Icon sf={{ default: "person.2", selected: "person.2.fill" }} />
        <Label>CRM</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="tasks">
        <Icon sf={{ default: "checkmark.circle", selected: "checkmark.circle.fill" }} />
        <Label>Tasks</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="notifications">
        <Icon sf={{ default: "bell", selected: "bell.fill" }} />
        <Label>Alerts</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <Icon sf={{ default: "gearshape", selected: "gearshape.fill" }} />
        <Label>Settings</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";
  const { notifications, emails } = useApp();
  const unreadNotifs = notifications.filter((n) => !n.read).length;
  const unreadEmails = emails.filter((e) => !e.read && e.folder === "inbox").length;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : colors.background,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          elevation: 0,
          height: isWeb ? 84 : 64,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontFamily: "Inter_500Medium",
          marginBottom: isWeb ? 0 : 4,
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={80}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : isWeb ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]} />
          ) : null,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, size }) =>
            isIOS ? (
              <SymbolView name="house" tintColor={color} size={size} />
            ) : (
              <Feather name="home" size={size} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="ai"
        options={{
          title: "AI Agent",
          tabBarIcon: ({ color, size }) =>
            isIOS ? (
              <SymbolView name="cpu" tintColor={color} size={size} />
            ) : (
              <Feather name="cpu" size={size} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="emails"
        options={{
          title: "Emails",
          tabBarBadge: unreadEmails > 0 ? unreadEmails : undefined,
          tabBarIcon: ({ color, size }) =>
            isIOS ? (
              <SymbolView name="envelope" tintColor={color} size={size} />
            ) : (
              <Feather name="mail" size={size} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="clients"
        options={{
          title: "CRM",
          tabBarIcon: ({ color, size }) =>
            isIOS ? (
              <SymbolView name="person.2" tintColor={color} size={size} />
            ) : (
              <Feather name="users" size={size} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: "Tasks",
          tabBarIcon: ({ color, size }) =>
            isIOS ? (
              <SymbolView name="checkmark.circle" tintColor={color} size={size} />
            ) : (
              <Feather name="check-square" size={size} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: "Alerts",
          tabBarBadge: unreadNotifs > 0 ? unreadNotifs : undefined,
          tabBarIcon: ({ color, size }) =>
            isIOS ? (
              <SymbolView name="bell" tintColor={color} size={size} />
            ) : (
              <Feather name="bell" size={size} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) =>
            isIOS ? (
              <SymbolView name="gearshape" tintColor={color} size={size} />
            ) : (
              <Feather name="settings" size={size} color={color} />
            ),
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}
