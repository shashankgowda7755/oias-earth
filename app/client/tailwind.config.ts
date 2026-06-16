import type { Config } from 'tailwindcss';

/**
 * Design tokens copied verbatim from the spec (communitree_admin_spec.json ->
 * designTokens). The original UI was Material-UI; here we reproduce its look
 * with Tailwind utilities. Keep these names stable — module agents reference
 * them (e.g. bg-primary, text-textPrimary, bg-navbar).
 */
const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#17970E',
          hover: '#137a0b', // slightly darker for button :hover
        },
        navbar: {
          DEFAULT: '#4d4d4d',
          text: '#ffffff',
          inactive: 'rgba(255,255,255,0.7)',
        },
        appbg: '#f5f5f5',
        surface: '#ffffff',
        tableHeader: '#eef1f3',
        textPrimary: 'rgba(0,0,0,0.87)',
        textSecondary: 'rgba(0,0,0,0.54)',
        border: 'rgba(0,0,0,0.12)',
        danger: {
          DEFAULT: '#d32f2f',
          hover: '#b71c1c',
        },
        darkInk: 'rgb(2,17,26)',
      },
      fontFamily: {
        sans: ["'Noto Sans'", 'NotoSans-Regular', 'Arial', 'sans-serif'],
      },
      fontSize: {
        // MUI-ish scale used across the admin
        label: ['12px', '1'],
        tableHeader: ['14px', { lineHeight: '1.2', fontWeight: '600' }],
      },
      borderRadius: {
        button: '4px',
        input: '4px',
        card: '8px',
        pill: '9999px',
      },
      boxShadow: {
        // MUI elevation 1 / 24 / appbar equivalents
        card: '0 1px 3px rgba(0,0,0,0.12)',
        dialog: '0 11px 15px -7px rgba(0,0,0,0.2), 0 24px 38px 3px rgba(0,0,0,0.14), 0 9px 46px 8px rgba(0,0,0,0.12)',
        appbar: '0 1px 4px rgba(0,0,0,0.1)',
      },
      keyframes: {
        'toast-in': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'toast-in': 'toast-in 150ms ease-out',
      },
    },
  },
  plugins: [],
};

export default config;
