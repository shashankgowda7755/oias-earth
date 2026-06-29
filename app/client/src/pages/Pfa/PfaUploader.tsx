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
import { uploadReportImage, clearReportImage, uploadSponsorLogo, deleteSponsorLogo, satelliteFetch } from '../Forests/forestApi';
import { fiscalQuarterOf, quarterPeriodLabel, quartersFrom, projectYearLabel, type FQ } from '@/lib/fiscal';
import { fetchForestOptions, type ForestOption } from '../Reports/reportApi';

// `ratio` is the target aspect ratio (width / height) the report slot renders at.
// Every capture (camera or file) is centre-cropped to this ratio before upload,
// so what the operator frames is exactly what the report shows — no surprise crop
// at render time. Keep these in sync with the slide render boxes.
interface Slot { key: string; label: string; perQuarter?: boolean; ratio: number }
interface LogoRow { id: string; title: string; name: string; value: 'sponsored_by' | 'initiated_by'; logo?: string; serverIndex: number }
type Page = 'pick' | 'menu' | 'site' | 'quarter' | 'qphotos' | 'sponsors';

const SITE_SLOTS: Slot[] = [
  { key: 'cover', label: 'Cover', ratio: 4 / 3 },
  { key: 'content', label: 'Contents', ratio: 4 / 3 },
  { key: 'permission', label: 'Permission', ratio: 3 / 4 },
  { key: 'layout', label: 'Site layout', ratio: 4 / 3 },
  { key: 'security', label: 'Security', ratio: 4 / 3 },
];
const QUARTER_SLOTS: Slot[] = [
  { key: 'soil_meter', label: 'Soil meter', perQuarter: true, ratio: 1 },
  { key: 'temp_inside', label: 'Inside', perQuarter: true, ratio: 4 / 3 },
  { key: 'temp_outside', label: 'Outside', perQuarter: true, ratio: 4 / 3 },
];

/** Human label for an aspect ratio (4/3 -> "4:3"). Best-effort, falls back to 2dp. */
function ratioLabel(r: number): string {
  const known: [number, string][] = [[16 / 9, '16:9'], [4 / 3, '4:3'], [3 / 2, '3:2'], [1, '1:1'], [3 / 4, '3:4'], [2 / 3, '2:3'], [9 / 16, '9:16']];
  const hit = known.find(([v]) => Math.abs(v - r) < 0.01);
  return hit ? hit[1] : r.toFixed(2);
}

/**
 * Centre-crop an image File to a target aspect ratio and re-encode as JPEG.
 * Crops the longer axis (never stretches), so the subject the operator framed in
 * the centre is preserved. Falls back to the original file on any decode error.
 */
