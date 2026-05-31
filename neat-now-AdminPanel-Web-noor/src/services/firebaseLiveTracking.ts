import { DataSnapshot, get, getDatabase, onValue, ref, remove } from 'firebase/database';
import { firebaseApp, firebaseDb } from '../firebaseConfig';

export interface LiveWorkerLocation {
  workerId: string;
  lat: number;
  lng: number;
  loginLat?: number;
  loginLng?: number;
  currentAddress?: string;
  loginAddress?: string;
  updatedAt?: string;
}

const db = firebaseDb || getDatabase(firebaseApp);

const formatCoords = (lat?: number, lng?: number): string | undefined => {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return undefined;
  return `${lat!.toFixed(5)}, ${lng!.toFixed(5)}`;
};

const parseSnapshot = (snapshot: DataSnapshot): LiveWorkerLocation[] => {
  if (!snapshot.exists()) return [];

  const raw = snapshot.val() as Record<string, any>;
  return Object.entries(raw)
    .map(([workerId, value]) => {
      const lat = Number(value?.lat);
      const lng = Number(value?.lng);
      const loginLat = Number.isFinite(Number(value?.login_lat)) ? Number(value?.login_lat) : undefined;
      const loginLng = Number.isFinite(Number(value?.login_lng)) ? Number(value?.login_lng) : undefined;

      const currentAddress =
        (value?.current_address ? String(value.current_address) : undefined) ??
        formatCoords(lat, lng);
      const loginAddress =
        (value?.login_address ? String(value.login_address) : undefined) ??
        formatCoords(loginLat, loginLng) ??
        currentAddress;

      return {
        workerId,
        lat,
        lng,
        loginLat,
        loginLng,
        currentAddress,
        loginAddress,
        updatedAt: value?.updated_at ? String(value.updated_at) : undefined,
      };
    })
    .filter((w) => {
      if (!Number.isFinite(w.lat) || !Number.isFinite(w.lng)) return false;
      // Source of truth for "online" is presence in workers_live.
      // If coordinates are valid, keep it visible.
      return true;
    });
};

export const subscribeLiveWorkerLocations = (
  onChange: (locations: LiveWorkerLocation[]) => void,
): (() => void) => {
  const workersRef = ref(db, 'workers_live');
  console.log('[LiveWorkers] Firebase: subscribing to workers_live at', (db as any)?.app?.options?.databaseURL ?? '(unknown URL)');

  return onValue(
    workersRef,
    (snapshot) => {
      const next = parseSnapshot(snapshot);
      // Always trust the latest snapshot. If a worker logs out, their node is removed
      // and the list must clear immediately (a long "empty grace" would keep ghosts).
      onChange(next);
    },
    // The Realtime Database SDK swallows permission errors unless you pass
    // an error callback. Logging it here is the difference between a silent
    // empty map and an actionable "PERMISSION_DENIED" line in DevTools.
    (error) => {
      const err = error as Error & { code?: string };
      console.error('[LiveWorkers] Firebase subscription error:', err?.code, err?.message, err);
      onChange([]);
    },
  );
};

export const fetchLiveWorkerLocations = async (): Promise<LiveWorkerLocation[]> => {
  const snapshot = await get(ref(db, 'workers_live'));
  return parseSnapshot(snapshot);
};

/** Remove stale live pin when admin force-inactive or worker logs out server-side. */
export const removeLiveWorkerFromMap = async (workerId: string): Promise<void> => {
  const id = String(workerId || '').trim();
  if (!id) return;
  try {
    await remove(ref(db, `workers_live/${id}`));
  } catch (e) {
    console.warn(`Failed to remove workers_live/${id}:`, e);
  }
};

