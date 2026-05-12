import tailwindcssAnimate from "tailwindcss-animate";

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class", "[data-theme='dark']"],
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],

  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: {
        "2xl": "1400px",
      },
    },

    screens: {
      xs: "375px",
      sm: "640px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",
      "2xl": "1536px",
      "3xl": "1920px",
      "4xl": "2560px",
    },

    extend: {
      fontFamily: {
        sans: [
          "Inter",
          "Public Sans",
          "Noto Sans Ethiopic",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
        display: [
          "Inter",
          "Public Sans",
          "Noto Sans Ethiopic",
          "SF Pro Display",
          "system-ui",
          "sans-serif",
        ],
        ethiopic: ["Noto Sans Ethiopic", "Inter", "sans-serif"],
        mono: ["JetBrains Mono", "Cascadia Code", "Fira Code", "monospace"],
      },

      fontSize: {
        "fluid-xs": ["clamp(0.65rem, 0.6rem + 0.2vw, 0.75rem)", { lineHeight: "1.4" }],
        "fluid-sm": ["clamp(0.8rem, 0.75rem + 0.25vw, 0.9rem)", { lineHeight: "1.5" }],
        "fluid-base": ["clamp(0.9rem, 0.82rem + 0.35vw, 1rem)", { lineHeight: "1.6" }],
        "fluid-lg": ["clamp(1rem, 0.9rem + 0.5vw, 1.25rem)", { lineHeight: "1.4" }],
        "fluid-xl": ["clamp(1.25rem, 1rem + 1vw, 1.75rem)", { lineHeight: "1.3" }],
        "fluid-2xl": ["clamp(1.5rem, 1.2rem + 1.5vw, 2.25rem)", { lineHeight: "1.2" }],
        "fluid-3xl": ["clamp(2rem, 1.5rem + 2.5vw, 3.5rem)", { lineHeight: "1.1" }],
        eyebrow: ["11px", { lineHeight: "1.3", letterSpacing: "0.08em", fontWeight: "800" }],
        "table-cell": ["13px", { lineHeight: "1.4" }],

        "display-lg": ["var(--text-3xl)", { lineHeight: "1.1", letterSpacing: "-0.02em", fontWeight: "700" }],
        "headline-lg": ["var(--text-2xl)", { lineHeight: "1.2", fontWeight: "600" }],
        "headline-md": ["var(--text-xl)", { lineHeight: "1.3", fontWeight: "600" }],
        "body-lg": ["var(--text-base)", { lineHeight: "1.6", fontWeight: "400" }],
        "body-md": ["var(--text-sm)", { lineHeight: "1.5", fontWeight: "400" }],
        "label-caps": ["var(--text-xs)", { lineHeight: "1.3", letterSpacing: "0.08em", fontWeight: "800" }],
        "table-data": ["13px", { lineHeight: "1.4", fontWeight: "400" }],
        "headline-lg-mobile": ["var(--text-xl)", { lineHeight: "1.3", fontWeight: "600" }],
        "fluid-eyebrow": ["var(--text-xs)", { lineHeight: "1.3", letterSpacing: "0.08em", fontWeight: "800" }],
        "fluid-title": ["var(--text-xl)", { lineHeight: "1.2" }],
        "fluid-body": ["var(--text-base)", { lineHeight: "1.6" }],
      },

      spacing: {
        "shell-x": "clamp(12px, 4vw, 64px)",
        "shell-y": "clamp(12px, 2vw, 32px)",
        sidebar: "clamp(200px, 18vw, 280px)",
        guard: "min(100%, 1600px)",
        "container-margin": "var(--space-md)",
        "section-gap": "var(--space-lg)",
        "component-padding-x": "var(--space-sm)",
        "component-padding-y": "var(--space-sm)",
      },

      maxWidth: {
        guard: "1600px",
        content: "900px",
        readable: "65ch",
        "4k-guard": "1600px",
      },

      width: {
        sidebar: "clamp(200px, 18vw, 280px)",
        popover: "min(320px, calc(100vw - 24px))",
        drawer: "min(480px, 96vw)",
        "sidebar-width": "var(--aw-sidebar-w)",
      },

      height: {
        topbar: "56px",
        screen: "100dvh",
      },

      minHeight: {
        screen: "100dvh",
      },

      // shadcn-friendly radius scale; backed by the --radius CSS var so
      // tweaking the design system feels global.  Extras (xs, xl, 2xl, 3xl)
      // remain available for legacy aw-* consumers.
      borderRadius: {
        xs: "2px",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xl: "12px",
        "2xl": "16px",
        "3xl": "24px",
      },

      zIndex: {
        dropdown: "100",
        sticky: "200",
        overlay: "300",
        modal: "400",
        toast: "500",
      },

      // Two color systems share one source of truth:
      // - shadcn theme contract (background, foreground, primary, …) is
      //   exposed via hsl(var(--*) / <alpha-value>) so opacity modifiers
      //   (e.g. bg-primary/80) work.
      // - Legacy aw-* utility colors (woreda.*, surface, etc.) keep
      //   resolving to the same --aw-* tokens.
      colors: {
        border: "hsl(var(--border) / <alpha-value>)",
        input: "hsl(var(--input) / <alpha-value>)",
        ring: "hsl(var(--ring) / <alpha-value>)",
        background: "hsl(var(--background) / <alpha-value>)",
        foreground: "hsl(var(--foreground) / <alpha-value>)",
        primary: {
          DEFAULT: "hsl(var(--primary) / <alpha-value>)",
          foreground: "hsl(var(--primary-foreground) / <alpha-value>)",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary) / <alpha-value>)",
          foreground: "hsl(var(--secondary-foreground) / <alpha-value>)",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "hsl(var(--muted) / <alpha-value>)",
          foreground: "hsl(var(--muted-foreground) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "hsl(var(--accent) / <alpha-value>)",
          foreground: "hsl(var(--accent-foreground) / <alpha-value>)",
        },
        popover: {
          DEFAULT: "hsl(var(--popover) / <alpha-value>)",
          foreground: "hsl(var(--popover-foreground) / <alpha-value>)",
        },
        card: {
          DEFAULT: "hsl(var(--card) / <alpha-value>)",
          foreground: "hsl(var(--card-foreground) / <alpha-value>)",
        },
        success: {
          DEFAULT: "hsl(var(--success) / <alpha-value>)",
          foreground: "hsl(var(--success-foreground) / <alpha-value>)",
        },
        warning: {
          DEFAULT: "hsl(var(--warning) / <alpha-value>)",
          foreground: "hsl(var(--warning-foreground) / <alpha-value>)",
        },

        // Legacy aw-* aliases.  Continue to point at --aw-* tokens so
        // existing utility classes (bg-woreda-primary, etc.) keep
        // rendering exactly as they did before.
        bg: "var(--aw-bg)",
        surface: "var(--aw-surface)",
        "surface-low": "var(--aw-surface-muted)",
        "surface-container": "var(--aw-surface-container)",
        "surface-high": "var(--aw-surface-high)",
        "surface-dim": "var(--aw-surface-container)",
        "surface-bright": "var(--aw-surface)",

        "on-surface": "var(--aw-text)",
        "on-surface-variant": "var(--aw-muted)",

        outline: "var(--aw-border-soft)",
        "outline-variant": "var(--aw-border)",

        "primary-dark": "var(--aw-primary-dark)",
        "primary-strong": "var(--aw-primary-strong)",
        "primary-soft": "var(--aw-primary-soft)",
        "on-primary": "#ffffff",

        "on-secondary": "#ffffff",
        tertiary: "var(--aw-yellow)",
        "on-tertiary": "var(--aw-primary-strong)",
        error: "var(--aw-danger)",
        "error-container": "var(--aw-danger-bg)",
        "success-container": "var(--aw-success-bg)",

        white: "#ffffff",
        black: "var(--aw-text)",
        transparent: "transparent",
        current: "currentColor",

        woreda: {
          background: "var(--aw-bg)",
          surface: "var(--aw-surface)",
          surfaceLow: "var(--aw-surface-muted)",
          surfaceContainer: "var(--aw-surface-container)",
          surfaceHigh: "var(--aw-surface-high)",

          text: "var(--aw-text)",
          textMuted: "var(--aw-muted)",
          textVariant: "var(--aw-muted)",

          border: "var(--aw-border)",
          borderCard: "var(--aw-border-soft)",
          borderLight: "var(--aw-border-soft)",

          primary: "var(--aw-primary)",
          primaryStrong: "var(--aw-primary-strong)",
          primaryDarkest: "var(--aw-primary-dark)",
          primarySoft: "var(--aw-primary-soft)",

          sidebar: "var(--aw-primary-strong)",
          sidebarDark: "var(--aw-primary-dark)",

          yellow: "var(--aw-yellow)",
          yellowText: "var(--aw-yellow-text)",
          yellowBg: "var(--aw-yellow-bg)",

          magenta: "var(--aw-magenta)",
          magentaBg: "var(--aw-magenta-bg)",

          danger: "var(--aw-danger)",
          dangerBg: "var(--aw-danger-bg)",

          success: "var(--aw-success)",
          successBg: "var(--aw-success-bg)",

          white: "#ffffff",
          overlayScrim: "rgba(0, 0, 0, 0.45)",
          overlayScrimStrong: "rgba(0, 0, 0, 0.65)",
        },
      },

      boxShadow: {
        xs: "var(--aw-shadow-xs)",
        sm: "var(--aw-shadow-sm)",
        md: "var(--aw-shadow-md)",
        lg: "var(--aw-shadow-lg)",
        xl: "var(--aw-shadow-xl)",
        soft: "var(--aw-shadow-md)",
        panel: "var(--aw-shadow-sm)",
        focus: "var(--aw-shadow-focus)",
        ring: "var(--aw-shadow-ring)",
      },

      transitionTimingFunction: {
        standard: "cubic-bezier(0.2, 0, 0, 1)",
        emphasized: "cubic-bezier(0.3, 0, 0, 1.15)",
      },

      transitionDuration: {
        fast: "120ms",
        base: "180ms",
        slow: "260ms",
      },

      // Enterprise typography weights: cap at 600 so utility classes
      // like font-bold / font-extrabold / font-black never produce
      // shouty typography across the existing codebase.  font-semibold
      // (600) remains untouched.
      fontWeight: {
        bold: "600",
        extrabold: "600",
        black: "600",
      },

      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "collapsible-down": {
          from: { height: "0" },
          to: { height: "var(--radix-collapsible-content-height)" },
        },
        "collapsible-up": {
          from: { height: "var(--radix-collapsible-content-height)" },
          to: { height: "0" },
        },
      },

      animation: {
        "accordion-down": "accordion-down 200ms cubic-bezier(0.2, 0, 0, 1)",
        "accordion-up": "accordion-up 200ms cubic-bezier(0.2, 0, 0, 1)",
        "collapsible-down": "collapsible-down 200ms cubic-bezier(0.2, 0, 0, 1)",
        "collapsible-up": "collapsible-up 200ms cubic-bezier(0.2, 0, 0, 1)",
      },
    },
  },

  plugins: [tailwindcssAnimate],
};
