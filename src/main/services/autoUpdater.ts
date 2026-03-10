/**
 * Sistema de Auto-Actualización para KioskoApp
 * Usa electron-updater para verificar y descargar actualizaciones
 */

import { autoUpdater } from 'electron-updater';
import { BrowserWindow, ipcMain, dialog, app } from 'electron';
import { logger } from '../utils/logger';
import fs from 'fs';
import path from 'path';

let mainWindow: BrowserWindow | null = null;

// Configurar auto-updater
export function setupAutoUpdater(window: BrowserWindow): void {
  mainWindow = window;

  // Configuración - Descargar automáticamente para que funcione sin UI
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true; // Instalar al cerrar

  // Logging
  autoUpdater.logger = {
    info: (message: unknown) => logger.info('Updater', String(message)),
    warn: (message: unknown) => logger.warn('Updater', String(message)),
    error: (message: unknown) => logger.error('Updater', String(message)),
    debug: (message: unknown) => logger.debug('Updater', String(message)),
  };

  // Eventos
  autoUpdater.on('checking-for-update', () => {
    logger.info('Updater', 'Verificando actualizaciones...');
    sendToRenderer('update-checking');
  });

  autoUpdater.on('update-available', (info) => {
    logger.info('Updater', 'Actualización disponible, descargando...', info);
    sendToRenderer('update-available', {
      version: info.version,
      releaseDate: info.releaseDate,
      releaseNotes: info.releaseNotes,
    });
  });

  autoUpdater.on('update-not-available', (info) => {
    logger.info('Updater', 'No hay actualizaciones disponibles', info);
    sendToRenderer('update-not-available', {
      version: info.version,
    });
  });

  autoUpdater.on('error', (err) => {
    logger.error('Updater', 'Error al actualizar', err);
    sendToRenderer('update-error', {
      message: err.message,
    });
  });

  autoUpdater.on('download-progress', (progress) => {
    logger.debug('Updater', `Descargando: ${progress.percent.toFixed(1)}%`);
    sendToRenderer('update-progress', {
      percent: progress.percent,
      bytesPerSecond: progress.bytesPerSecond,
      transferred: progress.transferred,
      total: progress.total,
    });
  });

  autoUpdater.on('update-downloaded', async (info) => {
    logger.info('Updater', 'Actualización descargada', info);
    
    // CRÍTICO: Crear backup preventivo antes de actualizar
    logger.info('Updater', 'Creando backup preventivo antes de actualizar...');
    try {
      const backupResult = await createPreUpdateBackup(info.version);
      if (backupResult.success) {
        logger.info('Updater', `Backup preventivo creado: ${backupResult.path}`);
      } else {
        logger.warn('Updater', 'No se pudo crear backup preventivo, pero continuando...');
      }
    } catch (error) {
      logger.error('Updater', 'Error en backup preventivo', error);
    }
    
    sendToRenderer('update-downloaded', {
      version: info.version,
      releaseNotes: info.releaseNotes,
    });

    // Mostrar diálogo nativo para reiniciar
    dialog.showMessageBox(mainWindow!, {
      type: 'info',
      title: 'Actualización lista',
      message: `Nueva versión ${info.version} descargada`,
      detail: 'La actualización se descargó correctamente. ¿Desea reiniciar ahora para aplicar los cambios?',
      buttons: ['Reiniciar ahora', 'Más tarde'],
      defaultId: 0,
      cancelId: 1,
    }).then((result) => {
      if (result.response === 0) {
        logger.info('Updater', 'Usuario eligió reiniciar para actualizar');
        autoUpdater.quitAndInstall(false, true);
      } else {
        logger.info('Updater', 'Usuario pospuso la actualización');
      }
    });
  });

  // Registrar handlers IPC
  registerUpdateHandlers();
}

// Enviar mensaje al renderer
function sendToRenderer(channel: string, data?: unknown): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, data);
  }
}

