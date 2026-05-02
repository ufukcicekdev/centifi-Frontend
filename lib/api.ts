import * as SecureStore from "expo-secure-store";
import * as Device from "expo-device";
import { Platform } from "react-native";

const TOKEN_KEY = "auth_tokens_v1";

export type AuthTokens = { access: string; refresh: string };

export type ApiError = {
  status: number;
  message: string;
  details?: unknown;
};

/** When apiFetch throws after building `{ status }`; raw fetch errors have no status. */
export function getApiErrorStatus(e: unknown): number | undefined {
  if (e && typeof e === "object" && "status" in e) {
    const s = (e as { status: unknown }).status;
    return typeof s === "number" ? s : undefined;
  }
  return undefined;
}

/**
 * Base URL: `EXPO_PUBLIC_API_BASE_URL` (ör. üretim
 * https://centifi-backend-production.up.railway.app veya yerel http://127.0.0.1:8000).
 *
 * Minimal URL tweaks only (sim/emülatör → host makinesi):
 * - Android emulator: localhost/127.0.0.1 → 10.0.2.2
 * - iOS Simulator: localhost → 127.0.0.1
 */
function getBaseUrl(): string {
  let raw = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (!raw) raw = "http://127.0.0.1:8000";
  raw = raw.replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(raw)) {
    raw = `http://${raw}`;
  }

  try {
    const u = new URL(raw);
    const simOrEmu = !Device.isDevice;
    const host = u.hostname.toLowerCase();
    const loopback = host === "localhost" || host === "127.0.0.1";

    if (simOrEmu && loopback && Platform.OS === "android") {
      u.hostname = "10.0.2.2";
    } else if (simOrEmu && loopback && Platform.OS === "ios" && host === "localhost") {
      u.hostname = "127.0.0.1";
    }

    const path =
      u.pathname && u.pathname !== "/" ? u.pathname.replace(/\/+$/, "") : "";
    return path ? `${u.origin}${path}` : u.origin;
  } catch {
    return raw;
  }
}

export async function loadTokens(): Promise<AuthTokens | null> {
  try {
    const raw = await SecureStore.getItemAsync(TOKEN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthTokens;
    if (!parsed?.access || !parsed?.refresh) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function saveTokens(tokens: AuthTokens | null) {
  if (!tokens) {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    return;
  }
  await SecureStore.setItemAsync(TOKEN_KEY, JSON.stringify(tokens));
}

async function refreshAccessToken(tokens: AuthTokens): Promise<AuthTokens> {
  const res = await fetch(`${getBaseUrl()}/api/users/token/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh: tokens.refresh }),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw { status: res.status, message: "Token refresh failed", details: json } satisfies ApiError;
  }
  const next: AuthTokens = { access: json.access, refresh: tokens.refresh };
  await saveTokens(next);
  return next;
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit & { auth?: boolean } = {}
): Promise<T> {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;

  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(init.headers as any),
  };

  let tokens = init.auth ? await loadTokens() : null;
  if (init.auth && tokens?.access) {
    headers.Authorization = `Bearer ${tokens.access}`;
  }

  const doRequest = async () => {
    const res = await fetch(url, {
      ...init,
      headers,
    });
    const contentType = res.headers.get("content-type") ?? "";
    const body = contentType.includes("application/json")
      ? await res.json().catch(() => null)
      : await res.text().catch(() => "");
    if (!res.ok) {
      throw { status: res.status, message: "Request failed", details: body } satisfies ApiError;
    }
    return body as T;
  };

  try {
    return await doRequest();
  } catch (e: any) {
    // retry once on 401
    if (init.auth && e?.status === 401 && tokens?.refresh) {
      tokens = await refreshAccessToken(tokens);
      headers.Authorization = `Bearer ${tokens.access}`;
      return await doRequest();
    }
    throw e;
  }
}

