import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  username: string;
  name: string;
  role: 'ADMIN' | 'CASHIER';
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  login: (username: string, password: string) => Promise<boolean>;
  loginWithPin: (pin: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isLoading: false,
      error: null,

      login: async (username: string, password: string) => {
        set({ isLoading: true, error: null });
        
        try {
          const result = await window.api.auth.login(username, password) as {
            success: boolean;
            data?: User;
            error?: string;
          };
          
          if (result.success && result.data) {
            set({ user: result.data, isLoading: false });
            return true;
          } else {
            set({ error: result.error || 'Error al iniciar sesión', isLoading: false });
            return false;
          }
        } catch (error) {
          set({ error: 'Error de conexión', isLoading: false });
          return false;
        }
      },

      loginWithPin: async (pin: string) => {
        set({ isLoading: true, error: null });
        
        try {
          const result = await window.api.auth.loginWithPin(pin) as {
            success: boolean;
            data?: User;
            error?: string;
          };
          
          if (result.success && result.data) {
            set({ user: result.data, isLoading: false });
            return true;
          } else {
            set({ error: result.error || 'PIN incorrecto', isLoading: false });
            return false;
          }
        } catch (error) {
          set({ error: 'Error de conexión', isLoading: false });
          return false;
        }
      },

      logout: async () => {
        await window.api.auth.logout();
        set({ user: null, error: null });
      },

      checkSession: async () => {
        const state = useAuthStore.getState();
        
        // Si hay usuario guardado en localStorage, intentar restaurar sesión en backend
        if (state.user) {
          try {
            // Primero verificar si el backend tiene sesión
            const currentResult = await window.api.auth.getCurrentUser() as {
              success: boolean;
              data?: User | null;
            };
            
            if (currentResult.success && currentResult.data) {
              // Backend tiene sesión, todo OK
              return;
            }
            
            // Backend no tiene sesión, restaurarla
            const restoreResult = await window.api.auth.restoreSession(state.user.id) as {
              success: boolean;
              data?: User;
              error?: string;
            };
            
            if (restoreResult.success && restoreResult.data) {
              set({ user: restoreResult.data });
            } else {
              // No se pudo restaurar, limpiar sesión
              set({ user: null });
            }
          } catch {
            set({ user: null });
          }
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'kiosko-auth',
      partialize: (state) => ({ user: state.user }),
    }
  )
);
