import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        mono:    ["'IBM Plex Mono'", "ui-monospace", "monospace"],
        display: ["'Barlow Condensed'", "sans-serif"],
        body:    ["'DM Sans'", "sans-serif"],
      },
      colors: {
        void:   { DEFAULT: "#03070f", 50: "#060c18", 100: "#08101f", 200: "#0d1729", 300: "#132035", 400: "#1b2d47", 500: "#243d5e" },
        ember:  { DEFAULT: "#f0a500", dim: "#c47f00", ghost: "rgba(240,165,0,0.12)", line: "rgba(240,165,0,0.35)" },
        arctic: { DEFAULT: "#4cc9f0", dim: "#2ba8d0", ghost: "rgba(76,201,240,0.1)",  line: "rgba(76,201,240,0.3)" },
        blood:  { DEFAULT: "#e63946", ghost: "rgba(230,57,70,0.12)", line: "rgba(230,57,70,0.35)" },
        jade:   { DEFAULT: "#2ec4b6", ghost: "rgba(46,196,182,0.1)", line: "rgba(46,196,182,0.3)" },
        chalk:  { 50: "#f0f4f8", 100: "#d5dde8", 200: "#a8b8cc", 400: "#6b7e96", 600: "#3d5068", 800: "#1e2d3d" },
      },
      animation: {
        "rise":       "rise 0.5s cubic-bezier(0.22,1,0.36,1) both",
        "pulse-slow": "pulse 3s ease-in-out infinite",
      },
      keyframes: {
        rise: {
          "0%":   { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;