/**
 * Slides 1–7: Cover, Contents, OSR Land, Permission Letter, Area & Population,
 * Project Impact, Beneficiaries. Pixel-matched to the CGI PDF, data-driven,
 * empty-safe (missing fields render —).
 */
import type { ReactNode } from 'react';
import type { SlideProps } from '../reportTypes';
import {
  C, Breadcrumb, ClientMark, SectionTitle, SlidePage, StatCard, ReportImage, EmptyBlock,
  ReportFooter, Pill, TintIcon, ConicRing, CARD_SHADOW, dash, numOrDash, fmtDate, enumLabel,
} from '../reportPrimitives';

const pill = (children: ReactNode, filled = false): ReactNode => <Pill filled={filled}>{children}</Pill>;

const areaIcon = <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3h18v18H3z" /><path d="M3 9h18M9 3v18" /></svg>;
const userIcon = <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></svg>;
const treeIcon = <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22v-6M8 16a4 4 0 0 1-1-7 5 5 0 0 1 10 0 4 4 0 0 1-1 7z" /></svg>;
const peopleIcon = <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="8" r="3" /><circle cx="17" cy="9" r="2.5" /><path d="M3 20c0-3 3-5 6-5s6 2 6 5M15 20c0-2 2-3.5 4-3.5" /></svg>;
const chartIcon = <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg>;

const calIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
);
const pinIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
);

function LogoCard({ caption, name, logo }: { caption: string; name?: string; logo?: string }) {
  return (
    <div style={{ border: `1px solid ${C.line}`, borderRadius: 16, padding: '14px 22px', textAlign: 'center', minWidth: 200, background: '#fff' }}>
      <div style={{ fontSize: 13, color: C.muted, marginBottom: 10 }}>{caption}</div>
      {logo ? <img src={logo} alt="" style={{ height: 40, objectFit: 'contain' }} />
        : <div style={{ fontSize: 18, fontWeight: 800, color: C.ink }}>{dash(name)}</div>}
    </div>
  );
}

const findLogo = (data: SlideProps['data'], value: string) =>
  (data.forest.additional_sponsor_logo ?? []).find((l) => l.type?.value === value);

/**
 * Cover text is data-driven (any forest name / description length), so the title
 * auto-sizes to the content — long text shrinks to fit the cover instead of
 * overflowing, short text stays large. Name + description share this size.
 */
function fitHeadline(text: string | null | undefined): number {
  const n = (text ?? '').trim().length;
  if (n > 80) return 26;
  if (n > 60) return 30;
  if (n > 44) return 36;
  if (n > 30) return 42;
  return 46;
}

