/**
 * Tests de la migración legacy KioskoApp 1.0.19 → StockPOS.
 *
 * CÓMO CORRERLOS
 *   npm run test:run -- legacyMigration
 *
 * MODOS DE EJECUCIÓN
 * 1) Por defecto, `@prisma/client` se reemplaza por un cliente falso respaldado
 *    por SQLite REAL (`node:sqlite`, Node >= 22.5). El SQL (ALTER TABLE, COUNT,
 *    sqlite_master, etc.) se ejecuta de verdad sobre archivos .db reales; lo
 *    único simulado es la capa Prisma. Sirve para entornos sin el motor
 *    nativo de Prisma (CI sin red a binaries.prisma.sh, etc.).
 * 2) Con STOCKPOS_TEST_REAL_PRISMA=1 se usa el PrismaClient real.
 *
 * PRUEBA CON UNA COPIA REAL DE UN CLIENTE 1.0.19
 *   STOCKPOS_TEST_LEGACY_DB="C:\ruta\a\COPIA-de-kioskoapp.db" \
 *   STOCKPOS_TEST_REAL_PRISMA=1 npm run test:run -- legacyMigration
 *   (PowerShell: $env:STOCKPOS_TEST_LEGACY_DB="..."; $env:STOCKPOS_TEST_REAL_PRISMA="1")
 *   Usar SIEMPRE una copia, nunca el archivo original del cliente. El test
 *   trabaja en una carpeta temporal y además verifica que la copia de
 *   entrada quede byte a byte idéntica.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';

const hoisted = vi.hoisted(() => ({
  paths: { target: '', backupDir: '', docsDir: '', appData: '' },
}));

vi.mock('electron', () => ({
  app: { isPackaged: true, getPath: () => os.tmpdir() },
}));

vi.mock('../../main/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('../../main/database/dbPaths', () => ({
  getProductionDbPath: () => hoisted.paths.target,
  getBackupDir: () => hoisted.paths.backupDir,
  getDocumentsBackupDir: () => hoisted.paths.docsDir,
  getAppDataDir: () => hoisted.paths.appData,
}));

vi.mock('@prisma/client', async () => {
  if (process.env.STOCKPOS_TEST_REAL_PRISMA) {
    return await vi.importActual('@prisma/client');
  }
  // node:sqlite se carga con createRequire porque Vite no lo resuelve como builtin.
  const { createRequire } = await import('module');
  const { DatabaseSync } = createRequire(import.meta.url)('node:sqlite');
  class FakePrismaClient {
    private db: any = null;
    private file: string;
    constructor(opts: { datasources: { db: { url: string } } }) {
      this.file = opts.datasources.db.url.replace(/^file:/, '');
    }
    async $connect() {
      this.db = new DatabaseSync(this.file);
    }
    async $disconnect() {
      this.db?.close();
      this.db = null;
    }
    async $queryRawUnsafe(sql: string) {
      return this.db!.prepare(sql).all() as unknown[];
    }
    async $executeRawUnsafe(sql: string) {
      this.db!.exec(sql);
      return 0;
    }
    async $queryRaw(strings: TemplateStringsArray) {
      return this.db!.prepare(strings.join('?')).all() as unknown[];
    }
  }
  return { PrismaClient: FakePrismaClient };
});

import { createRequire } from 'module';
import {
  migrateLegacyFile,
  attemptLegacyMigration,
  findLegacyDatabase,
  validateLegacyDatabase,
  isValidSqliteFile,
  collectMetricsFromFile,
  checkInvariants,
  METRIC_TABLES,
  type MigrationMetrics,
} from '../../main/database/legacyMigration';

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { DatabaseSync } = createRequire(import.meta.url)('node:sqlite') as { DatabaseSync: new (file: string) => any };

function sha256(file: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

/**
 * Crea una DB que simula KioskoApp 1.0.19: SIN las columnas agregadas en
 * migraciones posteriores (isCombo, separateCash, separateCashTotal,
 * mixedPayment*, requirePasswordChange, showCostPrice/showUnitsPerBox) y SIN
 * la tabla ComboComponent.
 */
