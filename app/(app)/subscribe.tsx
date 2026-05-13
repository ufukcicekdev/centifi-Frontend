import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Platform,
  StyleSheet,
  RefreshControl,
  BackHandler,
  Image,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useStore } from "../../store/useStore";
import { syncSubscriptionFromRevenueCat } from "../../lib/backend";
import { useAppDialog } from "../../context/AppDialogContext";
import { isRevenueCatConfigured } from "../../lib/revenuecat";

const PURPLE = "#6C63FF";
const GOLD = "#FFB800";
const GUTTER = 16;
const FOOTER_CTA_HEIGHT = 76;

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

  const bg = isDark ? "#000000" : "#f5f5f5";
  const textColor = isDark ? "#fff" : "#000";
  const mutedColor = isDark ? "#8e8e93" : "#666";
  const cardBg = isDark ? "#1c1c1e" : "#fff";
  const borderColor = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)";
  const divider = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)";
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
      await Purchases.purchasePackage(full);
      const me = await syncSubscriptionFromRevenueCat();
      useStore.setState({
        isPro: !!me.is_pro,
        proEntitlementExpiresAt: me.pro_entitlement_expires_at ?? null,
      });
      if (me.is_pro) {
        router.replace("/(app)" as any);
        showAlert(t("subscribe.thanksTitle"), t("subscribe.thanksBody"));
      } else {
        showAlert(t("common.error"), t("subscribe.purchaseFailed"));
      }
    } catch (e: unknown) {
      const err = e as { userCancelled?: boolean; message?: string };
      if (err?.userCancelled) return;
      showAlert(t("common.error"), err?.message ?? t("subscribe.purchaseFailed"));
    } finally {
      setBuyingId(null);
    }
  };

  const handleRestore = async () => {
    if (Platform.OS === "web" || !isRevenueCatConfigured()) return;
    setLoading(true);
    try {
      const rc = await import("../../lib/revenuecat");
      const uid = useStore.getState().user?.uid;
      if (uid) await rc.configureRevenueCatForUser(uid);

      const Purchases = (await import("react-native-purchases")).default;
      await Purchases.restorePurchases();
      const me = await syncSubscriptionFromRevenueCat();
      useStore.setState({
        isPro: !!me.is_pro,
        proEntitlementExpiresAt: me.pro_entitlement_expires_at ?? null,
      });
      if (me.is_pro) {
        router.replace("/(app)" as any);
        showAlert(t("subscribe.restoredTitle"), t("subscribe.restoredBody"));
      } else {
        showAlert(t("subscribe.restoreNoneTitle"), t("subscribe.restoreNoneBody"));
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
          style={{ flex: 1 }}
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
        {mandatory ? (
          <Text style={{ color: mutedColor, fontSize: 13, lineHeight: 19, marginBottom: 16 }}>
            {t("subscribe.trialManagedByStore")}
          </Text>
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
          <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 8, gap: 12 }}>
            {packages.map((pkg) => {
              const selected = pkg.identifier === selectedPackageId;
              const annual = isLikelyAnnualPackage(pkg.identifier, pkg.product.title);
              const flexStyle = packages.length > 1 ? { flex: 1, minWidth: 0 } : { width: "100%" as const };
              return (
                <Pressable
                  key={pkg.identifier}
                  onPress={() => setSelectedPackageId(pkg.identifier)}
                  disabled={!!buyingId}
                  style={({ pressed }) => [
                    flexStyle,
                    {
                      backgroundColor: cardBg,
                      borderRadius: 16,
                      padding: 16,
                      paddingTop: annual ? 36 : 16,
                      borderWidth: 2,
                      borderColor: selected ? PURPLE : borderColor,
                      opacity: pressed ? 0.92 : 1,
                      minHeight: 132,
                      justifyContent: "space-between",
                    },
                  ]}
                >
                  {annual ? (
                    <View
                      style={{
                        position: "absolute",
                        top: 10,
                        right: 10,
                        backgroundColor: isDark ? "#1a3d2e" : "#dcfce7",
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 8,
                      }}
                    >
                      <Text style={{ color: isDark ? "#86efac" : "#166534", fontSize: 11, fontWeight: "800" }}>
                        {t("subscribe.annualSaveBadge")}
                      </Text>
                    </View>
                  ) : null}
                  <Text style={{ color: mutedColor, fontSize: 13, fontWeight: "700", letterSpacing: 0.3 }}>
                    {(pkg.product.title || pkg.identifier).trim()}
                  </Text>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      width: "100%",
                      marginTop: 14,
                      gap: 12,
                    }}
                  >
                    <Text
                      style={{
                        color: textColor,
                        fontSize: 22,
                        fontWeight: "800",
                        flex: 1,
                        minWidth: 0,
                      }}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.75}
                    >
                      {pkg.product.priceString}
                    </Text>
                    <View style={{ width: 32, height: 32, alignItems: "center", justifyContent: "center" }}>
                      {selected ? (
                        <Ionicons name="checkmark-circle" size={30} color={PURPLE} />
                      ) : (
                        <View
                          style={{
                            width: 26,
                            height: 26,
                            borderRadius: 13,
                            borderWidth: 2,
                            borderColor: mutedColor,
                          }}
                        />
                      )}
                    </View>
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

        <Text style={{ color: mutedColor, fontSize: 12, lineHeight: 17, marginTop: 20 }}>
          {t("subscribe.legalHint")}
        </Text>

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
              backgroundColor: isDark ? "#0a0a0a" : "#fafafa",
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
            <Pressable
              onPress={() => void handlePurchase(selectedPkg)}
              disabled={!!buyingId}
              style={({ pressed }) => ({
                backgroundColor: PURPLE,
                borderRadius: 16,
                minHeight: 54,
                paddingVertical: 16,
                paddingHorizontal: 20,
                alignItems: "center",
                justifyContent: "center",
                opacity: pressed || buyingId ? 0.88 : 1,
                ...(Platform.OS === "android" ? { elevation: 3 } : {}),
              })}
            >
              {buyingId ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ color: "#fff", fontSize: 17, fontWeight: "800" }}>{t("subscribe.continueCta")}</Text>
              )}
            </Pressable>
            <Text style={{ color: mutedColor, fontSize: 11, textAlign: "center", marginTop: 10, lineHeight: 16 }}>
              {t("subscribe.continueCtaHint")}
            </Text>
            {Platform.OS === "android" ? (
              <Text style={{ color: mutedColor, fontSize: 11, textAlign: "center", marginTop: 8, lineHeight: 16 }}>
                {t("subscribe.androidPlayBuildHint")}
              </Text>
            ) : null}
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}
