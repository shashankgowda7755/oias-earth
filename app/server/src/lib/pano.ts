/**
 * 360° tour embed safety. We never host panorama bytes — we embed an external
 * 360 host in a sandboxed iframe. Only HTTPS URLs on a known 360/tour provider
 * are accepted, so an admin (or a compromised account) cannot point the embed at
 * an arbitrary page (clickjacking / drive-by in the iframe).
 */
const ALLOWED_HOSTS = [
  'kuula.co',
  'momento360.com',
  'theta360.com',
  'roundme.com',
  'panoraven.com',
  'veer.tv',
  'veer.com',
  'my.matterport.com',
  '360cities.net',
  'google.com', // /maps/embed Street View
  'youtube.com', // 360 video
  'youtube-nocookie.com',
  'vimeo.com',
  'player.vimeo.com',
];

function hostMatch(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return ALLOWED_HOSTS.some((d) => h === d || h.endsWith('.' + d));
}

export function isAllowedEmbedUrl(url: unknown): boolean {
  if (typeof url !== 'string' || url.length > 2000) return false;
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return false;
  }
  return u.protocol === 'https:' && hostMatch(u.hostname);
}

export function providerOf(url: string): string {
  try {
    const h = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
    if (h.endsWith('kuula.co')) return 'kuula';
    if (h.endsWith('momento360.com')) return 'momento360';
    if (h.endsWith('theta360.com')) return 'theta360';
    if (h.endsWith('matterport.com')) return 'matterport';
    if (h.endsWith('google.com')) return 'streetview';
    if (h.endsWith('youtube.com') || h.endsWith('youtube-nocookie.com')) return 'youtube360';
    if (h.endsWith('vimeo.com')) return 'vimeo360';
    return h.split('.').slice(-2).join('.');
  } catch {
    return 'other';
  }
}

export const ALLOWED_TOUR_HOSTS = ALLOWED_HOSTS;
