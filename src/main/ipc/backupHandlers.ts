/**
 * Sistema de Backup y Restauración para StockPOS
 * Permite crear, restaurar y gestionar backups de la base de datos
 */

import { ipcMain, dialog, app } from 'electron';
import path from 'path';
import fs from 'fs';
import { logger } from '../utils/logger';

// Obtener ruta de la base de datos
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
const dbPath = isDev 
  ? path.join(__dirname, '../../../prisma/stockpos.db')
  : path.join(app.getPath('userData'), 'stockpos.db');

const backupDir = isDev
  ? path.join(__dirname, '../../../backups')
  : path.join(app.getPath('userData'), 'backups');

interface BackupInfo {
  name: string;
  path: string;
  size: number;
  createdAt: string;
}

// Asegurar que existe el directorio de backups
function ensureBackupDir(): void {
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
}

// Generar nombre de archivo para backup
function generateBackupName(): string {
  const now = new Date();
  const dateStr = now.toISOString()
    .replace(/[:.]/g, '-')
    .replace('T', '_')
    .split('Z')[0];
  return `stockpos-backup-${dateStr}.db`;
}

// Crear backup de la base de datos
async function createBackup(customPath?: string): Promise<{ success: boolean; path?: string; error?: string }> {
  try {
    ensureBackupDir();

    // Verificar que la DB existe
    if (!fs.existsSync(dbPath)) {
      return { success: false, error: 'Base de datos no encontrada' };
    }

    const backupName = generateBackupName();
    const backupPath = customPath || path.join(backupDir, backupName);

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

    logger.info('Backup', `Backup creado exitosamente: ${backupName}`);
    
    return { success: true, path: backupPath };
  } catch (error) {
    logger.error('Backup', 'Error al crear backup', error);
    return { success: false, error: String(error) };
  }
}

// Restaurar backup
async function restoreBackup(backupPath: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Verificar que el backup existe
    if (!fs.existsSync(backupPath)) {
      return { success: false, error: 'Archivo de backup no encontrado' };
    }

    // Crear backup de seguridad antes de restaurar
    const safetyBackupName = `safety-backup-${Date.now()}.db`;
    const safetyBackupPath = path.join(backupDir, safetyBackupName);
    
    if (fs.existsSync(dbPath)) {
      fs.copyFileSync(dbPath, safetyBackupPath);
      logger.info('Backup', `Backup de seguridad creado: ${safetyBackupName}`);
    }

    // Restaurar la base de datos
    fs.copyFileSync(backupPath, dbPath);

    // Restaurar archivos WAL y SHM si existen en el backup
    const walPath = backupPath + '-wal';
    const shmPath = backupPath + '-shm';
    
    if (fs.existsSync(walPath)) {
      fs.copyFileSync(walPath, dbPath + '-wal');
    }
    if (fs.existsSync(shmPath)) {
      fs.copyFileSync(shmPath, dbPath + '-shm');
    }

    logger.info('Backup', `Base de datos restaurada desde: ${backupPath}`);
    
    return { success: true };
  } catch (error) {
    logger.error('Backup', 'Error al restaurar backup', error);
    return { success: false, error: String(error) };
  }
}

// Listar backups disponibles
function listBackups(): BackupInfo[] {
  try {
    ensureBackupDir();
    
    const files = fs.readdirSync(backupDir);
    const backups: BackupInfo[] = [];

    for (const file of files) {
      if (file.endsWith('.db') && file.startsWith('stockpos-backup-')) {
        const filePath = path.join(backupDir, file);
        const stats = fs.statSync(filePath);
        
        backups.push({
          name: file,
          path: filePath,
          size: stats.size,
          createdAt: stats.mtime.toISOString(),
        });
      }
    }

    // Ordenar por fecha (más reciente primero)
    backups.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return backups;
  } catch (error) {
    logger.error('Backup', 'Error al listar backups', error);
    return [];
  }
}

