import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { changeLanguage } from '../i18n';
import { useAuthStore } from '../stores/authStore';
import { useSettingsStore } from '../stores/settingsStore';
import { useThemeStore, ACCENT_COLORS, AccentColor, ThemeMode } from '../stores/themeStore';
import {
  FiShield,
  FiInfo,
  FiSave,
  FiGlobe,
  FiDownload,
  FiRefreshCw,
  FiCheckCircle,
  FiDroplet,
  FiHome,
  FiFileText,
  FiDollarSign,
  FiPackage,
  FiLock,
  FiCheck,
  FiSun,
  FiMoon,
  FiMonitor,
} from 'react-icons/fi';
import {
  clearPendingUpdate,
  clearPendingUpdateIfInstalled,
  getPendingUpdate,
  setPendingUpdate,
} from '../utils/updateState';

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

type TabType = 'appearance' | 'business' | 'security' | 'about';

export default function SettingsPage() {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabType>('appearance');
  const [, setLoading] = useState(true);
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language);
  const { accentColor, setAccentColor, themeMode, setThemeMode } = useThemeStore();
  
  const [businessData, setBusinessData] = useState({
    businessName: 'Mi Negocio',
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
        const result = await window.api.settings.get() as { success: boolean; data?: AppConfig };
        if (result.success && result.data) {
          setBusinessData({
            businessName: result.data.businessName || 'Mi Negocio',
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

  // Cargar versión y listeners de actualizaciones
  useEffect(() => {
    const loadVersion = async () => {
      try {
        const result = await window.api.updater.getCurrentVersion() as { success: boolean; version?: string };
        if (result.success && result.version) {
          setCurrentVersion(result.version);
          clearPendingUpdateIfInstalled(result.version);
          const pendingUpdate = getPendingUpdate();
          if (pendingUpdate && pendingUpdate.version !== result.version) {
            setUpdateInfo({ version: pendingUpdate.version, releaseNotes: pendingUpdate.releaseNotes });
            setUpdateStatus(pendingUpdate.status);
          }
        }
      } catch (error) {
        console.error('Error loading version:', error);
      }
    };
    loadVersion();

    const offAvailable = window.api.updater.onUpdateAvailable((info: unknown) => {
      const updateData = info as { version?: string; releaseNotes?: string };
      if (updateData.version) {
        setPendingUpdate({ version: updateData.version, releaseNotes: updateData.releaseNotes, status: 'available' });
      }
      setUpdateStatus('available');
      setUpdateInfo(updateData);
    });

    const offProgress = window.api.updater.onDownloadProgress((progress: unknown) => {
      const progressData = progress as { percent?: number };
      setUpdateStatus('downloading');
      setDownloadProgress(progressData.percent || 0);
    });

    const offDownloaded = window.api.updater.onUpdateDownloaded((info: unknown) => {
      const updateData = info as { version?: string; releaseNotes?: string };
      if (updateData.version) {
        setPendingUpdate({ version: updateData.version, releaseNotes: updateData.releaseNotes, status: 'downloaded' });
      }
      setUpdateStatus('downloaded');
      setUpdateInfo(updateData);
    });

    const offError = window.api.updater.onUpdateError?.((error: unknown) => {
      const errorMessage = typeof error === 'object' && error !== null && 'message' in error
        ? String((error as { message?: string }).message)
        : 'Error al descargar';
      setUpdateStatus('error');
      setMessage({ type: 'error', text: errorMessage });
    });

    return () => {
      offAvailable?.();
      offProgress?.();
      offDownloaded?.();
      offError?.();
    };
  }, []);

  const checkForUpdates = useCallback(async () => {
    setUpdateStatus('checking');
    try {
      const result = await window.api.updater.check() as { success: boolean; updateAvailable?: boolean; version?: string; error?: string };
      if (result.success) {
        if (result.updateAvailable && result.version) {
          setPendingUpdate({ version: result.version, status: 'available' });
          setUpdateInfo({ version: result.version });
          setUpdateStatus('available');
        } else {
          clearPendingUpdate();
          setUpdateStatus('idle');
          setMessage({ type: 'success', text: 'Ya tienes la última versión' });
        }
      } else {
        setUpdateStatus('error');
        setMessage({ type: 'error', text: result.error || 'Error al verificar' });
      }
    } catch {
      setUpdateStatus('error');
      setMessage({ type: 'error', text: 'Error de conexión' });
    }
  }, []);

  const downloadUpdate = useCallback(async () => {
    setUpdateStatus('downloading');
    try {
      const result = await window.api.updater.download() as { success: boolean; error?: string };
      if (!result.success) {
        setUpdateStatus('error');
        setMessage({ type: 'error', text: result.error || 'Error al descargar' });
      }
    } catch {
      setUpdateStatus('error');
      setMessage({ type: 'error', text: 'Error al descargar' });
    }
  }, []);

  const installUpdate = useCallback(async () => {
    try {
      const cashResult = await window.api.cashRegister.getCurrent() as { success: boolean; data?: { id: string } | null };
      if (cashResult.success && cashResult.data) {
        setMessage({ type: 'error', text: 'Cierre la caja antes de actualizar' });
        return;
      }
      await window.api.updater.install();
    } catch {
      setMessage({ type: 'error', text: 'Error al instalar' });
    }
  }, []);

  const handleSaveBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    const { updateSettings } = useSettingsStore.getState();
    
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
        updateSettings({
          businessName: businessData.businessName,
          businessAddress: businessData.businessAddress || null,
          businessPhone: businessData.businessPhone || null,
        });
        setMessage({ type: 'success', text: 'Configuración guardada' });
      } else {
        setMessage({ type: 'error', text: result.error || 'Error al guardar' });
      }
    } catch {
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
        setMessage({ type: 'success', text: 'Contraseña actualizada' });
        setSecurityData({ oldPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        setMessage({ type: 'error', text: result.error || 'Error al cambiar' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error de conexión' });
    }
    setTimeout(() => setMessage(null), 3000);
  };

  const tabs = [
    { id: 'appearance' as const, label: 'Apariencia', icon: FiDroplet },
    { id: 'business' as const, label: 'Negocio', icon: FiHome },
    { id: 'security' as const, label: 'Seguridad', icon: FiShield },
    { id: 'about' as const, label: 'Acerca de', icon: FiInfo },
  ];

  return (
    <div className="h-full flex flex-col p-6 overflow-hidden">
      {/* Header */}
      <div className="mb-6 flex-shrink-0">
        <h1 className="text-2xl font-bold">{t('settings.title')}</h1>
        <p className="text-app-muted">{t('settings.subtitle')}</p>
      </div>

      {/* Mensaje */}
      {message && (
        <div
          className={`mb-4 p-3 rounded-lg flex items-center gap-2 flex-shrink-0 ${
            message.type === 'success'
              ? 'bg-stock-ok/20 border border-stock-ok/30 text-stock-ok'
              : 'bg-stock-critical/20 border border-stock-critical/30 text-stock-critical'
          }`}
        >
          {message.type === 'success' ? <FiCheckCircle /> : null}
          {message.text}
        </div>
      )}

      <div className="flex gap-6 flex-1 min-h-0">
        {/* Sidebar */}
        <div className="w-48 flex-shrink-0">
          <nav className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${
                  activeTab === tab.id
                    ? 'bg-primary-500/20 text-primary-400 font-medium'
                    : 'text-app-muted hover:bg-app-card hover:text-app-text'
                }`}
              >
                <tab.icon size={20} />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto pr-2">
          {/* ===== TAB APARIENCIA ===== */}
          {activeTab === 'appearance' && (
            <div className="space-y-8">
              {/* Idioma */}
              <section className="bg-app-card border border-app-border rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center">
                    <FiGlobe className="text-primary-400" size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Idioma</h3>
                    <p className="text-sm text-app-muted">Selecciona el idioma de la aplicación</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => { changeLanguage('es'); setCurrentLanguage('es'); }}
                    className={`p-4 rounded-xl border-2 transition-all flex items-center gap-4 ${
                      currentLanguage === 'es'
                        ? 'border-primary-500 bg-primary-500/10'
                        : 'border-app-border hover:border-app-muted bg-app-bg'
                    }`}
                  >
                    <span className="text-3xl">🇪🇸</span>
                    <div className="text-left">
                      <p className="font-semibold">ES</p>
                      <p className="text-sm text-app-muted">Español</p>
                    </div>
                    {currentLanguage === 'es' && (
                      <FiCheck className="ml-auto text-primary-400" size={20} />
                    )}
                  </button>
                  <button
                    onClick={() => { changeLanguage('en'); setCurrentLanguage('en'); }}
                    className={`p-4 rounded-xl border-2 transition-all flex items-center gap-4 ${
                      currentLanguage === 'en'
                        ? 'border-primary-500 bg-primary-500/10'
                        : 'border-app-border hover:border-app-muted bg-app-bg'
                    }`}
                  >
                    <span className="text-3xl">🇺🇸</span>
                    <div className="text-left">
                      <p className="font-semibold">US</p>
                      <p className="text-sm text-app-muted">English</p>
                    </div>
                    {currentLanguage === 'en' && (
                      <FiCheck className="ml-auto text-primary-400" size={20} />
                    )}
                  </button>
                </div>
              </section>

              {/* Modo de tema */}
              <section className="bg-app-card border border-app-border rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center">
                    <FiMoon className="text-primary-400" size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Modo de tema</h3>
                    <p className="text-sm text-app-muted">Elige entre claro, oscuro o automático</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-3">
                  {([
                    { mode: 'light' as ThemeMode, label: 'Claro', icon: FiSun, desc: 'Fondo claro' },
                    { mode: 'dark' as ThemeMode, label: 'Oscuro', icon: FiMoon, desc: 'Fondo oscuro' },
                    { mode: 'system' as ThemeMode, label: 'Sistema', icon: FiMonitor, desc: 'Automático' },
                  ]).map(({ mode, label, icon: Icon, desc }) => (
                    <button
                      key={mode}
                      onClick={() => setThemeMode(mode)}
                      className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                        themeMode === mode
                          ? 'border-primary-500 bg-primary-500/10'
                          : 'border-app-border hover:border-app-muted bg-app-bg'
                      }`}
                    >
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        themeMode === mode ? 'bg-primary-500/20' : 'bg-app-border/50'
                      }`}>
                        <Icon size={24} className={themeMode === mode ? 'text-primary-400' : 'text-app-muted'} />
                      </div>
                      <div className="text-center">
                        <p className="font-semibold">{label}</p>
                        <p className="text-xs text-app-muted">{desc}</p>
                      </div>
                      {themeMode === mode && (
                        <FiCheck className="text-primary-400" size={18} />
                      )}
                    </button>
                  ))}
                </div>
              </section>

              {/* Color de acento */}
              <section className="bg-app-card border border-app-border rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center">
                    <FiDroplet className="text-primary-400" size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Color de acento</h3>
                    <p className="text-sm text-app-muted">Personaliza el color principal de la aplicación</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-11 gap-3">
                  {(Object.keys(ACCENT_COLORS) as AccentColor[]).map((color) => {
                    const colorData = ACCENT_COLORS[color];
                    const isSelected = accentColor === color;
                    const isNeutral = color === 'slate' || color === 'zinc';
                    return (
                      <button
                        key={color}
                        onClick={() => setAccentColor(color)}
                        className={`group relative flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                          isSelected
                            ? 'border-white/50 bg-white/5'
                            : 'border-transparent hover:border-app-border bg-app-bg hover:bg-app-border/30'
                        }`}
                        title={colorData.name}
                      >
                        <div
                          className={`w-10 h-10 rounded-full transition-transform ${
                            isSelected ? 'scale-110 ring-4 ring-white/20' : 'group-hover:scale-105'
                          } ${isNeutral ? 'border-2 border-app-border' : ''}`}
                          style={{ backgroundColor: color === 'zinc' ? '#e4e4e7' : colorData.primary }}
                        >
                          {isSelected && (
                            <div className="w-full h-full flex items-center justify-center">
                              <FiCheck 
                                className={`drop-shadow-lg ${color === 'zinc' ? 'text-gray-700' : 'text-white'}`} 
                                size={20} 
                              />
                            </div>
                          )}
                        </div>
                        <span className="text-xs text-app-muted">{colorData.name}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Preview */}
                <div className="mt-6 p-4 bg-app-bg rounded-xl border border-app-border">
                  <p className="text-sm text-app-muted mb-3">Vista previa</p>
                  <div className="flex flex-wrap gap-3">
                    <button className="btn-primary px-4 py-2 text-sm">
                      Botón Primario
                    </button>
                    <button className="btn-secondary px-4 py-2 text-sm">
                      Botón Secundario
                    </button>
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-500/20 text-primary-400 text-sm">
                      <FiCheckCircle size={14} />
                      Badge
                    </span>
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* ===== TAB NEGOCIO ===== */}
          {activeTab === 'business' && (
            <form onSubmit={handleSaveBusiness} className="space-y-6">
              {/* Datos del negocio */}
              <section className="bg-app-card border border-app-border rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center">
                    <FiHome className="text-primary-400" size={20} />
                  </div>
                  <h3 className="font-semibold text-lg">Datos del Negocio</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-app-muted mb-1.5">
                      Nombre del negocio
                    </label>
                    <input
                      type="text"
                      value={businessData.businessName}
                      onChange={(e) => setBusinessData((d) => ({ ...d, businessName: e.target.value }))}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-app-muted mb-1.5">CUIT</label>
                    <input
                      type="text"
                      value={businessData.businessCuit}
                      onChange={(e) => setBusinessData((d) => ({ ...d, businessCuit: e.target.value }))}
                      className="input font-mono"
                      placeholder="XX-XXXXXXXX-X"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-app-muted mb-1.5">Dirección</label>
                    <input
                      type="text"
                      value={businessData.businessAddress}
                      onChange={(e) => setBusinessData((d) => ({ ...d, businessAddress: e.target.value }))}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-app-muted mb-1.5">Teléfono</label>
                    <input
                      type="text"
                      value={businessData.businessPhone}
                      onChange={(e) => setBusinessData((d) => ({ ...d, businessPhone: e.target.value }))}
                      className="input"
                    />
                  </div>
                </div>
              </section>

              {/* Tickets */}
              <section className="bg-app-card border border-app-border rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center">
                    <FiFileText className="text-primary-400" size={20} />
                  </div>
                  <h3 className="font-semibold text-lg">Configuración de Tickets</h3>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-app-muted mb-1.5">
                      Encabezado del ticket
                    </label>
                    <input
                      type="text"
                      value={businessData.ticketHeader}
                      onChange={(e) => setBusinessData((d) => ({ ...d, ticketHeader: e.target.value }))}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-app-muted mb-1.5">
                      Pie del ticket
                    </label>
                    <input
                      type="text"
                      value={businessData.ticketFooter}
                      onChange={(e) => setBusinessData((d) => ({ ...d, ticketFooter: e.target.value }))}
                      className="input"
                      placeholder="Texto opcional"
                    />
                  </div>
                </div>
              </section>

              {/* Pagos */}
              <section className="bg-app-card border border-app-border rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center">
                    <FiDollarSign className="text-primary-400" size={20} />
                  </div>
                  <h3 className="font-semibold text-lg">Configuración de Pagos</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-app-bg rounded-xl border border-app-border">
                    <label className="block text-sm font-medium text-app-muted mb-1.5">
                      Recargo Transferencia General (%)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={businessData.transferFeePercent}
                        onChange={(e) => setBusinessData((d) => ({ ...d, transferFeePercent: Number(e.target.value) }))}
                        className="input pr-10"
                        min={0}
                        max={100}
                        step={0.5}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-app-muted">%</span>
                    </div>
                    <p className="text-xs text-app-muted mt-2">Se aplica a toda la compra</p>
                  </div>
                  <div className="p-4 bg-app-bg rounded-xl border border-app-border">
                    <label className="block text-sm font-medium text-app-muted mb-1.5">
                      🚬 Recargo Cigarrillos (%)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={businessData.cigaretteTransferFeePercent}
                        onChange={(e) => setBusinessData((d) => ({ ...d, cigaretteTransferFeePercent: Number(e.target.value) }))}
                        className="input pr-10"
                        min={0}
                        max={100}
                        step={0.5}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-app-muted">%</span>
                    </div>
                    <p className="text-xs text-app-muted mt-2">Adicional para cigarrillos</p>
                  </div>
                </div>
              </section>

              {/* Productos */}
              <section className="bg-app-card border border-app-border rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center">
                    <FiPackage className="text-primary-400" size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Opciones de Productos</h3>
                    <p className="text-sm text-app-muted">Campos en el formulario de productos</p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <label className="flex items-center gap-4 p-4 bg-app-bg rounded-xl border border-app-border cursor-pointer hover:border-primary-500/50 transition-colors">
                    <input
                      type="checkbox"
                      checked={businessData.showCostPrice}
                      onChange={(e) => setBusinessData((d) => ({ ...d, showCostPrice: e.target.checked }))}
                      className="w-5 h-5 rounded border-app-border bg-app-bg text-primary-500 focus:ring-primary-500"
                    />
                    <div className="flex-1">
                      <p className="font-medium">Mostrar precio de costo</p>
                      <p className="text-sm text-app-muted">Registrar el precio de costo de los productos</p>
                    </div>
                  </label>
                  
                  <label className="flex items-center gap-4 p-4 bg-app-bg rounded-xl border border-app-border cursor-pointer hover:border-primary-500/50 transition-colors">
                    <input
                      type="checkbox"
                      checked={businessData.showUnitsPerBox}
                      onChange={(e) => setBusinessData((d) => ({ ...d, showUnitsPerBox: e.target.checked }))}
                      className="w-5 h-5 rounded border-app-border bg-app-bg text-primary-500 focus:ring-primary-500"
                    />
                    <div className="flex-1">
                      <p className="font-medium">Mostrar unidades por caja</p>
                      <p className="text-sm text-app-muted">Configurar cuántas unidades vienen por caja/paquete</p>
                    </div>
                  </label>
                </div>
              </section>

              <button type="submit" className="btn-primary flex items-center gap-2 px-6 py-3">
                <FiSave size={18} />
                Guardar Cambios
              </button>
            </form>
          )}

          {/* ===== TAB SEGURIDAD ===== */}
          {activeTab === 'security' && (
            <div className="max-w-lg">
              <section className="bg-app-card border border-app-border rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center">
                    <FiLock className="text-primary-400" size={20} />
                  </div>
                  <h3 className="font-semibold text-lg">Cambiar Contraseña</h3>
                </div>
                
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-app-muted mb-1.5">
                      Contraseña actual
                    </label>
                    <input
                      type="password"
                      value={securityData.oldPassword}
                      onChange={(e) => setSecurityData((d) => ({ ...d, oldPassword: e.target.value }))}
                      className="input"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-app-muted mb-1.5">
                      Nueva contraseña
                    </label>
                    <input
                      type="password"
                      value={securityData.newPassword}
                      onChange={(e) => setSecurityData((d) => ({ ...d, newPassword: e.target.value }))}
                      className="input"
                      required
                      minLength={6}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-app-muted mb-1.5">
                      Confirmar nueva contraseña
                    </label>
                    <input
                      type="password"
                      value={securityData.confirmPassword}
                      onChange={(e) => setSecurityData((d) => ({ ...d, confirmPassword: e.target.value }))}
                      className="input"
                      required
                    />
                  </div>
                  <button type="submit" className="btn-primary flex items-center gap-2 mt-2">
                    <FiShield size={18} />
                    Actualizar Contraseña
                  </button>
                </form>
              </section>
            </div>
          )}

          {/* ===== TAB ACERCA DE ===== */}
          {activeTab === 'about' && (
            <div className="space-y-6">
              {/* Logo y versión */}
              <section className="bg-app-card border border-app-border rounded-2xl p-8 text-center">
                <div className="text-6xl mb-4">🏪</div>
                <h2 className="text-3xl font-bold mb-1" style={{ color: ACCENT_COLORS[accentColor].primary }}>
                  StockPOS
                </h2>
                <p className="text-app-muted mb-1">Sistema de Gestión de Stock y Ventas</p>
                <p className="text-sm text-app-muted">Versión {currentVersion}</p>
              </section>

              {/* Actualizaciones */}
              <section className="bg-app-card border border-app-border rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center">
                    <FiDownload className="text-primary-400" size={20} />
                  </div>
                  <h3 className="font-semibold text-lg">Actualizaciones</h3>
                </div>

                {updateStatus === 'idle' && (
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-app-muted">Verifica si hay nuevas versiones</p>
                    <button onClick={checkForUpdates} className="btn-primary flex items-center gap-2">
                      <FiRefreshCw size={16} />
                      Buscar
                    </button>
                  </div>
                )}

                {updateStatus === 'checking' && (
                  <div className="flex items-center gap-3 text-primary-400">
                    <FiRefreshCw className="animate-spin" size={20} />
                    <span>Verificando...</span>
                  </div>
                )}

                {updateStatus === 'available' && updateInfo && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-stock-ok">
                      <FiCheckCircle size={20} />
                      <span className="font-medium">Nueva versión v{updateInfo.version}</span>
                    </div>
                    <button onClick={downloadUpdate} className="btn-primary flex items-center gap-2">
                      <FiDownload size={16} />
                      Descargar
                    </button>
                  </div>
                )}

                {updateStatus === 'downloading' && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-primary-400">
                      <FiDownload size={20} />
                      <span>Descargando...</span>
                    </div>
                    <div className="w-full bg-app-border rounded-full h-2.5">
                      <div
                        className="bg-primary-500 h-2.5 rounded-full transition-all"
                        style={{ width: `${downloadProgress}%` }}
                      />
                    </div>
                    <p className="text-sm text-app-muted text-center">{downloadProgress.toFixed(0)}%</p>
                  </div>
                )}

                {updateStatus === 'downloaded' && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-stock-ok">
                      <FiCheckCircle size={20} />
                      <span className="font-medium">Lista para instalar (v{updateInfo?.version})</span>
                    </div>
                    <p className="text-sm text-app-muted">La app se reiniciará para aplicar cambios</p>
                    <button onClick={installUpdate} className="btn-primary flex items-center gap-2">
                      <FiRefreshCw size={16} />
                      Instalar y reiniciar
                    </button>
                  </div>
                )}

                {updateStatus === 'error' && (
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-stock-critical">Error al verificar</p>
                    <button onClick={checkForUpdates} className="btn-secondary flex items-center gap-2">
                      <FiRefreshCw size={16} />
                      Reintentar
                    </button>
                  </div>
                )}
              </section>

              {/* Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-app-card border border-app-border rounded-xl p-4">
                  <p className="text-sm text-app-muted mb-1">Tecnologías</p>
                  <p className="font-medium">Electron + React + SQLite</p>
                </div>
                <div className="bg-app-card border border-app-border rounded-xl p-4">
                  <p className="text-sm text-app-muted mb-1">Usuario actual</p>
                  <p className="font-medium">{user?.name}</p>
                  <p className="text-xs text-app-muted">{user?.role === 'ADMIN' ? 'Administrador' : 'Cajero'}</p>
                </div>
              </div>

              {/* Características */}
              <section className="bg-app-card border border-app-border rounded-2xl p-6">
                <h4 className="font-semibold mb-4">Características principales</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  {[
                    'Punto de venta ultra rápido',
                    'Escaneo de código de barras',
                    'Control de inventario en tiempo real',
                    'Reportes de ventas y productos',
                    'Gestión de usuarios y permisos',
                    'Sistema de clientes y fiado',
                    'Caja registradora con cierres',
                    'Actualizaciones automáticas',
                  ].map((feature, i) => (
                    <div key={i} className="flex items-center gap-2 text-app-muted">
                      <FiCheck className="text-stock-ok flex-shrink-0" size={16} />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </section>

              <p className="text-center text-sm text-app-muted py-4">
                Desarrollado con ❤️ para comerciantes
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
