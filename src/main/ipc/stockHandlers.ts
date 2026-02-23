import { IpcMain } from 'electron';
import { logger } from '../utils/logger';
import { prisma } from '../database/init';

// Usuario actual (se setea desde authHandlers)
let currentUserId: string | null = null;

export function setCurrentUser(userId: string | null): void {
  currentUserId = userId;
}

export function registerStockHandlers(ipcMain: IpcMain): void {
  // Agregar stock (entrada de mercadería)
  ipcMain.handle('stock:add', async (_, productId: string, quantity: number, reason: string, userId?: string) => {
    try {
      const effectiveUserId = userId || currentUserId;
      if (!effectiveUserId) {
        return { success: false, error: 'Usuario no autenticado' };
      }

      if (quantity <= 0) {
        return { success: false, error: 'La cantidad debe ser mayor a 0' };
      }

      const result = await prisma.$transaction(async (tx) => {
        const product = await tx.product.findUnique({
          where: { id: productId },
        });

        if (!product) {
          throw new Error('Producto no encontrado');
        }

        const newStock = product.stock + quantity;

        // Actualizar stock
        const updatedProduct = await tx.product.update({
          where: { id: productId },
          data: { stock: newStock },
          include: { category: true },
        });

        // Registrar movimiento
        await tx.stockMovement.create({
          data: {
            type: 'IN',
            quantity,
            reason,
            stockBefore: product.stock,
            stockAfter: newStock,
            productId,
            userId: effectiveUserId,
          },
        });

        return updatedProduct;
      });

      return { success: true, data: result };
    } catch (error) {
      logger.error('Stock', 'Error adding stock', error);
      return { success: false, error: 'Error al agregar stock' };
    }
  });

  // Quitar stock manualmente
  ipcMain.handle('stock:remove', async (_, productId: string, quantity: number, reason: string, userId?: string) => {
    try {
      const effectiveUserId = userId || currentUserId;
      if (!effectiveUserId) {
        return { success: false, error: 'Usuario no autenticado' };
      }

      if (quantity <= 0) {
        return { success: false, error: 'La cantidad debe ser mayor a 0' };
      }

      const result = await prisma.$transaction(async (tx) => {
        const product = await tx.product.findUnique({
          where: { id: productId },
        });

        if (!product) {
          throw new Error('Producto no encontrado');
        }

        if (product.stock < quantity) {
          throw new Error('Stock insuficiente');
        }

        const newStock = product.stock - quantity;

        // Actualizar stock
        const updatedProduct = await tx.product.update({
          where: { id: productId },
          data: { stock: newStock },
          include: { category: true },
        });

        // Registrar movimiento
        await tx.stockMovement.create({
          data: {
            type: 'OUT',
            quantity: -quantity,
            reason,
            stockBefore: product.stock,
            stockAfter: newStock,
            productId,
            userId: effectiveUserId,
          },
        });

        return updatedProduct;
      });

      return { success: true, data: result };
    } catch (error) {
      logger.error('Stock', 'Error removing stock', error);
      const message = error instanceof Error ? error.message : 'Error al quitar stock';
      return { success: false, error: message };
    }
  });

  // Ajustar stock (para correcciones de inventario)
  ipcMain.handle('stock:adjust', async (_, productId: string, newQuantity: number, reason: string, userId?: string) => {
    try {
      const effectiveUserId = userId || currentUserId;
      if (!effectiveUserId) {
        return { success: false, error: 'Usuario no autenticado' };
      }

      if (newQuantity < 0) {
        return { success: false, error: 'El stock no puede ser negativo' };
      }

      const result = await prisma.$transaction(async (tx) => {
        const product = await tx.product.findUnique({
          where: { id: productId },
        });

        if (!product) {
          throw new Error('Producto no encontrado');
        }

        const difference = newQuantity - product.stock;

        // Actualizar stock
        const updatedProduct = await tx.product.update({
          where: { id: productId },
          data: { stock: newQuantity },
          include: { category: true },
        });

        // Registrar movimiento
        await tx.stockMovement.create({
          data: {
            type: 'ADJUSTMENT',
            quantity: difference,
            reason: `Ajuste de inventario: ${reason}`,
            stockBefore: product.stock,
            stockAfter: newQuantity,
            productId,
            userId: effectiveUserId,
          },
        });

        return updatedProduct;
      });

      return { success: true, data: result };
    } catch (error) {
      logger.error('Stock', 'Error adjusting stock', error);
      return { success: false, error: 'Error al ajustar stock' };
    }
  });

  // Obtener movimientos de un producto
  ipcMain.handle('stock:getMovements', async (_, productId: string) => {
    try {
      const movements = await prisma.stockMovement.findMany({
        where: { productId },
        include: {
          user: { select: { name: true } },
          product: { select: { name: true, barcode: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });

      return { success: true, data: movements };
    } catch (error) {
      logger.error('Stock', 'Error getting stock movements', error);
      return { success: false, error: 'Error al obtener movimientos' };
    }
  });

  // Obtener todos los movimientos recientes
  ipcMain.handle('stock:getAllMovements', async (_, limit?: number) => {
    try {
      const movements = await prisma.stockMovement.findMany({
        include: {
          user: { select: { name: true } },
          product: { select: { name: true, barcode: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit ?? 50,
      });

      return { success: true, data: movements };
    } catch (error) {
      logger.error('Stock', 'Error getting all stock movements', error);
      return { success: false, error: 'Error al obtener movimientos' };
    }
  });
}
