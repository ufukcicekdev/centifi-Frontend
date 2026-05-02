import { Platform } from "react-native";

/** Web’de native modül yüklenmesin diye platforma göre require. */
const Impl =
  Platform.OS === "web"
    ? require("./GoogleSignInButton.web").default
    : require("./GoogleSignInButton.native").default;

export default Impl;
