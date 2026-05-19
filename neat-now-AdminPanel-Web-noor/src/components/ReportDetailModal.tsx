import React, { useState, useEffect, useMemo } from 'react';
import { X, MapPin, Calendar, User, CheckCircle2, AlertCircle, Lock, UserCheck, UserX, RefreshCw, ScanSearch, Loader2 } from 'lucide-react';
import { Report, ReportStatus } from '../types';
import type { Worker } from '../types/worker';
import workerService from '../services/workerService';
import reportService from '../services/reportService';
import { mapWorkerFromBackend } from '../types/worker';
import type { AiVerificationPayload } from './AdminAiVerificationDialog';
import { ReportAiDetectionModal } from './ReportAiDetectionModal';
import { resolveMediaUrl } from '../utils/resolveMediaUrl';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { subscribeLiveWorkerLocations, type LiveWorkerLocation } from '../services/firebaseLiveTracking';
import { orderActiveWorkersByProximity, filterToLiveActiveWorkers } from '../utils/workerProximity';

interface ReportDetailModalProps {
  report: Report;
  workers?:  Worker[];
  onClose: () => void;
  onAssign: (reportId: string, workerId: string) => void;
  onOverrideStatus: (reportId: string, status: ReportStatus) => void;
  /** Called when user dismisses success dialog after assign/status update. */
  onReportUpdated?: () => void;
}

/** Status values shown in the admin modal dropdown (Pending maps to Assigned). */
type ModalReportStatus = Exclude<ReportStatus, 'Pending'>;

function toModalReportStatus(status: ReportStatus): ModalReportStatus {
  return status === 'Pending' ? 'Assigned' : status;
}

// ✅ Success Dialog Component
function SuccessDialog({ 
  message, 
  onClose 
}: { 
  message: string; 
  onClose: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onClose, 2500);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-emerald-500/50 rounded-2xl max-w-md w-full p-8 shadow-2xl animate-scale-in hover:shadow-2xl hover:shadow-emerald-500/20 transition-all">
        <div className="text-center">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-2xl animate-pulse"></div>
            <div className="relative w-20 h-20 mx-auto bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <CheckCircle2 className="w-10 h-10 text-white" />
            </div>
          </div>
          
          <h3 className="text-2xl font-bold text-white mb-2">Success! </h3>
          <p className="text-slate-300 text-sm">{message}</p>
          
          <button
            onClick={onClose}
            className="mt-6 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl hover:shadow-xl hover:shadow-emerald-500/40 transition-all transform hover:scale-105 font-semibold border border-emerald-400/50"
          >
            Got it! 
          </button>
        </div>
      </div>
    </div>
  );
}

