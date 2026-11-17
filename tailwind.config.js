/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        obsidian: '#09090B',
        champagne: '#E5C158',
        surface: '#09090B',
        'surface-container-lowest': '#0E0E10',
        'surface-container-low': '#121215',
        'surface-container': '#1C1B1D',
        'surface-container-high': '#201F22',
        'surface-container-highest': '#2A2A2C',
        'surface-bright': '#353437',
        'on-surface': '#E5E1E4',
        'on-surface-variant': '#D0C5B1',
        outline: '#99907D',
        'outline-variant': '#27272A',
        primary: '#FFDE82',
        'primary-container': '#E5C158',
        'on-primary': '#3D2F00',
        secondary: '#4EDEA3',
        emerald: {
          signal: '#10B981'
        }
      },
      fontFamily: {
        display: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'Consolas', 'monospace']
      }
    }
  },
  plugins: []
};
