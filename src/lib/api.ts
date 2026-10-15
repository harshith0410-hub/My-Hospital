import {
  UserProfile,
  Hospital,
  Specialty,
  AdmissionRequest,
  AdmissionStatus,
  InAppNotification,
  AuditLog,
} from './types.ts';

const TOKEN_KEY = 'myhospital_auth_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null): void {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(path, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `HTTP error ${res.status}`);
  }

  return data as T;
}

export const api = {
  // Auth
  login: (email: string, password?: string) =>
    request<{ token: string; user: UserProfile }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (payload: { email: string; fullName: string; phone?: string }) =>
    request<{ token: string; user: UserProfile }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getMe: () => request<{ user: UserProfile }>('/api/auth/me'),

  logout: () =>
    request<{ success: boolean }>('/api/auth/logout', {
      method: 'POST',
    }),

  recoverPassword: (email: string) =>
    request<{ message: string }>('/api/auth/recover-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  // Specialties
  getSpecialties: () => request<Specialty[]>('/api/specialties'),

  // Hospitals
  getHospitals: (params?: { search?: string; specialty?: string; emergency?: boolean; locality?: string }) => {
    const q = new URLSearchParams();
    if (params?.search) q.set('search', params.search);
    if (params?.specialty) q.set('specialty', params.specialty);
    if (params?.emergency) q.set('emergency', 'true');
    if (params?.locality) q.set('locality', params.locality);
    return request<Hospital[]>(`/api/hospitals?${q.toString()}`);
  },

  getHospitalById: (id: string) => request<Hospital>(`/api/hospitals/${id}`),

  // Staff updates
  updateCapacity: (hospitalId: string, payload: {
    categoryId: string;
    physicalCapacity: number;
    unavailableCount: number;
    occupiedCount: number;
  }) =>
    request<{ success: boolean; category: unknown }>(`/api/hospitals/${hospitalId}/capacity`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateEmergencyStatus: (hospitalId: string, payload: { emergencyStatus: string; waitingTimeEstimateMinutes?: number }) =>
    request<{ success: boolean; hospital: Hospital }>(`/api/hospitals/${hospitalId}/emergency-status`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  addDoctorShift: (hospitalId: string, payload: any) =>
    request<{ success: boolean; doctorShift: any }>(`/api/hospitals/${hospitalId}/doctors`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateService: (hospitalId: string, serviceId: string, payload: any) =>
    request<{ success: boolean; service: any }>(`/api/hospitals/${hospitalId}/services/${serviceId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  // Admissions
  submitAdmissionRequest: (payload: {
    hospitalId: string;
    departmentId: string;
    bedCategoryId?: string;
    acuityLevel: 'routine' | 'urgent' | 'emergency';
    chiefComplaint: string;
    medicalNotes?: string;
    patientName?: string;
    patientPhone?: string;
  }) =>
    request<{ success: boolean; request: AdmissionRequest }>('/api/admissions', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getMyAdmissions: () => request<AdmissionRequest[]>('/api/admissions/my'),

  getHospitalAdmissions: (hospitalId: string) =>
    request<AdmissionRequest[]>(`/api/hospitals/${hospitalId}/admissions`),

  updateAdmissionStatus: (requestId: string, payload: {
    nextStatus: AdmissionStatus;
    reason?: string;
    targetBedCategoryId?: string;
  }) =>
    request<{ success: boolean; request: AdmissionRequest }>(`/api/admissions/${requestId}/status`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  cancelAdmissionRequest: (requestId: string) =>
    request<{ success: boolean; request: AdmissionRequest }>(`/api/admissions/${requestId}/cancel`, {
      method: 'POST',
    }),

  // Notifications
  getNotifications: () => request<InAppNotification[]>('/api/notifications'),

  markNotificationRead: (id: string) =>
    request<{ success: boolean }>(`/api/notifications/${id}/read`, {
      method: 'PATCH',
    }),

  // Admin
  getAdminStats: () =>
    request<{
      totalHospitals: number;
      verifiedHospitals: number;
      unverifiedHospitals: number;
      suspendedHospitals: number;
      staleCapacityCount: number;
      totalRequests: number;
      activeReservations: number;
      totalUsers: number;
    }>('/api/admin/stats'),

  getAllHospitalsAdmin: () => request<Hospital[]>('/api/admin/hospitals'),

  verifyHospital: (hospitalId: string, status: 'verified' | 'unverified' | 'suspended') =>
    request<{ success: boolean; hospital: Hospital }>(`/api/admin/hospitals/${hospitalId}/verify`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  getAdminUsers: () => request<UserProfile[]>('/api/admin/users'),

  updateUserRole: (userId: string, role: string, assignedHospitalId?: string) =>
    request<{ success: boolean; user: UserProfile }>(`/api/admin/users/${userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role, assignedHospitalId }),
    }),

  getAdminSpecialties: () => request<Specialty[]>('/api/admin/specialties'),

  addSpecialty: (name: string, description: string) =>
    request<{ success: boolean; specialty: Specialty }>('/api/admin/specialties', {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    }),

  toggleSpecialty: (id: string, isActive: boolean) =>
    request<{ success: boolean; specialty: Specialty }>(`/api/admin/specialties/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    }),

  getAdminAuditLogs: () => request<AuditLog[]>('/api/admin/audit-logs'),

  resetDemoSeed: () => request<{ success: boolean; message: string }>('/api/admin/seed-demo', { method: 'POST' }),
};
