/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
  theme: {
    extend: {
      colors: {
        concrete: {
          950: "#1a1a1a",
          900: "#2d2d2d",
          800: "#3d3d3d",
          700: "#4a4a4a",
          600: "#5a5a5a",
        },
        safety: {
          500: "#f59e0b",
          400: "#fbbf24",
          300: "#fcd34d",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      minHeight: {
        btn: "2.75rem",
      },
    },
  },
  plugins: [],
};
