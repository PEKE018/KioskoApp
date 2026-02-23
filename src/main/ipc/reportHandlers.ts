import { ipcMain } from 'electron';
import { logger } from '../utils/logger';
import { prisma } from '../database/init';

export function registerReportHandlers() {
  // Ventas por día en un rango de fechas
  ipcMain.handle('reports:salesByDay', async (_, start: Date, end: Date) => {
    try {
      const sales = await prisma.sale.groupBy({
        by: ['createdAt'],
        where: {
          createdAt: {
            gte: new Date(start),
            lte: new Date(end),
          },
          status: 'COMPLETED',
        },
        _sum: { total: true },
        _count: true,
      });

      return { success: true, data: sales };
    } catch (error) {
      logger.error('Reports', 'Error getting sales by day', error);
      return { success: false, error: 'Error al obtener ventas por día' };
    }
  });

  // Top productos más vendidos
  ipcMain.handle('reports:topProducts', async (_, limit: number = 10, start?: Date, end?: Date) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const startDate = start ? new Date(start) : today;
      const endDate = end ? new Date(end) : tomorrow;

      // Obtener items de venta agrupados por producto
      const items = await prisma.saleItem.groupBy({
        by: ['productId'],
        where: {
          sale: {
            status: 'COMPLETED',
            createdAt: {
              gte: startDate,
              lt: endDate,
            },
          },
        },
        _sum: {
          quantity: true,
          subtotal: true,
        },
        orderBy: {
          _sum: {
            quantity: 'desc',
          },
        },
        take: limit,
      });

      // Obtener nombres de productos
      const productIds = items.map(i => i.productId);
      const products = await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, name: true },
      });

      const productMap = new Map(products.map(p => [p.id, p.name]));

      const result = items.map(item => ({
        productId: item.productId,
        productName: productMap.get(item.productId) || 'Producto eliminado',
        totalQuantity: item._sum.quantity || 0,
        totalRevenue: item._sum.subtotal || 0,
      }));

      return { success: true, data: result };
    } catch (error) {
      logger.error('Reports', 'Error getting top products', error);
      return { success: false, error: 'Error al obtener top productos' };
    }
  });

  // Reporte de ganancias
  ipcMain.handle('reports:profit', async (_, start: Date, end: Date) => {
    try {
      const sales = await prisma.sale.aggregate({
        where: {
          createdAt: {
            gte: new Date(start),
            lte: new Date(end),
          },
          status: 'COMPLETED',
        },
        _sum: { total: true, discount: true },
        _count: true,
      });

      return {
        success: true,
        data: {
          totalSales: sales._sum.total || 0,
          totalDiscount: sales._sum.discount || 0,
          salesCount: sales._count,
        },
      };
    } catch (error) {
      logger.error('Reports', 'Error getting profit report', error);
      return { success: false, error: 'Error al obtener reporte de ganancias' };
    }
  });

  // Reporte por categoría
  ipcMain.handle('reports:byCategory', async (_, start?: Date, end?: Date) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const startDate = start ? new Date(start) : today;
      const endDate = end ? new Date(end) : tomorrow;

      // Obtener categorías con sus productos y ventas
      const categories = await prisma.category.findMany({
        where: { active: true },
        include: {
          products: {
            where: { active: true },
            include: {
              saleItems: {
                where: {
                  sale: {
                    status: 'COMPLETED',
                    createdAt: {
                      gte: startDate,
                      lt: endDate,
                    },
                  },
                },
              },
            },
          },
        },
      });

      const result = categories.map(cat => {
        const totalQuantity = cat.products.reduce((sum, prod) => 
          sum + prod.saleItems.reduce((s, item) => s + item.quantity, 0), 0);
        const totalRevenue = cat.products.reduce((sum, prod) => 
          sum + prod.saleItems.reduce((s, item) => s + item.subtotal, 0), 0);

        return {
          categoryId: cat.id,
          categoryName: cat.name,
          color: cat.color,
          totalQuantity,
          totalRevenue,
        };
      }).filter(c => c.totalQuantity > 0)
        .sort((a, b) => b.totalRevenue - a.totalRevenue);

      return { success: true, data: result };
    } catch (error) {
      logger.error('Reports', 'Error getting category report', error);
      return { success: false, error: 'Error al obtener reporte por categoría' };
    }
  });

  // === NUEVO: Reporte por cajero/turno ===
  ipcMain.handle('reports:byCashier', async (_, date?: Date) => {
    try {
      const targetDate = date ? new Date(date) : new Date();
      targetDate.setHours(0, 0, 0, 0);
      const nextDay = new Date(targetDate);
      nextDay.setDate(nextDay.getDate() + 1);

      // Obtener todas las sesiones de caja del día
      const cashRegisters = await prisma.cashRegister.findMany({
        where: {
          openedAt: {
            gte: targetDate,
            lt: nextDay,
          },
        },
        include: {
          user: {
            select: { id: true, name: true, username: true },
          },
          sales: {
            where: { status: 'COMPLETED' },
            include: {
              items: true,
            },
          },
        },
        orderBy: { openedAt: 'asc' },
      });

      // Procesar datos por cada turno de caja
      const result = cashRegisters.map(register => {
        const totalSales = register.sales.reduce((sum, sale) => sum + sale.total, 0);
        const salesCount = register.sales.length;
        const itemsCount = register.sales.reduce((sum, sale) => 
          sum + sale.items.reduce((s, item) => s + item.quantity, 0), 0);

        // Agrupar por método de pago
        const byPaymentMethod: Record<string, { count: number; total: number }> = {};
        register.sales.forEach(sale => {
          if (!byPaymentMethod[sale.paymentMethod]) {
            byPaymentMethod[sale.paymentMethod] = { count: 0, total: 0 };
          }
          byPaymentMethod[sale.paymentMethod].count++;
          byPaymentMethod[sale.paymentMethod].total += sale.total;
        });

        return {
          cashRegisterId: register.id,
          cashier: {
            id: register.user.id,
            name: register.user.name,
            username: register.user.username,
          },
          status: register.status,
          openedAt: register.openedAt,
          closedAt: register.closedAt,
          initialAmount: register.initialAmount,
          finalAmount: register.finalAmount,
          salesTotal: totalSales,
          difference: register.difference,
          salesCount,
          itemsCount,
          byPaymentMethod: Object.entries(byPaymentMethod).map(([method, data]) => ({
            method,
            count: data.count,
            total: data.total,
          })),
        };
      });

      // También obtener ventas sin caja asignada (por si hay)
      const salesWithoutRegister = await prisma.sale.findMany({
        where: {
          createdAt: {
            gte: targetDate,
            lt: nextDay,
          },
          status: 'COMPLETED',
          cashRegisterId: null,
        },
        include: {
          user: {
            select: { id: true, name: true, username: true },
          },
          items: true,
        },
      });

      // Agrupar ventas sin caja por usuario
      const salesByUserWithoutRegister: Record<string, {
        user: { id: string; name: string; username: string };
        sales: typeof salesWithoutRegister;
      }> = {};

      salesWithoutRegister.forEach(sale => {
        if (!salesByUserWithoutRegister[sale.userId]) {
          salesByUserWithoutRegister[sale.userId] = {
            user: sale.user,
            sales: [],
          };
        }
        salesByUserWithoutRegister[sale.userId].sales.push(sale);
      });

      const unassignedSales = Object.values(salesByUserWithoutRegister).map(group => {
        const totalSales = group.sales.reduce((sum, sale) => sum + sale.total, 0);
        const salesCount = group.sales.length;
        const itemsCount = group.sales.reduce((sum, sale) => 
          sum + sale.items.reduce((s, item) => s + item.quantity, 0), 0);

        const byPaymentMethod: Record<string, { count: number; total: number }> = {};
        group.sales.forEach(sale => {
          if (!byPaymentMethod[sale.paymentMethod]) {
            byPaymentMethod[sale.paymentMethod] = { count: 0, total: 0 };
          }
          byPaymentMethod[sale.paymentMethod].count++;
          byPaymentMethod[sale.paymentMethod].total += sale.total;
        });

        return {
          cashRegisterId: null,
          cashier: group.user,
          status: 'NO_REGISTER',
          openedAt: null,
          closedAt: null,
          initialAmount: 0,
          finalAmount: null,
          salesTotal: totalSales,
          difference: null,
          salesCount,
          itemsCount,
          byPaymentMethod: Object.entries(byPaymentMethod).map(([method, data]) => ({
            method,
            count: data.count,
            total: data.total,
          })),
        };
      });

      // Calcular totales del día
      const allShifts = [...result, ...unassignedSales];
      const dayTotal = {
        totalSales: allShifts.reduce((sum, s) => sum + s.salesTotal, 0),
        totalTransactions: allShifts.reduce((sum, s) => sum + s.salesCount, 0),
        totalItems: allShifts.reduce((sum, s) => sum + s.itemsCount, 0),
        shiftsCount: result.length,
      };

      return {
        success: true,
        data: {
          date: targetDate.toISOString().split('T')[0],
          dayTotal,
          shifts: result,
          unassignedSales,
        },
      };
    } catch (error) {
      logger.error('Reports', 'Error getting cashier report', error);
      return { success: false, error: 'Error al obtener reporte por cajero' };
    }
  });

  // Historial de turnos de un cajero específico
  ipcMain.handle('reports:cashierHistory', async (_, userId: string, days: number = 7) => {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      startDate.setHours(0, 0, 0, 0);

      const cashRegisters = await prisma.cashRegister.findMany({
        where: {
          userId,
          openedAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          user: {
            select: { id: true, name: true },
          },
          sales: {
            where: { status: 'COMPLETED' },
          },
        },
        orderBy: { openedAt: 'desc' },
      });

      const result = cashRegisters.map(register => ({
        id: register.id,
        date: register.openedAt,
        openedAt: register.openedAt,
        closedAt: register.closedAt,
        status: register.status,
        initialAmount: register.initialAmount,
        finalAmount: register.finalAmount,
        salesTotal: register.sales.reduce((sum, s) => sum + s.total, 0),
        salesCount: register.sales.length,
        difference: register.difference,
      }));

      return { success: true, data: result };
    } catch (error) {
      logger.error('Reports', 'Error getting cashier history', error);
      return { success: false, error: 'Error al obtener historial del cajero' };
    }
  });
}
