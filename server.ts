import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { db } from './server/db.ts';
import { calculateCapacity } from './src/lib/capacity.ts';
import { isValidAdmissionTransition, validateAdmissionSubmission, RESERVATION_HOLD_MINUTES } from './src/lib/admissions.ts';
import { UserProfile, AdmissionStatus, UserRole, AdmissionRequest, CapacityReservation } from './src/lib/types.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

app.use(express.json());

// In-memory token store for sessions
const sessions: Map<string, { userId: string; role: UserRole; expiresAt: number }> = new Map();

// Helper to authenticate request
function getAuthUser(req: Request): UserProfile | null {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;
  const token = authHeader.replace(/^Bearer\s+/, '');
  const session = sessions.get(token);
  if (!session) return null;
  if (session.expiresAt < Date.now()) {
    sessions.delete(token);
    return null;
  }
  return db.getProfileById(session.userId) || null;
}

// Auth Middleware
function requireAuth(req: Request, res: Response, next: NextFunction) {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Authentication required. Please sign in.' });
  }
  (req as any).user = user;
  next();
}

// Role Middleware
function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user as UserProfile;
    if (!user || !allowedRoles.includes(user.role)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient privileges for this operation.' });
    }
    next();
  };
}

// -----------------------------------------------------------------------------
// Real-time Server-Sent Events (SSE) Stream
// -----------------------------------------------------------------------------
const sseClients: Response[] = [];

app.get('/api/realtime/stream', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  sseClients.push(res);

  // Send initial connected event
  res.write(`data: ${JSON.stringify({ type: 'connected', time: new Date().toISOString() })}\n\n`);

  const keepAlive = setInterval(() => {
    res.write(': keepalive\n\n');
  }, 25000);

  req.on('close', () => {
    clearInterval(keepAlive);
    const idx = sseClients.indexOf(res);
    if (idx !== -1) sseClients.splice(idx, 1);
  });
});

// Broadcast database events to all SSE clients
db.subscribe((event, payload) => {
  const message = `data: ${JSON.stringify({ type: event, payload })}\n\n`;
  for (const client of sseClients) {
    client.write(message);
  }
});

// -----------------------------------------------------------------------------
// Authentication Endpoints
// -----------------------------------------------------------------------------
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const profile = db.getProfileByEmail(email);
  if (!profile) {
    return res.status(401).json({ error: 'No account found with this email address.' });
  }

  // Generate secure session token (valid 24h)
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, {
    userId: profile.id,
    role: profile.role,
    expiresAt: Date.now() + 24 * 3600 * 1000,
  });

  db.logAudit({
    actorId: profile.id,
    actorEmail: profile.email,
    actorRole: profile.role,
    action: 'auth.login',
    entityType: 'user',
    entityId: profile.id,
  });

  return res.json({
    token,
    user: profile,
  });
});

// Patients register here. Users can NEVER self-assign admin or hospital_staff!
app.post('/api/auth/register', (req: Request, res: Response) => {
  const { email, fullName, phone } = req.body;
  if (!email || !fullName) {
    return res.status(400).json({ error: 'Email and full name are required' });
  }

  const existing = db.getProfileByEmail(email);
  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists.' });
  }

  // Security: strictly enforce role = 'patient' for public self-registration
  const newProfile: UserProfile = {
    id: `usr-${crypto.randomUUID()}`,
    email: email.trim().toLowerCase(),
    fullName: fullName.trim(),
    role: 'patient',
    phone: phone ? phone.trim() : undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.createProfile(newProfile);

  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, {
    userId: newProfile.id,
    role: 'patient',
    expiresAt: Date.now() + 24 * 3600 * 1000,
  });

  db.logAudit({
    actorId: newProfile.id,
    actorEmail: newProfile.email,
    actorRole: 'patient',
    action: 'auth.register',
    entityType: 'user',
    entityId: newProfile.id,
  });

  return res.status(201).json({
    token,
    user: newProfile,
  });
});

