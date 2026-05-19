import apiClient from './api';
import { getErrorMessage } from './api';
import type { BackendWorker } from '../types/worker';

// ============================================
// RESPONSE TYPES
// ============================================
interface WorkersListResponse {
  success?:  boolean;
  count:  number;
  next?: string;
  previous?: string;
  results:  BackendWorker[];
}

interface BackendWorkerDetail extends BackendWorker {
  // Add any additional fields that come from detail endpoint
}

interface WorkerDetailResponse {
  success:  boolean;
  data:  BackendWorkerDetail;
}

interface WorkerActionResponse {
  success: boolean;
  message:  string;
  data?: BackendWorkerDetail;
}

interface WorkerStatsResponse {
  success: boolean;
  data: {
    performance:  {
      total_resolved:  number;
      avg_completion_time: number;
      total_lifetime:  number;
      current_rating: number;
      period_days: number;
      avg_resolution_time_hours?: number;
      done_reports?: number;
      in_progress_reports?: number;
      resolution_rate?: number;
    };
    monthly:  {
      resolved_tasks: number;
      avg_rating: number;
      badge:  'None' | 'Silver' | 'Gold' | 'Platinum';
      monthly_rank: number | null;
    };
    lifetime: {
      total_tasks: number;
      avg_rating: number;
      employee_code: string;
    };
  };
}

interface WorkerLocation {
  location_id: number;
  latitude: number;
  longitude:  number;
  recorded_at: string;
}

interface LocationHistoryResponse {
  success: boolean;
  count: number;
  data: WorkerLocation[];
}

// ============================================
// NEW:  Assignment & Activity Types
// ============================================
interface WorkerAssignment {
  id: string;
  report_id: string;
  /** Citizen-submitted address text when present (same source as mobile app). */
  location_address?: string | null;
  location: string;
  address: string;
  status: string;
  reported_by?: string;
  waste_type: string;
  category: string;
  created_at: string;
  assigned_at: string;
  resolved_at?: string;
}

interface WorkerAssignmentsResponse {
  success: boolean;
  count: number;
  data: WorkerAssignment[];
}

interface WorkerActivityLog {
  id:  string;
  action: string;
  description: string;
  timestamp: string;
  created_at: string;
  report_id?:  string;
}

interface WorkerActivityResponse {
  success:  boolean;
  count: number;
  data: WorkerActivityLog[];
}

interface PasswordResetResponse {
  success:  boolean;
  message: string;
  email?:  string;
}

interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
}

interface NotificationResponse {
  success: boolean;
  message: string;
  // Optional fields used by WorkerProfile UI
  notification_id?: number;
  email_sent?: boolean;
  email?: string;
}

// ============================================
// PAYLOAD TYPES
// ============================================
export interface WorkerCreatePayload {
  name: string;
  email: string;
  phone?:  string;
  password: string;
  profile_image?: File | string;
  employee_code:  string;
  zone?:  number;
}

export interface WorkerUpdatePayload {
  name?: string;
  phone?: string;
  profile_image?: File | string;
  employee_code?: string;
  zone?:  number;
}

// ============================================
// FILTER TYPES
// ============================================
export interface WorkerFilters {
  is_active?: boolean;
  is_tracking?: boolean;
  search?: string;
  ordering?: string;
  page?: number;
  page_size?: number;
  zone?: number;
}

// ============================================
// WORKER SERVICE
// ============================================
class WorkerService {
  /**
   * Get list of workers
   */
  async getWorkers(filters?: WorkerFilters): Promise<WorkersListResponse> {
    try {
      console.log('📋 Fetching workers with filters:', filters);
      const response = await apiClient.get('/workers/', { params: filters });
      console.log(`✅ Fetched ${response.data.results?. length || 0} workers`);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching workers:', getErrorMessage(error));
      throw error;
    }
  }

  /**
   * Get worker by ID with full details
   */
  async getWorkerById(id: string | number): Promise<WorkerDetailResponse> {
    try {
      console.log(`📋 Fetching worker #${id}`);
      const response = await apiClient. get(`/workers/${id}/`);
      console.log(`✅ Worker fetched: `, response.data.data);
      return response.data;
    } catch (error) {
      console.error(`❌ Error fetching worker #${id}:`, getErrorMessage(error));
      throw error;
    }
  }

