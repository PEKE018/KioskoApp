import { useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../stores/authStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { usePosUIStore } from '../../stores/posUIStore';
import UpdateNotification from '../UpdateNotification';
import {
  FiShoppingCart,
  FiPackage,
  FiGrid,
  FiBarChart2,
  FiSettings,
  FiUsers,
  FiLogOut,
  FiBox,
  FiDollarSign,
  FiUserCheck,
  FiMaximize,
  FiMinimize,
  FiCommand,
} from 'react-icons/fi';

export default function Layout() {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();
  const location = useLocation();
  
  const { settings, loadSettings } = useSettingsStore();
  const { isFullscreen, toggleFullscreen, showShortcutsPanel, toggleShortcutsPanel } = usePosUIStore();
  
  // Solo ocultar sidebar si estamos en POS y en fullscreen
  const isPosPage = location.pathname === '/pos';
  const hideSidebar = isPosPage && isFullscreen;

  // Cargar configuración al montar
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Items accesibles para todos (cajeros y admin)
  const cashierItems = [
    { to: '/pos', icon: FiShoppingCart, label: t('nav.sales'), shortcut: 'F1' },
    { to: '/customers', icon: FiUserCheck, label: t('nav.customers'), shortcut: 'F2' },
    { to: '/cash', icon: FiDollarSign, label: t('nav.cashRegister'), shortcut: 'F3' },
  ];

  // Items solo para administradores
  const adminItems = [
    { to: '/products', icon: FiPackage, label: t('nav.products'), shortcut: 'F4' },
    { to: '/categories', icon: FiGrid, label: t('nav.categories'), shortcut: 'F5' },
    { to: '/stock', icon: FiBox, label: t('nav.stock'), shortcut: 'F6' },
    { to: '/reports', icon: FiBarChart2, label: t('nav.reports'), shortcut: 'F7' },
    { to: '/users', icon: FiUsers, label: t('nav.users'), shortcut: 'F8' },
    { to: '/settings', icon: FiSettings, label: t('nav.settings'), shortcut: 'F9' },
  ];

  const isCashier = user?.role === 'CASHIER';

  return (
    <div className="flex h-screen bg-app-bg">
      {/* Sidebar - oculto en modo fullscreen del POS */}
      {!hideSidebar && (
        <aside className="w-56 bg-app-card border-r border-app-border flex flex-col">
        {/* Logo */}
        <div className="p-4 border-b border-app-border">
          <h1 className="text-xl font-bold text-primary-400">🏪 {settings.businessName}</h1>
        </div>

        {/* Navegación principal */}
        <nav className={`flex-1 p-3 overflow-y-auto ${isCashier ? 'flex flex-col justify-center space-y-3' : 'space-y-1'}`}>
          {/* Items para todos los usuarios */}
          {cashierItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                isCashier
                  ? `flex items-center gap-4 px-4 py-4 rounded-xl transition-all duration-200 ${
                      isActive
                        ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/30'
                        : 'bg-app-bg hover:bg-primary-600/20 text-app-text'
                    }`
                  : `nav-link ${isActive ? 'active' : ''}`
              }
            >
              <item.icon size={isCashier ? 28 : 20} />
              <span className={`flex-1 ${isCashier ? 'text-lg font-medium' : ''}`}>{item.label}</span>
              <kbd className={`text-app-muted bg-app-bg/50 rounded ${
                isCashier ? 'text-sm px-2 py-1' : 'text-xs px-1.5 py-0.5'
              }`}>
                {item.shortcut}
              </kbd>
            </NavLink>
          ))}

          {/* Items solo para administradores */}
          {user?.role === 'ADMIN' && (
            <>
              <div className="border-t border-app-border my-3" />
              <p className="text-xs text-app-muted px-4 py-2 uppercase tracking-wider">
                {t('nav.administration')}
              </p>
              {adminItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `nav-link ${isActive ? 'active' : ''}`
                  }
                >
                  <item.icon size={20} />
                  <span className="flex-1">{item.label}</span>
                  <kbd className="text-xs text-app-muted bg-app-bg px-1.5 py-0.5 rounded">
                    {item.shortcut}
                  </kbd>
                </NavLink>
              ))}
            </>
          )}
        </nav>

        {/* Usuario */}
        <div className="p-3 border-t border-app-border">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center text-white font-bold">
              {user?.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{user?.name}</p>
              <p className="text-xs text-app-muted">
                {user?.role === 'ADMIN' ? t('roles.admin') : t('roles.cashier')}
              </p>
            </div>
          </div>
          
          {/* Botones de utilidad */}
          <div className="flex gap-2 mt-2 px-3">
            <button
              onClick={toggleShortcutsPanel}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border transition-colors ${
                showShortcutsPanel 
                  ? 'bg-primary-600 border-primary-600 text-white' 
                  : 'bg-app-bg border-app-border text-app-muted hover:text-app-text hover:border-primary-500'
              }`}
              title="Atajos de teclado (F1)"
            >
              <FiCommand size={18} />
            </button>
            <button
              onClick={toggleFullscreen}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border transition-colors ${
                isFullscreen 
                  ? 'bg-primary-600 border-primary-600 text-white' 
                  : 'bg-app-bg border-app-border text-app-muted hover:text-app-text hover:border-primary-500'
              }`}
              title={isFullscreen ? 'Salir de pantalla completa (F11)' : 'Pantalla completa (F11)'}
            >
              {isFullscreen ? <FiMinimize size={18} /> : <FiMaximize size={18} />}
            </button>
          </div>
          
          <button
            onClick={handleLogout}
            className="nav-link w-full mt-2 text-stock-critical hover:text-red-400 hover:bg-red-500/10"
          >
            <FiLogOut size={20} />
            <span>{t('nav.logout')}</span>
          </button>
        </div>
      </aside>
      )}

      {/* Contenido principal */}
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>

      {/* Notificaciones de actualización */}
      <UpdateNotification />
    </div>
  );
}