function createLegacyDb(file: string, opts: { withData?: boolean } = { withData: true }): void {
  const db = new DatabaseSync(file);
  db.exec(`
    CREATE TABLE "User" ("id" TEXT NOT NULL PRIMARY KEY, "username" TEXT NOT NULL, "password" TEXT NOT NULL, "pin" TEXT, "name" TEXT NOT NULL, "role" TEXT NOT NULL DEFAULT 'CASHIER', "active" INTEGER NOT NULL DEFAULT 1, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL);
    CREATE TABLE "Category" ("id" TEXT NOT NULL PRIMARY KEY, "name" TEXT NOT NULL, "color" TEXT NOT NULL DEFAULT '#3b82f6', "icon" TEXT, "order" INTEGER NOT NULL DEFAULT 0, "active" INTEGER NOT NULL DEFAULT 1, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL);
    CREATE TABLE "Product" ("id" TEXT NOT NULL PRIMARY KEY, "barcode" TEXT NOT NULL, "name" TEXT NOT NULL, "price" REAL NOT NULL, "cost" REAL NOT NULL DEFAULT 0, "stock" INTEGER NOT NULL DEFAULT 0, "categoryId" TEXT, "active" INTEGER NOT NULL DEFAULT 1, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL);
    CREATE TABLE "Customer" ("id" TEXT NOT NULL PRIMARY KEY, "name" TEXT NOT NULL, "balance" REAL NOT NULL DEFAULT 0, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE "CashRegister" ("id" TEXT NOT NULL PRIMARY KEY, "userId" TEXT NOT NULL, "openingAmount" REAL NOT NULL DEFAULT 0, "openedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE "Sale" ("id" TEXT NOT NULL PRIMARY KEY, "total" REAL NOT NULL, "paymentMethod" TEXT NOT NULL DEFAULT 'CASH', "userId" TEXT, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE "SaleItem" ("id" TEXT NOT NULL PRIMARY KEY, "saleId" TEXT NOT NULL, "productId" TEXT NOT NULL, "quantity" INTEGER NOT NULL, "unitPrice" REAL NOT NULL);
    CREATE TABLE "StockMovement" ("id" TEXT NOT NULL PRIMARY KEY, "productId" TEXT NOT NULL, "quantity" INTEGER NOT NULL, "type" TEXT NOT NULL, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE "CreditPayment" ("id" TEXT NOT NULL PRIMARY KEY, "customerId" TEXT NOT NULL, "amount" REAL NOT NULL, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE "AppConfig" ("id" TEXT NOT NULL PRIMARY KEY, "businessName" TEXT NOT NULL DEFAULT 'Mi Kiosko', "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL);
  `);
  if (opts.withData !== false) {
    db.exec(`
      INSERT INTO "User"(id,username,password,name,role,updatedAt) VALUES ('u1','admin','x','Admin','ADMIN','2025-01-01'),('u2','caja','x','Cajero','CASHIER','2025-01-01');
      INSERT INTO "Category"(id,name,updatedAt) VALUES ('c1','Bebidas','2025-01-01'),('c2','Golosinas','2025-01-01'),('c3','Snacks','2025-01-01');
      INSERT INTO "Product"(id,barcode,name,price,cost,stock,categoryId,updatedAt) VALUES
        ('p1','111','Coca Cola 500ml',1800,1200,48,'c1','2025-01-01'),
        ('p2','222','Alfajor Aguila',800,550,36,'c2','2025-01-01'),
        ('p3','333','Papas Lays',1200,850,30,'c3','2025-01-01'),
        ('p4','444','Agua 500ml',900,550,60,'c1','2025-01-01'),
        ('p5','555','Chicle Beldent',600,400,40,'c2','2025-01-01');
      INSERT INTO "Customer"(id,name,balance) VALUES ('cu1','Juan Perez',1500);
      INSERT INTO "CashRegister"(id,userId,openingAmount) VALUES ('cr1','u1',5000);
      INSERT INTO "Sale"(id,total,userId) VALUES ('s1',2600,'u2'),('s2',1800,'u2');
      INSERT INTO "SaleItem"(id,saleId,productId,quantity,unitPrice) VALUES ('si1','s1','p1',1,1800),('si2','s1','p2',1,800),('si3','s2','p1',1,1800);
      INSERT INTO "StockMovement"(id,productId,quantity,type) VALUES ('m1','p1',-1,'SALE'),('m2','p2',-1,'SALE');
      INSERT INTO "CreditPayment"(id,customerId,amount) VALUES ('cp1','cu1',500);
      INSERT INTO "AppConfig"(id,updatedAt) VALUES ('cfg1','2025-01-01');
    `);
  }
  db.close();
}

