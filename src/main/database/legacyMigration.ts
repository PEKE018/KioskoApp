import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger';
import { createTables, tablesExist, runAdditiveMigrations } from './schemaMigrations';
import { getProductionDbPath, getBackupDir, getDocumentsBackupDir, getAppDataDir } from './dbPaths';

/**
 * Migración de bases de datos legacy de KioskoApp (<= 1.0.19) hacia la
 * ubicación oficial de StockPOS.
 *
 * DISEÑO:
 * - Las funciones de este archivo que reciben rutas explícitas (todas
 *   excepto `attemptLegacyMigration`) NO dependen de Electron y se pueden
 *   probar/ejecutar fuera de la app (ver src/tests/legacyMigration.test.ts).
 * - `attemptLegacyMigration()` es el único punto que usa `app.getPath(...)`
 *   y es lo que llama `init.ts` en el arranque real de la aplicación.
 * - NUNCA se escribe sobre el archivo legacy original. Siempre se trabaja
 *   sobre una copia de staging, y solo si todo sale bien esa copia pasa a
 *   ser la DB de producción.
 */

// ---------------------------------------------------------------------------
// Candidatos de ubicación legacy
// ---------------------------------------------------------------------------

export interface LegacyCandidate {
  dirName: string;
  fileNames: string[];
  note: string;
}

/**
 * Ubicaciones históricas conocidas de la base de datos de KioskoApp.
 *
 * - 'kiosko-app' / 'kioskoapp.db': CONFIRMADO por código activo del propio
 *   proyecto. `build/installer.nsh` (customInstall/customUnInstall) referencia
 *   literalmente "$APPDATA\kiosko-app\kioskoapp.db" para hacer backup antes
 *   de instalar/desinstalar. `package-lock.json` también conserva
 *   `"name": "kiosko-app"` de una versión previa al rebranding.
 * - 'KioskoApp' / 'kioskoapp.db': mencionado en README.md y
 *   docs/GUIA_PRODUCCION.md ("%APPDATA%/KioskoApp"), pero SIN respaldo en
 *   código real (puede ser documentación desactualizada). Se incluye de
 *   todas formas, sin asumir que sea la ubicación real: buscar una carpeta
 *   de más no tiene costo ni riesgo, ya que solo se lee.
 *
 * No se agregan más carpetas "por si acaso": cada entrada debe poder
 * justificarse con una referencia concreta del propio proyecto.
 */
export const LEGACY_CANDIDATES: LegacyCandidate[] = [
  {
    dirName: 'kiosko-app',
    fileNames: ['kioskoapp.db', 'stockpos.db'],
    note: 'Confirmado por build/installer.nsh y package-lock.json (nombre de paquete previo al rebranding a StockPOS).',
  },
  {
    dirName: 'KioskoApp',
    fileNames: ['kioskoapp.db', 'stockpos.db'],
    note: 'Mencionado en README.md / docs/GUIA_PRODUCCION.md. No confirmado por código; se revisa por precaución.',
  },
];

export interface LegacyMatch {
  path: string;
  note: string;
  size: number;
  mtime: Date;
}

/**
 * Busca bases de datos legacy dentro de `appDataDir`, recorriendo todos los
 * candidatos conocidos. No asume una sola ubicación: si encuentra varias,
 * devuelve la de mayor tamaño (más probabilidad de tener datos reales) y
 * deja un log de advertencia con el resto.
 */
export function findLegacyDatabase(appDataDir: string): LegacyMatch | null {
  const found: LegacyMatch[] = [];

  for (const candidate of LEGACY_CANDIDATES) {
    for (const fileName of candidate.fileNames) {
      const candidatePath = path.join(appDataDir, candidate.dirName, fileName);
      if (fs.existsSync(candidatePath)) {
        try {
          const stats = fs.statSync(candidatePath);
          if (stats.isFile()) {
            found.push({ path: candidatePath, note: candidate.note, size: stats.size, mtime: stats.mtime });
          }
        } catch (e) {
          logger.warn('DB', `[DB] No se pudo leer el candidato legacy ${candidatePath}`, e);
        }
      }
    }
  }

  if (found.length === 0) {
    return null;
  }

  found.sort((a, b) => b.size - a.size);

  if (found.length > 1) {
    logger.warn(
      'DB',
      `[DB] Se encontraron ${found.length} bases legacy candidatas: ${found.map(f => f.path).join(', ')}. Se usará la de mayor tamaño.`
    );
  }

  return found[0];
}

