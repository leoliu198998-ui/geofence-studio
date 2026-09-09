/** @type {import('tailwindcss').Config} */
const v = (name) => `rgb(var(${name}) / <alpha-value>)`

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        background: v('--background'),
        foreground: v('--foreground'),
        panel: v('--panel'),
        card: {
          DEFAULT: v('--panel'),
          foreground: v('--foreground'),
        },
        popover: {
          DEFAULT: v('--panel'),
          foreground: v('--foreground'),
        },
        primary: {
          DEFAULT: '#FF5A1F',
          foreground: v('--primary-foreground'),
        },
        secondary: {
          DEFAULT: v('--secondary'),
          foreground: v('--foreground'),
        },
        muted: {
          DEFAULT: v('--muted'),
          foreground: v('--muted-foreground'),
        },
        accent: {
          DEFAULT: v('--accent'),
          foreground: v('--foreground'),
        },
        destructive: {
          DEFAULT: v('--destructive'),
          foreground: v('--destructive-foreground'),
        },
        success: v('--success'),
        hairline: v('--hairline'),
        border: v('--hairline'),
        input: v('--hairline'),
        ring: '#FF5A1F',
      },
      fontFamily: {
        sans: [
          '"Space Grotesk"',
          'system-ui',
          '-apple-system',
          '"PingFang SC"',
          '"Microsoft YaHei"',
          '"Noto Sans SC"',
          'sans-serif',
        ],
        display: [
          '"Space Grotesk"',
          'system-ui',
          '"PingFang SC"',
          '"Microsoft YaHei"',
          'sans-serif',
        ],
        mono: [
          '"IBM Plex Mono"',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Consolas',
          'monospace',
        ],
      },
      borderRadius: {
        lg: '0.5rem',
        md: '0.375rem',
        sm: '0.25rem',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 160ms ease-out',
        'slide-up': 'slide-up 180ms ease-out',
      },
    },
  },
  plugins: [],
}

