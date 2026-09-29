import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

/**
 * SQL de creación de tablas y funciones de migración de esquema.
 *
 * Este módulo es la ÚNICA fuente de verdad para la estructura de la base de
 * datos de StockPOS. Se usa tanto en el flujo normal de arranque (init.ts)
 * como en la migración de bases legacy de KioskoApp (legacyMigration.ts),
 * para garantizar que ambos caminos aplican EXACTAMENTE las mismas reglas.
 *
 * IMPORTANTE: todas las migraciones deben ser aditivas (CREATE TABLE IF NOT
 * EXISTS / ALTER TABLE ADD COLUMN). Nunca agregar aquí DROP TABLE, DELETE,
 * TRUNCATE ni "migrate reset". Los errores de "columna/tabla ya existe" se
 * ignoran intencionalmente: son la forma en que este proyecto maneja
 * bases de datos que ya tienen ese cambio aplicado.
 */

export const CREATE_TABLES_SQL = `
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

export async function createTables(prisma: PrismaClient): Promise<void> {
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

export async function tablesExist(prisma: PrismaClient): Promise<boolean> {
  try {
    const result = await prisma.$queryRaw<Array<{name: string}>>`
      SELECT name FROM sqlite_master WHERE type='table' AND name='User'
    `;
    return result.length > 0;
  } catch {
    return false;
  }
}


export async function runAdditiveMigrations(prisma: PrismaClient): Promise<void> {
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
}
