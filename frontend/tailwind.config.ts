import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "Georgia", "serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      colors: {
        instructor: {
          sidebar: "#07091C",
          canvas: "#FFFDF6",
          purple: "#3F3F46",
          "purple-deep": "#27272A",
          orange: "#A16207",
          "orange-hover": "#854D0E",
          "card-dark": "#07091C",
        },
        admin: {
          sidebar: "#07091C",
          canvas: "#FFFDF6",
          indigo: "#3F3F46",
          "indigo-bright": "#52525B",
          violet: "#3F3F46",
          orange: "#A16207",
          "orange-hover": "#854D0E",
          "card-dark": "#07091C",
        },
        brand: {
          primary: "#07091C",
          "primary-dark": "#050614",
          accent: "#A16207",
          "accent-dark": "#854D0E",
          panel: "#07091C",
          "panel-soft": "#0A0E28",
          ink: "#07091C",
          navy: "#07091C",
          "navy-soft": "#0A0E28",
          muted: "#FFF8EB",
          paper: "#FFFDF6",
          surface: "#FFFFFF",
          "auth-canvas": "#FFF8EB",
          "auth-page": "#07091C",
        },
      },
      fontSize: {
        hero: ["2.25rem", { lineHeight: "1.1", letterSpacing: "-0.04em" }],
        "hero-lg": ["3.25rem", { lineHeight: "1.08", letterSpacing: "-0.045em" }],
      },
      maxWidth: {
        copy: "36rem",
        layout: "90rem",
      },
      boxShadow: {
        card: "0 1px 2px rgba(24, 24, 27, 0.05)",
        lift: "0 1px 2px rgba(24, 24, 27, 0.06)",
        widget: "0 1px 2px rgba(24, 24, 27, 0.05)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "hero-zoom": {
          "0%": { transform: "scale(1.04)" },
          "100%": { transform: "scale(1)" },
        },
        "rule-grow": {
          "0%": { transform: "scaleX(0)" },
          "100%": { transform: "scaleX(1)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.7s cubic-bezier(0.22, 1, 0.36, 1) both",
        "fade-up-delay": "fade-up 0.7s cubic-bezier(0.22, 1, 0.36, 1) 0.1s both",
        "fade-up-delay-2": "fade-up 0.7s cubic-bezier(0.22, 1, 0.36, 1) 0.18s both",
        "fade-in": "fade-in 0.8s ease both",
        "hero-zoom": "hero-zoom 1.4s cubic-bezier(0.22, 1, 0.36, 1) both",
        "rule-grow": "rule-grow 0.8s cubic-bezier(0.22, 1, 0.36, 1) 0.28s both",
      },
    },
  },
  plugins: [],
};

export default config;
