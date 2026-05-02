import { Stack } from "expo-router";
import { useStore } from "../../store/useStore";

export default function AppLayout() {
  const isDark = useStore((s) => s.isDark);
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: isDark ? "#0f0f0f" : "#f5f5f5" },
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="category/[id]" />
      <Stack.Screen
        name="expense/[id]"
        options={{ animation: "slide_from_bottom", presentation: "modal" }}
      />
      <Stack.Screen
        name="add"
        options={{ animation: "slide_from_bottom", presentation: "modal" }}
      />
      <Stack.Screen name="processing" options={{ animation: "slide_from_bottom" }} />
      <Stack.Screen name="settings" />
      <Stack.Screen name="budgets" />
      <Stack.Screen
        name="budget/[categoryId]"
        options={{ animation: "slide_from_bottom", presentation: "modal" }}
      />
    </Stack>
  );
}
