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

export interface SectionTabDef {
  key: string;
  label: string;
  Component: ComponentType<SectionProps>;
}

export const REPORT_SECTIONS: SectionTabDef[] = [
  { key: 'site', label: 'Site config', Component: SiteConfigSection },
  { key: 'land', label: 'Land & authorization', Component: LandAuthSection },
  { key: 'area', label: 'Area & population', Component: AreaPopulationSection },
  { key: 'beneficiaries', label: 'Beneficiaries & value', Component: BeneficiariesValueSection },
  { key: 'maintenance', label: 'Maintenance', Component: MaintenanceSection },
  { key: 'growth', label: 'Plant growth', Component: GrowthSection },
  { key: 'soiltemp', label: 'Soil pH & temperature', Component: SoilTempSection },
  { key: 'media', label: 'Species & media', Component: MediaSection },
];
