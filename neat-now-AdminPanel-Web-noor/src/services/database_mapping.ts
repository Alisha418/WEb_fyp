/**
 * DATABASE TABLE MAPPING REFERENCE
 * 
 * This file documents how frontend fields map to the 13 database tables
 */

export const DATABASE_MAPPING = {
  // ============================================
  // WORKERS TABLE
  // ============================================
  workers: {
    worker_id: 'Foreign Key to ACCOUNTS.account_id (OneToOne)',
    employee_code: 'Unique worker identifier',
    total_tasks: 'Count of completed tasks from REPORTS',
    avg_rating: 'Average from FEEDBACK. rating',
    is_tracking: 'GPS tracking status',
  },

  // ============================================
  // ACCOUNTS TABLE (via worker_id relationship)
  // ============================================
  accounts: {
    account_id: 'Primary key, maps to Worker.id in frontend',
    email: 'Login credential',
    password_hash: 'Hashed password (not exposed)',
    role: 'Always "Worker" for workers',
    name: 'Full name',
    phone_number: 'Contact number',
    profile_image: 'Avatar URL',
    google_id: 'OAuth ID (optional)',
    created_at: 'Registration timestamp',
  },

  // ============================================
  // REPORTS TABLE (related via worker_id)
  // ============================================
  reports_computed: {
    active_tasks: 'COUNT where status IN ("Assigned", "In Progress")',
    pending_tasks: 'COUNT where status = "Assigned"',
    in_progress_tasks: 'COUNT where status = "In Progress"',
    completed_today: 'COUNT where status = "Resolved" AND resolved_at = TODAY',
    total_tasks: 'COUNT where status = "Resolved" (synced to WORKERS.total_tasks)',
  },

  // ============================================
  // FEEDBACK TABLE (related via worker_id)
  // ============================================
  feedback_computed: {
    avg_rating: 'AVG(rating) → synced to WORKERS.avg_rating',
  },

  // ============================================
  // WORKER_LOCATION TABLE
  // ============================================
  worker_location: {
    track_id: 'Primary key for location record',
    worker_id: 'Foreign key to WORKERS',
    latitude: 'GPS coordinate',
    longitude: 'GPS coordinate',
    recorded_at: 'Timestamp of location capture',
  },

  // ============================================
  // WORKER_MONTHLY_STATS TABLE
  // ============================================
  worker_monthly_stats: {
    stat_id: 'Primary key',
    worker_id: 'Foreign key to WORKERS',
    month_year: 'Format: YYYY-MM',
    resolved_tasks: 'Monthly completion count',
    avg_rating:  'Monthly average rating',
    badge: 'Performance tier (None/Silver/Gold/Platinum)',
    monthly_rank: 'Position among all workers',
    updated_at: 'Last calculation timestamp',
  },

  // ============================================
  // ACTIVITY_LOG TABLE (for worker actions)
  // ============================================
  activity_log: {
    log_id: 'Primary key',
    actor_type: '"Worker" or "Admin"',
    actor_id: 'account_id of who performed action',
    action:  'CREATED, UPDATED, DELETED, etc.',
    target_type: '"Worker"',
    target_id: 'account_id of affected worker',
    description: 'Human-readable audit trail',
    created_at: 'When action occurred',
  },

  // ============================================
  // TASK_HISTORY_LOG TABLE (report lifecycle)
  // ============================================
  task_history_log: {
    log_id: 'Primary key',
    report_id: 'Foreign key to REPORTS',
    status_from: 'Previous status',
    status_to:  'New status',
    changed_by_type: '"Worker" when worker updates',
    changed_by_id:  'worker account_id',
    changed_at: 'Timestamp of change',
  },

  // ============================================
  // DEFAULT VALUES (not in database)
  // ============================================
  defaults: {
    zone: '"Unassigned" - not in database schema',
    avgCompletionTime: '24 hours - computed from performance_stats later',
    image: 'undefined - falls back to initials avatar',
  },
};

/**
 * FRONTEND → BACKEND FIELD MAPPING
 */
export const FIELD_MAPPING = {
  // Frontend → Backend
  id: 'account_id',
  employeeCode: 'employee_code',
  name: 'worker_id. name',
  email: 'worker_id.email',
  phone: 'worker_id. phone_number',
  zone: 'DEFAULT:  "Unassigned"',
  tasksCompleted: 'total_tasks',
  avgCompletionTime: 'performance_stats.avg_completion_time',
  rating: 'avg_rating',
  active: 'worker_id.is_active',
  image: 'worker_id.profile_image',
  isTracking: 'is_tracking',
  activeTasks: 'COMPUTED: active_tasks',
  createdAt: 'worker_id.created_at',
};