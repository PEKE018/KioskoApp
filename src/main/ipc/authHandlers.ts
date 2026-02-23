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
        include: {
          user: { select: { name: true } },
        },
      });

      return { success: true, data: cashRegister };
    } catch (error) {
      logger.error('Auth', '\Error opening cash register:', error);
      return { success: false, error: 'Error al abrir caja' };
    }
  });

  // Cerrar caja
  ipcMain.handle('cashRegister:close', async (_, finalAmount: number) => {
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

      // Obtener ventas con información de productos para calcular caja aparte
      const salesWithItems = await prisma.sale.findMany({
        where: { cashRegisterId: openCash.id },
        include: {
          items: {
            include: {
              product: {
                select: { id: true, name: true, separateCash: true }
              }
            }
          }
        }
      });

      // Calcular desglose de caja aparte
      let separateCashTotal = 0;
      const separateCashProducts: { productId: string; productName: string; quantity: number; total: number }[] = [];

      for (const sale of salesWithItems) {
        for (const item of sale.items) {
          if (item.product.separateCash) {
            separateCashTotal += item.subtotal;
            const existing = separateCashProducts.find(p => p.productId === item.product.id);
            if (existing) {
              existing.quantity += item.quantity;
              existing.total += item.subtotal;
            } else {
              separateCashProducts.push({
                productId: item.product.id,
                productName: item.product.name,
                quantity: item.quantity,
                total: item.subtotal
              });
            }
          }
        }
      }

      // El total esperado en caja general NO incluye los productos de caja aparte
      const generalCashTotal = openCash.salesTotal - separateCashTotal;
      const expectedAmount = openCash.initialAmount + generalCashTotal;
      const difference = finalAmount - expectedAmount;

      const cashRegister = await prisma.cashRegister.update({
        where: { id: openCash.id },
        data: {
          status: 'CLOSED',
          finalAmount,
          difference,
          closedAt: new Date(),
        },
        include: {
          user: { select: { name: true } },
          sales: {
            include: {
              items: { include: { product: true } },
            },
          },
        },
      });

      // Agregar información de caja aparte al resultado
      return { 
        success: true, 
        data: {
          ...cashRegister,
          separateCashTotal,
          separateCashProducts,
          generalCashTotal,
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
        include: {
          user: { select: { name: true } },
        },
      });

      if (!openCash) {
        return { success: true, data: null };
      }

      // Calcular desglose de caja aparte
      const salesWithItems = await prisma.sale.findMany({
        where: { cashRegisterId: openCash.id },
        include: {
          items: {
            include: {
              product: {
                select: { id: true, name: true, separateCash: true }
              }
            }
          }
        }
      });

      let separateCashTotal = 0;
      const separateCashProducts: { productId: string; productName: string; quantity: number; total: number }[] = [];

      for (const sale of salesWithItems) {
        for (const item of sale.items) {
          if (item.product.separateCash) {
            separateCashTotal += item.subtotal;
            const existing = separateCashProducts.find(p => p.productId === item.product.id);
            if (existing) {
              existing.quantity += item.quantity;
              existing.total += item.subtotal;
            } else {
              separateCashProducts.push({
                productId: item.product.id,
                productName: item.product.name,
                quantity: item.quantity,
                total: item.subtotal
              });
            }
          }
        }
      }

      const generalCashTotal = openCash.salesTotal - separateCashTotal;

      return { 
        success: true, 
        data: {
          ...openCash,
          separateCashTotal,
          separateCashProducts,
          generalCashTotal,
        }
      };
    } catch (error) {
      logger.error('Auth', '\Error getting current cash register:', error);
      return { success: false, error: 'Error al obtener caja' };
    }
  });

  // Historial de cajas
  ipcMain.handle('cashRegister:getHistory', async () => {
    try {
      const history = await prisma.cashRegister.findMany({
        include: {
          user: { select: { name: true } },
        },
        orderBy: { openedAt: 'desc' },
        take: 30,
      });

      return { success: true, data: history };
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