// ✅ Error Dialog Component
function ErrorDialog({ 
  title,
  message, 
  onClose 
}:  { 
  title: string;
  message: string; 
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-red-500/50 rounded-2xl max-w-md w-full p-8 shadow-2xl animate-shake hover:shadow-2xl hover:shadow-red-500/20 transition-all">
        <div className="text-center">
          <div className="relative mb-6">
            <div className="w-20 h-20 mx-auto bg-red-500/20 rounded-full flex items-center justify-center border-4 border-red-500/30">
              <AlertCircle className="w-10 h-10 text-red-400" />
            </div>
          </div>
          
          <h3 className="text-2xl font-bold text-white mb-2">{title}</h3>
          <p className="text-slate-300 text-sm">{message}</p>
          
          <button
            onClick={onClose}
            className="mt-6 px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white rounded-xl transition-all hover:shadow-xl hover:shadow-red-500/40 font-semibold border border-red-500/50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ✅ AI Image Viewer Modal Component
function AiImageModal({ 
  image, 
  onClose,
  isVerified
}: { 
  image?: string; 
  onClose: () => void;
  isVerified?: boolean;
}) {
  if (!image) return null;
  
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative max-w-4xl w-full bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-800">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 bg-gradient-to-br from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 text-white rounded-lg transition-all hover:shadow-lg border border-slate-600"
        >
          <X className="w-5 h-5" />
        </button>
        
        {/* Image */}
        <img 
          src={image} 
          alt="AI Analysis Image" 
          className="w-full h-auto max-h-[80vh] object-contain"
        />
        
        {/* Bottom Info */}
        <div className="bg-slate-800/50 backdrop-blur-sm p-4 border-t border-slate-700">
          <div className="text-center space-y-2">
            <p className="text-slate-300 text-sm font-medium">AI analysis image</p>
            {isVerified !== undefined && (
              <p className={`text-xs ${isVerified ? 'text-emerald-400' : 'text-amber-400'}`}>
                {isVerified ? 'Verification passed' : 'Manual review suggested'}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ReportDetailModal({ 
  report, 
  workers:  providedWorkers, 
  onClose, 
  onAssign, 
  onOverrideStatus,
  onReportUpdated,
}: ReportDetailModalProps) {
  const [selectedWorker, setSelectedWorker] = useState(report.workerId || '');
  const [selectedStatus, setSelectedStatus] = useState<ModalReportStatus>(
    toModalReportStatus(report.status),
  );
  const [loading, setLoading] = useState(false);
  const [workers, setWorkers] = useState([] as Worker[]);
  const [allWorkers, setAllWorkers] = useState([] as Worker[]); // ✅ Store all workers
  const [fetchingWorkers, setFetchingWorkers] = useState(true);
  const [showReassign, setShowReassign] = useState(false);
  const [isBackendConnected, setIsBackendConnected] = useState(false);
  
  // ✅ Function to refetch workers
  const refetchWorkers = async () => {
    try {
      console.log('🔄 Refetching workers...');
      const allWorkersResponse = await workerService.getWorkers();
      
      const mappedAllWorkers: Worker[] = [];
      if (allWorkersResponse.results) {
        for (const backendWorker of allWorkersResponse.results) {
          try {
            mappedAllWorkers.push(mapWorkerFromBackend(backendWorker));
          } catch (err) {
            console.error('Failed to map worker:', err);
          }
        }
      }
      
      console.log(`✅ Refetched ${mappedAllWorkers.length} workers`);
      setAllWorkers(mappedAllWorkers);
      setIsBackendConnected(true); // ✅ Mark backend as connected
      
      const activeWorkers = mappedAllWorkers.filter(w => w.active);
      setWorkers(getAssignableWorkers(activeWorkers));
    } catch (error) {
      console.error('❌ Failed to refetch workers:', error);
      setIsBackendConnected(false); // ✅ Mark backend as disconnected
    }
  };
  
  // ✅ Dialog states
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [dialogMessage, setDialogMessage] = useState('');
  const [errorTitle, setErrorTitle] = useState('');
  const [showAiImageModal, setShowAiImageModal] = useState(false);
  const [showAiDetectionModal, setShowAiDetectionModal] = useState(false);
  const [aiDetectionVerification, setAiDetectionVerification] =
    useState(null as AiVerificationPayload | null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [liveWorkerLocs, setLiveWorkerLocs] = useState([] as LiveWorkerLocation[]);
  const hasWorkerScopeFilter = Array.isArray(providedWorkers);

  const getAssignableWorkers = (activeWorkers: Worker[]) => {
    if (!hasWorkerScopeFilter) return activeWorkers;
    return (providedWorkers || []).filter((w) => w.active);
  };
  
  // ✅ Check if report is resolved
  const isResolved = report.status === 'Resolved';
  
  // ✅ Check if worker is already assigned
  const hasWorker = !!report.workerId && report.workerId !== '';
  const isUnassigned = !hasWorker;

  /** When status dropdown is "Rejected", assignment must be blocked (unassigned or in-progress can still reject). */
  const isRejectSelected = selectedStatus === 'Rejected';

  /** Unassigned: prefer Assign Worker (not "Update Status") to move report to Assigned. */
  const isUpdateStatusDisabledUnassigned = isUnassigned && selectedStatus === 'Assigned';

  const verifiedLiveLocs = useMemo(() => {
    const trackingIds = new Set(
      allWorkers.filter((w) => w.isTracking).map((w) => String(w.id)),
    );
    return liveWorkerLocs.filter((l) => trackingIds.has(String(l.workerId)));
  }, [allWorkers, liveWorkerLocs]);

  const assignableWorkers = useMemo(() => {
    if (hasWorker) {
      return workers;
    }
    if (isRejectSelected) {
      return [] as Worker[];
    }
    const allActive = allWorkers.filter((w) => w.active);
    const rlat = Number(report.lat);
    const rlng = Number(report.lng);

    if (verifiedLiveLocs.length === 0) {
      return [];
    }
    if (!Number.isFinite(rlat) || !Number.isFinite(rlng)) {
      return filterToLiveActiveWorkers(allActive, verifiedLiveLocs);
    }
    return orderActiveWorkersByProximity(allActive, verifiedLiveLocs, rlat, rlng, 5);
  }, [hasWorker, workers, isRejectSelected, allWorkers, verifiedLiveLocs, report.lat, report.lng]);
  
  // ✅ Get assigned worker details from ALL workers (including inactive)
  const assignedWorker = hasWorker ? allWorkers.find(w => w.id === report.workerId) : null;
  
  // ✅ Fetch ALL workers (including inactive) to show assigned worker
  useEffect(() => {
    const fetchWorkers = async () => {
      try {
        setFetchingWorkers(true);
        console.log('📋 Fetching workers for modal.. .');
        
        // ✅ Fetch ALL workers (no active filter)
        const allWorkersResponse = await workerService.getWorkers();
        
        const mappedAllWorkers:  Worker[] = [];
        if (allWorkersResponse.results) {
          for (const backendWorker of allWorkersResponse.results) {
            try {
              mappedAllWorkers.push(mapWorkerFromBackend(backendWorker));
            } catch (err) {
              console.error('Failed to map worker:', err);
            }
          }
        }
        
        console.log(`✅ Fetched ${mappedAllWorkers.length} total workers`);
        setAllWorkers(mappedAllWorkers);
        setIsBackendConnected(true); // ✅ Mark backend as connected
        
        // ✅ Filter active workers for assignment
        const activeWorkers = mappedAllWorkers.filter(w => w.active);
        const scopedWorkers = getAssignableWorkers(activeWorkers);
        console.log(`✅ Found ${activeWorkers.length} active workers (${scopedWorkers.length} assignable)`);
        setWorkers(scopedWorkers);
        
      } catch (error) {
        console.error('❌ Failed to fetch workers:', error);
        setIsBackendConnected(false); // ✅ Mark backend as disconnected
      } finally {
        setFetchingWorkers(false);
      }
    };

    fetchWorkers();
  }, []);

  useEffect(() => {
    if (!hasWorkerScopeFilter) return;
    const activeWorkers = allWorkers.filter((w) => w.active);
    setWorkers(getAssignableWorkers(activeWorkers));
  }, [providedWorkers, allWorkers]);

  useEffect(() => {
    return subscribeLiveWorkerLocations(setLiveWorkerLocs);
  }, []);

  useEffect(() => {
    if (isUnassigned && selectedStatus !== 'Assigned' && selectedStatus !== 'Rejected') {
      setSelectedStatus('Assigned');
    }
  }, [isUnassigned, report.id, selectedStatus]);

  useEffect(() => {
    if (isResolved) return;
    if (assignableWorkers.length === 0) return;
    if (!selectedWorker) return;
    if (!assignableWorkers.some((w) => w.id === selectedWorker)) {
      setSelectedWorker('');
    }
  }, [assignableWorkers, selectedWorker, isResolved, report.id]);
  
  const handleAssign = async () => {
    if (isRejectSelected) return;
    if (!selectedWorker) return;
    
    // ✅ Check if selected worker is active
    const worker = allWorkers.find(w => w.id === selectedWorker);
    
    if (!worker) {
      setErrorTitle('Worker Not Found');
      setDialogMessage('The selected worker could not be found. Please try again.');
      setShowErrorDialog(true);
      return;
    }
    
    if (! worker.active) {
      setErrorTitle('Worker Inactive');
      setDialogMessage(`${worker.name} is currently inactive. Please select an active worker to assign this report.`);
      setShowErrorDialog(true);
      return;
    }
    
    setLoading(true);
    try {
      console.log(`📋 ${hasWorker ? 'Reassigning' : 'Assigning'} report ${report.id} to worker ${selectedWorker}`);
      
      // ✅ Assign worker
      await onAssign(report.id, selectedWorker);
      
      // ✅ Automatically update status to "Assigned" if currently "Pending"
      if (report.status === 'Pending') {
        console.log('🔄 Auto-updating status to Assigned');
        await onOverrideStatus(report.id, 'Assigned');
      }
      
      // ✅ Refetch workers to update task counts
      await refetchWorkers();
      
      // ✅ Show success dialog
      if (hasWorker) {
        setDialogMessage(`Report successfully reassigned to ${worker.name}!`);
      } else {
        setDialogMessage(`Report successfully assigned to ${worker.name}!  Status updated to "Assigned". `);
      }
      setShowSuccessDialog(true);
      
    } catch (error:  any) {
      console.error('❌ Failed to assign worker:', error);
      setErrorTitle('Assignment Failed');
      setDialogMessage(error.message || 'Failed to assign worker. Please try again.');
      setShowErrorDialog(true);
    } finally {
      setLoading(false);
    }
  };
  
  const handleStatusChange = async () => {
    if (selectedStatus === report.status) return;
    if (isUpdateStatusDisabledUnassigned) return;
    
    setLoading(true);
    try {
      console.log(`🔄 Updating report ${report.id} status to ${selectedStatus}`);
      await onOverrideStatus(report.id, selectedStatus);
      
      // ✅ Show success dialog
      setDialogMessage(`Report status updated to "${selectedStatus}" successfully!`);
      setShowSuccessDialog(true);
      
    } catch (error: any) {
      console.error('❌ Failed to update status:', error);
      setErrorTitle('Status Update Failed');
      setDialogMessage(error.message || 'Failed to update status. Please try again.');
      setShowErrorDialog(true);
    } finally {
      setLoading(false);
    }
  };
  
  const handleAiVerification = async () => {
    if (!report.beforeImage) return;
    setIsDetecting(true);
    setAiDetectionVerification(null);
    setShowAiDetectionModal(true);

    const cacheKey = `ai-verify-v3-20-${report.id}`;
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const verification = JSON.parse(cached) as AiVerificationPayload;
        setAiDetectionVerification(verification);
        return;
      }

      const result = await reportService.verifyWasteForReport(report.id);
      const verification = (result.ai_verification || result) as AiVerificationPayload;
      setAiDetectionVerification(verification);
      if (verification) {
        sessionStorage.setItem(cacheKey, JSON.stringify(verification));
      }
    } catch (error: unknown) {
      setShowAiDetectionModal(false);
      const message =
        error instanceof Error ? error.message : 'AI detection failed. Please try again.';
      setErrorTitle('AI detection failed');
      setDialogMessage(message);
      setShowErrorDialog(true);
    } finally {
      setIsDetecting(false);
    }
  };
  
  useEffect(() => {
    setSelectedStatus(toModalReportStatus(report.status));
    setSelectedWorker(report.workerId || '');
  }, [report.id, report.status, report.workerId]);

  // ✅ Debug logging
  useEffect(() => {
    console.log('🔍 Debug Report Details:', {
      reportId: report.id,
      workerId: report.workerId,
      workerName: report.workerName,
      hasWorker,
      assignedWorker,
      allWorkersCount: allWorkers.length,
      activeWorkersCount: assignableWorkers.length
    });
  }, [report, hasWorker, assignedWorker, allWorkers, assignableWorkers]);
  
  return (
    <>
      {/* ✅ Success Dialog */}
      {showSuccessDialog && (
        <SuccessDialog 
          message={dialogMessage}
          onClose={() => {
            setShowSuccessDialog(false);
            onReportUpdated?.();
            onClose();
          }}
        />
      )}
      
      {/* ✅ Error Dialog */}
      {showErrorDialog && (
        <ErrorDialog 
          title={errorTitle}
          message={dialogMessage}
          onClose={() => setShowErrorDialog(false)}
        />
      )}
      
      {/* ✅ AI Image Modal */}
      {showAiImageModal && (
        <AiImageModal 
          image={report.aiVerifiedImage}
          isVerified={report.aiVerification.verified}
          onClose={() => setShowAiImageModal(false)}
        />
      )}
      
      <ReportAiDetectionModal
        open={showAiDetectionModal}
        imagePreview={report.beforeImage}
        verification={aiDetectionVerification}
        loading={isDetecting}
        passed={
          aiDetectionVerification?.passed ??
          report.aiVerification.verified
        }
        showPercentOnImage={false}
        onClose={() => setShowAiDetectionModal(false)}
      />
      
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-700 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
          {/* Header */}
          <div className="sticky top-0 bg-gradient-to-r from-slate-900/95 to-slate-800/95 backdrop-blur-sm border-b border-slate-700 px-6 py-6 flex items-center justify-between">
            <div className="flex-1">
              <h2 className="text-3xl font-bold text-white">📋 Report Details</h2>
              <div className="flex items-center gap-3 mt-4">
                <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500/25 to-teal-500/25 border border-emerald-500/50 rounded-xl hover:border-emerald-500/80 transition-all hover:shadow-lg hover:shadow-emerald-500/10">
                  <span className="text-xs font-semibold text-emerald-300 tracking-widest">🔑 REPORT ID</span>
                  <span className="text-sm font-mono font-bold text-emerald-300">{report.id}</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(report.id);
                    }}
                    className="ml-2 p-1 hover:bg-emerald-500/20 rounded transition-all"
                    title="Copy to clipboard"
                  >
                    <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
                <div className="text-xs text-slate-500 font-medium">
                  Created: {report.submittedAt?.toLocaleDateString()}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={loading}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Content */}
          <div className="p-6 space-y-6">
            {/* ✅ Assigned Worker Info */}
            {hasWorker && !fetchingWorkers && (
              <div className={`p-5 border rounded-2xl transition-all ${
                assignedWorker?.active 
                  ? 'bg-gradient-to-br from-emerald-500/15 to-teal-500/10 border-emerald-500/40 shadow-lg shadow-emerald-500/10' 
                  : 'bg-gradient-to-br from-amber-500/15 to-orange-500/10 border-amber-500/40 shadow-lg shadow-amber-500/10'
              }`}>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                      assignedWorker?.active 
                        ? 'bg-emerald-500/20' 
                        : 'bg-amber-500/20'
                    }`}>
                      {assignedWorker?.active ? (
                        <UserCheck className="w-6 h-6 text-emerald-400" />
                      ) : (
                        <AlertCircle className="w-6 h-6 text-amber-400" />
                      )}
                    </div>
                    <div>
                      <p className={`text-sm font-semibold ${
                        assignedWorker?.active ? 'text-emerald-400' : 'text-amber-400'
                      }`}>
                        Assigned to
                      </p>
                      <p className="text-white font-bold text-lg">
                        {assignedWorker?.name || report.workerName || 'Unknown Worker'}
                      </p>
                      {assignedWorker && (
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className={`text-xs px-2 py-1 rounded border ${
                            assignedWorker.active 
                              ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300' 
                              : 'bg-amber-500/20 border-amber-500/30 text-amber-300'
                          }`}>
                            {assignedWorker.active ? '✓ Active' : '⚠️ Inactive'}
                          </span>
                          <div className="flex items-center gap-1 px-3 py-1 bg-slate-800/50 border border-slate-700/50 rounded-lg hover:border-slate-600 transition-all group cursor-default">
                            <span className="text-xs font-semibold text-slate-400 tracking-wider">WORKER ID</span>
                            <span className="text-xs font-mono font-bold text-slate-300">{report.workerId}</span>
                            <button
                              onClick={() => navigator.clipboard.writeText(report.workerId || '')}
                              className="ml-1 p-0.5 hover:bg-slate-700 rounded opacity-0 group-hover:opacity-100 transition-all"
                              title="Copy to clipboard"
                            >
                              <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            </button>
                          </div>
                          {assignedWorker.rating && (
                            <span className="text-xs px-2 py-1 bg-slate-800/50 border border-slate-700/50 rounded-lg text-slate-300 font-medium">⭐ {assignedWorker.rating.toFixed(1)}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {assignedWorker?.active && (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                    )}
                    {!isResolved && (
                      <button
                        type="button"
                        onClick={() => setShowReassign(true)}
                        disabled={isRejectSelected}
                        className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-all flex items-center gap-1.5 border border-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <RefreshCw className="w-4 h-4" />
                        <span>Change</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {/* ✅ Resolved Status Notice */}
            {isResolved && (
              <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/15 border border-green-500/40 rounded-2xl p-5 shadow-lg shadow-green-500/10">
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500/30 to-emerald-500/20 flex items-center justify-center shadow-lg shadow-green-500/20">
                      <CheckCircle2 className="w-6 h-6 text-green-300" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-green-300 font-bold text-lg">✅ Report Resolved</h3>
                    <p className="text-green-300/75 text-sm mt-1">
                      This report has been marked as resolved. Status and worker assignment cannot be changed.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Images */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-3">
                <label className="block text-sm font-semibold text-slate-300 flex items-center gap-2">📸 Before Image</label>
                <div className="relative group rounded-xl overflow-hidden border-2 border-slate-700 hover:border-emerald-500/50 transition-all">
                  <ImageWithFallback
                    src={report.beforeImage}
                    alt="Before"
                    className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                {/* AI Verify Button */}
                <button
                  type="button"
                  onClick={handleAiVerification}
                  disabled={isDetecting}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-slate-600 bg-slate-800/90 hover:bg-slate-800 hover:border-emerald-500/40 text-slate-200 text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDetecting ? (
                    <>
                      <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
                      <span>Running AI detection...</span>
                    </>
                  ) : (
                    <>
                      <ScanSearch className="w-4 h-4 text-emerald-400" />
                      <span>View AI waste detections</span>
                    </>
                  )}
                </button>
              </div>
              {report.afterImage && (
                <div className="space-y-3">
                  <label className="block text-sm font-semibold text-slate-300 flex items-center gap-2">✨ After Image</label>
                  <div className="relative group rounded-xl overflow-hidden border-2 border-slate-700 hover:border-teal-500/50 transition-all">
                    <ImageWithFallback
                      src={report.afterImage}
                      alt="After"
                      className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                </div>
              )}
              {report.aiVerifiedImage && isBackendConnected && (
                <div>
                  <label className="block text-sm text-slate-400 mb-2">
                    <span className="inline-block flex items-center gap-2">
                      🤖 AI Analysis Image
                      {report.aiVerification.verified ? (
                        <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded border border-emerald-500/30">Verified</span>
                      ) : (
                        <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-1 rounded border border-amber-500/30">Review Needed</span>
                      )}
                    </span>
                  </label>
                  <button
                    onClick={() => setShowAiImageModal(true)}
                    className="w-full h-64 overflow-hidden rounded-lg border border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 hover:border-emerald-500/50 transition-all cursor-pointer group relative"
                  >
                    <ImageWithFallback
                      src={report.aiVerifiedImage}
                      alt="AI Analysis"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="bg-emerald-500/90 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
                          <span>🔍 View Full Size</span>
                        </div>
                      </div>
                    </div>
                  </button>
                </div>
              )}
              {report.aiVerifiedImage && !isBackendConnected && (
                <div className="col-span-1 md:col-span-2">
                  <div className="px-4 py-4 bg-slate-800/50 border border-slate-700 rounded-lg flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />
                    <div>
                      <p className="text-amber-400 font-medium text-sm">Backend Not Connected</p>
                      <p className="text-amber-300/70 text-xs mt-1">AI verified image is available but backend connection is required to display it.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                {/* Citizen Info Card */}
                <div className="p-4 bg-gradient-to-br from-slate-800/50 to-slate-900/30 border border-slate-700/50 rounded-xl hover:border-slate-600 transition-all">
                  <label className="block text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                    <User className="w-5 h-5 text-emerald-400" />
                    Submitted By
                  </label>
                  <p className="text-white font-semibold text-lg">{report.citizenName}</p>
                  <p className="text-xs text-slate-400 mt-1 font-mono">
                    {(report.reportSource === 'admin' || !report.citizenId
                      ? report.createdByAdminId
                        ? `Admin ID: ${report.createdByAdminId}`
                        : 'Admin-created task (no citizen)'
                      : `Citizen ID: ${report.citizenId}`)}
                  </p>
                </div>
                
                {/* Location Card */}
                <div className="p-4 bg-gradient-to-br from-slate-800/50 to-slate-900/30 border border-slate-700/50 rounded-xl hover:border-slate-600 transition-all">
                  <label className="block text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-emerald-400" />
                    Location
                  </label>
                  <p className="text-white font-semibold">{report.location}</p>
                  <p className="text-sm text-slate-400 mt-1">Zone: {report.zone}</p>
                </div>
                
                {/* Timeline Card */}
                <div className="p-4 bg-gradient-to-br from-slate-800/50 to-slate-900/30 border border-slate-700/50 rounded-xl hover:border-slate-600 transition-all">
                  <label className="block text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-emerald-400" />
                    Timeline
                  </label>
                  <div className="space-y-2 text-sm">
                    <p className="text-slate-200">
                      <span className="text-slate-400">📝 Submitted:</span> {report.submittedAt.toLocaleString()}
                    </p>
                    {report.assignedAt && (
                      <p className="text-slate-200">
                        <span className="text-slate-400">📋 Assigned:</span> {report.assignedAt.toLocaleString()}
                      </p>
                    )}
                    {report.resolvedAt && (
                      <p className="text-emerald-200">
                        <span className="text-emerald-400">✅ Resolved:</span> {report.resolvedAt.toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                {/* Waste Type Card */}
                <div className="p-4 bg-gradient-to-br from-slate-800/50 to-slate-900/30 border border-slate-700/50 rounded-xl hover:border-slate-600 transition-all">
                  <label className="block text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                    🗑️ Waste Type
                  </label>
                  <p className="text-white font-semibold text-lg">{report.wasteType}</p>
                </div>
                
                {/* Description Card */}
                <div className="p-4 bg-gradient-to-br from-slate-800/50 to-slate-900/30 border border-slate-700/50 rounded-xl hover:border-slate-600 transition-all">
                  <label className="block text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                    💬 Description
                  </label>
                  <p className="text-slate-200 text-sm leading-relaxed">{report.description}</p>
                </div>
              </div>
            </div>

            {/* AI Verification & Urgency Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-slate-700">
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                  🤖 AI Verification
                </label>
                  {!isBackendConnected ? (
                    <div className="px-4 py-3 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                      <p className="text-amber-300 text-xs">Backend required for AI verification data</p>
                    </div>
                  ) : report.aiVerification.verified ?  (
                    <div 
                      onClick={() => report.aiVerifiedImage && setShowAiImageModal(true)}
                      className={`space-y-2 ${report.aiVerifiedImage ? 'cursor-pointer' : ''}`}
                    >
                      <div className={`flex items-center gap-2 text-green-500 ${report.aiVerifiedImage ? 'hover:text-green-400 transition-colors' : ''}`}>
                        <CheckCircle2 className="w-5 h-5" />
                        <span>Verified ({report.aiVerification.confidence. toFixed(1)}% confidence)</span>
                      </div>
                      {report.aiVerifiedImage && (
                        <p className="text-xs text-slate-400 hover:text-slate-300 transition-colors">
                          💾 Click to view AI analysis image
                        </p>
                      )}
                    </div>
                  ) : (
                    <div 
                      onClick={() => report.aiVerifiedImage && setShowAiImageModal(true)}
                      className={`space-y-2 ${report.aiVerifiedImage ? 'cursor-pointer' : ''}`}
                    >
                      <div className={`flex items-center gap-2 text-amber-500 ${report.aiVerifiedImage ? 'hover:text-amber-400 transition-colors' : ''}`}>
                        <AlertCircle className="w-5 h-5" />
                        <span>Needs Review ({report.aiVerification.confidence. toFixed(1)}% confidence)</span>
                      </div>
                      {report.aiVerifiedImage && (
                        <p className="text-xs text-amber-400 hover:text-amber-300 transition-colors">
                          🤖 Click to review AI analysis image
                        </p>
                      )}
                    </div>
                  )}
                </div>
                
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                  ⚡ Urgency Level
                </label>
                <div className="p-4 bg-gradient-to-br from-slate-800/50 to-slate-900/30 border border-slate-700/50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden shadow-inner">
                        <div 
                          className="h-full bg-gradient-to-r from-yellow-500 via-orange-500 to-red-600 rounded-full shadow-lg"
                          style={{ width: `${report.urgency * 10}%` }}
                        ></div>
                      </div>
                    </div>
                    <span className="text-white font-bold text-lg min-w-max">{report.urgency}/10</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-2">{report.urgency <= 3 ? 'Low' : report.urgency <= 6 ? 'Medium' : report.urgency <= 8 ? 'High' : 'Critical'} Priority</p>
                </div>
              </div>
            </div>
            
            {/* ✅ Assignment & Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-slate-700">
              {/* ✅ Worker Assignment Section */}
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
                  👷 Worker Assignment
                </label>
                
                {/* ✅ Loading state */}
                {fetchingWorkers ?  (
                  <div className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-400 flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                    <span>Loading workers...</span>
                  </div>
                ) : (
                  <>
                    {/* ✅ Show assigned worker info */}
                    {hasWorker && ! showReassign ? (
                      <div className="space-y-3">
                        {/* Current Worker Card */}
                        <div className={`px-4 py-3 border rounded-xl ${
                          assignedWorker?.active 
                            ? 'bg-emerald-500/10 border-emerald-500/30' 
                            : 'bg-red-500/10 border-red-500/30'
                        }`}>
                          <div className="flex items-center gap-3">
                            <div className="flex-shrink-0">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                assignedWorker?.active 
                                  ? 'bg-emerald-500/20' 
                                  : 'bg-red-500/20'
                              }`}>
                                {assignedWorker?.active ? (
                                  <UserCheck className="w-5 h-5 text-emerald-400" />
                                ) : (
                                  <UserX className="w-5 h-5 text-red-400" />
                                )}
                              </div>
                            </div>
                            <div className="flex-1">
                              <p className="text-white font-medium">
                                {assignedWorker?.name || report.workerName || 'Unknown Worker'}
                              </p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className={`text-xs px-2 py-1 rounded border ${
                                assignedWorker?.active 
                                  ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300' 
                                  : 'bg-red-500/20 border-red-500/30 text-red-300'
                              }`}>
                                {assignedWorker ?  (
                                  assignedWorker.active ? '✓ Active' : '✗ Inactive'
                                ) : (
                                  'Status Unknown'
                                )}
                              </span>
                              <div className="flex items-center gap-1 px-3 py-1 bg-slate-800/50 border border-slate-700/50 rounded-lg hover:border-slate-600 transition-all group cursor-default">
                                <span className="text-xs font-semibold text-slate-400 tracking-wider">WORKER ID</span>
                                <span className="text-xs font-mono font-bold text-slate-300">{report.workerId}</span>
                                <button
                                  onClick={() => navigator.clipboard.writeText(report.workerId || '')}
                                  className="ml-1 p-0.5 hover:bg-slate-700 rounded opacity-0 group-hover:opacity-100 transition-all"
                                  title="Copy to clipboard"
                                >
                                  <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                            </div>
                            {assignedWorker?.active && (
                              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                            )}
                          </div>
                        </div>
                        
                        {/* ✅ Warning if worker is inactive */}
                        {assignedWorker && !assignedWorker.active && ! isResolved && (
                          <div className="px-4 py-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                            <div className="flex items-start gap-2">
                              <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                              <p className="text-amber-300 text-xs">
                                This worker is currently inactive. Consider reassigning to an active worker.
                              </p>
                            </div>
                          </div>
                        )}
                        
                        {/* ✅ Warning if worker not found */}
                        {! assignedWorker && (
                          <div className="px-4 py-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                            <div className="flex items-start gap-2">
                              <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                              <p className="text-amber-300 text-xs">
                                Worker details not found. The worker may have been deleted. 
                              </p>
                            </div>
                          </div>
                        )}
                        
                        {/* ✅ Reassign Button */}
                        {!isResolved && (
                          <button
                            type="button"
                            onClick={() => setShowReassign(true)}
                            disabled={isRejectSelected}
                            className="w-full px-4 py-3 bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 text-white rounded-xl transition-all flex items-center justify-center gap-2 border border-slate-600 hover:border-emerald-500/50 hover:shadow-lg hover:shadow-slate-700/50 font-semibold group disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none"
                          >
                            <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-300" />
                            <span>Reassign to Another Worker</span>
                          </button>
                        )}
                        
                        {/* ✅ Locked message if resolved */}
                        {isResolved && (
                          <div className="px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg flex items-center gap-2">
                            <Lock className="w-4 h-4 text-slate-400" />
                            <p className="text-slate-400 text-xs">
                              Worker assignment locked (report resolved)
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      // ✅ Show worker dropdown
                      <>
                        {/* Show current worker when reassigning */}
                        {hasWorker && showReassign && (
                          <div className="mb-3 px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg">
                            <p className="text-xs text-slate-400 mb-1">Currently assigned to:</p>
                            <p className="text-white text-sm font-medium">
                              {assignedWorker?.name || report.workerName || 'Unknown Worker'}
                            </p>
                          </div>
                        )}

                        {isUnassigned && !isRejectSelected && Number.isFinite(Number(report.lat)) && Number.isFinite(Number(report.lng)) && !fetchingWorkers && liveWorkerLocs.length > 0 && (
                          <p className="text-xs text-slate-500 mb-2">
                            We show workers within 5 km of this report first. If none are available there, we list the nearest workers who are live on the map right now. Only workers sharing a live location are shown—not every worker marked active in the system.
                          </p>
                        )}
                        {isUnassigned && !isRejectSelected && !fetchingWorkers && liveWorkerLocs.length === 0 && (
                          <p className="text-xs text-amber-500/90 mb-2">
                            Abhi koi live location nahi a rahi; list purani tarah (sab active) dikha di gayi. Firebase theek hote hi sirf online wale dikhenge.
                          </p>
                        )}
                        
                        <select
                          value={selectedWorker}
                          onChange={(e) => setSelectedWorker(e.target.value)}
                          disabled={loading || assignableWorkers.length === 0 || isResolved || isRejectSelected}
                          className="w-full px-4 py-3 bg-slate-800/70 border-2 border-slate-700 hover:border-emerald-500/50 rounded-xl text-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
                        >
                          <option value="">
                            {assignableWorkers.length === 0 ? 'No active workers available' : 'Select an active worker... '}
                          </option>
                          {assignableWorkers.map((worker) => (
                            <option key={worker.id} value={worker.id}>
                              {worker.name} - ⭐ {worker.rating.toFixed(1)} - {worker.tasksCompleted} tasks
                            </option>
                          ))}
                        </select>
                        
                        <div className="flex gap-2 mt-3">
                          {showReassign && (
                            <button
                              onClick={() => {
                                setShowReassign(false);
                                setSelectedWorker(report.workerId || '');
                              }}
                              disabled={loading}
                            className="flex-1 px-4 py-3 bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 border border-slate-600 hover:border-slate-500 hover:shadow-lg hover:shadow-slate-700/50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Cancel
                            </button>
                          )}
                          
                          <button
                            type="button"
                            onClick={handleAssign}
                            disabled={
                              loading ||
                              !selectedWorker ||
                              isResolved ||
                              (hasWorker && selectedWorker === report.workerId) ||
                              isRejectSelected
                            }
                            className={`${showReassign ? 'flex-1' : 'w-full'} px-4 py-3 bg-gradient-to-br from-emerald-500 via-emerald-500 to-teal-600 hover:from-emerald-400 hover:via-emerald-400 hover:to-teal-500 text-white font-semibold rounded-xl hover:shadow-2xl hover:shadow-emerald-500/40 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed border border-emerald-400/60 hover:border-emerald-300/80 relative overflow-hidden group`}
                          >
                            <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/0 via-white/10 to-emerald-400/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            <span className="relative flex items-center justify-center gap-2">
                              {loading ? (
                                <>
                                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                  {showReassign ? 'Reassigning...' : 'Assigning...'}
                                </>
                              ) : (
                                <>
                                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-1-11a1 1 0 112 0 1 1 0 01-2 0zM8.5 9a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0z" clipRule="evenodd"/></svg>
                                  {showReassign ? 'Reassign Worker' : 'Assign Worker'}
                                </>
                              )}
                            </span>
                          </button>
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
              
              {/* ✅ Status Section */}
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
                  📊 Report Status
                </label>
                
                {isResolved ? (
                  <div className="space-y-3">
                    <div className="px-4 py-3 bg-green-500/10 border border-green-500/30 rounded-xl">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-green-400" />
                        <span className="text-white font-medium">✅ Resolved</span>
                      </div>
                    </div>
                    
                    <div className="px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg flex items-center gap-2">
                      <Lock className="w-4 h-4 text-slate-400" />
                      <p className="text-slate-400 text-xs">
                        Status cannot be changed (report resolved)
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <select
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value as ModalReportStatus)}
                      disabled={loading}
                      className="w-full px-4 py-3 bg-slate-800/70 border-2 border-slate-700 hover:border-teal-500/50 rounded-xl text-white focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
                    >
                      {isUnassigned ? (
                        <>
                          <option value="Assigned">📋 Assigned</option>
                          <option value="Rejected">❌ Rejected</option>
                        </>
                      ) : (
                        <>
                          <option value="Assigned">📋 Assigned</option>
                          <option value="In Progress">🔄 In Progress</option>
                          <option value="Rejected">❌ Rejected</option>
                        </>
                      )}
                    </select>
                    
                    <button
                      type="button"
                      onClick={handleStatusChange}
                      disabled={loading || selectedStatus === report.status || isUpdateStatusDisabledUnassigned}
                      className="w-full mt-4 px-4 py-3 bg-gradient-to-br from-teal-500 via-teal-600 to-emerald-600 hover:from-teal-400 hover:via-teal-500 hover:to-emerald-500 text-white font-semibold rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-2xl hover:shadow-teal-500/40 border border-teal-400/60 hover:border-teal-300/80 relative overflow-hidden group"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-teal-400/0 via-white/10 to-teal-400/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <span className="relative flex items-center justify-center gap-2">
                        {loading ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Updating Status...
                          </>
                        ) : (
                          <>
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"/></svg>
                            Update Status
                          </>
                        )}
                      </span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* ✅ No active workers warning */}
            {!fetchingWorkers && assignableWorkers.length === 0 && !hasWorker && !isResolved && !isRejectSelected && (
              <div className="bg-gradient-to-r from-amber-500/15 to-orange-500/10 border border-amber-500/40 rounded-xl p-5 text-center shadow-lg shadow-amber-500/10">
                <AlertCircle className="w-8 h-8 text-amber-400 mx-auto mb-3" />
                <p className="text-amber-300 font-bold mb-1">
                  No active workers available
                </p>
                <p className="text-amber-300/75 text-sm">
                  Please activate workers or add new ones to assign reports.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Animations */}
      <style>{`
        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform:  translateX(-10px); }
          50% { transform: translateX(10px); }
          75% { transform:  translateX(-10px); }
        }
        
        .animate-scale-in {
          animation: scale-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        
        . animate-shake {
          animation:  shake 0.5s ease-in-out;
        }
      `}</style>
    </>
  );
}