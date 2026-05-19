import type { AreaReportChartRow } from './reportArea';

export type AreaSeverity = 'high' | 'medium' | 'low';

export const SEVERITY_BAR_COLORS: Record<AreaSeverity, string> = {
  high: '#ef4444',
  medium: '#eab308',
  low: '#22c55e',
};

export const SEVERITY_LABELS: Record<AreaSeverity, string> = {
  high: 'High volume',
  medium: 'Medium volume',
  low: 'Low volume',
};

/** Tier by share of max report count in the current chart dataset. */
export function severityForReportCount(count: number, maxCount: number): AreaSeverity {
  if (count <= 0 || maxCount <= 0) return 'low';
  const ratio = count / maxCount;
  if (ratio >= 0.67) return 'high';
  if (ratio >= 0.34) return 'medium';
  return 'low';
}

export type AreaChartBarRow = AreaReportChartRow & {
  severity: AreaSeverity;
  fill: string;
};

export function withSeverityColors(rows: AreaReportChartRow[]): AreaChartBarRow[] {
  const max = rows.reduce((m, r) => Math.max(m, r.reports), 0);
  return rows.map((row) => {
    const severity = severityForReportCount(row.reports, max);
    return { ...row, severity, fill: SEVERITY_BAR_COLORS[severity] };
  });
}
