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
        // Combos
        getSimple: () => Promise<unknown>;
        getCombos: () => Promise<unknown>;
        getComboComponents: (comboId: string) => Promise<unknown>;
        checkComboStock: (comboId: string, quantity?: number) => Promise<unknown>;
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
        getInitialCredentials: () => Promise<unknown>;
      };
      users: {
        getAll: () => Promise<unknown>;
        create: (data: unknown) => Promise<unknown>;
        update: (id: string, data: unknown) => Promise<unknown>;
        delete: (id: string) => Promise<unknown>;
      };
      cashRegister: {
        open: (initialAmount: number) => Promise<unknown>;
          close: (finalAmount: number, notes?: string) => Promise<unknown>;
        getCurrent: () => Promise<unknown>;
        getHistory: () => Promise<unknown>;
          getById: (id: string) => Promise<unknown>;
        forceClose: () => Promise<unknown>;
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
        onUpdateAvailable: (callback: (info: unknown) => void) => (() => void) | void;
        onDownloadProgress: (callback: (progress: unknown) => void) => (() => void) | void;
        onUpdateDownloaded: (callback: (info: unknown) => void) => (() => void) | void;
        onUpdateError?: (callback: (error: unknown) => void) => (() => void) | void;
      };
    };
    
    // Web Speech API
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
  
  // Web Speech API Types
  interface SpeechRecognitionEvent extends Event {
    results: SpeechRecognitionResultList;
    resultIndex: number;
  }
  
  interface SpeechRecognitionResultList {
    length: number;
    item(index: number): SpeechRecognitionResult;
    [index: number]: SpeechRecognitionResult;
  }
  
  interface SpeechRecognitionResult {
    isFinal: boolean;
    length: number;
    item(index: number): SpeechRecognitionAlternative;
    [index: number]: SpeechRecognitionAlternative;
  }
  
  interface SpeechRecognitionAlternative {
    transcript: string;
    confidence: number;
  }
  
  interface SpeechRecognitionErrorEvent extends Event {
    error: string;
    message: string;
  }
  
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    maxAlternatives: number;
    
    start(): void;
    stop(): void;
    abort(): void;
    
    onstart: ((event: Event) => void) | null;
    onend: ((event: Event) => void) | null;
    onresult: ((event: SpeechRecognitionEvent) => void) | null;
    onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
    onspeechstart: ((event: Event) => void) | null;
    onspeechend: ((event: Event) => void) | null;
  }
  
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const SpeechRecognition: {
    prototype: SpeechRecognition;
    new(): SpeechRecognition;
  };
}

export {};
