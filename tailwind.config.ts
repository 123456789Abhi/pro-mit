import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["Sora", "system-ui", "sans-serif"],
        body: ["DM Sans", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      colors: {
        // 4-level surface hierarchy (dark theme)
        surface: {
          0: "hsl(222, 47%, 6%)",   // Deepest background
          1: "hsl(222, 47%, 9%)",   // Card/panel background
          2: "hsl(222, 47%, 13%)",  // Elevated elements
          3: "hsl(222, 47%, 17%)",  // Active/hover states
        },
        border: {
          DEFAULT: "hsl(222, 30%, 18%)",
          hover: "hsl(222, 30%, 25%)",
        },
        text: {
          primary: "hsl(210, 40%, 96%)",
          secondary: "hsl(215, 20%, 65%)",
          muted: "hsl(215, 15%, 45%)",
        },
        // Semantic colors
        success: {
          DEFAULT: "hsl(160, 84%, 39%)",
          bg: "hsla(160, 84%, 39%, 0.12)",
        },
        warning: {
          DEFAULT: "hsl(38, 92%, 50%)",
          bg: "hsla(38, 92%, 50%, 0.12)",
        },
        danger: {
          DEFAULT: "hsl(0, 84%, 60%)",
          bg: "hsla(0, 84%, 60%, 0.12)",
        },
        info: {
          DEFAULT: "hsl(217, 91%, 60%)",
          bg: "hsla(217, 91%, 60%, 0.12)",
        },
        // Brand — customizable per school via CSS variables
        brand: {
          DEFAULT: "hsl(var(--brand-hue, 217), 91%, 60%)",
          bg: "hsla(var(--brand-hue, 217), 91%, 60%, 0.12)",
        },
      },
      // Touch targets ≥44px for mobile
      minHeight: {
        touch: "44px",
      },
      minWidth: {
        touch: "44px",
      },
      // Animations
      keyframes: {
        "slide-in-right": {
          from: { transform: "translateX(100%)" },
          to: { transform: "translateX(0)" },
        },
        "slide-in-bottom": {
          from: { transform: "translateY(100%)" },
          to: { transform: "translateY(0)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "skeleton-pulse": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.4" },
        },
      },
      animation: {
        "slide-in-right": "slide-in-right 0.3s ease-out",
        "slide-in-bottom": "slide-in-bottom 0.3s ease-out",
        "fade-in": "fade-in 0.2s ease-out",
        "skeleton": "skeleton-pulse 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
