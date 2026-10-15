import React, { useState } from 'react';
import {
  X,
  Building2,
  MapPin,
  Phone,
  Mail,
  Globe,
  Clock,
  ShieldCheck,
  AlertCircle,
  Stethoscope,
  Bed,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  Calendar,
  Layers,
} from 'lucide-react';
import { Hospital } from '../lib/types.ts';

interface HospitalDetailModalProps {
  hospital: Hospital | null;
  onClose: () => void;
  onRequestAdmission: (hospital: Hospital) => void;
}

export const HospitalDetailModal: React.FC<HospitalDetailModalProps> = ({
  hospital,
  onClose,
  onRequestAdmission,
}) => {
  const [activeTab, setActiveTab] = useState<'capacity' | 'doctors' | 'services' | 'departments'>('capacity');

  if (!hospital) return null;

  const totalPhysical = hospital.bedCategories?.reduce((acc, b) => acc + b.physicalCapacity, 0) || 0;
  const totalUsable = hospital.bedCategories?.reduce((acc, b) => acc + b.usableCapacity, 0) || 0;
  const totalOccupied = hospital.bedCategories?.reduce((acc, b) => acc + b.occupiedCount, 0) || 0;
  const totalReserved = hospital.bedCategories?.reduce((acc, b) => acc + b.reservedCount, 0) || 0;
  const totalAvailable = hospital.bedCategories?.reduce((acc, b) => acc + b.availableBeds, 0) || 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="hospital-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 bg-slate-50/50 flex items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              {hospital.verificationStatus === 'verified' ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                  Verified Hospital Profile
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                  Pending Institutional Verification
                </span>
              )}

              {hospital.isSimulatedDemo && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-200 text-slate-700">
                  Simulated Demonstration Data
                </span>
              )}
            </div>

            <h2 id="hospital-modal-title" className="text-xl sm:text-2xl font-extrabold text-slate-900">
              {hospital.name}
            </h2>
            {hospital.tagline && (
              <p className="text-xs text-slate-500 font-medium mt-0.5">{hospital.tagline}</p>
            )}

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 mt-2">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-blue-600" />
                {hospital.address}, {hospital.locality}, {hospital.city}, {hospital.state} {hospital.postalCode}
              </span>
              <span className="flex items-center gap-1 font-bold text-rose-700">
                <Phone className="w-3.5 h-3.5 text-rose-600" />
                ER Line: {hospital.emergencyPhone}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close hospital details"
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Legal Care Coordination Warning */}
        <div className="px-6 py-2 bg-blue-50/60 border-b border-blue-100 text-[11px] text-blue-900 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-blue-600 shrink-0" />
          <span>
            <strong>Clinical Notice:</strong> Hospital-reported capacity represents current operational estimates for regional coordination and does not constitute a clinical triage determination or admission guarantee.
          </span>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-white px-6">
          <button
            onClick={() => setActiveTab('capacity')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'capacity'
                ? 'border-blue-600 text-blue-600 bg-blue-50/20'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Bed className="w-4 h-4" />
            Bed Capacity ({totalAvailable} Free)
          </button>

          <button
            onClick={() => setActiveTab('doctors')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'doctors'
                ? 'border-blue-600 text-blue-600 bg-blue-50/20'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Stethoscope className="w-4 h-4" />
            Duty Roster ({hospital.doctorShifts?.length || 0})
          </button>

          <button
            onClick={() => setActiveTab('services')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'services'
                ? 'border-blue-600 text-blue-600 bg-blue-50/20'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-4 h-4" />
            Equipment & Services ({hospital.services?.length || 0})
          </button>

          <button
            onClick={() => setActiveTab('departments')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'departments'
                ? 'border-blue-600 text-blue-600 bg-blue-50/20'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-4 h-4" />
            Departments ({hospital.departments?.length || 0})
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: BED CAPACITY BREAKDOWN */}
          {activeTab === 'capacity' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span className="font-semibold">
                  Consistent Mathematical Model: Usable = Physical - Out of Service; Available = Usable - Occupied - Reserved
                </span>
                <span className="text-[11px] text-slate-500">
                  Last updated: {new Date(hospital.lastCapacityUpdate).toLocaleTimeString()} ({hospital.informationSource.replace('_', ' ')})
                </span>
              </div>

              {/* Aggregate Row */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Physical Configured</div>
                  <div className="text-xl font-bold text-slate-900">{totalPhysical}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Usable Capacity</div>
                  <div className="text-xl font-bold text-blue-700">{totalUsable}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Occupied</div>
                  <div className="text-xl font-bold text-amber-700">{totalOccupied}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Reserved Hold</div>
                  <div className="text-xl font-bold text-purple-700">{totalReserved}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-emerald-700 uppercase">Available Now</div>
                  <div className="text-xl font-extrabold text-emerald-700">{totalAvailable}</div>
                </div>
              </div>

              {/* Table of Categories */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Bed Category</th>
                      <th className="py-2.5 px-3 text-center">Physical</th>
                      <th className="py-2.5 px-3 text-center">Unavailable</th>
                      <th className="py-2.5 px-3 text-center">Usable</th>
                      <th className="py-2.5 px-3 text-center">Occupied</th>
                      <th className="py-2.5 px-3 text-center">Reserved</th>
                      <th className="py-2.5 px-3 text-center font-bold text-emerald-700">Available</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {hospital.bedCategories?.map((cat) => (
                      <tr key={cat.id} className="hover:bg-slate-50">
                        <td className="py-3 px-3 font-bold text-slate-900">
                          {cat.categoryName}
                        </td>
                        <td className="py-3 px-3 text-center text-slate-600">{cat.physicalCapacity}</td>
                        <td className="py-3 px-3 text-center text-rose-600">{cat.unavailableCount}</td>
                        <td className="py-3 px-3 text-center text-blue-700 font-semibold">{cat.usableCapacity}</td>
                        <td className="py-3 px-3 text-center text-amber-700">{cat.occupiedCount}</td>
                        <td className="py-3 px-3 text-center text-purple-700 font-semibold">{cat.reservedCount}</td>
                        <td className="py-3 px-3 text-center font-extrabold text-sm text-emerald-700 bg-emerald-50/50">
                          {cat.availableBeds}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: DOCTOR DUTY ROSTER */}
          {activeTab === 'doctors' && (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
                <strong>Duty Verification:</strong> Doctor records distinguish active on-duty presence from on-call consulting status.
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {hospital.doctorShifts && hospital.doctorShifts.length > 0 ? (
                  hospital.doctorShifts.map((doc) => (
                    <div
                      key={doc.id}
                      className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 shadow-xs flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <h4 className="font-bold text-sm text-slate-900">{doc.doctorName}</h4>
                          {doc.isOnDuty ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              ● On Duty Now
                            </span>
                          ) : doc.isOnCall ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              On Call
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600">
                              Off Duty
                            </span>
                          )}
                        </div>
                        <div className="text-xs font-semibold text-blue-700">{doc.designation}</div>
                        <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-2">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>Shift: {doc.shiftStart} – {doc.shiftEnd}</span>
                        </div>
                        {doc.notes && (
                          <div className="mt-2 text-[11px] text-slate-600 italic bg-slate-50 p-2 rounded-lg">
                            "{doc.notes}"
                          </div>
                        )}
                      </div>
                      <div className="mt-3 text-[10px] text-slate-400 pt-2 border-t border-slate-100">
                        Roster verified: {new Date(doc.lastUpdated).toLocaleDateString()}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-2 text-center py-8 text-xs text-slate-500">
                    No doctor duty roster reported yet.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: DIAGNOSTIC SERVICES & EQUIPMENT */}
          {activeTab === 'services' && (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
                <strong>Equipment Verification:</strong> Distinguishes hardware presence, operational service availability, and capacity to accept new acute patients.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {hospital.services?.map((srv) => (
                  <div key={srv.id} className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-xs">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-xs text-slate-900">{srv.displayName}</span>
                      {srv.isOperational ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Operational
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                          <XCircle className="w-3 h-3 text-rose-600" />
                          Offline / Maintenance
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-600 space-y-1">
                      <div className="flex justify-between">
                        <span>Equipment Present:</span>
                        <strong>{srv.hasEquipment ? 'Yes' : 'No'}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Accepting Acute Arrivals:</span>
                        <strong className={srv.acceptingPatients ? 'text-emerald-700' : 'text-slate-500'}>
                          {srv.acceptingPatients ? 'Yes, Ready' : 'Standby / Referral Only'}
                        </strong>
                      </div>
                      {srv.notes && (
                        <div className="text-[11px] text-slate-500 italic mt-1.5 pt-1.5 border-t border-slate-100">
                          Note: {srv.notes}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: DEPARTMENTS */}
          {activeTab === 'departments' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {hospital.departments?.map((dept) => (
                  <div key={dept.id} className="p-3.5 rounded-xl border border-slate-200 bg-white">
                    <div className="font-bold text-xs text-slate-900">{dept.specialtyName}</div>
                    <div className="text-xs text-slate-500 mt-1">
                      Location: {dept.floorLocation || 'Main Clinical Tower'}
                    </div>
                    {dept.contactExtension && (
                      <div className="text-xs text-blue-700 font-semibold mt-1">
                        Internal Ext: #{dept.contactExtension}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            Hospital Coordinates: {hospital.latitude.toFixed(4)}, {hospital.longitude.toFixed(4)}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Close
            </button>
            <button
              onClick={() => {
                onClose();
                onRequestAdmission(hospital);
              }}
              className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
            >
              <FileText className="w-4 h-4" />
              <span>Submit Admission Request</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
