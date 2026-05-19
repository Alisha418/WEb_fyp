// Types
export type ReportStatus =
  | 'Pending'
  | 'Assigned'
  | 'In Progress'
  | 'Resolved'
  | 'Rejected'
  | 'Overdue';
export type WasteType = 'Organic' | 'Recyclable' | 'Hazardous' | 'General';
export type UserRole = 'Admin' | 'Worker' | 'Citizen';

// Geocoded location data
export interface GeocodedLocation {
  fullAddress: string;
  street: string;
  houseNumber: string;
  neighborhood: string;
  city: string;
  state: string;
  country:  string;
  postcode: string;
}

export interface Report {
  id: string;
  citizenName: string;
  /** Present for citizen-submitted reports; omitted for admin-created tasks */
  citizenId?: string;
  /** From API `report_source` — distinguishes admin tasks from citizen reports */
  reportSource?: 'citizen' | 'admin';
  createdByAdminId?: string;
  workerName?: string;
  workerId?:  string;
  location: string;
  /** Original citizen-submitted address from API; prefer for display when present */
  location_address?: string;
  zone: string;
  status: ReportStatus;
  submittedAt: Date;
  assignedAt?: Date;
  resolvedAt?:  Date;
  wasteType: WasteType;
  aiVerification: {
    verified: boolean;
    confidence:  number;
    classification: WasteType;
  };
  description: string;
  beforeImage:  string;
  afterImage?: string;
  aiVerifiedImage?: string;
  urgency: number;
  lat:  number;
  lng: number;
  /** Backend flag: citizen report past 60 min with no worker accept */
  is_unassigned?: boolean;
  // Optional geocoded data
  geocodedData?: GeocodedLocation;
}

export interface Worker {
  id: string;
  name: string;
  email: string;
  phone: string;
  zone?: string;
  tasksCompleted: number;
  avgCompletionTime: number;
  rating:  number;
  active: boolean;
}

export interface User {
  id: string;
  name:  string;
  role: UserRole;
  email: string;
}

export interface ActivityWorkerSummary {
  workerId: string;
  workerName: string;
  taskCount: number;
}

export interface Activity {
  id: string;
  type: 'new_report' | 'resolved' | 'assigned' | 'alert' | 'in_progress';
  message: string;
  timestamp: Date;
  reportId?: string;
  /** Calendar day label from API (Today, Yesterday, May 15, 2026) */
  dateLabel?: string;
  date?: string;
  workers?: ActivityWorkerSummary[];
}