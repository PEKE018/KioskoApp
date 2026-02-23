import { contextBridge, ipcRenderer } from 'electron';

// Exponer API segura al renderer
contextBridge.exposeInMainWorld('api', {
  // === PRODUCTOS ===
  products: {
    getAll: () => ipcRenderer.invoke('products:getAll'),
    getByBarcode: (barcode: string) => ipcRenderer.invoke('products:getByBarcode', barcode),
    getByCategory: (categoryId: string) => ipcRenderer.invoke('products:getByCategory', categoryId),
    create: (data: unknown) => ipcRenderer.invoke('products:create', data),
    update: (id: string, data: unknown) => ipcRenderer.invoke('products:update', id, data),
    delete: (id: string) => ipcRenderer.invoke('products:delete', id),
    search: (query: string) => ipcRenderer.invoke('products:search', query),
    getLowStock: () => ipcRenderer.invoke('products:getLowStock'),
    // Combos
    getSimple: () => ipcRenderer.invoke('products:getSimple'),
    getCombos: () => ipcRenderer.invoke('products:getCombos'),
    getComboComponents: (comboId: string) => ipcRenderer.invoke('products:getComboComponents', comboId),
    checkComboStock: (comboId: string, quantity?: number) => ipcRenderer.invoke('products:checkComboStock', comboId, quantity),
  },

  // === CATEGORÍAS ===
  categories: {
    getAll: () => ipcRenderer.invoke('categories:getAll'),
    create: (data: unknown) => ipcRenderer.invoke('categories:create', data),
    update: (id: string, data: unknown) => ipcRenderer.invoke('categories:update', id, data),
    delete: (id: string) => ipcRenderer.invoke('categories:delete', id),
    reorder: (ids: string[]) => ipcRenderer.invoke('categories:reorder', ids),
  },

  // === VENTAS ===
  sales: {
    create: (data: unknown) => ipcRenderer.invoke('sales:create', data),
    getToday: () => ipcRenderer.invoke('sales:getToday'),
    getByDateRange: (start: Date, end: Date) => ipcRenderer.invoke('sales:getByDateRange', start, end),
    getById: (id: string) => ipcRenderer.invoke('sales:getById', id),
    cancel: (id: string, reason: string) => ipcRenderer.invoke('sales:cancel', id, reason),
    getDailySummary: () => ipcRenderer.invoke('sales:getDailySummary'),
  },

  // === STOCK ===
  stock: {
    addStock: (productId: string, quantity: number, reason: string, userId?: string) => 
      ipcRenderer.invoke('stock:add', productId, quantity, reason, userId),
    removeStock: (productId: string, quantity: number, reason: string, userId?: string) => 
      ipcRenderer.invoke('stock:remove', productId, quantity, reason, userId),
    getMovements: (productId: string) => ipcRenderer.invoke('stock:getMovements', productId),
    getAllMovements: (limit?: number) => ipcRenderer.invoke('stock:getAllMovements', limit),
    adjustStock: (productId: string, newQuantity: number, reason: string, userId?: string) => 
      ipcRenderer.invoke('stock:adjust', productId, newQuantity, reason, userId),
  },

  // === AUTENTICACIÓN ===
  auth: {
    login: (username: string, password: string) => 
      ipcRenderer.invoke('auth:login', username, password),
    loginWithPin: (pin: string) => ipcRenderer.invoke('auth:loginWithPin', pin),
    logout: () => ipcRenderer.invoke('auth:logout'),
    getCurrentUser: () => ipcRenderer.invoke('auth:getCurrentUser'),
    restoreSession: (userId: string) => ipcRenderer.invoke('auth:restoreSession', userId),
    changePassword: (oldPassword: string, newPassword: string) => 
      ipcRenderer.invoke('auth:changePassword', oldPassword, newPassword),
    getInitialCredentials: () => ipcRenderer.invoke('auth:getInitialCredentials'),
  },

  // === USUARIOS (solo admin) ===
  users: {
    getAll: () => ipcRenderer.invoke('users:getAll'),
    create: (data: unknown) => ipcRenderer.invoke('users:create', data),
    update: (id: string, data: unknown) => ipcRenderer.invoke('users:update', id, data),
    delete: (id: string) => ipcRenderer.invoke('users:delete', id),
  },

  // === CAJA ===
  cashRegister: {
    open: (initialAmount: number) => ipcRenderer.invoke('cashRegister:open', initialAmount),
    close: (finalAmount: number) => ipcRenderer.invoke('cashRegister:close', finalAmount),
    getCurrent: () => ipcRenderer.invoke('cashRegister:getCurrent'),
    getHistory: () => ipcRenderer.invoke('cashRegister:getHistory'),
  },

  // === REPORTES ===
  reports: {
    getSalesByDay: (start: Date, end: Date) => 
      ipcRenderer.invoke('reports:salesByDay', start, end),
    getTopProducts: (limit: number, start?: Date, end?: Date) => 
      ipcRenderer.invoke('reports:topProducts', limit, start, end),
    getProfitReport: (start: Date, end: Date) => 
      ipcRenderer.invoke('reports:profit', start, end),
    getCategoryReport: (start?: Date, end?: Date) => 
      ipcRenderer.invoke('reports:byCategory', start, end),
    getByCashier: (date?: Date) => 
      ipcRenderer.invoke('reports:byCashier', date),
    getCashierHistory: (userId: string, days?: number) => 
      ipcRenderer.invoke('reports:cashierHistory', userId, days),
  },

  // === CONFIGURACIÓN ===
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    update: (data: unknown) => ipcRenderer.invoke('settings:update', data),
  },

  // === CLIENTES (FIADO) ===
  customers: {
    getAll: () => ipcRenderer.invoke('customers:getAll'),
    getById: (id: string) => ipcRenderer.invoke('customers:getById', id),
    search: (query: string) => ipcRenderer.invoke('customers:search', query),
    create: (data: unknown) => ipcRenderer.invoke('customers:create', data),
    update: (id: string, data: unknown) => ipcRenderer.invoke('customers:update', id, data),
    delete: (id: string) => ipcRenderer.invoke('customers:delete', id),
    registerPayment: (data: unknown) => ipcRenderer.invoke('customers:registerPayment', data),
    getWithDebt: () => ipcRenderer.invoke('customers:getWithDebt'),
  },

  // === BACKUP ===
  backup: {
    create: () => ipcRenderer.invoke('backup:create'),
    restore: (backupPath: string) => ipcRenderer.invoke('backup:restore', backupPath),
    list: () => ipcRenderer.invoke('backup:list'),
    delete: (backupPath: string) => ipcRenderer.invoke('backup:delete', backupPath),
    export: () => ipcRenderer.invoke('backup:export'),
    import: () => ipcRenderer.invoke('backup:import'),
    getDir: () => ipcRenderer.invoke('backup:getDir'),
  },

  // === LICENCIA ===
  license: {
    validate: () => ipcRenderer.invoke('license:validate'),
    activate: (licenseKey: string) => ipcRenderer.invoke('license:activate', licenseKey),
    getInfo: () => ipcRenderer.invoke('license:getInfo'),
    hasFeature: (feature: string) => ipcRenderer.invoke('license:hasFeature', feature),
    getMachineId: () => ipcRenderer.invoke('license:getMachineId'),
  },

  // === ACTUALIZACIONES ===
  updater: {
    check: () => ipcRenderer.invoke('updater:check'),
    download: () => ipcRenderer.invoke('updater:download'),
    install: () => ipcRenderer.invoke('updater:install'),
    getCurrentVersion: () => ipcRenderer.invoke('updater:getCurrentVersion'),
    onUpdateAvailable: (callback: (info: unknown) => void) => {
      ipcRenderer.on('update-available', (_, info) => callback(info));
    },
    onDownloadProgress: (callback: (progress: unknown) => void) => {
      ipcRenderer.on('update-progress', (_, progress) => callback(progress));
    },
    onUpdateDownloaded: (callback: (info: unknown) => void) => {
      ipcRenderer.on('update-downloaded', (_, info) => callback(info));
    },
    onUpdateError: (callback: (error: unknown) => void) => {
      ipcRenderer.on('update-error', (_, error) => callback(error));
    },
  },
});

