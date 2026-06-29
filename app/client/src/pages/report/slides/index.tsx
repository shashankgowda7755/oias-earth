/** Ordered slide list for the quarterly forest report, built per-report. */
import type { ReactNode } from 'react';
import type { SlideProps } from '../reportTypes';
import { projectYearLabel, quarterOrdinal, fiscalQuarterOf, quarterPeriodLabel, type FQ } from '@/lib/fiscal';
import { S01Cover, S02Contents, S03OsrLand, S04Permission, S05AreaPopulation, S06ProjectImpact, S07Beneficiaries } from './slides1';
import { S08ValueFlow, S09ApproxValue, S10Maintenance, S11WorkforceQuarter, S12WorkforceTillDate, S13Growth, S14SiteMasterPlan } from './slides2';
import { S15SoilPh, S16Temperature, S17EnvIndicators, S18Species, S19ScoreCard, S20Security, S22Thanks, GalleryYearPage } from './slides3';

/** A renderable report slide with a stable id (for skip persistence) + nav title. */
export interface ReportSlide {
  id: string;
  title: string;
  node: ReactNode;
}

/** One gallery photo within a project year (caption precomputed). */
type GalleryPhoto = { image?: string; caption?: string };

/**
 * Build per-(year,quarter) gallery photos grouped by PROJECT year — counted from
 * the plantation date, every 4 consecutive quarters = one project year (Year 1,
 * Year 2 …). For each cell: prefer gallery_images; fold in plantation_progress
 * where the gallery has nothing. Returns project years ascending, each with its
 * photos in quarter order and captions like "Q2 · Jul – Sep 25".
 */
function galleryByProjectYear(data: SlideProps['data']): { py: number; photos: GalleryPhoto[] }[] {
  const { forest } = data;
  // key = `${year}-${quarter}` → chosen photo.
  const byCell = new Map<string, { year: number; quarter: number; image?: string; caption?: string }>();

  for (const g of forest.gallery_images ?? []) {
    if (!g || !g.image) continue;
    const year = Number(g.year), quarter = Number(g.quarter);
    if (!Number.isFinite(year) || !Number.isFinite(quarter)) continue;
    byCell.set(`${year}-${quarter}`, { year, quarter, image: g.image, caption: g.caption });
  }
  // Fold in plantation_progress only where the gallery has nothing for that cell.
  for (const p of forest.plantation_progress ?? []) {
    if (!p || !p.image) continue;
    const year = Number(p.year), quarter = Number(p.quarter);
    if (!Number.isFinite(year) || !Number.isFinite(quarter)) continue;
    const key = `${year}-${quarter}`;
    if (!byCell.has(key)) byCell.set(key, { year, quarter, image: p.image });
  }

  const cells = [...byCell.values()];
  if (cells.length === 0) return [];

  // Base ordinal = the plantation quarter (Year 1 Q1). Fall back to the earliest
  // photo so it still groups sensibly when no plantation date is set.
  const plant = forest.plantation_date ? new Date(String(forest.plantation_date)) : null;
  const base = plant && !Number.isNaN(plant.getTime())
    ? quarterOrdinal(fiscalQuarterOf(plant))
    : Math.min(...cells.map((c) => quarterOrdinal({ year: c.year, quarter: c.quarter } as FQ)));

  // Group cells by project year; remember the project-quarter (1..4) for ordering + caption.
  const years = new Map<number, { pq: number; photo: GalleryPhoto }[]>();
  for (const cell of cells) {
    const diff = quarterOrdinal({ year: cell.year, quarter: cell.quarter } as FQ) - base;
    const py = Math.max(1, Math.floor(diff / 4) + 1);
    const pq = (((diff % 4) + 4) % 4) + 1;
    const cap = cell.caption?.trim() || `Q${cell.quarter} · ${quarterPeriodLabel(cell.year, cell.quarter)}`;
    const list = years.get(py) ?? [];
    list.push({ pq, photo: { image: cell.image, caption: cap } });
    years.set(py, list);
  }

  return [...years.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([py, arr]) => ({ py, photos: arr.sort((a, b) => a.pq - b.pq).map((x) => x.photo) }));
}

/**
 * Build the ordered slide list for a report. Slides 1–20 (Cover .. Site Security)
 * are fixed. The Plantation Progress slide is gone; the single static Photo
 * Gallery is replaced by one dynamic page per fiscal year that has photos (the
 * layout auto-fits the photo count). When no photos exist anywhere, one
 * empty-state gallery page is kept so the section never disappears. The final
 * slide is always Thank You.
 */
export function buildSlides(data: SlideProps['data']): ReportSlide[] {
  const fixed: ReportSlide[] = [
    { id: 'cover', title: 'Cover', node: <S01Cover data={data} /> },
    { id: 'contents', title: 'Contents', node: <S02Contents data={data} /> },
    { id: 'osr-land', title: 'OSR Land', node: <S03OsrLand data={data} /> },
    { id: 'permission', title: 'Permission Letter', node: <S04Permission data={data} /> },
    { id: 'area-population', title: 'Area & Population', node: <S05AreaPopulation data={data} /> },
    { id: 'project-impact', title: 'Project Impact', node: <S06ProjectImpact data={data} /> },
    { id: 'beneficiaries', title: 'Beneficiaries', node: <S07Beneficiaries data={data} /> },
    { id: 'value-flow', title: 'Value Flow', node: <S08ValueFlow data={data} /> },
    { id: 'approx-value', title: 'Approximate Value', node: <S09ApproxValue data={data} /> },
    { id: 'maintenance', title: 'Maintenance', node: <S10Maintenance data={data} /> },
    { id: 'workforce-quarter', title: 'Workforce — Quarter', node: <S11WorkforceQuarter data={data} /> },
    { id: 'workforce-tilldate', title: 'Workforce — Till Date', node: <S12WorkforceTillDate data={data} /> },
    { id: 'plant-growth', title: 'Plant Growth', node: <S13Growth data={data} /> },
    { id: 'site-master-plan', title: 'Site Master Plan', node: <S14SiteMasterPlan data={data} /> },
    { id: 'soil-ph', title: 'Soil pH', node: <S15SoilPh data={data} /> },
    { id: 'temperature', title: 'Temperature', node: <S16Temperature data={data} /> },
    { id: 'env-indicators', title: 'Env. Indicators', node: <S17EnvIndicators data={data} /> },
    { id: 'species', title: 'Species Inventory', node: <S18Species data={data} /> },
    { id: 'score-card', title: 'Score Card', node: <S19ScoreCard data={data} /> },
    { id: 'security', title: 'Site Security', node: <S20Security data={data} /> },
  ];

  const galleryYears = galleryByProjectYear(data);
  const gallerySlides: ReportSlide[] = galleryYears.length
    ? galleryYears.map(({ py, photos }) => ({
        id: `gallery-y${py}`,
        title: `Photo Gallery — ${projectYearLabel(py)}`,
        node: <GalleryYearPage data={data} title={projectYearLabel(py)} photos={photos} />,
      }))
    : [
        {
          id: 'gallery',
          title: 'Photo Gallery',
          node: <GalleryYearPage data={data} photos={[]} />,
        },
      ];

  return [
    ...fixed,
    ...gallerySlides,
    { id: 'thanks', title: 'Thank You', node: <S22Thanks data={data} /> },
  ];
}
