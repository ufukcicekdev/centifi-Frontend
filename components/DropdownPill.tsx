import React, { useState } from "react";
import { View, Text, Pressable, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const PURPLE = "#6C63FF";

export default function DropdownPill({
  label,
  options,
  selected,
  onSelect,
  isDark,
}: {
  label: string;
  options: { id: string; label: string }[];
  selected: string;
  onSelect: (id: string) => void;
  isDark: boolean;
}) {
  const [open, setOpen] = useState(false);
  const bg = isDark ? "#1e1e1e" : "#efefef";
  const textColor = isDark ? "#fff" : "#000";
  const mutedColor = isDark ? "#888" : "#666";
  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: bg,
          borderRadius: 20,
          paddingHorizontal: 12,
          paddingVertical: 7,
          gap: 4,
        }}
      >
        <Text style={{ color: textColor, fontSize: 13, fontWeight: "600" }}>{label}</Text>
        <Ionicons name="chevron-down" size={13} color={mutedColor} />
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={{ flex: 1 }} onPress={() => setOpen(false)} />
        <View
          style={{
            position: "absolute",
            top: "30%",
            alignSelf: "center",
            backgroundColor: isDark ? "#1e1e1e" : "#fff",
            borderRadius: 16,
            minWidth: 180,
            overflow: "hidden",
            shadowColor: "#000",
            shadowOpacity: 0.3,
            shadowRadius: 20,
            elevation: 20,
          }}
        >
          {options.map((opt, i) => (
            <Pressable
              key={opt.id}
              onPress={() => {
                onSelect(opt.id);
                setOpen(false);
              }}
              style={({ pressed }) => ({
                paddingHorizontal: 20,
                paddingVertical: 14,
                borderTopWidth: i === 0 ? 0 : 1,
                borderTopColor: isDark ? "#333" : "#eee",
                backgroundColor: opt.id === selected ? `${PURPLE}22` : "transparent",
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text
                style={{
                  color: opt.id === selected ? PURPLE : isDark ? "#fff" : "#000",
                  fontWeight: opt.id === selected ? "700" : "400",
                  fontSize: 15,
                }}
              >
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </Modal>
    </>
  );
}
