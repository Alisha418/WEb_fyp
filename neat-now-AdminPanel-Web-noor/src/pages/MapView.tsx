import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { MapPin, TrendingUp, BarChart, Eye, X, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Circle, MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import '../leaflet-dark-theme.css';
import { Report, ReportStatus } from '../types';
import type { Worker } from '../types/worker';
import { ReportDetailModal } from '../components/ReportDetailModal';
import reportService from '../services/reportService';
import { LiveWorkerLocation, subscribeLiveWorkerLocations } from '../services/firebaseLiveTracking';
import workerService from '../services/workerService';
import {
  dedupeLocationParts,
  humanReadableReportLocation,
  isGenericFallbackLabel,
  pickBestLocationLabel,
} from '../utils/locationLabel';
import {
  isAwaitingAcceptReport,
  isPendingWorkloadReport,
  isUnassignedReport,
} from '../utils/dashboardStats';
interface MapViewProps {
  reports: Report[];
  trendData: any[];
  onReportClick?: (report: Report) => void;
}

type StatusFilter = 'all' | 'pending' | 'unassigned' | 'in_progress' | 'resolved';

// Default focus bounds (Lahore + Faisalabad friendly fallback)
const DEFAULT_BOUNDS = {
  north: 32.2,
  south: 30.8,
  east: 74.9,
  west: 72.4,
};

// Default center moved away from Lahore-only assumption.
const DEFAULT_CENTER: [number, number] = [31.418, 73.079];

const WORKER_LIVE_ICON = L.divIcon({
  html: `
    <div style="
      width: 30px;
      height: 30px;
      border-radius: 50%;
      background: #14532d;
      border: 2px solid #bbf7d0;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 6px 14px rgba(0,0,0,0.35);
      font-size: 16px;
      line-height: 1;
    ">👷</div>
  `,
  className: 'live-worker-marker',
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

const escapeHtml = (value: unknown): string =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const buildWorkerTooltipHtml = (worker: LiveWorkerLocation, workerName: string): string => {
  const loginGps =
    Number.isFinite(worker.loginLat) && Number.isFinite(worker.loginLng)
      ? `${worker.loginLat!.toFixed(5)}, ${worker.loginLng!.toFixed(5)}`
      : `${worker.lat.toFixed(5)}, ${worker.lng.toFixed(5)}`;
  const timeText = worker.updatedAt ? new Date(worker.updatedAt).toLocaleTimeString() : 'Live';
  return `
    <div style="font-size:12px;line-height:1.35">
      <div style="font-weight:700;margin-bottom:2px;">👷 ${escapeHtml(workerName)}</div>
      <div>Current Live: ${escapeHtml(worker.currentAddress || 'Address unavailable')}</div>
      <div>GPS: ${worker.lat.toFixed(5)}, ${worker.lng.toFixed(5)}</div>
      <div>Login Address: ${escapeHtml(worker.loginAddress || worker.currentAddress || 'Address unavailable')}</div>
      <div>Login GPS: ${loginGps}</div>
      <div>${escapeHtml(timeText)}</div>
    </div>
  `;
};

const getHoursSinceSubmission = (report: Report): number => {
  return (new Date().getTime() - new Date(report.submittedAt).getTime()) / (1000 * 60 * 60);
};

const isInProgress = (report: Report): boolean => {
  const status = String(report.status || '').toLowerCase();
  return status === 'in progress' || status === 'in-progress' || status === 'in_progress';
};

const isUnassigned = (report: Report): boolean => isUnassignedReport(report);

const isAwaitingAccept = (report: Report): boolean => isAwaitingAcceptReport(report);

const isPendingWorkload = (report: Report): boolean => isPendingWorkloadReport(report);

const isHighAlertPending = (report: Report): boolean => {
  if (typeof (report as any).high_alert === 'boolean') {
    return Boolean((report as any).high_alert);
  }
  return isUnassigned(report) && getHoursSinceSubmission(report) > 48;
};

// Get marker color based on requested status scheme
const getMarkerColor = (report: Report): string => {
  const status = String(report.status || '').toLowerCase();
  if (status === 'resolved') return '#10b981'; // Green
  if (isInProgress(report)) return '#3b82f6'; // Blue
  if (isUnassigned(report)) return '#f59e0b'; // Yellow — 60 min expired, no accept
  if (isPendingWorkload(report)) return '#ef4444'; // Red — accepted/assigned, not started
  if (isAwaitingAccept(report)) return '#64748b'; // Slate — within 60 min accept window
  return '#6b7280'; // Gray (fallback)
};

const matchesStatusFilter = (report: Report, statusFilter: StatusFilter): boolean => {
  if (statusFilter === 'all') return true;
  if (statusFilter === 'pending') return isPendingWorkload(report);
  if (statusFilter === 'unassigned') return isUnassigned(report);
  if (statusFilter === 'in_progress') return isInProgress(report);
  if (statusFilter === 'resolved') return String(report.status || '').toLowerCase() === 'resolved';
  return true;
};

const getDisplayStatus = (report: Report): string => {
  if (String(report.status || '').toLowerCase() === 'resolved') return 'Resolved';
  if (isInProgress(report)) return 'In Progress';
  if (isUnassigned(report)) return 'Unassigned';
  if (isAwaitingAccept(report)) return 'Awaiting Acceptance';
  if (isPendingWorkload(report)) return 'Pending';
  return String(report.status || 'Unknown');
};

const getReportedByLabel = (report: Report): string => {
  const raw = String((report as any).reported_by || '').toLowerCase();
  if (raw.includes('admin')) return 'Assigned by Admin';
  return 'Reported by Citizen';
};

const normalizeLocationLabel = (report: Report): string => {
  const lat = report.lat ?? (report as { latitude?: number }).latitude ?? null;
  const lng = report.lng ?? (report as { longitude?: number }).longitude ?? null;
  if (lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng)) {
    const cached = reportService.getCachedLocation(lat, lng);
    if (cached) return cached;
  }
  const loc = report.location?.trim();
  if (loc && !isGenericFallbackLabel(loc)) {
    return dedupeLocationParts(loc);
  }
  return humanReadableReportLocation({
    location: report.location,
    location_address: report.location_address,
    lat,
    lng,
  });
};

const HOTSPOT_MERGE_RADIUS_KM = 2;

/** Stable hotspot id from coordinates (survives re-cluster when reports refresh). */
const hotspotGeoKey = (lat: number, lng: number) =>
  `geo:${lat.toFixed(4)},${lng.toFixed(4)}`;
const toRad = (d: number) => (d * Math.PI) / 180;
const distanceKm = (aLat: number, aLng: number, bLat: number, bLng: number) => {
  const R = 6371;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
};

// Create custom HTML marker icons
const createMarkerIcon = (report: Report, color: string) => {
  const highAlert = isHighAlertPending(report);
  return L.divIcon({
    html: `
      <div style="
        position: relative;
        width: 32px;
        height: 32px;
        background-color: ${color};
        border: 3px solid white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
        cursor: pointer;
        transition: transform 0.2s;
      ">
        <div style="
          width: 8px;
          height: 8px;
          background-color: white;
          border-radius: 50%;
        "></div>
        ${highAlert ? `
          <div style="
            position: absolute;
            right: -7px;
            top: -7px;
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background: #dc2626;
            border: 2px solid white;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 11px;
            font-weight: 700;
            box-shadow: 0 2px 8px rgba(0,0,0,0.45);
          ">!</div>
        ` : ''}
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
    className: 'custom-marker'
  });
};

// Component to manage map bounds and initialization
function MapBoundsAdjuster({ reports, selectedZone }: { reports: Report[]; selectedZone: string }) {
  const map = useMap();
  
  useEffect(() => {
    // Small delay to ensure map is fully mounted
    const timer = setTimeout(() => {
      try {
        if (reports.length === 0) {
          map.fitBounds([
            [DEFAULT_BOUNDS.south, DEFAULT_BOUNDS.west],
            [DEFAULT_BOUNDS.north, DEFAULT_BOUNDS.east]
          ]);
          return;
        }
        
        // Collect valid report coordinates
        const validCoords: [number, number][] = reports
          .map((report: Report) => {
            const lat = report.lat || (report as any).latitude;
            const lng = report.lng || (report as any).longitude;
            
            if (!lat || !lng) return null;
            
            // Accept any valid geographic coordinate (FSD + other cities supported)
            if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
              return [lat, lng] as [number, number];
            }
            
            return null;
          })
          .filter((coord): coord is [number, number] => coord !== null);
        
        if (validCoords.length === 0) {
          map.fitBounds([
            [DEFAULT_BOUNDS.south, DEFAULT_BOUNDS.west],
            [DEFAULT_BOUNDS.north, DEFAULT_BOUNDS.east]
          ]);
          return;
        }
        
        // Calculate bounds with padding
        const bounds = L.latLngBounds(validCoords);
        map.fitBounds(bounds, { padding: [50, 50] });
      } catch (err) {
        console.warn('Map bounds error:', err);
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, [reports, map, selectedZone]);
  
  return null;
}

function HotspotFocusController({
  reports,
  selectedLocation,
}: {
  reports: Report[];
  selectedLocation: string | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (!selectedLocation) return;

    const points: [number, number][] = reports
      .filter(
        (r) => (String(r.location || 'Unknown Location').trim() || 'Unknown Location') === selectedLocation,
      )
      .map((r) => {
        const lat = r.lat || (r as any).latitude;
        const lng = r.lng || (r as any).longitude;
        return [lat, lng] as [number, number];
      })
      .filter(
        (p) =>
          Number.isFinite(p[0]) &&
          Number.isFinite(p[1]) &&
          p[0] >= -90 &&
          p[0] <= 90 &&
          p[1] >= -180 &&
          p[1] <= 180,
      );

    if (!points.length) return;

    if (points.length === 1) {
      map.flyTo(points[0], Math.max(map.getZoom(), 17), { duration: 0.5 });
      return;
    }

    map.fitBounds(L.latLngBounds(points), { padding: [50, 50], maxZoom: 18 });
  }, [map, reports, selectedLocation]);

  return null;
}

function ActiveWorkersFocusController({
  workers,
  enabled,
}: {
  workers: LiveWorkerLocation[];
  enabled: boolean;
}) {
  const map = useMap();

  useEffect(() => {
    if (!enabled || workers.length === 0) return;

    const points: [number, number][] = workers
      .map((w) => [w.lat, w.lng] as [number, number])
      .filter((p) => Number.isFinite(p[0]) && Number.isFinite(p[1]));

    if (!points.length) return;
    if (points.length === 1) {
      map.flyTo(points[0], Math.max(map.getZoom(), 12), { duration: 0.5 });
      return;
    }

    map.fitBounds(L.latLngBounds(points), { padding: [60, 60], maxZoom: 15 });
  }, [enabled, workers, map]);

  return null;
}

function WorkerLocateController({
  target,
  onHandled,
}: {
  target: { lat: number; lng: number; workerId: string } | null;
  onHandled: () => void;
}) {
  const map = useMap();

  useEffect(() => {
    if (!target) return;
    map.flyTo([target.lat, target.lng], Math.max(map.getZoom(), 16), { duration: 0.55 });
    onHandled();
  }, [target, map, onHandled]);

  return null;
}

interface SpiderfyMarkersProps {
  reports: Report[];
  onHover: (report: Report | null) => void;
  onView: (report: Report) => void;
}

function SpiderfyMarkers({ reports, onHover, onView }: SpiderfyMarkersProps) {
  const map = useMap();

  useEffect(() => {
    const clusterGroup = (L as any).markerClusterGroup({
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      // We handle click manually for reliable zoom->spiderfy flow.
      zoomToBoundsOnClick: false,
      maxClusterRadius: 48,
      iconCreateFunction: (cluster: any) => {
        const childReports: Report[] = cluster
          .getAllChildMarkers()
          .map((m: any) => m.__report as Report | undefined)
          .filter(Boolean);

        let bg = '#64748b';
        if (childReports.some((r) => isInProgress(r))) bg = '#3b82f6';
        else if (childReports.some((r) => isUnassigned(r))) bg = '#f59e0b';
        else if (childReports.some((r) => isPendingWorkload(r))) bg = '#ef4444';
        else if (childReports.some((r) => isAwaitingAccept(r))) bg = '#64748b';
        else if (childReports.some((r) => String(r.status || '').toLowerCase() === 'resolved')) bg = '#10b981';

        return L.divIcon({
          html: `<div style="
            width: 38px;height: 38px;border-radius: 50%;
            background: ${bg};
            border: 3px solid rgba(255,255,255,0.95);
            color: white;display: flex;align-items: center;justify-content: center;
            font-weight: 800;box-shadow: 0 6px 14px rgba(0,0,0,0.35);
          ">${childReports.length}</div>`,
          className: 'status-cluster-icon',
          iconSize: [38, 38],
        });
      },
    });

    reports.forEach((report) => {
      const lat = report.lat || (report as any).latitude || DEFAULT_CENTER[0];
      const lng = report.lng || (report as any).longitude || DEFAULT_CENTER[1];
      if (!lat || !lng || lat < -90 || lat > 90 || lng < -180 || lng > 180) return;

      const color = getMarkerColor(report);
      const marker = L.marker([lat, lng], {
        icon: createMarkerIcon(report, color),
      });
      (marker as any).__report = report;

      marker.on('mouseover', () => onHover(report));
      marker.on('mouseout', () => onHover(null));
      marker.on('click', () => onView(report));
      clusterGroup.addLayer(marker);
    });

    clusterGroup.on('clusterclick', (e: any) => {
      const childMarkers: any[] = e.layer.getAllChildMarkers();

      // Expected UX: click cluster -> zoom in -> then show bins (spiderfy).
      try {
        const targetZoom = 18;
        const bounds = e.layer.getBounds();
        const needsZoom = map.getZoom() < targetZoom;

        const forceSpiderfyVisibleParent = () => {
          try {
            if (!childMarkers.length) return;
            // After zoom animation, old cluster instance may be replaced.
            // Resolve current visible parent cluster and spiderfy that one.
            if (e?.layer && typeof e.layer.spiderfy === 'function') {
              e.layer.spiderfy();
              return;
            }
            const parent = clusterGroup.getVisibleParent(childMarkers[0]);
            if (parent && typeof parent.spiderfy === 'function') {
              parent.spiderfy();
            }
          } catch (_) {}
        };

        if (needsZoom) {
          map.fitBounds(bounds, { padding: [40, 40], maxZoom: targetZoom });
          map.once('moveend', () => {
            // Slight delay helps cluster recalc complete before spiderfy.
            setTimeout(forceSpiderfyVisibleParent, 80);
          });
        } else {
          forceSpiderfyVisibleParent();
        }
      } catch (_) {
        try {
          map.fitBounds(e.layer.getBounds(), { padding: [40, 40], maxZoom: 18 });
        } catch (_) {}
      }
    });

    map.addLayer(clusterGroup);
    return () => {
      map.removeLayer(clusterGroup);
    };
  }, [map, reports, onHover, onView]);

  return null;
}

