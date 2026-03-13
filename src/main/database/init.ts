import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { app, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { logger } from '../utils/logger';

// Generar contraseña segura para primer inicio
function generateSecurePassword(): string {
  // Genera una contraseña de 12 caracteres: letras, números y símbolos
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
  let password = '';
  const randomBytes = crypto.randomBytes(12);
  for (let i = 0; i < 12; i++) {
    password += chars[randomBytes[i] % chars.length];
  }
  return password;
}

// Configurar la ruta de la base de datos
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
const dbPath = isDev 
  ? path.join(__dirname, '../../../prisma/stockpos.db')
  : path.join(app.getPath('userData'), 'stockpos.db');

// Crear directorio si no existe
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Establecer la URL de la base de datos (Prisma requiere slashes)
const normalizedDbPath = dbPath.replace(/\\/g, '/');
process.env.DATABASE_URL = `file:${normalizedDbPath}`;

const prisma = new PrismaClient();

// SQL para crear todas las tablas (basado en schema.prisma)
const CREATE_TABLES_SQL = `
-- Tabla User
CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "pin" TEXT,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'CASHIER',
    "active" INTEGER NOT NULL DEFAULT 1,
    "requirePasswordChange" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "User_username_key" ON "User"("username");
CREATE UNIQUE INDEX IF NOT EXISTS "User_pin_key" ON "User"("pin");
CREATE INDEX IF NOT EXISTS "User_username_idx" ON "User"("username");
CREATE INDEX IF NOT EXISTS "User_pin_idx" ON "User"("pin");

-- Tabla Category
CREATE TABLE IF NOT EXISTS "Category" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#3b82f6',
    "icon" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "active" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE INDEX IF NOT EXISTS "Category_order_idx" ON "Category"("order");

-- Tabla Product
CREATE TABLE IF NOT EXISTS "Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "barcode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" REAL NOT NULL,
    "cost" REAL NOT NULL DEFAULT 0,
    "isCigarette" INTEGER NOT NULL DEFAULT 0,
    "isCombo" INTEGER NOT NULL DEFAULT 0,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "minStock" INTEGER NOT NULL DEFAULT 5,
    "unitsPerBox" INTEGER NOT NULL DEFAULT 1,
    "sellByUnit" INTEGER NOT NULL DEFAULT 1,
    "categoryId" TEXT,
    "active" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "Product_barcode_idx" ON "Product"("barcode");
CREATE INDEX IF NOT EXISTS "Product_categoryId_idx" ON "Product"("categoryId");
CREATE INDEX IF NOT EXISTS "Product_name_idx" ON "Product"("name");
CREATE INDEX IF NOT EXISTS "Product_stock_idx" ON "Product"("stock");
CREATE INDEX IF NOT EXISTS "Product_isCombo_idx" ON "Product"("isCombo");

-- Tabla ComboComponent (relaciona combos con sus productos componentes)
CREATE TABLE IF NOT EXISTS "ComboComponent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "comboId" TEXT NOT NULL,
    "componentId" TEXT NOT NULL,
    "quantity" REAL NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ComboComponent_comboId_fkey" FOREIGN KEY ("comboId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ComboComponent_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "ComboComponent_comboId_idx" ON "ComboComponent"("comboId");
CREATE INDEX IF NOT EXISTS "ComboComponent_componentId_idx" ON "ComboComponent"("componentId");

-- Tabla Customer
CREATE TABLE IF NOT EXISTS "Customer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "notes" TEXT,
    "balance" REAL NOT NULL DEFAULT 0,
    "active" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE INDEX IF NOT EXISTS "Customer_name_idx" ON "Customer"("name");
CREATE INDEX IF NOT EXISTS "Customer_balance_idx" ON "Customer"("balance");

-- Tabla CashRegister
CREATE TABLE IF NOT EXISTS "CashRegister" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "initialAmount" REAL NOT NULL,
    "finalAmount" REAL,
    "salesTotal" REAL NOT NULL DEFAULT 0,
    "difference" REAL,
    "notes" TEXT,
    "userId" TEXT NOT NULL,
    "openedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" DATETIME,
    CONSTRAINT "CashRegister_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "CashRegister_openedAt_idx" ON "CashRegister"("openedAt");
CREATE INDEX IF NOT EXISTS "CashRegister_userId_idx" ON "CashRegister"("userId");
CREATE INDEX IF NOT EXISTS "CashRegister_status_idx" ON "CashRegister"("status");

-- Tabla Sale
CREATE TABLE IF NOT EXISTS "Sale" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "subtotal" REAL NOT NULL,
    "discount" REAL NOT NULL DEFAULT 0,
    "total" REAL NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "amountPaid" REAL NOT NULL,
    "change" REAL NOT NULL DEFAULT 0,
    "customerId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "cancelReason" TEXT,
    "userId" TEXT NOT NULL,
    "cashRegisterId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Sale_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Sale_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Sale_cashRegisterId_fkey" FOREIGN KEY ("cashRegisterId") REFERENCES "CashRegister" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "Sale_createdAt_idx" ON "Sale"("createdAt");
CREATE INDEX IF NOT EXISTS "Sale_userId_idx" ON "Sale"("userId");
CREATE INDEX IF NOT EXISTS "Sale_status_idx" ON "Sale"("status");
CREATE INDEX IF NOT EXISTS "Sale_cashRegisterId_idx" ON "Sale"("cashRegisterId");
CREATE INDEX IF NOT EXISTS "Sale_customerId_idx" ON "Sale"("customerId");

-- Tabla SaleItem
CREATE TABLE IF NOT EXISTS "SaleItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quantity" INTEGER NOT NULL,
    "unitPrice" REAL NOT NULL,
    "subtotal" REAL NOT NULL,
    "productId" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    CONSTRAINT "SaleItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SaleItem_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "SaleItem_saleId_idx" ON "SaleItem"("saleId");
CREATE INDEX IF NOT EXISTS "SaleItem_productId_idx" ON "SaleItem"("productId");

-- Tabla StockMovement
CREATE TABLE IF NOT EXISTS "StockMovement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "stockBefore" INTEGER NOT NULL,
    "stockAfter" INTEGER NOT NULL,
    "productId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "saleId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StockMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "StockMovement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "StockMovement_productId_idx" ON "StockMovement"("productId");
CREATE INDEX IF NOT EXISTS "StockMovement_createdAt_idx" ON "StockMovement"("createdAt");
CREATE INDEX IF NOT EXISTS "StockMovement_type_idx" ON "StockMovement"("type");

-- Tabla CreditPayment
CREATE TABLE IF NOT EXISTS "CreditPayment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "amount" REAL NOT NULL,
    "notes" TEXT,
    "customerId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CreditPayment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "CreditPayment_customerId_idx" ON "CreditPayment"("customerId");
CREATE INDEX IF NOT EXISTS "CreditPayment_createdAt_idx" ON "CreditPayment"("createdAt");

-- Tabla AppConfig
CREATE TABLE IF NOT EXISTS "AppConfig" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'config',
    "businessName" TEXT NOT NULL DEFAULT 'Mi Negocio',
    "businessAddress" TEXT,
    "businessPhone" TEXT,
    "businessCuit" TEXT,
    "ticketHeader" TEXT NOT NULL DEFAULT 'Gracias por su compra!',
    "ticketFooter" TEXT,
    "transferFeePercent" REAL NOT NULL DEFAULT 0,
    "cigaretteTransferFeePercent" REAL NOT NULL DEFAULT 0,
    "showCostPrice" INTEGER NOT NULL DEFAULT 1,
    "showUnitsPerBox" INTEGER NOT NULL DEFAULT 1,
    "defaultMinStock" INTEGER NOT NULL DEFAULT 5,
    "autoBackup" INTEGER NOT NULL DEFAULT 1,
    "sessionTimeout" INTEGER NOT NULL DEFAULT 30,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
`;

async function createTables(): Promise<void> {
  logger.info('Database', 'Creando estructura de tablas...');
  
  // Separar los statements y ejecutarlos uno por uno con Prisma
  // Primero, eliminar todos los comentarios SQL
  const sqlWithoutComments = CREATE_TABLES_SQL
    .split('\n')
    .filter(line => !line.trim().startsWith('--'))
    .join('\n');
  
  const statements = sqlWithoutComments
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);
  
  logger.info('Database', `Ejecutando ${statements.length} statements SQL...`);
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const statement of statements) {
    try {
      await prisma.$executeRawUnsafe(statement + ';');
      successCount++;
    } catch (error) {
      // Ignorar errores de "ya existe" 
      const errorMessage = String(error);
      if (!errorMessage.includes('already exists') && !errorMessage.includes('duplicate column')) {
        errorCount++;
        logger.debug('Database', 'Warning en statement', { 
          statement: statement.substring(0, 60), 
          error: String(error) 
        });
      }
    }
  }
  
  logger.info('Database', `Statements ejecutados: ${successCount} exitosos, ${errorCount} con warnings`);
  
  // Quitar índice único de barcode si existe (migración para permitir duplicados)
  try {
    await prisma.$executeRawUnsafe('DROP INDEX IF EXISTS "Product_barcode_key";');
    logger.debug('Database', 'Indice unico de barcode eliminado (permite duplicados)');
  } catch (error) {
    // Ignorar si no existe
  }
  
  logger.info('Database', 'Estructura de tablas creada correctamente');
}

