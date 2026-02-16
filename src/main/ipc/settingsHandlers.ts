import { ipcMain } from 'electron';
import { prisma } from '../database/init';

export function registerSettingsHandlers() {
  // Obtener configuración
  ipcMain.handle('settings:get', async () => {
    try {
      let config = await prisma.appConfig.findUnique({
        where: { id: 'config' },
      });

      // Si no existe, crear con valores por defecto
      if (!config) {
        config = await prisma.appConfig.create({
          data: { id: 'config' },
        });
      }

      return { success: true, data: config };
    } catch (error) {
      console.error('Error getting settings:', error);
      return { success: false, error: 'Error al obtener configuración' };
    }
  });

  // Guardar configuración
  ipcMain.handle('settings:update', async (_, data: {
    businessName?: string;
    businessAddress?: string;
    businessPhone?: string;
    businessCuit?: string;
    ticketHeader?: string;
    ticketFooter?: string;
    transferFeePercent?: number;
    defaultMinStock?: number;
    autoBackup?: boolean;
    sessionTimeout?: number;
  }) => {
    try {
      const config = await prisma.appConfig.upsert({
        where: { id: 'config' },
        update: data,
        create: { id: 'config', ...data },
      });

      return { success: true, data: config };
    } catch (error) {
      console.error('Error updating settings:', error);
      return { success: false, error: 'Error al guardar configuración' };
    }
  });
}
