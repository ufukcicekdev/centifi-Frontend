import { useEffect, useRef, useCallback } from "react";
import { AppState, DeviceEventEmitter, Platform } from "react-native";
import { useStore } from "../store/useStore";

const EVENT = "CentifiBankPendingUpdated";

/**
 * Android: OS bildirim dinleyicisinden gelen kuyruğu boşaltır, etkin banka paketlerini native ile senkronlar.
 * Senkronizden hemen sonra drain edilir; aksi halde ilk karede kuyruk, izin listesi yazılmadan boşaltılabiliyordu.
 * iOS’ta diğer uygulama bildirimleri okunamaz — burada işlem yok.
 */
export default function BankPendingBridge() {
  const bankAutomations = useStore((s) => s.bankAutomations);
  const notificationsEnabled = useStore((s) => s.notificationsEnabled);
  const mounted = useRef(true);

  const syncThenDrain = useCallback(() => {
    if (Platform.OS !== "android") return;
    void (async () => {
      const { syncBankListenerAllowedPackages, drainBankListenerNativeQueue } = await import(
        "../lib/bankNotificationAndroid",
      );
      const pkgs = useStore
        .getState()
        .bankAutomations.filter((b) => b.enabled)
        .map((b) => b.packageName.trim())
        .filter(Boolean);
      await syncBankListenerAllowedPackages(pkgs);
      if (!mounted.current) return;
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
      const { syncBankSystemNotificationFlag } = await import("../lib/bankNotificationAndroid");
      await syncBankSystemNotificationFlag(notificationsEnabled);
    })();
  }, [notificationsEnabled]);

  useEffect(() => {
    if (Platform.OS !== "android") return;
    syncThenDrain();
  }, [bankAutomations, syncThenDrain]);

  useEffect(() => {
    if (Platform.OS !== "android") return;
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") syncThenDrain();
    });
    const ev = DeviceEventEmitter.addListener(EVENT, syncThenDrain);
    return () => {
      sub.remove();
      ev.remove();
    };
  }, [syncThenDrain]);

  return null;
}
