/**
 * Top app bar (spec AppHeader). White bar:
 *   - left: leaf logo + "OIAS Earth" wordmark in primary green
 *   - right: avatar button -> dropdown with "Log out" (clears session, -> "/")
 */
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

function initialsOf(first?: string, last?: string, username?: string): string {
  const a = first?.trim()?.[0];
  const b = last?.trim()?.[0];
  if (a || b) return `${a ?? ''}${b ?? ''}`.toUpperCase();
  return (username?.trim()?.[0] ?? 'U').toUpperCase();
}

export function AppHeader() {
  const navigate = useNavigate();
  const { session, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const details = session?.userDetails;
  const initials = initialsOf(details?.firstName, details?.lastName, details?.username);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const handleLogout = () => {
    setOpen(false);
    signOut();
    navigate('/', { replace: true });
  };

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-surface px-6">
      <div className="flex items-center gap-2.5">
        <img src="/oias-mark.svg" alt="" aria-hidden="true" className="h-7 w-7" />
        <span className="font-serif text-xl font-semibold tracking-tight text-textPrimary">OIAS Earth</span>
      </div>

      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label="Account menu"
          className="flex items-center gap-1 rounded-full p-1 hover:bg-white/5"
        >
          {details?.['imageUrl'] && typeof details['imageUrl'] === 'string' ? (
            <img
              src={details['imageUrl']}
              alt=""
              className="h-9 w-9 rounded-full object-cover"
            />
          ) : (
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-darkInk">
              {initials}
            </span>
          )}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-textSecondary" aria-hidden="true">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {open ? (
          <div
            role="menu"
            aria-label="Account"
            className="absolute right-0 z-50 mt-2 w-48 overflow-hidden rounded-card border border-border bg-surface py-1 shadow-card"
          >
            {details?.username ? (
              <div className="border-b border-border px-4 py-2 text-xs text-textSecondary">
                Signed in as
                <div className="truncate font-medium text-textPrimary">
                  {details.username}
                </div>
              </div>
            ) : null}
            <button
              type="button"
              role="menuitem"
              onClick={handleLogout}
              className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-textPrimary hover:bg-white/5"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Log out
            </button>
          </div>
        ) : null}
      </div>
    </header>
  );
}
