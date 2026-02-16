import { IpcMain } from 'electron';
import { prisma } from '../database/init';

interface CreateCustomerData {
  name: string;
  phone?: string;
  notes?: string;
}

interface UpdateCustomerData {
  name?: string;
  phone?: string;
  notes?: string;
  active?: boolean;
}

interface RegisterPaymentData {
  customerId: string;
  amount: number;
  notes?: string;
}

export function registerCustomerHandlers(ipcMain: IpcMain): void {
  // Obtener todos los clientes
  ipcMain.handle('customers:getAll', async () => {
    try {
      const customers = await prisma.customer.findMany({
        where: { active: true },
        orderBy: { name: 'asc' },
        include: {
          _count: {
            select: { sales: true, payments: true }
          }
        }
      });
      return { success: true, data: customers };
    } catch (error) {
      console.error('Error getting customers:', error);
      return { success: false, error: 'Error al obtener clientes' };
    }
  });

  // Obtener cliente por ID con historial
  ipcMain.handle('customers:getById', async (_, id: string) => {
    try {
      const customer = await prisma.customer.findUnique({
        where: { id },
        include: {
          sales: {
            where: { paymentMethod: 'FIADO' },
            orderBy: { createdAt: 'desc' },
            take: 50,
            include: {
              items: { include: { product: { select: { name: true } } } }
            }
          },
          payments: {
            orderBy: { createdAt: 'desc' },
            take: 50
          }
        }
      });
      return { success: true, data: customer };
    } catch (error) {
      console.error('Error getting customer:', error);
      return { success: false, error: 'Error al obtener cliente' };
    }
  });

  // Buscar clientes por nombre
  ipcMain.handle('customers:search', async (_, query: string) => {
    try {
      const customers = await prisma.customer.findMany({
        where: {
          active: true,
          name: { contains: query }
        },
        orderBy: { name: 'asc' },
        take: 10
      });
      return { success: true, data: customers };
    } catch (error) {
      console.error('Error searching customers:', error);
      return { success: false, error: 'Error al buscar clientes' };
    }
  });

  // Crear cliente
  ipcMain.handle('customers:create', async (_, data: CreateCustomerData) => {
    try {
      const customer = await prisma.customer.create({
        data: {
          name: data.name,
          phone: data.phone,
          notes: data.notes,
          balance: 0
        }
      });
      return { success: true, data: customer };
    } catch (error) {
      console.error('Error creating customer:', error);
      return { success: false, error: 'Error al crear cliente' };
    }
  });

  // Actualizar cliente
  ipcMain.handle('customers:update', async (_, id: string, data: UpdateCustomerData) => {
    try {
      const customer = await prisma.customer.update({
        where: { id },
        data
      });
      return { success: true, data: customer };
    } catch (error) {
      console.error('Error updating customer:', error);
      return { success: false, error: 'Error al actualizar cliente' };
    }
  });

  // Registrar pago de cliente
  ipcMain.handle('customers:registerPayment', async (_, data: RegisterPaymentData) => {
    try {
      const result = await prisma.$transaction(async (tx) => {
        // Crear el pago
        const payment = await tx.creditPayment.create({
          data: {
            customerId: data.customerId,
            amount: data.amount,
            notes: data.notes
          }
        });

        // Actualizar balance del cliente
        const customer = await tx.customer.update({
          where: { id: data.customerId },
          data: {
            balance: { decrement: data.amount }
          }
        });

        return { payment, customer };
      });

      return { success: true, data: result };
    } catch (error) {
      console.error('Error registering payment:', error);
      return { success: false, error: 'Error al registrar pago' };
    }
  });

  // Eliminar cliente (soft delete)
  ipcMain.handle('customers:delete', async (_, id: string) => {
    try {
      // Verificar si tiene deuda
      const customer = await prisma.customer.findUnique({ where: { id } });
      if (customer && customer.balance > 0) {
        return { success: false, error: 'No se puede eliminar un cliente con deuda pendiente' };
      }

      await prisma.customer.update({
        where: { id },
        data: { active: false }
      });
      return { success: true };
    } catch (error) {
      console.error('Error deleting customer:', error);
      return { success: false, error: 'Error al eliminar cliente' };
    }
  });

  // Obtener clientes con deuda
  ipcMain.handle('customers:getWithDebt', async () => {
    try {
      const customers = await prisma.customer.findMany({
        where: {
          active: true,
          balance: { gt: 0 }
        },
        orderBy: { balance: 'desc' }
      });
      return { success: true, data: customers };
    } catch (error) {
      console.error('Error getting customers with debt:', error);
      return { success: false, error: 'Error al obtener clientes con deuda' };
    }
  });
}
