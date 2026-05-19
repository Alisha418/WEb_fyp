import React, { useState, useEffect } from 'react';
import { 
  UserPlus, 
  Search, 
  Edit, 
  Trash2, 
  Eye, 
  ToggleLeft, 
  ToggleRight, 
  ClipboardList, 
  Star, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  X, 
  Loader2,
  Power
} from 'lucide-react';
import ReactDOM from 'react-dom';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import workerService from '../services/workerService';
import { removeLiveWorkerFromMap } from '../services/firebaseLiveTracking';
import { getErrorMessage } from '../services/api';
import type { Worker } from '../types/worker';
import { 
  mapWorkerFromBackend, 
  getWorkerInitials, 
  formatPhoneNumber 
} from '../types/worker';
import { WorkerModal } from '../components/WorkerModal'; // ✅ Import your modal

interface WorkersProps {
  onViewProfile: (workerId: string) => void;
  onEdit: (worker: Worker) => void;
  onDelete: (workerId: string) => void;
  onToggleStatus: (workerId: string) => void;
  onAddNew: () => void;
  onCreateTask: (workerId: string) => void;
  sortByRating?:  boolean;
}

// ============================================
// PORTAL COMPONENT
// ============================================
function Portal({ children }: { children?: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted || !children) return null;

  return ReactDOM.createPortal(children, document.body);
}

// ============================================
// TOAST COMPONENT
// ============================================
type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  description?: string;
}

