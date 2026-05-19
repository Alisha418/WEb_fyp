import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { FileText, Clock, AlertCircle, CheckCircle2, TrendingUp, Activity, Award, Bell, Download, BarChart3 } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Activity as ActivityType } from '../types';
import type { Worker } from '../types/worker';
import dashboardService from '../services/dashboardService';
import reportService from '../services/reportService';
import type { Report } from '../types';
import {
  normalizeCitizenLeader,
  normalizeWorkerLeader,
  formatCitizenBadge,
  formatWorkerBadge,
  type DashboardCitizenLeader,
  type DashboardWorkerLeader,
} from '../utils/leaderboardDisplay';
import { dashboardPendingKpiValue, dashboardUnassignedKpiValue } from '../utils/dashboardStats';
import {
  aggregateReportsByArea,
  chartPeriodLabel,
  CHART_PERIOD_LAST_30_DAYS,
  DEFAULT_CHART_PERIOD_DAYS,
  fillForSeverity,
  type AreaReportChartRow,
} from '../utils/reportArea';
import { downloadAreaChartPdf } from '../utils/downloadAreaChartPdf';
import {
  SEVERITY_BAR_COLORS,
  SEVERITY_LABELS,
  severityForReportCount,
  type AreaSeverity,
} from '../utils/areaChartSeverity';

/** Preview count on dashboard; full list loads in View All modals (limit=0). */
const DASHBOARD_LEADERBOARD_PREVIEW = 3;

function normalizeAreaRows(raw: Record<string, unknown>[]): AreaReportChartRow[] {
  const rows = raw.map((row) => ({
    area: String(row.area ?? 'Unknown Area'),
    reports: Number(row.reports ?? row.total_reports ?? 0),
    pending_citizen: Number(row.pending_citizen ?? 0),
    pending_admin: Number(row.pending_admin ?? 0),
    unassigned: Number(row.unassigned ?? 0),
    in_progress: Number(row.in_progress ?? 0),
    resolved: Number(row.resolved ?? 0),
    rejected: Number(row.rejected ?? 0),
    severity: (row.severity as AreaSeverity) || undefined,
  }));
  const max = rows.reduce((m, r) => Math.max(m, r.reports), 0);
  return rows.map((r) => ({
    ...r,
    severity: r.severity ?? severityForReportCount(r.reports, max),
  }));
}

function AreaChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: AreaReportChartRow & { fill?: string } }[];
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  const severity = row.severity ?? 'low';
  return (
    <div className="rounded-lg border border-slate-600 bg-slate-900/95 px-4 py-3 shadow-xl max-w-xs">
      <p className="text-sm font-semibold text-white mb-2 leading-snug">{row.area}</p>
      <p className="text-[10px] uppercase tracking-wide mb-2" style={{ color: SEVERITY_BAR_COLORS[severity] }}>
        {SEVERITY_LABELS[severity]} · {row.reports} total
      </p>
      <div className="space-y-1 text-xs">
        <p className="text-amber-400">Pending (citizen accepted): {row.pending_citizen}</p>
        <p className="text-violet-300">Pending (admin assigned): {row.pending_admin}</p>
        <p className="text-orange-400">Unassigned: {row.unassigned}</p>
        <p className="text-sky-400">In progress: {row.in_progress}</p>
        <p className="text-emerald-400">Resolved: {row.resolved}</p>
        {row.rejected > 0 && <p className="text-red-400">Rejected: {row.rejected}</p>}
      </div>
    </div>
  );
}

interface DashboardViewProps {
  stats: any;
  activities:  ActivityType[];
  topCitizens: any[];
  topWorkers: Worker[] | DashboardWorkerLeader[];
  trendData: any[];
  statusDistribution: any[];
  reports: any[];
  onViewAllWorkers?: () => void;
  onViewAllCitizens?: () => void;
}