async function tablesExist(): Promise<boolean> {
  try {
    const result = await prisma.$queryRaw<Array<{name: string}>>`
      SELECT name FROM sqlite_master WHERE type='table' AND name='User'
    `;
    return result.length > 0;
  } catch {
    return false;
  }
}

/**
 * Verificar si la BD actual está vacía/con datos de ejemplo
 * pero hay backups con datos reales disponibles
 * 
 * NOTA: Función DESHABILITADA temporalmente (v1.0.14)
 * Problema: Al restaurar backups viejos, no tienen las columnas nuevas
 * y causa errores. La restauración debe ser manual desde Configuración.
 */
async function checkForEmptyDatabaseWithBackups(): Promise<void> {
  // DESHABILITADO: Esta funcionalidad causa problemas al restaurar
  // backups de versiones anteriores que no tienen las columnas nuevas
  logger.debug('Database', 'Verificación automática de backups deshabilitada');
  return;
  
  try {
    // Contar productos en la BD actual
    const productCount = await prisma.product.count();
    
    // Si hay más de 50 productos, probablemente tiene datos reales
    if (productCount > 50) {
      logger.info('Database', `Base de datos con ${productCount} productos - datos válidos`);
      return;
    }
    
    // Contar ventas - si hay ventas, hay datos reales
    const salesCount = await prisma.sale.count();
    if (salesCount > 0) {
      logger.info('Database', `Base de datos con ${salesCount} ventas - datos válidos`);
      return;
    }
    
    // La BD parece vacía o solo tiene datos de ejemplo
    // Buscar backups que puedan tener datos reales
    const backupDir = isDev
      ? path.join(__dirname, '../../../backups')
      : path.join(app.getPath('userData'), 'backups');
    
    const documentsBackupDir = path.join(app.getPath('documents'), 'stockpos-backups');
    
    let backupsFound: Array<{ path: string; size: number; mtime: Date; name: string }> = [];
    
    // Buscar backups en todas las ubicaciones
    for (const dir of [backupDir, documentsBackupDir]) {
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);
        for (const file of files) {
          if (file.endsWith('.db') && !file.includes('SAFETY')) {
            const filePath = path.join(dir, file);
            try {
              const stats = fs.statSync(filePath);
              // Solo considerar backups más grandes que 100KB (tienen datos reales)
              if (stats.size > 100 * 1024) {
                backupsFound.push({
                  path: filePath,
                  size: stats.size,
                  mtime: stats.mtime,
                  name: file
                });
              }
            } catch {
              // Ignorar archivos que no se pueden leer
            }
          }
        }
      }
    }
    
    if (backupsFound.length === 0) {
      logger.info('Database', 'No se encontraron backups con datos significativos');
      return;
    }
    
    // Ordenar por tamaño (el más grande probablemente tiene más datos)
    backupsFound.sort((a, b) => b.size - a.size);
    const bestBackup = backupsFound[0];
    
    logger.warn('Database', `BD actual tiene solo ${productCount} productos y 0 ventas`);
    logger.warn('Database', `Backup disponible: ${bestBackup.name} (${(bestBackup.size / 1024).toFixed(0)} KB)`);
    
    // Solo mostrar diálogo en producción
    if (!isDev) {
      try {
        const dialogResult = await dialog.showMessageBox({
          type: 'warning',
          title: 'Base de datos vacía detectada',
          message: 'Se detectó que la base de datos actual está vacía o tiene pocos datos.',
          detail: `Productos actuales: ${productCount}\nVentas actuales: ${salesCount}\n\n` +
                  `Se encontró un backup que parece tener más datos:\n` +
                  `${bestBackup.name}\n` +
                  `Tamaño: ${(bestBackup.size / 1024).toFixed(0)} KB\n` +
                  `Fecha: ${bestBackup.mtime.toLocaleString()}\n\n` +
                  '¿Desea restaurar este backup?',
          buttons: ['Restaurar backup', 'Continuar sin restaurar'],
          defaultId: 0,
          cancelId: 1,
        });
        
        if (dialogResult.response === 0) {
          // Hacer backup de la BD actual por si acaso
          const safetyBackupPath = path.join(backupDir, `BEFORE-RESTORE-${Date.now()}.db`);
          if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
          }
          fs.copyFileSync(dbPath, safetyBackupPath);
          
          // Desconectar Prisma antes de reemplazar
          await prisma.$disconnect();
          
          // Restaurar el backup
          fs.copyFileSync(bestBackup.path, dbPath);
          
          // Reconectar
          await prisma.$connect();
          
          logger.info('Database', `Backup restaurado: ${bestBackup.name}`);
          
          dialog.showMessageBox({
            type: 'info',
            title: 'Backup restaurado',
            message: 'El backup se restauró correctamente.',
            detail: 'La aplicación usará los datos del backup. Por favor reinicie la aplicación.',
          });
          
          // Forzar reinicio para cargar los nuevos datos
          app.relaunch();
          app.exit(0);
        }
      } catch (dialogError) {
        logger.error('Database', 'Error al mostrar diálogo de restauración', dialogError);
      }
    }
  } catch (error) {
    logger.error('Database', 'Error al verificar BD vacía', error);
  }
}

