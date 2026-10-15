/**
 * Core Domain Types for MyHospital
 */

export type UserRole = 'patient' | 'hospital_staff' | 'admin';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  phone?: string;
  assignedHospitalId?: string; // only for hospital_staff
  assignedDepartmentId?: string; // optional department restriction
  createdAt: string;
  updatedAt: string;
}

export type EmergencyStatus = 
  | 'accepting'              // Accepting emergency requests
  | 'temporarily_unavailable'// Temporarily unavailable
  | 'restricted_capacity'    // Restricted capacity
  | 'requires_confirmation'; // Requires direct confirmation

export interface BedCategory {
  id: string;
  hospitalId: string;
  categoryName: 'ICU' | 'General Ward' | 'Private Room' | 'Shared Room' | 'Paediatric Bed';
  physicalCapacity: number;  // All configured beds
  unavailableCount: number;  // Beds temporarily out of service
  usableCapacity: number;    // physicalCapacity - unavailableCount
  occupiedCount: number;     // Currently occupied
  reservedCount: number;     // Currently reserved
  availableBeds: number;     // usableCapacity - occupiedCount - reservedCount
  lastUpdated: string;
}

export interface DoctorShift {
  id: string;
  hospitalId: string;
  departmentId: string;
  specialtyId: string;
  doctorName: string;
  designation: string;
  shiftStart: string; // ISO string or time "08:00"
  shiftEnd: string;   // ISO string or time "20:00"
  isOnDuty: boolean;
  isOnCall: boolean;
  notes?: string;
  lastUpdated: string;
}

export interface HospitalService {
  id: string;
  hospitalId: string;
  serviceKey: 'ct_scan' | 'mri' | 'xray' | 'blood_bank' | 'laboratory' | 'oxygen_supply' | 'ventilators' | 'operation_theatre' | 'dialysis';
  displayName: string;
  hasEquipment: boolean;      // Physical equipment exists
  isOperational: boolean;     // Functional and operating
  acceptingPatients: boolean; // Capacity to accept new patients right now
  notes?: string;
  lastUpdated: string;
}

export interface Specialty {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
}

export interface HospitalDepartment {
  id: string;
  hospitalId: string;
  specialtyId: string;
  specialtyName: string;
  contactExtension?: string;
  floorLocation?: string;
  isActive: boolean;
}

export type HospitalVerificationStatus = 'unverified' | 'verified' | 'suspended';

export interface Hospital {
  id: string;
  name: string;
  tagline?: string;
  verificationStatus: HospitalVerificationStatus;
  isSimulatedDemo: boolean; // Must be clearly identified
  address: string;
  locality: string;
  city: string;
  state: string;
  postalCode: string;
  latitude: number;
  longitude: number;
  emergencyPhone: string;
  generalPhone: string;
  email: string;
  website?: string;
  emergencyStatus: EmergencyStatus;
  waitingTimeEstimateMinutes?: number; // Optional hospital-supplied estimate
  informationSource: 'hospital_reported' | 'estimated' | 'simulated';
  lastCapacityUpdate: string;
  createdAt: string;
  updatedAt: string;
  departments?: HospitalDepartment[];
  bedCategories?: BedCategory[];
  doctorShifts?: DoctorShift[];
  services?: HospitalService[];
}

export type AdmissionStatus = 
  | 'Submitted'
  | 'Under Review'
  | 'Accepted'
  | 'Declined'
  | 'Cancelled'
  | 'Expired'
  | 'Completed';

export interface AdmissionRequest {
  id: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  patientEmail: string;
  hospitalId: string;
  hospitalName: string;
  departmentId: string;
  specialtyName: string;
  bedCategoryId?: string;
  bedCategoryName?: string;
  acuityLevel: 'routine' | 'urgent' | 'emergency';
  chiefComplaint: string;
  medicalNotes?: string;
  status: AdmissionStatus;
  statusReason?: string;
  statusHistory: Array<{
    status: AdmissionStatus;
    changedBy: string;
    changedAt: string;
    reason?: string;
  }>;
  reservationId?: string;
  reservationExpiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CapacityReservation {
  id: string;
  requestId: string;
  hospitalId: string;
  bedCategoryId: string;
  patientId: string;
  reservedAt: string;
  expiresAt: string;
  status: 'active' | 'claimed' | 'expired' | 'released';
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actorId: string;
  actorEmail: string;
  actorRole: UserRole;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
}

export interface InAppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'alert';
  read: boolean;
  linkUrl?: string;
  createdAt: string;
}
