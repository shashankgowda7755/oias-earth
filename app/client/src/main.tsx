import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { installDomGuard } from './lib/domGuard';

// Must run before React mounts: hardens insertBefore/removeChild against
// DOM-mutating browser extensions so a routine commit can never crash a screen.
installDomGuard();

const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error('Root element #root not found in index.html');
}

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
