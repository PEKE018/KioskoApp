import { useEffect, useMemo, useState } from 'react';
import {
  FiAlertCircle,
  FiCalendar,
  FiCheck,
  FiChevronRight,
  FiClock,
  FiDollarSign,
  FiTrendingDown,
  FiTrendingUp,
  FiUser,
  FiX,
} from 'react-icons/fi';

interface SeparateCashProduct {
  productId: string;
  productName: string;
  quantity: number;
  total: number;
  paymentMethod: string;
}

const paymentMethodLabels: Record<string, string> = {
  CASH: 'Efectivo',
  DEBIT: 'Debito',
  CREDIT: 'Credito',
  MIXED: 'Mixto',
  TRANSFER: 'Transferencia',
  FIADO: 'Fiado',
  OTHER: 'Otro',
};

interface CashRegister {
  id: string;
  status: string;
  initialAmount: number;
  finalAmount: number | null;
  salesTotal: number;
  difference: number | null;
  notes: string | null;
  openedAt: string;
  closedAt: string | null;
  user: { name: string };
  separateCashTotal?: number;
  separateCashProducts?: SeparateCashProduct[];
  generalCashTotal?: number;
}

interface CashRegisterResult {
  success: boolean;
  data?: CashRegister | null;
  error?: string;
}

