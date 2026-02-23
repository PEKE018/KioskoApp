import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock del store para tests (versión simplificada)
interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  isCigarette: boolean;
}

interface POSState {
  items: CartItem[];
  discount: number;
  paymentMethod: string;
  amountPaid: number;
}

function createPOSStore() {
  let state: POSState = {
    items: [],
    discount: 0,
    paymentMethod: 'CASH',
    amountPaid: 0,
  };

  return {
    getState: () => state,
    
    addItem: (product: { id: string; name: string; price: number; isCigarette?: boolean }) => {
      const existingItem = state.items.find(item => item.productId === product.id);
      
      if (existingItem) {
        existingItem.quantity += 1;
      } else {
        state.items.push({
          productId: product.id,
          name: product.name,
          price: product.price,
          quantity: 1,
          isCigarette: product.isCigarette || false,
        });
      }
    },
    
    removeItem: (productId: string) => {
      state.items = state.items.filter(item => item.productId !== productId);
    },
    
    incrementQuantity: (productId: string) => {
      const item = state.items.find(i => i.productId === productId);
      if (item) item.quantity += 1;
    },
    
    decrementQuantity: (productId: string) => {
      const item = state.items.find(i => i.productId === productId);
      if (item && item.quantity > 1) {
        item.quantity -= 1;
      } else if (item) {
        state.items = state.items.filter(i => i.productId !== productId);
      }
    },
    
    setDiscount: (amount: number) => {
      state.discount = Math.max(0, amount);
    },
    
    setPaymentMethod: (method: string) => {
      state.paymentMethod = method;
    },
    
    setAmountPaid: (amount: number) => {
      state.amountPaid = amount;
    },
    
    clearCart: () => {
      state.items = [];
      state.discount = 0;
      state.amountPaid = 0;
    },
    
    getSubtotal: () => {
      return state.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    },
    
    getTotal: () => {
      const subtotal = state.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      return Math.max(0, subtotal - state.discount);
    },
    
    getChange: () => {
      const total = state.items.reduce((sum, item) => sum + (item.price * item.quantity), 0) - state.discount;
      return Math.max(0, state.amountPaid - total);
    },
    
    getItemsCount: () => {
      return state.items.reduce((sum, item) => sum + item.quantity, 0);
    },
    
    reset: () => {
      state = {
        items: [],
        discount: 0,
        paymentMethod: 'CASH',
        amountPaid: 0,
      };
    },
  };
}

describe('POS Store', () => {
  let store: ReturnType<typeof createPOSStore>;

  beforeEach(() => {
    store = createPOSStore();
  });

  describe('addItem', () => {
    it('debe agregar un producto al carrito', () => {
      store.addItem({ id: '1', name: 'Coca Cola', price: 500 });
      
      const state = store.getState();
      expect(state.items).toHaveLength(1);
      expect(state.items[0].name).toBe('Coca Cola');
      expect(state.items[0].quantity).toBe(1);
    });

    it('debe incrementar cantidad si el producto ya existe', () => {
      store.addItem({ id: '1', name: 'Coca Cola', price: 500 });
      store.addItem({ id: '1', name: 'Coca Cola', price: 500 });
      
      const state = store.getState();
      expect(state.items).toHaveLength(1);
      expect(state.items[0].quantity).toBe(2);
    });

    it('debe manejar productos de cigarrillos', () => {
      store.addItem({ id: '1', name: 'Marlboro', price: 1000, isCigarette: true });
      
      const state = store.getState();
      expect(state.items[0].isCigarette).toBe(true);
    });
  });

  describe('removeItem', () => {
    it('debe eliminar un producto del carrito', () => {
      store.addItem({ id: '1', name: 'Coca Cola', price: 500 });
      store.addItem({ id: '2', name: 'Sprite', price: 450 });
      
      store.removeItem('1');
      
      const state = store.getState();
      expect(state.items).toHaveLength(1);
      expect(state.items[0].productId).toBe('2');
    });
  });

  describe('incrementQuantity', () => {
    it('debe incrementar la cantidad de un producto', () => {
      store.addItem({ id: '1', name: 'Coca Cola', price: 500 });
      store.incrementQuantity('1');
      
      expect(store.getState().items[0].quantity).toBe(2);
    });
  });

  describe('decrementQuantity', () => {
    it('debe decrementar la cantidad de un producto', () => {
      store.addItem({ id: '1', name: 'Coca Cola', price: 500 });
      store.incrementQuantity('1');
      store.incrementQuantity('1');
      store.decrementQuantity('1');
      
      expect(store.getState().items[0].quantity).toBe(2);
    });

    it('debe eliminar el producto si la cantidad llega a 0', () => {
      store.addItem({ id: '1', name: 'Coca Cola', price: 500 });
      store.decrementQuantity('1');
      
      expect(store.getState().items).toHaveLength(0);
    });
  });

  describe('cálculos', () => {
    beforeEach(() => {
      store.addItem({ id: '1', name: 'Coca Cola', price: 500 });
      store.addItem({ id: '2', name: 'Sprite', price: 450 });
      store.incrementQuantity('1'); // 2 x 500 = 1000
    });

    it('debe calcular subtotal correctamente', () => {
      // 2 x 500 + 1 x 450 = 1450
      expect(store.getSubtotal()).toBe(1450);
    });

    it('debe calcular total con descuento', () => {
      store.setDiscount(100);
      expect(store.getTotal()).toBe(1350);
    });

    it('debe calcular vuelto correctamente', () => {
      store.setAmountPaid(2000);
      // Total: 1450, Paid: 2000, Change: 550
      expect(store.getChange()).toBe(550);
    });

    it('no debe dar vuelto negativo', () => {
      store.setAmountPaid(500);
      expect(store.getChange()).toBe(0);
    });

    it('debe contar items totales', () => {
      expect(store.getItemsCount()).toBe(3); // 2 coca + 1 sprite
    });
  });

  describe('clearCart', () => {
    it('debe limpiar todo el carrito', () => {
      store.addItem({ id: '1', name: 'Coca Cola', price: 500 });
      store.setDiscount(50);
      store.setAmountPaid(1000);
      
      store.clearCart();
      
      const state = store.getState();
      expect(state.items).toHaveLength(0);
      expect(state.discount).toBe(0);
      expect(state.amountPaid).toBe(0);
    });
  });

  describe('setPaymentMethod', () => {
    it('debe cambiar el método de pago', () => {
      store.setPaymentMethod('DEBIT');
      expect(store.getState().paymentMethod).toBe('DEBIT');
      
      store.setPaymentMethod('MERCADOPAGO');
      expect(store.getState().paymentMethod).toBe('MERCADOPAGO');
    });
  });
});
