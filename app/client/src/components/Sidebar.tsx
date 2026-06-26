import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { SECTION_TABS, type SectionTab } from './TabNav';

function initialsOf(first?: string, last?: string, username?: string): string {
  const a = first?.trim()?.[0];
  const b = last?.trim()?.[0];
  if (a || b) return `${a ?? ''}${b ?? ''}`.toUpperCase();
  return (username?.trim()?.[0] ?? 'U').toUpperCase();
}

const NAV_ICONS: Record<SectionTab, JSX.Element> = {
  Home: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 shrink-0">
      <path d="M3 9.5 12 3l9 6.5" />
      <path d="M5 10v10h14V10" />
      <rect x="9.5" y="13" width="5" height="7" />
    </svg>
  ),
  Users: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 shrink-0">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  Sponsors: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 shrink-0">
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  ),
  Employees: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 shrink-0">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  Forests: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 shrink-0">
      <path d="M12 2L8 8H4l4 4-2 6 6-3 6 3-2-6 4-4h-4z" />
      <line x1="12" y1="17" x2="12" y2="22" />
    </svg>
  ),
  Reports: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 shrink-0">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  ),
  Jobs: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 shrink-0">
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
      <line x1="12" y1="12" x2="12" y2="16" />
      <line x1="10" y1="14" x2="14" y2="14" />
    </svg>
  ),
  Integrity: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 shrink-0">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  ),
  Logs: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 shrink-0">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="8" y1="17" x2="13" y2="17" />
    </svg>
  ),
  Emails: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 shrink-0">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  ),
  Planters: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 shrink-0">
      <path d="M12 22V12" />
      <path d="M5 12C5 12 5 6 12 6s7 6 7 6" />
      <path d="M5 17c0-2.8 3-5 7-5s7 2.2 7 5" />
    </svg>
  ),
};

export interface SidebarProps {
  active: SectionTab;
  onTabChange: (tab: SectionTab) => void;
}

export function Sidebar({ active, onTabChange }: SidebarProps) {
  const navigate = useNavigate();
  const { session, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const details = session?.userDetails;
  const initials = initialsOf(details?.firstName, details?.lastName, details?.username);

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const handleLogout = () => {
    setMenuOpen(false);
    signOut();
    navigate('/', { replace: true });
  };

  return (
    <aside className="flex h-screen w-56 shrink-0 flex-col bg-navbar">
      {/* Brand */}
      <div className="flex h-16 items-center gap-2.5 border-b border-white/10 px-4">
        <img src="/oias-mark.svg" alt="" aria-hidden="true" className="h-7 w-7" />
        <span className="font-serif text-lg font-semibold tracking-tight text-textPrimary">
          OIAS Earth
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3" aria-label="Admin navigation">
        <ul className="space-y-0.5 px-2">
          {SECTION_TABS.map((tab) => {
            const isActive = tab === active;
            return (
              <li key={tab}>
                <button
                  type="button"
                  onClick={() => onTabChange(tab)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`group relative flex w-full items-center gap-3 rounded-card px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-white/8 text-textPrimary'
                      : 'text-navbar-inactive hover:bg-white/5 hover:text-textPrimary'
                  }`}
                >
                  {/* Active accent bar */}
                  {isActive && (
                    <span
                      aria-hidden="true"
                      className="absolute inset-y-1.5 left-0 w-0.5 rounded-r bg-primary"
                    />
                  )}
                  <span className={isActive ? 'text-primary' : 'text-current'}>
                    {NAV_ICONS[tab]}
                  </span>
                  {tab}
                </button>
              </li>
            );
          })}
        </ul>

        {/* PFA photo app — a standalone full-screen route, not an in-dashboard tab. */}
        <div className="mt-2 border-t border-white/10 px-2 pt-2">
          <button
            type="button"
            onClick={() => navigate('/pfa')}
            className="group relative flex w-full items-center gap-3 rounded-card px-3 py-2.5 text-sm font-medium text-navbar-inactive transition-colors hover:bg-white/5 hover:text-textPrimary"
          >
            <span className="text-current">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 shrink-0">
                <path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
                <circle cx="12" cy="13" r="3.5" />
              </svg>
            </span>
            PFA Photo App
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="ml-auto h-3.5 w-3.5 opacity-60" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8" /></svg>
          </button>
        </div>
      </nav>

      {/* User zone */}
      <div className="border-t border-white/10 px-3 py-3" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          aria-label="Account menu"
          className="flex w-full items-center gap-2.5 rounded-card px-2 py-2 text-sm hover:bg-white/5"
        >
          {details?.['imageUrl'] && typeof details['imageUrl'] === 'string' ? (
            <img
              src={details['imageUrl']}
              alt=""
              className="h-8 w-8 shrink-0 rounded-full object-cover"
            />
          ) : (
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-semibold text-primary">
              {initials}
            </span>
          )}
          <span className="flex-1 truncate text-left text-textSecondary">
            {details?.username ?? 'Account'}
          </span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-textSecondary" aria-hidden="true">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {menuOpen && (
          <div
            role="menu"
            aria-label="Account"
            className="mt-1 overflow-hidden rounded-card border border-border bg-surface shadow-dialog"
          >
            {details?.username && (
              <div className="border-b border-border px-3 py-2 text-xs text-textSecondary">
                Signed in as
                <div className="truncate font-medium text-textPrimary">{details.username}</div>
              </div>
            )}
            <button
              type="button"
              role="menuitem"
              onClick={handleLogout}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-textPrimary hover:bg-white/5"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Log out
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
