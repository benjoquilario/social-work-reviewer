/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./contexts/**/*.{js,jsx,ts,tsx}",
    "./hooks/**/*.{js,jsx,ts,tsx}",
    "./lib/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground, 0 0% 98%))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
          // Amber darkened for use as text on light surfaces. `accent` itself
          // is a fill color and fails contrast as text in light mode.
          text: "hsl(var(--accent-text))",
        },
        // Literal logo colors — for brand surfaces and illustration only.
        // Prefer the semantic tokens above for anything functional.
        // Mirrors BRAND in lib/theme.ts; change values there first.
        brand: {
          teal: "#019a9d",
          cyan: "#21d5fe",
          navy: "#00246e",
          blue: "#0269ed",
          sky: "#07abf4",
          amber: "#fea902",
          gold: "#fec503",
          ink: "#01060d",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        chart: {
          1: "hsl(var(--chart-1))",
          2: "hsl(var(--chart-2))",
          3: "hsl(var(--chart-3))",
          4: "hsl(var(--chart-4))",
          5: "hsl(var(--chart-5))",
        },
      },
      /**
       * Radius ramp — one monotonic scale, no arbitrary `rounded-[Npx]`.
       *
       * The default Tailwind ramp was overridden per-step here, which left it
       * non-monotonic (`rounded-xl` resolved to 12px, *smaller* than
       * `rounded-lg` at 14px) and pushed every screen into arbitrary values.
       * These are literal pixels rather than calc(var(--radius)) so every step
       * resolves identically on native and web, and so the ramp cannot drift
       * out of order again. `--radius` in global.css mirrors the `md` step for
       * anything that reads the CSS variables directly.
       *
       *   xs  8   inline chips, chart bars, progress tracks
       *   sm  12  rows nested inside a card, small controls
       *   md  16  buttons, inputs, answer options, avatars
       *   lg  20  icon buttons, tiles, thumbnails
       *   xl  24  the standard Card
       *   2xl 28  feature panels, section surfaces, hero blocks
       *   3xl 34  dialogs and sheets
       */
      borderRadius: {
        none: "0px",
        xs: "8px",
        sm: "12px",
        md: "16px",
        lg: "20px",
        xl: "24px",
        "2xl": "28px",
        "3xl": "34px",
        full: "9999px",
      },
      /**
       * Type ramp — 9 steps, each with a line height, replacing the ~18
       * distinct `text-[Npx]` values that had accumulated across screens.
       *
       *   2xs  eyebrows, uppercase micro labels, badge text
       *   xs   captions and metadata
       *   sm   secondary body, list subtitles
       *   base body copy (the Text default)
       *   lg   card and section titles
       *   xl   screen titles
       *   2xl  hero titles
       *   3xl  headline metrics
       *   4xl  score / celebration numerals
       */
      fontSize: {
        "2xs": ["11px", { lineHeight: "15px" }],
        xs: ["12px", { lineHeight: "16px" }],
        sm: ["14px", { lineHeight: "20px" }],
        base: ["16px", { lineHeight: "24px" }],
        lg: ["18px", { lineHeight: "26px" }],
        xl: ["20px", { lineHeight: "28px" }],
        "2xl": ["24px", { lineHeight: "32px" }],
        "3xl": ["30px", { lineHeight: "36px" }],
        "4xl": ["36px", { lineHeight: "42px" }],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
