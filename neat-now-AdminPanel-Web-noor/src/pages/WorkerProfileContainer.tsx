import React, { useState, useEffect } from 'react';
import { WorkerProfile } from './WorkerProfile';
import WorkerService from '../services/workerService';
import { mapWorkerFromBackend } from '../types/worker';

// Transform backend worker data to frontend Worker interface
interface Worker {
  id:  string;
  name: string;
  email: string;
  phone: string;
  zone: string;
  tasksCompleted: number;
  avgCompletionTime: number;
  rating: number;
  active: boolean;
  image?: string;
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

interface WorkerProfileContainerProps {
  workerId: string | number;
  onBack: () => void;
}

export function WorkerProfileContainer({ workerId, onBack }: WorkerProfileContainerProps) {
  const [worker, setWorker] = useState<Worker | null>(null);
  const [currentAssignments, setCurrentAssignments] = useState<Report[]>([]);
  const [pendingReports, setPendingReports] = useState<Report[]>([]);
  const [activityLog, setActivityLog] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Transform backend assignment to frontend Report format.
  // Prefer stored citizen address (same as worker app / reports API), then computed location.
  const transformAssignment = (assignment: any): Report => {
    const loc =
      (assignment.location_address && String(assignment.location_address).trim()) ||
      (assignment.location && String(assignment.location).trim()) ||
      (assignment.address && String(assignment.address).trim()) ||
      '';
    const submittedAtRaw = assignment.created_at || assignment.submitted_at || assignment.assigned_at;
    return {
      id: assignment.id || assignment.report_id || '',
      location: loc,
      status: assignment.status || '',
      reportedBy: assignment.reported_by || 'Reported by Citizen',
      submittedAt: submittedAtRaw ? new Date(submittedAtRaw) : new Date(),
      assignedAt: assignment.assigned_at ? new Date(assignment.assigned_at) : undefined,
      resolvedAt: assignment.resolved_at ? new Date(assignment.resolved_at) : undefined,
      wasteType: assignment.waste_type || assignment.category || '',
      priority: assignment.priority || 'normal',
    };
  };

  // Transform backend activity to frontend ActivityLog format
  const transformActivity = (activity: any): ActivityLog => ({
    id: activity. id || '',
    action: activity.action || activity.description || '',
    timestamp: new Date(activity.timestamp || activity.created_at),
    reportId: activity.report_id,
  });

  // Fetch all worker data
  const fetchWorkerData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch worker details, assignments, activity, and pending reports in parallel.
      const [workerData, workerStats, assignmentsData, activityData, reportsResponse] = await Promise.all([
        WorkerService. getWorker(workerId),
        WorkerService.getWorkerStats(workerId),
        WorkerService. getWorkerAssignments(workerId),
        WorkerService.getWorkerActivity(workerId),
        WorkerService.getWorkerReports(workerId, { status: 'Assigned', page_size: 20 }),
      ]);

      // Transform and set worker data from backend worker + backend statistics.
      const mappedWorker = mapWorkerFromBackend(workerData as any);
      const perf = workerStats?.data?.performance || {};
      setWorker({
        id: mappedWorker.id,
        name: mappedWorker.name,
        email: mappedWorker.email,
        phone: mappedWorker.phone,
        zone: mappedWorker.zone || 'Unassigned',
        // Resolved metric must be backend-driven.
        tasksCompleted: Number(perf.done_reports ?? perf.total_resolved ?? mappedWorker.tasksCompleted ?? 0),
        // Avg Time metric must be backend-driven.
        avgCompletionTime: Number(perf.avg_resolution_time_hours ?? 0),
        // Success metric stays rating-based; fallback to worker avg rating.
        rating: Number(mappedWorker.rating || 0),
        // Worker profile status mirrors tracking/login availability display.
        active: Boolean(mappedWorker.active),
        image: mappedWorker.image,
      });

      // Current assignments: only in-progress work.
      setCurrentAssignments(
        assignmentsData
          .filter((a: any) => a.status === 'In Progress')
          .map(transformAssignment)
      );

      const pendingSource = reportsResponse?.data || reportsResponse?.results || reportsResponse || [];
      const pendingList = Array.isArray(pendingSource) ? pendingSource : [];
      setPendingReports(
        pendingList
          .filter((r: any) => (r?.status || '').toLowerCase() === 'assigned')
          .map(transformAssignment)
      );

      // Transform and set activity log
      setActivityLog(activityData.map(transformActivity));

    } catch (err:  any) {
      console.error('Error fetching worker data:', err);
      setError(err.message || 'Failed to load worker profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkerData();
  }, [workerId]);

  // Handle password reset
  const handlePasswordReset = async (workerId: string) => {
    try {
      const result = await WorkerService.resetWorkerPassword(workerId);
      
      if (result. success) {
        alert(`Password reset email sent to ${result.email || 'worker email'}`);
      } else {
        alert(result.message || 'Failed to send password reset email');
      }
    } catch (err: any) {
      console.error('Password reset error:', err);
      alert(err.message || 'Failed to reset password');
    }
  };

  // Handle send notification (bonus feature from your backend service)
  const handleSendNotification = async (workerId:  string, title: string, body: string) => {
    try {
      const result = await WorkerService.sendNotification(workerId, { title, body });
      
      if (result.success) {
        alert('Notification sent successfully');
      } else {
        alert(result.message || 'Failed to send notification');
      }
    } catch (err:  any) {
      console.error('Notification error:', err);
      alert(err.message || 'Failed to send notification');
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400">Loading worker profile... </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !worker) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="text-red-500 text-6xl">⚠️</div>
        <h2 className="text-xl text-white">Failed to load worker profile</h2>
        <p className="text-slate-400">{error || 'Worker not found'}</p>
        <button
          onClick={onBack}
          className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <WorkerProfile
      worker={worker}
      currentAssignments={currentAssignments}
      pendingReports={pendingReports}
      activityLog={activityLog}
      onBack={onBack}
      onPasswordReset={handlePasswordReset}
    />
  );
}