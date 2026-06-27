/**
 * Secondary tab bar (spec TabNav). Dark gray (#4d4d4d) bar with 6 tabs. The
 * active tab is white text with a green underline; inactive tabs are dimmed
 * white. Switching tabs swaps the section in place (URL stays /dashboard) — the
 * Dashboard owns the active-tab state and passes it here.
 *
 * Implemented as a WAI-ARIA tablist for keyboard support (arrow keys move
 * between tabs; Home/End jump to ends).
 */
import { useRef } from 'react';

export const SECTION_TABS = [
  'Home',
  'Users',
  'Sponsors',
  'Employees',
  'Forests',
  'Species',
  'Reports',
  'Jobs',
  'Logs',
  'Emails',
  'Integrity',
  'Planters',
] as const;

export type SectionTab = (typeof SECTION_TABS)[number];

export interface TabNavProps {
  active: SectionTab;
  onChange: (tab: SectionTab) => void;
}

export function TabNav({ active, onChange }: TabNavProps) {
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const onKeyDown = (e: React.KeyboardEvent, index: number) => {
    let next = index;
    if (e.key === 'ArrowRight') next = (index + 1) % SECTION_TABS.length;
    else if (e.key === 'ArrowLeft') next = (index - 1 + SECTION_TABS.length) % SECTION_TABS.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = SECTION_TABS.length - 1;
    else return;
    e.preventDefault();
    const tab = SECTION_TABS[next];
    if (tab) {
      onChange(tab);
      tabRefs.current[next]?.focus();
    }
  };

  return (
    <nav className="bg-navbar shadow-sm">
      <div
        role="tablist"
        aria-label="Admin sections"
        className="mx-auto flex max-w-6xl items-stretch justify-center gap-2 px-4"
      >
        {SECTION_TABS.map((tab, i) => {
          const selected = tab === active;
          return (
            <button
              key={tab}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              role="tab"
              type="button"
              id={`tab-${tab}`}
              aria-selected={selected}
              aria-controls={`panel-${tab}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(tab)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={`relative px-4 py-4 text-sm font-medium transition-colors ${
                selected
                  ? 'text-navbar-text'
                  : 'text-navbar-inactive hover:text-navbar-text'
              }`}
            >
              {tab}
              {selected ? (
                <span
                  aria-hidden="true"
                  className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-primary"
                />
              ) : null}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
