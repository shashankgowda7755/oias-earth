/**
 * ShareBar — share a proof page / certificate to WhatsApp, LinkedIn, X, or the
 * native share sheet (mobile), plus copy-link. Instagram has no web-share intent,
 * so callers that have a poster image pass `imageUrl` to show a "Download image"
 * button (post it manually to IG). Pure client, no deps.
 */
import { useState } from 'react';

type Tone = 'dark' | 'light';

const wa = (t: string) => `https://wa.me/?text=${encodeURIComponent(t)}`;
const li = (u: string) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(u)}`;
const x = (t: string, u: string) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(t)}&url=${encodeURIComponent(u)}`;

export default function ShareBar({
  url,
  title,
  text,
  imageUrl,
  tone = 'dark',
}: {
  url?: string;
  title: string;
  text: string;
  imageUrl?: string;
  tone?: Tone;
}) {
  const [copied, setCopied] = useState(false);
  const shareUrl = url ?? (typeof window !== 'undefined' ? window.location.href : '');
  const msg = `${text} ${shareUrl}`;

  const dark = tone === 'dark';
  const fg = dark ? '#dfe9e6' : '#16282e';
  const border = dark ? 'rgba(255,255,255,.18)' : 'rgba(22,40,46,.18)';
  const accent = dark ? '#b6ff3c' : '#1d6b3f';

  const btn: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px',
    borderRadius: 999, border: `1px solid ${border}`, color: fg, background: 'transparent',
    font: "inherit", fontSize: 13, fontWeight: 600, cursor: 'pointer', textDecoration: 'none',
  };

  async function nativeShare() {
    try {
      if (navigator.share) await navigator.share({ title, text, url: shareUrl });
    } catch { /* user cancelled */ }
  }
  function copy() {
    navigator.clipboard?.writeText(shareUrl).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 1400);
    }).catch(() => {});
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
      <span style={{ fontSize: 12, color: dark ? '#9fb0ad' : '#5a6b72', textTransform: 'uppercase', letterSpacing: '.08em', marginRight: 2 }}>Share</span>
      {typeof navigator !== 'undefined' && 'share' in navigator && (
        <button type="button" onClick={nativeShare} style={{ ...btn, borderColor: accent, color: accent }}>↗ Share</button>
      )}
      <a style={btn} href={wa(msg)} target="_blank" rel="noopener noreferrer">WhatsApp</a>
      <a style={btn} href={li(shareUrl)} target="_blank" rel="noopener noreferrer">LinkedIn</a>
      <a style={btn} href={x(text, shareUrl)} target="_blank" rel="noopener noreferrer">X</a>
      {imageUrl && (
        <a style={btn} href={imageUrl} download target="_blank" rel="noopener noreferrer">↓ Image (Instagram)</a>
      )}
      <button type="button" onClick={copy} style={btn}>{copied ? '✓ Copied' : 'Copy link'}</button>
    </div>
  );
}
