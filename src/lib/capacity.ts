/**
 * Pure capacity logic and mathematical invariants for MyHospital.
 * 
 * Rules:
 * 1. Physical capacity: all configured beds.
 * 2. Unavailable count: beds temporarily out of service.
 * 3. Usable capacity = physical capacity - unavailable count.
 * 4. Available beds = usable capacity - occupied count - reserved count.
 * 5. Unavailable beds must not be deducted twice.
 * 6. Enforce nonnegative values.
 * 7. Prevent occupied + reserved beds from exceeding usable capacity.
 */

export interface CapacityInput {
  physicalCapacity: number;
  unavailableCount: number;
  occupiedCount: number;
  reservedCount?: number;
}

export interface CapacityOutput {
  physicalCapacity: number;
  unavailableCount: number;
  usableCapacity: number;
  occupiedCount: number;
  reservedCount: number;
  availableBeds: number;
  isValid: boolean;
  error?: string;
}

/**
 * Validates and computes exact capacity counts based on the single consistent capacity model.
 */
export function calculateCapacity(input: CapacityInput): CapacityOutput {
  const physical = Math.floor(input.physicalCapacity);
  const unavailable = Math.floor(input.unavailableCount);
  const occupied = Math.floor(input.occupiedCount);
  const reserved = Math.floor(input.reservedCount ?? 0);

  if (physical < 0) {
    return {
      physicalCapacity: physical,
      unavailableCount: unavailable,
      usableCapacity: 0,
      occupiedCount: occupied,
      reservedCount: reserved,
      availableBeds: 0,
      isValid: false,
      error: 'Physical capacity must be non-negative',
    };
  }

  if (unavailable < 0 || occupied < 0 || reserved < 0) {
    return {
      physicalCapacity: physical,
      unavailableCount: unavailable,
      usableCapacity: 0,
      occupiedCount: occupied,
      reservedCount: reserved,
      availableBeds: 0,
      isValid: false,
      error: 'Capacity components (unavailable, occupied, reserved) cannot be negative',
    };
  }

  if (unavailable > physical) {
    return {
      physicalCapacity: physical,
      unavailableCount: unavailable,
      usableCapacity: 0,
      occupiedCount: occupied,
      reservedCount: reserved,
      availableBeds: 0,
      isValid: false,
      error: 'Unavailable beds cannot exceed total physical capacity',
    };
  }

  const usableCapacity = physical - unavailable;

  if (occupied + reserved > usableCapacity) {
    return {
      physicalCapacity: physical,
      unavailableCount: unavailable,
      usableCapacity,
      occupiedCount: occupied,
      reservedCount: reserved,
      availableBeds: 0,
      isValid: false,
      error: `Occupied beds (${occupied}) + reserved beds (${reserved}) exceed usable capacity (${usableCapacity})`,
    };
  }

  const availableBeds = usableCapacity - occupied - reserved;

  return {
    physicalCapacity: physical,
    unavailableCount: unavailable,
    usableCapacity,
    occupiedCount: occupied,
    reservedCount: reserved,
    availableBeds,
    isValid: true,
  };
}

/**
 * Checks whether an atomic reservation can be made.
 */
export function canReserveBed(usableCapacity: number, occupiedCount: number, reservedCount: number): boolean {
  const available = usableCapacity - occupiedCount - reservedCount;
  return available > 0;
}