// ---------------------------------------------------------------------------
// Validación de archivo SQLite
// ---------------------------------------------------------------------------

/**
 * Verifica que el archivo tenga el header binario real de SQLite ("SQLite
 * format 3\0"), sin depender de Prisma. Evita tratar cualquier archivo .db
 * al azar como si fuera nuestra base de datos.
 */
export function isValidSqliteFile(filePath: string): boolean {
  try {
    const fd = fs.openSync(filePath, 'r');
    try {
      const buffer = Buffer.alloc(16);
      const bytesRead = fs.readSync(fd, buffer, 0, 16, 0);
      if (bytesRead < 15) return false;
      return buffer.toString('utf8', 0, 15) === 'SQLite format 3';
    } finally {
      fs.closeSync(fd);
    }
  } catch {
    return false;
  }
}

function createClientForFile(filePath: string): PrismaClient {
  const normalized = filePath.replace(/\\/g, '/');
  return new PrismaClient({
    datasources: { db: { url: `file:${normalized}` } },
  });
}

/**
 * Tablas que deben existir en CUALQUIER versión de la aplicación, incluida
 * KioskoApp 1.0.19 (son las tablas fundacionales del proyecto: usuarios,
 * productos y categorías). Tablas agregadas en versiones posteriores
 * (ComboComponent, columnas nuevas, etc.) NO se exigen aquí: su ausencia se
 * resuelve con `runAdditiveMigrations`, no invalida la base.
 */
export const CORE_LEGACY_TABLES = ['User', 'Product', 'Category'];

export interface LegacyValidationResult {
  valid: boolean;
  foundTables: string[];
  reason?: string;
}

/**
 * Valida que el archivo sea una SQLite real y tenga al menos las tablas
 * fundacionales del proyecto. Se usa siempre sobre una COPIA, nunca sobre
 * el archivo legacy original.
 */
export async function validateLegacyDatabase(filePath: string): Promise<LegacyValidationResult> {
  if (!isValidSqliteFile(filePath)) {
    return { valid: false, foundTables: [], reason: 'invalid_sqlite_header' };
  }

  const client = createClientForFile(filePath);
  try {
    await client.$connect();
    const rows = await client.$queryRawUnsafe<Array<{ name: string }>>(
      `SELECT name FROM sqlite_master WHERE type='table'`
    );
    const foundTables = rows.map(r => r.name);
    const missingCore = CORE_LEGACY_TABLES.filter(t => !foundTables.includes(t));

    if (missingCore.length > 0) {
      return { valid: false, foundTables, reason: `missing_core_tables:${missingCore.join(',')}` };
    }

    return { valid: true, foundTables };
  } catch (e) {
    return { valid: false, foundTables: [], reason: `query_error:${String(e)}` };
  } finally {
    await client.$disconnect().catch(() => undefined);
  }
}

// ---------------------------------------------------------------------------
// Métricas
// ---------------------------------------------------------------------------

/**
 * Entidades a medir antes/después de migrar, tal como fueron pedidas:
 * Product, Category, Sale, SaleItem, User, Customer, StockMovement,
 * CashRegister, CreditPayment, ComboComponent.
 */
export const METRIC_TABLES = [
  'Product',
  'Category',
  'Sale',
  'SaleItem',
  'User',
  'Customer',
  'StockMovement',
  'CashRegister',
  'CreditPayment',
  'ComboComponent',
] as const;

export type MigrationMetrics = Record<(typeof METRIC_TABLES)[number], number>;

/**
 * Cuenta filas por tabla. Si una tabla no existe todavía en esa versión de
 * la base (por ejemplo ComboComponent en una KioskoApp vieja), se cuenta
 * como 0 en lugar de fallar: es información válida, no un error.
 */
