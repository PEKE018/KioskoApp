import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock de window.api para tests del renderer
const mockApi = {
  products: {
    getAll: vi.fn().mockResolvedValue({ success: true, data: [] }),
    getByBarcode: vi.fn().mockResolvedValue({ success: true, data: null }),
    create: vi.fn().mockResolvedValue({ success: true, data: {} }),
    update: vi.fn().mockResolvedValue({ success: true, data: {} }),
    delete: vi.fn().mockResolvedValue({ success: true }),
    search: vi.fn().mockResolvedValue({ success: true, data: [] }),
    getLowStock: vi.fn().mockResolvedValue({ success: true, data: [] }),
  },
  categories: {
    getAll: vi.fn().mockResolvedValue({ success: true, data: [] }),
    create: vi.fn().mockResolvedValue({ success: true, data: {} }),
    update: vi.fn().mockResolvedValue({ success: true, data: {} }),
    delete: vi.fn().mockResolvedValue({ success: true }),
  },
  sales: {
    create: vi.fn().mockResolvedValue({ success: true, data: {} }),
    getAll: vi.fn().mockResolvedValue({ success: true, data: [] }),
    getById: vi.fn().mockResolvedValue({ success: true, data: null }),
    cancel: vi.fn().mockResolvedValue({ success: true }),
    getReports: vi.fn().mockResolvedValue({ success: true, data: {} }),
  },
  stock: {
    adjust: vi.fn().mockResolvedValue({ success: true }),
    getMovements: vi.fn().mockResolvedValue({ success: true, data: [] }),
    bulkUpdate: vi.fn().mockResolvedValue({ success: true }),
  },
  auth: {
    login: vi.fn().mockResolvedValue({ success: true, data: { id: '1', username: 'admin', role: 'ADMIN' } }),
    loginWithPin: vi.fn().mockResolvedValue({ success: true, data: { id: '1', username: 'admin', role: 'ADMIN' } }),
    logout: vi.fn().mockResolvedValue({ success: true }),
    changePassword: vi.fn().mockResolvedValue({ success: true }),
    restoreSession: vi.fn().mockResolvedValue({ success: true, data: null }),
    getUsers: vi.fn().mockResolvedValue({ success: true, data: [] }),
    createUser: vi.fn().mockResolvedValue({ success: true, data: {} }),
    updateUser: vi.fn().mockResolvedValue({ success: true, data: {} }),
    deleteUser: vi.fn().mockResolvedValue({ success: true }),
  },
  settings: {
    get: vi.fn().mockResolvedValue({ success: true, data: {} }),
    update: vi.fn().mockResolvedValue({ success: true, data: {} }),
  },
  cashRegister: {
    getCurrent: vi.fn().mockResolvedValue({ success: true, data: null }),
    open: vi.fn().mockResolvedValue({ success: true, data: {} }),
    close: vi.fn().mockResolvedValue({ success: true }),
    getHistory: vi.fn().mockResolvedValue({ success: true, data: [] }),
  },
  customers: {
    getAll: vi.fn().mockResolvedValue({ success: true, data: [] }),
    search: vi.fn().mockResolvedValue({ success: true, data: [] }),
    create: vi.fn().mockResolvedValue({ success: true, data: {} }),
    update: vi.fn().mockResolvedValue({ success: true, data: {} }),
    addPayment: vi.fn().mockResolvedValue({ success: true }),
    getDetails: vi.fn().mockResolvedValue({ success: true, data: null }),
  },
  backup: {
    create: vi.fn().mockResolvedValue({ success: true, path: '/backup/test.db' }),
    restore: vi.fn().mockResolvedValue({ success: true }),
    list: vi.fn().mockResolvedValue({ success: true, data: [] }),
    delete: vi.fn().mockResolvedValue({ success: true }),
  },
  license: {
    validate: vi.fn().mockResolvedValue({ success: true, valid: true }),
    activate: vi.fn().mockResolvedValue({ success: true }),
    getInfo: vi.fn().mockResolvedValue({ success: true, data: null }),
  },
};

// Asignar mock al objeto global window
Object.defineProperty(window, 'api', {
  value: mockApi,
  writable: true,
});

// Mock de electron IPC para tests del main process
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn().mockReturnValue('/mock/path'),
    isPackaged: false,
    quit: vi.fn(),
    requestSingleInstanceLock: vi.fn().mockReturnValue(true),
    on: vi.fn(),
    whenReady: vi.fn().mockResolvedValue(undefined),
  },
  BrowserWindow: vi.fn().mockImplementation(() => ({
    loadFile: vi.fn(),
    loadURL: vi.fn(),
    on: vi.fn(),
    once: vi.fn(),
    show: vi.fn(),
    maximize: vi.fn(),
    isMinimized: vi.fn().mockReturnValue(false),
    restore: vi.fn(),
    focus: vi.fn(),
    webContents: {
      openDevTools: vi.fn(),
      send: vi.fn(),
    },
  })),
  ipcMain: {
    handle: vi.fn(),
    on: vi.fn(),
  },
  ipcRenderer: {
    invoke: vi.fn(),
    on: vi.fn(),
    send: vi.fn(),
  },
  dialog: {
    showOpenDialog: vi.fn().mockResolvedValue({ canceled: false, filePaths: ['/mock/file'] }),
    showSaveDialog: vi.fn().mockResolvedValue({ canceled: false, filePath: '/mock/save' }),
    showMessageBox: vi.fn().mockResolvedValue({ response: 0 }),
  },
}));
