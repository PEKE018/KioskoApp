import { app } from 'electron';
import path from 'path';

/**
 * ÚNICA FUENTE DE VERDAD para las rutas de la base de datos y sus backups.
 *
 * Antes de este módulo, `init.ts`, `backupHandlers.ts` y `autoUpdater.ts`
 * calculaban la ruta de la DB cada uno por su cuenta (código duplicado en
 * 3 lugares). A partir de ahora, TODOS deben importar estas funciones.
 *
 * REGLA DE ORO: esta ruta de producción no debe volver a cambiar. Si en el
 * futuro cambia `productName` en package.json, `app.getPath('userData')`
 * cambia con él, pero el NOMBRE DE ARCHIVO ('stockpos.db') se mantiene fijo
 * para que la lógica de detección legacy (`legacyMigration.ts`) siga
 * funcionando de forma predecible.
 */

export const DB_FILE_NAME = 'stockpos.db';
export const BACKUP_DIR_NAME = 'backups';
export const DOCUMENTS_BACKUP_DIR_NAME = 'stockpos-backups';

export function isDevMode(): boolean {
  return process.env.NODE_ENV === 'development' || !app.isPackaged;
}

/**
 * Ruta oficial y estable de la base de datos de producción de StockPOS.
 */
export function getProductionDbPath(): string {
  return isDevMode()
    ? path.join(__dirname, '../../../prisma/stockpos.db')
    : path.join(app.getPath('userData'), DB_FILE_NAME);
}

/**
 * Carpeta donde se guardan los backups automáticos/manuales de la DB actual.
 */
export function getBackupDir(): string {
  return isDevMode()
    ? path.join(__dirname, '../../../backups')
    : path.join(app.getPath('userData'), BACKUP_DIR_NAME);
}

/**
 * Copia adicional de backups dentro de la carpeta Documentos del usuario,
 * para que sobrevivan incluso si se borra la carpeta de datos de la app.
 */
export function getDocumentsBackupDir(): string {
  return path.join(app.getPath('documents'), DOCUMENTS_BACKUP_DIR_NAME);
}

/**
 * Carpeta base donde Electron guarda los datos de todas las apps
 * (%APPDATA% en Windows). Se usa para buscar instalaciones legacy de
 * KioskoApp bajo otros nombres de carpeta.
 */
export function getAppDataDir(): string {
  return app.getPath('appData');
}
