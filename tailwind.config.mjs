/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Warm cream theme inspired by Claude Cowork
        cream: {
          50: '#FDFCFA',
          100: '#FAF8F5',
          200: '#F7F6F3',
          300: '#EBE8E2',
          400: '#D4D1C9',
        },
        coral: {
          DEFAULT: '#E07A5F',
          light: '#E8998D',
          dark: '#C55D45',
        },
        ink: {
          DEFAULT: '#2D3748',
          light: '#4A5568',
          muted: '#718096',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'sans-serif',
        ],
        serif: [
          'Source Serif 4',
          'Source Serif Pro',
          'Georgia',
          'ui-serif',
          'serif',
        ],
        mono: [
          'JetBrains Mono',
          'Fira Code',
          'ui-monospace',
          'SFMono-Regular',
          'monospace',
        ],
      },
      typography: {
        DEFAULT: {
          css: {
            '--tw-prose-body': '#2D3748',
            '--tw-prose-headings': '#1A202C',
            '--tw-prose-links': '#E07A5F',
            '--tw-prose-code': '#2D3748',
            'code::before': { content: '""' },
            'code::after': { content: '""' },
            code: {
              backgroundColor: '#F7F6F3',
              padding: '0.25rem 0.375rem',
              borderRadius: '0.25rem',
              fontWeight: '400',
            },
          },
        },
      },
      backgroundImage: {
        'grid-pattern': 'none',
      },
      maxWidth: {
        'prose': '65ch',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
