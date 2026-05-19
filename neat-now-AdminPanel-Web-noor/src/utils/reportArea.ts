/** Reporting area stats — full addresses, all-time by default. */



import { humanReadableReportLocation } from './locationLabel';

import {
  isPendingAdminAssignedReport,
  isPendingCitizenAcceptedReport,
  isUnassignedNoWorkerReport,
} from './dashboardStats';

import {

  severityForReportCount,

  SEVERITY_BAR_COLORS,

  type AreaSeverity,

} from './areaChartSeverity';



/** Map / hotspots: always all reports (no date filter on map). */

export const MAP_REPORT_PERIOD_DAYS = 0;



/** Chart default: 0 = all (current). Use 30 for last-30-days-only chart. */

export const DEFAULT_CHART_PERIOD_DAYS = 0;

export const CHART_PERIOD_LAST_30_DAYS = 30;



/** @deprecated use chartPeriodDays state on dashboard; map uses MAP_REPORT_PERIOD_DAYS */

export const AREA_REPORT_PERIOD_DAYS = MAP_REPORT_PERIOD_DAYS;



export function chartPeriodLabel(days: number): string {

  if (!days || days <= 0) return 'All report locations';

  return `Last ${days} days`;

}



export interface AreaReportChartRow {

  area: string;

  reports: number;

  /** Citizen report — worker accepted; not started. */

  pending_citizen: number;

  /** Admin assigned task; not started. */

  pending_admin: number;

  /** No worker assigned (awaiting accept or 60+ min expired). */

  unassigned: number;

  in_progress: number;

  resolved: number;

  rejected: number;

  severity?: AreaSeverity;

}



export function emptyAreaBucket(): Omit<AreaReportChartRow, 'area'> {

  return {

    reports: 0,

    pending_citizen: 0,

    pending_admin: 0,

    unassigned: 0,

    in_progress: 0,

    resolved: 0,

    rejected: 0,

  };

}



export function isWithinAreaReportPeriod(

  submittedAt: Date | string | undefined,

  days: number = AREA_REPORT_PERIOD_DAYS,

): boolean {

  if (!days || days <= 0) return true;

  if (!submittedAt) return false;

  const d = submittedAt instanceof Date ? submittedAt : new Date(submittedAt);

  if (Number.isNaN(d.getTime())) return false;

  const cutoff = new Date();

  cutoff.setDate(cutoff.getDate() - days);

  cutoff.setHours(0, 0, 0, 0);

  return d >= cutoff;

}



/** Full proper address as chart key (each distinct location = one bar). */

export function reportingAreaForReport(report: {

  location?: string;

  location_address?: string;

  lat?: number | null;

  lng?: number | null;

}): string {

  return humanReadableReportLocation(report);

}



function bumpStatus(

  bucket: Omit<AreaReportChartRow, 'area'>,

  report: {

    status?: string;

    reportSource?: 'citizen' | 'admin';

    workerId?: string;

    workerName?: string | null;

    submittedAt?: Date | string;

    is_unassigned?: boolean;

  },

) {

  const status = report.status ?? '';

  if (status === 'In Progress') {

    bucket.in_progress += 1;

  } else if (status === 'Resolved') {

    bucket.resolved += 1;

  } else if (status === 'Rejected') {

    bucket.rejected += 1;

  } else if (isPendingCitizenAcceptedReport(report)) {

    bucket.pending_citizen += 1;

  } else if (isPendingAdminAssignedReport(report)) {

    bucket.pending_admin += 1;

  } else if (isUnassignedNoWorkerReport(report)) {

    bucket.unassigned += 1;

  }

  bucket.reports += 1;

}



export function aggregateReportsByArea(

  reports: {

    location?: string;

    location_address?: string;

    lat?: number;

    lng?: number;

    status?: string;

    submittedAt?: Date | string;

    reportSource?: 'citizen' | 'admin';

    workerId?: string;

    workerName?: string | null;

    is_unassigned?: boolean;

  }[],

  days: number = AREA_REPORT_PERIOD_DAYS,

): AreaReportChartRow[] {

  const byArea = new Map<string, Omit<AreaReportChartRow, 'area'>>();



  for (const r of reports) {

    if (!isWithinAreaReportPeriod(r.submittedAt, days)) continue;

    const area = reportingAreaForReport(r);

    if (!byArea.has(area)) {

      byArea.set(area, emptyAreaBucket());

    }

    bumpStatus(byArea.get(area)!, r);

  }



  const rows = Array.from(byArea.entries())

    .map(([area, bucket]) => ({ area, ...bucket }))

    .sort((a, b) => b.reports - a.reports || a.area.localeCompare(b.area));



  const max = rows.reduce((m, r) => Math.max(m, r.reports), 0);

  return rows.map((row) => ({

    ...row,

    severity: severityForReportCount(row.reports, max),

  }));

}



export function sumAreaRows(rows: AreaReportChartRow[]): AreaReportChartRow {

  const total = emptyAreaBucket();

  for (const row of rows) {

    total.reports += row.reports;

    total.pending_citizen += row.pending_citizen;

    total.pending_admin += row.pending_admin;

    total.unassigned += row.unassigned;

    total.in_progress += row.in_progress;

    total.resolved += row.resolved;

    total.rejected += row.rejected;

  }

  return { area: 'Grand Total', ...total, severity: 'high' };

}



export function fillForSeverity(severity: AreaSeverity | undefined): string {

  return SEVERITY_BAR_COLORS[severity ?? 'low'];

}


