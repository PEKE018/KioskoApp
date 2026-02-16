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
} from 'react-icons/fi';

type TabType = 'gestion' | 'stock';

// Tipo para las cantidades a cargar
interface LoadQuantities {
  [productId: string]: number;
}

export default function ProductsPage() {
  // Estado para la pestaña activa
  const [activeTab, setActiveTab] = useState<TabType>('gestion');
  
  // Estados para Gestión
  const [showModal, setShowModal] = useState(false);
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
    stock: '',
    minStock: '5',
    unitsPerBox: '1',
    categoryId: '',
  });

  // Estados para Carga de Stock
  const [loadQuantities, setLoadQuantities] = useState<LoadQuantities>({});
  const [stockSearch, setStockSearch] = useState('');
  const [stockCategoryFilter, setStockCategoryFilter] = useState<string>('');
  const [isLoadingStock, setIsLoadingStock] = useState(false);
  const [stockMessage, setStockMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const stockSearchRef = useRef<HTMLInputElement>(null);

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

  // --- Funciones de Gestión ---
  const openModal = (product?: Product) => {
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
        stock: product.stock.toString(),
        minStock: product.minStock.toString(),
        unitsPerBox: product.unitsPerBox.toString(),
        categoryId: product.categoryId || '',
      });
    } else {
      setEditingProduct(null);
      setAutoGenerateBarcode(false);
      setFormData({
        barcode: '',
        name: '',
        description: '',
        price: '',
        cost: '',
        isCigarette: false,
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

    const productData = {
      barcode: autoGenerateBarcode ? undefined : formData.barcode,
      name: formData.name,
      description: formData.description || undefined,
      price: parseFloat(formData.price),
      cost: formData.cost ? parseFloat(formData.cost) : 0,
      isCigarette: formData.isCigarette,
      stock: parseInt(formData.stock) || 0,
      minStock: parseInt(formData.minStock) || 5,
      unitsPerBox: parseInt(formData.unitsPerBox) || 1,
      categoryId: formData.categoryId || undefined,
    };

    if (editingProduct) {
      await updateProduct(editingProduct.id, productData);
    } else {
      await createProduct(productData);
    }

    setShowModal(false);
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
            <button onClick={() => openModal()} className="btn-primary flex items-center gap-2">
              <FiPlus size={20} />
              Nuevo Producto
            </button>
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
        </div>
      </div>

      {/* Contenido según pestaña */}
      {activeTab === 'gestion' ? (
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
                    <tr key={product.id}>
                      <td className="font-mono text-sm">{product.barcode}</td>
                      <td>
                        <p className="font-medium">{product.name}</p>
                        {product.description && (
                          <p className="text-sm text-kiosko-muted truncate max-w-xs">
                            {product.description}
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
                      <td className="text-center font-medium">{product.stock}</td>
                      <td className="text-center">{getStockBadge(product)}</td>
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
      ) : (
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

      {/* Modal de producto */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4">
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

              <div className="grid grid-cols-2 gap-4">
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
              </div>

              <div className="flex items-center gap-3 p-3 bg-kiosko-bg rounded-lg border border-kiosko-border">
                <input
                  type="checkbox"
                  id="isCigarette"
                  checked={formData.isCigarette}
                  onChange={(e) =>
                    setFormData((d) => ({ ...d, isCigarette: e.target.checked }))
                  }
                  className="w-5 h-5 rounded border-kiosko-border text-primary-500 focus:ring-primary-500"
                />
                <label htmlFor="isCigarette" className="text-sm font-medium cursor-pointer">
                  🚬 Es cigarrillo (aplica recargo especial en transferencia)
                </label>
              </div>

              <div className="grid grid-cols-3 gap-4">
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
    </div>
  );
}
