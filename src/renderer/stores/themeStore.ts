import { create } from 'zustand';

export type AccentColor = 'blue' | 'green' | 'purple' | 'orange' | 'pink' | 'amber' | 'red' | 'cyan' | 'emerald' | 'slate' | 'zinc';
export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeColors {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  scale: {
    50: string;
    100: string;
    200: string;
    300: string;
    400: string;
    500: string;
    600: string;
    700: string;
    800: string;
    900: string;
  };
}

export const ACCENT_COLORS: Record<AccentColor, ThemeColors & { name: string; emoji: string }> = {
  blue: {
    name: 'Azul',
    emoji: '🔵',
    primary: '#3b82f6',
    primaryLight: '#60a5fa',
    primaryDark: '#2563eb',
    scale: {
      50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd',
      400: '#60a5fa', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8',
      800: '#1e40af', 900: '#1e3a8a'
    }
  },
  green: {
    name: 'Verde',
    emoji: '🟢',
    primary: '#22c55e',
    primaryLight: '#4ade80',
    primaryDark: '#16a34a',
    scale: {
      50: '#f0fdf4', 100: '#dcfce7', 200: '#bbf7d0', 300: '#86efac',
      400: '#4ade80', 500: '#22c55e', 600: '#16a34a', 700: '#15803d',
      800: '#166534', 900: '#14532d'
    }
  },
  emerald: {
    name: 'Esmeralda',
    emoji: '💚',
    primary: '#10b981',
    primaryLight: '#34d399',
    primaryDark: '#059669',
    scale: {
      50: '#ecfdf5', 100: '#d1fae5', 200: '#a7f3d0', 300: '#6ee7b7',
      400: '#34d399', 500: '#10b981', 600: '#059669', 700: '#047857',
      800: '#065f46', 900: '#064e3b'
    }
  },
  purple: {
    name: 'Morado',
    emoji: '🟣',
    primary: '#a855f7',
    primaryLight: '#c084fc',
    primaryDark: '#9333ea',
    scale: {
      50: '#faf5ff', 100: '#f3e8ff', 200: '#e9d5ff', 300: '#d8b4fe',
      400: '#c084fc', 500: '#a855f7', 600: '#9333ea', 700: '#7e22ce',
      800: '#6b21a8', 900: '#581c87'
    }
  },
  pink: {
    name: 'Rosa',
    emoji: '🩷',
    primary: '#ec4899',
    primaryLight: '#f472b6',
    primaryDark: '#db2777',
    scale: {
      50: '#fdf2f8', 100: '#fce7f3', 200: '#fbcfe8', 300: '#f9a8d4',
      400: '#f472b6', 500: '#ec4899', 600: '#db2777', 700: '#be185d',
      800: '#9d174d', 900: '#831843'
    }
  },
  orange: {
    name: 'Naranja',
    emoji: '🟠',
    primary: '#f97316',
    primaryLight: '#fb923c',
    primaryDark: '#ea580c',
    scale: {
      50: '#fff7ed', 100: '#ffedd5', 200: '#fed7aa', 300: '#fdba74',
      400: '#fb923c', 500: '#f97316', 600: '#ea580c', 700: '#c2410c',
      800: '#9a3412', 900: '#7c2d12'
    }
  },
  amber: {
    name: 'Ámbar',
    emoji: '🟡',
    primary: '#f59e0b',
    primaryLight: '#fbbf24',
    primaryDark: '#d97706',
    scale: {
      50: '#fffbeb', 100: '#fef3c7', 200: '#fde68a', 300: '#fcd34d',
      400: '#fbbf24', 500: '#f59e0b', 600: '#d97706', 700: '#b45309',
      800: '#92400e', 900: '#78350f'
    }
  },
  red: {
    name: 'Rojo',
    emoji: '🔴',
    primary: '#ef4444',
    primaryLight: '#f87171',
    primaryDark: '#dc2626',
    scale: {
      50: '#fef2f2', 100: '#fee2e2', 200: '#fecaca', 300: '#fca5a5',
      400: '#f87171', 500: '#ef4444', 600: '#dc2626', 700: '#b91c1c',
      800: '#991b1b', 900: '#7f1d1d'
    }
  },
  cyan: {
    name: 'Cian',
    emoji: '🩵',
    primary: '#06b6d4',
    primaryLight: '#22d3ee',
    primaryDark: '#0891b2',
    scale: {
      50: '#ecfeff', 100: '#cffafe', 200: '#a5f3fc', 300: '#67e8f9',
      400: '#22d3ee', 500: '#06b6d4', 600: '#0891b2', 700: '#0e7490',
      800: '#155e75', 900: '#164e63'
    }
  },
  slate: {
    name: 'Negro',
    emoji: '⚫',
    primary: '#475569',
    primaryLight: '#64748b',
    primaryDark: '#334155',
    scale: {
      50: '#f8fafc', 100: '#f1f5f9', 200: '#e2e8f0', 300: '#cbd5e1',
      400: '#94a3b8', 500: '#64748b', 600: '#475569', 700: '#334155',
      800: '#1e293b', 900: '#0f172a'
    }
  },
  zinc: {
    name: 'Blanco',
    emoji: '⚪',
    primary: '#a1a1aa',
    primaryLight: '#d4d4d8',
    primaryDark: '#71717a',
    scale: {
      50: '#fafafa', 100: '#f4f4f5', 200: '#e4e4e7', 300: '#d4d4d8',
      400: '#a1a1aa', 500: '#71717a', 600: '#52525b', 700: '#3f3f46',
      800: '#27272a', 900: '#18181b'
    }
  },
};

