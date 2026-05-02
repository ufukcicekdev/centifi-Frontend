import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
} from "react-native";

type DialogPayload = {
  title: string;
  message: string;
};

type AppDialogContextValue = {
  showAlert: (title: string, message?: string) => void;
};

const AppDialogContext = createContext<AppDialogContextValue | null>(null);

/** Centifi koyu tema — login / ana uygulama ile uyumlu */
const BG_OVERLAY = "rgba(5, 8, 18, 0.72)";
const CARD = "#171f32";
const BORDER = "#404758";
const TITLE = "#f0f2f8";
const BODY = "#b8c0d4";
const ACCENT = "#bfc2ff";
const ACCENT_BG = "#2a2f4a";

export function AppDialogProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [payload, setPayload] = useState<DialogPayload | null>(null);
  const { height: winH } = useWindowDimensions();

  const showAlert = useCallback((title: string, message = "") => {
    setPayload({ title, message: message.trim() });
    setOpen(true);
  }, []);

  const hide = useCallback(() => {
    setOpen(false);
    setPayload(null);
  }, []);

  const value = useMemo(() => ({ showAlert }), [showAlert]);

  const maxCardHeight = Math.min(winH * 0.72, 420);

  return (
    <AppDialogContext.Provider value={value}>
      {children}
      <Modal
        visible={open && !!payload}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={hide}
      >
        <View style={styles.modalRoot}>
          <Pressable style={styles.backdrop} onPress={hide} accessibilityRole="button" />
          <View style={styles.center} pointerEvents="box-none">
            <View style={styles.cardOuter}>
            <View style={styles.card} accessibilityRole="alert">
              <Text style={styles.title}>{payload?.title ?? ""}</Text>
              {payload?.message ? (
                <ScrollView
                  style={{ maxHeight: maxCardHeight }}
                  showsVerticalScrollIndicator={payload.message.length > 280}
                  keyboardShouldPersistTaps="handled"
                >
                  <Text style={styles.message}>{payload.message}</Text>
                </ScrollView>
              ) : null}
              <Pressable
                onPress={hide}
                style={({ pressed }) => [styles.button, pressed && { opacity: 0.85 }]}
                accessibilityRole="button"
                accessibilityLabel="OK"
              >
                <Text style={styles.buttonLabel}>OK</Text>
              </Pressable>
            </View>
            </View>
          </View>
        </View>
      </Modal>
    </AppDialogContext.Provider>
  );
}

export function useAppDialog(): AppDialogContextValue {
  const ctx = useContext(AppDialogContext);
  if (!ctx) {
    throw new Error("useAppDialog must be used within AppDialogProvider");
  }
  return ctx;
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: "center",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: BG_OVERLAY,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  cardOuter: {
    width: "100%",
    maxWidth: 400,
    zIndex: 1,
  },
  card: {
    backgroundColor: CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: TITLE,
    marginBottom: 10,
    letterSpacing: 0.2,
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    color: BODY,
    marginBottom: 18,
  },
  button: {
    alignSelf: "stretch",
    backgroundColor: ACCENT_BG,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: ACCENT,
  },
});
