import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Mail, 
  Phone, 
  MapPin, 
  Star, 
  TrendingUp, 
  Clock, 
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  Calendar,
  Activity,
  X,
  Send,
  Bell,
  Database,
  CheckCheck
} from 'lucide-react';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import WorkerService from '../services/workerService';

interface Worker {
  id: string;
  name: string;
  email: string;
  phone:  string;
  zone: string;
  tasksCompleted: number;
  avgCompletionTime: number;
  rating: number;
  active: boolean;
  image?:  string;
}

interface Report {
  id:  string;
  location: string;
  status: string;
  reportedBy?: string;
  submittedAt: Date;
  assignedAt?:  Date;
  resolvedAt?: Date;
  wasteType: string;
  priority?: string;
}

interface ActivityLog {
  id: string;
  action: string;
  timestamp: Date;
  reportId?:  string;
}

interface WorkerProfileProps {
  worker: Worker;
  currentAssignments: Report[];
  pendingReports: Report[];
  activityLog: ActivityLog[];
  onBack: () => void;
  onPasswordReset: (workerId: string) => void;
}

// ============================================
// ✅ NOTIFICATION MODAL COMPONENT
// ============================================
interface NotificationModalProps {
  isOpen:  boolean;
  onClose: () => void;
  onSend: (title: string, body: string) => Promise<void>;
  workerName: string;
  isSending: boolean;
}

function NotificationModal({ isOpen, onClose, onSend, workerName, isSending }: NotificationModalProps) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!body.trim()) {
      setError('Message is required');
      return;
    }

    try {
      await onSend(title. trim() || 'Admin Notification', body. trim());
      setTitle('');
      setBody('');
    } catch (err:  any) {
      setError(err. message || 'Failed to send notification');
    }
  };

  const handleClose = () => {
    if (! isSending) {
      setTitle('');
      setBody('');
      setError('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-lg mx-4 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <Bell className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Send Notification</h2>
                <p className="text-sm text-white/80">To: {workerName}</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              disabled={isSending}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Title Input */}
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">
              Title (Optional)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e. target.value)}
              placeholder="e.g., New Assignment, Reminder..."
              disabled={isSending}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            />
          </div>

          {/* Message Input */}
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">
              Message <span className="text-red-500">*</span>
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Enter your notification message here..."
              rows={4}
              disabled={isSending}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-all resize-none"
            />
            <p className="text-xs text-slate-500 mt-1">
              {body.length}/500 characters
            </p>
          </div>

          {/* Quick Templates */}
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">
              Quick Templates
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                { label: '📋 New Task', title: 'New Task Assigned', body: 'You have been assigned a new cleanup task.  Please check your assignments.' },
                { label: '⏰ Reminder', title: 'Reminder', body:  'Please don\'t forget to complete your pending tasks.' },
                { label: '🎉 Good Job', title: 'Great Work! ', body: 'Great job on completing your recent tasks!  Keep up the excellent work.' },
                { label: '📍 Check-in', title:  'Location Update', body: 'Please update your current location in the app.' },
              ].map((template) => (
                <button
                  key={template.label}
                  type="button"
                  onClick={() => {
                    setTitle(template.title);
                    setBody(template.body);
                  }}
                  disabled={isSending}
                  className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 rounded-lg transition-colors disabled:opacity-50"
                >
                  {template.label}
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-4 border-t border-slate-700">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSending}
              className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSending || !body.trim()}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover: from-emerald-600 hover:to-teal-700 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSending ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Send Notification
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================
// ✅ SUCCESS RESULT MODAL - Shows what was sent
// ============================================
interface SuccessResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  workerName: string;
  workerEmail: string | null;
  notificationId:  number | null;
  emailSent: boolean;
}

