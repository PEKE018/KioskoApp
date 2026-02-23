import { useState, useEffect, useCallback } from 'react';
import { FiDownload, FiX, FiRefreshCw, FiCheckCircle } from 'react-icons/fi';

interface UpdateInfo {
  version?: string;
  releaseNotes?: string;
}

interface CheckResult {
  success: boolean;
  updateAvailable?: boolean;
  version?: string;
  error?: string;
}

interface DownloadResult {
  success: boolean;
  error?: string;
}

type UpdateStatus = 'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'error';

export default function UpdateNotification() {
  const [status, setStatus] = useState<UpdateStatus>('idle');
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [progress, setProgress] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Función para verificar actualizaciones manualmente
  const checkForUpdates = useCallback(async () => {
    try {
      console.log('[UpdateNotification] Verificando actualizaciones...');
      setStatus('checking');
      const result = await window.api.updater.check() as CheckResult;
      console.log('[UpdateNotification] Resultado:', result);
      
      if (result.success && result.updateAvailable) {
        setUpdateInfo({ version: result.version });
        setStatus('available');
        setDismissed(false);
      } else {
        // No hay actualización disponible - volver a idle
        setStatus('idle');
      }
    } catch (error) {
      console.error('[UpdateNotification] Error al verificar:', error);
      setStatus('idle');
    }
  }, []);

  useEffect(() => {
    // Escuchar eventos de actualización
    window.api.updater.onUpdateAvailable((info: unknown) => {
      console.log('[UpdateNotification] Evento update-available:', info);
      const data = info as UpdateInfo;
      setUpdateInfo(data);
      setStatus('available');
      setDismissed(false);
    });

    window.api.updater.onDownloadProgress((progressInfo: unknown) => {
      const data = progressInfo as { percent?: number };
      setStatus('downloading');
      setProgress(data.percent || 0);
    });

    window.api.updater.onUpdateDownloaded((info: unknown) => {
      console.log('[UpdateNotification] Evento update-downloaded:', info);
      const data = info as UpdateInfo;
      setUpdateInfo(data);
      setStatus('downloaded');
    });

    // Escuchar evento de error
    if (window.api.updater.onUpdateError) {
      window.api.updater.onUpdateError((error: unknown) => {
        console.error('[UpdateNotification] Error de actualización:', error);
        setStatus('error');
        setErrorMsg(String(error) || 'Error desconocido');
      });
    }

    // Verificar actualizaciones 5 segundos después de montar el componente
    const initialCheck = setTimeout(() => {
      checkForUpdates();
    }, 5000);

    // Verificar cada hora
    const interval = setInterval(() => {
      checkForUpdates();
    }, 60 * 60 * 1000);

    return () => {
      clearTimeout(initialCheck);
      clearInterval(interval);
    };
  }, [checkForUpdates]);

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
    await window.api.updater.install();
  };

  const handleRetry = () => {
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
      <div className="bg-kiosko-card border border-primary-500/50 rounded-xl shadow-2xl shadow-primary-500/20 overflow-hidden">
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
              onClick={() => setDismissed(true)}
              className="text-kiosko-muted hover:text-white transition-colors"
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
              <p className="text-xs text-kiosko-muted mb-4">
                Hay una nueva versión de KioskoApp disponible
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
              <p className="text-xs text-kiosko-muted text-center">
                {progress > 0 
                  ? `${progress.toFixed(0)}% completado` 
                  : 'Iniciando descarga (~117 MB)...'}
              </p>
              <p className="text-xs text-kiosko-muted text-center mt-1 opacity-70">
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
              <p className="text-xs text-kiosko-muted mb-4">
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
              <p className="text-xs text-kiosko-muted mb-4">
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