interface ThemeStore {
  accentColor: AccentColor;
  themeMode: ThemeMode;
  isDark: boolean;
  setAccentColor: (color: AccentColor) => void;
  setThemeMode: (mode: ThemeMode) => void;
  initTheme: () => void;
}

const ACCENT_STORAGE_KEY = 'stockpos_accent_color';
const MODE_STORAGE_KEY = 'stockpos_theme_mode';

// Función para mezclar colores hex
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => {
    const hex = Math.round(x).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

function mixColors(color1: string, color2: string, weight: number): string {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  const w = weight / 100;
  return rgbToHex(
    c1.r * w + c2.r * (1 - w),
    c1.g * w + c2.g * (1 - w),
    c1.b * w + c2.b * (1 - w)
  );
}

function getSystemPrefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

// Aplica tanto el color de acento como el modo de tema juntos
function applyFullTheme(color: AccentColor, isDark: boolean) {
  const colors = ACCENT_COLORS[color];
  const root = document.documentElement;
  
  // Aplicar escala de colores primarios
  Object.entries(colors.scale).forEach(([shade, value]) => {
    root.style.setProperty(`--color-primary-${shade}`, value);
  });
  root.style.setProperty('--color-primary', colors.primary);
  root.style.setProperty('--color-primary-light', colors.primaryLight);
  root.style.setProperty('--color-primary-dark', colors.primaryDark);
  root.setAttribute('data-accent', color);
  
  // Generar fondos con tinte del color de acento
  if (isDark) {
    // Modo oscuro: mezclar el color de acento con fondos oscuros
    const bg = mixColors(colors.scale[900], '#0a0f1a', 35);      // Fondo principal
    const card = mixColors(colors.scale[800], '#1e293b', 25);     // Cards
    const border = mixColors(colors.scale[700], '#334155', 20);   // Bordes
    
    root.style.setProperty('--app-bg', bg);
    root.style.setProperty('--app-card', card);
    root.style.setProperty('--app-border', border);
    root.style.setProperty('--app-text', '#f1f5f9');
    root.style.setProperty('--app-muted', '#94a3b8');
    
    root.classList.add('dark');
    root.classList.remove('light');
  } else {
    // Modo claro: mezclar el color de acento con fondos claros
    const bg = mixColors(colors.scale[50], '#f8fafc', 40);        // Fondo principal
    const card = mixColors(colors.scale[50], '#ffffff', 15);      // Cards
    const border = mixColors(colors.scale[200], '#e2e8f0', 30);   // Bordes
    
    root.style.setProperty('--app-bg', bg);
    root.style.setProperty('--app-card', card);
    root.style.setProperty('--app-border', border);
    root.style.setProperty('--app-text', '#0f172a');
    root.style.setProperty('--app-muted', '#64748b');
    
    root.classList.add('light');
    root.classList.remove('dark');
  }
  
  root.setAttribute('data-theme', isDark ? 'dark' : 'light');
}

export const useThemeStore = create<ThemeStore>((set, get) => ({
  accentColor: 'blue',
  themeMode: 'dark',
  isDark: true,
  
  setAccentColor: (color) => {
    const { themeMode } = get();
    const isDark = themeMode === 'system' ? getSystemPrefersDark() : themeMode === 'dark';
    localStorage.setItem(ACCENT_STORAGE_KEY, color);
    applyFullTheme(color, isDark);
    set({ accentColor: color });
  },
  
  setThemeMode: (mode) => {
    const { accentColor } = get();
    const isDark = mode === 'system' ? getSystemPrefersDark() : mode === 'dark';
    localStorage.setItem(MODE_STORAGE_KEY, mode);
    applyFullTheme(accentColor, isDark);
    set({ themeMode: mode, isDark });
  },
  
  initTheme: () => {
    // Cargar color de acento
    const savedColor = localStorage.getItem(ACCENT_STORAGE_KEY) as AccentColor | null;
    const color = savedColor && ACCENT_COLORS[savedColor] ? savedColor : 'blue';
    
    // Cargar modo de tema
    const savedMode = localStorage.getItem(MODE_STORAGE_KEY) as ThemeMode | null;
    const mode = savedMode && ['light', 'dark', 'system'].includes(savedMode) ? savedMode : 'dark';
    const isDark = mode === 'system' ? getSystemPrefersDark() : mode === 'dark';
    
    // Aplicar tema completo (acento + modo juntos)
    applyFullTheme(color, isDark);
    
    set({ accentColor: color, themeMode: mode, isDark });
    
    // Escuchar cambios en preferencia del sistema
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      const state = useThemeStore.getState();
      if (state.themeMode === 'system') {
        const newIsDark = getSystemPrefersDark();
        applyFullTheme(state.accentColor, newIsDark);
        set({ isDark: newIsDark });
      }
    });
  },
}));
