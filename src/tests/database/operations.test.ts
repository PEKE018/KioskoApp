import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock de operaciones de base de datos para tests
interface Product {
  id: string;
  barcode: string;
  name: string;
  price: number;
  cost: number;
  stock: number;
  minStock: number;
  active: boolean;
}

interface Category {
  id: string;
  name: string;
  color: string;
  order: number;
  active: boolean;
}

// Simulador de base de datos en memoria
function createMockDatabase() {
  let products: Product[] = [];
  let categories: Category[] = [];
  let idCounter = 1;

  return {
    products: {
      create: (data: Omit<Product, 'id' | 'active'>) => {
        const product: Product = {
          ...data,
          id: String(idCounter++),
          active: true,
        };
        products.push(product);
        return product;
      },
      
      findById: (id: string) => {
        return products.find(p => p.id === id && p.active) || null;
      },
      
      findByBarcode: (barcode: string) => {
        return products.filter(p => p.barcode === barcode && p.active);
      },
      
      update: (id: string, data: Partial<Product>) => {
        const index = products.findIndex(p => p.id === id);
        if (index === -1) return null;
        products[index] = { ...products[index], ...data };
        return products[index];
      },
      
      delete: (id: string) => {
        const index = products.findIndex(p => p.id === id);
        if (index === -1) return false;
        products[index].active = false;
        return true;
      },
      
      getAll: () => products.filter(p => p.active),
      
      getLowStock: () => products.filter(p => p.active && p.stock <= p.minStock),
      
      search: (query: string) => {
        const q = query.toLowerCase();
        return products.filter(p => 
          p.active && (
            p.name.toLowerCase().includes(q) ||
            p.barcode.toLowerCase().includes(q)
          )
        );
      },
      
      adjustStock: (id: string, quantity: number) => {
        const product = products.find(p => p.id === id);
        if (!product) return null;
        product.stock = Math.max(0, product.stock + quantity);
        return product;
      },
    },
    
    categories: {
      create: (data: Omit<Category, 'id' | 'active'>) => {
        const category: Category = {
          ...data,
          id: String(idCounter++),
          active: true,
        };
        categories.push(category);
        return category;
      },
      
      findById: (id: string) => {
        return categories.find(c => c.id === id && c.active) || null;
      },
      
      update: (id: string, data: Partial<Category>) => {
        const index = categories.findIndex(c => c.id === id);
        if (index === -1) return null;
        categories[index] = { ...categories[index], ...data };
        return categories[index];
      },
      
      delete: (id: string) => {
        const index = categories.findIndex(c => c.id === id);
        if (index === -1) return false;
        categories[index].active = false;
        return true;
      },
      
      getAll: () => categories.filter(c => c.active).sort((a, b) => a.order - b.order),
    },
    
    reset: () => {
      products = [];
      categories = [];
      idCounter = 1;
    },
  };
}

