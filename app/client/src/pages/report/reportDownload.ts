/**
 * Client-side PDF download for the quarterly report.
 *
 * The browser print path (`window.print()`) only opens a print DIALOG — users
 * couldn't reliably get a file. This renders each fixed-size `.rpt-slide`
 * (1120×792, the A4-landscape ratio) to a canvas with html2canvas and assembles
 * a real, one-click downloadable PDF with jsPDF — no print dialog, works on
 * every browser, no server (the serverless-Chromium route hit Vercel libnss3
 * issues). Both libs are dynamically imported so they don't bloat the main
 * bundle; they load only when the user clicks Download.
 */
/**
 * Render the live `.rpt-slide` DOM to a PDF and return it as a Blob. Shared by
 * the Download button (saves the blob) and the Send flow (uploads the blob as an
 * email attachment) — the report only exists as a PDF in the browser, so both
 * paths must generate it here.
 */
export async function renderReportPdfBlob(
  onState?: (msg: string) => void,
): Promise<Blob> {
  onState?.('Preparing…');
  const [{ default: html2canvas }, jsPdfMod] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ]);
  const JsPDF = jsPdfMod.jsPDF;

  // Web fonts must be ready or text renders in a fallback face.
  if (document.fonts?.ready) {
    try {
      await document.fonts.ready;
    } catch {
      /* ignore */
    }
  }

  const slides = Array.from(
    document.querySelectorAll('.rpt-slide'),
  ) as HTMLElement[];
  if (slides.length === 0) throw new Error('No report slides found to export.');

  const pdf = new JsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();

  for (let i = 0; i < slides.length; i++) {
    onState?.(`Rendering ${i + 1}/${slides.length}…`);
    const canvas = await html2canvas(slides[i]!, {
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true,
      logging: false,
    });
    const img = canvas.toDataURL('image/jpeg', 0.92);
    if (i > 0) pdf.addPage('a4', 'landscape');
    pdf.addImage(img, 'JPEG', 0, 0, pageW, pageH);
  }

  return pdf.output('blob');
}

export async function downloadReportPdf(
  filename: string,
  onState?: (msg: string) => void,
): Promise<void> {
  const blob = await renderReportPdfBlob(onState);
  onState?.('Saving…');
  const href = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = href;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(href);
  onState?.('');
}