  /**
   * ✅ NEW: Get single worker (alias for getWorkerById for compatibility)
   */
  async getWorker(id:  string | number): Promise<BackendWorkerDetail> {
    try {
      console. log(`📋 Fetching worker #${id}`);
      const response = await apiClient.get(`/workers/${id}/`);
      
      // Handle both response formats
      if (response.data. data) {
        return response.data. data;
      }
      return response.data;
    } catch (error) {
      console.error(`❌ Error fetching worker #${id}: `, getErrorMessage(error));
      throw error;
    }
  }

  /**
   * ✅ NEW:  Get worker's current assignments
   */
  async getWorkerAssignments(id:  string | number): Promise<WorkerAssignment[]> {
    try {
      console.log(`📋 Fetching assignments for worker #${id}`);
      const response = await apiClient.get(`/workers/${id}/assignments/`);
      console.log(`✅ Fetched ${response.data.count || response.data.length || 0} assignments`);
      
      // Handle different response formats
      if (response.data. data) {
        return response.data. data;
      }
      if (response.data. results) {
        return response.data. results;
      }
      if (Array.isArray(response.data)) {
        return response.data;
      }
      return [];
    } catch (error) {
      console. error(`❌ Error fetching worker assignments: `, getErrorMessage(error));
      // Return empty array instead of throwing - assignments might not exist
      return [];
    }
  }

  /**
   * ✅ NEW: Get worker activity log
   */
  async getWorkerActivity(id: string | number): Promise<WorkerActivityLog[]> {
    try {
      console.log(`📋 Fetching activity log for worker #${id}`);
      const response = await apiClient.get(`/workers/${id}/activity/`);
      console.log(`✅ Fetched activity log`);
      
      // Handle different response formats
      if (response.data.data) {
        return response.data.data;
      }
      if (response.data.results) {
        return response.data.results;
      }
      if (Array.isArray(response.data)) {
        return response.data;
      }
      return [];
    } catch (error) {
      console.error(`❌ Error fetching worker activity:`, getErrorMessage(error));
      // Return empty array instead of throwing
      return [];
    }
  }

  /**
   * ✅ NEW: Reset worker password - sends email with temporary password
   */
  async resetWorkerPassword(id:  string | number): Promise<PasswordResetResponse> {
    try {
      console.log(`🔄 Sending password reset email for worker #${id}`);
      const response = await apiClient. post(`/workers/${id}/reset_password/`);
      console.log('✅ Password reset email sent:', response.data);
      return response. data;
    } catch (error:  any) {
      console.error(`❌ Error resetting worker password:`, getErrorMessage(error));
      
      // Extract error message
      let errorMessage = 'Failed to send password reset email';
      if (error. response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?. data?.error) {
        errorMessage = error.response.data.error;
      }
      
      const customError = new Error(errorMessage);
      (customError as any).response = error.response;
      throw customError;
    }
  }

  /**
   * ✅ NEW: Send push notification to worker
   */
  async sendNotification(
    id: string | number, 
    notification: NotificationPayload
  ): Promise<NotificationResponse> {
    try {
      console.log(`📤 Sending notification to worker #${id}: `, notification);
      const response = await apiClient.post(`/workers/${id}/notify/`, notification);
      console.log('✅ Notification sent:', response.data);
      return response.data;
    } catch (error:  any) {
      console.error(`❌ Error sending notification:`, getErrorMessage(error));
      
      let errorMessage = 'Failed to send notification';
      if (error.response?.data?. message) {
        errorMessage = error. response.data.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response. data.error;
      }
      
      const customError = new Error(errorMessage);
      (customError as any).response = error.response;
      throw customError;
    }
  }

  /**
   * ✅ NEW: Send custom email to worker
   */
  async sendEmail(
    id:  string | number,
    email: { subject: string; message: string }
  ): Promise<NotificationResponse> {
    try {
      console.log(`📧 Sending email to worker #${id}`);
      const response = await apiClient. post(`/workers/${id}/send_email/`, email);
      console.log('✅ Email sent:', response. data);
      return response.data;
    } catch (error: any) {
      console.error(`❌ Error sending email:`, getErrorMessage(error));
      throw error;
    }
  }

