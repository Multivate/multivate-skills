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
        sans: ["var(--font-sans)", "Plus Jakarta Sans", "system-ui", "sans-serif"],
        display: ["var(--font-sans)", "Plus Jakarta Sans", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      colors: {
        instructor: {
          sidebar: "#0C1B4A",
          canvas: "#F4F7FB",
          purple: "#1457D0",
          "purple-deep": "#0E3F9E",
          orange: "#1457D0",
          "orange-hover": "#0E3F9E",
          "card-dark": "#0C1B4A",
        },
        admin: {
          sidebar: "#0C1B4A",
          canvas: "#F4F7FB",
          indigo: "#1457D0",
          "indigo-bright": "#2B8AE0",
          violet: "#16306B",
          orange: "#1457D0",
          "orange-hover": "#0E3F9E",
          "card-dark": "#0C1B4A",
        },
        brand: {
          primary: "#1457D0",
          "primary-dark": "#0E3F9E",
          accent: "#1457D0",
          "accent-dark": "#0E3F9E",
          bright: "#2B8AE0",
          panel: "#0C1B4A",
          "panel-soft": "#16306B",
          ink: "#10244F",
          navy: "#0C1B4A",
          "navy-soft": "#16306B",
          muted: "#F4F7FB",
          paper: "#FFFFFF",
          surface: "#FFFFFF",
          sky: "#E7F1FC",
          "auth-canvas": "#F4F7FB",
          "auth-page": "#0C1B4A",
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
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "rise-in": {
          "0%": { opacity: "0", transform: "translateY(16px)" },
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
        bob: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-12px)" },
        },
        "bob-slow": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(10px)" },
        },
        pop: {
          "0%": { opacity: "0", transform: "scale(0.82) translateY(12px)" },
          "70%": { opacity: "1", transform: "scale(1.05) translateY(0)" },
          "100%": { opacity: "1", transform: "scale(1) translateY(0)" },
        },
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        shimmer: {
          "0%": { transform: "translateX(-40%)" },
          "100%": { transform: "translateX(40%)" },
        },
        floaty: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
        twinkle: {
          "0%, 100%": { opacity: "0.45", transform: "scale(0.86) rotate(0deg)" },
          "50%": { opacity: "1", transform: "scale(1) rotate(14deg)" },
        },
        "map-pan": {
          "0%, 24%": { transform: "translate3d(0, 0, 0)" },
          "54%": { transform: "translate3d(-3%, 1.5%, 0)" },
          "84%, 100%": { transform: "translate3d(-5%, -1%, 0)" },
        },
        "route-flow": {
          "0%": { strokeDashoffset: "0" },
          "100%": { strokeDashoffset: "-2.5" },
        },
        "chart-draw": {
          "0%": { strokeDashoffset: "1" },
          "100%": { strokeDashoffset: "0" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.55s cubic-bezier(0.22, 1, 0.36, 1) both",
        "fade-up-delay": "fade-up 0.55s cubic-bezier(0.22, 1, 0.36, 1) 0.08s both",
        "fade-up-delay-2": "fade-up 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.16s both",
        "rise-in": "rise-in 0.6s cubic-bezier(0.22, 1, 0.36, 1) both",
        "fade-in": "fade-in 0.8s ease both",
        "hero-zoom": "hero-zoom 1.4s cubic-bezier(0.22, 1, 0.36, 1) both",
        "rule-grow": "rule-grow 0.8s cubic-bezier(0.22, 1, 0.36, 1) 0.28s both",
        bob: "bob 3.4s ease-in-out infinite",
        "bob-slow": "bob-slow 4.2s ease-in-out infinite",
        pop: "pop 0.7s cubic-bezier(0.22, 1, 0.36, 1) both",
        marquee: "marquee 32s linear infinite",
        shimmer: "shimmer 2.8s ease-in-out infinite",
        floaty: "floaty 4.6s ease-in-out infinite",
        "floaty-slow": "floaty 6.4s ease-in-out infinite",
        twinkle: "twinkle 2.8s ease-in-out infinite",
        "map-pan": "map-pan 22s ease-in-out infinite",
        "route-flow": "route-flow 2.4s linear infinite",
        "chart-draw": "chart-draw 0.9s cubic-bezier(0.22, 1, 0.36, 1) both",
      },
    },
  },
  plugins: [],
};

export default config;