function columnsOf(file: string, table: string): string[] {
  const db = new DatabaseSync(file);
  const cols = (db.prepare(`PRAGMA table_info("${table}")`).all() as Array<{ name: string }>).map(c => c.name);
  db.close();
  return cols;
}

function tablesOf(file: string): string[] {
  const db = new DatabaseSync(file);
  const t = (db.prepare(`SELECT name FROM sqlite_master WHERE type='table'`).all() as Array<{ name: string }>).map(r => r.name);
  db.close();
  return t;
}

// ---------------------------------------------------------------------------

let workDir: string;

beforeEach(() => {
  workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stockpos-legacy-test-'));
  hoisted.paths.appData = path.join(workDir, 'appData');
  hoisted.paths.target = path.join(workDir, 'appData', 'StockPOS', 'stockpos.db');
  hoisted.paths.backupDir = path.join(workDir, 'appData', 'StockPOS', 'backups');
  hoisted.paths.docsDir = path.join(workDir, 'Documents', 'stockpos-backups');
  fs.mkdirSync(path.dirname(hoisted.paths.target), { recursive: true });
});

afterEach(() => {
  fs.rmSync(workDir, { recursive: true, force: true });
});

describe('migrateLegacyFile: KioskoApp 1.0.19 → StockPOS', () => {
  it('migra una DB legacy preservando todos los datos y agregando solo columnas/tablas nuevas', async () => {
    const legacy = path.join(workDir, 'appData', 'kiosko-app', 'kioskoapp.db');
    fs.mkdirSync(path.dirname(legacy), { recursive: true });
    createLegacyDb(legacy);
    const hashBefore = sha256(legacy);

    const result = await migrateLegacyFile({
      legacyPath: legacy,
      targetDbPath: hoisted.paths.target,
      backupDir: hoisted.paths.backupDir,
      documentsBackupDir: hoisted.paths.docsDir,
    });

    expect(result.migrated).toBe(true);
    expect(fs.existsSync(hoisted.paths.target)).toBe(true);

    // Métricas: idénticas antes/después (ComboComponent no existía → 0 y 0)
    expect(result.metricsBefore).toEqual({
      Product: 5, Category: 3, Sale: 2, SaleItem: 3, User: 2, Customer: 1,
      StockMovement: 2, CashRegister: 1, CreditPayment: 1, ComboComponent: 0,
    });
    expect(result.metricsAfter).toEqual(result.metricsBefore);

    // Esquema actualizado de forma aditiva
    expect(columnsOf(hoisted.paths.target, 'Product')).toEqual(expect.arrayContaining(['isCombo', 'separateCash']));
    expect(columnsOf(hoisted.paths.target, 'Sale')).toEqual(
      expect.arrayContaining(['mixedPaymentMethod1', 'mixedPaymentAmount1', 'mixedPaymentMethod2', 'mixedPaymentAmount2'])
    );
    expect(columnsOf(hoisted.paths.target, 'User')).toContain('requirePasswordChange');
    expect(columnsOf(hoisted.paths.target, 'CashRegister')).toContain('separateCashTotal');
    expect(tablesOf(hoisted.paths.target)).toContain('ComboComponent');

    // Datos concretos intactos
    const db = new DatabaseSync(hoisted.paths.target);
    const p = db.prepare(`SELECT name, price, stock FROM "Product" WHERE id='p1'`).get() as { name: string; price: number; stock: number };
    expect(p).toMatchObject({ name: 'Coca Cola 500ml', price: 1800, stock: 48 });
    const cust = db.prepare(`SELECT balance FROM "Customer" WHERE id='cu1'`).get() as { balance: number };
    expect(cust.balance).toBe(1500);
    db.close();

    // Backup con timestamp, idéntico al original
    expect(result.backupPath).toBeTruthy();
    expect(path.basename(result.backupPath!)).toMatch(/^kioskoapp-pre-migration-\d{4}-\d{2}-\d{2}-\d{6}\.db$/);
    expect(sha256(result.backupPath!)).toBe(hashBefore);
    // No debe empezar con 'stockpos-backup-': cleanOldBackups() (backupHandlers.ts)
    // solo rota ese prefijo, así el backup pre-migración nunca se borra solo.
    expect(path.basename(result.backupPath!).startsWith('stockpos-backup-')).toBe(false);

    // El original NUNCA se modifica
    expect(fs.existsSync(legacy)).toBe(true);
    expect(sha256(legacy)).toBe(hashBefore);

    // No quedan archivos de staging
    expect(fs.readdirSync(path.dirname(hoisted.paths.target)).filter(f => f.includes('staging'))).toEqual([]);
  });

  it('es seguro correr la migración de esquema dos veces (idempotente)', async () => {
    const legacy = path.join(workDir, 'kioskoapp.db');
    createLegacyDb(legacy);
    const r1 = await migrateLegacyFile({ legacyPath: legacy, targetDbPath: hoisted.paths.target, backupDir: hoisted.paths.backupDir });
    expect(r1.migrated).toBe(true);
    // Simula segundo arranque sobre la DB ya migrada usada como "legacy"
    const second = path.join(workDir, 'second', 'stockpos.db');
    const r2 = await migrateLegacyFile({ legacyPath: hoisted.paths.target, targetDbPath: second, backupDir: path.join(workDir, 'b2') });
    expect(r2.migrated).toBe(true);
    expect(r2.metricsAfter).toEqual(r1.metricsAfter);
  });

  it('no sobrescribe backups previos: dos migraciones generan dos backups distintos', async () => {
    const legacy = path.join(workDir, 'kioskoapp.db');
    createLegacyDb(legacy);
    const t1 = path.join(workDir, 't1', 'stockpos.db');
    const t2 = path.join(workDir, 't2', 'stockpos.db');
    await migrateLegacyFile({ legacyPath: legacy, targetDbPath: t1, backupDir: hoisted.paths.backupDir });
    await migrateLegacyFile({ legacyPath: legacy, targetDbPath: t2, backupDir: hoisted.paths.backupDir });
    expect(fs.readdirSync(hoisted.paths.backupDir).filter(f => f.endsWith('.db')).length).toBe(2);
  });

  it('NUNCA sobrescribe una DB de destino existente', async () => {
    const legacy = path.join(workDir, 'kioskoapp.db');
    createLegacyDb(legacy);
    fs.writeFileSync(hoisted.paths.target, 'DB de produccion existente');

    const result = await migrateLegacyFile({ legacyPath: legacy, targetDbPath: hoisted.paths.target, backupDir: hoisted.paths.backupDir });

    expect(result.migrated).toBe(false);
    expect(result.reason).toBe('target_exists');
    expect(fs.readFileSync(hoisted.paths.target, 'utf8')).toBe('DB de produccion existente');
    expect(fs.existsSync(hoisted.paths.backupDir)).toBe(false); // ni siquiera empezó
  });

  it('rechaza un archivo que no es SQLite, sin crear DB de destino y dejando el original intacto', async () => {
    const bogus = path.join(workDir, 'kioskoapp.db');
    fs.writeFileSync(bogus, 'esto no es una base de datos sqlite, es texto plano');
    const hash = sha256(bogus);

    const result = await migrateLegacyFile({ legacyPath: bogus, targetDbPath: hoisted.paths.target, backupDir: hoisted.paths.backupDir });

    expect(result.migrated).toBe(false);
    expect(result.reason).toBe('invalid_sqlite_header');
    expect(fs.existsSync(hoisted.paths.target)).toBe(false);
    expect(sha256(bogus)).toBe(hash);
    expect(fs.readdirSync(path.dirname(hoisted.paths.target)).filter(f => f.includes('staging'))).toEqual([]);
  });

  it('rechaza una SQLite válida que no es de la app (faltan tablas fundacionales)', async () => {
    const other = path.join(workDir, 'otra.db');
    const db = new DatabaseSync(other);
    db.exec(`CREATE TABLE "Cosas" (id TEXT PRIMARY KEY);`);
    db.close();

    const result = await migrateLegacyFile({ legacyPath: other, targetDbPath: hoisted.paths.target, backupDir: hoisted.paths.backupDir });

    expect(result.migrated).toBe(false);
    expect(result.reason).toMatch(/^missing_core_tables:/);
    expect(fs.existsSync(hoisted.paths.target)).toBe(false);
  });

  it('acepta una DB legacy con tablas fundacionales pero vacía (sin datos) sin considerarla inválida', async () => {
    const legacy = path.join(workDir, 'kioskoapp.db');
    createLegacyDb(legacy, { withData: false });
    const result = await migrateLegacyFile({ legacyPath: legacy, targetDbPath: hoisted.paths.target, backupDir: hoisted.paths.backupDir });
    expect(result.migrated).toBe(true);
    expect(result.metricsAfter?.Product).toBe(0);
  });
});

