/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#065f46",
          light: "#d1fae5",
          dark: "#064e3b",
        },
        accent: {
          DEFAULT: "#f59e0b",
          hover: "#d97706",
        },
        neutral: {
          heading: "#0f172a",
          body: "#334155",
          muted: "#64748b",
          border: "#e2e8f0",
          bg: "#f8fafc",
        },
      },
      fontFamily: {
        sans: [
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      fontSize: {
        "page-title": ["1.5rem", { lineHeight: "2rem", fontWeight: "700" }],
        "section-title": ["1.25rem", { lineHeight: "1.75rem", fontWeight: "700" }],
        body: ["1rem", { lineHeight: "1.5rem" }],
        caption: ["0.875rem", { lineHeight: "1.25rem" }],
      },
      borderRadius: {
        card: "0.375rem",
        button: "0.375rem",
      },
      minHeight: {
        touch: "3rem",
      },
    },
  },
  plugins: [],
};