function WorkerSpiderfyMarkers({
  workers,
  workerNameById,
}: {
  workers: LiveWorkerLocation[];
  workerNameById: Map<string, string>;
}) {
  const map = useMap();

  useEffect(() => {
    const clusterGroup = (L as any).markerClusterGroup({
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: false,
      maxClusterRadius: 42,
      iconCreateFunction: (cluster: any) => {
        const count = cluster.getAllChildMarkers().length;
        return L.divIcon({
          html: `<div style="
            width: 36px;height: 36px;border-radius: 50%;
            background: #166534;
            border: 3px solid rgba(255,255,255,0.95);
            color: white;display: flex;align-items: center;justify-content: center;
            font-weight: 800;box-shadow: 0 6px 14px rgba(0,0,0,0.35);
          ">${count}</div>`,
          className: 'worker-cluster-icon',
          iconSize: [36, 36],
        });
      },
    });

    workers.forEach((worker) => {
      if (!Number.isFinite(worker.lat) || !Number.isFinite(worker.lng)) return;
      const workerName = workerNameById.get(worker.workerId) || `Worker ${worker.workerId}`;
      const marker = L.marker([worker.lat, worker.lng], {
        icon: WORKER_LIVE_ICON,
      });
      marker.bindTooltip(buildWorkerTooltipHtml(worker, workerName), {
        direction: 'top',
        offset: [0, -6],
      });
      clusterGroup.addLayer(marker);
    });

    clusterGroup.on('clusterclick', (e: any) => {
      const childMarkers: any[] = e.layer.getAllChildMarkers();
      try {
        const targetZoom = 18;
        const bounds = e.layer.getBounds();
        const needsZoom = map.getZoom() < targetZoom;

        const forceSpiderfyVisibleParent = () => {
          try {
            if (!childMarkers.length) return;
            if (e?.layer && typeof e.layer.spiderfy === 'function') {
              e.layer.spiderfy();
              return;
            }
            const parent = clusterGroup.getVisibleParent(childMarkers[0]);
            if (parent && typeof parent.spiderfy === 'function') {
              parent.spiderfy();
            }
          } catch (_) {}
        };

        if (needsZoom) {
          map.fitBounds(bounds, { padding: [40, 40], maxZoom: targetZoom });
          map.once('moveend', () => setTimeout(forceSpiderfyVisibleParent, 80));
        } else {
          forceSpiderfyVisibleParent();
        }
      } catch (_) {
        try {
          map.fitBounds(e.layer.getBounds(), { padding: [40, 40], maxZoom: 18 });
        } catch (_) {}
      }
    });

    map.addLayer(clusterGroup);
    return () => {
      map.removeLayer(clusterGroup);
    };
  }, [map, workers, workerNameById]);

  return null;
}


