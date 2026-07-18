import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: ['./src/renderer/index.html', './src/renderer/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: 'rgb(var(--color-canvas) / <alpha-value>)',
        surface: 'rgb(var(--color-surface) / <alpha-value>)',
        panel: 'rgb(var(--color-panel) / <alpha-value>)',
        panelAlt: 'rgb(var(--color-panel-alt) / <alpha-value>)',
        primary: 'rgb(var(--color-primary) / <alpha-value>)',
        secondary: 'rgb(var(--color-secondary) / <alpha-value>)',
        accent: 'rgb(var(--color-accent) / <alpha-value>)',
        success: 'rgb(var(--color-success) / <alpha-value>)',
        warning: 'rgb(var(--color-warning) / <alpha-value>)',
        danger: 'rgb(var(--color-danger) / <alpha-value>)',
        ink: 'rgb(var(--color-ink) / <alpha-value>)',
        muted: 'rgb(var(--color-muted) / <alpha-value>)',
        line: 'rgb(var(--color-line) / <alpha-value>)'
      },
      boxShadow: {
        glass: '0 24px 80px rgba(0, 0, 0, 0.28)',
        focus: '0 0 0 1px rgba(122, 162, 255, 0.45), 0 0 0 6px rgba(122, 162, 255, 0.12)'
      },
      borderRadius: {
        xl2: '1.25rem',
        xl3: '1.75rem'
      },
      fontFamily: {
        sans: ['"SF Pro Display"', '"Inter"', '"Segoe UI"', 'sans-serif'],
        mono: ['"SF Mono"', '"JetBrains Mono"', '"IBM Plex Mono"', 'monospace']
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' }
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '.55' }
        }
      },
      animation: {
        shimmer: 'shimmer 1.8s linear infinite',
        pulseSoft: 'pulseSoft 1.9s ease-in-out infinite'
      }
    }
  },
  plugins: []
}

export default config
