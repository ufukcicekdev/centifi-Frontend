import { useEffect, useRef, useCallback } from "react";
import { AppState, DeviceEventEmitter, Platform } from "react-native";
import { useStore } from "../store/useStore";

const EVENT = "CentifiBankPendingUpdated";

/**
 * Android: OS bildirim dinleyicisinden gelen kuyruğu boşaltır, etkin banka paketlerini native ile senkronlar.
 * iOS’ta diğer uygulama bildirimleri okunamaz — burada işlem yok.
 */
export default function BankPendingBridge() {
  const bankAutomations = useStore((s) => s.bankAutomations);
  const notificationsEnabled = useStore((s) => s.notificationsEnabled);
  const mounted = useRef(true);

  const drain = useCallback(() => {
    if (Platform.OS !== "android") return;
    void (async () => {
      const { drainBankListenerNativeQueue } = await import("../lib/bankNotificationAndroid");
      const rows = await drainBankListenerNativeQueue();
      if (!mounted.current || rows.length === 0) return;
      useStore.getState().ingestNativePendingBankRows(rows);
    })();
  }, []);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (Platform.OS !== "android") return;
    void (async () => {
      const { syncBankListenerAllowedPackages } = await import("../lib/bankNotificationAndroid");
      const pkgs = bankAutomations.filter((b) => b.enabled).map((b) => b.packageName.trim()).filter(Boolean);
      await syncBankListenerAllowedPackages(pkgs);
    })();
  }, [bankAutomations]);

  useEffect(() => {
    if (Platform.OS !== "android") return;
    void (async () => {
      const { syncBankSystemNotificationFlag } = await import("../lib/bankNotificationAndroid");
      await syncBankSystemNotificationFlag(notificationsEnabled);
    })();
  }, [notificationsEnabled]);

  useEffect(() => {
    if (Platform.OS !== "android") return;
    drain();
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") drain();
    });
    const ev = DeviceEventEmitter.addListener(EVENT, drain);
    return () => {
      sub.remove();
      ev.remove();
    };
  }, [drain]);

  return null;
}