function ToastNotification({ 
  toast, 
  onClose 
}: { 
  toast: Toast; 
  onClose: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const icons = {
    success: <CheckCircle className="w-5 h-5" />,
    error: <XCircle className="w-5 h-5" />,
    warning: <AlertCircle className="w-5 h-5" />,
    info: <AlertCircle className="w-5 h-5" />
  };

  const styles = {
    success: 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400',
    error: 'bg-red-500/20 border-red-500/50 text-red-400',
    warning: 'bg-amber-500/20 border-amber-500/50 text-amber-400',
    info: 'bg-blue-500/20 border-blue-500/50 text-blue-400'
  };

  return (
    <div className={`${styles[toast.type]} border rounded-xl p-4 shadow-2xl backdrop-blur-sm animate-slide-in-right flex items-start gap-3 min-w-[320px] max-w-md`}>
      <div className="flex-shrink-0 mt-0.5">
        {icons[toast.type]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm">{toast.message}</p>
        {toast.description && (
          <p className="text-sm opacity-90 mt-1">{toast. description}</p>
        )}
      </div>
      <button
        onClick={onClose}
        className="flex-shrink-0 p-1 hover:bg-white/10 rounded-lg transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// ============================================
// CONFIRMATION DIALOG
// ============================================
interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmText?:  string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmDialog({ 
  title, 
  message, 
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'warning',
  loading = false,
  onConfirm, 
  onCancel 
}: ConfirmDialogProps) {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style. overflow = 'unset';
    };
  }, []);

  const styles = {
    danger: {
      icon: <Trash2 className="w-12 h-12 text-red-500" />,
      button: 'bg-red-500 hover:bg-red-600',
      iconBg: 'bg-red-500/10'
    },
    warning: {
      icon: <AlertCircle className="w-12 h-12 text-amber-500" />,
      button: 'bg-amber-500 hover: bg-amber-600',
      iconBg: 'bg-amber-500/10'
    },
    info: {
      icon: <AlertCircle className="w-12 h-12 text-blue-500" />,
      button:  'bg-blue-500 hover:bg-blue-600',
      iconBg: 'bg-blue-500/10'
    }
  };

  return (
    <Portal>
      <div 
        className="fixed inset-0 flex items-center justify-center p-4"
        style={{ 
          zIndex: 99999,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(8px)'
        }}
        onClick={! loading ?  onCancel : undefined}
      >
        <div 
          className="bg-slate-900 border-2 border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-scale-in"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex flex-col items-center text-center">
            <div className={`mb-4 p-4 rounded-full ${styles[type].iconBg}`}>
              {styles[type].icon}
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">{title}</h3>
            <p className="text-slate-300 text-sm mb-6 leading-relaxed">{message}</p>
            <div className="flex gap-3 w-full">
              <button
                onClick={onCancel}
                disabled={loading}
                className="flex-1 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl transition-all border-2 border-slate-700 hover:border-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {cancelText}
              </button>
              <button
                onClick={onConfirm}
                disabled={loading}
                className={`flex-1 px-6 py-3 ${styles[type].button} text-white font-semibold rounded-xl transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  confirmText
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
}

// ============================================
// SUCCESS DIALOG
// ============================================
interface SuccessDialogProps {
  title: string;
  message: string;
  onClose: () => void;
}

function SuccessDialog({ title, message, onClose }: SuccessDialogProps) {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const timer = setTimeout(onClose, 3000);
    return () => {
      clearTimeout(timer);
      document.body.style.overflow = 'unset';
    };
  }, [onClose]);

  return (
    <Portal>
      <div 
        className="fixed inset-0 flex items-center justify-center p-4"
        style={{ 
          zIndex: 99999,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(8px)'
        }}
        onClick={onClose}
      >
        <div 
          className="bg-slate-900 border-2 border-emerald-500/50 rounded-2xl max-w-md w-full p-8 shadow-2xl animate-scale-in"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 p-5 rounded-full bg-emerald-500/20 ring-4 ring-emerald-500/30">
              <CheckCircle className="w-20 h-20 text-emerald-400" />
            </div>
            <h3 className="text-3xl font-bold text-white mb-3">{title}</h3>
            <p className="text-slate-300 text-base mb-6 leading-relaxed">{message}</p>
            <button
              onClick={onClose}
              className="px-8 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold rounded-xl transition-all shadow-lg hover:shadow-emerald-500/50 transform hover:scale-105"
            >
              Got it! 
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}

// ============================================
// MAIN WORKERS COMPONENT
// ============================================
export function Workers({
  onViewProfile,
  onEdit,
  onDelete,
  onToggleStatus,
  onAddNew,
  onCreateTask,
  sortByRating = false
}: WorkersProps) {
  // State
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [zoneFilter, setZoneFilter] = useState<string>('all');

  // Toast State
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Dialog States
  const [confirmDialog, setConfirmDialog] = useState<{
    show: boolean;
    title: string;
    message: string;
    confirmText?: string;
    type: 'danger' | 'warning' | 'info';
    loading: boolean;
    onConfirm: () => void;
  } | null>(null);

  const [successDialog, setSuccessDialog] = useState<{
    show: boolean;
    title: string;
    message: string;
  } | null>(null);

  // ✅ Worker Modal State
  const [showWorkerModal, setShowWorkerModal] = useState(false);
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);

  // Toast Functions
  const addToast = (type: ToastType, message:  string, description?: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, type, message, description }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const showSuccess = (message: string, description?:  string) => {
    addToast('success', message, description);
  };

  const showError = (message: string, description?: string) => {
    addToast('error', message, description);
  };

  // Fetch Workers
  const fetchWorkers = async (showRefreshIndicator = false) => {
    try {
      if (showRefreshIndicator) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError('');

      const response = await workerService.getWorkers({
        // "Active/Inactive" filter follows current online/tracking status.
        is_tracking: statusFilter === 'all' ? undefined : statusFilter === 'active',
        ordering: sortByRating ? '-avg_rating' : 'worker_id__name',
        search: searchQuery || undefined
      });

      const mappedWorkers:  Worker[] = [];
      
      if (response.results && Array.isArray(response.results)) {
        for (const backendWorker of response.results) {
          try {
            const mapped = mapWorkerFromBackend(backendWorker);
            mappedWorkers.push(mapped);
          } catch (mapError) {
            console.error('❌ Failed to map worker:', mapError, backendWorker);
          }
        }
      }
      
      setWorkers(mappedWorkers);

      if (showRefreshIndicator) {
        showSuccess('Workers Refreshed', `Loaded ${mappedWorkers. length} workers`);
      }
      
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      showError('Failed to Load Workers', errorMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchWorkers();
  }, []);

  // ✅ EXPOSE REFRESH FUNCTION
  useEffect(() => {
    (window as any).refreshWorkersList = () => {
      console.log('🔄 Refreshing workers list.. .');
      fetchWorkers(false);
    };
    
    return () => {
      delete (window as any).refreshWorkersList;
    };
  }, [statusFilter, searchQuery, sortByRating]);

  // Refresh on filter change
  useEffect(() => {
    if (! loading) {
      const timer = setTimeout(() => {
        fetchWorkers(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [searchQuery, statusFilter, sortByRating]);

  // ✅ Handle Add New Worker
  const handleAddNew = () => {
    setEditingWorker(null);
    setShowWorkerModal(true);
  };

  // ✅ Handle Edit Worker
  const handleEdit = (worker: Worker) => {
    setEditingWorker(worker);
    setShowWorkerModal(true);
  };

  // ✅ Handle Save Worker
  const handleSaveWorker = async (workerData:  Partial<Worker> & { password?: string; profileImage?: File }) => {
    try {
      if (editingWorker) {
        // Update existing worker
        const updatePayload:  any = {
          name: workerData.name,
          phone:  workerData.phone || '',
        };

        if (workerData.profileImage instanceof File) {
          updatePayload.profile_image = workerData.profileImage;
        }
        
        await workerService.updateWorker(editingWorker.id, updatePayload);
      } else {
        // Create new worker
        const employeeCode = `WRK${Date.now().toString().slice(-6)}`;
        
        const createPayload: any = {
          name: workerData.name! ,
          email: workerData.email! ,
          phone: workerData.phone || '',
          password: workerData.password || 'ChangeMe123! ',
          employee_code: employeeCode,
        };

        if (workerData.profileImage instanceof File) {
          createPayload.profile_image = workerData.profileImage;
        }
        
        await workerService. createWorker(createPayload);
      }
      
      // Modal will auto-close and refresh via WorkerModal's handleCloseWithRefresh
      
    } catch (error:  any) {
      console.error('❌ Failed to save worker:', error);
      throw error; // Let WorkerModal handle the error display
    }
  };

  // Force offline when worker forgot to log out (does not change login access toggle).
  const handleForceInactive = async (workerId: string) => {
    const worker = workers.find(w => w.id === workerId);
    if (!worker || !worker.isTracking) return;

    setConfirmDialog({
      show: true,
      title: 'Force Inactive?',
      message:
        `${worker.name} will be signed out and tracking will stop. ` +
        'They must log in again to become Active.',
      confirmText: 'Yes, Force Inactive',
      type: 'warning',
      loading: false,
      onConfirm: async () => {
        setConfirmDialog(prev => (prev ? { ...prev, loading: true } : null));

        try {
          const result = await workerService.forceInactive(workerId);
          await removeLiveWorkerFromMap(workerId);
          await fetchWorkers(true);

          setConfirmDialog(null);

          setSuccessDialog({
            show: true,
            title: 'Worker Forced Inactive',
            message:
              result?.message ||
              `${worker.name} is now inactive. They must log in again to go online.`,
          });
        } catch (err) {
          setConfirmDialog(null);
          showError('Failed to Force Inactive', getErrorMessage(err));
        }
      },
    });
  };

  // Handle Toggle Status (login access — separate from Active/Inactive online status)
  const handleToggleStatus = async (workerId: string) => {
    const worker = workers.find(w => w.id === workerId);
    if (! worker) return;
    const actionLabel = worker.active ? 'Deactivate Login Access' : 'Activate Login Access';
    const actionLabelLower = actionLabel.toLowerCase();

    setConfirmDialog({
      show: true,
      title: `${actionLabel}?`,
      message: worker.active
        ? `This will disable login for ${worker.name}.`
        : `This will enable login for ${worker.name}.`,
      confirmText: `Yes, ${actionLabel}`,
      type: 'warning',
      loading: false,
      onConfirm: async () => {
        setConfirmDialog(prev => prev ?  { ...prev, loading: true } : null);
        
        try {
          const result = await workerService.toggleStatus(workerId);
          await fetchWorkers(true);

          setConfirmDialog(null);
          
          setSuccessDialog({
            show: true,
            title: 'Login Access Updated!',
            message: result?.message || `Worker ${actionLabelLower} successfully.`
          });
        } catch (err) {
          setConfirmDialog(null);
          showError('Failed to Update Status', getErrorMessage(err));
        }
      }
    });
  };

  // Handle Delete
  const handleDelete = async (workerId: string) => {
    const worker = workers.find(w => w.id === workerId);
    if (!worker) return;

    setConfirmDialog({
      show: true,
      title:  'Delete Worker?',
      message: `Are you sure you want to permanently delete ${worker.name}?  This will also delete their account and all associated data.  This action cannot be undone.`,
      type: 'danger',
      loading: false,
      onConfirm: async () => {
        setConfirmDialog(prev => prev ? { ...prev, loading: true } : null);
        
        try {
          await workerService.deleteWorker(workerId);
          
          setWorkers(prev => prev.filter(w => w.id !== workerId));
          
          setConfirmDialog(null);
          
          setSuccessDialog({
            show:  true,
            title: 'Worker Deleted!',
            message: `${worker.name} has been permanently removed from the system`
          });
        } catch (err) {
          setConfirmDialog(null);
          showError('Failed to Delete Worker', getErrorMessage(err));
        }
      }
    });
  };

  // Filtering & Sorting
  const zones = Array.from(new Set(workers.map(w => w.zone).filter(z => z && z !== 'Unassigned')));
  if (zones.length === 0) {
    zones.push('North Zone', 'South Zone', 'East Zone', 'West Zone', 'Central Zone');
  }

  const filteredWorkers = workers.filter(worker => {
    const matchesSearch = 
      worker.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      worker.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (worker.zone || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = 
      statusFilter === 'all' || 
      (statusFilter === 'active' && worker.isTracking) ||
      (statusFilter === 'inactive' && !worker.isTracking);
    
    const matchesZone = zoneFilter === 'all' || worker.zone === zoneFilter;
    
    return matchesSearch && matchesStatus && matchesZone;
  });

  const sortedWorkers = sortByRating 
    ? [... filteredWorkers].sort((a, b) => b.rating - a.rating)
    : filteredWorkers;

  // Loading State
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Loading workers...</p>
        </div>
      </div>
    );
  }

  // Error State
  if (error && workers.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-xl text-white mb-2">Failed to Load Workers</h2>
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => fetchWorkers()}
            className="px-6 py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Toast Container */}
      <Portal>
        <div 
          className="fixed top-4 right-4 flex flex-col gap-3 pointer-events-none"
          style={{ zIndex: 99998 }}
        >
          {toasts.map(toast => (
            <div key={toast.id} className="pointer-events-auto">
              <ToastNotification
                toast={toast}
                onClose={() => removeToast(toast.id)}
              />
            </div>
          ))}
        </div>
      </Portal>

      {/* Confirmation Dialog */}
      {confirmDialog && confirmDialog.show && (
        <ConfirmDialog
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmText={confirmDialog.confirmText || (confirmDialog.type === 'danger' ? 'Yes, Delete' : 'Yes, Continue')}
          cancelText="Cancel"
          type={confirmDialog.type}
          loading={confirmDialog.loading}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(null)}
        />
      )}

      {/* Success Dialog */}
      {successDialog && successDialog.show && (
        <SuccessDialog
          title={successDialog. title}
          message={successDialog.message}
          onClose={() => setSuccessDialog(null)}
        />
      )}

      {/* ✅ Worker Modal */}
      {showWorkerModal && (
        <WorkerModal
          worker={editingWorker}
          onClose={() => {
            setShowWorkerModal(false);
            setEditingWorker(null);
          }}
          onSave={handleSaveWorker}
        />
      )}

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl text-white mb-2">Worker Management</h1>
            <p className="text-slate-400">Manage your cleanup workforce</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchWorkers(true)}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-3 bg-slate-800 text-white rounded-xl hover:bg-slate-700 transition-all disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={handleAddNew}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl hover:shadow-xl hover:shadow-emerald-500/30 transition-all duration-300 transform hover:scale-[1.02]"
            >
              <UserPlus className="w-5 h-5" />
              Add New Worker
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-6">
            <p className="text-sm text-slate-400 mb-2">Total Workers</p>
            <p className="text-3xl text-white">{workers.length}</p>
          </div>
          <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-6">
            <p className="text-sm text-slate-400 mb-2">Active Workers</p>
            <p className="text-3xl text-emerald-500">{workers.filter(w => w.isTracking).length}</p>
          </div>
          <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-6">
            <p className="text-sm text-slate-400 mb-2">Inactive Workers</p>
            <p className="text-3xl text-slate-500">{workers.filter(w => !w.isTracking).length}</p>
          </div>
          <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-6">
            <p className="text-sm text-slate-400 mb-2">Avg Rating</p>
            <div className="flex items-center gap-2">
              <p className="text-3xl text-white">
                {workers.length > 0 ? (workers.reduce((acc, w) => acc + w.rating, 0) / workers.length).toFixed(1) : '0.0'}
              </p>
              <Star className="w-6 h-6 text-yellow-500 fill-yellow-500" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search workers by name, email, or zone..."
                className="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus: border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
              />
            </div>

            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e. target.value as any)}
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 appearance-none cursor-pointer"
              >
                <option value="all">All Status</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>
            </div>

            <div>
              <select
                value={zoneFilter}
                onChange={(e) => setZoneFilter(e.target.value)}
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus: ring-emerald-500/20 appearance-none cursor-pointer"
              >
                <option value="all">All Zones</option>
                {zones.map(zone => (
                  <option key={zone} value={zone}>{zone}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Workers Table */}
        <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-800/50 border-b border-slate-700">
                <tr>
                  <th className="px-6 py-4 text-left text-xs text-slate-400 uppercase tracking-wider">Worker</th>
                  <th className="px-6 py-4 text-left text-xs text-slate-400 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-4 text-left text-xs text-slate-400 uppercase tracking-wider">Zone</th>
                  <th className="px-6 py-4 text-left text-xs text-slate-400 uppercase tracking-wider">Rating</th>
                  <th className="px-6 py-4 text-left text-xs text-slate-400 uppercase tracking-wider">Tasks</th>
                  <th className="px-6 py-4 text-left text-xs text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs text-slate-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {sortedWorkers.map((worker) => (
                  <tr key={worker.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 flex-shrink-0 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center overflow-hidden">
                          {worker.image ? (
                            <ImageWithFallback
                              src={worker.image}
                              alt={worker.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-white text-sm font-semibold">
                              {getWorkerInitials(worker.name)}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="text-white font-medium">{worker.name}</p>
                          <p className="text-xs text-slate-400">{worker.employeeCode || worker.id}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm text-slate-300">{worker.email}</p>
                        <p className="text-xs text-slate-500">{formatPhoneNumber(worker.phone) || 'No phone'}</p>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span className="px-3 py-1 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-300">
                        {worker.zone || 'Unassigned'}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${
                                i < Math.floor(worker.rating)
                                  ? 'text-yellow-500 fill-yellow-500'
                                  : 'text-slate-600'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-sm text-slate-300">{worker.rating. toFixed(1)}</span>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div>
                        <p className="text-white font-medium">{worker.tasksCompleted}</p>
                        {worker.avgCompletionTime ? (
                          <p className="text-xs text-slate-500">{worker.avgCompletionTime}h avg</p>
                        ) : null}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-2 items-start">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs border ${
                            worker.isTracking
                              ? 'bg-green-500/20 text-green-500 border-green-500/30'
                              : 'bg-red-500/20 text-red-500 border-red-500/30'
                          }`}
                        >
                          {worker.isTracking ? 'Active' : 'Inactive'}
                        </span>
                        {worker.isTracking && (
                          <button
                            type="button"
                            onClick={() => handleForceInactive(worker.id)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-lg hover:bg-amber-500/20 transition-colors"
                            title="Force inactive (forgot logout)"
                          >
                            <Power className="w-3.5 h-3.5" />
                            Force Inactive
                          </button>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onViewProfile(worker. id)}
                          className="p-2 text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-all"
                          title="View Profile"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onCreateTask(worker.id)}
                          className="p-2 text-blue-500 hover:bg-blue-500/10 rounded-lg transition-all"
                          title="Create Task"
                        >
                          <ClipboardList className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(worker)}
                          className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-all"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(worker.id)}
                          className={`p-2 rounded-lg transition-all ${
                            worker.active
                              ?  'text-green-500 hover:bg-green-500/10'
                              : 'text-red-500 hover:bg-red-500/10'
                          }`}
                          title={worker.active ? 'Deactivate Login Access' : 'Activate Login Access'}
                        >
                          {worker.active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => handleDelete(worker.id)}
                          className="p-2 text-red-500 hover: bg-red-500/10 rounded-lg transition-all"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {sortedWorkers.length === 0 && (
              <div className="text-center py-12">
                <p className="text-slate-400">No workers found matching your filters.</p>
              </div>
            )}
          </div>
        </div>

        {/* Results Summary */}
        <div className="text-center text-sm text-slate-400">
          Showing {sortedWorkers.length} of {workers.length} workers
        </div>
      </div>

      {/* Animations */}
      <style>{`
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform:  translateX(100%);
          }
          to {
            opacity: 1;
            transform:  translateX(0);
          }
        }
        
        @keyframes scaleIn {
          from { 
            opacity: 0; 
            transform: scale(0.85) translateY(20px);
          }
          to { 
            opacity: 1; 
            transform: scale(1) translateY(0);
          }
        }
        
        . animate-slide-in-right {
          animation: slideInRight 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .animate-scale-in {
          animation: scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
      `}</style>
    </>
  );
}