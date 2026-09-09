/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        background: '#0B0F14',
        foreground: '#E6EDF3',
        panel: '#131922',
        card: {
          DEFAULT: '#131922',
          foreground: '#E6EDF3',
        },
        popover: {
          DEFAULT: '#131922',
          foreground: '#E6EDF3',
        },
        primary: {
          DEFAULT: '#FF5A1F',
          foreground: '#0B0F14',
        },
        secondary: {
          DEFAULT: '#1B2430',
          foreground: '#E6EDF3',
        },
        muted: {
          DEFAULT: '#1B2430',
          foreground: '#8B98A5',
        },
        accent: {
          DEFAULT: '#1E2833',
          foreground: '#E6EDF3',
        },
        destructive: {
          DEFAULT: '#E5484D',
          foreground: '#E6EDF3',
        },
        success: '#3ECF8E',
        hairline: '#26303B',
        border: '#26303B',
        input: '#26303B',
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