export function MapView({ reports, trendData, onReportClick }: MapViewProps) {
  const [selectedZone, setSelectedZone] = useState('All');
  const [selectedHotspotLocation, setSelectedHotspotLocation] = useState(null as string | null);
  const [statusFilter, setStatusFilter] = useState('all' as StatusFilter);
  // Default ON every visit so the map and right-side "Active Workers Live"
  // panel show pins as soon as the page opens — matches prior product
  // behaviour where active workers were visible automatically on login.
  // Intentionally NOT persisted: an accidental off-toggle from a previous
  // session must never silently hide live workers on the next visit.
  const [showActiveWorkers, setShowActiveWorkers] = useState<boolean>(true);

  // Clean up any legacy persisted value from older builds so it can't
  // resurface as a default elsewhere.
  useEffect(() => {
    try {
      window.localStorage.removeItem('map.showActiveWorkers');
    } catch {
      // ignore storage failures (private mode etc.)
    }
  }, []);
  const [hoveredReport, setHoveredReport] = useState(null as Report | null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null as string | null);
  const [localReports, setLocalReports] = useState(reports as Report[]);
  const [selectedReport, setSelectedReport] = useState(null as Report | null);
  const [liveWorkerLocations, setLiveWorkerLocations] = useState([] as LiveWorkerLocation[]);
  // Workers that the backend EXPLICITLY reports as is_tracking=false
  // (e.g., admin force-inactive). Used as a soft "hide" signal only —
  // never used to gate display when the backend call itself fails, so
  // a transient /workers/ outage cannot blank out the live map.
  const [explicitlyInactiveWorkerIds, setExplicitlyInactiveWorkerIds] = useState(new Set<string>());
  const [workerNamesFromBackend, setWorkerNamesFromBackend] = useState(new Map<string, string>());
  const [locateWorkerTarget, setLocateWorkerTarget] = useState(null as { lat: number; lng: number; workerId: string } | null);
  const [hotspotDisplayLabels, setHotspotDisplayLabels] = useState({} as Record<string, string>);

  // ✅ Fetch reports from backend on component mount
  useEffect(() => {
    const fetchReports = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log('🔄 Fetching reports from MapView...');
        const response = await reportService.getReports({ page_size: 50, maxPages: 8 });
        const backendReports = response?.data || [];
        console.log(`✅ Loaded ${backendReports.length} reports for map`, backendReports);
        setLocalReports(backendReports);
        setSelectedZone('All');
        void reportService.enrichReportLocations(
          backendReports,
          (updated) => {
            setLocalReports([...updated]);
          },
          { maxCoords: 50 },
        );
      } catch (err: any) {
        console.error('❌ Failed to fetch reports:', err);
        setError('Failed to load reports');
        
        console.log('🔄 Falling back to prop reports:', reports.length, 'reports');
        setLocalReports(reports);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, []);

  // Update local reports when props change
  useEffect(() => {
    setLocalReports(reports);
  }, [reports]);

  useEffect(() => {
    const unsub = subscribeLiveWorkerLocations(setLiveWorkerLocations);
    return () => unsub();
  }, []);

  const loadWorkerTrackingState = useCallback(async () => {
    try {
      const response = await workerService.getWorkers({ page_size: 500 });
      const rows = response?.results || [];
      const nameMap = new Map<string, string>();
      const inactive = new Set<string>();
      rows.forEach((w: any) => {
        const id = String(w?.worker_id ?? w?.id ?? w?.account_id ?? '').trim();
        const name = String(w?.account?.name ?? w?.name ?? '').trim();
        if (id && name) nameMap.set(id, name);
        // Only collect EXPLICIT inactivity so a missing/failed response
        // never hides a live worker. Backend is authoritative only when
        // it actually answers and says is_tracking === false.
        if (id && w?.is_tracking === false) inactive.add(id);
      });
      setWorkerNamesFromBackend(nameMap);
      setExplicitlyInactiveWorkerIds(inactive);
    } catch (e) {
      console.warn('Failed to load worker tracking state for live map:', e);
      // Intentionally do NOT clear previously known state — keep showing
      // live Firebase pins so a transient API failure cannot empty the map.
    }
  }, []);

  useEffect(() => {
    loadWorkerTrackingState();
    const interval = setInterval(loadWorkerTrackingState, 15000);
    return () => clearInterval(interval);
  }, [loadWorkerTrackingState]);

  /**
   * Firebase `workers_live` is the source of truth for "currently live"
   * (matches firebaseLiveTracking.ts + workerProximity.ts).
   *
   * A worker is only hidden when the backend EXPLICITLY reports
   * is_tracking=false (e.g., admin force-inactive). In that flow the
   * Workers page also removes the Firebase node, so a stale ghost pin
   * during the brief sync window is the only thing this guards against.
   *
   * Critically, we do NOT require backend is_tracking=true — that caused
   * just-logged-in workers (whose mobile-side setWorkerTrackingStatus
   * call may have failed or not yet propagated) to disappear from the
   * map and "Active Workers Live" panel even though their live pin was
   * actively being pushed every 30s.
   */
  const verifiedLiveWorkers = useMemo(() => {
    return liveWorkerLocations.filter(
      (w) => !explicitlyInactiveWorkerIds.has(String(w.workerId)),
    );
  }, [liveWorkerLocations, explicitlyInactiveWorkerIds]);
  
  const zones: string[] = ['All', ...Array.from(new Set(localReports.map((r: Report) => r.zone))) as string[]];
  console.log('📊 Zones available:', zones, 'Total reports:', localReports.length, 'Selected zone:', selectedZone);
  
  const zoneData = zones.slice(1).map((zone: string) => ({
    zone,
    reports: localReports.filter((r: Report) => r.zone === zone).length,
    pending: localReports.filter((r: Report) => r.zone === zone && isPendingWorkload(r)).length,
    unassigned: localReports.filter((r: Report) => r.zone === zone && isUnassigned(r)).length,
    inProgress: localReports.filter((r: Report) => r.zone === zone && isInProgress(r)).length,
    resolved: localReports.filter((r: Report) => r.zone === zone && String(r.status).toLowerCase() === 'resolved').length,
    highAlert: localReports.filter((r: Report) => r.zone === zone && isHighAlertPending(r)).length,
  }));

  const zoneFilteredReports = useMemo(
    () =>
      selectedZone === 'All'
        ? localReports
        : localReports.filter((r: Report) => r.zone === selectedZone),
    [localReports, selectedZone],
  );

  const hotspotClusters = useMemo(() => {
    type Cluster = {
      key: string;
      label: string;
      latSum: number;
      lngSum: number;
      count: number;
      points: Array<{ lat: number; lng: number }>;
      reportIds: Set<string>;
      pending: number;
      unassigned: number;
      inProgress: number;
      resolved: number;
      labelCounts: Map<string, number>;
    };

    const clusters: Cluster[] = [];
    const unknownBuckets = new Map<string, Cluster>();

    zoneFilteredReports.forEach((r) => {
      const reportId = String((r as any).id ?? '');
      const loc = normalizeLocationLabel(r);
      const lat = Number(r.lat || (r as any).latitude);
      const lng = Number(r.lng || (r as any).longitude);
      const status = String(r.status || '').toLowerCase();

      // Rejected reports must not contribute to hotspot active workload counts.
      if (status === 'rejected') return;

      const applyStatus = (cluster: Cluster) => {
        cluster.count += 1;
        if (reportId) cluster.reportIds.add(reportId);
        cluster.labelCounts.set(loc, (cluster.labelCounts.get(loc) || 0) + 1);
        if (status === 'resolved') cluster.resolved += 1;
        else if (isInProgress(r)) cluster.inProgress += 1;
        else if (isUnassigned(r)) cluster.unassigned += 1;
        else if (isPendingWorkload(r)) cluster.pending += 1;
        // awaiting accept: not counted in pending/unassigned hotspots
      };

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        const fallbackKey = `unknown:${loc.toLowerCase()}`;
        if (!unknownBuckets.has(fallbackKey)) {
          unknownBuckets.set(fallbackKey, {
            key: fallbackKey,
            label: loc,
            latSum: 0,
            lngSum: 0,
            count: 0,
            points: [],
            reportIds: new Set<string>(),
            pending: 0,
            unassigned: 0,
            inProgress: 0,
            resolved: 0,
            labelCounts: new Map<string, number>(),
          });
        }
        applyStatus(unknownBuckets.get(fallbackKey)!);
        return;
      }

      let nearestIndex = -1;
      let nearestDistance = Number.POSITIVE_INFINITY;
      clusters.forEach((c, idx) => {
        const centerLat = c.latSum / c.count;
        const centerLng = c.lngSum / c.count;
        const d = distanceKm(lat, lng, centerLat, centerLng);
        if (d < nearestDistance) {
          nearestDistance = d;
          nearestIndex = idx;
        }
      });

      if (nearestIndex >= 0 && nearestDistance <= HOTSPOT_MERGE_RADIUS_KM) {
        const target = clusters[nearestIndex];
        target.latSum += lat;
        target.lngSum += lng;
        target.points.push({ lat, lng });
        applyStatus(target);
      } else {
        const key = hotspotGeoKey(lat, lng);
        const cluster: Cluster = {
          key,
          label: loc,
          latSum: lat,
          lngSum: lng,
          count: 0,
          points: [{ lat, lng }],
          reportIds: new Set<string>(),
          pending: 0,
          unassigned: 0,
          inProgress: 0,
          resolved: 0,
          labelCounts: new Map<string, number>(),
        };
        applyStatus(cluster);
        clusters.push(cluster);
      }
    });

    const merged = [...clusters, ...unknownBuckets.values()];
    return merged
      .map((c) => {
        const bestLabel = pickBestLocationLabel(c.labelCounts);
        return {
          key: c.key,
          location: bestLabel,
          total: c.count,
          pending: c.pending,
          unassigned: c.unassigned,
          inProgress: c.inProgress,
          resolved: c.resolved,
          center:
            c.count > 0 && c.points.length > 0
              ? { lat: c.latSum / c.count, lng: c.lngSum / c.count }
              : null,
          points: c.points,
          reportIds: c.reportIds,
        };
      })
      .filter((row) => row.pending > 0 || row.unassigned > 0 || row.inProgress > 0)
      .sort((a, b) => b.total - a.total);
  }, [zoneFilteredReports]);

  useEffect(() => {
    let cancelled = false;
    const targets = hotspotClusters.filter(
      (c) => c.center && isGenericFallbackLabel(hotspotDisplayLabels[c.key] ?? c.location),
    );
    if (targets.length === 0) return;

    void reportService.geocodePoints(
      targets.map((c) => ({
        id: c.key,
        lat: c.center!.lat,
        lng: c.center!.lng,
      })),
      (id, address) => {
        if (!cancelled) {
          setHotspotDisplayLabels((prev) => ({ ...prev, [id]: address }));
        }
      },
      8,
    );

    return () => {
      cancelled = true;
    };
  }, [hotspotClusters]);

  const locationFilteredReports = useMemo(() => {
    if (!selectedHotspotLocation) return zoneFilteredReports;
    const selected = hotspotClusters.find((c) => c.key === selectedHotspotLocation);
    if (!selected) return zoneFilteredReports;
    if (selected.reportIds.size === 0) {
      return zoneFilteredReports.filter(
        (r: Report) => normalizeLocationLabel(r) === selected.location,
      );
    }
    return zoneFilteredReports.filter((r: Report) => selected.reportIds.has(String((r as any).id ?? '')));
  }, [zoneFilteredReports, selectedHotspotLocation, hotspotClusters]);

  const filteredReports = useMemo(
    () => locationFilteredReports.filter((r) => matchesStatusFilter(r, statusFilter)),
    [locationFilteredReports, statusFilter],
  );

  const hotspotLocationData = useMemo(
    () =>
      hotspotClusters.map((c) => ({
        key: c.key,
        location: hotspotDisplayLabels[c.key] ?? c.location,
        total: c.total,
        pending: c.pending,
        unassigned: c.unassigned,
        inProgress: c.inProgress,
        resolved: c.resolved,
      })),
    [hotspotClusters, hotspotDisplayLabels],
  );

  const hotspotCentroids = useMemo(
    () =>
      new Map(
        hotspotClusters
          .filter((c) => c.center)
          .map((c) => [c.key, { lat: c.center!.lat, lng: c.center!.lng }]),
      ),
    [hotspotClusters],
  );

  const hotspotPoints = useMemo(
    () => new Map(hotspotClusters.map((c) => [c.key, c.points])),
    [hotspotClusters],
  );

  const selectedHotspotCenter = useMemo(
    () => (selectedHotspotLocation ? hotspotCentroids.get(selectedHotspotLocation) || null : null),
    [selectedHotspotLocation, hotspotCentroids],
  );

  const activeWorkersByHotspot = useMemo(() => {
    if (!showActiveWorkers || hotspotCentroids.size === 0) return new Map<string, number>();
    const counts = new Map<string, number>();
    const thresholdKm =5;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const distanceKm = (aLat: number, aLng: number, bLat: number, bLng: number) => {
      const R = 6371;
      const dLat = toRad(bLat - aLat);
      const dLng = toRad(bLng - aLng);
      const x =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
      return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
    };

    verifiedLiveWorkers.forEach((w) => {
      let nearestLoc: string | null = null;
      let nearestDist = Number.POSITIVE_INFINITY;

      hotspotPoints.forEach((points, loc) => {
        if (!points.length) return;
        points.forEach((p) => {
          const d = distanceKm(w.lat, w.lng, p.lat, p.lng);
          if (d < nearestDist) {
            nearestDist = d;
            nearestLoc = loc;
          }
        });
      });

      if (!nearestLoc) {
        hotspotCentroids.forEach((c, loc) => {
          const d = distanceKm(w.lat, w.lng, c.lat, c.lng);
          if (d < nearestDist) {
            nearestDist = d;
            nearestLoc = loc;
          }
        });
      }

      if (nearestLoc && nearestDist <= thresholdKm) {
        counts.set(nearestLoc, (counts.get(nearestLoc) || 0) + 1);
      }
    });
    return counts;
  }, [showActiveWorkers, verifiedLiveWorkers, hotspotCentroids, hotspotPoints]);

  const workerNearestHotspotLabel = useMemo(() => {
    const out = new Map<string, string>();
    if (hotspotCentroids.size === 0) return out;

    const thresholdKm = 5;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const distanceKm = (aLat: number, aLng: number, bLat: number, bLng: number) => {
      const R = 6371;
      const dLat = toRad(bLat - aLat);
      const dLng = toRad(bLng - aLng);
      const x =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
      return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
    };

    verifiedLiveWorkers.forEach((w) => {
      let nearestLoc = 'Outside hotspot range';
      let nearestDist = Number.POSITIVE_INFINITY;
      hotspotPoints.forEach((points, loc) => {
        points.forEach((p) => {
          const d = distanceKm(w.lat, w.lng, p.lat, p.lng);
          if (d < nearestDist) {
            nearestDist = d;
            nearestLoc = loc;
          }
        });
      });
      if (nearestLoc === 'Outside hotspot range') {
        hotspotCentroids.forEach((c, loc) => {
          const d = distanceKm(w.lat, w.lng, c.lat, c.lng);
          if (d < nearestDist) {
            nearestDist = d;
            nearestLoc = loc;
          }
        });
      }
      if (nearestDist <= thresholdKm) {
        out.set(w.workerId, nearestLoc);
      } else {
        out.set(w.workerId, 'Outside 5km radius');
      }
    });

    return out;
  }, [verifiedLiveWorkers, hotspotCentroids, hotspotPoints]);

  const displayedLiveWorkers = useMemo(() => {
    if (!showActiveWorkers) return [];
    if (!selectedHotspotLocation) return verifiedLiveWorkers;

    const selectedCenter = hotspotCentroids.get(selectedHotspotLocation);
    const selectedPoints = hotspotPoints.get(selectedHotspotLocation) || [];
    if (!selectedCenter && selectedPoints.length === 0) return [];

    const toRad = (d: number) => (d * Math.PI) / 180;
    const distanceKm = (aLat: number, aLng: number, bLat: number, bLng: number) => {
      const R = 6371;
      const dLat = toRad(bLat - aLat);
      const dLng = toRad(bLng - aLng);
      const x =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
      return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
    };

      // Show only workers within 5km of selected hotspot center.
    return verifiedLiveWorkers.filter((w) => {
      let nearest = Number.POSITIVE_INFINITY;
      selectedPoints.forEach((p) => {
        const d = distanceKm(w.lat, w.lng, p.lat, p.lng);
        if (d < nearest) nearest = d;
      });
      if (selectedCenter) {
        const dCenter = distanceKm(w.lat, w.lng, selectedCenter.lat, selectedCenter.lng);
        nearest = Math.min(nearest, dCenter);
      }
      return nearest <= 5;
    });
  }, [
    showActiveWorkers,
    selectedHotspotLocation,
    verifiedLiveWorkers,
    hotspotCentroids,
    hotspotPoints,
  ]);

  const exactLiveWorkers = useMemo(() => displayedLiveWorkers, [displayedLiveWorkers]);
  const panelLiveWorkers = useMemo(() => {
    return exactLiveWorkers.length > 0 ? exactLiveWorkers : verifiedLiveWorkers;
  }, [exactLiveWorkers, verifiedLiveWorkers]);

  const workerNameById = useMemo(() => {
    const out = new Map<string, string>(workerNamesFromBackend);
    localReports.forEach((r) => {
      if (r.workerId && r.workerName) {
        out.set(String(r.workerId), String(r.workerName));
      }
    });
    return out;
  }, [localReports, workerNamesFromBackend]);

  const workerTaskCounts = useMemo(() => {
    const counts = new Map<string, { pending: number; inProgress: number }>();

    const normalizeWorkerId = (report: Report): string => {
      const direct = (report as any).workerId ?? (report as any).worker_id ?? report.workerId;
      if (direct !== null && direct !== undefined && String(direct).trim() !== '') {
        return String(direct).trim();
      }

      const workerName = String((report as any).workerName ?? (report as any).worker_name ?? '').trim();
      if (workerName) {
        const matched = [...workerNameById.entries()].find(([, name]) => name === workerName);
        if (matched) return matched[0];
      }
      return '';
    };

    localReports.forEach((r) => {
      const workerId = normalizeWorkerId(r);
      if (!workerId) return;
      const status = String(r.status || '').toLowerCase();
      const prev = counts.get(workerId) || { pending: 0, inProgress: 0 };
      if (isPendingWorkload(r)) prev.pending += 1;
      if (status === 'in progress' || status === 'in-progress' || status === 'in_progress') prev.inProgress += 1;
      counts.set(workerId, prev);
    });
    return counts;
  }, [localReports, workerNameById]);

  const refreshMapReports = useCallback(async () => {
    const response = await reportService.getReports({ page_size: 50, maxPages: 8 });
    const rows = response?.data || [];
    setLocalReports(rows);
    void reportService.enrichReportLocations(
      rows,
      (updated) => {
        setLocalReports([...updated]);
      },
      { maxCoords: 100 },
    );
  }, []);
  
  console.log('🗺️ Filtered reports for display:', filteredReports.length, 'Zone filter:', selectedZone);
  
  const handleViewReport = useCallback(async (report: Report) => {
    try {
      // Fetch full report details from backend (transformed shape for modal).
      const response = await reportService.getReportById(report.id);
      const fullReport = response?.data || report;
      
      setSelectedReport(fullReport);
      
      if (onReportClick) {
        onReportClick(fullReport);
      }
    } catch (err) {
      console.error('Error fetching report:', err);
      // Fallback: open modal with available data
      setSelectedReport(report);
      if (onReportClick) {
        onReportClick(report);
      }
    }
  }, [onReportClick]);

  const handleAssignFromModal = useCallback(async (reportId: string, workerId: string) => {
    await reportService.assignWorker(reportId, workerId);
    await refreshMapReports();
    const response = await reportService.getReportById(reportId);
    if (response?.data) {
      setSelectedReport(response.data);
    }
  }, [refreshMapReports]);

  const handleOverrideStatusFromModal = useCallback(async (reportId: string, status: ReportStatus) => {
    await reportService.updateStatus(reportId, status);
    await refreshMapReports();
    const response = await reportService.getReportById(reportId);
    if (response?.data) {
      setSelectedReport(response.data);
    }
  }, [refreshMapReports]);

  const handleZoneFilterChange = async (zone: string) => {
    console.log('🎯 Zone filter changed to:', zone);
    setSelectedZone(zone);
    setSelectedHotspotLocation(null);
    setLoading(true);
    
    try {
      if (zone !== 'All') {
        const zoneReports = localReports.filter((r: Report) => r.zone === zone);
        console.log(`📍 Showing ${zoneReports.length} reports for zone: ${zone}`);
      } else {
        console.log(`📍 Showing all ${localReports.length} reports`);
      }
    } catch (err) {
      setError('Failed to filter zone data');
      console.error('Error filtering zone data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusFilterChange = (next: StatusFilter) => {
    setStatusFilter(next);
  };
  
  return (
    <div className="space-y-6">
      {/* Zone Filter */}
      <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-4">
        <div className="flex items-center gap-4">
          <MapPin className="w-5 h-5 text-emerald-500" />
          <div className="flex-1">
            <label className="block text-sm text-slate-400 mb-2">Filter by Zone</label>
            <select
              value={selectedZone}
              onChange={(e) => handleZoneFilterChange(e.target.value)}
              disabled={loading}
              className="w-full max-w-xs px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50"
            >
              {zones.map(zone => (
                <option key={zone} value={zone}>{zone}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
      
      {/* Map & Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Interactive Leaflet Map */}
        <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/80">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-white flex items-center gap-2">
                <MapPin className="w-5 h-5 text-emerald-500" />
                Geographic Distribution
              </h3>
              <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/70 text-xs text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showActiveWorkers}
                  onChange={(e) => setShowActiveWorkers(e.target.checked)}
                  className="accent-emerald-500"
                />
                <span className="font-semibold">Show All Workers</span>
                <span className={showActiveWorkers ? 'text-emerald-300' : 'text-slate-400'}>
                  {showActiveWorkers ? 'ON' : 'OFF'}
                </span>
              </label>
            </div>
          </div>
          
          <div className="relative h-[400px] bg-slate-950">
            <MapContainer
              center={DEFAULT_CENTER}
              zoom={13}
              className="w-full h-full z-0"
              style={{
                background: '#0f172a'
              }}
            >
              {/* OpenStreetMap tiles - vibrant colors */}
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; OpenStreetMap contributors'
                opacity={0.85}
                crossOrigin="anonymous"
              />
              
              {/* Map bounds adjuster */}
              <MapBoundsAdjuster reports={filteredReports} selectedZone={selectedZone} />
              <HotspotFocusController
                reports={zoneFilteredReports}
                selectedLocation={selectedHotspotLocation}
              />
              <ActiveWorkersFocusController
                workers={exactLiveWorkers}
                enabled={showActiveWorkers && !selectedHotspotLocation && !locateWorkerTarget}
              />
              <WorkerLocateController
                target={locateWorkerTarget}
                onHandled={() => setLocateWorkerTarget(null)}
              />
              {selectedHotspotCenter && (
                <Circle
                  center={[selectedHotspotCenter.lat, selectedHotspotCenter.lng]}
                  radius={5000}
                  pathOptions={{ color: '#22c55e', fillColor: '#22c55e', fillOpacity: 0.08, weight: 2 }}
                />
              )}
              
              {/* Spiderfy-enabled markers for overlapping locations */}
              <SpiderfyMarkers
                reports={filteredReports}
                onHover={setHoveredReport}
                onView={handleViewReport}
              />
              {showActiveWorkers && (
                <WorkerSpiderfyMarkers
                  workers={exactLiveWorkers}
                  workerNameById={workerNameById}
                />
              )}
            </MapContainer>
            
            {/* Stats Overlay */}
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between z-10">
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => handleStatusFilterChange('pending')}
                  className={`px-3 py-2 backdrop-blur-sm border rounded-lg transition-all ${
                    statusFilter === 'pending' ? 'bg-red-500/25 border-red-400' : 'bg-slate-900/90 border-slate-700'
                  }`}
                >
                  <span className="text-xs text-slate-400">Red: </span>
                  <span className="text-sm font-bold text-red-400">
                    {locationFilteredReports.filter((r) => getMarkerColor(r) === '#ef4444').length}
                  </span>
                </button>
                <button
                  onClick={() => handleStatusFilterChange('unassigned')}
                  className={`px-3 py-2 backdrop-blur-sm border rounded-lg transition-all ${
                    statusFilter === 'unassigned' ? 'bg-amber-500/25 border-amber-400' : 'bg-slate-900/90 border-slate-700'
                  }`}
                >
                  <span className="text-xs text-slate-400">Yellow: </span>
                  <span className="text-sm font-bold text-amber-400">
                    {locationFilteredReports.filter((r) => getMarkerColor(r) === '#f59e0b').length}
                  </span>
                </button>
                <button
                  onClick={() => handleStatusFilterChange('in_progress')}
                  className={`px-3 py-2 backdrop-blur-sm border rounded-lg transition-all ${
                    statusFilter === 'in_progress' ? 'bg-blue-500/25 border-blue-400' : 'bg-slate-900/90 border-slate-700'
                  }`}
                >
                  <span className="text-xs text-slate-400">Blue: </span>
                  <span className="text-sm font-bold text-blue-400">
                    {locationFilteredReports.filter((r) => getMarkerColor(r) === '#3b82f6').length}
                  </span>
                </button>
                <button
                  onClick={() => handleStatusFilterChange('resolved')}
                  className={`px-3 py-2 backdrop-blur-sm border rounded-lg transition-all ${
                    statusFilter === 'resolved' ? 'bg-emerald-500/25 border-emerald-400' : 'bg-slate-900/90 border-slate-700'
                  }`}
                >
                  <span className="text-xs text-slate-400">Green: </span>
                  <span className="text-sm font-bold text-emerald-400">
                    {locationFilteredReports.filter((r) => getMarkerColor(r) === '#10b981').length}
                  </span>
                </button>
                <button
                  onClick={() => handleStatusFilterChange('all')}
                  className={`px-3 py-2 backdrop-blur-sm border rounded-lg transition-all ${
                    statusFilter === 'all' ? 'bg-slate-700 border-slate-500' : 'bg-slate-900/90 border-slate-700'
                  }`}
                >
                  <span className="text-xs text-slate-300">All: </span>
                  <span className="text-sm font-bold text-white">{locationFilteredReports.length}</span>
                </button>
              </div>
            </div>

            {/* Hover Card */}
            {hoveredReport && (
              <div 
                className="absolute top-4 right-4 pointer-events-auto z-20"
                onMouseEnter={() => setHoveredReport(hoveredReport)}
                onMouseLeave={() => setHoveredReport(null)}
              >
                <div className="bg-slate-900/96 backdrop-blur-md rounded-lg p-3 border border-slate-700 w-[250px] text-white shadow-xl">
                  {/* Status Badge */}
                  <div className="mb-2.5">
                    <span 
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold"
                      style={{ backgroundColor: `${getMarkerColor(hoveredReport)}25`, color: getMarkerColor(hoveredReport) }}
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      {getDisplayStatus(hoveredReport)}
                    </span>
                    {isHighAlertPending(hoveredReport) && (
                      <span className="ml-1.5 inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold bg-red-500/20 text-red-300 border border-red-500/40">
                        <AlertTriangle className="w-3 h-3" />
                        48h+ Alert
                      </span>
                    )}
                  </div>

                  {/* Report ID & Location */}
                  <h4 className="font-bold text-sm mb-0.5">#{hoveredReport.id}</h4>
                  <p className="text-[11px] text-slate-400 mb-2 line-clamp-1">📍 {hoveredReport.location}</p>

                  {/* Separator */}
                  <div className="border-t border-slate-700 my-2"></div>

                  {/* Minimal details only */}
                  <div className="space-y-1.5 mb-2.5">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 text-xs">Worker:</span>
                      <span className="font-semibold text-right text-xs">
                        {(hoveredReport as any).workerName || 'Unassigned'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 text-xs">Source:</span>
                      <span className="font-semibold text-right text-xs">
                        {getReportedByLabel(hoveredReport)}
                      </span>
                    </div>
                  </div>

                  {/* View Details Button */}
                  <div className="border-t border-slate-700 pt-2">
                    <button
                      onClick={() => handleViewReport(hoveredReport)}
                      className="w-full px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-md text-xs font-semibold transition-all flex items-center justify-center gap-1.5 pointer-events-auto"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Legend */}
          <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/50">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500 border-2 border-white"></div>
                <span className="text-sm text-slate-300">Pending</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500 border-2 border-white"></div>
                <span className="text-sm text-slate-300">Unassigned</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500 border-2 border-white"></div>
                <span className="text-sm text-slate-300">In Progress</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500 border-2 border-white"></div>
                <span className="text-sm text-slate-300">Resolved</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-400">Total: {filteredReports.length}</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Active Workers Live */}
        <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-6">
          <h3 className="text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-500" />
            Active Workers Live
          </h3>
          <div className="space-y-3 max-h-[300px] overflow-auto pr-1">
            {!showActiveWorkers ? (
              <div className="text-sm text-slate-400 bg-slate-800/30 border border-slate-700/50 rounded-lg p-3">
                Turn on <span className="text-emerald-300 font-semibold">Show All Workers</span> to view active worker list.
              </div>
            ) : panelLiveWorkers.length === 0 ? (
              <div className="text-sm text-slate-400 bg-slate-800/30 border border-slate-700/50 rounded-lg p-3">
                No active workers found for current map filter.
              </div>
            ) : (
              panelLiveWorkers.map((worker) => (
                <div
                  key={`worker-live-card-${worker.workerId}`}
                  className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3"
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="text-sm font-bold text-white">
                      {workerNameById.get(worker.workerId) || `Worker ${worker.workerId}`}
                    </p>
                    <span className="text-[10px] px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      Active
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 line-clamp-2">
                    Current Live: {worker.currentAddress || 'Address unavailable'}
                  </p>
                  <p className="text-xs text-slate-400">
                    GPS: {worker.lat.toFixed(5)}, {worker.lng.toFixed(5)}
                  </p>
                  <p className="text-xs text-slate-300 line-clamp-2">
                    Login Address: {worker.loginAddress || worker.currentAddress || 'Address unavailable'}
                  </p>
                  <p className="text-xs text-slate-400">
                    Login GPS: {Number.isFinite(worker.loginLat) && Number.isFinite(worker.loginLng)
                      ? `${worker.loginLat!.toFixed(5)}, ${worker.loginLng!.toFixed(5)}`
                      : `${worker.lat.toFixed(5)}, ${worker.lng.toFixed(5)}`}
                  </p>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="text-[11px] text-slate-300">
                      Pending: <span className="text-red-300 font-semibold">{workerTaskCounts.get(worker.workerId)?.pending || 0}</span> | In Progress: <span className="text-blue-300 font-semibold">{workerTaskCounts.get(worker.workerId)?.inProgress || 0}</span>
                    </div>
                    <button
                      onClick={() => setLocateWorkerTarget({ lat: worker.lat, lng: worker.lng, workerId: worker.workerId })}
                      className="text-[11px] px-2 py-1 rounded-md border border-emerald-400/50 text-emerald-300 hover:bg-emerald-500/15"
                    >
                      Locate
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      
      {/* Hotspot Areas */}
      <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-500" />
            Hotspot Areas
          </h3>
          {selectedHotspotLocation && (
            <button
              onClick={() => setSelectedHotspotLocation(null)}
              className="text-xs px-2.5 py-1 rounded border border-slate-600 text-slate-300 hover:text-white hover:border-slate-400"
            >
              Clear Area Filter
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {hotspotLocationData.map((row) => (
            <button
              key={row.key}
              onClick={() => setSelectedHotspotLocation(row.key)}
              className={`text-left bg-slate-800/30 rounded-lg p-4 border cursor-pointer transition-all ${
                selectedHotspotLocation === row.key
                  ? 'border-emerald-400/70 ring-1 ring-emerald-500/40'
                  : 'border-slate-700/50 hover:border-slate-600'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-white font-semibold line-clamp-1">{row.location}</h4>
                <span className="text-xs px-2 py-1 rounded font-semibold bg-slate-700/50 text-slate-300">
                  {row.total}
                </span>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-slate-400">Pending: <span className="text-red-400 font-medium">{row.pending}</span></p>
                <p className="text-sm text-slate-400">Unassigned: <span className="text-amber-400 font-medium">{row.unassigned}</span></p>
                <p className="text-sm text-slate-400">In Progress: <span className="text-blue-400 font-medium">{row.inProgress}</span></p>
                <p className="text-sm text-slate-400">Resolved: <span className="text-emerald-400 font-medium">{row.resolved}</span></p>
                {showActiveWorkers && (
                  <p className="text-sm text-slate-400">
                    Active Workers: <span className="text-emerald-300 font-medium">{activeWorkersByHotspot.get(row.key) || 0}</span>
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Report Detail Modal */}
      {selectedReport && (
        <ReportDetailModal
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
          onAssign={handleAssignFromModal}
          onOverrideStatus={handleOverrideStatusFromModal}
        />
      )}
    </div>
  );
}