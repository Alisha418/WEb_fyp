import { resolveMediaUrl } from '../utils/resolveMediaUrl';

// ============================================
// BACKEND RESPONSE TYPE
// ============================================

export interface BackendWorker {
  worker_id: number;
  employee_code: string;
  total_tasks: number;
  avg_rating: string;
  is_tracking: boolean;
  
  // ✅ Account fields can be returned FLAT
  account_id?:  number;
  name?: string;
  email?: string;
  phone_number?: string;
  phone?:  string;
  profile_image?: string;
  is_active?: boolean;
  created_at?: string;
  
  // ✅ OR nested in account object
  account?:  {
    account_id: number;
    name: string;
    email: string;
    phone_number? :  string;
    profile_image?: string;
    is_active:  boolean;
    created_at?: string;
  };
}

// ============================================
// FRONTEND WORKER TYPE
// ============================================

export interface Worker {
  id: string;
  name: string;
  email: string;
  phone:  string;
  employeeCode:  string;
  image?: string;
  tasksCompleted: number;
  activeTasks:  number;
  avgCompletionTime:  number;
  rating:   number;
  active: boolean;
  isTracking: boolean;
  zone?:  string;
  createdAt?: Date;
}

// ============================================
// MAPPING FUNCTION
// ============================================

/**
 * Map backend worker data to frontend Worker type
 * Handles both flat and nested response structures
 */
