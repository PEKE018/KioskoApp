import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
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
} from 'react-icons/fi';

export default function Layout() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/pos', icon: FiShoppingCart, label: 'Ventas', shortcut: 'F1' },
    { to: '/products', icon: FiPackage, label: 'Productos', shortcut: 'F2' },
    { to: '/categories', icon: FiGrid, label: 'Categorías', shortcut: 'F3' },
    { to: '/customers', icon: FiUserCheck, label: 'Clientes', shortcut: 'F4' },
    { to: '/stock', icon: FiBox, label: 'Stock', shortcut: 'F5' },
    { to: '/cash', icon: FiDollarSign, label: 'Caja', shortcut: 'F6' },
  ];

  const adminItems = [
    { to: '/reports', icon: FiBarChart2, label: 'Reportes', shortcut: 'F7' },
    { to: '/users', icon: FiUsers, label: 'Usuarios', shortcut: 'F8' },
    { to: '/settings', icon: FiSettings, label: 'Config', shortcut: 'F9' },
  ];

  return (
    <div className="flex h-screen bg-kiosko-bg">
      {/* Sidebar */}
      <aside className="w-56 bg-kiosko-card border-r border-kiosko-border flex flex-col">
        {/* Logo */}
        <div className="p-4 border-b border-kiosko-border">
          <h1 className="text-xl font-bold text-primary-400">🏪 KioskoApp</h1>
        </div>

        {/* Navegación principal */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `nav-link ${isActive ? 'active' : ''}`
              }
            >
              <item.icon size={20} />
              <span className="flex-1">{item.label}</span>
              <kbd className="text-xs text-kiosko-muted bg-kiosko-bg px-1.5 py-0.5 rounded">
                {item.shortcut}
              </kbd>
            </NavLink>
          ))}

          {/* Separador para admin */}
          {user?.role === 'ADMIN' && (
            <>
              <div className="border-t border-kiosko-border my-3" />
              <p className="text-xs text-kiosko-muted px-4 py-2 uppercase tracking-wider">
                Administración
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
                  <kbd className="text-xs text-kiosko-muted bg-kiosko-bg px-1.5 py-0.5 rounded">
                    {item.shortcut}
                  </kbd>
                </NavLink>
              ))}
            </>
          )}
        </nav>

        {/* Usuario */}
        <div className="p-3 border-t border-kiosko-border">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center text-white font-bold">
              {user?.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{user?.name}</p>
              <p className="text-xs text-kiosko-muted">
                {user?.role === 'ADMIN' ? 'Administrador' : 'Cajero'}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="nav-link w-full mt-2 text-stock-critical hover:text-red-400 hover:bg-red-500/10"
          >
            <FiLogOut size={20} />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      {/* Contenido principal */}
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
