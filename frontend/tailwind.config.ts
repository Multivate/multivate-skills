import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      colors: {
        /** Instructor dashboard (solid only — no gradients) */
        instructor: {
          sidebar: "#16163A",
          canvas: "#F8FAFC",
          purple: "#6366F1",
          "purple-deep": "#4338CA",
          orange: "#FF8A3D",
          "orange-hover": "#E97328",
          "card-dark": "#252347",
        },
        /** Admin dashboard (solid only — no gradients) */
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
          primary: "#4C3BCF",
          "primary-dark": "#3D30A6",
          /** EdTech auth / dashboard accent (solid orange) */
          accent: "#F27D0C",
          "accent-dark": "#D96A08",
          /** Deep panel (auth left rail + dashboard sidebar) — no gradients */
          panel: "#2D2C7F",
          "panel-soft": "#3A388F",
          ink: "#0B1220",
          navy: "#0A0F1A",
          "navy-soft": "#131b2e",
          muted: "#F4F5F8",
          /** Auth pages — soft light blue page background (solid) */
          "auth-canvas": "#E8F1FA",
          /** Auth sign-in/up — royal blue split panel (solid, mockup-aligned) */
          "auth-page": "#1A1A80",
        },
      },
      fontSize: {
        hero: ["2.5rem", { lineHeight: "1.12", letterSpacing: "-0.03em" }],
        "hero-lg": ["3.125rem", { lineHeight: "1.1", letterSpacing: "-0.035em" }],
      },
      maxWidth: {
        copy: "34rem",
        /** Main content width — ~1440px for typical laptop screens */
        layout: "90rem",
      },
      boxShadow: {
        card: "0 1px 2px rgba(15, 23, 42, 0.04), 0 12px 32px rgba(15, 23, 42, 0.07)",
        lift: "0 24px 48px -12px rgba(15, 23, 42, 0.14)",
        widget: "0 12px 28px rgba(15, 23, 42, 0.1), 0 2px 6px rgba(15, 23, 42, 0.04)",
      },
      keyframes: {
        floaty: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-4px)" },
        },
      },
      animation: {
        floaty: "floaty 5s ease-in-out infinite",
        "floaty-slow": "floaty 6.5s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
