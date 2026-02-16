import { useEffect, useState } from 'react';
import {
  FiDollarSign,
  FiClock,
  FiCheck,
  FiX,
  FiAlertCircle,
  FiTrendingUp,
  FiTrendingDown,
  FiCalendar,
  FiUser,
} from 'react-icons/fi';

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
}

export default function CashRegisterPage() {
  const [currentCash, setCurrentCash] = useState<CashRegister | null>(null);
  const [history, setHistory] = useState<CashRegister[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [openAmount, setOpenAmount] = useState('');
  const [closeAmount, setCloseAmount] = useState('');
  const [closeNotes, setCloseNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [currentResult, historyResult] = await Promise.all([
        window.api.cashRegister.getCurrent() as Promise<{ success: boolean; data?: CashRegister }>,
        window.api.cashRegister.getHistory() as Promise<{ success: boolean; data?: CashRegister[] }>,
      ]);

      if (currentResult.success) {
        setCurrentCash(currentResult.data || null);
      }
      if (historyResult.success && historyResult.data) {
        setHistory(historyResult.data);
      }
    } catch (err) {
      console.error('Error loading cash register data:', err);
    }
    setIsLoading(false);
  };

  const handleOpen = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const amount = parseFloat(openAmount);
    if (isNaN(amount) || amount < 0) {
      setError('Ingrese un monto válido');
      return;
    }

    try {
      const result = await window.api.cashRegister.open(amount) as {
        success: boolean;
        data?: CashRegister;
        error?: string;
      };

      if (result.success) {
        setCurrentCash(result.data || null);
        setShowOpenModal(false);
        setOpenAmount('');
        setSuccess('Caja abierta correctamente');
        loadData();
      } else {
        setError(result.error || 'Error al abrir caja');
      }
    } catch (err) {
      setError('Error de conexión');
    }
  };

  const handleClose = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const amount = parseFloat(closeAmount);
    if (isNaN(amount) || amount < 0) {
      setError('Ingrese un monto válido');
      return;
    }

    try {
      const result = await window.api.cashRegister.close(amount) as {
        success: boolean;
        data?: CashRegister;
        error?: string;
      };

      if (result.success) {
        setCurrentCash(null);
        setShowCloseModal(false);
        setCloseAmount('');
        setCloseNotes('');
        setSuccess('Caja cerrada correctamente');
        loadData();
      } else {
        setError(result.error || 'Error al cerrar caja');
      }
    } catch (err) {
      setError('Error de conexión');
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
    }).format(price);
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

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-kiosko-primary"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-6 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <FiDollarSign className="text-kiosko-primary" />
            Caja Registradora
          </h1>
          <p className="text-kiosko-muted mt-1">
            Control de fondo de caja y cierre diario
          </p>
        </div>
      </div>

      {/* Mensaje de éxito */}
      {success && (
        <div className="mb-4 p-3 bg-stock-ok/10 border border-stock-ok/30 rounded-lg flex items-center gap-3 animate-enter">
          <FiCheck className="text-stock-ok text-xl" />
          <p className="text-stock-ok">{success}</p>
        </div>
      )}

      {/* Estado actual de la caja */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Panel de estado */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FiClock className="text-kiosko-primary" />
            Estado Actual
          </h2>

          {currentCash ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-stock-ok/10 border border-stock-ok/30 rounded-lg">
                <span className="font-medium text-stock-ok">CAJA ABIERTA</span>
                <span className="text-sm text-kiosko-muted">
                  Desde {formatTime(currentCash.openedAt)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-kiosko-bg rounded-lg">
                  <p className="text-sm text-kiosko-muted">Fondo de Caja (Cambio)</p>
                  <p className="text-xl font-bold font-price">
                    {formatPrice(currentCash.initialAmount)}
                  </p>
                </div>
                <div className="p-4 bg-kiosko-bg rounded-lg">
                  <p className="text-sm text-kiosko-muted">Ventas en Efectivo</p>
                  <p className="text-xl font-bold text-stock-ok font-price">
                    {formatPrice(currentCash.salesTotal)}
                  </p>
                </div>
              </div>

              <div className="p-4 bg-kiosko-primary/10 border border-kiosko-primary/30 rounded-lg">
                <p className="text-sm text-kiosko-muted">Total Esperado en Caja</p>
                <p className="text-2xl font-bold text-kiosko-primary font-price">
                  {formatPrice(currentCash.initialAmount + currentCash.salesTotal)}
                </p>
              </div>

              <div className="flex items-center gap-2 text-sm text-kiosko-muted">
                <FiUser size={14} />
                <span>Abierta por: {currentCash.user.name}</span>
              </div>

              <button
                onClick={() => {
                  setCloseAmount((currentCash.initialAmount + currentCash.salesTotal).toString());
                  setShowCloseModal(true);
                }}
                className="w-full btn-pos bg-stock-critical hover:bg-stock-critical/90"
              >
                Cerrar Caja
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-kiosko-bg border border-kiosko-border rounded-lg">
                <span className="text-kiosko-muted">CAJA CERRADA</span>
              </div>

              <div className="text-center py-8">
                <FiDollarSign size={48} className="mx-auto mb-4 text-kiosko-muted opacity-50" />
                <p className="text-kiosko-muted mb-4">
                  No hay caja abierta actualmente
                </p>
                <button
                  onClick={() => setShowOpenModal(true)}
                  className="btn-pos"
                >
                  Abrir Caja
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Resumen del día */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FiCalendar className="text-kiosko-primary" />
            Resumen del Día
          </h2>

          {history.length > 0 && history[0].closedAt && 
           new Date(history[0].closedAt).toDateString() === new Date().toDateString() ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-kiosko-bg rounded-lg">
                  <p className="text-sm text-kiosko-muted">Último Cierre</p>
                  <p className="text-lg font-bold">
                    {formatTime(history[0].closedAt!)}
                  </p>
                </div>
                <div className="p-4 bg-kiosko-bg rounded-lg">
                  <p className="text-sm text-kiosko-muted">Ventas del Turno</p>
                  <p className="text-lg font-bold text-stock-ok font-price">
                    {formatPrice(history[0].salesTotal)}
                  </p>
                </div>
              </div>

              {history[0].difference !== null && (
                <div className={`p-4 rounded-lg ${
                  history[0].difference === 0 
                    ? 'bg-stock-ok/10 border border-stock-ok/30'
                    : history[0].difference > 0
                    ? 'bg-blue-500/10 border border-blue-500/30'
                    : 'bg-stock-critical/10 border border-stock-critical/30'
                }`}>
                  <div className="flex items-center gap-2">
                    {history[0].difference === 0 ? (
                      <FiCheck className="text-stock-ok" />
                    ) : history[0].difference > 0 ? (
                      <FiTrendingUp className="text-blue-500" />
                    ) : (
                      <FiTrendingDown className="text-stock-critical" />
                    )}
                    <span className="text-sm text-kiosko-muted">Diferencia</span>
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
            <div className="text-center py-8 text-kiosko-muted">
              <FiCalendar size={48} className="mx-auto mb-4 opacity-50" />
              <p>No hay cierres de caja hoy</p>
            </div>
          )}
        </div>
      </div>

      {/* Historial */}
      <div className="flex-1 card overflow-hidden flex flex-col">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <FiClock className="text-kiosko-primary" />
          Historial de Cajas
        </h2>

        <div className="flex-1 overflow-y-auto">
          {history.length === 0 ? (
            <div className="text-center py-8 text-kiosko-muted">
              <p>No hay historial de cajas</p>
            </div>
          ) : (
            <div className="space-y-2">
              {history.map((cash) => (
                <div
                  key={cash.id}
                  className="flex items-center gap-4 p-4 bg-kiosko-bg rounded-lg"
                >
                  <div className={`w-3 h-3 rounded-full ${
                    cash.status === 'OPEN' ? 'bg-stock-ok' : 'bg-kiosko-muted'
                  }`} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{formatDate(cash.openedAt)}</span>
                      {cash.closedAt && (
                        <>
                          <span className="text-kiosko-muted">→</span>
                          <span>{formatTime(cash.closedAt)}</span>
                        </>
                      )}
                    </div>
                    <p className="text-sm text-kiosko-muted">{cash.user.name}</p>
                  </div>

                  <div className="text-right">
                    <p className="font-bold font-price">{formatPrice(cash.salesTotal)}</p>
                    <p className="text-sm text-kiosko-muted">en ventas</p>
                  </div>

                  {cash.difference !== null && (
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${
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
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-stock-ok/20 text-stock-ok">
                      ABIERTA
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal Abrir Caja */}
      {showOpenModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-kiosko-card border border-kiosko-border rounded-2xl p-6 w-full max-w-md shadow-2xl animate-enter">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <FiDollarSign className="text-kiosko-primary" />
                Abrir Caja
              </h3>
              <button
                onClick={() => {
                  setShowOpenModal(false);
                  setError(null);
                }}
                className="p-2 hover:bg-kiosko-border rounded-lg transition-colors"
              >
                <FiX size={20} />
              </button>
            </div>

            <form onSubmit={handleOpen} className="space-y-4">
              <div>
                <label className="block text-sm text-kiosko-muted mb-2">
                  Fondo de caja (cambio para vueltos)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-kiosko-muted">
                    $
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    value={openAmount}
                    onChange={(e) => setOpenAmount(e.target.value)}
                    className="w-full pl-8 pr-4 py-3 bg-kiosko-bg border border-kiosko-border rounded-lg focus:outline-none focus:ring-2 focus:ring-kiosko-primary text-xl font-price"
                    placeholder="0.00"
                    autoFocus
                  />
                </div>
                <p className="text-xs text-kiosko-muted mt-2">
                  Dinero disponible para dar vuelto a los clientes
                </p>
              </div>

              {error && (
                <div className="p-3 bg-stock-critical/10 border border-stock-critical/30 rounded-lg flex items-center gap-2 text-stock-critical">
                  <FiAlertCircle />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex gap-3 pt-4">
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

      {/* Modal Cerrar Caja */}
      {showCloseModal && currentCash && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-kiosko-card border border-kiosko-border rounded-2xl p-6 w-full max-w-md shadow-2xl animate-enter">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <FiDollarSign className="text-stock-critical" />
                Cerrar Caja
              </h3>
              <button
                onClick={() => {
                  setShowCloseModal(false);
                  setError(null);
                }}
                className="p-2 hover:bg-kiosko-border rounded-lg transition-colors"
              >
                <FiX size={20} />
              </button>
            </div>

            <form onSubmit={handleClose} className="space-y-4">
              {/* Resumen */}
              <div className="p-4 bg-kiosko-bg rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-kiosko-muted">Fondo de caja (cambio):</span>
                  <span className="font-price">{formatPrice(currentCash.initialAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-kiosko-muted">Ventas en efectivo:</span>
                  <span className="font-price text-stock-ok">{formatPrice(currentCash.salesTotal)}</span>
                </div>
                <div className="border-t border-kiosko-border pt-2 flex justify-between font-bold">
                  <span>Total esperado:</span>
                  <span className="font-price text-kiosko-primary">
                    {formatPrice(currentCash.initialAmount + currentCash.salesTotal)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm text-kiosko-muted mb-2">
                  Monto real en caja
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-kiosko-muted">
                    $
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    value={closeAmount}
                    onChange={(e) => setCloseAmount(e.target.value)}
                    className="w-full pl-8 pr-4 py-3 bg-kiosko-bg border border-kiosko-border rounded-lg focus:outline-none focus:ring-2 focus:ring-kiosko-primary text-xl font-price"
                    placeholder="0.00"
                    autoFocus
                  />
                </div>
              </div>

              {/* Diferencia calculada */}
              {closeAmount && (
                <div className={`p-3 rounded-lg ${
                  parseFloat(closeAmount) === currentCash.initialAmount + currentCash.salesTotal
                    ? 'bg-stock-ok/10 border border-stock-ok/30'
                    : parseFloat(closeAmount) > currentCash.initialAmount + currentCash.salesTotal
                    ? 'bg-blue-500/10 border border-blue-500/30'
                    : 'bg-stock-critical/10 border border-stock-critical/30'
                }`}>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-kiosko-muted">Diferencia:</span>
                    <span className={`font-bold font-price ${
                      parseFloat(closeAmount) === currentCash.initialAmount + currentCash.salesTotal
                        ? 'text-stock-ok'
                        : parseFloat(closeAmount) > currentCash.initialAmount + currentCash.salesTotal
                        ? 'text-blue-500'
                        : 'text-stock-critical'
                    }`}>
                      {parseFloat(closeAmount) - (currentCash.initialAmount + currentCash.salesTotal) >= 0 ? '+' : ''}
                      {formatPrice(parseFloat(closeAmount) - (currentCash.initialAmount + currentCash.salesTotal))}
                    </span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm text-kiosko-muted mb-2">
                  Notas (opcional)
                </label>
                <textarea
                  value={closeNotes}
                  onChange={(e) => setCloseNotes(e.target.value)}
                  className="w-full px-4 py-2 bg-kiosko-bg border border-kiosko-border rounded-lg focus:outline-none focus:ring-2 focus:ring-kiosko-primary resize-none"
                  rows={2}
                  placeholder="Observaciones del cierre..."
                />
              </div>

              {error && (
                <div className="p-3 bg-stock-critical/10 border border-stock-critical/30 rounded-lg flex items-center gap-2 text-stock-critical">
                  <FiAlertCircle />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex gap-3 pt-4">
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
                <button
                  type="submit"
                  className="btn-pos flex-1 bg-stock-critical hover:bg-stock-critical/90"
                >
                  Cerrar Caja
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
