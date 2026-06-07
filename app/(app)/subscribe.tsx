import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  StyleSheet,
  RefreshControl,
  BackHandler,
  Image,
  useWindowDimensions,
  Linking,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useStore } from "../../store/useStore";
import { syncSubscriptionFromRevenueCat } from "../../lib/backend";
import { useAppDialog } from "../../context/AppDialogContext";
import { isRevenueCatConfigured, revenueCatEntitlementId } from "../../lib/revenuecat";
import { centifiLegalUrls } from "../../lib/legalUrls";
import { openStoreSubscriptionSettings } from "../../lib/storeSubscriptionSettings";

const PURPLE = "#6C63FF";
const GOLD = "#FFB800";
/** Paywall ana CTA (Monai tarzı — canlı kırmızı) */
const CTA_RED = "#FF3B30";
const GUTTER = 16;
const FOOTER_CTA_HEIGHT = 88;
const MONAI_CARD_GREEN = "#22c55e";

const ctaShadow =
  Platform.OS === "android"
    ? { elevation: 8 }
    : {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.28,
        shadowRadius: 6,
      };

/** Aktif entitlement anahtarı — ``revenueCatEntitlementId()`` (RC paneli Identifier). */
function proFromRevenueCatCustomerInfo(
  customerInfo: { entitlements: { active: Record<string, { expirationDate?: string | null } | null> } } | null | undefined,
): { isPro: boolean; expiresAt: string | null } {
  if (!customerInfo?.entitlements?.active) return { isPro: false, expiresAt: null };
  const key = revenueCatEntitlementId();
  const pro = customerInfo.entitlements.active[key];
  if (!pro) return { isPro: false, expiresAt: null };
  const exp = pro.expirationDate ?? null;
  if (exp == null) return { isPro: true, expiresAt: null };
  const t = Date.parse(exp);
  if (Number.isNaN(t)) return { isPro: true, expiresAt: exp };
  return { isPro: t > Date.now(), expiresAt: exp };
}

async function sleepMs(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

async function syncSubscriptionFromRevenueCatWithRetry(
  maxAttempts = 4,
): Promise<Awaited<ReturnType<typeof syncSubscriptionFromRevenueCat>> | null> {
  let last: Awaited<ReturnType<typeof syncSubscriptionFromRevenueCat>> | null = null;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      last = await syncSubscriptionFromRevenueCat();
      if (last.is_pro) return last;
    } catch {
      /* RC REST veya ağ gecikmesi */
    }
    if (attempt < maxAttempts - 1) await sleepMs(1200 * (attempt + 1));
  }
  return last;
}

/**
 * Play faturaları → RevenueCat → backend. ``restorePurchases`` mevcut Google hesabındaki
 * makbuzları bu Centifi kullanıcısının RC ``app_user_id`` kaydına bağlar.
 */
async function reconcileProWithPlayAndRc(): Promise<{ isProNow: boolean; expiresAt: string | null }> {
  if (Platform.OS === "web" || !isRevenueCatConfigured()) return { isProNow: false, expiresAt: null };
  const uid = useStore.getState().user?.uid;
  if (!uid) return { isProNow: false, expiresAt: null };

  const rc = await import("../../lib/revenuecat");
  await rc.configureRevenueCatForUser(uid);
  const Purchases = (await import("react-native-purchases")).default;

  await Purchases.syncPurchases().catch(() => {});
  await Purchases.invalidateCustomerInfoCache().catch(() => {});

  let customerInfo = await Purchases.restorePurchases();
  await Purchases.syncPurchases().catch(() => {});

  let local = proFromRevenueCatCustomerInfo(customerInfo);
  let me = await syncSubscriptionFromRevenueCatWithRetry();
  let isProNow = !!(me?.is_pro || local.isPro);

  if (!isProNow) {
    await sleepMs(800);
    customerInfo = await Purchases.getCustomerInfo();
    local = proFromRevenueCatCustomerInfo(customerInfo);
    me = await syncSubscriptionFromRevenueCatWithRetry();
    isProNow = !!(me?.is_pro || local.isPro);
  }

  const expiresAt = me?.pro_entitlement_expires_at ?? local.expiresAt ?? null;
  return { isProNow, expiresAt };
}