app.get('/api/auth/me', requireAuth, (req: Request, res: Response) => {
  return res.json({ user: (req as any).user });
});

app.post('/api/auth/logout', requireAuth, (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.replace(/^Bearer\s+/, '');
    sessions.delete(token);
  }
  return res.json({ success: true });
});

// Password recovery mock endpoint
app.post('/api/auth/recover-password', (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }
  return res.json({
    message: 'If an account exists for this address, password reset instructions have been sent.',
  });
});

// -----------------------------------------------------------------------------
// Specialties API
// -----------------------------------------------------------------------------
app.get('/api/specialties', (req: Request, res: Response) => {
  const specialties = db.getSpecialties().filter((s) => s.isActive);
  return res.json(specialties);
});

// -----------------------------------------------------------------------------
// Hospital Discovery & Details
// -----------------------------------------------------------------------------
app.get('/api/hospitals', (req: Request, res: Response) => {
  const { search, specialty, emergency, locality } = req.query;
  let hospitals = db.getHospitals();

  // Filter unverified hospitals from public discovery unless staff/admin or demo
  hospitals = hospitals.filter((h) => h.verificationStatus === 'verified' || h.isSimulatedDemo);

  if (search) {
    const term = String(search).toLowerCase();
    hospitals = hospitals.filter(
      (h) =>
        h.name.toLowerCase().includes(term) ||
        h.locality.toLowerCase().includes(term) ||
        h.city.toLowerCase().includes(term) ||
        h.departments?.some((d) => d.specialtyName.toLowerCase().includes(term))
    );
  }

  if (specialty) {
    const spec = String(specialty).toLowerCase();
    hospitals = hospitals.filter((h) =>
      h.departments?.some((d) => d.isActive && (d.specialtyId === spec || d.specialtyName.toLowerCase().includes(spec)))
    );
  }

  if (emergency === 'true') {
    hospitals = hospitals.filter((h) => h.emergencyStatus === 'accepting');
  }

  if (locality) {
    const loc = String(locality).toLowerCase();
    hospitals = hospitals.filter((h) => h.locality.toLowerCase().includes(loc) || h.city.toLowerCase().includes(loc));
  }

  return res.json(hospitals);
});

app.get('/api/hospitals/:id', (req: Request, res: Response) => {
  const hospital = db.getHospitalById(req.params.id);
  if (!hospital) {
    return res.status(404).json({ error: 'Hospital not found.' });
  }
  return res.json(hospital);
});

// -----------------------------------------------------------------------------
// Hospital Staff Management Endpoints
// -----------------------------------------------------------------------------

// Update Capacity (Staff & Admin)
app.post('/api/hospitals/:id/capacity', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as UserProfile;
  const hospitalId = req.params.id;

  if (user.role !== 'admin' && (user.role !== 'hospital_staff' || user.assignedHospitalId !== hospitalId)) {
    return res.status(403).json({ error: 'Forbidden: You can only update capacity for your assigned hospital.' });
  }

  const hospital = db.getHospitalById(hospitalId);
  if (!hospital) {
    return res.status(404).json({ error: 'Hospital not found.' });
  }

  const { categoryId, physicalCapacity, unavailableCount, occupiedCount } = req.body;

  if (!hospital.bedCategories) {
    hospital.bedCategories = [];
  }

  const category = hospital.bedCategories.find((b) => b.id === categoryId);
  if (!category) {
    return res.status(404).json({ error: 'Bed category not found.' });
  }

  // Server-side capacity invariant validation
  const calculated = calculateCapacity({
    physicalCapacity: Number(physicalCapacity),
    unavailableCount: Number(unavailableCount),
    occupiedCount: Number(occupiedCount),
    reservedCount: category.reservedCount, // Cannot be edited directly; maintained by reservation flow
  });

  if (!calculated.isValid) {
    return res.status(400).json({ error: calculated.error });
  }

  // Update category
  category.physicalCapacity = calculated.physicalCapacity;
  category.unavailableCount = calculated.unavailableCount;
  category.usableCapacity = calculated.usableCapacity;
  category.occupiedCount = calculated.occupiedCount;
  category.availableBeds = calculated.availableBeds;
  category.lastUpdated = new Date().toISOString();
  hospital.lastCapacityUpdate = new Date().toISOString();

  db.save();
  db.emit('capacity.updated', { hospitalId, categoryId });

  db.logAudit({
    actorId: user.id,
    actorEmail: user.email,
    actorRole: user.role,
    action: 'capacity.updated',
    entityType: 'bed_category',
    entityId: categoryId,
    metadata: { hospitalId, availableBeds: category.availableBeds },
  });

  return res.json({ success: true, category });
});

