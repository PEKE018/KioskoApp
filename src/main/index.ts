import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import { registerProductHandlers } from './ipc/productHandlers';
import { registerCategoryHandlers } from './ipc/categoryHandlers';
import { registerSaleHandlers } from './ipc/saleHandlers';
import { registerStockHandlers } from './ipc/stockHandlers';
import { registerAuthHandlers } from './ipc/authHandlers';
import { registerSettingsHandlers } from './ipc/settingsHandlers';
import { registerCustomerHandlers } from './ipc/customerHandlers';
import { registerBackupHandlers, createAutoBackup } from './ipc/backupHandlers';
import { registerLicenseHandlers, validateLicense } from './ipc/licenseHandlers';
import { registerReportHandlers } from './ipc/reportHandlers';
import { initDatabase } from './database/init';
import { setupAutoUpdater, checkForUpdatesOnStartup } from './services/autoUpdater';
import { logger } from './utils/logger';

// Manejo global de errores no capturados
process.on('uncaughtException', (error) => {
  const errorMsg = `Error no capturado: ${error.message}\n\nStack: ${error.stack}`;
  fs.writeFileSync(
    path.join(app.getPath('userData'), 'crash-log.txt'),
    `${new Date().toISOString()}\n${errorMsg}\n\n`,
    { flag: 'a' }
  );
  dialog.showErrorBox('Error Fatal - KioskoApp', errorMsg);
  app.quit();
});

process.on('unhandledRejection', (reason) => {
  const errorMsg = `Promesa rechazada: ${reason}`;
  fs.writeFileSync(
    path.join(app.getPath('userData'), 'crash-log.txt'),
    `${new Date().toISOString()}\n${errorMsg}\n\n`,
    { flag: 'a' }
  );
  logger.error('App', errorMsg);
});

// Deshabilitar aceleración de hardware si causa problemas
app.disableHardwareAcceleration();

// Prevenir multiples instancias - DEBE ser lo primero
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
  process.exit(0);
}

let mainWindow: BrowserWindow | null = null;

// Detectar modo desarrollo: solo cuando NODE_ENV es explícitamente 'development'
const isDev = process.env.NODE_ENV === 'development';

// Verificar licencia al inicio
function checkLicense(): boolean {
  const licenseInfo = validateLicense();
  if (!licenseInfo.isValid) {
    logger.warn('License', licenseInfo.message);
    // En producción podrías mostrar un diálogo y cerrar la app
    // Por ahora solo logueamos
  }
  logger.info('License', `Estado: ${licenseInfo.type} - ${licenseInfo.message}`);
  return licenseInfo.isValid;
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    title: 'KioskoApp',
    autoHideMenuBar: true,
    backgroundColor: '#0f172a',
    show: false, // No mostrar hasta que esté lista
  });

  // Mostrar cuando esté lista
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    if (!isDev) {
      mainWindow?.maximize();
    }
  });

  // Registrar todos los handlers IPC
  registerProductHandlers(ipcMain);
  registerCategoryHandlers(ipcMain);
  registerSaleHandlers(ipcMain);
  registerStockHandlers(ipcMain);
  registerAuthHandlers(ipcMain);
  registerSettingsHandlers();
  registerCustomerHandlers(ipcMain);
  registerBackupHandlers();
  registerLicenseHandlers();
  registerReportHandlers();

  // Configurar auto-updater (solo en producción)
  if (!isDev) {
    setupAutoUpdater(mainWindow);
  }

  if (isDev) {
    mainWindow.loadURL('http://localhost:5174');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Segunda instancia - enfocar ventana existente
app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

app.whenReady().then(async () => {
  try {
    logger.info('App', 'Iniciando KioskoApp...');
    
    // Verificar licencia
    checkLicense();
    
    // Inicializar base de datos
    await initDatabase();
    logger.info('Database', 'Base de datos inicializada');
    
    await createWindow();
    logger.info('App', 'Ventana principal creada');

    // Verificar actualizaciones en segundo plano (solo producción)
    if (!isDev) {
      checkForUpdatesOnStartup();
    }

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  } catch (error) {
    logger.error('App', 'Error al iniciar', error);
    app.quit();
  }
});

app.on('window-all-closed', async () => {
  // Crear backup automático antes de cerrar
  try {
    await createAutoBackup();
  } catch (error) {
    logger.error('App', 'Error al crear backup automático', error);
  }
  
  if (process.platform !== 'darwin') {
    logger.info('App', 'Cerrando aplicación');
    app.quit();
  }
});
