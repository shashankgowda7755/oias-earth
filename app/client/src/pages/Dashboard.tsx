import { useState, type ComponentType } from 'react';
import { Sidebar } from '../components/Sidebar';
import { type SectionTab } from '../components/TabNav';

import DashboardHome from './DashboardHome';
import Users from './Users';
import Sponsors from './Sponsors';
import Employees from './Employees';
import Forests from './Forests';
import Reports from './Reports';
import Jobs from './Jobs';
import Logs from './Logs';
import Integrity from './Integrity';
import Planters from './Planters';

const SECTION_COMPONENTS: Partial<Record<SectionTab, ComponentType>> = {
  Users,
  Sponsors,
  Employees,
  Forests,
  Reports,
  Jobs,
  Logs,
  Integrity,
  Planters,
};

export default function Dashboard() {
  const [active, setActive] = useState<SectionTab>('Home');
  const ActiveSection = SECTION_COMPONENTS[active];

  return (
    <div className="flex h-screen overflow-hidden bg-appbg">
      <Sidebar active={active} onTabChange={setActive} />
      <main className="flex flex-1 flex-col overflow-y-auto">
        <div className="mx-auto w-full max-w-6xl flex-1 px-6 py-6">
          <div
            role="tabpanel"
            id={`panel-${active}`}
            aria-labelledby={`tab-${active}`}
            tabIndex={0}
          >
            {active === 'Home' ? (
              <DashboardHome onOpenTab={setActive} />
            ) : ActiveSection ? (
              <ActiveSection />
            ) : null}
          </div>
        </div>
      </main>
    </div>
  );
}