// Update Emergency Status
app.patch('/api/hospitals/:id/emergency-status', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as UserProfile;
  const hospitalId = req.params.id;

  if (user.role !== 'admin' && (user.role !== 'hospital_staff' || user.assignedHospitalId !== hospitalId)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { emergencyStatus, waitingTimeEstimateMinutes } = req.body;
  const hospital = db.getHospitalById(hospitalId);
  if (!hospital) return res.status(404).json({ error: 'Hospital not found' });

  if (emergencyStatus) hospital.emergencyStatus = emergencyStatus;
  if (waitingTimeEstimateMinutes !== undefined) hospital.waitingTimeEstimateMinutes = Number(waitingTimeEstimateMinutes);
  hospital.updatedAt = new Date().toISOString();

  db.save();
  db.emit('hospital.updated', { hospitalId, emergencyStatus });

  return res.json({ success: true, hospital });
});

// Update Doctor Shifts
app.post('/api/hospitals/:id/doctors', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as UserProfile;
  const hospitalId = req.params.id;

  if (user.role !== 'admin' && (user.role !== 'hospital_staff' || user.assignedHospitalId !== hospitalId)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const hospital = db.getHospitalById(hospitalId);
  if (!hospital) return res.status(404).json({ error: 'Hospital not found' });

  const { doctorName, designation, specialtyId, departmentId, shiftStart, shiftEnd, isOnDuty, isOnCall, notes } = req.body;
  if (!doctorName || !designation) {
    return res.status(400).json({ error: 'Doctor name and designation are required' });
  }

  if (!hospital.doctorShifts) hospital.doctorShifts = [];

  const newShift = {
    id: `doc-${crypto.randomUUID()}`,
    hospitalId,
    departmentId: departmentId || (hospital.departments?.[0]?.id ?? ''),
    specialtyId: specialtyId || (hospital.departments?.[0]?.specialtyId ?? ''),
    doctorName: doctorName.trim(),
    designation: designation.trim(),
    shiftStart: shiftStart || '08:00',
    shiftEnd: shiftEnd || '20:00',
    isOnDuty: Boolean(isOnDuty),
    isOnCall: Boolean(isOnCall),
    notes: notes ? notes.trim() : undefined,
    lastUpdated: new Date().toISOString(),
  };

  hospital.doctorShifts.push(newShift);
  hospital.updatedAt = new Date().toISOString();

  db.save();
  db.emit('hospital.updated', { hospitalId });

  return res.status(201).json({ success: true, doctorShift: newShift });
});

// Update Diagnostic Services
app.patch('/api/hospitals/:id/services/:serviceId', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as UserProfile;
  const { id: hospitalId, serviceId } = req.params;

  if (user.role !== 'admin' && (user.role !== 'hospital_staff' || user.assignedHospitalId !== hospitalId)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const hospital = db.getHospitalById(hospitalId);
  if (!hospital) return res.status(404).json({ error: 'Hospital not found' });

  const service = hospital.services?.find((s) => s.id === serviceId);
  if (!service) return res.status(404).json({ error: 'Service not found' });

  const { isOperational, acceptingPatients, notes } = req.body;
  if (isOperational !== undefined) service.isOperational = Boolean(isOperational);
  if (acceptingPatients !== undefined) service.acceptingPatients = Boolean(acceptingPatients);
  if (notes !== undefined) service.notes = notes;
  service.lastUpdated = new Date().toISOString();
  hospital.updatedAt = new Date().toISOString();

  db.save();
  db.emit('hospital.updated', { hospitalId });

  return res.json({ success: true, service });
});

