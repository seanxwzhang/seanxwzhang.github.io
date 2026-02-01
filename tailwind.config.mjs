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
        'grid-pattern': `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23D4D1C9' fill-opacity='0.2'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
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
