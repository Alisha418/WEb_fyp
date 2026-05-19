/**

 * Shared location display & reporting-area keys (map hotspots + dashboard chart).

 */



export function dedupeLocationParts(value: string): string {

  const raw = value.trim();

  if (!raw) return raw;

  const parts = raw

    .split(/[,;]/)

    .map((p) => p.trim())

    .filter(Boolean);

  const out: string[] = [];

  let lastLower = '';

  for (const p of parts) {

    const pl = p.toLowerCase();

    if (pl === lastLower) continue;

    out.push(p);

    lastLower = pl;

  }

  return out.join(', ');

}



const COORD_LABEL_RE = /^Location\s*\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\)$/i;



const GENERIC_FALLBACK_RE =

  /^(lahore,\s*punjab,\s*54000|faisalabad,\s*punjab,\s*38000|islamabad,\s*ict,\s*44000|karachi,\s*sindh,\s*74000|lahore,\s*punjab|faisalabad,\s*punjab|islamabad,\s*ict|karachi,\s*sindh|unknown area|unknown location)$/i;



const REGION_FALLBACK_RE =

  /(north|south|east|west|central)\s+(punjab|faisalabad)\s+region$/i;



/** City-only / postcode-only labels from offline fallback — need reverse geocode. */

export function isGenericFallbackLabel(text: string | null | undefined): boolean {

  const t = (text ?? '').trim();

  if (!t || t === 'Unknown Area' || t === 'Unknown Location') return true;

  if (COORD_LABEL_RE.test(t)) return true;

  if (GENERIC_FALLBACK_RE.test(t)) return true;

  if (REGION_FALLBACK_RE.test(t)) return true;

  if (/(north|south|east|west|central)\s+faisalabad/i.test(t)) return true;

  if (/\bZone\b/i.test(t) && !/(road|street|block|colony|gulberg|town)/i.test(t)) return true;



  const hasStreetOrAreaHint =

    /(road|rd\.|r\.?d|street|st\.|avenue|ave|block|sector|phase|society|colony|town|township|bazaar|chowk|square|gulberg|saddar|shalimar|faisal|model town|dha|walled city|highway|market|park|grounds?)/i.test(

      t,

    ) || /\b(no\.|plot|#)\s*\d|^\d+[\s,-]/.test(t);



  if (hasStreetOrAreaHint) return false;

  if (t.length < 55) return true;

  return false;

}



/** Prefer the most specific (street-level) label in a hotspot cluster. */

export function pickBestLocationLabel(

  labelCounts: Map<string, number> | Iterable<string>,

): string {

  const labels: string[] =

    labelCounts instanceof Map

      ? Array.from(labelCounts.keys())

      : Array.from(labelCounts);



  if (labels.length === 0) return 'Unknown Area';



  const score = (label: string): number => {

    const count = labelCounts instanceof Map ? labelCounts.get(label) ?? 0 : 1;

    const generic = isGenericFallbackLabel(label) ? 0 : 1000;

    const parts = label.split(',').filter((p) => p.trim()).length;

    return generic + parts * 50 + label.length + count;

  };



  return labels.reduce((best, cur) => (score(cur) > score(best) ? cur : best));

}



/** Coarse named area when no street address (aligned with backend get_local_fallback). */

export function approximateAreaFromCoordinates(

  lat: number | null,

  lng: number | null,

): string {

  if (lat == null || lng == null) return 'Unknown Area';



  if (lat >= 31.35 && lat <= 31.75 && lng >= 72.95 && lng <= 74.15) {

    if (lat >= 31.41 && lat <= 31.43 && lng >= 73.08 && lng <= 73.1) {

      return 'D Ground, Civil Lines, Faisalabad, 38000';

    }

    if (lat >= 31.43 && lat <= 31.47 && lng >= 73.05 && lng <= 73.1) {

      return 'Peoples Colony, Faisalabad, 38000';

    }

    if (lat >= 31.45 && lat <= 31.5 && lng >= 73.08 && lng <= 73.15) {

      return 'Madina Town, Faisalabad, 38000';

    }

    return 'Faisalabad, Punjab, 38000';

  }

  if (lat >= 33.6 && lat <= 33.8 && lng >= 72.8 && lng <= 73.2) {

    if (lat >= 33.68 && lat <= 33.72 && lng >= 73.03 && lng <= 73.08) {

      return 'Srinagar Highway, G-9, Islamabad, 44000';

    }

    if (lat >= 33.705 && lat <= 33.715 && lng >= 73.055 && lng <= 73.085) {

      return 'Blue Area, Islamabad, 44000';

    }

    return 'Islamabad, ICT, 44000';

  }

  if (lat >= 31.4 && lat <= 31.65 && lng >= 74.2 && lng <= 74.5) {

    if (lat >= 31.51 && lat <= 31.53 && lng >= 74.33 && lng <= 74.36) {

      return 'Gulberg III, Lahore, 54660';

    }

    return 'Lahore, Punjab, 54000';

  }

  if (lat >= 24.8 && lat <= 25.0 && lng >= 66.9 && lng <= 67.2) {

    return 'Karachi, Sindh, 74000';

  }

  if (lat >= 40.5 && lat <= 41.0 && lng >= -74.5 && lng <= -73.5) {

    return 'Manhattan, New York, NY 10001';

  }

  return 'Unknown Area';

}



/** Human-readable label for map / lists (never prefer raw lat,lng or city-only fallback). */

export function resolveReportDisplayLocation(report: {

  location?: string;

  location_address?: string;

  lat?: number | null;

  lng?: number | null;

}): string {

  let lat = report.lat ?? null;

  let lng = report.lng ?? null;



  const addr = report.location_address?.trim();

  if (addr && !isGenericFallbackLabel(addr)) {

    return dedupeLocationParts(addr);

  }



  const loc = report.location?.trim();

  if (loc) {

    const m = loc.match(COORD_LABEL_RE);

    if (m) {

      lat = parseFloat(m[1]);

      lng = parseFloat(m[2]);

    } else if (!loc.startsWith('Location (') && loc !== 'Unknown Location' && !isGenericFallbackLabel(loc)) {

      return dedupeLocationParts(loc);

    }

  }



  if (lat != null && lng != null && !Number.isNaN(lat) && !Number.isNaN(lng)) {
    if (loc && !COORD_LABEL_RE.test(loc)) return dedupeLocationParts(loc);
    if (addr) return dedupeLocationParts(addr);
    return dedupeLocationParts(approximateAreaFromCoordinates(lat, lng));
  }

  if (addr) return dedupeLocationParts(addr);
  if (loc) return dedupeLocationParts(loc);
  return 'Unknown Area';
}

/** Human-readable label — prefers geocoded report.location (GPS-based). */
export function humanReadableReportLocation(report: {
  location?: string;
  location_address?: string;
  lat?: number | null;
  lng?: number | null;
}): string {
  const addr = report.location_address?.trim();
  if (addr && !isGenericFallbackLabel(addr)) {
    return dedupeLocationParts(addr);
  }
  const loc = report.location?.trim();
  if (
    loc &&
    !COORD_LABEL_RE.test(loc) &&
    loc !== 'Unknown Location' &&
    !isGenericFallbackLabel(loc)
  ) {
    return dedupeLocationParts(loc);
  }
  return resolveReportDisplayLocation(report);
}



const ZONE_LABELS = new Set([

  'north zone',

  'south zone',

  'east zone',

  'west zone',

  'central zone',

  'unknown zone',

]);



/** Chart + hotspot grouping key — same granularity as map labels (up to 4 address parts). */

export function reportingAreaLabel(locationText: string | null | undefined): string {

  if (!locationText?.trim()) return 'Unknown Area';



  const text = locationText.trim();

  if (ZONE_LABELS.has(text.toLowerCase())) return 'Unknown Area';

  if (isGenericFallbackLabel(text)) return 'Unknown Area';



  const m = text.match(COORD_LABEL_RE);

  if (m) {

    const lat = parseFloat(m[1]);

    const lng = parseFloat(m[2]);

    return reportingAreaLabel(approximateAreaFromCoordinates(lat, lng));

  }



  const skipTokens = new Set([

    'pakistan',

    'punjab',

    'sindh',

    'khyber pakhtunkhwa',

    'balochistan',

    'ict',

    'usa',

    'united states',

    'ny',

    'new york',

  ]);



  const parts = dedupeLocationParts(text)

    .split(',')

    .map((p) => p.trim())

    .filter((part) => {

      const low = part.toLowerCase();

      if (!part) return false;

      if (skipTokens.has(low)) return false;

      if (/^\d{4,6}$/.test(part)) return false;

      if (low.startsWith('location (')) return false;

      if (ZONE_LABELS.has(low)) return false;

      return true;

    });



  if (parts.length === 0) return 'Unknown Area';

  return parts.slice(0, 4).join(', ');

}


