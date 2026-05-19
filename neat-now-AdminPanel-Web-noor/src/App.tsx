import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FileText, 
  Map, 
  Users, 
  LogOut, 
  Bell, 
  Activity
} from 'lucide-react';
import { Workers } from './pages/Workers';
import { WorkerProfileContainer } from './pages/WorkerProfileContainer';
import { Notifications } from './pages/Notifications';
import { WorkerModal } from './components/WorkerModal';
import { CreateTaskModal } from './components/CreateTaskModal';
import { DashboardView } from './pages/DashboardView';
import { ReportsView } from './pages/ReportsView';
import { MapView } from './pages/MapView';
import { ReportDetailModal } from './components/ReportDetailModal';
import { CitizensModal } from './components/CitizensModal';
import { WorkersLeaderboardModal } from './components/WorkersLeaderboardModal';
import { generateMockReports, generateMockWorkers } from './data/mockData';
import { Report, User, Activity as ActivityType, ReportStatus, WasteType } from './types';

// ✨ Import services
import authService from './services/authService';
import reportService from './services/reportService';
import workerService from './services/workerService';
import dashboardService from './services/dashboardService';
import {
  buildAdminStatusDistribution,
  countAwaitingAcceptReports,
  countPendingWorkloadReports,
  countUnassignedReports,
  isUnassignedReport,
} from './utils/dashboardStats';
import notificationService from './services/notificationService';

// ✅ Fixed imports
import type { Worker } from './types/worker';
import { mapWorkerFromBackend } from './types/worker';

