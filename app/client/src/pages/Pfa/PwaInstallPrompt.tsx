/**
 * PwaInstallPrompt — an in-page "Install the PFA app" pop-up shown on /pfa.
 *
 * Android / desktop Chrome fire `beforeinstallprompt`; we capture it and show a
 * bottom sheet whose button calls the saved event's `prompt()`. iOS Safari never
 * fires that event, so for iOS we detect it and show an "Add to Home Screen"
 * instruction sheet instead. Hidden when already running installed
 * (display-mode: standalone) and once dismissed (remembered in localStorage so
 * it doesn't nag). The manifest swap (to /pfa.webmanifest) is done by the parent
 * so the install targets the PFA app, not the Field app.
 */
import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'pfa-install-dismissed';

function isStandalone(): boolean {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    // iOS Safari
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}
function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent) && !/crios|fxios/i.test(window.navigator.userAgent);
}

export default function PwaInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    if (isStandalone()) return; // already installed → never prompt
    let dismissed = false;
    try { dismissed = localStorage.getItem(DISMISS_KEY) === '1'; } catch { /* ignore */ }
    if (dismissed) return;

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setShow(true);
    };
    window.addEventListener('beforeinstallprompt', onBip);

    const onInstalled = () => { setShow(false); setIosHint(false); };
    window.addEventListener('appinstalled', onInstalled);

    // iOS gives no event — surface the A2HS hint after a beat if not standalone.
    let t: ReturnType<typeof setTimeout> | undefined;
    if (isIos()) t = setTimeout(() => setIosHint(true), 1200);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBip);
      window.removeEventListener('appinstalled', onInstalled);
      if (t) clearTimeout(t);
    };
  }, []);

  const dismiss = () => {
    setShow(false);
    setIosHint(false);
    try { localStorage.setItem(DISMISS_KEY, '1'); } catch { /* ignore */ }
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    try { await deferred.userChoice; } catch { /* ignore */ }
    setDeferred(null);
    setShow(false);
  };

  if (!show && !iosHint) return null;

  return (
    <div
      role="dialog"
      aria-label="Install the PFA app"
      style={{
        position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 9000,
        background: '#13241a', borderTop: '1px solid #2f5a1e', color: '#eaf6ee',
        padding: '16px 18px calc(16px + env(safe-area-inset-bottom))', boxShadow: '0 -8px 28px rgba(0,0,0,.5)',
      }}
    >
      <div style={{ maxWidth: 520, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 14 }}>
        <img src="/pfa-icon.svg" alt="" width={44} height={44} style={{ borderRadius: 12, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 15 }}>Install the COMMUNITREE PFA app</div>
          <div style={{ fontSize: 13, color: '#9fb3a8', marginTop: 2 }}>
            {iosHint
              ? 'Tap the Share icon, then “Add to Home Screen”.'
              : 'Add it to your home screen for quick, full-screen photo uploads.'}
          </div>
        </div>
        {show && deferred ? (
          <button onClick={install} style={{ flexShrink: 0, background: '#b6ff3c', color: '#0d1518', border: 'none', borderRadius: 999, padding: '10px 18px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
            Install
          </button>
        ) : null}
        <button onClick={dismiss} aria-label="Dismiss" style={{ flexShrink: 0, background: 'transparent', color: '#9fb3a8', border: 'none', fontSize: 22, lineHeight: 1, cursor: 'pointer', padding: '4px 6px' }}>×</button>
      </div>
    </div>
  );
}
