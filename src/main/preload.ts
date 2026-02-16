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
        addStock: (productId: string, quantity: number, reason: string) => Promise<unknown>;
        removeStock: (productId: string, quantity: number, reason: string) => Promise<unknown>;
        getMovements: (productId: string) => Promise<unknown>;
        getAllMovements: (limit?: number) => Promise<unknown>;
        adjustStock: (productId: string, newQuantity: number, reason: string) => Promise<unknown>;
      };
      auth: {
        login: (username: string, password: string) => Promise<unknown>;
        loginWithPin: (pin: string) => Promise<unknown>;
        logout: () => Promise<unknown>;
        getCurrentUser: () => Promise<unknown>;
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
    };
  }
}
