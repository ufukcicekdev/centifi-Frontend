import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
} from "react";
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
import { Ionicons } from "@expo/vector-icons";
import Button from "../components/ui/Button";
import { buildAppDialogTheme } from "../components/dialog/appDialogTheme";
import { ConfirmDialogCard } from "../components/dialog/ConfirmDialogCard";

export type ShowConfirmOptions = {
  title: string;
  message?: string;
  /** Varsayılan: i18n `common.confirm` */
  confirmText?: string;
  /** Varsayılan: i18n `common.cancel` */
  cancelText?: string;
  destructive?: boolean;
  /** Confirm pill leading icon (default: trash if destructive, else checkmark). */
  confirmIcon?: ComponentProps<typeof Ionicons>["name"];
};

type AlertPayload = { kind: "alert"; title: string; message: string };
type ConfirmPayload = {
  kind: "confirm";
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  destructive: boolean;
  confirmIcon?: ComponentProps<typeof Ionicons>["name"];
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

  const theme = useMemo(() => buildAppDialogTheme(isDark), [isDark]);

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
        confirmIcon: options.confirmIcon,
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
              {payload?.kind === "alert" ? (
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
                  <Text style={[styles.title, { color: theme.title }]}>{payload.title}</Text>
                  {payload.message ?
                    <ScrollView
                      style={{ maxHeight: maxCardHeight }}
                      showsVerticalScrollIndicator={payload.message.length > 280}
                      keyboardShouldPersistTaps="handled"
                    >
                      <Text style={[styles.message, { color: theme.body }]}>{payload.message}</Text>
                    </ScrollView>
                  : null}
                  <Button
                    title={String(i18n.t("common.ok"))}
                    onPress={hideAlert}
                    variant="secondary"
                    fullWidth
                    size="md"
                    style={{
                      backgroundColor: theme.secondaryBtnBg,
                      borderColor: theme.secondaryBtnBorder,
                      borderWidth: 1,
                    }}
                    labelStyle={{ color: theme.secondaryBtnLabel, fontWeight: "800" }}
                    accessibilityLabel={String(i18n.t("common.ok"))}
                  />
                </View>
              ) : payload?.kind === "confirm" ? (
                <ConfirmDialogCard
                  isDark={isDark}
                  themeOverride={theme}
                  title={payload.title}
                  message={payload.message}
                  cancelText={payload.cancelText}
                  confirmText={payload.confirmText}
                  destructive={payload.destructive}
                  confirmIcon={payload.confirmIcon}
                  maxMessageHeight={maxCardHeight}
                  onCancel={() => finishConfirm(false)}
                  onConfirm={() => finishConfirm(true)}
                />
              ) : null}
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
    alignItems: "stretch",
  },
  cardOuter: {
    width: "100%",
    maxWidth: 400,
    alignSelf: "center",
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
});