export function mapWorkerFromBackend(backendWorker: BackendWorker): Worker {
  try {
    console.log('🔍 Mapping worker:', backendWorker);
    
    // ✅ Handle both flat and nested structures
    const account = backendWorker.account || backendWorker;
    
    // ✅ Get worker_id (primary key)
    const workerId = backendWorker.  worker_id;
    
    // ✅ Validation
    if (!workerId && !account. account_id) {
      console.error('❌ Missing IDs:', backendWorker);
      throw new Error('Worker missing required IDs');
    }

    // ✅ Use worker_id if available, fallback to account_id
    const id = workerId ||  account.account_id || 0;
    
    // ✅ Parse rating safely
    const rating = parseFloat(backendWorker.avg_rating || '0') || 0;

    // ✅ Build worker object
    const worker: Worker = {
      id:  String(id),
      name: account.name || backendWorker.  name || 'Unknown Worker',
      email: account.email || backendWorker.email || 'no-email@example.com',
      phone: account.phone_number || backendWorker.phone_number || backendWorker. phone || '',
      employeeCode:   backendWorker.employee_code || 'N/A',
      image: resolveMediaUrl(account.profile_image || backendWorker.profile_image),
      tasksCompleted:   backendWorker.total_tasks || 0,
      activeTasks: 0, // Can be populated from separate API call
      avgCompletionTime: 0, // Can be populated from statistics API
      rating: Math.min(5, Math.max(0, rating)), // Clamp between 0-5
      // Admin "Active/Inactive" must reflect account activation (login enabled/disabled).
      active: (account.is_active ?? backendWorker.is_active) ?? false,
      isTracking: backendWorker.is_tracking || false,
      zone: 'Unassigned', // Can be set based on logic
      createdAt: account.created_at || backendWorker.created_at 
        ? new Date(account.created_at || backendWorker.created_at!) 
        : undefined
    };
    
    console.log('✅ Mapped worker:', worker);
    return worker;
    
  } catch (error) {
    console.error('❌ Error mapping worker:', error, backendWorker);
    
    // ✅ Return safe fallback to prevent app crash
    return {
      id:    String(
        backendWorker. worker_id || 
        backendWorker.account_id || 
        backendWorker.account?.account_id || 
        Date.now()
      ),
      name: backendWorker. name || backendWorker.account?.name || 'Error Loading Worker',
      email: backendWorker.email || backendWorker.account?. email || 'error@example. com',
      phone: '',
      employeeCode: backendWorker.  employee_code || 'ERROR',
      tasksCompleted: 0,
      activeTasks: 0,
      avgCompletionTime: 0,
      rating: 0,
      active: false,
      isTracking: false,
      zone: 'Unassigned'
    };
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get worker initials from name
 */
export function getWorkerInitials(name?:   string): string {
  if (!name || name.trim() === '') return '?';
  
  return name
    .trim()
    .split(' ')
    .filter(n => n. length > 0)
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2) || '?';
}

/**
 * Format phone number to (XXX) XXX-XXXX
 */
export function formatPhoneNumber(phone?: string): string {
  if (!phone || phone.trim() === '') return 'N/A';
  
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Format based on length
  if (cleaned. length === 10) {
    return `(${cleaned.substring(0, 3)}) ${cleaned.substring(3, 6)}-${cleaned.substring(6)}`;
  }
  
  if (cleaned.length === 11 && cleaned[0] === '1') {
    return `+1 (${cleaned.substring(1, 4)}) ${cleaned.substring(4, 7)}-${cleaned.substring(7)}`;
  }
  
  // Return as-is if not standard format
  return phone;
}

/**
 * Get status badge colors
 */
export function getStatusColor(active: boolean) {
  return active
    ? {
        bg: 'bg-emerald-500/20',
        text: 'text-emerald-400',
        border: 'border-emerald-500/30',
        label: 'Active'
      }
    : {
        bg: 'bg-slate-500/20',
        text: 'text-slate-400',
        border: 'border-slate-500/30',
        label: 'Inactive'
      };
}

/**
 * Get rating color based on value
 */
export function getRatingColor(rating: number): string {
  if (rating >= 4.5) return 'text-emerald-400';
  if (rating >= 3.5) return 'text-yellow-400';
  if (rating >= 2.5) return 'text-orange-400';
  return 'text-red-400';
}

/**
 * Get tracking status badge
 */
export function getTrackingStatus(isTracking: boolean) {
  return isTracking
    ? {
        bg: 'bg-blue-500/20',
        text: 'text-blue-400',
        border: 'border-blue-500/30',
        label: 'Tracking',
        icon: '📍'
      }
    :  {
        bg: 'bg-slate-500/20',
        text: 'text-slate-400',
        border: 'border-slate-500/30',
        label: 'Not Tracking',
        icon: '📍'
      };
}

/**
 * Validate worker data
 */
export function isValidWorker(worker:  Partial<Worker>): boolean {
  return ! !(
    worker.id &&
    worker.name &&
    worker.email &&
    worker.employeeCode
  );
}

/**
 * Sort workers by criteria
 */
export function sortWorkers(
  workers: Worker[],
  criteria: 'name' | 'rating' | 'tasks' | 'employeeCode',
  ascending: boolean = true
): Worker[] {
  const sorted = [...  workers].sort((a, b) => {
    let compareValue = 0;
    
    switch (criteria) {
      case 'name':
        compareValue = a.name.localeCompare(b.name);
        break;
      case 'rating':
        compareValue = a.rating - b.rating;
        break;
      case 'tasks':
        compareValue = a.tasksCompleted - b. tasksCompleted;
        break;
      case 'employeeCode':
        compareValue = a.employeeCode.localeCompare(b.employeeCode);
        break;
    }
    
    return ascending ? compareValue : -compareValue;
  });
  
  return sorted;
}

/**
 * Filter workers by criteria
 */
export function filterWorkers(
  workers: Worker[],
  filters: {
    active?: boolean;
    isTracking?: boolean;
    minRating?: number;
    searchQuery?: string;
  }
): Worker[] {
  return workers.filter(worker => {
    // Active filter
    if (filters.active !== undefined && worker.active !== filters.active) {
      return false;
    }
    
    // Tracking filter
    if (filters.isTracking !== undefined && worker.isTracking !== filters.isTracking) {
      return false;
    }
    
    // Rating filter
    if (filters.minRating !== undefined && worker.rating < filters.minRating) {
      return false;
    }
    
    // Search filter
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      const matchesName = worker.name.toLowerCase().includes(query);
      const matchesEmail = worker.email.toLowerCase().includes(query);
      const matchesCode = worker.employeeCode.toLowerCase().includes(query);
      const matchesPhone = worker.phone.includes(query);
      
      if (!  (matchesName || matchesEmail || matchesCode || matchesPhone)) {
        return false;
      }
    }
    
    return true;
  });
}