describe('Database Operations', () => {
  let db: ReturnType<typeof createMockDatabase>;

  beforeEach(() => {
    db = createMockDatabase();
  });

  describe('Products', () => {
    it('debe crear un producto', () => {
      const product = db.products.create({
        barcode: '7790001234567',
        name: 'Coca Cola 500ml',
        price: 500,
        cost: 300,
        stock: 50,
        minStock: 10,
      });

      expect(product.id).toBeDefined();
      expect(product.name).toBe('Coca Cola 500ml');
      expect(product.active).toBe(true);
    });

    it('debe encontrar producto por ID', () => {
      const created = db.products.create({
        barcode: '7790001234567',
        name: 'Coca Cola',
        price: 500,
        cost: 300,
        stock: 50,
        minStock: 10,
      });

      const found = db.products.findById(created.id);
      expect(found).not.toBeNull();
      expect(found?.name).toBe('Coca Cola');
    });

    it('debe encontrar productos por código de barras', () => {
      db.products.create({
        barcode: '7790001234567',
        name: 'Coca Cola Regular',
        price: 500,
        cost: 300,
        stock: 50,
        minStock: 10,
      });
      db.products.create({
        barcode: '7790001234567',
        name: 'Coca Cola Sin Azúcar',
        price: 550,
        cost: 320,
        stock: 30,
        minStock: 10,
      });

      const products = db.products.findByBarcode('7790001234567');
      expect(products).toHaveLength(2);
    });

    it('debe actualizar un producto', () => {
      const created = db.products.create({
        barcode: '123',
        name: 'Producto',
        price: 100,
        cost: 50,
        stock: 10,
        minStock: 5,
      });

      const updated = db.products.update(created.id, { price: 150 });
      expect(updated?.price).toBe(150);
    });

    it('debe eliminar (soft delete) un producto', () => {
      const created = db.products.create({
        barcode: '123',
        name: 'Producto',
        price: 100,
        cost: 50,
        stock: 10,
        minStock: 5,
      });

      const deleted = db.products.delete(created.id);
      expect(deleted).toBe(true);

      const found = db.products.findById(created.id);
      expect(found).toBeNull();
    });

    it('debe encontrar productos con stock bajo', () => {
      db.products.create({
        barcode: '1',
        name: 'Stock OK',
        price: 100,
        cost: 50,
        stock: 50,
        minStock: 10,
      });
      db.products.create({
        barcode: '2',
        name: 'Stock Bajo',
        price: 100,
        cost: 50,
        stock: 5,
        minStock: 10,
      });

      const lowStock = db.products.getLowStock();
      expect(lowStock).toHaveLength(1);
      expect(lowStock[0].name).toBe('Stock Bajo');
    });

    it('debe buscar productos por nombre', () => {
      db.products.create({
        barcode: '1',
        name: 'Coca Cola',
        price: 500,
        cost: 300,
        stock: 50,
        minStock: 10,
      });
      db.products.create({
        barcode: '2',
        name: 'Sprite',
        price: 450,
        cost: 280,
        stock: 30,
        minStock: 10,
      });

      const results = db.products.search('coca');
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Coca Cola');
    });

    it('debe ajustar stock correctamente', () => {
      const product = db.products.create({
        barcode: '1',
        name: 'Producto',
        price: 100,
        cost: 50,
        stock: 10,
        minStock: 5,
      });

      // Agregar stock
      db.products.adjustStock(product.id, 5);
      expect(db.products.findById(product.id)?.stock).toBe(15);

      // Restar stock
      db.products.adjustStock(product.id, -3);
      expect(db.products.findById(product.id)?.stock).toBe(12);
    });

    it('no debe permitir stock negativo', () => {
      const product = db.products.create({
        barcode: '1',
        name: 'Producto',
        price: 100,
        cost: 50,
        stock: 5,
        minStock: 5,
      });

      db.products.adjustStock(product.id, -10);
      expect(db.products.findById(product.id)?.stock).toBe(0);
    });
  });

  describe('Categories', () => {
    it('debe crear una categoría', () => {
      const category = db.categories.create({
        name: 'Bebidas',
        color: '#3b82f6',
        order: 1,
      });

      expect(category.id).toBeDefined();
      expect(category.name).toBe('Bebidas');
    });

    it('debe obtener categorías ordenadas', () => {
      db.categories.create({ name: 'Golosinas', color: '#f00', order: 2 });
      db.categories.create({ name: 'Bebidas', color: '#0f0', order: 1 });
      db.categories.create({ name: 'Cigarrillos', color: '#00f', order: 3 });

      const categories = db.categories.getAll();
      expect(categories[0].name).toBe('Bebidas');
      expect(categories[1].name).toBe('Golosinas');
      expect(categories[2].name).toBe('Cigarrillos');
    });

    it('debe actualizar una categoría', () => {
      const category = db.categories.create({
        name: 'Bebidas',
        color: '#3b82f6',
        order: 1,
      });

      const updated = db.categories.update(category.id, { color: '#ff0000' });
      expect(updated?.color).toBe('#ff0000');
    });

    it('debe eliminar una categoría', () => {
      const category = db.categories.create({
        name: 'Test',
        color: '#000',
        order: 1,
      });

      db.categories.delete(category.id);
      expect(db.categories.findById(category.id)).toBeNull();
    });
  });
});
