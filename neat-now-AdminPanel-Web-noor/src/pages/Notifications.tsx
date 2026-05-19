import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Bell,
  Search,
  RefreshCw,
  CheckCircle2,
  Circle,
  Trash2,
  User,
  Clock,
  ChevronDown,
  X,
  AlertCircle,
  Users,
  Database,
  Eye,
  MoreVertical,
  CheckCheck,
  Inbox,
  ArrowLeft
} from 'lucide-react';
import notificationService, { Notification, NotificationFilters } from '../services/notificationService';

// ============================================
// TYPES
// ============================================
interface NotificationsPageProps {
  onBack?: () => void;
  onNotificationRead?: () => void;
}

type RecipientTypeFilter = 'all' | 'worker' | 'citizen' | 'admin';
type ReadStatusFilter = 'all' | 'read' | 'unread';

// ============================================
// HELPER FUNCTIONS
// ============================================
function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now. getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}

function parseNotificationMessage(message: string): { title: string; body: string } {
  const match = message.match(/^\[([^\]]+)\]\s*(.*)$/);
  if (match) {
    return { title: match[1], body:  match[2] };
  }
  return { title: 'Notification', body: message };
}

/** Readable title + body for admin list (worker payloads are often JSON strings). */
function getNotificationDisplay(notification: Notification): { title: string; body: string } {
  const raw = (notification.message ?? '').trim();
  const apiTitle = notification.title?.trim();
  const formatted = notification.formatted_message?.trim();

  if (raw.startsWith('{')) {
    try {
      const d = JSON.parse(raw) as Record<string, unknown>;
      const typ = String(d.type ?? '');
      const reportId = d.report_id != null ? String(d.report_id) : '';
      const citizen = String(d.citizen_name ?? 'Citizen').trim() || 'Citizen';
      const adminName = String(d.admin_name ?? 'Admin').trim() || 'Admin';
      const waste = String(d.waste_type ?? '').trim() || 'waste report';
      const reportedBy = String(d.reported_by ?? '');
      const shortMsg = String(d.message ?? '').trim();
      const workerId = notification.recipient_id;
      const workerName = String(d.worker_name ?? '').trim();
      const who = workerName || `Worker #${workerId}`;

      if (typ === 'citizen_report_pending') {
        const nw = d.workers_notified_count;
        const extra =
          typeof nw === 'number' ? ` (${nw} workers were notified in the app.)` : '';
        return {
          title: reportId ? `Report #${reportId} — pending pickup` : 'Report — pending pickup',
          body: `${citizen} submitted report #${reportId || '?'} (${waste}). Waiting for a worker to accept.${extra}`,
        };
      }

      if (typ === 'work_completed') {
        const cName = String(d.citizen_name ?? citizen).trim() || citizen;
        const wName = String(d.worker_name ?? '').trim() || 'Worker';
        return {
          title: 'Work completed',
          body: `${cName}'s report #${reportId || '?'} (${waste}) was completed by ${wName}.`,
        };
      }

      if (typ === 'work_started') {
        const cName = String(d.citizen_name ?? citizen).trim() || citizen;
        const wName = String(d.worker_name ?? '').trim() || 'Worker';
        return {
          title: 'Work started',
          body: `${wName} started work on ${cName}'s report #${reportId || '?'} (${waste}).`,
        };
      }

      if (typ === 'task_assignment' || typ === 'report_available') {
        const adminAssigned =
          /assigned\s*by\s*admin/i.test(reportedBy) ||
          reportedBy.toLowerCase().includes('assigned by admin');
        if (adminAssigned) {
          return {
            title: reportId ? `Worker — Report #${reportId}` : 'Worker — Admin assignment',
            body: `${citizen}'s ${waste} report #${reportId || '?'}. Admin (${adminName}) assigned it to ${who}.`,
          };
        }
        return {
          title: reportId ? `Worker — Report #${reportId}` : 'Worker — New task',
          body: `${citizen}'s ${waste} report #${reportId || '?'}. ${who} was notified to accept or decline.`,
        };
      }

      if (shortMsg) {
        return {
          title: apiTitle && apiTitle !== 'Notification' ? apiTitle : 'Notification',
          body: shortMsg,
        };
      }
    } catch {
      /* fall through */
    }
  }

  if (formatted && !formatted.startsWith('{')) {
    const title =
      apiTitle && apiTitle !== 'Notification' ? apiTitle : 'Notification';
    return { title, body: formatted };
  }

  if (apiTitle && apiTitle !== 'Notification') {
    const parsed = parseNotificationMessage(raw);
    if (!raw.startsWith('{')) {
      return { title: apiTitle, body: parsed.body };
    }
    return { title: apiTitle, body: formatted || parsed.body };
  }

  return parseNotificationMessage(raw || 'No message');
}

