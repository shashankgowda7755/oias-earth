/**
 * Forest DETAIL tab bodies — read-only renders of the rich jsonb sections of a
 * FullForestPayload (spec/forest_create_payload.jsonc + forest_and_bulk_contracts.md).
 *
 * Each section is defensive: missing/empty source => <EmptySection/>. No section
 * invents business rules; values render exactly as stored. Impact numbers shown
 * here are the values present in `forest_value_flow_impact_report` (short/medium/
 * long term) — the per-tree oxygen=oxygen_per_day*age_days computation is a
 * server/sponsor-portal concern and is NOT recomputed in this admin detail view.
 */
import {
  AGREEMENT_STATUS_LABELS,
  REPORT_SLIDE_TYPE_LABELS,
  SPONSOR_LOGO_TYPE_LABELS,
  parseBoundary,
  type FullForestPayload,
  type ReportSlideType,
  type SponsorLogoType,
  type ImpactTermValues,
} from '../fullTypes';
import { BoundaryMap } from '../BoundaryMap';
import {
  DataGrid,
  EmptySection,
  Field,
  FieldGrid,
  Stat,
  SubTitle,
  Thumb,
  byYearQuarter,
  fmt,
  humanize,
  quarterLabel,
} from './primitives';

type Props = { forest: FullForestPayload };

