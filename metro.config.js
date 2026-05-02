const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Dev-only script imports @formatjs (Node-only); must never enter the RN bundle.
const scriptsDir = path.resolve(__dirname, "scripts") + path.sep;
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
config.resolver.blockList = [
  ...(config.resolver.blockList ?? []),
  new RegExp("^" + escapeRe(scriptsDir) + ".*"),
];

module.exports = withNativeWind(config, { input: "./global.css" });
