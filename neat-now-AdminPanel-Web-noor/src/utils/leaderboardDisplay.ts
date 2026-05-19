/** Citizen row — matches GET /api/accounts/leaderboard/ & dashboard top-citizens */
export interface DashboardCitizenLeader {
  id?: string;
  name: string;
  reports: number;
  rank?: number;
  badge?: string | null;
}

/** Worker row — matches GET /api/workers/rankings/ & dashboard top-workers */
export interface DashboardWorkerLeader {
  id: string;
  name: string;
  tasksCompleted: number;
  rating: number;
  rank?: number | null;
  badge?: string | null;
  points?: number;
  email?: string;
  phone?: string;
  zone?: string;
  active?: boolean;
  isTracking?: boolean;
  avgCompletionTime?: number;
}

export function normalizeCitizenLeader(raw: Record<string, unknown>): DashboardCitizenLeader {
  const reports =
    Number(raw.verified_reports ?? raw.total_reports ?? raw.reports ?? 0) || 0;
  return {
    id: String(raw.id ?? raw.citizen_id ?? raw.account_id ?? raw.name ?? ''),
    name: String(raw.name ?? 'Unknown'),
    reports,
    rank: typeof raw.rank === 'number' ? raw.rank : Number(raw.rank) || undefined,
    badge: raw.badge != null ? String(raw.badge) : null,
  };
}

export function normalizeWorkerLeader(raw: Record<string, unknown>): DashboardWorkerLeader {
  const tasksCompleted =
    Number(raw.resolved_tasks ?? raw.tasks_completed ?? raw.total_tasks ?? 0) || 0;
  const rating = Number(raw.avg_rating ?? raw.rating ?? 0) || 0;
  return {
    id: String(raw.id ?? raw.worker_id ?? ''),
    name: String(raw.name ?? 'Unknown'),
    tasksCompleted,
    rating,
    rank: raw.rank == null ? null : Number(raw.rank),
    badge: raw.badge != null ? String(raw.badge) : null,
    points: Number(raw.points ?? 0) || 0,
    email: String(raw.email ?? ''),
    phone: String(raw.phone ?? ''),
    zone: String(raw.zone ?? ''),
    active: raw.active !== false,
    isTracking: Boolean(raw.is_tracking),
    avgCompletionTime: Number(raw.avg_completion_time ?? raw.avgCompletionTime ?? 0) || 0,
  };
}

export function formatCitizenBadge(badge?: string | null): string {
  if (!badge) return '';
  const b = badge.toLowerCase();
  if (b === 'platinum') return 'Platinum';
  if (b === 'gold') return 'Gold';
  if (b === 'silver') return 'Silver';
  return badge.charAt(0).toUpperCase() + badge.slice(1);
}

export function formatWorkerBadge(badge?: string | null): string {
  if (!badge) return '';
  const b = badge.toLowerCase();
  if (b === 'diamond') return 'Diamond';
  if (b === 'gold') return 'Gold';
  if (b === 'silver') return 'Silver';
  if (b === 'bronze') return 'Bronze';
  return badge.charAt(0).toUpperCase() + badge.slice(1);
}
