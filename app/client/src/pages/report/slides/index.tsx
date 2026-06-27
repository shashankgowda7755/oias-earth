/** Ordered slide list for the quarterly forest report (slides 1–22). */
import type { ComponentType } from 'react';
import type { SlideProps } from '../reportTypes';
import { S01Cover, S02Contents, S03OsrLand, S04Permission, S05AreaPopulation, S06ProjectImpact, S07Beneficiaries } from './slides1';
import { S08ValueFlow, S09ApproxValue, S10Maintenance, S11WorkforceQuarter, S12WorkforceTillDate, S13Growth, S14SiteMasterPlan } from './slides2';
import { S15SoilPh, S16Temperature, S17EnvIndicators, S18Species, S19ScoreCard, S20Security, S21Progress, S21bGallery, S22Thanks } from './slides3';

/** Section labels for the report navigator (1:1 with SLIDES order). */
export const SLIDE_TITLES: string[] = [
  'Cover', 'Contents', 'OSR Land', 'Permission Letter', 'Area & Population', 'Project Impact', 'Beneficiaries',
  'Value Flow', 'Approximate Value', 'Maintenance', 'Workforce — Quarter', 'Workforce — Till Date', 'Plant Growth', 'Site Master Plan',
  'Soil pH', 'Temperature', 'Env. Indicators', 'Species Inventory', 'Score Card', 'Site Security', 'Plantation Progress', 'Photo Gallery', 'Thank You',
];

/** Human-readable slide IDs for skip persistence (stable — never reorder). */
export const SLIDE_IDS: string[] = [
  'cover', 'contents', 'osr-land', 'permission', 'area-population', 'project-impact', 'beneficiaries',
  'value-flow', 'approx-value', 'maintenance', 'workforce-quarter', 'workforce-tilldate', 'plant-growth', 'site-master-plan',
  'soil-ph', 'temperature', 'env-indicators', 'species', 'score-card', 'security', 'progress', 'gallery', 'thanks',
];

export const SLIDES: ComponentType<SlideProps>[] = [
  S01Cover, S02Contents, S03OsrLand, S04Permission, S05AreaPopulation, S06ProjectImpact, S07Beneficiaries,
  S08ValueFlow, S09ApproxValue, S10Maintenance, S11WorkforceQuarter, S12WorkforceTillDate, S13Growth, S14SiteMasterPlan,
  S15SoilPh, S16Temperature, S17EnvIndicators, S18Species, S19ScoreCard, S20Security, S21Progress, S21bGallery, S22Thanks,
];