function PaywallLegalLinks({ mutedColor, compact }: { mutedColor: string; compact?: boolean }) {
  const { t, i18n } = useTranslation();
  const urls = centifiLegalUrls(i18n.language);
  const open = (url: string) => void Linking.openURL(url);

  return (
    <View style={{ marginTop: compact ? 8 : 20, alignItems: compact ? "center" : "stretch" }}>
      {compact ? null : (
        <Text style={{ color: mutedColor, fontSize: 12, lineHeight: 17 }}>{t("subscribe.legalHint")}</Text>
      )}
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          marginTop: compact ? 0 : 10,
          gap: 8,
          justifyContent: compact ? "center" : "flex-start",
          alignItems: "center",
        }}
      >
        <Pressable onPress={() => open(urls.privacy)} hitSlop={8}>
          <Text style={{ color: PURPLE, fontSize: compact ? 11 : 13, fontWeight: "600", textDecorationLine: "underline" }}>
            {t("subscribe.legalPrivacy")}
          </Text>
        </Pressable>
        <Text style={{ color: mutedColor, fontSize: compact ? 11 : 13 }}>·</Text>
        <Pressable onPress={() => open(urls.terms)} hitSlop={8}>
          <Text style={{ color: PURPLE, fontSize: compact ? 11 : 13, fontWeight: "600", textDecorationLine: "underline" }}>
            {t("subscribe.legalTerms")}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function isLikelyAnnualPackage(id: string, title: string): boolean {
  const s = `${id} ${title}`.toLowerCase();
  return /\b(year|annual|yıllık|jahr|anual|annuel)\b/i.test(s) || /\$rc_annual|\$rc_yearly/i.test(id);
}

/** RevenueCat bazen `current` boş bırakır; ilk uygun offering’den paket alır. */
function extractAvailablePackages(offerings: {
  current?: { availablePackages?: unknown[] } | null;
  all?: Record<string, { availablePackages?: unknown[] }> | null;
}): unknown[] {
  const cur = offerings.current?.availablePackages;
  if (Array.isArray(cur) && cur.length > 0) return cur;
  const all = offerings.all;
  if (!all || typeof all !== "object") return [];
  for (const o of Object.values(all)) {
    const ap = o?.availablePackages;
    if (Array.isArray(ap) && ap.length > 0) return ap;
  }
  return [];
}

