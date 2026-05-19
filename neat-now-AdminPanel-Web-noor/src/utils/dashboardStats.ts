export type ReportLike = {
  status?: string;
  workerId?: string | null;
  workerName?: string | null;
  citizenId?: string;
  reportSource?: 'citizen' | 'admin';
  submittedAt?: Date | string;
  is_unassigned?: boolean;
};

/** Admin "Create Task" used placeholder account id 1 — not a real citizen (legacy). */
export const ADMIN_PLACEHOLDER_CITIZEN_ID = '1';

export const isAdminCreatedReport = (report: ReportLike): boolean => {
  if (report.reportSource === 'admin') return true;
  return String(report.citizenId ?? '') === ADMIN_PLACEHOLDER_CITIZEN_ID;
};

/** Citizen pipeline only — excludes admin-created tasks and legacy placeholder rows. */
export const isCitizenSourceReport = (report: ReportLike): boolean => {
  if (report.reportSource === 'admin') return false;
  if (report.reportSource === 'citizen') return true;
  return String(report.citizenId ?? '') !== ADMIN_PLACEHOLDER_CITIZEN_ID;
};

export const ACCEPT_WINDOW_MS = 60 * 60 * 1000;

const norm = (s?: string) => String(s || '').trim();

export const reportHasWorker = (report: ReportLike): boolean =>
  Boolean(norm(report.workerId as string) || norm(report.workerName as string));

export function getSubmittedMs(report: ReportLike): number | null {
  const s = report.submittedAt;
  if (s instanceof Date) return s.getTime();
  if (typeof s === 'string') {
    const t = Date.parse(s);
    return Number.isNaN(t) ? null : t;
  }
  return null;
}

/** Citizen report still inside 60-minute accept window (no worker yet). */
export const isAwaitingAcceptReport = (report: ReportLike): boolean => {
  if (!isCitizenSourceReport(report)) return false;
  if (reportHasWorker(report)) return false;
  if (norm(report.status) !== 'Pending') return false;
  const ms = getSubmittedMs(report);
  if (ms == null) return false;
  return Date.now() - ms < ACCEPT_WINDOW_MS;
};

/** 60 minutes passed with no worker accept (matches worker timer expiry). */
export const isUnassignedReport = (report: ReportLike): boolean => {
  if (!isCitizenSourceReport(report)) return false;
  if (reportHasWorker(report)) return false;
  if (norm(report.status) !== 'Pending') return false;
  if (typeof report.is_unassigned === 'boolean' && report.is_unassigned) return true;
  const ms = getSubmittedMs(report);
  if (ms == null) return false;
  return Date.now() - ms >= ACCEPT_WINDOW_MS;
};

/** Citizen report — no worker assigned yet (within 60 min or after). */
export const isUnassignedNoWorkerReport = (report: ReportLike): boolean =>
  isAwaitingAcceptReport(report) || isUnassignedReport(report);

/** Worker accepted or admin assigned; work not started. */
export const isPendingWorkloadReport = (report: ReportLike): boolean => {
  if (isAwaitingAcceptReport(report) || isUnassignedReport(report)) return false;
  const status = norm(report.status);
  if (status === 'In Progress' || status === 'Resolved' || status === 'Rejected') return false;
  return status === 'Assigned' || (status === 'Pending' && reportHasWorker(report));
};

export function countAwaitingAcceptReports(reports: ReportLike[]): number {
  return reports.filter(isAwaitingAcceptReport).length;
}

export function countUnassignedReports(reports: ReportLike[]): number {
  return reports.filter(isUnassignedReport).length;
}

export function countPendingWorkloadReports(reports: ReportLike[]): number {
  return reports.filter(isPendingWorkloadReport).length;
}

/** Admin task assigned; work not yet started. */
export const isPendingAdminAssignedReport = (report: ReportLike): boolean =>
  isPendingWorkloadReport(report) && isAdminCreatedReport(report);

/** Citizen report — worker accepted; work not yet started. */
export const isPendingCitizenAcceptedReport = (report: ReportLike): boolean =>
  isPendingWorkloadReport(report) && isCitizenSourceReport(report);

/** @deprecated Use isPendingAdminAssignedReport */
export const isPendingAssignedByAdminReport = isPendingAdminAssignedReport;

export function countPendingAdminAssignedReports(reports: ReportLike[]): number {
  return reports.filter(isPendingAdminAssignedReport).length;
}

export function countPendingCitizenAcceptedReports(reports: ReportLike[]): number {
  return reports.filter(isPendingCitizenAcceptedReport).length;
}

export function countUnassignedNoWorkerReports(reports: ReportLike[]): number {
  return reports.filter(isUnassignedNoWorkerReport).length;
}

/** Dashboard Pending KPI: worker accepted citizen report + admin assigned (not started). */
export function dashboardPendingKpiValue(stats: { pending?: number }): number {
  return stats.pending ?? 0;
}

/** Dashboard Unassigned KPI: citizen reports with no worker assigned. */
export function dashboardUnassignedKpiValue(stats: {
  awaiting_accept?: number;
  unassigned?: number;
}): number {
  return (stats.awaiting_accept ?? 0) + (stats.unassigned ?? 0);
}

/** @deprecated Use countPendingWorkloadReports */
export function countPendingReports(reports: ReportLike[]): number {
  return countPendingWorkloadReports(reports);
}

/** Label for Reports table / list (matches Map & Analytics buckets). */
export function getAdminReportDisplayStatus(report: ReportLike): string {
  if (norm(report.status) === 'Resolved') return 'Resolved';
  if (norm(report.status) === 'Rejected') return 'Rejected';
  if (norm(report.status) === 'In Progress') return 'In Progress';
  if (isUnassignedReport(report)) return 'Unassigned';
  if (isAwaitingAcceptReport(report)) return 'Awaiting Acceptance';
  if (isPendingWorkloadReport(report)) return 'Pending';
  return norm(report.status) || 'Unknown';
}

export function buildAdminStatusDistribution(
  reports: ReportLike[],
): Array<{ name: string; value: number; color: string }> {
  const awaiting = countAwaitingAcceptReports(reports);
  const unassigned = countUnassignedReports(reports);
  const pending = countPendingWorkloadReports(reports);
  const inProgress = reports.filter((r) => norm(r.status) === 'In Progress').length;
  const resolved = reports.filter((r) => norm(r.status) === 'Resolved').length;
  const rejected = reports.filter((r) => norm(r.status) === 'Rejected').length;

  return [
    { name: 'Awaiting Acceptance', value: awaiting, color: '#64748b' },
    { name: 'Unassigned', value: unassigned, color: '#f59e0b' },
    { name: 'Pending', value: pending, color: '#ef4444' },
    { name: 'In Progress', value: inProgress, color: '#3b82f6' },
    { name: 'Resolved', value: resolved, color: '#10b981' },
    { name: 'Rejected', value: rejected, color: '#dc2626' },
  ].filter((item) => item.value > 0);
}
