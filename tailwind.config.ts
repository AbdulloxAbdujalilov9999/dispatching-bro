import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef4ff",
          100: "#dce8ff",
          200: "#b8d0ff",
          300: "#8ab0ff",
          400: "#5c8bff",
          500: "#3465f5",
          600: "#2249d6",
          700: "#1b39ac",
          800: "#182f88",
          900: "#182b6d",
          950: "#0f1a44",
        },
        surface: {
          DEFAULT: "#ffffff",
          subtle: "#f6f8fb",
          muted: "#eef1f6",
          border: "#e4e8f0",
        },
        ink: {
          DEFAULT: "#0f172a",
          soft: "#475569",
          faint: "#94a3b8",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
      },
      boxShadow: {
        card: "0 1px 2px 0 rgb(15 23 42 / 0.04), 0 1px 3px 0 rgb(15 23 42 / 0.06)",
        popover: "0 10px 30px -5px rgb(15 23 42 / 0.15)",
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.25rem",
      },
    },
  },
  plugins: [],
};

export default config;