describe('validación, métricas e invariantes', () => {
  it('isValidSqliteFile distingue SQLite real de basura', () => {
    const good = path.join(workDir, 'good.db');
    createLegacyDb(good);
    const bad = path.join(workDir, 'bad.db');
    fs.writeFileSync(bad, 'nope');
    expect(isValidSqliteFile(good)).toBe(true);
    expect(isValidSqliteFile(bad)).toBe(false);
    expect(isValidSqliteFile(path.join(workDir, 'no-existe.db'))).toBe(false);
  });

  it('validateLegacyDatabase reporta las tablas encontradas', async () => {
    const good = path.join(workDir, 'good.db');
    createLegacyDb(good);
    const v = await validateLegacyDatabase(good);
    expect(v.valid).toBe(true);
    expect(v.foundTables).toEqual(expect.arrayContaining(['User', 'Product', 'Category', 'Sale']));
    expect(v.foundTables).not.toContain('ComboComponent');
  });

  it('collectMetricsFromFile cuenta 0 (sin fallar) para tablas que no existen en versiones viejas', async () => {
    const good = path.join(workDir, 'good.db');
    createLegacyDb(good);
    const m = await collectMetricsFromFile(good);
    expect(Object.keys(m).sort()).toEqual([...METRIC_TABLES].sort());
    expect(m.ComboComponent).toBe(0);
    expect(m.Product).toBe(5);
  });

  it('checkInvariants marca fallo si Product/Sale/User/Category pasan de >0 a 0', () => {
    const base: MigrationMetrics = {
      Product: 5, Category: 3, Sale: 2, SaleItem: 3, User: 2, Customer: 1,
      StockMovement: 2, CashRegister: 1, CreditPayment: 1, ComboComponent: 0,
    };
    for (const key of ['Product', 'Sale', 'User', 'Category'] as const) {
      expect(checkInvariants(base, { ...base, [key]: 0 })).toMatch(/^invariant_violated:/);
    }
    // Un cambio en una entidad no crítica no invalida la migración
    expect(checkInvariants(base, { ...base, Customer: 0 })).toBeNull();
    // Si ya estaba en 0, no es una regresión
    expect(checkInvariants({ ...base, Sale: 0 }, { ...base, Sale: 0 })).toBeNull();
    expect(checkInvariants(base, base)).toBeNull();
  });
});

