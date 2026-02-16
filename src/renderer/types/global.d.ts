// Declaración de tipos globales para window.api
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

export {};
