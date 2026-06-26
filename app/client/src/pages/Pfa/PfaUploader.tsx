/**
 * PFA photo uploader (/pfa, admin) — mobile-first. Pick a forest, then fill the
 * photo slots, grouped into "Site · once" + "This quarter". Tap a tile → action
 * sheet (Take photo via live camera / Choose file) → preview → Upload (Vercel
 * Blob) → attaches to the forest's report field. Sticky header shows progress;
 * sticky bottom bar keeps "Capture next" thumb-reachable; a done summary appears
 * when every slot is filled. Existing photos are seeded so progress is accurate.
 */
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '@/components/Toast';
import { fetchForestReport } from '@/lib/publicApi';
import { uploadReportImage, uploadSponsorLogo, deleteSponsorLogo } from '../Forests/forestApi';
import { fetchForestOptions, type ForestOption } from '../Reports/reportApi';

interface Slot { key: string; label: string; perQuarter?: boolean }
interface LogoRow { title: string; name: string; value: 'sponsored_by' | 'initiated_by'; logo?: string; serverIndex: number }
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
const ALL = [...SITE_SLOTS, ...QUARTER_SLOTS];

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

/** Map a forest's existing images back to slot → url so progress is accurate. */
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
  const [status, setStatus] = useState<Record<string, string>>({}); // slot -> url | 'uploading' | 'error'
  const [pending, setPending] = useState<{ slot: Slot; url: string; file: File } | null>(null);
  const [sheet, setSheet] = useState<Slot | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [logos, setLogos] = useState<LogoRow[]>([]);
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

  // Seed which slots already have photos (for this forest + quarter).
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
          name: l.name ?? '',
          value: l.type?.value === 'initiated_by' ? 'initiated_by' : 'sponsored_by',
          logo: l.logo,
          serverIndex: i,
        })));
      })
      .catch(() => undefined);
    return () => { alive = false; };
  }, [forestId, year, quarter]);

  const isUrl = (v?: string) => !!v && v !== 'uploading' && v !== 'error';
  const filled = ALL.filter((s) => isUrl(status[s.key])).length;
  const allDone = !!forestId && filled === ALL.length;

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
    canvas.toBlob((blob) => {
      if (!blob) return;
      stage(slot, new File([blob], `${slot.key}-${Date.now()}.jpg`, { type: 'image/jpeg' }));
      closeCam();
    }, 'image/jpeg', 0.92);
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

  const patchLogo = (i: number, p: Partial<LogoRow>) => setLogos((ls) => ls.map((r, j) => (j === i ? { ...r, ...p } : r)));
  const addSponsor = () => setLogos((ls) => [...ls, { title: 'Sponsored By', name: '', value: 'sponsored_by', serverIndex: -1 }]);
  const persistLogo = async (i: number, file?: File | null) => {
    if (!forestId) { toast.error('Pick a forest first.'); return; }
    const row = logos[i];
    if (!row) return;
    try {
      const res = await uploadSponsorLogo(forestId, { title: row.title, name: row.name, value: row.value, index: row.serverIndex, file });
      setLogos((ls) => ls.map((r, j) => (j === i ? { ...r, serverIndex: res.index, logo: res.logo ?? r.logo } : r)));
      if (file) toast.success('Logo uploaded.');
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Logo save failed.'); }
  };
  const removeSponsor = async (i: number) => {
    const row = logos[i];
    if (!row) return;
    try { if (row.serverIndex >= 0) await deleteSponsorLogo(forestId, row.serverIndex); } catch { /* ignore */ }
    setLogos((ls) => ls.filter((_, j) => j !== i).map((r) => (row.serverIndex >= 0 && r.serverIndex > row.serverIndex ? { ...r, serverIndex: r.serverIndex - 1 } : r)));
  };

  const captureNext = () => {
    const next = ALL.find((s) => !isUrl(status[s.key]));
    if (next) setCamSlot(next); else toast.success('All photos added.');
  };

  const Tile = ({ slot }: { slot: Slot }) => {
    const st = status[slot.key];
    const url = isUrl(st) ? st : null;
    const uploading = st === 'uploading';
    return (
      <button
        type="button"
        onClick={() => (url ? setLightbox(url) : setSheet(slot))}
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

  return (
    <div className="min-h-screen bg-appbg text-textPrimary">
      <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (fileSlot.current) stage(fileSlot.current, f); e.target.value = ''; }} />
      <input ref={logoInput} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f && logoIdx.current >= 0) persistLogo(logoIdx.current, f); e.target.value = ''; }} />

      {/* sticky header */}
      <header className="sticky top-0 z-20 border-b border-border bg-appbg/95 backdrop-blur">
        <div className="mx-auto flex max-w-xl items-center gap-3 px-4 py-3">
          <Link to="/dashboard" aria-label="Back" className="text-textSecondary hover:text-textPrimary"><i className="ti ti-chevron-left text-xl" aria-hidden="true" /></Link>
          <select value={forestId} onChange={(e) => setForestId(e.target.value)} className="min-w-0 flex-1 truncate rounded-button border border-border bg-surface px-3 py-2 text-sm">
            <option value="">Select a forest…</option>
            {forests.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="rounded-button border border-border bg-surface px-2 py-2 text-sm">
            {[fiscal.year - 1, fiscal.year, fiscal.year + 1].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={quarter} onChange={(e) => setQuarter(Number(e.target.value))} className="rounded-button border border-border bg-surface px-2 py-2 text-sm">
            {[1, 2, 3, 4].map((q) => <option key={q} value={q}>Q{q}</option>)}
          </select>
        </div>
        {forestId ? (
          <div className="mx-auto max-w-xl px-4 pb-2">
            <div className="mb-1 flex justify-between text-xs text-textSecondary"><span>Q{quarter} {year} · {filled} of {ALL.length} photos</span><span className="text-primary">{Math.round((filled / ALL.length) * 100)}%</span></div>
            <div className="h-1.5 overflow-hidden rounded-full bg-surface"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(filled / ALL.length) * 100}%` }} /></div>
          </div>
        ) : null}
      </header>

      <main className="mx-auto max-w-xl px-4 pb-28 pt-4">
        {!forestId ? (
          <div className="mt-16 text-center text-textSecondary"><i className="ti ti-photo text-3xl" aria-hidden="true" /><p className="mt-2 text-sm">Pick a forest above to add its report photos.</p></div>
        ) : allDone ? (
          <div className="mt-14 flex flex-col items-center text-center">
            <i className="ti ti-circle-check text-5xl text-primary" aria-hidden="true" />
            <p className="mt-3 text-lg font-semibold">{ALL.length} of {ALL.length} photos added</p>
            <p className="mt-1 text-sm text-textSecondary">Q{quarter} {year} · all slots filled</p>
            <a href={`/report/forest/${forestId}?year=${year}&quarter=${quarter}`} target="_blank" rel="noopener" className="mt-6 w-full rounded-button bg-primary py-3 text-center text-sm font-semibold text-black">View &amp; send report ↗</a>
            <button type="button" onClick={() => setForestId('')} className="mt-2 w-full rounded-button border border-border py-3 text-sm">Add another forest</button>
          </div>
        ) : (
          <>
            <div className="mb-1.5 text-xs uppercase tracking-wide text-textSecondary/70">Site · enter once</div>
            <div className="mb-5 grid grid-cols-3 gap-2.5">{SITE_SLOTS.map((s) => <Tile key={s.key} slot={s} />)}</div>
            <div className="mb-1.5 text-xs uppercase tracking-wide text-textSecondary/70">This quarter · Q{quarter}</div>
            <div className="grid grid-cols-3 gap-2.5">{QUARTER_SLOTS.map((s) => <Tile key={s.key} slot={s} />)}</div>

            <div className="mb-1.5 mt-6 flex items-center justify-between text-xs uppercase tracking-wide text-textSecondary/70">
              <span>Sponsors &amp; logos</span>
              <button type="button" onClick={addSponsor} className="rounded-button border border-border px-2.5 py-1 text-[11px] normal-case text-textPrimary"><i className="ti ti-plus" aria-hidden="true" /> Add</button>
            </div>
            <div className="space-y-2.5">
              {logos.length === 0 ? <p className="text-xs text-textSecondary">No logos yet. Add a sponsor or initiator.</p> : null}
              {logos.map((row, i) => (
                <div key={i} className="flex items-center gap-2.5 rounded-card border border-border p-2.5">
                  <button
                    type="button"
                    aria-label="Upload logo"
                    onClick={() => { logoIdx.current = i; logoInput.current?.click(); }}
                    className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-card border border-border bg-surface"
                  >
                    {row.logo ? <img src={row.logo} alt="" className="h-full w-full object-contain" /> : <i className="ti ti-photo text-lg text-textSecondary" aria-hidden="true" />}
                  </button>
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <input value={row.title} placeholder="Title (e.g. Sponsored by)" onChange={(e) => patchLogo(i, { title: e.target.value })} onBlur={() => persistLogo(i)} className="w-full rounded-button border border-border bg-surface px-2.5 py-1.5 text-sm" />
                    <input value={row.name} placeholder="Sponsor name" onChange={(e) => patchLogo(i, { name: e.target.value })} onBlur={() => persistLogo(i)} className="w-full rounded-button border border-border bg-surface px-2.5 py-1.5 text-sm" />
                  </div>
                  <div className="flex shrink-0 flex-col items-center gap-1.5">
                    <button type="button" onClick={() => patchLogo(i, { value: row.value === 'initiated_by' ? 'sponsored_by' : 'initiated_by' })} title="Toggle initiated/sponsor" className={`rounded px-1.5 py-0.5 text-[10px] ${row.value === 'initiated_by' ? 'bg-primary/15 text-primary' : 'text-textSecondary'}`}>{row.value === 'initiated_by' ? 'init' : 'spon'}</button>
                    <button type="button" aria-label="Remove" onClick={() => removeSponsor(i)} className="text-textSecondary hover:text-danger"><i className="ti ti-trash text-base" aria-hidden="true" /></button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>

      {/* sticky bottom bar */}
      {forestId && !allDone ? (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-appbg/95 px-4 py-3 backdrop-blur">
          <div className="mx-auto flex max-w-xl gap-2">
            <button type="button" onClick={captureNext} className="flex-1 rounded-button bg-primary py-3 text-sm font-semibold text-black"><i className="ti ti-camera" aria-hidden="true" /> Capture next</button>
            <a href={`/report/forest/${forestId}?year=${year}&quarter=${quarter}`} target="_blank" rel="noopener" aria-label="View report" className="flex w-12 items-center justify-center rounded-button border border-border"><i className="ti ti-external-link text-lg" aria-hidden="true" /></a>
          </div>
        </div>
      ) : null}

      {/* action sheet */}
      {sheet ? (
        <div className="fixed inset-0 z-40 flex flex-col justify-end bg-black/50" onClick={() => setSheet(null)}>
          <div className="rounded-t-2xl bg-surface p-2" onClick={(e) => e.stopPropagation()}>
            <div className="px-3 py-2 text-sm font-medium">{sheet.label}{sheet.perQuarter ? ` · Q${quarter} ${year}` : ''}</div>
            <button type="button" onClick={() => { const s = sheet; setSheet(null); setCamSlot(s); }} className="flex w-full items-center gap-3 rounded-button px-3 py-3.5 text-left text-sm hover:bg-white/5"><i className="ti ti-camera text-xl text-primary" aria-hidden="true" /> Take photo</button>
            <button type="button" onClick={() => { fileSlot.current = sheet; setSheet(null); fileInput.current?.click(); }} className="flex w-full items-center gap-3 rounded-button px-3 py-3.5 text-left text-sm hover:bg-white/5"><i className="ti ti-folder text-xl" aria-hidden="true" /> Choose a file</button>
            <button type="button" onClick={() => setSheet(null)} className="mt-1 w-full rounded-button border border-border py-3 text-sm">Cancel</button>
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

      {/* lightbox */}
      {lightbox ? (
        <div onClick={() => setLightbox(null)} className="fixed inset-0 z-50 flex cursor-zoom-out items-center justify-center bg-black/85 p-6">
          <img src={lightbox} alt="preview" className="max-h-full max-w-full rounded-card object-contain" />
        </div>
      ) : null}
    </div>
  );
}
