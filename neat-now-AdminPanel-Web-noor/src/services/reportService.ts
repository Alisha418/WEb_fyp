import apiClient from './api';
import { Report, ReportStatus } from '../types';
import { resolveMediaUrl } from '../utils/resolveMediaUrl';

function resolveReportImageUrl(url: string | null | undefined): string {
  if (!url || !String(url).trim()) return '';
  return resolveMediaUrl(url) ?? String(url).trim();
}
import {
  approximateAreaFromCoordinates,
  dedupeLocationParts,
  isGenericFallbackLabel,
} from '../utils/locationLabel';

// ============================================
// BACKEND RESPONSE TYPES
// ============================================

interface BackendReport {
  report_id: number;
  report_source?: 'citizen' | 'admin';
  citizen_id?: number | null;
  created_by_admin_id?: number | null;
  citizen_name: string;
  worker_id: number | null;
  worker_name: string | null;
  status: string;
  ai_result: string;
  waste_type: string | null;
  ai_confidence: string | null;
  latitude: string | null;
  longitude: string | null;
  location:  string;
  location_address?: string | null;
  image_before: string;
  image_after: string | null;
  ai_image?: string | null;
  submitted_at: string;
  assigned_at: string | null;
  accepted_at?: string | null;
  started_at?: string | null;
  resolved_at: string | null;
  is_unassigned?: boolean;
  high_alert?: boolean;
}

interface ReportsResponse {
  success: boolean;
  count: number;
  results?: BackendReport[];
  data?: BackendReport[];
  /** Pagination URL from DRF (may be absolute or relative) */
  next?: string | null;
  previous?: string | null;
}

interface ReportFilters {
  status?: string;
  worker_id?: string;
  waste_type?: string;
  report_source?: 'citizen' | 'admin';
  search?:  string;
  date_from?: string;
  date_to?: string;
  page?: number;
  page_size?: number;
  /** Django ordering field, e.g. report_id (asc) or -submitted_at */
  ordering?: string;
  /** Cap auto-pagination in getReports (e.g. Map preload) */
  maxPages?: number;
}

/** Default page size for admin Reports tab */
export const REPORTS_PAGE_SIZE = 15;

