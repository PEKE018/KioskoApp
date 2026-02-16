import { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import {
  FiDatabase,
  FiShield,
  FiInfo,
  FiSave,
  FiPercent,
} from 'react-icons/fi';

interface AppConfig {
  businessName: string;
  businessAddress: string | null;
  businessPhone: string | null;
  businessCuit: string | null;
  ticketHeader: string;
  ticketFooter: string | null;
  transferFeePercent: number;
  cigaretteTransferFeePercent: number;
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'business' | 'security' | 'about'>('business');
  const [, setLoading] = useState(true);
  const [businessData, setBusinessData] = useState({
    businessName: 'Mi Kiosko',
    businessAddress: '',
    businessPhone: '',
    businessCuit: '',
    ticketHeader: '¡Gracias por su compra!',
    ticketFooter: '',
    transferFeePercent: 0,
    cigaretteTransferFeePercent: 0,
  });
  const [securityData, setSecurityData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const user = useAuthStore((state) => state.user);

  // Cargar configuración al iniciar
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const result = await window.api.settings.get() as {
          success: boolean;
          data?: AppConfig;
        };
        if (result.success && result.data) {
          setBusinessData({
            businessName: result.data.businessName || 'Mi Kiosko',
            businessAddress: result.data.businessAddress || '',
            businessPhone: result.data.businessPhone || '',
            businessCuit: result.data.businessCuit || '',
            ticketHeader: result.data.ticketHeader || '¡Gracias por su compra!',
            ticketFooter: result.data.ticketFooter || '',
            transferFeePercent: result.data.transferFeePercent || 0,
            cigaretteTransferFeePercent: result.data.cigaretteTransferFeePercent || 0,
          });
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, []);

  const handleSaveBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await window.api.settings.update({
        businessName: businessData.businessName,
        businessAddress: businessData.businessAddress || null,
        businessPhone: businessData.businessPhone || null,
        businessCuit: businessData.businessCuit || null,
        ticketHeader: businessData.ticketHeader,
        ticketFooter: businessData.ticketFooter || null,
        transferFeePercent: businessData.transferFeePercent,
        cigaretteTransferFeePercent: businessData.cigaretteTransferFeePercent,
      }) as { success: boolean; error?: string };

      if (result.success) {
        setMessage({ type: 'success', text: 'Configuración guardada correctamente' });
      } else {
        setMessage({ type: 'error', text: result.error || 'Error al guardar' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error de conexión' });
    }
    setTimeout(() => setMessage(null), 3000);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (securityData.newPassword !== securityData.confirmPassword) {
      setMessage({ type: 'error', text: 'Las contraseñas no coinciden' });
      return;
    }

    try {
      const result = await window.api.auth.changePassword(
        securityData.oldPassword,
        securityData.newPassword
      ) as { success: boolean; error?: string };

      if (result.success) {
        setMessage({ type: 'success', text: 'Contraseña actualizada correctamente' });
        setSecurityData({ oldPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        setMessage({ type: 'error', text: result.error || 'Error al cambiar contraseña' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error de conexión' });
    }

    setTimeout(() => setMessage(null), 3000);
  };

  const tabs = [
    { id: 'business', label: 'Negocio', icon: FiDatabase },
    { id: 'security', label: 'Seguridad', icon: FiShield },
    { id: 'about', label: 'Acerca de', icon: FiInfo },
  ];

  return (
    <div className="h-full flex flex-col p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Configuración</h1>
        <p className="text-kiosko-muted">Ajustes del sistema</p>
      </div>

      {/* Mensaje */}
      {message && (
        <div
          className={`mb-4 p-3 rounded-lg ${
            message.type === 'success'
              ? 'bg-stock-ok/20 border border-stock-ok/30 text-stock-ok'
              : 'bg-stock-critical/20 border border-stock-critical/30 text-stock-critical'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="flex gap-6 flex-1">
        {/* Sidebar de tabs */}
        <div className="w-56 space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`nav-link w-full ${
                activeTab === tab.id ? 'active' : ''
              }`}
            >
              <tab.icon size={20} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Contenido */}
        <div className="flex-1 card">
          {/* Tab Negocio */}
          {activeTab === 'business' && (
            <form onSubmit={handleSaveBusiness} className="space-y-6">
              <div>
                <h3 className="text-lg font-bold mb-4">Datos del Negocio</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-kiosko-muted mb-1">
                      Nombre del negocio
                    </label>
                    <input
                      type="text"
                      value={businessData.businessName}
                      onChange={(e) =>
                        setBusinessData((d) => ({ ...d, businessName: e.target.value }))
                      }
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-kiosko-muted mb-1">
                      CUIT
                    </label>
                    <input
                      type="text"
                      value={businessData.businessCuit}
                      onChange={(e) =>
                        setBusinessData((d) => ({ ...d, businessCuit: e.target.value }))
                      }
                      className="input font-mono"
                      placeholder="XX-XXXXXXXX-X"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-kiosko-muted mb-1">
                      Dirección
                    </label>
                    <input
                      type="text"
                      value={businessData.businessAddress}
                      onChange={(e) =>
                        setBusinessData((d) => ({ ...d, businessAddress: e.target.value }))
                      }
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-kiosko-muted mb-1">
                      Teléfono
                    </label>
                    <input
                      type="text"
                      value={businessData.businessPhone}
                      onChange={(e) =>
                        setBusinessData((d) => ({ ...d, businessPhone: e.target.value }))
                      }
                      className="input"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold mb-4">Configuración de Tickets</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-kiosko-muted mb-1">
                      Encabezado del ticket
                    </label>
                    <input
                      type="text"
                      value={businessData.ticketHeader}
                      onChange={(e) =>
                        setBusinessData((d) => ({ ...d, ticketHeader: e.target.value }))
                      }
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-kiosko-muted mb-1">
                      Pie del ticket
                    </label>
                    <input
                      type="text"
                      value={businessData.ticketFooter}
                      onChange={(e) =>
                        setBusinessData((d) => ({ ...d, ticketFooter: e.target.value }))
                      }
                      className="input"
                      placeholder="Texto opcional al final del ticket"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <FiPercent className="text-primary-400" />
                  Configuración de Pagos
                </h3>
                
                <div className="bg-kiosko-bg rounded-xl p-4 border border-kiosko-border space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-kiosko-muted mb-1">
                        Recargo Transferencia General (%)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          value={businessData.transferFeePercent}
                          onChange={(e) =>
                            setBusinessData((d) => ({ ...d, transferFeePercent: Number(e.target.value) }))
                          }
                          className="input pr-8"
                          min={0}
                          max={100}
                          step={0.5}
                          placeholder="0"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-kiosko-muted">%</span>
                      </div>
                      <p className="text-xs text-kiosko-muted mt-1">
                        Se aplica a toda la compra
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-kiosko-muted mb-1">
                        🚬 Recargo Cigarrillos (%)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          value={businessData.cigaretteTransferFeePercent}
                          onChange={(e) =>
                            setBusinessData((d) => ({ ...d, cigaretteTransferFeePercent: Number(e.target.value) }))
                          }
                          className="input pr-8"
                          min={0}
                          max={100}
                          step={0.5}
                          placeholder="0"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-kiosko-muted">%</span>
                      </div>
                      <p className="text-xs text-kiosko-muted mt-1">
                        Adicional para productos marcados como cigarrillos
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <button type="submit" className="btn-primary flex items-center gap-2">
                <FiSave size={18} />
                Guardar Cambios
              </button>
            </form>
          )}

          {/* Tab Seguridad */}
          {activeTab === 'security' && (
            <form onSubmit={handleChangePassword} className="space-y-6 max-w-md">
              <div>
                <h3 className="text-lg font-bold mb-4">Cambiar Contraseña</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-kiosko-muted mb-1">
                      Contraseña actual
                    </label>
                    <input
                      type="password"
                      value={securityData.oldPassword}
                      onChange={(e) =>
                        setSecurityData((d) => ({ ...d, oldPassword: e.target.value }))
                      }
                      className="input"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-kiosko-muted mb-1">
                      Nueva contraseña
                    </label>
                    <input
                      type="password"
                      value={securityData.newPassword}
                      onChange={(e) =>
                        setSecurityData((d) => ({ ...d, newPassword: e.target.value }))
                      }
                      className="input"
                      required
                      minLength={6}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-kiosko-muted mb-1">
                      Confirmar nueva contraseña
                    </label>
                    <input
                      type="password"
                      value={securityData.confirmPassword}
                      onChange={(e) =>
                        setSecurityData((d) => ({ ...d, confirmPassword: e.target.value }))
                      }
                      className="input"
                      required
                    />
                  </div>
                </div>
              </div>

              <button type="submit" className="btn-primary flex items-center gap-2">
                <FiShield size={18} />
                Actualizar Contraseña
              </button>
            </form>
          )}

          {/* Tab Acerca de */}
          {activeTab === 'about' && (
            <div className="space-y-6">
              <div className="text-center py-8">
                <h2 className="text-4xl font-bold text-primary-400 mb-2">
                  🏪 KioskoApp
                </h2>
                <p className="text-kiosko-muted">
                  Sistema de Gestión de Stock y Ventas
                </p>
                <p className="text-kiosko-muted text-sm mt-1">
                  Versión 1.0.0
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-kiosko-bg rounded-lg">
                  <p className="text-sm text-kiosko-muted mb-1">Tecnologías</p>
                  <p className="font-medium">Electron + React + PostgreSQL</p>
                </div>
                <div className="p-4 bg-kiosko-bg rounded-lg">
                  <p className="text-sm text-kiosko-muted mb-1">Usuario actual</p>
                  <p className="font-medium">{user?.name}</p>
                  <p className="text-xs text-kiosko-muted">
                    {user?.role === 'ADMIN' ? 'Administrador' : 'Cajero'}
                  </p>
                </div>
              </div>

              <div className="p-4 bg-kiosko-bg rounded-lg">
                <h4 className="font-bold mb-2">Características principales</h4>
                <ul className="text-sm text-kiosko-muted space-y-1">
                  <li>✓ Punto de venta ultra rápido con código de barras</li>
                  <li>✓ Carga de stock por categorías</li>
                  <li>✓ Control de inventario en tiempo real</li>
                  <li>✓ Reportes de ventas y productos</li>
                  <li>✓ Gestión de usuarios y permisos</li>
                  <li>✓ Diseñado específicamente para kioscos</li>
                </ul>
              </div>

              <div className="text-center text-sm text-kiosko-muted">
                <p>Desarrollado con ❤️ para kiosqueros</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
