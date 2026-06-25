/** Ordered tab registry for the report-data editor. */
import type { ComponentType } from 'react';
import type { SectionProps } from './kit';
import { LandAuthSection } from './sections/LandAuthSection';
import { SiteConfigSection } from './sections/SiteConfigSection';
import { AreaPopulationSection } from './sections/AreaPopulationSection';
import { BeneficiariesValueSection } from './sections/BeneficiariesValueSection';
import { MaintenanceSection } from './sections/MaintenanceSection';
import { GrowthSection } from './sections/GrowthSection';
import { SoilTempSection } from './sections/SoilTempSection';
import { MediaSection } from './sections/MediaSection';
import { QuarterlyAutoSection } from './sections/QuarterlyAutoSection';

export interface SectionTabDef {
  key: string;
  label: string;
  /** 'quarterly' = entered every quarter (one person); 'setup' = config entered once. */
  group?: 'quarterly' | 'setup';
  Component: ComponentType<SectionProps>;
}

export const REPORT_SECTIONS: SectionTabDef[] = [
  { key: 'quarterly', label: '⚡ Quarterly (auto)', group: 'quarterly', Component: QuarterlyAutoSection },
  { key: 'site', label: 'Site config', group: 'setup', Component: SiteConfigSection },
  { key: 'land', label: 'Land & authorization', group: 'setup', Component: LandAuthSection },
  { key: 'area', label: 'Area & population', group: 'setup', Component: AreaPopulationSection },
  { key: 'beneficiaries', label: 'Beneficiaries & value', group: 'setup', Component: BeneficiariesValueSection },
  { key: 'maintenance', label: 'Maintenance', group: 'setup', Component: MaintenanceSection },
  { key: 'growth', label: 'Plant growth', group: 'setup', Component: GrowthSection },
  { key: 'soiltemp', label: 'Soil pH & temperature', group: 'setup', Component: SoilTempSection },
  { key: 'media', label: 'Species & media', group: 'setup', Component: MediaSection },
];
