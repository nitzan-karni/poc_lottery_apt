import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#00838F",
          dark: "#006064",
          light: "#4DB6AC",
        },
        accent: {
          DEFAULT: "#EF6C00",
          light: "#FF9800",
        },
        surface: {
          DEFAULT: "#FFFFFF",
          alt: "#E0F2F1",
          bg: "#F5F7FA",
        },
        brand: {
          text: "#212121",
          muted: "#546E7A",
          border: "#CFD8DC",
          success: "#2E7D32",
          error: "#C62828",
          warning: "#F57F17",
        },
      },
      fontFamily: {
        sans: ["-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 4px rgba(0,0,0,0.06)",
        panel: "0 2px 12px rgba(0,0,0,0.08)",
      },
      borderRadius: {
        xl: "12px",
        "2xl": "16px",
      },
    },
  },
  plugins: [],
};

export default config;
