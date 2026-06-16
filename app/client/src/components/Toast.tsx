/**
 * Snackbar/Toast feedback after mutations (spec component "Toast"). A provider
 * holds the queue; useToast() exposes show helpers. Rendered bottom-left like
 * MUI's default Snackbar.
 */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

export type ToastSeverity = 'success' | 'error' | 'info';

export interface ToastOptions {
  /** auto-dismiss after ms. Default 4000. Pass 0 to require manual close. */
  duration?: number;
}

interface ToastItem {
  id: number;
  message: string;
  severity: ToastSeverity;
  duration: number;
}

export interface ToastApi {
  show: (message: string, severity?: ToastSeverity, opts?: ToastOptions) => void;
  success: (message: string, opts?: ToastOptions) => void;
  error: (message: string, opts?: ToastOptions) => void;
  info: (message: string, opts?: ToastOptions) => void;
}

const ToastContext = createContext<ToastApi | undefined>(undefined);

const SEVERITY_STYLES: Record<ToastSeverity, string> = {
  success: 'bg-primary text-white',
  error: 'bg-danger text-white',
  info: 'bg-darkInk text-white',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (message: string, severity: ToastSeverity = 'info', opts?: ToastOptions) => {
      const id = ++idRef.current;
      const duration = opts?.duration ?? 4000;
      setToasts((prev) => [...prev, { id, message, severity, duration }]);
      if (duration > 0) {
        window.setTimeout(() => dismiss(id), duration);
      }
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({
      show,
      success: (m, o) => show(m, 'success', o),
      error: (m, o) => show(m, 'error', o),
      info: (m, o) => show(m, 'info', o),
    }),
    [show],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="pointer-events-none fixed bottom-4 left-4 z-[1400] flex flex-col gap-2"
        aria-live="polite"
        aria-atomic="false"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.severity === 'error' ? 'alert' : 'status'}
            className={`pointer-events-auto flex min-w-[280px] max-w-md items-center justify-between gap-4 rounded-button px-4 py-3 text-sm shadow-card animate-toast-in ${SEVERITY_STYLES[t.severity]}`}
          >
            <span>{t.message}</span>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss notification"
              className="text-white/80 hover:text-white"
            >
              &times;
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a <ToastProvider>.');
  }
  return ctx;
}
