/**
 * Interactive crop modal for the PFA uploader (Cropper.js v2). Replaces the old
 * silent centre-crop: the operator drags / pinch-zooms a crop box locked to the
 * slot's aspect ratio, then "Crop & use" exports a JPEG at that framing.
 *
 * Cropper.js is lazy-loaded (kept out of the main bundle) and the module is
 * cached so re-opening is instant and the custom elements register once. If the
 * import or init fails, we degrade gracefully to the silent `cropToRatio`.
 */
import { useEffect, useRef, useState } from 'react';
import { cropToRatio, canvasToJpegFile, outSize } from '@/lib/cropImage';

// Type-only query (no eager runtime import — Cropper.js is loaded lazily below).
type CropperCtor = (typeof import('cropperjs'))['default'];
type CropperInstance = InstanceType<CropperCtor>;
let _CropperClass: CropperCtor | null = null;
let _loadPromise: Promise<CropperCtor> | null = null;
async function ensureCropper(): Promise<CropperCtor> {
  if (_CropperClass) return _CropperClass;
  if (!_loadPromise) _loadPromise = import('cropperjs').then((m) => (_CropperClass = m.default));
  return _loadPromise;
}

interface Props {
  /** object URL of the raw (uncropped) image */
  src: string;
  /** raw File — used for the silent fallback if Cropper can't load */
  file: File;
  /** target aspect ratio (width / height) */
  ratio: number;
  label: string;
  onCancel: () => void;
  onConfirm: (file: File) => void;
}

export default function CropModal({ src, file, ratio, label, onCancel, onConfirm }: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const cropperRef = useRef<CropperInstance | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let cropper: CropperInstance | null = null;
    (async () => {
      try {
        const Cropper = await ensureCropper();
        if (cancelled || !hostRef.current) return;
        const img = document.createElement('img');
        img.src = src;
        img.alt = '';
        cropper = new Cropper(img, { container: hostRef.current });
        cropperRef.current = cropper;
        const image = cropper.getCropperImage();
        if (image) {
          // Lock the image: the operator adjusts the crop box, never transforms
          // the source (matches the reference Art-for-Awareness wizard).
          image.rotatable = false;
          image.scalable = false;
          image.skewable = false;
          image.translatable = false;
          await image.$ready().catch(() => undefined);
        }
        if (cancelled) return;
        const sel = cropper.getCropperSelection();
        if (sel) {
          sel.aspectRatio = ratio;
          sel.initialCoverage = 0.9;
          sel.movable = true;
          sel.resizable = true;
          sel.$reset();
        }
        setReady(true);
      } catch {
        // Cropper unavailable — fall back to the silent centre-crop so the
        // operator is never blocked from uploading.
        if (cancelled) return;
        const cropped = await cropToRatio(file, ratio);
        if (!cancelled) onConfirm(cropped);
      }
    })();
    return () => {
      cancelled = true;
      cropper?.destroy();
      cropperRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, ratio]);

  const reset = () => cropperRef.current?.getCropperSelection()?.$reset();

  const confirm = async () => {
    const sel = cropperRef.current?.getCropperSelection();
    if (!sel) { onConfirm(await cropToRatio(file, ratio)); return; }
    setBusy(true);
    try {
      const { width, height } = outSize(ratio);
      const canvas = await sel.$toCanvas({ width, height });
      onConfirm(await canvasToJpegFile(canvas, file.name));
    } catch {
      onConfirm(await cropToRatio(file, ratio));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black/95" role="dialog" aria-modal="true" aria-label={`Crop ${label}`}>
      <div className="flex h-14 items-center justify-between px-4 text-white">
        <span className="text-sm">{label} · crop</span>
        <button type="button" aria-label="Close" onClick={onCancel}><i className="ti ti-x text-xl" aria-hidden="true" /></button>
      </div>
      <div className="relative flex flex-1 items-center justify-center px-4 pb-2">
        <div ref={hostRef} className="h-full max-h-[64vh] w-full max-w-md [&_cropper-canvas]:h-full [&_cropper-canvas]:w-full" />
        {!ready ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-white/70">
            <i className="ti ti-loader-2 animate-spin text-2xl" aria-hidden="true" />
          </div>
        ) : null}
      </div>
      <div className="text-center text-xs text-white/70">Drag to move · pinch / scroll to zoom the crop box</div>
      <div className="flex gap-3 p-4">
        <button type="button" onClick={onCancel} className="flex-1 rounded-button border border-white/40 py-3 text-sm text-white">Cancel</button>
        <button type="button" onClick={reset} className="rounded-button border border-white/40 px-4 py-3 text-sm text-white"><i className="ti ti-arrow-back-up" aria-hidden="true" /> Reset</button>
        <button type="button" onClick={confirm} disabled={busy || !ready} className="flex-[1.5] rounded-button bg-primary py-3 text-sm font-semibold text-black disabled:opacity-50"><i className={`ti ${busy ? 'ti-loader-2 animate-spin' : 'ti-crop'}`} aria-hidden="true" /> {busy ? 'Cropping…' : 'Crop & use'}</button>
      </div>
    </div>
  );
}
