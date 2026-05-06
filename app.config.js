/**
 * app.json ile birleşir; @react-native-google-signin için iosUrlScheme şart (Firebase’siz).
 * EXPO_PUBLIC_GOOGLE_*_CLIENT_ID .env’de yüklüyken prebuild çalıştırın.
 */
// EAS / Expo config eval sırasında `.env` otomatik yüklenmeyebilir.
// Bu yüzden burada minimal bir `.env` loader ile EXPO_PUBLIC_* değerlerini process.env'e alıyoruz.
const fs = require("fs");
const path = require("path");

function loadDotEnvOnce() {
  try {
    const p = path.join(__dirname, ".env");
    if (!fs.existsSync(p)) return;
    const raw = fs.readFileSync(p, "utf8");
    raw
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("#"))
      .forEach((line) => {
        const ix = line.indexOf("=");
        if (ix <= 0) return;
        const key = line.slice(0, ix).trim();
        let val = line.slice(ix + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (process.env[key] == null) process.env[key] = val;
      });
  } catch {
    // ignore
  }
}

loadDotEnvOnce();

const appJson = require("./app.json");

function deriveGoogleIosUrlScheme() {
  const id =
    process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim() ||
    process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID?.trim() ||
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim();
  if (!id) return null;
  const prefix = id.replace(/\.apps\.googleusercontent\.com\s*$/i, "").trim();
  return `com.googleusercontent.apps.${prefix}`;
}

module.exports = ({ config }) => {
  const expo = config?.expo ?? appJson.expo;
  const scheme = deriveGoogleIosUrlScheme();
  const plugins = (expo.plugins ?? []).flatMap((entry) => {
    if (entry === "@react-native-google-signin/google-signin") {
      if (!scheme) {
        console.warn(
          "[app.config] EXPO_PUBLIC_GOOGLE_*_CLIENT_ID tanımlı değil; prebuild için en az bir Google client id gerekir (iosUrlScheme).",
        );
        return [
          [
            "@react-native-google-signin/google-signin",
            { iosUrlScheme: "com.googleusercontent.apps.INVALID_SET_EXPO_PUBLIC_GOOGLE_CLIENT_ID" },
          ],
        ];
      }
      return [["@react-native-google-signin/google-signin", { iosUrlScheme: scheme }]];
    }
    return [entry];
  });

  return {
    ...config,
    expo: {
      ...expo,
      plugins,
    },
  };
};
