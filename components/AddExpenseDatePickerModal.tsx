import React, { useMemo, useState, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  Modal,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Language } from "../i18n";

const CORAL = "#FF6B6B";

function parseYmd(ymd: string): { y: number; m: number; d: number } {
  const [y, m, d] = ymd.split("-").map((x) => parseInt(x, 10));
  return { y: y || 1970, m: (m || 1) - 1, d: d || 1 };
}

function toYmd(y: number, m: number, d: number): string {
  const mm = String(m + 1).padStart(2, "0");
  const dd = String(d).padStart(2, "0");
  return `${y}-${mm}-${dd}`;
}

const WEEKDAY_SINGLE: Record<Language, string[]> = {
  en: ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"],
  tr: ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"],
  de: ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"],
  fr: ["L", "M", "M", "J", "V", "S", "D"],
  es: ["L", "M", "X", "J", "V", "S", "D"],
};

const COPY: Record<
  Language,
  { cancel: string; ok: string }
> = {
  en: { cancel: "Cancel", ok: "OK" },
  tr: { cancel: "İptal", ok: "Tamam" },
  de: { cancel: "Abbrechen", ok: "OK" },
  fr: { cancel: "Annuler", ok: "OK" },
  es: { cancel: "Cancelar", ok: "OK" },
};

export default function AddExpenseDatePickerModal({
  visible,
  valueYmd,
  onClose,
  onConfirm,
  isDark,
  language,
}: {
  visible: boolean;
  valueYmd: string;
  onClose: () => void;
  onConfirm: (ymd: string) => void;
  isDark: boolean;
  language: Language;
}) {
  const { width: winW } = useWindowDimensions();
  const t = COPY[language];
  const weekdays = WEEKDAY_SINGLE[language];

  const initial = useMemo(() => parseYmd(valueYmd), [valueYmd]);

  const [viewYear, setViewYear] = useState(initial.y);
  const [viewMonth, setViewMonth] = useState(initial.m);
  const [selectedDay, setSelectedDay] = useState(initial.d);

  useEffect(() => {
    if (!visible) return;
    const p = parseYmd(valueYmd);
    const dim = new Date(p.y, p.m + 1, 0).getDate();
    const d = Math.min(Math.max(1, p.d), dim);
    setViewYear(p.y);
    setViewMonth(p.m);
    setSelectedDay(d);
  }, [visible, valueYmd]);

  const bumpMonth = (delta: number) => {
    let y = viewYear;
    let m = viewMonth + delta;
    if (m < 0) {
      m = 11;
      y -= 1;
    } else if (m > 11) {
      m = 0;
      y += 1;
    }
    const dim = new Date(y, m + 1, 0).getDate();
    setViewYear(y);
    setViewMonth(m);
    setSelectedDay((d) => Math.min(d, dim));
  };

  const headerDate = useMemo(() => {
    const dt = new Date(viewYear, viewMonth, selectedDay);
    return new Intl.DateTimeFormat(language === "tr" ? "tr-TR" : language === "de" ? "de-DE" : language === "fr" ? "fr-FR" : language === "es" ? "es-ES" : "en-US", {
      weekday: "short",
      day: "numeric",
      month: "long",
    }).format(dt);
  }, [viewYear, viewMonth, selectedDay, language]);

  const monthTitle = useMemo(() => {
    const dt = new Date(viewYear, viewMonth, 1);
    return new Intl.DateTimeFormat(language === "tr" ? "tr-TR" : language === "de" ? "de-DE" : language === "fr" ? "fr-FR" : language === "es" ? "es-ES" : "en-US", {
      month: "long",
      year: "numeric",
    }).format(dt);
  }, [viewYear, viewMonth, language]);

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
  const mondayFirstPad = (firstWeekday + 6) % 7;

  const cells: (number | null)[] = [];
  for (let i = 0; i < mondayFirstPad; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const cellSize = Math.min(44, (winW - 48 - 48) / 7);

  const padHeaderBg = isDark ? "#3a3a42" : "#d8d8de";
  const bodyBg = isDark ? "#0d0d0f" : "#f2f2f5";
  const text = isDark ? "#fff" : "#111";
  const muted = isDark ? "#9a9aa3" : "#666";

  const confirm = () => {
    const dim = new Date(viewYear, viewMonth + 1, 0).getDate();
    const d = Math.min(selectedDay, dim);
    onConfirm(toYmd(viewYear, viewMonth, d));
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: "#00000088", justifyContent: "center", paddingHorizontal: 24 }}
        onPress={onClose}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            borderRadius: 20,
            overflow: "hidden",
            maxWidth: 400,
            alignSelf: "center",
            width: "100%",
          }}
        >
          <View style={{ backgroundColor: padHeaderBg, paddingTop: 18, paddingBottom: 16, paddingHorizontal: 20 }}>
            <Text style={{ color: muted, fontSize: 13, marginBottom: 4 }}>{viewYear}</Text>
            <Text style={{ color: text, fontSize: 22, fontWeight: "700" }}>{headerDate}</Text>
          </View>

          <View style={{ backgroundColor: bodyBg, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <Pressable hitSlop={12} onPress={() => bumpMonth(-1)}>
                <Ionicons name="chevron-back" size={22} color={text} />
              </Pressable>
              <Text style={{ color: text, fontSize: 16, fontWeight: "700" }}>{monthTitle}</Text>
              <Pressable hitSlop={12} onPress={() => bumpMonth(1)}>
                <Ionicons name="chevron-forward" size={22} color={text} />
              </Pressable>
            </View>

            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
              {weekdays.map((w, i) => (
                <Text
                  key={`${w}-${i}`}
                  style={{
                    width: cellSize,
                    textAlign: "center",
                    color: muted,
                    fontSize: 12,
                    fontWeight: "600",
                  }}
                >
                  {w}
                </Text>
              ))}
            </View>

            <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "flex-start" }}>
              {cells.map((day, idx) =>
                day === null ? (
                  <View key={`e-${idx}`} style={{ width: cellSize, height: cellSize }} />
                ) : (
                  <Pressable
                    key={day}
                    onPress={() => setSelectedDay(day)}
                    style={{
                      width: cellSize,
                      height: cellSize,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: day === selectedDay ? CORAL : "transparent",
                      }}
                    >
                      <Text
                        style={{
                          color: day === selectedDay ? "#fff" : text,
                          fontSize: 15,
                          fontWeight: "600",
                        }}
                      >
                        {day}
                      </Text>
                    </View>
                  </Pressable>
                ),
              )}
            </View>

            <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 20, marginTop: 12 }}>
              <Pressable onPress={onClose} hitSlop={8}>
                <Text style={{ color: CORAL, fontSize: 15, fontWeight: "700" }}>{t.cancel}</Text>
              </Pressable>
              <Pressable onPress={confirm} hitSlop={8}>
                <Text style={{ color: CORAL, fontSize: 15, fontWeight: "700" }}>{t.ok}</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
