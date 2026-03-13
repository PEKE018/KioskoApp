import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import './styles/globals.css';
import './i18n'; // Inicializar i18n

console.log('[StockPOS] Iniciando renderer...');
console.log('[StockPOS] window.api disponible:', typeof (window as any).api);

try {
  const root = document.getElementById('root');
  console.log('[StockPOS] Root element:', root);
  
  if (root) {
    ReactDOM.createRoot(root).render(
      <React.StrictMode>
        <HashRouter>
          <App />
        </HashRouter>
      </React.StrictMode>
    );
    console.log('[StockPOS] React montado correctamente');
  } else {
    console.error('[StockPOS] No se encontró el elemento root');
  }
} catch (error) {
  console.error('[StockPOS] Error al montar React:', error);
}