describe('findLegacyDatabase / attemptLegacyMigration (prioridades)', () => {
  it('sin ninguna DB legacy → null (instalación nueva)', () => {
    fs.mkdirSync(hoisted.paths.appData, { recursive: true });
    expect(findLegacyDatabase(hoisted.paths.appData)).toBeNull();
  });

  it('detecta kiosko-app/kioskoapp.db', () => {
    const legacy = path.join(hoisted.paths.appData, 'kiosko-app', 'kioskoapp.db');
    fs.mkdirSync(path.dirname(legacy), { recursive: true });
    createLegacyDb(legacy);
    expect(findLegacyDatabase(hoisted.paths.appData)?.path).toBe(legacy);
  });

  it('detecta KioskoApp/kioskoapp.db y, si hay varias candidatas, elige la de mayor tamaño', () => {
    const small = path.join(hoisted.paths.appData, 'kiosko-app', 'kioskoapp.db');
    const big = path.join(hoisted.paths.appData, 'KioskoApp', 'kioskoapp.db');
    fs.mkdirSync(path.dirname(small), { recursive: true });
    fs.mkdirSync(path.dirname(big), { recursive: true });
    createLegacyDb(small, { withData: false });
    createLegacyDb(big);
    fs.appendFileSync(big, Buffer.alloc(8192)); // asegura mayor tamaño
    expect(findLegacyDatabase(hoisted.paths.appData)?.path).toBe(big);
  });

  it('PRIORIDAD 1: si ya existe la DB moderna, no toca nada ni busca legacy', async () => {
    fs.writeFileSync(hoisted.paths.target, 'contenido moderno');
    const legacy = path.join(hoisted.paths.appData, 'kiosko-app', 'kioskoapp.db');
    fs.mkdirSync(path.dirname(legacy), { recursive: true });
    createLegacyDb(legacy);

    const result = await attemptLegacyMigration();

    expect(result).toEqual({ attempted: false, migrated: false });
    expect(fs.readFileSync(hoisted.paths.target, 'utf8')).toBe('contenido moderno');
  });

  it('PRIORIDAD 3: sin DB moderna y con legacy válida → migra a la ruta oficial', async () => {
    const legacy = path.join(hoisted.paths.appData, 'kiosko-app', 'kioskoapp.db');
    fs.mkdirSync(path.dirname(legacy), { recursive: true });
    createLegacyDb(legacy);
    const hash = sha256(legacy);

    const result = await attemptLegacyMigration();

    expect(result.migrated).toBe(true);
    expect(fs.existsSync(hoisted.paths.target)).toBe(true);
    expect(sha256(legacy)).toBe(hash);
    expect(fs.existsSync(legacy)).toBe(true);
  });

  it('PRIORIDAD 4: sin DB moderna ni legacy → no intenta nada (instalación limpia)', async () => {
    fs.mkdirSync(hoisted.paths.appData, { recursive: true });
    const result = await attemptLegacyMigration();
    expect(result).toEqual({ attempted: false, migrated: false });
    expect(fs.existsSync(hoisted.paths.target)).toBe(false);
  });

  it('FALLO: legacy corrupta → attempted=true, migrated=false, no crea DB vacía y preserva el original', async () => {
    const legacy = path.join(hoisted.paths.appData, 'kiosko-app', 'kioskoapp.db');
    fs.mkdirSync(path.dirname(legacy), { recursive: true });
    fs.writeFileSync(legacy, 'corrupta');
    const hash = sha256(legacy);

    const result = await attemptLegacyMigration();

    expect(result.attempted).toBe(true);
    expect(result.migrated).toBe(false);
    expect(fs.existsSync(hoisted.paths.target)).toBe(false);
    expect(sha256(legacy)).toBe(hash);
  });
});