/* ----------------------------- Slide 1: Cover ----------------------------- */
export function S01Cover({ data }: SlideProps) {
  const { meta, forest, computed } = data;
  // Cover hero: the report's first-slide image, falling back to the first
  // dashboard image when no dedicated cover image was uploaded.
  const hero = forest.report_images?.find((r) => r.slide_type === 'first_slide')?.image
    ?? forest.dashboard_images?.[0]?.image;
  const initiated = findLogo(data, 'initiated_by');
  const sponsors = (forest.additional_sponsor_logo ?? []).filter((l) => l.type?.value !== 'initiated_by');
  const logoCards: { caption: string; name?: string; logo?: string }[] = [
    { caption: initiated?.type?.label || 'Initiated by', name: initiated?.name, logo: initiated?.logo },
    ...(sponsors.length
      ? sponsors.map((s) => ({ caption: s.type?.label || 'Sponsored by', name: s.name, logo: s.logo }))
      : [{ caption: 'Sponsored by', name: meta.client_name ?? undefined, logo: meta.client_logo ?? undefined }]),
  ];
  // Forest name + description render at the SAME size; auto-fit to whichever is
  // longer so both stay large yet neither overflows the cover.
  const longest = (forest.forest_name ?? '').length >= (forest.forest_desc ?? '').length
    ? forest.forest_name
    : forest.forest_desc;
  const titleSize = fitHeadline(longest);
  return (
    <SlidePage meta={meta} bare>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22 }}>
        <Breadcrumb meta={meta} />
        <span style={{ flex: 1, height: 1, background: C.line }} />
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: C.muted, fontSize: 14 }}>{calIcon} Report Dated : {meta.report_date}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 36, flex: 1 }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {/* Forest name (dark) + description (green) at the SAME size. No
              client/sponsor name on the cover — sponsor shows only in the card below. */}
          <div style={{ fontSize: titleSize, lineHeight: 1.08, fontWeight: 800, color: C.ink, maxWidth: 540 }}>{dash(forest.forest_name)}</div>
          {forest.forest_desc ? (
            <h1 style={{ fontSize: titleSize, lineHeight: 1.08, fontWeight: 800, color: C.green, margin: '4px 0 0', maxWidth: 540 }}>{forest.forest_desc}</h1>
          ) : null}

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 22 }}>
            {pill(`${meta.quarter_label} Quarterly Report`)}
            {pill(meta.period_label)}
            {forest.forest_city ? pill(dash(forest.forest_city)) : null}
          </div>
          <div style={{ marginTop: 12 }}>{pill(`${numOrDash(computed.total_saplings)} Saplings`, true)}</div>

          <div style={{ borderTop: `1px solid ${C.line}`, margin: '24px 0 18px' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ width: 44, height: 44, borderRadius: '50%', background: C.greenSoft, color: C.green, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{pinIcon}</span>
            <div style={{ fontSize: 17, color: C.body }}>Plantation Done : <strong style={{ color: C.ink }}>{meta.plantation_label}</strong></div>
          </div>
        </div>

        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}>
          <ReportImage src={hero} height={undefined} label="Cover image" style={{ flex: 1, minHeight: 0 }} />
          <div style={{ position: 'absolute', left: 18, right: 18, bottom: 18, background: 'rgba(255,255,255,.94)', borderRadius: 14, padding: '14px 18px' }}>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>Project Site</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.ink, lineHeight: 1.4 }}>{dash(forest.project_site || forest.forest_address)}</div>
            {forest.project_site && forest.forest_address ? (
              <div style={{ fontSize: 12, color: C.muted, marginTop: 2, lineHeight: 1.4 }}>{forest.forest_address}</div>
            ) : null}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, justifyContent: logoCards.length > 2 ? 'flex-start' : 'space-between', alignItems: 'center', marginTop: 18 }}>
        {logoCards.map((c, i) => <LogoCard key={i} caption={c.caption} name={c.name} logo={c.logo} />)}
      </div>
    </SlidePage>
  );
}

