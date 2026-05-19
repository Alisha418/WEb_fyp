// Backend Response Type - LIST VIEW (flat structure)
export interface BackendWorkerList {
  worker_id: number;
  employee_code: string;
  total_tasks: number;
  avg_rating: string;
  is_tracking: boolean;
  created_at: string;
  updated_at: string;
  account_id: number;
  name: string;
  email: string;
  phone_number:  string;
  profile_image:  string | null;  // ✅ Can be null or URL string
  is_active: boolean;
}

// Backend Response Type - DETAIL VIEW (nested structure)
export interface BackendWorkerDetail {
  worker_id: number;
  employee_code: string;
  total_tasks: number;
  avg_rating: string;
  is_tracking: boolean;
  created_at: string;
  updated_at: string;
  account: {
    account_id: number;
    name: string;
    email: string;
    phone_number: string;
    profile_image: string | null;  // ✅ Can be null or URL string
    is_active: boolean;
    created_at: string;
  };
  current_assignments?:  number;
  monthly_performance?: {
    resolved_count: number;
    avg_rating: number;
  };
  lifetime_avg_rating?: number;
}

// Unified Backend Worker Type (handles both structures)
export interface BackendWorker {
  worker_id: number;
  employee_code: string;
  total_tasks: number;
  avg_rating: string;
  is_tracking: boolean;
  account?: {
    account_id: number;
    name: string;
    email:  string;
    phone_number?:  string;
    profile_image?:  string | null;
    is_active:  boolean;
  };
  // Flat fields (from list view)
  account_id?: number;
  name?: string;
  email?: string;
  phone_number?: string;
  profile_image?: string | null;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

// Frontend Worker Type
export interface Worker {
  id: string;
  name: string;
  email: string;
  phone?: string;
  employeeCode: string;
  image?: string | null;  // ✅ Can be undefined or null or URL string
  tasksCompleted: number;
  activeTasks?: number;
  avgCompletionTime?: number;
  rating: number;
  active: boolean;
  isTracking: boolean;
  zone?:  string;
}

// ✅ IMPROVED Mapping Function with Image URL Handling
export function mapWorkerFromBackend(backendWorker:  BackendWorker): Worker {
  try {
    // Handle both nested and flat account structures
    const account = backendWorker.account || backendWorker;
    
    // Safely get account_id
    const accountId = account.account_id || backendWorker.worker_id;
    
    if (!accountId) {
      console.error('❌ Missing account_id for worker:', backendWorker);
      throw new Error('Worker missing account_id');
    }

    // ✅ Handle profile_image properly
    let imageUrl: string | null = null;
    const profileImage = account.profile_image;
    
    if (profileImage && typeof profileImage === 'string' && profileImage.trim() !== '') {
      // If it's already a full URL, use it
      if (profileImage.startsWith('http://') || profileImage.startsWith('https://')) {
        imageUrl = profileImage;
      } 
      // If it's a relative path, build the full URL
      else if (profileImage.startsWith('/media/')) {
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const baseUrl = import.meta.env.VITE_API_URL || (isLocalhost ? 'http://127.0.0.1:8000' : `http://${window.location.hostname}:8000`);
        imageUrl = `${baseUrl}${profileImage}`;
      }
      // If it's just a filename, assume it's in /media/profiles/
      else {
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const baseUrl = import.meta.env.VITE_API_URL || (isLocalhost ? 'http://127.0.0.1:8000' : `http://${window.location.hostname}:8000`);
        imageUrl = `${baseUrl}/media/profiles/${profileImage}`;
      }
    }

    return {
      id: accountId. toString(),
      name: account. name || 'Unknown Worker',
      email: account.email || 'no-email@example.com',
      phone: account.phone_number || '',
      employeeCode: backendWorker.employee_code || '',
      image:  imageUrl,  // ✅ Properly formatted URL or null
      tasksCompleted:  backendWorker.total_tasks || 0,
      activeTasks: 0,
      avgCompletionTime:  0,
      rating: parseFloat(backendWorker.avg_rating || '0'),
      active: account.is_active ??  true,
      isTracking:  backendWorker.is_tracking || false,
      zone: 'Unassigned'
    };
  } catch (error) {
    console.error('❌ Error mapping worker:', error, backendWorker);
    // Return a safe default worker
    return {
      id:  String(backendWorker.worker_id || Date.now()),
      name: 'Error Loading Worker',
      email: 'error@example.com',
      employeeCode: backendWorker. employee_code || 'ERROR',
      tasksCompleted: 0,
      rating: 0,
      active: false,
      isTracking: false,
    };
  }
}

// Helper functions
export function getWorkerInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2) || '??';
}

export function formatPhoneNumber(phone?: string): string {
  if (!phone) return 'N/A';
  
  // Remove all non-digit characters
  const cleaned = phone. replace(/\D/g, '');
  
  // Format as (XXX) XXX-XXXX
  if (cleaned. length === 10) {
    return `(${cleaned.substring(0, 3)}) ${cleaned.substring(3, 6)}-${cleaned.substring(6)}`;
  }
  
  return phone;
}

export function getStatusColor(active: boolean) {
  return active
    ?  {
        bg: 'bg-emerald-500/20',
        text: 'text-emerald-400',
        border: 'border-emerald-500/30'
      }
    : {
        bg: 'bg-slate-500/20',
        text: 'text-slate-400',
        border: 'border-slate-500/30'
      };
}