import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import Layout from './components/layout/Layout';
import LoginPage from './pages/Login';
import SetupPage from './pages/Setup';
import POSPage from './pages/POS';
import ProductsPage from './pages/Products';
import CategoriesPage from './pages/Categories';
import StockPage from './pages/Stock';
import CashRegisterPage from './pages/CashRegister';
import CustomersPage from './pages/Customers';
import ReportsPage from './pages/Reports';
import SettingsPage from './pages/Settings';
import UsersPage from './pages/Users';

console.log('[StockPOS] App.tsx cargado');

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((state) => state.user);
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((state) => state.user);
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  if (user.role !== 'ADMIN') {
    return <Navigate to="/pos" replace />;
  }
  
  return <>{children}</>;
}

export default function App() {
  const checkSession = useAuthStore((state) => state.checkSession);
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null);

  // Verificar si necesita setup inicial
  useEffect(() => {
    const checkSetup = async () => {
      // Si ya se completó el setup, no mostrar
      const setupCompleted = localStorage.getItem('stockpos_setup_completed');
      if (setupCompleted === 'true') {
        setNeedsSetup(false);
        return;
      }

      // Verificar si el nombre del negocio es el default
      try {
        const result = await window.api.settings.get() as {
          success: boolean;
          data?: { businessName?: string };
        };
        
        if (result.success && result.data) {
          // Si el nombre es el default, mostrar setup
          const isDefault = !result.data.businessName || 
                           result.data.businessName === 'Mi Negocio' ||
                           result.data.businessName === 'Mi Kiosko';
          setNeedsSetup(isDefault);
        } else {
          // Si no hay config, mostrar setup
          setNeedsSetup(true);
        }
      } catch {
        // En caso de error, continuar sin setup
        setNeedsSetup(false);
      }
    };
    
    checkSetup();
  }, []);

  // Restaurar sesión en backend al iniciar la app
  useEffect(() => {
    checkSession();
  }, [checkSession]);

  // Mostrar loading mientras verifica
  if (needsSetup === null) {
    return (
      <div className="min-h-screen bg-app-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  // Mostrar Setup si es necesario
  if (needsSetup) {
    return <SetupPage onComplete={() => setNeedsSetup(false)} />;
  }

  return (
    <Routes>
      {/* Página de login */}
      <Route path="/login" element={<LoginPage />} />
      
      {/* Rutas protegidas */}
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        {/* Redirigir / a /pos */}
        <Route index element={<Navigate to="/pos" replace />} />
        
        {/* Punto de Venta - acceso para todos */}
        <Route path="pos" element={<POSPage />} />
        
        {/* Productos - solo admin */}
        <Route
          path="products"
          element={
            <AdminRoute>
              <ProductsPage />
            </AdminRoute>
          }
        />
        
        {/* Redirigir antigua ruta de carga de stock */}
        <Route path="stock/load" element={<Navigate to="/products" replace />} />
        
        {/* Categorías - solo admin */}
        <Route
          path="categories"
          element={
            <AdminRoute>
              <CategoriesPage />
            </AdminRoute>
          }
        />
        
        {/* Control de Stock - solo admin */}
        <Route
          path="stock"
          element={
            <AdminRoute>
              <StockPage />
            </AdminRoute>
          }
        />
        
        {/* Caja Registradora - acceso para todos */}
        <Route path="cash" element={<CashRegisterPage />} />
        
        {/* Clientes / Fiado */}
        <Route path="customers" element={<CustomersPage />} />
        
        {/* Reportes - solo admin */}
        <Route
          path="reports"
          element={
            <AdminRoute>
              <ReportsPage />
            </AdminRoute>
          }
        />
        
        {/* Usuarios - solo admin */}
        <Route
          path="users"
          element={
            <AdminRoute>
              <UsersPage />
            </AdminRoute>
          }
        />
        
        {/* Configuración - solo admin */}
        <Route
          path="settings"
          element={
            <AdminRoute>
              <SettingsPage />
            </AdminRoute>
          }
        />
      </Route>
      
      {/* 404 - redirigir a POS */}
      <Route path="*" element={<Navigate to="/pos" replace />} />
    </Routes>
  );
}
