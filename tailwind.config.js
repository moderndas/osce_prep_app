/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
    './utils/**/*.{js,ts,jsx,tsx,mdx}',
    './models/**/*.{js,ts,jsx,tsx,mdx}',
    './styles/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  safelist: [
    'collapse',
    'collapse-open',
    'collapse-title',
    'collapse-content',
    'collapse-arrow',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
      spacing: {
        xs: '0.25rem',   // 4px
        sm: '0.5rem',    // 8px
        md: '1rem',      // 16px
        lg: '1.5rem',    // 24px
        xl: '2rem',      // 32px
        '2xl': '2.5rem', // 40px
        '3xl': '3rem',   // 48px
      },
      lineHeight: {
        tight: '1.2',
        normal: '1.5',
        relaxed: '1.75',
      },
      letterSpacing: {
        tighter: '-0.05em',
        tight: '-0.025em',
        normal: '0',
        wide: '0.025em',
        wider: '0.05em',
      },
      ringWidth: {
        DEFAULT: '0px', // Set default ring width to 0
      },
      ringOffsetWidth: {
        DEFAULT: '0px', // Set default ring offset width to 0
      },
      ringColor: {
        DEFAULT: 'transparent', // Set default ring color to transparent
      },
      outline: {
        none: ['0px solid transparent', '0px'],
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms')({
      strategy: 'class', // only generate classes, not base styles
    }),
    require('daisyui'),
  ],
  daisyui: {
    themes: [
      {
        'osce-warm': {
          "primary": "hsl(32 100% 49%)",
          "primary-content": "hsl(39 100% 97%)",
          
          "secondary": "hsl(30 50% 95%)",
          "secondary-content": "hsl(35 25% 25%)",
          
          "accent": "hsl(32 100% 94%)",
          "accent-content": "hsl(35 25% 25%)",
          
          "neutral": "hsl(35 25% 25%)",
          "neutral-content": "hsl(0 0% 100%)",
          
          "base-100": "hsl(36 100% 97%)",
          "base-200": "hsl(30 50% 95%)",
          "base-300": "hsl(30 50% 90%)",
          "base-content": "hsl(35 25% 25%)",
          
          "info": "hsl(215 100% 50%)",
          "info-content": "hsl(0 0% 100%)",
          
          "success": "hsl(120 75% 40%)",
          "success-content": "hsl(0 0% 100%)",
          
          "warning": "hsl(40 100% 50%)",
          "warning-content": "hsl(0 0% 100%)",
          
          "error": "hsl(0 84.2% 60.2%)",
          "error-content": "hsl(0 0% 100%)",
          
          "--rounded-btn": "0.5rem",
          "--btn-text-case": "normal-case",
          "--animation-btn": "0.25s",
          "--btn-focus-scale": "1", // Changed from 0.95 to prevent focus effects
          "--border-btn": "1px",
          "--radius": "0.5rem",
        },
      },
      "dark",
    ],
    darkTheme: "dark",
    options: {
      noRingOnFocus: true, // Disable focus ring
    },
  },
}; 