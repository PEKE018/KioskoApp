import { useEffect, useState } from 'react';
import {
  FiUsers,
  FiDollarSign,
  FiPlus,
  FiSearch,
  FiCheck,
  FiX,
  FiChevronRight,
  FiPhone,
  FiFileText,
} from 'react-icons/fi';

interface Customer {
  id: string;
  name: string;
  phone?: string;
  notes?: string;
  balance: number;
  createdAt: string;
  _count?: {
    sales: number;
    payments: number;
  };
}

interface Sale {
  id: string;
  total: number;
  createdAt: string;
  items: {
    quantity: number;
    product: { name: string };
  }[];
}

interface Payment {
  id: string;
  amount: number;
  notes?: string;
  createdAt: string;
}

interface CustomerDetail extends Customer {
  sales: Sale[];
  payments: Payment[];
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDetail | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form states
  const [newCustomerForm, setNewCustomerForm] = useState({
    name: '',
    phone: '',
    notes: '',
  });
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');

  // Cargar clientes
  const loadCustomers = async () => {
    setIsLoading(true);
    try {
      const result = await (window as any).api.customers.getAll() as { success: boolean; data: Customer[] };
      if (result.success) {
        setCustomers(result.data);
      }
    } catch (error) {
      console.error('Error cargando clientes:', error);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  // Limpiar mensaje
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  // Filtrar clientes
  const filteredCustomers = customers.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone?.includes(searchQuery)
  );

  // Clientes con deuda
  const customersWithDebt = filteredCustomers.filter((c) => c.balance > 0);
  const totalDebt = customersWithDebt.reduce((sum, c) => sum + c.balance, 0);

  // Crear cliente
  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerForm.name.trim()) return;

    try {
      const result = await (window as any).api.customers.create(newCustomerForm) as { success: boolean; data: Customer };
      if (result.success) {
        setMessage({ type: 'success', text: `Cliente "${result.data.name}" creado` });
        setShowNewModal(false);
        setNewCustomerForm({ name: '', phone: '', notes: '' });
        loadCustomers();
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al crear cliente' });
    }
  };

  // Ver detalle de cliente
  const handleViewCustomer = async (customerId: string) => {
    try {
      const result = await (window as any).api.customers.getById(customerId) as { success: boolean; data: CustomerDetail };
      if (result.success) {
        setSelectedCustomer(result.data);
        setShowDetailModal(true);
      }
    } catch (error) {
      console.error('Error cargando cliente:', error);
    }
  };

