import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../stores/authStore';
import { FiUser, FiLock, FiAlertCircle } from 'react-icons/fi';

interface InitialCredentials {
  username: string;
  password: string;
}

export default function LoginPage() {
  const { t } = useTranslation();
  const [mode, setMode] = useState<'credentials' | 'pin'>('credentials');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [initialCredentials, setInitialCredentials] = useState<InitialCredentials | null>(null);
  
  const navigate = useNavigate();
  const { user, login, loginWithPin, isLoading, error, clearError } = useAuthStore();
  
  const usernameRef = useRef<HTMLInputElement>(null);
  const pinRef = useRef<HTMLInputElement>(null);

  // Redirigir si ya hay sesión
  useEffect(() => {
    if (user) {
      navigate('/pos');
    }
  }, [user, navigate]);

  // Cargar credenciales iniciales si existen
  useEffect(() => {
    const loadInitialCredentials = async () => {
      try {
        const result = await window.api.auth.getInitialCredentials() as { success: boolean; data: InitialCredentials | null };
        if (result.success && result.data) {
          setInitialCredentials(result.data);
        }
      } catch (error) {
        // Ignorar si no se pueden cargar
      }
    };
    loadInitialCredentials();
  }, []);

  // Focus inicial
  useEffect(() => {
    if (mode === 'credentials') {
      usernameRef.current?.focus();
    } else {
      pinRef.current?.focus();
    }
  }, [mode]);

  // Limpiar error al cambiar de modo
  useEffect(() => {
    clearError();
    setPin('');
    setUsername('');
    setPassword('');
  }, [mode, clearError]);

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await login(username, password);
    if (success) {
      navigate('/pos');
    }
  };

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
    setPin(value);
    
    // Auto-submit cuando se completa el PIN
    if (value.length === 4) {
      loginWithPin(value).then((success) => {
        if (success) {
          navigate('/pos');
        }
      });
    }
  };

  const handleKeypadClick = (digit: string) => {
    if (pin.length < 4) {
      const newPin = pin + digit;
      setPin(newPin);
      
      if (newPin.length === 4) {
        loginWithPin(newPin).then((success) => {
          if (success) {
            navigate('/pos');
          }
        });
      }
    }
  };

  const handleKeypadDelete = () => {
    setPin(pin.slice(0, -1));
    clearError();
  };

  return (
    <div className="min-h-screen bg-app-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary-400 mb-2">🏪 StockPOS</h1>
          <p className="text-app-muted">{t('login.title')}</p>
        </div>

        {/* Tabs */}
        <div className="flex mb-6 bg-app-card rounded-lg p-1">
          <button
            onClick={() => setMode('credentials')}
            className={`flex-1 py-2 px-4 rounded-md transition-colors ${
              mode === 'credentials'
                ? 'bg-primary-600 text-white'
                : 'text-app-muted hover:text-app-text'
            }`}
          >
            {t('login.credentials')}
          </button>
          <button
            onClick={() => setMode('pin')}
            className={`flex-1 py-2 px-4 rounded-md transition-colors ${
              mode === 'pin'
                ? 'bg-primary-600 text-white'
                : 'text-app-muted hover:text-app-text'
            }`}
          >
            {t('login.pin')}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 bg-stock-critical/20 border border-stock-critical/50 rounded-lg flex items-center gap-2 text-stock-critical">
            <FiAlertCircle />
            <span>{error}</span>
          </div>
        )}

        {/* Formulario de credenciales */}
        {mode === 'credentials' && (
          <form onSubmit={handleCredentialsSubmit} className="card space-y-4">
            <div>
              <label className="block text-sm font-medium text-app-muted mb-1">
                {t('login.username')}
              </label>
              <div className="relative">
                <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-app-muted" />
                <input
                  ref={usernameRef}
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="input pl-10"
                  placeholder={t('login.usernamePlaceholder')}
                  autoComplete="username"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-app-muted mb-1">
                {t('login.password')}
              </label>
              <div className="relative">
                <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-app-muted" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pl-10"
                  placeholder={t('login.passwordPlaceholder')}
                  autoComplete="current-password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !username || !password}
              className="btn-primary w-full py-3"
            >
              {isLoading ? t('login.loading') : t('login.submit')}
            </button>
          </form>
        )}

        {/* Formulario de PIN */}
        {mode === 'pin' && (
          <div className="card">
            <div className="text-center mb-6">
              <p className="text-app-muted mb-4">{t('login.pinPrompt')}</p>
              
              {/* Display de PIN */}
              <div className="flex justify-center gap-3 mb-2">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={`w-12 h-14 rounded-lg border-2 flex items-center justify-center text-2xl font-bold transition-all ${
                      i < pin.length
                        ? 'border-primary-500 bg-primary-500/20 text-primary-400'
                        : 'border-app-border bg-app-bg'
                    }`}
                  >
                    {i < pin.length ? '•' : ''}
                  </div>
                ))}
              </div>

              {/* Input oculto para teclado físico */}
              <input
                ref={pinRef}
                type="password"
                value={pin}
                onChange={handlePinChange}
                className="opacity-0 absolute -z-10"
                maxLength={4}
                inputMode="numeric"
              />
            </div>

            {/* Keypad numérico */}
            <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'DEL'].map(
                (key, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      if (key === 'DEL') {
                        handleKeypadDelete();
                      } else if (key !== '') {
                        handleKeypadClick(key);
                      }
                    }}
                    disabled={key === '' || isLoading}
                    className={`keypad-btn ${
                      key === 'DEL' ? 'text-stock-critical text-lg' : ''
                    } ${key === '' ? 'invisible' : ''}`}
                  >
                    {key === 'DEL' ? '←' : key}
                  </button>
                )
              )}
            </div>
          </div>
        )}

        {/* Footer - Solo mostrar si hay credenciales iniciales */}
        {initialCredentials && (
          <p className="text-center text-app-muted text-sm mt-6">
            {t('login.defaultCredentials')}: <code className="text-primary-400">{initialCredentials.username}</code> / <code className="text-primary-400">{initialCredentials.password}</code>
          </p>
        )}
      </div>
    </div>
  );
}