export default function SubscribeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ gate?: string | string[] }>();
  const gateRaw = params.gate;
  const gate = typeof gateRaw === "string" ? gateRaw : Array.isArray(gateRaw) ? gateRaw[0] : undefined;
  /** Kök layout’tan: Pro olmadan ana uygulamaya dönülemesin. */
  const mandatory = gate === "pro";
  const insets = useSafeAreaInsets();
  const { showAlert } = useAppDialog();
  const isDark = useStore((s) => s.isDark);
  const isPro = useStore((s) => s.isPro);
  const proExpires = useStore((s) => s.proEntitlementExpiresAt);

  const [loading, setLoading] = useState(true);
  const [packages, setPackages] = useState<
    { identifier: string; product: { title: string; description: string; priceString: string } }[]
  >([]);
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const logout = useStore((s) => s.logout);

  useEffect(() => {
    if (packages.length === 0) {
      setSelectedPackageId(null);
      return;
    }
    setSelectedPackageId((prev) =>
      prev && packages.some((p) => p.identifier === prev) ? prev : packages[0].identifier,
    );
  }, [packages]);

  const selectedPkg = useMemo(
    () => packages.find((p) => p.identifier === selectedPackageId) ?? null,
    [packages, selectedPackageId],
  );

  /** Deneme metninde aylık fiyat — yıllık plan seçiliyken bile aylık paket gösterilir. */
  const monthlyBillingPkg = useMemo(() => {
    const monthly = packages.find((p) => !isLikelyAnnualPackage(p.identifier, p.product.title));
    return monthly ?? packages[0] ?? null;
  }, [packages]);

  const billingStoreLabel =
    Platform.OS === "android" ? t("subscribe.storeGooglePlay") : t("subscribe.storeAppStore");

  const showTrialBanner = !isPro && isRevenueCatConfigured() && !loading && packages.length > 0;

  useFocusEffect(
    useCallback(() => {
      if (!mandatory || Platform.OS === "web") return undefined;
      const sub = BackHandler.addEventListener("hardwareBackPress", () => true);
      return () => sub.remove();
    }, [mandatory]),
  );

  useEffect(() => {
    if (mandatory && isPro) {
      router.replace("/(app)" as any);
    }
  }, [mandatory, isPro, router]);

  const loadOfferings = useCallback(async (opts?: { soft?: boolean }) => {
    const soft = !!opts?.soft;
    if (Platform.OS === "web" || !isRevenueCatConfigured()) {
      setPackages([]);
      setLoadFailed(false);
      if (!soft) setLoading(false);
      return;
    }
    if (soft) setRefreshing(true);
    else setLoading(true);
    setLoadFailed(false);
    try {
      const rc = await import("../../lib/revenuecat");
      const uid = useStore.getState().user?.uid;
      if (uid) await rc.configureRevenueCatForUser(uid);

      const Purchases = (await import("react-native-purchases")).default;
      const offerings = await Purchases.getOfferings();
      const pkgs = extractAvailablePackages(offerings) as {
        identifier: string;
        product: { title?: string; description?: string; priceString?: string };
      }[];
      setPackages(
        pkgs.map((p) => ({
          identifier: p.identifier,
          product: {
            title: p.product.title ?? p.identifier,
            description: p.product.description ?? "",
            priceString: p.product.priceString ?? "",
          },
        })),
      );
    } catch (e) {
      if (__DEV__) console.warn("[Centifi] getOfferings:", e);
      setPackages([]);
      setLoadFailed(true);
    } finally {
      if (soft) setRefreshing(false);
      else setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!useStore.getState().isAuthenticated) {
        router.back();
        return;
      }
      void loadOfferings();
    }, [loadOfferings, router]),
  );

  const { width: windowWidth } = useWindowDimensions();
  const bg = isDark ? "#000000" : "#f5f5f5";
  const textColor = isDark ? "#fff" : "#000";
  const mutedColor = isDark ? "#8e8e93" : "#666";
  const divider = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)";
  /** Seçili plan çerçevesi: açık temada beyaz kaybolmasın */
  const planSelectedBorder = isDark ? "#ffffff" : PURPLE;
  const showPaywallCta =
    isRevenueCatConfigured() && !loading && packages.length > 0 && !isPro && !!selectedPkg;

  const handlePurchase = async (pkg: { identifier: string }) => {
    if (Platform.OS === "web" || !isRevenueCatConfigured()) return;
    setBuyingId(pkg.identifier);
    try {
      const rc = await import("../../lib/revenuecat");
      const uid = useStore.getState().user?.uid;
      if (uid) await rc.configureRevenueCatForUser(uid);

      const Purchases = (await import("react-native-purchases")).default;
      const offerings = await Purchases.getOfferings();
      const list = extractAvailablePackages(offerings) as { identifier: string }[];
      const full = list.find((p) => p.identifier === pkg.identifier) as Parameters<
        typeof Purchases.purchasePackage
      >[0];
      if (!full) {
        showAlert(t("common.error"), t("subscribe.packageGone"));
        return;
      }
      const { customerInfo } = await Purchases.purchasePackage(full);
      await Purchases.syncPurchases().catch(() => {});

      const localPro = proFromRevenueCatCustomerInfo(customerInfo);
      const me = await syncSubscriptionFromRevenueCatWithRetry();

      const isProNow = !!(me?.is_pro || localPro.isPro);
      const expiresAt = me?.pro_entitlement_expires_at ?? localPro.expiresAt ?? null;

      useStore.setState({
        isPro: isProNow,
        proEntitlementExpiresAt: expiresAt,
      });

      if (isProNow) {
        router.replace("/(app)" as any);
        showAlert(t("subscribe.thanksTitle"), t("subscribe.thanksBody"));
      } else {
        showAlert(t("common.error"), t("subscribe.purchaseFailedMaybeRestore"));
      }
    } catch (e: unknown) {
      const err = e as { userCancelled?: boolean; message?: string; code?: string };
      if (err?.userCancelled) return;
      const msg = err?.message ?? t("subscribe.purchaseFailed");
      if (/already|owned|Item already|zaten|exist/i.test(msg)) {
        try {
          const { isProNow, expiresAt } = await reconcileProWithPlayAndRc();
          useStore.setState({ isPro: isProNow, proEntitlementExpiresAt: expiresAt });
          if (isProNow) {
            router.replace("/(app)" as any);
            showAlert(t("subscribe.thanksTitle"), t("subscribe.thanksBody"));
          } else {
            const ownedTitle =
              Platform.OS === "android"
                ? t("subscribe.playSubscriptionAlreadyOwnedTitle")
                : t("subscribe.subscriptionAlreadyOwnedTitle");
            const mismatchBody =
              Platform.OS === "android"
                ? t("subscribe.restoreMismatchBody")
                : t("subscribe.restoreMismatchBodyIos");
            showAlert(ownedTitle, mismatchBody);
          }
        } catch {
          const ownedTitle =
            Platform.OS === "android"
              ? t("subscribe.playSubscriptionAlreadyOwnedTitle")
              : t("subscribe.subscriptionAlreadyOwnedTitle");
          const ownedBody =
            Platform.OS === "android"
              ? t("subscribe.playSubscriptionAlreadyOwnedBody")
              : t("subscribe.subscriptionAlreadyOwnedBody");
          showAlert(ownedTitle, ownedBody);
          }
      } else {
        showAlert(t("common.error"), msg);
      }
    } finally {
      setBuyingId(null);
    }
  };

  const handleRestore = async () => {
    if (Platform.OS === "web" || !isRevenueCatConfigured()) return;
    setLoading(true);
    try {
      const { isProNow, expiresAt } = await reconcileProWithPlayAndRc();
      useStore.setState({
        isPro: isProNow,
        proEntitlementExpiresAt: expiresAt,
      });
      if (isProNow) {
        router.replace("/(app)" as any);
        showAlert(t("subscribe.restoredTitle"), t("subscribe.restoredBody"));
      } else {
        showAlert(
          t("subscribe.restoreMismatchTitle"),
          Platform.OS === "android" ? t("subscribe.restoreMismatchBody") : t("subscribe.restoreMismatchBodyIos"),
        );
      }
    } catch (e: unknown) {
      const err = e as { message?: string };
      showAlert(t("common.error"), err?.message ?? t("subscribe.restoreFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }} edges={["top", "left", "right"]}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 16,
          paddingTop: 6,
          paddingBottom: 14,
          minHeight: 48,
        }}
      >
        {!mandatory ? (
          <Pressable
            onPress={() => router.back()}
            hitSlop={14}
            style={{ position: "absolute", left: 8, padding: 8, zIndex: 1 }}
          >
            <Ionicons name="chevron-back" size={24} color={mutedColor} />
          </Pressable>
        ) : (
          <View style={{ position: "absolute", left: 8, width: 44, height: 44 }} />
        )}
        <Text style={{ color: textColor, fontSize: 17, fontWeight: "700" }}>{t("subscribe.title")}</Text>
      </View>

      <View style={{ flex: 1 }}>
        <ScrollView
          style={{ flex: 1, backgroundColor: bg }}
          contentContainerStyle={{
            paddingHorizontal: GUTTER,
            paddingBottom: (showPaywallCta ? FOOTER_CTA_HEIGHT + 24 : 32) + insets.bottom,
          }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            isRevenueCatConfigured() ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => void loadOfferings({ soft: true })}
                tintColor={PURPLE}
                colors={[PURPLE]}
              />
            ) : undefined
          }
        >
        {!isPro && isRevenueCatConfigured() && !loading && packages.length > 0 ? (
          <View style={{ alignItems: "center", marginBottom: 22 }}>
            <Image
              source={require("../../assets/icon.png")}
              style={{ width: 56, height: 56, borderRadius: 14, marginBottom: 14 }}
              accessibilityIgnoresInvertColors
            />
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 6 }}>
              {[1, 2, 3, 4, 5].map((i) => (
                <Ionicons key={i} name="star" size={22} color={GOLD} />
              ))}
            </View>
            <Text style={{ color: textColor, fontSize: 22, fontWeight: "800", marginBottom: 10 }}>
              {t("subscribe.paywallRatingLine")}
            </Text>
            <Text
              style={{
                color: mutedColor,
                fontSize: 15,
                lineHeight: 22,
                textAlign: "center",
                fontStyle: "italic",
                paddingHorizontal: 8,
              }}
            >
              “{t("subscribe.paywallQuote")}”
            </Text>
            <Text style={{ color: mutedColor, fontSize: 13, marginTop: 8 }}>{t("subscribe.paywallQuoteAuthor")}</Text>
          </View>
        ) : null}

        {mandatory ? (
          <Text style={{ color: textColor, fontSize: 14, lineHeight: 21, marginBottom: 12, fontWeight: "600" }}>
            {t("subscribe.mandatoryPaywallHint")}
          </Text>
        ) : null}
        <Text style={{ color: mutedColor, fontSize: 14, lineHeight: 21, marginBottom: 16 }}>
          {t("subscribe.intro")}
        </Text>

        {showTrialBanner && monthlyBillingPkg ? (
          <View
            style={{
              backgroundColor: isDark ? "rgba(34, 197, 94, 0.12)" : "rgba(34, 197, 94, 0.14)",
              borderRadius: 16,
              padding: 16,
              marginBottom: 18,
              borderWidth: 1,
              borderColor: isDark ? "rgba(34, 197, 94, 0.35)" : "rgba(22, 163, 74, 0.35)",
              flexDirection: "row",
              gap: 12,
              alignItems: "flex-start",
            }}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                backgroundColor: isDark ? "rgba(34, 197, 94, 0.22)" : "rgba(22, 163, 74, 0.18)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="gift-outline" size={22} color={MONAI_CARD_GREEN} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: textColor, fontSize: 16, fontWeight: "800", marginBottom: 6 }}>
                {t("subscribe.freeTrialTitle")}
              </Text>
              <Text style={{ color: mutedColor, fontSize: 14, lineHeight: 21 }}>
                {t("subscribe.freeTrialBody", {
                  price: monthlyBillingPkg.product.priceString,
                  store: billingStoreLabel,
                })}
              </Text>
              <Text style={{ color: mutedColor, fontSize: 12, lineHeight: 18, marginTop: 8 }}>
                {t("subscribe.freeTrialCancelHint", { store: billingStoreLabel })}
              </Text>
            </View>
          </View>
        ) : null}

        {isPro ? (
          <View
            style={{
              backgroundColor: `${PURPLE}18`,
              borderRadius: 14,
              padding: 16,
              marginBottom: 20,
              borderWidth: 1,
              borderColor: `${PURPLE}55`,
            }}
          >
            <Text style={{ color: textColor, fontSize: 16, fontWeight: "700" }}>{t("subscribe.activeTitle")}</Text>
            {proExpires ? (
              <Text style={{ color: mutedColor, fontSize: 14, marginTop: 6 }}>
                {t("subscribe.activeUntil", { date: proExpires.slice(0, 10) })}
              </Text>
            ) : null}
          </View>
        ) : null}

        {!isRevenueCatConfigured() ? (
          <Text style={{ color: mutedColor, fontSize: 14, lineHeight: 20 }}>{t("subscribe.notConfigured")}</Text>
        ) : loading ? (
          <ActivityIndicator size="large" color={PURPLE} style={{ marginTop: 24 }} />
        ) : packages.length === 0 ? (
          <View style={{ marginTop: 4 }}>
            <Text style={{ color: mutedColor, fontSize: 14, lineHeight: 21 }}>
              {loadFailed ? t("subscribe.loadPackagesError") : t("subscribe.noPackages")}
            </Text>
            {!loadFailed ? (
              <Text style={{ color: mutedColor, fontSize: 13, lineHeight: 19, marginTop: 12 }}>
                {t("subscribe.emptyPackagesHint")}
              </Text>
            ) : null}
          </View>
        ) : (
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              marginBottom: 8,
              gap: 12,
              justifyContent: packages.length === 1 ? "center" : "flex-start",
            }}
          >
            {packages.map((pkg) => {
              const selected = pkg.identifier === selectedPackageId;
              const annual = isLikelyAnnualPackage(pkg.identifier, pkg.product.title);
              const multi = packages.length > 1;
              const monaiCardSurface = isDark ? "#252527" : "#ffffff";
              const iconTileBg = isDark ? "#121213" : "#e8e8ec";
              const planCardBorderIdle = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)";
              const singleCardW = Math.min(Math.max(windowWidth * 0.42, 158), 204);
              const outerWidth = multi ? ({ flex: 1, minWidth: 0 } as const) : ({ width: singleCardW } as const);
              const iconTileSize = multi ? 44 : 52;
              const priceFont = multi ? 21 : 26;
              /** Emoji yerine vektör: iOS’ta 🤌/🤓 tofu veriyordu. */
              const planIconName = annual ? ("trending-down-outline" as const) : ("calendar-outline" as const);
              const planIconGlyph = multi ? 26 : 30;
              const planIconColor = isDark ? "#a8a8ac" : "#555";

              return (
                <Pressable
                  key={pkg.identifier}
                  onPress={() => setSelectedPackageId(pkg.identifier)}
                  disabled={!!buyingId}
                  style={({ pressed }) => [
                    outerWidth,
                    { opacity: pressed ? 0.92 : 1 },
                  ]}
                >
                  <View
                    style={{
                      borderRadius: 18,
                      padding: multi ? 12 : 14,
                      paddingTop: annual ? 32 : 14,
                      backgroundColor: monaiCardSurface,
                      borderWidth: selected ? 2 : 1,
                      borderColor: selected ? planSelectedBorder : planCardBorderIdle,
                      minHeight: multi ? 148 : 168,
                    }}
                  >
                    {annual ? (
                      <View
                        style={{
                          position: "absolute",
                          top: 10,
                          right: 10,
                          backgroundColor: isDark ? "#bbf7d0" : "#bbf7d0",
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          borderRadius: 20,
                        }}
                      >
                        <Text style={{ color: "#14532d", fontSize: 11, fontWeight: "800" }}>
                          {t("subscribe.annualSaveBadge")}
                        </Text>
                      </View>
                    ) : null}
                    <View
                      style={{
                        width: iconTileSize,
                        height: iconTileSize,
                        borderRadius: 12,
                        backgroundColor: iconTileBg,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Ionicons name={planIconName} size={planIconGlyph} color={planIconColor} />
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 14 }}>
                      {selected ? (
                        <View
                          style={{
                            width: 20,
                            height: 20,
                            borderRadius: 10,
                            backgroundColor: MONAI_CARD_GREEN,
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Ionicons name="checkmark" size={13} color="#fff" />
                        </View>
                      ) : (
                        <View
                          style={{
                            width: 20,
                            height: 20,
                            borderRadius: 10,
                            borderWidth: 2,
                            borderColor: mutedColor,
                          }}
                        />
                      )}
                      <Text style={{ color: textColor, fontSize: multi ? 14 : 15, fontWeight: "700" }}>
                        {annual ? t("subscribe.yearlyPlanLabel") : t("subscribe.monthlyPlanLabel")}
                      </Text>
                    </View>
                    <Text
                      style={{
                        color: textColor,
                        fontSize: priceFont,
                        fontWeight: "800",
                        marginTop: 16,
                        letterSpacing: -0.3,
                      }}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.72}
                    >
                      {pkg.product.priceString}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        {isRevenueCatConfigured() && !loading ? (
          <Pressable
            onPress={() => void handleRestore()}
            style={{ marginTop: 8, paddingVertical: 14, alignItems: "center" }}
          >
            <Text style={{ color: PURPLE, fontSize: 15, fontWeight: "600" }}>{t("subscribe.restore")}</Text>
          </Pressable>
        ) : null}

        {isRevenueCatConfigured() && !loading && Platform.OS !== "web" ? (
          <Pressable
            onPress={() => openStoreSubscriptionSettings()}
            style={{ marginTop: 4, paddingVertical: 12, alignItems: "center" }}
            hitSlop={8}
          >
            <Text style={{ color: PURPLE, fontSize: 15, fontWeight: "600" }}>
              {Platform.OS === "android" ? t("subscribe.manageInPlayStore") : t("subscribe.manageInAppStore")}
            </Text>
          </Pressable>
        ) : null}

        {!showPaywallCta ? <PaywallLegalLinks mutedColor={mutedColor} /> : null}

        {mandatory && !isPro ? (
          <Pressable
            onPress={() => logout()}
            style={{ marginTop: 28, paddingVertical: 14, alignItems: "center" }}
            hitSlop={12}
          >
            <Text style={{ color: mutedColor, fontSize: 15, fontWeight: "600" }}>{t("subscribe.signOutInstead")}</Text>
          </Pressable>
        ) : null}
        </ScrollView>

        {showPaywallCta && selectedPkg ? (
          <View
            style={{
              borderTopWidth: StyleSheet.hairlineWidth,
              borderTopColor: divider,
              paddingHorizontal: GUTTER,
              paddingTop: 14,
              paddingBottom: Math.max(insets.bottom, 16),
              backgroundColor: isDark ? "#0a0a0a" : "#f0f0f2",
              alignItems: "stretch",
              ...(Platform.OS === "android"
                ? { elevation: 12 }
                : {
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: -4 },
                    shadowOpacity: isDark ? 0.35 : 0.08,
                    shadowRadius: 8,
                  }),
            }}
          >
            <View style={{ width: "100%", maxWidth: 440, alignSelf: "center" }}>
              <TouchableOpacity
                activeOpacity={0.88}
                disabled={!!buyingId}
                onPress={() => void handlePurchase(selectedPkg)}
                style={[
                  {
                    width: "100%",
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: CTA_RED,
                    borderRadius: 28,
                    minHeight: 58,
                    paddingVertical: 17,
                    paddingHorizontal: 22,
                    borderWidth: StyleSheet.hairlineWidth,
                    borderColor: "rgba(255,255,255,0.35)",
                  },
                  ctaShadow,
                ]}
              >
                {buyingId ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="lock-closed-outline" size={22} color="#fff" style={{ marginRight: 10 }} />
                    <Text
                      style={{
                        color: "#fff",
                        fontSize: 18,
                        fontWeight: "800",
                        letterSpacing: 0.2,
                      }}
                      numberOfLines={1}
                    >
                  {t("subscribe.continueCta")}
                </Text>
              </>
            )}
          </TouchableOpacity>
              {selectedPkg && monthlyBillingPkg ? (
                <Text
                  style={{
                    color: mutedColor,
                    fontSize: 11,
                    textAlign: "center",
                    marginTop: 10,
                    lineHeight: 16,
                    paddingHorizontal: 4,
                  }}
                >
                  {t("subscribe.subscriptionSummaryTrial", {
                    price: monthlyBillingPkg.product.priceString,
                    period: t("subscribe.periodMonthly"),
                    store: billingStoreLabel,
                  })}
                </Text>
              ) : null}
              <Text
                style={{
                  color: mutedColor,
                  fontSize: 11,
                  textAlign: "center",
                  marginTop: 10,
                  lineHeight: 16,
                }}
              >
                {t("subscribe.continueCtaHint")}
              </Text>
              <PaywallLegalLinks mutedColor={mutedColor} compact />
              {Platform.OS === "android" ? (
                <Text
                  style={{
                    color: mutedColor,
                    fontSize: 11,
                    textAlign: "center",
                    marginTop: 8,
                    lineHeight: 16,
                  }}
                >
                  {t("subscribe.androidPlayBuildHint")}
                </Text>
              ) : null}
            </View>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}
