import { useEffect, useState, useRef } from 'react';
import { useProductsStore, Product, useFilteredProducts } from '../stores/productsStore';
import { useAuthStore } from '../stores/authStore';
import {
  FiSearch,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiFilter,
  FiPackage,
  FiCheck,
  FiX,
  FiMinus,
  FiSave,
  FiAlertCircle,
  FiTruck,
  FiList,
  FiZap,
} from 'react-icons/fi';

type TabType = 'gestion' | 'stock' | 'rapida';

// Tipo para las cantidades a cargar
interface LoadQuantities {
  [productId: string]: number;
}

// Tipo para productos en carga rápida
interface QuickProduct {
  tempId: string;
  name: string;
  price: number;
  cost: number;
  stock: number;
  autoBarcode: boolean;
  barcode: string;
}

export default function ProductsPage() {
  // Estado para la pestaña activa
  const [activeTab, setActiveTab] = useState<TabType>('gestion');
  
  // Estados para Gestión
  const [showModal, setShowModal] = useState(false);
  const [showComboModal, setShowComboModal] = useState(false); // Modal de combos
  const [comboProductSearch, setComboProductSearch] = useState(''); // Buscador en modal combo
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [autoGenerateBarcode, setAutoGenerateBarcode] = useState(false);
  const [formData, setFormData] = useState({
    barcode: '',
    name: '',
    description: '',
    price: '',
    cost: '',
    isCigarette: false,
    isCombo: false,
    separateCash: false,
    stock: '',
    minStock: '5',
    unitsPerBox: '1',
    categoryId: '',
  });

  // Estado para componentes de combo
  const [comboComponents, setComboComponents] = useState<{ productId: string; quantity: number; name?: string }[]>([]);
  const [simpleProducts, setSimpleProducts] = useState<Product[]>([]);

  // Estados para Carga de Stock
  const [loadQuantities, setLoadQuantities] = useState<LoadQuantities>({});
  const [stockSearch, setStockSearch] = useState('');
  const [stockCategoryFilter, setStockCategoryFilter] = useState<string>('');
  const [isLoadingStock, setIsLoadingStock] = useState(false);
  const [stockMessage, setStockMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Estados para Carga Rápida
  const [quickCategory, setQuickCategory] = useState<string>('');
  const [quickProducts, setQuickProducts] = useState<QuickProduct[]>([]);
  const [quickForm, setQuickForm] = useState({ name: '', price: '', cost: '', stock: '1', barcode: '', autoBarcode: false });
  const [isCreatingQuick, setIsCreatingQuick] = useState(false);
  const [quickMessage, setQuickMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const quickNameRef = useRef<HTMLInputElement>(null);

  const stockSearchRef = useRef<HTMLInputElement>(null);

  // Estado para configuración de campos visibles
  const [productSettings, setProductSettings] = useState({
    showCostPrice: true,
    showUnitsPerBox: true,
  });

  const {
    products,
    categories,
    isLoading,
    selectedCategory,
    fetchProducts,
    fetchCategories,
    createProduct,
    updateProduct,
    deleteProduct,
    setSelectedCategory,
    setSearchQuery: setStoreSearchQuery,
  } = useProductsStore();

  const user = useAuthStore((state) => state.user);
  const filteredProducts = useFilteredProducts();

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    // Cargar configuración de campos visibles
    const loadSettings = async () => {
      try {
        const result = await window.api.settings.get() as {
          success: boolean;
          data?: { showCostPrice?: boolean; showUnitsPerBox?: boolean };
        };
        if (result.success && result.data) {
          setProductSettings({
            showCostPrice: result.data.showCostPrice !== false,
            showUnitsPerBox: result.data.showUnitsPerBox !== false,
          });
        }
      } catch (error) {
        console.error('Error loading product settings:', error);
      }
    };
    loadSettings();
  }, [fetchProducts, fetchCategories]);

  useEffect(() => {
    setStoreSearchQuery(searchQuery);
  }, [searchQuery, setStoreSearchQuery]);

  // Limpiar mensaje de stock después de un tiempo
  useEffect(() => {
    if (stockMessage) {
      const timer = setTimeout(() => setStockMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [stockMessage]);

  // Enfocar búsqueda cuando cambia a pestaña stock
  useEffect(() => {
    if (activeTab === 'stock') {
      setTimeout(() => stockSearchRef.current?.focus(), 100);
    }
  }, [activeTab]);

  // Limpiar mensaje de carga rápida después de un tiempo
  useEffect(() => {
    if (quickMessage) {
      const timer = setTimeout(() => setQuickMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [quickMessage]);

  // Enfocar nombre cuando hay categoría seleccionada en carga rápida
  useEffect(() => {
    if (activeTab === 'rapida' && quickCategory) {
      setTimeout(() => quickNameRef.current?.focus(), 100);
    }
  }, [activeTab, quickCategory]);

  // --- Funciones de Gestión ---
  const openModal = async (product?: Product) => {
    // Cargar productos simples para seleccionar como componentes
    try {
      const result = await window.api.products.getSimple() as { success: boolean; data?: Product[] };
      if (result.success && result.data) {
        setSimpleProducts(result.data);
      }
    } catch (error) {
      console.error('Error loading simple products:', error);
    }

    if (product) {
      setEditingProduct(product);
      setAutoGenerateBarcode(false);
      setFormData({
        barcode: product.barcode,
        name: product.name,
        description: product.description || '',
        price: product.price.toString(),
        cost: product.cost?.toString() || '',
        isCigarette: product.isCigarette || false,
        isCombo: product.isCombo || false,
        separateCash: product.separateCash || false,
        stock: product.stock.toString(),
        minStock: product.minStock.toString(),
        unitsPerBox: product.unitsPerBox.toString(),
        categoryId: product.categoryId || '',
      });
      
      // Cargar componentes si es combo
      if (product.isCombo) {
        try {
          const compResult = await window.api.products.getComboComponents(product.id) as {
            success: boolean;
            data?: Array<{ componentId: string; quantity: number; component: { id: string; name: string } }>;
          };
          if (compResult.success && compResult.data) {
            setComboComponents(
              compResult.data.map((c) => ({
                productId: c.componentId,
                quantity: c.quantity,
                name: c.component.name,
              }))
            );
          }
        } catch (error) {
          console.error('Error loading combo components:', error);
          setComboComponents([]);
        }
      } else {
        setComboComponents([]);
      }
    } else {
      setEditingProduct(null);
      setAutoGenerateBarcode(false);
      setComboComponents([]);
      setFormData({
        barcode: '',
        name: '',
        description: '',
        price: '',
        cost: '',
        isCigarette: false,
        isCombo: false,
        separateCash: false,
        stock: '0',
        minStock: '5',
        unitsPerBox: '1',
        categoryId: '',
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validar que un combo tenga al menos un componente
    if (formData.isCombo && comboComponents.length === 0) {
      alert('Un combo debe tener al menos un producto componente');
      return;
    }

    const productData = {
      barcode: autoGenerateBarcode ? undefined : formData.barcode,
      name: formData.name,
      description: formData.description || undefined,
      price: parseFloat(formData.price),
      cost: formData.cost ? parseFloat(formData.cost) : 0,
      isCigarette: formData.isCigarette,
      isCombo: formData.isCombo,
      separateCash: formData.separateCash,
      stock: formData.isCombo ? 0 : (parseInt(formData.stock) || 0), // Combos no tienen stock propio
      minStock: formData.isCombo ? 0 : (parseInt(formData.minStock) || 5),
      unitsPerBox: parseInt(formData.unitsPerBox) || 1,
      categoryId: formData.categoryId || undefined,
      components: formData.isCombo ? comboComponents.map(c => ({ productId: c.productId, quantity: c.quantity })) : undefined,
    };

    if (editingProduct) {
      await updateProduct(editingProduct.id, productData);
    } else {
      await createProduct(productData);
    }

    setShowModal(false);
    setComboComponents([]);
  };

  const handleDelete = async (product: Product) => {
    if (confirm(`¿Eliminar "${product.name}"?`)) {
      await deleteProduct(product.id);
    }
  };

  // --- Funciones de Carga de Stock ---
  
  // Filtrar productos para stock
  const stockFilteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(stockSearch.toLowerCase()) ||
      p.barcode?.toLowerCase().includes(stockSearch.toLowerCase());
    const matchesCategory = !stockCategoryFilter || p.categoryId === stockCategoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Ordenar: primero los que tienen cantidad, luego por nombre
  const sortedStockProducts = [...stockFilteredProducts].sort((a, b) => {
    const qtyA = loadQuantities[a.id] || 0;
    const qtyB = loadQuantities[b.id] || 0;
    if (qtyA > 0 && qtyB === 0) return -1;
    if (qtyB > 0 && qtyA === 0) return 1;
    return a.name.localeCompare(b.name);
  });

  const updateQuantity = (productId: string, delta: number) => {
    setLoadQuantities((prev) => {
      const current = prev[productId] || 0;
      const newQty = Math.max(0, current + delta);
      if (newQty === 0) {
        const { [productId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [productId]: newQty };
    });
  };

  const setQuantity = (productId: string, qty: number) => {
    setLoadQuantities((prev) => {
      if (qty <= 0) {
        const { [productId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [productId]: qty };
    });
  };

  const productsToLoad = Object.entries(loadQuantities).filter(([_, qty]) => qty > 0);
  const totalUnits = productsToLoad.reduce((sum, [_, qty]) => sum + qty, 0);

  const handleConfirmLoad = async () => {
    if (productsToLoad.length === 0) {
      setStockMessage({ type: 'error', text: 'No hay productos para cargar' });
      return;
    }

    if (!user) {
      setStockMessage({ type: 'error', text: 'Usuario no autenticado' });
      return;
    }

    setIsLoadingStock(true);
    let successCount = 0;
    let errorCount = 0;

    for (const [productId, qty] of productsToLoad) {
      try {
        const result = await (window as any).api.stock.addStock(
          productId,
          qty,
          'Carga de mercadería',
          user.id
        );

        if (result.success) {
          successCount++;
        } else {
          errorCount++;
        }
      } catch (error) {
        errorCount++;
      }
    }

    await fetchProducts();
    setLoadQuantities({});

    if (errorCount === 0) {
      setStockMessage({
        type: 'success',
        text: `✓ ${successCount} productos cargados (${totalUnits} unidades)`,
      });
    } else {
      setStockMessage({
        type: 'error',
        text: `Cargados: ${successCount}, Errores: ${errorCount}`,
      });
    }

    setIsLoadingStock(false);
  };

  // --- Funciones de Carga Rápida ---
  
  const addQuickProduct = () => {
    if (!quickForm.name.trim() || !quickForm.price) return;
    
    const newProduct: QuickProduct = {
      tempId: Date.now().toString(),
      name: quickForm.name.trim(),
      price: parseFloat(quickForm.price),
      cost: quickForm.cost ? parseFloat(quickForm.cost) : 0,
      stock: parseInt(quickForm.stock) || 1,
      autoBarcode: quickForm.autoBarcode,
      barcode: quickForm.barcode.trim(),
    };
    
    setQuickProducts(prev => [...prev, newProduct]);
    setQuickForm({ name: '', price: '', cost: '', stock: '1', barcode: '', autoBarcode: false });
    quickNameRef.current?.focus();
  };

  const removeQuickProduct = (tempId: string) => {
    setQuickProducts(prev => prev.filter(p => p.tempId !== tempId));
  };

  const handleCreateAllQuickProducts = async () => {
    if (quickProducts.length === 0 || !quickCategory) return;
    
    setIsCreatingQuick(true);
    let successCount = 0;
    let errorCount = 0;

    for (const qp of quickProducts) {
      try {
        const productData = {
          barcode: qp.autoBarcode ? undefined : qp.barcode,
          name: qp.name,
          price: qp.price,
          cost: qp.cost,
          stock: qp.stock,
          minStock: 5,
          unitsPerBox: 1,
          categoryId: quickCategory,
        };

        await createProduct(productData);
        successCount++;
      } catch (error) {
        errorCount++;
      }
    }

    await fetchProducts();
    
    if (errorCount === 0) {
      setQuickMessage({
        type: 'success',
        text: `${successCount} productos creados en la categoría`,
      });
      setQuickProducts([]);
    } else {
      setQuickMessage({
        type: 'error',
        text: `Creados: ${successCount}, Errores: ${errorCount}`,
      });
    }

    setIsCreatingQuick(false);
  };

  const selectedQuickCategory = categories.find(c => c.id === quickCategory);

  // --- Helpers ---
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
    }).format(price);
  };

  const getStockBadge = (product: Product) => {
    if (product.stock <= 0) {
      return <span className="badge-stock-critical">Sin stock</span>;
    }
    if (product.stock <= product.minStock) {
      return <span className="badge-stock-critical">Crítico</span>;
    }
    if (product.stock <= product.minStock * 2) {
      return <span className="badge-stock-low">Bajo</span>;
    }
    return <span className="badge-stock-ok">OK</span>;
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header con pestañas */}
      <div className="bg-kiosko-card border-b border-kiosko-border">
        <div className="flex items-center justify-between px-6 pt-4">
          <h1 className="text-2xl font-bold">Productos</h1>
          
          {activeTab === 'gestion' && (
            <div className="flex items-center gap-2">
              <button onClick={() => openModal()} className="btn-primary flex items-center gap-2">
                <FiPlus size={20} />
                Nuevo Producto
              </button>
              <button 
                onClick={async () => {
                  // Cargar productos simples para seleccionar componentes
                  try {
                    const result = await window.api.products.getSimple() as { success: boolean; data?: Product[] };
                    if (result.success && result.data) {
                      setSimpleProducts(result.data);
                    }
                  } catch (error) {
                    console.error('Error loading simple products:', error);
                  }
                  setComboComponents([]);
                  setFormData(d => ({ ...d, name: '', price: '', isCombo: true, categoryId: '' }));
                  setShowComboModal(true);
                }} 
                className="px-3 py-2 text-sm bg-gradient-to-r from-primary-600/30 to-amber-600/30 hover:from-primary-600/50 hover:to-amber-600/50 text-primary-300 rounded-lg border border-primary-500/30 flex items-center gap-1 transition-all"
                title="Crear Combo/Promoción"
              >
                🎁 Combo
              </button>
            </div>
          )}
          
          {activeTab === 'stock' && productsToLoad.length > 0 && (
            <button
              onClick={handleConfirmLoad}
              disabled={isLoadingStock}
              className="btn-success flex items-center gap-2"
            >
              <FiSave size={20} />
              {isLoadingStock ? 'Cargando...' : `Confirmar Carga (${totalUnits} uds)`}
            </button>
          )}

          {activeTab === 'rapida' && quickProducts.length > 0 && (
            <button
              onClick={handleCreateAllQuickProducts}
              disabled={isCreatingQuick}
              className="btn-success flex items-center gap-2"
            >
              <FiCheck size={20} />
              {isCreatingQuick ? 'Creando...' : `Crear ${quickProducts.length} Productos`}
            </button>
          )}
        </div>
        
        {/* Pestañas */}
        <div className="flex gap-1 px-6 pt-4">
          <button
            onClick={() => setActiveTab('gestion')}
            className={`px-6 py-3 rounded-t-lg font-medium flex items-center gap-2 transition-colors ${
              activeTab === 'gestion'
                ? 'bg-kiosko-bg text-primary-400 border-t border-l border-r border-kiosko-border'
                : 'text-kiosko-muted hover:text-kiosko-text'
            }`}
          >
            <FiList size={18} />
            Gestión
          </button>
          <button
            onClick={() => setActiveTab('stock')}
            className={`px-6 py-3 rounded-t-lg font-medium flex items-center gap-2 transition-colors ${
              activeTab === 'stock'
                ? 'bg-kiosko-bg text-primary-400 border-t border-l border-r border-kiosko-border'
                : 'text-kiosko-muted hover:text-kiosko-text'
            }`}
          >
            <FiTruck size={18} />
            Cargar Stock
          </button>
          <button
            onClick={() => setActiveTab('rapida')}
            className={`px-6 py-3 rounded-t-lg font-medium flex items-center gap-2 transition-colors ${
              activeTab === 'rapida'
                ? 'bg-kiosko-bg text-stock-warning border-t border-l border-r border-kiosko-border'
                : 'text-kiosko-muted hover:text-kiosko-text'
            }`}
          >
            <FiZap size={18} />
            Carga Rápida
          </button>
        </div>
      </div>

      {/* Contenido según pestaña */}
      {activeTab === 'gestion' && (
        // ========== PESTAÑA GESTIÓN ==========
        <div className="flex-1 flex flex-col p-6 overflow-hidden">
          {/* Filtros */}
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1 max-w-md">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-kiosko-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nombre o código..."
                className="input pl-10"
              />
            </div>

            <div className="relative">
              <FiFilter className="absolute left-3 top-1/2 -translate-y-1/2 text-kiosko-muted" />
              <select
                value={selectedCategory || ''}
                onChange={(e) => setSelectedCategory(e.target.value || null)}
                className="input pl-10 pr-8 appearance-none cursor-pointer"
              >
                <option value="">Todas las categorías</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Lista de productos */}
          <div className="flex-1 overflow-auto">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <p className="text-kiosko-muted">Cargando...</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-kiosko-muted">
                <FiPackage size={48} className="mb-4 opacity-50" />
                <p>No se encontraron productos</p>
              </div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Producto</th>
                    <th>Categoría</th>
                    <th className="text-right">Precio</th>
                    <th className="text-center">Stock</th>
                    <th className="text-center">Estado</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product) => (
                    <tr key={product.id} className={product.isCombo ? 'bg-primary-600/5' : ''}>
                      <td className="font-mono text-sm">{product.barcode}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{product.name}</p>
                          {product.isCombo && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-gradient-to-r from-primary-600/30 to-amber-600/30 text-primary-300 rounded-full border border-primary-500/30">
                              🎁 Combo
                            </span>
                          )}
                        </div>
                        {product.description && (
                          <p className="text-sm text-kiosko-muted truncate max-w-xs">
                            {product.description}
                          </p>
                        )}
                        {product.isCombo && product.comboComponents && product.comboComponents.length > 0 && (
                          <p className="text-xs text-kiosko-muted mt-1">
                            Contiene: {product.comboComponents.map(c => `${c.quantity}x ${c.component.name}`).join(', ')}
                          </p>
                        )}
                      </td>
                      <td>
                        {product.category ? (
                          <span
                            className="category-chip"
                            style={{
                              backgroundColor: `${product.category.color}20`,
                              color: product.category.color,
                            }}
                          >
                            {product.category.name}
                          </span>
                        ) : (
                          <span className="text-kiosko-muted">-</span>
                        )}
                      </td>
                      <td className="text-right font-price font-medium">
                        {formatPrice(product.price)}
                      </td>
                      <td className="text-center font-medium">
                        {product.isCombo ? (
                          <span className="text-xs text-kiosko-muted">-</span>
                        ) : (
                          product.stock
                        )}
                      </td>
                      <td className="text-center">
                        {product.isCombo ? (
                          <span className="text-xs text-primary-400">Combo</span>
                        ) : (
                          getStockBadge(product)
                        )}
                      </td>
                      <td>
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => openModal(product)}
                            className="p-2 rounded-lg hover:bg-kiosko-bg text-kiosko-muted hover:text-primary-400 transition-colors"
                          >
                            <FiEdit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(product)}
                            className="p-2 rounded-lg hover:bg-kiosko-bg text-kiosko-muted hover:text-stock-critical transition-colors"
                          >
                            <FiTrash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {activeTab === 'stock' && (
        // ========== PESTAÑA CARGAR STOCK ==========
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Mensaje de feedback */}
          {stockMessage && (
            <div
              className={`mx-6 mt-4 p-4 rounded-lg flex items-center gap-3 ${
                stockMessage.type === 'success'
                  ? 'bg-stock-ok/20 text-stock-ok border border-stock-ok/30'
                  : 'bg-stock-critical/20 text-stock-critical border border-stock-critical/30'
              }`}
            >
              {stockMessage.type === 'success' ? <FiCheck size={24} /> : <FiX size={24} />}
              <span className="text-lg font-medium">{stockMessage.text}</span>
            </div>
          )}

          {/* Filtros de stock */}
          <div className="p-6 pb-4 flex gap-4">
            <div className="relative flex-1">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-kiosko-muted" />
              <input
                ref={stockSearchRef}
                type="text"
                value={stockSearch}
                onChange={(e) => setStockSearch(e.target.value)}
                placeholder="Buscar producto por nombre o código..."
                className="input w-full pl-10"
              />
            </div>
            <div className="relative">
              <FiFilter className="absolute left-3 top-1/2 -translate-y-1/2 text-kiosko-muted" />
              <select
                value={stockCategoryFilter}
                onChange={(e) => setStockCategoryFilter(e.target.value)}
                className="input pl-10 pr-8 appearance-none cursor-pointer"
              >
                <option value="">Todas las categorías</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Lista de productos para cargar */}
          <div className="flex-1 overflow-y-auto px-6 pb-4">
            {sortedStockProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-kiosko-muted">
                <FiPackage size={64} className="mb-4 opacity-50" />
                <p className="text-xl">No hay productos</p>
              </div>
            ) : (
              <div className="space-y-2">
                {sortedStockProducts.map((product) => {
                  const qty = loadQuantities[product.id] || 0;
                  const hasQty = qty > 0;

                  return (
                    <div
                      key={product.id}
                      className={`card flex items-center gap-4 transition-all ${
                        hasQty ? 'ring-2 ring-stock-ok bg-stock-ok/5' : ''
                      }`}
                    >
                      {/* Info del producto */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold truncate">{product.name}</p>
                          {product.category && (
                            <span
                              className="text-xs px-2 py-0.5 rounded-full"
                              style={{
                                backgroundColor: `${product.category.color}20`,
                                color: product.category.color,
                              }}
                            >
                              {product.category.name}
                            </span>
                          )}
                        </div>
                        <div className="flex gap-4 text-sm text-kiosko-muted">
                          <span className="font-mono">{product.barcode || 'Sin código'}</span>
                          <span>{formatPrice(product.price)}</span>
                        </div>
                      </div>

                      {/* Stock actual */}
                      <div className="text-center w-24">
                        <p className="text-xs text-kiosko-muted">Stock actual</p>
                        <p
                          className={`text-xl font-bold ${
                            product.stock <= product.minStock
                              ? 'text-stock-critical'
                              : 'text-stock-ok'
                          }`}
                        >
                          {product.stock}
                        </p>
                      </div>

                      {/* Controles de cantidad */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(product.id, -1)}
                          className="w-10 h-10 rounded-lg bg-kiosko-bg border border-kiosko-border flex items-center justify-center hover:bg-red-500/20 hover:border-red-500 transition-colors disabled:opacity-30"
                          disabled={qty === 0}
                        >
                          <FiMinus />
                        </button>

                        <input
                          type="number"
                          value={qty || ''}
                          onChange={(e) => setQuantity(product.id, parseInt(e.target.value) || 0)}
                          placeholder="0"
                          className={`w-20 h-12 text-center text-xl font-bold rounded-lg border-2 transition-all ${
                            hasQty
                              ? 'bg-stock-ok/10 border-stock-ok text-stock-ok'
                              : 'bg-kiosko-bg border-kiosko-border'
                          }`}
                          min={0}
                        />

                        <button
                          onClick={() => updateQuantity(product.id, 1)}
                          className="w-10 h-10 rounded-lg bg-kiosko-bg border border-kiosko-border flex items-center justify-center hover:bg-stock-ok/20 hover:border-stock-ok transition-colors"
                        >
                          <FiPlus />
                        </button>

                        {/* Botones rápidos */}
                        <div className="flex gap-1 ml-2">
                          <button
                            onClick={() => updateQuantity(product.id, 5)}
                            className="px-2 py-1 text-xs rounded bg-kiosko-bg border border-kiosko-border hover:bg-kiosko-border"
                          >
                            +5
                          </button>
                          <button
                            onClick={() => updateQuantity(product.id, 10)}
                            className="px-2 py-1 text-xs rounded bg-kiosko-bg border border-kiosko-border hover:bg-kiosko-border"
                          >
                            +10
                          </button>
                          <button
                            onClick={() => updateQuantity(product.id, product.unitsPerBox || 12)}
                            className="px-2 py-1 text-xs rounded bg-kiosko-bg border border-kiosko-border hover:bg-kiosko-border"
                            title={`+${product.unitsPerBox || 12} (caja)`}
                          >
                            +📦
                          </button>
                        </div>
                      </div>

                      {/* Nuevo stock */}
                      {hasQty && (
                        <div className="text-center w-24 pl-4 border-l border-kiosko-border">
                          <p className="text-xs text-kiosko-muted">Nuevo stock</p>
                          <p className="text-xl font-bold text-stock-ok">
                            {product.stock + qty}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Barra inferior fija cuando hay productos para cargar */}
          {productsToLoad.length > 0 && (
            <div className="border-t border-kiosko-border bg-kiosko-card p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <FiAlertCircle className="text-stock-warning" size={24} />
                  <div>
                    <p className="font-bold">
                      {productsToLoad.length} producto{productsToLoad.length > 1 ? 's' : ''} pendiente{productsToLoad.length > 1 ? 's' : ''}
                    </p>
                    <p className="text-sm text-kiosko-muted">
                      Total: {totalUnits} unidades
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setLoadQuantities({})}
                    className="btn-secondary"
                  >
                    Limpiar todo
                  </button>
                  <button
                    onClick={handleConfirmLoad}
                    disabled={isLoadingStock}
                    className="btn-success px-8 py-3 text-lg flex items-center gap-2"
                  >
                    <FiCheck size={24} />
                    {isLoadingStock ? 'Cargando...' : 'Confirmar Carga'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'rapida' && (
        // ========== PESTAÑA CARGA RÁPIDA ==========
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Mensaje de feedback */}
          {quickMessage && (
            <div
              className={`mx-6 mt-4 p-4 rounded-lg flex items-center gap-3 ${
                quickMessage.type === 'success'
                  ? 'bg-stock-ok/20 text-stock-ok border border-stock-ok/30'
                  : 'bg-stock-critical/20 text-stock-critical border border-stock-critical/30'
              }`}
            >
              {quickMessage.type === 'success' ? <FiCheck size={24} /> : <FiX size={24} />}
              <span className="text-lg font-medium">{quickMessage.text}</span>
            </div>
          )}

          <div className="flex-1 p-6 overflow-auto">
            {/* Selector de Categoría */}
            {!quickCategory ? (
              <div className="max-w-2xl mx-auto">
                <div className="text-center mb-8">
                  <FiZap size={48} className="mx-auto mb-4 text-stock-warning" />
                  <h2 className="text-2xl font-bold mb-2">Carga Rápida de Productos</h2>
                  <p className="text-kiosko-muted">
                    Selecciona una categoría para agregar múltiples productos de forma rápida
                  </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setQuickCategory(cat.id)}
                      className="card p-6 hover:ring-2 hover:ring-primary-400 transition-all text-center"
                      style={{ borderLeft: `4px solid ${cat.color}` }}
                    >
                      <span className="text-lg font-bold">{cat.name}</span>
                      <p className="text-sm text-kiosko-muted mt-1">
                        {products.filter(p => p.categoryId === cat.id).length} productos
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="max-w-4xl mx-auto">
                {/* Header con categoría seleccionada */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => {
                        setQuickCategory('');
                        setQuickProducts([]);
                        setQuickForm({ name: '', price: '', cost: '', stock: '1', barcode: '', autoBarcode: false });
                      }}
                      className="btn-secondary"
                    >
                      ← Cambiar Categoría
                    </button>
                    <div
                      className="px-4 py-2 rounded-lg font-bold text-lg"
                      style={{
                        backgroundColor: `${selectedQuickCategory?.color}20`,
                        color: selectedQuickCategory?.color,
                      }}
                    >
                      {selectedQuickCategory?.name}
                    </div>
                  </div>
                  {quickProducts.length > 0 && (
                    <span className="text-kiosko-muted">
                      {quickProducts.length} producto{quickProducts.length > 1 ? 's' : ''} pendiente{quickProducts.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                {/* Formulario rápido */}
                <div className="card mb-6">
                  <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                    <FiPlus className="text-stock-ok" />
                    Agregar Producto
                  </h3>
                  <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-4">
                      <label className="block text-sm text-kiosko-muted mb-1">Nombre *</label>
                      <input
                        ref={quickNameRef}
                        type="text"
                        value={quickForm.name}
                        onChange={(e) => setQuickForm(f => ({ ...f, name: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && quickForm.name && quickForm.price) {
                            e.preventDefault();
                            addQuickProduct();
                          }
                        }}
                        placeholder="Nombre del producto"
                        className="input w-full"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm text-kiosko-muted mb-1">Precio *</label>
                      <input
                        type="number"
                        value={quickForm.price}
                        onChange={(e) => setQuickForm(f => ({ ...f, price: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && quickForm.name && quickForm.price) {
                            e.preventDefault();
                            addQuickProduct();
                          }
                        }}
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                        className="input w-full"
                      />
                    </div>
                    {productSettings.showCostPrice && (
                      <div className="col-span-2">
                        <label className="block text-sm text-kiosko-muted mb-1">Costo</label>
                        <input
                          type="number"
                          value={quickForm.cost}
                          onChange={(e) => setQuickForm(f => ({ ...f, cost: e.target.value }))}
                          placeholder="0.00"
                          step="0.01"
                          min="0"
                          className="input w-full"
                        />
                      </div>
                    )}
                    <div className="col-span-1">
                      <label className="block text-sm text-kiosko-muted mb-1">Stock</label>
                      <input
                        type="number"
                        value={quickForm.stock}
                        onChange={(e) => setQuickForm(f => ({ ...f, stock: e.target.value }))}
                        min="0"
                        className="input w-full"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm text-kiosko-muted mb-1">
                        {quickForm.autoBarcode ? 'Código (auto)' : 'Código'}
                      </label>
                      <input
                        type="text"
                        value={quickForm.barcode}
                        onChange={(e) => setQuickForm(f => ({ ...f, barcode: e.target.value }))}
                        placeholder={quickForm.autoBarcode ? 'Automático' : 'Código'}
                        disabled={quickForm.autoBarcode}
                        className={`input w-full font-mono ${quickForm.autoBarcode ? 'opacity-50' : ''}`}
                      />
                      <label className="flex items-center gap-1 mt-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={quickForm.autoBarcode}
                          onChange={(e) => setQuickForm(f => ({ ...f, autoBarcode: e.target.checked, barcode: '' }))}
                          className="w-3 h-3"
                        />
                        <span className="text-xs text-kiosko-muted">Auto</span>
                      </label>
                    </div>
                    <div className="col-span-1 flex items-end">
                      <button
                        onClick={addQuickProduct}
                        disabled={!quickForm.name.trim() || !quickForm.price}
                        className="btn-primary w-full h-10 flex items-center justify-center"
                      >
                        <FiPlus size={20} />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-kiosko-muted mt-2">
                    Presiona Enter para agregar rápidamente
                  </p>
                </div>

                {/* Lista de productos pendientes */}
                {quickProducts.length > 0 && (
                  <div className="card">
                    <h3 className="font-bold text-lg mb-4">
                      Productos a Crear ({quickProducts.length})
                    </h3>
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                      {quickProducts.map((qp, index) => (
                        <div
                          key={qp.tempId}
                          className="flex items-center justify-between p-3 bg-kiosko-bg rounded-lg"
                        >
                          <div className="flex items-center gap-4">
                            <span className="text-kiosko-muted w-6">#{index + 1}</span>
                            <span className="font-medium">{qp.name}</span>
                            <span className="text-sm text-kiosko-muted font-mono">
                              {qp.autoBarcode ? '(auto)' : qp.barcode}
                            </span>
                          </div>
                          <div className="flex items-center gap-6">
                            <span className="font-price">{formatPrice(qp.price)}</span>
                            <span className="text-kiosko-muted">Stock: {qp.stock}</span>
                            <button
                              onClick={() => removeQuickProduct(qp.tempId)}
                              className="p-1 text-stock-critical hover:bg-stock-critical/20 rounded"
                            >
                              <FiX size={18} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-between items-center mt-4 pt-4 border-t border-kiosko-border">
                      <button
                        onClick={() => setQuickProducts([])}
                        className="btn-secondary"
                      >
                        Limpiar Lista
                      </button>
                      <button
                        onClick={handleCreateAllQuickProducts}
                        disabled={isCreatingQuick}
                        className="btn-success px-8 py-3 flex items-center gap-2"
                      >
                        <FiCheck size={20} />
                        {isCreatingQuick ? 'Creando...' : `Crear ${quickProducts.length} Productos`}
                      </button>
                    </div>
                  </div>
                )}

                {quickProducts.length === 0 && (
                  <div className="text-center text-kiosko-muted py-12">
                    <FiPackage size={48} className="mx-auto mb-4 opacity-50" />
                    <p>Agrega productos usando el formulario de arriba</p>
                    <p className="text-sm">Todos se crearán en la categoría seleccionada</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de producto */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content max-w-2xl max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4 sticky top-0 bg-kiosko-card pb-2 -mt-2 pt-2 -mx-2 px-2 z-10">
              {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-kiosko-muted mb-1">
                    Código de barras {!autoGenerateBarcode && '*'}
                  </label>
                  <input
                    type="text"
                    value={formData.barcode}
                    onChange={(e) =>
                      setFormData((d) => ({ ...d, barcode: e.target.value }))
                    }
                    className={`input font-mono ${autoGenerateBarcode ? 'opacity-50 bg-kiosko-bg' : ''}`}
                    required={!autoGenerateBarcode}
                    disabled={autoGenerateBarcode}
                    placeholder={autoGenerateBarcode ? 'Se generará automáticamente' : 'Escanear o ingresar código'}
                  />
                  {/* Checkbox para generar código automático */}
                  <label className="flex items-center gap-2 mt-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={autoGenerateBarcode}
                      onChange={(e) => {
                        setAutoGenerateBarcode(e.target.checked);
                        if (e.target.checked) {
                          setFormData((d) => ({ ...d, barcode: '' }));
                        }
                      }}
                      className="w-4 h-4 rounded border-kiosko-border text-primary-500 focus:ring-primary-500"
                    />
                    <span className="text-sm text-kiosko-muted">
                      Sin código de barras (generar automático)
                    </span>
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-kiosko-muted mb-1">
                    Categoría
                  </label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) =>
                      setFormData((d) => ({ ...d, categoryId: e.target.value }))
                    }
                    className="input"
                  >
                    <option value="">Sin categoría</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-kiosko-muted mb-1">
                  Nombre del producto *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((d) => ({ ...d, name: e.target.value }))
                  }
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-kiosko-muted mb-1">
                  Descripción
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((d) => ({ ...d, description: e.target.value }))
                  }
                  className="input"
                />
              </div>

              <div className={`grid gap-4 ${productSettings.showCostPrice ? 'grid-cols-2' : 'grid-cols-1'}`}>
                <div>
                  <label className="block text-sm font-medium text-kiosko-muted mb-1">
                    Precio de venta *
                  </label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) =>
                      setFormData((d) => ({ ...d, price: e.target.value }))
                    }
                    className="input"
                    step="0.01"
                    min="0"
                    required
                  />
                </div>
                {productSettings.showCostPrice && (
                  <div>
                    <label className="block text-sm font-medium text-kiosko-muted mb-1">
                      Costo
                    </label>
                    <input
                      type="number"
                      value={formData.cost}
                      onChange={(e) =>
                        setFormData((d) => ({ ...d, cost: e.target.value }))
                      }
                      className="input"
                      step="0.01"
                      min="0"
                    />
                  </div>
                )}
              </div>

              {/* Checkboxes en fila: Recargo y Caja Aparte */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-amber-600/20 to-orange-600/20 rounded-lg border border-amber-500/30">
                  <input
                    type="checkbox"
                    id="isCigarette"
                    checked={formData.isCigarette}
                    onChange={(e) =>
                      setFormData((d) => ({ ...d, isCigarette: e.target.checked }))
                    }
                    className="w-5 h-5 rounded border-kiosko-border text-amber-500 focus:ring-amber-500"
                  />
                  <label htmlFor="isCigarette" className="text-sm font-medium cursor-pointer">
                    🚬 Recargo en transferencia
                  </label>
                </div>

                <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-emerald-600/20 to-teal-600/20 rounded-lg border border-emerald-500/30">
                  <input
                    type="checkbox"
                    id="separateCash"
                    checked={formData.separateCash}
                    onChange={(e) => setFormData((d) => ({ ...d, separateCash: e.target.checked }))}
                    className="w-5 h-5 rounded border-kiosko-border text-emerald-500 focus:ring-emerald-500"
                  />
                  <label htmlFor="separateCash" className="text-sm font-medium cursor-pointer">
                    💰 Caja Aparte
                  </label>
                </div>
              </div>

              {/* Stock */}
              <div className={`grid gap-4 ${productSettings.showUnitsPerBox ? 'grid-cols-3' : 'grid-cols-2'}`}>
                  <div>
                    <label className="block text-sm font-medium text-kiosko-muted mb-1">
                      Stock actual
                    </label>
                    <input
                      type="number"
                      value={formData.stock}
                      onChange={(e) =>
                        setFormData((d) => ({ ...d, stock: e.target.value }))
                      }
                      className="input"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-kiosko-muted mb-1">
                      Stock mínimo
                    </label>
                    <input
                      type="number"
                      value={formData.minStock}
                      onChange={(e) =>
                        setFormData((d) => ({ ...d, minStock: e.target.value }))
                      }
                      className="input"
                      min="0"
                    />
                  </div>
                  {productSettings.showUnitsPerBox && (
                    <div>
                      <label className="block text-sm font-medium text-kiosko-muted mb-1">
                        Unidades/caja
                      </label>
                      <input
                        type="number"
                        value={formData.unitsPerBox}
                        onChange={(e) =>
                          setFormData((d) => ({ ...d, unitsPerBox: e.target.value }))
                        }
                        className="input"
                        min="1"
                      />
                    </div>
                  )}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary flex-1"
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary flex-1">
                  {editingProduct ? 'Guardar Cambios' : 'Crear Producto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Combo/Promoción - Simplificado */}
      {showComboModal && (
        <div className="modal-overlay" onClick={() => setShowComboModal(false)}>
          <div className="modal-content max-w-xl max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              🎁 Nuevo Combo / Promoción
            </h2>

            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!formData.name.trim() || !formData.price) {
                alert('Ingresa nombre y precio del combo');
                return;
              }
              if (comboComponents.length === 0) {
                alert('Agrega al menos un producto al combo');
                return;
              }
              
              try {
                const productData = {
                  name: formData.name,
                  price: parseFloat(formData.price),
                  cost: 0,
                  isCombo: true,
                  stock: 0,
                  minStock: 0,
                  unitsPerBox: 1,
                  categoryId: formData.categoryId || undefined,
                  components: comboComponents.map(c => ({ productId: c.productId, quantity: c.quantity })),
                };
                
                const result = await window.api.products.create(productData) as { success: boolean; error?: string };
                if (result.success) {
                  setShowComboModal(false);
                  setComboComponents([]);
                  setFormData(d => ({ ...d, name: '', price: '', isCombo: false }));
                  fetchProducts();
                } else {
                  alert(result.error || 'Error al crear combo');
                }
              } catch (error) {
                alert('Error al crear combo');
              }
            }} className="space-y-4">
              
              {/* Nombre del combo */}
              <div>
                <label className="block text-sm font-medium text-kiosko-muted mb-1">
                  Nombre del Combo *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(d => ({ ...d, name: e.target.value }))}
                  className="input w-full"
                  placeholder="Ej: Promo 2x1 Gaseosas"
                  autoFocus
                />
              </div>

              {/* Precio y Categoría */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-kiosko-muted mb-1">
                    Precio de venta *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-kiosko-muted">$</span>
                    <input
                      type="number"
                      value={formData.price}
                      onChange={(e) => setFormData(d => ({ ...d, price: e.target.value }))}
                      className="input w-full pl-8"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-kiosko-muted mb-1">
                    Categoría
                  </label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) => setFormData(d => ({ ...d, categoryId: e.target.value }))}
                    className="input w-full"
                  >
                    <option value="">Sin categoría</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Productos del combo */}
              <div className="p-4 bg-kiosko-bg rounded-lg border border-kiosko-border">
                <h4 className="font-medium mb-3">Productos incluidos</h4>
                
                {comboComponents.length > 0 ? (
                  <div className="space-y-2 mb-3">
                    {comboComponents.map((comp, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-kiosko-card rounded border border-kiosko-border">
                        <span className="flex-1 text-sm">{comp.name}</span>
                        <span className="text-kiosko-muted">×</span>
                        <input
                          type="number"
                          value={comp.quantity}
                          onChange={(e) => {
                            const qty = parseFloat(e.target.value) || 1;
                            setComboComponents(prev =>
                              prev.map((c, i) => i === index ? { ...c, quantity: Math.max(0.5, qty) } : c)
                            );
                          }}
                          className="w-14 text-center input py-1 text-sm"
                          step="0.5"
                          min="0.5"
                        />
                        <button
                          type="button"
                          onClick={() => setComboComponents(prev => prev.filter((_, i) => i !== index))}
                          className="w-6 h-6 flex items-center justify-center text-red-400 hover:bg-red-500/20 rounded"
                        >
                          <FiX size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-amber-400 mb-3">⚠️ Selecciona productos para agregar al combo</p>
                )}
                
                {/* Buscador y Grid de productos para agregar */}
                <div className="border-t border-kiosko-border pt-3">
                  <div className="relative mb-2">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-kiosko-muted" size={14} />
                    <input
                      type="text"
                      value={comboProductSearch}
                      onChange={(e) => setComboProductSearch(e.target.value)}
                      placeholder="Buscar producto..."
                      className="input w-full pl-9 py-2 text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-1 max-h-52 overflow-y-auto">
                    {simpleProducts
                      .filter(p => !p.isCombo && !comboComponents.find(c => c.productId === p.id))
                      .filter(p => comboProductSearch === '' || p.name.toLowerCase().includes(comboProductSearch.toLowerCase()))
                      .map(p => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setComboComponents(prev => [...prev, { productId: p.id, quantity: 1, name: p.name }]);
                            setComboProductSearch('');
                          }}
                          className="text-left p-2 text-xs bg-kiosko-card hover:bg-primary-600/20 rounded border border-kiosko-border truncate transition-colors"
                        >
                          + {p.name}
                        </button>
                      ))}
                    {simpleProducts
                      .filter(p => !p.isCombo && !comboComponents.find(c => c.productId === p.id))
                      .filter(p => comboProductSearch === '' || p.name.toLowerCase().includes(comboProductSearch.toLowerCase()))
                      .length === 0 && (
                        <p className="col-span-2 text-center text-sm text-kiosko-muted py-4">No se encontraron productos</p>
                      )}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowComboModal(false)}
                  className="btn-secondary flex-1"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-2 px-4 bg-gradient-to-r from-primary-600 to-amber-600 hover:from-primary-500 hover:to-amber-500 text-white font-medium rounded-lg transition-all"
                >
                  🎁 Crear Combo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
