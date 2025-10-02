/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#053725',
        'primary-foreground': '#F9F7E7',
        background: '#F9F7E7',
        foreground: '#053725',
        secondary: '#053725/10',
        'secondary-foreground': '#053725',
        muted: '#F9F7E7',
        'muted-foreground': '#053725/70',
        accent: '#053725/5',
        'accent-foreground': '#053725',
        border: '#053725',
        input: '#053725/20',
        ring: '#053725',
        destructive: '#ef4444',
        'destructive-foreground': '#F9F7E7',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      boxShadow: {
        'neumorphic': '0 8px 32px 0 rgba(5, 55, 37, 0.15), inset 0 2px 4px 0 rgba(255, 255, 255, 0.5)',
        'neumorphic-inset': 'inset 0 2px 4px 0 rgba(5, 55, 37, 0.1), inset 0 -2px 4px 0 rgba(255, 255, 255, 0.8)',
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [],
};