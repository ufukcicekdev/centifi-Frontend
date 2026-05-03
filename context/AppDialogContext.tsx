import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useStore } from "../store/useStore";
import i18n from "../i18n";

const PURPLE = "#6C63FF";
const DESTRUCTIVE = "#FF453A";
const DESTRUCTIVE_DARK = "#FF6B6B";

export type ShowConfirmOptions = {
  title: string;
  message?: string;
  /** Varsayılan: i18n `common.confirm` */
  confirmText?: string;
  /** Varsayılan: i18n `common.cancel` */
  cancelText?: string;
  destructive?: boolean;
};

type AlertPayload = { kind: "alert"; title: string; message: string };
type ConfirmPayload = {
  kind: "confirm";
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  destructive: boolean;
};

type DialogPayload = AlertPayload | ConfirmPayload;

export type AppDialogContextValue = {
  showAlert: (title: string, message?: string) => void;
  showConfirm: (options: ShowConfirmOptions) => Promise<boolean>;
};

export const AppDialogContext = createContext<AppDialogContextValue | null>(null);

export function AppDialogProvider({ children }: { children: React.ReactNode }) {
  const isDark = useStore((s) => s.isDark);
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [payload, setPayload] = useState<DialogPayload | null>(null);
  const confirmResolveRef = useRef<((value: boolean) => void) | null>(null);
  const { height: winH } = useWindowDimensions();

  const theme = useMemo(() => {
    if (isDark) {
      return {
        overlay: "rgba(5, 8, 18, 0.72)",
        cardBg: "#171f32",
        border: "#404758",
        title: "#f0f2f8",
        body: "#b8c0d4",
        secondaryBtnBg: "#2a2f4a",
        secondaryBtnBorder: "#404758",
        secondaryBtnLabel: "#bfc2ff",
        confirmAccentBg: PURPLE,
        confirmDestructiveBg: DESTRUCTIVE_DARK,
      };
    }
    return {
      overlay: "rgba(0, 0, 0, 0.45)",
      cardBg: "#ffffff",
      border: "rgba(0,0,0,0.08)",
      title: "#111111",
      body: "#444444",
      secondaryBtnBg: "#f2f2f7",
      secondaryBtnBorder: "#d1d1d6",
      secondaryBtnLabel: "#007AFF",
      confirmAccentBg: PURPLE,
      confirmDestructiveBg: DESTRUCTIVE,
    };
  }, [isDark]);

  const finishConfirm = useCallback((result: boolean) => {
    const r = confirmResolveRef.current;
    confirmResolveRef.current = null;
    setOpen(false);
    setPayload(null);
    r?.(result);
  }, []);

  const hideAlert = useCallback(() => {
    setOpen(false);
    setPayload(null);
  }, []);

  const showAlert = useCallback((title: string, message = "") => {
    confirmResolveRef.current = null;
    setPayload({ kind: "alert", title, message: message.trim() });
    setOpen(true);
  }, []);

  const showConfirm = useCallback((options: ShowConfirmOptions) => {
    const confirmText =
      options.confirmText ??
      String(i18n.t("common.confirm", { defaultValue: "Confirm" }));
    const cancelText =
      options.cancelText ?? String(i18n.t("common.cancel", { defaultValue: "Cancel" }));
    return new Promise<boolean>((resolve) => {
      confirmResolveRef.current = resolve;
      setPayload({
        kind: "confirm",
        title: options.title,
        message: (options.message ?? "").trim(),
        confirmText,
        cancelText,
        destructive: !!options.destructive,
      });
      setOpen(true);
    });
  }, []);

  const value = useMemo(() => ({ showAlert, showConfirm }), [showAlert, showConfirm]);

  const maxCardHeight = Math.max(
    180,
    Math.min(winH * 0.72 - Math.max(insets.top, 0) - Math.max(insets.bottom, 0), 420),
  );

  const onRequestClose = () => {
    if (payload?.kind === "confirm") {
      finishConfirm(false);
    } else {
      hideAlert();
    }
  };

  const confirmBg =
    payload?.kind === "confirm" && payload.destructive ?
      theme.confirmDestructiveBg
    : theme.confirmAccentBg;

  return (
    <AppDialogContext.Provider value={value}>
      {children}
      <Modal
        visible={open && !!payload}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={onRequestClose}
      >
        <View style={styles.modalRoot}>
          <Pressable style={[styles.backdrop, { backgroundColor: theme.overlay }]} onPress={onRequestClose} accessibilityRole="button" />
          <View
            style={[
              styles.center,
              {
                paddingTop: Math.max(12, insets.top + 8),
                paddingBottom: Math.max(20, insets.bottom + 12),
                paddingLeft: Math.max(24, insets.left + 8),
                paddingRight: Math.max(24, insets.right + 8),
              },
            ]}
            pointerEvents="box-none"
          >
            <View style={styles.cardOuter}>
              <View
                style={[
                  styles.card,
                  {
                    backgroundColor: theme.cardBg,
                    borderColor: theme.border,
                  },
                ]}
                accessibilityRole="alert"
              >
                <Text style={[styles.title, { color: theme.title }]}>{payload?.title ?? ""}</Text>
                {payload && payload.message ?
                  <ScrollView
                    style={{ maxHeight: maxCardHeight }}
                    showsVerticalScrollIndicator={payload.message.length > 280}
                    keyboardShouldPersistTaps="handled"
                  >
                    <Text style={[styles.message, { color: theme.body }]}>{payload.message}</Text>
                  </ScrollView>
                : null}

                {payload?.kind === "alert" ?
                  <Pressable
                    onPress={hideAlert}
                    style={({ pressed }) => [
                      styles.singleButton,
                      {
                        backgroundColor: theme.secondaryBtnBg,
                        borderColor: theme.secondaryBtnBorder,
                        opacity: pressed ? 0.88 : 1,
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={String(i18n.t("common.ok"))}
                  >
                    <Text style={[styles.singleButtonLabel, { color: theme.secondaryBtnLabel }]}>
                      {String(i18n.t("common.ok"))}
                    </Text>
                  </Pressable>
                : payload?.kind === "confirm" ?
                  <View style={styles.confirmRow}>
                    <Pressable
                      onPress={() => finishConfirm(false)}
                      style={({ pressed }) => [
                        styles.confirmBtn,
                        styles.confirmBtnSecondary,
                        {
                          backgroundColor: theme.secondaryBtnBg,
                          borderColor: theme.secondaryBtnBorder,
                          opacity: pressed ? 0.88 : 1,
                        },
                      ]}
                      accessibilityRole="button"
                    >
                      <Text
                        style={[styles.confirmBtnLabelSecondary, { color: theme.secondaryBtnLabel }]}
                        numberOfLines={2}
                      >
                        {payload.cancelText}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => finishConfirm(true)}
                      style={({ pressed }) => [
                        styles.confirmBtn,
                        styles.confirmBtnPrimary,
                        { backgroundColor: confirmBg, opacity: pressed ? 0.9 : 1 },
                      ]}
                      accessibilityRole="button"
                    >
                      <Text style={styles.confirmBtnLabelPrimary} numberOfLines={2}>
                        {payload.confirmText}
                      </Text>
                    </Pressable>
                  </View>
                : null}
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
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  cardOuter: {
    width: "100%",
    maxWidth: 400,
    zIndex: 1,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 10,
    letterSpacing: 0.2,
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 18,
  },
  singleButton: {
    alignSelf: "stretch",
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  singleButtonLabel: {
    fontSize: 16,
    fontWeight: "600",
  },
  /** İptal (sol) + onay (sağ); eşit genişlik, standart mobil diyalog */
  confirmRow: {
    flexDirection: "row",
    width: "100%",
    marginTop: 8,
    alignSelf: "stretch",
    gap: 10,
  },
  confirmBtn: {
    flex: 1,
    minWidth: 0,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  confirmBtnSecondary: {
    borderWidth: 1,
  },
  confirmBtnPrimary: {},
  confirmBtnLabelSecondary: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  confirmBtnLabelPrimary: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ffffff",
    textAlign: "center",
  },
});
