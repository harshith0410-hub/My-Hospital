import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateCapacity, canReserveBed } from '../capacity.ts';
import { isValidAdmissionTransition, isReservationExpired, validateAdmissionSubmission } from '../admissions.ts';
import { calculateDistanceKm, calculateHospitalMatchScore } from '../matching.ts';
import type { Hospital } from '../types.ts';

test('capacity calculation enforces usable = physical - unavailable', () => {
  const result = calculateCapacity({
    physicalCapacity: 50,
    unavailableCount: 5,
    occupiedCount: 30,
    reservedCount: 5,
  });

  assert.equal(result.isValid, true);
  assert.equal(result.usableCapacity, 45); // 50 - 5
  assert.equal(result.availableBeds, 10);  // 45 - 30 - 5
});

test('capacity calculation rejects unavailable exceeding physical', () => {
  const result = calculateCapacity({
    physicalCapacity: 20,
    unavailableCount: 25,
    occupiedCount: 0,
    reservedCount: 0,
  });

  assert.equal(result.isValid, false);
  assert.match(result.error ?? '', /cannot exceed total physical/);
});

test('capacity calculation rejects occupied + reserved exceeding usable', () => {
  const result = calculateCapacity({
    physicalCapacity: 100,
    unavailableCount: 10, // Usable = 90
    occupiedCount: 85,
    reservedCount: 10,    // 85 + 10 = 95 > 90
  });

  assert.equal(result.isValid, false);
  assert.match(result.error ?? '', /exceed usable capacity/);
});

test('capacity calculation rejects negative counts', () => {
  const result = calculateCapacity({
    physicalCapacity: -10,
    unavailableCount: 0,
    occupiedCount: 0,
  });

  assert.equal(result.isValid, false);
});

test('canReserveBed evaluates correctly', () => {
  assert.equal(canReserveBed(50, 40, 9), true);  // 50 - 40 - 9 = 1 available
  assert.equal(canReserveBed(50, 40, 10), false); // 50 - 40 - 10 = 0 available
});

test('admission transition matrix allows valid state transitions', () => {
  // Submitted -> Under Review
  assert.equal(isValidAdmissionTransition('Submitted', 'Under Review'), true);
  // Submitted -> Cancelled
  assert.equal(isValidAdmissionTransition('Submitted', 'Cancelled'), true);
  // Under Review -> Accepted
  assert.equal(isValidAdmissionTransition('Under Review', 'Accepted'), true);
  // Under Review -> Declined
  assert.equal(isValidAdmissionTransition('Under Review', 'Declined'), true);
  // Accepted -> Completed
  assert.equal(isValidAdmissionTransition('Accepted', 'Completed'), true);
  // Accepted -> Expired
  assert.equal(isValidAdmissionTransition('Accepted', 'Expired'), true);
});

test('admission transition matrix rejects invalid skips and terminal escapes', () => {
  // Cannot jump from Submitted straight to Accepted or Completed
  assert.equal(isValidAdmissionTransition('Submitted', 'Accepted'), false);
  assert.equal(isValidAdmissionTransition('Submitted', 'Completed'), false);
  // Cannot transition from terminal states
  assert.equal(isValidAdmissionTransition('Declined', 'Accepted'), false);
  assert.equal(isValidAdmissionTransition('Completed', 'Under Review'), false);
  assert.equal(isValidAdmissionTransition('Cancelled', 'Accepted'), false);
  assert.equal(isValidAdmissionTransition('Expired', 'Accepted'), false);
  // Same status is not a valid transition
  assert.equal(isValidAdmissionTransition('Submitted', 'Submitted'), false);
});

test('reservation expiry check correctly detects passed timestamp', () => {
  const past = new Date(Date.now() - 60000).toISOString();
  const future = new Date(Date.now() + 60000).toISOString();
  assert.equal(isReservationExpired(past), true);
  assert.equal(isReservationExpired(future), false);
});

test('validateAdmissionSubmission verifies required patient details', () => {
  const invalid = validateAdmissionSubmission({
    patientName: '',
    patientPhone: '123',
    chiefComplaint: 'a',
  });
  assert.equal(invalid.isValid, false);

  const valid = validateAdmissionSubmission({
    patientName: 'Jane Doe',
    patientPhone: '555-0199',
    chiefComplaint: 'Severe chest discomfort and dizziness',
    hospitalId: 'hosp-1',
    departmentId: 'dept-1',
  });
  assert.equal(valid.isValid, true);
});

test('distance calculation computes reasonable km', () => {
  // Approximate distance between Central Hospital and City Hospital (same city ~3-5km)
  const dist = calculateDistanceKm(37.7749, -122.4194, 37.7849, -122.4094);
  assert.ok(dist > 0 && dist < 10);
});

test('hospital matching score prioritizes matching emergency and specialty', () => {
  const sampleHospital: Hospital = {
    id: 'hosp-1',
    name: 'Sample Medical Center',
    verificationStatus: 'verified',
    isSimulatedDemo: true,
    address: '100 Health Blvd',
    locality: 'Downtown',
    city: 'Metro City',
    state: 'CA',
    postalCode: '90210',
    latitude: 37.77,
    longitude: -122.41,
    emergencyPhone: '555-0911',
    generalPhone: '555-0100',
    email: 'info@sample.org',
    emergencyStatus: 'accepting',
    informationSource: 'hospital_reported',
    lastCapacityUpdate: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    departments: [
      { id: 'd-1', hospitalId: 'hosp-1', specialtyId: 'cardiology', specialtyName: 'Cardiology', isActive: true },
      { id: 'd-2', hospitalId: 'hosp-1', specialtyId: 'emergency_medicine', specialtyName: 'Emergency Medicine', isActive: true },
    ],
    bedCategories: [
      {
        id: 'bc-1',
        hospitalId: 'hosp-1',
        categoryName: 'ICU',
        physicalCapacity: 20,
        unavailableCount: 2,
        usableCapacity: 18,
        occupiedCount: 14,
        reservedCount: 0,
        availableBeds: 4,
        lastUpdated: new Date().toISOString(),
      },
    ],
  };

  const match = calculateHospitalMatchScore(sampleHospital, {
    targetSpecialtyId: 'cardiology',
    requireEmergency: true,
    requireIcu: true,
    userLat: 37.77,
    userLng: -122.41,
  });

  assert.ok(match.score >= 80, `Expected high match score, got ${match.score}`);
  assert.equal(match.factors.specialtyMatch, true);
  assert.equal(match.factors.emergencyMatch, true);
});
