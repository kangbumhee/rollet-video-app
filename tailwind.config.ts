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
        display: ['"Black Han Sans"', "sans-serif"],
        body: ["Pretendard", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        score: ['"JetBrains Mono"', "Courier New", "monospace"],
      },
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        // 앱 전용 색상
        prize: {
          gold: "#FFD700",
          dark: "#0A0A0F",
          card: "#111118",
          border: "#1E1E2E",
        },
        neon: {
          magenta: "#FF2D78",
          "magenta-dim": "rgba(255, 45, 120, 0.15)",
          cyan: "#00E5FF",
          "cyan-dim": "rgba(0, 229, 255, 0.15)",
          amber: "#FFB800",
          "amber-dim": "rgba(255, 184, 0, 0.15)",
          violet: "#8B5CF6",
          "violet-dim": "rgba(139, 92, 246, 0.15)",
        },
        surface: {
          deep: "#0A0A12",
          base: "#11111C",
          elevated: "#1A1A2E",
          overlay: "#22223A",
        },
      },
      animation: {
        "neon-pulse": "neon-pulse 3s ease-in-out infinite",
        "neon-pulse-cyan": "neon-pulse-cyan 3s ease-in-out infinite",
        "neon-pulse-amber": "neon-pulse-amber 3s ease-in-out infinite",
        "neon-flicker": "neon-flicker 4s ease-in-out infinite",
        "stage-reveal": "stageReveal 0.4s cubic-bezier(0.4,0,0.2,1) both",
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "bounce-slow": "bounce 2s infinite",
        "spin-slow": "spin 3s linear infinite",
        "slide-up": "slideUp 0.3s ease-out",
        "slide-down": "slideDown 0.3s ease-out",
        "fade-in": "fadeIn 0.3s ease-out",
        "scale-in": "scaleIn 0.2s ease-out",
      },
      keyframes: {
        slideUp: {
          "0%": { transform: "translateY(10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        slideDown: {
          "0%": { transform: "translateY(-10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        scaleIn: {
          "0%": { transform: "scale(0.95)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
