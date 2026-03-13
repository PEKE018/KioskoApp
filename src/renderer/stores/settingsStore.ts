import { create } from 'zustand';

interface AppSettings {
  businessName: string;
  businessAddress: string | null;
  businessPhone: string | null;
  isLoaded: boolean;
}

interface SettingsStore {
  settings: AppSettings;
  loadSettings: () => Promise<void>;
  updateSettings: (settings: Partial<AppSettings>) => void;
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  settings: {
    businessName: 'StockPOS',
    businessAddress: null,
    businessPhone: null,
    isLoaded: false,
  },
  
  loadSettings: async () => {
    try {
      const result = await window.api.settings.get() as {
        success: boolean;
        data?: {
          businessName?: string;
          businessAddress?: string | null;
          businessPhone?: string | null;
        };
      };
      
      if (result.success && result.data) {
        set({
          settings: {
            businessName: result.data.businessName || 'StockPOS',
            businessAddress: result.data.businessAddress || null,
            businessPhone: result.data.businessPhone || null,
            isLoaded: true,
          },
        });
        
        // Actualizar título de la ventana
        const name = result.data.businessName || 'StockPOS';
        document.title = name;
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      set((state) => ({
        settings: { ...state.settings, isLoaded: true },
      }));
    }
  },
  
  updateSettings: (newSettings) => {
    set((state) => {
      const updated = { ...state.settings, ...newSettings };
      
      // Actualizar título de la ventana si cambió el nombre
      if (newSettings.businessName) {
        document.title = newSettings.businessName;
      }
      
      return { settings: updated };
    });
  },
}));
