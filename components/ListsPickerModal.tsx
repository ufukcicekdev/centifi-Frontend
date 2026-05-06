import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  Modal,
  ScrollView,
  TextInput,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import type { ExpenseList } from "../constants/mockData";
import type { Language } from "../i18n";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useKeyboardInset } from "../hooks/useKeyboardInset";
import { useAppDialog } from "../context/AppDialogContext";
import { displayExpenseListName, displayListEmoji } from "../lib/listDisplayName";

const COPY: Record<
  Language,
  {
    title: string;
    subtitle: string;
    onlyYou: string;
    sharedList: string;
    addPlaceholder: string;
    add: string;
    cancel: string;
  }
> = {
  en: {
    title: "Your Lists",
    subtitle: "Choose your current list",
    onlyYou: "Only you",
    sharedList: "Shared list",
    addPlaceholder: "New list name",
    add: "Add",
    cancel: "Cancel",
  },
  tr: {
    title: "Listelerin",
    subtitle: "Geçerli listeni seç",
    onlyYou: "Sadece sen",
    sharedList: "Paylaşımlı liste",
    addPlaceholder: "Yeni liste adı",
    add: "Ekle",
    cancel: "İptal",
  },
  de: {
    title: "Deine Listen",
    subtitle: "Wähle deine aktuelle Liste",
    onlyYou: "Nur du",
    sharedList: "Geteilte Liste",
    addPlaceholder: "Neuer Listenname",
    add: "Hinzufügen",
    cancel: "Abbrechen",
  },
  fr: {
    title: "Vos listes",
    subtitle: "Choisissez votre liste active",
    onlyYou: "Rien que vous",
    sharedList: "Liste partagée",
    addPlaceholder: "Nom de la liste",
    add: "Ajouter",
    cancel: "Annuler",
  },
  es: {
    title: "Tus listas",
    subtitle: "Elige tu lista actual",
    onlyYou: "Solo tú",
    sharedList: "Lista compartida",
    addPlaceholder: "Nombre de lista",
    add: "Añadir",
    cancel: "Cancelar",
  },
};

export default function ListsPickerModal({
  visible,
  onClose,
  lists,
  activeListId,
  onSelectList,
  onAddList,
  onEditLists,
  isDark,
  language,
}: {
  visible: boolean;
  onClose: () => void;
  lists: ExpenseList[];
  activeListId: string;
  onSelectList: (id: string) => void;
  onAddList: (name: string) => void | Promise<void>;
  onEditLists?: () => void;
  isDark: boolean;
  language: Language;
}) {
  const { showAlert } = useAppDialog();
  const { t: ti18n } = useTranslation();
  const t = COPY[language];
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const keyboardInset = useKeyboardInset();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!visible) {
      setAdding(false);
      setNewName("");
    }
  }, [visible]);

  const sheetBg = isDark ? "#0d0d0f" : "#f4f4f6";
  const text = isDark ? "#fff" : "#111";
  const muted = isDark ? "#9a9aa3" : "#666";
  const rowBg = isDark ? "#1a1a1e" : "#fff";
  const iconCircle = isDark ? "#252528" : "#e4e4ea";

  const submitNewList = async () => {
    const name = newName.trim();
    if (!name) return;
    try {
      await Promise.resolve(onAddList(name));
      setNewName("");
      setAdding(false);
    } catch {
      showAlert(ti18n("common.error"), ti18n("settings.listSaveFailed"));
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "#000000aa" }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View
          style={{
            backgroundColor: sheetBg,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingHorizontal: 20,
            paddingTop: 22,
            /**
             * Modal alt sheet’i activity’nin `adjustResize` davranışından bağımsızdır;
             * Android’de klavye açıldığında alt boşluğu klavye yüksekliği kadar artırıyoruz
             * ki TextInput + Ekle butonu klavyenin hemen üstünde kalsın.
             */
            paddingBottom:
              keyboardInset > 0
                ? keyboardInset + 12
                : Math.max(36, insets.bottom + 20),
            maxHeight: "82%",
          }}
        >
            <View style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: 10 }}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={{ color: text, fontSize: 22, fontWeight: "800" }}>{t.title}</Text>
                <Text style={{ color: muted, fontSize: 14, marginTop: 6 }}>{t.subtitle}</Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Pressable
                  onPress={() => {
                    setAdding((a) => {
                      if (a) setNewName("");
                      return !a;
                    });
                  }}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: iconCircle,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  hitSlop={8}
                >
                  <Ionicons name="add" size={22} color={text} />
                </Pressable>
                {onEditLists ? (
                  <Pressable
                    onPress={() => {
                      onClose();
                      onEditLists();
                    }}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: iconCircle,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                    hitSlop={8}
                  >
                    <Ionicons name="create-outline" size={20} color={text} />
                  </Pressable>
                ) : null}
                <Pressable
                  onPress={onClose}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: iconCircle,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  hitSlop={8}
                >
                  <Ionicons name="close" size={22} color={text} />
                </Pressable>
              </View>
            </View>

            {adding ? (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 16,
                  marginTop: 4,
                }}
              >
                <TextInput
                  value={newName}
                  onChangeText={setNewName}
                  placeholder={t.addPlaceholder}
                  placeholderTextColor={muted}
                  style={{
                    flex: 1,
                    backgroundColor: rowBg,
                    borderRadius: 14,
                    paddingHorizontal: 14,
                    paddingVertical: Platform.OS === "ios" ? 12 : 10,
                    color: text,
                    fontSize: 15,
                  }}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={submitNewList}
                />
                <Pressable
                  onPress={() => {
                    setAdding(false);
                    setNewName("");
                  }}
                  style={{ paddingHorizontal: 8, paddingVertical: 10 }}
                >
                  <Text style={{ color: muted, fontWeight: "600", fontSize: 14 }}>{t.cancel}</Text>
                </Pressable>
                <Pressable
                  onPress={submitNewList}
                  style={{
                    backgroundColor: "#FF6B6B",
                    borderRadius: 14,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                  }}
                >
                  <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>{t.add}</Text>
                </Pressable>
              </View>
            ) : null}

            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 8 }}
            >
              {lists.map((list) => {
                const selected = list.id === activeListId;
                const subtitle = list.id === "private" || list.isDefault ? t.onlyYou : t.sharedList;
                return (
                  <Pressable
                    key={list.id}
                    onPress={() => {
                      onSelectList(list.id);
                      onClose();
                    }}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: selected ? (isDark ? "#222226" : "#ececf2") : rowBg,
                      borderRadius: 18,
                      paddingVertical: 14,
                      paddingHorizontal: 14,
                      marginBottom: 10,
                      borderWidth: 1,
                      borderColor: isDark ? "#2a2a30" : "#e6e6ea",
                    }}
                  >
                    <View
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 24,
                        backgroundColor: iconCircle,
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: 14,
                      }}
                    >
                      <Text style={{ fontSize: 24 }}>{displayListEmoji(list)}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: text, fontSize: 17, fontWeight: "700" }}>
                        {displayExpenseListName(list.name, ti18n)}
                      </Text>
                      <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4, gap: 6 }}>
                        <Ionicons name="person-outline" size={14} color={muted} />
                        <Text style={{ color: muted, fontSize: 13 }}>{subtitle}</Text>
                      </View>
                    </View>
                    {selected ? (
                      <Ionicons name="checkmark-circle" size={26} color={text} />
                    ) : (
                      <View style={{ width: 26 }} />
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
    </Modal>
  );
}
