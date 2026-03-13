import { IpcMain, app } from 'electron';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';
import { prisma } from '../database/init';
import { setCurrentUser } from './stockHandlers';
import { logger } from '../utils/logger';

interface CreateUserData {
  username: string;
  password: string;
  pin?: string;
  name: string;
  role: 'ADMIN' | 'CASHIER';
}

interface UpdateUserData {
  username?: string;
  name?: string;
  role?: 'ADMIN' | 'CASHIER';
  pin?: string;
  active?: boolean;
}

// Sesión actual
let currentSession: {
  userId: string;
  username: string;
  name: string;
  role: 'ADMIN' | 'CASHIER';
} | null = null;

interface SeparateCashProductSummary {
  productId: string;
  productName: string;
  quantity: number;
  total: number;
  paymentMethod: string;
}

async function attachCashRegisterUser<T extends { userId: string }>(cashRegister: T | null) {
  if (!cashRegister) {
    return null;
  }

  let userName = 'Usuario desconocido';

  try {
    const user = await prisma.user.findUnique({
      where: { id: cashRegister.userId },
      select: { name: true },
    });

    if (user?.name) {
      userName = user.name;
    }
  } catch (error) {
    logger.warn('Auth', 'No se pudo resolver el usuario de la caja', error);
  }

  return {
    ...cashRegister,
    user: { name: userName },
  };
}

function calculateSeparateCashBreakdown(
  salesWithItems: Array<{
    total: number;
    paymentMethod: string;
    mixedPaymentMethod1: string | null;
    mixedPaymentAmount1: number | null;
    mixedPaymentMethod2: string | null;
    mixedPaymentAmount2: number | null;
    items: Array<{
      quantity: number;
      subtotal: number;
      product: { id: string; name: string; separateCash: boolean };
    }>;
  }>
) {
  let separateCashTotal = 0;
  const separateCashProducts: SeparateCashProductSummary[] = [];

  for (const sale of salesWithItems) {
    for (const item of sale.items) {
      if (!item.product.separateCash) {
        continue;
      }

      separateCashTotal += item.subtotal;

      if (sale.paymentMethod === 'MIXED' && sale.mixedPaymentMethod1 && sale.mixedPaymentMethod2) {
        const saleTotal = sale.total || 1;
        const proportion1 = (sale.mixedPaymentAmount1 || 0) / saleTotal;
        const proportion2 = (sale.mixedPaymentAmount2 || 0) / saleTotal;
        const amount1 = item.subtotal * proportion1;
        const amount2 = item.subtotal * proportion2;

        const existing1 = separateCashProducts.find(
          (product) => product.productId === item.product.id && product.paymentMethod === sale.mixedPaymentMethod1
        );
        if (existing1) {
          existing1.quantity += item.quantity * proportion1;
          existing1.total += amount1;
        } else {
          separateCashProducts.push({
            productId: item.product.id,
            productName: item.product.name,
            quantity: item.quantity * proportion1,
            total: amount1,
            paymentMethod: sale.mixedPaymentMethod1,
          });
        }

        const existing2 = separateCashProducts.find(
          (product) => product.productId === item.product.id && product.paymentMethod === sale.mixedPaymentMethod2
        );
        if (existing2) {
          existing2.quantity += item.quantity * proportion2;
          existing2.total += amount2;
        } else {
          separateCashProducts.push({
            productId: item.product.id,
            productName: item.product.name,
            quantity: item.quantity * proportion2,
            total: amount2,
            paymentMethod: sale.mixedPaymentMethod2,
          });
        }

        continue;
      }

      const existing = separateCashProducts.find(
        (product) => product.productId === item.product.id && product.paymentMethod === sale.paymentMethod
      );
      if (existing) {
        existing.quantity += item.quantity;
        existing.total += item.subtotal;
      } else {
        separateCashProducts.push({
          productId: item.product.id,
          productName: item.product.name,
          quantity: item.quantity,
          total: item.subtotal,
          paymentMethod: sale.paymentMethod,
        });
      }
    }
  }

  return {
    separateCashTotal,
    separateCashProducts,
  };
}

async function buildCashRegisterDetails(cashRegisterId: string) {
  const cashRegister = await prisma.cashRegister.findUnique({
    where: { id: cashRegisterId },
  });

  if (!cashRegister) {
    return null;
  }

  const cashRegisterWithUser = await attachCashRegisterUser(cashRegister);
  const salesWithItems = await prisma.sale.findMany({
    where: { cashRegisterId },
    include: {
      items: {
        include: {
          product: {
            select: { id: true, name: true, separateCash: true },
          },
        },
      },
    },
  });

  const { separateCashTotal, separateCashProducts } = calculateSeparateCashBreakdown(salesWithItems);
  const generalCashTotal = cashRegister.salesTotal - separateCashTotal;

  return {
    ...cashRegisterWithUser,
    separateCashTotal,
    separateCashProducts,
    generalCashTotal,
  };
}