export interface ReportsPageResult {
  success: boolean;
  data: Report[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

interface GeocodeResponse {
  success: boolean;
  data:  {
    address: string;
    lat: number;
    lng: number;
    provider?:  string;
    details?: {
      street?:  string;
      neighborhood?: string;
      city?: string;
      state?: string;
      country?: string;
    };
  };
}

// ============================================
// GEOCODING CACHE
// ============================================
const locationCache = new Map<string, string>();

/** Match Django Report.latitude (10,8) / longitude (11,8) — max 8 decimal places */
function normalizeCoordForApi(value: unknown, min: number, max: number): string {
  const n = typeof value === 'number' ? value : parseFloat(String(value));
  if (Number.isNaN(n)) return '0';
  const clamped = Math.min(max, Math.max(min, n));
  return clamped.toFixed(8);
}

// ============================================
// REPORT SERVICE
// ============================================

class ReportService {
  /** True when label is city-only / regional fallback and should be reverse-geocoded. */
  private isLowDetailAddress(loc: string): boolean {
    return isGenericFallbackLabel(loc);
  }

  /**
   * Get exact location from coordinates using backend geocoding API
   */
  async getExactLocation(lat: number, lng:  number): Promise<string> {
    const cacheKey = `${lat. toFixed(6)},${lng.toFixed(6)}`;

    // Check cache first
    if (locationCache.has(cacheKey)) {
      const cached = locationCache.get(cacheKey)!;
      console.log(`📍 Cache hit:  ${cached}`);
      return dedupeLocationParts(cached);
    }

    try {
      console.log(`📍 Geocoding via backend:  ${lat}, ${lng}`);
      
      const response = await apiClient.get<GeocodeResponse>('/reports/geocode/', {
        params:  { lat, lng }
      });

      if (response.data?. success && response.data?. data?. address) {
        const address = dedupeLocationParts(response. data.data.address);
        locationCache.set(cacheKey, address);
        console.log(`✅ Geocoded:  ${address} (via ${response.data.data.provider})`);
        return address;
      }
    } catch (error) {
      console. warn(`⚠️ Backend geocoding failed for ${lat}, ${lng}`, error);
    }

    const fallback = dedupeLocationParts(approximateAreaFromCoordinates(lat, lng));
    if (!isGenericFallbackLabel(fallback)) {
      locationCache.set(cacheKey, fallback);
    }
    return fallback;
  }

  /**
   * Get approximate area name (offline fallback)
   */
  private getApproximateArea(lat: number, lng: number): string {
    // Pakistan - Faisalabad
    if (lat >= 31.3 && lat <= 31.9 && lng >= 73.0 && lng <= 74.3) {
      if (lat >= 31.7) return 'North Faisalabad, Punjab';
      if (lat <= 31.5) return 'South Faisalabad, Punjab';
      if (lng >= 74.0) return 'East Faisalabad, Punjab';
      if (lng <= 73.5) return 'West Faisalabad, Punjab';
      return 'Faisalabad, Punjab';
    }

    // Pakistan - Islamabad
    if (lat >= 33.5 && lat <= 33.9 && lng >= 72.7 && lng <= 73.3) {
      return 'Islamabad, Pakistan';
    }

    // Pakistan - Lahore
    if (lat >= 31.3 && lat <= 31.8 && lng >= 74.1 && lng <= 74.6) {
      return 'Lahore, Punjab';
    }

    // Pakistan - Karachi
    if (lat >= 24.7 && lat <= 25.2 && lng >= 66.8 && lng <= 67.4) {
      return 'Karachi, Sindh';
    }

    // USA - New York (default coordinates)
    if (lat >= 40.5 && lat <= 41.0 && lng >= -74.5 && lng <= -73.5) {
      return 'New York City, USA';
    }

    return `Location (${lat. toFixed(4)}, ${lng.toFixed(4)})`;
  }

  /**
   * Generate zone from coordinates
   */
  private generateZoneFromCoordinates(lat:  number | null, lng: number | null): string {
    if (!lat || !lng) return 'Unknown Zone';

    // Pakistan zones
    if (lat >= 31.0 && lat <= 35.0 && lng >= 70.0 && lng <= 75.0) {
      if (lat > 33.5) return 'North Zone';
      if (lat < 31.5) return 'South Zone';
      if (lng > 74.0) return 'East Zone';
      if (lng < 73.0) return 'West Zone';
      return 'Central Zone';
    }

    // Default zones (NYC)
    if (lat > 40.78) return 'North Zone';
    if (lat < 40.72) return 'South Zone';
    if (lng > -73.98) return 'East Zone';
    if (lng < -74.02) return 'West Zone';
    return 'Central Zone';
  }

  private transformBackendReport(report: BackendReport): Report {
    const lat = report.latitude ? parseFloat(report.latitude) : null;
    const lng = report.longitude ? parseFloat(report.longitude) : null;
    const zone = this.generateZoneFromCoordinates(lat, lng);

    const addrRaw = report.location_address?.toString().trim() ?? '';
    const apiLoc = (report.location || '').trim();
    const hasStructuredAddress =
      addrRaw.length > 0 && !isGenericFallbackLabel(addrRaw);

    let location = 'Unknown Location';
    if (hasStructuredAddress) {
      location = addrRaw;
    } else if (lat && lng) {
      const cacheKey = `${lat.toFixed(6)},${lng.toFixed(6)}`;
      if (locationCache.has(cacheKey)) {
        location = locationCache.get(cacheKey)!;
      } else if (
        apiLoc &&
        apiLoc !== 'Unknown Location' &&
        !apiLoc.startsWith('Location (')
      ) {
        location = apiLoc;
      } else {
        location = approximateAreaFromCoordinates(lat, lng);
      }
    } else if (apiLoc && !isGenericFallbackLabel(apiLoc)) {
      location = apiLoc;
    } else {
      location = 'Unknown Location';
    }

    location = dedupeLocationParts(location) || location;

    return {
      id: String(report.report_id),
      citizenName: report.citizen_name,
      ...(report.citizen_id != null && report.citizen_id !== undefined
        ? { citizenId: String(report.citizen_id) }
        : {}),
      ...(report.report_source ? { reportSource: report.report_source } : {}),
      ...(report.created_by_admin_id != null
        ? { createdByAdminId: String(report.created_by_admin_id) }
        : {}),
      workerName: report.worker_name || undefined,
      workerId: report.worker_id ? String(report.worker_id) : undefined,
      location,
      ...(hasStructuredAddress ? { location_address: addrRaw } : {}),
      zone,
      status: report.status as ReportStatus,
      submittedAt: new Date(report.submitted_at),
      assignedAt: report.assigned_at ? new Date(report.assigned_at) : undefined,
      resolvedAt: report.resolved_at ? new Date(report.resolved_at) : undefined,
      wasteType: report.waste_type as Report['wasteType'],
      aiVerification: {
        verified: report.ai_result === 'Waste',
        confidence: report.ai_confidence ? parseFloat(report.ai_confidence) * 100 : 0,
        classification: report.waste_type as Report['wasteType'],
      },
      description: `${report.waste_type || 'Waste'} reported at ${location}`,
      beforeImage: resolveReportImageUrl(report.image_before),
      afterImage: resolveReportImageUrl(report.image_after) || undefined,
      aiVerifiedImage: resolveReportImageUrl(report.ai_image) || undefined,
      urgency: calculateUrgency(report),
      lat: lat || 40.7128,
      lng: lng || -74.0060,
      ...(report.is_unassigned !== undefined ? { is_unassigned: report.is_unassigned } : {}),
      ...(report.high_alert !== undefined ? { high_alert: report.high_alert } : {}),
    };
  }

  /**
   * Single page of reports (admin Reports tab). Does not loop through all pages.
   */
  async getReportsPage(filters?: ReportFilters): Promise<ReportsPageResult> {
    const page = filters?.page ?? 1;
    const pageSize = filters?.page_size ?? REPORTS_PAGE_SIZE;

    const response = await apiClient.get<ReportsResponse>('/reports/', {
      params: {
        status: filters?.status,
        worker_id: filters?.worker_id,
        waste_type: filters?.waste_type,
        report_source: filters?.report_source,
        search: filters?.search,
        date_from: filters?.date_from,
        date_to: filters?.date_to,
        ordering: filters?.ordering,
        page,
        page_size: pageSize,
      },
      timeout: 45000,
    });

    const body = response.data;
    const rawResults = body.results ?? body.data ?? [];
    const count = typeof body.count === 'number' ? body.count : rawResults.length;
    const data = rawResults.map((report) => this.transformBackendReport(report));
    const totalPages = count === 0 ? 0 : Math.ceil(count / pageSize);

    return {
      success: true,
      data,
      count,
      page,
      pageSize,
      totalPages,
      hasNext: Boolean(body.next),
      hasPrevious: Boolean(body.previous),
    };
  }

  /**
   * Get all reports with optional filters
   * Implements pagination to fetch ALL pages automatically
   * Geocodes locations in background after loading
   */
  async getReports(filters?: ReportFilters) {
    try {
      console.log('📋 Loading reports with pagination...');

      const allResults: BackendReport[] = [];
      let nextUrl: string | null = '/reports/';
      let pageCount = 0;
      let totalCount = 0;
      const visitedUrls = new Set<string>();
      const MAX_ITERATIONS = 1000; // Prevent infinite loops
      const maxPages = filters?.maxPages;

      while (nextUrl && pageCount < MAX_ITERATIONS) {
        if (maxPages != null && pageCount >= maxPages) {
          break;
        }
        // Prevent revisiting same URL (infinite loop protection)
        if (visitedUrls.has(nextUrl)) {
          console.warn('⚠️ Detected circular pagination, stopping fetch');
          break;
        }
        visitedUrls.add(nextUrl);

        try {
          // Determine if nextUrl is relative or absolute
          const fetchUrl: string = nextUrl;
          let fetchParams = pageCount === 0 ? filters : undefined; // Only add filters to first request

          // For absolute URLs from backend, use them directly (bypass baseURL)
          // For relative URLs, use as-is
          const isAbsoluteUrl: boolean = nextUrl.startsWith('http');

          console.log(`🔄 Fetching page ${pageCount + 1}: ${fetchUrl} (absolute: ${isAbsoluteUrl})`);

          // Split branches so TS does not infer a circular type for `response`
          let response: { data: ReportsResponse };
          if (isAbsoluteUrl) {
            response = await apiClient.get<ReportsResponse>(fetchUrl, {
              params: fetchParams,
              baseURL: undefined, // Override baseURL for absolute URLs
            });
          } else {
            response = await apiClient.get<ReportsResponse>(fetchUrl, {
              params: fetchParams,
            });
          }

          console.log(`📥 Response received:`, {
            hasResults: !!response.data?.results,
            hasData: !!response.data?.data,
            resultsLength: response.data?.results?.length,
            dataLength: response.data?.data?.length,
            count: response.data?.count,
            hasNext: !!response.data?.next,
            nextUrl: response.data?.next
          });

          // Extract results array from various possible response structures
          let pageResults: BackendReport[] = [];
          if (response.data?.results && Array.isArray(response.data.results)) {
            pageResults = response.data.results;
            console.log(`✓ Using response.data.results (${pageResults.length} items)`);
          } else if (response.data?.data && Array.isArray(response.data.data)) {
            pageResults = response.data.data;
            console.log(`✓ Using response.data.data (${pageResults.length} items)`);
          } else if (Array.isArray(response.data)) {
            pageResults = response.data;
            console.log(`✓ Using response.data directly (${pageResults.length} items)`);
          }

          allResults.push(...pageResults);
          totalCount = response.data?.count || allResults.length;

          // Get next URL for next iteration
          nextUrl = response.data?.next || null;
          pageCount++;

          console.log(`✅ Page ${pageCount} loaded: ${pageResults.length} reports, Total so far: ${allResults.length}`);
          console.log(`📍 Next URL: ${nextUrl || 'NULL (no more pages)'}`);
          console.log(`📊 Response structure:`, {
            hasResults: !!response.data?.results,
            hasData: !!response.data?.data,
            hasNext: !!response.data?.next,
            count: response.data?.count,
            nextValue: response.data?.next
          });

        } catch (pageError: any) {
          console.error(`❌ Error fetching page ${pageCount + 1}:`, pageError.message);
          // Continue with accumulated results rather than failing completely
          nextUrl = null;
        }
      }

      if (pageCount >= MAX_ITERATIONS) {
        console.warn('⚠️ Reached maximum pagination iterations');
      }

      console.log(`📦 Processing ${allResults.length} total reports...`);

      const transformedData: Report[] = allResults.map((report) =>
        this.transformBackendReport(report),
      );

      console.log(`✅ Successfully loaded and transformed ${transformedData.length} reports from ${pageCount} pages`);

      this.enrichReportLocations(transformedData).catch(() => {});

      return {
        success: true,
        data: transformedData,
        count: totalCount,
        pagesFetched: pageCount
      };
    } catch (error: any) {
      console.error('❌ Failed to fetch reports:', error);
      throw error;
    }
  }

  /**
   * Reverse-geocode unique low-detail coordinates (map + list labels).
   * Calls onBatch when any report location was updated so UI can refresh.
   */
  async enrichReportLocations(
    reports: Report[],
    onBatch?: (updated: Report[]) => void,
    options?: { maxCoords?: number },
  ): Promise<void> {
    const maxCoords = options?.maxCoords ?? 100;
    const coordToReports = new Map<string, Report[]>();

    for (const r of reports) {
      if (!r.lat || !r.lng) continue;
      const hasGoodAddress =
        r.location_address?.trim() &&
        !isGenericFallbackLabel(r.location_address);
      if (hasGoodAddress) continue;

      const cacheKey = `${r.lat.toFixed(6)},${r.lng.toFixed(6)}`;
      if (locationCache.has(cacheKey)) {
        const cached = locationCache.get(cacheKey)!;
        if (!isGenericFallbackLabel(cached)) {
          r.location = cached;
          r.description = `${r.wasteType || 'Waste'} reported at ${cached}`;
        }
        continue;
      }

      if (!this.isLowDetailAddress(r.location)) continue;

      if (!coordToReports.has(cacheKey)) {
        coordToReports.set(cacheKey, []);
      }
      coordToReports.get(cacheKey)!.push(r);
    }

    const keys = Array.from(coordToReports.keys()).slice(0, maxCoords);
    if (keys.length === 0) {
      if (onBatch) onBatch([...reports]);
      return;
    }

    console.log(`🌍 Geocoding ${keys.length} unique locations for ${reports.length} reports…`);

    let batchDirty = false;
    const concurrency = 3;
    for (let i = 0; i < keys.length; i += concurrency) {
      const chunk = keys.slice(i, i + concurrency);
      await Promise.all(
        chunk.map(async (cacheKey) => {
          const group = coordToReports.get(cacheKey)!;
          const sample = group[0];
          try {
            const address = dedupeLocationParts(
              await this.getExactLocation(sample.lat, sample.lng),
            );
            if (!isGenericFallbackLabel(address)) {
              for (const report of group) {
                report.location = address;
                report.description = `${report.wasteType || 'Waste'} reported at ${address}`;
              }
              batchDirty = true;
            }
          } catch {
            // keep approximate label
          }
        }),
      );
      if (batchDirty && onBatch) {
        onBatch([...reports]);
        batchDirty = false;
      }
    }

    if (onBatch) onBatch([...reports]);
    console.log('✅ Location enrichment complete');
  }

  /**
   * Get single report by ID with geocoding
   */
  async getReportById(id:  string | number) {
    try {
      console.log(`📋 Fetching report #${id}`);

      const response = await apiClient. get<{ success: boolean; data:  BackendReport }>(`/reports/${id}/`);
      const report = response.data.data || response.data;

      const lat = report.latitude ? parseFloat(report.latitude) : null;
      const lng = report.longitude ?  parseFloat(report. longitude) : null;
      const zone = this.generateZoneFromCoordinates(lat, lng);

      const addrRaw = report.location_address?.toString().trim() ?? '';
      const apiLoc = (report.location || '').trim();
      let location = 'Unknown Location';
      if (addrRaw && !isGenericFallbackLabel(addrRaw)) {
        location = addrRaw;
      } else if (lat && lng && (!apiLoc || apiLoc === 'Unknown Location' || this.isLowDetailAddress(apiLoc))) {
        try {
          location = await this.getExactLocation(lat, lng);
        } catch (e) {
          location = approximateAreaFromCoordinates(lat, lng);
        }
      } else {
        location = apiLoc || 'Unknown Location';
      }

      location = dedupeLocationParts(location) || location;

      const transformed:  Report = {
        id: String(report.report_id),
        citizenName: report.citizen_name,
        ...(report.citizen_id != null && report.citizen_id !== undefined
          ? { citizenId: String(report.citizen_id) }
          : {}),
        ...(report.report_source ? { reportSource: report.report_source } : {}),
        ...(report.created_by_admin_id != null
          ? { createdByAdminId: String(report.created_by_admin_id) }
          : {}),
        workerName: report.worker_name || undefined,
        workerId:  report.worker_id ? String(report. worker_id) : undefined,
        location: location,
        ...(addrRaw ? { location_address: addrRaw } : {}),
        zone: zone,
        status: report. status as ReportStatus,
        submittedAt: new Date(report.submitted_at),
        assignedAt: report. assigned_at ? new Date(report.assigned_at) : undefined,
        resolvedAt: report.resolved_at ? new Date(report.resolved_at) : undefined,
        wasteType: report.waste_type as any,
        aiVerification:  {
          verified:  report.ai_result === 'Waste',
          confidence:  report.ai_confidence ? parseFloat(report.ai_confidence) * 100 :  0,
          classification: report.waste_type as any
        },
        description: `${report.waste_type || 'Waste'} reported at ${location}`,
        beforeImage: resolveReportImageUrl(report.image_before),
        afterImage: resolveReportImageUrl(report.image_after) || undefined,
        urgency:  calculateUrgency(report),
        lat: lat || 40.7128,
        lng: lng || -74.0060,
        ...(report.is_unassigned !== undefined ? { is_unassigned: report.is_unassigned } : {}),
        ...(report.high_alert !== undefined ? { high_alert: report.high_alert } : {}),
      };

      console.log('✅ Report fetched:', transformed. location);
      return { success: true, data: transformed };
    } catch (error) {
      console. error(`❌ Failed to fetch report ${id}:`, error);
      throw error;
    }
  }

  /**
   * Assign worker to report
   */
  async assignWorker(reportId:  string | number, workerId: string | number) {
    try {
      console. log(`📌 Assigning worker ${workerId} to report ${reportId}`);

      const workerIdNumber = Number(workerId);

      if (isNaN(workerIdNumber)) {
        throw new Error(`Invalid worker ID: ${workerId}`);
      }

      const response = await apiClient. post(`/reports/${reportId}/assign/`, {
        worker_id: workerIdNumber
      });

      console.log('✅ Worker assigned successfully');
      return response.data;
    } catch (error:  any) {
      console.error('❌ Failed to assign worker:', error);
      const errorMsg = error.response?. data?.error || error.response?.data?.message || 'Failed to assign worker';
      throw new Error(errorMsg);
    }
  }

  /**
   * Update report status
   */
  async updateStatus(reportId: string | number, status:  ReportStatus) {
    try {
      console.log(`🔄 Updating report ${reportId} status to ${status}`);

      const response = await apiClient. patch(`/reports/${reportId}/update_status/`, {
        status
      });

      console.log('✅ Status updated successfully');
      return response. data;
    } catch (error: any) {
      console.error('❌ Failed to update status:', error);
      throw error;
    }
  }

  /**
   * Get report statistics
   */
  async getStatistics() {
    try {
      const response = await apiClient.get('/reports/statistics/');
      return response.data;
    } catch (error) {
      console. error('❌ Failed to fetch statistics:', error);
      throw error;
    }
  }

  async getReportsByStatus(status: ReportStatus) {
    return this.getReports({ status });
  }

  async getReportsByWorker(workerId:  string | number) {
    return this. getReports({ worker_id: String(workerId) });
  }

  async getPendingReports() {
    return this.getReports({ status: 'Pending' });
  }

  async getReportsByDateRange(dateFrom: string, dateTo: string) {
    return this.getReports({ date_from: dateFrom, date_to: dateTo });
  }

  async searchReports(query:  string) {
    return this.getReports({ search: query });
  }

  /**
   * Admin: run YOLO waste check on image (does not create report).
   */
  async verifyWasteImage(imageFile: File) {
    const formData = new FormData();
    formData.append('image_before', imageFile);
    const response = await apiClient.post('/reports/verify_waste_image/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    });
    return response.data;
  }

  /**
   * Report details: analyze stored report image on server (no browser re-upload).
   */
  async verifyWasteForReport(reportId: string | number) {
    const response = await apiClient.post(
      `/reports/${reportId}/verify_ai_detections/`,
      {},
      { timeout: 120000 },
    );
    return response.data;
  }

  /**
   * Create new report
   */
  async createReport(data: any) {
    try {
      console.log('➕ Creating new report...');

      const isFormData = data instanceof FormData;

      if (isFormData) {
        if (data.has('latitude')) {
          data.set('latitude', normalizeCoordForApi(data.get('latitude'), -90, 90));
        }
        if (data.has('longitude')) {
          data.set('longitude', normalizeCoordForApi(data.get('longitude'), -180, 180));
        }
      } else {
        if (Array.isArray(data.latitude)) data.latitude = parseFloat(data.latitude[0]);
        if (Array.isArray(data.longitude)) data.longitude = parseFloat(data.longitude[0]);
        data.latitude = parseFloat(normalizeCoordForApi(data.latitude, -90, 90));
        data.longitude = parseFloat(normalizeCoordForApi(data.longitude, -180, 180));
      }

      // Admin create: AI verification + image upload (S3) can exceed default 15s
      const createTimeoutMs = 120000;

      let response;
      if (isFormData) {
        response = await apiClient.post('/reports/', data, {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: createTimeoutMs,
        });
      } else {
        response = await apiClient.post('/reports/', data, { timeout: createTimeoutMs });
      }

      console.log('✅ Report created:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Failed to create report:', error);
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        throw new Error(
          'Request timed out. AI verification and image upload can take up to 2 minutes — please wait and try again, or check that Django and S3 are running.',
        );
      }
      const body = error.response?.data;
      let msg = error.message;
      if (typeof body === 'string') {
        msg = body;
      } else if (body && typeof body === 'object') {
        const first = Object.values(body).flat()[0];
        if (typeof first === 'string') msg = first;
        else if (body.message) msg = body.message;
        else if (body.detail) msg = String(body.detail);
      }
      const wrapped: Error & { response?: typeof error.response } = new Error(msg);
      wrapped.response = error.response;
      throw wrapped;
    }
  }

  /**
   * Delete report
   */
  async deleteReport(reportId:  string | number) {
    try {
      console.log(`🗑️ Deleting report ${reportId}`);
      const response = await apiClient.delete(`/reports/${reportId}/`);
      console.log('✅ Report deleted');
      return response.data;
    } catch (error: any) {
      console.error('❌ Failed to delete report:', error);
      throw error;
    }
  }

  /**
   * Get reports map data
   */
  async getReportsMapData() {
    try {
      const response = await this.getReports();
      return response.data. map(report => ({
        id: report.id,
        lat:  report.lat,
        lng:  report.lng,
        location: report. location,
        status: report.status,
        zone: report.zone,
        wasteType: report. wasteType,
        submittedAt: report.submittedAt
      }));
    } catch (error) {
      console. error('❌ Failed to fetch map data:', error);
      throw error;
    }
  }

  /**
   * Manually geocode a location (for on-demand use)
   */
  async geocodeLocation(lat: number, lng: number): Promise<string> {
    return this.getExactLocation(lat, lng);
  }

  /** Cached street-level label for coordinates (if already geocoded this session). */
  getCachedLocation(lat: number, lng: number): string | undefined {
    const cacheKey = `${lat.toFixed(6)},${lng.toFixed(6)}`;
    const cached = locationCache.get(cacheKey);
    if (cached && !isGenericFallbackLabel(cached)) {
      return dedupeLocationParts(cached);
    }
    return undefined;
  }

  /**
   * Geocode many points in parallel (hotspot cluster centers).
   * Calls onResult as each address resolves — UI can update immediately.
   */
  async geocodePoints(
    points: Array<{ id: string; lat: number; lng: number }>,
    onResult?: (id: string, address: string) => void,
    concurrency = 6,
  ): Promise<void> {
    if (points.length === 0) return;

    const queue = [...points];
    const worker = async () => {
      while (queue.length > 0) {
        const point = queue.shift();
        if (!point) break;
        try {
          const address = dedupeLocationParts(
            await this.getExactLocation(point.lat, point.lng),
          );
          if (!isGenericFallbackLabel(address)) {
            onResult?.(point.id, address);
          }
        } catch {
          // keep fallback label
        }
      }
    };

    const workers = Math.min(concurrency, points.length);
    await Promise.all(Array.from({ length: workers }, () => worker()));
  }

  /**
   * Clear location cache
   */
  clearLocationCache() {
    locationCache.clear();
    console.log('🗑️ Location cache cleared');
  }

  /**
   * Get cache size
   */
  getCacheSize(): number {
    return locationCache.size;
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function calculateUrgency(report: BackendReport): number {
  let urgency = 5;

  if (report.status === 'Pending') urgency += 2;

  const hoursOld = (Date.now() - new Date(report.submitted_at).getTime()) / (1000 * 60 * 60);

  if (hoursOld > 72) urgency += 3;
  else if (hoursOld > 48) urgency += 2;
  else if (hoursOld > 24) urgency += 1;

  if (report.waste_type === 'Hazardous') urgency += 3;
  else if (report.waste_type === 'Electronic') urgency += 1;

  return Math.min(urgency, 10);
}

export function formatReportStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'Pending':  '⏳ Pending',
    'Assigned': '📋 Assigned',
    'In Progress': '🔄 In Progress',
    'Resolved': '✅ Resolved',
    'Rejected': '❌ Rejected'
  };
  return statusMap[status] || status;
}

export function getStatusColor(status: string): string {
  const colorMap: Record<string, string> = {
    'Pending':  '#ef4444',
    'Assigned': '#f59e0b',
    'In Progress': '#3b82f6',
    'Resolved': '#10b981',
    'Rejected': '#dc2626'
  };
  return colorMap[status] || '#6b7280';
}

export function formatCoordinates(lat: number, lng: number): string {
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

export function getWasteTypeIcon(wasteType:  string): string {
  const iconMap:  Record<string, string> = {
    'Plastic': '♻️',
    'Organic':  '🍂',
    'Metal':  '🔩',
    'Glass':  '🥃',
    'Mixed':  '🗑️',
    'Electronic': '📱',
    'Hazardous': '⚠️'
  };
  return iconMap[wasteType] || '🗑️';
}

export default new ReportService();