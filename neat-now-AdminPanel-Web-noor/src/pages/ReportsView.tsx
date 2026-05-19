import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Search, Filter, ChevronDown, Eye, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import { Report, ReportStatus, WasteType } from '../types';
import type { Worker } from '../types/worker';
import reportService, { REPORTS_PAGE_SIZE } from '../services/reportService';
import {
  getAdminReportDisplayStatus,
  isAdminCreatedReport,
} from '../utils/dashboardStats';
import { getErrorMessage } from '../services/api';

interface ReportsViewProps {
  /** Optional fallback only; table data is loaded per page from the API */
  reports?: Report[];
  workers: Worker[];
  statusFilter: ReportStatus | 'All';
  setStatusFilter: (value:  ReportStatus | 'All') => void;
  workerFilter: string;
  setWorkerFilter: (value: string) => void;
  zoneFilter:  string;
  setZoneFilter: (value: string) => void;
  wasteTypeFilter:  WasteType | 'All';
  setWasteTypeFilter: (value: WasteType | 'All') => void;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  dateRange: { start: string; end: string };
  setDateRange: (value: { start:  string; end: string }) => void;
  onSelectReport: (report: Report) => void;
  /** Increment from parent after assign/status change (e.g. success dialog OK). */
  refreshKey?: number;
}

