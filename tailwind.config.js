export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        navy: "#06233d",
        navy2: "#0b2d4d",
        rescueRed: "#ef2b2d",
        rescueGreen: "#16a34a",
        rescueBlue: "#2563eb",
        rescuePurple: "#7c3aed",
        rescueOrange: "#f97316",
        softBg: "#f3f6fa",
      },
      boxShadow: {
        card: "0 10px 25px rgba(15, 23, 42, 0.08)",
      },
    },
  },
  plugins: [],
};