  // Registrar pago
  const handleRegisterPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || !paymentAmount) return;

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      setMessage({ type: 'error', text: 'Ingrese un monto válido' });
      return;
    }

    try {
      const result = await (window as any).api.customers.registerPayment({
        customerId: selectedCustomer.id,
        amount,
        notes: paymentNotes,
      }) as { success: boolean };

      if (result.success) {
        setMessage({ type: 'success', text: `Pago de $${amount.toFixed(0)} registrado` });
        setShowPaymentModal(false);
        setPaymentAmount('');
        setPaymentNotes('');
        // Refrescar datos
        handleViewCustomer(selectedCustomer.id);
        loadCustomers();
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al registrar pago' });
    }
  };

  // Eliminar cliente
  const handleDeleteCustomer = async (customerId: string, customerName: string) => {
    if (!confirm(`¿Estás seguro de eliminar al cliente "${customerName}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      const result = await (window as any).api.customers.delete(customerId) as { success: boolean; error?: string };

      if (result.success) {
        setMessage({ type: 'success', text: `Cliente "${customerName}" eliminado` });
        setShowDetailModal(false);
        setSelectedCustomer(null);
        loadCustomers();
      } else {
        setMessage({ type: 'error', text: result.error || 'Error al eliminar cliente' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al eliminar cliente' });
    }
  };

  // Formato de precio
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
    }).format(price);
  };

  // Formato de fecha
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="h-full flex flex-col p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FiUsers className="text-primary-400" />
            Clientes (Fiado)
          </h1>
          <p className="text-app-muted">
            {customersWithDebt.length} clientes con deuda • Total: {formatPrice(totalDebt)}
          </p>
        </div>

        <button onClick={() => setShowNewModal(true)} className="btn-primary flex items-center gap-2">
          <FiPlus size={20} />
          Nuevo Cliente
        </button>
      </div>

      {/* Mensaje */}
      {message && (
        <div
          className={`mb-4 p-4 rounded-lg flex items-center gap-3 ${
            message.type === 'success'
              ? 'bg-stock-ok/20 text-stock-ok border border-stock-ok/30'
              : 'bg-stock-critical/20 text-stock-critical border border-stock-critical/30'
          }`}
        >
          {message.type === 'success' ? <FiCheck size={20} /> : <FiX size={20} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Búsqueda */}
      <div className="relative max-w-md mb-6">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-app-muted" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar cliente..."
          className="input pl-10 w-full"
        />
      </div>

      {/* Lista de clientes */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-app-muted">Cargando...</p>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-app-muted">
            <FiUsers size={48} className="mb-4 opacity-50" />
            <p>No hay clientes registrados</p>
            <button onClick={() => setShowNewModal(true)} className="btn-primary mt-4">
              Crear primer cliente
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCustomers.map((customer) => (
              <div
                key={customer.id}
                onClick={() => handleViewCustomer(customer.id)}
                className={`card cursor-pointer hover:scale-[1.02] transition-transform ${
                  customer.balance > 0 ? 'border-l-4 border-l-stock-critical' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-lg truncate">{customer.name}</p>
                    {customer.phone && (
                      <p className="text-sm text-app-muted flex items-center gap-1">
                        <FiPhone size={14} />
                        {customer.phone}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    {customer.balance > 0 ? (
                      <>
                        <p className="text-sm text-app-muted">Debe</p>
                        <p className="text-xl font-bold text-stock-critical">
                          {formatPrice(customer.balance)}
                        </p>
                      </>
                    ) : (
                      <p className="text-stock-ok font-medium">Al día</p>
                    )}
                  </div>
                  <FiChevronRight className="text-app-muted ml-2" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal nuevo cliente */}
      {showNewModal && (
        <div className="modal-overlay" onClick={() => setShowNewModal(false)}>
          <div className="modal-content max-w-md" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4">Nuevo Cliente</h2>

            <form onSubmit={handleCreateCustomer} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-app-muted mb-1">
                  Nombre *
                </label>
                <input
                  type="text"
                  value={newCustomerForm.name}
                  onChange={(e) => setNewCustomerForm({ ...newCustomerForm, name: e.target.value })}
                  className="input w-full"
                  placeholder="Nombre del cliente"
                  autoFocus
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-app-muted mb-1">
                  Teléfono
                </label>
                <input
                  type="tel"
                  value={newCustomerForm.phone}
                  onChange={(e) => setNewCustomerForm({ ...newCustomerForm, phone: e.target.value })}
                  className="input w-full"
                  placeholder="Opcional"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-app-muted mb-1">
                  Notas
                </label>
                <textarea
                  value={newCustomerForm.notes}
                  onChange={(e) => setNewCustomerForm({ ...newCustomerForm, notes: e.target.value })}
                  className="input w-full"
                  placeholder="Comentarios adicionales"
                  rows={2}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="btn-secondary flex-1"
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary flex-1">
                  Crear Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal detalle de cliente */}
      {showDetailModal && selectedCustomer && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal-content max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Header cliente */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold">{selectedCustomer.name}</h2>
                {selectedCustomer.phone && (
                  <p className="text-app-muted flex items-center gap-1">
                    <FiPhone size={14} />
                    {selectedCustomer.phone}
                  </p>
                )}
                {selectedCustomer.notes && (
                  <p className="text-sm text-app-muted mt-1">{selectedCustomer.notes}</p>
                )}
              </div>
              <div className="text-right">
                {selectedCustomer.balance > 0 ? (
                  <>
                    <p className="text-sm text-app-muted">Saldo pendiente</p>
                    <p className="text-3xl font-bold text-stock-critical">
                      {formatPrice(selectedCustomer.balance)}
                    </p>
                    <button
                      onClick={() => setShowPaymentModal(true)}
                      className="btn-success mt-2 flex items-center gap-2"
                    >
                      <FiDollarSign />
                      Registrar Pago
                    </button>
                  </>
                ) : (
                  <p className="text-xl font-bold text-stock-ok">Sin deuda</p>
                )}
              </div>
            </div>

            {/* Historial */}
            <div className="grid grid-cols-2 gap-6">
              {/* Ventas fiadas */}
              <div>
                <h3 className="font-bold mb-3 flex items-center gap-2">
                  <FiFileText className="text-stock-critical" />
                  Ventas Fiadas
                </h3>
                {selectedCustomer.sales.length === 0 ? (
                  <p className="text-app-muted text-sm">Sin ventas fiadas</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {selectedCustomer.sales.map((sale) => (
                      <div key={sale.id} className="p-3 bg-app-bg rounded-lg border border-stock-critical/20">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-sm text-app-muted">{formatDate(sale.createdAt)}</p>
                            <p className="text-xs text-app-muted">
                              {sale.items.map((i) => `${i.quantity}x ${i.product.name}`).join(', ')}
                            </p>
                          </div>
                          <p className="font-bold text-stock-critical">
                            +{formatPrice(sale.total)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Pagos */}
              <div>
                <h3 className="font-bold mb-3 flex items-center gap-2">
                  <FiDollarSign className="text-stock-ok" />
                  Pagos Recibidos
                </h3>
                {selectedCustomer.payments.length === 0 ? (
                  <p className="text-app-muted text-sm">Sin pagos registrados</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {selectedCustomer.payments.map((payment) => (
                      <div key={payment.id} className="p-3 bg-app-bg rounded-lg border border-stock-ok/20">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-sm text-app-muted">{formatDate(payment.createdAt)}</p>
                            {payment.notes && (
                              <p className="text-xs text-app-muted">{payment.notes}</p>
                            )}
                          </div>
                          <p className="font-bold text-stock-ok">
                            -{formatPrice(payment.amount)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 pt-6 mt-6 border-t border-app-border">
              <button
                onClick={() => handleDeleteCustomer(selectedCustomer.id, selectedCustomer.name)}
                className="btn-secondary text-stock-critical hover:bg-stock-critical/20 flex items-center gap-2"
              >
                <FiX size={18} />
                Eliminar
              </button>
              <button
                onClick={() => setShowDetailModal(false)}
                className="btn-secondary flex-1"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal registrar pago */}
      {showPaymentModal && selectedCustomer && (
        <div className="modal-overlay" onClick={() => setShowPaymentModal(false)}>
          <div className="modal-content max-w-md" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4">Registrar Pago</h2>
            
            <div className="p-4 bg-app-bg rounded-lg mb-4">
              <p className="text-app-muted">Cliente</p>
              <p className="font-bold text-lg">{selectedCustomer.name}</p>
              <p className="text-app-muted mt-2">Deuda actual</p>
              <p className="text-2xl font-bold text-stock-critical">
                {formatPrice(selectedCustomer.balance)}
              </p>
            </div>

            <form onSubmit={handleRegisterPayment} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-app-muted mb-1">
                  Monto del pago *
                </label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="input w-full text-2xl font-bold text-center"
                  placeholder="0"
                  step="0.01"
                  min="0.01"
                  autoFocus
                  required
                />
                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setPaymentAmount((selectedCustomer.balance / 2).toFixed(0))}
                    className="btn-secondary flex-1 text-sm"
                  >
                    50%
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentAmount(selectedCustomer.balance.toFixed(0))}
                    className="btn-secondary flex-1 text-sm"
                  >
                    Total
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-app-muted mb-1">
                  Notas (opcional)
                </label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="input w-full"
                  placeholder="Ej: Pago parcial, efectivo..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="btn-secondary flex-1"
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-success flex-1">
                  Confirmar Pago
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