// Eliminar un backup
function deleteBackup(backupPath: string): boolean {
  try {
    if (fs.existsSync(backupPath)) {
      fs.unlinkSync(backupPath);
      
      // También eliminar archivos WAL y SHM si existen
      const walPath = backupPath + '-wal';
      const shmPath = backupPath + '-shm';
      
      if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
      if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);
      
      logger.info('Backup', `Backup eliminado: ${backupPath}`);
      return true;
    }
    return false;
  } catch (error) {
    logger.error('Backup', 'Error al eliminar backup', error);
    return false;
  }
}

// Limpiar backups antiguos (mantener últimos N)
function cleanOldBackups(keepCount: number = 10): number {
  try {
    const backups = listBackups();
    let deleted = 0;

    if (backups.length > keepCount) {
      const toDelete = backups.slice(keepCount);
      for (const backup of toDelete) {
        if (deleteBackup(backup.path)) {
          deleted++;
        }
      }
    }

    return deleted;
  } catch (error) {
    logger.error('Backup', 'Error al limpiar backups antiguos', error);
    return 0;
  }
}

// Exportar backup a ubicación seleccionada por usuario
async function exportBackup(): Promise<{ success: boolean; path?: string; error?: string }> {
  try {
    const result = await dialog.showSaveDialog({
      title: 'Exportar Backup',
      defaultPath: path.join(app.getPath('documents'), generateBackupName()),
      filters: [
        { name: 'Base de datos SQLite', extensions: ['db'] }
      ],
    });

    if (result.canceled || !result.filePath) {
      return { success: false, error: 'Operación cancelada' };
    }

    return await createBackup(result.filePath);
  } catch (error) {
    logger.error('Backup', 'Error al exportar backup', error);
    return { success: false, error: String(error) };
  }
}

// Importar backup desde ubicación seleccionada por usuario
async function importBackup(): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await dialog.showOpenDialog({
      title: 'Importar Backup',
      filters: [
        { name: 'Base de datos SQLite', extensions: ['db'] }
      ],
      properties: ['openFile'],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, error: 'Operación cancelada' };
    }

    // Confirmar la restauración
    const confirm = await dialog.showMessageBox({
      type: 'warning',
      title: 'Confirmar Restauración',
      message: '¿Está seguro de restaurar este backup?',
      detail: 'Se reemplazarán todos los datos actuales. Se creará un backup de seguridad automáticamente.',
      buttons: ['Cancelar', 'Restaurar'],
      defaultId: 0,
      cancelId: 0,
    });

    if (confirm.response !== 1) {
      return { success: false, error: 'Operación cancelada' };
    }

    return await restoreBackup(result.filePaths[0]);
  } catch (error) {
    logger.error('Backup', 'Error al importar backup', error);
    return { success: false, error: String(error) };
  }
}

// Registrar handlers IPC
export function registerBackupHandlers(): void {
  // Crear backup automático
  ipcMain.handle('backup:create', async () => {
    const result = await createBackup();
    cleanOldBackups(10); // Mantener últimos 10 backups
    return result;
  });

  // Restaurar backup
  ipcMain.handle('backup:restore', async (_, backupPath: string) => {
    return await restoreBackup(backupPath);
  });

  // Listar backups
  ipcMain.handle('backup:list', async () => {
    return { success: true, data: listBackups() };
  });

  // Eliminar backup
  ipcMain.handle('backup:delete', async (_, backupPath: string) => {
    const success = deleteBackup(backupPath);
    return { success };
  });

  // Exportar a ubicación personalizada
  ipcMain.handle('backup:export', async () => {
    return await exportBackup();
  });

  // Importar desde archivo externo
  ipcMain.handle('backup:import', async () => {
    return await importBackup();
  });

  // Obtener directorio de backups
  ipcMain.handle('backup:getDir', async () => {
    ensureBackupDir();
    return { success: true, path: backupDir };
  });

  logger.info('Backup', 'Handlers de backup registrados');
}

// Función para backup automático al cerrar la app
export async function createAutoBackup(): Promise<void> {
  try {
    const result = await createBackup();
    if (result.success) {
      logger.info('Backup', 'Backup automático creado al cerrar');
      cleanOldBackups(10);
    }
  } catch (error) {
    logger.error('Backup', 'Error en backup automático', error);
  }
}

export { createBackup, restoreBackup, listBackups, deleteBackup, cleanOldBackups };