export function DashboardView({ 
  stats:  propStats, 
  activities: propActivities, 
  topCitizens: propTopCitizens, 
  topWorkers: propTopWorkers, 
  trendData: _propTrendData,
  statusDistribution: propStatusDistribution,
  reports,
  onViewAllWorkers,
  onViewAllCitizens
}: DashboardViewProps) {
  // ✨ NEW: State for backend data
  const [backendStats, setBackendStats] = useState<any>(null);
  const [backendTopCitizens, setBackendTopCitizens] = useState<DashboardCitizenLeader[]>([]);
  const [backendTopWorkers, setBackendTopWorkers] = useState<DashboardWorkerLeader[]>([]);
  const [backendAreaReports, setBackendAreaReports] = useState<AreaReportChartRow[]>([]);
  const [backendStatusDistribution, setBackendStatusDistribution] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pdfDownloading, setPdfDownloading] = useState(false);
  const [chartPeriodDays, setChartPeriodDays] = useState(DEFAULT_CHART_PERIOD_DAYS);
  const [areaChartLoading, setAreaChartLoading] = useState(false);
  const areaChartRef = useRef<HTMLDivElement>(null);

  const loadAreaChartData = useCallback(async (days: number) => {
    const toChartInput = (list: Report[]) =>
      list.map((r) => ({
        location: r.location,
        location_address: r.location_address,
        lat: r.lat,
        lng: r.lng,
        status: r.status,
        submittedAt: r.submittedAt,
        reportSource: r.reportSource,
        workerId: r.workerId,
        workerName: r.workerName,
        is_unassigned: r.is_unassigned,
      }));

    try {
      setAreaChartLoading(true);
      const response = await reportService.getReports({ page_size: 50, maxPages: 8 });
      const rows: Report[] = response?.data || [];

      setBackendAreaReports(aggregateReportsByArea(toChartInput(rows), days));
      setAreaChartLoading(false);

      void reportService.enrichReportLocations(
        rows,
        (updated) => {
          setBackendAreaReports(aggregateReportsByArea(toChartInput(updated), days));
        },
        { maxCoords: 35 },
      );
    } catch (error) {
      console.error('Failed to load area chart data:', error);
      setBackendAreaReports([]);
      setAreaChartLoading(false);
    }
  }, []);

  // ✨ NEW: Load data from backend on mount
  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    loadAreaChartData(chartPeriodDays);
  }, [chartPeriodDays, loadAreaChartData]);

  const loadDashboardData = async () => {
    try {
      const [statsData, topCitizensData, topWorkersData, statusDistData] = await Promise.all([
        dashboardService.getDashboardStats(),
        dashboardService.getTopCitizens(DASHBOARD_LEADERBOARD_PREVIEW),
        dashboardService.getTopWorkers(DASHBOARD_LEADERBOARD_PREVIEW),
        dashboardService.getStatusDistribution(),
      ]);

      if (statsData.success) {
        setBackendStats(statsData.data);
      }

      if (topCitizensData.success && Array.isArray(topCitizensData.data)) {
        setBackendTopCitizens(
          topCitizensData.data.map((row: Record<string, unknown>) => normalizeCitizenLeader(row)),
        );
      }

      if (topWorkersData.success && Array.isArray(topWorkersData.data)) {
        setBackendTopWorkers(
          topWorkersData.data.map((row: Record<string, unknown>) => normalizeWorkerLeader(row)),
        );
      }

      if (statusDistData.success && Array.isArray(statusDistData.data)) {
        setBackendStatusDistribution(statusDistData.data);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // ✨ Use backend data if available, otherwise use props
  const stats = backendStats?.reports || propStats;
  const totalCitizens = backendStats?.citizens?.total ?? null;
  const pendingKpi = dashboardPendingKpiValue(stats);
  const unassignedKpi = dashboardUnassignedKpiValue(stats);
  const topCitizens: DashboardCitizenLeader[] = (
    backendTopCitizens.length > 0
      ? backendTopCitizens
      : (propTopCitizens as DashboardCitizenLeader[]).map((c) =>
          normalizeCitizenLeader(c as unknown as Record<string, unknown>),
        )
  ).slice(0, DASHBOARD_LEADERBOARD_PREVIEW);

  const topWorkers: DashboardWorkerLeader[] = (
    backendTopWorkers.length > 0
      ? backendTopWorkers
      : (propTopWorkers as Worker[]).map((w) =>
          normalizeWorkerLeader({
            id: w.id,
            name: w.name,
            resolved_tasks: w.tasksCompleted,
            avg_rating: w.rating,
          } as Record<string, unknown>),
        )
  ).slice(0, DASHBOARD_LEADERBOARD_PREVIEW);
  const fallbackAreaReports = useMemo(
    () => aggregateReportsByArea(reports ?? [], chartPeriodDays),
    [reports, chartPeriodDays],
  );

  const areaReportData: AreaReportChartRow[] =
    backendAreaReports.length > 0 ? backendAreaReports : fallbackAreaReports;

  const areaChartDisplay = useMemo(
    () =>
      areaReportData.map((row) => ({
        ...row,
        fill: fillForSeverity(row.severity),
      })),
    [areaReportData],
  );

  const areaChartWidth = Math.max(640, areaChartDisplay.length * 76);

  const handleDownloadAreaPdf = useCallback(async () => {
    if (areaReportData.length === 0) return;
    try {
      setPdfDownloading(true);
      await downloadAreaChartPdf(
        areaChartRef.current,
        areaReportData,
        `Reports by Reporting Area — ${chartPeriodLabel(chartPeriodDays).toLowerCase()}`,
        chartPeriodDays,
      );
    } catch (error) {
      console.error('PDF download failed:', error);
    } finally {
      setPdfDownloading(false);
    }
  }, [areaReportData, chartPeriodDays]);

  const statusDistribution =
    backendStatusDistribution.length > 0
      ? backendStatusDistribution
      : propStatusDistribution;
  const activities = propActivities;

  // 🎨 YOUR EXACT EXISTING UI - NO CHANGES BELOW
  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Reports"
          value={stats.total}
          icon={FileText}
          color="blue"
          trend="+12%"
        />
        <KPICard
          title="Pending"
          value={pendingKpi}
          icon={Clock}
          color="red"
          trend="-5%"
          subtitle="Worker accepted + admin assigned"
        />
        <KPICard
          title="In Progress"
          value={stats.in_progress ?? 0}
          icon={AlertCircle}
          color="sky"
          trend="+8%"
        />
        <KPICard
          title="Resolved"
          value={stats. resolved}
          icon={CheckCircle2}
          color="green"
          trend="+15%"
        />
      </div>
      
      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Reports by reporting area */}
        <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-6">
          <div className="flex items-start justify-between gap-3 mb-6">
            <div>
              <h3 className="text-white mb-1 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-emerald-500" />
                Reports by Area
              </h3>
              <p className="text-sm text-slate-400">
                {chartPeriodLabel(chartPeriodDays)} — hover for pending, in progress &amp; resolved
              </p>
              <div className="flex gap-1 mt-2">
                <button
                  type="button"
                  onClick={() => setChartPeriodDays(0)}
                  className={`px-2.5 py-1 text-xs rounded-md border transition-all ${
                    chartPeriodDays === 0
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                      : 'border-slate-700 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setChartPeriodDays(CHART_PERIOD_LAST_30_DAYS)}
                  className={`px-2.5 py-1 text-xs rounded-md border transition-all ${
                    chartPeriodDays === CHART_PERIOD_LAST_30_DAYS
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                      : 'border-slate-700 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  30 days
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={handleDownloadAreaPdf}
              disabled={pdfDownloading || areaReportData.length === 0}
              className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-slate-700 bg-slate-800/80 text-emerald-400 hover:bg-slate-800 hover:border-emerald-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all shrink-0"
              title="Download chart as PDF"
            >
              <Download className="w-4 h-4" />
              {pdfDownloading ? 'Exporting…' : 'Download PDF'}
            </button>
          </div>
          <div ref={areaChartRef} className="rounded-lg bg-slate-950/40 p-2">
            {areaChartLoading ? (
              <p className="text-sm text-slate-500 text-center py-16">Loading chart…</p>
            ) : areaChartDisplay.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-16">No report data by area yet.</p>
            ) : (
              <>
                <div className="flex flex-wrap gap-4 mb-3 px-1 text-xs text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: SEVERITY_BAR_COLORS.high }} />
                    Red — High volume
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: SEVERITY_BAR_COLORS.medium }} />
                    Yellow — Medium
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: SEVERITY_BAR_COLORS.low }} />
                    Green — Low
                  </span>
                </div>
                <div className="overflow-x-auto pb-1">
                  <ResponsiveContainer width={areaChartWidth} height={280}>
                    <BarChart data={areaChartDisplay} margin={{ top: 8, right: 12, left: 4, bottom: 72 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                      <XAxis
                        dataKey="area"
                        stroke="#94a3b8"
                        tick={{ fill: '#94a3b8', fontSize: 10 }}
                        interval={0}
                        angle={-32}
                        textAnchor="end"
                        height={88}
                      />
                      <YAxis
                        stroke="#94a3b8"
                        tick={{ fill: '#94a3b8', fontSize: 11 }}
                        allowDecimals={false}
                        label={{
                          value: 'Reports',
                          angle: -90,
                          position: 'insideLeft',
                          fill: '#64748b',
                          fontSize: 11,
                        }}
                      />
                      <Tooltip content={<AreaChartTooltip />} cursor={{ fill: 'rgba(16, 185, 129, 0.08)' }} />
                      <Bar dataKey="reports" radius={[6, 6, 0, 0]} maxBarSize={48}>
                        {areaChartDisplay.map((entry) => (
                          <Cell key={entry.area} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </div>
        </div>
        
        {/* Status Distribution */}
        <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-white mb-1">Status Distribution</h3>
              <p className="text-sm text-slate-400">Current breakdown</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={statusDistribution}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={5}
                dataKey="value"
              >
                {statusDistribution.map((entry:  any, index: number) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor:  '#1e293b', 
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  color: '#fff'
                }} 
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-3 mt-4">
            {statusDistribution.map((item: any) => (
              <div key={item.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                <span className="text-sm text-slate-300">{item.name}:  {item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Activity & Leaderboards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-1 bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-6">
          <h3 className="text-white mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-500" />
            Recent Activity
            <span className="text-xs font-normal text-slate-500 ml-2">In progress by day</span>
          </h3>
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
            {activities.length === 0 ? (
              <p className="text-sm text-slate-500 py-4 text-center">No in-progress activity in the last 7 days.</p>
            ) : activities.map((activity: ActivityType) => (
              <div
                key={activity.id}
                className="p-3 bg-slate-800/30 rounded-lg border border-slate-700/50 hover:border-slate-600 transition-all"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      activity.type === 'resolved'
                        ? 'bg-green-500'
                        : activity.type === 'assigned'
                          ? 'bg-yellow-500'
                          : activity.type === 'in_progress'
                            ? 'bg-sky-500'
                            : 'bg-blue-500'
                    }`}
                  />
                  <p className="text-sm font-medium text-slate-200">
                    {activity.dateLabel || activity.timestamp.toLocaleDateString()}
                  </p>
                </div>
                {activity.workers && activity.workers.length > 0 ? (
                  <ul className="space-y-1.5 pl-4">
                    {activity.workers.map((w) => (
                      <li key={w.workerId} className="text-xs text-slate-400">
                        <span className="text-slate-300">{w.workerName}</span>
                        {' — '}
                        {w.taskCount} task{w.taskCount !== 1 ? 's' : ''} in progress
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-slate-400 pl-4 truncate">{activity.message}</p>
                )}
              </div>
            ))}
          </div>
        </div>
        
        {/* Citizen Leaderboard */}
        <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-6">
          <div className="mb-4">
            <h3 className="text-white flex items-center gap-2 flex-wrap">
              <Award className="w-5 h-5 text-yellow-500" />
              Citizen Leaderboard
              <span className="text-xs font-normal text-slate-500">Top {DASHBOARD_LEADERBOARD_PREVIEW}</span>
            </h3>
            {totalCitizens != null && (
              <p className="text-xs text-slate-400 mt-1.5">
                Total citizens: <span className="text-yellow-400 font-semibold">{totalCitizens}</span>
              </p>
            )}
          </div>
          <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
            {topCitizens.map((citizen, index) => {
              const displayRank = citizen.rank;
              const rankLabel = displayRank != null ? displayRank : index + 1;
              return (
                <div
                  key={citizen.id ?? citizen.name}
                  className="flex items-center gap-3 p-3 bg-slate-800/30 rounded-lg border border-slate-700/50"
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                      displayRank === 1
                        ? 'bg-yellow-500/20 text-yellow-500'
                        : displayRank === 2
                          ? 'bg-slate-500/20 text-slate-400'
                          : displayRank === 3
                            ? 'bg-orange-500/20 text-orange-500'
                            : 'bg-slate-700/20 text-slate-500'
                    }`}
                  >
                    {rankLabel}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{citizen.name}</p>
                    <p className="text-xs text-slate-400">{citizen.reports} reports submitted</p>
                  </div>
                  {citizen.badge ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400 border border-yellow-500/30 shrink-0">
                      {formatCitizenBadge(citizen.badge)}
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500 shrink-0">—</span>
                  )}
                </div>
              );
            })}
            {onViewAllCitizens && topCitizens.length > 0 && (
              <button
                onClick={onViewAllCitizens}
                className="w-full mt-3 py-2 px-4 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-emerald-500 rounded-lg text-sm text-emerald-500 transition-all"
              >
                View All
              </button>
            )}
          </div>
        </div>
        {/* Worker Leaderboard */}
        <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-6">
          <h3 className="text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-500" />
            Worker Leaderboard
            <span className="text-xs font-normal text-slate-500 ml-2">Top {DASHBOARD_LEADERBOARD_PREVIEW}</span>
          </h3>
          <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
            {topWorkers.map((worker, index) => {
              const displayRank = worker.rank;
              const rankLabel = displayRank != null ? displayRank : index + 1;
              return (
                <div
                  key={worker.id ?? `${worker.name}-${index}`}
                  className="flex items-center gap-3 p-3 bg-slate-800/30 rounded-lg border border-slate-700/50"
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                      displayRank === 1
                        ? 'bg-emerald-500/20 text-emerald-500'
                        : displayRank === 2
                          ? 'bg-slate-500/20 text-slate-400'
                          : displayRank === 3
                            ? 'bg-teal-500/20 text-teal-500'
                            : 'bg-slate-700/20 text-slate-500'
                    }`}
                  >
                    {rankLabel}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{worker.name}</p>
                    <p className="text-xs text-slate-400">
                      {worker.tasksCompleted} resolved • ★ {Number(worker.rating).toFixed(1)}
                    </p>
                  </div>
                  {worker.badge ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shrink-0">
                      {formatWorkerBadge(worker.badge)}
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500 shrink-0">—</span>
                  )}
                </div>
              );
            })}
            {onViewAllWorkers && topWorkers.length > 0 && (
              <button
                onClick={onViewAllWorkers}
                className="w-full mt-3 py-2 px-4 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-emerald-500 rounded-lg text-sm text-emerald-500 transition-all"
              >
                View All
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Alerts */}
      <div className="bg-gradient-to-r from-red-500/10 to-orange-500/10 border border-red-500/20 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center flex-shrink-0">
            <Bell className="w-5 h-5 text-red-500" />
          </div>
          <div className="flex-1">
            <h3 className="text-white mb-2">In-Portal Alerts</h3>
            <div className="space-y-2">
              <p className="text-sm text-slate-300">• {stats.overdue || 0} reports are overdue and require immediate attention</p>
              <p className="text-sm text-slate-300">• {unassignedKpi} unassigned — no worker assigned yet</p>
              <p className="text-sm text-slate-300">• {pendingKpi} pending — worker accepted citizen report or admin assigned</p>
              <p className="text-sm text-slate-300">• System monitoring active zones for anomalies</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 🎨 YOUR EXACT EXISTING KPI CARD - NO CHANGES
function KPICard({
  title,
  value,
  icon: Icon,
  color,
  trend,
  subtitle,
}: {
  title: string;
  value: number;
  icon: any;
  color: 'blue' | 'red' | 'yellow' | 'green' | 'sky';
  trend: string;
  subtitle?: string;
}) {
  const colorClasses = {
    blue: 'from-blue-500 to-cyan-600',
    red: 'from-red-500 to-orange-600',
    yellow: 'from-yellow-500 to-orange-500',
    green: 'from-emerald-500 to-teal-600',
    sky: 'from-sky-500 to-blue-600',
  };
  
  return (
    <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-6 hover:border-slate-700 transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <span className={`text-sm px-2 py-1 rounded ${
          trend. startsWith('+') ? 'bg-green-500/20 text-green-500' :  'bg-red-500/20 text-red-500'
        }`}>
          {trend}
        </span>
      </div>
      <p className="text-sm text-slate-400 mb-1">{title}</p>
      {subtitle ? (
        <p className="text-[10px] text-slate-500 mb-1 leading-tight">{subtitle}</p>
      ) : null}
      <p className="text-3xl text-white">{value}</p>
    </div>
  );
}