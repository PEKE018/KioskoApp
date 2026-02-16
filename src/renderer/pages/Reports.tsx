import { useEffect, useState } from 'react';
import {
  FiDollarSign,
  FiShoppingCart,
  FiTrendingUp,
  FiCalendar,
  FiPackage,
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

export default function ReportsPage() {
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today');
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [period]);

  const loadData = async () => {
    setIsLoading(true);
    try {
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

  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      CASH: 'Efectivo',
      DEBIT: 'Débito',
      CREDIT: 'Crédito',
      MERCADOPAGO: 'MercadoPago',
      TRANSFER: 'Transferencia',
      OTHER: 'Otro',
    };
    return labels[method] || method;
  };

  return (
    <div className="h-full flex flex-col p-6 overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Reportes</h1>
          <p className="text-kiosko-muted">Análisis de ventas y rendimiento</p>
        </div>

        {/* Selector de período */}
        <div className="flex bg-kiosko-card rounded-lg p-1">
          <button
            onClick={() => setPeriod('today')}
            className={`px-4 py-2 rounded-md transition-colors ${
              period === 'today'
                ? 'bg-primary-600 text-white'
                : 'text-kiosko-muted hover:text-white'
            }`}
          >
            Hoy
          </button>
          <button
            onClick={() => setPeriod('week')}
            className={`px-4 py-2 rounded-md transition-colors ${
              period === 'week'
                ? 'bg-primary-600 text-white'
                : 'text-kiosko-muted hover:text-white'
            }`}
          >
            Semana
          </button>
          <button
            onClick={() => setPeriod('month')}
            className={`px-4 py-2 rounded-md transition-colors ${
              period === 'month'
                ? 'bg-primary-600 text-white'
                : 'text-kiosko-muted hover:text-white'
            }`}
          >
            Mes
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-kiosko-muted">Cargando datos...</p>
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
                  <p className="text-kiosko-muted text-sm">Ventas Totales</p>
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
                  <p className="text-kiosko-muted text-sm">Cantidad de Ventas</p>
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
                  <p className="text-kiosko-muted text-sm">Promedio por Venta</p>
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
                    className="flex items-center justify-between p-3 bg-kiosko-bg rounded-lg"
                  >
                    <div>
                      <p className="font-medium">
                        {getPaymentMethodLabel(item.paymentMethod)}
                      </p>
                      <p className="text-sm text-kiosko-muted">
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
                  <p className="text-center text-kiosko-muted py-8">
                    Sin ventas en este período
                  </p>
                )}
              </div>
            </div>

            {/* Top productos */}
            <div className="card">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <FiPackage className="text-primary-400" />
                Productos Más Vendidos
              </h3>

              <div className="space-y-2">
                {topProducts.slice(0, 8).map((product, index) => (
                  <div
                    key={product.productId}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-kiosko-bg transition-colors"
                  >
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold ${
                        index === 0
                          ? 'bg-stock-low/20 text-stock-low'
                          : index === 1
                          ? 'bg-kiosko-muted/20 text-kiosko-muted'
                          : index === 2
                          ? 'bg-amber-600/20 text-amber-600'
                          : 'bg-kiosko-bg text-kiosko-muted'
                      }`}
                    >
                      {index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{product.productName}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{product.totalQuantity} un.</p>
                      <p className="text-sm text-kiosko-muted font-price">
                        {formatPrice(product.totalRevenue)}
                      </p>
                    </div>
                  </div>
                ))}

                {topProducts.length === 0 && (
                  <p className="text-center text-kiosko-muted py-8">
                    Sin datos de productos
                  </p>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
