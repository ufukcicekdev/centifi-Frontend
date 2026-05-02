/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: "#6C63FF",
          secondary: "#FF6584",
          accent: "#43E97B",
        },
        dark: {
          bg: "#0f0f0f",
          card: "#1a1a1a",
          border: "#2a2a2a",
          muted: "#888888",
        },
        light: {
          bg: "#f8f8f8",
          card: "#ffffff",
          border: "#e5e5e5",
          muted: "#888888",
        },
      },
      fontFamily: {
        sans: ["System"],
      },
    },
  },
  darkMode: "class",
  plugins: [],
};
