import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Constants from "expo-constants";
import { useTranslation } from "react-i18next";
import { useAppDialog } from "../context/AppDialogContext";
import type { GoogleSignInButtonProps } from "./GoogleSignInButton.native.impl";

/**
 * Expo Go, RNGoogleSignin içermez; doğrudan @react-native-google-signin import’u login rotasını kırar.
 * Gerçek modül yalnızca development / release native derlemesinde `native.impl` ile yüklenir.
 */
type ImplComponent = React.ComponentType<GoogleSignInButtonProps>;

let cachedImpl: ImplComponent | null | undefined;
function resolveImpl(): ImplComponent | null {
  if (cachedImpl !== undefined) return cachedImpl;
  if (Constants.appOwnership === "expo") {
    cachedImpl = null;
    return null;
  }
  try {
    // Metro loads this module only when required; Expo Go never hits this path.
    cachedImpl = require("./GoogleSignInButton.native.impl").default as ImplComponent;
  } catch {
    cachedImpl = null;
  }
  return cachedImpl;
}

function GoogleSignInUnavailable(props: GoogleSignInButtonProps) {
  const { showAlert } = useAppDialog();
  const { t } = useTranslation();
  const isExpoGo = Constants.appOwnership === "expo";

  return (
    <Pressable
      onPress={() =>
        showAlert(
          t("auth.googleSignInTitle"),
          isExpoGo ? t("auth.googleSignInUnavailableExpoGoBody") : t("auth.googleSignInUnavailableBinaryBody"),
        )
      }
      style={({ pressed }) => [
        styles.socialButton,
        {
          borderColor: props.borderColor,
          backgroundColor: props.surfaceColor,
          minHeight: props.minHeight,
          marginBottom: props.marginBottom,
          opacity: pressed ? 0.72 : 1,
        },
      ]}
    >
      <View style={styles.socialButtonInner}>
        {props.renderIcon()}
        <Text style={[styles.socialLabel, { color: props.textColor }]}>{props.label}</Text>
      </View>
    </Pressable>
  );
}

export default function GoogleSignInButton(props: GoogleSignInButtonProps) {
  const Impl = resolveImpl();
  if (!Impl) {
    return <GoogleSignInUnavailable {...props} />;
  }
  return <Impl {...props} />;
}

const styles = StyleSheet.create({
  socialButton: {
    width: "100%",
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    overflow: "hidden",
  },
  socialButtonInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  socialLabel: {
    fontSize: 15,
    fontWeight: "600",
    marginLeft: 12,
  },
});