export async function collectMetricsFromFile(
  filePath: string,
  existingClient?: PrismaClient
): Promise<MigrationMetrics> {
  const client = existingClient ?? createClientForFile(filePath);
  const shouldDisconnect = !existingClient;

  if (!existingClient) {
    await client.$connect();
  }

  const metrics = {} as MigrationMetrics;

  for (const table of METRIC_TABLES) {
    try {
      const rows = await client.$queryRawUnsafe<Array<{ c: number | bigint }>>(
        `SELECT COUNT(*) as c FROM "${table}"`
      );
      metrics[table] = Number(rows[0]?.c ?? 0);
    } catch {
      metrics[table] = 0;
    }
  }

  if (shouldDisconnect) {
    await client.$disconnect().catch(() => undefined);
  }

  return metrics;
}

/**
 * Entidades críticas: si alguna tenía datos y después de migrar quedó en
 * cero, la migración se considera fallida (aunque el resto de los conteos
 * puedan variar legítimamente por cambios de esquema).
 */
const CRITICAL_ENTITIES: Array<keyof MigrationMetrics> = ['Product', 'Sale', 'User', 'Category'];

export function checkInvariants(before: MigrationMetrics, after: MigrationMetrics): string | null {
  for (const key of CRITICAL_ENTITIES) {
    if ((before[key] ?? 0) > 0 && (after[key] ?? 0) === 0) {
      return `invariant_violated:${key} paso de ${before[key]} a 0`;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Backup
// ---------------------------------------------------------------------------

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function formatTimestampForBackupName(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}-${pad2(d.getHours())}${pad2(
    d.getMinutes()
  )}${pad2(d.getSeconds())}`;
}

/**
 * Copia un archivo (y sus -wal/-shm si existen) a `backupDir` con un nombre
 * único con timestamp, del estilo `kioskoapp-pre-migration-2026-09-25-173000.db`.
 * Nunca sobrescribe un backup existente: si hay colisión de nombre, lanza.
 * NUNCA modifica ni mueve el archivo original.
 */
export function backupFile(sourcePath: string, backupDir: string, prefix: string): string {
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const backupName = `${prefix}-${formatTimestampForBackupName(new Date())}.db`;
  const backupPath = path.join(backupDir, backupName);

  if (fs.existsSync(backupPath)) {
    // Colisión de timestamp (muy improbable, resolución de segundos). Se
    // agrega un sufijo para nunca sobrescribir un backup existente.
    const uniquePath = path.join(backupDir, `${prefix}-${formatTimestampForBackupName(new Date())}-${Date.now()}.db`);
    fs.copyFileSync(sourcePath, uniquePath);
    return uniquePath;
  }

  fs.copyFileSync(sourcePath, backupPath);

  for (const ext of ['-wal', '-shm']) {
    if (fs.existsSync(sourcePath + ext)) {
      fs.copyFileSync(sourcePath + ext, backupPath + ext);
    }
  }

  return backupPath;
}

function safeUnlink(filePath: string): void {
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    for (const ext of ['-wal', '-shm']) {
      if (fs.existsSync(filePath + ext)) fs.unlinkSync(filePath + ext);
    }
  } catch (e) {
    logger.warn('DB', `[DB] No se pudo limpiar archivo temporal ${filePath}`, e);
  }
}

// ---------------------------------------------------------------------------
// Migración principal (testeable, sin dependencia de Electron)
// ---------------------------------------------------------------------------

export interface LegacyMigrationOptions {
  legacyPath: string;
  targetDbPath: string;
  backupDir: string;
  documentsBackupDir?: string;
}

export interface LegacyMigrationResult {
  attempted: boolean;
  migrated: boolean;
  legacyPath?: string;
  backupPath?: string;
  reason?: string;
  metricsBefore?: MigrationMetrics;
  metricsAfter?: MigrationMetrics;
}

/**
 * Migra un archivo legacy específico hacia `targetDbPath`, con backup,
 * validación y verificación de métricas. No usa Electron: recibe todas las
 * rutas como parámetros, por lo que se puede invocar directamente desde
 * tests o desde un script de prueba manual con una copia real de un
 * cliente (ver scripts de test en src/tests/legacyMigration.test.ts).
 *
 * La DB legacy original (`legacyPath`) NUNCA se modifica ni se borra en
 * ningún punto de este flujo, sea el resultado exitoso o fallido.
 */
export async function migrateLegacyFile(options: LegacyMigrationOptions): Promise<LegacyMigrationResult> {
  const { legacyPath, targetDbPath, backupDir } = options;

  logger.info('DB', `[DB] DB legacy encontrada: ${legacyPath}`);

  // GUARDA: jamás reemplazar una DB de destino que ya existe (renameSync la
  // sobrescribiría, también en Windows). La prioridad "DB moderna primero" la
  // aplica attemptLegacyMigration(), pero esta función es pública, así que
  // se protege también acá.
  if (fs.existsSync(targetDbPath)) {
    logger.error('DB', `[DB] MIGRACIÓN FALLIDA: ya existe una DB en el destino (${targetDbPath}); no se reemplaza.`);
    logger.info('DB', `[DB] DB original preservada: ${legacyPath}`);
    return { attempted: true, migrated: false, legacyPath, reason: 'target_exists' };
  }

  // 1. Backup de seguridad del original ANTES de tocar nada.
  let backupPath: string;
  try {
    backupPath = backupFile(legacyPath, backupDir, 'kioskoapp-pre-migration');
    logger.info('DB', `[DB] Backup creado: ${backupPath}`);
  } catch (e) {
    logger.error('DB', '[DB] MIGRACIÓN FALLIDA: no se pudo crear el backup de seguridad de la DB legacy', e);
    logger.info('DB', `[DB] DB original preservada: ${legacyPath}`);
    return { attempted: true, migrated: false, legacyPath, reason: 'backup_failed' };
  }

  // Copia adicional del backup en Documentos, si se especificó esa carpeta.
  if (options.documentsBackupDir) {
    try {
      const docsBackupPath = backupFile(legacyPath, options.documentsBackupDir, 'kioskoapp-pre-migration');
      logger.info('DB', `[DB] Backup adicional creado en Documentos: ${docsBackupPath}`);
    } catch (e) {
      logger.warn('DB', '[DB] No se pudo crear el backup adicional en Documentos (no es crítico)', e);
    }
  }

  // 2. Trabajar SIEMPRE sobre una copia de staging, nunca sobre el original.
  const stagingPath = `${targetDbPath}.migrating-staging.db`;
  safeUnlink(stagingPath);
  try {
    // El staging vive junto al destino final (mismo volumen → el rename
    // posterior es atómico), así que la carpeta debe existir desde ya.
    fs.mkdirSync(path.dirname(targetDbPath), { recursive: true });
    fs.copyFileSync(legacyPath, stagingPath);
  } catch (e) {
    logger.error('DB', '[DB] MIGRACIÓN FALLIDA: no se pudo copiar la DB legacy a un archivo de staging', e);
    logger.info('DB', `[DB] DB original preservada: ${legacyPath}`);
    return { attempted: true, migrated: false, legacyPath, backupPath, reason: 'staging_copy_failed' };
  }

  // 3. Validar estructura sobre la copia de staging.
  logger.info('DB', `[DB] Validando DB: ${stagingPath}`);
  const validation = await validateLegacyDatabase(stagingPath);
  logger.info('DB', `[DB] Validando DB: tablas encontradas = ${validation.foundTables.join(', ') || '(ninguna)'}`);

  if (!validation.valid) {
    safeUnlink(stagingPath);
    logger.error('DB', `[DB] MIGRACIÓN FALLIDA: la DB legacy no tiene la estructura esperada (${validation.reason})`);
    logger.info('DB', `[DB] DB original preservada: ${legacyPath}`);
    return { attempted: true, migrated: false, legacyPath, backupPath, reason: validation.reason };
  }

  // 4. Métricas ANTES de migrar (equivalen a las de la DB legacy original).
  const metricsBefore = await collectMetricsFromFile(stagingPath);
  logger.info('DB', `[DB] Métricas antes: ${JSON.stringify(metricsBefore)}`);

  // 5. Ejecutar sobre la copia el MISMO sistema de migraciones aditivas que
  //    usa el arranque normal de la app (schemaMigrations.ts).
  logger.info('DB', '[DB] Iniciando migración de esquema sobre la copia...');
  const stagingClient = createClientForFile(stagingPath);
  let metricsAfter: MigrationMetrics;
  try {
    await stagingClient.$connect();

    const hasTables = await tablesExist(stagingClient);
    if (!hasTables) {
      // No debería ocurrir tras pasar la validación, pero se cubre por seguridad.
      await createTables(stagingClient);
    }

    await runAdditiveMigrations(stagingClient);
    logger.info('DB', '[DB] Migración de esquema: completada sobre la copia.');

    metricsAfter = await collectMetricsFromFile(stagingPath, stagingClient);
  } catch (e) {
    await stagingClient.$disconnect().catch(() => undefined);
    safeUnlink(stagingPath);
    logger.error('DB', '[DB] MIGRACIÓN FALLIDA: error ejecutando migraciones de esquema', e);
    logger.info('DB', `[DB] DB original preservada: ${legacyPath}`);
    return { attempted: true, migrated: false, legacyPath, backupPath, reason: 'schema_migration_error', metricsBefore };
  }
  await stagingClient.$disconnect().catch(() => undefined);

  logger.info('DB', `[DB] Métricas después: ${JSON.stringify(metricsAfter)}`);

  // 6. Verificar invariantes críticos antes de comprometer el resultado.
  const invariantFailure = checkInvariants(metricsBefore, metricsAfter);
  if (invariantFailure) {
    safeUnlink(stagingPath);
    logger.error('DB', `[DB] MIGRACIÓN FALLIDA: ${invariantFailure}`);
    logger.info('DB', `[DB] DB original preservada: ${legacyPath}`);
    return {
      attempted: true,
      migrated: false,
      legacyPath,
      backupPath,
      reason: invariantFailure,
      metricsBefore,
      metricsAfter,
    };
  }

  // 7. Todo OK: mover (no copiar) la copia migrada a la ruta definitiva.
  try {
    const targetDir = path.dirname(targetDbPath);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    fs.renameSync(stagingPath, targetDbPath);
    for (const ext of ['-wal', '-shm']) {
      if (fs.existsSync(stagingPath + ext)) {
        fs.renameSync(stagingPath + ext, targetDbPath + ext);
      }
    }
  } catch (e) {
    safeUnlink(stagingPath);
    logger.error('DB', '[DB] MIGRACIÓN FALLIDA: no se pudo mover la copia migrada a la ruta definitiva', e);
    logger.info('DB', `[DB] DB original preservada: ${legacyPath}`);
    return {
      attempted: true,
      migrated: false,
      legacyPath,
      backupPath,
      reason: 'commit_failed',
      metricsBefore,
      metricsAfter,
    };
  }

  logger.info('DB', `[DB] Migración exitosa: DB legacy migrada desde ${legacyPath} a ${targetDbPath}`);
  return {
    attempted: true,
    migrated: true,
    legacyPath,
    backupPath,
    metricsBefore,
    metricsAfter,
  };
}

// ---------------------------------------------------------------------------
// Punto de entrada real (usa Electron) — lo que llama init.ts
// ---------------------------------------------------------------------------

/**
 * Detecta y migra automáticamente una base legacy de KioskoApp hacia la
 * ubicación oficial de StockPOS, usando las rutas reales de Electron.
 *
 * Prioridad (según lo pedido):
 * 1. Si ya existe una DB moderna en la ruta oficial → no hace nada (la usa
 *    tal cual; ese caso ni siquiera debería llegar a llamar esta función,
 *    pero se valida de nuevo aquí por seguridad).
 * 2. Si no existe → buscar DB legacy.
 * 3. Si encuentra una legacy → migrarla con backup + validación + métricas.
 * 4. Si no encuentra ninguna → no hace nada (instalación limpia normal).
 */
export async function attemptLegacyMigration(): Promise<LegacyMigrationResult> {
  const targetDbPath = getProductionDbPath();

  if (fs.existsSync(targetDbPath)) {
    logger.info('DB', '[DB] Ruta moderna detectada: ya existe stockpos.db, no se busca DB legacy.');
    return { attempted: false, migrated: false };
  }

  const appDataDir = getAppDataDir();
  const match = findLegacyDatabase(appDataDir);

  if (!match) {
    logger.info('DB', '[DB] No se encontró ninguna base de datos legacy de KioskoApp. Instalación nueva.');
    return { attempted: false, migrated: false };
  }

  logger.debug('DB', `[DB] Nota sobre la ubicación legacy encontrada: ${match.note}`);

  return migrateLegacyFile({
    legacyPath: match.path,
    targetDbPath,
    backupDir: getBackupDir(),
    documentsBackupDir: getDocumentsBackupDir(),
  });
}
