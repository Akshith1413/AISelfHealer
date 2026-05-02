/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#111827",
        panel: "#ffffff",
        line: "#d7dde8",
        ok: "#15803d",
        warn: "#b45309",
        danger: "#b91c1c",
        teal: "#0f766e",
        aubergine: "#6b214f"
      },
      boxShadow: {
        panel: "0 1px 2px rgba(17,24,39,0.07), 0 8px 24px rgba(17,24,39,0.06)"
      }
    }
  },
  plugins: []
};

