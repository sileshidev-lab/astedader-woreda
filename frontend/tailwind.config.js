/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],

  theme: {
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
        sans: ["Public Sans", "Inter", "system-ui", "sans-serif"],
        mono: ["Cascadia Code", "Fira Code", "monospace"],
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

      borderRadius: {
        xs: "2px",
        sm: "4px",
        md: "6px",
        lg: "8px",
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

      colors: {
        bg: "var(--aw-bg)",
        background: "var(--aw-bg)",

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

        primary: "var(--aw-primary)",
        "primary-dark": "var(--aw-primary-dark)",
        "primary-strong": "var(--aw-primary-strong)",
        "primary-soft": "var(--aw-primary-soft)",
        "on-primary": "#ffffff",

        secondary: "var(--aw-magenta)",
        "on-secondary": "#ffffff",

        tertiary: "var(--aw-yellow)",
        "on-tertiary": "var(--aw-primary-strong)",

        error: "var(--aw-danger)",
        "error-container": "var(--aw-danger-bg)",

        success: "var(--aw-success)",
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
        soft: "0 10px 30px rgba(0, 76, 107, 0.08)",
        panel: "0 1px 2px rgba(0, 76, 107, 0.08)",
      },
    },
  },

  plugins: [],
};