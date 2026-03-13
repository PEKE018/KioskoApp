import { useEffect, useState } from 'react';
import { useProductsStore, Product } from '../stores/productsStore';
import { useAuthStore } from '../stores/authStore';
import {
  FiAlertTriangle,
  FiSearch,
  FiTrendingDown,
  FiPackage,
  FiArrowDown,
  FiArrowUp,
} from 'react-icons/fi';

type StockFilter = 'all' | 'critical' | 'low' | 'ok';

interface StockMovement {
  id: string;
  type: string;
  quantity: number;
  reason: string;
  stockBefore: number;
  stockAfter: number;
  createdAt: string;
  product: { name: string; barcode: string };
  user: { name: string };
}

export default function StockPage() {
  const [filter, setFilter] = useState<StockFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [showMovements, setShowMovements] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [adjustData, setAdjustData] = useState({ quantity: '', reason: '' });
  const [showAdjustModal, setShowAdjustModal] = useState(false);

  const { products, fetchProducts, fetchCategories } = useProductsStore();
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    loadMovements();
  }, [fetchProducts, fetchCategories]);

  const loadMovements = async () => {
    try {
      const result = await window.api.stock.getAllMovements(50) as {
        success: boolean;
        data?: StockMovement[];
      };
      if (result.success && result.data) {
        setMovements(result.data);
      }
    } catch (error) {
      console.error('Error loading movements:', error);
    }
  };

  const handleAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || !adjustData.reason || !user) return;

    try {
      const result = await window.api.stock.adjustStock(
        selectedProduct.id,
        parseInt(adjustData.quantity),
        adjustData.reason,
        user.id
      ) as { success: boolean };

      if (result.success) {
        await fetchProducts();
        await loadMovements();
        setShowAdjustModal(false);
        setSelectedProduct(null);
        setAdjustData({ quantity: '', reason: '' });
      }
    } catch (error) {
      console.error('Error adjusting stock:', error);
    }
  };

  const openAdjustModal = (product: Product) => {
    setSelectedProduct(product);
    setAdjustData({ quantity: product.stock.toString(), reason: '' });
    setShowAdjustModal(true);
  };

  // Filtrar productos
  const filteredProducts = products.filter((product) => {
    // Filtro de búsqueda
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (
        !product.name.toLowerCase().includes(query) &&
        !product.barcode.includes(query)
      ) {
        return false;
      }
    }

    // Filtro de stock
    switch (filter) {
      case 'critical':
        return product.stock <= product.minStock;
      case 'low':
        return product.stock > product.minStock && product.stock <= product.minStock * 2;
      case 'ok':
        return product.stock > product.minStock * 2;
      default:
        return true;
    }
  });

  // Estadísticas
  const stats = {
    total: products.length,
    critical: products.filter((p) => p.stock <= p.minStock).length,
    low: products.filter((p) => p.stock > p.minStock && p.stock <= p.minStock * 2).length,
    ok: products.filter((p) => p.stock > p.minStock * 2).length,
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
    }).format(price);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStockColor = (product: Product) => {
    if (product.stock <= product.minStock) return 'text-stock-critical';
    if (product.stock <= product.minStock * 2) return 'text-stock-low';
    return 'text-stock-ok';
  };

  return (
    <div className="h-full flex flex-col p-6">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div
          onClick={() => setFilter('all')}
          className={`card cursor-pointer transition-all ${
            filter === 'all' ? 'ring-2 ring-primary-500' : ''
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-primary-500/20 flex items-center justify-center">
              <FiPackage className="text-primary-500" size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-app-muted">Total productos</p>
            </div>
          </div>
        </div>

        <div
          onClick={() => setFilter('critical')}
          className={`card cursor-pointer transition-all ${
            filter === 'critical' ? 'ring-2 ring-stock-critical' : ''
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-stock-critical/20 flex items-center justify-center">
              <FiAlertTriangle className="text-stock-critical" size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold text-stock-critical">{stats.critical}</p>
              <p className="text-sm text-app-muted">Stock crítico</p>
            </div>
          </div>
        </div>

        <div
          onClick={() => setFilter('low')}
          className={`card cursor-pointer transition-all ${
            filter === 'low' ? 'ring-2 ring-stock-low' : ''
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-stock-low/20 flex items-center justify-center">
              <FiTrendingDown className="text-stock-low" size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold text-stock-low">{stats.low}</p>
              <p className="text-sm text-app-muted">Stock bajo</p>
            </div>
          </div>
        </div>

        <div
          onClick={() => setFilter('ok')}
          className={`card cursor-pointer transition-all ${
            filter === 'ok' ? 'ring-2 ring-stock-ok' : ''
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-stock-ok/20 flex items-center justify-center">
              <FiPackage className="text-stock-ok" size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold text-stock-ok">{stats.ok}</p>
              <p className="text-sm text-app-muted">Stock OK</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setShowMovements(false)}
          className={`px-4 py-2 rounded-lg transition-colors ${
            !showMovements
              ? 'bg-primary-600 text-white'
              : 'text-app-muted hover:text-white'
          }`}
        >
          Inventario
        </button>
        <button
          onClick={() => setShowMovements(true)}
          className={`px-4 py-2 rounded-lg transition-colors ${
            showMovements
              ? 'bg-primary-600 text-white'
              : 'text-app-muted hover:text-white'
          }`}
        >
          Movimientos
        </button>

        <div className="flex-1" />

        {/* Búsqueda */}
        <div className="relative w-80">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-app-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar producto..."
            className="input pl-10"
          />
        </div>
      </div>

      {/* Contenido */}
      <div className="flex-1 overflow-auto">
        {!showMovements ? (
          // Vista de inventario
          <table className="table">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Categoría</th>
                <th className="text-center">Stock</th>
                <th className="text-center">Mínimo</th>
                <th className="text-right">Valor Stock</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => (
                <tr key={product.id}>
                  <td>
                    <p className="font-medium">{product.name}</p>
                    <p className="text-sm text-app-muted font-mono">
                      {product.barcode}
                    </p>
                  </td>
                  <td>
                    {product.category ? (
                      <span
                        className="category-chip text-xs"
                        style={{
                          backgroundColor: `${product.category.color}20`,
                          color: product.category.color,
                        }}
                      >
                        {product.category.name}
                      </span>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="text-center">
                    <span
                      className={`text-2xl font-bold ${getStockColor(product)}`}
                    >
                      {product.stock}
                    </span>
                  </td>
                  <td className="text-center text-app-muted">
                    {product.minStock}
                  </td>
                  <td className="text-right font-price">
                    {formatPrice(product.stock * product.cost)}
                  </td>
                  <td>
                    <button
                      onClick={() => openAdjustModal(product)}
                      className="btn-secondary text-sm py-1"
                    >
                      Ajustar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          // Vista de movimientos
          <table className="table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Producto</th>
                <th>Tipo</th>
                <th className="text-center">Cantidad</th>
                <th>Razón</th>
                <th>Usuario</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((mov) => (
                <tr key={mov.id}>
                  <td className="text-sm text-app-muted">
                    {formatDate(mov.createdAt)}
                  </td>
                  <td>
                    <p className="font-medium">{mov.product.name}</p>
                    <p className="text-xs text-app-muted font-mono">
                      {mov.product.barcode}
                    </p>
                  </td>
                  <td>
                    <span
                      className={`text-sm ${
                        mov.type === 'IN' || mov.type === 'RETURN'
                          ? 'text-stock-ok'
                          : mov.type === 'SALE' || mov.type === 'OUT'
                          ? 'text-stock-critical'
                          : 'text-stock-low'
                      }`}
                    >
                      {mov.type === 'IN' && 'Entrada'}
                      {mov.type === 'OUT' && 'Salida'}
                      {mov.type === 'SALE' && 'Venta'}
                      {mov.type === 'ADJUSTMENT' && 'Ajuste'}
                      {mov.type === 'RETURN' && 'Devolución'}
                      {mov.type === 'LOSS' && 'Pérdida'}
                    </span>
                  </td>
                  <td className="text-center">
                    <span
                      className={`flex items-center justify-center gap-1 font-bold ${
                        mov.quantity > 0 ? 'text-stock-ok' : 'text-stock-critical'
                      }`}
                    >
                      {mov.quantity > 0 ? (
                        <FiArrowUp size={14} />
                      ) : (
                        <FiArrowDown size={14} />
                      )}
                      {Math.abs(mov.quantity)}
                    </span>
                    <span className="text-xs text-app-muted">
                      {mov.stockBefore} → {mov.stockAfter}
                    </span>
                  </td>
                  <td className="text-sm max-w-xs truncate">{mov.reason}</td>
                  <td className="text-sm text-app-muted">{mov.user.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal de ajuste */}
      {showAdjustModal && selectedProduct && (
        <div className="modal-overlay" onClick={() => setShowAdjustModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4">Ajustar Stock</h2>

            <div className="mb-4 p-3 bg-app-bg rounded-lg">
              <p className="font-medium">{selectedProduct.name}</p>
              <p className="text-sm text-app-muted">
                Stock actual: <strong>{selectedProduct.stock}</strong>
              </p>
            </div>

            <form onSubmit={handleAdjust} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-app-muted mb-1">
                  Nueva cantidad
                </label>
                <input
                  type="number"
                  value={adjustData.quantity}
                  onChange={(e) =>
                    setAdjustData((d) => ({ ...d, quantity: e.target.value }))
                  }
                  className="input text-center text-2xl"
                  min="0"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-app-muted mb-1">
                  Razón del ajuste *
                </label>
                <input
                  type="text"
                  value={adjustData.reason}
                  onChange={(e) =>
                    setAdjustData((d) => ({ ...d, reason: e.target.value }))
                  }
                  className="input"
                  placeholder="Ej: Conteo físico, rotura, etc."
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  className="btn-secondary flex-1"
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary flex-1">
                  Confirmar Ajuste
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
