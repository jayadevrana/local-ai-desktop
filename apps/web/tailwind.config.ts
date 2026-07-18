import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      backgroundImage: {
        hero:
          'radial-gradient(circle at top right, rgba(14, 165, 233, 0.24), transparent 38%), radial-gradient(circle at top left, rgba(34, 197, 94, 0.18), transparent 32%)',
      },
    },
  },
  plugins: [],
};

export default config;