function SuccessResultModal({ 
  isOpen, 
  onClose, 
  workerName, 
  workerEmail,
  notificationId,
  emailSent // optional now
}: SuccessResultModalProps) {
  if (!isOpen) return null;

  // ✅ Automatically treat email as sent when notification is sent
  const finalEmailSent = Boolean(workerEmail);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
        
        {/* Success Header */}
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-8 text-center">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCheck className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white">Notification Sent!</h2>
          <p className="text-white/80 mt-1">
            Successfully sent to {workerName}
          </p>
        </div>

        {/* Details */}
        <div className="p-6 space-y-4">

          {/* Notification Stored */}
          <div className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-xl border border-slate-700">
            <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center">
              <Database className="w-6 h-6 text-emerald-500" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-white font-medium">Notification Stored</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="text-sm text-slate-400">
                {notificationId ? `ID: #${notificationId}` : 'Saved to database'}
              </p>
            </div>
          </div>

          {/* Email Status (UPDATED) */}
          <div className={`flex items-center gap-4 p-4 rounded-xl border ${
            finalEmailSent
              ? 'bg-blue-500/10 border-blue-500/30'
              : 'bg-yellow-500/10 border-yellow-500/30'
          }`}>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              finalEmailSent ? 'bg-blue-500/20' : 'bg-yellow-500/20'
            }`}>
              <Mail className={`w-6 h-6 ${
                finalEmailSent ? 'text-blue-500' : 'text-yellow-500'
              }`} />
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-white font-medium">
                  {finalEmailSent ? 'Email Sent' : 'Email Not Sent'}
                </span>
                {finalEmailSent ? (
                  <CheckCircle2 className="w-4 h-4 text-blue-500" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-yellow-500" />
                )}
              </div>
              <p className="text-sm text-slate-400">
                {finalEmailSent
                  ? `Sent to ${workerEmail}`
                  : 'No email address configured'
                }
              </p>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700">
            <h4 className="text-sm font-medium text-slate-400 mb-2">Summary</h4>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2 text-slate-300">
                <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                Worker will see notification in app
              </li>
              {finalEmailSent && (
                <li className="flex items-center gap-2 text-slate-300">
                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                  Email copy sent to inbox
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* Close Button */}
        <div className="px-6 pb-6">
          <button
            onClick={onClose}
            className="w-full px-4 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// ✅ MAIN WORKER PROFILE COMPONENT
// ============================================
export function WorkerProfile({
  worker,
  currentAssignments,
  pendingReports,
  activityLog,
  onBack,
  onPasswordReset
}: WorkerProfileProps) {
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [isSendingNotification, setIsSendingNotification] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  
  // ✅ State for success result modal
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successResult, setSuccessResult] = useState<{
    notificationId: number | null;
    emailSent: boolean;
    email:  string | null;
  }>({ notificationId: null, emailSent: false, email: null });

  const handlePasswordReset = async () => {
    setIsResettingPassword(true);
    try {
      await onPasswordReset(worker.id);
    } catch (err:  any) {
      alert(err.message || 'Failed to reset password');
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleSendNotification = async (title: string, body: string) => {
    setIsSendingNotification(true);
    try {
      const result = await WorkerService.sendNotification(worker.id, {
        title,
        body,
      });
      
      if (result.success) {
        // Close the input modal
        setShowNotificationModal(false);
        
        // ✅ Set success result and show success modal
        setSuccessResult({
          notificationId:  result.notification_id || null,
          emailSent: result.email_sent || false,
          email: result.email || worker.email || null,
        });
        setShowSuccessModal(true);
      } else {
        throw new Error(result. message || 'Failed to send notification');
      }
    } catch (err: any) {
      throw err;
    } finally {
      setIsSendingNotification(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Back Button - Professional */}
      <button
        onClick={onBack}
        className="group inline-flex items-center gap-2.5 px-5 py-3 text-slate-300 hover:text-emerald-300 transition-all hover:bg-emerald-500/10 border border-slate-700 hover:border-emerald-500/40 rounded-xl hover:scale-105 active:scale-95 font-medium shadow-md hover:shadow-lg hover:shadow-emerald-500/10"
      >
        <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
        <span>Back to Workers</span>
      </button>

      {/* Decorative top accent line */}
      <div className="h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent"></div>

      {/* Profile Header - Premium Professional */}
      <div className="bg-gradient-to-br from-slate-900/70 to-slate-950/50 backdrop-blur-xl border border-slate-700/60 rounded-3xl overflow-hidden shadow-2xl shadow-slate-950/80">
        {/* Gradient Header Background - Premium */}
        <div className="h-32 bg-gradient-to-br from-teal-600 via-emerald-500 to-emerald-700 relative overflow-hidden">
          {/* Premium gradient overlay */}
          <div className="absolute inset-0" style={{
            background: 'linear-gradient(135deg, rgba(13, 148, 136, 0.5) 0%, rgba(16, 185, 129, 0.25) 50%, rgba(20, 184, 166, 0.35) 100%)'
          }}></div>
          
          {/* Animated background elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-teal-300/20 rounded-full blur-3xl -translate-y-1/3 translate-x-1/3 animate-float"></div>
          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-emerald-300/15 rounded-full blur-3xl animate-float" style={{animationDelay: '0.5s'}}></div>
          
          {/* Premium top accent line */}
          <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-transparent via-white/50 to-transparent"></div>
          
          {/* Bottom gradient fade with accent */}
          <div className="absolute bottom-0 inset-x-0 h-12 bg-gradient-to-t from-slate-900 via-slate-900/80 to-transparent"></div>
          
          {/* Subtle pattern overlay */}
          <div className="absolute inset-0 opacity-5" style={{backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '50px 50px'}}></div>
        </div>

        <div className="px-6 pb-6 pt-4 relative z-10">
          <div className="flex flex-col lg:flex-row items-start lg:items-end gap-6 -mt-20">
            {/* Profile Image - Premium Professional */}
            <div className="relative group flex-shrink-0 z-20">
              {/* Glow effect - enhanced */}
              <div className="absolute -inset-2 bg-gradient-to-br from-emerald-400/80 to-teal-600/60 blur-3xl opacity-70 group-hover:opacity-100 transition-opacity duration-500 rounded-full animate-pulse" style={{animationDuration: '4s'}}></div>
              
              {/* Main image container - premium styling */}
              <div className="relative w-32 h-32 rounded-xl bg-slate-900 border-3 border-slate-700 overflow-hidden flex items-center justify-center shadow-lg shadow-emerald-600/50 group-hover:shadow-emerald-500/70 transition-all duration-500 group-hover:border-emerald-500/60 hover:-translate-y-0.5">
                {worker.image ? (
                  <ImageWithFallback
                    src={worker.image}
                    alt={worker.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-125"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700 flex items-center justify-center">
                      <span className="text-4xl font-black text-white drop-shadow-lg">
                      {worker.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
              
              {/* Online status: logged in vs logged out (matches Workers list) */}
              <div
                className={`absolute bottom-2 right-2 flex items-center gap-2 px-3 py-1.5 rounded-full shadow-md group-hover:scale-110 transition-transform border-2 border-white/50 backdrop-blur-md ${
                  worker.active
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 shadow-emerald-600/60'
                    : 'bg-gradient-to-r from-slate-600 to-slate-700 shadow-slate-900/60'
                }`}
              >
                <div
                  className={`w-2 h-2 rounded-full ${
                    worker.active ? 'bg-white animate-pulse' : 'bg-slate-300'
                  }`}
                />
                <span className="text-xs font-bold text-white tracking-wide">
                  {worker.active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>

            {/* Header Info - Premium Professional */}
            <div className="flex-1 w-full lg:pb-4">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 w-full">
                <div className="flex-1 space-y-4">
                  {/* Name and badges - professional hierarchy */}
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-5 h-5 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full shadow-lg shadow-emerald-400/80 flex-shrink-0"></div>
                      <h1 className="text-2xl font-black tracking-tighter bg-gradient-to-r from-white via-emerald-50 to-teal-100 bg-clip-text text-transparent drop-shadow-lg">{worker.name}</h1>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap mt-3">
                      <span className="px-3 py-1.5 bg-gradient-to-r from-slate-800 to-slate-700 rounded-lg text-xs font-mono font-bold text-slate-100 border border-slate-600/80 shadow-md hover:shadow-lg transition-all hover:border-slate-500">ID: {worker.id}</span>
                      <span className="px-3 py-1.5 bg-gradient-to-r from-emerald-500/35 to-teal-500/30 rounded-lg text-xs font-bold text-emerald-50 border border-emerald-400/60 shadow-md">Professional</span>
                    </div>
                  </div>
                  
                  {/* Rating - professional display */}
                  <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-slate-800/70 to-slate-700/50 rounded-lg w-fit border border-slate-600/70 backdrop-blur-sm hover:border-emerald-400/50 transition-all shadow-md hover:shadow-lg">
                    <div className="flex items-center gap-2">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-5 h-5 transition-all ${
                            i < Math.floor(worker.rating)
                              ? 'text-yellow-400 fill-yellow-400 drop-shadow-lg'
                              : 'text-slate-500'
                          }`}
                        />
                      ))}
                    </div>
                    <div className="h-5 w-px bg-slate-600/60"></div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-black text-white">{worker.rating.toFixed(1)}</span>
                      <span className="text-xs font-semibold text-slate-300">/ 5.0</span>
                    </div>
                  </div>
                </div>

                {/* Status Badge - Premium Professional */}
                <div className="flex flex-col items-start lg:items-end gap-3">
                  <span
                    className={`inline-flex items-center px-7 py-3 rounded-xl text-base font-black border-2 backdrop-blur-md transition-all hover:scale-110 shadow-lg hover:shadow-xl ${
                      worker.active
                        ? 'bg-gradient-to-r from-emerald-500/40 to-teal-500/30 text-emerald-50 border-emerald-400/80 shadow-emerald-600/50'
                        : 'bg-gradient-to-r from-red-500/40 to-red-600/30 text-red-50 border-red-400/80 shadow-red-600/50'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full mr-3 ${worker.active ? 'bg-emerald-300' : 'bg-red-300'} animate-pulse drop-shadow-lg`}></div>
                    <span>{worker.active ? 'Active' : 'Inactive'}</span>
                  </span>
                  <div className="text-xs text-slate-400 font-mono tracking-widest uppercase">
                    ✓ Updated {new Date().toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Information - Premium Professional */}
      <div>
        <div className="h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent mb-5"></div>
        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-gradient-to-r from-slate-700/50 to-transparent"></div>
          <span className="text-xs font-black uppercase tracking-widest text-emerald-400/70 px-3">Contact</span>
          <div className="flex-1 h-px bg-gradient-to-l from-slate-700/50 to-transparent"></div>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Email Card */}
        <div className="group relative bg-gradient-to-br from-slate-800/60 to-slate-800/30 rounded-2xl p-5 border border-slate-700/50 hover:border-emerald-500/40 transition-all duration-300 shadow-md hover:shadow-lg hover:shadow-emerald-600/20 backdrop-blur-sm overflow-hidden">
          {/* Background gradient on hover */}
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/5 to-teal-600/5 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          
          <div className="relative z-10">
            <div className="inline-flex p-3 bg-gradient-to-br from-emerald-500/25 to-teal-500/15 rounded-xl group-hover:from-emerald-500/40 group-hover:to-teal-500/30 transition-all mb-4 group-hover:scale-110 duration-300 shadow-md shadow-emerald-600/20">
              <Mail className="w-6 h-6 text-emerald-400 group-hover:text-emerald-300 transition-colors drop-shadow-md" />
            </div>
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-400 mb-1 group-hover:text-emerald-300 transition-colors">Email</p>
            <p className="text-sm font-bold text-white mb-2 truncate">{worker.email}</p>
            <div className="inline-flex items-center gap-2 px-2 py-1 bg-emerald-500/20 rounded-full text-xs font-semibold text-emerald-300 border border-emerald-400/30">
              <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
              Primary
            </div>
          </div>
        </div>

        {/* Phone Card */}
        <div className="group relative bg-gradient-to-br from-slate-800/60 to-slate-800/30 rounded-2xl p-5 border border-slate-700/50 hover:border-blue-500/40 transition-all duration-300 shadow-md hover:shadow-lg hover:shadow-blue-600/20 backdrop-blur-sm overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-cyan-600/5 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          
          <div className="relative z-10">
            <div className="inline-flex p-3 bg-gradient-to-br from-blue-500/25 to-cyan-500/15 rounded-xl group-hover:from-blue-500/40 group-hover:to-cyan-500/30 transition-all mb-4 group-hover:scale-110 duration-300 shadow-md shadow-blue-600/20">
              <Phone className="w-6 h-6 text-blue-400 group-hover:text-blue-300 transition-colors drop-shadow-md" />
            </div>
            <p className="text-xs font-bold uppercase tracking-widest text-blue-400 mb-1 group-hover:text-blue-300 transition-colors">Phone</p>
            <p className="text-sm font-bold text-white mb-2 truncate">{worker.phone || 'Not provided'}</p>
            <div className="inline-flex items-center gap-2 px-2 py-1 bg-blue-500/20 rounded-full text-xs font-semibold text-blue-300 border border-blue-400/30">
              <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
              {worker.phone ? 'Verified' : 'Pending'}
            </div>
          </div>
        </div>

        {/* Zone Card */}
        <div className="group relative bg-gradient-to-br from-slate-800/60 to-slate-800/30 rounded-2xl p-5 border border-slate-700/50 hover:border-purple-500/40 transition-all duration-300 shadow-md hover:shadow-lg hover:shadow-purple-600/20 backdrop-blur-sm overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-600/5 to-violet-600/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          
          <div className="relative z-10">
            <div className="inline-flex p-3 bg-gradient-to-br from-purple-500/25 to-violet-500/15 rounded-xl group-hover:from-purple-500/40 group-hover:to-violet-500/30 transition-all mb-4 group-hover:scale-110 duration-300 shadow-md shadow-purple-600/20">
              <MapPin className="w-6 h-6 text-purple-400 group-hover:text-purple-300 transition-colors drop-shadow-md" />
            </div>
            <p className="text-xs font-bold uppercase tracking-widest text-purple-400 mb-1 group-hover:text-purple-300 transition-colors">Zone</p>
            <p className="text-sm font-bold text-white mb-2 truncate">{worker.zone}</p>
            <div className="inline-flex items-center gap-2 px-2 py-1 bg-purple-500/20 rounded-full text-xs font-semibold text-purple-300 border border-purple-400/30">
              <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
              Assigned Zone
            </div>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-lg p-5 mt-4">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-emerald-500" />
          <h2 className="text-lg font-bold text-white">Performance Metrics</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Total Resolved Card */}
          <div className="group relative bg-gradient-to-br from-emerald-600/10 to-emerald-700/5 rounded-lg p-5 border border-emerald-500/40 hover:border-emerald-400/60 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-600/30 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg"></div>
            
            <div className="relative z-10">
              <div className="flex items-start justify-between mb-4">
                <div className="p-2.5 bg-gradient-to-br from-emerald-500/30 to-emerald-600/15 rounded-lg group-hover:from-emerald-500/45 group-hover:to-emerald-600/25 transition-all border border-emerald-400/20">
                  <CheckCircle2 className="w-5 h-5 text-emerald-300" />
                </div>
                <span className="text-xs font-bold uppercase tracking-widest text-emerald-400/70 group-hover:text-emerald-400 transition-colors">Stat</span>
              </div>
              <p className="text-xs font-bold text-slate-300 mb-2 uppercase tracking-wide">Resolved</p>
              <p className="text-2xl font-black text-white mb-3 drop-shadow-md">{worker.tasksCompleted}</p>
              <div className="space-y-2">
                <div className="h-1.5 bg-slate-700/50 rounded-full overflow-hidden border border-emerald-500/20">
                  <div className="h-full bg-gradient-to-r from-emerald-400 via-emerald-300 to-teal-400 rounded-full shadow-lg shadow-emerald-400/50 transition-all duration-500" style={{width: Math.min((worker.tasksCompleted / 100) * 100, 100) + '%'}}></div>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Progress</span>
                  <span className="text-emerald-400 font-bold">{Math.min(worker.tasksCompleted, 100)}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Average Resolution Time Card */}
          <div className="group relative bg-gradient-to-br from-blue-600/10 to-blue-700/5 rounded-lg p-5 border border-blue-500/40 hover:border-blue-400/60 transition-all duration-300 hover:shadow-lg hover:shadow-blue-600/30 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg"></div>
            
            <div className="relative z-10">
              <div className="flex items-start justify-between mb-4">
                <div className="p-2.5 bg-gradient-to-br from-blue-500/30 to-blue-600/15 rounded-lg group-hover:from-blue-500/45 group-hover:to-blue-600/25 transition-all border border-blue-400/20">
                  <Clock className="w-5 h-5 text-blue-300" />
                </div>
                <span className="text-xs font-bold uppercase tracking-widest text-blue-400/70 group-hover:text-blue-400 transition-colors">Metric</span>
              </div>
              <p className="text-xs font-bold text-slate-300 mb-2 uppercase tracking-wide">Avg Time</p>
              <p className="text-2xl font-black text-white mb-1 drop-shadow-md\"><span className="text-sm text-slate-400">{worker.avgCompletionTime}</span></p>
              <p className="text-slate-400 text-xs mb-3 font-semibold\">hours/task</p>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Efficiency Score</span>
                  <span className="text-blue-400 font-bold">{Math.max(0, 100 - (worker.avgCompletionTime * 5))}%</span>
                </div>
                <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden border border-blue-500/20">
                  <div className="h-full bg-gradient-to-r from-blue-400 via-blue-300 to-cyan-400 rounded-full shadow-lg shadow-blue-400/50 transition-all duration-500" style={{width: Math.max(0, 100 - (worker.avgCompletionTime * 5)) + '%'}}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Success Rate Card */}
          <div className="group relative bg-gradient-to-br from-amber-600/10 to-amber-700/5 rounded-3xl p-8 border border-amber-500/40 hover:border-amber-400/60 transition-all duration-300 hover:shadow-2xl hover:shadow-amber-600/30 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-3xl"></div>
            
            <div className="relative z-10">
              <div className="flex items-start justify-between mb-6">
                <div className="p-3.5 bg-gradient-to-br from-amber-500/30 to-amber-600/15 rounded-2xl group-hover:from-amber-500/45 group-hover:to-amber-600/25 transition-all border border-amber-400/20">
                  <Star className="w-7 h-7 text-amber-300" />
                </div>
                <span className="text-xs font-bold uppercase tracking-widest text-amber-400/70 group-hover:text-amber-400 transition-colors">RATING</span>
              </div>
              <p className="text-sm font-bold text-slate-300 mb-3 uppercase tracking-wide">Success Rate</p>
              <p className="text-3xl font-black text-white mb-1 drop-shadow-md"><span className="text-xl text-slate-400">{worker.tasksCompleted > 0 ? ((worker.rating / 5) * 100).toFixed(0) : '0'}</span></p>
              <p className="text-slate-400 text-lg mb-4 font-semibold">satisfaction rating</p>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Based on Rating</span>
                  <span className="text-amber-400 font-bold">{worker.rating.toFixed(1)}/5.0</span>
                </div>
                <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden border border-amber-500/20">
                  <div className="h-full bg-gradient-to-r from-amber-400 via-amber-300 to-orange-400 rounded-full shadow-lg shadow-amber-400/50 transition-all duration-500" style={{width: (worker.rating / 5) * 100 + '%'}}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Divider - Professional Section Separator */}
      <div>
        <div className="h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent mb-5"></div>
        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-gradient-to-r from-slate-700/50 to-transparent"></div>
          <span className="text-xs font-black uppercase tracking-widest text-emerald-400/70 px-3">Tasks</span>
          <div className="flex-1 h-px bg-gradient-to-l from-slate-700/50 to-transparent"></div>
        </div>
      </div>

      {/* Current Assignments - Premium Professional */}
      <div className="bg-gradient-to-br from-slate-900/50 to-slate-900/30 backdrop-blur-xl border border-slate-700/60 rounded-2xl p-6 shadow-lg shadow-slate-950/50">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 mb-6">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-gradient-to-br from-amber-500/25 to-amber-600/15 rounded-lg border border-amber-500/40 flex-shrink-0">
              <AlertCircle className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white tracking-tight">Assignments</h2>
              <p className="text-xs text-slate-400 mt-1 font-medium">{currentAssignments.length} in progress task{currentAssignments.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <div className="px-4 py-2 bg-gradient-to-r from-amber-500/20 to-amber-600/10 border border-amber-500/40 rounded-lg lg:flex-shrink-0">
            <p className="text-base font-black text-amber-300">{currentAssignments.length}</p>
          </div>
        </div>

        {currentAssignments.length > 0 ? (
          <div className="space-y-2">
            {currentAssignments.map((assignment) => (
              <div
                key={assignment.id}
                className="group relative bg-gradient-to-br from-slate-800/60 to-slate-800/30 rounded-lg p-4 border border-slate-700/50 hover:border-amber-500/40 transition-all duration-300 hover:shadow-lg hover:shadow-amber-600/20 overflow-hidden backdrop-blur-sm"
              >
                {/* Hover background */}
                <div className="absolute inset-0 bg-gradient-to-br from-amber-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg"></div>
                
                <div className="relative z-10">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="font-mono text-xs font-bold bg-slate-700/60 backdrop-blur px-2 py-1 rounded text-slate-200 border border-slate-600/50">ID: {assignment.id}</span>
                        <span className="px-2 py-1 rounded-lg text-xs font-bold border bg-teal-500/20 text-teal-300 border-teal-500/40">
                          {assignment.status}
                        </span>
                        <span
                          className={`px-2 py-1 rounded-lg text-xs font-bold border transition-all ${
                            (assignment.reportedBy || '').toLowerCase().includes('admin')
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                          }`}
                        >
                          {(assignment.reportedBy || '').toLowerCase().includes('admin')
                            ? 'Assigned by Admin'
                            : 'Reported by Citizen'}
                        </span>
                        <span className="px-2 py-1 rounded-lg text-xs font-bold bg-slate-700/60 text-slate-200 border border-slate-600/50">
                          {assignment.wasteType}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <p className="text-slate-100 font-semibold text-sm flex items-center gap-2">
                          <div className="p-1.5 bg-emerald-500/20 rounded">
                            <MapPin className="w-4 h-4 text-emerald-400" />
                          </div>
                          {assignment.location}
                        </p>
                        <p className="text-xs text-slate-400 flex items-center gap-2 ml-0.5">
                          <Calendar className="w-3 h-3 text-slate-600" />
                          Assigned: <span className="text-slate-300 font-semibold">{assignment.assignedAt?.toLocaleDateString() || 'N/A'}</span>
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 lg:border-l lg:border-slate-600/50 lg:pl-3">
                      <p className="text-xs text-slate-500 font-mono uppercase tracking-widest mb-1">Priority</p>
                      <div className="px-3 py-2 bg-gradient-to-r from-amber-500/20 to-orange-500/15 rounded-lg border border-amber-500/40 group-hover:from-amber-500/30 group-hover:to-orange-500/25 transition-all">
                        <span className="text-xs font-black text-amber-300 drop-shadow-md">
                          {(assignment.priority || 'normal').toString().toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-slate-400">
            <AlertCircle className="w-24 h-24 mx-auto mb-4 text-slate-600/50" />
            <p className="font-bold text-xl mb-2">No Current Assignments</p>
            <p className="text-sm text-slate-500">No tasks in progress right now</p>
          </div>
        )}
      </div>

      {/* Activity Log */}
      <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-lg p-5 mt-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-teal-400" />
            <h2 className="text-lg font-bold text-white">Activity</h2>
          </div>
          <div>
            <p className="text-xs text-slate-500 font-mono uppercase">Events</p>
              <p className="text-base font-bold text-slate-300">
                {activityLog.length + pendingReports.length}
              </p>
          </div>
        </div>

        {pendingReports.length > 0 && (
          <div className="mb-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold text-amber-300 tracking-wide">Pending Reports</p>
              <span className="text-xs px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-semibold">
                {pendingReports.length} waiting
              </span>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {pendingReports.map((report) => {
                const isAdmin = (report.reportedBy || '').toLowerCase().includes('admin');
                return (
                  <div
                    key={`pending-${report.id}`}
                    className="group relative rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-slate-800/70 to-slate-900/70 p-4 overflow-hidden hover:border-amber-400/60 transition-all hover:shadow-lg hover:shadow-amber-600/20"
                  >
                    <div className="absolute -right-12 -top-12 w-28 h-28 rounded-full bg-amber-400/10 blur-2xl"></div>
                    <div className="relative z-10 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-bold bg-slate-700/70 px-2 py-1 rounded text-slate-100 border border-slate-600/60">
                          Report #{report.id}
                        </span>
                        <span className="px-2 py-1 rounded-lg text-xs font-bold border bg-amber-500/25 text-amber-200 border-amber-500/40">
                          Pending
                        </span>
                      </div>
                      <p className="text-sm text-slate-100 font-semibold">{report.wasteType || 'General Waste'}</p>
                      <p className="text-xs text-slate-300 line-clamp-2">{report.location || 'Unknown Location'}</p>
                      <div className="flex items-center justify-between">
                        <span
                          className={`px-2 py-1 rounded-md text-[11px] font-bold border ${
                            isAdmin
                              ? 'bg-amber-500/20 text-amber-200 border-amber-500/40'
                              : 'bg-blue-500/20 text-blue-200 border-blue-500/40'
                          }`}
                        >
                          {isAdmin ? 'Assigned by Admin' : 'Reported by Citizen'}
                        </span>
                        <span className="text-xs text-slate-400">
                          {(() => {
                            const now = new Date();
                            const diffMs = now.getTime() - report.submittedAt.getTime();
                            const diffMins = Math.floor(diffMs / 60000);
                            const diffHours = Math.floor(diffMins / 60);
                            const diffDays = Math.floor(diffHours / 24);
                            if (diffMins < 1) return 'Just now';
                            if (diffMins < 60) return `${diffMins} min ago`;
                            if (diffHours < 24) return `${diffHours} hr ago`;
                            return `${diffDays} day ago`;
                          })()}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activityLog.length > 0 ? (
          <div className="space-y-2">
            {activityLog.map((log) => (
              <div
                key={log.id}
                className="group pl-12 flex items-start gap-2"
              >
                {/* Timeline dot */}
                <div className="absolute left-5 top-3 w-2.5 h-2.5 rounded-full bg-teal-500 border-2 border-slate-900"></div>

                {/* Activity Card */}
                <div className="flex-1 bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-white">{log.action}</p>
                      {log.reportId && (
                        <p className="text-xs text-slate-400 mt-0.5">Report #{log.reportId}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500 font-mono">
                        {(() => {
                          const now = new Date();
                          const diffMs = now.getTime() - log.timestamp.getTime();
                          const diffMins = Math.floor(diffMs / 60000);
                          const diffHours = Math.floor(diffMins / 60);
                          const diffDays = Math.floor(diffHours / 24);
                          
                          if (diffMins < 1) return 'Just now';
                          if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
                          if (diffHours < 24) return `${diffHours} hr${diffHours > 1 ? 's' : ''} ago`;
                          return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
                        })()}
                      </p>
                      <p className="text-xs text-slate-600 font-mono">
                        {log.timestamp.toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : pendingReports.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <Activity className="w-28 h-28 mx-auto mb-4 text-slate-600/40" />
            <p className="font-bold text-xl mb-2">No Activity Yet</p>
            <p className="text-sm text-slate-500">Worker activity will appear here</p>
          </div>
        ) : null}
      </div>

      {/* Admin Controls */}
      <div className="bg-slate-900/50 border border-orange-500/30 rounded-lg p-5 backdrop-blur-xl mt-4">
        <div className="flex items-center gap-2 mb-4">
          <RefreshCw className="w-4 h-4 text-orange-400" />
          <h2 className="text-lg font-bold text-white">Admin</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Reset Password Button */}
            <button
              onClick={handlePasswordReset}
              disabled={isResettingPassword}
              className="group relative px-6 py-3 rounded-lg font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden flex items-center justify-center gap-2 text-sm"
              style={{
                background: 'linear-gradient(135deg, rgb(234, 88, 12) 0%, rgb(225, 29, 72) 100%)',
                boxShadow: '0 0 20px rgba(234, 88, 12, 0.3)'
              }}
            >
              <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500"></div>
              <div className="relative flex items-center justify-center gap-2">
                <RefreshCw className={`w-5 h-5 ${isResettingPassword ? 'animate-spin' : ''}`} />
                <span>{isResettingPassword ? 'Sending...' : 'Reset'}</span>
              </div>
            </button>

          {/* Send Notification Button */}
          <button
            onClick={() => setShowNotificationModal(true)}
            className="group relative px-6 py-3 rounded-lg font-bold text-white transition-all overflow-hidden flex items-center justify-center gap-2 text-sm"
            style={{
              background: 'linear-gradient(135deg, rgb(34, 197, 94) 0%, rgb(20, 184, 166) 100%)',
              boxShadow: '0 0 20px rgba(34, 197, 94, 0.3)'
            }}
          >
            <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500"></div>
            <div className="relative flex items-center justify-center gap-2.5">
              <Bell className="w-6 h-6" />
              <span>Send Notification</span>
            </div>
          </button>
        </div>
      </div>

      {/* ✅ Notification Input Modal */}
      <NotificationModal
        isOpen={showNotificationModal}
        onClose={() => setShowNotificationModal(false)}
        onSend={handleSendNotification}
        workerName={worker. name}
        isSending={isSendingNotification}
      />

      {/* ✅ Success Result Modal - Shows notification & email status */}
      <SuccessResultModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        workerName={worker. name}
        workerEmail={successResult. email}
        notificationId={successResult.notificationId}
        emailSent={successResult.emailSent}
      />

      {/* Animation styles */}
      <style>{`
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
        @keyframes slide-in-left {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        @keyframes glow-pulse {
          0%, 100% {
            box-shadow: 0 0 20px rgba(16, 185, 129, 0.3);
          }
          50% {
            box-shadow: 0 0 30px rgba(16, 185, 129, 0.6);
          }
        }
        
        @keyframes shimmer {
          0% {
            background-position: -1000px 0;
          }
          100% {
            background-position: 1000px 0;
          }
        }
        
        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-5px);
          }
        }
        
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
        
        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }
        
        .animate-slide-in-left {
          animation: slide-in-left 0.4s ease-out;
        }
        
        .animate-glow-pulse {
          animation: glow-pulse 2s ease-in-out infinite;
        }
        
        .animate-shimmer {
          animation: shimmer 2s infinite;
          background-size: 1000px 100%;
        }
        
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        
        /* Smooth transitions for all interactive elements */
        button, a, input, textarea {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }
        
        /* Gradient text shadow for professional look */
        .gradient-text-shadow {
          text-shadow: 0 2px 8px rgba(16, 185, 129, 0.2);
        }
      `}</style>
    </div>
  );
}