/* --------------------------- Slide 2: Contents --------------------------- */
const tocRows = (area: string): [string, string][] => [
  ['Description: OSR Land', '03'], ['Permission Letter', '04'], [`Area and Population Statistics of ${area}`, '05'],
  ['Project Impact And Outcome', '06'], ['Description: Direct And Indirect Beneficiaries', '07'],
  ['Forest Value Flow Impact Report', '08'], ['Approximate Forest Value in 3, 5, 10 Years', '09'],
  ['Maintenance Summary', '10'], ['Workforce Contribution & Effort Analysis', '11'],
  ['Workforce Contribution & Effort Analysis Till Date', '12'], ['Expected Plant Growth', '13'],
  ['Site Master Plan', '14'], ['Description: Soil pH Level', '15'], ['Description: Temperature', '16'],
  [`Environmental Need Indicators of ${area}`, '17'], ['Saplings Planted & Species Inventory', '18'],
  ['Score Card With GRI Framework Integration', '19'], ['Site Security & Infrastructure', '20'],
  ['Transforming Landscapes: Plantation Progress', '21'],
  ['Photo Gallery', '22'],
];
export function S02Contents({ data }: SlideProps) {
  const { meta, forest } = data;
  const hero = forest.report_images?.find((r) => r.slide_type === 'content_slide')?.image;
  const area = forest.area_population_statistics_details?.region_name?.trim() || dash(forest.forest_city);
  const TOC = tocRows(area);
  return (
    <SlidePage meta={meta} bare>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22 }}>
        <Breadcrumb meta={meta} /><span style={{ flex: 1, height: 1, background: C.line }} /><ClientMark meta={meta} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '0.7fr 1.3fr', gridTemplateRows: 'minmax(0, 1fr)', gap: 34, flex: 1, minHeight: 0 }}>
        <ReportImage src={hero} label="Contents image" style={{ height: '100%' }} />
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 18 }}>
            <h2 style={{ fontSize: 30, fontWeight: 800, color: C.ink, margin: 0 }}>Contents</h2>
            <span style={{ flex: 1, height: 3, borderRadius: 2, background: `linear-gradient(90deg, ${C.green}, ${C.greenSoft})` }} />
          </div>
          {TOC.map(([t, p]) => (
            <div key={p} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: `1px solid ${C.line}`, fontSize: 12.5, color: C.body }}>
              <span>{t}</span><span style={{ color: C.muted }}>{p}</span>
            </div>
          ))}
        </div>
      </div>
      <ReportFooter />
    </SlidePage>
  );
}

