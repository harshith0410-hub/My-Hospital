import type { Hospital } from './types.ts';

/**
 * Calculates distance in kilometers between two lat/lng coordinates (Haversine formula).
 */
export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export interface MatchingCriteria {
  userLat?: number;
  userLng?: number;
  targetSpecialtyId?: string;
  requireEmergency?: boolean;
  requireIcu?: boolean;
}

export interface MatchingResult {
  score: number; // 0 to 100
  factors: {
    specialtyMatch: boolean;
    emergencyMatch: boolean;
    capacityAvailable: boolean;
    dataFreshness: 'fresh' | 'stale' | 'unknown';
    distanceKm?: number;
  };
  explanation: string[];
}

/**
 * Calculates a transparent ranking score based on facility availability, specialty, distance, and reporting freshness.
 * Note: Transparent coordination score only; NOT clinical triage or medical advice.
 */
export function calculateHospitalMatchScore(
  hospital: Hospital,
  criteria: MatchingCriteria
): MatchingResult {
  let score = 50; // Base score
  const explanation: string[] = [];

  // 1. Specialty match (+25 or -20)
  let specialtyMatch = false;
  if (criteria.targetSpecialtyId) {
    const target = criteria.targetSpecialtyId.toLowerCase();
    specialtyMatch = !!hospital.departments?.some(
      (dept) => dept.isActive && (dept.specialtyId === criteria.targetSpecialtyId || dept.specialtyName.toLowerCase().includes(target))
    );
    if (specialtyMatch) {
      score += 25;
      explanation.push('Has active matching department/specialty');
    } else {
      score -= 20;
      explanation.push('Does not list matching specialty');
    }
  }

  // 2. Emergency readiness (+15 or -25)
  const isEmergencyAccepting = hospital.emergencyStatus === 'accepting';
  if (criteria.requireEmergency) {
    if (isEmergencyAccepting) {
      score += 15;
      explanation.push('Actively accepting emergency requests');
    } else {
      score -= 30;
      explanation.push('Emergency department is restricted or unavailable');
    }
  } else if (isEmergencyAccepting) {
    score += 5;
  }

  // 3. Bed availability
  let hasAvailableBeds = false;
  if (hospital.bedCategories && hospital.bedCategories.length > 0) {
    const totalAvail = hospital.bedCategories.reduce((acc, cat) => acc + (cat.availableBeds || 0), 0);
    if (totalAvail > 0) {
      hasAvailableBeds = true;
      score += 10;
      explanation.push(`${totalAvail} reported beds available`);
    } else {
      explanation.push('0 available beds reported');
    }
  }

  // 4. ICU requirement
  if (criteria.requireIcu && hospital.bedCategories) {
    const icu = hospital.bedCategories.find((b) => b.categoryName === 'ICU');
    if (icu && icu.availableBeds > 0) {
      score += 10;
      explanation.push(`${icu.availableBeds} ICU beds reported available`);
    } else {
      score -= 15;
      explanation.push('No available ICU beds reported');
    }
  }

  // 5. Freshness
  let dataFreshness: 'fresh' | 'stale' | 'unknown' = 'unknown';
  if (hospital.lastCapacityUpdate) {
    const diffHours = (Date.now() - new Date(hospital.lastCapacityUpdate).getTime()) / (1000 * 60 * 60);
    if (diffHours <= 6) {
      dataFreshness = 'fresh';
      score += 5;
      explanation.push('Data updated within the last 6 hours');
    } else if (diffHours <= 24) {
      dataFreshness = 'fresh';
      explanation.push('Data updated today');
    } else {
      dataFreshness = 'stale';
      score -= 10;
      explanation.push('Capacity data may be stale (>24h old)');
    }
  }

  // 6. Distance factor
  let distanceKm: number | undefined;
  if (criteria.userLat !== undefined && criteria.userLng !== undefined && hospital.latitude && hospital.longitude) {
    distanceKm = calculateDistanceKm(criteria.userLat, criteria.userLng, hospital.latitude, hospital.longitude);
    if (distanceKm < 5) {
      score += 10;
      explanation.push(`Very close (${distanceKm} km away)`);
    } else if (distanceKm < 15) {
      score += 5;
      explanation.push(`Within 15 km (${distanceKm} km)`);
    } else if (distanceKm > 40) {
      score -= 10;
      explanation.push(`Farther away (${distanceKm} km)`);
    }
  }

  // Clamp score between 0 and 100
  const normalizedScore = Math.max(5, Math.min(100, Math.round(score)));

  return {
    score: normalizedScore,
    factors: {
      specialtyMatch,
      emergencyMatch: isEmergencyAccepting,
      capacityAvailable: hasAvailableBeds,
      dataFreshness,
      distanceKm,
    },
    explanation,
  };
}
