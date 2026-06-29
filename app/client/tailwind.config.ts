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
        // COMMUNITREE "Living Instrument" system — dark ink canvas, bio-lime accent.
        // Admin reuses the same tokens as the public theme (earth.css) so the
        // whole platform is one identity (and clean-room vs the incumbent's MUI look).
        primary: {
          DEFAULT: '#b6ff3c', // bio-lime accent (buttons use dark text on this)
          hover: '#c8ff63',
        },
        navbar: {
          DEFAULT: '#0f1d22', // tab bar — darker panel
          text: '#e7efea',
          inactive: 'rgba(231,239,234,0.55)',
        },
        appbg: '#16282e',     // gable near-black page canvas
        surface: '#1b2f36',   // raised panels / cards / header
        tableHeader: '#13242a',
        textPrimary: '#e7efea',
        textSecondary: '#9fb0ad',
        border: 'rgba(255,255,255,0.12)',
        danger: {
          DEFAULT: '#f0792b',
          hover: '#f8995a',
        },
        darkInk: '#0b1316',   // dark text used ON the lime accent
      },
      fontFamily: {
        sans: ["'Plus Jakarta Sans'", 'system-ui', 'sans-serif'],
        serif: ["'Fraunces'", 'Georgia', 'serif'],
        mono: ["'JetBrains Mono'", 'ui-monospace', 'monospace'],
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
