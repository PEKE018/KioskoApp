import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import Layout from './components/layout/Layout';
import LoginPage from './pages/Login';
import POSPage from './pages/POS';
import ProductsPage from './pages/Products';
import CategoriesPage from './pages/Categories';
import StockPage from './pages/Stock';
import CashRegisterPage from './pages/CashRegister';
import CustomersPage from './pages/Customers';
import ReportsPage from './pages/Reports';
import SettingsPage from './pages/Settings';
import UsersPage from './pages/Users';

console.log('[KioskoApp] App.tsx cargado');

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

  // Restaurar sesión en backend al iniciar la app
  useEffect(() => {
    checkSession();
  }, [checkSession]);

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