// ✅ Tab type (without notifications - it's shown via bell icon)
type TabType = 'dashboard' | 'reports' | 'map' | 'workers';

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [reports, setReports] = useState<Report[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [activities, setActivities] = useState<ActivityType[]>([]);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  /** Bumped after report assign/status change so Reports tab refetches without manual refresh. */
  const [reportsListRefreshKey, setReportsListRefreshKey] = useState(0);
  const [showWorkerModal, setShowWorkerModal] = useState(false);
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [taskWorkerId, setTaskWorkerId] = useState<string | null>(null);
  const [showCitizensModal, setShowCitizensModal] = useState(false);
  const [showWorkersLeaderboardModal, setShowWorkersLeaderboardModal] = useState(false);
  const [sortWorkersByRating, setSortWorkersByRating] = useState(false);
  
  // ✨ Add loading states
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  
  // ✅ Notifications state
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<ReportStatus | 'All'>('All');
  const [workerFilter, setWorkerFilter] = useState<string>('All');
  const [zoneFilter, setZoneFilter] = useState<string>('All');
  const [wasteTypeFilter, setWasteTypeFilter] = useState<WasteType | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end:  '' });
  
  // ✅ Fetch unread notifications count
  const fetchUnreadCount = async () => {
    try {
      const count = await notificationService.getUnreadCount();
      setUnreadNotificationsCount(count);
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  };
  
  // ✨ Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      console.log('🔐 Checking authentication...');
      
      if (!authService.isAuthenticated()) {
        console.log('❌ No token found');
        
        // Redirect to login if not on a public page
        const publicPages = ['/login', '/reset-password'];
        if (!publicPages.includes(location.pathname)) {
          navigate('/login');
        }
        
        setLoading(false);
        return;
      }

      try {
        console.log('✅ Token found, fetching profile...');
        const adminData = await authService.getProfile();
        
        console.log('✅ Profile fetched:', adminData);
        setCurrentUser({
          id: adminData.admin_id?.toString() || '0',
          name: adminData.name,
          role: 'Admin',
          email: adminData.email
        });
        
        await loadInitialData();
      } catch (error) {
        console.error('❌ Auth check failed:', error);
        authService.logout();
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  // ✅ FIXED: Load workers function
  const loadWorkers = async () => {
    try {
      console.log('👷 Loading workers...');
      const workersResponse = await workerService.getWorkers();
      
      if (workersResponse. results && Array.isArray(workersResponse.results)) {
        console.log('🔍 RAW BACKEND WORKERS:', workersResponse.results);
        
        const workersData:  Worker[] = [];
        for (const backendWorker of workersResponse.results) {
          try {
            const mapped = mapWorkerFromBackend(backendWorker);
            workersData.push(mapped);
          } catch (mapError) {
            console.error('❌ Failed to map worker:', mapError, backendWorker);
          }
        }
        
        console.log(`✅ Loaded ${workersData.length} workers`);
        setWorkers(workersData);
        return workersData;
      } else {
        console.warn('⚠️ Using mock workers data');
        const mockWorkers = generateMockWorkers();
        return mockWorkers;
      }
    } catch (error) {
      console.error('❌ Failed to load workers:', error);
      const mockWorkers = generateMockWorkers();
      return mockWorkers;
    }
  };

  // ✨ Load initial data from backend
  const loadInitialData = async () => {
    setDataLoading(true);
    console.log('📊 Loading initial data...');
    
    try {
      // Load workers
      await loadWorkers();

      // ✅ Load unread notifications count
      await fetchUnreadCount();

      // Reports tab & Map load their own data — avoid fetching every report on login (slow/timeouts).
      setReports([]);

      // Load activities
      try {
        console.log('📜 Fetching activities...');
        const activitiesData = await dashboardService.getActivities(7, 7);
        
        if (activitiesData.success && activitiesData.data && activitiesData.data.length > 0) {
          const mappedActivities = activitiesData.data.map((act: any) => ({
            id: String(act.id || act.log_id),
            type: act.type || 'in_progress',
            message: act.message || act.description || '',
            timestamp: new Date(act.timestamp || act.created_at),
            reportId: act.target_id ? String(act.target_id) : undefined,
            dateLabel: act.date_label,
            date: act.date,
            workers: Array.isArray(act.workers)
              ? act.workers.map((w: any) => ({
                  workerId: String(w.worker_id ?? w.workerId ?? ''),
                  workerName: w.worker_name ?? w.workerName ?? 'Worker',
                  taskCount: Number(w.task_count ?? w.taskCount ?? 0),
                }))
              : undefined,
          }));
          setActivities(mappedActivities);
          console.log(`✅ Loaded ${mappedActivities. length} activities`);
        } else {
          setActivities([]);
        }
      } catch (error) {
        console.error('❌ Failed to load activities:', error);
        const recentActivities:  ActivityType[] = [].slice(0, 8).map((r: Report, i: number) => ({
          id: `ACT-${i}`,
          type: r. status === 'Resolved' ? 'resolved' : r. status === 'Assigned' ? 'assigned' : 'new_report',
          message: r. status === 'Resolved' 
            ? `Report ${r.id} resolved${r.workerName ? ` by ${r.workerName}` : ''}` 
            : r.status === 'Assigned'
            ? `Report ${r.id} assigned${r.workerName ? ` to ${r.workerName}` : ''}`
            : `New report ${r. id} submitted`,
          timestamp: r. submittedAt,
          reportId:  r.id
        }));
        setActivities([]);
      }
      
      console.log('✅ Initial data loaded successfully');
    } catch (error) {
      console.error('❌ Failed to load initial data:', error);
      setReports(generateMockReports());
    } finally {
      setDataLoading(false);
    }
  };

  // ✨ Refresh data periodically
  useEffect(() => {
    if (! currentUser) return;

    console.log('⏰ Setting up data refresh interval');
    const interval = setInterval(async () => {
      try {
        console. log('🔄 Refreshing data silently...');
        
        await Promise.all([loadWorkers(), fetchUnreadCount()]);
        
        console. log('✅ Data refreshed silently');
      } catch (error) {
        console.error('❌ Failed to refresh data:', error);
      }
    }, 60000);

    return () => {
      console.log('🛑 Clearing refresh interval');
      clearInterval(interval);
    };
  }, [currentUser]);
  
  // ✨ Modified login handler
  const handleLogin = async (email: string, password: string) => {
    try {
      console. log(`🔐 Attempting login for: ${email}`);
      const response = await authService. login(email, password);
      
      if (response.success) {
        console.log('✅ Login successful');
        setCurrentUser({
          id: response.data.user. admin_id?.toString() || '0',
          name: response.data.user. name,
          role: 'Admin',
          email: response.data.user.email
        });
        
        await loadInitialData();
      }
    } catch (error:  any) {
      console.error('❌ Login failed:', error);
      throw error;
    }
  };
  
  // Logout handler
  const handleLogout = () => {
    console.log('👋 Logging out...');
    authService.logout();
    setCurrentUser(null);
    setActiveTab('dashboard');
    setReports([]);
    setWorkers([]);
    setActivities([]);
    setUnreadNotificationsCount(0);
    setShowNotifications(false);
    
    localStorage.clear();
    window.location.reload();
  };
  
  // Filter reports
  const filteredReports = useMemo(() => {
    return reports.filter(report => {
      if (statusFilter !== 'All' && report.status !== statusFilter) return false;
      if (workerFilter !== 'All' && report.workerName !== workerFilter) return false;
      if (zoneFilter !== 'All' && report.zone !== zoneFilter) return false;
      if (wasteTypeFilter !== 'All' && report.wasteType !== wasteTypeFilter) return false;
      if (searchQuery && ! report.id.toLowerCase().includes(searchQuery.toLowerCase()) && 
          !report.location.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (dateRange. start && report.submittedAt < new Date(dateRange. start)) return false;
      if (dateRange.end && report.submittedAt > new Date(dateRange.end)) return false;
      return true;
    }).sort((a, b) => {
      return b.submittedAt. getTime() - a.submittedAt.getTime();
    });
  }, [reports, statusFilter, workerFilter, zoneFilter, wasteTypeFilter, searchQuery, dateRange]);
  
  // Stats calculations
  const stats = useMemo(() => {
    const total = reports.length;
    const unassigned = countUnassignedReports(reports);
    const awaiting_accept = countAwaitingAcceptReports(reports);
    const pending = countPendingWorkloadReports(reports);
    const in_progress = reports.filter(r => r.status === 'In Progress').length;
    const resolved = reports.filter(r => r.status === 'Resolved').length;
    
    const twoDaysAgo = Date.now() - (48 * 60 * 60 * 1000);
    const overdue = reports.filter(r =>
      isUnassignedReport(r) && r.submittedAt.getTime() < twoDaysAgo
    ).length;
    
    return { total, unassigned, awaiting_accept, pending, in_progress, resolved, overdue };
  }, [reports]);
  
  // Chart data
  const trendData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      date.setHours(0, 0, 0, 0);
      
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);
      
      const dayReports = reports.filter(r => 
        r.submittedAt >= date && r.submittedAt < nextDate
      );
      
      const dayResolved = reports.filter(r => 
        r. resolvedAt && r. resolvedAt >= date && r.resolvedAt < nextDate
      );
      
      return {
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        reports: dayReports. length,
        resolved: dayResolved. length
      };
    });
    return last7Days;
  }, [reports]);
  
  const statusDistribution = useMemo(
    () => buildAdminStatusDistribution(reports),
    [reports],
  );
  
  // Top citizens and workers
  const topCitizens = useMemo(() => {
    const citizenReports = reports.reduce((acc, r) => {
      if (r.citizenName && r.citizenName !== 'Admin Created') {
        acc[r.citizenName] = (acc[r.citizenName] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);
    
    return (Object.entries(citizenReports) as [string, number][])
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, count]) => ({ name, reports: count }));
  }, [reports]);
  
  const topWorkers = useMemo(() => {
    return [... workers]
      .sort((a, b) => {
        if (b.rating !== a.rating) {
          return b. rating - a.rating;
        }
        return b.tasksCompleted - a.tasksCompleted;
      })
      .slice(0, 3);
  }, [workers]);
  
  // ✨ Task assignment
  const assignTask = async (reportId: string, workerId: string) => {
    try {
      console.log(`📌 Assigning report ${reportId} to worker ${workerId}`);
      await reportService.assignWorker(reportId, workerId);
      
      try {
        const detail = await reportService.getReportById(reportId);
        if (detail.data) {
          setSelectedReport((prev) => (prev?.id === reportId ? detail.data : prev));
          setReports((prev) => {
            const idx = prev.findIndex((r) => r.id === reportId);
            if (idx >= 0) {
              const next = [...prev];
              next[idx] = detail.data;
              return next;
            }
            return [...prev, detail.data];
          });
        }
      } catch {
        /* Reports tab loads fresh pages from API */
      }

      setActivities(prev => [{
        id: `ACT-${Date.now()}`,
        type: 'assigned',
        message:  `Report ${reportId} assigned to worker`,
        timestamp: new Date(),
        reportId
      }, ...prev. slice(0, 7)]);
      
      console.log('✅ Task assigned successfully');
    } catch (error) {
      console.error('❌ Failed to assign task:', error);
      throw error;
    }
  };
  
  // ✨ Override status
  const overrideStatus = async (reportId: string, newStatus: ReportStatus) => {
    try {
      console.log(`🔄 Updating report ${reportId} status to ${newStatus}`);
      await reportService.updateStatus(reportId, newStatus);
      
      try {
        const detail = await reportService.getReportById(reportId);
        if (detail.data) {
          setSelectedReport((prev) => (prev?.id === reportId ? detail.data : prev));
          setReports((prev) => {
            const idx = prev.findIndex((r) => r.id === reportId);
            if (idx >= 0) {
              const next = [...prev];
              next[idx] = detail.data;
              return next;
            }
            return [...prev, detail.data];
          });
        }
      } catch {
        /* Reports tab loads fresh pages from API */
      }

      console.log('✅ Status updated successfully');
    } catch (error) {
      console.error('❌ Failed to update status:', error);
      throw error;
    }
  };
  
  // ✅ FIXED: Worker CRUD with proper refresh
  const saveWorker = async (
    workerData:  Partial<Worker> & { 
      password?: string; 
      profileImage?: File;
    }
  ) => {
    try {
      console.log('💾 Saving worker:', workerData);
      
      if (editingWorker) {
        const updatePayload:  any = {
          name: workerData. name,
          phone: workerData. phone || '',
        };

        if (workerData.profileImage instanceof File) {
          updatePayload.profile_image = workerData.profileImage;
        }
        
        await workerService.updateWorker(editingWorker.id, updatePayload);
        console.log('✅ Worker updated');

      } else {
        const employeeCode = `WRK${Date.now().toString().slice(-6)}`;
        
        const createPayload: any = {
          name:  workerData.name! ,
          email:  workerData.email! ,
          phone:  workerData.phone || '',
          password: workerData. password || 'ChangeMe123! ',
          employee_code: employeeCode,
        };

        if (workerData.profileImage instanceof File) {
          createPayload.profile_image = workerData.profileImage;
        }
        
        await workerService.createWorker(createPayload);
        console.log('✅ Worker created');
      }
      
      await loadWorkers();
      setShowWorkerModal(false);
      setEditingWorker(null);
      
    } catch (error:  any) {
      console.error('❌ Failed to save worker:', error);
      
      let errorMessage = 'Failed to save worker.  Please try again.';
      
      if (error.message) {
        errorMessage = error.message;
      } else if (error.response?. data) {
        const data = error.response. data;
        
        if (typeof data === 'string') {
          errorMessage = data;
        } else if (data. error) {
          errorMessage = data.error;
        } else if (data. message) {
          errorMessage = data. message;
        } else if (typeof data === 'object') {
          const firstError = Object.entries(data)[0];
          if (firstError) {
            const [field, message] = firstError;
            const msg = Array.isArray(message) ? message[0] : message;
            errorMessage = `${field}: ${msg}`;
          }
        }
      }
      
      throw new Error(errorMessage);
    }
  };
  
  const deleteWorker = async (workerId: string) => {
    try {
      console.log(`🗑️ Deleting worker ${workerId}`);
      await workerService.deleteWorker(workerId);
      await loadWorkers();
      console.log('✅ Worker deleted');
    } catch (error) {
      console.error('❌ Failed to delete worker:', error);
      throw error;
    }
  };
  
  const toggleWorkerStatus = async (workerId: string) => {
    try {
      console.log(`🔄 Toggling worker ${workerId} status`);
      await workerService.toggleStatus(workerId);
      setWorkers(prev => prev.map(w => w.id === workerId ? { ...w, active: !w.active } : w));
      console.log('✅ Worker status toggled');
    } catch (error) {
      console. error('❌ Failed to toggle worker status:', error);
      await loadWorkers();
      throw error;
    }
  };
  
  // Worker profile handlers
  const handleViewProfile = (workerId: string) => {
    console.log(`👀 Viewing profile for worker ${workerId}`);
    
    const worker = workers.find(w => w.id === workerId);
    
    if (!worker) {
      console. error('❌ Worker not found:', workerId);
      alert('Worker not found.  Please refresh the page.');
      return;
    }
    
    setSelectedWorkerId(workerId);
    setActiveTab('workers');
  };
  
  const handleBackToWorkers = () => {
    console.log('⬅️ Back to workers list');
    setSelectedWorkerId(null);
    setSortWorkersByRating(false);
    setActiveTab('workers');
  };
  
  // ✅ Password reset handler
  const handlePasswordReset = async (workerId: string) => {
    try {
      console.log(`🔑 Sending password reset for worker ${workerId}`);
      
      const result = await workerService.resetWorkerPassword(workerId);
      
      if (result. success) {
        console.log('✅ Password reset initiated');
        alert(`✅ Password reset email sent to ${result.email || 'worker email'}`);
      } else {
        console.warn('⚠️ Password reset response:', result);
        alert(result.message || 'Password reset email sent');
      }
    } catch (error:  any) {
      console.error('❌ Failed to send password reset:', error);
      
      let errorMessage = 'Failed to send password reset. Please try again. ';
      if (error.message) {
        errorMessage = error.message;
      } else if (error.response?. data?. message) {
        errorMessage = error. response.data.message;
      } else if (error.response?.data?. error) {
        errorMessage = error. response.data.error;
      }
      
      alert(`❌ ${errorMessage}`);
    }
  };
  
  // Task creation
  const handleCreateTask = (workerId: string) => {
    console.log(`➕ Creating task for worker ${workerId}`);
    setTaskWorkerId(workerId);
    setShowCreateTaskModal(true);
  };
  
 // ✅ Updated:  Task is already created in modal, just refresh data