/**
 * Detectar posible pérdida de datos verificando si hay backups existentes
 * Si la BD no existe pero hay backups, es probable que se haya perdido
 */
async function checkForPossibleDataLoss(): Promise<boolean> {
  const backupDir = isDev
    ? path.join(__dirname, '../../../backups')
    : path.join(app.getPath('userData'), 'backups');
  
  const documentsBackupDir = path.join(app.getPath('documents'), 'stockpos-backups');
  
  let backupsFound: string[] = [];
  
  // Verificar backups en userData
  if (fs.existsSync(backupDir)) {
    const files = fs.readdirSync(backupDir);
    const dbFiles = files.filter(f => f.endsWith('.db'));
    if (dbFiles.length > 0) {
      backupsFound = backupsFound.concat(dbFiles.map(f => path.join(backupDir, f)));
    }
  }
  
  // Verificar backups en Documentos
  if (fs.existsSync(documentsBackupDir)) {
    const files = fs.readdirSync(documentsBackupDir);
    const dbFiles = files.filter(f => f.endsWith('.db'));
    if (dbFiles.length > 0) {
      backupsFound = backupsFound.concat(dbFiles.map(f => path.join(documentsBackupDir, f)));
    }
  }
  
  if (backupsFound.length > 0) {
    logger.warn('Database', `Se encontraron ${backupsFound.length} backups pero no existe la base de datos principal`);
    logger.warn('Database', 'Esto puede indicar pérdida de datos. Backups disponibles:');
    
    // Ordenar por fecha de modificación (más reciente primero)
    const backupInfos = backupsFound.map(p => {
      try {
        const stats = fs.statSync(p);
        return { path: p, mtime: stats.mtime, name: path.basename(p) };
      } catch {
        return { path: p, mtime: new Date(0), name: path.basename(p) };
      }
    }).sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
    
    // Mostrar los 5 backups más recientes
    backupInfos.slice(0, 5).forEach((info, i) => {
      logger.warn('Database', `  ${i + 1}. ${info.name} (${info.mtime.toLocaleString()})`);
    });
    
    // Mostrar diálogo de alerta al usuario (solo en producción)
    if (!isDev) {
      const mostRecentBackup = backupInfos[0];
      
      try {
        const dialogResult = await dialog.showMessageBox({
          type: 'warning',
          title: '¡Atención! - Posible pérdida de datos',
          message: 'Se detectó que puede haber ocurrido una pérdida de datos.',
          detail: `No se encontró la base de datos principal, pero sí se encontraron ${backupsFound.length} backup(s).\n\n` +
                  `El backup más reciente es:\n${mostRecentBackup.name}\n` +
                  `Fecha: ${mostRecentBackup.mtime.toLocaleString()}\n\n` +
                  '¿Desea restaurar el backup más reciente automáticamente?\n\n' +
                  'Si elige "No", se creará una base de datos vacía.',
          buttons: ['Restaurar backup', 'Crear BD vacía'],
          defaultId: 0,
          cancelId: 1,
        });
        
        if (dialogResult.response === 0) {
          // Restaurar el backup más reciente
          try {
            fs.copyFileSync(mostRecentBackup.path, dbPath);
            logger.info('Database', `Backup restaurado automáticamente: ${mostRecentBackup.name}`);
            
            dialog.showMessageBox({
              type: 'info',
              title: 'Backup restaurado',
              message: 'El backup se restauró correctamente.',
              detail: `Se restauró: ${mostRecentBackup.name}\n\nLa aplicación continuará con los datos recuperados.`,
            });
            
            return false; // Ya no hay pérdida de datos
          } catch (restoreError) {
            logger.error('Database', 'Error al restaurar backup automáticamente', restoreError);
            dialog.showErrorBox('Error', `No se pudo restaurar el backup: ${restoreError}`);
          }
        }
      } catch (dialogError) {
        logger.error('Database', 'Error al mostrar diálogo de pérdida de datos', dialogError);
      }
    }
    
    return true;
  }
  
  return false;
}

