/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          50: "#f7f7f8",
          100: "#eceef1",
          200: "#d5d9e0",
          300: "#b0b7c3",
          400: "#828b9c",
          500: "#5b6473",
          600: "#434955",
          700: "#2e3340",
          800: "#1d2028",
          900: "#0f1116",
        },
        accent: {
          DEFAULT: "#4f7cff",
          soft: "#e8efff",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        mono: [
          "JetBrains Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "monospace",
        ],
      },
    },
  },
  plugins: [],
};
