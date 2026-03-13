import { useEffect, useState } from 'react';
import {
  FiDollarSign,
  FiShoppingCart,
  FiTrendingUp,
  FiPackage,
  FiUser,
  FiClock,
  FiCalendar,
  FiChevronLeft,
  FiChevronRight,
} from 'react-icons/fi';

interface DailySummary {
  totalSales: number;
  salesCount: number;
  byPaymentMethod: Array<{
    paymentMethod: string;
    _sum: { total: number };
    _count: number;
  }>;
}

interface TopProduct {
  productId: string;
  productName: string;
  totalQuantity: number;
  totalRevenue: number;
}

interface CashierShift {
  cashRegisterId: string | null;
  cashier: {
    id: string;
    name: string;
    username: string;
  };
  status: string;
  openedAt: string | null;
  closedAt: string | null;
  initialAmount: number;
  finalAmount: number | null;
  salesTotal: number;
  difference: number | null;
  salesCount: number;
  itemsCount: number;
  byPaymentMethod: Array<{
    method: string;
    count: number;
    total: number;
  }>;
}

interface CashierReport {
  date: string;
  dayTotal: {
    totalSales: number;
    totalTransactions: number;
    totalItems: number;
    shiftsCount: number;
  };
  shifts: CashierShift[];
  unassignedSales: CashierShift[];
}