export async function initDatabase(): Promise<void> {
  try {
    // Verificar si la base de datos existe
    const dbExists = fs.existsSync(dbPath);
    
    if (!dbExists) {
      logger.info('Database', 'Creando base de datos nueva...');
      
      // CRÍTICO: Verificar si hay backups disponibles (posible pérdida de datos)
      const possibleDataLoss = await checkForPossibleDataLoss();
      if (possibleDataLoss) {
        logger.warn('Database', '¡ALERTA! Se detectó posible pérdida de datos. Hay backups disponibles.');
      }
    } else {
      // BD existe - verificar tamaño para detectar corrupción/vacía
      try {
        const stats = fs.statSync(dbPath);
        logger.info('Database', `Base de datos existente encontrada: ${(stats.size / 1024).toFixed(2)} KB`);
        
        // Si la BD es muy pequeña (menos de 50KB), podría estar vacía/corrupta
        // Una BD con productos reales suele ser > 100KB
        if (stats.size < 50 * 1024) {
          logger.warn('Database', 'La base de datos parece muy pequeña, verificando backups...');
          await checkForPossibleDataLoss();
        }
      } catch (statError) {
        logger.error('Database', 'Error al verificar tamaño de BD', statError);
      }
    }

    // Verificar conexión
    await prisma.$connect();
    logger.info('Database', 'Conexion a SQLite establecida');
    logger.debug('Database', 'Ruta de base de datos', { path: dbPath });

    // Verificar si las tablas existen, si no, crearlas
    const hasTable = await tablesExist();
    if (!hasTable) {
      await createTables();
    }
    
    // =====================================================
    // MIGRACIONES PRIMERO - antes de cualquier consulta Prisma
    // (Prisma espera que todas las columnas existan)
    // =====================================================
    logger.info('Database', 'Ejecutando migraciones de esquema...');
    
    // Migraciones para campos nuevos (para bases de datos existentes)
    try {
      await prisma.$executeRawUnsafe('ALTER TABLE "AppConfig" ADD COLUMN "showCostPrice" INTEGER NOT NULL DEFAULT 1;');
      logger.debug('Database', 'Columna showCostPrice agregada a AppConfig');
    } catch (e) {
      // Columna ya existe, ignorar
    }
    
    try {
      await prisma.$executeRawUnsafe('ALTER TABLE "AppConfig" ADD COLUMN "showUnitsPerBox" INTEGER NOT NULL DEFAULT 1;');
      logger.debug('Database', 'Columna showUnitsPerBox agregada a AppConfig');
    } catch (e) {
      // Columna ya existe, ignorar
    }

    // Migración: agregar campo isCombo a Product
    try {
      await prisma.$executeRawUnsafe('ALTER TABLE "Product" ADD COLUMN "isCombo" INTEGER NOT NULL DEFAULT 0;');
      logger.debug('Database', 'Columna isCombo agregada a Product');
    } catch (e) {
      // Columna ya existe, ignorar
    }

    // Migración: agregar campo separateCash a Product (v1.0.10)
    try {
      await prisma.$executeRawUnsafe('ALTER TABLE "Product" ADD COLUMN "separateCash" INTEGER NOT NULL DEFAULT 0;');
      logger.info('Database', 'Columna separateCash agregada a Product');
    } catch (e: any) {
      if (e.message?.includes('duplicate column') || e.message?.includes('already exists')) {
        logger.debug('Database', 'Columna separateCash ya existe en Product');
      } else {
        logger.error('Database', 'Error agregando separateCash a Product', e);
      }
    }

    // Migración: agregar campo separateCashTotal a CashRegister (v1.0.10)
    try {
      await prisma.$executeRawUnsafe('ALTER TABLE "CashRegister" ADD COLUMN "separateCashTotal" REAL NOT NULL DEFAULT 0;');
      logger.info('Database', 'Columna separateCashTotal agregada a CashRegister');
    } catch (e: any) {
      if (e.message?.includes('duplicate column') || e.message?.includes('already exists')) {
        logger.debug('Database', 'Columna separateCashTotal ya existe en CashRegister');
      } else {
        logger.error('Database', 'Error agregando separateCashTotal a CashRegister', e);
      }
    }

    // Migración: agregar campo separateCash a SaleItem (v1.0.10)
    try {
      await prisma.$executeRawUnsafe('ALTER TABLE "SaleItem" ADD COLUMN "separateCash" INTEGER NOT NULL DEFAULT 0;');
      logger.info('Database', 'Columna separateCash agregada a SaleItem');
    } catch (e: any) {
      if (e.message?.includes('duplicate column') || e.message?.includes('already exists')) {
        logger.debug('Database', 'Columna separateCash ya existe en SaleItem');
      } else {
        logger.error('Database', 'Error agregando separateCash a SaleItem', e);
      }
    }

    // Migración: agregar campos de pago mixto a Sale (v1.0.15)
    try {
      await prisma.$executeRawUnsafe('ALTER TABLE "Sale" ADD COLUMN "mixedPaymentMethod1" TEXT;');
      logger.info('Database', 'Columna mixedPaymentMethod1 agregada a Sale');
    } catch (e: any) {
      if (e.message?.includes('duplicate column') || e.message?.includes('already exists')) {
        logger.debug('Database', 'Columna mixedPaymentMethod1 ya existe en Sale');
      } else {
        logger.error('Database', 'Error agregando mixedPaymentMethod1 a Sale', e);
      }
    }

    try {
      await prisma.$executeRawUnsafe('ALTER TABLE "Sale" ADD COLUMN "mixedPaymentAmount1" REAL;');
      logger.info('Database', 'Columna mixedPaymentAmount1 agregada a Sale');
    } catch (e: any) {
      if (e.message?.includes('duplicate column') || e.message?.includes('already exists')) {
        logger.debug('Database', 'Columna mixedPaymentAmount1 ya existe en Sale');
      } else {
        logger.error('Database', 'Error agregando mixedPaymentAmount1 a Sale', e);
      }
    }

    try {
      await prisma.$executeRawUnsafe('ALTER TABLE "Sale" ADD COLUMN "mixedPaymentMethod2" TEXT;');
      logger.info('Database', 'Columna mixedPaymentMethod2 agregada a Sale');
    } catch (e: any) {
      if (e.message?.includes('duplicate column') || e.message?.includes('already exists')) {
        logger.debug('Database', 'Columna mixedPaymentMethod2 ya existe en Sale');
      } else {
        logger.error('Database', 'Error agregando mixedPaymentMethod2 a Sale', e);
      }
    }

    try {
      await prisma.$executeRawUnsafe('ALTER TABLE "Sale" ADD COLUMN "mixedPaymentAmount2" REAL;');
      logger.info('Database', 'Columna mixedPaymentAmount2 agregada a Sale');
    } catch (e: any) {
      if (e.message?.includes('duplicate column') || e.message?.includes('already exists')) {
        logger.debug('Database', 'Columna mixedPaymentAmount2 ya existe en Sale');
      } else {
        logger.error('Database', 'Error agregando mixedPaymentAmount2 a Sale', e);
      }
    }

    // Migración: crear tabla ComboComponent si no existe
    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "ComboComponent" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "comboId" TEXT NOT NULL,
          "componentId" TEXT NOT NULL,
          "quantity" REAL NOT NULL DEFAULT 1,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "ComboComponent_comboId_fkey" FOREIGN KEY ("comboId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT "ComboComponent_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
        );
      `);
      await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "ComboComponent_comboId_idx" ON "ComboComponent"("comboId");');
      await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "ComboComponent_componentId_idx" ON "ComboComponent"("componentId");');
      logger.debug('Database', 'Tabla ComboComponent creada/verificada');
    } catch (e) {
      // Tabla ya existe, ignorar
    }

    // Agregar columna requirePasswordChange si no existe
    try {
      await prisma.$executeRawUnsafe('ALTER TABLE "User" ADD COLUMN "requirePasswordChange" INTEGER NOT NULL DEFAULT 0;');
      logger.debug('Database', 'Columna requirePasswordChange agregada a User');
    } catch (e) {
      // Columna ya existe, ignorar
    }
    
    logger.info('Database', 'Migraciones de esquema completadas');
    
    // =====================================================
    // FIN MIGRACIONES - ahora podemos usar Prisma normalmente
    // =====================================================
    
    // VERIFICACIÓN: Detectar BD vacía con backups disponibles
    // Esto captura casos donde la BD existe pero perdió sus datos
    await checkForEmptyDatabaseWithBackups();

    // Crear usuario admin por defecto si no existe
    const adminExists = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });

    if (!adminExists) {
      // Generar contraseña temporal aleatoria (más segura que admin123)
      const tempPassword = generateSecurePassword();
      const hashedPassword = await bcrypt.hash(tempPassword, 10);
      
      await prisma.user.create({
        data: {
          username: 'admin',
          password: hashedPassword,
          pin: '0000',
          name: 'Administrador',
          role: 'ADMIN',
        }
      });
      
      // Marcar que requiere cambio de contraseña
      await prisma.$executeRawUnsafe('UPDATE "User" SET "requirePasswordChange" = 1 WHERE username = "admin";');
      
      // Guardar la contraseña temporal en un archivo para el primer inicio
      const credentialsPath = isDev 
        ? path.join(__dirname, '../../../CREDENCIALES_INICIALES.txt')
        : path.join(app.getPath('userData'), 'CREDENCIALES_INICIALES.txt');
      
      const credentialsContent = `
========================================
   CREDENCIALES INICIALES - StockPOS
========================================

Usuario: admin
Contraseña: ${tempPassword}
PIN: 0000

IMPORTANTE: Cambie estas credenciales
inmediatamente después del primer inicio.

Este archivo se puede eliminar después
de configurar su nueva contraseña.
========================================
`;
      fs.writeFileSync(credentialsPath, credentialsContent, 'utf8');
      
      logger.warn('Database', 'Usuario admin creado con credenciales temporales');
      logger.info('Database', `Credenciales guardadas en: ${credentialsPath}`);
    }

    // Crear configuración por defecto si no existe
    const configExists = await prisma.appConfig.findUnique({
      where: { id: 'config' }
    });

    if (!configExists) {
      await prisma.appConfig.create({
        data: {
          id: 'config',
          businessName: 'Mi Negocio',
        }
      });
      logger.info('Database', 'Configuracion inicial creada');
    }

    // Crear categorías por defecto si no existen
    const categoriesCount = await prisma.category.count();

    if (categoriesCount === 0) {
      const defaultCategories = [
        { name: 'Golosinas', color: '#f59e0b', icon: 'FaCandyCane', order: 1 },
        { name: 'Bebidas', color: '#3b82f6', icon: 'FaBottleWater', order: 2 },
        { name: 'Cigarrillos', color: '#6b7280', icon: 'FaSmoking', order: 3 },
        { name: 'Snacks', color: '#22c55e', icon: 'FaCookie', order: 4 },
        { name: 'Lacteos', color: '#f1f5f9', icon: 'FaCheese', order: 5 },
        { name: 'Helados', color: '#06b6d4', icon: 'FaIceCream', order: 6 },
        { name: 'Limpieza', color: '#8b5cf6', icon: 'FaSprayCanSparkles', order: 7 },
        { name: 'Varios', color: '#ec4899', icon: 'FaBox', order: 8 },
      ];

      for (const category of defaultCategories) {
        await prisma.category.create({ data: category });
      }
      logger.info('Database', 'Categorias por defecto creadas');
    }

    // Crear productos de ejemplo si no existen
    const productsCount = await prisma.product.count();

    if (productsCount === 0) {
      // Obtener categorías para asignar productos
      const categories = await prisma.category.findMany();
      const getCategoryId = (name: string) => categories.find(c => c.name === name)?.id || null;

      const sampleProducts = [
        // Golosinas
        { barcode: '7790040135406', name: 'Alfajor Triple Havanna', price: 2500, cost: 1800, stock: 24, categoryId: getCategoryId('Golosinas') },
        { barcode: '7790580001018', name: 'Alfajor Aguila', price: 800, cost: 550, stock: 36, categoryId: getCategoryId('Golosinas') },
        { barcode: '7790895000706', name: 'Alfajor Capitán del Espacio', price: 700, cost: 450, stock: 48, categoryId: getCategoryId('Golosinas') },
        { barcode: '7790895640046', name: 'Chocolate Shot', price: 400, cost: 280, stock: 60, categoryId: getCategoryId('Golosinas') },
        { barcode: '7790895001247', name: 'Caramelos Media Hora x10', price: 500, cost: 320, stock: 30, categoryId: getCategoryId('Golosinas') },
        { barcode: '7790580002015', name: 'Chicle Beldent x3', price: 600, cost: 400, stock: 40, categoryId: getCategoryId('Golosinas') },
        { barcode: '7790580003012', name: 'Paleta Chupa Chups', price: 350, cost: 220, stock: 50, categoryId: getCategoryId('Golosinas') },
        
        // Bebidas
        { barcode: '7790895005009', name: 'Coca Cola 500ml', price: 1800, cost: 1200, stock: 48, categoryId: getCategoryId('Bebidas') },
        { barcode: '7790895006006', name: 'Sprite 500ml', price: 1700, cost: 1150, stock: 36, categoryId: getCategoryId('Bebidas') },
        { barcode: '7790895007003', name: 'Fanta Naranja 500ml', price: 1700, cost: 1150, stock: 24, categoryId: getCategoryId('Bebidas') },
        { barcode: '7790895008000', name: 'Agua Mineral 500ml', price: 900, cost: 550, stock: 60, categoryId: getCategoryId('Bebidas') },
        { barcode: '7790895009007', name: 'Powerade 500ml', price: 2200, cost: 1600, stock: 24, categoryId: getCategoryId('Bebidas') },
        { barcode: '7790895010003', name: 'Speed Max 250ml', price: 1800, cost: 1300, stock: 36, categoryId: getCategoryId('Bebidas') },
        { barcode: '7790895011000', name: 'Coca Cola 2.25L', price: 3500, cost: 2400, stock: 12, categoryId: getCategoryId('Bebidas') },
        
        // Cigarrillos
        { barcode: '7791620001001', name: 'Marlboro Box 20', price: 3500, cost: 2800, stock: 20, categoryId: getCategoryId('Cigarrillos'), isCigarette: true, minStock: 10 },
        { barcode: '7791620002008', name: 'Camel Box 20', price: 3200, cost: 2500, stock: 15, categoryId: getCategoryId('Cigarrillos'), isCigarette: true, minStock: 10 },
        { barcode: '7791620003005', name: 'Lucky Strike 20', price: 3000, cost: 2400, stock: 18, categoryId: getCategoryId('Cigarrillos'), isCigarette: true, minStock: 10 },
        { barcode: '7791620004002', name: 'Philip Morris 20', price: 2800, cost: 2200, stock: 15, categoryId: getCategoryId('Cigarrillos'), isCigarette: true, minStock: 10 },
        { barcode: '7791620005009', name: 'Chesterfield 20', price: 2600, cost: 2000, stock: 12, categoryId: getCategoryId('Cigarrillos'), isCigarette: true, minStock: 10 },
        
        // Snacks
        { barcode: '7792170001006', name: 'Papas Lays Clásicas 45g', price: 1200, cost: 850, stock: 30, categoryId: getCategoryId('Snacks') },
        { barcode: '7792170002003', name: 'Doritos Queso 45g', price: 1300, cost: 900, stock: 24, categoryId: getCategoryId('Snacks') },
        { barcode: '7792170003000', name: 'Cheetos 40g', price: 1100, cost: 750, stock: 36, categoryId: getCategoryId('Snacks') },
        { barcode: '7792170004007', name: 'Maní con Chocolate 80g', price: 900, cost: 600, stock: 20, categoryId: getCategoryId('Snacks') },
        { barcode: '7792170005004', name: 'Palitos Salados 200g', price: 1400, cost: 950, stock: 18, categoryId: getCategoryId('Snacks') },
        { barcode: '7792170006001', name: 'Galletitas Oreo', price: 800, cost: 550, stock: 40, categoryId: getCategoryId('Snacks') },
        
        // Lacteos
        { barcode: '7793400001007', name: 'Yogurt Ser 180g', price: 1200, cost: 850, stock: 20, categoryId: getCategoryId('Lacteos'), minStock: 8 },
        { barcode: '7793400002004', name: 'Leche La Serenísima 1L', price: 1400, cost: 1000, stock: 15, categoryId: getCategoryId('Lacteos'), minStock: 5 },
        { barcode: '7793400003001', name: 'Queso Cremoso 200g', price: 2200, cost: 1600, stock: 10, categoryId: getCategoryId('Lacteos'), minStock: 3 },
        { barcode: '7793400004008', name: 'Manteca 200g', price: 1800, cost: 1300, stock: 8, categoryId: getCategoryId('Lacteos'), minStock: 3 },
        
        // Helados
        { barcode: '7794500001008', name: 'Palito de Agua', price: 800, cost: 500, stock: 30, categoryId: getCategoryId('Helados') },
        { barcode: '7794500002005', name: 'Bombón Helado', price: 1500, cost: 1000, stock: 24, categoryId: getCategoryId('Helados') },
        { barcode: '7794500003002', name: 'Sándwich Helado', price: 1200, cost: 800, stock: 20, categoryId: getCategoryId('Helados') },
        { barcode: '7794500004009', name: 'Cornetto', price: 1800, cost: 1200, stock: 18, categoryId: getCategoryId('Helados') },
        
        // Limpieza
        { barcode: '7795600001009', name: 'Jabón Dove 90g', price: 900, cost: 620, stock: 15, categoryId: getCategoryId('Limpieza') },
        { barcode: '7795600002006', name: 'Shampoo Sachet 10ml', price: 250, cost: 150, stock: 50, categoryId: getCategoryId('Limpieza') },
        { barcode: '7795600003003', name: 'Papel Higiénico x4', price: 1600, cost: 1100, stock: 12, categoryId: getCategoryId('Limpieza') },
        { barcode: '7795600004000', name: 'Servilletas x50', price: 600, cost: 380, stock: 20, categoryId: getCategoryId('Limpieza') },
        
        // Varios
        { barcode: '7796700001000', name: 'Encendedor BIC', price: 800, cost: 500, stock: 30, categoryId: getCategoryId('Varios') },
        { barcode: '7796700002007', name: 'Pilas AA x2', price: 1200, cost: 800, stock: 20, categoryId: getCategoryId('Varios') },
        { barcode: '7796700003004', name: 'Cargador USB', price: 3500, cost: 2200, stock: 8, categoryId: getCategoryId('Varios') },
        { barcode: '7796700004001', name: 'Auriculares In-Ear', price: 2500, cost: 1500, stock: 10, categoryId: getCategoryId('Varios') },
        { barcode: '7796700005008', name: 'Bolsa Consorcio x10', price: 1800, cost: 1200, stock: 15, categoryId: getCategoryId('Varios') },
      ];

      for (const product of sampleProducts) {
        await prisma.product.create({ 
          data: {
            ...product,
            minStock: product.minStock || 5,
            isCigarette: product.isCigarette || false,
          }
        });
      }
      logger.info('Database', `Productos de ejemplo creados: ${sampleProducts.length} productos`);
    }

    logger.info('Database', 'Base de datos inicializada correctamente');
  } catch (error) {
    logger.error('Database', 'Error al inicializar base de datos', error);
    throw error;
  }
}

export { prisma };
