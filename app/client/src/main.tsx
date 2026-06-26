import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { installDomGuard } from './lib/domGuard';

// Must run before React mounts: hardens insertBefore/removeChild against
// DOM-mutating browser extensions so a routine commit can never crash a screen.
installDomGuard();

// PWA: the SW uses skipWaiting + clientsClaim, so a new deploy's worker takes
// control on the next visit. Reload once when that happens so the latest bundle
// wins immediately — no more being stuck on an old cached version after a deploy.
if ('serviceWorker' in navigator) {
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloaded) return;
    reloaded = true;
    window.location.reload();
  });
}

const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error('Root element #root not found in index.html');
}

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
