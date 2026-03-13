import { useState } from 'react';
import { FiCheck, FiShoppingBag, FiPhone, FiMapPin, FiFileText, FiArrowRight } from 'react-icons/fi';

interface SetupData {
  businessName: string;
  businessAddress: string;
  businessPhone: string;
  businessCuit: string;
  ticketHeader: string;
}

interface SetupProps {
  onComplete: () => void;
}

const BUSINESS_TYPES = [
  { id: 'kiosco', name: 'Kiosco', icon: '🏪' },
  { id: 'almacen', name: 'Almacén', icon: '🛒' },
  { id: 'verduleria', name: 'Verdulería', icon: '🥬' },
  { id: 'carniceria', name: 'Carnicería', icon: '🥩' },
  { id: 'panaderia', name: 'Panadería', icon: '🥖' },
  { id: 'ferreteria', name: 'Ferretería', icon: '🔧' },
  { id: 'libreria', name: 'Librería', icon: '📚' },
  { id: 'farmacia', name: 'Farmacia', icon: '💊' },
  { id: 'otro', name: 'Otro comercio', icon: '🏬' },
];

export default function SetupPage({ onComplete }: SetupProps) {
  const [step, setStep] = useState(1);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<SetupData>({
    businessName: '',
    businessAddress: '',
    businessPhone: '',
    businessCuit: '',
    ticketHeader: '¡Gracias por su compra!',
  });

  const handleTypeSelect = (typeId: string) => {
    setSelectedType(typeId);
    const type = BUSINESS_TYPES.find(t => t.id === typeId);
    if (type && !formData.businessName) {
      setFormData(prev => ({
        ...prev,
        businessName: type.id === 'otro' ? '' : `Mi ${type.name}`,
      }));
    }
  };

  const handleSubmit = async () => {
    if (!formData.businessName.trim()) {
      setError('Ingrese el nombre de su negocio');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await window.api.settings.update({
        businessName: formData.businessName.trim(),
        businessAddress: formData.businessAddress.trim() || null,
        businessPhone: formData.businessPhone.trim() || null,
        businessCuit: formData.businessCuit.trim() || null,
        ticketHeader: formData.ticketHeader.trim() || '¡Gracias por su compra!',
      }) as { success: boolean; error?: string };

      if (result.success) {
        // Marcar setup como completado
        localStorage.setItem('stockpos_setup_completed', 'true');
        onComplete();
      } else {
        setError(result.error || 'Error al guardar la configuración');
      }
    } catch (err) {
      setError('Error de conexión');
      console.error('Setup error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-app-bg via-app-card to-app-bg flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            ¡Bienvenido a StockPOS!
          </h1>
          <p className="text-app-muted text-lg">
            Configuremos tu negocio en unos simples pasos
          </p>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold transition-colors ${
            step >= 1 ? 'bg-primary-600 text-white' : 'bg-app-border text-app-muted'
          }`}>
            {step > 1 ? <FiCheck /> : '1'}
          </div>
          <div className={`w-16 h-1 rounded ${step > 1 ? 'bg-primary-600' : 'bg-app-border'}`} />
          <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold transition-colors ${
            step >= 2 ? 'bg-primary-600 text-white' : 'bg-app-border text-app-muted'
          }`}>
            {step > 2 ? <FiCheck /> : '2'}
          </div>
        </div>

        {/* Card */}
        <div className="bg-app-card border border-app-border rounded-2xl p-8 shadow-2xl">
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center">
                <FiShoppingBag className="mx-auto text-5xl text-primary-500 mb-4" />
                <h2 className="text-2xl font-bold text-white mb-2">
                  ¿Qué tipo de negocio tenés?
                </h2>
                <p className="text-app-muted">
                  Seleccioná la opción que mejor describa tu comercio
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {BUSINESS_TYPES.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => handleTypeSelect(type.id)}
                    className={`p-4 rounded-xl border-2 transition-all hover:scale-105 ${
                      selectedType === type.id
                        ? 'border-primary-500 bg-primary-500/20'
                        : 'border-app-border hover:border-app-muted bg-app-bg'
                    }`}
                  >
                    <span className="text-3xl block mb-2">{type.icon}</span>
                    <span className="text-sm font-medium text-white">{type.name}</span>
                  </button>
                ))}
              </div>

              <button
                onClick={() => setStep(2)}
                disabled={!selectedType}
                className="w-full btn-primary py-4 text-lg flex items-center justify-center gap-2 disabled:opacity-50"
              >
                Continuar
                <FiArrowRight />
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center">
                <FiFileText className="mx-auto text-5xl text-primary-500 mb-4" />
                <h2 className="text-2xl font-bold text-white mb-2">
                  Datos de tu negocio
                </h2>
                <p className="text-app-muted">
                  Esta información aparecerá en tus tickets de venta
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-app-muted mb-2">
                    Nombre del negocio *
                  </label>
                  <div className="relative">
                    <FiShoppingBag className="absolute left-4 top-1/2 -translate-y-1/2 text-app-muted" />
                    <input
                      type="text"
                      value={formData.businessName}
                      onChange={(e) => setFormData(prev => ({ ...prev, businessName: e.target.value }))}
                      className="input pl-12"
                      placeholder="Ej: Kiosco Don Pedro"
                      autoFocus
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-app-muted mb-2">
                    Dirección (opcional)
                  </label>
                  <div className="relative">
                    <FiMapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-app-muted" />
                    <input
                      type="text"
                      value={formData.businessAddress}
                      onChange={(e) => setFormData(prev => ({ ...prev, businessAddress: e.target.value }))}
                      className="input pl-12"
                      placeholder="Ej: Av. San Martín 1234"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-app-muted mb-2">
                      Teléfono (opcional)
                    </label>
                    <div className="relative">
                      <FiPhone className="absolute left-4 top-1/2 -translate-y-1/2 text-app-muted" />
                      <input
                        type="text"
                        value={formData.businessPhone}
                        onChange={(e) => setFormData(prev => ({ ...prev, businessPhone: e.target.value }))}
                        className="input pl-12"
                        placeholder="11-1234-5678"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-app-muted mb-2">
                      CUIT (opcional)
                    </label>
                    <input
                      type="text"
                      value={formData.businessCuit}
                      onChange={(e) => setFormData(prev => ({ ...prev, businessCuit: e.target.value }))}
                      className="input"
                      placeholder="20-12345678-9"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-app-muted mb-2">
                    Mensaje en tickets
                  </label>
                  <input
                    type="text"
                    value={formData.ticketHeader}
                    onChange={(e) => setFormData(prev => ({ ...prev, ticketHeader: e.target.value }))}
                    className="input"
                    placeholder="¡Gracias por su compra!"
                  />
                </div>
              </div>

              {error && (
                <div className="p-4 rounded-lg bg-stock-critical/20 border border-stock-critical/30 text-stock-critical">
                  {error}
                </div>
              )}

              <div className="flex gap-4">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 btn-secondary py-4 text-lg"
                >
                  Volver
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting || !formData.businessName.trim()}
                  className="flex-1 btn-primary py-4 text-lg flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      Guardando...
                    </>
                  ) : (
                    <>
                      <FiCheck />
                      Finalizar
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-app-muted text-sm mt-6">
          Podés modificar estos datos en cualquier momento desde Configuración
        </p>
      </div>
    </div>
  );
}