export function registerAuthHandlers(ipcMain: IpcMain): void {
  // Login con usuario y contraseña
  ipcMain.handle('auth:login', async (_, username: string, password: string) => {
    try {
      const user = await prisma.user.findUnique({
        where: { username },
      });

      if (!user || !user.active) {
        return { success: false, error: 'Usuario o contraseña incorrectos' };
      }

      const isValid = await bcrypt.compare(password, user.password);

      if (!isValid) {
        return { success: false, error: 'Usuario o contraseña incorrectos' };
      }

      // Guardar sesión
      currentSession = {
        userId: user.id,
        username: user.username,
        name: user.name,
        role: user.role as 'ADMIN' | 'CASHIER',
      };

      // Setear usuario para handlers de stock
      setCurrentUser(user.id);

      return {
        success: true,
        data: {
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role,
        },
      };
    } catch (error) {
      logger.error('Auth', '\Error logging in:', error);
      return { success: false, error: 'Error al iniciar sesión' };
    }
  });

  // Login rápido con PIN
  ipcMain.handle('auth:loginWithPin', async (_, pin: string) => {
    try {
      const user = await prisma.user.findUnique({
        where: { pin },
      });

      if (!user || !user.active) {
        return { success: false, error: 'PIN incorrecto' };
      }

      // Guardar sesión
      currentSession = {
        userId: user.id,
        username: user.username,
        name: user.name,
        role: user.role as 'ADMIN' | 'CASHIER',
      };

      setCurrentUser(user.id);

      return {
        success: true,
        data: {
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role,
        },
      };
    } catch (error) {
      logger.error('Auth', '\Error logging in with PIN:', error);
      return { success: false, error: 'Error al iniciar sesión' };
    }
  });

  // Logout
  ipcMain.handle('auth:logout', async () => {
    currentSession = null;
    setCurrentUser(null);
    return { success: true };
  });

  // Obtener usuario actual
  ipcMain.handle('auth:getCurrentUser', async () => {
    if (!currentSession) {
      return { success: false, data: null };
    }
    return { success: true, data: currentSession };
  });

  // Restaurar sesión (cuando el frontend tiene usuario guardado pero el backend se reinició)
  ipcMain.handle('auth:restoreSession', async (_, userId: string) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user || !user.active) {
        return { success: false, error: 'Usuario no encontrado o inactivo' };
      }

      // Restaurar sesión
      currentSession = {
        userId: user.id,
        username: user.username,
        name: user.name,
        role: user.role as 'ADMIN' | 'CASHIER',
      };

      // Setear usuario para handlers de stock
      setCurrentUser(user.id);

      return {
        success: true,
        data: {
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role,
        },
      };
    } catch (error) {
      logger.error('Auth', '\Error restoring session:', error);
      return { success: false, error: 'Error al restaurar sesión' };
    }
  });

  // Cambiar contraseña
  ipcMain.handle('auth:changePassword', async (_, oldPassword: string, newPassword: string) => {
    try {
      if (!currentSession) {
        return { success: false, error: 'No hay sesión activa' };
      }

      const user = await prisma.user.findUnique({
        where: { id: currentSession.userId },
      });

      if (!user) {
        return { success: false, error: 'Usuario no encontrado' };
      }

      const isValid = await bcrypt.compare(oldPassword, user.password);

      if (!isValid) {
        return { success: false, error: 'Contraseña actual incorrecta' };
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);

      await prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
      });

      // Marcar que ya no requiere cambio de contraseña
      try {
        await prisma.$executeRawUnsafe('UPDATE "User" SET "requirePasswordChange" = 0 WHERE id = ?;', user.id);
      } catch (e) {
        // Columna puede no existir en versiones antiguas
      }

      // Eliminar archivo de credenciales iniciales si existe (buscar en ambas rutas posibles)
      const isDev = !app.isPackaged;
      const credentialsPaths = [
        path.join(app.getPath('userData'), 'CREDENCIALES_INICIALES.txt'),
        ...(isDev ? [path.join(__dirname, '../../../CREDENCIALES_INICIALES.txt')] : [])
      ];
      
      for (const credPath of credentialsPaths) {
        if (fs.existsSync(credPath)) {
          fs.unlinkSync(credPath);
          logger.info('Auth', 'Archivo de credenciales iniciales eliminado', { path: credPath });
        }
      }

      return { success: true };
    } catch (error) {
      logger.error('Auth', '\Error changing password:', error);
      return { success: false, error: 'Error al cambiar contraseña' };
    }
  });

  // === GESTIÓN DE USUARIOS (solo admin) ===

  // Obtener todos los usuarios
  ipcMain.handle('users:getAll', async () => {
    try {
      if (!currentSession || currentSession.role !== 'ADMIN') {
        return { success: false, error: 'Sin permisos' };
      }

      const users = await prisma.user.findMany({
        select: {
          id: true,
          username: true,
          name: true,
          role: true,
          active: true,
          createdAt: true,
        },
        orderBy: { name: 'asc' },
      });

      return { success: true, data: users };
    } catch (error) {
      logger.error('Auth', '\Error getting users:', error);
      return { success: false, error: 'Error al obtener usuarios' };
    }
  });

  // Crear usuario
  ipcMain.handle('users:create', async (_, data: CreateUserData) => {
    try {
      if (!currentSession || currentSession.role !== 'ADMIN') {
        return { success: false, error: 'Sin permisos' };
      }

      // Verificar username único
      const existing = await prisma.user.findUnique({
        where: { username: data.username },
      });

      if (existing) {
        return { success: false, error: 'El nombre de usuario ya existe' };
      }

      // Verificar PIN único si se proporciona
      if (data.pin) {
        const pinExists = await prisma.user.findUnique({
          where: { pin: data.pin },
        });
        if (pinExists) {
          return { success: false, error: 'El PIN ya está en uso' };
        }
      }

      const hashedPassword = await bcrypt.hash(data.password, 10);

      const user = await prisma.user.create({
        data: {
          username: data.username,
          password: hashedPassword,
          pin: data.pin,
          name: data.name,
          role: data.role,
        },
        select: {
          id: true,
          username: true,
          name: true,
          role: true,
          active: true,
        },
      });

      return { success: true, data: user };
    } catch (error) {
      logger.error('Auth', '\Error creating user:', error);
      return { success: false, error: 'Error al crear usuario' };
    }
  });

  // Actualizar usuario
  ipcMain.handle('users:update', async (_, id: string, data: UpdateUserData) => {
    try {
      if (!currentSession || currentSession.role !== 'ADMIN') {
        return { success: false, error: 'Sin permisos' };
      }

      // Verificar si el username ya existe (si se está cambiando)
      if (data.username) {
        const existing = await prisma.user.findFirst({
          where: { username: data.username, NOT: { id } },
        });
        if (existing) {
          return { success: false, error: 'El nombre de usuario ya existe' };
        }
      }

      // Verificar PIN único si se está cambiando
      if (data.pin) {
        const pinExists = await prisma.user.findFirst({
          where: { pin: data.pin, NOT: { id } },
        });
        if (pinExists) {
          return { success: false, error: 'El PIN ya está en uso' };
        }
      }

      const user = await prisma.user.update({
        where: { id },
        data,
        select: {
          id: true,
          username: true,
          name: true,
          role: true,
          active: true,
        },
      });

      return { success: true, data: user };
    } catch (error) {
      logger.error('Auth', '\Error updating user:', error);
      return { success: false, error: 'Error al actualizar usuario' };
    }
  });

  // Eliminar usuario (soft delete)
  ipcMain.handle('users:delete', async (_, id: string) => {
    try {
      if (!currentSession || currentSession.role !== 'ADMIN') {
        return { success: false, error: 'Sin permisos' };
      }

      // No permitir eliminarse a sí mismo
      if (id === currentSession.userId) {
        return { success: false, error: 'No puede eliminarse a sí mismo' };
      }

      await prisma.user.update({
        where: { id },
        data: { active: false },
      });

      return { success: true };
    } catch (error) {
      logger.error('Auth', '\Error deleting user:', error);
      return { success: false, error: 'Error al eliminar usuario' };
    }
  });

  // === CAJA REGISTRADORA ===

  // Abrir caja
  ipcMain.handle('cashRegister:open', async (_, initialAmount: number) => {
    try {
      if (!currentSession) {
        return { success: false, error: 'No hay sesión activa' };
      }

      // Verificar si ya hay una caja abierta
      const openCash = await prisma.cashRegister.findFirst({
        where: { status: 'OPEN' },
      });

      if (openCash) {
        return { success: false, error: 'Ya hay una caja abierta' };
      }

      const cashRegister = await prisma.cashRegister.create({
        data: {
          initialAmount,
          userId: currentSession.userId,
        },
      });

      const cashRegisterWithUser = await attachCashRegisterUser(cashRegister);

      return { success: true, data: cashRegisterWithUser };
    } catch (error) {
      logger.error('Auth', '\Error opening cash register:', error);
      return { success: false, error: 'Error al abrir caja' };
    }
  });

  // Cerrar caja
  ipcMain.handle('cashRegister:close', async (_, finalAmount: number, notes?: string) => {
    try {
      if (!currentSession) {
        return { success: false, error: 'No hay sesión activa' };
      }

      const openCash = await prisma.cashRegister.findFirst({
        where: { status: 'OPEN' },
      });

      if (!openCash) {
        return { success: false, error: 'No hay caja abierta' };
      }

      const currentDetails = await buildCashRegisterDetails(openCash.id);
      if (!currentDetails) {
        return { success: false, error: 'No se pudo obtener el detalle de caja' };
      }

      // El total esperado en caja general NO incluye los productos de caja aparte
      const expectedAmount = openCash.initialAmount + currentDetails.generalCashTotal;
      const difference = finalAmount - expectedAmount;

      const cashRegister = await prisma.cashRegister.update({
        where: { id: openCash.id },
        data: {
          status: 'CLOSED',
          finalAmount,
          difference,
          notes: notes?.trim() || null,
          closedAt: new Date(),
        },
      });

      const closedDetails = await buildCashRegisterDetails(cashRegister.id);

      // Agregar información de caja aparte al resultado
      return { 
        success: true, 
        data: {
          ...closedDetails,
        }
      };
    } catch (error) {
      logger.error('Auth', '\Error closing cash register:', error);
      return { success: false, error: 'Error al cerrar caja' };
    }
  });

  // Obtener caja actual
  ipcMain.handle('cashRegister:getCurrent', async () => {
    try {
      const openCash = await prisma.cashRegister.findFirst({
        where: { status: 'OPEN' },
      });

      if (!openCash) {
        return { success: true, data: null };
      }
      const currentDetails = await buildCashRegisterDetails(openCash.id);

      return { 
        success: true, 
        data: currentDetails,
      };
    } catch (error) {
      logger.error('Auth', '\Error getting current cash register:', error);
      return { success: false, error: 'Error al obtener caja' };
    }
  });

  ipcMain.handle('cashRegister:getById', async (_, cashRegisterId: string) => {
    try {
      const cashRegisterDetails = await buildCashRegisterDetails(cashRegisterId);

      if (!cashRegisterDetails) {
        return { success: false, error: 'Caja no encontrada' };
      }

      return { success: true, data: cashRegisterDetails };
    } catch (error) {
      logger.error('Auth', 'Error getting cash register by id:', error);
      return { success: false, error: 'Error al obtener detalle de caja' };
    }
  });

  // Forzar cierre de caja (para casos de inconsistencia después de actualizaciones)
  ipcMain.handle('cashRegister:forceClose', async () => {
    try {
      // Cerrar todas las cajas abiertas
      const result = await prisma.cashRegister.updateMany({
        where: { status: 'OPEN' },
        data: {
          status: 'CLOSED',
          closedAt: new Date(),
          finalAmount: 0,
          difference: 0,
        },
      });

      logger.info('Auth', `Cajas forzadamente cerradas: ${result.count}`);
      return { success: true, count: result.count };
    } catch (error) {
      logger.error('Auth', 'Error forzando cierre de caja:', error);
      return { success: false, error: 'Error al forzar cierre' };
    }
  });

  // Historial de cajas
  ipcMain.handle('cashRegister:getHistory', async () => {
    try {
      const history = await prisma.cashRegister.findMany({
        orderBy: { openedAt: 'desc' },
        take: 30,
      });

      const historyWithUsers = await Promise.all(
        history.map((cashRegister) => attachCashRegisterUser(cashRegister))
      );

      return { success: true, data: historyWithUsers };
    } catch (error) {
      logger.error('Auth', '\Error getting cash register history:', error);
      return { success: false, error: 'Error al obtener historial' };
    }
  });

  // Obtener credenciales iniciales (solo si existe el archivo)
  ipcMain.handle('auth:getInitialCredentials', async () => {
    try {
      // Buscar en ambas rutas posibles (producción y desarrollo)
      const isDev = !app.isPackaged;
      const credentialsPaths = [
        path.join(app.getPath('userData'), 'CREDENCIALES_INICIALES.txt'),
        ...(isDev ? [path.join(__dirname, '../../../CREDENCIALES_INICIALES.txt')] : [])
      ];
      
      let credentialsPath = '';
      for (const credPath of credentialsPaths) {
        if (fs.existsSync(credPath)) {
          credentialsPath = credPath;
          break;
        }
      }
      
      if (!credentialsPath) {
        return { success: true, data: null };
      }

      const content = fs.readFileSync(credentialsPath, 'utf-8');
      const lines = content.split('\n');
      
      let username = '';
      let password = '';
      
      for (const line of lines) {
        if (line.startsWith('Usuario:')) {
          username = line.replace('Usuario:', '').trim();
        } else if (line.startsWith('Contraseña:')) {
          password = line.replace('Contraseña:', '').trim();
        }
      }

      if (username && password) {
        return { success: true, data: { username, password } };
      }

      return { success: true, data: null };
    } catch (error) {
      logger.error('Auth', 'Error getting initial credentials:', error);
      return { success: true, data: null };
    }
  });
}

export function getCurrentSession() {
  return currentSession;
}
