import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Platform,
  StyleSheet,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useStore } from "../../store/useStore";
import { syncSubscriptionFromRevenueCat } from "../../lib/backend";
import { useAppDialog } from "../../context/AppDialogContext";
import { isRevenueCatConfigured } from "../../lib/revenuecat";

const PURPLE = "#6C63FF";
const GUTTER = 16;

export default function SubscribeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
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

  const loadOfferings = useCallback(async () => {
    if (Platform.OS === "web" || !isRevenueCatConfigured()) {
      setPackages([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const Purchases = (await import("react-native-purchases")).default;
      const offerings = await Purchases.getOfferings();
      const current = offerings.current;
      const pkgs = current?.availablePackages ?? [];
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
    } finally {
      setLoading(false);
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

  const handlePurchase = async (pkg: { identifier: string }) => {
    if (Platform.OS === "web" || !isRevenueCatConfigured()) return;
    setBuyingId(pkg.identifier);
    try {
      const Purchases = (await import("react-native-purchases")).default;
      const offerings = await Purchases.getOfferings();
      const full = offerings.current?.availablePackages?.find((p) => p.identifier === pkg.identifier);
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
      showAlert(t("subscribe.thanksTitle"), t("subscribe.thanksBody"));
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
      const Purchases = (await import("react-native-purchases")).default;
      await Purchases.restorePurchases();
      const me = await syncSubscriptionFromRevenueCat();
      useStore.setState({
        isPro: !!me.is_pro,
        proEntitlementExpiresAt: me.pro_entitlement_expires_at ?? null,
      });
      if (me.is_pro) {
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
        <Pressable
          onPress={() => router.back()}
          hitSlop={14}
          style={{ position: "absolute", left: 8, padding: 8, zIndex: 1 }}
        >
          <Ionicons name="chevron-back" size={24} color={mutedColor} />
        </Pressable>
        <Text style={{ color: textColor, fontSize: 17, fontWeight: "700" }}>{t("subscribe.title")}</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: GUTTER, paddingBottom: 32 + insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={{ color: mutedColor, fontSize: 14, lineHeight: 21, marginBottom: 16 }}>
          {t("subscribe.intro")}
        </Text>

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
          <Text style={{ color: mutedColor, fontSize: 14 }}>{t("subscribe.noPackages")}</Text>
        ) : (
          packages.map((pkg) => (
            <Pressable
              key={pkg.identifier}
              onPress={() => void handlePurchase(pkg)}
              disabled={!!buyingId}
              style={({ pressed }) => ({
                backgroundColor: cardBg,
                borderRadius: 14,
                padding: 16,
                marginBottom: 12,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor,
                opacity: pressed || buyingId ? 0.85 : 1,
              })}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <View style={{ flex: 1, marginRight: 12 }}>
                  <Text style={{ color: textColor, fontSize: 17, fontWeight: "700" }} numberOfLines={2}>
                    {pkg.product.title || pkg.identifier}
                  </Text>
                  {!!pkg.product.description && (
                    <Text style={{ color: mutedColor, fontSize: 13, marginTop: 4 }} numberOfLines={3}>
                      {pkg.product.description}
                    </Text>
                  )}
                </View>
                {buyingId === pkg.identifier ? (
                  <ActivityIndicator color={PURPLE} />
                ) : (
                  <Text style={{ color: PURPLE, fontSize: 17, fontWeight: "800" }}>{pkg.product.priceString}</Text>
                )}
              </View>
            </Pressable>
          ))
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
      </ScrollView>
    </SafeAreaView>
  );
}
