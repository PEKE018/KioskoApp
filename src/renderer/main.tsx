import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import './styles/globals.css';
import './i18n'; // Inicializar i18n

console.log('[KioskoApp] Iniciando renderer...');
console.log('[KioskoApp] window.api disponible:', typeof (window as any).api);

try {
  const root = document.getElementById('root');
  console.log('[KioskoApp] Root element:', root);
  
  if (root) {
    ReactDOM.createRoot(root).render(
      <React.StrictMode>
        <HashRouter>
          <App />
        </HashRouter>
      </React.StrictMode>
    );
    console.log('[KioskoApp] React montado correctamente');
  } else {
    console.error('[KioskoApp] No se encontró el elemento root');
  }
} catch (error) {
  console.error('[KioskoApp] Error al montar React:', error);
}