export default function CashRegisterPage() {
  const [currentCash, setCurrentCash] = useState<CashRegister | null>(null);
  const [history, setHistory] = useState<CashRegister[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showRepairOption, setShowRepairOption] = useState(false);
  const [detailCash, setDetailCash] = useState<CashRegister | null>(null);
  const [detailTitle, setDetailTitle] = useState('');
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [openAmount, setOpenAmount] = useState('');
  const [closeAmount, setCloseAmount] = useState('');
  const [closeNotes, setCloseNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!success) {
      return;
    }

    const timer = setTimeout(() => setSuccess(null), 3000);
    return () => clearTimeout(timer);
  }, [success]);

  const previewSeparateCashProducts = useMemo(
    () => currentCash?.separateCashProducts?.slice(0, 5) || [],
    [currentCash]
  );

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [currentResult, historyResult] = await Promise.all([
        window.api.cashRegister.getCurrent() as Promise<CashRegisterResult>,
        window.api.cashRegister.getHistory() as Promise<{ success: boolean; data?: CashRegister[] }>,
      ]);

      if (currentResult.success) {
        setCurrentCash(currentResult.data || null);
      }

      if (historyResult.success && historyResult.data) {
        setHistory(historyResult.data);
      }
    } catch (loadError) {
      console.error('Error loading cash register data:', loadError);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpen = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const amount = parseFloat(openAmount);
    if (isNaN(amount) || amount < 0) {
      setError('Ingrese un monto valido');
      return;
    }

    try {
      const result = await window.api.cashRegister.open(amount) as CashRegisterResult;

      if (result.success) {
        setCurrentCash(result.data || null);
        setShowOpenModal(false);
        setOpenAmount('');
        setSuccess('Caja abierta correctamente');
        setShowRepairOption(false);
        loadData();
        return;
      }

      if (result.error?.includes('Ya hay una caja abierta')) {
        const currentResult = await window.api.cashRegister.getCurrent() as CashRegisterResult;

        if (currentResult.success && currentResult.data) {
          setCurrentCash(currentResult.data);
          setShowOpenModal(false);
          setOpenAmount('');
          setSuccess('Se recupero la caja abierta actual.');
          setShowRepairOption(false);
          return;
        }

        setError('Hay una caja abierta que no se muestra correctamente.');
        setShowRepairOption(true);
        return;
      }

      setError(result.error || 'Error al abrir caja');
      setShowRepairOption(false);
    } catch {
      setError('Error de conexion');
    }
  };

  const handleClose = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const amount = parseFloat(closeAmount);
    if (isNaN(amount) || amount < 0) {
      setError('Ingrese un monto valido');
      return;
    }

    try {
      const result = await window.api.cashRegister.close(amount, closeNotes) as CashRegisterResult;

      if (result.success) {
        setCurrentCash(null);
        setShowCloseModal(false);
        setCloseAmount('');
        setCloseNotes('');
        setSuccess('Caja cerrada correctamente');
        loadData();
        return;
      }

      setError(result.error || 'Error al cerrar caja');
    } catch {
      setError('Error de conexion');
    }
  };

  const handleRepair = async () => {
    setError(null);
    try {
      const result = await window.api.cashRegister.forceClose() as { success: boolean; error?: string };

      if (result.success) {
        setShowRepairOption(false);
        setSuccess('Caja reparada correctamente. Ahora puede abrir una nueva caja.');
        loadData();
        return;
      }

      setError(result.error || 'Error al reparar caja');
    } catch {
      setError('Error de conexion');
    }
  };

  const openCurrentSeparateCashDetail = () => {
    if (!currentCash) {
      return;
    }

    setDetailTitle('Detalle de Caja Aparte');
    setDetailCash(currentCash);
  };

  const openHistoryDetail = async (cashRegisterId: string) => {
    setIsLoadingDetail(true);
    setDetailTitle('Detalle de Caja');

    try {
      const result = await window.api.cashRegister.getById(cashRegisterId) as CashRegisterResult;
      if (result.success && result.data) {
        setDetailCash(result.data);
      } else {
        setError(result.error || 'No se pudo cargar el detalle de la caja');
      }
    } catch {
      setError('Error de conexion');
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const closeDetailModal = () => {
    setDetailCash(null);
    setDetailTitle('');
    setIsLoadingDetail(false);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
    }).format(price);
  };

  const formatQuantity = (quantity: number) => {
    return Number.isInteger(quantity) ? quantity.toString() : quantity.toFixed(2);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderSeparateCashTable = (products: SeparateCashProduct[]) => {
    if (products.length === 0) {
      return (
        <div className="rounded-lg border border-app-border bg-app-bg p-4 text-sm text-app-muted">
          No hay productos de caja aparte para mostrar.
        </div>
      );
    }

    return (
      <div className="overflow-x-auto rounded-lg border border-app-border">
        <table className="table min-w-[640px]">
          <thead>
            <tr>
              <th>Producto</th>
              <th>Cantidad</th>
              <th>Medio de pago</th>
              <th className="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product, index) => (
              <tr key={`${product.productId}-${product.paymentMethod}-${index}`}>
                <td>{product.productName}</td>
                <td>{formatQuantity(product.quantity)}</td>
                <td>
                  <span className="inline-flex rounded-full bg-app-primary/20 px-2 py-1 text-xs text-app-primary">
                    {paymentMethodLabels[product.paymentMethod] || product.paymentMethod}
                  </span>
                </td>
                <td className="text-right font-price">{formatPrice(product.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-app-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden p-4 sm:p-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-bold">
            <FiDollarSign className="text-app-primary" />
            Caja Registradora
          </h1>
          <p className="mt-1 text-app-muted">Control de fondo de caja y cierre diario</p>
        </div>
      </div>

      {success && (
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-stock-ok/30 bg-stock-ok/10 p-3 animate-enter">
          <FiCheck className="text-xl text-stock-ok" />
          <p className="text-stock-ok">{success}</p>
        </div>
      )}

      <div className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="card">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <FiClock className="text-app-primary" />
            Estado Actual
          </h2>

          {currentCash ? (
            <div className="space-y-4">
              <div className="flex flex-col gap-2 rounded-lg border border-stock-ok/30 bg-stock-ok/10 p-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="font-medium text-stock-ok">CAJA ABIERTA</span>
                <span className="text-sm text-app-muted">Desde {formatTime(currentCash.openedAt)}</span>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-lg bg-app-bg p-4">
                  <p className="text-sm text-app-muted">Fondo de Caja</p>
                  <p className="text-xl font-bold font-price">{formatPrice(currentCash.initialAmount)}</p>
                </div>
                <div className="rounded-lg bg-app-bg p-4">
                  <p className="text-sm text-app-muted">En Caja</p>
                  <p className="text-xl font-bold font-price text-stock-ok">{formatPrice(currentCash.salesTotal)}</p>
                </div>
              </div>

              {currentCash.separateCashTotal && currentCash.separateCashTotal > 0 && (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-600/10 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium text-emerald-400">Caja Aparte</p>
                      <p className="text-sm text-emerald-200/80">
                        {currentCash.separateCashProducts?.length || 0} productos registrados
                      </p>
                    </div>
                    <p className="text-xl font-bold font-price text-emerald-400">
                      {formatPrice(currentCash.separateCashTotal)}
                    </p>
                  </div>

                  <div className="mt-4 space-y-2">
                    {previewSeparateCashProducts.map((product, index) => (
                      <div
                        key={`${product.productId}-${product.paymentMethod}-${index}`}
                        className="flex flex-col gap-2 rounded-lg bg-app-bg/70 p-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{product.productName}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-app-muted">
                            <span>x{formatQuantity(product.quantity)}</span>
                            <span className="rounded-full bg-app-primary/20 px-2 py-0.5 text-xs text-app-primary">
                              {paymentMethodLabels[product.paymentMethod] || product.paymentMethod}
                            </span>
                          </div>
                        </div>
                        <span className="font-price text-emerald-400">{formatPrice(product.total)}</span>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={openCurrentSeparateCashDetail}
                    className="mt-4 inline-flex items-center gap-2 rounded-lg border border-emerald-400/30 px-4 py-2 text-sm font-medium text-emerald-300 transition-colors hover:bg-emerald-500/10"
                  >
                    Ver todos
                    <FiChevronRight size={16} />
                  </button>
                </div>
              )}

              <div className="rounded-lg bg-app-bg p-4">
                <p className="text-sm text-app-muted">Caja General</p>
                <p className="text-xl font-bold font-price">
                  {formatPrice(currentCash.generalCashTotal ?? currentCash.salesTotal)}
                </p>
              </div>

              <div className="rounded-lg border border-app-primary/30 bg-app-primary/10 p-4">
                <p className="text-sm text-app-muted">Total Esperado en Caja</p>
                <p className="text-2xl font-bold font-price text-app-primary">
                  {formatPrice(currentCash.initialAmount + (currentCash.generalCashTotal ?? currentCash.salesTotal))}
                </p>
              </div>

              <div className="flex items-center gap-2 text-sm text-app-muted">
                <FiUser size={14} />
                <span>Abierta por: {currentCash.user.name}</span>
              </div>

              <button
                onClick={() => {
                  const generalCash = currentCash.generalCashTotal ?? currentCash.salesTotal;
                  setCloseAmount((currentCash.initialAmount + generalCash).toString());
                  setShowCloseModal(true);
                }}
                className="w-full btn-pos bg-stock-critical hover:bg-stock-critical/90"
              >
                Cerrar Caja
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border border-app-border bg-app-bg p-3">
                <span className="text-app-muted">CAJA CERRADA</span>
              </div>

              <div className="py-8 text-center">
                <FiDollarSign size={48} className="mx-auto mb-4 opacity-50 text-app-muted" />
                <p className="mb-4 text-app-muted">No hay caja abierta actualmente</p>
                <button onClick={() => setShowOpenModal(true)} className="btn-pos">
                  Abrir Caja
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <FiCalendar className="text-app-primary" />
            Resumen del Dia
          </h2>

          {history.length > 0 && history[0].closedAt && new Date(history[0].closedAt).toDateString() === new Date().toDateString() ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-lg bg-app-bg p-4">
                  <p className="text-sm text-app-muted">Ultimo Cierre</p>
                  <p className="text-lg font-bold">{formatTime(history[0].closedAt)}</p>
                </div>
                <div className="rounded-lg bg-app-bg p-4">
                  <p className="text-sm text-app-muted">En Caja del Turno</p>
                  <p className="text-lg font-bold font-price text-stock-ok">{formatPrice(history[0].salesTotal)}</p>
                </div>
              </div>

              {history[0].difference !== null && (
                <div className={`rounded-lg p-4 ${
                  history[0].difference === 0
                    ? 'border border-stock-ok/30 bg-stock-ok/10'
                    : history[0].difference > 0
                      ? 'border border-blue-500/30 bg-blue-500/10'
                      : 'border border-stock-critical/30 bg-stock-critical/10'
                }`}>
                  <div className="flex items-center gap-2">
                    {history[0].difference === 0 ? (
                      <FiCheck className="text-stock-ok" />
                    ) : history[0].difference > 0 ? (
                      <FiTrendingUp className="text-blue-500" />
                    ) : (
                      <FiTrendingDown className="text-stock-critical" />
                    )}
                    <span className="text-sm text-app-muted">Diferencia</span>
                  </div>
                  <p className={`text-xl font-bold font-price ${
                    history[0].difference === 0
                      ? 'text-stock-ok'
                      : history[0].difference > 0
                        ? 'text-blue-500'
                        : 'text-stock-critical'
                  }`}>
                    {history[0].difference >= 0 ? '+' : ''}{formatPrice(history[0].difference)}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="py-8 text-center text-app-muted">
              <FiCalendar size={48} className="mx-auto mb-4 opacity-50" />
              <p>No hay cierres de caja hoy</p>
            </div>
          )}
        </div>
      </div>

      <div className="card flex flex-1 flex-col overflow-hidden">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <FiClock className="text-app-primary" />
          Historial de Cajas
        </h2>

        <div className="flex-1 overflow-y-auto">
          {history.length === 0 ? (
            <div className="py-8 text-center text-app-muted">
              <p>No hay historial de cajas</p>
            </div>
          ) : (
            <div className="space-y-2">
              {history.map((cash) => (
                <button
                  key={cash.id}
                  type="button"
                  onClick={() => openHistoryDetail(cash.id)}
                  className="flex w-full flex-col gap-4 rounded-lg bg-app-bg p-4 text-left transition-colors hover:bg-app-border/40 sm:flex-row sm:items-center"
                >
                  <div className={`h-3 w-3 rounded-full ${cash.status === 'OPEN' ? 'bg-stock-ok' : 'bg-app-muted'}`} />

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{formatDate(cash.openedAt)}</span>
                      {cash.closedAt && (
                        <>
                          <span className="text-app-muted">→</span>
                          <span>{formatTime(cash.closedAt)}</span>
                        </>
                      )}
                    </div>
                    <p className="text-sm text-app-muted">{cash.user.name}</p>
                  </div>

                  <div className="text-left sm:text-right">
                    <p className="font-bold font-price">{formatPrice(cash.salesTotal)}</p>
                    <p className="text-sm text-app-muted">en caja</p>
                  </div>

                  {cash.difference !== null && (
                    <div className={`rounded-full px-3 py-1 text-sm font-medium ${
                      cash.difference === 0
                        ? 'bg-stock-ok/20 text-stock-ok'
                        : cash.difference > 0
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'bg-stock-critical/20 text-stock-critical'
                    }`}>
                      {cash.difference >= 0 ? '+' : ''}{formatPrice(cash.difference)}
                    </div>
                  )}

                  {cash.status === 'OPEN' && (
                    <span className="rounded-full bg-stock-ok/20 px-3 py-1 text-sm font-medium text-stock-ok">
                      ABIERTA
                    </span>
                  )}

                  <FiChevronRight className="hidden text-app-muted sm:block" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {showOpenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-app-border bg-app-card p-6 shadow-2xl animate-enter">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-xl font-bold">
                <FiDollarSign className="text-app-primary" />
                Abrir Caja
              </h3>
              <button
                onClick={() => {
                  setShowOpenModal(false);
                  setError(null);
                }}
                className="rounded-lg p-2 transition-colors hover:bg-app-border"
              >
                <FiX size={20} />
              </button>
            </div>

            <form onSubmit={handleOpen} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm text-app-muted">Fondo de caja (cambio para vueltos)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-app-muted">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={openAmount}
                    onChange={(event) => setOpenAmount(event.target.value)}
                    className="w-full rounded-lg border border-app-border bg-app-bg py-3 pl-8 pr-4 text-xl font-price focus:outline-none focus:ring-2 focus:ring-app-primary"
                    placeholder="0.00"
                    autoFocus
                  />
                </div>
                <p className="mt-2 text-xs text-app-muted">Dinero disponible para dar vuelto a los clientes</p>
              </div>

              {error && (
                <div className="rounded-lg border border-stock-critical/30 bg-stock-critical/10 p-3">
                  <div className="flex items-center gap-2 text-stock-critical">
                    <FiAlertCircle />
                    <span>{error}</span>
                  </div>
                  {showRepairOption && (
                    <button
                      type="button"
                      onClick={handleRepair}
                      className="mt-3 w-full rounded-lg bg-stock-warning px-4 py-2 font-medium text-white transition-colors hover:bg-stock-warning/80"
                    >
                      Reparar Caja
                    </button>
                  )}
                </div>
              )}

              <div className="flex flex-col gap-3 pt-4 sm:flex-row">
                <button
                  type="button"
                  onClick={() => {
                    setShowOpenModal(false);
                    setError(null);
                  }}
                  className="btn-secondary flex-1"
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-pos flex-1">
                  Abrir Caja
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCloseModal && currentCash && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-app-border bg-app-card p-6 shadow-2xl animate-enter">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-xl font-bold">
                <FiDollarSign className="text-stock-critical" />
                Cerrar Caja
              </h3>
              <button
                onClick={() => {
                  setShowCloseModal(false);
                  setError(null);
                }}
                className="rounded-lg p-2 transition-colors hover:bg-app-border"
              >
                <FiX size={20} />
              </button>
            </div>

            <form onSubmit={handleClose} className="space-y-4">
              <div className="space-y-2 rounded-lg bg-app-bg p-4">
                <div className="flex justify-between gap-3">
                  <span className="text-app-muted">Fondo de caja:</span>
                  <span className="font-price">{formatPrice(currentCash.initialAmount)}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-app-muted">Monto en caja:</span>
                  <span className="font-price text-stock-ok">{formatPrice(currentCash.generalCashTotal ?? currentCash.salesTotal)}</span>
                </div>
                <div className="flex justify-between gap-3 border-t border-app-border pt-2 font-bold">
                  <span>Total esperado:</span>
                  <span className="font-price text-app-primary">
                    {formatPrice(currentCash.initialAmount + (currentCash.generalCashTotal ?? currentCash.salesTotal))}
                  </span>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm text-app-muted">Monto real en caja</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-app-muted">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={closeAmount}
                    onChange={(event) => setCloseAmount(event.target.value)}
                    className="w-full rounded-lg border border-app-border bg-app-bg py-3 pl-8 pr-4 text-xl font-price focus:outline-none focus:ring-2 focus:ring-app-primary"
                    placeholder="0.00"
                    autoFocus
                  />
                </div>
              </div>

              {closeAmount && (
                <div className={`rounded-lg p-3 ${
                  parseFloat(closeAmount) === currentCash.initialAmount + (currentCash.generalCashTotal ?? currentCash.salesTotal)
                    ? 'border border-stock-ok/30 bg-stock-ok/10'
                    : parseFloat(closeAmount) > currentCash.initialAmount + (currentCash.generalCashTotal ?? currentCash.salesTotal)
                      ? 'border border-blue-500/30 bg-blue-500/10'
                      : 'border border-stock-critical/30 bg-stock-critical/10'
                }`}>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-app-muted">Diferencia:</span>
                    <span className={`font-bold font-price ${
                      parseFloat(closeAmount) === currentCash.initialAmount + (currentCash.generalCashTotal ?? currentCash.salesTotal)
                        ? 'text-stock-ok'
                        : parseFloat(closeAmount) > currentCash.initialAmount + (currentCash.generalCashTotal ?? currentCash.salesTotal)
                          ? 'text-blue-500'
                          : 'text-stock-critical'
                    }`}>
                      {parseFloat(closeAmount) - (currentCash.initialAmount + (currentCash.generalCashTotal ?? currentCash.salesTotal)) >= 0 ? '+' : ''}
                      {formatPrice(parseFloat(closeAmount) - (currentCash.initialAmount + (currentCash.generalCashTotal ?? currentCash.salesTotal)))}
                    </span>
                  </div>
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm text-app-muted">Notas (opcional)</label>
                <textarea
                  value={closeNotes}
                  onChange={(event) => setCloseNotes(event.target.value)}
                  className="w-full resize-none rounded-lg border border-app-border bg-app-bg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-app-primary"
                  rows={3}
                  placeholder="Observaciones del cierre..."
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-lg border border-stock-critical/30 bg-stock-critical/10 p-3 text-stock-critical">
                  <FiAlertCircle />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex flex-col gap-3 pt-4 sm:flex-row">
                <button
                  type="button"
                  onClick={() => {
                    setShowCloseModal(false);
                    setError(null);
                  }}
                  className="btn-secondary flex-1"
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-pos flex-1 bg-stock-critical hover:bg-stock-critical/90">
                  Cerrar Caja
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {(detailCash || isLoadingDetail) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-2xl border border-app-border bg-app-card p-6 shadow-2xl animate-enter">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold">{detailTitle}</h3>
                {detailCash && <p className="text-sm text-app-muted">Caja del {formatDate(detailCash.openedAt)}</p>}
              </div>
              <button onClick={closeDetailModal} className="rounded-lg p-2 transition-colors hover:bg-app-border">
                <FiX size={20} />
              </button>
            </div>

            {isLoadingDetail ? (
              <div className="flex flex-1 items-center justify-center py-12">
                <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-t-2 border-app-primary"></div>
              </div>
            ) : detailCash ? (
              <div className="flex-1 space-y-6 overflow-y-auto pr-1">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-lg bg-app-bg p-4">
                    <p className="text-sm text-app-muted">Fondo inicial</p>
                    <p className="text-lg font-bold font-price">{formatPrice(detailCash.initialAmount)}</p>
                  </div>
                  <div className="rounded-lg bg-app-bg p-4">
                    <p className="text-sm text-app-muted">Monto en caja</p>
                    <p className="text-lg font-bold font-price text-stock-ok">{formatPrice(detailCash.salesTotal)}</p>
                  </div>
                  <div className="rounded-lg bg-app-bg p-4">
                    <p className="text-sm text-app-muted">Caja aparte</p>
                    <p className="text-lg font-bold font-price text-emerald-400">{formatPrice(detailCash.separateCashTotal || 0)}</p>
                  </div>
                  <div className="rounded-lg bg-app-bg p-4">
                    <p className="text-sm text-app-muted">Diferencia</p>
                    <p className="text-lg font-bold font-price">{formatPrice(detailCash.difference || 0)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <div className="rounded-lg bg-app-bg p-4">
                    <p className="text-sm text-app-muted">Abierta por</p>
                    <p className="font-medium">{detailCash.user.name}</p>
                    <p className="mt-3 text-sm text-app-muted">Apertura</p>
                    <p>{formatDate(detailCash.openedAt)}</p>
                    {detailCash.closedAt && (
                      <>
                        <p className="mt-3 text-sm text-app-muted">Cierre</p>
                        <p>{formatDate(detailCash.closedAt)}</p>
                      </>
                    )}
                  </div>

                  <div className="rounded-lg bg-app-bg p-4">
                    <p className="text-sm text-app-muted">Resumen</p>
                    <div className="mt-3 space-y-2 text-sm">
                      <div className="flex justify-between gap-4">
                        <span className="text-app-muted">Estado</span>
                        <span>{detailCash.status === 'OPEN' ? 'Abierta' : 'Cerrada'}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-app-muted">Caja general</span>
                        <span className="font-price">{formatPrice(detailCash.generalCashTotal ?? detailCash.salesTotal)}</span>
                      </div>
                      {detailCash.finalAmount !== null && (
                        <div className="flex justify-between gap-4">
                          <span className="text-app-muted">Monto final</span>
                          <span className="font-price">{formatPrice(detailCash.finalAmount)}</span>
                        </div>
                      )}
                    </div>
                    {detailCash.notes && (
                      <div className="mt-4 rounded-lg border border-app-border bg-app-card p-3">
                        <p className="text-sm text-app-muted">Notas</p>
                        <p className="mt-1 text-sm">{detailCash.notes}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <div className="mb-3 flex items-center justify-between gap-4">
                    <h4 className="text-lg font-semibold">Productos de Caja Aparte</h4>
                    <span className="text-sm text-app-muted">
                      {detailCash.separateCashProducts?.length || 0} registros
                    </span>
                  </div>
                  {renderSeparateCashTable(detailCash.separateCashProducts || [])}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
