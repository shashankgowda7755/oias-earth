/**
 * Dashboard shell (spec screen "Users" et al., route "/dashboard"). AppHeader +
 * TabNav over the page background; the active section component renders inside
 * a tabpanel. Switching tabs swaps the section in place (URL stays /dashboard);
 * React Query caches each section's list so re-selecting doesn't refetch.
 *
 * IMPORTS all six section components (default exports, no required props).
 */
import { useState, type ComponentType } from 'react';
import { AppHeader } from '../components/AppHeader';
import { TabNav, type SectionTab } from '../components/TabNav';

import Users from './Users';
import Sponsors from './Sponsors';
import Employees from './Employees';
import Forests from './Forests';
import Reports from './Reports';
import Jobs from './Jobs';
import Integrity from './Integrity';
import Planters from './Planters';

const SECTION_COMPONENTS: Record<SectionTab, ComponentType> = {
  Users,
  Sponsors,
  Employees,
  Forests,
  Reports,
  Jobs,
  Integrity,
  Planters,
};

export default function Dashboard() {
  // Default tab is Users (spec: "Users tab, default").
  const [active, setActive] = useState<SectionTab>('Users');
  const ActiveSection = SECTION_COMPONENTS[active];

  return (
    <div className="flex min-h-screen flex-col bg-appbg">
      <AppHeader />
      <TabNav active={active} onChange={setActive} />
      {/* TEMP: quick access to the 360 Upload + Tap-Tag Studio (remove later). */}
      <a
        href="/forest/9f6684c0-59ef-4fdb-ab34-0101178d3e43/studio"
        className="mx-auto mt-3 flex w-full max-w-6xl items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm no-underline"
        style={{ borderColor: 'rgba(182,255,60,.4)', background: 'rgba(182,255,60,.08)', color: '#1D9E75' }}
      >
        <span>⬆ <strong>Upload 360° &amp; Tap-Tag Studio</strong> — open a panorama, tap each sapling. <span style={{ opacity: 0.7 }}>(temporary shortcut)</span></span>
        <span style={{ color: '#5ad7e0' }}>Open →</span>
      </a>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <div
          role="tabpanel"
          id={`panel-${active}`}
          aria-labelledby={`tab-${active}`}
          tabIndex={0}
        >
          <ActiveSection />
        </div>
      </main>
    </div>
  );
}