async function cropToRatio(file: File, ratio: number): Promise<File> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const im = new Image();
      im.onload = () => res(im);
      im.onerror = rej;
      im.src = url;
    });
    const iw = img.naturalWidth, ih = img.naturalHeight;
    if (!iw || !ih) return file;
    let sw = iw, sh = ih, sx = 0, sy = 0;
    if (iw / ih > ratio) { sw = Math.round(ih * ratio); sx = Math.round((iw - sw) / 2); }
    else if (iw / ih < ratio) { sh = Math.round(iw / ratio); sy = Math.round((ih - sh) / 2); }
    const canvas = document.createElement('canvas');
    canvas.width = sw; canvas.height = sh;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
    const blob: Blob | null = await new Promise((res) => canvas.toBlob((b) => res(b), 'image/jpeg', 0.92));
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' });
  } catch {
    return file;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function defaultFiscal(): FQ {
  return fiscalQuarterOf(new Date());
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
  if (forest.permission_letter) out.permission = String(forest.permission_letter);
  if (forest.site_layout) out.layout = String(forest.site_layout);
  const sec = (forest.security_and_infrastructure as Rec)?.image_data as { image?: string }[] | undefined;
  if (Array.isArray(sec) && sec[0]?.image) out.security = sec[0].image!;
  const soil = pickQ(forest.soil_ph_level, y, q);
  if (soil?.meter_image) out.soil_meter = String(soil.meter_image);
  const th = pickQ(forest.temperature_humidity, y, q);
  if ((th?.inside_plantation as Rec)?.image) out.temp_inside = String((th!.inside_plantation as Rec).image);
  if ((th?.outside_plantation as Rec)?.image) out.temp_outside = String((th!.outside_plantation as Rec).image);
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
  // plantation_date from the loaded forest payload — drives the quarter picker
  // range. null until a forest loads (or if absent/invalid → picker fallback).
  const [plantationDate, setPlantationDate] = useState<Date | null>(null);
  const [page, setPage] = useState<Page>('pick');
  const [status, setStatus] = useState<Record<string, string>>({});
  const [logos, setLogos] = useState<LogoRow[]>([]);
  const [pending, setPending] = useState<{ slot: Slot; url: string; file: File } | null>(null);
  const [sheet, setSheet] = useState<Slot | null>(null);
  const [view, setView] = useState<Slot | null>(null); // filled-photo preview
  const [navOpen, setNavOpen] = useState(false);
  // PWA install (always available)
  const [deferredPrompt, setDeferredPrompt] = useState<{ prompt: () => Promise<void>; userChoice: Promise<unknown> } | null>(null);
  const [bannerHidden, setBannerHidden] = useState(false);
  const standalone = typeof window !== 'undefined' && (window.matchMedia?.('(display-mode: standalone)').matches || (window.navigator as unknown as { standalone?: boolean }).standalone === true);
  const isIos = typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent);
  // camera
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInput = useRef<HTMLInputElement | null>(null);
  const fileSlot = useRef<Slot | null>(null);
  const logoInput = useRef<HTMLInputElement | null>(null);
  const logoIdx = useRef<number>(-1);
  // serialize persists per row (keyed by stable id) so the title+name double-blur
  // can't fire two concurrent ADDs; the 2nd waits and sends the assigned index.
  const persistChain = useRef<Map<string, Promise<void>>>(new Map());
  const [camSlot, setCamSlot] = useState<Slot | null>(null);
  const [facing, setFacing] = useState<'environment' | 'user'>('environment');
  const [camErr, setCamErr] = useState<string | null>(null);
  // Slide-5 satellite timeline: 3 aerial images (each { url, year }).
  const [earth, setEarth] = useState<{ url: string; year: string }[]>([
    { url: '', year: '' }, { url: '', year: '' }, { url: '', year: '' },
  ]);
  const [aerialBusy, setAerialBusy] = useState<number | null>(null);
  const aerialFile = useRef<HTMLInputElement | null>(null);
  const aerialIdx = useRef<number>(-1);
  // Quarterly photos (bulk): one gallery photo per fiscal (year,quarter), keyed
  // `${year}-${quarter}`. Lets the operator backfill every quarter in one place.
  const [galleryByQ, setGalleryByQ] = useState<Record<string, string>>({});
  const [qBusy, setQBusy] = useState<string | null>(null);
  const qFileInput = useRef<HTMLInputElement | null>(null);
  const qFileTarget = useRef<FQ | null>(null);

  useEffect(() => { fetchForestOptions().then(setForests).catch(() => undefined); }, []);

  useEffect(() => {
    if (!forestId) { setStatus({}); setLogos([]); setPlantationDate(null); setGalleryByQ({}); return; }
    let alive = true;
    fetchForestReport(forestId, year, quarter)
      .then((r) => {
        if (!alive) return;
        const f = (r.forest as Rec) ?? {};
        setStatus(seedFromForest(f, year, quarter));
        // All quarter gallery photos (full array) for the bulk "Quarterly photos" page.
        const gimgs = Array.isArray(f.gallery_images) ? (f.gallery_images as Rec[]) : [];
        const gmap: Record<string, string> = {};
        for (const g of gimgs) {
          if (g?.image && g.year != null && g.quarter != null) gmap[`${g.year}-${g.quarter}`] = String(g.image);
        }
        setGalleryByQ(gmap);
        // plantation_date drives the quarter picker range. Parse defensively;
        // missing/invalid → null so the picker uses its ~2-year fallback.
        const pd = f.plantation_date != null ? new Date(String(f.plantation_date)) : null;
        setPlantationDate(pd && !Number.isNaN(pd.getTime()) ? pd : null);
        const ge = (f.area_population_statistics_details as Rec)?.google_earth_image as unknown[] | undefined;
        setEarth([0, 1, 2].map((i) => {
          const c = Array.isArray(ge) ? ge[i] : undefined;
          if (typeof c === 'string') return { url: c, year: '' };
          if (c && typeof c === 'object') {
            const o = c as { image?: string; year?: string | number };
            return { url: String(o.image ?? ''), year: o.year != null ? String(o.year) : '' };
          }
          return { url: '', year: '' };
        }));
        const raw = (f.additional_sponsor_logo as { id?: string; type?: { label?: string; value?: string }; name?: string; logo?: string }[]) ?? [];
        setLogos(raw.map((l, i) => ({
          id: l.id ?? crypto.randomUUID(),
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

  // Quarter picker options: fiscal quarters from plantation date → now (ascending).
  // Fallback (no/invalid plantation_date): last ~2 years up to current quarter.
  const today = new Date();
  const pickerStart = plantationDate ?? new Date(today.getFullYear() - 2, today.getMonth(), today.getDate());
  const quarters = quartersFrom(pickerStart, today);

  // When a forest's plantation_date loads, default the selection to the LAST
  // quarter in the list (the current one) so uploads target the live quarter.
  useEffect(() => {
    if (!plantationDate) return;
    const last = quarters[quarters.length - 1];
    if (!last) return;
    setYear(last.year);
    setQuarter(last.quarter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plantationDate]);

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

  // PWA: point install at the PFA manifest while on /pfa + capture the prompt.
  useEffect(() => {
    const link = document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null;
    const prev = link?.getAttribute('href') ?? null;
    if (link) link.setAttribute('href', '/pfa.webmanifest');
    const onBip = (e: Event) => { e.preventDefault(); setDeferredPrompt(e as unknown as { prompt: () => Promise<void>; userChoice: Promise<unknown> }); };
    const onInstalled = () => setDeferredPrompt(null);
    window.addEventListener('beforeinstallprompt', onBip);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBip);
      window.removeEventListener('appinstalled', onInstalled);
      if (link && prev) link.setAttribute('href', prev);
    };
  }, []);

  const installApp = async () => {
    setNavOpen(false);
    if (deferredPrompt) { await deferredPrompt.prompt(); try { await deferredPrompt.userChoice; } catch { /* ignore */ } setDeferredPrompt(null); }
    else if (isIos) toast.success('Tap the Share icon, then “Add to Home Screen”.');
    else toast.success('Open your browser menu → “Install app” / “Add to Home screen”.');
  };

  const stage = async (slot: Slot, file?: File | null) => {
    if (!file) return;
    // Centre-crop to the slot's target ratio so the preview + upload match the
    // report render box exactly (capture once, at the ratio we want).
    const cropped = await cropToRatio(file, slot.ratio);
    setPending((p) => { if (p) URL.revokeObjectURL(p.url); return { slot, url: URL.createObjectURL(cropped), file: cropped }; });
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

  // satellite timeline (slide 5)
  const setAerialYear = (i: number, v: string) => setEarth((e) => e.map((c, j) => (j === i ? { ...c, year: v.replace(/[^0-9]/g, '').slice(0, 4) } : c)));
  const uploadAerial = async (i: number, file?: File | null) => {
    if (!file) return;
    if (!forestId) { toast.error('Pick a forest first.'); return; }
    setAerialBusy(i);
    try {
      const cropped = await cropToRatio(file, 4 / 3);
      const yr = Number(earth[i]?.year) || undefined;
      const r = await uploadReportImage(forestId, 'earth', cropped, { index: i, year: yr });
      setEarth((e) => e.map((c, j) => (j === i ? { ...c, url: r.url } : c)));
      toast.success(`Satellite ${i + 1} uploaded.`);
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Upload failed.'); }
    finally { setAerialBusy(null); }
  };
  const clearAerial = async (i: number) => {
    if (!forestId) return;
    const prev = earth[i] ?? { url: '', year: '' };
    setEarth((e) => e.map((c, j) => (j === i ? { ...c, url: '' } : c)));
    try { await clearReportImage(forestId, 'earth', { index: i }); }
    catch (e) { setEarth((ee) => ee.map((c, j) => (j === i ? prev : c))); toast.error(e instanceof Error ? e.message : 'Delete failed.'); }
  };
  const autoSat = async () => {
    if (!forestId) { toast.error('Pick a forest first.'); return; }
    setAerialBusy(0);
    try {
      const yr = Number(earth[0]?.year) || undefined;
      const r = await satelliteFetch(forestId, 0, yr);
      setEarth((e) => e.map((c, j) => (j === 0 ? { url: r.url, year: String(r.year) } : c)));
      toast.success('Current satellite fetched.');
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Fetch failed — set the forest map location first.'); }
    finally { setAerialBusy(null); }
  };
  // Fill all 3 slots with a satellite timeline (oldest → now). Each year the
  // server returns the nearest year with real imagery, so no blank/black frames.
  const autoTimeline = async () => {
    if (!forestId) { toast.error('Pick a forest first.'); return; }
    const now = new Date().getFullYear();
    const targets = [now - 8, now - 4, now]; // slot 0 = oldest, slot 2 = now
    try {
      for (let i = 0; i < 3; i++) {
        setAerialBusy(i);
        const r = await satelliteFetch(forestId, i, targets[i]);
        setEarth((e) => e.map((c, j) => (j === i ? { url: r.url, year: String(r.year) } : c)));
      }
      toast.success('Satellite timeline fetched.');
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Timeline fetch failed — set the map location first.'); }
    finally { setAerialBusy(null); }
  };

  // Quarterly photos (bulk) — upload/replace/delete a gallery photo for any (year,quarter).
  const bulkGalleryUpload = async (fq: FQ, file?: File | null) => {
    if (!file) return;
    if (!forestId) { toast.error('Pick a forest first.'); return; }
    const key = `${fq.year}-${fq.quarter}`;
    setQBusy(key);
    try {
      const cropped = await cropToRatio(file, 4 / 3);
      const r = await uploadReportImage(forestId, 'gallery', cropped, { year: fq.year, quarter: fq.quarter });
      setGalleryByQ((m) => ({ ...m, [key]: r.url }));
      toast.success('Quarterly photo uploaded.');
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Upload failed.'); }
    finally { setQBusy(null); }
  };
  const bulkGalleryDelete = async (fq: FQ) => {
    if (!forestId) return;
    const key = `${fq.year}-${fq.quarter}`;
    const prev = galleryByQ[key];
    setGalleryByQ((m) => { const n = { ...m }; delete n[key]; return n; });
    try { await clearReportImage(forestId, 'gallery', { year: fq.year, quarter: fq.quarter }); toast.success('Quarterly photo removed.'); }
    catch (e) { setGalleryByQ((m) => ({ ...m, [key]: prev ?? '' })); toast.error(e instanceof Error ? e.message : 'Delete failed.'); }
  };

  // logos
  const patchLogo = (i: number, p: Partial<LogoRow>) => setLogos((ls) => ls.map((r, j) => (j === i ? { ...r, ...p } : r)));
  const addSponsor = () => setLogos((ls) => [...ls, { id: crypto.randomUUID(), title: 'Sponsored By', name: '', value: 'sponsored_by', serverIndex: -1 }]);
  const persistLogo = (i: number, file?: File | null): Promise<void> => {
    if (!forestId) return Promise.resolve();
    const row = logos[i]; if (!row) return Promise.resolve();
    const prior = persistChain.current.get(row.id) ?? Promise.resolve();
    const next = prior.catch(() => undefined).then(async () => {
      try {
        const res = await uploadSponsorLogo(forestId, { title: row.title, name: row.name, value: row.value, index: row.serverIndex, clientId: row.id, file });
        setLogos((ls) => ls.map((r) => (r.id === row.id ? { ...r, serverIndex: res.index, logo: res.logo ?? r.logo } : r)));
        if (file) toast.success('Logo uploaded.');
      } catch (e) { toast.error(e instanceof Error ? e.message : 'Logo save failed.'); }
    });
    persistChain.current.set(row.id, next);
    return next;
  };
  const removeSponsor = async (i: number) => {
    const row = logos[i]; if (!row) return;
    persistChain.current.delete(row.id);
    try { if (row.serverIndex >= 0) await deleteSponsorLogo(forestId, row.serverIndex, row.id); } catch { /* ignore */ }
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
      <input ref={aerialFile} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f && aerialIdx.current >= 0) uploadAerial(aerialIdx.current, f); e.target.value = ''; }} />
      <input ref={qFileInput} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f && qFileTarget.current) bulkGalleryUpload(qFileTarget.current, f); e.target.value = ''; }} />

      {/* always-available install notification */}
      {!standalone && !bannerHidden ? (
        <div className="flex items-center gap-3 border-b border-primary/30 bg-primary/10 px-4 py-2.5">
          <i className="ti ti-download text-lg text-primary" aria-hidden="true" />
          <span className="flex-1 text-xs text-textPrimary">Install the COMMUNITREE PFA app for quick full-screen uploads.</span>
          <button type="button" onClick={installApp} className="rounded-button bg-primary px-3 py-1.5 text-xs font-semibold text-black">Install</button>
          <button type="button" aria-label="Dismiss" onClick={() => setBannerHidden(true)} className="text-textSecondary"><i className="ti ti-x" aria-hidden="true" /></button>
        </div>
      ) : null}

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
            <label className="mt-3 block text-sm"><span className="mb-1 block text-textSecondary">Quarter</span>
              <select
                value={`${year}-${quarter}`}
                onChange={(e) => { const [y, q] = e.target.value.split('-'); setYear(Number(y)); setQuarter(Number(q)); }}
                className="w-full rounded-button border border-border bg-surface px-3 py-3 text-sm"
              >
                {quarters.map(({ year: y, quarter: q }, i) => (
                  <option key={`${y}-${q}`} value={`${y}-${q}`}>Year {Math.floor(i / 4) + 1} · Q{(i % 4) + 1} · {quarterPeriodLabel(y, q)}</option>
                ))}
              </select>
            </label>
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
              { p: 'qphotos' as Page, icon: 'ti-photo', label: 'Quarterly photos', sub: 'All quarters · one each', n: quarters.filter((fq) => galleryByQ[`${fq.year}-${fq.quarter}`]).length, of: quarters.length },
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
            {page === 'site' ? (
              <div className="mt-5 rounded-card border border-border bg-surface p-4">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-sm font-semibold">Aerial / map</span>
                  <span className="text-[11px] text-textSecondary">slide 5 · up to 3</span>
                </div>
                <p className="mb-3 text-xs text-textSecondary">Timeline of urban change. Auto-fetch real satellite imagery (no key) — blank/black frames are skipped automatically. Or add your own; type the year first.</p>
                <div className="mb-3 flex gap-2">
                  <button type="button" onClick={autoTimeline} disabled={aerialBusy !== null} className="flex flex-1 items-center justify-center gap-2 rounded-button bg-primary py-2.5 text-sm font-semibold text-black disabled:opacity-50">
                    <i className={`ti ${aerialBusy !== null ? 'ti-loader-2' : 'ti-timeline'}`} aria-hidden="true" /> Auto-fetch timeline
                  </button>
                  <button type="button" onClick={autoSat} disabled={aerialBusy !== null} className="flex items-center justify-center gap-2 rounded-button border border-primary/60 px-3 py-2.5 text-sm font-semibold text-primary disabled:opacity-50">
                    <i className="ti ti-satellite" aria-hidden="true" /> Current
                  </button>
                </div>
                <div className="space-y-2">
                  {earth.map((c, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <button type="button" onClick={() => { aerialIdx.current = i; aerialFile.current?.click(); }} className="relative flex h-14 w-20 flex-none items-center justify-center overflow-hidden rounded-button border border-border bg-appbg">
                        {c.url ? <img src={c.url} alt="" className="absolute inset-0 h-full w-full object-cover" /> : null}
                        <i className={`ti ${aerialBusy === i ? 'ti-loader-2' : c.url ? 'ti-circle-check' : 'ti-photo-plus'} relative z-10 text-lg ${c.url ? 'text-white' : 'text-textSecondary'}`} aria-hidden="true" />
                      </button>
                      <input value={c.year} onChange={(e) => setAerialYear(i, e.target.value)} inputMode="numeric" placeholder="Year" className="w-16 flex-none rounded-button border border-border bg-appbg px-2 py-2 text-center text-sm" />
                      <span className="flex-1 text-xs text-textSecondary">Satellite {i + 1}{c.url ? ' · added' : ''}</span>
                      {c.url ? <button type="button" onClick={() => clearAerial(i)} aria-label="Delete" className="flex-none p-1 text-textSecondary hover:text-danger"><i className="ti ti-trash" aria-hidden="true" /></button> : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
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

      {/* PAGE: quarterly photos (bulk — one gallery photo per quarter, by project year) */}
      {page === 'qphotos' ? (
        <>
          <TopBar title="Quarterly photos" onBack={() => setPage('menu')} />
          <main className="mx-auto max-w-md px-4 py-5">
            <p className="mb-3 text-xs text-textSecondary">One photo per quarter, grouped by project year. Tap to add or replace; trash to remove. These feed the report's yearly photo gallery.</p>
            {quarters.length === 0 ? <p className="text-sm text-textSecondary">No quarters yet — set the forest's plantation date first.</p> : null}
            {Array.from({ length: Math.ceil(quarters.length / 4) }, (_, yi) => {
              const yearQs = quarters.slice(yi * 4, yi * 4 + 4);
              const filledInYear = yearQs.filter((fq) => galleryByQ[`${fq.year}-${fq.quarter}`]).length;
              return (
                <div key={yi} className="mb-5">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-semibold">{projectYearLabel(yi + 1)}</span>
                    <span className="text-xs text-textSecondary">{filledInYear}/{yearQs.length}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {yearQs.map((fq, qi) => {
                      const key = `${fq.year}-${fq.quarter}`;
                      const url = galleryByQ[key];
                      const busy = qBusy === key;
                      return (
                        <div key={key} className="relative">
                          <button
                            type="button"
                            onClick={() => { qFileTarget.current = fq; qFileInput.current?.click(); }}
                            className={`relative flex aspect-square w-full flex-col items-center justify-center gap-1.5 overflow-hidden rounded-card border p-2 text-center transition-colors ${url ? 'border-transparent bg-primary/10' : 'border-border hover:border-primary/60'}`}
                          >
                            {url ? <img src={url} alt="" className="absolute inset-0 h-full w-full bg-surface object-cover opacity-90" /> : null}
                            <span className="relative z-10 flex flex-col items-center gap-1">
                              <i className={`ti ${busy ? 'ti-loader-2' : url ? 'ti-circle-check' : 'ti-camera'} text-[22px] ${url ? 'text-primary' : 'text-textSecondary'}`} aria-hidden="true" />
                              <span className={`text-[11px] ${url ? 'rounded bg-black/55 px-1.5 py-0.5 text-white' : 'text-textSecondary'}`}>Q{qi + 1} · {quarterPeriodLabel(fq.year, fq.quarter)}</span>
                            </span>
                          </button>
                          {url ? <button type="button" aria-label="Delete" onClick={() => bulkGalleryDelete(fq)} className="absolute right-1 top-1 z-20 rounded-full bg-black/60 p-1 text-white hover:bg-danger"><i className="ti ti-trash text-xs" aria-hidden="true" /></button> : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
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
              <div className="relative flex max-h-[68vh] items-center justify-center">
                <video ref={videoRef} autoPlay playsInline muted className="max-h-[68vh] w-auto max-w-full rounded-card bg-black" />
                {/* Framing guide: the box the photo is centre-cropped to on capture. */}
                <div aria-hidden className="pointer-events-none absolute inset-0 m-auto rounded-card border-2 border-primary/90" style={{ aspectRatio: String(camSlot.ratio), boxShadow: '0 0 0 9999px rgba(0,0,0,0.35)' }} />
              </div>
              <div className="mt-2 text-xs text-white/70">Framing {ratioLabel(camSlot.ratio)} — fills the {camSlot.label.toLowerCase()} slot exactly</div>
              <div className="mt-4 flex items-center gap-8">
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
              { p: 'qphotos' as Page, icon: 'ti-photo', label: 'Quarterly photos', ct: `${quarters.filter((fq) => galleryByQ[`${fq.year}-${fq.quarter}`]).length}/${quarters.length}` },
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
            {!standalone ? <button type="button" onClick={installApp} className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-sm text-primary hover:bg-white/5"><i className="ti ti-download text-xl" aria-hidden="true" /> Install app</button> : null}
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
