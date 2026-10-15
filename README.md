# MyHospital — Healthcare Coordination Network
> **“Find the Right Care. At the Right Time.”**

MyHospital is a full-stack healthcare coordination web platform that enables patients to discover nearby hospitals, inspect hospital-reported capacity and specialist duty rosters, and submit structured admission requests. Authorized hospital staff manage real-time bed capacity, update clinical shifts, and process admission queues with atomic bed reservation holds. Institutional administrators verify hospital registrations, delegate privileges, and audit sensitive transactions.

---

## Architecture Overview

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Lucide React icons.
- **Backend & API**: Express 4 server (`server.ts`) mounting Vite middlewares during development and serving optimized static assets in production.
- **Data Persistence**: Structured persistent transactional database (`server/db.ts`) storing profiles, hospitals, specialties, bed categories, doctor shifts, diagnostic services, admission requests, reservations, notifications, and tamper-evident audit logs.
- **Production Supabase Integration**: Complete PostgreSQL migration script (`supabase/migrations/20261015000000_init_myhospital.sql`) with tables, check constraints, foreign keys, stored generated columns for bed calculations, indices, and Row Level Security (RLS) policies.
- **Real-Time Updates**: Server-Sent Events (SSE) stream (`/api/realtime/stream`) pushing capacity updates, admission status changes, and notification dispatches across separate user browser sessions with zero manual polling.
- **Automated Scheduling**: Background reservation expiry engine executing every 10 seconds to atomically release expired capacity holds and record audit entries.
- **Maps**: Real Google Maps JavaScript API integration when `VITE_GOOGLE_MAPS_API_KEY` is provided, accompanied by an interactive vector SVG GIS map fallback with zoom, pan, marker synchronization, and bottom overlay drawers.

---

## Core Roles & Permissions

1. **Patient (`patient`)**:
   - Register, sign in, recover password.
   - Search hospitals by name, locality, or 25 clinical specialties.
   - Filter by emergency acceptance status and available ICU beds.
   - Calculate exact travel distance via browser GPS or central coordinates.
   - Inspect facilities, bed breakdown, doctor shifts, and equipment operational status.
   - Submit admission requests with acuity level (`routine`, `urgent`, `emergency`) and chief complaint.
   - Track own requests in real time with active 30-minute bed hold countdown timer.
   - Cancel requests (atomically releasing held beds).

2. **Hospital Staff (`hospital_staff`)**:
   - Authorized to manage only their assigned hospital facility.
   - Live overview of usable, occupied, reserved, and available beds.
   - Enforce single consistent capacity model:
     - `Usable = Physical - Unavailable`
     - `Available = Usable - Occupied - Reserved`
     - Invariant validation preventing negative numbers or over-allocation.
   - Manage doctor duty rosters (toggle on-duty vs on-call, shift hours, notes).
   - Review incoming admission requests and execute server-enforced state transitions:
     - `Submitted` &rarr; `Under Review`
     - `Under Review` &rarr; `Accepted` (atomically reserves bed, decrements available beds, starts 30-min timer)
     - `Under Review` &rarr; `Declined` (requires clinical reason)
     - `Accepted` &rarr; `Completed` (patient admitted, converts reserved bed to occupied bed)

3. **System Administrator (`admin`)**:
   - Verify, reject, or suspend hospital registrations.
   - Delegate and modify user roles (users cannot self-promote).
   - Manage specialty directory (add specialties or activate/deactivate).
   - Inspect tamper-evident audit trail with actor, action, timestamp, and entity details.
   - Reset database to clean demonstration seed dataset.

---

## Pre-Seeded Demonstration Accounts

For instant hackathon evaluation, click the **Role Selector** in the navigation bar or use the following synthetic demo accounts:

| Role | Email | Password | Assigned Hospital |
|---|---|---|---|
| **Patient** | `patient@demo.org` | `PatientPass123!` | Public / Patient Portal |
| **Hospital Staff** | `staff@metrohealth.org` | `StaffPass123!` | Metro Health Center of Excellence |
| **Administrator** | `admin@myhospital.org` | `AdminPass123!` | Institutional Platform Admin |

---

## Environment Variables (`.env.example`)

```bash
# Server Port
PORT=3000

# Optional Google Maps Browser API Key
# If omitted or unconfigured, MyHospital falls back to its built-in interactive vector GIS map
VITE_GOOGLE_MAPS_API_KEY=""

# Optional Supabase Connection (for production PostgreSQL deployment)
SUPABASE_URL=""
SUPABASE_ANON_KEY=""
```

---

## Local Setup & Development

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Execute Unit Tests**:
   ```bash
   node --test
   ```
   Runs 11 automated unit tests verifying capacity invariants, mathematical formulas, state transition matrices, and distance calculations.

3. **Start Development Server**:
   ```bash
   npm run dev
   ```
   Launches the full-stack server on `http://localhost:3000`.

4. **Production Build**:
   ```bash
   npm run build
   npm start
   ```

---

## Database Migrations (Supabase / PostgreSQL)

The schema migration is located at:
`supabase/migrations/20261015000000_init_myhospital.sql`

To apply to your Supabase instance:
```bash
supabase db push
# or run the SQL script directly in the Supabase Dashboard SQL Editor
```

---

## Important Clinical & Legal Disclaimer

MyHospital is a care coordination and facility discovery tool. Hospital-reported capacities and specialist duty rosters are provided for regional coordination and **do not constitute clinical advice or admission guarantees**. In life-threatening emergencies, patients should contact emergency services (e.g. 911) or proceed immediately to the nearest emergency department.
