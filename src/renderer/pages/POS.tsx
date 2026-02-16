import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePOSStore, usePOSTotals } from '../stores/posStore';
import { useProductsStore, Product } from '../stores/productsStore';
import { useAuthStore } from '../stores/authStore';
import {
  FiTrash2,
  FiPlus,
  FiMinus,
  FiSearch,
  FiDollarSign,
  FiCreditCard,
  FiSmartphone,
  FiCheck,
  FiX,
  FiPackage,
  FiAlertCircle,
  FiUsers,
} from 'react-icons/fi';

type PaymentMethod = 'CASH' | 'DEBIT' | 'CREDIT' | 'MERCADOPAGO' | 'TRANSFER' | 'FIADO';

interface Customer {
  id: string;
  name: string;
  phone?: string;
  balance: number;
}

interface CashRegister {
  id: string;
  status: string;
  initialAmount: number;
  salesTotal: number;
  user: { name: string };
}

export default function POSPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [saleSuccess, setSaleSuccess] = useState(false);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [autoGenerateBarcodePOS, setAutoGenerateBarcodePOS] = useState(false);
  const [cashRegister, setCashRegister] = useState<CashRegister | null>(null);
  const [cashLoading, setCashLoading] = useState(true);
  const [transferFeePercent, setTransferFeePercent] = useState(0);
  const [cigaretteTransferFeePercent, setCigaretteTransferFeePercent] = useState(0);
  const [newProductForm, setNewProductForm] = useState({
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

  // Estados para fiado/clientes
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResults, setCustomerResults] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);

  const scanInputRef = useRef<HTMLInputElement>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);

  const {
    items,
    discount,
    paymentMethod,
    amountPaid,
    lastScannedProduct,
    notFoundBarcode,
    isProcessing,
    error,
    addItem,
    removeItem,
    incrementQuantity,
    decrementQuantity,
    setPaymentMethod,
    setAmountPaid,
    clearCart,
    scanBarcode,
    processSale,
    clearNotFoundBarcode,
  } = usePOSStore();

  const { subtotal, total, change, itemsCount } = usePOSTotals();
  const { searchProducts, fetchProducts, categories, fetchCategories, createProduct } = useProductsStore();
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();

  // Cargar estado de caja y configuración
  const loadCashRegister = useCallback(async () => {
    setCashLoading(true);
    try {
      const result = await window.api.cashRegister.getCurrent() as {
        success: boolean;
        data?: CashRegister;
      };
      if (result.success) {
        setCashRegister(result.data || null);
      }

      // Cargar configuración de porcentaje de transferencia
      const settingsResult = await window.api.settings.get() as {
        success: boolean;
        data?: { transferFeePercent: number; cigaretteTransferFeePercent: number };
      };
      if (settingsResult.success && settingsResult.data) {
        setTransferFeePercent(settingsResult.data.transferFeePercent || 0);
        setCigaretteTransferFeePercent(settingsResult.data.cigaretteTransferFeePercent || 0);
      }
    } catch (err) {
      console.error('Error loading cash register:', err);
    }
    setCashLoading(false);
  }, []);

  // Cargar productos, categorías y estado de caja al inicio
  useEffect(() => {
    fetchProducts();
    fetchCategories();
    loadCashRegister();
  }, [fetchProducts, fetchCategories, loadCashRegister]);

  // Focus en input de escaneo
  useEffect(() => {
    if (!showPayment && !showSearch && !showAddProduct) {
      scanInputRef.current?.focus();
    }
  }, [showPayment, showSearch, showAddProduct, items, lastScannedProduct]);

  // Mantener focus en el input de escaneo cuando se hace click en cualquier parte
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      // Si no hay modales abiertos y el click no fue en un input/button/select
      if (!showPayment && !showSearch && !showAddProduct) {
        const target = e.target as HTMLElement;
        const isInteractive = target.tagName === 'INPUT' || 
                              target.tagName === 'BUTTON' || 
                              target.tagName === 'SELECT' ||
                              target.closest('button') ||
                              target.closest('input');
        
        if (!isInteractive) {
          setTimeout(() => scanInputRef.current?.focus(), 0);
        }
      }
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [showPayment, showSearch, showAddProduct]);

  // Focus en monto cuando se abre panel de pago
  useEffect(() => {
    if (showPayment && paymentMethod === 'CASH') {
      amountInputRef.current?.focus();
    }
  }, [showPayment, paymentMethod]);

  // Abrir modal de agregar producto cuando hay código no encontrado
  const handleAddNewProduct = () => {
    if (notFoundBarcode) {
      setNewProductForm({
        barcode: notFoundBarcode,
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
      setShowAddProduct(true);
      clearNotFoundBarcode();
    }
  };

  // Guardar nuevo producto
  const handleSaveNewProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const productData = {
      barcode: autoGenerateBarcodePOS ? undefined : newProductForm.barcode,
      name: newProductForm.name,
      description: newProductForm.description || undefined,
      price: parseFloat(newProductForm.price),
      cost: newProductForm.cost ? parseFloat(newProductForm.cost) : 0,
      isCigarette: newProductForm.isCigarette,
      stock: parseInt(newProductForm.stock) || 0,
      minStock: parseInt(newProductForm.minStock) || 5,
      unitsPerBox: parseInt(newProductForm.unitsPerBox) || 1,
      categoryId: newProductForm.categoryId || undefined,
    };
    
    const newProduct = await createProduct(productData);
    if (newProduct) {
      addItem(newProduct);
      setShowAddProduct(false);
      setAutoGenerateBarcodePOS(false);
      setNewProductForm({ barcode: '', name: '', description: '', price: '', cost: '', isCigarette: false, stock: '0', minStock: '5', unitsPerBox: '1', categoryId: '' });
    }
  };

  // Atajos de teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // F2 - Abrir pago
      if (e.key === 'F2' && items.length > 0) {
        e.preventDefault();
        setShowPayment(true);
      }
      // Escape - Cerrar modales
      if (e.key === 'Escape') {
        if (showPayment) {
          setShowPayment(false);
        } else if (showSearch) {
          setShowSearch(false);
        }
      }
      // F4 - Buscar producto
      if (e.key === 'F4') {
        e.preventDefault();
        setShowSearch(true);
      }
      // F12 - Limpiar carrito
      if (e.key === 'F12') {
        e.preventDefault();
        clearCart();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [items.length, showPayment, showSearch, clearCart]);

  // Manejar escaneo
  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    const barcode = searchQuery.trim();
    if (barcode) {
      await scanBarcode(barcode);
      setSearchQuery('');
      // Mantener focus en el input después de escanear
      scanInputRef.current?.focus();
    }
  };

  // Buscar productos
  const handleSearchChange = useCallback(
    async (query: string) => {
      setSearchQuery(query);
      if (query.length >= 2) {
        const results = await searchProducts(query);
        setSearchResults(results);
      } else {
        setSearchResults([]);
      }
    },
    [searchProducts]
  );

  // Seleccionar producto de búsqueda
  const handleSelectProduct = (product: Product) => {
    addItem(product);
    setShowSearch(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  // Calcular recargos por transferencia
  const calculateTransferFees = () => {
    if (paymentMethod !== 'TRANSFER') return { percentageFee: 0, cigaretteFee: 0, totalFee: 0 };
    
    // Recargo porcentual general (configurado en Ajustes)
    const percentageFee = transferFeePercent > 0 ? total * transferFeePercent / 100 : 0;
    
    // Recargo por cigarrillos (porcentaje adicional sobre el subtotal de cigarrillos)
    const cigaretteSubtotal = items.reduce((sum, item) => {
      if (item.product.isCigarette) {
        return sum + item.subtotal;
      }
      return sum;
    }, 0);
    const cigaretteFee = cigaretteTransferFeePercent > 0 && cigaretteSubtotal > 0
      ? cigaretteSubtotal * cigaretteTransferFeePercent / 100
      : 0;
    
    return { percentageFee, cigaretteFee, totalFee: percentageFee + cigaretteFee };
  };

  const transferFees = calculateTransferFees();
  const finalTotal = total + transferFees.totalFee;

  // Buscar clientes
  const handleCustomerSearch = async (query: string) => {
    setCustomerSearch(query);
    if (query.length < 2) {
      setCustomerResults([]);
      return;
    }
    try {
      const result = await (window as any).api.customers.search(query) as { success: boolean; data: Customer[] };
      if (result.success) {
        setCustomerResults(result.data);
      }
    } catch (error) {
      console.error('Error buscando clientes:', error);
    }
  };

  // Crear cliente nuevo
  const handleCreateCustomer = async () => {
    if (!newCustomerName.trim()) return;
    setIsCreatingCustomer(true);
    try {
      const result = await (window as any).api.customers.create({ name: newCustomerName.trim() }) as { success: boolean; data: Customer };
      if (result.success) {
        setSelectedCustomer(result.data);
        setShowCustomerModal(false);
        setNewCustomerName('');
        setCustomerSearch('');
        setCustomerResults([]);
      }
    } catch (error) {
      console.error('Error creando cliente:', error);
    }
    setIsCreatingCustomer(false);
  };

  // Seleccionar cliente
  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowCustomerModal(false);
    setCustomerSearch('');
    setCustomerResults([]);
  };

  // Procesar pago
  const handlePayment = async () => {
    if (!user || !cashRegister) return;

    // Si es fiado, verificar que hay cliente seleccionado
    if (paymentMethod === 'FIADO' && !selectedCustomer) {
      setShowCustomerModal(true);
      return;
    }

    const success = await processSale(
      user.id, 
      cashRegister.id, 
      transferFees.totalFee,
      selectedCustomer?.id // Pasar customerId si es fiado
    );
    if (success) {
      setSaleSuccess(true);
      setShowPayment(false);
      setSelectedCustomer(null); // Limpiar cliente seleccionado
      // Recargar datos de caja para actualizar salesTotal
      loadCashRegister();
      setTimeout(() => {
        setSaleSuccess(false);
        scanInputRef.current?.focus();
      }, 2000);
    }
  };

  // Formato de precio
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
    }).format(price);
  };

  const paymentMethods: { method: PaymentMethod; icon: React.ElementType; label: string }[] = [
    { method: 'CASH', icon: FiDollarSign, label: 'Efectivo' },
    { method: 'DEBIT', icon: FiCreditCard, label: 'Débito' },
    { method: 'CREDIT', icon: FiCreditCard, label: 'Crédito' },
    { method: 'MERCADOPAGO', icon: FiSmartphone, label: 'MP' },
    { method: 'TRANSFER', icon: FiSmartphone, label: 'Transf.' },
    { method: 'FIADO', icon: FiUsers, label: 'Fiado' },
  ];

  return (
    <div className="h-full flex relative">
      {/* Overlay caja cerrada */}
      {!cashLoading && !cashRegister && (
        <div className="absolute inset-0 bg-kiosko-bg/95 z-40 flex items-center justify-center backdrop-blur-sm">
          <div className="bg-kiosko-card border border-kiosko-border rounded-2xl p-8 max-w-md text-center shadow-2xl">
            <div className="w-20 h-20 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <FiAlertCircle size={48} className="text-yellow-500" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Caja Cerrada</h2>
            <p className="text-kiosko-muted mb-6">
              Para comenzar a vender, primero debes abrir la caja registradora.
            </p>
            <button
              onClick={() => navigate('/cash')}
              className="w-full bg-kiosko-success hover:bg-kiosko-success/90 text-white font-semibold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-kiosko-success/25"
            >
              <FiDollarSign size={20} />
              <span>Ir a Abrir Caja</span>
            </button>
          </div>
        </div>
      )}

      {/* Panel izquierdo - Carrito */}
      <div className="flex-1 flex flex-col p-4">
        {/* Input de escaneo */}
        <form onSubmit={handleScan} className="mb-4">
          <input
            ref={scanInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Escanear código de barras o buscar... (F4)"
            className="input-scan"
            autoFocus
          />
        </form>

        {/* Último producto escaneado */}
        {lastScannedProduct && (
          <div className="mb-4 p-3 bg-stock-ok/10 border border-stock-ok/30 rounded-lg flex items-center gap-3 animate-scan">
            <FiCheck className="text-stock-ok text-xl" />
            <div className="flex-1">
              <p className="font-medium">{lastScannedProduct.name}</p>
              <p className="text-sm text-kiosko-muted">
                {formatPrice(lastScannedProduct.price)}
              </p>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 bg-stock-critical/10 border border-stock-critical/30 rounded-lg">
            <div className="flex items-center gap-3">
              <FiX className="text-stock-critical text-xl" />
              <p className="text-stock-critical flex-1">{error}</p>
            </div>
            {notFoundBarcode && (
              <button
                onClick={handleAddNewProduct}
                className="mt-3 w-full flex items-center justify-center gap-2 py-2 px-4 bg-kiosko-primary hover:bg-kiosko-primary/90 text-white rounded-lg transition-colors"
              >
                <FiPackage size={18} />
                ¿Desea agregarlo?
              </button>
            )}
          </div>
        )}

        {/* Lista de items */}
        <div className="flex-1 overflow-y-auto">
          {items.length === 0 ? (
            <div className="h-full flex items-center justify-center text-kiosko-muted">
              <div className="text-center">
                <FiSearch size={48} className="mx-auto mb-4 opacity-50" />
                <p className="text-lg">Escanee un producto para comenzar</p>
                <p className="text-sm mt-2">o presione F4 para buscar</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <div
                  key={item.product.id}
                  className="card flex items-center gap-4 animate-enter"
                >
                  {/* Info del producto */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{item.product.name}</p>
                    <p className="text-sm text-kiosko-muted">
                      {formatPrice(item.product.price)} c/u
                    </p>
                  </div>

                  {/* Controles de cantidad */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => decrementQuantity(item.product.id)}
                      className="w-8 h-8 rounded-lg bg-kiosko-bg border border-kiosko-border flex items-center justify-center hover:bg-kiosko-border transition-colors"
                    >
                      <FiMinus size={16} />
                    </button>
                    <span className="w-10 text-center font-bold text-lg">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => incrementQuantity(item.product.id)}
                      className="w-8 h-8 rounded-lg bg-kiosko-bg border border-kiosko-border flex items-center justify-center hover:bg-kiosko-border transition-colors"
                    >
                      <FiPlus size={16} />
                    </button>
                  </div>

                  {/* Subtotal */}
                  <div className="w-28 text-right">
                    <p className="font-bold text-lg font-price">
                      {formatPrice(item.subtotal)}
                    </p>
                  </div>

                  {/* Eliminar */}
                  <button
                    onClick={() => removeItem(item.product.id)}
                    className="w-8 h-8 rounded-lg text-stock-critical hover:bg-stock-critical/20 flex items-center justify-center transition-colors"
                  >
                    <FiTrash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Panel derecho - Total y pago */}
      <div className="w-80 xl:w-96 min-w-[280px] bg-kiosko-card border-l border-kiosko-border flex flex-col shrink-0">
        {/* Indicador de caja */}
        {cashRegister && (
          <div className="px-4 py-2 bg-stock-ok/10 border-b border-stock-ok/30 flex items-center justify-between text-sm">
            <span className="text-stock-ok flex items-center gap-1">
              <span className="w-2 h-2 bg-stock-ok rounded-full animate-pulse"></span>
              Caja abierta
            </span>
            <span className="text-kiosko-muted">
              Ventas: {formatPrice(cashRegister.salesTotal)}
            </span>
          </div>
        )}
        
        {/* Resumen */}
        <div className="p-6 flex-1">
          <div className="space-y-4">
            <div className="flex justify-between text-lg">
              <span className="text-kiosko-muted">Productos</span>
              <span className="font-medium">{itemsCount}</span>
            </div>

            <div className="flex justify-between text-lg">
              <span className="text-kiosko-muted">Subtotal</span>
              <span className="font-medium font-price">{formatPrice(subtotal)}</span>
            </div>

            {discount > 0 && (
              <div className="flex justify-between text-lg text-stock-ok">
                <span>Descuento</span>
                <span className="font-medium font-price">
                  -{formatPrice(discount)}
                </span>
              </div>
            )}

            <div className="border-t border-kiosko-border pt-4">
              <div className="flex flex-col items-end">
                <span className="text-lg text-kiosko-muted">TOTAL</span>
                <span className="text-3xl xl:text-4xl font-extrabold text-primary-400 font-price">
                  {formatPrice(total)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="p-4 border-t border-kiosko-border space-y-3">
          <button
            onClick={() => setShowPayment(true)}
            disabled={items.length === 0}
            className="btn-pos w-full"
          >
            COBRAR (F2)
          </button>

          <button
            onClick={clearCart}
            disabled={items.length === 0}
            className="btn-secondary w-full"
          >
            Cancelar (F12)
          </button>
        </div>

        {/* Atajos de teclado */}
        <div className="p-3 border-t border-kiosko-border text-xs text-kiosko-muted">
          <div className="flex justify-between">
            <span>F2 Cobrar</span>
            <span>F4 Buscar</span>
            <span>F12 Cancelar</span>
          </div>
        </div>
      </div>

      {/* Modal de búsqueda */}
      {showSearch && (
        <div className="modal-overlay" onClick={() => setShowSearch(false)}>
          <div className="modal-content max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4">Buscar Producto</h2>

            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Buscar por nombre o código..."
              className="input mb-4"
              autoFocus
            />

            <div className="max-h-96 overflow-y-auto">
              {searchResults.length === 0 ? (
                <p className="text-center text-kiosko-muted py-8">
                  {searchQuery.length < 2
                    ? 'Escriba al menos 2 caracteres para buscar'
                    : 'No se encontraron productos'}
                </p>
              ) : (
                <div className="space-y-2">
                  {searchResults.map((product) => (
                    <button
                      key={product.id}
                      onClick={() => handleSelectProduct(product)}
                      className="w-full card flex items-center gap-4 hover:bg-kiosko-bg transition-colors text-left"
                    >
                      <div className="flex-1">
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-kiosko-muted">
                          {product.barcode}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg font-price">
                          {formatPrice(product.price)}
                        </p>
                        <p
                          className={`text-sm ${
                            product.stock <= product.minStock
                              ? 'text-stock-critical'
                              : 'text-kiosko-muted'
                          }`}
                        >
                          Stock: {product.stock}
                        </p>
                      </div>
                      <FiPlus className="text-primary-400" size={24} />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => setShowSearch(false)}
              className="btn-secondary w-full mt-4"
            >
              Cerrar (Esc)
            </button>
          </div>
        </div>
      )}

      {/* Modal de pago */}
      {showPayment && (
        <div className="modal-overlay" onClick={() => setShowPayment(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4">Método de Pago</h2>

            {/* Total a pagar */}
            <div className="text-center mb-6 p-4 bg-kiosko-bg rounded-xl">
              {paymentMethod === 'TRANSFER' && transferFees.totalFee > 0 ? (
                <>
                  <p className="text-kiosko-muted mb-1">Subtotal</p>
                  <p className="text-lg text-kiosko-muted font-price line-through">
                    {formatPrice(total)}
                  </p>
                  {transferFees.percentageFee > 0 && (
                    <p className="text-sm text-yellow-500 my-1">
                      + {transferFeePercent}% recargo: {formatPrice(transferFees.percentageFee)}
                    </p>
                  )}
                  {transferFees.cigaretteFee > 0 && (
                    <p className="text-sm text-orange-500 my-1">
                      + 🚬 Recargo cigarrillos ({cigaretteTransferFeePercent}%): {formatPrice(transferFees.cigaretteFee)}
                    </p>
                  )}
                  <p className="text-kiosko-muted mb-1 mt-2">Total con recargo</p>
                  <p className="text-total text-primary-400 font-price">
                    {formatPrice(finalTotal)}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-kiosko-muted mb-1">Total a pagar</p>
                  <p className="text-total text-primary-400 font-price">
                    {formatPrice(total)}
                  </p>
                </>
              )}
            </div>

            {/* Métodos de pago */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              {paymentMethods.map(({ method, icon: Icon, label }) => (
                <button
                  key={method}
                  onClick={() => {
                    setPaymentMethod(method);
                    if (method === 'CASH') {
                      setAmountPaid(total);
                    }
                    // Limpiar cliente si no es fiado
                    if (method !== 'FIADO') {
                      setSelectedCustomer(null);
                    }
                  }}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    paymentMethod === method
                      ? 'border-primary-500 bg-primary-500/20'
                      : 'border-kiosko-border hover:border-primary-500/50'
                  }`}
                >
                  <Icon size={24} className="mx-auto mb-2" />
                  <p className="text-sm font-medium">{label}</p>
                </button>
              ))}
            </div>

            {/* Selección de cliente (solo fiado) */}
            {paymentMethod === 'FIADO' && (
              <div className="mb-6 p-4 bg-kiosko-bg rounded-xl border border-kiosko-border">
                {selectedCustomer ? (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-kiosko-muted">Cliente</p>
                      <p className="font-bold text-lg">{selectedCustomer.name}</p>
                      {selectedCustomer.balance > 0 && (
                        <p className="text-sm text-stock-critical">
                          Deuda actual: ${selectedCustomer.balance.toFixed(0)}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => setShowCustomerModal(true)}
                      className="btn-secondary"
                    >
                      Cambiar
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowCustomerModal(true)}
                    className="w-full py-3 bg-primary-500/20 text-primary-400 rounded-lg border-2 border-dashed border-primary-500/50 hover:bg-primary-500/30 transition-colors flex items-center justify-center gap-2"
                  >
                    <FiUsers size={20} />
                    Seleccionar cliente para fiado
                  </button>
                )}
              </div>
            )}

            {/* Monto pagado (solo efectivo) */}
            {paymentMethod === 'CASH' && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-kiosko-muted mb-2">
                  Monto recibido
                </label>
                <input
                  ref={amountInputRef}
                  type="number"
                  value={amountPaid || ''}
                  onChange={(e) => setAmountPaid(Number(e.target.value))}
                  placeholder={formatPrice(total)}
                  className="input text-2xl text-center font-price"
                  min={0}
                  step={100}
                />

                {/* Botones de monto rápido */}
                <div className="grid grid-cols-5 gap-2 mt-3">
                  <button
                    onClick={() => setAmountPaid(total)}
                    className="py-2 rounded-lg bg-primary-500/20 border border-primary-500/50 hover:bg-primary-500/30 transition-colors text-sm text-primary-400 font-medium"
                  >
                    Exacto
                  </button>
                  {[100, 200, 500, 1000].map((amount) => (
                    <button
                      key={amount}
                      onClick={() => setAmountPaid(amountPaid + amount)}
                      className="py-2 rounded-lg bg-kiosko-bg border border-kiosko-border hover:bg-kiosko-border transition-colors text-sm"
                    >
                      +${amount}
                    </button>
                  ))}
                </div>

                {/* Vuelto */}
                {amountPaid >= total && (
                  <div className="mt-4 p-3 bg-stock-ok/10 border border-stock-ok/30 rounded-lg text-center">
                    <p className="text-kiosko-muted text-sm">Vuelto</p>
                    <p className="text-2xl font-bold text-stock-ok font-price">
                      {formatPrice(change)}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="mb-4 p-3 bg-stock-critical/10 border border-stock-critical/30 rounded-lg text-center text-stock-critical">
                {error}
              </div>
            )}

            {/* Botones */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowPayment(false)}
                className="btn-secondary flex-1"
              >
                Cancelar
              </button>
              <button
                onClick={handlePayment}
                disabled={
                  !paymentMethod ||
                  isProcessing ||
                  (paymentMethod === 'CASH' && amountPaid < total)
                }
                className="btn-pos flex-1"
              >
                {isProcessing ? 'Procesando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal agregar producto */}
      {showAddProduct && (
        <div className="modal-overlay" onClick={() => setShowAddProduct(false)}>
          <div className="modal-content max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4">Nuevo Producto</h2>

            <form onSubmit={handleSaveNewProduct} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-kiosko-muted mb-1">
                    Código de barras {!autoGenerateBarcodePOS && '*'}
                  </label>
                  <input
                    type="text"
                    value={newProductForm.barcode}
                    onChange={(e) =>
                      setNewProductForm((d) => ({ ...d, barcode: e.target.value }))
                    }
                    className={`input font-mono ${autoGenerateBarcodePOS ? 'opacity-50 bg-kiosko-bg' : ''}`}
                    required={!autoGenerateBarcodePOS}
                    disabled={autoGenerateBarcodePOS}
                    placeholder={autoGenerateBarcodePOS ? 'Se generará automáticamente' : 'Escanear o ingresar código'}
                  />
                  {/* Checkbox para generar código automático */}
                  <label className="flex items-center gap-2 mt-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={autoGenerateBarcodePOS}
                      onChange={(e) => {
                        setAutoGenerateBarcodePOS(e.target.checked);
                        if (e.target.checked) {
                          setNewProductForm((d) => ({ ...d, barcode: '' }));
                        }
                      }}
                      className="w-4 h-4 rounded border-kiosko-border text-primary-500 focus:ring-primary-500"
                    />
                    <span className="text-sm text-kiosko-muted">
                      Sin código de barras
                    </span>
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-kiosko-muted mb-1">
                    Categoría
                  </label>
                  <select
                    value={newProductForm.categoryId}
                    onChange={(e) =>
                      setNewProductForm((d) => ({ ...d, categoryId: e.target.value }))
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
                  value={newProductForm.name}
                  onChange={(e) =>
                    setNewProductForm((d) => ({ ...d, name: e.target.value }))
                  }
                  className="input"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-kiosko-muted mb-1">
                  Descripción
                </label>
                <input
                  type="text"
                  value={newProductForm.description}
                  onChange={(e) =>
                    setNewProductForm((d) => ({ ...d, description: e.target.value }))
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
                    value={newProductForm.price}
                    onChange={(e) =>
                      setNewProductForm((d) => ({ ...d, price: e.target.value }))
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
                    value={newProductForm.cost}
                    onChange={(e) =>
                      setNewProductForm((d) => ({ ...d, cost: e.target.value }))
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
                  id="isCigarettePOS"
                  checked={newProductForm.isCigarette}
                  onChange={(e) =>
                    setNewProductForm((d) => ({ ...d, isCigarette: e.target.checked }))
                  }
                  className="w-5 h-5 rounded border-kiosko-border text-primary-500 focus:ring-primary-500"
                />
                <label htmlFor="isCigarettePOS" className="text-sm font-medium cursor-pointer">
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
                    value={newProductForm.stock}
                    onChange={(e) =>
                      setNewProductForm((d) => ({ ...d, stock: e.target.value }))
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
                    value={newProductForm.minStock}
                    onChange={(e) =>
                      setNewProductForm((d) => ({ ...d, minStock: e.target.value }))
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
                    value={newProductForm.unitsPerBox}
                    onChange={(e) =>
                      setNewProductForm((d) => ({ ...d, unitsPerBox: e.target.value }))
                    }
                    className="input"
                    min="1"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddProduct(false)}
                  className="btn-secondary flex-1"
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary flex-1">
                  Guardar y agregar al carrito
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de selección de cliente (Fiado) */}
      {showCustomerModal && (
        <div className="modal-overlay" onClick={() => setShowCustomerModal(false)}>
          <div className="modal-content max-w-md" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <FiUsers className="text-primary-400" />
              Seleccionar Cliente
            </h2>

            {/* Búsqueda */}
            <div className="relative mb-4">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-kiosko-muted" />
              <input
                type="text"
                value={customerSearch}
                onChange={(e) => handleCustomerSearch(e.target.value)}
                placeholder="Buscar cliente por nombre..."
                className="input pl-10 w-full"
                autoFocus
              />
            </div>

            {/* Resultados de búsqueda */}
            {customerResults.length > 0 && (
              <div className="mb-4 max-h-48 overflow-y-auto space-y-2">
                {customerResults.map((customer) => (
                  <button
                    key={customer.id}
                    onClick={() => handleSelectCustomer(customer)}
                    className="w-full p-3 bg-kiosko-bg rounded-lg hover:bg-kiosko-border transition-colors text-left flex items-center justify-between"
                  >
                    <div>
                      <p className="font-medium">{customer.name}</p>
                      {customer.phone && (
                        <p className="text-sm text-kiosko-muted">{customer.phone}</p>
                      )}
                    </div>
                    {customer.balance > 0 && (
                      <span className="text-stock-critical font-bold">
                        Debe: ${customer.balance.toFixed(0)}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Sin resultados */}
            {customerSearch.length >= 2 && customerResults.length === 0 && (
              <p className="text-center text-kiosko-muted mb-4">
                No se encontraron clientes
              </p>
            )}

            {/* Crear cliente nuevo */}
            <div className="border-t border-kiosko-border pt-4">
              <p className="text-sm text-kiosko-muted mb-2">¿Cliente nuevo?</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  placeholder="Nombre del cliente"
                  className="input flex-1"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleCreateCustomer();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={handleCreateCustomer}
                  disabled={!newCustomerName.trim() || isCreatingCustomer}
                  className="btn-primary px-4"
                >
                  {isCreatingCustomer ? '...' : 'Crear'}
                </button>
              </div>
            </div>

            <div className="flex gap-3 pt-4 mt-4 border-t border-kiosko-border">
              <button
                onClick={() => setShowCustomerModal(false)}
                className="btn-secondary flex-1"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mensaje de éxito */}
      {saleSuccess && (
        <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
          <div className="bg-stock-ok text-white px-12 py-8 rounded-2xl shadow-2xl animate-enter">
            <FiCheck size={64} className="mx-auto mb-4" />
            <p className="text-2xl font-bold">¡Venta completada!</p>
          </div>
        </div>
      )}
    </div>
  );
}