  /**
   * Create new worker
   */
  async createWorker(payload: WorkerCreatePayload): Promise<WorkerActionResponse> {
    try {
      console.log('➕ Creating new worker:', {
        name: payload.name,
        email: payload.email,
        employee_code: payload. employee_code,
        zone: payload. zone,
        has_image: !!payload.profile_image
      });

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(payload. email)) {
        throw new Error('Invalid email format.  Please use format: user@example.com');
      }

      if (payload.profile_image instanceof File) {
        const formData = new FormData();
        formData.append('name', payload.name. trim());
        formData.append('email', payload.email. trim().toLowerCase());
        formData.append('phone', payload.phone?. trim() || '');
        formData. append('password', payload.password);
        formData. append('employee_code', payload. employee_code. trim());
        
        if (payload. zone !== undefined) {
          formData.append('zone', payload.zone.toString());
        }
        
        formData.append('profile_image', payload. profile_image);

        console.log('📤 Sending multipart/form-data request');
        return await this.createWorkerWithImage(formData);
      }

      const requestData:  any = {
        name: payload.name. trim(),
        email: payload.email. trim().toLowerCase(),
        phone: payload. phone?.trim() || '',
        password:  payload.password,
        employee_code:  payload.employee_code.trim(),
      };

      if (payload.zone !== undefined) {
        requestData.zone = payload.zone;
      }

      if (typeof payload.profile_image === 'string' && payload.profile_image) {
        requestData.profile_image = payload.profile_image;
      }

      console.log('📤 Sending JSON request with data:', requestData);
      const response = await apiClient.post('/workers/', requestData);
      console.log('✅ Worker created successfully:', response.data);
      return response. data;

    } catch (error:  any) {
      console.error('❌ Error creating worker:', error. response?.data || error.message);

      const errorData = error.response?.data;
      let errorMessage = 'Failed to create worker';

      if (errorData) {
        if (errorData.email && Array.isArray(errorData.email)) {
          errorMessage = `Email:  ${errorData.email[0]}`;
        } else if (errorData.email) {
          errorMessage = `Email: ${errorData.email}`;
        } else if (errorData.zone && Array.isArray(errorData.zone)) {
          errorMessage = `Zone: ${errorData.zone[0]}`;
        } else if (errorData.error) {
          errorMessage = errorData. error;
        } else if (errorData.message) {
          errorMessage = errorData. message;
        } else if (typeof errorData === 'object') {
          const firstError = Object.entries(errorData)[0];
          if (firstError) {
            const [field, message] = firstError;
            const msg = Array.isArray(message) ? message[0] : message;
            errorMessage = `${field}: ${msg}`;
          }
        }
      }

      const customError = new Error(errorMessage);
      (customError as any).response = error.response;
      throw customError;
    }
  }

  /**
   * Update worker
   */
  async updateWorker(
    id: string | number,
    payload: WorkerUpdatePayload
  ): Promise<WorkerActionResponse> {
    try {
      console.log(`📝 Updating worker #${id}: `, payload);

      if (payload.profile_image instanceof File) {
        const formData = new FormData();
        
        if (payload.name !== undefined) {
          formData.append('name', payload.name.trim());
        }
        if (payload.phone !== undefined) {
          formData.append('phone', payload. phone. trim());
        }
        if (payload.employee_code !== undefined) {
          formData.append('employee_code', payload.employee_code.trim());
        }
        if (payload.zone !== undefined) {
          formData.append('zone', payload. zone.toString());
        }
        
        formData.append('profile_image', payload. profile_image);

        console.log('📤 Sending multipart/form-data update');
        return await this.updateWorkerWithImage(id, formData);
      }

      const requestData: any = {};

      if (payload.name !== undefined) {
        requestData.name = payload. name. trim();
      }
      if (payload.phone !== undefined) {
        requestData.phone = payload. phone.trim();
      }
      if (payload.employee_code !== undefined) {
        requestData. employee_code = payload.employee_code. trim();
      }
      if (payload.zone !== undefined) {
        requestData.zone = payload. zone;
      }
      if (typeof payload.profile_image === 'string') {
        requestData.profile_image = payload.profile_image;
      }

      console.log('📤 Sending JSON update request:', requestData);
      const response = await apiClient.patch(`/workers/${id}/`, requestData);
      console.log('✅ Worker updated successfully:', response.data);
      return response.data;

    } catch (error: any) {
      console. error(`❌ Error updating worker #${id}:`, getErrorMessage(error));
      throw error;
    }
  }

  /**
   * Delete worker
   */
  async deleteWorker(id: string | number): Promise<WorkerActionResponse> {
    try {
      console.log(`🗑️ Deleting worker #${id}`);
      const response = await apiClient.delete(`/workers/${id}/`);
      console.log('✅ Worker deleted successfully');
      return response. data;
    } catch (error) {
      console. error(`❌ Error deleting worker #${id}:`, getErrorMessage(error));
      throw error;
    }
  }

  /**
   * Toggle worker login access (Account.is_active). Separate from online Active/Inactive.
   */
  async toggleStatus(id: string | number): Promise<WorkerActionResponse> {
    try {
      console.log(`🔄 Toggling status for worker #${id}`);
      const response = await apiClient.post(`/workers/${id}/toggle_active/`);
      console.log('✅ Worker status toggled successfully');
      return response.data;
    } catch (error) {
      console. error(`❌ Error toggling worker status #${id}:`, getErrorMessage(error));
      throw error;
    }
  }

  /**
   * Force worker offline (is_tracking=false + end sessions). Admin cannot force Active back.
   */
  async forceInactive(id: string | number): Promise<WorkerActionResponse> {
    try {
      console.log(`⏹️ Forcing worker #${id} inactive`);
      const response = await apiClient.post(`/workers/${id}/force_inactive/`);
      console.log('✅ Worker forced inactive');
      return response.data;
    } catch (error) {
      console.error(`❌ Error forcing worker #${id} inactive:`, getErrorMessage(error));
      throw error;
    }
  }

  /**
   * Get worker statistics
   */
  async getWorkerStats(id: string | number, days: number = 30): Promise<WorkerStatsResponse> {
    try {
      console.log(`📊 Fetching stats for worker #${id}`);
      const response = await apiClient.get(`/workers/${id}/statistics/`, { params: { days } });
      console.log('✅ Worker stats fetched');
      return response. data;
    } catch (error) {
      console.error(`❌ Error fetching worker stats: `, getErrorMessage(error));
      throw error;
    }
  }

  /**
   * Get worker's assigned reports
   */
  async getWorkerReports(
    id: string | number,
    filters?: { status?: string; page?: number; page_size?: number }
  ): Promise<any> {
    try {
      console. log(`📋 Fetching reports for worker #${id}`);
      const response = await apiClient. get(`/workers/${id}/reports/`, { params: filters });
      console.log(`✅ Fetched worker reports`);
      return response.data;
    } catch (error) {
      console.error(`❌ Error fetching worker reports:`, getErrorMessage(error));
      throw error;
    }
  }

  /**
   * Create worker with profile image
   */
  async createWorkerWithImage(formData: FormData): Promise<WorkerActionResponse> {
    try {
      console.log('📷 Creating worker with image.. .');
      
      console.log('📤 FormData contents: ');
      for (const [key, value] of formData.entries()) {
        console.log(`  ${key}:`, value instanceof File ? `File:  ${value.name}` : value);
      }

      const response = await apiClient.post('/workers/', formData, {
        headers:  {
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('✅ Worker created with image:', response.data);
      return response.data;
    } catch (error:  any) {
      console.error('❌ Failed to create worker with image:', error);
      throw error;
    }
  }

  /**
   * Update worker with profile image
   */
  async updateWorkerWithImage(
    workerId: string | number,
    formData: FormData
  ): Promise<WorkerActionResponse> {
    try {
      console.log(`📷 Updating worker ${workerId} with image...`);
      
      console.log('📤 FormData contents:');
      for (const [key, value] of formData.entries()) {
        console. log(`  ${key}:`, value instanceof File ? `File: ${value.name}` : value);
      }

      const response = await apiClient.patch(`/workers/${workerId}/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('✅ Worker updated with image:', response.data);
      return response.data;
    } catch (error: any) {
      console. error('❌ Failed to update worker with image:', error);
      throw error;
    }
  }

  /**
   * Upload profile image separately
   */
  async uploadProfileImage(workerId: string | number, imageFile: File): Promise<any> {
    try {
      console.log(`📷 Uploading profile image for worker ${workerId}...`);
      const formData = new FormData();
      formData.append('profile_image', imageFile);

      const response = await apiClient.post(
        `/workers/${workerId}/upload-image/`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      console.log('✅ Profile image uploaded:', response. data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Failed to upload profile image:', error);
      throw error;
    }
  }

  /**
   * Start GPS tracking
   */
  async startTracking(id: string | number): Promise<WorkerActionResponse> {
    try {
      console.log(`📍 Starting tracking for worker #${id}`);
      const response = await apiClient.post(`/workers/${id}/start_tracking/`);
      console.log('✅ Tracking started');
      return response. data;
    } catch (error) {
      console.error(`❌ Error starting tracking: `, getErrorMessage(error));
      throw error;
    }
  }

  /**
   * Stop GPS tracking
   */
  async stopTracking(id: string | number): Promise<WorkerActionResponse> {
    try {
      console.log(`📍 Stopping tracking for worker #${id}`);
      const response = await apiClient.post(`/workers/${id}/stop_tracking/`);
      console.log('✅ Tracking stopped');
      return response.data;
    } catch (error) {
      console.error(`❌ Error stopping tracking:`, getErrorMessage(error));
      throw error;
    }
  }

  /**
   * Get location history
   */
  async getLocationHistory(
    id:  string | number,
    hours: number = 24
  ): Promise<LocationHistoryResponse> {
    try {
      console.log(`📍 Fetching location history for worker #${id}`);
      const response = await apiClient. get(`/workers/${id}/location_history/`, {
        params: { hours },
      });
      console.log(`✅ Fetched ${response.data. count} locations`);
      return response.data;
    } catch (error) {
      console.error(`❌ Error fetching location history:`, getErrorMessage(error));
      throw error;
    }
  }

  /**
   * Get top performing workers
   */
  async getTopPerformers(limit: number = 10): Promise<WorkersListResponse> {
    try {
      console.log(`🏆 Fetching top ${limit} workers`);
      const response = await apiClient.get('/workers/top_performers/', {
        params: { limit },
      });
      console.log(`✅ Fetched top performers`);
      return response.data;
    } catch (error) {
      console.error(`❌ Error fetching top performers:`, getErrorMessage(error));
      throw error;
    }
  }

  /**
   * Get available workers
   */
  async getAvailableWorkers(maxTasks: number = 3): Promise<WorkersListResponse> {
    try {
      console.log(`📋 Fetching available workers`);
      const response = await apiClient. get('/workers/available/', {
        params: { max_tasks: maxTasks },
      });
      console.log(`✅ Found ${response.data. count} available workers`);
      return response.data;
    } catch (error) {
      console. error(`❌ Error fetching available workers:`, getErrorMessage(error));
      throw error;
    }
  }

  /**
   * Search workers
   */
  async searchWorkers(query: string): Promise<WorkersListResponse> {
    return this.getWorkers({ search: query });
  }

  /**
   * Get active workers only
   */
  async getActiveWorkers(): Promise<WorkersListResponse> {
    return this.getWorkers({ is_active: true });
  }

  /**
   * Get tracking workers
   */
  async getTrackingWorkers(): Promise<WorkersListResponse> {
    return this. getWorkers({ is_tracking: true });
  }

  /**
   * Get workers by zone
   */
  async getWorkersByZone(zoneId: number): Promise<WorkersListResponse> {
    return this.getWorkers({ zone:  zoneId });
  }

  /**
   * Export workers to CSV
   */
  async exportWorkers(filters?: WorkerFilters): Promise<Blob> {
    try {
      console.log('📥 Exporting workers...');
      const response = await apiClient.get('/workers/export/', {
        params: filters,
        responseType: 'blob',
      });
      console.log('✅ Workers exported');
      return response. data;
    } catch (error) {
      console.error('❌ Error exporting workers:', getErrorMessage(error));
      throw error;
    }
  }
}

export default new WorkerService();