// ---------------------------------------------------------------------------
// Prueba opcional con una COPIA REAL de un cliente 1.0.19
// ---------------------------------------------------------------------------
const realCopy = process.env.STOCKPOS_TEST_LEGACY_DB;
describe.skipIf(!realCopy)('COPIA REAL de cliente (STOCKPOS_TEST_LEGACY_DB)', () => {
  it('migra la copia real conservando todos los datos', async () => {
    expect(fs.existsSync(realCopy!)).toBe(true);
    // Se trabaja sobre una copia adicional en carpeta temporal.
    const input = path.join(workDir, 'kioskoapp.db');
    fs.copyFileSync(realCopy!, input);
    const hashInput = sha256(input);

    const result = await migrateLegacyFile({
      legacyPath: input,
      targetDbPath: hoisted.paths.target,
      backupDir: hoisted.paths.backupDir,
    });

    console.log('\n=== MIGRACIÓN DE COPIA REAL ===');
    console.log('Resultado :', result.migrated ? 'EXITOSA' : `FALLIDA (${result.reason})`);
    console.table({ antes: result.metricsBefore, despues: result.metricsAfter });

    expect(result.migrated).toBe(true);
    expect(result.metricsAfter).toEqual(result.metricsBefore);
    expect(sha256(input)).toBe(hashInput);
    expect(sha256(result.backupPath!)).toBe(hashInput);
  });
});