function num(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Enum -> label, falling back to humanize() for `others`/unknown values. */
function enumLabel(
  value: string | undefined,
  map: Record<string, string>,
  other?: string,
): string {
  if (!value) return '—';
  if (value === 'others' && other) return `Others — ${other}`;
  return map[value] ?? humanize(value);
}

/* ------------------------------ Overview ------------------------------ */

export function OverviewSection({ forest: f }: Props) {
  const boundary = parseBoundary(f.forest_boundary);
  const lat = num(f.forest_geo_lat);
  const lng = num(f.forest_geo_long);

  return (
    <div className="space-y-6">
      <div>
        <SubTitle>Basic</SubTitle>
        <FieldGrid>
          <Field label="Forest Name">{fmt(f.forest_name)}</Field>
          <Field label="Internal ID">{fmt(f.forest_internal_id)}</Field>
          <Field label="Unique ID">{fmt(f.forest_unique_id)}</Field>
          <Field label="City">{fmt(f.forest_city)}</Field>
          <Field label="State">{fmt(f.forest_state)}</Field>
          <Field label="Country">{fmt(f.forest_country)}</Field>
          <Field label="Project Site">{fmt(f.project_site)}</Field>
          <Field label="Project Period (yrs)">{fmt(f.project_period)}</Field>
          <Field label="Plantation Date">{fmt(f.plantation_date)}</Field>
          <Field label="DigiPIN">{fmt(f.digipin)}</Field>
          <Field label="Last Inspection">{fmt(f.last_inspection_date)}</Field>
          <Field label="Direction Angle">{fmt(f.direction_angle)}</Field>
        </FieldGrid>
        {f.forest_address || f.forest_desc ? (
          <FieldGrid>
            {f.forest_address ? (
              <div className="sm:col-span-2 lg:col-span-3">
                <Field label="Address">
                  <span className="whitespace-pre-line">{f.forest_address}</span>
                </Field>
              </div>
            ) : null}
            {f.forest_desc ? (
              <div className="sm:col-span-2 lg:col-span-3">
                <Field label="Description">{f.forest_desc}</Field>
              </div>
            ) : null}
          </FieldGrid>
        ) : null}
      </div>

      <div>
        <SubTitle>Grid & Plantation</SubTitle>
        <FieldGrid>
          <Field label="Box Grid (R×C)">
            {fmt(f.box_rows)} × {fmt(f.box_columns)}
          </Field>
          <Field label="Tree Grid (R×C)">
            {fmt(f.tree_rows)} × {fmt(f.tree_columns)}
          </Field>
          <Field label="Box → Box (ft)">{fmt(f.box_to_box_distance)}</Field>
          <Field label="Tree → Tree (ft)">{fmt(f.tree_to_tree_distance)}</Field>
          <Field label="Boundary Gap (ft)">{fmt(f.boundary_gap)}</Field>
          <Field label="Pathway Spacing (ft)">{fmt(f.pathway_spacing)}</Field>
          <Field label="Plantation Strategy">
            {enumLabel(f.plantation_strategy, {}, f.plantation_strategy_other)}
          </Field>
          <Field label="Irrigation Method">
            {enumLabel(f.irrigation_method, {}, f.irrigation_method_other)}
          </Field>
          <Field label="Climate">{enumLabel(f.climate, {}, f.climate_other)}</Field>
          <Field label="Soil Type">{enumLabel(f.soil_type, {}, f.soil_type_other)}</Field>
        </FieldGrid>
      </div>

      <div>
        <SubTitle>Location</SubTitle>
        <BoundaryMap boundary={boundary} centerLat={lat} centerLng={lng} />
      </div>
    </div>
  );
}

/* ------------------------------ Sponsors / Logos ------------------------------ */

export function SponsorsSection({ forest: f }: Props) {
  const logos = f.additional_sponsor_logo ?? [];
  if (logos.length === 0) return <EmptySection label="No sponsor logos." />;

  // Group by type for the spec's "by type" layout.
  const groups = new Map<string, typeof logos>();
  for (const l of logos) {
    const key = (l.type?.value as string) || 'other';
    const arr = groups.get(key) ?? [];
    arr.push(l);
    groups.set(key, arr);
  }
  const order: SponsorLogoType[] = [
    'initiated_by',
    'sponsored_by',
    'supported_by',
    'in_collaboration_with',
  ];
  const keys = [
    ...order.filter((k) => groups.has(k)),
    ...[...groups.keys()].filter((k) => !order.includes(k as SponsorLogoType)),
  ];

  return (
    <div className="space-y-6">
      {keys.map((key) => (
        <div key={key}>
          <SubTitle>
            {SPONSOR_LOGO_TYPE_LABELS[key as SponsorLogoType] ?? humanize(key)}
          </SubTitle>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {(groups.get(key) ?? []).map((l, i) => (
              <div
                key={i}
                className="flex flex-col items-center gap-2 rounded-card border border-border bg-appbg p-3 text-center"
              >
                {l.logo ? (
                  <img
                    src={l.logo}
                    alt={l.name ?? 'Sponsor logo'}
                    loading="lazy"
                    className="h-16 w-full bg-white object-contain"
                  />
                ) : (
                  <div className="flex h-16 w-full items-center justify-center text-label text-textSecondary">
                    No logo
                  </div>
                )}
                <span className="text-sm text-textPrimary">{fmt(l.name)}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------ Land & Authorization ------------------------------ */

export function LandSection({ forest: f }: Props) {
  const lo = f.land_ownership;
  const la = f.land_area;
  const auth = f.authorization_details;
  if (!lo && !la && !auth && !f.permission_letter && !f.site_layout) {
    return <EmptySection label="No land / authorization data." />;
  }
  return (
    <div className="space-y-6">
      <div>
        <SubTitle>Land Ownership & Area</SubTitle>
        <FieldGrid>
          <Field label="Owner">{fmt(lo?.name)}</Field>
          <Field label="Agreement Status">
            {enumLabel(lo?.agreement_status, AGREEMENT_STATUS_LABELS as Record<string, string>)}
          </Field>
          <Field label="Total Area">{fmt(la?.total_area)}</Field>
          <Field label="Planted Area">{fmt(la?.planted_area)}</Field>
        </FieldGrid>
      </div>

      <div>
        <SubTitle>Authorization</SubTitle>
        <FieldGrid>
          <Field label="Authorized By">{fmt(auth?.authorized_by_name)}</Field>
          <Field label="Designation">{fmt(auth?.authorized_by_designation)}</Field>
          <Field label="Authorized Date">{fmt(auth?.authorized_date)}</Field>
          <Field label="Authorized Period">{fmt(auth?.authorized_period)}</Field>
        </FieldGrid>
        {auth?.project_context ? (
          <div className="mt-1">
            <Field label="Project Context">{auth.project_context}</Field>
          </div>
        ) : null}
      </div>

      {(f.permission_letter || f.site_layout) ? (
        <div>
          <SubTitle>Documents</SubTitle>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {f.permission_letter ? (
              <Thumb src={f.permission_letter} alt="Permission letter" caption="Permission Letter" />
            ) : null}
            {f.site_layout ? (
              <Thumb src={f.site_layout} alt="Site layout" caption="Site Layout" />
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------ Population & Beneficiaries ------------------------------ */

export function PopulationSection({ forest: f }: Props) {
  const a = f.area_population_statistics_details;
  const b = f.direct_and_indirect_beneficiaries;
  const ind = f.environmental_need_indicators ?? [];
  if (!a && !b && ind.length === 0) {
    return <EmptySection label="No population / beneficiary data." />;
  }
  return (
    <div className="space-y-6">
      {a ? (
        <div>
          <SubTitle>Area & Population Statistics</SubTitle>
          <FieldGrid>
            <Field label="Jurisdiction Area">{fmt(a.total_jurisdiction_area)}</Field>
            <Field label="Population">{fmt(a.population)}</Field>
            <Field label="Population Density">{fmt(a.population_density)}</Field>
            <Field label="Green Cover">{fmt(a.green_cover)}</Field>
            <Field label="Environmental Need">{fmt(a.environmental_need)}</Field>
          </FieldGrid>
          {a.google_earth_image && a.google_earth_image.length > 0 ? (
            <div className="mt-3">
              <SubTitle>Google Earth Imagery</SubTitle>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {a.google_earth_image.map((g, i) => (
                  <Thumb
                    key={i}
                    src={g.image}
                    alt={`Google Earth ${g.year ?? ''}`}
                    caption={`${fmt(g.year)} · pop ${fmt(g.population)}`}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {b ? (
        <div>
          <SubTitle>Direct & Indirect Beneficiaries</SubTitle>
          <FieldGrid>
            <Field label="Site Supervisor">{fmt(b.site_supervisor)}</Field>
            <Field label="Watering Team">{fmt(b.watering_team)}</Field>
            <Field label="De-weeding Crew">{fmt(b.de_weeding_crew)}</Field>
            <Field label="Plant Health Specialist">{fmt(b.plant_health_specialist)}</Field>
            <Field label="People Visiting">{fmt(b.people_visiting)}</Field>
            <Field label="People Living Near">{fmt(b.people_living_near)}</Field>
            <Field label="Schools / Colleges">{fmt(b.schools_colleges)}</Field>
          </FieldGrid>
        </div>
      ) : null}

      {ind.length > 0 ? (
        <div>
          <SubTitle>Environmental Need Indicators</SubTitle>
          <ul className="space-y-2">
            {ind.map((it, i) => (
              <li key={i} className="rounded-card border border-border bg-appbg p-3">
                <p className="text-sm font-medium text-textPrimary">{fmt(it.heading)}</p>
                <p className="text-sm text-textSecondary">{fmt(it.description)}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------ Impact Report ------------------------------ */

function ImpactCard({ title, v }: { title: string; v: ImpactTermValues | undefined }) {
  return (
    <div className="rounded-card border border-border p-4">
      <SubTitle>{title}</SubTitle>
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Land Value" value={fmt(v?.land_value)} />
        <Stat label="Tree Value" value={fmt(v?.tree_value)} />
        <Stat label="Oxygen Generated" value={fmt(v?.oxygen_generated)} />
        <Stat label="Carbon Sequestration" value={fmt(v?.carbon_sequestration)} />
      </div>
    </div>
  );
}

export function ImpactSection({ forest: f }: Props) {
  const r = f.forest_value_flow_impact_report;
  if (!r || (!r.short_term && !r.medium_term && !r.long_term)) {
    return <EmptySection label="No impact report data." />;
  }
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <ImpactCard title="Short Term" v={r.short_term} />
      <ImpactCard title="Medium Term" v={r.medium_term} />
      <ImpactCard title="Long Term" v={r.long_term} />
    </div>
  );
}

/* ------------------------------ Maintenance Workforce ------------------------------ */

export function MaintenanceSection({ forest: f }: Props) {
  const rows = [...(f.maintenance_workforce ?? [])].sort(byYearQuarter);
  if (rows.length === 0) return <EmptySection label="No maintenance workforce data." />;
  return (
    <DataGrid
      rows={rows}
      getRowKey={(r, i) => `${r.year}-${r.quarter}-${i}`}
      columns={[
        { header: 'Quarter', render: (r) => quarterLabel(r.year, r.quarter) },
        { header: 'Weekly Off', align: 'right', render: (r) => fmt(r.total_holidays_weekly_off) },
        { header: 'Festival', align: 'right', render: (r) => fmt(r.total_holidays_festival) },
        { header: 'Watering Days', align: 'right', render: (r) => fmt(r.total_watering_days) },
        { header: 'Raining Days', align: 'right', render: (r) => fmt(r.total_raining_days) },
        { header: 'FT Gardeners', align: 'right', render: (r) => fmt(r.full_time_gardeners) },
        { header: 'PT Gardeners', align: 'right', render: (r) => fmt(r.part_time_gardeners) },
        {
          header: 'PT Labour Days',
          align: 'right',
          render: (r) => fmt(r.total_part_time_labour_days),
        },
      ]}
    />
  );
}

/* ------------------------------ Soil pH ------------------------------ */

export function SoilPhSection({ forest: f }: Props) {
  const rows = [...(f.soil_ph_level ?? [])].sort(byYearQuarter);
  if (rows.length === 0) return <EmptySection label="No soil pH readings." />;
  return (
    <div className="space-y-4">
      <DataGrid
        rows={rows}
        getRowKey={(r, i) => `${r.year}-${r.quarter}-${i}`}
        columns={[
          { header: 'Quarter', render: (r) => quarterLabel(r.year, r.quarter) },
          { header: 'Reading Date', render: (r) => fmt(r.reading_date) },
          { header: 'pH Reading', align: 'right', render: (r) => fmt(r.meter_reading) },
          {
            header: 'Meter Image',
            render: (r) =>
              r.meter_image ? (
                <a
                  href={r.meter_image}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  View ↗
                </a>
              ) : (
                '—'
              ),
          },
        ]}
      />
    </div>
  );
}

/* ------------------------------ Temperature / Humidity ------------------------------ */

export function TempHumiditySection({ forest: f }: Props) {
  const rows = [...(f.temperature_humidity ?? [])].sort(byYearQuarter);
  if (rows.length === 0) return <EmptySection label="No temperature / humidity readings." />;
  return (
    <DataGrid
      rows={rows}
      getRowKey={(r, i) => `${r.year}-${r.quarter}-${i}`}
      columns={[
        { header: 'Quarter', render: (r) => quarterLabel(r.year, r.quarter) },
        { header: 'Reading Date', render: (r) => fmt(r.reading_date) },
        { header: 'In Temp', align: 'right', render: (r) => fmt(r.inside_plantation?.temperature) },
        {
          header: 'In Humidity',
          align: 'right',
          render: (r) => fmt(r.inside_plantation?.humidity),
        },
        {
          header: 'Out Temp',
          align: 'right',
          render: (r) => fmt(r.outside_plantation?.temperature),
        },
        {
          header: 'Out Humidity',
          align: 'right',
          render: (r) => fmt(r.outside_plantation?.humidity),
        },
      ]}
    />
  );
}

/* ------------------------------ Plant Growth ------------------------------ */

export function PlantGrowthSection({ forest: f }: Props) {
  const g = f.plant_growth_data;
  const target = g?.target_height_range ?? [];
  const actual = [...(g?.actual_height_range ?? [])].sort(byYearQuarter);
  if (target.length === 0 && actual.length === 0) {
    return <EmptySection label="No plant growth data." />;
  }
  return (
    <div className="space-y-6">
      {target.length > 0 ? (
        <div>
          <SubTitle>Target Height Range (by project year)</SubTitle>
          <DataGrid
            rows={[...target].sort((a, b) => (a.year ?? 0) - (b.year ?? 0))}
            getRowKey={(r, i) => `t-${r.year}-${i}`}
            columns={[
              { header: 'Year', render: (r) => fmt(r.year) },
              { header: 'Min (m)', align: 'right', render: (r) => fmt(r.min) },
              { header: 'Max (m)', align: 'right', render: (r) => fmt(r.max) },
            ]}
          />
        </div>
      ) : null}
      {actual.length > 0 ? (
        <div>
          <SubTitle>Actual Height Range (quarterly)</SubTitle>
          <DataGrid
            rows={actual}
            getRowKey={(r, i) => `a-${r.year}-${r.quarter}-${i}`}
            columns={[
              { header: 'Quarter', render: (r) => quarterLabel(r.year, r.quarter) },
              { header: 'Min (m)', align: 'right', render: (r) => fmt(r.min) },
              { header: 'Max (m)', align: 'right', render: (r) => fmt(r.max) },
            ]}
          />
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------ Plantation Progress ------------------------------ */

export function PlantationProgressSection({ forest: f }: Props) {
  const rows = [...(f.plantation_progress ?? [])].sort(byYearQuarter);
  if (rows.length === 0) return <EmptySection label="No plantation progress images." />;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {rows.map((p, i) => (
        <Thumb
          key={`${p.year}-${p.quarter}-${i}`}
          src={p.image}
          alt={`Plantation progress ${quarterLabel(p.year, p.quarter)}`}
          caption={quarterLabel(p.year, p.quarter)}
        />
      ))}
    </div>
  );
}

/* ------------------------------ Security & Infrastructure ------------------------------ */

export function SecuritySection({ forest: f }: Props) {
  const s = f.security_and_infrastructure;
  const images = s?.image_data ?? [];
  if (!s || (!s.description && images.length === 0)) {
    return <EmptySection label="No security / infrastructure data." />;
  }
  return (
    <div className="space-y-4">
      {s.description ? <Field label="Description">{s.description}</Field> : null}
      {images.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((it, i) => (
            <Thumb
              key={i}
              src={it.image}
              alt={it.name ?? 'Security image'}
              caption={[it.name, it.description].filter(Boolean).join(' — ') || undefined}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------ Species & Health ------------------------------ */

export function SpeciesSection({ forest: f }: Props) {
  const sd = f.species_details;
  if (!sd) return <EmptySection label="No species health data." />;
  return (
    <FieldGrid>
      <Field label="Health">{enumLabel(sd.health, {}, sd.health_other)}</Field>
      <Field label="Mortality Rate">{fmt(sd.mortality_rate)}</Field>
      <Field label="Other Issues">{fmt(sd.other_issues)}</Field>
      <Field label="Additional Scope">{fmt(sd.additional_scope)}</Field>
    </FieldGrid>
  );
}

/* ------------------------------ Report Images ------------------------------ */

export function ReportImagesSection({ forest: f }: Props) {
  const slides = f.report_images ?? [];
  const dash = f.dashboard_images ?? [];
  if (slides.length === 0 && dash.length === 0) {
    return <EmptySection label="No report or dashboard images." />;
  }
  return (
    <div className="space-y-6">
      {slides.length > 0 ? (
        <div>
          <SubTitle>Report Slides</SubTitle>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {slides.map((s, i) => (
              <Thumb
                key={i}
                src={s.image}
                alt={`Report slide ${i + 1}`}
                caption={
                  REPORT_SLIDE_TYPE_LABELS[s.slide_type as ReportSlideType] ??
                  humanize(s.slide_type ?? '')
                }
              />
            ))}
          </div>
        </div>
      ) : null}
      {dash.length > 0 ? (
        <div>
          <SubTitle>Dashboard Images</SubTitle>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {dash.map((d, i) => (
              <Thumb
                key={i}
                src={d.image}
                alt={d.name ?? `Dashboard image ${i + 1}`}
                caption={[d.name, d.description].filter(Boolean).join(' — ') || undefined}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
