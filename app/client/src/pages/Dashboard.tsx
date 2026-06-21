import { useState, type ComponentType } from 'react';
import { Sidebar } from '../components/Sidebar';
import { type SectionTab } from '../components/TabNav';

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
  const [active, setActive] = useState<SectionTab>('Forests');
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
            <ActiveSection />
          </div>
        </div>
      </main>
    </div>
  );
}
