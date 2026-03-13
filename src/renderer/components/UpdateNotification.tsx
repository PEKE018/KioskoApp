import { useState, useEffect, useCallback } from 'react';
import { FiDownload, FiX, FiRefreshCw, FiCheckCircle } from 'react-icons/fi';
import {
  LAST_CHECKED_VERSION_KEY,
  DISMISSED_VERSION_KEY,
  clearPendingUpdateIfInstalled,
  getPendingUpdate,
  setPendingUpdate,
} from '../utils/updateState';

interface UpdateInfo {
  version?: string;
  releaseNotes?: string;
}

interface CheckResult {
  success: boolean;
  updateAvailable?: boolean;
  version?: string;
  currentVersion?: string;
  error?: string;
}

interface DownloadResult {
  success: boolean;
  error?: string;
}

interface VersionResult {
  success?: boolean;
  version?: string;
}

interface CashRegisterResult {
  success: boolean;
  data?: { id: string } | null;
}

type UpdateStatus = 'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'error';

export default function UpdateNotification() {
  const [status, setStatus] = useState<UpdateStatus>('idle');
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [progress, setProgress] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const markVersionAsHandled = useCallback((version: string) => {
    localStorage.setItem(DISMISSED_VERSION_KEY, version);
  }, []);

  // Verificar si una versión ya fue descartada o verificada
  const isVersionAlreadyHandled = useCallback((version: string): boolean => {
    const dismissedVersion = localStorage.getItem(DISMISSED_VERSION_KEY);
    const lastCheckedVersion = localStorage.getItem(LAST_CHECKED_VERSION_KEY);
    
    // Si el usuario descartó esta versión específica, no mostrar
    if (dismissedVersion === version) {
      console.log('[UpdateNotification] Versión ya descartada:', version);
      return true;
    }
    
    // Si ya verificamos y no hay actualización para esta versión, no volver a molestar
    if (lastCheckedVersion === version) {
      console.log('[UpdateNotification] Versión ya verificada como actual:', version);
      return true;
    }
    
    return false;
  }, []);

  // Función para verificar actualizaciones manualmente
  const checkForUpdates = useCallback(async () => {
    try {
      console.log('[UpdateNotification] Verificando actualizaciones...');
      setStatus('checking');
      const result = await window.api.updater.check() as CheckResult;
      console.log('[UpdateNotification] Resultado:', result);
      
      if (result.success && result.updateAvailable && result.version) {
        // Solo mostrar si es una versión que no hemos descartado antes
        if (!isVersionAlreadyHandled(result.version)) {
          setUpdateInfo({ version: result.version });
          setErrorMsg('');
          setStatus('available');
          setDismissed(false);
        } else {
          // Ya manejamos esta versión, no mostrar
          setStatus('idle');
        }
      } else if (result.success && !result.updateAvailable) {
        // No hay actualización - guardar versión actual como verificada
        // para no volver a verificar hasta que salga una nueva
        const currentResult = await window.api.updater.getCurrentVersion() as VersionResult;
        if (currentResult?.version) {
          clearPendingUpdateIfInstalled(currentResult.version);
          localStorage.setItem(LAST_CHECKED_VERSION_KEY, currentResult.version);
          console.log('[UpdateNotification] Guardada versión actual:', currentResult.version);
        }
        setDismissed(false);
        setStatus('idle');
      } else {
        setStatus('idle');
      }
    } catch (error) {
      console.error('[UpdateNotification] Error al verificar:', error);
      setStatus('idle');
    }
  }, [isVersionAlreadyHandled]);

  // Función para descartar y recordar
  const handleDismiss = useCallback(() => {
    if (updateInfo?.version) {
      // Guardar que el usuario descartó esta versión específica
      markVersionAsHandled(updateInfo.version);
      console.log('[UpdateNotification] Usuario descartó versión:', updateInfo.version);
    }
    setDismissed(true);
  }, [markVersionAsHandled, updateInfo?.version]);

  useEffect(() => {
    // Escuchar eventos de actualización
    const offAvailable = window.api.updater.onUpdateAvailable((info: unknown) => {
      console.log('[UpdateNotification] Evento update-available:', info);
      const data = info as UpdateInfo;
      
      // Solo mostrar si no fue descartada
      if (data.version && !isVersionAlreadyHandled(data.version)) {
        setPendingUpdate({
          version: data.version,
          releaseNotes: data.releaseNotes,
          status: 'available',
        });
        setUpdateInfo(data);
        setErrorMsg('');
        setStatus('available');
        setDismissed(false);
      }
    });

    const offProgress = window.api.updater.onDownloadProgress((progressInfo: unknown) => {
      const data = progressInfo as { percent?: number };
      setStatus('downloading');
      setProgress(data.percent || 0);
    });

    const offDownloaded = window.api.updater.onUpdateDownloaded((info: unknown) => {
      console.log('[UpdateNotification] Evento update-downloaded:', info);
      const data = info as UpdateInfo;
      if (data.version) {
        setPendingUpdate({
          version: data.version,
          releaseNotes: data.releaseNotes,
          status: 'downloaded',
        });
      }
      setUpdateInfo(data);
      setStatus('downloaded');
      
      // Limpiar versión descartada ya que se descargó
      if (data.version) {
        localStorage.removeItem(DISMISSED_VERSION_KEY);
      }
    });

    // Escuchar evento de error
    let offError = () => {};
    if (window.api.updater.onUpdateError) {
      offError = window.api.updater.onUpdateError((error: unknown) => {
        console.error('[UpdateNotification] Error de actualización:', error);
        if (updateInfo?.version) {
          markVersionAsHandled(updateInfo.version);
          setDismissed(true);
        }
        setStatus('error');
        setErrorMsg(typeof error === 'object' && error !== null && 'message' in error ? String((error as { message?: string }).message) : String(error) || 'Error desconocido');
      });
    }

    // Verificar actualizaciones 5 segundos después de montar el componente
    const initialCheck = setTimeout(() => {
      checkForUpdates();
    }, 5000);

    // Verificar cada hora (pero solo mostrará si hay versión nueva no descartada)
    const interval = setInterval(() => {
      checkForUpdates();
    }, 60 * 60 * 1000);

    return () => {
      clearTimeout(initialCheck);
      clearInterval(interval);
      offAvailable();
      offProgress();
      offDownloaded();
      offError();
    };
  }, [checkForUpdates, isVersionAlreadyHandled, markVersionAsHandled, updateInfo?.version]);

  const handleDownload = async () => {
    try {
      setStatus('downloading');
      setProgress(0);
      const result = await window.api.updater.download() as DownloadResult;
      if (!result.success) {
        console.error('[UpdateNotification] Error al descargar:', result.error);
        setStatus('error');
        setErrorMsg(result.error || 'Error al descargar');
      }
    } catch (error) {
      console.error('[UpdateNotification] Error al descargar:', error);
      setStatus('error');
      setErrorMsg('Error al iniciar descarga');
    }
  };

  const handleInstall = async () => {
    const cashResult = await window.api.cashRegister.getCurrent() as CashRegisterResult;
    if (cashResult.success && cashResult.data) {
      setStatus('error');
      setErrorMsg('Cierre la caja antes de instalar una actualización.');
      return;
    }

    await window.api.updater.install();
  };

  const handleRetry = () => {
    const pendingUpdate = getPendingUpdate();
    if (pendingUpdate) {
      setUpdateInfo({ version: pendingUpdate.version, releaseNotes: pendingUpdate.releaseNotes });
      setStatus(pendingUpdate.status);
      setDismissed(false);
      setErrorMsg('');
      return;
    }

    setStatus('idle');
    setErrorMsg('');
    checkForUpdates();
  };

  // No mostrar si está en idle, checking o fue descartado
  if (status === 'idle' || status === 'checking' || dismissed) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm animate-enter">
      <div className="bg-app-card border border-primary-500/50 rounded-xl shadow-2xl shadow-primary-500/20 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-primary-500/10 border-b border-primary-500/30">
          <div className="flex items-center gap-2 text-primary-400">
            <FiDownload size={18} />
            <span className="font-semibold">
              {status === 'error' ? 'Error de actualización' : 'Actualización disponible'}
            </span>
          </div>
          {status !== 'downloading' && (
            <button
              onClick={handleDismiss}
              className="text-app-muted hover:text-white transition-colors"
            >
              <FiX size={18} />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          {status === 'available' && (
            <>
              <p className="text-sm mb-1">
                Nueva versión <span className="font-bold text-primary-400">v{updateInfo?.version}</span>
              </p>
              <p className="text-xs text-app-muted mb-4">
                Hay una nueva versión de StockPOS disponible
              </p>
              <button
                onClick={handleDownload}
                className="w-full btn-primary flex items-center justify-center gap-2"
              >
                <FiDownload size={16} />
                Descargar ahora
              </button>
            </>
          )}

          {status === 'downloading' && (
            <>
              <p className="text-sm mb-3 flex items-center gap-2">
                <FiRefreshCw className="animate-spin" size={16} />
                Descargando actualización...
              </p>
              <div className="w-full bg-slate-700 rounded-full h-2 mb-2">
                <div
                  className="bg-primary-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.max(progress, 2)}%` }}
                />
              </div>
              <p className="text-xs text-app-muted text-center">
                {progress > 0 
                  ? `${progress.toFixed(0)}% completado` 
                  : 'Iniciando descarga (~117 MB)...'}
              </p>
              <p className="text-xs text-app-muted text-center mt-1 opacity-70">
                Esto puede tomar varios minutos
              </p>
            </>
          )}

          {status === 'downloaded' && (
            <>
              <div className="flex items-center gap-2 text-green-400 mb-3">
                <FiCheckCircle size={18} />
                <span className="text-sm font-medium">¡Lista para instalar!</span>
              </div>
              <p className="text-xs text-app-muted mb-4">
                La actualización se descargó correctamente. 
                Reinicia para aplicar los cambios.
              </p>
              <button
                onClick={handleInstall}
                className="w-full bg-green-600 hover:bg-green-500 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <FiRefreshCw size={16} />
                Reiniciar y actualizar
              </button>
            </>
          )}

          {status === 'error' && (
            <>
              <p className="text-sm text-red-400 mb-2">
                No se pudo descargar la actualización
              </p>
              <p className="text-xs text-app-muted mb-4">
                {errorMsg || 'Intenta nuevamente más tarde'}
              </p>
              <button
                onClick={handleRetry}
                className="w-full btn-primary flex items-center justify-center gap-2"
              >
                <FiRefreshCw size={16} />
                Reintentar
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
