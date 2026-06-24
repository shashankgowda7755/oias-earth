/**
 * Phase-1 preview: build a ForestReportData from the bundled Vandalur sample
 * JSON (the exact create-payload the user provided) so /report/forest/preview
 * renders the real field mapping with no server. Period = the latest quarter
 * Vandalur has data for (Q1 2026). Empty fields render blank/— so mapping
 * mistakes are obvious. Phase 2 swaps this for the live API response.
 */
import vandalur from './vandalur.sample.json';
import type { FullForestPayload } from '../Forests/fullTypes';
import { buildMeta, computeReport } from './reportCompute';
import type { ForestReportData } from './reportTypes';

export const VANDALUR_PREVIEW_YEAR = 2026;
export const VANDALUR_PREVIEW_QUARTER = 1;

export function buildPreviewReport(): ForestReportData {
  const forest = vandalur as FullForestPayload;
  const year = VANDALUR_PREVIEW_YEAR;
  const quarter = VANDALUR_PREVIEW_QUARTER;
  return {
    meta: buildMeta(forest, year, quarter, { report_date: '24 June 2026' }),
    forest,
    computed: computeReport(forest, year, quarter),
  };
}
