import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: "1rem",
        sm: "1.5rem",
        lg: "2rem",
      },
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        // ====================================================================
        // The Quiet Instrument — semantic tokens (DESIGN.md canonical)
        // CSS 변수 기반: light는 :root, dark는 .dark 셀렉터에서 정의 (globals.css)
        // ====================================================================
        "gauge-cobalt": {
          DEFAULT: "rgb(var(--color-gauge-cobalt) / <alpha-value>)",
          strong: "rgb(var(--color-gauge-cobalt-strong) / <alpha-value>)",
          soft: "rgb(var(--color-gauge-cobalt-soft) / <alpha-value>)",
        },
        paper: {
          DEFAULT: "rgb(var(--color-paper) / <alpha-value>)",
          warm: "rgb(var(--color-paper-warm) / <alpha-value>)",
        },
        divider: "rgb(var(--color-divider) / <alpha-value>)",
        ink: {
          DEFAULT: "rgb(var(--color-ink) / <alpha-value>)",
          soft: "rgb(var(--color-ink-soft) / <alpha-value>)",
          mute: "rgb(var(--color-ink-mute) / <alpha-value>)",
        },

        // ====================================================================
        // Sidebar-only tokens — light/dark 모드 무관하게 항상 동일한 어두운 톤 (옵션 A)
        // (사이드바 색은 모드 무관 고정 — 시각 검증의 핵심 항목)
        // CSS 변수 기반: :root 와 .dark 양쪽에서 동일 값으로 정의됨
        // ====================================================================
        sidebar: {
          DEFAULT: "rgb(var(--color-sidebar-bg) / <alpha-value>)",
          fg: "rgb(var(--color-sidebar-fg) / <alpha-value>)",
          "fg-soft": "rgb(var(--color-sidebar-fg-soft) / <alpha-value>)",
          border: "rgb(var(--color-sidebar-border) / <alpha-value>)",
          hover: "rgb(var(--color-sidebar-hover) / <alpha-value>)",
          active: "rgb(var(--color-sidebar-active) / <alpha-value>)",
        },
        "signal-go": {
          DEFAULT: "rgb(var(--color-signal-go) / <alpha-value>)",
          soft: "rgb(var(--color-signal-go-soft) / <alpha-value>)",
          strong: "rgb(var(--color-signal-go-strong) / <alpha-value>)",
        },
        "signal-watch": {
          DEFAULT: "rgb(var(--color-signal-watch) / <alpha-value>)",
          soft: "rgb(var(--color-signal-watch-soft) / <alpha-value>)",
          strong: "rgb(var(--color-signal-watch-strong) / <alpha-value>)",
        },
        "signal-stop": {
          DEFAULT: "rgb(var(--color-signal-stop) / <alpha-value>)",
          soft: "rgb(var(--color-signal-stop-soft) / <alpha-value>)",
          strong: "rgb(var(--color-signal-stop-strong) / <alpha-value>)",
        },

        // ====================================================================
        // Backward compat aliases (existing components reference these)
        // primary/secondary 계열은 hex 그대로 (브랜드 아이덴티티 유지)
        // ====================================================================
        primary: {
          DEFAULT: "#1e3a8a",
          foreground: "#fdfdfe",
          50: "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
          800: "#1e40af",
          900: "#1e3a8a",
          950: "#172554",
        },
        secondary: {
          DEFAULT: "#64748b",
          foreground: "#fdfdfe",
          50: "#f8fafc",
          100: "#f1f5f9",
          200: "#e2e8f0",
          300: "#cbd5e1",
          400: "#94a3b8",
          500: "#64748b",
          600: "#475569",
          700: "#334155",
          800: "#1e293b",
          900: "#0f172a",
        },
        success: "#10b981",
        warning: "#f59e0b",
        danger: "#ef4444",
        destructive: {
          DEFAULT: "#ef4444",
          foreground: "#fdfdfe",
        },
        // 표면/텍스트 계열은 CSS 변수 참조로 전환 — 다크모드에서 자동 반전
        border: "rgb(var(--color-divider) / <alpha-value>)",
        input: "rgb(var(--color-divider) / <alpha-value>)",
        ring: "rgb(var(--color-gauge-cobalt) / <alpha-value>)",
        background: "rgb(var(--color-paper) / <alpha-value>)",
        foreground: "rgb(var(--color-ink) / <alpha-value>)",
        muted: {
          DEFAULT: "rgb(var(--color-paper-warm) / <alpha-value>)",
          foreground: "rgb(var(--color-ink-soft) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "rgb(var(--color-gauge-cobalt-soft) / <alpha-value>)",
          foreground: "rgb(var(--color-gauge-cobalt-strong) / <alpha-value>)",
        },
        popover: {
          DEFAULT: "rgb(var(--color-paper) / <alpha-value>)",
          foreground: "rgb(var(--color-ink) / <alpha-value>)",
        },
        card: {
          DEFAULT: "rgb(var(--color-paper-warm) / <alpha-value>)",
          foreground: "rgb(var(--color-ink) / <alpha-value>)",
        },
      },
      borderRadius: {
        xs: "2px",
        sm: "4px",
        md: "6px",
        lg: "8px",
      },
      fontFamily: {
        sans: [
          "Pretendard Variable",
          "Pretendard",
          "-apple-system",
          "BlinkMacSystemFont",
          "system-ui",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Apple SD Gothic Neo",
          "Noto Sans CJK KR",
          "sans-serif",
        ],
        mono: [
          "JetBrains Mono",
          "Menlo",
          "Consolas",
          "Liberation Mono",
          "Courier New",
          "monospace",
        ],
        korean: [
          "Pretendard Variable",
          "Pretendard",
          "Apple SD Gothic Neo",
          "Noto Sans CJK KR",
          "Noto Sans KR",
          "system-ui",
          "sans-serif",
        ],
      },
      fontSize: {
        caption: ["0.75rem", { lineHeight: "1.5", letterSpacing: "0.01em" }],
        label: ["0.875rem", { lineHeight: "1.5", fontWeight: "500" }],
        body: ["1rem", { lineHeight: "1.6" }],
        title: ["1.125rem", { lineHeight: "1.4", fontWeight: "600" }],
        headline: ["1.5rem", { lineHeight: "1.3", letterSpacing: "-0.005em", fontWeight: "600" }],
        display: ["1.875rem", { lineHeight: "1.2", letterSpacing: "-0.01em", fontWeight: "600" }],
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
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s cubic-bezier(0.25, 1, 0.5, 1)",
        "accordion-up": "accordion-up 0.2s cubic-bezier(0.25, 1, 0.5, 1)",
        "fade-in": "fade-in 0.25s cubic-bezier(0.25, 1, 0.5, 1)",
        "slide-in": "slide-in 0.2s cubic-bezier(0.25, 1, 0.5, 1)",
      },
      transitionTimingFunction: {
        "out-quart": "cubic-bezier(0.25, 1, 0.5, 1)",
      },
      transitionDuration: {
        fast: "150ms",
        base: "200ms",
        slow: "250ms",
      },
      boxShadow: {
        popover: "0 4px 12px rgba(26, 34, 54, 0.10), 0 0 0 1px #e6e8ee",
        modal: "0 16px 48px rgba(26, 34, 54, 0.18)",
        "hover-lift": "0 1px 3px rgba(26, 34, 54, 0.08)",
      },
      spacing: {
        "safe-top": "env(safe-area-inset-top)",
        "safe-bottom": "env(safe-area-inset-bottom)",
        "safe-left": "env(safe-area-inset-left)",
        "safe-right": "env(safe-area-inset-right)",
      },
      minHeight: {
        touch: "48px",
        action: "56px",
      },
      minWidth: {
        touch: "48px",
        action: "56px",
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    require("@tailwindcss/forms"),
    require("@tailwindcss/typography"),
  ],
} satisfies Config;

export default config;
