import { create } from 'zustand';
import { Product } from './productsStore';

export interface CartItem {
  product: Product;
  quantity: number;
  subtotal: number;
}

type PaymentMethod = 'CASH' | 'DEBIT' | 'CREDIT' | 'MERCADOPAGO' | 'TRANSFER' | 'FIADO' | 'OTHER';

interface POSState {
  items: CartItem[];
  discount: number;
  paymentMethod: PaymentMethod | null;
  amountPaid: number;
  lastScannedProduct: Product | null;
  notFoundBarcode: string | null;
  multipleProducts: Product[] | null; // Productos con mismo código de barras
  isProcessing: boolean;
  error: string | null;

  // Computed
  subtotal: number;
  total: number;
  change: number;
  itemsCount: number;

  // Actions
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  incrementQuantity: (productId: string) => void;
  decrementQuantity: (productId: string) => void;
  setDiscount: (amount: number) => void;
  setPaymentMethod: (method: PaymentMethod) => void;
  setAmountPaid: (amount: number) => void;
  clearCart: () => void;
  processSale: (userId: string, cashRegisterId?: string, transferFee?: number, customerId?: string) => Promise<boolean>;
  scanBarcode: (barcode: string) => Promise<Product | null>;
  clearNotFoundBarcode: () => void;
  clearMultipleProducts: () => void;
}

export const usePOSStore = create<POSState>((set, get) => ({
  items: [],
  discount: 0,
  paymentMethod: null,
  amountPaid: 0,
  lastScannedProduct: null,
  notFoundBarcode: null,
  multipleProducts: null,
  isProcessing: false,
  error: null,

  // Computed values
  get subtotal() {
    return get().items.reduce((sum, item) => sum + item.subtotal, 0);
  },

  get total() {
    const state = get();
    return state.items.reduce((sum, item) => sum + item.subtotal, 0) - state.discount;
  },

  get change() {
    const state = get();
    const total = state.items.reduce((sum, item) => sum + item.subtotal, 0) - state.discount;
    return Math.max(0, state.amountPaid - total);
  },

  get itemsCount() {
    return get().items.reduce((sum, item) => sum + item.quantity, 0);
  },

  addItem: (product: Product, quantity = 1) => {
    set((state) => {
      const existingItem = state.items.find((item) => item.product.id === product.id);

      if (existingItem) {
        // Incrementar cantidad
        return {
          items: state.items.map((item) =>
            item.product.id === product.id
              ? {
                  ...item,
                  quantity: item.quantity + quantity,
                  subtotal: (item.quantity + quantity) * product.price,
                }
              : item
          ),
          lastScannedProduct: product,
        };
      }

      // Agregar nuevo item
      return {
        items: [
          ...state.items,
          {
            product,
            quantity,
            subtotal: quantity * product.price,
          },
        ],
        lastScannedProduct: product,
      };
    });
  },

  removeItem: (productId: string) => {
    set((state) => ({
      items: state.items.filter((item) => item.product.id !== productId),
    }));
  },

  updateQuantity: (productId: string, quantity: number) => {
    if (quantity <= 0) {
      get().removeItem(productId);
      return;
    }

    set((state) => ({
      items: state.items.map((item) =>
        item.product.id === productId
          ? {
              ...item,
              quantity,
              subtotal: quantity * item.product.price,
            }
          : item
      ),
    }));
  },

  incrementQuantity: (productId: string) => {
    set((state) => ({
      items: state.items.map((item) =>
        item.product.id === productId
          ? {
              ...item,
              quantity: item.quantity + 1,
              subtotal: (item.quantity + 1) * item.product.price,
            }
          : item
      ),
    }));
  },

  decrementQuantity: (productId: string) => {
    const item = get().items.find((i) => i.product.id === productId);
    if (item && item.quantity <= 1) {
      get().removeItem(productId);
      return;
    }

    set((state) => ({
      items: state.items.map((item) =>
        item.product.id === productId
          ? {
              ...item,
              quantity: item.quantity - 1,
              subtotal: (item.quantity - 1) * item.product.price,
            }
          : item
      ),
    }));
  },

  setDiscount: (amount: number) => {
    set({ discount: Math.max(0, amount) });
  },

  setPaymentMethod: (method: PaymentMethod) => {
    set({ paymentMethod: method });
  },

  setAmountPaid: (amount: number) => {
    set({ amountPaid: Math.max(0, amount) });
  },

  clearCart: () => {
    set({
      items: [],
      discount: 0,
      paymentMethod: null,
      amountPaid: 0,
      lastScannedProduct: null,
      error: null,
    });
  },

  processSale: async (userId: string, cashRegisterId?: string, transferFee?: number, customerId?: string) => {
    const state = get();

    if (state.items.length === 0) {
      set({ error: 'El carrito está vacío' });
      return false;
    }

    if (!state.paymentMethod) {
      set({ error: 'Seleccione un método de pago' });
      return false;
    }

    const subtotalItems = state.items.reduce((sum, item) => sum + item.subtotal, 0) - state.discount;
    const fee = transferFee || 0;
    const total = subtotalItems + fee;

    if (state.paymentMethod === 'CASH' && state.amountPaid < total) {
      set({ error: 'Monto insuficiente' });
      return false;
    }

    set({ isProcessing: true, error: null });

    try {
      const saleData = {
        items: state.items.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
          unitPrice: item.product.price,
        })),
        paymentMethod: state.paymentMethod,
        amountPaid: state.amountPaid || total,
        discount: state.discount,
        transferFee: fee,
        userId,
        cashRegisterId,
        customerId, // Para ventas fiadas
      };

      const result = await window.api.sales.create(saleData) as {
        success: boolean;
        data?: unknown;
        error?: string;
      };

      if (result.success) {
        // Limpiar carrito después de venta exitosa
        get().clearCart();
        set({ isProcessing: false });
        return true;
      } else {
        set({ error: result.error || 'Error al procesar la venta', isProcessing: false });
        return false;
      }
    } catch (error) {
      set({ error: 'Error de conexión', isProcessing: false });
      return false;
    }
  },

  scanBarcode: async (barcode: string) => {
    try {
      const result = await window.api.products.getByBarcode(barcode) as {
        success: boolean;
        data?: Product | Product[];
        notFound?: boolean;
        multiple?: boolean;
        error?: string;
      };

      if (result.success && result.data) {
        // Si hay múltiples productos con el mismo código
        if (result.multiple && Array.isArray(result.data)) {
          set({ multipleProducts: result.data });
          return null; // No agregar automáticamente, mostrar selector
        }
        
        // Producto único, agregar al carrito
        const product = result.data as Product;
        get().addItem(product);
        return product;
      }

      if (result.notFound) {
        set({ error: `Producto no encontrado: ${barcode}`, notFoundBarcode: barcode });
      }

      return null;
    } catch (error) {
      console.error('Error scanning barcode:', error);
      return null;
    }
  },

  clearNotFoundBarcode: () => {
    set({ notFoundBarcode: null, error: null });
  },

  clearMultipleProducts: () => {
    set({ multipleProducts: null });
  },
}));

// Helper para obtener totales calculados
export const usePOSTotals = () => {
  const items = usePOSStore((state) => state.items);
  const discount = usePOSStore((state) => state.discount);
  const amountPaid = usePOSStore((state) => state.amountPaid);

  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  const total = subtotal - discount;
  const change = Math.max(0, amountPaid - total);
  const itemsCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return { subtotal, total, change, itemsCount };
};