// -----------------------------------------------------------------------------
// Admission Requests & Capacity Reservations
// -----------------------------------------------------------------------------

// Submit admission request (Patient)
app.post('/api/admissions', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as UserProfile;
  const { hospitalId, departmentId, bedCategoryId, acuityLevel, chiefComplaint, medicalNotes, patientName, patientPhone } = req.body;

  // Validation
  const validation = validateAdmissionSubmission({
    patientName: patientName || user.fullName,
    patientPhone: patientPhone || user.phone,
    chiefComplaint,
    hospitalId,
    departmentId,
  });

  if (!validation.isValid) {
    return res.status(400).json({ error: validation.error });
  }

  const hospital = db.getHospitalById(hospitalId);
  if (!hospital) {
    return res.status(404).json({ error: 'Selected hospital does not exist' });
  }

  const department = hospital.departments?.find((d) => d.id === departmentId);
  if (!department) {
    return res.status(400).json({ error: 'Department does not belong to the selected hospital' });
  }

  // Duplicate check: prevent duplicate requests for same patient & hospital within 3 minutes
  const recent = db.getAdmissionRequests().find(
    (r) =>
      r.patientId === user.id &&
      r.hospitalId === hospitalId &&
      ['Submitted', 'Under Review'].includes(r.status) &&
      Date.now() - new Date(r.createdAt).getTime() < 3 * 60 * 1000
  );

  if (recent) {
    return res.status(429).json({
      error: 'You already have an active admission request under review at this hospital. Please wait for an update.',
    });
  }

  const bedCategory = hospital.bedCategories?.find((b) => b.id === bedCategoryId);

  const newRequest: AdmissionRequest = {
    id: `req-${crypto.randomUUID().slice(0, 8)}`,
    patientId: user.id,
    patientName: (patientName || user.fullName).trim(),
    patientPhone: (patientPhone || user.phone || '').trim(),
    patientEmail: user.email,
    hospitalId,
    hospitalName: hospital.name,
    departmentId,
    specialtyName: department.specialtyName,
    bedCategoryId: bedCategory?.id,
    bedCategoryName: bedCategory?.categoryName,
    acuityLevel: acuityLevel || 'routine',
    chiefComplaint: chiefComplaint.trim(),
    medicalNotes: medicalNotes ? medicalNotes.trim() : undefined,
    status: 'Submitted',
    statusHistory: [
      {
        status: 'Submitted',
        changedBy: user.id,
        changedAt: new Date().toISOString(),
        reason: 'Patient submitted digital coordination request',
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.createAdmissionRequest(newRequest);

  // Notify hospital staff
  const staffMembers = db.getProfiles().filter((p) => p.role === 'hospital_staff' && p.assignedHospitalId === hospitalId);
  for (const staff of staffMembers) {
    db.addNotification({
      id: `notif-${crypto.randomUUID()}`,
      userId: staff.id,
      title: 'New Admission Request Received',
      message: `New ${newRequest.acuityLevel.toUpperCase()} request #${newRequest.id} for ${newRequest.specialtyName}.`,
      type: 'info',
      read: false,
      linkUrl: `/dashboard/admissions`,
      createdAt: new Date().toISOString(),
    });
  }

  db.logAudit({
    actorId: user.id,
    actorEmail: user.email,
    actorRole: user.role,
    action: 'admission_request.created',
    entityType: 'admission_request',
    entityId: newRequest.id,
    metadata: { hospitalId, acuityLevel: newRequest.acuityLevel },
  });

  return res.status(201).json({ success: true, request: newRequest });
});

// Patient: Get own requests
app.get('/api/admissions/my', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as UserProfile;
  const requests = db.getAdmissionRequests().filter((r) => r.patientId === user.id);
  return res.json(requests);
});

// Hospital Staff: Get hospital's requests
app.get('/api/hospitals/:id/admissions', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as UserProfile;
  const hospitalId = req.params.id;

  if (user.role !== 'admin' && (user.role !== 'hospital_staff' || user.assignedHospitalId !== hospitalId)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const requests = db.getAdmissionRequests().filter((r) => r.hospitalId === hospitalId);
  return res.json(requests);
});

// Staff / Admin: Update Admission Request Status with strict Transition Matrix
app.patch('/api/admissions/:id/status', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as UserProfile;
  const requestId = req.params.id;
  const { nextStatus, reason, targetBedCategoryId } = req.body as {
    nextStatus: AdmissionStatus;
    reason?: string;
    targetBedCategoryId?: string;
  };

  const request = db.getAdmissionRequestById(requestId);
  if (!request) {
    return res.status(404).json({ error: 'Admission request not found' });
  }

  // Permission check
  if (user.role !== 'admin' && (user.role !== 'hospital_staff' || user.assignedHospitalId !== request.hospitalId)) {
    return res.status(403).json({ error: 'Forbidden: You cannot review requests for this hospital.' });
  }

  // Transition Matrix Check
  if (!isValidAdmissionTransition(request.status, nextStatus)) {
    return res.status(400).json({
      error: `Invalid status transition: Cannot change status from "${request.status}" to "${nextStatus}".`,
    });
  }

  const hospital = db.getHospitalById(request.hospitalId);
  if (!hospital) {
    return res.status(404).json({ error: 'Associated hospital not found.' });
  }

  const now = new Date();

  // If transitioning to "Accepted": Create Atomic Bed Reservation Hold
  if (nextStatus === 'Accepted') {
    const bedCatId = targetBedCategoryId || request.bedCategoryId;
    if (!bedCatId) {
      return res.status(400).json({ error: 'A specific bed category must be selected to hold capacity.' });
    }

    const category = hospital.bedCategories?.find((b) => b.id === bedCatId);
    if (!category) {
      return res.status(400).json({ error: 'Selected bed category does not exist in this hospital.' });
    }

    // Check available beds
    if (category.availableBeds <= 0) {
      return res.status(409).json({
        error: `Cannot accept: Zero beds available in ${category.categoryName} category. Please choose another category or decline.`,
      });
    }

    // Atomic reservation hold: increase reservedCount, calculate new availableBeds
    category.reservedCount += 1;
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

    const expiresAt = new Date(now.getTime() + RESERVATION_HOLD_MINUTES * 60 * 1000).toISOString();
    const reservationId = `res-${crypto.randomUUID().slice(0, 8)}`;

    const reservation: CapacityReservation = {
      id: reservationId,
      requestId: request.id,
      hospitalId: hospital.id,
      bedCategoryId: category.id,
      patientId: request.patientId,
      reservedAt: now.toISOString(),
      expiresAt,
      status: 'active',
    };

    db.createReservation(reservation);

    request.reservationId = reservationId;
    request.reservationExpiresAt = expiresAt;
    request.bedCategoryId = category.id;
    request.bedCategoryName = category.categoryName;
  }

  // If transitioning from Accepted to Completed or Cancelled: release or claim reservation
  if (request.status === 'Accepted') {
    if (request.bedCategoryId) {
      const category = hospital.bedCategories?.find((b) => b.id === request.bedCategoryId);
      if (category && category.reservedCount > 0) {
        category.reservedCount -= 1;
        if (nextStatus === 'Completed') {
          // Patient arrived: convert reserved to occupied
          category.occupiedCount += 1;
        }
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
  }

  request.status = nextStatus;
  if (reason) request.statusReason = reason.trim();
  request.statusHistory.push({
    status: nextStatus,
    changedBy: user.id,
    changedAt: now.toISOString(),
    reason: reason ? reason.trim() : undefined,
  });
  request.updatedAt = now.toISOString();

  db.updateAdmissionRequest(request);

  // Notify patient
  db.addNotification({
    id: `notif-${crypto.randomUUID()}`,
    userId: request.patientId,
    title: `Admission Request ${nextStatus}`,
    message: `${hospital.name} has marked your admission request #${request.id} as ${nextStatus}.${reason ? ` Note: ${reason}` : ''}`,
    type: nextStatus === 'Accepted' ? 'success' : nextStatus === 'Declined' ? 'alert' : 'info',
    read: false,
    linkUrl: '/requests',
    createdAt: now.toISOString(),
  });

  db.logAudit({
    actorId: user.id,
    actorEmail: user.email,
    actorRole: user.role,
    action: `admission_request.${nextStatus.toLowerCase().replace(/\s+/g, '_')}`,
    entityType: 'admission_request',
    entityId: request.id,
    metadata: { nextStatus, reason },
  });

  return res.json({ success: true, request });
});

// Patient: Cancel own request
app.post('/api/admissions/:id/cancel', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as UserProfile;
  const requestId = req.params.id;

  const request = db.getAdmissionRequestById(requestId);
  if (!request) return res.status(404).json({ error: 'Request not found' });

  if (request.patientId !== user.id && user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  if (['Declined', 'Cancelled', 'Expired', 'Completed'].includes(request.status)) {
    return res.status(400).json({ error: 'This request is already finalized and cannot be cancelled.' });
  }

  const now = new Date();

  // If it was accepted and had a reservation, release it
  if (request.status === 'Accepted' && request.bedCategoryId) {
    const hospital = db.getHospitalById(request.hospitalId);
    if (hospital && hospital.bedCategories) {
      const cat = hospital.bedCategories.find((b) => b.id === request.bedCategoryId);
      if (cat && cat.reservedCount > 0) {
        cat.reservedCount -= 1;
        const cap = calculateCapacity({
          physicalCapacity: cat.physicalCapacity,
          unavailableCount: cat.unavailableCount,
          occupiedCount: cat.occupiedCount,
          reservedCount: cat.reservedCount,
        });
        if (cap.isValid) cat.availableBeds = cap.availableBeds;
        cat.lastUpdated = now.toISOString();
        hospital.lastCapacityUpdate = now.toISOString();
      }
    }
  }

  request.status = 'Cancelled';
  request.statusReason = 'Cancelled by patient';
  request.statusHistory.push({
    status: 'Cancelled',
    changedBy: user.id,
    changedAt: now.toISOString(),
    reason: 'Cancelled by patient',
  });
  request.updatedAt = now.toISOString();

  db.updateAdmissionRequest(request);

  db.logAudit({
    actorId: user.id,
    actorEmail: user.email,
    actorRole: user.role,
    action: 'admission_request.cancelled',
    entityType: 'admission_request',
    entityId: request.id,
  });

  return res.json({ success: true, request });
});

// -----------------------------------------------------------------------------
// In-App Notifications API
// -----------------------------------------------------------------------------
app.get('/api/notifications', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as UserProfile;
  const notifs = db.getNotifications(user.id);
  return res.json(notifs);
});

app.patch('/api/notifications/:id/read', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as UserProfile;
  const success = db.markNotificationRead(req.params.id, user.id);
  return res.json({ success });
});

