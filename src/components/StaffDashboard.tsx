import React, { useState, useEffect } from 'react';
import {
  Building2,
  Bed,
  Activity,
  Stethoscope,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  ShieldCheck,
  Plus,
  Save,
  Users,
  Layers,
  ArrowRight,
  FileText,
} from 'lucide-react';
import { Hospital, UserProfile, AdmissionRequest, BedCategory, AdmissionStatus } from '../lib/types.ts';
import { api } from '../lib/api.ts';
import { calculateCapacity } from '../lib/capacity.ts';

interface StaffDashboardProps {
  currentUser: UserProfile;
  hospitals: Hospital[];
  onRefreshHospitals: () => void;
}

export const StaffDashboard: React.FC<StaffDashboardProps> = ({
  currentUser,
  hospitals,
  onRefreshHospitals,
}) => {
  // Find assigned hospital or fallback to first hospital for demo
  const assignedHospitalId = currentUser.assignedHospitalId || (hospitals.length > 0 ? hospitals[0].id : '');
  const hospital = hospitals.find((h) => h.id === assignedHospitalId) || hospitals[0];

  const [activeTab, setActiveTab] = useState<'overview' | 'admissions' | 'capacity' | 'doctors' | 'emergency'>('overview');
  const [admissions, setAdmissions] = useState<AdmissionRequest[]>([]);
  const [isLoadingAdmissions, setIsLoadingAdmissions] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Modal / Prompt for Accepting with Bed Reservation
  const [acceptingRequest, setAcceptingRequest] = useState<AdmissionRequest | null>(null);
  const [selectedBedCategoryId, setSelectedBedCategoryId] = useState<string>('');
  const [acceptReason, setAcceptReason] = useState('Immediate emergency hold assigned.');

  // Modal for Declining
  const [decliningRequest, setDecliningRequest] = useState<AdmissionRequest | null>(null);
  const [declineReason, setDeclineReason] = useState('Department capacity exhausted or clinical diversion required.');

  // Edit Capacity state per category
  const [editingCapacity, setEditingCapacity] = useState<Record<string, { physical: number; unavailable: number; occupied: number }>>({});

  // Doctor shift form state
  const [showAddDoctor, setShowAddDoctor] = useState(false);
  const [newDoctorName, setNewDoctorName] = useState('');
  const [newDoctorDesignation, setNewDoctorDesignation] = useState('');
  const [newDoctorStart, setNewDoctorStart] = useState('08:00');
  const [newDoctorEnd, setNewDoctorEnd] = useState('20:00');
  const [newDoctorDuty, setNewDoctorDuty] = useState(true);
  const [newDoctorCall, setNewDoctorCall] = useState(false);
  const [newDoctorNotes, setNewDoctorNotes] = useState('');

  // Emergency status edit
  const [emergencyStatus, setEmergencyStatus] = useState(hospital?.emergencyStatus || 'accepting');
  const [waitTime, setWaitTime] = useState(hospital?.waitingTimeEstimateMinutes || 15);

  useEffect(() => {
    if (hospital) {
      setEmergencyStatus(hospital.emergencyStatus);
      setWaitTime(hospital.waitingTimeEstimateMinutes || 15);
      // Initialize capacity state
      const capState: Record<string, { physical: number; unavailable: number; occupied: number }> = {};
      hospital.bedCategories?.forEach((b) => {
        capState[b.id] = {
          physical: b.physicalCapacity,
          unavailable: b.unavailableCount,
          occupied: b.occupiedCount,
        };
      });
      setEditingCapacity(capState);
    }
  }, [hospital]);

  // Load hospital admissions
  const loadAdmissions = async () => {
    if (!hospital) return;
    setIsLoadingAdmissions(true);
    try {
      const data = await api.getHospitalAdmissions(hospital.id);
      setAdmissions(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoadingAdmissions(false);
    }
  };

  useEffect(() => {
    loadAdmissions();
  }, [hospital?.id]);

  if (!hospital) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 text-center">
        <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-700">No Assigned Hospital Found</h3>
        <p className="text-xs text-slate-500">Contact an administrator to link your account to a verified hospital.</p>
      </div>
    );
  }

  // Handle Admission Status Action
  async function handleStatusTransition(
    requestId: string,
    nextStatus: AdmissionStatus,
    reason?: string,
    targetBedCategoryId?: string
  ) {
    setActionError(null);
    setActionSuccess(null);
    try {
      await api.updateAdmissionStatus(requestId, {
        nextStatus,
        reason,
        targetBedCategoryId,
      });
      setActionSuccess(`Request successfully updated to status: ${nextStatus}`);
      setAcceptingRequest(null);
      setDecliningRequest(null);
      loadAdmissions();
      onRefreshHospitals();
    } catch (err: any) {
      setActionError(err.message || 'Status transition failed');
    }
  }

  // Handle Save Capacity
  async function handleSaveCapacity(catId: string) {
    setActionError(null);
    setActionSuccess(null);
    const item = editingCapacity[catId];
    if (!item) return;

    try {
      await api.updateCapacity(hospital.id, {
        categoryId: catId,
        physicalCapacity: item.physical,
        unavailableCount: item.unavailable,
        occupiedCount: item.occupied,
      });
      setActionSuccess('Capacity values successfully validated and saved to persistent database.');
      onRefreshHospitals();
    } catch (err: any) {
      setActionError(err.message || 'Failed to update capacity');
    }
  }

  // Handle Emergency Status Update
  async function handleUpdateEmergency() {
    setActionError(null);
    setActionSuccess(null);
    try {
      await api.updateEmergencyStatus(hospital.id, {
        emergencyStatus,
        waitingTimeEstimateMinutes: Number(waitTime),
      });
      setActionSuccess('Emergency department status and waiting estimate published.');
      onRefreshHospitals();
    } catch (err: any) {
      setActionError(err.message || 'Failed to update status');
    }
  }

  // Handle Add Doctor
  async function handleAddDoctor(e: React.FormEvent) {
    e.preventDefault();
    setActionError(null);
    setActionSuccess(null);
    try {
      await api.addDoctorShift(hospital.id, {
        doctorName: newDoctorName,
        designation: newDoctorDesignation,
        shiftStart: newDoctorStart,
        shiftEnd: newDoctorEnd,
        isOnDuty: newDoctorDuty,
        isOnCall: newDoctorCall,
        notes: newDoctorNotes,
      });
      setActionSuccess(`Added ${newDoctorName} to duty roster.`);
      setShowAddDoctor(false);
      setNewDoctorName('');
      setNewDoctorDesignation('');
      setNewDoctorNotes('');
      onRefreshHospitals();
    } catch (err: any) {
      setActionError(err.message || 'Failed to add doctor');
    }
  }

  // Metrics
  const totalPhysical = hospital.bedCategories?.reduce((acc, b) => acc + b.physicalCapacity, 0) || 0;
  const totalUsable = hospital.bedCategories?.reduce((acc, b) => acc + b.usableCapacity, 0) || 0;
  const totalOccupied = hospital.bedCategories?.reduce((acc, b) => acc + b.occupiedCount, 0) || 0;
  const totalReserved = hospital.bedCategories?.reduce((acc, b) => acc + b.reservedCount, 0) || 0;
  const totalAvailable = hospital.bedCategories?.reduce((acc, b) => acc + b.availableBeds, 0) || 0;

  const pendingRequestsCount = admissions.filter((a) => ['Submitted', 'Under Review'].includes(a.status)).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-teal-600" />
              Staff Operations Portal
            </span>
            <span className="text-xs text-slate-500">
              Staff: <strong>{currentUser.fullName}</strong>
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            {hospital.name}
          </h1>
          <p className="text-xs text-slate-500">
            {hospital.address}, {hospital.locality} • Emergency Line: {hospital.emergencyPhone}
          </p>
        </div>

        <button
          onClick={() => {
            loadAdmissions();
            onRefreshHospitals();
          }}
          className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 shadow-xs transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Sync Database</span>
        </button>
      </div>

      {/* Global Alerts */}
      {actionError && (
        <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2 animate-in fade-in">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <strong>Error:</strong> {actionError}
          </div>
        </div>
      )}

      {actionSuccess && (
        <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div>{actionSuccess}</div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex flex-wrap border-b border-slate-200 mb-6 gap-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`py-2.5 px-4 text-xs font-bold rounded-t-xl border-b-2 flex items-center gap-1.5 transition-colors ${
            activeTab === 'overview'
              ? 'border-teal-600 text-teal-800 bg-teal-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Activity className="w-4 h-4" />
          Facility Overview
        </button>

        <button
          onClick={() => setActiveTab('admissions')}
          className={`py-2.5 px-4 text-xs font-bold rounded-t-xl border-b-2 flex items-center gap-1.5 transition-colors relative ${
            activeTab === 'admissions'
              ? 'border-teal-600 text-teal-800 bg-teal-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileText className="w-4 h-4" />
          Admission Requests Queue
          {pendingRequestsCount > 0 && (
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-600 text-white">
              {pendingRequestsCount} Pending
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('capacity')}
          className={`py-2.5 px-4 text-xs font-bold rounded-t-xl border-b-2 flex items-center gap-1.5 transition-colors ${
            activeTab === 'capacity'
              ? 'border-teal-600 text-teal-800 bg-teal-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Bed className="w-4 h-4" />
          Bed Capacity Management
        </button>

        <button
          onClick={() => setActiveTab('doctors')}
          className={`py-2.5 px-4 text-xs font-bold rounded-t-xl border-b-2 flex items-center gap-1.5 transition-colors ${
            activeTab === 'doctors'
              ? 'border-teal-600 text-teal-800 bg-teal-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Stethoscope className="w-4 h-4" />
          Doctors & Duty Roster
        </button>

        <button
          onClick={() => setActiveTab('emergency')}
          className={`py-2.5 px-4 text-xs font-bold rounded-t-xl border-b-2 flex items-center gap-1.5 transition-colors ${
            activeTab === 'emergency'
              ? 'border-teal-600 text-teal-800 bg-teal-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Clock className="w-4 h-4" />
          Emergency & Triage Settings
        </button>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Metric Tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <div className="text-[11px] font-bold text-slate-500 uppercase">Available Beds Now</div>
              <div className="text-3xl font-black text-emerald-600 mt-1">{totalAvailable}</div>
              <div className="text-xs text-slate-500 mt-1">out of {totalUsable} usable beds</div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <div className="text-[11px] font-bold text-slate-500 uppercase">Occupied Beds</div>
              <div className="text-3xl font-black text-amber-600 mt-1">{totalOccupied}</div>
              <div className="text-xs text-slate-500 mt-1">
                {Math.round((totalOccupied / (totalUsable || 1)) * 100)}% occupancy rate
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <div className="text-[11px] font-bold text-slate-500 uppercase">Reserved Holds</div>
              <div className="text-3xl font-black text-purple-600 mt-1">{totalReserved}</div>
              <div className="text-xs text-slate-500 mt-1">active patient hold reservations</div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <div className="text-[11px] font-bold text-slate-500 uppercase">Pending Requests</div>
              <div className="text-3xl font-black text-blue-600 mt-1">{pendingRequestsCount}</div>
              <div className="text-xs text-slate-500 mt-1">awaiting triage decision</div>
            </div>
          </div>

          {/* Capacity Breakdown Summary */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center justify-between">
              <span>Department Bed Capacities</span>
              <span className="text-xs text-slate-500 font-normal">
                Updated: {new Date(hospital.lastCapacityUpdate).toLocaleTimeString()}
              </span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {hospital.bedCategories?.map((cat) => (
                <div key={cat.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="font-bold text-xs text-slate-900 flex justify-between">
                    <span>{cat.categoryName}</span>
                    <span className="text-emerald-700 font-extrabold">{cat.availableBeds} Free</span>
                  </div>
                  <div className="text-[11px] text-slate-600 mt-2 space-y-1">
                    <div className="flex justify-between">
                      <span>Physical:</span> <strong>{cat.physicalCapacity}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Usable:</span> <strong>{cat.usableCapacity}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Occupied:</span> <strong>{cat.occupiedCount}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Reserved:</span> <strong className="text-purple-700">{cat.reservedCount}</strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ADMISSION REQUESTS QUEUE & DECISIONS */}
      {activeTab === 'admissions' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">
              Incoming Admission Coordination Requests ({admissions.length})
            </h3>
            <button
              onClick={loadAdmissions}
              className="text-xs font-semibold text-teal-700 hover:underline flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" /> Refresh
            </button>
          </div>

          {isLoadingAdmissions ? (
            <div className="p-8 text-center text-xs text-slate-500">Loading requests queue...</div>
          ) : admissions.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-xs text-slate-500">
              No admission requests in queue for this hospital.
            </div>
          ) : (
            <div className="space-y-3">
              {admissions.map((req) => (
                <div
                  key={req.id}
                  className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-500">#{req.id}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                        req.status === 'Submitted'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : req.status === 'Under Review'
                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : req.status === 'Accepted'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                          : req.status === 'Declined'
                          ? 'bg-rose-50 text-rose-800 border border-rose-200'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {req.status}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                        req.acuityLevel === 'emergency'
                          ? 'bg-rose-100 text-rose-800'
                          : req.acuityLevel === 'urgent'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {req.acuityLevel}
                      </span>
                    </div>

                    <div className="text-sm font-bold text-slate-900">
                      Patient: {req.patientName} ({req.patientPhone})
                    </div>
                    <div className="text-xs text-slate-600">
                      Department: <strong className="text-slate-800">{req.specialtyName}</strong>
                      {req.bedCategoryName && (
                        <span> • Preference: <strong>{req.bedCategoryName}</strong></span>
                      )}
                    </div>
                    <div className="text-xs text-slate-700 bg-slate-50 p-2 rounded-lg">
                      <strong>Complaint:</strong> {req.chiefComplaint}
                      {req.medicalNotes && <span className="text-slate-500 ml-2 font-mono">({req.medicalNotes})</span>}
                    </div>

                    {req.statusReason && (
                      <div className="text-[11px] text-blue-800">
                        Reason/Note: <em>{req.statusReason}</em>
                      </div>
                    )}
                  </div>

                  {/* Permitted Transition Actions per Transition Matrix */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {req.status === 'Submitted' && (
                      <button
                        onClick={() => handleStatusTransition(req.id, 'Under Review', 'Triage nurse assigned to evaluate bed availability')}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white transition-colors"
                      >
                        Start Review
                      </button>
                    )}

                    {req.status === 'Under Review' && (
                      <>
                        <button
                          onClick={() => {
                            setAcceptingRequest(req);
                            setSelectedBedCategoryId(req.bedCategoryId || hospital.bedCategories?.[0]?.id || '');
                          }}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Accept & Hold Bed</span>
                        </button>
                        <button
                          onClick={() => setDecliningRequest(req)}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition-colors flex items-center gap-1"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Decline</span>
                        </button>
                      </>
                    )}

                    {req.status === 'Accepted' && (
                      <>
                        <button
                          onClick={() => handleStatusTransition(req.id, 'Completed', 'Patient arrived and admitted to clinical bed.')}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white transition-colors flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Admit Patient</span>
                        </button>
                        <button
                          onClick={() => handleStatusTransition(req.id, 'Cancelled', 'Released by clinical staff due to patient diversion')}
                          className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700"
                        >
                          Release Hold
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ACCEPT MODAL: HOLD BED RESERVATION */}
      {acceptingRequest && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6">
            <h3 className="text-base font-bold text-slate-900 mb-2">
              Accept Request & Create Bed Reservation Hold
            </h3>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              Accepting will atomically create a 30-minute capacity reservation hold in the database. The available beds count will decrease by 1.
            </p>

            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Assign Bed Category to Hold
                </label>
                <select
                  value={selectedBedCategoryId}
                  onChange={(e) => setSelectedBedCategoryId(e.target.value)}
                  className="w-full p-2 text-xs border border-slate-300 rounded-xl bg-white"
                >
                  {hospital.bedCategories?.map((cat) => (
                    <option key={cat.id} value={cat.id} disabled={cat.availableBeds <= 0}>
                      {cat.categoryName} ({cat.availableBeds} Available) {cat.availableBeds <= 0 ? '- ZERO BEDS' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Decision Notes / Triage Instructions
                </label>
                <input
                  type="text"
                  value={acceptReason}
                  onChange={(e) => setAcceptReason(e.target.value)}
                  className="w-full p-2 text-xs border border-slate-300 rounded-xl"
                  placeholder="e.g. Report to Trauma Bay 2 upon arrival"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAcceptingRequest(null)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleStatusTransition(acceptingRequest.id, 'Accepted', acceptReason, selectedBedCategoryId)}
                className="px-4 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
              >
                Confirm & Create Bed Hold
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DECLINE MODAL */}
      {decliningRequest && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6">
            <h3 className="text-base font-bold text-slate-900 mb-2">
              Decline Admission Request
            </h3>
            <p className="text-xs text-slate-600 mb-4">
              Please record the required reason for declining this admission coordination request.
            </p>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Reason for Decline *</label>
              <textarea
                required
                rows={3}
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                className="w-full p-2 text-xs border border-slate-300 rounded-xl"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDecliningRequest(null)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleStatusTransition(decliningRequest.id, 'Declined', declineReason)}
                className="px-4 py-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg"
              >
                Confirm Decline
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CAPACITY MANAGEMENT */}
      {activeTab === 'capacity' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900">
            <strong>Capacity Invariant Rules:</strong> Usable = Physical - Unavailable. Available = Usable - Occupied - Reserved. Values must be non-negative, and Occupied + Reserved cannot exceed Usable capacity.
          </div>

          <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-3">Physical Total</th>
                  <th className="py-3 px-3">Out of Service</th>
                  <th className="py-3 px-3">Usable Capacity</th>
                  <th className="py-3 px-3">Occupied</th>
                  <th className="py-3 px-3">Reserved Hold</th>
                  <th className="py-3 px-3 text-emerald-700 font-extrabold">Available</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {hospital.bedCategories?.map((cat) => {
                  const item = editingCapacity[cat.id] || {
                    physical: cat.physicalCapacity,
                    unavailable: cat.unavailableCount,
                    occupied: cat.occupiedCount,
                  };

                  const calculated = calculateCapacity({
                    physicalCapacity: item.physical,
                    unavailableCount: item.unavailable,
                    occupiedCount: item.occupied,
                    reservedCount: cat.reservedCount,
                  });

                  return (
                    <tr key={cat.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 font-bold text-slate-900">{cat.categoryName}</td>
                      <td className="py-3 px-3">
                        <input
                          type="number"
                          min="0"
                          value={item.physical}
                          onChange={(e) => {
                            const val = Math.max(0, parseInt(e.target.value) || 0);
                            setEditingCapacity((prev) => ({
                              ...prev,
                              [cat.id]: { ...prev[cat.id], physical: val },
                            }));
                          }}
                          className="w-16 p-1 text-xs border border-slate-300 rounded font-bold"
                        />
                      </td>
                      <td className="py-3 px-3">
                        <input
                          type="number"
                          min="0"
                          value={item.unavailable}
                          onChange={(e) => {
                            const val = Math.max(0, parseInt(e.target.value) || 0);
                            setEditingCapacity((prev) => ({
                              ...prev,
                              [cat.id]: { ...prev[cat.id], unavailable: val },
                            }));
                          }}
                          className="w-16 p-1 text-xs border border-slate-300 rounded text-rose-700 font-bold"
                        />
                      </td>
                      <td className="py-3 px-3 font-bold text-blue-700">
                        {calculated.usableCapacity}
                      </td>
                      <td className="py-3 px-3">
                        <input
                          type="number"
                          min="0"
                          value={item.occupied}
                          onChange={(e) => {
                            const val = Math.max(0, parseInt(e.target.value) || 0);
                            setEditingCapacity((prev) => ({
                              ...prev,
                              [cat.id]: { ...prev[cat.id], occupied: val },
                            }));
                          }}
                          className="w-16 p-1 text-xs border border-slate-300 rounded text-amber-700 font-bold"
                        />
                      </td>
                      <td className="py-3 px-3 font-bold text-purple-700">
                        {cat.reservedCount}
                      </td>
                      <td className="py-3 px-3 font-black text-sm text-emerald-700">
                        {calculated.isValid ? calculated.availableBeds : (
                          <span className="text-rose-600 text-xs font-bold">Invalid</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleSaveCapacity(cat.id)}
                          disabled={!calculated.isValid}
                          className="px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-40"
                        >
                          Save
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: DOCTORS & DUTY ROSTER */}
      {activeTab === 'doctors' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">
              Active Shift Roster ({hospital.doctorShifts?.length || 0} Scheduled)
            </h3>
            <button
              onClick={() => setShowAddDoctor(!showAddDoctor)}
              className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-1 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Doctor to Shift</span>
            </button>
          </div>

          {showAddDoctor && (
            <form onSubmit={handleAddDoctor} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <h4 className="text-xs font-bold text-slate-800">Assign New Doctor Shift</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  required
                  placeholder="Doctor Name (e.g. Dr. Jordan Lee, MD)"
                  value={newDoctorName}
                  onChange={(e) => setNewDoctorName(e.target.value)}
                  className="p-2 text-xs border border-slate-300 rounded-xl bg-white"
                />
                <input
                  type="text"
                  required
                  placeholder="Clinical Designation (e.g. Attending Cardiologist)"
                  value={newDoctorDesignation}
                  onChange={(e) => setNewDoctorDesignation(e.target.value)}
                  className="p-2 text-xs border border-slate-300 rounded-xl bg-white"
                />
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-600">Start Time:</label>
                  <input
                    type="time"
                    value={newDoctorStart}
                    onChange={(e) => setNewDoctorStart(e.target.value)}
                    className="p-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                  />
                  <label className="text-xs text-slate-600">End Time:</label>
                  <input
                    type="time"
                    value={newDoctorEnd}
                    onChange={(e) => setNewDoctorEnd(e.target.value)}
                    className="p-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                  />
                </div>
                <div className="flex items-center gap-4 text-xs font-medium text-slate-700">
                  <label className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={newDoctorDuty}
                      onChange={(e) => setNewDoctorDuty(e.target.checked)}
                    />
                    On Duty Right Now
                  </label>
                  <label className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={newDoctorCall}
                      onChange={(e) => setNewDoctorCall(e.target.checked)}
                    />
                    On Call
                  </label>
                </div>
              </div>
              <input
                type="text"
                placeholder="Duty Notes (e.g. Covering Trauma Bay 1, pager ext #405)"
                value={newDoctorNotes}
                onChange={(e) => setNewDoctorNotes(e.target.value)}
                className="w-full p-2 text-xs border border-slate-300 rounded-xl bg-white"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddDoctor(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold bg-teal-600 text-white rounded-lg hover:bg-teal-700"
                >
                  Save Shift to Roster
                </button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {hospital.doctorShifts?.map((doc) => (
              <div key={doc.id} className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs text-slate-900">{doc.doctorName}</h4>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    doc.isOnDuty ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {doc.isOnDuty ? '● On Duty' : 'Off Duty'}
                  </span>
                </div>
                <div className="text-xs text-teal-700 font-semibold">{doc.designation}</div>
                <div className="text-xs text-slate-500 mt-1">
                  Shift: {doc.shiftStart} – {doc.shiftEnd} {doc.isOnCall ? '(On Call Available)' : ''}
                </div>
                {doc.notes && <div className="text-[11px] text-slate-600 italic mt-1">"{doc.notes}"</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: EMERGENCY & TRIAGE SETTINGS */}
      {activeTab === 'emergency' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs max-w-xl space-y-4">
          <h3 className="text-sm font-bold text-slate-900">Emergency Department Status</h3>
          <p className="text-xs text-slate-500">
            Publish real-time status to EMS coordinators and arriving patients.
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Emergency Status</label>
            <select
              value={emergencyStatus}
              onChange={(e) => setEmergencyStatus(e.target.value as any)}
              className="w-full p-2 text-xs border border-slate-300 rounded-xl bg-white"
            >
              <option value="accepting">Accepting Emergency Requests (Normal Operations)</option>
              <option value="restricted_capacity">Restricted Capacity (Severe Triage Delay)</option>
              <option value="temporarily_unavailable">Temporarily Unavailable (Diversion Mode)</option>
              <option value="requires_confirmation">Requires Direct Confirmation</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Estimated ER Triage Wait Time (minutes)
            </label>
            <input
              type="number"
              min="0"
              value={waitTime}
              onChange={(e) => setWaitTime(parseInt(e.target.value) || 0)}
              className="w-full p-2 text-xs border border-slate-300 rounded-xl"
            />
          </div>

          <button
            onClick={handleUpdateEmergency}
            className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-xs shadow-xs transition-colors"
          >
            Publish Emergency Updates to Live Discovery
          </button>
        </div>
      )}
    </div>
  );
};