export function ReportsView({
  reports: reportsFallback = [],
  workers,
  statusFilter,
  setStatusFilter,
  workerFilter,
  setWorkerFilter,
  zoneFilter,
  setZoneFilter,
  wasteTypeFilter,
  setWasteTypeFilter,
  searchQuery,
  setSearchQuery,
  dateRange,
  setDateRange,
  onSelectReport,
  refreshKey = 0,
}: ReportsViewProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pageReports, setPageReports] = useState<Report[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);
  const [citizenFilter, setCitizenFilter] = useState('All');
  const [sourceFilter, setSourceFilter] = useState<'All' | 'Citizen' | 'Admin-created'>('All');
  const [debouncedSearch, setDebouncedSearch] = useState(searchQuery);
  const workersRef = useRef(workers);
  workersRef.current = workers;
  const fetchIdRef = useRef(0);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(searchQuery), 400);
    return () => window.clearTimeout(t);
  }, [searchQuery]);

  const filterKey = useMemo(
    () =>
      [
        statusFilter,
        workerFilter,
        wasteTypeFilter,
        sourceFilter,
        citizenFilter,
        debouncedSearch,
        dateRange.start,
        dateRange.end,
      ].join('|'),
    [
      statusFilter,
      workerFilter,
      wasteTypeFilter,
      sourceFilter,
      citizenFilter,
      debouncedSearch,
      dateRange.start,
      dateRange.end,
    ],
  );

  // Reset to page 1 when filters change (skip initial mount).
  const prevFilterKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (prevFilterKeyRef.current !== null && prevFilterKeyRef.current !== filterKey) {
      setCurrentPage(1);
    }
    prevFilterKeyRef.current = filterKey;
  }, [filterKey]);

  const applyPageResult = (result: Awaited<ReturnType<typeof reportService.getReportsPage>>) => {
    const pages = result.totalPages;
    setPageReports(result.data);
    setTotalCount(result.count);
    setTotalPages(pages);
    setHasNext(result.hasNext);
    setHasPrevious(result.hasPrevious);
    if (result.page > pages && pages > 0) {
      setCurrentPage(pages);
    }
  };

  const buildPageParams = (page: number): Parameters<typeof reportService.getReportsPage>[0] => {
    const params: Parameters<typeof reportService.getReportsPage>[0] = {
      page,
      page_size: REPORTS_PAGE_SIZE,
      ordering: 'report_id',
    };
    if (statusFilter !== 'All') params.status = statusFilter;
    if (workerFilter !== 'All') {
      const w = workersRef.current.find((row) => row.name === workerFilter);
      if (w?.id) params.worker_id = w.id;
    }
    if (wasteTypeFilter !== 'All') params.waste_type = wasteTypeFilter;
    if (sourceFilter === 'Citizen') params.report_source = 'citizen';
    if (sourceFilter === 'Admin-created') params.report_source = 'admin';
    if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
    else if (citizenFilter !== 'All') params.search = citizenFilter;
    if (dateRange.start) params.date_from = dateRange.start;
    if (dateRange.end) params.date_to = dateRange.end;
    return params;
  };

  useEffect(() => {
    const fetchId = ++fetchIdRef.current;
    setLoading(true);
    setLoadError(null);

    reportService
      .getReportsPage(buildPageParams(currentPage))
      .then((result) => {
        if (fetchId !== fetchIdRef.current) return;
        applyPageResult(result);
      })
      .catch((error) => {
        if (fetchId !== fetchIdRef.current) return;
        const msg = getErrorMessage(error);
        console.error('❌ Failed to load reports page:', msg);
        setLoadError(msg);
        setPageReports([]);
        setTotalCount(0);
        setTotalPages(0);
        setHasNext(false);
        setHasPrevious(false);
      })
      .finally(() => {
        if (fetchId === fetchIdRef.current) setLoading(false);
      });
  }, [currentPage, filterKey, refreshKey]);

  const handleRefresh = () => {
    const fetchId = ++fetchIdRef.current;
    setLoading(true);
    setLoadError(null);

    reportService
      .getReportsPage(buildPageParams(currentPage))
      .then((result) => {
        if (fetchId !== fetchIdRef.current) return;
        applyPageResult(result);
        setLoadError(null);
      })
      .catch((error) => {
        if (fetchId !== fetchIdRef.current) return;
        setLoadError(getErrorMessage(error));
      })
      .finally(() => {
        if (fetchId === fetchIdRef.current) setLoading(false);
      });
  };

  const workerOptions = useMemo(
    () => ['All', ...workers.map((w) => w.name).filter(Boolean).sort()],
    [workers],
  );

  const uniqueZones = useMemo(
    () =>
      Array.from(new Set(pageReports.map((r) => r.zone).filter(Boolean))).sort() as string[],
    [pageReports],
  );

  const uniqueCitizens = useMemo(
    () =>
      Array.from(
        new Set(
          pageReports
            .filter((r) => !isAdminCreatedReport(r))
            .map((r) => r.citizenName)
            .filter(Boolean),
        ),
      ).sort() as string[],
    [pageReports],
  );

  const displayedReports = useMemo(() => {
    let rows = pageReports;
    if (zoneFilter !== 'All') {
      rows = rows.filter((r) => r.zone === zoneFilter);
    }
    return rows;
  }, [pageReports, zoneFilter]);

  const pageStart = totalCount === 0 ? 0 : (currentPage - 1) * REPORTS_PAGE_SIZE + 1;
  const pageEnd =
    totalCount === 0 ? 0 : Math.min((currentPage - 1) * REPORTS_PAGE_SIZE + pageReports.length, totalCount);

  const pageNumbers = useMemo(() => {
    if (totalPages <= 0) return [];
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }, [totalPages]);

  const showPagination = totalPages > 1;
  
  return (
    <div className="space-y-4">
      {/* Header with Refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Reports Management</h2>
          <p className="text-slate-400 text-sm mt-1">View and manage waste collection reports</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          title="Refresh reports"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by ID or location..."
              className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
            />
          </div>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded-lg transition-all"
          >
            <Filter className="w-4 h-4" />
            More Filters
            <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
        </div>
        
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4 pt-4 border-t border-slate-800">
            <FilterSelect
              label="Source"
              value={sourceFilter}
              onChange={setSourceFilter}
              options={['All', 'Citizen', 'Admin-created']}
            />
            <FilterSelect
              label="Citizen"
              value={citizenFilter}
              onChange={setCitizenFilter}
              options={['All', ...uniqueCitizens]}
            />
            <FilterSelect
              label="Status"
              value={statusFilter}
              onChange={setStatusFilter}
              options={['All', 'Pending', 'Assigned', 'In Progress', 'Resolved', 'Rejected']}
            />
            <FilterSelect
              label="Worker"
              value={workerFilter}
              onChange={setWorkerFilter}
              options={workerOptions}
            />
            <FilterSelect
              label="Zone"
              value={zoneFilter}
              onChange={setZoneFilter}
              options={['All', ...uniqueZones]}
            />
            <div>
              <label className="block text-sm text-slate-400 mb-2">Date From</label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-2">Date To</label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
            
            {/* Clear Filters Button */}
            <div className="flex items-end">
              <button
                onClick={() => {
                  setStatusFilter('All');
                  setCitizenFilter('All');
                  setSourceFilter('All');
                  setWorkerFilter('All');
                  setZoneFilter('All');
                  setSearchQuery('');
                  setDateRange({ start: '', end: '' });
                }}
                className="w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-all"
              >
                Clear Filters
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">
          Showing{' '}
          <span className="text-white font-semibold">
            {totalCount === 0 ? 0 : `${pageStart}–${pageEnd}`}
          </span>{' '}
          of <span className="text-white font-semibold">{totalCount}</span> reports
          {totalPages > 1 && (
            <span className="text-slate-500">
              {' '}
              (page {currentPage} of {totalPages})
            </span>
          )}
        </p>
        {(statusFilter !== 'All' || citizenFilter !== 'All' || sourceFilter !== 'All' || workerFilter !== 'All' || zoneFilter !== 'All' || 
          searchQuery || dateRange.start || dateRange.end) && (
          <p className="text-xs text-emerald-400">
            ✓ Filters active
          </p>
        )}
      </div>
      
      {/* Reports Table */}
      <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-800/50 border-b border-slate-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs text-slate-400 uppercase tracking-wider">Report ID</th>
                <th className="px-4 py-3 text-left text-xs text-slate-400 uppercase tracking-wider">Citizen</th>
                <th className="px-4 py-3 text-left text-xs text-slate-400 uppercase tracking-wider">Worker</th>
                <th className="px-4 py-3 text-left text-xs text-slate-400 uppercase tracking-wider">Location</th>
                <th className="px-4 py-3 text-left text-xs text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs text-slate-400 uppercase tracking-wider">Submitted</th>
                <th className="px-4 py-3 text-left text-xs text-slate-400 uppercase tracking-wider">AI Verified</th>
                <th className="px-4 py-3 text-left text-xs text-slate-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-slate-400">Loading reports...</p>
                    </div>
                  </td>
                </tr>
              ) : loadError ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <p className="text-red-400 mb-2">Could not load reports</p>
                    <p className="text-slate-500 text-sm mb-4">{loadError}</p>
                    <button
                      type="button"
                      onClick={handleRefresh}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm"
                    >
                      Try again
                    </button>
                  </td>
                </tr>
              ) : displayedReports.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="text-6xl">📋</div>
                        <p className="text-slate-400">No reports found</p>
                        <p className="text-slate-500 text-sm">Try adjusting your filters</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <>
                    {displayedReports.map((report: Report) => (
                      <tr key={report.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-3">
                          <span className="text-sm text-white font-mono">{report.id}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            {isAdminCreatedReport(report) ? (
                              <>
                                <span className="text-sm text-slate-400">Admin-created task</span>
                                <span className="text-xs text-slate-500">Not a citizen report</span>
                              </>
                            ) : (
                              <span className="text-sm text-slate-300">{report.citizenName}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {report.workerName ? (
                            <span className="text-sm text-slate-300">{report.workerName}</span>
                          ) : (
                            <span className="text-sm text-slate-500">
                              {getAdminReportDisplayStatus(report) === 'Awaiting Acceptance'
                                ? 'Awaiting worker'
                                : 'Unassigned'}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col max-w-xs">
                            <span className="text-sm text-slate-300 truncate">{report.location}</span>
                            <span className="text-xs text-slate-500">{report.zone}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge report={report} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span className="text-sm text-slate-400">
                              {report.submittedAt.toLocaleDateString()}
                            </span>
                            <span className="text-xs text-slate-500">
                              {report.submittedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {report.aiVerification.verified ? (
                            <div className="flex items-center gap-1 text-green-500">
                              <CheckCircle2 className="w-4 h-4" />
                              <span className="text-xs font-medium">
                                {report.aiVerification.confidence.toFixed(0)}%
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-red-500">
                              <XCircle className="w-4 h-4" />
                              <span className="text-xs">Failed</span>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => onSelectReport(report)}
                            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-all"
                            title="View details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </>
                )}
            </tbody>
          </table>
        </div>
      </div>

      {showPagination && (
        <div className="flex flex-wrap items-center justify-center gap-2 py-2">
          {hasPrevious && (
            <button
              type="button"
              disabled={loading}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 text-sm rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Previous
            </button>
          )}
          {pageNumbers.map((pageNum) => (
            <button
              key={pageNum}
              type="button"
              disabled={loading}
              onClick={() => setCurrentPage(pageNum)}
              className={`min-w-[2.25rem] px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                pageNum === currentPage
                  ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400 font-semibold'
                  : 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {pageNum}
            </button>
          ))}
          {hasNext && (
            <button
              type="button"
              disabled={loading}
              onClick={() => setCurrentPage((p) => p + 1)}
              className="px-3 py-1.5 text-sm rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================
// FILTER SELECT COMPONENT
// ============================================

function FilterSelect({ 
  label, 
  value, 
  onChange, 
  options 
}: { 
  label:  string; 
  value: string; 
  onChange: (value: any) => void; 
  options: string[]; 
}) {
  return (
    <div>
      <label className="block text-sm text-slate-400 mb-2">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target. value)}
        className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus: outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 appearance-none cursor-pointer"
      >
        {options.map((opt:  string) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  );
}

// ============================================
// STATUS BADGE COMPONENT
// ============================================

function StatusBadge({ report }: { report: Report }) {
  const label = getAdminReportDisplayStatus(report);
  const styles: Record<string, string> = {
    'Awaiting Acceptance': 'bg-slate-500/20 text-slate-300 border-slate-500/40',
    Unassigned: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    Pending: 'bg-red-500/20 text-red-400 border-red-500/30',
    Assigned: 'bg-red-500/20 text-red-400 border-red-500/30',
    'In Progress': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    Resolved: 'bg-green-500/20 text-green-400 border-green-500/30',
    Rejected: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    Overdue: 'bg-red-600/20 text-red-400 border-red-600/30',
  };

  const style = styles[label] || 'bg-slate-500/20 text-slate-400 border-slate-500/30';

  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border ${style}`}
      title={report.status !== label ? `Database status: ${report.status}` : undefined}
    >
      {label}
    </span>
  );
}
