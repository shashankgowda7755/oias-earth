/**
 * PFA photo uploader (/pfa, admin) — mobile-first, multi-page. Pick a forest,
 * then a simple menu routes to focused pages: Site photos (once), This quarter,
 * Sponsors & logos. Tap an empty tile → action sheet (camera / file) → preview
 * → upload (Vercel Blob). Tap a filled tile → preview with Replace / Delete.
 * One screen at a time = uncluttered on a phone; reflows fine on desktop.
 */
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '@/components/Toast';
import { fetchForestReport } from '@/lib/publicApi';
import { uploadReportImage, clearReportImage, uploadSponsorLogo, deleteSponsorLogo } from '../Forests/forestApi';
import { fetchForestOptions, type ForestOption } from '../Reports/reportApi';

interface Slot { key: string; label: string; perQuarter?: boolean }
interface LogoRow { title: string; name: string; value: 'sponsored_by' | 'initiated_by'; logo?: string; serverIndex: number }
type Page = 'pick' | 'menu' | 'site' | 'quarter' | 'sponsors';

const SITE_SLOTS: Slot[] = [
  { key: 'cover', label: 'Cover' },
  { key: 'content', label: 'Contents' },
  { key: 'impact', label: 'Impact' },
  { key: 'permission', label: 'Permission' },
  { key: 'layout', label: 'Site layout' },
  { key: 'earth', label: 'Aerial / map' },
  { key: 'security', label: 'Security' },
  { key: 'dashboard', label: 'Dashboard' },
];
const QUARTER_SLOTS: Slot[] = [
  { key: 'soil_meter', label: 'Soil meter', perQuarter: true },
  { key: 'temp_inside', label: 'Inside', perQuarter: true },
  { key: 'temp_outside', label: 'Outside', perQuarter: true },
  { key: 'progress', label: 'Progress', perQuarter: true },
  { key: 'gallery', label: 'Gallery', perQuarter: true },
];

function defaultFiscal(): { year: number; quarter: number } {
  const d = new Date(); const m = d.getMonth();
  if (m >= 3 && m <= 5) return { year: d.getFullYear(), quarter: 1 };
  if (m >= 6 && m <= 8) return { year: d.getFullYear(), quarter: 2 };
  if (m >= 9) return { year: d.getFullYear(), quarter: 3 };
  return { year: d.getFullYear() - 1, quarter: 4 };
}

type Rec = Record<string, unknown>;
const pickQ = (arr: unknown, y: number, q: number): Rec | undefined =>
  Array.isArray(arr) ? (arr as Rec[]).find((r) => Number(r.year) === y && Number(r.quarter) === q) : undefined;

function seedFromForest(forest: Rec, y: number, q: number): Record<string, string> {
  const out: Record<string, string> = {};
  const ri = (forest.report_images as { slide_type?: string; image?: string }[]) ?? [];
  const byType = (t: string) => ri.find((r) => r.slide_type === t)?.image;
  if (byType('first_slide')) out.cover = byType('first_slide')!;
  if (byType('content_slide')) out.content = byType('content_slide')!;
  if (byType('project_impact_slide')) out.impact = byType('project_impact_slide')!;
  if (forest.permission_letter) out.permission = String(forest.permission_letter);
  if (forest.site_layout) out.layout = String(forest.site_layout);
  const earth = (forest.area_population_statistics_details as Rec)?.google_earth_image as unknown[] | undefined;
  if (Array.isArray(earth) && earth[0]) out.earth = String(earth[0]);
  const sec = (forest.security_and_infrastructure as Rec)?.image_data as { image?: string }[] | undefined;
  if (Array.isArray(sec) && sec[0]?.image) out.security = sec[0].image!;
  const dash = forest.dashboard_images as { image?: string }[] | undefined;
  if (Array.isArray(dash) && dash[0]?.image) out.dashboard = dash[0].image!;
  const soil = pickQ(forest.soil_ph_level, y, q);
  if (soil?.meter_image) out.soil_meter = String(soil.meter_image);
  const th = pickQ(forest.temperature_humidity, y, q);
  if ((th?.inside_plantation as Rec)?.image) out.temp_inside = String((th!.inside_plantation as Rec).image);
  if ((th?.outside_plantation as Rec)?.image) out.temp_outside = String((th!.outside_plantation as Rec).image);
  const prog = pickQ(forest.plantation_progress, y, q);
  if (prog?.image) out.progress = String(prog.image);
  const gal = pickQ(forest.gallery_images, y, q);
  if (gal?.image) out.gallery = String(gal.image);
  return out;
}