// Registrar handlers IPC para actualizaciones
function registerUpdateHandlers(): void {
  // Verificar actualizaciones
  ipcMain.handle('updater:check', async () => {
    try {
      const result = await autoUpdater.checkForUpdates();
      return { 
        success: true, 
        updateAvailable: result?.updateInfo?.version !== undefined,
        version: result?.updateInfo?.version,
      };
    } catch (error) {
      logger.error('Updater', 'Error al verificar actualizaciones', error);
      return { success: false, error: String(error) };
    }
  });

  // Descargar actualización
  ipcMain.handle('updater:download', async () => {
    try {
      await autoUpdater.downloadUpdate();
      return { success: true };
    } catch (error) {
      logger.error('Updater', 'Error al descargar actualización', error);
      return { success: false, error: String(error) };
    }
  });

  // Instalar actualización (reinicia la app)
  ipcMain.handle('updater:install', async () => {
    try {
      autoUpdater.quitAndInstall(false, true);
      return { success: true };
    } catch (error) {
      logger.error('Updater', 'Error al instalar actualización', error);
      return { success: false, error: String(error) };
    }
  });

  // Obtener versión actual
  ipcMain.handle('updater:getCurrentVersion', async () => {
    const { app } = require('electron');
    return { success: true, version: app.getVersion() };
  });

  logger.info('Updater', 'Handlers de actualización registrados');
}

// Verificar actualizaciones al inicio (con delay)
export function checkForUpdatesOnStartup(): void {
  // Esperar 10 segundos antes de verificar (para no bloquear el inicio)
  setTimeout(async () => {
    try {
      logger.info('Updater', 'Verificando actualizaciones al inicio...');
      await autoUpdater.checkForUpdates();
    } catch (error) {
      logger.warn('Updater', 'No se pudo verificar actualizaciones', error);
    }
  }, 10000);
}

// Configurar URL del servidor de actualizaciones
export function setUpdateFeedURL(url: string): void {
  autoUpdater.setFeedURL({
    provider: 'generic',
    url: url,
  });
  logger.info('Updater', `Feed URL configurada: ${url}`);
}

/**
 * Crear backup preventivo antes de actualizar
 * Este backup se guarda con un nombre especial para fácil identificación
 */
async function createPreUpdateBackup(newVersion: string): Promise<{ success: boolean; path?: string; error?: string }> {
  try {
    const dbPath = path.join(app.getPath('userData'), 'kioskoapp.db');
    const backupDir = path.join(app.getPath('userData'), 'backups');
    
    // Asegurar que existe el directorio de backups
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    // Verificar que la DB existe
    if (!fs.existsSync(dbPath)) {
      return { success: false, error: 'Base de datos no encontrada' };
    }
    
    // Nombre especial para backup pre-actualización
    const now = new Date();
    const dateStr = now.toISOString()
      .replace(/[:.]/g, '-')
      .replace('T', '_')
      .split('Z')[0];
    const backupName = `PRE-UPDATE-to-${newVersion}-${dateStr}.db`;
    const backupPath = path.join(backupDir, backupName);
    
    // Copiar archivo de base de datos
    fs.copyFileSync(dbPath, backupPath);
    
    // También copiar archivos WAL y SHM si existen (para integridad)
    const walPath = dbPath + '-wal';
    const shmPath = dbPath + '-shm';
    
    if (fs.existsSync(walPath)) {
      fs.copyFileSync(walPath, backupPath + '-wal');
    }
    if (fs.existsSync(shmPath)) {
      fs.copyFileSync(shmPath, backupPath + '-shm');
    }
    
    // También crear una copia en Documentos del usuario como respaldo adicional
    try {
      const documentsBackupDir = path.join(app.getPath('documents'), 'KioskoApp-Backups');
      if (!fs.existsSync(documentsBackupDir)) {
        fs.mkdirSync(documentsBackupDir, { recursive: true });
      }
      const documentsBackupPath = path.join(documentsBackupDir, backupName);
      fs.copyFileSync(dbPath, documentsBackupPath);
      logger.info('Updater', `Backup adicional en Documentos: ${documentsBackupPath}`);
    } catch (docError) {
      logger.warn('Updater', 'No se pudo crear backup en Documentos', docError);
    }
    
    logger.info('Updater', `Backup pre-actualización creado: ${backupName}`);
    return { success: true, path: backupPath };
  } catch (error) {
    logger.error('Updater', 'Error al crear backup pre-actualización', error);
    return { success: false, error: String(error) };
  }
}

// Para usar con GitHub Releases
export function setupGitHubReleases(owner: string, repo: string): void {
  autoUpdater.setFeedURL({
    provider: 'github',
    owner,
    repo,
  });
  logger.info('Updater', `Configurado para GitHub: ${owner}/${repo}`);
}

export default {
  setupAutoUpdater,
  checkForUpdatesOnStartup,
  setUpdateFeedURL,
  setupGitHubReleases,
};
