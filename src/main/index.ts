import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { registerProductHandlers } from './ipc/productHandlers';
import { registerCategoryHandlers } from './ipc/categoryHandlers';
import { registerSaleHandlers } from './ipc/saleHandlers';
import { registerStockHandlers } from './ipc/stockHandlers';
import { registerAuthHandlers } from './ipc/authHandlers';
import { registerSettingsHandlers } from './ipc/settingsHandlers';
import { registerCustomerHandlers } from './ipc/customerHandlers';
import { initDatabase } from './database/init';

// Deshabilitar aceleración de hardware para evitar problemas con el network service
app.disableHardwareAcceleration();
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-software-rasterizer');

let mainWindow: BrowserWindow | null = null;

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

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
    autoHideMenuBar: true, // Ocultar menú para UI más limpia
    backgroundColor: '#0f172a', // Fondo oscuro mientras carga
  });

  // Registrar todos los handlers IPC
  registerProductHandlers(ipcMain);
  registerCategoryHandlers(ipcMain);
  registerSaleHandlers(ipcMain);
  registerStockHandlers(ipcMain);
  registerAuthHandlers(ipcMain);
  registerSettingsHandlers();
  registerCustomerHandlers(ipcMain);

  if (isDev) {
    mainWindow.loadURL('http://localhost:5174');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Maximizar en producción para uso en kiosko
  if (!isDev) {
    mainWindow.maximize();
  }
}

app.whenReady().then(async () => {
  // Inicializar base de datos
  await initDatabase();
  
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Prevenir múltiples instancias
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}