/* --------------------------- Slide 3: OSR Land --------------------------- */
export function S03OsrLand({ data }: SlideProps) {
  const { meta, forest } = data;
  const o = forest.land_ownership;
  const a = forest.land_area;
  // Maintenance progress = elapsed months since plantation / (project_period years × 12).
  let progress = 0;
  if (forest.plantation_date && forest.project_period) {
    const months = (meta.year - new Date(forest.plantation_date).getFullYear()) * 12 + (meta.quarter * 3) - (new Date(forest.plantation_date).getMonth() + 1);
    progress = Math.max(0, Math.min(100, Math.round((months / (forest.project_period * 12)) * 1000) / 10));
  }
  const tech: [string, string][] = [
    ['Google Coordinates', forest.forest_geo_lat && forest.forest_geo_long ? `${forest.forest_geo_lat}, ${forest.forest_geo_long}` : '—'],
    ['Supervisor', dash(meta.supervisor)],
    ['Forest ID', dash(forest.forest_unique_id)],
    ['Irrigation Method', enumLabel(forest.irrigation_method === 'others' ? forest.irrigation_method_other : forest.irrigation_method)],
    ['Climate', dash(forest.climate === 'others' ? forest.climate_other : forest.climate)],
    ['Soil Type', enumLabel(forest.soil_type === 'others' ? forest.soil_type_other : forest.soil_type)],
    ['Digipin', dash(forest.digipin)],
  ];
  return (
    <SlidePage meta={meta}>
      <SectionTitle>Description: OSR Land</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 1fr', gridTemplateRows: 'minmax(0, 1fr)', gap: 24, flex: 1, minHeight: 0 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <StatCard label="Site Location" tint="green" icon={pinIcon} value={dash(forest.forest_city)} sub={[forest.forest_state, forest.forest_country].filter(Boolean).join(', ') || '—'} />
            <StatCard label="Land Ownership" tint="blue" icon={userIcon} value={dash(o?.name)} sub={enumLabel(o?.agreement_status)} />
            <StatCard label="Total Land Area" tint="orange" icon={areaIcon} value={a?.total_area != null ? numOrDash(a.total_area) : '—'} unit="ft²" sub={a?.planted_area != null ? `${numOrDash(a.planted_area)} ft² planted` : undefined} />
            <div style={{ border: `1px solid ${C.line}`, borderRadius: 16, padding: '14px 16px', background: '#fff', boxShadow: CARD_SHADOW, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: C.muted, fontWeight: 600 }}>Project Status</div>
                <div style={{ fontSize: 19, fontWeight: 700, color: C.green, marginTop: 6 }}>Active</div>
                <div style={{ fontSize: 12.5, color: C.muted }}>● Maintenance</div>
              </div>
              <ConicRing pct={progress} size={54} />
            </div>
          </div>
          <StatCard label="Plantation Strategy" tint="green" icon={treeIcon} value={enumLabel(forest.plantation_strategy === 'others' ? forest.plantation_strategy_other : forest.plantation_strategy)} />
          <div style={{ border: `1px solid ${C.line}`, borderRadius: 16, padding: '12px 18px', flex: 1, minHeight: 0, background: '#fff', boxShadow: CARD_SHADOW }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <strong style={{ fontSize: 15, color: C.ink }}>Technical Specifications</strong>
              <span style={{ fontSize: 11.5, color: C.muted, background: C.greenSoft, borderRadius: 999, padding: '4px 12px' }}>Last Inspection : {fmtDate(forest.last_inspection_date)}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 18px' }}>
              {tech.map(([k, v]) => (
                <div key={k}><div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.04em', color: C.muted }}>{k}</div><div style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>{v}</div></div>
              ))}
            </div>
          </div>
        </div>
        <div style={{ borderRadius: 14, overflow: 'hidden', border: `1px solid ${C.line}` }}>
          <EmptyBlock label={`Site map · ${dash(forest.forest_geo_lat)}, ${dash(forest.forest_geo_long)}`} height={460} />
        </div>
      </div>
    </SlidePage>
  );
}

/* ------------------------ Slide 4: Permission Letter ------------------------ */
export function S04Permission({ data }: SlideProps) {
  const { meta, forest } = data;
  const au = forest.authorization_details;
  const row = (n: string, label: string, value: ReactNode) => (
    <div style={{ display: 'flex', gap: 14, padding: '14px 0', borderBottom: `1px solid ${C.line}` }}>
      <span style={{ flexShrink: 0, width: 34, height: 34, borderRadius: 8, background: C.greenSoft, color: C.green, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>{n}</span>
      <div><div style={{ fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '.05em', color: C.muted }}>{label}</div><div style={{ fontSize: 15, fontWeight: 700, color: C.ink, marginTop: 2 }}>{value}</div></div>
    </div>
  );
  return (
    <SlidePage meta={meta}>
      <div style={{ display: 'grid', gridTemplateColumns: '0.9fr 1.1fr', gridTemplateRows: 'minmax(0, 1fr)', gap: 34, flex: 1, minHeight: 0 }}>
        <ReportImage src={forest.permission_letter} label="Permission letter" style={{ height: '100%' }} />
        <div>
          <SectionTitle>Permission Letter</SectionTitle>
          <div style={{ fontSize: 13.5, color: C.muted, marginTop: -10, marginBottom: 16 }}>Official authorization document for the reforestation project.</div>
          <div style={{ border: `1px solid ${C.line}`, borderRadius: 16, padding: '6px 20px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 0', color: C.ink, fontWeight: 700, fontSize: 16 }}>
              <span style={{ color: C.green }}>ⓘ</span> Document Details
            </div>
            {row('1', 'Authorized By', <>{dash(au?.authorized_by_name)}<div style={{ fontSize: 12.5, fontWeight: 500, color: C.muted }}>{dash(au?.authorized_by_designation)}</div></>)}
            {row('2', 'Authorized Date', fmtDate(au?.authorized_date))}
            {row('3', 'Authorized Period', au?.authorized_period != null && String(au.authorized_period).trim() !== '' ? `${au.authorized_period} Year${Number(au.authorized_period) === 1 ? '' : 's'}` : '—')}
          </div>
          <div style={{ marginTop: 14, background: C.greenSoft, borderRadius: 12, padding: '12px 16px' }}>
            <div style={{ fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '.05em', color: C.greenDark, fontWeight: 700, marginBottom: 4 }}>Project Context</div>
            <div style={{ fontSize: 13.5, color: C.body }}>{dash(au?.project_context)}</div>
          </div>
        </div>
      </div>
    </SlidePage>
  );
}

/* --------------------- Slide 5: Area & Population --------------------- */
export function S05AreaPopulation({ data }: SlideProps) {
  const { meta, forest } = data;
  const ap = forest.area_population_statistics_details;
  return (
    <SlidePage meta={meta}>
      <SectionTitle>Area and Population Statistics of {ap?.region_name?.trim() || dash(forest.forest_city)}</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
        <StatCard label="Total Jurisdiction Area" tint="green" icon={areaIcon} value={ap?.total_jurisdiction_area != null ? numOrDash(ap.total_jurisdiction_area) : '—'} unit="km²" />
        <StatCard label="Population" tint="blue" icon={peopleIcon} value={ap?.population != null ? `~${numOrDash(ap.population)}` : '—'} />
        <StatCard label="Population Density" tint="purple" icon={chartIcon} value={ap?.population_density != null ? numOrDash(ap.population_density) : '—'} unit="/km²" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 16, marginTop: 16 }}>
        <StatCard label="Green Cover" tint="green" icon={treeIcon} value={<span style={{ fontSize: 15, fontWeight: 600 }}>{dash(ap?.green_cover)}</span>} />
        <StatCard label="Environmental Need" tint="orange" icon={treeIcon} value={<span style={{ fontSize: 15, fontWeight: 600 }}>{dash(ap?.environmental_need)}</span>} />
      </div>
      <div style={{ marginTop: 20, flex: 1, minHeight: 0 }}>
        <div style={{ fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '.06em', color: C.muted, marginBottom: 10 }}>Timeline of urban change</div>
        <div style={{ display: 'flex', gap: 14 }}>
          {(ap?.google_earth_image?.length ? ap.google_earth_image : [{}, {}, {}]).map((g, i) => (
            <div key={i} style={{ flex: 1 }}>
              <ReportImage src={g.image} height={150} label="Earth image" />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 6 }}>
                <strong style={{ color: C.ink }}>{dash(g.year)}</strong><span style={{ color: C.muted }}>pop {numOrDash(g.population)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </SlidePage>
  );
}

/* --------------------- Slide 6: Project Impact --------------------- */
const IMPACTS = [
  'Restore lost green cover', 'Reduce temperature', 'Lower noise & dust pollution', 'Naturally cool & clean air',
  'Stronger communities', 'Natural habitat & biodiversity', 'Enrich soil quality', 'Enhance surface water', "A place with nature's magic",
];
const SDG = [
  ['1', 'No Poverty', '#e5243b'], ['3', 'Good Health', '#4c9f38'], ['8', 'Decent Work', '#a21942'],
  ['9', 'Industry', '#fd6925'], ['13', 'Climate Action', '#3f7e44'], ['15', 'Life on Land', '#56c02b'], ['17', 'Partnerships', '#19486a'],
];
export function S06ProjectImpact({ data }: SlideProps) {
  const { meta, forest } = data;
  const img = forest.report_images?.find((r) => r.slide_type === 'project_impact_slide')?.image;
  return (
    <SlidePage meta={meta}>
      <SectionTitle eyebrow="Impact Report">Project Impact And Outcome</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12 }}>
        {IMPACTS.map((t) => (
          <div key={t} style={{ border: `1px solid ${C.line}`, borderRadius: 12, padding: '14px 12px', display: 'flex', flexDirection: 'column', gap: 10, minHeight: 86 }}>
            <span style={{ width: 30, height: 30, borderRadius: 8, background: C.greenSoft, color: C.green, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l2 6h6l-5 4 2 7-7-4-7 4 2-7-5-4h6z" /></svg>
            </span>
            <span style={{ fontSize: 12.5, color: C.body, lineHeight: 1.35 }}>{t}</span>
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '0.8fr 1.2fr', gridTemplateRows: 'minmax(0, 1fr)', gap: 22, marginTop: 22, flex: 1, minHeight: 0 }}>
        <ReportImage src={img} label="Impact image" style={{ height: '100%' }} />
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ fontSize: 20, color: C.body, lineHeight: 1.5 }}>
            The plantation has led to <span style={{ color: C.green, fontWeight: 700 }}>significant ecological improvements</span>, including enhanced green cover, biodiversity growth, and carbon sequestration.
          </div>
          <div style={{ fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '.06em', color: C.muted, margin: '20px 0 10px' }}>Sustainable Development Goals</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {SDG.map(([n, name, col]) => (
              <div key={n} style={{ width: 76, height: 76, borderRadius: 8, background: col, color: '#fff', padding: 8, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 16, fontWeight: 800 }}>{n}</span><span style={{ fontSize: 9.5, fontWeight: 700, lineHeight: 1.1 }}>{name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </SlidePage>
  );
}

/* --------------------- Slide 7: Beneficiaries --------------------- */
export function S07Beneficiaries({ data }: SlideProps) {
  const { meta, forest, computed } = data;
  const b = forest.direct_and_indirect_beneficiaries;
  const pad2 = (v: unknown) => { const n = Number(v); return Number.isFinite(n) ? String(n).padStart(2, '0') : '—'; };
  const direct = [
    ['Site Supervisor', 'Leadership & on-ground coordination', pad2(b?.site_supervisor)],
    ['Watering Team', 'Full-time dedication', pad2(b?.watering_team)],
    ['De-weeding Crew', 'Part-time contribution', pad2(b?.de_weeding_crew)],
    ['Plant Health Specialist', 'Pest & disease management', pad2(b?.plant_health_specialist)],
  ];
  const indirect: [string, string, string, 'green' | 'blue' | 'orange' | 'purple' | 'red'][] = [
    ['People Visiting', dash(b?.people_visiting), 'Visitors & recreational users', 'green'],
    ['People Living Near', dash(b?.people_living_near), 'Within 5km radius of the site', 'orange'],
    ['Educational Hubs', dash(b?.schools_colleges), 'Local schools & colleges', 'purple'],
    ['Trees Planted', numOrDash(computed.total_saplings), 'Enhancing local biodiversity', 'red'],
  ];
  return (
    <SlidePage meta={meta}>
      <SectionTitle eyebrow="Key roles and contributions">Description: Direct And Indirect Beneficiaries</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
        {direct.map(([t, s, v]) => (
          <div key={t} style={{ border: `1px solid ${C.line}`, borderRadius: 16, padding: '16px 18px', background: '#fff', boxShadow: CARD_SHADOW }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.ink }}>{t}</div>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.04em', color: C.muted, margin: '4px 0 8px' }}>{s}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: C.green }}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, margin: '20px 0 14px' }}>
        <h3 style={{ fontSize: 20, fontWeight: 800, color: C.ink, margin: 0 }}>Indirect Reach Metrics</h3>
        <span style={{ flex: 1, height: 3, borderRadius: 2, background: `linear-gradient(90deg, ${C.green}, ${C.greenSoft})` }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
        {indirect.map(([t, v, s, tint]) => (
          <div key={t} style={{ border: `1px solid ${C.line}`, borderRadius: 16, padding: '16px 18px', background: '#fff', boxShadow: CARD_SHADOW }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: C.green }}>{v}</div>
              <TintIcon tint={tint} size={36}>{treeIcon}</TintIcon>
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.ink, marginTop: 8 }}>{t}</div>
            <div style={{ fontSize: 11.5, color: C.muted, marginTop: 4 }}>{s}</div>
          </div>
        ))}
      </div>
    </SlidePage>
  );
}
