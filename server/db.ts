import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  UserProfile,
  Hospital,
  Specialty,
  AdmissionRequest,
  CapacityReservation,
  AuditLog,
  InAppNotification,
  BedCategory,
  DoctorShift,
  HospitalService,
} from '../src/lib/types.ts';
import { calculateCapacity } from '../src/lib/capacity.ts';

const DATA_DIR = path.resolve(process.cwd(), '.data');
const DATA_FILE = path.join(DATA_DIR, 'myhospital.json');

export interface DatabaseSchema {
  profiles: UserProfile[];
  specialties: Specialty[];
  hospitals: Hospital[];
  admissionRequests: AdmissionRequest[];
  reservations: CapacityReservation[];
  notifications: InAppNotification[];
  auditLogs: AuditLog[];
}

// 25 Required Medical Specialties
export const INITIAL_SPECIALTIES: string[] = [
  'General Medicine',
  'Emergency Medicine',
  'Cardiology',
  'Cardiothoracic Surgery',
  'Neurology',
  'Neurosurgery',
  'Orthopaedics',
  'Dermatology',
  'Pulmonology',
  'Gastroenterology',
  'Nephrology',
  'Urology',
  'Oncology',
  'Paediatrics',
  'Obstetrics and Gynaecology',
  'Ophthalmology',
  'ENT',
  'Endocrinology',
  'Psychiatry',
  'General Surgery',
  'Anaesthesiology',
  'Radiology',
  'Pathology and Laboratory Services',
  'Dentistry',
  'Physiotherapy',
];

