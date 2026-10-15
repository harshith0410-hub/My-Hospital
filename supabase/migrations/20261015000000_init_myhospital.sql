-- ==============================================================================
-- MyHospital PostgreSQL Production Schema & Row Level Security Policies
-- Version: 20261015000000
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES (Users: Patient, Hospital Staff, Admin)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('patient', 'hospital_staff', 'admin')),
  phone TEXT,
  assigned_hospital_id UUID,
  assigned_department_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. SPECIALTIES
CREATE TABLE IF NOT EXISTS specialties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. HOSPITALS
CREATE TABLE IF NOT EXISTS hospitals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  tagline TEXT,
  verification_status TEXT NOT NULL DEFAULT 'unverified' CHECK (verification_status IN ('unverified', 'verified', 'suspended')),
  is_simulated_demo BOOLEAN NOT NULL DEFAULT FALSE,
  address TEXT NOT NULL,
  locality TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  emergency_phone TEXT NOT NULL,
  general_phone TEXT NOT NULL,
  email TEXT NOT NULL,
  website TEXT,
  emergency_status TEXT NOT NULL DEFAULT 'accepting' CHECK (emergency_status IN ('accepting', 'temporarily_unavailable', 'restricted_capacity', 'requires_confirmation')),
  waiting_time_estimate_minutes INTEGER,
  information_source TEXT NOT NULL DEFAULT 'hospital_reported' CHECK (information_source IN ('hospital_reported', 'estimated', 'simulated')),
  last_capacity_update TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. HOSPITAL STAFF ASSIGNMENTS
CREATE TABLE IF NOT EXISTS hospital_staff (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  department_id UUID,
  role_title TEXT NOT NULL DEFAULT 'Staff Member',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, hospital_id)
);

-- 5. DEPARTMENTS
CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  specialty_id UUID NOT NULL REFERENCES specialties(id) ON DELETE RESTRICT,
  contact_extension TEXT,
  floor_location TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (hospital_id, specialty_id)
);

-- 6. BED CATEGORIES & CAPACITY
CREATE TABLE IF NOT EXISTS bed_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  category_name TEXT NOT NULL CHECK (category_name IN ('ICU', 'General Ward', 'Private Room', 'Shared Room', 'Paediatric Bed')),
  physical_capacity INTEGER NOT NULL CHECK (physical_capacity >= 0),
  unavailable_count INTEGER NOT NULL DEFAULT 0 CHECK (unavailable_count >= 0),
  usable_capacity INTEGER GENERATED ALWAYS AS (physical_capacity - unavailable_count) STORED,
  occupied_count INTEGER NOT NULL DEFAULT 0 CHECK (occupied_count >= 0),
  reserved_count INTEGER NOT NULL DEFAULT 0 CHECK (reserved_count >= 0),
  available_beds INTEGER GENERATED ALWAYS AS (physical_capacity - unavailable_count - occupied_count - reserved_count) STORED,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_unavailable CHECK (unavailable_count <= physical_capacity),
  CONSTRAINT valid_occupancy CHECK (occupied_count + reserved_count <= (physical_capacity - unavailable_count)),
  UNIQUE (hospital_id, category_name)
);

-- 7. DOCTOR SHIFTS & DUTY ROSTER
CREATE TABLE IF NOT EXISTS doctor_shifts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  specialty_id UUID REFERENCES specialties(id) ON DELETE SET NULL,
  doctor_name TEXT NOT NULL,
  designation TEXT NOT NULL,
  shift_start TIMESTAMPTZ NOT NULL,
  shift_end TIMESTAMPTZ NOT NULL,
  is_on_duty BOOLEAN NOT NULL DEFAULT TRUE,
  is_on_call BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. HOSPITAL SERVICES & EQUIPMENT
CREATE TABLE IF NOT EXISTS hospital_services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  service_key TEXT NOT NULL,
  display_name TEXT NOT NULL,
  has_equipment BOOLEAN NOT NULL DEFAULT FALSE,
  is_operational BOOLEAN NOT NULL DEFAULT FALSE,
  accepting_patients BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (hospital_id, service_key)
);

-- 9. ADMISSION REQUESTS
CREATE TABLE IF NOT EXISTS admission_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  patient_name TEXT NOT NULL,
  patient_phone TEXT NOT NULL,
  patient_email TEXT NOT NULL,
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  bed_category_id UUID REFERENCES bed_categories(id) ON DELETE SET NULL,
  acuity_level TEXT NOT NULL CHECK (acuity_level IN ('routine', 'urgent', 'emergency')),
  chief_complaint TEXT NOT NULL,
  medical_notes TEXT,
  status TEXT NOT NULL DEFAULT 'Submitted' CHECK (status IN ('Submitted', 'Under Review', 'Accepted', 'Declined', 'Cancelled', 'Expired', 'Completed')),
  status_reason TEXT,
  reservation_id UUID,
  reservation_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. CAPACITY RESERVATIONS
CREATE TABLE IF NOT EXISTS capacity_reservations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID NOT NULL REFERENCES admission_requests(id) ON DELETE CASCADE,
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  bed_category_id UUID NOT NULL REFERENCES bed_categories(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reserved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'claimed', 'expired', 'released')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. REQUEST STATUS HISTORY
CREATE TABLE IF NOT EXISTS request_status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID NOT NULL REFERENCES admission_requests(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'alert')),
  read BOOLEAN NOT NULL DEFAULT FALSE,
  link_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. AUDIT LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  actor_email TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  metadata JSONB
);

-- ==============================================================================
-- INDEXES
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_hospitals_locality ON hospitals(locality);
CREATE INDEX IF NOT EXISTS idx_hospitals_emergency_status ON hospitals(emergency_status);
CREATE INDEX IF NOT EXISTS idx_admission_requests_patient ON admission_requests(patient_id);
CREATE INDEX IF NOT EXISTS idx_admission_requests_hospital ON admission_requests(hospital_id);
CREATE INDEX IF NOT EXISTS idx_admission_requests_status ON admission_requests(status);
CREATE INDEX IF NOT EXISTS idx_bed_categories_hospital ON bed_categories(hospital_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE specialties ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE bed_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE hospital_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE admission_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE capacity_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read own profile; Admins can read all; Only admin can change role
CREATE POLICY "Users read own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins read all profiles" ON profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Hospitals: Public can read verified hospitals
CREATE POLICY "Public read verified hospitals" ON hospitals FOR SELECT USING (
  verification_status = 'verified' OR is_simulated_demo = TRUE
);
CREATE POLICY "Staff update assigned hospital" ON hospitals FOR UPDATE USING (
  EXISTS (SELECT 1 FROM hospital_staff WHERE hospital_id = hospitals.id AND user_id = auth.uid() AND is_active = TRUE)
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Admission Requests: Patients see their own; Staff see their hospital's requests
CREATE POLICY "Patients manage own requests" ON admission_requests FOR ALL USING (
  auth.uid() = patient_id
);
CREATE POLICY "Staff view and update hospital requests" ON admission_requests FOR ALL USING (
  EXISTS (SELECT 1 FROM hospital_staff WHERE hospital_id = admission_requests.hospital_id AND user_id = auth.uid() AND is_active = TRUE)
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
