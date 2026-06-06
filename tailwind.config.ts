import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Calm, premium dark palette.
        ink: {
          950: "#08090c",
          900: "#0b0d11",
          850: "#111419",
          800: "#161a21",
          700: "#1d222b",
          600: "#272d38",
        },
        mist: {
          50: "#f6f7f9",
          200: "#cdd2db",
          400: "#8b93a3",
          500: "#6b7280",
        },
        sage: {
          400: "#7fb59b",
          500: "#5d9c80",
          600: "#4a8268",
        },
        ember: {
          400: "#d99a6c",
          500: "#c97f4a",
        },
        sky: {
          400: "#7aa7d9",
          500: "#5d8bc4",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.5rem",
        "3xl": "2rem",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.5s ease-out",
        "pulse-soft": "pulse-soft 2.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
