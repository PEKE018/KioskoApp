import { create } from 'zustand';

export interface Product {
  id: string;
  barcode: string;
  name: string;
  description?: string;
  price: number;
  cost: number;
  isCigarette: boolean;
  stock: number;
  minStock: number;
  unitsPerBox: number;
  sellByUnit: boolean;
  categoryId?: string;
  category?: {
    id: string;
    name: string;
    color: string;
    icon?: string;
  };
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  icon?: string;
  order: number;
  active: boolean;
  _count?: {
    products: number;
  };
}

interface ProductsState {
  products: Product[];
  categories: Category[];
  isLoading: boolean;
  error: string | null;
  selectedCategory: string | null;
  searchQuery: string;

  // Actions
  fetchProducts: () => Promise<void>;
  fetchCategories: () => Promise<void>;
  getByBarcode: (barcode: string) => Promise<Product | null>;
  createProduct: (data: Partial<Product>) => Promise<Product | null>;
  updateProduct: (id: string, data: Partial<Product>) => Promise<Product | null>;
  deleteProduct: (id: string) => Promise<boolean>;
  searchProducts: (query: string) => Promise<Product[]>;
  setSelectedCategory: (categoryId: string | null) => void;
  setSearchQuery: (query: string) => void;
  getLowStockProducts: () => Promise<Product[]>;
  
  // Category actions
  createCategory: (data: Partial<Category>) => Promise<Category | null>;
  updateCategory: (id: string, data: Partial<Category>) => Promise<Category | null>;
  deleteCategory: (id: string) => Promise<boolean>;
}

export const useProductsStore = create<ProductsState>((set) => ({
  products: [],
  categories: [],
  isLoading: false,
  error: null,
  selectedCategory: null,
  searchQuery: '',

  fetchProducts: async () => {
    set({ isLoading: true, error: null });
    
    try {
      const result = await window.api.products.getAll() as {
        success: boolean;
        data?: Product[];
        error?: string;
      };
      
      if (result.success && result.data) {
        set({ products: result.data, isLoading: false });
      } else {
        set({ error: result.error || 'Error al cargar productos', isLoading: false });
      }
    } catch (error) {
      set({ error: 'Error de conexión', isLoading: false });
    }
  },

  fetchCategories: async () => {
    try {
      const result = await window.api.categories.getAll() as {
        success: boolean;
        data?: Category[];
        error?: string;
      };
      
      if (result.success && result.data) {
        set({ categories: result.data });
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  },

  getByBarcode: async (barcode: string) => {
    try {
      const result = await window.api.products.getByBarcode(barcode) as {
        success: boolean;
        data?: Product;
        error?: string;
        notFound?: boolean;
      };
      
      if (result.success && result.data) {
        return result.data;
      }
      return null;
    } catch (error) {
      console.error('Error getting product by barcode:', error);
      return null;
    }
  },

  createProduct: async (data: Partial<Product>) => {
    try {
      const result = await window.api.products.create(data) as {
        success: boolean;
        data?: Product;
        error?: string;
      };
      
      if (result.success && result.data) {
        // Agregar al estado local
        set((state) => ({
          products: [...state.products, result.data!],
        }));
        return result.data;
      }
      return null;
    } catch (error) {
      console.error('Error creating product:', error);
      return null;
    }
  },

  updateProduct: async (id: string, data: Partial<Product>) => {
    try {
      const result = await window.api.products.update(id, data) as {
        success: boolean;
        data?: Product;
        error?: string;
      };
      
      if (result.success && result.data) {
        // Actualizar en estado local
        set((state) => ({
          products: state.products.map((p) =>
            p.id === id ? result.data! : p
          ),
        }));
        return result.data;
      }
      return null;
    } catch (error) {
      console.error('Error updating product:', error);
      return null;
    }
  },

  deleteProduct: async (id: string) => {
    try {
      const result = await window.api.products.delete(id) as {
        success: boolean;
        error?: string;
      };
      
      if (result.success) {
        // Quitar del estado local
        set((state) => ({
          products: state.products.filter((p) => p.id !== id),
        }));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error deleting product:', error);
      return false;
    }
  },

  searchProducts: async (query: string) => {
    try {
      const result = await window.api.products.search(query) as {
        success: boolean;
        data?: Product[];
        error?: string;
      };
      
      if (result.success && result.data) {
        return result.data;
      }
      return [];
    } catch (error) {
      console.error('Error searching products:', error);
      return [];
    }
  },

  setSelectedCategory: (categoryId: string | null) => {
    set({ selectedCategory: categoryId });
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
  },

  getLowStockProducts: async () => {
    try {
      const result = await window.api.products.getLowStock() as {
        success: boolean;
        data?: Product[];
        error?: string;
      };
      
      if (result.success && result.data) {
        return result.data;
      }
      return [];
    } catch (error) {
      console.error('Error getting low stock products:', error);
      return [];
    }
  },

  // Category actions
  createCategory: async (data: Partial<Category>) => {
    try {
      const result = await window.api.categories.create(data) as {
        success: boolean;
        data?: Category;
        error?: string;
      };
      
      if (result.success && result.data) {
        set((state) => ({
          categories: [...state.categories, result.data!],
        }));
        return result.data;
      }
      return null;
    } catch (error) {
      console.error('Error creating category:', error);
      return null;
    }
  },

  updateCategory: async (id: string, data: Partial<Category>) => {
    try {
      const result = await window.api.categories.update(id, data) as {
        success: boolean;
        data?: Category;
        error?: string;
      };
      
      if (result.success && result.data) {
        set((state) => ({
          categories: state.categories.map((c) =>
            c.id === id ? { ...c, ...result.data! } : c
          ),
        }));
        return result.data;
      }
      return null;
    } catch (error) {
      console.error('Error updating category:', error);
      return null;
    }
  },

  deleteCategory: async (id: string) => {
    try {
      const result = await window.api.categories.delete(id) as {
        success: boolean;
        error?: string;
      };
      
      if (result.success) {
        set((state) => ({
          categories: state.categories.filter((c) => c.id !== id),
        }));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error deleting category:', error);
      return false;
    }
  },
}));

// Selector para productos filtrados
export const useFilteredProducts = () => {
  const products = useProductsStore((state) => state.products);
  const selectedCategory = useProductsStore((state) => state.selectedCategory);
  const searchQuery = useProductsStore((state) => state.searchQuery);

  return products.filter((product) => {
    // Filtro por categoría
    if (selectedCategory && product.categoryId !== selectedCategory) {
      return false;
    }

    // Filtro por búsqueda
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        product.name.toLowerCase().includes(query) ||
        product.barcode.includes(query) ||
        product.description?.toLowerCase().includes(query)
      );
    }

    return true;
  });
};
