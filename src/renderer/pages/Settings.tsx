import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { changeLanguage } from '../i18n';
import { useAuthStore } from '../stores/authStore';
import {
  FiDatabase,
  FiShield,
  FiInfo,
  FiSave,
  FiPercent,
  FiGlobe,
  FiDownload,
  FiRefreshCw,
  FiCheckCircle,
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
  showCostPrice: boolean;
  showUnitsPerBox: boolean;
}

export default function SettingsPage() {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState<'general' | 'business' | 'security' | 'about'>('general');
  const [, setLoading] = useState(true);
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language);
  const [businessData, setBusinessData] = useState({
    businessName: 'Mi Kiosko',
    businessAddress: '',
    businessPhone: '',
    businessCuit: '',
    ticketHeader: '¡Gracias por su compra!',
    ticketFooter: '',
    transferFeePercent: 0,
    cigaretteTransferFeePercent: 0,
    showCostPrice: true,
    showUnitsPerBox: true,
  });
  const [securityData, setSecurityData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Estado de actualizaciones
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'error'>('idle');
  const [updateInfo, setUpdateInfo] = useState<{ version?: string; releaseNotes?: string } | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [currentVersion, setCurrentVersion] = useState<string>('1.0.0');

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
            showCostPrice: result.data.showCostPrice !== false,
            showUnitsPerBox: result.data.showUnitsPerBox !== false,
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

  // Cargar versión actual y configurar listeners de actualizaciones
  useEffect(() => {
    const loadVersion = async () => {
      try {
        const result = await window.api.updater.getCurrentVersion() as { success: boolean; version?: string };
        if (result.success && result.version) {
          setCurrentVersion(result.version);
        }
      } catch (error) {
        console.error('Error loading version:', error);
      }
    };
    loadVersion();

    // Listeners para actualizaciones
    window.api.updater.onUpdateAvailable((info: unknown) => {
      const updateData = info as { version?: string; releaseNotes?: string };
      setUpdateStatus('available');
      setUpdateInfo(updateData);
    });

    window.api.updater.onDownloadProgress((progress: unknown) => {
      const progressData = progress as { percent?: number };
      setUpdateStatus('downloading');
      setDownloadProgress(progressData.percent || 0);
    });

    window.api.updater.onUpdateDownloaded((info: unknown) => {
      const updateData = info as { version?: string; releaseNotes?: string };
      setUpdateStatus('downloaded');
      setUpdateInfo(updateData);
    });
  }, []);

  // Funciones para actualizaciones
  const checkForUpdates = useCallback(async () => {
    setUpdateStatus('checking');
    try {
      const result = await window.api.updater.check() as { success: boolean; updateAvailable?: boolean; version?: string; error?: string };
      if (result.success) {
        if (!result.updateAvailable) {
          setUpdateStatus('idle');
          setMessage({ type: 'success', text: 'Ya tienes la última versión' });
        }
      } else {
        setUpdateStatus('error');
        setMessage({ type: 'error', text: result.error || 'Error al verificar actualizaciones' });
      }
    } catch (error) {
      setUpdateStatus('error');
      setMessage({ type: 'error', text: 'Error al conectar con el servidor de actualizaciones' });
    }
  }, []);

  const downloadUpdate = useCallback(async () => {
    setUpdateStatus('downloading');
    try {
      await window.api.updater.download();
    } catch (error) {
      setUpdateStatus('error');
      setMessage({ type: 'error', text: 'Error al descargar la actualización' });
    }
  }, []);

  const installUpdate = useCallback(async () => {
    try {
      await window.api.updater.install();
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al instalar la actualización' });
    }
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
        showCostPrice: businessData.showCostPrice,
        showUnitsPerBox: businessData.showUnitsPerBox,
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
      setMessage({ type: 'error', text: t('settings.passwordsMismatch') });
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
    { id: 'general', label: t('settings.general'), icon: FiGlobe },
    { id: 'business', label: t('settings.business'), icon: FiDatabase },
    { id: 'security', label: t('settings.security'), icon: FiShield },
    { id: 'about', label: t('settings.about'), icon: FiInfo },
  ];

  return (
    <div className="h-full flex flex-col p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{t('settings.title')}</h1>
        <p className="text-kiosko-muted">{t('settings.subtitle')}</p>
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
          {/* Tab General */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <FiGlobe className="text-primary-400" />
                  {t('settings.language')}
                </h3>
                <p className="text-kiosko-muted text-sm mb-4">
                  {t('settings.languageDescription')}
                </p>
                
                <div className="flex gap-4">
                  <button
                    onClick={() => {
                      changeLanguage('es');
                      setCurrentLanguage('es');
                    }}
                    className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                      currentLanguage === 'es'
                        ? 'border-primary-500 bg-primary-500/10'
                        : 'border-kiosko-border hover:border-kiosko-muted'
                    }`}
                  >
                    <div className="text-3xl mb-2">🇪🇸</div>
                    <div className="font-medium">{t('settings.spanish')}</div>
                  </button>
                  <button
                    onClick={() => {
                      changeLanguage('en');
                      setCurrentLanguage('en');
                    }}
                    className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                      currentLanguage === 'en'
                        ? 'border-primary-500 bg-primary-500/10'
                        : 'border-kiosko-border hover:border-kiosko-muted'
                    }`}
                  >
                    <div className="text-3xl mb-2">🇺🇸</div>
                    <div className="font-medium">{t('settings.english')}</div>
                  </button>
                </div>
              </div>
            </div>
          )}

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

              <div>
                <h3 className="text-lg font-bold mb-4">Opciones de Productos</h3>
                <p className="text-sm text-kiosko-muted mb-4">
                  Configura qué campos se muestran en el formulario de productos
                </p>
                
                <div className="bg-kiosko-bg rounded-xl p-4 border border-kiosko-border space-y-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={businessData.showCostPrice}
                      onChange={(e) =>
                        setBusinessData((d) => ({ ...d, showCostPrice: e.target.checked }))
                      }
                      className="w-5 h-5 rounded border-kiosko-border bg-kiosko-bg text-primary-500 focus:ring-primary-500"
                    />
                    <div>
                      <span className="font-medium">Mostrar precio de costo</span>
                      <p className="text-xs text-kiosko-muted">
                        Permite registrar el precio de costo de los productos
                      </p>
                    </div>
                  </label>
                  
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={businessData.showUnitsPerBox}
                      onChange={(e) =>
                        setBusinessData((d) => ({ ...d, showUnitsPerBox: e.target.checked }))
                      }
                      className="w-5 h-5 rounded border-kiosko-border bg-kiosko-bg text-primary-500 focus:ring-primary-500"
                    />
                    <div>
                      <span className="font-medium">Mostrar unidades por caja</span>
                      <p className="text-xs text-kiosko-muted">
                        Permite configurar cuántas unidades vienen por caja/paquete
                      </p>
                    </div>
                  </label>
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
                  Versión {currentVersion}
                </p>
              </div>

              {/* Sección de Actualizaciones */}
              <div className="p-4 bg-kiosko-bg rounded-lg">
                <h4 className="font-bold mb-3 flex items-center gap-2">
                  <FiDownload size={18} />
                  Actualizaciones
                </h4>
                
                {updateStatus === 'idle' && (
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-kiosko-muted">
                      Verifica si hay nuevas versiones disponibles
                    </p>
                    <button
                      onClick={checkForUpdates}
                      className="btn-primary flex items-center gap-2"
                    >
                      <FiRefreshCw size={16} />
                      Buscar actualizaciones
                    </button>
                  </div>
                )}

                {updateStatus === 'checking' && (
                  <div className="flex items-center gap-3 text-primary-400">
                    <FiRefreshCw className="animate-spin" size={20} />
                    <span>Verificando actualizaciones...</span>
                  </div>
                )}

                {updateStatus === 'available' && updateInfo && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-green-400">
                      <FiCheckCircle size={20} />
                      <span className="font-medium">
                        ¡Nueva versión disponible! v{updateInfo.version}
                      </span>
                    </div>
                    {updateInfo.releaseNotes && (
                      <p className="text-sm text-kiosko-muted pl-7">
                        {typeof updateInfo.releaseNotes === 'string' 
                          ? updateInfo.releaseNotes 
                          : 'Mejoras y correcciones de errores'}
                      </p>
                    )}
                    <button
                      onClick={downloadUpdate}
                      className="btn-primary flex items-center gap-2 ml-7"
                    >
                      <FiDownload size={16} />
                      Descargar actualización
                    </button>
                  </div>
                )}

                {updateStatus === 'downloading' && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-primary-400">
                      <FiDownload size={20} />
                      <span>Descargando actualización...</span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-3">
                      <div 
                        className="bg-primary-500 h-3 rounded-full transition-all duration-300"
                        style={{ width: `${downloadProgress}%` }}
                      />
                    </div>
                    <p className="text-sm text-kiosko-muted text-center">
                      {downloadProgress.toFixed(1)}% completado
                    </p>
                  </div>
                )}

                {updateStatus === 'downloaded' && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-green-400">
                      <FiCheckCircle size={20} />
                      <span className="font-medium">
                        Actualización lista para instalar (v{updateInfo?.version})
                      </span>
                    </div>
                    <p className="text-sm text-kiosko-muted pl-7">
                      La aplicación se reiniciará para aplicar los cambios. 
                      Tus datos se mantendrán intactos.
                    </p>
                    <button
                      onClick={installUpdate}
                      className="btn-primary flex items-center gap-2 ml-7"
                    >
                      <FiRefreshCw size={16} />
                      Instalar y reiniciar
                    </button>
                  </div>
                )}

                {updateStatus === 'error' && (
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-red-400">
                      Error al verificar actualizaciones
                    </p>
                    <button
                      onClick={checkForUpdates}
                      className="btn-secondary flex items-center gap-2"
                    >
                      <FiRefreshCw size={16} />
                      Reintentar
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-kiosko-bg rounded-lg">
                  <p className="text-sm text-kiosko-muted mb-1">Tecnologías</p>
                  <p className="font-medium">Electron + React + SQLite</p>
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
