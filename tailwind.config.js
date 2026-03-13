/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/renderer/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Colores principales del sistema
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        // Estados de stock
        stock: {
          critical: '#ef4444', // Rojo - stock crítico
          low: '#f59e0b',      // Amarillo - stock bajo
          ok: '#22c55e',       // Verde - stock OK
        },
        // Fondos oscuros para la app
        app: {
          bg: '#0f172a',
          card: '#1e293b',
          border: '#334155',
          text: '#f1f5f9',
          muted: '#94a3b8',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        'price': ['1.75rem', { lineHeight: '1.2', fontWeight: '700' }],
        'total': ['2.25rem', { lineHeight: '1.2', fontWeight: '800' }],
      },
      animation: {
        'scan': 'scan 0.3s ease-out',
        'pulse-green': 'pulse-green 0.5s ease-out',
      },
      keyframes: {
        scan: {
          '0%': { transform: 'scale(1.05)', opacity: '0.8' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'pulse-green': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(34, 197, 94, 0.7)' },
          '50%': { boxShadow: '0 0 0 10px rgba(34, 197, 94, 0)' },
        },
      },
    },
  },
  plugins: [],
}
