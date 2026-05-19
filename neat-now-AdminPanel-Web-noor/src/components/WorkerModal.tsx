import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { 
  X, 
  Camera, 
  Upload, 
  User, 
  Mail, 
  Phone, 
  Lock, 
  AlertCircle, 
  Loader2, 
  CheckCircle, 
  XCircle, 
  Info, 
  Trash2,
  PartyPopper,
  UserPlus,
  UserCheck,
  Briefcase
} from 'lucide-react';
import type { Worker } from '../types/worker';
import { resolveMediaUrl } from '../utils/resolveMediaUrl';

interface WorkerModalProps {
  worker: Worker | null;
  onClose: () => void;
  onSave: (worker:  Partial<Worker> & { password?: string; profileImage?: File }) => Promise<void>;
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

  if (!mounted) return null;

  return ReactDOM.createPortal(children, document.body);
}

// ============================================
// CONFIRMATION DIALOG COMPONENT
// ============================================
interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmText?:  string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  onConfirm:  () => void;
  onCancel: () => void;
}

function ConfirmDialog({ 
  title, 
  message, 
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'warning',
  onConfirm, 
  onCancel 
}: ConfirmDialogProps) {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const styles = {
    danger: {
      icon: <AlertCircle className="w-12 h-12 text-red-500" />,
      button: 'bg-red-500 hover:bg-red-600',
      iconBg: 'bg-red-500/10'
    },
    warning: {
      icon: <AlertCircle className="w-12 h-12 text-amber-500" />,
      button: 'bg-amber-500 hover:bg-amber-600',
      iconBg: 'bg-amber-500/10'
    },
    info:  {
      icon: <Info className="w-12 h-12 text-blue-500" />,
      button: 'bg-blue-500 hover:bg-blue-600',
      iconBg: 'bg-blue-500/10'
    }
  };

  return (
    <Portal>
      <div 
        className="fixed inset-0 flex items-center justify-center p-4"
        style={{ 
          zIndex: 99999,
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(8px)'
        }}
        onClick={onCancel}
      >
        <div 
          className="bg-slate-900 border-2 border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl"
          style={{
            animation: 'scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }}
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
                className="flex-1 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl transition-all border-2 border-slate-700 hover:border-slate-600"
              >
                {cancelText}
              </button>
              <button
                onClick={onConfirm}
                className={`flex-1 px-6 py-3 ${styles[type].button} text-white font-semibold rounded-xl transition-all shadow-lg`}
              >
                {confirmText}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
}

// ============================================
// ENHANCED SUCCESS DIALOG COMPONENT
// ============================================
interface SuccessDialogProps {
  title: string;
  message: string;
  workerName?: string;
  workerEmail?: string;
  workerPhone?: string;
  isEdit?: boolean;
  onClose:  () => void;
}

function SuccessDialog({ 
  title, 
  message, 
  workerName,
  workerEmail,
  workerPhone,
  isEdit = false,
  onClose 
}: SuccessDialogProps) {
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    
    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    const timer = setTimeout(onClose, 3000);
    
    return () => {
      clearTimeout(timer);
      clearInterval(countdownInterval);
      document.body.style.overflow = 'unset';
    };
  }, [onClose]);

  return (
    <Portal>
      <div 
        className="fixed inset-0 flex items-center justify-center p-4"
        style={{ 
          zIndex: 99999,
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(8px)'
        }}
        onClick={onClose}
      >
        <div 
          className="bg-slate-900 border-2 border-emerald-500/50 rounded-2xl max-w-md w-full p-8 shadow-2xl"
          style={{
            animation: 'successPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-6">
              <div 
                className="absolute inset-0 bg-emerald-500/20 rounded-full"
                style={{ animation: 'pingSuccess 2s ease-in-out infinite' }}
              ></div>
              <div 
                className="relative w-24 h-24 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30"
                style={{ animation: 'bounceIn 0.5s ease-out' }}
              >
                {isEdit ? (
                  <UserCheck className="w-12 h-12 text-white" />
                ) : (
                  <UserPlus className="w-12 h-12 text-white" />
                )}
              </div>
              
              <div className="absolute -top-2 -left-2" style={{ animation: 'floatUp 1s ease-out forwards' }}>
                <PartyPopper className="w-6 h-6 text-yellow-400" />
              </div>
              <div className="absolute -top-2 -right-2" style={{ animation: 'floatUp 1s ease-out 0.1s forwards' }}>
                <span className="text-2xl">🎉</span>
              </div>
            </div>

            <h3 className="text-2xl font-bold text-white mb-2">{title}</h3>
            <p className="text-slate-400 mb-6">{message}</p>

            {(workerName || workerEmail) && (
              <div className="w-full bg-slate-800/50 rounded-xl p-4 mb-6 text-left border border-slate-700/50">
                <div className="flex items-center gap-2 mb-3">
                  <Briefcase className="w-5 h-5 text-emerald-400" />
                  <span className="text-sm font-medium text-white">Worker Details</span>
                </div>
                
                <div className="space-y-2">
                  {workerName && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-slate-400" />
                        <span className="text-sm text-slate-400">Name: </span>
                      </div>
                      <span className="text-sm text-white font-medium">{workerName}</span>
                    </div>
                  )}
                  
                  {workerEmail && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-slate-400" />
                        <span className="text-sm text-slate-400">Email:</span>
                      </div>
                      <span className="text-sm text-emerald-400 font-mono text-xs">{workerEmail}</span>
                    </div>
                  )}
                  
                  {workerPhone && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-slate-400" />
                        <span className="text-sm text-slate-400">Phone:</span>
                      </div>
                      <span className="text-sm text-white">{workerPhone}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between pt-2 border-t border-slate-700/50">
                    <span className="text-sm text-slate-400">Status:</span>
                    <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs font-medium rounded-full">
                      {isEdit ? 'Updated' : 'Active'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 text-slate-500 text-sm mb-4">
              <div className="relative w-5 h-5">
                <svg className="w-5 h-5 transform -rotate-90">
                  <circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-700" />
                  <circle
                    cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth="2"
                    className="text-emerald-500"
                    strokeDasharray={`${(countdown / 3) * 50.26} 50.26`}
                    style={{ transition: 'stroke-dasharray 1s linear' }}
                  />
                </svg>
              </div>
              <span>Closing in {countdown}s... </span>
            </div>

            <button
              onClick={onClose}
              className="w-full px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold rounded-xl hover:shadow-xl hover:shadow-emerald-500/30 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
            >
              Done
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes successPop {
          0% { opacity: 0; transform:  scale(0.8) translateY(20px); }
          50% { transform: scale(1.02); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes pingSuccess {
          0% { transform: scale(1); opacity: 0.3; }
          50% { transform: scale(1.3); opacity: 0; }
          100% { transform:  scale(1); opacity: 0.3; }
        }
        @keyframes bounceIn {
          0% { transform: scale(0); }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }
        @keyframes floatUp {
          0% { opacity: 0; transform: translateY(10px) rotate(-10deg); }
          50% { opacity: 1; }
          100% { opacity: 0; transform: translateY(-20px) rotate(10deg); }
        }
      `}</style>
    </Portal>
  );
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
    info: <Info className="w-5 h-5" />
  };

  const styles = {
    success: 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400',
    error: 'bg-red-500/20 border-red-500/50 text-red-400',
    warning: 'bg-amber-500/20 border-amber-500/50 text-amber-400',
    info: 'bg-blue-500/20 border-blue-500/50 text-blue-400'
  };

  return (
    <div 
      className={`${styles[toast.type]} border rounded-xl p-4 shadow-2xl backdrop-blur-sm flex items-start gap-3 min-w-[320px] max-w-md`}
      style={{ animation: 'slideInRight 0.3s ease-out' }}
    >
      <div className="flex-shrink-0 mt-0.5">
        {icons[toast.type]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm">{toast.message}</p>
        {toast.description && (
          <p className="text-sm opacity-90 mt-1">{toast.description}</p>
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
// CIRCULAR PROFILE IMAGE COMPONENT
// ============================================
interface CircularImageProps {
  src?:  string;
  alt:  string;
  fallback:  React.ReactNode;
  size?:  number;
}

function CircularImage({ src, alt, fallback, size = 120 }: CircularImageProps) {
  const [imageError, setImageError] = useState(false);
  const resolvedSrc = src ? resolveMediaUrl(src) : undefined;

  return (
    <div 
      className="rounded-full overflow-hidden bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-600 flex items-center justify-center border-4 border-slate-800 shadow-xl"
      style={{ 
        width: size, 
        height:  size,
        minWidth: size,
        minHeight: size,
        aspectRatio: '1 / 1'
      }}
    >
      {resolvedSrc && ! imageError ?  (
        <img
          src={resolvedSrc}
          alt={alt}
          onError={() => setImageError(true)}
          style={{ 
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center',
            display: 'block',
            borderRadius: '50%'
          }}
        />
      ) : (
        <div className="flex items-center justify-center w-full h-full">
          {fallback}
        </div>
      )}
    </div>
  );
}

// ============================================
// MAIN WORKER MODAL COMPONENT
// ============================================
export function WorkerModal({ worker, onClose, onSave }: WorkerModalProps) {
  const [formData, setFormData] = useState({
    name: worker?. name || '',
    email: worker?.email || '',
    phone: worker?.phone || '',
    password: ''
  });

  const [profileImage, setProfileImage] = useState<string>(worker?.image || '');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  
  const [confirmDialog, setConfirmDialog] = useState<{
    show: boolean;
    title: string;
    message: string;
    type: 'danger' | 'warning' | 'info';
    onConfirm: () => void;
  } | null>(null);
  
  const [successDialog, setSuccessDialog] = useState<{
    show: boolean;
    title: string;
    message: string;
    workerName?: string;
    workerEmail?: string;
    workerPhone?: string;
    isEdit?: boolean;
  } | null>(null);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style. overflow = 'unset';
    };
  }, []);

  const addToast = (type: ToastType, message: string, description?: string) => {
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

  const showWarning = (message: string, description?: string) => {
    addToast('warning', message, description);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name. trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name. trim().length < 3) {
      newErrors.name = 'Name must be at least 3 characters';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else {
      const email = formData.email.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        newErrors.email = 'Invalid email format';
      }
    }

    const normalizePakPhone = (raw: string): string | null => {
      const input = (raw || '').trim();
      if (!input) return null;

      const digits = input.replace(/\D/g, '');

      // +92XXXXXXXXXX => digits: 92 + 10 digits
      if (digits.startsWith('92') && digits.length === 12) {
        const normalized = '+92' + digits.slice(2);
        return /^\+92\d{10}$/.test(normalized) ? normalized : null;
      }

      // 0XXXXXXXXXX => digits: 0 + 10 digits
      if (digits.startsWith('0') && digits.length === 11) {
        const normalized = '+92' + digits.slice(1);
        return /^\+92\d{10}$/.test(normalized) ? normalized : null;
      }

      return null;
    };

    const phoneNormalized = normalizePakPhone(formData.phone);

    // Edit mode: phone must be provided and valid +92.
    if (worker) {
      if (!formData.phone.trim()) {
        newErrors.phone = 'Phone number is required';
      } else if (!phoneNormalized) {
        newErrors.phone = 'Phone must be in +92 format (e.g., +923001234567)';
      }
    } else {
      // Create mode: phone optional, but if present must be valid +92.
      if (formData.phone.trim() && !phoneNormalized) {
        newErrors.phone = 'Phone must be in +92 format (e.g., +923001234567)';
      }
    }

    if (! worker) {
      if (!formData.password) {
        newErrors.password = 'Password is required';
      } else if (formData.password.length < 8) {
        newErrors.password = 'Password must be at least 8 characters';
      } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
        newErrors.password = 'Must contain uppercase, lowercase, and number';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setErrors({ ...errors, image: 'Image must be less than 5MB' });
        showError('Image Too Large', 'Please select an image under 5MB');
        return;
      }

      if (! file.type.startsWith('image/')) {
        setErrors({ ...errors, image: 'Invalid file type' });
        showError('Invalid File Type', 'Please select a valid image file (JPG, PNG, GIF)');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImage(reader.result as string);
        setImageFile(file);
        setErrors({ ...errors, image: '' });
        showSuccess('Image Selected', `${file.name} ready to upload`);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setConfirmDialog({
      show: true,
      title: 'Remove Profile Photo? ',
      message: 'Are you sure you want to remove this profile photo?  This action cannot be undone.',
      type: 'warning',
      onConfirm:  () => {
        setProfileImage('');
        setImageFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        showSuccess('Photo Removed', 'Profile photo has been removed');
        setConfirmDialog(null);
      }
    });
  };

  const handleCloseWithRefresh = () => {
    console.log('🔄 Modal closing after successful save, triggering workers list refresh.. .');
    
    if (typeof (window as any).refreshWorkersList === 'function') {
      (window as any).refreshWorkersList();
    }
    
    onClose();
  };

  const handleSubmit = async (e: React. FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!validateForm()) {
      showWarning('Validation Failed', 'Please fix the errors in the form');
      return;
    }

    setLoading(true);

    try {
      const normalizePakPhone = (raw: string): string | null => {
        const input = (raw || '').trim();
        if (!input) return null;

        const digits = input.replace(/\D/g, '');

        if (digits.startsWith('92') && digits.length === 12) {
          const normalized = '+92' + digits.slice(2);
          return /^\+92\d{10}$/.test(normalized) ? normalized : null;
        }

        if (digits.startsWith('0') && digits.length === 11) {
          const normalized = '+92' + digits.slice(1);
          return /^\+92\d{10}$/.test(normalized) ? normalized : null;
        }

        return null;
      };

      const phoneNormalized = normalizePakPhone(formData.phone);

      const workerData:  Partial<Worker> & { password?: string; profileImage?: File } = {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: (phoneNormalized || undefined) as any,
      };

      if (formData.password) {
        workerData.password = formData. password;
      }

      // Edit mode mein profile photo update nahi karna (sirf name/phone).
      if (!worker && imageFile) {
        workerData.profileImage = imageFile;
      }

      console.log('📤 Submitting worker data.. .');
      
      await onSave(workerData);
      
      setSuccessDialog({
        show: true,
        title: worker ? 'Worker Updated!' : 'Worker Created! ',
        message: `${formData.name} has been ${worker ? 'updated' : 'added to your team'} successfully.`,
        workerName: formData.name. trim(),
        workerEmail:  formData.email.trim().toLowerCase(),
        workerPhone: formData.phone.trim() || undefined,
        isEdit: !!worker
      });
      
      setLoading(false);
      
    } catch (error:  any) {
      console.error('❌ Failed to save worker:', error);
      
      let errorMessage = 'Failed to save worker';
      let errorDescription = 'Please try again or contact support';
      
      if (error. message) {
        errorMessage = error.message;
        errorDescription = '';
      } else if (error. response?.data) {
        const data = error.response.data;
        
        if (typeof data === 'string') {
          errorMessage = data;
          errorDescription = '';
        } else if (data.error) {
          errorMessage = data.error;
          errorDescription = data.details || '';
        } else if (data.message) {
          errorMessage = data.message;
          errorDescription = data.detail || '';
        } else if (data.email) {
          errorMessage = 'Email Already Exists';
          errorDescription = Array.isArray(data.email) ? data.email[0] :  data.email;
        } else if (data.employee_code) {
          errorMessage = 'Employee Code Already Exists';
          errorDescription = Array.isArray(data.employee_code) ? data.employee_code[0] : data.employee_code;
        } else if (data.name) {
          errorMessage = 'Name Error';
          errorDescription = Array. isArray(data.name) ? data.name[0] : data.name;
        } else if (data.phone) {
          errorMessage = 'Phone Error';
          errorDescription = Array. isArray(data.phone) ? data.phone[0] : data.phone;
        } else if (data.password) {
          errorMessage = 'Password Error';
          errorDescription = Array.isArray(data.password) ? data.password[0] :  data.password;
        } else if (data.profile_image) {
          errorMessage = 'Image Upload Error';
          errorDescription = Array.isArray(data.profile_image) ? data.profile_image[0] : data.profile_image;
        }
      }
      
      setErrors({ submit: errorMessage });
      showError(errorMessage, errorDescription);
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    if (!name) return '? ';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <>
      {successDialog && successDialog.show && (
        <SuccessDialog
          title={successDialog.title}
          message={successDialog.message}
          workerName={successDialog.workerName}
          workerEmail={successDialog.workerEmail}
          workerPhone={successDialog. workerPhone}
          isEdit={successDialog.isEdit}
          onClose={handleCloseWithRefresh}
        />
      )}

      {confirmDialog && confirmDialog.show && (
        <ConfirmDialog
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmText="Yes, Remove"
          cancelText="Cancel"
          type={confirmDialog.type}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(null)}
        />
      )}

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

      <Portal>
        <div 
          className="fixed inset-0 flex items-center justify-center p-4"
          style={{ 
            zIndex: 9999,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)'
          }}
          onClick={onClose}
        >
          <div 
            className="bg-slate-900 border border-slate-700/50 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl"
            style={{ animation: 'scaleIn 0.3s ease-out' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 bg-gradient-to-r from-slate-900 via-slate-800/95 to-slate-900 backdrop-blur-sm border-b border-emerald-500/20 px-6 py-5 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"></div>
                  <h2 className="text-lg font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                    {worker ? 'Edit Worker' : 'Add New Worker'}
                  </h2>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {worker ? 'Update worker information' : 'Create a new worker account'}
                </p>
              </div>
              <button
                onClick={onClose}
                disabled={loading}
                className="p-2.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all disabled:opacity-50 hover:scale-110"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Profile Image Section with Enhanced Styling */}
              {!worker && (
              <div className="flex flex-col items-center pb-4 border-b border-slate-700/50">
                <div className="relative group">
                  <CircularImage
                    src={profileImage}
                    alt="Profile preview"
                    size={120}
                    fallback={
                      formData.name ?  (
                        <span className="text-white text-3xl font-bold">
                          {getInitials(formData. name)}
                        </span>
                      ) : (
                        <User className="w-12 h-12 text-white" />
                      )
                    }
                  />
                  
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 flex items-center justify-center bg-black/70 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    style={{ borderRadius: '50%' }}
                    aria-label="Upload photo"
                  >
                    <Camera className="w-8 h-8 text-white" />
                  </button>
                  
                  

                  {profileImage && (
                    <div 
                      className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 p-2 rounded-full cursor-pointer transition-all duration-200 border-4 border-slate-900 shadow-lg hover: scale-110 opacity-0 group-hover: opacity-100"
                      onClick={handleRemoveImage}
                    >
                      <Trash2 className="w-3. 5 h-3.5 text-white" />
                    </div>
                  )}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                  aria-label="Upload profile image"
                />

                <p className="text-xs text-slate-400 mt-3 text-center">
                  Click to upload profile photo
                  <br />
                  <span className="text-slate-500">(Max 5MB • JPG, PNG, GIF)</span>
                </p>
                
                {errors.image && (
                  <div 
                    className="mt-2 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg"
                    style={{ animation: 'shake 0.4s ease-in-out' }}
                  >
                    <p className="text-red-400 text-xs flex items-center gap-1.5">
                      <AlertCircle className="w-3. 5 h-3.5" />
                      {errors.image}
                    </p>
                  </div>
                )}
              </div>
              )}

              <div>
                <label htmlFor="name" className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
                  <User className="w-4 h-4 text-emerald-400" />
                  Full Name <span className="text-red-400">*</span>
                </label>
                <input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value });
                    if (errors.name) setErrors({ ...errors, name: '' });
                  }}
                  className={`w-full px-4 py-3 bg-slate-800/50 border ${
                    errors.name ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : 'border-slate-700 focus:border-emerald-500 focus:ring-emerald-500/20'
                  } rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition-all`}
                  placeholder="John Doe"
                  disabled={loading}
                />
                {errors.name && (
                  <p 
                    className="text-red-400 text-xs mt-2 flex items-center gap-1.5"
                    style={{ animation: 'shake 0.4s ease-in-out' }}
                  >
                    <AlertCircle className="w-3.5 h-3.5" />
                    {errors. name}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="email" className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
                  <Mail className="w-4 h-4 text-emerald-400" />
                  Email Address <span className="text-red-400">*</span>
                </label>
                <input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => {
                    setFormData({ ... formData, email: e.target.value });
                    if (errors.email) setErrors({ ...errors, email: '' });
                  }}
                  className={`w-full px-4 py-3 bg-slate-800/50 border ${
                    errors.email ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : 'border-slate-700 focus:border-emerald-500 focus:ring-emerald-500/20'
                  } rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition-all ${
                    worker ? 'opacity-60 cursor-not-allowed' : ''
                  }`}
                  placeholder="worker@cleanup.gov"
                  disabled={loading || !!worker}
                />
                {errors.email && (
                  <p 
                    className="text-red-400 text-xs mt-2 flex items-center gap-1.5"
                    style={{ animation: 'shake 0.4s ease-in-out' }}
                  >
                    <AlertCircle className="w-3.5 h-3.5" />
                    {errors.email}
                  </p>
                )}
                {worker && (
                  <p className="text-amber-400 text-xs mt-2 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5" />
                    Email cannot be changed
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="phone" className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
                  <Phone className="w-4 h-4 text-emerald-400" />
                  Phone Number
                </label>
                <input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => {
                    setFormData({ ...formData, phone: e. target.value });
                    if (errors.phone) setErrors({ ...errors, phone: '' });
                  }}
                  className={`w-full px-4 py-3 bg-slate-800/50 border ${
                    errors.phone ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' :  'border-slate-700 focus:border-emerald-500 focus:ring-emerald-500/20'
                  } rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition-all`}
                  placeholder="+92 300 1234567"
                  disabled={loading}
                />
                {errors.phone && (
                  <p 
                    className="text-red-400 text-xs mt-2 flex items-center gap-1.5"
                    style={{ animation: 'shake 0.4s ease-in-out' }}
                  >
                    <AlertCircle className="w-3.5 h-3.5" />
                    {errors.phone}
                  </p>
                )}
              </div>

              {! worker && (
                <div>
                  <label htmlFor="password" className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
                    <Lock className="w-4 h-4 text-emerald-400" />
                    Password <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => {
                      setFormData({ ...formData, password: e. target.value });
                      if (errors.password) setErrors({ ...errors, password: '' });
                    }}
                    className={`w-full px-4 py-3 bg-slate-800/50 border ${
                      errors.password ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' :  'border-slate-700 focus:border-emerald-500 focus:ring-emerald-500/20'
                    } rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition-all`}
                    placeholder="Minimum 8 characters"
                    disabled={loading}
                  />
                  {errors.password && (
                    <p 
                      className="text-red-400 text-xs mt-2 flex items-center gap-1.5"
                      style={{ animation: 'shake 0.4s ease-in-out' }}
                    >
                      <AlertCircle className="w-3.5 h-3.5" />
                      {errors.password}
                    </p>
                  )}
                  <div className="mt-3 space-y-2 bg-slate-800/30 rounded-lg p-3 border border-slate-700/50">
                    <p className="text-xs font-medium text-slate-400 mb-2">Password must contain:</p>
                    <p className={`text-xs flex items-center gap-2 transition-colors ${
                      formData.password. length >= 8 ? 'text-emerald-400' : 'text-slate-500'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full transition-all ${
                        formData.password. length >= 8 ? 'bg-emerald-400 shadow-sm shadow-emerald-400' : 'bg-slate-600'
                      }`}></span>
                      At least 8 characters
                    </p>
                    <p className={`text-xs flex items-center gap-2 transition-colors ${
                      /(?=.*[a-z])(?=.*[A-Z])/.test(formData.password) ? 'text-emerald-400' : 'text-slate-500'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full transition-all ${
                        /(?=.*[a-z])(?=.*[A-Z])/.test(formData.password) ? 'bg-emerald-400 shadow-sm shadow-emerald-400' : 'bg-slate-600'
                      }`}></span>
                      Uppercase & lowercase letters
                    </p>
                    <p className={`text-xs flex items-center gap-2 transition-colors ${
                      /(?=.*\d)/.test(formData.password) ? 'text-emerald-400' : 'text-slate-500'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full transition-all ${
                        /(?=.*\d)/.test(formData.password) ? 'bg-emerald-400 shadow-sm shadow-emerald-400' : 'bg-slate-600'
                      }`}></span>
                      At least one number
                    </p>
                  </div>
                </div>
              )}

              {worker && (
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 flex items-start gap-3">
                  <Lock className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-blue-400 text-sm font-medium">Password Management</p>
                    <p className="text-blue-300/80 text-xs mt-1">
                      To reset this worker's password, use the "Reset Password" option in their profile
                    </p>
                  </div>
                </div>
              )}

              {errors.submit && (
                <div 
                  className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3"
                  style={{ animation: 'shake 0.4s ease-in-out' }}
                >
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-red-400 text-sm font-semibold">Failed to Save Worker</p>
                    <p className="text-red-300/90 text-sm mt-1">{errors.submit}</p>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2 border-t border-slate-700/50 mt-6">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-slate-700 hover:border-slate-600 hover:scale-[1.02] active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-emerald-500 via-emerald-500 to-teal-600 hover:from-emerald-600 hover:via-emerald-600 hover:to-teal-700 text-white font-medium rounded-xl hover:shadow-xl hover:shadow-emerald-500/30 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] relative overflow-hidden group"
                >
                  <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="relative flex items-center justify-center gap-2">
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        <span>{worker ? 'Update Worker' : 'Create Worker'}</span>
                      </>
                    )}
                  </div>
                </button>
              </div>
            </form>
          </div>
        </div>
      </Portal>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-8px); }
          50% { transform: translateX(8px); }
          75% { transform:  translateX(-8px); }
        }
        
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.9) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(100%); }
          to { opacity:  1; transform: translateX(0); }
        }
      `}</style>
    </>
  );
}