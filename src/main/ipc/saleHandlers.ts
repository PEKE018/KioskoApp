import { IpcMain } from 'electron';
import { prisma } from '../database/init';

interface SaleItemData {
  productId: string;
  quantity: number;
  unitPrice: number;
}

interface CreateSaleData {
  items: SaleItemData[];
  paymentMethod: 'CASH' | 'DEBIT' | 'CREDIT' | 'MERCADOPAGO' | 'TRANSFER' | 'FIADO' | 'OTHER';
  amountPaid: number;
  discount?: number;
  transferFee?: number;
  userId: string;
  cashRegisterId?: string;
  customerId?: string; // Para ventas fiadas
}

export function registerSaleHandlers(ipcMain: IpcMain): void {
  // Crear venta (punto de venta)
  ipcMain.handle('sales:create', async (_, data: CreateSaleData) => {
    try {
      // Calcular totales
      const subtotal = data.items.reduce(
        (sum, item) => sum + item.quantity * item.unitPrice,
        0
      );
      const discount = data.discount ?? 0;
      const transferFee = data.transferFee ?? 0;
      const total = subtotal - discount + transferFee;
      const change = data.amountPaid - total;

      // Transacción: crear venta + descontar stock
      const result = await prisma.$transaction(async (tx) => {
        // 1. Crear la venta
        const sale = await tx.sale.create({
          data: {
            subtotal,
            discount,
            total,
            paymentMethod: data.paymentMethod,
            amountPaid: data.amountPaid,
            change: change > 0 ? change : 0,
            userId: data.userId,
            cashRegisterId: data.cashRegisterId,
            customerId: data.customerId, // Para ventas fiadas
            items: {
              create: data.items.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                subtotal: item.quantity * item.unitPrice,
              })),
            },
          },
          include: {
            items: { include: { product: true } },
            user: { select: { name: true } },
            customer: { select: { name: true } },
          },
        });

        // 2. Descontar stock de cada producto
        for (const item of data.items) {
          const product = await tx.product.findUnique({
            where: { id: item.productId },
          });

          if (!product) {
            throw new Error(`Producto no encontrado: ${item.productId}`);
          }

          const newStock = product.stock - item.quantity;

          // Actualizar stock
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: newStock },
          });

          // Registrar movimiento de stock
          await tx.stockMovement.create({
            data: {
              type: 'SALE',
              quantity: -item.quantity,
              reason: `Venta #${sale.id.slice(0, 8)}`,
              stockBefore: product.stock,
              stockAfter: newStock,
              productId: item.productId,
              userId: data.userId,
              saleId: sale.id,
            },
          });
        }

        // 3. Actualizar total de ventas en caja (si es efectivo)
        if (data.cashRegisterId && data.paymentMethod === 'CASH') {
          await tx.cashRegister.update({
            where: { id: data.cashRegisterId },
            data: {
              salesTotal: { increment: total },
            },
          });
        }

        // 4. Si es fiado, actualizar balance del cliente
        if (data.paymentMethod === 'FIADO' && data.customerId) {
          await tx.customer.update({
            where: { id: data.customerId },
            data: {
              balance: { increment: total },
            },
          });
        }

        return sale;
      });

      return { success: true, data: result };
    } catch (error) {
      console.error('Error creating sale:', error);
      return { success: false, error: 'Error al procesar la venta' };
    }
  });

  // Obtener ventas del día
  ipcMain.handle('sales:getToday', async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const sales = await prisma.sale.findMany({
        where: {
          createdAt: {
            gte: today,
            lt: tomorrow,
          },
        },
        include: {
          items: { include: { product: true } },
          user: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      return { success: true, data: sales };
    } catch (error) {
      console.error('Error getting today sales:', error);
      return { success: false, error: 'Error al obtener ventas del día' };
    }
  });

  // Obtener ventas por rango de fechas
  ipcMain.handle('sales:getByDateRange', async (_, start: Date, end: Date) => {
    try {
      const sales = await prisma.sale.findMany({
        where: {
          createdAt: {
            gte: new Date(start),
            lte: new Date(end),
          },
        },
        include: {
          items: { include: { product: true } },
          user: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      return { success: true, data: sales };
    } catch (error) {
      console.error('Error getting sales by date range:', error);
      return { success: false, error: 'Error al obtener ventas' };
    }
  });

  // Obtener venta por ID
  ipcMain.handle('sales:getById', async (_, id: string) => {
    try {
      const sale = await prisma.sale.findUnique({
        where: { id },
        include: {
          items: { include: { product: true } },
          user: { select: { name: true } },
        },
      });

      if (!sale) {
        return { success: false, error: 'Venta no encontrada' };
      }

      return { success: true, data: sale };
    } catch (error) {
      console.error('Error getting sale:', error);
      return { success: false, error: 'Error al obtener venta' };
    }
  });

  // Cancelar venta (y restaurar stock)
  ipcMain.handle('sales:cancel', async (_, id: string, reason: string) => {
    try {
      const result = await prisma.$transaction(async (tx) => {
        // Obtener la venta
        const sale = await tx.sale.findUnique({
          where: { id },
          include: { items: true },
        });

        if (!sale) {
          throw new Error('Venta no encontrada');
        }

        if (sale.status === 'CANCELLED') {
          throw new Error('La venta ya está cancelada');
        }

        // Restaurar stock de cada producto
        for (const item of sale.items) {
          const product = await tx.product.findUnique({
            where: { id: item.productId },
          });

          if (product) {
            const newStock = product.stock + item.quantity;

            await tx.product.update({
              where: { id: item.productId },
              data: { stock: newStock },
            });

            await tx.stockMovement.create({
              data: {
                type: 'RETURN',
                quantity: item.quantity,
                reason: `Cancelación venta #${sale.id.slice(0, 8)}: ${reason}`,
                stockBefore: product.stock,
                stockAfter: newStock,
                productId: item.productId,
                userId: sale.userId,
              },
            });
          }
        }

        // Marcar venta como cancelada
        const updatedSale = await tx.sale.update({
          where: { id },
          data: {
            status: 'CANCELLED',
            cancelReason: reason,
          },
        });

        return updatedSale;
      });

      return { success: true, data: result };
    } catch (error) {
      console.error('Error cancelling sale:', error);
      return { success: false, error: 'Error al cancelar venta' };
    }
  });

  // Resumen diario de ventas
  ipcMain.handle('sales:getDailySummary', async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const [salesData, countByPayment] = await Promise.all([
        // Total general
        prisma.sale.aggregate({
          where: {
            createdAt: { gte: today, lt: tomorrow },
            status: 'COMPLETED',
          },
          _sum: { total: true },
          _count: true,
        }),
        // Por método de pago
        prisma.sale.groupBy({
          by: ['paymentMethod'],
          where: {
            createdAt: { gte: today, lt: tomorrow },
            status: 'COMPLETED',
          },
          _sum: { total: true },
          _count: true,
        }),
      ]);

      return {
        success: true,
        data: {
          totalSales: salesData._sum.total ?? 0,
          salesCount: salesData._count,
          byPaymentMethod: countByPayment,
        },
      };
    } catch (error) {
      console.error('Error getting daily summary:', error);
      return { success: false, error: 'Error al obtener resumen' };
    }
  });
}
