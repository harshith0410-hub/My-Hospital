import type { AdmissionStatus } from './types.ts';

/**
 * Server-enforced admission request state transition matrix.
 * Disallows arbitrary or unauthorized status skips.
 */
export const ALLOWED_TRANSITIONS: Record<AdmissionStatus, AdmissionStatus[]> = {
  'Submitted': ['Under Review', 'Cancelled'],
  'Under Review': ['Accepted', 'Declined', 'Cancelled'],
  'Accepted': ['Completed', 'Cancelled', 'Expired'],
  'Declined': [],
  'Cancelled': [],
  'Expired': [],
  'Completed': [],
};

/**
 * Check if transitioning from currentStatus to nextStatus is valid.
 */
export function isValidAdmissionTransition(currentStatus: AdmissionStatus, nextStatus: AdmissionStatus): boolean {
  if (currentStatus === nextStatus) return false;
  const allowed = ALLOWED_TRANSITIONS[currentStatus];
  return allowed ? allowed.includes(nextStatus) : false;
}

/**
 * Default reservation hold duration in minutes (e.g. 30 minutes)
 */
export const RESERVATION_HOLD_MINUTES = 30;

/**
 * Checks if a reservation has passed its expiry timestamp.
 */
export function isReservationExpired(expiresAtIso: string, nowIso?: string): boolean {
  const expiry = new Date(expiresAtIso).getTime();
  const current = nowIso ? new Date(nowIso).getTime() : Date.now();
  return current >= expiry;
}

/**
 * Validates admission request submission payload
 */
export function validateAdmissionSubmission(data: {
  patientName?: string;
  patientPhone?: string;
  chiefComplaint?: string;
  hospitalId?: string;
  departmentId?: string;
}): { isValid: boolean; error?: string } {
  if (!data.patientName || data.patientName.trim().length < 2) {
    return { isValid: false, error: 'Patient name must be at least 2 characters' };
  }
  if (!data.patientPhone || data.patientPhone.trim().length < 7) {
    return { isValid: false, error: 'A valid patient contact phone number is required' };
  }
  if (!data.chiefComplaint || data.chiefComplaint.trim().length < 5) {
    return { isValid: false, error: 'Please describe the chief complaint / reason for admission (min 5 characters)' };
  }
  if (!data.hospitalId) {
    return { isValid: false, error: 'Hospital is required' };
  }
  if (!data.departmentId) {
    return { isValid: false, error: 'Department is required' };
  }
  return { isValid: true };
}