const handleTaskCreation = async () => {
  console.log('✅ Task created, refreshing data...');
  
  try {
    // Close modal
    setShowCreateTaskModal(false);
    setTaskWorkerId(null);
    
    // Add activity
    setActivities(prev => [{
      id: `ACT-${Date.now()}`,
      type: 'new_report',
      message: 'New task created by admin',
      timestamp:  new Date(),
    }, ...prev. slice(0, 7)]);
    
    console.log('✅ Data refreshed successfully');
  } catch (error) {
    console.error('❌ Failed to refresh data:', error);
  }
};

  // ✅ Handle notification icon click
  const handleNotificationClick = () => {
    console.log('🔔 Opening notifications');
    setShowNotifications(true);
  };

  // ✅ Handle notification close
  const handleNotificationClose = () => {
    console. log('🔔 Closing notifications');
    setShowNotifications(false);
    fetchUnreadCount(); // Refresh count when closing
  };
  
  // Loading screen
  if (loading || !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400 text-lg">Loading Neat Now Admin Panel...</p>
          <p className="text-slate-600 text-sm mt-2">Please wait while we fetch your data</p>
        </div>
      </div>
    );
  }

  // ✅ Show Notifications Page (Full Screen)
  if (showNotifications) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        {/* Header */}
        <header className="bg-slate-900/80 backdrop-blur-xl border-b border-slate-800 sticky top-0 z-50">
          <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                  <Activity className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-white font-bold">Neat Now</h1>
                  <p className="text-xs text-slate-400">Admin Control Panel</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3 px-4 py-2 bg-slate-800/50 rounded-lg border border-slate-700">
                  <div className="text-right">
                    <p className="text-sm text-white font-medium">{currentUser.name}</p>
                    <p className="text-xs text-slate-400">{currentUser.email}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-all"
                    title="Logout"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Notifications Content */}
        <main className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Notifications 
            onBack={handleNotificationClose}
            onNotificationRead={fetchUnreadCount}
          />
        </main>
      </div>
    );
  }
  
  // Main Application UI
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Data Loading Indicator */}
      {dataLoading && (
        <div className="fixed top-20 right-4 z-50 bg-emerald-500/20 border border-emerald-500/30 backdrop-blur-sm rounded-lg px-4 py-2 flex items-center gap-2 animate-fade-in">
          <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-emerald-400 text-sm">Refreshing data...</span>
        </div>
      )}
      
      {/* Header */}
      <header className="bg-slate-900/80 backdrop-blur-xl border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-white font-bold">Neat Now</h1>
                <p className="text-xs text-slate-400">Admin Control Panel</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
  {/* ✅ Notification Bell Icon */}
  <button 
    onClick={handleNotificationClick}
    className="relative p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
    title="Notifications"
  >
    <Bell className="w-5 h-5" />
    {unreadNotificationsCount > 0 && (
      <span
        className="absolute animate-pulse bg-red-600 text-white font-bold shadow-sm"
        style={{
          /* Position it at the bottom-left of the bell icon */
          bottom: '-2px',
          left: '-2px',
          
          /* Forced Circular Shape */
          width: unreadNotificationsCount > 99 ? 'auto' : '18px',
          height: '18px',
          minWidth: '18px',
          borderRadius: '999px', // High value ensures circle
          
          /* Centering the text */
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          
          /* Text styling */
          fontSize: '10px',
          padding: unreadNotificationsCount > 99 ? '0 6px' : '0',
          lineHeight: '1',
          zIndex: 10
        }}
      >
        {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
      </span>
    )}
  </button>

  {/* User Profile */}
  <div className="flex items-center gap-3 px-4 py-2 bg-slate-800/50 rounded-lg border border-slate-700">
    <div className="text-right">
      <p className="text-sm text-white font-medium">{currentUser.name}</p>
      <p className="text-xs text-slate-400">{currentUser.email}</p>
    </div>
    <button
      onClick={handleLogout}
      className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-all"
    >
      <LogOut className="w-4 h-4" />
    </button>
  </div>
</div>
          </div>
        </div>
      </header>
      
      {/* Navigation */}
      <nav className="bg-slate-900/50 backdrop-blur-sm border-b border-slate-800">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg: px-8">
          <div className="flex gap-1 py-2">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
              { id: 'reports', label: 'Reports', icon: FileText },
              { id: 'map', label: 'Map & Analytics', icon: Map },
              { id: 'workers', label: 'Workers', icon: Users }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  console.log(`📍 Navigating to ${tab. label}`);
                  setActiveTab(tab.id as TabType);
                  setSelectedWorkerId(null);
                  if (tab.id !== 'workers') {
                    setSortWorkersByRating(false);
                  }
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                  activeTab === tab.id
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                    :  'text-slate-400 hover: text-white hover:bg-slate-800'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
                {tab.id === 'workers' && selectedWorkerId && (
                  <span className="text-xs bg-emerald-400 text-slate-900 px-1. 5 py-0.5 rounded-full">
                    Profile
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </nav>
      
      {/* Main Content */}
      <main className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'dashboard' && (
          <DashboardView 
            stats={stats}
            activities={activities}
            topCitizens={topCitizens}
            topWorkers={topWorkers}
            trendData={trendData}
            statusDistribution={statusDistribution}
            reports={reports}
            onViewAllWorkers={() => setShowWorkersLeaderboardModal(true)}
            onViewAllCitizens={() => setShowCitizensModal(true)}
          />
        )}
        
        {activeTab === 'reports' && (
          <ReportsView
            workers={workers}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            workerFilter={workerFilter}
            setWorkerFilter={setWorkerFilter}
            zoneFilter={zoneFilter}
            setZoneFilter={setZoneFilter}
            wasteTypeFilter={wasteTypeFilter}
            setWasteTypeFilter={setWasteTypeFilter}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            dateRange={dateRange}
            setDateRange={setDateRange}
            onSelectReport={setSelectedReport}
            refreshKey={reportsListRefreshKey}
          />
        )}
        
        {activeTab === 'map' && (
          <MapView reports={reports} trendData={trendData} />
        )}
        
        {activeTab === 'workers' && ! selectedWorkerId && (
          <Workers
            onViewProfile={handleViewProfile}
            onEdit={(worker) => {
              console.log('✏️ Editing worker:', worker);
              setEditingWorker(worker);
              setShowWorkerModal(true);
            }}
            onDelete={deleteWorker}
            onToggleStatus={toggleWorkerStatus}
            onAddNew={() => {
              console.log('➕ Adding new worker');
              setEditingWorker(null);
              setShowWorkerModal(true);
            }}
            onCreateTask={handleCreateTask}
            sortByRating={sortWorkersByRating}
          />
        )}
        
        {activeTab === 'workers' && selectedWorkerId && (
          <WorkerProfileContainer
            workerId={selectedWorkerId}
            onBack={handleBackToWorkers}
          />
        )}
      </main>
      
      {/* Modals */}
      {selectedReport && (
        <ReportDetailModal
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
          onAssign={assignTask}
          onOverrideStatus={overrideStatus}
          onReportUpdated={() => setReportsListRefreshKey((k) => k + 1)}
        />
      )}
      
      {showWorkerModal && (
        <WorkerModal
          worker={editingWorker}
          onClose={() => {
            console.log('❌ Closing worker modal');
            setShowWorkerModal(false);
            setEditingWorker(null);
          }}
          onSave={saveWorker}
        />
      )}
      
      {showCreateTaskModal && (
        <CreateTaskModal
          worker={workers.find(w => w.id === taskWorkerId) || null}
          workers={workers. filter(w => w.active)}
          onClose={() => {
            console.log('❌ Closing create task modal');
            setShowCreateTaskModal(false);
            setTaskWorkerId(null);
          }}
          onCreate={handleTaskCreation}
        />
      )}
      
      {showCitizensModal && (
        <CitizensModal onClose={() => setShowCitizensModal(false)} />
      )}

      {showWorkersLeaderboardModal && (
        <WorkersLeaderboardModal onClose={() => setShowWorkersLeaderboardModal(false)} />
      )}
    </div>
  );
}