// Type definitions para TypeScript
declare global {
  interface Window {
    api: {
      products: {
        getAll: () => Promise<unknown>;
        getByBarcode: (barcode: string) => Promise<unknown>;
        getByCategory: (categoryId: string) => Promise<unknown>;
        create: (data: unknown) => Promise<unknown>;
        update: (id: string, data: unknown) => Promise<unknown>;
        delete: (id: string) => Promise<unknown>;
        search: (query: string) => Promise<unknown>;
        getLowStock: () => Promise<unknown>;
      };
      categories: {
        getAll: () => Promise<unknown>;
        create: (data: unknown) => Promise<unknown>;
        update: (id: string, data: unknown) => Promise<unknown>;
        delete: (id: string) => Promise<unknown>;
        reorder: (ids: string[]) => Promise<unknown>;
      };
      sales: {
        create: (data: unknown) => Promise<unknown>;
        getToday: () => Promise<unknown>;
        getByDateRange: (start: Date, end: Date) => Promise<unknown>;
        getById: (id: string) => Promise<unknown>;
        cancel: (id: string, reason: string) => Promise<unknown>;
        getDailySummary: () => Promise<unknown>;
      };
      stock: {
        addStock: (productId: string, quantity: number, reason: string, userId?: string) => Promise<unknown>;
        removeStock: (productId: string, quantity: number, reason: string, userId?: string) => Promise<unknown>;
        getMovements: (productId: string) => Promise<unknown>;
        getAllMovements: (limit?: number) => Promise<unknown>;
        adjustStock: (productId: string, newQuantity: number, reason: string, userId?: string) => Promise<unknown>;
      };
      auth: {
        login: (username: string, password: string) => Promise<unknown>;
        loginWithPin: (pin: string) => Promise<unknown>;
        logout: () => Promise<unknown>;
        getCurrentUser: () => Promise<unknown>;
        restoreSession: (userId: string) => Promise<unknown>;
        changePassword: (oldPassword: string, newPassword: string) => Promise<unknown>;
      };
      users: {
        getAll: () => Promise<unknown>;
        create: (data: unknown) => Promise<unknown>;
        update: (id: string, data: unknown) => Promise<unknown>;
        delete: (id: string) => Promise<unknown>;
      };
      cashRegister: {
        open: (initialAmount: number) => Promise<unknown>;
        close: (finalAmount: number) => Promise<unknown>;
        getCurrent: () => Promise<unknown>;
        getHistory: () => Promise<unknown>;
      };
      reports: {
        getSalesByDay: (start: Date, end: Date) => Promise<unknown>;
        getTopProducts: (limit: number, start?: Date, end?: Date) => Promise<unknown>;
        getProfitReport: (start: Date, end: Date) => Promise<unknown>;
        getCategoryReport: (start?: Date, end?: Date) => Promise<unknown>;
        getByCashier: (date?: Date) => Promise<unknown>;
        getCashierHistory: (userId: string, days?: number) => Promise<unknown>;
      };
      settings: {
        get: () => Promise<unknown>;
        update: (data: unknown) => Promise<unknown>;
      };
      customers: {
        getAll: () => Promise<unknown>;
        getById: (id: string) => Promise<unknown>;
        search: (query: string) => Promise<unknown>;
        create: (data: unknown) => Promise<unknown>;
        update: (id: string, data: unknown) => Promise<unknown>;
        delete: (id: string) => Promise<unknown>;
        registerPayment: (data: unknown) => Promise<unknown>;
        getWithDebt: () => Promise<unknown>;
      };
      backup: {
        create: () => Promise<unknown>;
        restore: (backupPath: string) => Promise<unknown>;
        list: () => Promise<unknown>;
        delete: (backupPath: string) => Promise<unknown>;
        export: () => Promise<unknown>;
        import: () => Promise<unknown>;
        getDir: () => Promise<unknown>;
      };
      license: {
        validate: () => Promise<unknown>;
        activate: (licenseKey: string) => Promise<unknown>;
        getInfo: () => Promise<unknown>;
        hasFeature: (feature: string) => Promise<unknown>;
        getMachineId: () => Promise<unknown>;
      };
      updater: {
        check: () => Promise<unknown>;
        download: () => Promise<unknown>;
        install: () => Promise<unknown>;
        getCurrentVersion: () => Promise<unknown>;
        onUpdateAvailable: (callback: (info: unknown) => void) => void;
        onDownloadProgress: (callback: (progress: unknown) => void) => void;
        onUpdateDownloaded: (callback: (info: unknown) => void) => void;
      };
    };
  }
}