function notificationSearchBlob(n: Notification): string {
  const { title, body } = getNotificationDisplay(n);
  return [title, body, n.message, n.formatted_message, n.title, String(n.recipient_id), n.recipient_type]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function getRecipientTypeColor(type: string): string {
  switch (type) {
    case 'worker': 
      return 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30';
    case 'citizen':  
      return 'bg-blue-500/20 text-blue-500 border-blue-500/30';
    case 'admin': 
      return 'bg-purple-500/20 text-purple-500 border-purple-500/30';
    default:  
      return 'bg-slate-500/20 text-slate-500 border-slate-500/30';
  }
}

function getRecipientTypeIcon(type: string) {
  switch (type) {
    case 'worker': 
      return <User className="w-4 h-4" />;
    case 'citizen': 
      return <Users className="w-4 h-4" />;
    case 'admin':  
      return <Database className="w-4 h-4" />;
    default: 
      return <User className="w-4 h-4" />;
  }
}

// ============================================
// NOTIFICATION CARD COMPONENT
// ============================================
interface NotificationCardProps {
  notification: Notification;
  onMarkAsRead: (id: number) => void;
  onDelete: (id: number) => void;
  isSelected: boolean;
  onSelect: (id:  number) => void;
}

function NotificationCard({
  notification,
  onMarkAsRead,
  onDelete,
  isSelected,
  onSelect,
}: NotificationCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const { title, body } = getNotificationDisplay(notification);

  return (
    <div
      className={`relative p-5 rounded-2xl border-2 transition-all duration-200 ${isSelected ? 'ring-2 ring-emerald-500' : 'hover:shadow-lg'} ${
        notification.is_read
          ? 'bg-gradient-to-br from-slate-900/40 to-slate-900/20 border-slate-800/50 hover:border-slate-700'
          : 'bg-gradient-to-br from-emerald-500/10 via-slate-900/40 to-slate-900/20 border-emerald-500/40 hover:border-emerald-500/60 hover:shadow-lg hover:shadow-emerald-500/20'
      }`}
    >
      <div className="flex items-start gap-4">
        {/* Selection Checkbox */}
        <button
          onClick={() => onSelect(notification.notification_id)}
          className="mt-1 flex-shrink-0 transition-transform hover:scale-110"
        >
          {isSelected ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 drop-shadow-lg" />
          ) : (
            <Circle className="w-5 h-5 text-slate-600 hover:text-slate-400" />
          )}
        </button>

        {/* Read Status Indicator */}
        <div className="flex-shrink-0 mt-1">
          {notification.is_read ?  (
            <div className="w-3 h-3 rounded-full bg-slate-600" />
          ) : (
            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              {/* Title & Badge */}
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <h3 className={`font-bold text-base ${notification.is_read ? 'text-slate-400' : 'text-white'}`}>
                  {title}
                </h3>
                <span className={`px-3 py-1 rounded-lg text-xs font-semibold border-2 ${getRecipientTypeColor(notification. recipient_type)}`}>
                  <span className="flex items-center gap-1.5">
                    {getRecipientTypeIcon(notification.recipient_type)}
                    {notification.recipient_type}
                  </span>
                </span>
              </div>

              {/* Message Body */}
              <p className={`text-sm leading-relaxed ${notification.is_read ? 'text-slate-500' : 'text-slate-300'}`}>
                {body}
              </p>

              {/* Meta Info */}
              <div className="flex items-center gap-4 mt-3 p-2.5 bg-slate-800/30 rounded-lg text-xs font-medium text-slate-500 border border-slate-700/30">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatTimeAgo(notification.created_at)}
                </span>
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  ID: {notification.recipient_id}
                </span>
              </div>
            </div>

            {/* Actions Menu */}
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <MoreVertical className="w-4 h-4 text-slate-400" />
              </button>

              {showMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowMenu(false)}
                  />
                  <div className="absolute right-0 top-full mt-1 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-20 py-1">
                    {! notification.is_read && (
                      <button
                        onClick={() => {
                          onMarkAsRead(notification.notification_id);
                          setShowMenu(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 flex items-center gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        Mark as Read
                      </button>
                    )}
                    <button
                      onClick={() => {
                        onDelete(notification. notification_id);
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-slate-700 flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// STATS CARD COMPONENT
// ============================================
interface StatsCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}

function StatsCard({ icon, label, value, color }: StatsCardProps) {
  return (
    <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/40 border-2 border-slate-700/50 hover:border-slate-600 rounded-2xl p-6 transition-all duration-200 hover:shadow-lg hover:shadow-slate-950/30 group">
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center shadow-lg transition-transform group-hover:scale-110`}>
          {icon}
        </div>
        <div>
          <p className="text-3xl font-black text-white group-hover:text-emerald-400 transition-colors">{value}</p>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mt-1">{label}</p>
        </div>
      </div>
    </div>
  );
}

// ============================================
// EMPTY STATE COMPONENT
// ============================================
function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-28 h-28 bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl flex items-center justify-center mb-6 shadow-lg shadow-slate-950/40 border border-slate-700/50">
        <Inbox className="w-12 h-12 text-slate-600" />
      </div>
      <h3 className="text-2xl font-black text-white mb-3">No Notifications</h3>
      <p className="text-sm font-medium text-slate-500 max-w-md">{message}</p>
    </div>
  );
}

// ============================================
// LOADING SKELETON
// ============================================
function NotificationSkeleton() {
  return (
    <div className="p-5 rounded-2xl border-2 border-slate-700/50 bg-gradient-to-br from-slate-800/40 to-slate-900/40 animate-pulse">
      <div className="flex items-start gap-4">
        <div className="w-5 h-5 bg-slate-700 rounded-full" />
        <div className="w-3 h-3 bg-slate-700 rounded-full mt-1" />
        <div className="flex-1 space-y-3">
          <div className="h-5 bg-slate-700 rounded-lg w-1/3" />
          <div className="h-4 bg-slate-700 rounded-lg w-2/3" />
          <div className="h-4 bg-slate-700 rounded-lg w-1/4" />
        </div>
      </div>
    </div>
  );
}

// ============================================
// MAIN NOTIFICATIONS PAGE
// ============================================
export function Notifications({ onBack, onNotificationRead }: NotificationsPageProps) {
  // State
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [recipientTypeFilter, setRecipientTypeFilter] = useState<RecipientTypeFilter>('all');
  const [readStatusFilter, setReadStatusFilter] = useState<ReadStatusFilter>('all');

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Stats
  const [stats, setStats] = useState({
    total:  0,
    unread:  0,
    workers: 0,
    citizens: 0,
  });

  // ============================================
  // FETCH NOTIFICATIONS
  // ============================================
  const fetchNotifications = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);

    try {
      const filters: NotificationFilters = {};

      if (recipientTypeFilter !== 'all') {
        filters.recipient_type = recipientTypeFilter;
      }
      if (readStatusFilter !== 'all') {
        filters.is_read = readStatusFilter === 'read';
      }

      const response = await notificationService. getNotifications(filters);
      setNotifications(response.data || []);

      // Calculate stats
      const allNotifications = response.data || [];
      setStats({
        total: allNotifications.length,
        unread: allNotifications. filter(n => !n.is_read).length,
        workers: allNotifications.filter(n => n.recipient_type === 'worker').length,
        citizens: allNotifications.filter(n => n.recipient_type === 'citizen').length,
      });
    } catch (err:  any) {
      console.error('Failed to fetch notifications:', err);
      setError(err.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [recipientTypeFilter, readStatusFilter]);

  // Initial fetch
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Refresh handler
  const handleRefresh = () => {
    setRefreshing(true);
    fetchNotifications(false);
  };

  // ============================================
  // FILTER NOTIFICATIONS
  // ============================================
  const filteredNotifications = useMemo(() => {
    let filtered = [... notifications];

    // Search filter
    if (searchQuery. trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (n) =>
          notificationSearchBlob(n).includes(query) ||
          n.recipient_id.toString().includes(query) ||
          n.recipient_type.toLowerCase().includes(query)
      );
    }

    // Sort by date (newest first)
    filtered.sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return filtered;
  }, [notifications, searchQuery]);

  // ============================================
  // ACTIONS
  // ============================================
  const handleMarkAsRead = async (id: number) => {
    try {
      await notificationService.markAsRead([id]);
      setNotifications(prev =>
        prev.map(n =>
          n.notification_id === id ? { ...n, is_read: true } :  n
        )
      );
      setStats(prev => ({ ...prev, unread: Math.max(0, prev.unread - 1) }));
      onNotificationRead?. ();
    } catch (err: any) {
      alert(err.message || 'Failed to mark as read');
    }
  };

  const handleMarkSelectedAsRead = async () => {
    if (selectedIds.size === 0) return;

    try {
      const ids = Array.from(selectedIds);
      await notificationService.markAsRead(ids);
      setNotifications(prev =>
        prev. map(n =>
          selectedIds.has(n.notification_id) ? { ...n, is_read: true } : n
        )
      );
      const unreadCount = notifications.filter(
        n => selectedIds.has(n.notification_id) && !n.is_read
      ).length;
      setStats(prev => ({ ...prev, unread: Math.max(0, prev.unread - unreadCount) }));
      setSelectedIds(new Set());
      onNotificationRead?.();
    } catch (err: any) {
      alert(err.message || 'Failed to mark as read');
    }
  };

  const handleDelete = async (id: number) => {
    if (! confirm('Are you sure you want to delete this notification?')) return;

    try {
      await notificationService.deleteNotification(id);
      const deleted = notifications.find(n => n.notification_id === id);
      setNotifications(prev => prev.filter(n => n. notification_id !== id));
      setStats(prev => ({
        ...prev,
        total: prev.total - 1,
        unread: deleted && !deleted.is_read ? prev.unread - 1 : prev.unread,
      }));
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch (err: any) {
      alert(err.message || 'Failed to delete notification');
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    if (! confirm(`Are you sure you want to delete ${selectedIds.size} notifications?`)) return;

    try {
      const ids = Array.from(selectedIds);
      await notificationService. deleteNotifications(ids);
      const deletedUnread = notifications.filter(
        n => selectedIds.has(n. notification_id) && !n.is_read
      ).length;
      setNotifications(prev => prev.filter(n => ! selectedIds.has(n.notification_id)));
      setStats(prev => ({
        ...prev,
        total: prev.total - ids.length,
        unread: prev.unread - deletedUnread,
      }));
      setSelectedIds(new Set());
    } catch (err: any) {
      alert(err.message || 'Failed to delete notifications');
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredNotifications.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredNotifications.map(n => n.notification_id)));
    }
  };

  const handleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const clearFilters = () => {
    setSearchQuery('');
    setRecipientTypeFilter('all');
    setReadStatusFilter('all');
  };

  const hasActiveFilters = searchQuery || recipientTypeFilter !== 'all' || readStatusFilter !== 'all';

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="space-y-6">
      {/* 🎯 PREMIUM HEADER */}
      <div className="bg-gradient-to-r from-slate-900 via-teal-900/20 to-slate-900 border border-slate-700/50 rounded-2xl p-6 shadow-lg shadow-slate-950/30">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1">
            {/* Back Button */}
            {onBack && (
              <button
                onClick={onBack}
                className="p-3 hover:bg-slate-800 rounded-xl transition-all duration-200 border border-slate-700/50 hover:border-slate-600/50 group"
                title="Go back"
              >
                <ArrowLeft className="w-5 h-5 text-slate-400 group-hover:text-white group-hover:scale-110 transition-all" />
              </button>
            )}
            
            {/* Notification Icon Badge */}
            <div className="p-3.5 bg-gradient-to-br from-emerald-500/25 to-teal-600/25 rounded-xl border border-emerald-500/40 shadow-lg shadow-emerald-500/20">
              <Bell className="w-6 h-6 text-emerald-400" />
            </div>
            
            {/* Header Content */}
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">
                Notifications
              </h1>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mt-1">
                Manage System Notifications
              </p>
            </div>
          </div>

          {/* Refresh Button - Premium */}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-500/20 to-emerald-600/20 hover:from-teal-500/30 hover:to-emerald-600/30 border-2 border-teal-500/40 hover:border-teal-500/60 rounded-xl text-teal-400 hover:text-teal-300 transition-all duration-200 font-bold shadow-lg shadow-teal-500/10 hover:shadow-teal-500/20"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          icon={<Bell className="w-5 h-5 text-emerald-500" />}
          label="Total Notifications"
          value={stats.total}
          color="bg-emerald-500/20"
        />
        <StatsCard
          icon={<AlertCircle className="w-5 h-5 text-yellow-500" />}
          label="Unread"
          value={stats.unread}
          color="bg-yellow-500/20"
        />
        <StatsCard
          icon={<User className="w-5 h-5 text-blue-500" />}
          label="To Workers"
          value={stats.workers}
          color="bg-blue-500/20"
        />
        <StatsCard
          icon={<Users className="w-5 h-5 text-purple-500" />}
          label="To Citizens"
          value={stats.citizens}
          color="bg-purple-500/20"
        />
      </div>

      {/* Filters & Search - Premium Card */}
      <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/40 border-2 border-slate-700/50 rounded-2xl p-6 shadow-lg shadow-slate-950/20">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notifications..."
              className="w-full pl-12 pr-5 py-3.5 bg-slate-800/60 hover:bg-slate-800/80 border-2 border-slate-700/60 hover:border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/30 transition-all font-medium"
            />
          </div>

          {/* Filter Buttons */}
          <div className="flex items-center gap-2">
            {/* Recipient Type Filter */}
            <div className="relative">
              <select
                value={recipientTypeFilter}
                onChange={(e) => setRecipientTypeFilter(e.target.value as RecipientTypeFilter)}
                className="appearance-none pl-5 pr-11 py-3.5 bg-slate-800/60 hover:bg-slate-800/80 border-2 border-slate-700/60 hover:border-slate-600 rounded-xl text-white focus:outline-none focus:border-purple-500/60 focus:ring-2 focus:ring-purple-500/30 cursor-pointer transition-all font-medium text-sm"
              >
                <option value="all">All Types</option>
                <option value="worker">Workers</option>
                <option value="citizen">Citizens</option>
                <option value="admin">Admins</option>
              </select>
              <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            </div>

            {/* Read Status Filter */}
            <div className="relative">
              <select
                value={readStatusFilter}
                onChange={(e) => setReadStatusFilter(e.target. value as ReadStatusFilter)}
                className="appearance-none pl-5 pr-11 py-3.5 bg-slate-800/60 hover:bg-slate-800/80 border-2 border-slate-700/60 hover:border-slate-600 rounded-xl text-white focus:outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/30 cursor-pointer transition-all font-medium text-sm"
              >
                <option value="all">All Status</option>
                <option value="unread">Unread</option>
                <option value="read">Read</option>
              </select>
              <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            </div>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="p-3.5 text-slate-400 hover:text-white hover:bg-slate-800/70 rounded-xl transition-all border border-slate-700/50 hover:border-slate-600/50"
                title="Clear filters"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Bulk Actions - Premium */}
        {selectedIds.size > 0 && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mt-5 pt-5 border-t-2 border-slate-700/50">
            <span className="text-sm font-bold text-slate-300 bg-slate-800/50 px-4 py-2 rounded-lg">
              ✓ {selectedIds.size} selected
            </span>
            <button
              onClick={handleMarkSelectedAsRead}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold bg-gradient-to-r from-emerald-500/20 to-teal-600/20 hover:from-emerald-500/30 hover:to-teal-600/30 text-emerald-400 border-2 border-emerald-500/40 hover:border-emerald-500/60 rounded-lg transition-all"
            >
              <CheckCheck className="w-4 h-4" />
              Mark as Read
            </button>
            <button
              onClick={handleDeleteSelected}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold bg-gradient-to-r from-red-500/20 to-rose-600/20 hover:from-red-500/30 hover:to-rose-600/30 text-red-400 border-2 border-red-500/40 hover:border-red-500/60 rounded-lg transition-all"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-sm font-semibold text-slate-400 hover:text-white transition-colors ml-auto"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Select All */}
      {! loading && filteredNotifications.length > 0 && (
        <div className="flex items-center justify-between">
          <button
            onClick={handleSelectAll}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
          >
            {selectedIds.size === filteredNotifications.length ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            ) : (
              <Circle className="w-4 h-4" />
            )}
            Select All ({filteredNotifications.length})
          </button>
          <span className="text-sm text-slate-500">
            Showing {filteredNotifications.length} of {stats.total} notifications
          </span>
        </div>
      )}

      {/* Error State - Premium */}
      {error && (
        <div className="bg-gradient-to-r from-red-500/15 to-rose-600/15 border-2 border-red-500/40 rounded-2xl p-5 flex items-center gap-4 shadow-lg shadow-red-500/10 backdrop-blur-sm">
          <div className="p-3 bg-red-500/20 rounded-lg border border-red-500/30 flex-shrink-0">
            <AlertCircle className="w-5 h-5 text-red-400" />
          </div>
          <p className="text-red-300 font-medium flex-1">{error}</p>
          <button
            onClick={() => fetchNotifications()}
            className="text-sm font-bold text-red-400 hover:text-red-300 bg-red-500/20 hover:bg-red-500/30 px-4 py-2 rounded-lg transition-all border border-red-500/30"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <NotificationSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Notifications List */}
      {! loading && ! error && (
        <>
          {filteredNotifications.length > 0 ? (
            <div className="space-y-3">
              {filteredNotifications.map((notification) => (
                <NotificationCard
                  key={notification.notification_id}
                  notification={notification}
                  onMarkAsRead={handleMarkAsRead}
                  onDelete={handleDelete}
                  isSelected={selectedIds.has(notification.notification_id)}
                  onSelect={handleSelect}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              message={
                hasActiveFilters
                  ? 'No notifications match your filters.  Try adjusting your search.'
                  : 'No notifications yet. They will appear here when sent.'
              }
            />
          )}
        </>
      )}
    </div>
  );
}

export default Notifications;