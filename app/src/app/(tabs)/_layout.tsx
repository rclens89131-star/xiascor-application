import React from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Platform } from "react-native";

const YELLOW = "#ffc400";

function TabIcon({ name, color, size }: { name: string; color: string; size: number }) {
  return <Ionicons name={name as any} color={color} size={size} />;
}

export default function TabsLayout() {
  return (
    <Tabs
      initialRouteName="play"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: YELLOW,
        tabBarInactiveTintColor: "rgba(255,255,255,0.68)",
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
          marginTop: 2,
        },
        tabBarStyle: {
          height: Platform.select({ web: 78, default: 74 }),
          paddingTop: 8,
          paddingBottom: Platform.select({ web: 12, default: 10 }),
          backgroundColor: "#050505",
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarItemStyle: {
          justifyContent: "center",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Accueil",
          tabBarIcon: ({ color, size }) => <TabIcon name="home-outline" color={color} size={size + 2} />,
        }}
      />
      <Tabs.Screen
        name="play"
        options={{
          title: "Jouer",
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon name={focused ? "football" : "football-outline"} color={color} size={size + 3} />
          ),
        }}
      />
      <Tabs.Screen
        name="market"
        options={{
          title: "Marché",
          tabBarIcon: ({ color, size }) => <TabIcon name="storefront-outline" color={color} size={size + 2} />,
        }}
      />
      <Tabs.Screen
        name="cards"
        options={{
          title: "Mes cartes",
          tabBarIcon: ({ color, size }) => <TabIcon name="albums-outline" color={color} size={size + 2} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profil",
          tabBarIcon: ({ color, size }) => <TabIcon name="person-outline" color={color} size={size + 2} />,
        }}
      />
    </Tabs>
  );
}
