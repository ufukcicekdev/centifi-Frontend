const PURPLE = "#6C63FF";
const DESTRUCTIVE_DARK = "#FF6B6B";

export type AppDialogTheme = {
  overlay: string;
  cardBg: string;
  border: string;
  title: string;
  body: string;
  secondaryBtnBg: string;
  secondaryBtnBorder: string;
  secondaryBtnLabel: string;
  confirmAccentBg: string;
  confirmDestructiveBg: string;
};

export function buildAppDialogTheme(isDark: boolean): AppDialogTheme {
  if (isDark) {
    return {
      overlay: "rgba(5, 8, 18, 0.72)",
      cardBg: "#171f32",
      border: "#404758",
      title: "#f0f2f8",
      body: "#b8c0d4",
      secondaryBtnBg: "#2c2c2e",
      secondaryBtnBorder: "transparent",
      secondaryBtnLabel: "#f0f2f8",
      confirmAccentBg: PURPLE,
      confirmDestructiveBg: DESTRUCTIVE_DARK,
    };
  }
  return {
    overlay: "rgba(0, 0, 0, 0.45)",
    cardBg: "#ffffff",
    border: "rgba(0,0,0,0.08)",
    title: "#111111",
    body: "#444444",
    secondaryBtnBg: "#e2e2e6",
    secondaryBtnBorder: "transparent",
    secondaryBtnLabel: "#111111",
    confirmAccentBg: PURPLE,
    /** Material red 600 — açık temada #FF453A bazen ekranda soluk; dolgu net görünsün */
    confirmDestructiveBg: "#E53935",
  };
}
