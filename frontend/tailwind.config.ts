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
        display: ["var(--font-display)", "var(--font-sans)", "system-ui", "sans-serif"],
      },
      colors: {
        /** Instructor dashboard (solid only - no gradients) */
        instructor: {
          sidebar: "#16163A",
          canvas: "#F8FAFC",
          purple: "#6366F1",
          "purple-deep": "#4338CA",
          orange: "#FF8A3D",
          "orange-hover": "#E97328",
          "card-dark": "#252347",
        },
        /** Admin dashboard (solid only - no gradients) */
        admin: {
          sidebar: "#1E1B4B",
          canvas: "#F8FAFC",
          indigo: "#4338CA",
          "indigo-bright": "#6366F1",
          violet: "#7C3AED",
          orange: "#FF8A3D",
          "orange-hover": "#E97328",
          "card-dark": "#25204a",
        },
        brand: {
          /** Marketing: deep ink + warm amber accent */
          primary: "#1F2A44",
          "primary-dark": "#151C2E",
          accent: "#E8790A",
          "accent-dark": "#C96408",
          panel: "#1A2236",
          "panel-soft": "#243049",
          ink: "#0E1420",
          navy: "#0A0F1A",
          "navy-soft": "#131B2A",
          muted: "#F3F1EC",
          paper: "#FAF8F5",
          "auth-canvas": "#E8F1FA",
          "auth-page": "#1A2236",
        },
      },
      fontSize: {
        hero: ["2.75rem", { lineHeight: "1.05", letterSpacing: "-0.03em" }],
        "hero-lg": ["4.25rem", { lineHeight: "0.98", letterSpacing: "-0.04em" }],
      },
      maxWidth: {
        copy: "36rem",
        layout: "90rem",
      },
      boxShadow: {
        card: "0 1px 2px rgba(14, 20, 32, 0.04), 0 12px 28px rgba(14, 20, 32, 0.06)",
        lift: "0 28px 56px -18px rgba(14, 20, 32, 0.28)",
        widget: "0 12px 28px rgba(14, 20, 32, 0.1), 0 2px 6px rgba(14, 20, 32, 0.04)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(18px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "hero-zoom": {
          "0%": { transform: "scale(1.08)" },
          "100%": { transform: "scale(1)" },
        },
        "rule-grow": {
          "0%": { transform: "scaleX(0)" },
          "100%": { transform: "scaleX(1)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.8s cubic-bezier(0.22, 1, 0.36, 1) both",
        "fade-up-delay": "fade-up 0.8s cubic-bezier(0.22, 1, 0.36, 1) 0.12s both",
        "fade-up-delay-2": "fade-up 0.8s cubic-bezier(0.22, 1, 0.36, 1) 0.24s both",
        "fade-in": "fade-in 1s ease both",
        "hero-zoom": "hero-zoom 1.6s cubic-bezier(0.22, 1, 0.36, 1) both",
        "rule-grow": "rule-grow 0.9s cubic-bezier(0.22, 1, 0.36, 1) 0.35s both",
      },
    },
  },
  plugins: [],
};

export default config;
