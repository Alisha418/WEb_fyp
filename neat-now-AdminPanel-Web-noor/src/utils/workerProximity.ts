import type { LiveWorkerLocation } from '../services/firebaseLiveTracking';
import type { Worker } from '../types/worker';

/** Spherical distance (km) between two lat/lng points. */
export function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function minDistanceToReport(
  reportLat: number,
  reportLng: number,
  loc: LiveWorkerLocation
): number {
  const candidates: [number, number][] = [];
  if (Number.isFinite(loc.lat) && Number.isFinite(loc.lng)) {
    candidates.push([loc.lat, loc.lng]);
  }
  if (Number.isFinite(loc.loginLat) && Number.isFinite(loc.loginLng)) {
    candidates.push([loc.loginLat!, loc.loginLng!]);
  }
  if (candidates.length === 0) return Number.POSITIVE_INFINITY;
  return Math.min(...candidates.map(([la, ln]) => distanceKm(reportLat, reportLng, la, ln)));
}

/**
 * `allActive` intersected with IDs in Firebase `live` (workers currently in `workers_live`).
 * Empty `live` → `[]` (callers that need a fallback when Firebase is down should not use this).
 */
export function filterToLiveActiveWorkers(allActive: Worker[], live: LiveWorkerLocation[]): Worker[] {
  if (live.length === 0) return [];
  const liveIds = new Set(live.map((l) => String(l.workerId)));
  return allActive.filter((w) => liveIds.has(String(w.id)));
}

/**
 * Unassigned assign list. Only DB-active workers **also on** `live` (Firebase) are used.
 * - If at least one is within `radiusKm`, return only those, closest first.
 * - Else return all **live** actives, sorted by distance to the report.
 * - No `live` snapshot, or no matching workers → `[]` (use caller fallback when `live` is empty; see modal).
 */
export function orderActiveWorkersByProximity(
  allActive: Worker[],
  live: LiveWorkerLocation[],
  reportLat: number,
  reportLng: number,
  radiusKm = 5
): Worker[] {
  if (!Number.isFinite(reportLat) || !Number.isFinite(reportLng)) {
    return [];
  }
  if (live.length === 0) {
    return [];
  }
  const liveById = new Map(live.map((l) => [String(l.workerId), l]));
  const withLive = allActive.filter((w) => liveById.has(String(w.id)));
  const scored = withLive.map((w) => {
    const loc = liveById.get(String(w.id))!;
    const d = minDistanceToReport(reportLat, reportLng, loc);
    return { w, d };
  });
  const within = scored.filter((s) => s.d <= radiusKm);
  const pool = within.length > 0 ? within : scored;
  pool.sort((a, b) => {
    if (a.d !== b.d) return a.d - b.d;
    return a.w.name.localeCompare(b.w.name, undefined, { sensitivity: 'base' });
  });
  return pool.map((s) => s.w);
}
