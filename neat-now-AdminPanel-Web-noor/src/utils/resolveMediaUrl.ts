/**
 * Turn Django media paths / API URLs into a browser-loadable URL.
 *
 * - Dev (`import.meta.env.DEV`): returns same-origin paths like `/media/...` so Vite can
 *   proxy them to Django (avoids cross-origin + dev-server COEP quirks).
 * - Production: absolute URL using `VITE_API_URL` origin.
 */

function trimTrailingSlashes(s: string): string {
  return s.replace(/\/+$/, '');
}

/**
 * Backend origin (no `/api`), e.g. `http://192.168.1.5:8000`.
 */
export function getBackendOrigin(): string {
  const raw = (import.meta as ImportMeta & { env: { VITE_API_URL?: string } }).env
    .VITE_API_URL;
  const api = typeof raw === 'string' ? raw.trim() : '';
  // Vercel: VITE_API_URL=/api — same-origin; media via /media proxy in vercel.json
  if (api.startsWith('/')) {
    if (typeof window !== 'undefined') {
      return window.location.origin;
    }
    return '';
  }
  if (api && api.includes('://')) {
    return trimTrailingSlashes(api.replace(/\/api\/?$/, ''));
  }
  if (typeof window === 'undefined') {
    return 'http://127.0.0.1:8000';
  }
  const h = window.location.hostname;
  if (h.endsWith('.vercel.app')) {
    return window.location.origin;
  }
  const isLocal = h === 'localhost' || h === '127.0.0.1';
  return isLocal ? 'http://127.0.0.1:8000' : `http://${h}:8000`;
}

function isLocalBackendHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return (
    h === 'localhost' ||
    h === '127.0.0.1' ||
    h.startsWith('192.168.') ||
    h.startsWith('10.') ||
    h === '10.0.2.2'
  );
}

function mediaPathFromAbsoluteHttp(v: string): string | undefined {
  try {
    const parsed = new URL(v);
    // S3 / CDN URLs must load directly, not via Vite /media proxy
    if (!isLocalBackendHost(parsed.hostname)) {
      return undefined;
    }
    if (parsed.pathname.startsWith('/media/')) {
      return `${parsed.pathname}${parsed.search}`;
    }
    // Django sometimes returns http://host/profiles/... without /media prefix
    if (parsed.pathname.startsWith('/profiles/')) {
      return `/media${parsed.pathname}${parsed.search}`;
    }
  } catch {
    /* ignore */
  }
  return undefined;
}

/**
 * Normalize any backend media reference to a loadable URL for the current environment.
 */
export function resolveMediaUrl(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (typeof value !== 'string') return undefined;
  const v = value.trim();
  if (!v) return undefined;
  if (v.startsWith('data:') || v.startsWith('blob:')) return v;

  const origin = getBackendOrigin();
  const apiEnv = (
    (import.meta as ImportMeta & { env: { VITE_API_URL?: string } }).env.VITE_API_URL || ''
  ).trim();
  const useSameOriginMedia =
    (typeof import.meta !== 'undefined' && import.meta.env?.DEV === true) ||
    apiEnv.startsWith('/') ||
    (typeof window !== 'undefined' && window.location.hostname.endsWith('.vercel.app'));

  const toFinal = (pathFromRoot: string): string => {
    const p = pathFromRoot.startsWith('/') ? pathFromRoot : `/${pathFromRoot}`;
    if (useSameOriginMedia && p.startsWith('/media/')) {
      return p;
    }
    return `${origin}${p}`;
  };

  // Absolute URL
  if (/^https?:\/\//i.test(v)) {
    const path = mediaPathFromAbsoluteHttp(v);
    if (path) {
      return toFinal(path);
    }
    return v;
  }

  if (v.startsWith('/media/')) return toFinal(v);
  if (v.startsWith('media/')) return toFinal(`/${v}`);
  if (v.startsWith('profiles/')) return toFinal(`/media/${v}`);
  if (v.startsWith('/profiles/')) return toFinal(`/media${v}`);

  if (v.startsWith('/')) return toFinal(v);

  // Bare relative path from ImageField / DB (e.g. `profiles/foo.jpg` without prefix)
  return toFinal(`/media/${v}`);
}
