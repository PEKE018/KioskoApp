import { create } from 'zustand';

interface PosUIState {
  isFullscreen: boolean;
  showShortcutsPanel: boolean;
  isListening: boolean;
  
  toggleFullscreen: () => void;
  setFullscreen: (value: boolean) => void;
  toggleShortcutsPanel: () => void;
  setShortcutsPanel: (value: boolean) => void;
  setListening: (value: boolean) => void;
}

export const usePosUIStore = create<PosUIState>((set) => ({
  isFullscreen: false,
  showShortcutsPanel: false,
  isListening: false,
  
  toggleFullscreen: () => set((state) => {
    const newValue = !state.isFullscreen;
    
    // Usar Fullscreen API del navegador
    if (newValue) {
      document.documentElement.requestFullscreen?.().catch(console.error);
    } else {
      document.exitFullscreen?.().catch(console.error);
    }
    
    return { isFullscreen: newValue };
  }),
  
  setFullscreen: (value) => set({ isFullscreen: value }),
  
  toggleShortcutsPanel: () => set((state) => ({ 
    showShortcutsPanel: !state.showShortcutsPanel 
  })),
  
  setShortcutsPanel: (value) => set({ showShortcutsPanel: value }),
  
  setListening: (value) => set({ isListening: value }),
}));