export default function PfaUploader() {
  const toast = useToast();
  const fiscal = defaultFiscal();
  const [forests, setForests] = useState<ForestOption[]>([]);
  const [forestId, setForestId] = useState('');
  const [year, setYear] = useState(fiscal.year);
  const [quarter, setQuarter] = useState(fiscal.quarter);
  const [page, setPage] = useState<Page>('pick');
  const [status, setStatus] = useState<Record<string, string>>({});
  const [logos, setLogos] = useState<LogoRow[]>([]);
  const [pending, setPending] = useState<{ slot: Slot; url: string; file: File } | null>(null);
  const [sheet, setSheet] = useState<Slot | null>(null);
  const [view, setView] = useState<Slot | null>(null); // filled-photo preview
  const [navOpen, setNavOpen] = useState(false);
  // camera
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInput = useRef<HTMLInputElement | null>(null);
  const fileSlot = useRef<Slot | null>(null);
  const logoInput = useRef<HTMLInputElement | null>(null);
  const logoIdx = useRef<number>(-1);
  const [camSlot, setCamSlot] = useState<Slot | null>(null);
  const [facing, setFacing] = useState<'environment' | 'user'>('environment');
  const [camErr, setCamErr] = useState<string | null>(null);

  useEffect(() => { fetchForestOptions().then(setForests).catch(() => undefined); }, []);

  useEffect(() => {
    if (!forestId) { setStatus({}); setLogos([]); return; }
    let alive = true;
    fetchForestReport(forestId, year, quarter)
      .then((r) => {
        if (!alive) return;
        const f = (r.forest as Rec) ?? {};
        setStatus(seedFromForest(f, year, quarter));
        const raw = (f.additional_sponsor_logo as { type?: { label?: string; value?: string }; name?: string; logo?: string }[]) ?? [];
        setLogos(raw.map((l, i) => ({
          title: l.type?.label || (l.type?.value === 'initiated_by' ? 'Initiated By' : 'Sponsored By'),
          name: l.name ?? '', value: l.type?.value === 'initiated_by' ? 'initiated_by' : 'sponsored_by', logo: l.logo, serverIndex: i,
        })));
      })
      .catch(() => undefined);
    return () => { alive = false; };
  }, [forestId, year, quarter]);

  const isUrl = (v?: string) => !!v && v !== 'uploading' && v !== 'error';
  const count = (slots: Slot[]) => slots.filter((s) => isUrl(status[s.key])).length;
  const filled = count(SITE_SLOTS) + count(QUARTER_SLOTS);
  const total = SITE_SLOTS.length + QUARTER_SLOTS.length;

  const stopStream = () => { streamRef.current?.getTracks().forEach((t) => t.stop()); streamRef.current = null; };
  const closeCam = () => { stopStream(); setCamSlot(null); setCamErr(null); };

  useEffect(() => {
    if (!camSlot) return;
    let cancelled = false; setCamErr(null);
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: facing } }, audio: false });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play().catch(() => undefined); }
      } catch (e) { setCamErr(e instanceof Error ? e.message : 'Camera unavailable. Use a file instead.'); }
    })();
    return () => { cancelled = true; stopStream(); };
  }, [camSlot, facing]);

  const stage = (slot: Slot, file?: File | null) => {
    if (!file) return;
    setPending((p) => { if (p) URL.revokeObjectURL(p.url); return { slot, url: URL.createObjectURL(file), file }; });
  };
  const clearPending = () => setPending((p) => { if (p) URL.revokeObjectURL(p.url); return null; });

  const snap = () => {
    const v = videoRef.current; const slot = camSlot;
    if (!v || !slot || !v.videoWidth) return;
    const canvas = document.createElement('canvas');
    canvas.width = v.videoWidth; canvas.height = v.videoHeight;
    canvas.getContext('2d')?.drawImage(v, 0, 0);
    canvas.toBlob((blob) => { if (!blob) return; stage(slot, new File([blob], `${slot.key}-${Date.now()}.jpg`, { type: 'image/jpeg' })); closeCam(); }, 'image/jpeg', 0.92);
  };

  const commit = async () => {
    if (!pending || !forestId) { if (!forestId) toast.error('Pick a forest first.'); return; }
    const { slot, file } = pending;
    setStatus((s) => ({ ...s, [slot.key]: 'uploading' }));
    clearPending();
    try {
      const r = await uploadReportImage(forestId, slot.key, file, slot.perQuarter ? { year, quarter } : undefined);
      setStatus((s) => ({ ...s, [slot.key]: r.url }));
      toast.success(`${slot.label} uploaded.`);
    } catch (e) {
      setStatus((s) => ({ ...s, [slot.key]: 'error' }));
      toast.error(e instanceof Error ? e.message : 'Upload failed.');
    }
  };

  const deletePhoto = async (slot: Slot) => {
    setView(null);
    const prev = status[slot.key];
    setStatus((s) => ({ ...s, [slot.key]: '' }));
    try {
      await clearReportImage(forestId, slot.key, slot.perQuarter ? { year, quarter } : undefined);
      toast.success(`${slot.label} removed.`);
    } catch (e) {
      setStatus((s) => ({ ...s, [slot.key]: prev ?? '' }));
      toast.error(e instanceof Error ? e.message : 'Delete failed.');
    }
  };

  // logos
  const patchLogo = (i: number, p: Partial<LogoRow>) => setLogos((ls) => ls.map((r, j) => (j === i ? { ...r, ...p } : r)));
  const addSponsor = () => setLogos((ls) => [...ls, { title: 'Sponsored By', name: '', value: 'sponsored_by', serverIndex: -1 }]);
  const persistLogo = async (i: number, file?: File | null) => {
    if (!forestId) return;
    const row = logos[i]; if (!row) return;
    try {
      const res = await uploadSponsorLogo(forestId, { title: row.title, name: row.name, value: row.value, index: row.serverIndex, file });
      setLogos((ls) => ls.map((r, j) => (j === i ? { ...r, serverIndex: res.index, logo: res.logo ?? r.logo } : r)));
      if (file) toast.success('Logo uploaded.');
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Logo save failed.'); }
  };
  const removeSponsor = async (i: number) => {
    const row = logos[i]; if (!row) return;
    try { if (row.serverIndex >= 0) await deleteSponsorLogo(forestId, row.serverIndex); } catch { /* ignore */ }
    setLogos((ls) => ls.filter((_, j) => j !== i).map((r) => (row.serverIndex >= 0 && r.serverIndex > row.serverIndex ? { ...r, serverIndex: r.serverIndex - 1 } : r)));
  };

  const Tile = ({ slot }: { slot: Slot }) => {
    const st = status[slot.key];
    const url = isUrl(st) ? st : null;
    const uploading = st === 'uploading';
    return (
      <button
        type="button"
        onClick={() => (url ? setView(slot) : setSheet(slot))}
        className={`relative flex aspect-square flex-col items-center justify-center gap-1.5 overflow-hidden rounded-card border p-2 text-center transition-colors ${url ? 'border-transparent bg-primary/10' : 'border-border hover:border-primary/60'}`}
      >
        {url ? <img src={url} alt="" className="absolute inset-0 h-full w-full bg-surface object-cover opacity-90" /> : null}
        <span className="relative z-10 flex flex-col items-center gap-1">
          <i className={`ti ${uploading ? 'ti-loader-2' : url ? 'ti-circle-check' : 'ti-camera'} text-[22px] ${url ? 'text-primary' : 'text-textSecondary'}`} aria-hidden="true" />
          <span className={`text-[11px] ${url ? 'rounded bg-black/55 px-1.5 py-0.5 text-white' : 'text-textSecondary'}`}>{slot.label}</span>
        </span>
      </button>
    );
  };

  const go = (p: Page) => {
    setNavOpen(false);
    if (p !== 'pick' && !forestId) { setPage('pick'); return; }
    setPage(p);
  };

  const TopBar = ({ title, onBack }: { title: string; onBack?: () => void }) => (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-appbg/95 px-4 backdrop-blur">
      {onBack ? <button type="button" aria-label="Back" onClick={onBack} className="text-textSecondary hover:text-textPrimary"><i className="ti ti-chevron-left text-xl" aria-hidden="true" /></button>
        : <Link to="/dashboard" aria-label="Dashboard" className="text-textSecondary hover:text-textPrimary"><i className="ti ti-chevron-left text-xl" aria-hidden="true" /></Link>}
      <span className="min-w-0 flex-1 truncate font-serif text-base font-semibold">{title}</span>
      <button type="button" aria-label="Menu" onClick={() => setNavOpen(true)} className="text-primary hover:opacity-80"><i className="ti ti-menu-2 text-xl" aria-hidden="true" /></button>
    </header>
  );

  const forestName = forests.find((f) => f.value === forestId)?.label ?? 'Forest';

  return (
    <div className="min-h-screen bg-appbg text-textPrimary">
      <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (fileSlot.current) stage(fileSlot.current, f); e.target.value = ''; }} />
      <input ref={logoInput} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f && logoIdx.current >= 0) persistLogo(logoIdx.current, f); e.target.value = ''; }} />

      {/* PAGE: pick forest */}
      {page === 'pick' ? (
        <>
          <TopBar title="Photo uploader" />
          <main className="mx-auto max-w-md px-4 py-6">
            <label className="text-sm"><span className="mb-1 block text-textSecondary">Forest</span>
              <select value={forestId} onChange={(e) => setForestId(e.target.value)} className="w-full rounded-button border border-border bg-surface px-3 py-3 text-sm">
                <option value="">Select a forest…</option>
                {forests.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </label>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <label className="text-sm"><span className="mb-1 block text-textSecondary">FY year</span>
                <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="w-full rounded-button border border-border bg-surface px-3 py-3 text-sm">
                  {[fiscal.year - 1, fiscal.year, fiscal.year + 1].map((y) => <option key={y} value={y}>{y}</option>)}
                </select></label>
              <label className="text-sm"><span className="mb-1 block text-textSecondary">Quarter</span>
                <select value={quarter} onChange={(e) => setQuarter(Number(e.target.value))} className="w-full rounded-button border border-border bg-surface px-3 py-3 text-sm">
                  {[1, 2, 3, 4].map((q) => <option key={q} value={q}>Q{q}</option>)}
                </select></label>
            </div>
            <button type="button" disabled={!forestId} onClick={() => setPage('menu')} className="mt-5 w-full rounded-button bg-primary py-3 text-sm font-semibold text-black disabled:opacity-50">Continue →</button>
          </main>
        </>
      ) : null}

      {/* PAGE: menu */}
      {page === 'menu' ? (
        <>
          <TopBar title={forestName} onBack={() => setPage('pick')} />
          <main className="mx-auto max-w-md px-4 py-5">
            <div className="mb-4 flex items-center justify-between rounded-card border border-border bg-surface px-4 py-3">
              <div><div className="text-sm font-medium">Q{quarter} {year}</div><div className="text-xs text-textSecondary">{filled} of {total} photos</div></div>
              <div className="text-lg font-semibold text-primary">{Math.round((filled / total) * 100)}%</div>
            </div>
            {[
              { p: 'site' as Page, icon: 'ti-building-community', label: 'Site photos', sub: 'Enter once', n: count(SITE_SLOTS), of: SITE_SLOTS.length },
              { p: 'quarter' as Page, icon: 'ti-calendar', label: 'This quarter', sub: `Q${quarter} ${year}`, n: count(QUARTER_SLOTS), of: QUARTER_SLOTS.length },
              { p: 'sponsors' as Page, icon: 'ti-building-store', label: 'Sponsors & logos', sub: `${logos.length} added`, n: logos.filter((l) => l.logo).length, of: logos.length },
            ].map((row) => (
              <button key={row.p} type="button" onClick={() => setPage(row.p)} className="mb-2.5 flex w-full items-center gap-3 rounded-card border border-border bg-surface px-4 py-4 text-left hover:border-primary/50">
                <i className={`ti ${row.icon} text-2xl text-primary`} aria-hidden="true" />
                <div className="flex-1"><div className="text-sm font-medium">{row.label}</div><div className="text-xs text-textSecondary">{row.sub}</div></div>
                <span className="text-xs text-textSecondary">{row.of ? `${row.n}/${row.of}` : ''}</span>
                <i className="ti ti-chevron-right text-textSecondary" aria-hidden="true" />
              </button>
            ))}
            <a href={`/report/forest/${forestId}?year=${year}&quarter=${quarter}`} target="_blank" rel="noopener" className="mt-3 flex w-full items-center justify-center gap-2 rounded-button border border-border py-3 text-sm"><i className="ti ti-external-link" aria-hidden="true" /> View report</a>
          </main>
        </>
      ) : null}

      {/* PAGE: site / quarter photo grids */}
      {page === 'site' || page === 'quarter' ? (
        <>
          <TopBar title={page === 'site' ? 'Site photos' : `This quarter · Q${quarter}`} onBack={() => setPage('menu')} />
          <main className="mx-auto max-w-md px-4 py-5">
            <p className="mb-3 text-xs text-textSecondary">Tap an empty tile to add. Tap a photo to preview, replace or delete.</p>
            <div className="grid grid-cols-2 gap-3">
              {(page === 'site' ? SITE_SLOTS : QUARTER_SLOTS).map((s) => <Tile key={s.key} slot={s} />)}
            </div>
          </main>
        </>
      ) : null}

      {/* PAGE: sponsors & logos */}
      {page === 'sponsors' ? (
        <>
          <TopBar title="Sponsors & logos" onBack={() => setPage('menu')} />
          <main className="mx-auto max-w-md px-4 py-5">
            {logos.length === 0 ? <p className="mb-3 text-sm text-textSecondary">No logos yet. Add a sponsor or the initiator.</p> : null}
            <div className="space-y-3">
              {logos.map((row, i) => (
                <div key={i} className="rounded-card border border-border bg-surface p-3">
                  <div className="flex items-start gap-3">
                    <button type="button" aria-label="Upload logo" onClick={() => { logoIdx.current = i; logoInput.current?.click(); }} className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-card border border-border bg-appbg">
                      {row.logo ? <img src={row.logo} alt="" className="h-full w-full object-contain" /> : <i className="ti ti-upload text-lg text-textSecondary" aria-hidden="true" />}
                    </button>
                    <div className="min-w-0 flex-1 space-y-2">
                      <input value={row.title} placeholder="Title (e.g. Sponsored by)" onChange={(e) => patchLogo(i, { title: e.target.value })} onBlur={() => persistLogo(i)} className="w-full rounded-button border border-border bg-appbg px-3 py-2.5 text-sm" />
                      <input value={row.name} placeholder="Sponsor name" onChange={(e) => patchLogo(i, { name: e.target.value })} onBlur={() => persistLogo(i)} className="w-full rounded-button border border-border bg-appbg px-3 py-2.5 text-sm" />
                    </div>
                  </div>
                  <div className="mt-2.5 flex items-center justify-between">
                    <button type="button" onClick={() => patchLogo(i, { value: row.value === 'initiated_by' ? 'sponsored_by' : 'initiated_by' })} className={`rounded-button px-3 py-1.5 text-xs ${row.value === 'initiated_by' ? 'bg-primary/15 text-primary' : 'border border-border text-textSecondary'}`}>{row.value === 'initiated_by' ? 'Initiated by' : 'Sponsor'}</button>
                    <button type="button" onClick={() => removeSponsor(i)} className="flex items-center gap-1 text-xs text-textSecondary hover:text-danger"><i className="ti ti-trash" aria-hidden="true" /> Remove</button>
                  </div>
                </div>
              ))}
            </div>
            <button type="button" onClick={addSponsor} className="mt-3 w-full rounded-button border border-border py-3 text-sm"><i className="ti ti-plus" aria-hidden="true" /> Add sponsor / logo</button>
          </main>
        </>
      ) : null}

      {/* sticky capture bar on photo pages */}
      {page === 'site' || page === 'quarter' ? (
        <div className="sticky bottom-0 z-20 border-t border-border bg-appbg/95 px-4 py-3 backdrop-blur">
          <button type="button" onClick={() => { const slots = page === 'site' ? SITE_SLOTS : QUARTER_SLOTS; const next = slots.find((s) => !isUrl(status[s.key])); if (next) setCamSlot(next); else toast.success('All done on this page.'); }} className="mx-auto block w-full max-w-md rounded-button bg-primary py-3 text-sm font-semibold text-black"><i className="ti ti-camera" aria-hidden="true" /> Capture next</button>
        </div>
      ) : null}

      {/* action sheet (empty tile tapped) */}
      {sheet ? (
        <div className="fixed inset-0 z-40 flex flex-col justify-end bg-black/50" onClick={() => setSheet(null)}>
          <div className="rounded-t-2xl bg-surface p-2" onClick={(e) => e.stopPropagation()}>
            <div className="px-3 py-2 text-sm font-medium">{sheet.label}{sheet.perQuarter ? ` · Q${quarter} ${year}` : ''}</div>
            <button type="button" onClick={() => { const s = sheet; setSheet(null); setCamSlot(s); }} className="flex w-full items-center gap-3 rounded-button px-3 py-4 text-left text-sm hover:bg-white/5"><i className="ti ti-camera text-xl text-primary" aria-hidden="true" /> Take photo</button>
            <button type="button" onClick={() => { fileSlot.current = sheet; setSheet(null); fileInput.current?.click(); }} className="flex w-full items-center gap-3 rounded-button px-3 py-4 text-left text-sm hover:bg-white/5"><i className="ti ti-folder text-xl" aria-hidden="true" /> Choose a file</button>
            <button type="button" onClick={() => setSheet(null)} className="mt-1 w-full rounded-button border border-border py-3 text-sm">Cancel</button>
          </div>
        </div>
      ) : null}

      {/* filled-photo preview: replace / delete */}
      {view ? (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/90" onClick={() => setView(null)}>
          <div className="flex h-14 items-center justify-between px-4 text-white" onClick={(e) => e.stopPropagation()}>
            <span className="text-sm">{view.label}{view.perQuarter ? ` · Q${quarter} ${year}` : ''}</span>
            <button type="button" aria-label="Close" onClick={() => setView(null)}><i className="ti ti-x text-xl" aria-hidden="true" /></button>
          </div>
          <div className="flex flex-1 items-center justify-center px-4" onClick={(e) => e.stopPropagation()}>
            <img src={status[view.key]} alt="" className="max-h-full max-w-full rounded-card object-contain" />
          </div>
          <div className="flex gap-3 p-4" onClick={(e) => e.stopPropagation()}>
            <button type="button" onClick={() => { const s = view; setView(null); setSheet(s); }} className="flex-1 rounded-button border border-white/40 py-3 text-sm text-white"><i className="ti ti-refresh" aria-hidden="true" /> Replace</button>
            <button type="button" onClick={() => deletePhoto(view)} className="flex-1 rounded-button bg-danger py-3 text-sm font-semibold text-white"><i className="ti ti-trash" aria-hidden="true" /> Delete</button>
          </div>
        </div>
      ) : null}

      {/* live camera */}
      {camSlot ? (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95 p-4">
          <div className="mb-2 text-sm text-white/90">{camSlot.label}{camSlot.perQuarter ? ` · Q${quarter} ${year}` : ''}</div>
          {camErr ? (
            <div className="max-w-sm rounded-card bg-white/10 p-4 text-center text-sm text-white">{camErr}
              <div className="mt-3 flex justify-center gap-2">
                <button type="button" onClick={() => { const s = camSlot; closeCam(); fileSlot.current = s; fileInput.current?.click(); }} className="rounded-button bg-primary px-3 py-1.5 text-xs font-medium text-black">Pick a file</button>
                <button type="button" onClick={closeCam} className="rounded-button border border-white/40 px-3 py-1.5 text-xs text-white">Close</button>
              </div>
            </div>
          ) : (
            <>
              <video ref={videoRef} autoPlay playsInline muted className="max-h-[68vh] w-auto max-w-full rounded-card bg-black" />
              <div className="mt-5 flex items-center gap-8">
                <button type="button" onClick={closeCam} className="text-sm text-white">Cancel</button>
                <button type="button" onClick={snap} aria-label="Capture" className="flex h-[72px] w-[72px] items-center justify-center rounded-full border-4 border-white bg-primary"><i className="ti ti-camera text-2xl text-black" aria-hidden="true" /></button>
                <button type="button" onClick={() => setFacing((f) => (f === 'environment' ? 'user' : 'environment'))} aria-label="Flip" className="text-white"><i className="ti ti-rotate text-xl" aria-hidden="true" /></button>
              </div>
            </>
          )}
        </div>
      ) : null}

      {/* hamburger nav drawer (left) */}
      {navOpen ? (
        <div className="fixed inset-0 z-40 flex" onClick={() => setNavOpen(false)}>
          <nav className="h-full w-[78%] max-w-xs bg-appbg" onClick={(e) => e.stopPropagation()}>
            <div className="border-b border-border px-4 py-4">
              <div className="truncate font-serif text-base font-semibold">{forestId ? forestName : 'Photo uploader'}</div>
              {forestId ? <div className="text-xs text-textSecondary">Q{quarter} {year} · {filled}/{total} · {Math.round((filled / total) * 100)}%</div> : null}
            </div>
            {([
              { p: 'menu' as Page, icon: 'ti-home', label: 'Home', ct: '' },
              { p: 'site' as Page, icon: 'ti-building-community', label: 'Site photos', ct: `${count(SITE_SLOTS)}/${SITE_SLOTS.length}` },
              { p: 'quarter' as Page, icon: 'ti-calendar', label: 'This quarter', ct: `${count(QUARTER_SLOTS)}/${QUARTER_SLOTS.length}` },
              { p: 'sponsors' as Page, icon: 'ti-building-store', label: 'Sponsors & logos', ct: `${logos.filter((l) => l.logo).length}/${logos.length}` },
            ]).map((r) => (
              <button key={r.p} type="button" onClick={() => go(r.p)} className={`flex w-full items-center gap-3 px-4 py-3.5 text-left text-sm ${page === r.p ? 'bg-primary/15 text-primary' : 'text-textPrimary hover:bg-white/5'}`}>
                <i className={`ti ${r.icon} text-xl`} aria-hidden="true" /><span className="flex-1">{r.label}</span><span className="text-xs text-textSecondary">{r.ct}</span>
              </button>
            ))}
            <div className="my-1 border-t border-border" />
            <a href={forestId ? `/report/forest/${forestId}?year=${year}&quarter=${quarter}` : '#'} target="_blank" rel="noopener" onClick={() => setNavOpen(false)} className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-sm text-textPrimary hover:bg-white/5"><i className="ti ti-external-link text-xl" aria-hidden="true" /> View report</a>
            <button type="button" onClick={() => go('pick')} className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-sm text-textPrimary hover:bg-white/5"><i className="ti ti-switch-horizontal text-xl" aria-hidden="true" /> Switch forest</button>
            <Link to="/dashboard" className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-sm text-textPrimary hover:bg-white/5"><i className="ti ti-layout-dashboard text-xl" aria-hidden="true" /> Dashboard</Link>
          </nav>
          <div className="h-full flex-1 bg-black/55" />
        </div>
      ) : null}

      {/* preview before upload */}
      {pending ? (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 p-4">
          <div className="mb-2 text-sm text-white/90">{pending.slot.label}</div>
          <img src={pending.url} alt="preview" className="max-h-[68vh] max-w-full rounded-card object-contain" />
          <div className="mt-5 flex w-full max-w-sm gap-3">
            <button type="button" onClick={() => { const s = pending.slot; clearPending(); setCamSlot(s); }} className="flex-1 rounded-button border border-white/40 py-3 text-sm text-white"><i className="ti ti-refresh" aria-hidden="true" /> Retake</button>
            <button type="button" onClick={commit} className="flex-1 rounded-button bg-primary py-3 text-sm font-semibold text-black"><i className="ti ti-upload" aria-hidden="true" /> Upload</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
