import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './data/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        rig: {
          green: '#0ADC6A',
          'green-dark': '#06b557',
          navy: '#323E48',
          'navy-deep': '#222B32',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      maxWidth: {
        content: '1180px',
      },
    },
  },
  plugins: [],
}

export default config
