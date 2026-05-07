import { Tabs } from "expo-router";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#7c9cff",
        headerStyle: { backgroundColor: "#11141b" },
        headerTintColor: "#ffffff",
        tabBarStyle: { backgroundColor: "#11141b", borderTopColor: "#232938" },
      }}
    >
      <Tabs.Screen name="patterns" options={{ title: "System Design" }} />
      <Tabs.Screen name="neetcode" options={{ title: "NeetCode 150" }} />
      <Tabs.Screen name="java" options={{ title: "Java" }} />
    </Tabs>
  );
}
