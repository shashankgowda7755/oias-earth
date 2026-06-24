/**
 * Forest DETAIL view — read-only, tabbed render of the rich forest record
 * (the row action "View"). Renders the many jsonb sections of a
 * FullForestPayload across tabbed panels; every section degrades gracefully
 * when its data is absent (see detail/sections.tsx).
 *
 * Tabs (spec forest_and_bulk_contracts.md §1):
 *   Overview · Sponsors/Logos · Land & Authorization · Population & Beneficiaries
 *   · Impact Report · Maintenance Workforce · Soil pH · Temperature/Humidity
 *   · Plant Growth · Plantation Progress · Security & Infra · Species & Health
 *   · Report Images
 *
 * DATA SOURCE / GAP: the forest LIST row (`ForestRow`) carries only the scalar
 * columns + sponsor summaries — NOT the jsonb report columns. So opening View
 * from a list row shows a populated Overview but the rich tabs read "No data".
 * A faithful detail needs a per-forest read-one GET that returns the full jsonb
 * record; that endpoint shape isn't captured yet (see index.tsx GAPS / NOTES
 * openQuestions[2]). This component accepts a ready FullForestPayload so, once a
 * read-one loader exists, the parent just passes its result here unchanged.
 */
import { useMemo, useState } from 'react';
import { FormDialog, Button } from '@/components';
import type { FullForestPayload } from './fullTypes';
import {
  ImpactSection,
  LandSection,
  MaintenanceSection,
  OverviewSection,
  PlantGrowthSection,
  PlantationProgressSection,
  PopulationSection,
  ReportImagesSection,
  SecuritySection,
  SoilPhSection,
  SpeciesSection,
  SponsorsSection,
  TempHumiditySection,
} from './detail/sections';
import { GeoTagSection } from './GeoTagSection';

interface TabDef {
  key: string;
  label: string;
  render: (f: FullForestPayload) => JSX.Element;
}

const TABS: TabDef[] = [
  { key: 'overview', label: 'Overview', render: (f) => <OverviewSection forest={f} /> },
  { key: 'geo', label: 'Geo-tagging', render: (f) => <GeoTagSection forest={f} /> },
  { key: 'sponsors', label: 'Sponsors / Logos', render: (f) => <SponsorsSection forest={f} /> },
  { key: 'land', label: 'Land & Authorization', render: (f) => <LandSection forest={f} /> },
  {
    key: 'population',
    label: 'Population & Beneficiaries',
    render: (f) => <PopulationSection forest={f} />,
  },
  { key: 'impact', label: 'Impact Report', render: (f) => <ImpactSection forest={f} /> },
  {
    key: 'maintenance',
    label: 'Maintenance Workforce',
    render: (f) => <MaintenanceSection forest={f} />,
  },
  { key: 'soil', label: 'Soil pH', render: (f) => <SoilPhSection forest={f} /> },
  {
    key: 'temp',
    label: 'Temperature / Humidity',
    render: (f) => <TempHumiditySection forest={f} />,
  },
  { key: 'growth', label: 'Plant Growth', render: (f) => <PlantGrowthSection forest={f} /> },
  {
    key: 'progress',
    label: 'Plantation Progress',
    render: (f) => <PlantationProgressSection forest={f} />,
  },
  { key: 'security', label: 'Security & Infra', render: (f) => <SecuritySection forest={f} /> },
  { key: 'species', label: 'Species & Health', render: (f) => <SpeciesSection forest={f} /> },
  { key: 'report', label: 'Report Images', render: (f) => <ReportImagesSection forest={f} /> },
];

export interface ForestDetailViewProps {
  /** The full forest record to render. `null` => closed (no render). */
  forest: FullForestPayload | null;
  onClose: () => void;
  /** Optional "Edit" affordance in the footer (reopens the wizard prefilled). */
  onEdit?: () => void;
}

export function ForestDetailView({ forest, onClose, onEdit }: ForestDetailViewProps) {
  const [active, setActive] = useState<string>('overview');

  const activeTab = useMemo(
    () => TABS.find((t) => t.key === active) ?? TABS[0]!,
    [active],
  );

  if (!forest) return null;

  const footer = (
    <footer className="flex items-center justify-end gap-2 border-t border-border px-6 py-4">
      {forest.id ? (
        <Button
          type="button"
          variant="outlined"
          onClick={() => window.open(`/forest/${forest.id}/report-data`, '_blank', 'noopener')}
        >
          Edit report data
        </Button>
      ) : null}
      {forest.id ? (
        <Button
          type="button"
          variant="outlined"
          onClick={() => window.open(`/report/forest/${forest.id}`, '_blank', 'noopener')}
        >
          View quarterly report ↗
        </Button>
      ) : null}
      {onEdit ? (
        <Button type="button" variant="outlined" onClick={onEdit}>
          Edit
        </Button>
      ) : null}
      <Button type="button" variant="primary" onClick={onClose}>
        Close
      </Button>
    </footer>
  );

  return (
    <FormDialog
      open={Boolean(forest)}
      title={forest.forest_name || 'Forest'}
      maxWidth="xl"
      onClose={onClose}
      onSubmit={onClose}
      footer={footer}
    >
      {/* Tab strip — horizontally scrollable on narrow viewports. */}
      <div
        role="tablist"
        aria-label="Forest detail sections"
        className="-mx-1 mb-5 flex gap-1 overflow-x-auto border-b border-border pb-px"
      >
        {TABS.map((t) => {
          const isActive = t.key === activeTab.key;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`forest-tab-${t.key}`}
              id={`forest-tabbtn-${t.key}`}
              onClick={() => setActive(t.key)}
              className={`whitespace-nowrap rounded-t-input border-b-2 px-3 py-2 text-sm transition-colors ${
                isActive
                  ? 'border-primary font-medium text-primary'
                  : 'border-transparent text-textSecondary hover:text-textPrimary'
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`forest-tab-${activeTab.key}`}
        aria-labelledby={`forest-tabbtn-${activeTab.key}`}
      >
        {activeTab.render(forest)}
      </div>
    </FormDialog>
  );
}