// -----------------------------------------------------------------------------
// Administrator Endpoints
// -----------------------------------------------------------------------------
app.get('/api/admin/stats', requireAuth, requireRole('admin'), (req: Request, res: Response) => {
  const hospitals = db.getHospitals();
  const requests = db.getAdmissionRequests();
  const users = db.getProfiles();

  const verifiedHospitals = hospitals.filter((h) => h.verificationStatus === 'verified').length;
  const unverifiedHospitals = hospitals.filter((h) => h.verificationStatus === 'unverified').length;
  const suspendedHospitals = hospitals.filter((h) => h.verificationStatus === 'suspended').length;

  // Stale capacity records (> 24 hours)
  const staleThreshold = Date.now() - 24 * 3600 * 1000;
  const staleCapacityCount = hospitals.filter(
    (h) => !h.lastCapacityUpdate || new Date(h.lastCapacityUpdate).getTime() < staleThreshold
  ).length;

  const activeReservations = requests.filter((r) => r.status === 'Accepted' && r.reservationExpiresAt && new Date(r.reservationExpiresAt).getTime() > Date.now()).length;

  return res.json({
    totalHospitals: hospitals.length,
    verifiedHospitals,
    unverifiedHospitals,
    suspendedHospitals,
    staleCapacityCount,
    totalRequests: requests.length,
    activeReservations,
    totalUsers: users.length,
  });
});