function createSeedData(): DatabaseSchema {
  const specialties: Specialty[] = INITIAL_SPECIALTIES.map((name) => ({
    id: `spec-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    name,
    description: `Specialized department for ${name} consultation, diagnostics, and patient care.`,
    isActive: true,
  }));

  const metroHospitalId = 'hosp-metro-center';
  const stJudeHospitalId = 'hosp-st-jude';
  const bayviewHospitalId = 'hosp-bayview-trauma';

  const nowIso = new Date().toISOString();
  const pastHour = new Date(Date.now() - 3600000).toISOString();

  const hospitals: Hospital[] = [
    {
      id: metroHospitalId,
      name: 'Metro Health Center of Excellence',
      tagline: 'Level 1 Trauma & Tertiary Cardiac Care',
      verificationStatus: 'verified',
      isSimulatedDemo: true,
      address: '1000 Mission Bay Blvd S',
      locality: 'Mission Bay',
      city: 'San Francisco',
      state: 'CA',
      postalCode: '94158',
      latitude: 37.7689,
      longitude: -122.3916,
      emergencyPhone: '+1 (415) 555-0199',
      generalPhone: '+1 (415) 555-0100',
      email: 'info@metrohealth.example.com',
      website: 'https://metrohealth.example.com',
      emergencyStatus: 'accepting',
      waitingTimeEstimateMinutes: 18,
      informationSource: 'hospital_reported',
      lastCapacityUpdate: nowIso,
      createdAt: pastHour,
      updatedAt: nowIso,
      departments: [
        { id: 'dept-m-1', hospitalId: metroHospitalId, specialtyId: 'spec-emergency-medicine', specialtyName: 'Emergency Medicine', contactExtension: '101', floorLocation: 'Ground Floor, Wing A', isActive: true },
        { id: 'dept-m-2', hospitalId: metroHospitalId, specialtyId: 'spec-cardiology', specialtyName: 'Cardiology', contactExtension: '204', floorLocation: '3rd Floor, Tower B', isActive: true },
        { id: 'dept-m-3', hospitalId: metroHospitalId, specialtyId: 'spec-neurology', specialtyName: 'Neurology', contactExtension: '310', floorLocation: '4th Floor, Tower B', isActive: true },
        { id: 'dept-m-4', hospitalId: metroHospitalId, specialtyId: 'spec-orthopaedics', specialtyName: 'Orthopaedics', contactExtension: '412', floorLocation: '2nd Floor, Wing C', isActive: true },
        { id: 'dept-m-5', hospitalId: metroHospitalId, specialtyId: 'spec-paediatrics', specialtyName: 'Paediatrics', contactExtension: '505', floorLocation: '5th Floor, Children Pavilion', isActive: true },
      ],
      bedCategories: [
        {
          id: 'bed-m-icu',
          hospitalId: metroHospitalId,
          categoryName: 'ICU',
          physicalCapacity: 24,
          unavailableCount: 2,
          usableCapacity: 22,
          occupiedCount: 16,
          reservedCount: 1,
          availableBeds: 5,
          lastUpdated: nowIso,
        },
        {
          id: 'bed-m-gen',
          hospitalId: metroHospitalId,
          categoryName: 'General Ward',
          physicalCapacity: 120,
          unavailableCount: 5,
          usableCapacity: 115,
          occupiedCount: 92,
          reservedCount: 3,
          availableBeds: 20,
          lastUpdated: nowIso,
        },
        {
          id: 'bed-m-pvt',
          hospitalId: metroHospitalId,
          categoryName: 'Private Room',
          physicalCapacity: 40,
          unavailableCount: 0,
          usableCapacity: 40,
          occupiedCount: 34,
          reservedCount: 0,
          availableBeds: 6,
          lastUpdated: nowIso,
        },
        {
          id: 'bed-m-ped',
          hospitalId: metroHospitalId,
          categoryName: 'Paediatric Bed',
          physicalCapacity: 30,
          unavailableCount: 1,
          usableCapacity: 29,
          occupiedCount: 18,
          reservedCount: 1,
          availableBeds: 10,
          lastUpdated: nowIso,
        },
      ],
      doctorShifts: [
        {
          id: 'doc-m-1',
          hospitalId: metroHospitalId,
          departmentId: 'dept-m-1',
          specialtyId: 'spec-emergency-medicine',
          doctorName: 'Dr. Evelyn Reed, MD, FACEP',
          designation: 'Attending Emergency Physician',
          shiftStart: '07:00',
          shiftEnd: '19:00',
          isOnDuty: true,
          isOnCall: false,
          notes: 'Triaging acute arrivals in Trauma Bay 1',
          lastUpdated: nowIso,
        },
        {
          id: 'doc-m-2',
          hospitalId: metroHospitalId,
          departmentId: 'dept-m-2',
          specialtyId: 'spec-cardiology',
          doctorName: 'Dr. Aris Thorne, MD, FACC',
          designation: 'Chief of Interventional Cardiology',
          shiftStart: '08:00',
          shiftEnd: '18:00',
          isOnDuty: true,
          isOnCall: true,
          notes: 'Available for emergent catheterization protocol',
          lastUpdated: nowIso,
        },
        {
          id: 'doc-m-3',
          hospitalId: metroHospitalId,
          departmentId: 'dept-m-3',
          specialtyId: 'spec-neurology',
          doctorName: 'Dr. Maya Lin, MD, PhD',
          designation: 'Neurology Specialist',
          shiftStart: '12:00',
          shiftEnd: '22:00',
          isOnDuty: true,
          isOnCall: false,
          notes: 'Stroke team lead on duty',
          lastUpdated: nowIso,
        },
      ],
      services: [
        { id: 'srv-m-ct', hospitalId: metroHospitalId, serviceKey: 'ct_scan', displayName: '256-Slice Dual Energy CT Scanner', hasEquipment: true, isOperational: true, acceptingPatients: true, notes: '24/7 dedicated trauma scanner', lastUpdated: nowIso },
        { id: 'srv-m-mri', hospitalId: metroHospitalId, serviceKey: 'mri', displayName: '3.0 Tesla High-Field MRI', hasEquipment: true, isOperational: true, acceptingPatients: true, notes: 'Routine & neuro protocols active', lastUpdated: nowIso },
        { id: 'srv-m-xray', hospitalId: metroHospitalId, serviceKey: 'xray', displayName: 'Digital Radiography & Fluoroscopy', hasEquipment: true, isOperational: true, acceptingPatients: true, notes: 'Operational across all trauma bays', lastUpdated: nowIso },
        { id: 'srv-m-bb', hospitalId: metroHospitalId, serviceKey: 'blood_bank', displayName: 'Trauma Blood Bank & Massive Transfusion', hasEquipment: true, isOperational: true, acceptingPatients: true, notes: 'Adequate O-Negative units in stock', lastUpdated: nowIso },
        { id: 'srv-m-vent', hospitalId: metroHospitalId, serviceKey: 'ventilators', displayName: 'Mechanical Ventilators & High-Flow O2', hasEquipment: true, isOperational: true, acceptingPatients: true, notes: '14 portable & stationary units free', lastUpdated: nowIso },
        { id: 'srv-m-ot', hospitalId: metroHospitalId, serviceKey: 'operation_theatre', displayName: 'Emergency Surgical Theatres', hasEquipment: true, isOperational: true, acceptingPatients: true, notes: '2 suites staffed for immediate surgical entry', lastUpdated: nowIso },
      ],
    },
    {
      id: stJudeHospitalId,
      name: 'St. Jude Regional Community Hospital',
      tagline: 'Comprehensive Family & Acute Care Medicine',
      verificationStatus: 'verified',
      isSimulatedDemo: true,
      address: '225 Bush Street',
      locality: 'Financial District',
      city: 'San Francisco',
      state: 'CA',
      postalCode: '94104',
      latitude: 37.7909,
      longitude: -122.4014,
      emergencyPhone: '+1 (415) 555-0299',
      generalPhone: '+1 (415) 555-0200',
      email: 'admissions@stjude-regional.example.com',
      website: 'https://stjude-regional.example.com',
      emergencyStatus: 'restricted_capacity',
      waitingTimeEstimateMinutes: 45,
      informationSource: 'hospital_reported',
      lastCapacityUpdate: pastHour,
      createdAt: pastHour,
      updatedAt: pastHour,
      departments: [
        { id: 'dept-sj-1', hospitalId: stJudeHospitalId, specialtyId: 'spec-general-medicine', specialtyName: 'General Medicine', contactExtension: '102', floorLocation: '1st Floor', isActive: true },
        { id: 'dept-sj-2', hospitalId: stJudeHospitalId, specialtyId: 'spec-emergency-medicine', specialtyName: 'Emergency Medicine', contactExtension: '911', floorLocation: 'Ground Floor', isActive: true },
        { id: 'dept-sj-3', hospitalId: stJudeHospitalId, specialtyId: 'spec-pulmonology', specialtyName: 'Pulmonology', contactExtension: '304', floorLocation: '3rd Floor', isActive: true },
      ],
      bedCategories: [
        {
          id: 'bed-sj-icu',
          hospitalId: stJudeHospitalId,
          categoryName: 'ICU',
          physicalCapacity: 12,
          unavailableCount: 2,
          usableCapacity: 10,
          occupiedCount: 9,
          reservedCount: 1,
          availableBeds: 0,
          lastUpdated: pastHour,
        },
        {
          id: 'bed-sj-gen',
          hospitalId: stJudeHospitalId,
          categoryName: 'General Ward',
          physicalCapacity: 60,
          unavailableCount: 0,
          usableCapacity: 60,
          occupiedCount: 52,
          reservedCount: 2,
          availableBeds: 6,
          lastUpdated: pastHour,
        },
      ],
      doctorShifts: [
        {
          id: 'doc-sj-1',
          hospitalId: stJudeHospitalId,
          departmentId: 'dept-sj-2',
          specialtyId: 'spec-emergency-medicine',
          doctorName: 'Dr. Henry Gomez, MD',
          designation: 'ER Staff Physician',
          shiftStart: '08:00',
          shiftEnd: '20:00',
          isOnDuty: true,
          isOnCall: false,
          notes: 'High surge in respiratory patients',
          lastUpdated: pastHour,
        },
      ],
      services: [
        { id: 'srv-sj-ct', hospitalId: stJudeHospitalId, serviceKey: 'ct_scan', displayName: 'Multi-slice CT Scanner', hasEquipment: true, isOperational: true, acceptingPatients: true, notes: 'Operational', lastUpdated: pastHour },
        { id: 'srv-sj-mri', hospitalId: stJudeHospitalId, serviceKey: 'mri', displayName: '1.5 Tesla MRI', hasEquipment: true, isOperational: false, acceptingPatients: false, notes: 'Under scheduled annual coil maintenance', lastUpdated: pastHour },
      ],
    },
    {
      id: bayviewHospitalId,
      name: 'Bayview Specialty & Trauma Institute',
      tagline: 'Advanced Oncology, Orthopaedic & Surgical Care',
      verificationStatus: 'unverified', // Unverified queue for Admin review
      isSimulatedDemo: true,
      address: '1500 Owens Street',
      locality: 'Bayview District',
      city: 'San Francisco',
      state: 'CA',
      postalCode: '94158',
      latitude: 37.7665,
      longitude: -122.3955,
      emergencyPhone: '+1 (415) 555-0399',
      generalPhone: '+1 (415) 555-0300',
      email: 'admin@bayview-specialty.example.com',
      website: 'https://bayview-specialty.example.com',
      emergencyStatus: 'requires_confirmation',
      waitingTimeEstimateMinutes: 30,
      informationSource: 'simulated',
      lastCapacityUpdate: new Date(Date.now() - 86400000 * 2).toISOString(), // Stale > 48h
      createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
      updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      departments: [
        { id: 'dept-bv-1', hospitalId: bayviewHospitalId, specialtyId: 'spec-oncology', specialtyName: 'Oncology', contactExtension: '401', floorLocation: 'Cancer Wing', isActive: true },
        { id: 'dept-bv-2', hospitalId: bayviewHospitalId, specialtyId: 'spec-orthopaedics', specialtyName: 'Orthopaedics', contactExtension: '402', floorLocation: 'Joint Replacement Wing', isActive: true },
      ],
      bedCategories: [
        {
          id: 'bed-bv-gen',
          hospitalId: bayviewHospitalId,
          categoryName: 'General Ward',
          physicalCapacity: 45,
          unavailableCount: 5,
          usableCapacity: 40,
          occupiedCount: 35,
          reservedCount: 0,
          availableBeds: 5,
          lastUpdated: new Date(Date.now() - 86400000 * 2).toISOString(),
        },
      ],
      doctorShifts: [
        {
          id: 'doc-bv-1',
          hospitalId: bayviewHospitalId,
          departmentId: 'dept-bv-1',
          specialtyId: 'spec-oncology',
          doctorName: 'Dr. Clara Oswald, MD',
          designation: 'Medical Oncologist',
          shiftStart: '09:00',
          shiftEnd: '17:00',
          isOnDuty: false,
          isOnCall: true,
          notes: 'Consultation by appointment only',
          lastUpdated: new Date(Date.now() - 86400000 * 2).toISOString(),
        },
      ],
      services: [
        { id: 'srv-bv-lab', hospitalId: bayviewHospitalId, serviceKey: 'laboratory', displayName: 'Comprehensive Clinical Pathology Lab', hasEquipment: true, isOperational: true, acceptingPatients: true, lastUpdated: pastHour },
      ],
    },
  ];

  const profiles: UserProfile[] = [
    {
      id: 'usr-patient-1',
      email: 'patient@demo.org',
      fullName: 'Sarah Connor',
      role: 'patient',
      phone: '+1 (555) 012-3456',
      createdAt: pastHour,
      updatedAt: pastHour,
    },
    {
      id: 'usr-staff-1',
      email: 'staff@metrohealth.org',
      fullName: 'Marcus Vance, RN (Head Nurse)',
      role: 'hospital_staff',
      phone: '+1 (555) 019-9876',
      assignedHospitalId: metroHospitalId,
      createdAt: pastHour,
      updatedAt: pastHour,
    },
    {
      id: 'usr-admin-1',
      email: 'admin@myhospital.org',
      fullName: 'Administrator Dr. Patricia Hayes',
      role: 'admin',
      phone: '+1 (555) 011-0000',
      createdAt: pastHour,
      updatedAt: pastHour,
    },
  ];

  const initialRequests: AdmissionRequest[] = [
    {
      id: 'req-demo-1',
      patientId: 'usr-patient-1',
      patientName: 'Sarah Connor',
      patientPhone: '+1 (555) 012-3456',
      patientEmail: 'patient@demo.org',
      hospitalId: metroHospitalId,
      hospitalName: 'Metro Health Center of Excellence',
      departmentId: 'dept-m-1',
      specialtyName: 'Emergency Medicine',
      bedCategoryId: 'bed-m-gen',
      bedCategoryName: 'General Ward',
      acuityLevel: 'urgent',
      chiefComplaint: 'Acute abdominal pain in lower right quadrant with mild fever and nausea.',
      medicalNotes: 'No known drug allergies. Onset 4 hours ago.',
      status: 'Under Review',
      statusReason: 'Triage nurse assigned to review vitals upon arrival.',
      statusHistory: [
        {
          status: 'Submitted',
          changedBy: 'usr-patient-1',
          changedAt: new Date(Date.now() - 25 * 60000).toISOString(),
          reason: 'Initial digital request submitted by patient',
        },
        {
          status: 'Under Review',
          changedBy: 'usr-staff-1',
          changedAt: new Date(Date.now() - 15 * 60000).toISOString(),
          reason: 'Reviewing triage symptoms against available clinical beds',
        },
      ],
      createdAt: new Date(Date.now() - 25 * 60000).toISOString(),
      updatedAt: new Date(Date.now() - 15 * 60000).toISOString(),
    },
    {
      id: 'req-demo-2',
      patientId: 'usr-patient-1',
      patientName: 'Sarah Connor (Dependent: John Connor)',
      patientPhone: '+1 (555) 012-3456',
      patientEmail: 'patient@demo.org',
      hospitalId: metroHospitalId,
      hospitalName: 'Metro Health Center of Excellence',
      departmentId: 'dept-m-2',
      specialtyName: 'Cardiology',
      bedCategoryId: 'bed-m-icu',
      bedCategoryName: 'ICU',
      acuityLevel: 'emergency',
      chiefComplaint: 'Substernal chest pressure radiating to left arm.',
      medicalNotes: 'History of hypertension. Aspirin 325mg taken.',
      status: 'Accepted',
      statusReason: 'ICU Bed held under emergency hold protocol.',
      statusHistory: [
        {
          status: 'Submitted',
          changedBy: 'usr-patient-1',
          changedAt: new Date(Date.now() - 40 * 60000).toISOString(),
        },
        {
          status: 'Under Review',
          changedBy: 'usr-staff-1',
          changedAt: new Date(Date.now() - 30 * 60000).toISOString(),
        },
        {
          status: 'Accepted',
          changedBy: 'usr-staff-1',
          changedAt: new Date(Date.now() - 10 * 60000).toISOString(),
          reason: 'Emergency hold active. Bed held for 30 minutes.',
        },
      ],
      reservationId: 'res-demo-2',
      reservationExpiresAt: new Date(Date.now() + 20 * 60000).toISOString(), // 20 mins from now
      createdAt: new Date(Date.now() - 40 * 60000).toISOString(),
      updatedAt: new Date(Date.now() - 10 * 60000).toISOString(),
    },
  ];

  const initialReservations: CapacityReservation[] = [
    {
      id: 'res-demo-2',
      requestId: 'req-demo-2',
      hospitalId: metroHospitalId,
      bedCategoryId: 'bed-m-icu',
      patientId: 'usr-patient-1',
      reservedAt: new Date(Date.now() - 10 * 60000).toISOString(),
      expiresAt: new Date(Date.now() + 20 * 60000).toISOString(),
      status: 'active',
    },
  ];

  const initialNotifications: InAppNotification[] = [
    {
      id: 'notif-1',
      userId: 'usr-patient-1',
      title: 'Admission Request Accepted',
      message: 'Metro Health Center has accepted request #req-demo-2. An ICU bed reservation is held for 30 minutes.',
      type: 'success',
      read: false,
      linkUrl: '/requests',
      createdAt: new Date(Date.now() - 10 * 60000).toISOString(),
    },
    {
      id: 'notif-2',
      userId: 'usr-staff-1',
      title: 'New Admission Request Received',
      message: 'New Urgent admission request #req-demo-1 for Emergency Medicine received.',
      type: 'info',
      read: true,
      linkUrl: '/dashboard/admissions',
      createdAt: new Date(Date.now() - 25 * 60000).toISOString(),
    },
  ];

  const initialAuditLogs: AuditLog[] = [
    {
      id: 'audit-1',
      timestamp: new Date(Date.now() - 25 * 60000).toISOString(),
      actorId: 'usr-patient-1',
      actorEmail: 'patient@demo.org',
      actorRole: 'patient',
      action: 'admission_request.created',
      entityType: 'admission_request',
      entityId: 'req-demo-1',
      metadata: { hospitalId: metroHospitalId, acuity: 'urgent' },
    },
    {
      id: 'audit-2',
      timestamp: new Date(Date.now() - 10 * 60000).toISOString(),
      actorId: 'usr-staff-1',
      actorEmail: 'staff@metrohealth.org',
      actorRole: 'hospital_staff',
      action: 'admission_request.accepted',
      entityType: 'admission_request',
      entityId: 'req-demo-2',
      metadata: { bedCategoryId: 'bed-m-icu', reservationId: 'res-demo-2' },
    },
  ];

  return {
    profiles,
    specialties,
    hospitals,
    admissionRequests: initialRequests,
    reservations: initialReservations,
    notifications: initialNotifications,
    auditLogs: initialAuditLogs,
  };
}

class Database {
  private data: DatabaseSchema;
  private saveTimeout: NodeJS.Timeout | null = null;
  private listeners: Array<(event: string, payload: unknown) => void> = [];

  constructor() {
    this.data = this.load();
    this.startScheduledTasks();
  }

  private load(): DatabaseSchema {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (err) {
      console.error('Error reading database file, recreating seed data:', err);
    }
    const seed = createSeedData();
    this.writeSync(seed);
    return seed;
  }

  private writeSync(data: DatabaseSchema): void {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  }

  public save(): void {
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => {
      this.writeSync(this.data);
    }, 200);
  }

  public subscribe(cb: (event: string, payload: unknown) => void): () => void {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  public emit(event: string, payload: unknown): void {
    for (const listener of this.listeners) {
      try {
        listener(event, payload);
      } catch (e) {
        console.error('Error in listener', e);
      }
    }
  }

  // --- Scheduled reservation expiry check ---
  private startScheduledTasks(): void {
    setInterval(() => {
      this.checkExpiredReservations();
    }, 10000); // Check every 10 seconds
  }

  public checkExpiredReservations(): void {
    const now = new Date();
    let updated = false;

    for (const reservation of this.data.reservations) {
      if (reservation.status === 'active' && new Date(reservation.expiresAt).getTime() <= now.getTime()) {
        reservation.status = 'expired';
        updated = true;

        // Release bed reservation from hospital capacity
        const hospital = this.data.hospitals.find((h) => h.id === reservation.hospitalId);
        if (hospital && hospital.bedCategories) {
          const category = hospital.bedCategories.find((b) => b.id === reservation.bedCategoryId);
          if (category && category.reservedCount > 0) {
            category.reservedCount -= 1;
            const cap = calculateCapacity({
              physicalCapacity: category.physicalCapacity,
              unavailableCount: category.unavailableCount,
              occupiedCount: category.occupiedCount,
              reservedCount: category.reservedCount,
            });
            if (cap.isValid) {
              category.availableBeds = cap.availableBeds;
            }
            category.lastUpdated = now.toISOString();
            hospital.lastCapacityUpdate = now.toISOString();
          }
        }

        // Update corresponding request status to Expired
        const request = this.data.admissionRequests.find((r) => r.id === reservation.requestId);
        if (request && request.status === 'Accepted') {
          request.status = 'Expired';
          request.statusReason = 'Automated system: Reservation hold expired without patient check-in.';
          request.statusHistory.push({
            status: 'Expired',
            changedBy: 'system-timer',
            changedAt: now.toISOString(),
            reason: '30-minute reservation hold period elapsed',
          });
          request.updatedAt = now.toISOString();

          // Notify patient
          this.data.notifications.push({
            id: `notif-${crypto.randomUUID()}`,
            userId: request.patientId,
            title: 'Reservation Expired',
            message: `Your bed hold at ${request.hospitalName} has expired. Please contact the hospital directly if you still require care.`,
            type: 'alert',
            read: false,
            linkUrl: '/requests',
            createdAt: now.toISOString(),
          });
        }

        // Record audit
        this.data.auditLogs.push({
          id: `audit-${crypto.randomUUID()}`,
          timestamp: now.toISOString(),
          actorId: 'system',
          actorEmail: 'system-scheduler@myhospital.internal',
          actorRole: 'admin',
          action: 'capacity_reservation.expired',
          entityType: 'capacity_reservation',
          entityId: reservation.id,
          metadata: { hospitalId: reservation.hospitalId, requestId: reservation.requestId },
        });

        this.emit('reservation.expired', { reservationId: reservation.id, requestId: reservation.requestId });
      }
    }

    if (updated) {
      this.save();
      this.emit('capacity.updated', { timestamp: now.toISOString() });
    }
  }

  // --- Profile / Auth Methods ---
  public getProfiles(): UserProfile[] {
    return this.data.profiles;
  }

  public getProfileByEmail(email: string): UserProfile | undefined {
    return this.data.profiles.find((p) => p.email.toLowerCase() === email.toLowerCase());
  }

  public getProfileById(id: string): UserProfile | undefined {
    return this.data.profiles.find((p) => p.id === id);
  }

  public createProfile(profile: UserProfile): UserProfile {
    this.data.profiles.push(profile);
    this.save();
    return profile;
  }

  public updateProfile(id: string, updates: Partial<UserProfile>): UserProfile | null {
    const p = this.data.profiles.find((x) => x.id === id);
    if (!p) return null;
    Object.assign(p, updates, { updatedAt: new Date().toISOString() });
    this.save();
    return p;
  }

  // --- Hospitals ---
  public getHospitals(): Hospital[] {
    return this.data.hospitals;
  }

  public getHospitalById(id: string): Hospital | undefined {
    return this.data.hospitals.find((h) => h.id === id);
  }

  public updateHospital(id: string, updates: Partial<Hospital>): Hospital | null {
    const h = this.data.hospitals.find((x) => x.id === id);
    if (!h) return null;
    Object.assign(h, updates, { updatedAt: new Date().toISOString() });
    this.save();
    this.emit('hospital.updated', { hospitalId: id, updates });
    return h;
  }

  // --- Specialties ---
  public getSpecialties(): Specialty[] {
    return this.data.specialties;
  }

  public addSpecialty(name: string, description: string): Specialty {
    const s: Specialty = {
      id: `spec-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      name,
      description,
      isActive: true,
    };
    this.data.specialties.push(s);
    this.save();
    return s;
  }

  public toggleSpecialty(id: string, isActive: boolean): Specialty | null {
    const s = this.data.specialties.find((x) => x.id === id);
    if (!s) return null;
    s.isActive = isActive;
    this.save();
    return s;
  }

  // --- Requests ---
  public getAdmissionRequests(): AdmissionRequest[] {
    return this.data.admissionRequests;
  }

  public getAdmissionRequestById(id: string): AdmissionRequest | undefined {
    return this.data.admissionRequests.find((r) => r.id === id);
  }

  public createAdmissionRequest(request: AdmissionRequest): AdmissionRequest {
    this.data.admissionRequests.unshift(request);
    this.save();
    this.emit('admission.created', request);
    return request;
  }

  public updateAdmissionRequest(request: AdmissionRequest): void {
    const idx = this.data.admissionRequests.findIndex((r) => r.id === request.id);
    if (idx !== -1) {
      this.data.admissionRequests[idx] = request;
      this.save();
      this.emit('admission.updated', request);
    }
  }

  // --- Capacity Reservation ---
  public createReservation(res: CapacityReservation): void {
    this.data.reservations.unshift(res);
    this.save();
    this.emit('reservation.created', res);
  }

  // --- Notifications ---
  public getNotifications(userId: string): InAppNotification[] {
    return this.data.notifications.filter((n) => n.userId === userId);
  }

  public markNotificationRead(id: string, userId: string): boolean {
    const notif = this.data.notifications.find((n) => n.id === id && n.userId === userId);
    if (notif) {
      notif.read = true;
      this.save();
      return true;
    }
    return false;
  }

  public addNotification(notif: InAppNotification): void {
    this.data.notifications.unshift(notif);
    this.save();
    this.emit('notification.created', notif);
  }

  // --- Audit Logs ---
  public getAuditLogs(): AuditLog[] {
    return this.data.auditLogs;
  }

  public logAudit(log: Omit<AuditLog, 'id' | 'timestamp'>): AuditLog {
    const entry: AuditLog = {
      id: `audit-${crypto.randomUUID()}`,
      timestamp: new Date().toISOString(),
      ...log,
    };
    this.data.auditLogs.unshift(entry);
    this.save();
    return entry;
  }

  // Reset to initial demo seed data
  public resetToSeed(): DatabaseSchema {
    this.data = createSeedData();
    this.writeSync(this.data);
    this.emit('database.reset', { timestamp: new Date().toISOString() });
    return this.data;
  }
}

export const db = new Database();