type TabType = 'resumen' | 'turnos';

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('turnos');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [cashierReport, setCashierReport] = useState<CashierReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [selectedDate, activeTab]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      if (activeTab === 'resumen') {
        // Obtener resumen diario
        const summaryResult = await window.api.sales.getDailySummary() as {
          success: boolean;
          data?: DailySummary;
        };
        
        if (summaryResult.success && summaryResult.data) {
          setSummary(summaryResult.data);
        }

        // Obtener top productos
        const topResult = await window.api.reports.getTopProducts(10) as {
          success: boolean;
          data?: TopProduct[];
        };
        
        if (topResult.success && topResult.data) {
          setTopProducts(topResult.data);
        }
      } else {
        // Obtener reporte por cajero/turno
        const cashierResult = await window.api.reports.getByCashier(selectedDate) as {
          success: boolean;
          data?: CashierReport;
        };
        
        if (cashierResult.success && cashierResult.data) {
          setCashierReport(cashierResult.data);
        }
      }
    } catch (error) {
      console.error('Error loading reports:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
    }).format(price);
  };

  const formatTime = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-AR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      CASH: 'Efectivo',
      DEBIT: 'Débito',
      CREDIT: 'Crédito',
      MIXED: 'Mixto',
      TRANSFER: 'Transferencia',
      FIADO: 'Fiado',
      OTHER: 'Otro',
    };
    return labels[method] || method;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return <span className="px-2 py-1 text-xs font-medium bg-stock-ok/20 text-stock-ok rounded-full">Abierta</span>;
      case 'CLOSED':
        return <span className="px-2 py-1 text-xs font-medium bg-primary-500/20 text-primary-400 rounded-full">Cerrada</span>;
      case 'NO_REGISTER':
        return <span className="px-2 py-1 text-xs font-medium bg-stock-low/20 text-stock-low rounded-full">Sin Caja</span>;
      default:
        return <span className="px-2 py-1 text-xs font-medium bg-app-muted/20 text-app-muted rounded-full">{status}</span>;
    }
  };

  const changeDate = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    // No permitir fechas futuras
    if (newDate <= new Date()) {
      setSelectedDate(newDate);
    }
  };

  const isToday = () => {
    const today = new Date();
    return selectedDate.toDateString() === today.toDateString();
  };

  return (
    <div className="h-full flex flex-col p-6 overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Reportes</h1>
          <p className="text-app-muted">Análisis de ventas y rendimiento por turno</p>
        </div>

        {/* Tabs */}
        <div className="flex bg-app-card rounded-lg p-1">
          <button
            onClick={() => setActiveTab('turnos')}
            className={`px-4 py-2 rounded-md transition-colors flex items-center gap-2 ${
              activeTab === 'turnos'
                ? 'bg-primary-600 text-white'
                : 'text-app-muted hover:text-white'
            }`}
          >
            <FiUser size={16} />
            Por Turno
          </button>
          <button
            onClick={() => setActiveTab('resumen')}
            className={`px-4 py-2 rounded-md transition-colors flex items-center gap-2 ${
              activeTab === 'resumen'
                ? 'bg-primary-600 text-white'
                : 'text-app-muted hover:text-white'
            }`}
          >
            <FiTrendingUp size={16} />
            Resumen General
          </button>
        </div>
      </div>

      {activeTab === 'turnos' && (
        <>
          {/* Selector de fecha */}
          <div className="flex items-center justify-center gap-4 mb-6">
            <button
              onClick={() => changeDate(-1)}
              className="p-2 rounded-lg bg-app-card hover:bg-primary-600/20 transition-colors"
            >
              <FiChevronLeft size={24} />
            </button>
            
            <div className="flex items-center gap-3 px-6 py-3 bg-app-card rounded-xl">
              <FiCalendar className="text-primary-400" size={20} />
              <span className="text-lg font-medium capitalize">
                {isToday() ? 'Hoy - ' : ''}{formatDate(selectedDate)}
              </span>
            </div>
            
            <button
              onClick={() => changeDate(1)}
              disabled={isToday()}
              className={`p-2 rounded-lg transition-colors ${
                isToday()
                  ? 'bg-app-bg text-app-muted cursor-not-allowed'
                  : 'bg-app-card hover:bg-primary-600/20'
              }`}
            >
              <FiChevronRight size={24} />
            </button>
          </div>

          {isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-app-muted">Cargando datos...</p>
            </div>
          ) : cashierReport ? (
            <>
              {/* Resumen del día */}
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="card">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-stock-ok/20 flex items-center justify-center">
                      <FiDollarSign className="text-stock-ok" size={24} />
                    </div>
                    <div>
                      <p className="text-app-muted text-sm">Total del Día</p>
                      <p className="text-2xl font-bold font-price text-stock-ok">
                        {formatPrice(cashierReport.dayTotal.totalSales)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="card">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-primary-500/20 flex items-center justify-center">
                      <FiShoppingCart className="text-primary-400" size={24} />
                    </div>
                    <div>
                      <p className="text-app-muted text-sm">Transacciones</p>
                      <p className="text-2xl font-bold text-primary-400">
                        {cashierReport.dayTotal.totalTransactions}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="card">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-stock-low/20 flex items-center justify-center">
                      <FiPackage className="text-stock-low" size={24} />
                    </div>
                    <div>
                      <p className="text-app-muted text-sm">Items Vendidos</p>
                      <p className="text-2xl font-bold text-stock-low">
                        {cashierReport.dayTotal.totalItems}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="card">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
                      <FiUser className="text-amber-400" size={24} />
                    </div>
                    <div>
                      <p className="text-app-muted text-sm">Turnos</p>
                      <p className="text-2xl font-bold text-amber-400">
                        {cashierReport.dayTotal.shiftsCount}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Lista de turnos */}
              <div className="flex-1">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <FiClock className="text-primary-400" />
                  Turnos del Día
                </h3>

                {cashierReport.shifts.length === 0 && cashierReport.unassignedSales.length === 0 ? (
                  <div className="card flex items-center justify-center py-12">
                    <p className="text-app-muted">No hay turnos registrados para este día</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Turnos con caja */}
                    {cashierReport.shifts.map((shift) => (
                      <div
                        key={shift.cashRegisterId}
                        className="card hover:border-primary-500/30 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-full bg-primary-600/20 flex items-center justify-center text-2xl font-bold text-primary-400">
                              {shift.cashier.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <h4 className="text-lg font-bold">{shift.cashier.name}</h4>
                              <p className="text-app-muted text-sm">@{shift.cashier.username}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {getStatusBadge(shift.status)}
                            <div className="text-right">
                              <p className="text-2xl font-bold font-price text-stock-ok">
                                {formatPrice(shift.salesTotal)}
                              </p>
                              <p className="text-sm text-app-muted">
                                {shift.salesCount} ventas
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-4 gap-4 mb-4">
                          <div className="p-3 bg-app-bg rounded-lg">
                            <p className="text-xs text-app-muted mb-1">Apertura</p>
                            <p className="font-medium">{formatTime(shift.openedAt)}</p>
                          </div>
                          <div className="p-3 bg-app-bg rounded-lg">
                            <p className="text-xs text-app-muted mb-1">Cierre</p>
                            <p className="font-medium">{formatTime(shift.closedAt)}</p>
                          </div>
                          <div className="p-3 bg-app-bg rounded-lg">
                            <p className="text-xs text-app-muted mb-1">Fondo Inicial</p>
                            <p className="font-medium font-price">{formatPrice(shift.initialAmount)}</p>
                          </div>
                          <div className="p-3 bg-app-bg rounded-lg">
                            <p className="text-xs text-app-muted mb-1">Diferencia</p>
                            <p className={`font-medium font-price ${
                              shift.difference === null ? 'text-app-muted' :
                              shift.difference === 0 ? 'text-stock-ok' :
                              shift.difference > 0 ? 'text-stock-ok' : 'text-stock-critical'
                            }`}>
                              {shift.difference !== null ? formatPrice(shift.difference) : '-'}
                            </p>
                          </div>
                        </div>

                        {/* Desglose por método de pago */}
                        {shift.byPaymentMethod.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {shift.byPaymentMethod.map((pm) => (
                              <div
                                key={pm.method}
                                className="px-3 py-2 bg-app-bg rounded-lg text-sm"
                              >
                                <span className="text-app-muted">{getPaymentMethodLabel(pm.method)}: </span>
                                <span className="font-medium font-price">{formatPrice(pm.total)}</span>
                                <span className="text-app-muted"> ({pm.count})</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Ventas sin caja asignada */}
                    {cashierReport.unassignedSales.map((shift) => (
                      <div
                        key={`unassigned-${shift.cashier.id}`}
                        className="card border-stock-low/30 hover:border-stock-low/50 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-full bg-stock-low/20 flex items-center justify-center text-2xl font-bold text-stock-low">
                              {shift.cashier.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <h4 className="text-lg font-bold">{shift.cashier.name}</h4>
                              <p className="text-stock-low text-sm">Sin caja registradora abierta</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {getStatusBadge(shift.status)}
                            <div className="text-right">
                              <p className="text-2xl font-bold font-price text-stock-low">
                                {formatPrice(shift.salesTotal)}
                              </p>
                              <p className="text-sm text-app-muted">
                                {shift.salesCount} ventas
                              </p>
                            </div>
                          </div>
                        </div>

                        {shift.byPaymentMethod.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {shift.byPaymentMethod.map((pm) => (
                              <div
                                key={pm.method}
                                className="px-3 py-2 bg-app-bg rounded-lg text-sm"
                              >
                                <span className="text-app-muted">{getPaymentMethodLabel(pm.method)}: </span>
                                <span className="font-medium font-price">{formatPrice(pm.total)}</span>
                                <span className="text-app-muted"> ({pm.count})</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-app-muted">No se pudieron cargar los datos</p>
            </div>
          )}
        </>
      )}

      {activeTab === 'resumen' && (
        <>
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-app-muted">Cargando datos...</p>
            </div>
          ) : (
            <>
              {/* Stats principales */}
              <div className="grid grid-cols-3 gap-6 mb-8">
                <div className="card">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-stock-ok/20 flex items-center justify-center">
                      <FiDollarSign className="text-stock-ok" size={28} />
                    </div>
                    <div>
                      <p className="text-app-muted text-sm">Ventas Totales (Hoy)</p>
                      <p className="text-3xl font-bold font-price text-stock-ok">
                        {formatPrice(summary?.totalSales || 0)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="card">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-primary-500/20 flex items-center justify-center">
                      <FiShoppingCart className="text-primary-500" size={28} />
                    </div>
                    <div>
                      <p className="text-app-muted text-sm">Cantidad de Ventas</p>
                      <p className="text-3xl font-bold text-primary-400">
                        {summary?.salesCount || 0}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="card">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-stock-low/20 flex items-center justify-center">
                      <FiTrendingUp className="text-stock-low" size={28} />
                    </div>
                    <div>
                      <p className="text-app-muted text-sm">Promedio por Venta</p>
                      <p className="text-3xl font-bold font-price text-stock-low">
                        {formatPrice(
                          summary?.salesCount
                            ? (summary?.totalSales || 0) / summary.salesCount
                            : 0
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                {/* Ventas por método de pago */}
                <div className="card">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <FiDollarSign className="text-primary-400" />
                    Por Método de Pago
                  </h3>

                  <div className="space-y-3">
                    {summary?.byPaymentMethod.map((item) => (
                      <div
                        key={item.paymentMethod}
                        className="flex items-center justify-between p-3 bg-app-bg rounded-lg"
                      >
                        <div>
                          <p className="font-medium">
                            {getPaymentMethodLabel(item.paymentMethod)}
                          </p>
                          <p className="text-sm text-app-muted">
                            {item._count} ventas
                          </p>
                        </div>
                        <p className="text-xl font-bold font-price">
                          {formatPrice(item._sum.total || 0)}
                        </p>
                      </div>
                    ))}

                    {(!summary?.byPaymentMethod ||
                      summary.byPaymentMethod.length === 0) && (
                      <p className="text-center text-app-muted py-8">
                        Sin ventas en este período
                      </p>
                    )}
                  </div>
                </div>

                {/* Top productos */}
                <div className="card">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <FiPackage className="text-primary-400" />
                    Productos Más Vendidos (Hoy)
                  </h3>

                  <div className="space-y-2">
                    {topProducts.slice(0, 8).map((product, index) => (
                      <div
                        key={product.productId}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-app-bg transition-colors"
                      >
                        <span
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold ${
                            index === 0
                              ? 'bg-stock-low/20 text-stock-low'
                              : index === 1
                              ? 'bg-app-muted/20 text-app-muted'
                              : index === 2
                              ? 'bg-amber-600/20 text-amber-600'
                              : 'bg-app-bg text-app-muted'
                          }`}
                        >
                          {index + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{product.productName}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{product.totalQuantity} un.</p>
                          <p className="text-sm text-app-muted font-price">
                            {formatPrice(product.totalRevenue)}
                          </p>
                        </div>
                      </div>
                    ))}

                    {topProducts.length === 0 && (
                      <p className="text-center text-app-muted py-8">
                        Sin datos de productos
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
