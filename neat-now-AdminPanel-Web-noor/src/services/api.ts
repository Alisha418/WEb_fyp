import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

// ============================================
// CONFIGURATION
// ============================================

// Add Vite env type declaration for TypeScript
interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  // add other env variables here if needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Local dev: direct EC2/LAN URL. Vercel (HTTPS): use `/api` — proxied in vercel.json (no mixed-content block).
const getApiBaseUrl = () => {
  const envUrl = (import.meta.env.VITE_API_URL || '').trim();
  if (envUrl) return envUrl;
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') {
    return 'http://127.0.0.1:8000/api';
  }
  if (host.endsWith('.vercel.app')) {
    return '/api';
  }
  return `http://${host}:8000/api`;
};

const API_BASE_URL = getApiBaseUrl();

console.log('🌐 API Base URL:', API_BASE_URL);

// ============================================
// AXIOS INSTANCE
// ============================================

const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
  withCredentials: true, // Set to true if using cookies
});

// ============================================
// TOKEN REFRESH QUEUE
// ============================================

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?:any) => void;
  reject: (reason?:any) => void;
}> = [];

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

// ============================================
// REQUEST INTERCEPTOR
// ============================================

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('access_token');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      
      // Detailed logging for debugging
      console.log(`🔑 Request to ${config.method?.toUpperCase()} ${config.url}`);
      console.log(`   ✓ Token attached (first 30 chars): ${token.substring(0, 30)}...`);
      
      // Log request data for POST/PUT/PATCH
      if (config.data && ['post', 'put', 'patch'].includes(config.method || '')) {
        console.log(`   📦 Request data: `, config.data);
      }
    } else {
      console.warn(`⚠️  No token found for ${config.url}`);
      console.warn(`   This is ${config.url?.includes('login') || config.url?.includes('register') ? 'expected' : 'UNEXPECTED'}! `);
    }

    return config;
  },
  (error) => {
    console.error('❌ Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// ============================================
// RESPONSE INTERCEPTOR
// ============================================

apiClient.interceptors.response.use(
  (response) => {
    console.log(`✅ ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`);
    
    // Log response data for debugging (skip large list payloads)
    if (response.data && !response.config.url?.includes('/reports/')) {
      console.log(`   📥 Response: `, response.data);
    } else if (response.config.url?.includes('/reports/') && response.data && typeof response.data === 'object') {
      const body = response.data as { count?: number; results?: unknown[] };
      const n = body.results?.length ?? 0;
      console.log(`   📥 Reports page: count=${body.count ?? '?'}, rows=${n}`);
    }
    
    return response;
  },
  async (error:  AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Log detailed error information
    console.error(`❌ ${originalRequest?. method?.toUpperCase()} ${originalRequest?.url} - FAILED`);
    console.error(`   Status: ${error.response?.status}`);
    console.error(`   Message: `, error.response?.data || error.message);

    // ============================================
    // HANDLE 401 UNAUTHORIZED - TOKEN REFRESH
    // ============================================

    if (error.response?. status === 401 && originalRequest && !originalRequest._retry) {
      // Don't retry login/register requests
      if (originalRequest.url?. includes('login') || originalRequest.url?.includes('register')) {
        console.log('   ℹ️  Login/Register failed - not retrying');
        return Promise. reject(error);
      }

      // If already refreshing, queue this request
      if (isRefreshing) {
        console.log('   ⏳ Token refresh in progress, queueing request...');
        
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refresh_token');

      if (!refreshToken) {
        console.error('   ❌ No refresh token available');
        isRefreshing = false;
        handleAuthFailure();
        return Promise.reject(error);
      }

      try {
        console.log('   🔄 Refreshing access token...');

        const response = await axios.post(
          `${API_BASE_URL}/token/refresh/`,
          { refresh: refreshToken },
          {
            headers: { 'Content-Type': 'application/json' },
            timeout: 10000,
          }
        );

        const newAccessToken = response.data.access;

        if (! newAccessToken) {
          throw new Error('No access token in refresh response');
        }

        // Store new token
        localStorage.setItem('access_token', newAccessToken);
        console.log('   ✅ Token refreshed successfully');

        // Update authorization header
        originalRequest. headers.Authorization = `Bearer ${newAccessToken}`;

        // Process queued requests
        processQueue(null, newAccessToken);
        isRefreshing = false;

        // Retry original request
        return apiClient(originalRequest);
      } catch (refreshError:  any) {
        console.error('   ❌ Token refresh failed:', refreshError. response?.data || refreshError.message);

        // Process queue with error
        processQueue(refreshError, null);
        isRefreshing = false;

        // Handle auth failure
        handleAuthFailure();

        return Promise.reject(refreshError);
      }
    }

    // ============================================
    // HANDLE OTHER HTTP ERRORS
    // ============================================

    // 403 Forbidden
    if (error.response?.status === 403) {
      console.error('   🚫 Access forbidden');
      // You could show a toast notification here
    }

    // 404 Not Found
    if (error.response?.status === 404) {
      console.error('   🔍 Resource not found');
    }

    // 500 Internal Server Error
    if (error. response?.status === 500) {
      console.error('   ⚠️  Server error');
      // You could show a server error message here
    }

    // Network Error
    if (! error.response) {
      console.error('   🌐 Network error - Check your connection');
      // You could show a network error message here
    }

    return Promise.reject(error);
  }
);

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Handle authentication failure - Clear tokens and redirect to login
 */
function handleAuthFailure() {
  console.log('🚪 Clearing authentication and redirecting to login...');

  // Clear all auth data
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('admin_data');

  // Redirect to login page
  const currentPath = window.location.pathname;
  if (currentPath !== '/' && currentPath !== '/login') {
    // Save the attempted URL to redirect after login
    sessionStorage.setItem('redirect_after_login', currentPath);
  }

  window.location.href = '/';
}

/**
 * Check if error is an authentication error
 */
export function isAuthError(error: any): boolean {
  return error.response?.status === 401 || error.response?.status === 403;
}

/**
 * Extract error message from error response
 */
export function getErrorMessage(error: any): string {
  if (error.response?.data?.message) {
    return error.response.data.message;
  }

  if (error.response?.data?.detail) {
    return error.response.data.detail;
  }

  if (error.response?.data?.errors) {
    // Handle Django validation errors
    const errors = error.response.data.errors;
    const firstError = Object.values(errors)[0];
    return Array.isArray(firstError) ? firstError[0] : String(firstError);
  }

  if (error.message) {
    return error.message;
  }

  return 'An unexpected error occurred';
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  const token = localStorage.getItem('access_token');
  const adminData = localStorage.getItem('admin_data');
  return !!(token && adminData);
}

/**
 * Get current auth token
 */
export function getAuthToken(): string | null {
  return localStorage.getItem('access_token');
}

/**
 * Manually set auth token (useful for testing)
 */
export function setAuthToken(token: string): void {
  localStorage.setItem('access_token', token);
}

/**
 * Clear all auth data
 */
export function clearAuthData(): void {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('admin_data');
}

// ============================================
// EXPORT
// ============================================

export default apiClient;

// Export types for use in other files
export type { AxiosError, AxiosInstance };