import { Platform } from "react-native";
import * as Notifications from "expo-notifications";

/** Android 8+ — yerel bildirimlerin görünmesi için kanal gerekir. */
export const ANDROID_NOTIFICATION_CHANNEL_ID = "centifi_default";

let handlerSet = false;

function ensureHandler(): void {
  if (handlerSet || Platform.OS === "web") return;
  try {
    handlerSet = true;
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
  } catch (e) {
    handlerSet = false;
    if (__DEV__) {
      console.warn("[Centifi] setNotificationHandler:", e);
    }
  }
}

/**
 * Uygulama açılışında bir kez: handler + Android kanalı.
 * (FCM / uzak push yok.)
 * Expo Go / bazı cihazlarda native çağrı hata verirse uygulama çökmemeli.
 */
export async function initLocalNotifications(): Promise<void> {
  try {
    if (Platform.OS === "web") return;
    ensureHandler();
    if (Platform.OS === "android") {
      const importance =
        typeof Notifications.AndroidImportance?.DEFAULT === "number" ?
          Notifications.AndroidImportance.DEFAULT :
          5;
      const visibility =
        typeof Notifications.AndroidNotificationVisibility?.PUBLIC === "number" ?
          Notifications.AndroidNotificationVisibility.PUBLIC :
          1;
      await Notifications.setNotificationChannelAsync(ANDROID_NOTIFICATION_CHANNEL_ID, {
        name: "Centifi",
        importance,
        vibrationPattern: [0, 250, 250, 250],
        lockscreenVisibility: visibility,
      });
    }
  } catch (e) {
    if (__DEV__) {
      console.warn("[Centifi] initLocalNotifications:", e);
    }
  }
}

/**
 * OS izni — uzak push (FCM) değil; yerel bildirimler için.
 */
export async function ensureLocalNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  ensureHandler();
  const existing = await Notifications.getPermissionsAsync();
  if (isPermissionGranted(existing)) return true;
  const req = await Notifications.requestPermissionsAsync();
  return isPermissionGranted(req);
}

/**
 * Kullanıcı izni reddetti / kapattı — henüz sorulmadıysa (`undetermined`) false döner;
 * uygulama içi anahtarı buna göre kapatmayız.
 */
export async function isOsNotificationPermissionExplicitlyDenied(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  ensureHandler();
  const p = await Notifications.getPermissionsAsync();
  if (isPermissionGranted(p)) return false;
  const s = String((p as { status?: string }).status ?? "").toLowerCase();
  return s === "denied" || s === "blocked";
}

function isPermissionGranted(p: unknown): boolean {
  const o = p as { granted?: boolean; status?: string };
  if (typeof o.granted === "boolean") return o.granted;
  return o.status === "granted";
}

/**
 * Yerel bildirim (Firebase gerekmez). Banka bildiriminden harcama çıkarıldığında veya
 * benzeri durumlarda `notificationsEnabled` açıksa çağır.
 */
export async function presentLocalNotificationIfEnabled(
  notificationsEnabled: boolean,
  opts: { title: string; body: string; data?: Record<string, unknown> },
): Promise<void> {
  if (!notificationsEnabled || Platform.OS === "web") return;
  ensureHandler();
  const ok = await ensureLocalNotificationPermissions();
  if (!ok) return;
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: opts.title,
        body: opts.body,
        data: opts.data,
        ...(Platform.OS === "android"
          ? { android: { channelId: ANDROID_NOTIFICATION_CHANNEL_ID } }
          : {}),
      },
      trigger: null,
    });
  } catch (e) {
    if (__DEV__) {
      console.warn("[Centifi] scheduleNotificationAsync:", e);
    }
  }
}

/** Banka bildiriminden harcama yakalandığında — çağıran `notificationsEnabled` ile birlikte kullanır. */
export function notifyBankExpenseDetected(params: {
  notificationsEnabled: boolean;
  title: string;
  body: string;
}): Promise<void> {
  return presentLocalNotificationIfEnabled(params.notificationsEnabled, {
    title: params.title,
    body: params.body,
    data: { type: "bank_expense" },
  });
}