app.get('/api/admin/hospitals', requireAuth, requireRole('admin'), (req: Request, res: Response) => {
  return res.json(db.getHospitals());
});

app.patch('/api/admin/hospitals/:id/verify', requireAuth, requireRole('admin'), (req: Request, res: Response) => {
  const user = (req as any).user as UserProfile;
  const { status } = req.body; // 'verified' | 'unverified' | 'suspended'

  if (!['verified', 'unverified', 'suspended'].includes(status)) {
    return res.status(400).json({ error: 'Invalid verification status' });
  }

  const hospital = db.updateHospital(req.params.id, { verificationStatus: status });
  if (!hospital) return res.status(404).json({ error: 'Hospital not found' });

  db.logAudit({
    actorId: user.id,
    actorEmail: user.email,
    actorRole: 'admin',
    action: `hospital.verification_${status}`,
    entityType: 'hospital',
    entityId: hospital.id,
    metadata: { status },
  });

  return res.json({ success: true, hospital });
});

app.get('/api/admin/users', requireAuth, requireRole('admin'), (req: Request, res: Response) => {
  return res.json(db.getProfiles());
});

app.patch('/api/admin/users/:id/role', requireAuth, requireRole('admin'), (req: Request, res: Response) => {
  const admin = (req as any).user as UserProfile;
  const { role, assignedHospitalId } = req.body;

  if (!['patient', 'hospital_staff', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  const updated = db.updateProfile(req.params.id, {
    role,
    assignedHospitalId: role === 'hospital_staff' ? assignedHospitalId : undefined,
  });

  if (!updated) return res.status(404).json({ error: 'User not found' });

  db.logAudit({
    actorId: admin.id,
    actorEmail: admin.email,
    actorRole: 'admin',
    action: 'user.role_change',
    entityType: 'user',
    entityId: updated.id,
    metadata: { newRole: role, assignedHospitalId },
  });

  return res.json({ success: true, user: updated });
});

app.get('/api/admin/specialties', requireAuth, requireRole('admin'), (req: Request, res: Response) => {
  return res.json(db.getSpecialties());
});

app.post('/api/admin/specialties', requireAuth, requireRole('admin'), (req: Request, res: Response) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Specialty name is required' });
  const specialty = db.addSpecialty(name.trim(), description ? description.trim() : '');
  return res.status(201).json({ success: true, specialty });
});

app.patch('/api/admin/specialties/:id', requireAuth, requireRole('admin'), (req: Request, res: Response) => {
  const { isActive } = req.body;
  const specialty = db.toggleSpecialty(req.params.id, Boolean(isActive));
  if (!specialty) return res.status(404).json({ error: 'Specialty not found' });
  return res.json({ success: true, specialty });
});

app.get('/api/admin/audit-logs', requireAuth, requireRole('admin'), (req: Request, res: Response) => {
  return res.json(db.getAuditLogs().slice(0, 100));
});

// Admin reset to demo seed data
app.post('/api/admin/seed-demo', requireAuth, requireRole('admin'), (req: Request, res: Response) => {
  db.resetToSeed();
  return res.json({ success: true, message: 'Database reset to demo seed dataset.' });
});

// -----------------------------------------------------------------------------
// Vite Middleware / Static Frontend Mounting
// -----------------------------------------------------------------------------
async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MyHospital server listening on http://0.0.0.0:${PORT} (mode: ${isProduction ? 'prod' : 'dev'})`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
